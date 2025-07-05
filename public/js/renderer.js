// Imports
import { getStreams, setStreams, getNewStreamId, getLastStream, getPrefs, setLastStream, getWinBounds, setWinBounds, getWinLock, setWinLock, getWinRatio, setWinRatio, getDefaultAgent } from "./util/settings.js"
import { searchMovie, searchTv } from './util/tmdb.js'
import locs from '../res/loc.json' with { type: 'json' }

// Constants
const streams = getStreams()

// Element references
const $header = document.querySelector('#header')
const $drag = document.querySelectorAll('.drag')
const $dragWin = document.querySelector('#drag-win')
const $headerControls = document.querySelector('#header-controls')
const $streamControls = document.querySelector('#stream-controls')
const $prefsBtn = document.querySelector('#prefs-btn')
const $bookmarks = document.querySelector('#bookmarks')
const $bookmarkList = document.querySelector('#bookmark-list')
const $library = document.querySelector('#library')
const $libraryList = document.querySelector('#library-list')
const $headerPanels = document.querySelectorAll('.header-panels')
const $prefsLayout = document.querySelector('#prefs-layout')
const $servicePrefs = document.querySelector('#service-layout')
const $advancedLayout = document.querySelector('#advanced-layout')
const $searchLayout = document.querySelector('#search-layout')
const $searchNavBtn = document.querySelector('#search-nav-btn')
const $libraryLayout = document.querySelector('#library-layout')
const $libraryNavBtn = document.querySelector('#library-nav-btn')
const $streamsLayout = document.querySelector('#streams-layout')
const $streamsEdit = document.querySelector('#streams-edit')
const $streamDoneBtn = document.querySelector('#stream-done-btn')
const $streamRestoreBtn = document.querySelector('#stream-restore-btn')
const $closeBtn = document.querySelector('#close-btn')
const $minBtn = document.querySelector('#min-btn')
const $maxBtn = document.querySelector('#max-btn')
const $backBtn = document.querySelector('#back-btn')
const $homeBtn = document.querySelector('#home-btn')
const $bookmarkBtn = document.querySelector('#bookmark-btn')
const $constrainBtn = document.querySelector('#constrain-btn')
const $newinBtn = document.querySelector('#newin-btn')
const $linkBtn = document.querySelector('#link-btn')
const $ontopBtn = document.querySelector('#ontop-btn')
const $scalehBtn = document.querySelector('#scaleh-btn')
const $scalewBtn = document.querySelector('#scalew-btn')
const $panelToggle = document.querySelectorAll('.panel-toggle')
const $homeNavBtn = document.querySelectorAll('.home-nav-btn')
const $homeLayout = document.querySelectorAll('.home-layout')
const $settingsNavBtn = document.querySelectorAll('.settings-nav-btn')
const $settingsLayout = document.querySelectorAll('.settings-layout')
const $settingsLayoutBtn = document.querySelectorAll('.settings-layout-btn')
const $aboutName = document.querySelector('#about-name')
const $aboutVer = document.querySelector('#about-ver')
const $aboutCopyright = document.querySelector('#about-copyright')
const $aboutAttribution = document.querySelector('#about-attribution')
const $aboutRepoBtn = document.querySelector('#about-repo-btn')
const $aboutEmailBtn = document.querySelector('#about-email-btn')
const $aboutBugBtn = document.querySelector('#about-bug-btn')
const $homeLayoutBtn = document.querySelectorAll('.home-layout-btn')
const $appControl = document.querySelectorAll('.app-control')
const $appControls = document.querySelector('#app-controls')
const $winControl = document.querySelectorAll('.win-control')
const $winControls = document.querySelector('#win-controls')
const $openDevTools = document.querySelector('#open-devtools-btn')
const $bookmarkListBtn = document.querySelector('#bookmark-list-btn')
const $bookmarkSortOldBtn = document.querySelector('#bookmark-sort-old-btn')
const $bookmarkSortNewBtn = document.querySelector('#bookmark-sort-new-btn')
const $bookmarkSortTitleBtn = document.querySelector('#bookmark-sort-title-btn')
const $bookmarkSortHostBtn = document.querySelector('#bookmark-sort-host-btn')
const $bookmarkNewLinkBtn = document.querySelector('#bookmark-newlink-btn')
const $libraryListBtn = document.querySelector('#library-list-btn')
const $libraryMovieBtn = document.querySelector('#library-movie-btn')
const $libraryTvBtn = document.querySelector('#library-tv-btn')
const $librarySortOldBtn = document.querySelector('#library-sort-old-btn')
const $librarySortNewBtn = document.querySelector('#library-sort-new-btn')
const $librarySortTitleBtn = document.querySelector('#library-sort-title-btn')
const $librarySortPathBtn = document.querySelector('#library-sort-path-btn')

// Vars
let headerCollapsed = 0
let headerExpanded = 0
let dragAnimationId
let dragMouseX
let dragMouseY
let dragStream
let dragLeave
let headerTimeOut
let editMode = false

// Functions
const headerDim = await window.electronAPI.getHeaderHeight()

const logOutput = log => {
  console.log(`${new Date().toLocaleString()}: ${log}\n`)
}

// create stream element for stream bar, stream edit panel and append add new stream element
const loadStreams = () => {
  $streamControls.replaceChildren([])
  $streamsEdit.replaceChildren([])
  streams.forEach(stream => {
    loadStreamBar(stream)
    loadStreamPanel(stream)
  })
  setStreams(streams)
  // logOutput('Streams Updated')
  loadStreamPanel({
    active: true,
    glyph: '+',
    title: 'Add New',
    url: '',
    color: '#787878',
    bgColor: '#232323',
    order: 9999,
    id: 0
  })
}

