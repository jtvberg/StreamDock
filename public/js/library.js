// Imports
import { 
  initLibrary,
  getLibrary,
  getLibraryByType,
  findLibraryItem,
  findLibraryItemsByDir,
  updateLibraryItem,
  updateLibraryItemMetadata,
  rescanDirectory,
  refreshDirectoryMetadata,
  removeLibraryItems,
  shouldSkipMetadataUpdate,
  setExcludeTitle,
  saveImmediately,
  sortLibrary as sortLib,
  toSearchResult
} from './util/libraryManager.js'
import { searchMovie, searchTv, getSeason, getEpisode } from './util/tmdb.js'
import { showDetails, setCurrentResultElement } from './search.js'
import { cacheImage, getCachedImage } from "./util/imageCache.js"
import { getPrefs } from "./util/settings.js"
import { getCleanTitle, elementFromHtml, getSeasonEpisode } from "./util/helpers.js"
import { getImagePath } from './util/tmdb.js'
import { removeLastStream } from './renderer.js'

// Element references
const tmdbImagePath = getImagePath()
const $library = document.querySelector('#library')
const $libraryList = document.querySelector('#library-list')
const $libraryListBtn = document.querySelector('#library-list-btn')
const $libraryMovieBtn = document.querySelector('#library-movie-btn')
const $libraryTvBtn = document.querySelector('#library-tv-btn')
const $libraryGroupBtn = document.querySelector('#library-group-btn')
const $librarySortOldBtn = document.querySelector('#library-sort-old-btn')
const $librarySortNewBtn = document.querySelector('#library-sort-new-btn')
const $librarySortTitleBtn = document.querySelector('#library-sort-title-btn')
const $librarySortPathBtn = document.querySelector('#library-sort-path-btn')
const $libraryShowHiddenBtn = document.querySelector('#library-show-hidden-btn')

// Vars
let libraryLoadLock = Promise.resolve()
let currentSortOrder = 'title' // track current sort: 'old', 'new', 'title', 'path'
let errorShown = false
export let directoriesCache = null
let directoriesSaveTimeout = null

// get sortable value with fallbacks
const getSortValue = (item, field) => {
  switch (field) {
    case 'title':
      return getCleanTitle(item.metadata?.title || item.metadata?.name || item.title)
    case 'date':
      return Number(item.releaseDate) || 253402300800000
    case 'path':
      return item.path || item.url
    default:
      return ''
  }
}

// create a season group tile
const createSeasonGroupTile = async (showId, season, episodes) => {
  const firstEpisode = episodes[0]
  const cleanTitle = firstEpisode.metadata?.name || 'Unknown Show'
  let poster = firstEpisode.metadata?.poster_path ? `${tmdbImagePath}${firstEpisode.metadata?.poster_path}` : null

  if (firstEpisode.metadata?.poster_path) {
    poster = `${tmdbImagePath}${firstEpisode.metadata.poster_path}`
    try {
      const cached = await getCachedImage(firstEpisode.metadata.poster_path)
      if (cached) poster = cached
    } catch (e) {
      // console.log('Image cache error', e)
    }
  }

  const resultTile = elementFromHtml(`<div class="season-group-tile" data-show-id="${showId}" data-season="${season}" data-expanded="false"></div>`)
  const resultPoster = elementFromHtml(`<img class="result-poster" src="${poster}"></img>`)
  const resultDetails = elementFromHtml(`<div class="result-details season-group-details"></div>`)
  const resultTitle = elementFromHtml(`<div class="result-title" title="${cleanTitle}">${cleanTitle}</div>`)
  const resultSeason = elementFromHtml(`<div class="result-year">Season ${season}</div>`)
  const resultCount = elementFromHtml(`<div class="result-year">${episodes.length} Episode${episodes.length !== 1 ? 's' : ''}</div>`)
  const resultCountBadge = elementFromHtml(`<div class="episode-count-badge">${episodes.length}</div>`)
  
  resultDetails.appendChild(resultTitle)
  resultDetails.appendChild(resultSeason)
  resultDetails.appendChild(resultCount)
  resultDetails.appendChild(resultCountBadge)
  resultTile.appendChild(resultDetails)
  poster ? resultTile.appendChild(resultPoster) : null
  resultTile.dataset.isNavigable = 'false'
  resultTile.addEventListener('click', () => {
    toggleSeasonGroup(resultTile, episodes, false)
  })

  return resultTile
}

