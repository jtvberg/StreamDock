// Imports
import { initLibrary, findLibraryItem, removeLibraryItems, saveImmediately, getLibrary, clearMetadataCache } from './util/libraryManager.js'
import { getStreams, setStreams, getNewStreamId, getLastStream, getPrefs, setLastStream, setVideoPaused, getWinBounds, setWinBounds, getWinLock, setWinLock, getWinRatio, setWinRatio } from "./util/settings.js"
import { rescanAllLibraryDirs, updateLibraryDirStatus, loadLibraryDir, loadLibraryFromStorage, getDirectories } from "./library.js"
import { elementFromHtml, elementRemoveFlash } from "./util/helpers.js"
import locs from '../res/loc.json' with { type: 'json' }

// Constants
const streams = getStreams()
const headerDim = await window.electronAPI.getHeaderHeight()

// Element references
const $header = document.querySelector('#header')
const $drag = document.querySelectorAll('.drag')
const $dragWin = document.querySelector('#drag-win')
const $headerControls = document.querySelector('#header-controls')
const $streamControls = document.querySelector('#stream-controls')
const $prefsBtn = document.querySelector('#prefs-btn')
const $headerPanels = document.querySelectorAll('.header-panels')
const $prefsLayout = document.querySelector('#prefs-layout')
const $servicePrefs = document.querySelector('#service-layout')
const $advancedLayout = document.querySelector('#advanced-layout')
const $searchLayout = document.querySelector('#search-layout')
const $searchNavBtn = document.querySelector('#search-nav-btn')
const $streamsLayout = document.querySelector('#streams-layout')
const $streamsEdit = document.querySelector('#streams-edit')
const $streamDoneBtn = document.querySelector('#stream-done-btn')
const $streamRestoreBtn = document.querySelector('#stream-restore-btn')
const $closeBtn = document.querySelector('#close-btn')
const $minBtn = document.querySelector('#min-btn')
const $maxBtn = document.querySelector('#max-btn')
const $backBtn = document.querySelector('#back-btn')
const $homeBtn = document.querySelector('#home-btn')
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
const $library = document.querySelector('#library')
const $libraryList = document.querySelector('#library-list')
const $libraryLayout = document.querySelector('#library-layout')
const $libraryNavBtn = document.querySelector('#library-nav-btn')

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

// create stream element for stream bar, stream edit panel and append add new stream element
const loadStreams = () => {
  $streamControls.replaceChildren([])
  $streamsEdit.replaceChildren([])
  streams.forEach(stream => {
    loadStreamBar(stream)
    loadStreamPanel(stream)
  })
  setStreams(streams)
  // console.log('Streams Updated')
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
    // console.log('Auto-scanning library directories for new files...')
    rescanAllLibraryDirs()
  }

  loadLibraryDirectoryPanel()

  loadClearDataPanel()

  window.electronAPI.defaultAgent(getPrefs().find(pref => pref.id === 'pref-agent').state())

  window.electronAPI.updateHeaderHeight(headerCollapsed)

  window.electronAPI.winGetLoc((e, bounds) => setWinBounds(bounds))

  window.electronAPI.setIsMac((e, bool) => osHeader(bool))

  window.electronAPI.onVideoPaused((e, bool) => setVideoPaused(bool))

  window.electronAPI.setAccent((e, color) => {
    let root = document.documentElement
    root.style.setProperty('--color-system-accent', color)
    root.style.setProperty('--color-system-accent-trans', color.substring(0, 7) + '80')
  })

  openLastUrl()
}

// open last URL if it exists and get time from local storage if file URL
const openLastUrl = () => {
  const url = getLastStream()
  let time = 0
  if (url.startsWith('file:')) {
    const item = findLibraryItem(url)
    if (item) {
      time = item.lastPlayTime || 0
    }
  }
  window.electronAPI.openUrl(url, time)
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
  // console.log('Streams Updated')
  loadStreamPanel(stream)
  repaintStreamBar()
}

// reorder stream elements in stream edit pane
const updateStreamOrder = ele => {
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
  // console.log('Streams Updated')
}

// reload stream bar elements
const repaintStreamBar = () => {
  $streamControls.replaceChildren([])
  streams.forEach(stream => loadStreamBar(stream))
}