// apply settings on startup
const applySettings = () => {
  headerCollapsed = headerDim.base
  headerExpanded = headerDim.height

  loadStreams()

  getBookmarks()

  loadLibraryFromStorage()

  changeHomeLayout()

  toggleOntop(getWinLock() === 'true')

  toggleRatio(getWinRatio() === 'true')

  const prefs = getPrefs()

  prefs.forEach(pref => loadSettingsPanel(pref))

  if (prefs.find(pref => pref.id === 'pref-window').state()) {
    window.electronAPI.winSetLoc(getWinBounds())
  }

  if (prefs.find(pref => pref.id === 'pref-last').state()) {
    window.electronAPI.lastStream((e, url) => setLastStream(url))
  }

  if (prefs.find(pref => pref.id === 'library-scan').state()) {
    console.log('Auto-scanning library directories for new files...')
    rescanAllLibraryDirs()
  }

  loadLibraryDirectoryPanel()

  loadClearDataPanel()

  window.electronAPI.defaultAgent(getDefaultAgent())

  window.electronAPI.updateHeaderHeight(headerCollapsed)

  window.electronAPI.winGetLoc((e, bounds) => setWinBounds(bounds))

  window.electronAPI.setIsMac((e, bool) => osHeader(bool))

  window.electronAPI.setAccent((e, color) => {
    let root = document.documentElement
    root.style.setProperty('--color-system-accent', color)
    root.style.setProperty('--color-system-accent-trans', color.substring(0, 7) + '80')
  })

  window.electronAPI.openUrl(getLastStream())
}

// helper funtion to create element from html string
const elementFromHtml = html => {
  const parser = new DOMParser()
  const template = document.createElement('template')
  template.innerHTML = parser.parseFromString(html.trim(), "text/html").body.innerHTML
  return template.content.firstElementChild
}

// create stream element for stream bar and stream edit panel
const createStreamElement = stream => {
  const ele = elementFromHtml(`<div class="stream-control" data-url="${stream.url}" data-id="${stream.id}" title="${stream.title}" style="order:${stream.order}; color:${stream.color}; background-color:${stream.bgColor};">${stream.glyph}</div>`)
  ele.addEventListener('mouseenter', () => {
    ele.style.color = stream.bgColor
    ele.style.backgroundColor = stream.color
  })
  ele.addEventListener('mouseleave', () => {
    ele.style.color = stream.color
    ele.style.backgroundColor = stream.bgColor
  })
  return ele
}

// call create element for stream object and add to stream bar
const loadStreamBar = stream => {
  const frag = document.createDocumentFragment()
  const ele = createStreamElement(stream)
  ele.addEventListener('click', e => {
    togglePanel(null, true)
    window.electronAPI.openUrl(e.target.dataset.url)
  })
  ele.addEventListener('dblclick', e => e.stopPropagation())
  frag.appendChild(ele)
  $streamControls.appendChild(frag)
}

// turn on stream edit mode
const editStreamLineup = bool => {
  editMode = bool
  if (editMode) {
    closeStreamEdit()
    $settingsLayoutBtn.forEach(lo => lo.style.display = 'none')
    $streamDoneBtn.style.display = 'block'
    document.querySelectorAll('.stream-delete').forEach(el => el.style.display = 'flex')
    document.querySelectorAll('.stream-settings-control').forEach(el => {
      el.setAttribute('draggable', true)
      el.classList.add('wobble')
      el.style.animationDelay = `-${(Math.random() * (75 - 5) + 5) / 100}s` // -.05 - -.75
      el.style.animationDuration = `${(Math.random() * (33 - 22) + 22) / 100}s` // .22 - .33
    })
  } else {
    $streamDoneBtn.style.display = 'none'
    $settingsLayoutBtn.forEach(lo => lo.dataset.layout === 'streams' ? lo.style.display = '' : null)
    document.querySelectorAll('.stream-delete').forEach(el => el.style.display = '')
    document.querySelectorAll('.stream-settings-control').forEach(el => {
      el.setAttribute('draggable', false)
      el.classList.remove('wobble')
      el.style.animationDelay = ''
      el.style.animationDuration = ''
    })
  }
}

// load stream edit panel
const loadStreamPanel = stream => {
  let mouseTimeout = undefined
  let mouseHold = false
  const mouseHeld = () => {
    mouseTimeout = setTimeout(() => {
      if (mouseHold && !editMode) {
        editMode = true
        editStreamLineup(true)
      }
    }, 1500)
  }
  const frag = document.createDocumentFragment()
  const ele = createStreamElement(stream)
  ele.classList.add('stream-settings-glyph')
  if (stream.id === 0) {
    ele.classList.add('stream-add-control')
    ele.addEventListener('click', e => {
      e.stopPropagation()
      if (!editMode) {
        openStreamEdit({
          active: true,
          glyph: 'A',
          title: 'Add New',
          url: 'https://',
          color: '#787878',
          bgColor: '#232323',
          order: Math.max(...streams.map(s => s.order)) + 1,
          id: getNewStreamId()
        })
      }
    })
  } else {
    const del = elementFromHtml('<div class="stream-delete fas fa-xmark"></div>')
    ele.appendChild(del)
    ele.classList.add('stream-settings-control')
    ele.addEventListener('click', e => {
      e.stopPropagation()
      if (!editMode) {
        openStreamEdit(stream)
      }
    })
    ele.addEventListener('dragstart', e => {
      dragStream = e.target
    })
    ele.addEventListener('mousedown', () => {
      clearTimeout(mouseTimeout)
      mouseHold = true
      mouseHeld()
    })
    ele.addEventListener('mouseup', () => {
      mouseHold = false
    })
    del.addEventListener('click', e => {
      e.stopPropagation()
      if (e.target.dataset.deleting === 'true') {
        return
      }
      if (confirm(`Delete ${stream.title}?`) == true) {
        e.target.dataset.deleting = 'true'
        e.target.parentElement.classList.add('element-fadeout')
        e.target.parentElement.addEventListener('transitionend', () => {
          e.target.parentElement.remove()
          const streamIndex = streams.findIndex(s => s.id === stream.id)
          if (streamIndex > -1) {
            streams.splice(streamIndex, 1)
            reorderStreams()
            repaintStreamBar()
          }
        }, { once: true })
      }
    })
  }
  ele.addEventListener('mouseleave', () => {
    mouseHold = false
  })
  frag.appendChild(ele)
  $streamsEdit.appendChild(frag)
}