// create a season group list item
const createSeasonGroupListItem = (showId, season, episodes) => {
  const firstEpisode = episodes[0]
  const cleanTitle = firstEpisode.metadata?.name || 'Unknown Show'
  const frag = document.createDocumentFragment()
  const libraryListItem = elementFromHtml(`<div class="season-group-row library-row" data-show-id="${showId}" data-season="${season}" data-expanded="false"></div>`)
  const libraryCaret = elementFromHtml(`<div class="season-group-caret fas fa-plus"></div>`)
  const libraryListTitle = elementFromHtml(`<div class="library-cell" title="${cleanTitle} - Season ${season} (${episodes.length} episodes)">${cleanTitle} - Season ${season} (${episodes.length} episodes)</div>`)
  const libraryListPath = elementFromHtml(`<div class="library-cell"></div>`)
  const libraryListTime = elementFromHtml(`<div class="library-cell library-cell-right"></div>`)
  
  libraryListItem.appendChild(libraryCaret)
  libraryListItem.appendChild(libraryListTitle)
  libraryListItem.appendChild(libraryListPath)
  libraryListItem.appendChild(libraryListTime)
  libraryListItem.dataset.isNavigable = 'false'
  libraryListItem.addEventListener('click', () => {
    toggleSeasonGroup(libraryListItem, episodes, true)
  })

  frag.appendChild(libraryListItem)
  return frag
}

// toggle season group expand/collapse
const toggleSeasonGroup = async (container, episodes, isListView) => {
  const isExpanded = container.dataset.expanded === 'true'
  const caret = container.querySelector('.season-group-caret')

  if (isExpanded) {
    container.dataset.expanded = 'false'
    if (isListView) {
      caret.classList.remove('fa-minus')
      caret.classList.add('fa-plus')
    }
    removeEpisodes(container)
  } else {
    container.dataset.expanded = 'true'
    if (isListView) {
      caret.classList.remove('fa-plus')
      caret.classList.add('fa-minus')
    }
    await insertEpisodes(container, episodes, isListView)
  }
}

// insert episodes after group container
const insertEpisodes = async (container, episodes, isListView) => {
  let currentElement = container
  
  for (const episode of episodes) {
    let episodeElement
    if (isListView) {
      const frag = createLibraryListItem(episode)
      episodeElement = frag.firstElementChild
      episodeElement.classList.add('nested-episode-row')
    } else {
      episodeElement = await createLibraryTile(episode)
      episodeElement.classList.add('nested-episode-tile')
    }
    episodeElement.dataset.seasonEpisode = 'true'
    currentElement.insertAdjacentElement('afterend', episodeElement)
    currentElement = episodeElement
  }
}

// remove episodes after group container
const removeEpisodes = (container) => {
  let nextElement = container.nextElementSibling
  while (nextElement && nextElement.dataset.seasonEpisode === 'true') {
    const toRemove = nextElement
    nextElement = nextElement.nextElementSibling
    toRemove.remove()
  }
}

// get text inside parentheses
const extractParentheses = str => {
  const match = str.match(/\(([^)]+)\)/)
  return match ? match[1] : ''
}

