// Imports
import {
  getLibrary,
  findLibraryItemsByDir,
  updateLibraryItem,
  updateLibraryItemMetadata,
  rescanDirectory,
  saveImmediately,
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
  resultTile.dataset.cleanTitle = cleanTitle
  resultTile.dataset.type = 'tv'
  resultTile.dataset.ts = firstEpisode.timestamp || 253402300800000
  resultTile.dataset.releaseDate = firstEpisode.releaseDate || 253402300800000
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
  libraryListItem.dataset.cleanTitle = cleanTitle
  libraryListItem.dataset.type = 'tv'
  libraryListItem.dataset.ts = firstEpisode.timestamp || 253402300800000
  libraryListItem.dataset.releaseDate = firstEpisode.releaseDate || 253402300800000
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

// close any open context menu
const closeContextMenu = () => {
  document.querySelectorAll('.library-context-menu').forEach(menu => menu.remove())
}

// create library item context menu
const createLibraryItemContextMenu = (libraryObj, event) => {
  closeContextMenu()
  
  const menu = elementFromHtml(`<div class="library-context-menu"></div>`)
  const isHidden = libraryObj.isHidden === true
  const isLocked = libraryObj.isMetadataLocked === true
  
  // hide/show toggle
  const hideShowItem = elementFromHtml(`
    <div class="library-context-menu-item" title="Toggle hidden state for this title">
      <span class="fas ${isHidden ? 'fa-eye' : 'fa-eye-slash'}"></span>
      <span>${isHidden ? 'Show' : 'Hide'} Title</span>
    </div>
  `)
  hideShowItem.addEventListener('click', () => {
    toggleItemHidden(libraryObj)
    closeContextMenu()
  })
  menu.appendChild(hideShowItem)
  
  // update metadata
  const updateMetaItem = elementFromHtml(`
    <div class="library-context-menu-item" title="Select alternative TMDB metadata${libraryObj.isUserUpdated === true ? ' (Currently User Updated)' : ''}">
      <span class="fas fa-rotate"></span>
      <span>Update Metadata${libraryObj.isUserUpdated === true ? ' <span class="fas fa-user-check" style="font-size: 0.75rem; color: var(--color-system-accent);"></span>' : ''}</span>
    </div>
  `)
  updateMetaItem.addEventListener('click', () => {
    selectAlternativeMetadata(libraryObj)
    closeContextMenu()
  })
  menu.appendChild(updateMetaItem)
  
  // lock metadata
  const lockMetaItem = elementFromHtml(`
    <div class="library-context-menu-item" title="Lock metadata to prevent automatic updates">
      <span class="fas ${isLocked ? 'fa-lock-open' : 'fa-lock'}"></span>
      <span>${isLocked ? 'Unlock' : 'Lock'} Metadata</span>
    </div>
  `)
  lockMetaItem.addEventListener('click', () => {
    toggleItemLocked(libraryObj)
    closeContextMenu()
  })
  menu.appendChild(lockMetaItem)
  document.body.appendChild(menu)
  
  const rect = event.target.getBoundingClientRect()
  const menuRect = menu.getBoundingClientRect()
  let left = rect.left
  let top = rect.bottom + 5

  if (left + menuRect.width > window.innerWidth) {
    left = rect.right - menuRect.width
  }

  if (top + menuRect.height > window.innerHeight) {
    top = rect.top - menuRect.height - 5
  }
  
  menu.style.left = `${Math.max(5, left)}px`
  menu.style.top = `${Math.max(5, top)}px`
  
  // close on outside click
  setTimeout(() => {
    const closeOnClickOutside = (e) => {
      if (!menu.contains(e.target)) {
        closeContextMenu()
        document.removeEventListener('click', closeOnClickOutside)
      }
    }
    document.addEventListener('click', closeOnClickOutside)
  }, 0)
}

// select alternative metadata
const selectAlternativeMetadata = (libraryObj) => {
  closeContextMenu()
  
  // calculate affected episodes count for TV shows
  let affectedCount = 1
  if (libraryObj.type === 'tv' && libraryObj.metadata?.id) {
    const sameShowEpisodes = findLibraryItemsByDir(libraryObj.dir).filter(item => 
      item.type === 'tv' &&
      item.metadata?.id === libraryObj.metadata.id &&
      getCleanTitle(item.title) === getCleanTitle(libraryObj.title)
    )
    affectedCount = sameShowEpisodes.length
  }
  
  const modal = elementFromHtml(`
    <div class="metadata-search-modal">
      <div class="metadata-search-container">
        ${libraryObj.type === 'tv' && affectedCount > 1 ? `
          <div class="metadata-update-notice">
            <span class="fas fa-info-circle"></span>
            <span>Updating metadata will affect <strong>${affectedCount} episodes</strong> in this directory</span>
          </div>
        ` : ''}
        <div class="metadata-search-input-container">
          <input type="text" class="metadata-search-input" 
                 placeholder="Search TMDB..." 
                 value="${getCleanTitle(libraryObj.title)}">
          <button class="metadata-search-btn fas fa-search"></button>
        </div>
        <div class="metadata-results-container"></div>
        <div class="metadata-pagination" style="display: none;">
          <button class="metadata-page-btn metadata-prev-btn" disabled><span class="fas fa-chevron-left"></span> Previous</button>
          <span class="metadata-page-info"></span>
          <button class="metadata-page-btn metadata-next-btn">Next <span class="fas fa-chevron-right"></span></button>
        </div>
      </div>
    </div>
  `)
  
  document.body.appendChild(modal)
  modal.dataset.currentPage = '1'
  modal.dataset.totalPages = '1'
  
  const searchInput = modal.querySelector('.metadata-search-input')
  searchInput.focus()
  searchInput.select()
  
  setupMetadataSearchHandlers(modal, libraryObj)
  performMetadataSearch(libraryObj, searchInput.value, modal, 1)
}

// perform metadata search
const performMetadataSearch = async (libraryObj, searchTerm, modal, page = 1) => {
  const resultsContainer = modal.querySelector('.metadata-results-container')
  const pagination = modal.querySelector('.metadata-pagination')
  resultsContainer.innerHTML = '<div class="metadata-loading">Searching TMDB...</div>'
  pagination.style.display = 'none'
  
  const searchFn = libraryObj.type === 'movie' ? searchMovie : searchTv
  const results = await searchFn(searchTerm, page)
  
  if (results === 1 || results === -1) {
    resultsContainer.innerHTML = '<div class="metadata-error"><div class="result-glyph fas fa-exclamation-triangle" style="font-size: 2.6rem;"></div><div>Error</div><div>Check your internet connection and that your TMDB API key is set.</div></div>'
    return
  }
  
  if (!results?.results?.length) {
    resultsContainer.innerHTML = '<div class="metadata-no-results">No results found. Try a different search term.</div>'
    return
  }
  
  modal.dataset.currentPage = page
  modal.dataset.totalPages = results.total_pages || 1
  modal.dataset.searchTerm = searchTerm
  
  renderMetadataResults(results.results, libraryObj, modal)
  updatePagination(modal, libraryObj)
}

// update pagination UI
const updatePagination = (modal, libraryObj) => {
  const pagination = modal.querySelector('.metadata-pagination')
  const prevBtn = modal.querySelector('.metadata-prev-btn')
  const nextBtn = modal.querySelector('.metadata-next-btn')
  const pageInfo = modal.querySelector('.metadata-page-info')
  const currentPage = parseInt(modal.dataset.currentPage)
  const totalPages = parseInt(modal.dataset.totalPages)
  
  if (totalPages > 1) {
    pagination.style.display = 'flex'
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`
    prevBtn.disabled = currentPage <= 1
    nextBtn.disabled = currentPage >= totalPages
    
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        performMetadataSearch(libraryObj, modal.dataset.searchTerm, modal, currentPage - 1)
      }
    }
    
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        performMetadataSearch(libraryObj, modal.dataset.searchTerm, modal, currentPage + 1)
      }
    }
  } else {
    pagination.style.display = 'none'
  }
}

// render metadata search results
const renderMetadataResults = (results, libraryObj, modal) => {
  const container = modal.querySelector('.metadata-results-container')
  const frag = document.createDocumentFragment()
  
  results.forEach(result => {
    const isCurrentMetadata = result.id === libraryObj.metadata?.id
    const year = new Date(result.release_date || result.first_air_date).getFullYear()
    const title = `${result.title || result.name} (${isNaN(year) ? 'NA' : year})`
    const card = elementFromHtml(`
      <div class="metadata-result-card ${isCurrentMetadata ? 'current' : ''}" 
           data-tmdb-id="${result.id}">
        ${result.poster_path ? `<img class="metadata-result-poster" src="${tmdbImagePath}${result.poster_path}" alt="${title}">` : '<div class="metadata-result-poster-placeholder"></div>'}
        <div class="metadata-result-details">
          <div class="metadata-result-title" title="${title}">${title}</div>
          <div class="metadata-result-overview" title="${result.overview || 'No description available.'}">${result.overview || 'No description available.'}</div>
          ${isCurrentMetadata ? '<div class="metadata-current-badge">Current</div>' : ''}
        </div>
        <button class="metadata-select-btn">Select</button>
      </div>
    `)
    
    card.querySelector('.metadata-select-btn').addEventListener('click', () => {
      applyMetadataSelection(libraryObj, result, modal)
    })
    
    frag.appendChild(card)
  })
  
  container.replaceChildren(frag)
}

// apply metadata selection
const applyMetadataSelection = async (libraryObj, selectedMetadata, modal) => {
  const resultsContainer = modal.querySelector('.metadata-results-container')
  resultsContainer.innerHTML = '<div class="metadata-loading">Applying metadata...</div>'
  
  // for TV shows, update all episodes in the same directory
  if (libraryObj.type === 'tv') {
    await updateShowInDirectory(libraryObj, selectedMetadata, modal)
  } else {
    // otherwise, just update the single item
    let fullMetadata = selectedMetadata
    
    updateLibraryItemMetadata(libraryObj.url, fullMetadata)
    
    updateLibraryItem(libraryObj.url, {
      isUserUpdated: true,
      isMetadataLocked: true
    })
    
    if (fullMetadata.poster_path && getPrefs().find(p => p.id === 'library-cache').state()) {
      cacheImage(`${tmdbImagePath}${fullMetadata.poster_path}`, fullMetadata.poster_path)
    }
    
    saveImmediately()
    
    modal.remove()
    loadLibraryUi(getLibrary())
  }
}

// update all episodes of a show in the same directory
const updateShowInDirectory = async (libraryObj, selectedMetadata, modal) => {
  const oldShowId = libraryObj.metadata?.id
  const newShowId = selectedMetadata.id
  
  // find all episodes in the same directory with the same show name
  const episodesToUpdate = findLibraryItemsByDir(libraryObj.dir).filter(item => 
    item.type === 'tv' &&
    item.metadata?.id === oldShowId &&
    getCleanTitle(item.title) === getCleanTitle(libraryObj.title)
  )
  
  // update each episode with show metadata + season poster + episode air date
  for (const episode of episodesToUpdate) {
    let fullMetadata = { ...selectedMetadata }

    const seasonData = await getSeason(newShowId, episode.season)
    if (seasonData?.poster_path) {
      fullMetadata.poster_path = seasonData.poster_path
    }

    const episodeData = await getEpisode(newShowId, episode.season, episode.episode)
    if (episodeData?.air_date) {
      fullMetadata.first_air_date = episodeData.air_date
    }
    
    updateLibraryItemMetadata(episode.url, fullMetadata)
    
    updateLibraryItem(episode.url, {
      isUserUpdated: true,
      isMetadataLocked: true
    })
    
    if (fullMetadata.poster_path && getPrefs().find(p => p.id === 'library-cache').state()) {
      cacheImage(`${tmdbImagePath}${fullMetadata.poster_path}`, fullMetadata.poster_path)
    }
  }
  
  saveImmediately()
  modal.remove()
  loadLibraryUi(getLibrary())
}

// setup metadata search handlers
const setupMetadataSearchHandlers = (modal, libraryObj) => {
  const searchInput = modal.querySelector('.metadata-search-input')
  const searchBtn = modal.querySelector('.metadata-search-btn')
  
  searchBtn.addEventListener('click', () => {
    performMetadataSearch(libraryObj, searchInput.value, modal, 1)
  })
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performMetadataSearch(libraryObj, searchInput.value, modal, 1)
    }
  })
  
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove()
      document.removeEventListener('keydown', escapeHandler)
    }
  }
  document.addEventListener('keydown', escapeHandler)
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

// toggle item locked state
const toggleItemLocked = (libraryObj) => {
  const newLockedState = !(libraryObj.isMetadataLocked === true)
  updateLibraryItem(libraryObj.url, { isMetadataLocked: newLockedState })
  saveImmediately()
}

// toggle item hidden state
const toggleItemHidden = (libraryObj) => {
  const newHiddenState = !(libraryObj.isHidden === true)
  updateLibraryItem(libraryObj.url, { isHidden: newHiddenState })
  saveImmediately()
  
  const isHidingHiddenItems = $library.classList.contains('hide-hidden')
  const tileElement = $library.querySelector(`[data-url="${libraryObj.url}"]`)
  const listElement = $libraryList.querySelector(`[data-url="${libraryObj.url}"]`)
  
  if (tileElement && tileElement.dataset.isLocal === 'true') {
    if (newHiddenState) {
      if (isHidingHiddenItems) {
        requestAnimationFrame(() => {
          tileElement.classList.add('element-fadeout')
          setTimeout(() => {
            tileElement.classList.remove('element-fadeout')
            tileElement.dataset.hidden = 'true'
            tileElement.classList.add('library-item-hidden')
          }, 400)
        })
      } else {
        tileElement.dataset.hidden = 'true'
        tileElement.classList.add('library-item-hidden')
      }
    } else {
      tileElement.dataset.hidden = 'false'
      tileElement.classList.remove('library-item-hidden')
    }
  }
  
  if (listElement && listElement.dataset.isLocal === 'true' && !listElement.classList.contains('season-group-row')) {
    if (newHiddenState) {
      if (isHidingHiddenItems) {
        requestAnimationFrame(() => {
          listElement.classList.add('element-fadeout')
          setTimeout(() => {
            listElement.classList.remove('element-fadeout')
            listElement.dataset.hidden = 'true'
            listElement.classList.add('library-item-hidden')
          }, 400)
        })
      } else {
        listElement.dataset.hidden = 'true'
        listElement.classList.add('library-item-hidden')
      }
    } else {
      listElement.dataset.hidden = 'false'
      listElement.classList.remove('library-item-hidden')
    }
  }
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
  resultDetails.appendChild(resultTitle)
  resultDetails.appendChild(resultYear)
  resultDetails.appendChild(resultPlayBtn)
  resultTile.appendChild(resultDetails)
  poster ? resultTile.appendChild(resultPoster) : null
  if (libraryObj.type === 'tv') {
    const resultEpisode = elementFromHtml(`<div class="result-episode" title="Season:${libraryObj.season} Episode:${libraryObj.episode}">s${libraryObj.season}e${libraryObj.episode}</div>`)
    resultTile.appendChild(resultEpisode)
  }
  resultTile.dataset.isLocal = 'true'
  resultTile.dataset.isNavigable = 'true'
  resultTile.dataset.cleanTitle = cleanTitle
  resultTile.dataset.url = libraryObj.url
  resultTile.dataset.type = libraryObj.type
  resultTile.dataset.hidden = libraryObj.isHidden === true ? 'true' : 'false'
  resultTile.dataset.ts = libraryObj.timestamp || 253402300800000
  resultTile.dataset.releaseDate = libraryObj.releaseDate || 253402300800000
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
  resultTile.addEventListener('contextmenu', e => {
    e.stopImmediatePropagation()
    createLibraryItemContextMenu(libraryObj, e)
  })
  resultTile.addEventListener('click', e => {
    setCurrentResultElement(resultTile)
    showDetails(toSearchResult(libraryObj))
  })
  
  // apply hidden styling if item is hidden
  if (libraryObj.isHidden === true) {
    resultTile.classList.add('library-item-hidden')
  }
  
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
  const libraryListPlay = elementFromHtml(`<div class="fas fa-play library-list-play-btn"></div>`)
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
  libraryListItem.dataset.url = libraryObj.url
  libraryListItem.dataset.type = libraryObj.type
  libraryListItem.dataset.hidden = libraryObj.isHidden === true ? 'true' : 'false'
  libraryListItem.dataset.ts = libraryObj.timestamp || 253402300800000
  libraryListItem.dataset.releaseDate = libraryObj.releaseDate || 253402300800000
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
  libraryListItem.addEventListener('contextmenu', e => {
    e.stopImmediatePropagation()
    createLibraryItemContextMenu(libraryObj, e)
  })
  libraryListItem.addEventListener('click', () => {
    setCurrentResultElement(libraryListItem)
    showDetails(toSearchResult(libraryObj))
  })
  
  // apply hidden styling if item is hidden
  if (libraryObj.isHidden === true) {
    libraryListItem.classList.add('library-item-hidden')
  }
  
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

    // add groups, use first episode's values for sorting
    for (const showId in grouped) {
      for (const season in grouped[showId]) {
        const episodes = grouped[showId][season]
        const firstEpisode = episodes[0]
        episodes.forEach(ep => groupedShowIds.add(ep.url))
        
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
    // ungrouped, render library as-is (already sorted)
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
export const loadLibraryDir = (dir, type, refresh = false) => {
  sessionStorage.setItem('refresh-mode', JSON.stringify({ dir, active: refresh }))
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
    // update library directory panel using getAttribute to avoid querySelector escaping issues
    const allDirPaths = Array.from(document.querySelectorAll('.library-directory-path'))
    const libDir = allDirPaths.find(el => el.getAttribute('title') === dir)
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
  ele.classList.remove('fa-file', 'fa-hourglass-half', 'fa-check', 'fa-triangle-exclamation', 'fa-plug-circle-xmark', 'green', 'yellow', 'red')
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
    case 'unavailable':
      ele.classList.add('fa-plug-circle-xmark', 'red')
      ele.title = 'Directory Unavailable'
      break
  }
  return ele
}

// add/rescan library items from directory
const addLibraryItems = async (newItems, type, dir, error, discoveredSubDirs = [], isRefresh = false) => {
  await libraryLoadLock
  let resolveLock
  libraryLoadLock = new Promise(res => resolveLock = res)

  try {
    // handle PARENT directory unavailable error - preserve entire tree
    if (error || newItems === null) {
      // console.error(`Parent directory unavailable: ${dir}`, error)
      setLibraryDirStatus(dir, 'unavailable')
      loadLibraryUi(getLibrary())
      if (isRefresh) {
        alert(`Cannot refresh metadata: Parent directory is unavailable\n\n${dir}\n\nPlease reconnect the drive or network and try again.`)
      }
      return
    }

    // parent directory is available - update/create directory entry with subdirectories
    const dirs = getDirectories()
    let dirEntry = dirs.find(d => d.dir === dir)
    
    if (!dirEntry) {
      dirEntry = {
        dir,
        type,
        status: 'file',
        subDirs: discoveredSubDirs
      }
      dirs.push(dirEntry)
    } else {
      dirEntry.subDirs = discoveredSubDirs
      if (dirEntry.status === 'unavailable') {
        dirEntry.status = 'file'
      }
    }
    
    localStorage.setItem('directories', JSON.stringify(dirs))

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
    
    // if refreshing, clear metadata for unlocked items in tree BEFORE rescan
    if (isRefresh && shouldFetchMetadata) {
      const allDirs = [dir, ...discoveredSubDirs]
      const library = getLibrary()
      library.forEach(item => {
        if (allDirs.some(targetDir => item.dir === targetDir || item.dir.startsWith(targetDir + '/')) &&
            item.isMetadataLocked !== true) {
          item.metadata = {}
          item.releaseYear = undefined
          item.releaseDate = undefined
        }
      })
      saveImmediately()
    }
    
    // parent is available - rescan will remove items from missing subdirectories
    const { itemsNeedingMetadata, hadDeletions } = await rescanDirectory(dir, discoveredSubDirs, processedItems, type, shouldFetchMetadata)

    if (hadDeletions) {
      removeLastStream()
    }

    if (shouldFetchMetadata && itemsNeedingMetadata.length > 0) {
      await fetchMetadataForItems(itemsNeedingMetadata, type, dir)
    } else {
      if (shouldFetchMetadata) {
        const allDirs = [dir, ...discoveredSubDirs]
        const itemsInTree = getLibrary().filter(item => 
          allDirs.some(targetDir => item.dir === targetDir || item.dir.startsWith(targetDir + '/'))
        )
        const hasMetadata = itemsInTree.length > 0 && itemsInTree.every(item => item.metadata?.id)
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
        const episodeData = await getEpisode(metadata.id, item.season, item.episode)

        metadata = {
          ...metadata,
          poster_path: seasonData?.poster_path || metadata.poster_path,
          first_air_date: episodeData?.air_date || seasonData?.air_date || metadata.first_air_date,
          episode_name: episodeData?.name,
          episode_overview: episodeData?.overview
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
  
  const tiles = Array.from($library.querySelectorAll('.result-tile:not(.nested-episode-tile), .season-group-tile'))
  const listItems = Array.from($libraryList.querySelectorAll('.library-row:not(.nested-episode-row), .season-group-row'))
  
  // sort function based on data attributes
  const sorter = (a, b) => {
    const getItemValue = (el, field) => {
      if (field === 'title') {
        return el.dataset.cleanTitle || ''
      } else if (field === 'date') {
        return Number(el.dataset.releaseDate) || 253402300800000
      } else if (field === 'path') {
        return el.dataset.url || ''
      }
      return ''
    }
    
    switch (order) {
      case 'old':
        return getItemValue(a, 'date') - getItemValue(b, 'date')
      case 'new':
        return getItemValue(b, 'date') - getItemValue(a, 'date')
      case 'title':
        const titleA = getItemValue(a, 'title')
        const titleB = getItemValue(b, 'title')
        return titleA.localeCompare(titleB)
      case 'path':
        const pathA = getItemValue(a, 'path')
        const pathB = getItemValue(b, 'path')
        return pathA.localeCompare(pathB)
      default:
        return 0
    }
  }
  
  // sort arrays
  tiles.sort(sorter)
  listItems.sort(sorter)
  
  // reorder in DOM
  tiles.forEach(tile => $library.appendChild(tile))
  listItems.forEach(item => $libraryList.appendChild(item))
}

// filter library by type
const filterLibrary = type => {
  $library.classList.remove('filter-movie', 'filter-tv')
  $libraryList.classList.remove('filter-movie', 'filter-tv')
  
  // apply new filter class
  if (type === 'movie') {
    $library.classList.add('filter-movie')
    $libraryList.classList.add('filter-movie')
    $libraryGroupBtn.disabled = true
  } else if (type === 'tv') {
    $library.classList.add('filter-tv')
    $libraryList.classList.add('filter-tv')
    $libraryGroupBtn.disabled = false
  } else {
    $libraryGroupBtn.disabled = false
  }
  
  // update hidden class based on toggle
  const showHidden = $libraryShowHiddenBtn.classList.contains('toggled-bg')
  if (showHidden) {
    $library.classList.remove('hide-hidden')
    $libraryList.classList.remove('hide-hidden')
  } else {
    $library.classList.add('hide-hidden')
    $libraryList.classList.add('hide-hidden')
  }
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
    $library.classList.add('hide-hidden')
    $libraryList.classList.add('hide-hidden')
  } else {
    $libraryShowHiddenBtn.classList.add('toggled-bg')
    $library.classList.remove('hide-hidden')
    $libraryList.classList.remove('hide-hidden')
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

  $library.replaceChildren([])
  $libraryList.replaceChildren([])
  loadLibraryUi(getLibrary())
  
  let type = null
  if ($libraryMovieBtn.classList.contains('toggled-bg')) {
    type = 'movie'
  } else if ($libraryTvBtn.classList.contains('toggled-bg')) {
    type = 'tv'
  }
  filterLibrary(type)
})

window.electronAPI.sendLibrary((e, libraryObj) => {
  const refreshMode = sessionStorage.getItem('refresh-mode')
  const isRefresh = refreshMode ? JSON.parse(refreshMode).dir === libraryObj.dir && JSON.parse(refreshMode).active : false
  if (isRefresh) {
    sessionStorage.removeItem('refresh-mode')
  }
  addLibraryItems(libraryObj.library, libraryObj.type, libraryObj.dir, libraryObj.error, libraryObj.discoveredSubDirs || [], isRefresh)
})

window.electronAPI.setVideoTime((e, urlTime) => {
  updateLibraryItem(urlTime.url, { lastPlayTime: urlTime.time })
  saveImmediately()
})

// setup
if (localStorage.getItem('library-group-season') === 'true') {
  $libraryGroupBtn.classList.add('toggled-bg')
}
$library.classList.add('hide-hidden')
$libraryList.classList.add('hide-hidden')
loadLibraryFromStorage()