// open stream edit pop up
const openStreamEdit = stream => {
  closeStreamEdit()
  const updateStream = { ...stream }
  const frag = document.createDocumentFragment()
  const ele = elementFromHtml(`<div class="stream-edit-container"></div>`)
  const glyph = elementFromHtml(`<div class="stream-edit-glyph" contenteditable="true" style="color: ${stream.color}; background-color: ${stream.bgColor};">${stream.glyph}</div>`)
  glyph.addEventListener('input', (e) => {
    updateStream.glyph = e.target.textContent
    updateStreams(updateStream)
  })
  glyph.addEventListener('keypress', (e) => {
    if (e.target.textContent.length > 0) {
      e.preventDefault()
    }
  })
  const color = elementFromHtml(`<div class="stream-edit-color">Font Color</div>`)
  const colorIpt = elementFromHtml(`<input class="stream-edit-color-input" type="color" value="${stream.color}">`)
  colorIpt.addEventListener('change', (e) => {
    glyph.style.color = e.target.value
    updateStream.color = e.target.value
    updateStreams(updateStream)
  })
  color.appendChild(colorIpt)
  const bg = elementFromHtml(`<div class="stream-edit-bg">Back Color</div>`)
  const bgIpt = elementFromHtml(`<input class="stream-edit-color-input" type="color" value="${stream.bgColor}">`)
  bgIpt.addEventListener('change', (e) => {
    glyph.style.backgroundColor = e.target.value
    updateStream.bgColor = e.target.value
    updateStreams(updateStream)
  })
  bg.appendChild(bgIpt)
  const ttl = elementFromHtml(`<div class="stream-edit-ttl">Title</div>`)
  const ttlIpt = elementFromHtml(`<input class="stream-edit-text-input" type="url" value="${stream.title}">`)
  ttlIpt.addEventListener('change', (e) => {
    updateStream.title = e.target.value
    updateStreams(updateStream)
  })
  ttl.appendChild(ttlIpt)
  const url = elementFromHtml(`<div class="stream-edit-url">URL</div>`)
  const urlIpt = elementFromHtml(`<input class="stream-edit-text-input" type="url" value="${stream.url}">`)
  urlIpt.addEventListener('change', (e) => {
    updateStream.url = e.target.value
    updateStreams(updateStream)
  })
  url.appendChild(urlIpt)
  ele.appendChild(glyph)
  ele.appendChild(color)
  ele.appendChild(bg)
  ele.appendChild(ttl)
  ele.appendChild(url)
  ele.addEventListener('click', (e) => {
    e.stopPropagation()
  })
  frag.appendChild(ele)
  $streamsEdit.appendChild(frag)
}

// close stream edit pop up
const closeStreamEdit = () => {
  document.querySelectorAll('.stream-edit-container').forEach(el => el.remove())
}

// update or add streams, save to local storage, load stream bar and panel
const updateStreams = stream => {
  const streamToReplace = streams.find(s => s.id === stream.id)
  if (streamToReplace) {
    Object.assign(streamToReplace, stream)
    document.querySelectorAll(`[data-id=${stream.id}]`).forEach(el => el.remove())
  } else {
    streams.push(stream)
  }
  setStreams(streams)
  // logOutput('Streams Updated')
  loadStreamPanel(stream)
  repaintStreamBar()
}

// reorder stream elements in stream edit pane
const updateOrder = ele => {
  // New order
  const loc = (parseInt(ele.style.order) + 1) > 9999 ? 9999 : parseInt(ele.style.order) + 1
  // Update stream order in edit pane
  document.querySelectorAll('.stream-settings-control').forEach((el) => {
    if (el.style.order && el.style.order >= loc) {
      el.style.order++
    }
    dragStream.style.order = loc
    // Update order in streams array
    streams.find(s => s.id === el.dataset.id).order = parseInt(el.style.order)
  })
  reorderStreams()
  repaintStreamBar()
}

// reorder streams array and save to local storage
const reorderStreams = () => {
  // Sort the steams array based on new order
  streams.sort((a, b) => (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0))
  // Reset order# from 1 to n based on new index
  streams.forEach((s, i) => s.order = i + 1)
  // Save to local storage
  setStreams(streams)
  // logOutput('Streams Updated')
}

// reload stream bar elements
const repaintStreamBar = () => {
  $streamControls.replaceChildren([])
  streams.forEach(stream => loadStreamBar(stream))
}

// load settings panel
const loadSettingsPanel = pref => {
  if (!pref.live) return
  const frag = document.createDocumentFragment()
  const ele = elementFromHtml(`<div class="settings-control" title="${pref.description.split('(')[0].trim()}"></div>`)
  const lbl = elementFromHtml(`<div class="settings-label">${pref.label}</div>`)
  const ipt = elementFromHtml(`<input id="${pref.id}" type="${pref.type}">${pref.label}</input>`)
  const desc = elementFromHtml(`<div class="text-muted">${pref.description}</div>`)
  switch (pref.type) {
    case 'checkbox':
      desc.classList.add('settings-muted')
      ele.classList.add('settings-toggle')
      ele.appendChild(lbl)
      ipt.classList.add('toggle')
      ipt.checked = pref.state()
      ipt.addEventListener('click', e => {
        pref.update(e.target.checked)
        updatePref(pref.id, e.target.checked)
      })
      ele.appendChild(ipt)
      pref.category === 'prefs-show' ? null : ele.appendChild(desc)
      updatePref(pref.id, pref.state())
      break
    case 'text':
      ele.classList.add('settings-text')
      ipt.classList.add(pref.category)
      ipt.classList.add('settings-input')
      ipt.setAttribute('value', pref.state() || pref.defaults)
      ipt.addEventListener('change', e => {
        if (e.target.value.length === 0) {
          e.target.value = pref.defaults
        }
        pref.update(e.target.value)
      })
      ele.appendChild(lbl)
      ele.appendChild(ipt)
      ele.append(desc)
      break
    case 'select':
      const sel = elementFromHtml(`<select id="${pref.id}" class="${pref.category} settings-select" ></select>`)
      ele.classList.add('settings-text')
      // this is a little dumb but room for other select custom logic
      switch (pref.id) {
        case 'search-loc':
          locs.sort((a, b) => a.LocName.localeCompare(b.LocName))
          locs.forEach(loc => {
            const selected = loc.LocId === pref.state() ? 'selected' : ''
            const opt = elementFromHtml(`<option ${selected} value=${loc.LocId}>${loc.LocName}</option>`)
            sel.appendChild(opt)
          })
          break
        default:
          break
      }
      sel.setAttribute('value', pref.state())
      sel.addEventListener('change', e => {
        pref.update(e.target.options[e.target.selectedIndex].value)
      })
      ele.appendChild(lbl)
      ele.appendChild(sel)
      ele.append(desc)
      break
    default:
      break
  }
  frag.appendChild(ele)

  switch (pref.category) {
    case 'prefs':
      $prefsLayout.appendChild(frag)
      break
    case 'prefs-show':
      if (!document.querySelector('#prefs-show')) {
        const prefsShow = elementFromHtml(`<div id="prefs-show">Hide App Controls</div>`)
        $prefsLayout.appendChild(prefsShow)
      }
      $prefsLayout.appendChild(frag)
      break
    case 'search':
      $searchLayout.appendChild(frag)
      break
    case 'library':
      $libraryLayout.appendChild(frag)
      break
    case 'advanced':
      $advancedLayout.appendChild(frag)
      break
    case 'service':
      $servicePrefs.appendChild(frag)
      break
    default:
      $advancedLayout.appendChild(frag)
      break
  }
}

