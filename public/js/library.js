// Imports
import { searchMovie, searchTv, getSeason, getEpisode } from './util/tmdb.js'
import { showDetails } from './search.js'
import { cacheImage, getCachedImage } from "./util/imageCache.js"
import { getPrefs } from "./util/settings.js"
import { getYear, getDate, getCleanTitle, elementFromHtml, getSeasonEpisode } from "./util/helpers.js"
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

// Vars
let libraryLoadLock = Promise.resolve()
let currentSortOrder = 'title' // Track current sort: 'old', 'new', 'title', 'path'

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
  // const resultCaret = elementFromHtml(`<div class="season-group-caret fas fa-caret-right"></div>`)
  const resultTitle = elementFromHtml(`<div class="result-title" title="${cleanTitle}">${cleanTitle}</div>`)
  const resultSeason = elementFromHtml(`<div class="result-year">Season ${season}</div>`)
  const resultCount = elementFromHtml(`<div class="result-year">${episodes.length} Episode${episodes.length !== 1 ? 's' : ''}</div>`)
  const resultCountBadge = elementFromHtml(`<div class="episode-count-badge">${episodes.length}</div>`)
  
  // resultDetails.appendChild(resultCaret)
  resultDetails.appendChild(resultTitle)
  resultDetails.appendChild(resultSeason)
  resultDetails.appendChild(resultCount)
  resultDetails.appendChild(resultCountBadge)
  resultTile.appendChild(resultDetails)
  poster ? resultTile.appendChild(resultPoster) : null

  // Click entire tile to expand/collapse
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

  // Click entire row to expand/collapse
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

// create a library tile
const createLibraryTile = async libraryObj => {
  const cleanTitle = libraryObj.metadata?.title || libraryObj.metadata?.name || libraryObj.title || 'Unknown Title'
  const cleanYear = libraryObj.releaseYear === undefined ? '' : `(${libraryObj.releaseYear})`
  let poster = libraryObj.metadata?.poster_path ? `${tmdbImagePath}${libraryObj.metadata?.poster_path}` : null

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
  const resultYear = elementFromHtml(`<div class="result-year" title="${cleanYear}">${cleanYear}</div>`)
  const resultPlayBtn = elementFromHtml(`<div class="result-play fas fa-2x fa-play result-play"></div>`)
  resultDetails.appendChild(resultTitle)
  resultDetails.appendChild(resultYear)
  resultDetails.appendChild(resultPlayBtn)
  resultTile.appendChild(resultDetails)
  poster ? resultTile.appendChild(resultPoster) : null
  const s = Number.isInteger(libraryObj.season) ? libraryObj.season : null
  const ep = Number.isInteger(libraryObj.episode) ? libraryObj.episode : null
  if (libraryObj.type === 'tv' && Number.isInteger(s) && Number.isInteger(ep)) {
    const resultEpisode = elementFromHtml(`<div class="result-episode" title="Season:${s} Episode:${ep}">s${s}e${ep}</div>`)
    resultTile.appendChild(resultEpisode)
  }
  resultPlayBtn.addEventListener('click', e => {
    e.stopImmediatePropagation()
    playLibraryItem(libraryObj.url)
  })
  resultTile.addEventListener('click', e => {
    showDetails(libraryObj.metadata?.id, libraryObj.type, true, s, ep)
  })
  return resultTile
}

// create a library list item
const createLibraryListItem = libraryObj => {
  let season = ''
  let episode = ''
  if (libraryObj.type === 'tv' ) {
    const match = getSeasonEpisode(libraryObj.title)
    if (match) {
      season = `s${parseInt(match[1])}` || ''
      episode = `e${parseInt(match[2])}` || ''
    }
  }
  const cleanYear = libraryObj.releaseYear === undefined ? '' : `(${libraryObj.releaseYear})`
  const cleanTitle = `${libraryObj.metadata?.title || libraryObj.metadata?.name || libraryObj.title} ${season}${episode} ${cleanYear}`
  const frag = document.createDocumentFragment()
  const libraryListItem = elementFromHtml(`<div class="library-row" data-ts="${libraryObj.timestamp}"></div>`)
  const libraryListPlay = elementFromHtml(`<div class="fas fa-play library-list-play"></div>`)
  const libraryListTitle = elementFromHtml(`<div class="library-cell" title="${cleanTitle}">${cleanTitle}</div>`)
  const libraryListPath = elementFromHtml(`<div class="library-cell" title="${libraryObj.path}">${libraryObj.path}</div>`)
  const libraryListTime = elementFromHtml(`<div class="library-cell library-cell-right">${new Date(libraryObj.timestamp).toLocaleString()}</div>`)
  libraryListItem.appendChild(libraryListPlay)
  libraryListItem.appendChild(libraryListTitle)
  libraryListItem.appendChild(libraryListPath)
  libraryListItem.appendChild(libraryListTime)
  libraryListPlay.addEventListener('click', e => {
    e.stopImmediatePropagation()
    playLibraryItem(libraryObj.url)
  })
  libraryListItem.addEventListener('click', () => showDetails(libraryObj.metadata?.id, libraryObj.type))
  frag.appendChild(libraryListItem)
  return frag
}