// create a library tile
const createLibraryTile = async libraryObj => {
  const parenthesesText = extractParentheses(libraryObj.title)
  const cleanTitle = `${libraryObj.metadata?.title || libraryObj.metadata?.name || libraryObj.title || 'Unknown Title'} ${parenthesesText ? `- ${parenthesesText}` : ''}`.trim()
  const cleanYear = libraryObj.releaseYear ? libraryObj.releaseYear : 'NA'
  let poster = null

  if (libraryObj.metadata?.poster_path) {
    poster = `${tmdbImagePath}${libraryObj.metadata.poster_path}`
    try {
      const cached = await getCachedImage(libraryObj.metadata.poster_path)
      if (cached) poster = cached
    } catch (e) {
      // console.log('Image cache error', e)
    }
  }

  const resultTile = elementFromHtml(`<div class="result-tile"></div>`)
  const resultPoster = elementFromHtml(`<img class="result-poster" src="${poster}"></img>`)
  const resultDetails = elementFromHtml(`<div class="result-details"></div>`)
  const resultTitle = elementFromHtml(`<div class="result-title" title="${cleanTitle}">${cleanTitle}</div>`)
  const resultYear = elementFromHtml(`<div class="result-year" title="${cleanYear}">(${cleanYear})</div>`)
  const resultPlayBtn = elementFromHtml(`<div class="result-play fas fa-2x fa-play result-play"></div>`)
  const resultOptionsBtn = elementFromHtml(`<div class="result-options fas fa-ellipsis-vertical"></div>`)
  resultDetails.appendChild(resultTitle)
  resultDetails.appendChild(resultYear)
  resultDetails.appendChild(resultPlayBtn)
  resultDetails.appendChild(resultOptionsBtn)
  resultTile.appendChild(resultDetails)
  poster ? resultTile.appendChild(resultPoster) : null
  if (libraryObj.type === 'tv') {
    const resultEpisode = elementFromHtml(`<div class="result-episode" title="Season:${libraryObj.season} Episode:${libraryObj.episode}">s${libraryObj.season}e${libraryObj.episode}</div>`)
    resultTile.appendChild(resultEpisode)
  }
  resultTile.dataset.isLocal = 'true'
  resultTile.dataset.isNavigable = 'true'
  resultTile.dataset.cleanTitle = cleanTitle
  if (libraryObj.metadata?.id) {
    resultTile.dataset.id = libraryObj.metadata.id
    resultTile.dataset.mediaType = libraryObj.type
    resultTile.dataset.season = libraryObj.season
    resultTile.dataset.episode = libraryObj.episode
  }
  resultPlayBtn.addEventListener('click', e => {
    e.stopImmediatePropagation()
    playLibraryItem(libraryObj)
  })
  resultTile.addEventListener('click', e => {
    setCurrentResultElement(resultTile)
    showDetails(toSearchResult(libraryObj))
  })
  return resultTile
}

// create a library list item
const createLibraryListItem = libraryObj => {
  const parenthesesText = extractParentheses(libraryObj.title)
  const episode = libraryObj.type === 'tv' ? ` s${libraryObj.season}e${libraryObj.episode}` : ''
  const cleanTitle = `${libraryObj.metadata?.title || libraryObj.metadata?.name || libraryObj.title} ${episode}${parenthesesText ? `- ${parenthesesText}` : ''}`.trim()
  const cleanYear = libraryObj.releaseYear ? libraryObj.releaseYear : 'NA'
  const fullTitle  = `${cleanTitle} (${cleanYear})`
  const frag = document.createDocumentFragment()
  const libraryListItem = elementFromHtml(`<div class="library-row" data-ts="${libraryObj.timestamp}"></div>`)
  const libraryListPlay = elementFromHtml(`<div class="fas fa-play library-list-play"></div>`)
  const libraryListTitle = elementFromHtml(`<div class="library-cell" title="${fullTitle}">${fullTitle}</div>`)
  const libraryListPath = elementFromHtml(`<div class="library-cell" title="${libraryObj.path}">${libraryObj.path}</div>`)
  const libraryListTime = elementFromHtml(`<div class="library-cell library-cell-right">${new Date(libraryObj.timestamp).toLocaleString()}</div>`)
  libraryListItem.appendChild(libraryListPlay)
  libraryListItem.appendChild(libraryListTitle)
  libraryListItem.appendChild(libraryListPath)
  libraryListItem.appendChild(libraryListTime)
  libraryListItem.dataset.isLocal = 'true'
  libraryListItem.dataset.isNavigable = 'true'
  libraryListItem.dataset.cleanTitle = cleanTitle
  if (libraryObj.metadata?.id) {
    libraryListItem.dataset.id = libraryObj.metadata.id
    libraryListItem.dataset.mediaType = libraryObj.type
    libraryListItem.dataset.season = libraryObj.season
    libraryListItem.dataset.episode = libraryObj.episode
  }
  libraryListPlay.addEventListener('click', e => {
    e.stopImmediatePropagation()
    playLibraryItem(libraryObj)
  })
  libraryListItem.addEventListener('click', () => {
    setCurrentResultElement(libraryListItem)
    showDetails(toSearchResult(libraryObj))
  })
  
  frag.appendChild(libraryListItem)
  return frag
}