// load library directory panel
const loadLibraryDirectoryPanel = () => {
  document.querySelector('#library-directories-pane')?.parentElement.remove()
  const dirs = JSON.parse(localStorage.getItem('directories')) || []
  const frag = document.createDocumentFragment()
  const header = elementFromHtml(`<div class="settings-control"></div>`)
  const title = elementFromHtml(`<div class="settings-label">Library Directories</div>`)
  const desc = elementFromHtml(`<div class="text-muted settings-muted">Add, remove and update library directories</div>`)
  const pane = elementFromHtml(`<div id="library-directories-pane"></div>`)
  const addMovieBtn = elementFromHtml(`<button class="library-add-btn fa fa-film" title="Add Movie Directory"></button>`)
  addMovieBtn.addEventListener('click', async () => {
    const selectedDir = await window.electronAPI.openDirectoryDialog()
    if (selectedDir) {
      const type = 'movie'
      addLibraryDirectory(selectedDir, type)
    }
  })
  const addTvBtn = elementFromHtml(`<button class="library-add-btn fa fa-tv" title="Add TV Directory"></button>`)
  addTvBtn.addEventListener('click', async () => {
    const selectedDir = await window.electronAPI.openDirectoryDialog()
    if (selectedDir) {
      const type = 'tv'
      addLibraryDirectory(selectedDir, type)
    }
  })
  dirs.forEach(dir => {
    const libDir = elementFromHtml(`<div class="library-directory"></div>`)
    const libDirType = elementFromHtml(`<div class="library-directory-type">${dir.type}</div>`)
    const libDirPath = elementFromHtml(`<div class="library-directory-path" title="${dir.path}">${dir.path}</div>`)
    const libDirRescan = elementFromHtml('<div class="library-directory-btn fas fa-rotate-left" title="Scan for New Files"></div>')    
    const libDirRefresh = elementFromHtml('<div class="library-directory-btn fas fa-arrows-rotate" title="Refresh all Metadata"></div>')
    const libDirDel = elementFromHtml('<div class="library-directory-btn library-directory-delete-btn fas fa-xmark" title="Delete Entry"></div>')
    const libDirStatus = elementFromHtml(`<div class="library-directory-status fas"></div>`)
    libDirRescan.addEventListener('click', () => {
      // trigger a rescan of the library directory
      console.log(`Rescanning library directory: ${dir.path}`)
      // look for new files in the directory and remove any items that no longer exist
      loadLibraryDir(dir.path, dir.type)
    })
    libDirRefresh.addEventListener('click', () => {
      // trigger a refresh of the library directory metadata
      console.log(`Refreshing library directory metadata: ${dir.path}`)
      // drop items from local storage libarary with path and save
      const library = JSON.parse(localStorage.getItem('library')) || []
      const updatedLibrary = library.filter(item => item.path !== dir.path)
      localStorage.setItem('library', JSON.stringify(updatedLibrary))
      // load the library directory again
      loadLibraryDir(dir.path, dir.type)
    })
    libDirDel.addEventListener('click', () => {
      // trigger a delete of the library directory
      console.log(`Deleting library directory: ${dir.path}`)
      // remove the directory from local storage
      const dirs = JSON.parse(localStorage.getItem('directories')) || []
      dirs.splice(dirs.findIndex(d => d.path === dir.path), 1)
      localStorage.setItem('directories', JSON.stringify(dirs))
      // remove library items with path from storage
      const library = JSON.parse(localStorage.getItem('library')) || []
      const updatedLibrary = library.filter(item => item.path !== dir.path)
      localStorage.setItem('library', JSON.stringify(updatedLibrary))
      // reload library directory panel
      loadLibraryDirectoryPanel()
      // reload library items
      $library.replaceChildren([])
      $libraryList.replaceChildren([])
      loadLibraryFromStorage()
    })
    libDir.appendChild(updateLibraryDirStatus(libDirStatus, dir.status))
    libDir.appendChild(libDirType)
    libDir.appendChild(libDirPath)
    libDir.appendChild(libDirRescan)
    libDir.appendChild(libDirRefresh)
    libDir.appendChild(libDirDel)
    pane.appendChild(libDir)
  })
  pane.appendChild(addMovieBtn)
  pane.appendChild(addTvBtn)
  header.appendChild(title)
  header.appendChild(desc)
  header.appendChild(pane)
  frag.appendChild(header)
  $libraryLayout.appendChild(frag)
}

// add directory to library directory storage, panel and load library directory
const addLibraryDirectory = (path, type) => {
  const dirs = JSON.parse(localStorage.getItem('directories')) || []
  if (!dirs.some(entry => entry.path === path)) {
    dirs.push({
      path,
      type,
      status: 'file'
    })
    localStorage.setItem('directories', JSON.stringify(dirs))
    loadLibraryDirectoryPanel()
    loadLibraryDir(path, type)
  } else {
    alert(`Directory ${path} already exists in library.`)
  }
}

// get year from date input
const getYear = input => {
  const year = new Date(input).getFullYear()
  return isNaN(year) ? 'NA' : year
}

// get int date from date input
const getDate = input => {
  const date = new Date(input)
  return isNaN(date) ? 'NA' : date.getTime()
}