// play library item
const playLibraryItem = (url) => {
  const library = JSON.parse(localStorage.getItem('library')) || []
  const item = library.find(li => li.url === url)
  const time = item.lastPlayTime || 0
  if (getPrefs().find(pref => pref.id === 'library-external').state()) {
    // console.log(`Opening video in external player: ${url}`)
    window.electronAPI.openExternalPlayer(item.path)
  } else {
    // console.log(`Opening video in StreamDock: ${url}`)
    window.electronAPI.openUrl(url, time)
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
export const loadLibraryDir = (dir, type) => {
  type === 'movie' ? window.electronAPI.getMovies(dir) : window.electronAPI.getTv(dir)
  $libraryTvBtn.classList.remove('toggled-bg')
  $libraryMovieBtn.classList.remove('toggled-bg')
}

// load library from local storage
export const loadLibraryFromStorage = () => {
  const libraryWithMetadata = JSON.parse(localStorage.getItem('library')) || []
  if (libraryWithMetadata.length > 0) {
    loadLibraryUi(libraryWithMetadata)
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

// set directory metadata status
const setLibraryDirStatus = (dir, status) => {
  // console.log(`Setting status for directory: ${dir} to ${status}`)
  const dirs = JSON.parse(localStorage.getItem('directories')) || []
  const dirIndex = dirs.findIndex(d => d.dir === dir)
  if (dirIndex > -1) {
    dirs[dirIndex].status = status
    localStorage.setItem('directories', JSON.stringify(dirs))
    // update library directory panel
    const libDir = document.querySelector(`.library-directory-path[title="${dir}"]`)
    if (libDir) {
      const statusIcon = libDir.parentElement.querySelector('.library-directory-status')
      if (statusIcon) {
        updateLibraryDirStatus(statusIcon, status)
      }
    }
  } else {
    console.log(`Directory ${dir} not found in library directories`)
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

// add library items from renderer process
const addLibraryItems = async (library, type, dir) => {
  // one load at a time
  await libraryLoadLock
  let resolveLock
  libraryLoadLock = new Promise(res => resolveLock = res)
  // console.log(`Adding library items from directory: ${dir}, Type: ${type}`)
  try {
    const localLibrary = JSON.parse(localStorage.getItem('library')) || []
    // remove items from local library that no longer exist in the directory
    const filtered = localLibrary.filter(entry => !entry.path.startsWith(dir) || library.some(item => item.url === entry.url))

    // add any new items from `library`
    for (const item of library) {
      if (!filtered.some(entry => entry.url === item.url)) {
        if (type === 'tv') {
          const match = getSeasonEpisode(item.title)
          if (match) {
            item.season = parseInt(match[1]) || 0
            item.episode = parseInt(match[2]) || 0
          }
        }
        filtered.push(item)
      }
    }

    // persist & continue
    localStorage.setItem('library', JSON.stringify(filtered))

    // remove last stream if it matches any of the new items
    removeLastStream()

    if (getPrefs().find(pref => pref.id === 'library-meta').state()) {
      await getLibraryMetadata(type, dir)
    } else {
      setLibraryDirStatus(dir, 'file')
      loadLibraryUi(filtered)
    }
  } finally {
    resolveLock()
  }
}

// get metadata for library items
const getLibraryMetadata = async (type, dir) => {
  setLibraryDirStatus(dir, 'pending')
  let error = false
  // console.log(`Fetching metadata for Directory: ${dir}, Type: ${type}`)
  const library = JSON.parse(localStorage.getItem('library')) || []
  const libraryWithMetadata = []

  for (const item of library) {
    // skip items not in this dir/type OR already have metadata
    if (
      !item.path.startsWith(dir) ||
      item.type !== type ||
      (item.metadata && Object.keys(item.metadata).length > 0)
    ) {
      libraryWithMetadata.push(item)
      continue
    }
    const searchTerm = getCleanTitle(item.title)
    // console.log(`Searching for metadata for: ${searchTerm}`)
    const searchResult = type === 'movie'
      ? await searchMovie(searchTerm, 1)
      : await searchTv(searchTerm, 1)
    
    if (searchResult === 1) {
      handleMetadataError(dir, 1)
      error = true
      return
    }
    if (searchResult === -1) {
      handleMetadataError(dir, -1)
      error = true
      libraryWithMetadata.push(item)
      continue
    }
    let metadata = {}
    let releaseYear
    let releaseDate
    if (searchResult && searchResult.results && searchResult.results.length > 0) {
      // sorth the results by popularity first
      searchResult.results.sort((a, b) => b.popularity - a.popularity)
      // find the first result that is exact match to search term === item.title
      metadata = searchResult.results.find(result => getCleanTitle(result.title || result.name) === searchTerm) || searchResult.results[0]
      if (type === 'tv' && item.season && item.episode) {
        const seasonData = await getSeason(metadata.id, item.season)
        if (seasonData === 1 || seasonData === -1) {
          handleMetadataError(dir, seasonData)
          error = true
          continue
        }
        metadata.poster_path = seasonData?.poster_path || metadata.poster_path
        
        // get episode-specific air date
        const episodeData = await getEpisode(metadata.id, item.season, item.episode)
        if (episodeData && episodeData.air_date) {
          metadata.first_air_date = episodeData.air_date
        } else if (seasonData?.air_date) {
          // fallback to season air date
          metadata.first_air_date = seasonData.air_date
        }
      }
      releaseYear = getYear(metadata.release_date || metadata.first_air_date || 'NA')
      releaseDate = getDate(metadata.release_date || metadata.first_air_date || 'NA')
      if (metadata.poster_path && getPrefs().find(pref => pref.id === 'library-cache').state()) {
        const posterUrl = `${tmdbImagePath}${metadata.poster_path}`
        cacheImage(posterUrl, metadata.poster_path)
      }
    }
    libraryWithMetadata.push({ ...item, releaseYear, releaseDate, metadata })
  }
  if (!error) {
    setLibraryDirStatus(dir, 'complete')
  }
  localStorage.setItem('library', JSON.stringify(libraryWithMetadata))
  loadLibraryUi(libraryWithMetadata)
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
        season = parseInt(match[1], 10) || 0
        episode = parseInt(match[2], 10) || 0
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
  const library = JSON.parse(localStorage.getItem('library')) || []
  
  switch (order) {
    case 'old':
      // sort by date ascending (oldest first)
      library.sort((a, b) => getSortValue(a, 'date') - getSortValue(b, 'date'))
      break
    case 'new':
      // sort by date descending (newest first)
      library.sort((a, b) => getSortValue(b, 'date') - getSortValue(a, 'date'))
      break
    case 'title':
      // sort by title ascending
      library.sort((a, b) => {
        const titleA = getSortValue(a, 'title')
        const titleB = getSortValue(b, 'title')
        return titleA < titleB ? -1 : 1
      })
      break
    case 'path':
      // sort by path ascending
      library.sort((a, b) => {
        const pathA = getSortValue(a, 'path')
        const pathB = getSortValue(b, 'path')
        return pathA < pathB ? -1 : 1
      })
      break
    default:
      library.sort((a, b) => {
        const titleA = getSortValue(a, 'title')
        const titleB = getSortValue(b, 'title')
        return titleA < titleB ? -1 : 1
      })
      break
  }
  
  $library.replaceChildren([])
  $libraryList.replaceChildren([])
  localStorage.setItem('library', JSON.stringify(library))
  
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
  const library = JSON.parse(localStorage.getItem('library')) || []
  const filteredLibrary = library.filter(li => li.type === type)
  $library.replaceChildren([])
  $libraryList.replaceChildren([])
  
  // disable group button if movie filter is active
  if (type === 'movie') {
    $libraryGroupBtn.disabled = true
  } else {
    $libraryGroupBtn.disabled = false
  }
  
  if (!type) {
    loadLibraryUi(library)
  } else {
    loadLibraryUi(filteredLibrary)
  }
}

// rescan all library directories
export const rescanAllLibraryDirs = () => {
  const dirs = JSON.parse(localStorage.getItem('directories')) || []
  dirs.forEach(dir => loadLibraryDir(dir.dir, dir.type))
}

$libraryListBtn.addEventListener('click', libraryListView)

$librarySortOldBtn.addEventListener('click', () => sortLibrary('old'))

$librarySortNewBtn.addEventListener('click', () => sortLibrary('new'))

$librarySortTitleBtn.addEventListener('click', () => sortLibrary('title'))

$librarySortPathBtn.addEventListener('click', () => sortLibrary('path'))

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
  const library = JSON.parse(localStorage.getItem('library')) || []
  const item = library.find(li => li.url === urlTime.url)
  if (item) {
    item.lastPlayTime = urlTime.time
    localStorage.setItem('library', JSON.stringify(library))
    // console.log(`Set video time for ${urlTime.url} to ${urlTime.time}`)
  } else {
    // console.log(`No library item found for URL: ${urlTime.url}`)
  }
})

// setup
if (localStorage.getItem('library-group-season') === 'true') {
  $libraryGroupBtn.classList.add('toggled-bg')
}
loadLibraryFromStorage()