// play library item
export const playLibraryItem = (libraryObj) => {
  if (getPrefs().find(pref => pref.id === 'library-external').state()) {
    // console.log(`Opening video in external player: ${libraryObj.path}`)
    window.electronAPI.openExternalPlayer(libraryObj.path)
  } else {
    // console.log(`Opening video in StreamDock: ${libraryObj.url}`)
    window.electronAPI.openUrl(libraryObj.url, libraryObj.lastPlayTime)
  }
}

// toggle bookmark list view
const libraryListView = () => {
  if ($libraryListBtn.classList.contains('toggled-bg')) {
    $libraryListBtn.classList.remove('toggled-bg')
    $library.style.display = ''
    $libraryList.style.display = ''
  } else {
    $libraryListBtn.classList.add('toggled-bg')
    $library.style.display = 'none'
    $libraryList.style.display = 'flex'
  }
}

// load library
const loadLibraryUi = async library => {
  const isGrouped = localStorage.getItem('library-group-season') === 'true'
  const fragTiles = document.createDocumentFragment()
  const fragList = document.createDocumentFragment()

  if (isGrouped) {
    // group TV shows by season
    const grouped = groupSeasonsEpisodes(library)
    const groupedShowIds = new Set()
    const mixedItems = []

    // add groups - use first episode's values for sorting
    for (const showId in grouped) {
      for (const season in grouped[showId]) {
        const episodes = grouped[showId][season]
        const firstEpisode = episodes[0]
        grouped[showId][season].forEach(ep => groupedShowIds.add(ep.url))
        
        mixedItems.push({
          isGroup: true,
          showId,
          season,
          episodes,
          sortTitle: firstEpisode.metadata?.name || firstEpisode.title,
          sortDate: firstEpisode.releaseDate || 253402300800000,
          sortPath: firstEpisode.path || firstEpisode.url
        })
      }
    }

    // add ungrouped items
    const ungroupedItems = library.filter(item => !groupedShowIds.has(item.url))
    ungroupedItems.forEach(item => {
      mixedItems.push({
        isGroup: false,
        item,
        sortTitle: getSortValue(item, 'title'),
        sortDate: getSortValue(item, 'date'),
        sortPath: getSortValue(item, 'path')
      })
    })

    // sort mixed items based on current sort order
    mixedItems.sort((a, b) => {
      switch (currentSortOrder) {
        case 'old':
          return a.sortDate - b.sortDate
        case 'new':
          return b.sortDate - a.sortDate
        case 'title':
          return getCleanTitle(a.sortTitle) < getCleanTitle(b.sortTitle) ? -1 : 1
        case 'path':
          return a.sortPath < b.sortPath ? -1 : 1
        default:
          return 0
      }
    })

    // render in sorted order
    for (const mixedItem of mixedItems) {
      if (mixedItem.isGroup) {
        const groupTile = await createSeasonGroupTile(mixedItem.showId, mixedItem.season, mixedItem.episodes)
        fragTiles.appendChild(groupTile)
        const groupListItem = createSeasonGroupListItem(mixedItem.showId, mixedItem.season, mixedItem.episodes)
        fragList.appendChild(groupListItem)
      } else {
        const tile = await createLibraryTile(mixedItem.item)
        fragTiles.appendChild(tile)
        const listItem = createLibraryListItem(mixedItem.item)
        fragList.appendChild(listItem)
      }
    }
  } else {
    // ungrouped: render library as-is (already sorted)
    const tileNodes = await Promise.all(library.map(li => createLibraryTile(li)))
    tileNodes.forEach(node => fragTiles.appendChild(node))
    library.forEach(li => fragList.appendChild(createLibraryListItem(li)))
  }

  $library.replaceChildren([])
  $libraryList.replaceChildren([])
  $library.appendChild(fragTiles)
  $libraryList.appendChild(fragList)
}