// create a library tile
const createLibraryTile = libraryObj => {
  const cleanTitle = libraryObj.metadata?.title || libraryObj.metadata?.name || libraryObj.title || 'Unknown Title'
  const cleanYear = libraryObj.releaseYear === undefined ? '' : `(${libraryObj.releaseYear})`
  const tmdbImagePath = 'https://image.tmdb.org/t/p/original'
  const poster = libraryObj.metadata?.poster_path ? `${tmdbImagePath}${libraryObj.metadata?.poster_path}` : null
  const resultTile = elementFromHtml(`<div class="result-tile"></div>`)
  const resultPoster = elementFromHtml(`<img class="result-poster" src="${poster}"></img>`)
  const resultDetails = elementFromHtml(`<div class="result-details"></div>`)
  const resultTitle = elementFromHtml(`<div class="result-title" title="${cleanTitle}">${cleanTitle}</div>`)
  const resultYear = elementFromHtml(`<div class="result-year" title="${cleanYear}">${cleanYear}</div>`)

  resultDetails.appendChild(resultTitle)
  resultDetails.appendChild(resultYear)
  resultTile.appendChild(resultDetails)
  poster ? resultTile.appendChild(resultPoster) : null
  resultTile.addEventListener('click', () => window.electronAPI.openUrl(libraryObj.url))
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
  libraryListItem.addEventListener('click', () => window.electronAPI.openUrl(libraryObj.url))
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
const loadLibraryUi = library => {
  const fragTiles = document.createDocumentFragment()
  const fragList = document.createDocumentFragment()
  library.forEach(li => {
    fragTiles.appendChild(createLibraryTile(li))
    fragList.appendChild(createLibraryListItem(li))
  })
  $library.replaceChildren([])
  $libraryList.replaceChildren([])
  $library.appendChild(fragTiles)
  $libraryList.appendChild(fragList)
}

// load library directory
const loadLibraryDir = (dir, type) => {
  type === 'movie' ? window.electronAPI.getMovies(dir) : window.electronAPI.getTv(dir)
  $libraryTvBtn.classList.remove('toggled-bg')
  $libraryMovieBtn.classList.remove('toggled-bg')
}

// load library from local storage
const loadLibraryFromStorage = () => {
  const libraryWithMetadata = JSON.parse(localStorage.getItem('library')) || []
  if (libraryWithMetadata.length > 0) {
    loadLibraryUi(libraryWithMetadata)
    return;
  }
}

// metadata load error handler
const handleMetadataError = (dir, error) => {
  if (error === 1) {
    console.log(`TMDB API Error: No API key provided`)
    alert('TMDB API Error: No API key provided. Please set your TMDB API key in the search settings.')
    setLibraryDirStatus(dir, 'error')
  } else if (error === -1) {
    console.log(`TMDB API Error`)
    setLibraryDirStatus(dir, 'error')
  }
}

// set directory metadata status
const setLibraryDirStatus = (dir, status) => {
  console.log(`Setting status for directory: ${dir} to ${status}`)
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
    console.error(`Directory ${dir} not found in library directories`)
  }
}