// restore missing default streams
const restoreStreams = () => {
  getStreams(true).forEach(s => {
    streams.find(c => c.url === s.url) ? null : streams.push(s)
  })
  reorderStreams()
  loadStreams()
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
        updatePref(pref.id, e.target.value)
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
    const libDirType = elementFromHtml(`<div class="library-directory-type">${dir.type === 'tv' ? 'TV' : 'Movie'}</div>`)
    const libDirPath = elementFromHtml(`<div class="library-directory-path" title="${dir.dir}">${dir.dir}</div>`)
    const libDirRescan = elementFromHtml('<div class="library-directory-btn fas fa-rotate-left" title="Scan for New Files"></div>')    
    const libDirRefresh = elementFromHtml('<div class="library-directory-btn library-directory-refresh fas fa-arrows-rotate" title="Refresh all Metadata"></div>')
    const libDirDel = elementFromHtml('<div class="library-directory-btn library-directory-delete-btn fas fa-xmark" title="Delete Entry"></div>')
    const libDirStatus = elementFromHtml(`<div class="library-directory-status fas"></div>`)
    if (!getPrefs().find(pref => pref.id === 'library-meta').state()) {
      libDirRefresh.classList.add('disabled') 
    }
    libDirRescan.addEventListener('click', () => {
      // look for new files in the directory and remove any items that no longer exist
      loadLibraryDir(dir.dir, dir.type)
    })
    libDirRefresh.addEventListener('click', () => {
      if (!confirm(`Are you sure you want to refresh metadata for:\n${dir.dir}?\n\nThis will remove and reload TMDB metadata for all items in this directory unless an item is locked.`)) {
        return
      }
      // remove all items from this directory preserving locked metadata
      removeLibraryItems(item => item.dir === dir.dir, true, dir.dir)
      // reload library items in UI
      $library.replaceChildren([])
      $libraryList.replaceChildren([])
      loadLibraryFromStorage()
      // load the library directory again (will restore locked metadata from cache)
      loadLibraryDir(dir.dir, dir.type)
    })
    libDirDel.addEventListener('click', () => {
      if (!confirm(`Are you sure you want to delete the library directory:\n${dir.dir}?`)) {
        return
      }
      // remove the directory from cache
      const dirs = getDirectories()
      const dirIndex = dirs.findIndex(d => d.dir === dir.dir)
      if (dirIndex > -1) {
        dirs.splice(dirIndex, 1)
        localStorage.setItem('directories', JSON.stringify(dirs))
      }
      
      // clear metadata cache to ensure fresh start
      clearMetadataCache()
      
      // remove all library items from this directory (do not preserve locked metadata)
      removeLibraryItems(item => item.dir === dir.dir, false)
      saveImmediately()
      // reload library directory panel
      loadLibraryDirectoryPanel()
      // reload library items in UI
      $library.replaceChildren([])
      $libraryList.replaceChildren([])
      loadLibraryFromStorage()
      removeLastStream()
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

// if file URL is removed from library, remove last stream if it matches
export const removeLastStream = () => {
  const lastStream = getLastStream()
  if (lastStream && lastStream.startsWith('file:')) {
    const item = findLibraryItem(lastStream)
    if (!item) {
      setLastStream('')
      openLastUrl()
      // console.log(`Removed last stream: ${lastStream}`)
      return
    }
    // console.log(`Last stream still exists: ${lastStream}`)
  } else {
    // console.log('No last stream to remove.')
  }
}

// add directory to library directory storage, panel and load library directory
const addLibraryDirectory = (dir, type) => {
  const dirs = getDirectories()
  if (!dirs.some(entry => entry.dir === dir)) {
    clearMetadataCache()
    
    dirs.push({
      dir,
      type,
      status: 'file'
    })
    localStorage.setItem('directories', JSON.stringify(dirs))
    loadLibraryDirectoryPanel()
    loadLibraryDir(dir, type)
  } else {
    alert(`Directory ${dir} already exists in library.`)
  }
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
export const changeHomeLayout = (el = $homeNavBtn[0]) => {
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
  // console.log(`Preference ${id} Updated`)
  switch (id) {
    case 'pref-agent':
      console.log(`R-Default User Agent Updated: ${val}`)
      window.electronAPI.defaultAgent(val)
      break
    case 'pref-fullscreen':
      window.electronAPI.winFullscreen(val)
      break
    case 'search-show':
      toggleSearch(val)
      break
    case 'library-show':
      toggleLibrary(val)
      break
    case 'library-meta':
      if (val) {
        document.querySelectorAll('.library-directory-refresh').forEach(btn => btn.classList.remove('disabled'))
      } else {
        document.querySelectorAll('.library-directory-refresh').forEach(btn => btn.classList.add('disabled'))
      }
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
    getPrefs().find(pref => pref.id === 'library-scan').update(false)
    document.querySelector('#library-scan') ? document.querySelector('#library-scan').checked = false : null
    changeHomeLayout()
  }
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
  updateStreamOrder(e.target)
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

$header.addEventListener('mouseenter', expandHeader)

$header.addEventListener('contextmenu', () => {
  saveImmediately()
  window.electronAPI.winHide()
})

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

window.electronAPI.hideHeader(collaspeHeader)

window.electronAPI.winStopdrag(onDragMouseUp)

window.electronAPI.streamOpened(() => togglePanel($homeBtn, true))

window.electronAPI.getAppInfo((e, appInfo) => loadAbout(appInfo))

window.addEventListener('beforeunload', saveImmediately)

// Setup
initLibrary()
applySettings()