// load library directory
export const loadLibraryDir = (dir, type, silent = false) => {
  errorShown = silent
  type === 'movie' ? window.electronAPI.getMovies(dir) : window.electronAPI.getTv(dir)
  $libraryTvBtn.classList.remove('toggled-bg')
  $libraryMovieBtn.classList.remove('toggled-bg')
}

// load library from local storage
export const loadLibraryFromStorage = () => {
  const library = getLibrary()
  if (library.length > 0) {
    loadLibraryUi(library)
  }
}

// metadata load error handler
const handleMetadataError = (dir, error) => {
  if (error === 1) {
    // console.log(`TMDB API Error: No API key provided`)
    alert('TMDB API Error: No API key provided. Please set your TMDB API key in the search settings.')
    setLibraryDirStatus(dir, 'error')
  } else if (error === -1) {
    // console.log(`TMDB API Error`)
    setLibraryDirStatus(dir, 'error')
  }
}

// get directories from cache or localStorage
export const getDirectories = () => {
  if (!directoriesCache) {
    directoriesCache = JSON.parse(localStorage.getItem('directories')) || []
  }
  return directoriesCache
}

// save directories
const saveDirectories = () => {
  clearTimeout(directoriesSaveTimeout)
  directoriesSaveTimeout = setTimeout(() => {
    localStorage.setItem('directories', JSON.stringify(directoriesCache))
  }, 500)
}

// set directory metadata status
const setLibraryDirStatus = (dir, status) => {
  // console.log(`Setting status for directory: ${dir} to ${status}`)
  const dirs = getDirectories()
  const dirIndex = dirs.findIndex(d => d.dir === dir)
  if (dirIndex > -1) {
    dirs[dirIndex].status = status
    saveDirectories()
    // update library directory panel
    const libDir = document.querySelector(`.library-directory-path[title="${dir}"]`)
    if (libDir) {
      const statusIcon = libDir.parentElement.querySelector('.library-directory-status')
      if (statusIcon) {
        updateLibraryDirStatus(statusIcon, status)
      }
    }
  }
}

// update library directory status icon
export const updateLibraryDirStatus = (ele, status) => {
  ele.classList.remove('fa-file', 'fa-hourglass-half', 'fa-check', 'fa-triangle-exclamation', 'green', 'yellow')
  switch (status) {
    case 'file':
      ele.classList.add('fa-file')
      ele.title = 'File Loaded'
      break
    case 'pending':
      ele.classList.add('fa-hourglass-half')
      ele.title = 'Load Pending'
      break
    case 'complete':
      ele.classList.add('fa-check', 'green')
      ele.title = 'Metadata Complete'
      break
    case 'error':
      ele.classList.add('fa-triangle-exclamation', 'yellow')
      ele.title = 'Metadata Error'
      break
  }
  return ele
}