// update library directory status icon
const updateLibraryDirStatus = (ele, status) => {
  ele.classList.remove('fa-file', 'fa-hourglass-half', 'fa-check', 'fa-triangle-exclamation', 'green', 'yellow')
  switch (status) {
    case 'file':
      ele.classList.add('fa-file')
      ele.title = 'File Loaded'
      break
    case 'pending':
      ele.classList.add('fa-hourglass-half')
      ele.title = 'Pending Metadata'
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
}

// get metadata for library items
const getLibraryMetadata = async (type, dir) => {
  setLibraryDirStatus(dir, 'pending')
  let error = false
  console.log(`Fetching metadata for Directory: ${dir}, Type: ${type}`)
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
    const searchTerm = item.title
    console.log(`Searching for metadata for: ${searchTerm}`)
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
      metadata = searchResult.results[0]
      releaseYear = getYear(metadata.release_date || metadata.first_air_date || 'NA')
      releaseDate = getDate(metadata.release_date || metadata.first_air_date || 'NA')
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
const rescanAllLibraryDirs = () => {
  const dirs = JSON.parse(localStorage.getItem('directories')) || []
  dirs.forEach(dir => loadLibraryDir(dir.path, dir.type))
}

// load clear data elements
const loadClearDataPanel = () => {
  let restart = true
  function start(target) {
    restart = target === cdBtn
    target.addEventListener('transitionend', done)
  }
  function cancel(target) {
    target.blur()
    target.removeEventListener('transitionend', done)
  }
  function done() {
    cdBtn.disabled = true
    cdBtn.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-system-accent')
    window.electronAPI.clearData(restart)
  }

  const frag = document.createDocumentFragment()
  const header = elementFromHtml(`<div class="settings-control"></div>`)
  const title = elementFromHtml(`<div class="settings-label">Clear StreamDock Data</div>`)
  const pane = elementFromHtml(`<div class="clear-data-pane"></div>`)
  const et = elementFromHtml(`<div class="clear-data-warn fas fa-triangle-exclamation"></div>`)
  pane.appendChild(et)
  const dz = elementFromHtml(`<div class="clear-data-danger">Danger Zone!</div>`)
  pane.appendChild(dz)
  const btns = elementFromHtml(`<div class="clear-data-btn-host"></div>`)
  const cdBtn = elementFromHtml(`<button class="clear-data-btn">Clear Data</button>`)
  cdBtn.addEventListener('mousedown', () => start(cdBtn))
  cdBtn.addEventListener('mouseup', () => cancel(cdBtn))
  cdBtn.addEventListener('mouseleave', () => cancel(cdBtn))
  btns.appendChild(cdBtn)
  pane.appendChild(btns)
  const dc = elementFromHtml(`<div class="clear-data-disclaimer">This will reset the app as if it was freshly installed and restart. This will log you out of all services and delete all bookmarks and updated settings. This cannot be undone! Click and hold the button until it fills to activate.</div>`)
  pane.appendChild(dc)
  header.appendChild(title)
  header.appendChild(pane)
  frag.appendChild(header)
  $advancedLayout.appendChild(frag)
}

// change settings layout based on button clicked
const changeSettingsLayout = (el = $settingsNavBtn[0]) => {
  editStreamLineup(false)
  $settingsNavBtn.forEach(el => el.style.backgroundColor = '')
  el.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-control-darkgray')
  $settingsLayout.forEach(lo => lo.style.display = 'none')
  document.querySelector('#settings-nav > .btn-divider').style.display = 'none'
  $settingsLayoutBtn.forEach(lob => {
    if (lob.dataset.layout === el.dataset.layout) {
      lob.style.display = ''
      document.querySelector('#settings-nav > .btn-divider').style.display = ''
    } else {
      lob.style.display = 'none'
    }
  })
  document.querySelector(`#${el.dataset.layout}-layout`).style.display = ''
}

// change home layout based on button clicked
const changeHomeLayout = (el = $homeNavBtn[0]) => {
  $homeNavBtn.forEach(el => el.style.backgroundColor = '')
  el.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-control-darkgray')
  $homeLayout.forEach(lo => lo.style.display = 'none')
  $homeLayoutBtn.forEach(lob => lob.style.display = lob.dataset.layout === el.dataset.layout ? '' : 'none')
  document.querySelector(`#${el.dataset.layout}-home-layout`).style.display = ''
}

// toggle header panel based on button clicked
const togglePanel = (panelBtn, override) => {
  editStreamLineup(false)
  closeStreamEdit()
  changeSettingsLayout()
  if (override || panelBtn.classList.contains('toggled')) {
    $panelToggle.forEach(b => b.classList.remove('toggled'))
    window.electronAPI.updateHeaderHeight(headerExpanded)
    $headerPanels.forEach(p => p.style.display = '')
  } else {
    $panelToggle.forEach(b => b.classList.remove('toggled'))
    panelBtn.classList.add('toggled')
    window.electronAPI.updateHeaderHeight(null)
    $headerPanels.forEach(p => p.style.display = p.dataset.panel === panelBtn.dataset.panel ? 'flex' : '')
  }
}

// toggle window ratio lock
const toggleRatio = (override = false) => {
  const toggle = $constrainBtn.classList.contains('toggled') || !override
  window.electronAPI.winRatio(!toggle)
  $constrainBtn.classList.toggle('toggled', !toggle)
  setWinRatio(!toggle)
}

// toggle window ontop
const toggleOntop = (override = false) => {
  const toggle = $ontopBtn.classList.contains('toggled') || !override
  window.electronAPI.winLock(!toggle)
  $ontopBtn.classList.toggle('toggled', !toggle)
  setWinLock(!toggle)
}

// start dragging window
const onDragMouseDown = e => {
  onDragMouseUp()
  if (e.button !== 0) {
    return
  }
  dragMouseX = e.clientX
  dragMouseY = e.clientY
  window.addEventListener('mouseup', onDragMouseUp)
  dragAnimationId = requestAnimationFrame(moveWindow)
}

// stop dragging window
const onDragMouseUp = () => {
  if (dragAnimationId) {
    cancelAnimationFrame(dragAnimationId)
    dragAnimationId = null
  }
  window.removeEventListener('mouseup', onDragMouseUp)
}

// move window on drag
const moveWindow = () => {
  window.electronAPI.winMove({ mouseX: dragMouseX, mouseY: dragMouseY })
  dragAnimationId = requestAnimationFrame(moveWindow)
}

// collapse header on mouseleave
const collaspeHeader = () => {
  if ($header.offsetHeight > headerExpanded) return
  $header.removeEventListener('mouseleave', waitHeader)
  $headerControls.style.cssText = ''
  $header.style.cssText = ''
  window.electronAPI.updateHeaderHeight(headerCollapsed)
}

// wait to collaspe header on mouseleave
const waitHeader = () => {
  window.clearTimeout(headerTimeOut)
  headerTimeOut = window.setTimeout(collaspeHeader, 1000)
}

// expand header on mouseenter
const expandHeader = () => {
  if ($header.offsetHeight > headerExpanded) return
  $header.addEventListener('mouseleave', waitHeader)
  $header.style.cssText = 'opacity: 1'
  window.electronAPI.updateHeaderHeight(headerExpanded)
  window.electronAPI.winFocus()
  window.clearTimeout(headerTimeOut)
}

// render header based on OS
const osHeader = isMac => {
  if (!isMac) {
    $dragWin.style.minWidth = '24px'
    $streamControls.style.marginTop = 'unset'
    $appControls.style.flexDirection = 'row-reverse'
    $appControls.style.gridColumn = 1
    $winControls.style.flexDirection = 'row-reverse'
    $winControls.style.gridColumn = 3
    $winControl.forEach(wc => wc.style.display = 'flex')
    if (!document.fonts.check('12px Segoe MDL2 Assets')) {
      $winControl.forEach(wc => {
        wc.classList.add('far')
        wc.classList.add('lin-control')
        wc.textContent = ''
      })
      document.querySelector('#close-btn').classList.add('fa-x')
      document.querySelector('#close-btn').classList.add('lin-close')
      document.querySelector('#max-btn').classList.add('fa-square-full')
      document.querySelector('#min-btn').classList.add('fa-window-minimize')
    }
  }
}

// apply preference updates
const updatePref = (id, val) => {
  // logOutput(`Preference ${id} Updated`)
  switch (id) {
    case 'pref-fullscreen':
      window.electronAPI.winFullscreen(val)
      break
    case 'search-show':
      toggleSearch(val)
      break
    case 'library-show':
      toggleLibrary(val)
      break
    case 'back-btn':
      $backBtn.style.display = val ? 'none' : ''
      break
    case 'link-btn':
      $linkBtn.style.display = val ? 'none' : ''
      break
    case 'newin-btn':
      $newinBtn.style.display = val ? 'none' : ''
      break
    case 'scaleh-btn':
      $scalehBtn.style.display = val ? 'none' : ''
      break
    case 'scalew-btn':
      $scalewBtn.style.display = val ? 'none' : ''
      break
    case 'constrain-btn':
      $constrainBtn.style.display = val ? 'none' : ''
      break
    case 'ontop-btn':
      $ontopBtn.style.display = val ? 'none' : ''
      break
    default:
      break
  }
}

// toggle search UI elements
const toggleSearch = bool => {
  if (bool) {
    $searchNavBtn.style.display = ''
    document.querySelectorAll('.search').forEach(el => el.disabled = false)
    $aboutAttribution.textContent = 'This product uses the TMDB API but is not endorsed or certified by TMDB.'
  } else {
    $searchNavBtn.style.display = 'none'
    document.querySelectorAll('.search').forEach(el => el.disabled = true)
    $aboutAttribution.textContent = ''
    changeHomeLayout()
  }
}

// toggle library UI elements
const toggleLibrary = bool => {
  if (bool) {
    $libraryNavBtn.style.display = ''
  } else {
    $libraryNavBtn.style.display = 'none'
    changeHomeLayout()
  }
}

// restore missing default streams
const restoreStreams = () => {
  getStreams(true).forEach(s => {
    streams.find(c => c.url === s.url) ? null : streams.push(s)
  })
  reorderStreams()
  loadStreams()
}

// create a bookmark tile
const createBookmarkTile = bookmarkObj => {
  const cleanTitle = getCleanTitle(bookmarkObj.title)
  const frag = document.createDocumentFragment()
  const bookmark = elementFromHtml(`<div class="bookmark-instance" data-ts="${bookmarkObj.timestamp}" title="${cleanTitle}"></div>`)
  const image = elementFromHtml(`<img class="bookmark-image" src="${bookmarkObj.img}">`)
  const deleteBtn = elementFromHtml(`<div class="fas fa-xmark bookmark-delete"></div>`)
  deleteBtn.addEventListener('click', e => {
    e.stopImmediatePropagation()
    deleteBookmark(bookmarkObj.timestamp)
  })
  const linkBtn = elementFromHtml(`<div class="fas fa-link bookmark-link"></div>`)
  linkBtn.addEventListener('click', e => {
    e.stopImmediatePropagation()
    copyLink(e, bookmarkObj.url)
  })
  const title = elementFromHtml(`<div class="bookmark-title">${cleanTitle}</div>`)
  bookmark.appendChild(image)
  bookmark.appendChild(deleteBtn)
  bookmark.appendChild(linkBtn)
  bookmark.appendChild(title)
  bookmark.addEventListener('click', () => window.electronAPI.openUrl(bookmarkObj.url))
  frag.appendChild(bookmark)
  return frag
}

// create a boookmark list item
const createBookmarkListItem = bookmarkObj => {
  const cleanTitle = getCleanTitle(bookmarkObj.title)
  const frag = document.createDocumentFragment()
  const bookmarkListItem = elementFromHtml(`<div class="bookmark-row" data-ts="${bookmarkObj.timestamp}" title="${cleanTitle}"></div>`)
  const bookmarkListTitle = elementFromHtml(`<div class="bookmark-cell">${cleanTitle}</div>`)
  const bookmarkListHost = elementFromHtml(`<div class="bookmark-cell">${getCleanHost(bookmarkObj.url)}</div>`)
  const bookmarkListTime = elementFromHtml(`<div class="bookmark-cell bookmark-cell-right">${new Date(bookmarkObj.timestamp).toLocaleString()}</div>`)
  const bookmarkListLink = elementFromHtml(`<div class="fas fa-link bookmark-cell-link"></div>`)
  const bookmarkListDelete = elementFromHtml(`<div class="fas fa-xmark bookmark-cell-delete"></div>`)
  bookmarkListItem.appendChild(bookmarkListTitle)
  bookmarkListItem.appendChild(bookmarkListHost)
  bookmarkListItem.appendChild(bookmarkListTime)
  bookmarkListItem.appendChild(bookmarkListLink)
  bookmarkListItem.appendChild(bookmarkListDelete)
  bookmarkListItem.addEventListener('click', () => window.electronAPI.openUrl(bookmarkObj.url))
  bookmarkListLink.addEventListener('click', e => {
    e.stopImmediatePropagation()
    copyLink(e, bookmarkObj.url, true)
  })
  bookmarkListDelete.addEventListener('click', e => {
    e.stopImmediatePropagation()
    deleteBookmark(bookmarkObj.timestamp)
  })
  frag.appendChild(bookmarkListItem)
  return frag
}

// toggle bookmark list view
const bookmarkListView = () => {
  if ($bookmarkListBtn.classList.contains('toggled-bg')) {
    $bookmarkListBtn.classList.remove('toggled-bg')
    $bookmarks.style.display = ''
    $bookmarkList.style.display = ''
  } else {
    $bookmarkListBtn.classList.add('toggled-bg')
    $bookmarks.style.display = 'none'
    $bookmarkList.style.display = 'flex'
  }
}

// add bookmark to UI and local storage
const addBookmark = bookmarkObj => {
  $bookmarks.appendChild(createBookmarkTile(bookmarkObj))
  $bookmarkList.appendChild(createBookmarkListItem(bookmarkObj))
  elementAddFlash($homeBtn)
  const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || []
  bookmarks.push(bookmarkObj)
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
  // logOutput('Bookmark Added')
}

// delete bookmark by timestamp
const deleteBookmark = timestamp => {
  document.querySelectorAll('.bookmark-instance, .bookmark-row').forEach(bm => {
    if (bm.dataset.ts == timestamp) {
      bm.classList.add('element-fadeout')
      setTimeout(() => {
        bm.remove()
      }, 300)
    }
  })
  const bookmarks = JSON.parse(localStorage.getItem('bookmarks'))
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks.filter(bm => bm.timestamp !== timestamp)))
  // logOutput('Bookmark Deleted')
}

