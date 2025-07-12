// Imports
import { searchMovie, searchTv } from './util/tmdb.js'
import { showDetails } from './search.js'
import { cacheImage, getCachedImage } from "./util/imageCache.js"
import { getPrefs } from "./util/settings.js"
import { getYear, getDate, getCleanTitle, elementFromHtml, logOutput } from "./util/helpers.js"

// Element references
const tmdbImagePath = 'https://image.tmdb.org/t/p/original'
const $library = document.querySelector('#library')
const $libraryList = document.querySelector('#library-list')
const $libraryListBtn = document.querySelector('#library-list-btn')
const $libraryMovieBtn = document.querySelector('#library-movie-btn')
const $libraryTvBtn = document.querySelector('#library-tv-btn')
const $librarySortOldBtn = document.querySelector('#library-sort-old-btn')
const $librarySortNewBtn = document.querySelector('#library-sort-new-btn')
const $librarySortTitleBtn = document.querySelector('#library-sort-title-btn')
const $librarySortPathBtn = document.querySelector('#library-sort-path-btn')

// Vars
let libraryLoadLock = Promise.resolve()

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
      // logOutput('Image cache error', e)
    }
  }

  const resultTile = elementFromHtml(`<div class="result-tile"></div>`)
  const resultPoster = elementFromHtml(`<img class="result-poster" src="${poster}"></img>`)
  const resultDetails = elementFromHtml(`<div class="result-details"></div>`)
  const resultTitle = elementFromHtml(`<div class="result-title" title="${cleanTitle}">${cleanTitle}</div>`)
  const resultYear = elementFromHtml(`<div class="result-year" title="${cleanYear}">${cleanYear}</div>`)
  resultDetails.appendChild(resultTitle)
  resultDetails.appendChild(resultYear)
  resultTile.appendChild(resultDetails)
  poster ? resultTile.appendChild(resultPoster) : null
  // resultTile.addEventListener('click', () => window.electronAPI.openUrl(libraryObj.url))
  resultTile.addEventListener('click', () => showDetails(libraryObj.metadata?.id, libraryObj.type))
  return resultTile
}

// create a library list item
const createLibraryListItem = libraryObj => {
  const cleanYear = libraryObj.releaseYear === undefined ? '' : `(${libraryObj.releaseYear})`
  const cleanTitle = `${libraryObj.metadata?.title || libraryObj.metadata?.name || libraryObj.title} ${cleanYear}`
  const path = libraryObj.url.replace('file://', '')
  const frag = document.createDocumentFragment()
  const libraryListItem = elementFromHtml(`<div class="library-row" data-ts="${libraryObj.timestamp}"></div>`)
  const libraryListTitle = elementFromHtml(`<div class="library-cell" title="${cleanTitle}">${cleanTitle}</div>`)
  const libraryListPath = elementFromHtml(`<div class="library-cell" title="${path}">${path}</div>`)
  const libraryListTime = elementFromHtml(`<div class="library-cell library-cell-right">${new Date(libraryObj.timestamp).toLocaleString()}</div>`)
  libraryListItem.appendChild(libraryListTitle)
  libraryListItem.appendChild(libraryListPath)
  libraryListItem.appendChild(libraryListTime)
  // libraryListItem.addEventListener('click', () => window.electronAPI.openUrl(libraryObj.url))
  libraryListItem.addEventListener('click', () => showDetails(libraryObj.metadata?.id, libraryObj.type))
  frag.appendChild(libraryListItem)
  return frag
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
  const fragTiles = document.createDocumentFragment()
  const fragList = document.createDocumentFragment()
  const tileNodes = await Promise.all(library.map(li => createLibraryTile(li)))
  tileNodes.forEach(node => fragTiles.appendChild(node))
  library.forEach(li => fragList.appendChild(createLibraryListItem(li)))
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
    return;
  }
}

// metadata load error handler
const handleMetadataError = (dir, error) => {
  if (error === 1) {
    // logOutput(`TMDB API Error: No API key provided`)
    alert('TMDB API Error: No API key provided. Please set your TMDB API key in the search settings.')
    setLibraryDirStatus(dir, 'error')
  } else if (error === -1) {
    // logOutput(`TMDB API Error`)
    setLibraryDirStatus(dir, 'error')
  }
}

// set directory metadata status
const setLibraryDirStatus = (dir, status) => {
  // logOutput(`Setting status for directory: ${dir} to ${status}`)
  const dirs = JSON.parse(localStorage.getItem('directories')) || []
  const dirIndex = dirs.findIndex(d => d.path === dir)
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
    // logOutput(`Directory ${dir} not found in library directories`)
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

const addLibraryItems = async (library, type, dir) => {
  // one load at a time
  await libraryLoadLock
  let resolveLock
  libraryLoadLock = new Promise(res => resolveLock = res)

  try {
    const localLibrary = JSON.parse(localStorage.getItem('library')) || []
    // remove items from local library that no longer exist in the directory
    const filtered = localLibrary.filter(entry =>
      entry.path !== dir
      || library.some(item => item.url === entry.url)
    )

    // add any new items from `library`
    for (const item of library) {
      if (!filtered.some(entry => entry.url === item.url)) {
        filtered.push(item)
      }
    }

    // persist & continue
    localStorage.setItem('library', JSON.stringify(filtered))

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
  // logOutput(`Fetching metadata for Directory: ${dir}, Type: ${type}`)
  const library = JSON.parse(localStorage.getItem('library')) || []
  const libraryWithMetadata = []

  for (const item of library) {
    // skip items not in this dir/type OR already have metadata
    if (
      item.path !== dir ||
      item.type !== type ||
      (item.metadata && Object.keys(item.metadata).length > 0)
    ) {
      libraryWithMetadata.push(item)
      continue
    }
    const searchTerm = getCleanTitle(item.title)
    // logOutput(`Searching for metadata for: ${searchTerm}`)
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

// sort library by order param
const sortLibrary = order => {
  const library = JSON.parse(localStorage.getItem('library')) || []
  switch (order) {
    case 'old':
      // sort library by timestamp ascending
      library.sort((a, b) => a.releaseDate - b.releaseDate)
      break
    case 'new':
      // sort library by timestamp descending
      library.sort((a, b) => b.releaseDate - a.releaseDate)
      break
    case 'title':
      // sort library by title ascending
      library.sort((a, b) => getCleanTitle(a.title) < getCleanTitle(b.title) ? -1 : 1)
      break
    case 'path':
      // sort library by dir ascending
      library.sort((a, b) => a.url < b.url ? -1 : 1)
      break
    default:
      library.sort((a, b) => a.releaseDate - b.releaseDate)
      break
  }
  $library.replaceChildren([])
  $libraryList.replaceChildren([])
  loadLibraryUi(library)
}

// filter library by type
const filterLibrary = type => {
  const library = JSON.parse(localStorage.getItem('library')) || []
  const filteredLibrary = library.filter(li => li.type === type)
  $library.replaceChildren([])
  $libraryList.replaceChildren([])
  if (!type) {
    loadLibraryUi(library)
  } else {
    loadLibraryUi(filteredLibrary)
  }
}

// rescan all library directories
export const rescanAllLibraryDirs = () => {
  const dirs = JSON.parse(localStorage.getItem('directories')) || []
  dirs.forEach(dir => loadLibraryDir(dir.path, dir.type))
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

window.electronAPI.sendLibrary((e, library) => addLibraryItems(library, library[0].type, library[0].path))

// Setup
loadLibraryFromStorage()