// add/rescan library items from directory
const addLibraryItems = async (newItems, type, dir) => {
  await libraryLoadLock
  let resolveLock
  libraryLoadLock = new Promise(res => resolveLock = res)

  try {
    const processedItems = newItems.map(item => {
      if (type === 'tv') {
        const match = getSeasonEpisode(item.title)
        return {
          ...item,
          season: match ? Number(match[1]) || 0 : 0,
          episode: match ? Number(match[2]) || 0 : 0
        }
      }
      return item
    })

    const shouldFetchMetadata = getPrefs().find(pref => pref.id === 'library-meta').state()
    const { itemsNeedingMetadata, hadDeletions } = await rescanDirectory(dir, processedItems, type, shouldFetchMetadata)


    if (hadDeletions) {
      removeLastStream()
    }

    if (shouldFetchMetadata && itemsNeedingMetadata.length > 0) {
      await fetchMetadataForItems(itemsNeedingMetadata, type, dir)
    } else {
      if (shouldFetchMetadata) {
        const itemsInDir = findLibraryItemsByDir(dir).filter(item => item.type === type)
        const hasMetadata = itemsInDir.length > 0 && itemsInDir.every(item => item.metadata?.id)
        setLibraryDirStatus(dir, hasMetadata ? 'complete' : 'file')
      } else {
        setLibraryDirStatus(dir, 'file')
      }
      loadLibraryUi(getLibrary())
    }
  } finally {
    resolveLock()
  }
}

// fetch metadata for specific items
const fetchMetadataForItems = async (items, type, dir) => {
  setLibraryDirStatus(dir, 'pending')
  let error = false

  for (const item of items) {
    const searchTerm = getCleanTitle(item.title)
    const searchResult = type === 'movie'
      ? await searchMovie(searchTerm, 1)
      : await searchTv(searchTerm, 1)

    if (searchResult === 1 || searchResult === -1) {
      if (!errorShown) {
        handleMetadataError(dir, searchResult)
        errorShown = true
      }
      error = true
      continue
    }

    if (searchResult?.results?.length > 0) {
      let metadata = searchResult.results[0]

      if (type === 'tv' && item.season && item.episode) {
        const seasonData = await getSeason(metadata.id, item.season)
        if (seasonData?.poster_path) {
          metadata.poster_path = seasonData.poster_path
        }
        const episodeData = await getEpisode(metadata.id, item.season, item.episode)
        if (episodeData?.air_date) {
          metadata.first_air_date = episodeData.air_date
        }
      }

      updateLibraryItemMetadata(item.url, metadata)

      if (metadata.poster_path && getPrefs().find(p => p.id === 'library-cache').state()) {
        cacheImage(`${tmdbImagePath}${metadata.poster_path}`, metadata.poster_path)
      }
    }
  }

  if (!error) {
    setLibraryDirStatus(dir, 'complete')
  }
  loadLibraryUi(getLibrary())
}

// group seasons and episodes for TV shows
const groupSeasonsEpisodes = library => {
  const shows = {}

  library.forEach(item => {
    if (item.type === 'tv' && item.metadata?.id) {
      const showId = item.metadata.id
      if (!shows[showId]) {
        shows[showId] = {}
      }

      const match = getSeasonEpisode(item.title)
      let season, episode
      if (match) {
        season = Number(match[1]) || 0
        episode = Number(match[2]) || 0
      } else {
        season = 0
        episode = 0
      }
      if (!shows[showId][season]) {
        shows[showId][season] = []
      }
      shows[showId][season].push({ ...item, season, episode })
    }
  })

  for (const showId in shows) {
    for (const season in shows[showId]) {
      shows[showId][season].sort((a, b) => a.episode - b.episode)
    }
  }

  return shows
}