// get bookmarks from local storage
const getBookmarks = () => {
  const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || []
  loadBookmarks(bookmarks)
}

// load bookmarks from array
const loadBookmarks = bookmarks => {
  const fragTiles = document.createDocumentFragment()
  const fragList = document.createDocumentFragment()
  bookmarks.forEach(bm => {
    fragTiles.appendChild(createBookmarkTile(bm))
    fragList.appendChild(createBookmarkListItem(bm))
  })
  $bookmarks.appendChild(fragTiles)
  $bookmarkList.appendChild(fragList)
}

// remove www. from host
const getCleanHost = url => {
  return new URL(url).hostname.replace('www.', '')
}

// remove special characters from title
const getCleanTitle = title => {
  return title.replaceAll(/["'&<>]/g, '')
}

// sort bookmarks by order param
const sortBookmarks = order => {
  const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || []
  switch (order) {
    case 'old':
      // sort boomarks by timestamp ascending
      bookmarks.sort((a, b) => a.timestamp - b.timestamp)
      break
    case 'new':
      // sort boomarks by timestamp descending
      bookmarks.sort((a, b) => b.timestamp - a.timestamp)
      break
    case 'title':
      // sort boomarks by title ascending
      bookmarks.sort((a, b) => getCleanTitle(a.title) < getCleanTitle(b.title) ? -1 : 1)
      break
    case 'host':
      // sort boomarks by host ascending
      bookmarks.sort((a, b) => getCleanHost(a.url) < getCleanHost(b.url) ? -1 : 1)
      break
    default:
      bookmarks.sort((a, b) => a.timestamp - b.timestamp)
      break
  }
  $bookmarks.replaceChildren([])
  $bookmarkList.replaceChildren([])
  loadBookmarks(bookmarks)
}

// add flash animation class
const elementAddFlash = el => {
  el.classList.add('element-flash')
  el.addEventListener('animationend', elementRemoveFlash)
}

// remove flash animation class
const elementRemoveFlash = e => {
  e.target.removeEventListener('animationend', elementRemoveFlash)
  e.target.classList.remove('element-flash')
}

// load about panel details
const loadAbout = appInfo => {
  $aboutName.textContent = appInfo.name
  $aboutVer.textContent = appInfo.version
  $aboutCopyright.textContent = ` ${appInfo.author} 2020-${new Date().getFullYear()}`
  $aboutRepoBtn.dataset.link = appInfo.repository
  $aboutEmailBtn.dataset.link = appInfo.email
  $aboutBugBtn.dataset.link = appInfo.bugs
}

// copy link to clipboard and display 'copied' message
const copyLink = (e, link, alt = false) => {
  navigator.clipboard.writeText(link)
  const frag = document.createDocumentFragment()
  const copied = elementFromHtml(`<div class="copied" style="left:${alt ? e.clientX - 50 : e.clientX}px; top:${e.clientY - 30}px;">Copied!</div>`)
  frag.appendChild(copied)
  document.body.appendChild(frag)
  setTimeout(() => {
    copied.classList.add('element-fadeout')
    setTimeout(() => {
      copied.remove()
    }, 800)
  }, 600)
}

// Events
$drag.forEach(el => el.addEventListener('mousedown', e => onDragMouseDown(e)))

$settingsNavBtn.forEach(el => el.addEventListener('click', () => changeSettingsLayout(el)))

$aboutRepoBtn.addEventListener('click', e => copyLink(e, $aboutRepoBtn.dataset.link))

$aboutEmailBtn.addEventListener('click', e => copyLink(e, $aboutEmailBtn.dataset.link))

$aboutBugBtn.addEventListener('click', e => copyLink(e, $aboutBugBtn.dataset.link))

$homeNavBtn.forEach(el => el.addEventListener('click', () => changeHomeLayout(el)))

$streamsLayout.addEventListener('click', closeStreamEdit)

$streamsEdit.addEventListener('dragover', e => e.preventDefault())

$streamsEdit.addEventListener('drop', e => {
  e.preventDefault()
  updateOrder(e.target)
})

$streamDoneBtn.addEventListener('click', () => editStreamLineup(false))

$streamRestoreBtn.addEventListener('click', restoreStreams)

$closeBtn.addEventListener('click', window.electronAPI.winClose)

$maxBtn.addEventListener('click', window.electronAPI.winMax)

$minBtn.addEventListener('click', window.electronAPI.winMin)

$backBtn.addEventListener('click', window.electronAPI.navBack)

$newinBtn.addEventListener('click', window.electronAPI.openNewin)

$linkBtn.addEventListener('click', window.electronAPI.openLink)

$scalehBtn.addEventListener('click', () => window.electronAPI.winScaleHeight({ x: 16, y: 9 }))

$scalewBtn.addEventListener('click', () => window.electronAPI.winScaleWidth({ x: 16, y: 9 }))

$prefsBtn.addEventListener('click', () => togglePanel($prefsBtn))

$constrainBtn.addEventListener('click', toggleRatio)

$ontopBtn.addEventListener('click', toggleOntop)

$homeBtn.addEventListener('click', () => togglePanel($homeBtn))

$homeBtn.addEventListener('animationend', elementRemoveFlash)

$openDevTools.addEventListener('click', window.electronAPI.openDevTools)

$bookmarkBtn.addEventListener('click', window.electronAPI.createBookmark)

$bookmarkListBtn.addEventListener('click', bookmarkListView)

$bookmarkSortOldBtn.addEventListener('click', () => sortBookmarks('old'))

$bookmarkSortNewBtn.addEventListener('click', () => sortBookmarks('new'))

$bookmarkSortHostBtn.addEventListener('click', () => sortBookmarks('host'))

$bookmarkSortTitleBtn.addEventListener('click', () => sortBookmarks('title'))

$bookmarkNewLinkBtn.addEventListener('click', async () => window.electronAPI.urlToBookmark(`${await navigator.clipboard.readText()}`))

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

$header.addEventListener('mouseenter', expandHeader)

$header.addEventListener('contextmenu', window.electronAPI.winHide)

$header.addEventListener('dblclick', window.electronAPI.winMax)

$header.addEventListener('mouseleave', () => dragLeave = window.setTimeout(onDragMouseUp, 300))

$header.addEventListener('mouseenter', () => clearTimeout(dragLeave))

$header.addEventListener('dragover', e => {
  e.stopPropagation()
  e.preventDefault()
})

$header.addEventListener('drop', e => {
  e.stopPropagation()
  e.preventDefault()
  if (e.dataTransfer.items) {
    [...e.dataTransfer.items].forEach(item => {
      item.type.match('^text/uri-list') ? item.getAsString(data => window.electronAPI.urlToBookmark(`${data}`)) : null
    })
  }
})

$appControl.forEach(el => el.addEventListener('dblclick', e => e.stopPropagation()))

$headerPanels.forEach(el => el.addEventListener('dblclick', e => e.stopPropagation()))

$headerPanels.forEach(el => el.addEventListener('contextmenu', e => e.stopPropagation()))

document.onkeydown = e => e.key === 'Escape' ? onDragMouseUp() : null

window.electronAPI.sendLibrary((e, library) => addLibraryItems(library, library[0].type, library[0].path))

window.electronAPI.logData((e, data) => logOutput(data))

window.electronAPI.hideHeader(collaspeHeader)

window.electronAPI.winStopdrag(onDragMouseUp)

window.electronAPI.sendBookmark((e, bookmarkObj) => addBookmark(bookmarkObj))

window.electronAPI.streamOpened(() => togglePanel($homeBtn, true))

window.electronAPI.getAppInfo((e, appInfo) => loadAbout(appInfo))

// Setup
applySettings()