// sort library by order param
const sortLibrary = order => {
  currentSortOrder = order
  
  const compareFn = {
    'old': (a, b) => getSortValue(a, 'date') - getSortValue(b, 'date'),
    'new': (a, b) => getSortValue(b, 'date') - getSortValue(a, 'date'),
    'title': (a, b) => {
      const titleA = getSortValue(a, 'title')
      const titleB = getSortValue(b, 'title')
      return titleA < titleB ? -1 : 1
    },
    'path': (a, b) => {
      const pathA = getSortValue(a, 'path')
      const pathB = getSortValue(b, 'path')
      return pathA < pathB ? -1 : 1
    }
  }[order]
  
  sortLib(compareFn)
  
  $library.replaceChildren([])
  $libraryList.replaceChildren([])
  
  let type = null
  if ($libraryMovieBtn.classList.contains('toggled-bg')) {
    type = 'movie'
  } else if ($libraryTvBtn.classList.contains('toggled-bg')) {
    type = 'tv'
  }
  filterLibrary(type)
}

// filter library by type
const filterLibrary = type => {
  $library.replaceChildren([])
  $libraryList.replaceChildren([])

  if (type === 'movie') {
    $libraryGroupBtn.disabled = true
  } else {
    $libraryGroupBtn.disabled = false
  }
  
  loadLibraryUi(getLibraryByType(type))
}

// rescan all library directories
export const rescanAllLibraryDirs = () => {
  const dirs = JSON.parse(localStorage.getItem('directories')) || []
  dirs.forEach(dir => loadLibraryDir(dir.dir, dir.type, true))
}

$libraryListBtn.addEventListener('click', libraryListView)

$librarySortOldBtn.addEventListener('click', () => sortLibrary('old'))

$librarySortNewBtn.addEventListener('click', () => sortLibrary('new'))

$librarySortTitleBtn.addEventListener('click', () => sortLibrary('title'))

$librarySortPathBtn.addEventListener('click', () => sortLibrary('path'))

$libraryShowHiddenBtn.addEventListener('click', () => {
  if ($libraryShowHiddenBtn.classList.contains('toggled-bg')) {
    $libraryShowHiddenBtn.classList.remove('toggled-bg')
    // hide hidden items
  } else {
    $libraryShowHiddenBtn.classList.add('toggled-bg')
    // show hidden items
  }
})

$libraryMovieBtn.addEventListener('click', () => {
  $libraryTvBtn.classList.remove('toggled-bg')
  if ($libraryMovieBtn.classList.contains('toggled-bg')) {
    $libraryMovieBtn.classList.remove('toggled-bg')
    filterLibrary()
  } else {
    $libraryMovieBtn.classList.add('toggled-bg')
    filterLibrary('movie')
  }
})

$libraryTvBtn.addEventListener('click', () => {
  $libraryMovieBtn.classList.remove('toggled-bg')
  if ($libraryTvBtn.classList.contains('toggled-bg')) {
    $libraryTvBtn.classList.remove('toggled-bg')
    filterLibrary()
  } else {
    $libraryTvBtn.classList.add('toggled-bg')
    filterLibrary('tv')
  }
})

$libraryGroupBtn.addEventListener('click', () => {
  if ($libraryGroupBtn.classList.contains('toggled-bg')) {
    $libraryGroupBtn.classList.remove('toggled-bg')
    localStorage.setItem('library-group-season', 'false')
  } else {
    $libraryGroupBtn.classList.add('toggled-bg')
    localStorage.setItem('library-group-season', 'true')
  }
  // reload library with new grouping state
  let type = null
  if ($libraryMovieBtn.classList.contains('toggled-bg')) {
    type = 'movie'
  } else if ($libraryTvBtn.classList.contains('toggled-bg')) {
    type = 'tv'
  }
  filterLibrary(type)
})

window.electronAPI.sendLibrary((e, libraryObj) => addLibraryItems(libraryObj.library, libraryObj.type, libraryObj.dir))

window.electronAPI.setVideoTime((e, urlTime) => {
  updateLibraryItem(urlTime.url, { lastPlayTime: urlTime.time })
  saveImmediately()
})

// setup
initLibrary()
if (localStorage.getItem('library-group-season') === 'true') {
  $libraryGroupBtn.classList.add('toggled-bg')
}
loadLibraryFromStorage()