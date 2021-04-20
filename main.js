// TODO: Peacock won't login
// TODO: Scrollbar css

// Imports and variable declarations
const { app, BrowserWindow, ipcMain, BrowserView, Tray, TouchBar, session, Menu, MenuItem, systemPreferences, clipboard, nativeTheme, dialog } = require('electron')
const { TouchBarButton } = TouchBar
const path = require('path')
const isMac = process.platform === 'darwin'
const updater = require('./updater')
const baseHeaderSize = 22
const baseMenuHeight = 57
const winAdjustWidth = isMac ? 240 : 256
let headerSize = baseHeaderSize
let winAdjustHeight = isMac ? headerSize : baseMenuHeight + headerSize
let wb = { x: 0, y: 0, height: 0, width: 0 }
let allowQuit = false
let isPlaying = false
let restorePlay = false
let showFacets = false
let showPrefs = false
let ytSkipAds = false
let amzSkipPreview = false
let amzSkipRecap = false
let nfSkipRecap = false
let nfNextEpisode = false
let showBookmarks = false
let userAgent = ''
let currentStream = ''
let touchBarItems = []

// OS variables
if (isMac) {
  systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true)
  systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true)
  userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
} else {
  userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36'
}

// Dev code
// Disable hardware acceleration (buggy)
// app.disableHardwareAcceleration()

// Enable Electron-Reload (dev only)
// require('electron-reload')(__dirname)

// Main window and view
let win = null
let view = null
let tray = null
let touchBar = null

// Create window
const createWindow = () => {
  // Create main window
  win = new BrowserWindow({
    height: 600,
    width: 800,
    minHeight: 348,
    minWidth: 580,
    transparent: !!isMac,
    hasShadow: false,
    frame: !isMac,
    visualEffectState: 'active',
    titleBarStyle: isMac ? 'hidden' : 'default',
    trafficLightPosition: {
      x: 7,
      y: 7
    },
    webPreferences: {
      plugins: true,
      nodeIntegration: true,
      enableRemoteModule: false
    }
  })

  // HTML file to load into window
  win.loadFile('main.html', {
    userAgent: 'Chrome'
  })

  // Open DevTools (window, dev only)
  // win.webContents.openDevTools('detach')

  // Create main browserView
  view = new BrowserView()

  // Show browserView when loaded
  view.webContents.on('did-finish-load', () => {
    // Open DevTools (view, dev only)
    // view.webContents.openDevTools('detach')
    sendCurrentStream()
    setView()
    streamLoaded()
  })

  // Set current stream URL (most reliable event)
  view.webContents.on('did-start-navigation', () => {
    sendCurrentStream()
  })

  // Capture playing
  view.webContents.on('media-started-playing', () => {
    if (win.isVisible()) {
      isPlaying = true
    } else {
      pause()
    }
  })

  // Capture paused
  view.webContents.on('media-paused', () => {
    isPlaying = false
  })

  // Prevent new window open in current view
  view.webContents.on('new-window', (e, url) => {
    e.preventDefault()
    view.webContents.loadURL(url)
  })

  // Reset view on resize
  win.on('resize', () => {
    wb = win.getBounds()
    setViewBounds()
  })

  // Capture window location on move
  win.on('move', () => {
    wb = win.getBounds()
  })

  // Hide instead of close window unless quitting (Mac)
  win.on('close', (e) => {
    if (!allowQuit && isMac) {
      e.preventDefault()
      pause()
      win.hide()
    }
  })

  // When win ready set accent color and subscribe to changes if macOS
  win.on('ready-to-show', () => {
    getAccent()
    if (isMac) {
      systemPreferences.subscribeNotification('AppleColorPreferencesChangedNotification', () => {
        getAccent()
      })
    }
  })

  // Set vibrancy to match theme on update
  nativeTheme.on('updated', () => {
    if (nativeTheme.shouldUseDarkColors) {
      win.setVibrancy('dark')
    } else {
      win.setVibrancy('light')
    }
    if (!isMac) {
      setWinTrayTheme()
    }
  })
}

// Create tray
const createTray = () => {
  tray = new Tray(path.join(__dirname, '/res/logo/iconTemplate@2x.png'))
  tray.setToolTip('StreamDock')
  tray.on('click', () => {
    const isVisible = win.isVisible()
    view.webContents.focus()
    if (isVisible) {
      pause()
    } else if (restorePlay) {
      play()
    }
    isVisible ? win.hide() : win.show()
  })
  tray.on('right-click', () => {
    app.quit()
  })
}

// Get system accent color
function getAccent() {
  win.webContents.send('set-accent', `#${systemPreferences.getAccentColor()}`)
}

// Set systray color in win10
function setWinTrayTheme() {
  if (nativeTheme.shouldUseDarkColors) {
    tray.setImage(path.join(__dirname, '/res/logo/icon_win_tray_white.png'))
  } else {
    tray.setImage(path.join(__dirname, '/res/logo/iconTemplate@2x.png'))
  }
}

// Pause stream
function pause() {
  switch (currentStream) {
    case 'at':
      view.webContents.executeJavaScript(`document.querySelector('apple-tv-plus-player').shadowRoot.querySelector('amp-video-player-internal').shadowRoot.querySelector('amp-video-player').shadowRoot.querySelector('video').pause()`)
      break
    default:
      view.webContents.executeJavaScript(`document.querySelectorAll('video').forEach(input => { input.pause() })`)
      break
  }
}

// Play stream
function play() {
  if (!showBookmarks) {
    switch (currentStream) {
      case 'at':
        view.webContents.executeJavaScript(`document.querySelector('apple-tv-plus-player').shadowRoot.querySelector('amp-video-player-internal').shadowRoot.querySelector('amp-video-player').shadowRoot.querySelector('video').play()`)
        break
      case 'ap':
        view.webContents.executeJavaScript(`document.querySelectorAll('.rendererContainer>video').forEach(input => { input.play() })`)
        break
      default:
        view.webContents.executeJavaScript(`document.querySelectorAll('video').forEach(input => { input.play() })`)
        break
    }
  }
}

// Remove view from window
function removeView() {
  if (win.getBrowserView()) {
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  }
}

// Add view to window
function setView() {
  win.setBrowserView(view)
  setViewBounds()
}

// Adjust view bounds to window
function setViewBounds() {
  if (!showBookmarks && !showPrefs) {
    updateShowFacets()
    let waw = showFacets ? winAdjustWidth : 0
    view.setBounds({
      x: 0,
      y: headerSize,
      width: wb.width - waw,
      height: wb.height - winAdjustHeight
    })
  }
}

// Change stream service
function streamChange(stream) {
  isPlaying ? pause() : null
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  showBookmarks = false
  currentStream = stream.id
  view.webContents.loadURL(stream.url)
  win.webContents.send('hide-bookmarks')
  win.webContents.send('stream-changed', stream.url)
}

// Stream loaded
function streamLoaded() {
  ytAdsSkip()
  amzGetUrl()
  setTimeout(amzPreviewSkip, 3000)
  setTimeout(amzRecapSkip, 3000)
  nfRecapSkip()
  nfEpisodeNext()
  enableFacets()
}

// Toggle facets if Netflix
function updateShowFacets() {
  showFacets = showFacets && currentStream === 'nf'
  win.webContents.send('show-facets', showFacets)
}

// Open copied link in new BrowserView
function openLink(url) {
  currentStream = 'ot'
  if (validateLink(url)) {
    const stream = {
      id: setStreamId(url),
      url: url
    }
    streamChange(stream)
  }
}

// Navigate view backwards
function navBack() {
  if (view.getBounds().width === 0) {
    showBookmarks = false
    win.webContents.send('hide-bookmarks')
    setViewBounds()
  } else if (view.webContents.canGoBack()) {
    navChange()
    view.webContents.goBack()
  }
}

// Navicate view forwards
function navForward() {
  if (view.webContents.canGoForward()) {
    navChange()
    view.webContents.goForward()
  }
}

// Back/forward button stream change
function navChange() {
  isPlaying ? pause() : null
  currentStream = 'ot'
  updateShowFacets()
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  win.webContents.send('stream-changed', null)
  setTimeout(setViewBounds, 1000)
}

// Set the stream ID if it needs to be derived
function setStreamId(url) {
  if (currentStream === 'ot') {
    if (url.includes('.youtube.com') && !url.includes('tv.')) {
      return 'yt'
    }
    if (url.includes('.netflix.com')) {
      return 'nf'
    }
  }
  return currentStream
}

// EXPERIMENTAL (3rd clause)
// Skip/close YouTube ads
function ytAdsSkip() {
  if (ytSkipAds && currentStream === 'yt') {
    try {
      view.webContents.executeJavaScript(`try {
        document.querySelector('.ytp-ad-skip-button').click()
      } catch(err) { console.log(err) }`)
      view.webContents.executeJavaScript(`const obsAds = new MutationObserver(function(ml) {
        for(const mut of ml) {
          if (mut.type === 'childList' && mut.target.classList.contains('ytp-ad-text')) {
            try {
              document.querySelector('.ytp-ad-skip-button').click()
            } catch(err) { console.log(err) }
          }
          if (mut.type === 'childList' && mut.target.classList.contains('ytp-ad-module')) {
            try {
              document.querySelector('.ytp-ad-overlay-close-button').click()
            } catch(err) { console.log(err) }
          }
          if (mut.type === 'childList' && mut.target.classList.contains('ytd-mealbar-promo-renderer')) {
            try {
              document.querySelectorAll('#dismiss-button').forEach(input => { input.click() })
              console.log('promo skip')
            } catch(err) { console.log(err) }
          }
        }
      }).observe(document.querySelector('ytd-app'), { childList: true, subtree: true})`)
    } catch(err) {
      console.log(err)
    }
  }
}

// EXPERIMENTAL
// Skip/close Prime preivews
function amzPreviewSkip() {
  if (amzSkipPreview && currentStream === 'ap') {
    try {
      view.webContents.executeJavaScript(`
        const obsPreview = new MutationObserver(function(ml) {
          for(const mut of ml) {
            if (mut.type === 'childList') {
              try {
                if (mut.addedNodes && mut.addedNodes.length > 0) {
                  mut.addedNodes.forEach(element => {
                    if (element.classList && element.classList.contains('fu4rd6c')) {
                      console.log('preview skip')
                      document.querySelector('.fu4rd6c').click()
                    }
                  })
                }
              } catch(err) { console.log(err) }
            }
          }
        }).observe(document.querySelector('.webPlayerUIContainer'), { childList: true, subtree: true})
      `)
    } catch(err) {
      console.log(err)
    }
  }
}

// EXPERIMENTAL
// Skip/close Prime episode recap & intros
function amzRecapSkip() {
  if (amzSkipRecap && currentStream === 'ap') {
    try {
      view.webContents.executeJavaScript(`
        const obsRecap = new MutationObserver(function(ml) {
          for(const mut of ml) {
            if (mut.type === 'childList') {
              try {
                if (mut.addedNodes && mut.addedNodes.length > 0) {
                  mut.addedNodes.forEach(element => {
                    if (element.classList && element.classList.contains('atvwebplayersdk-skipelement-button')) {
                      console.log('recap skip')
                      document.querySelector('.atvwebplayersdk-skipelement-button').click()
                    }
                  })
                }
              } catch(err) { console.log(err) }
            }
          }
        }).observe(document.querySelector('.webPlayerUIContainer'), { childList: true, subtree: true})
      `)
    } catch(err) {
      console.log('err')
    }
  }
}

// Get acutal URL for Amazon videos
function amzGetUrl() {
  if (currentStream === 'ap') {
    try {
      view.webContents.executeJavaScript(`
        let sdAmzUrl = '${view.webContents.getURL()}'
        try {
            document.querySelectorAll('.tst-title-card').forEach(function(tile) { tile.dispatchEvent(new MouseEvent('mouseover', { 'bubbles': true })) })
            document.querySelectorAll('.tst-play-button').forEach(function(btn) { btn.addEventListener('click', function() { sdAmzUrl = this.href }) })
          } catch(err) { console.log(err) }
      `)
    } catch(err) {
      console.log(err)
    }
  }
}

// EXPERIMENTAL
// Skip/close Netlfix episode recap & intros
function nfRecapSkip() {
  if (nfSkipRecap && currentStream === 'nf') {
    try {
      view.webContents.executeJavaScript(`
        const obsRecap = new MutationObserver(function(ml) {
          for(const mut of ml) {
            if (mut.type === 'childList') {
              try {
                if (mut.addedNodes && mut.addedNodes.length > 0) {
                  mut.addedNodes.forEach(element => {
                    if (element.classList && element.classList.contains('skip-credits')) {
                      console.log('recap skip')
                      document.querySelector('.skip-credits > a').click()
                    }
                  })
                }
              } catch(err) { console.log(err) }
            }
          }
        }).observe(document.querySelector('#appMountPoint'), { childList: true, subtree: true})
      `)
    } catch(err) {
      console.log('err')
    }
  }
}

// EXPERIMENTAL
// Automatically start next Netlfix episode
function nfEpisodeNext() {
  if (nfNextEpisode && currentStream === 'nf') {
    try {
      view.webContents.executeJavaScript(`
        const obsNext = new MutationObserver(function(ml) {
          for(const mut of ml) {
            if (mut.type === 'childList') {
              try {
                if (mut.addedNodes && mut.addedNodes.length > 0) {
                  mut.addedNodes.forEach(element => {
                    if (element.classList && element.classList.contains('ltr-v8pdkb')) {
                      console.log('next episode')
                      document.querySelector('[data-uia = "next-episode-seamless-button"]').click()
                    }
                  })
                }
              } catch(err) { console.log(err) }
            }
          }
        }).observe(document.querySelector('#appMountPoint'), { childList: true, subtree: true})
      `)
    } catch(err) {
      console.log('err')
    }
  }
}

// Scale height to supplied aspect ratio
function scaleHeight(width, height) {
  win.setBounds({
    x: wb.x,
    y: wb.y,
    height: Math.round(((wb.width * height) / width) + winAdjustHeight),
    width: wb.width
  })
}

// Scale width to supplied aspect ratio
function scaleWidth(width, height) {
  win.setBounds({
    x: wb.x,
    y: wb.y,
    height: wb.height,
    width: Math.round(((wb.height - winAdjustHeight) * width) / height)
  })
}

// Check if url is valid
function validateLink(url) {
  try {
    new URL(url)
  } catch (e) {
    console.error(e)
    return false
  }
  return true
}

// Take screenshot of current stream
function captureStream() {
  view.webContents.capturePage().then(image => {
    clipboard.writeImage(image)
  })
  setTimeout(sendBookmark, 1000)
}

// Toggle bookmarks page
function toggleBookmarks() {
  if (showBookmarks) {
    showBookmarks = false
    win.webContents.send('hide-bookmarks')
    setViewBounds()
  } else {
    isPlaying ? pause() : null
    showBookmarks = true
    win.webContents.send('show-bookmarks')
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  }
}

// Toggle facets view
function toggleFacets() {
  showFacets = currentStream === 'nf' && view.getBounds().width === wb.width
  setViewBounds()
}

// Enable genre menuitem
function enableFacets() {
  menu.getMenuItemById('toggleGenres').enabled = currentStream === 'nf'
}

// Send bookmark to renderer
async function sendBookmark() {
  let currentUrl = await getCurrentUrl()
  win.webContents.send('save-bookmark', { id: currentStream, title: view.webContents.getTitle(), url: currentUrl })
}

// Send current stream object
async function sendCurrentStream() {
  const currentUrl = await getCurrentUrl()
  win.webContents.send('stream-loaded', { id: setStreamId(currentUrl), url: currentUrl })
}

// Get current URL
async function getCurrentUrl() {
  let url = view.webContents.getURL()
  if (currentStream === 'ap') {
    url = await view.webContents.executeJavaScript('sdAmzUrl')
  }
  return url
}

// Before close
async function beforeClose() {
  await saveSettings()
  allowQuit = true
  app.quit()
}

// Send settings
async function saveSettings() {
  await sendCurrentStream()
  const data = {
    windowSizeLocation: {
      x: wb.x,
      y: wb.y,
      height: wb.height,
      width: wb.width
    }
  }
  win.webContents.send('save-settings', data)
}

// Widvine DRM setup
app.commandLine.appendSwitch('no-verify-widevine-cdm')
const isOffline = false
const widevineDir = app.getPath('userData')

// App ready
app.on('ready', () => {
  app.verifyWidevineCdm({
    session: session.defaultSession,
    disableUpdate: isOffline,
    baseDir: widevineDir
  })
  // Check for updates
  setTimeout(updater, 3000)
})

// Widvine DRM  ready
app.on('widevine-ready', () => {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = userAgent
    callback({
      cancel: false,
      requestHeaders: details.requestHeaders
    })
  })
  createWindow()
  createTray()
  setWinTrayTheme()
})

// Widvine DRM error handling
app.on('widevine-error', (err) => {
  win.webcontents.send('log', err)
  process.exit(1)
})

// CLose app if all windows are closed (can check for Mac)
app.on('window-all-closed', () => {
  app.quit()
})

// When closing set window size and location
app.on('before-quit', (e) => {
  if (!allowQuit) {
    e.preventDefault()
    beforeClose()
  }
})

// IPC channel to update window size and location from settings
ipcMain.on('set-window', (e, data) => {
  win.setBounds({
    x: data.x,
    y: data.y,
    height: data.height,
    width: data.width
  })
})

// IPC channel to set fullscreen allow from HTML
ipcMain.on('allow-fullscreen', (e, data) => {
  win.setFullScreen(false)
  win.fullScreenable = data
  menu.getMenuItemById('fullScreen').enabled = data
})

// IPC channel to change streaming service
ipcMain.on('service-change', (e, data) => {
  streamChange(data)
})

// IPC channel for locking app on top
ipcMain.on('ontop-lock', () => {
  win.setAlwaysOnTop(true, 'floating')
})

// IPC channel for unlocking app on top
ipcMain.on('ontop-unlock', () => {
  win.setAlwaysOnTop(false)
})

// IPC channel for scaling horzizontally to 16:9
ipcMain.on('scale-width', () => {
  scaleWidth(16, 9)
})

// IPC channel for scaling vertically to 16:9
ipcMain.on('scale-height', () => {
  scaleHeight(16, 9)
})

// IPC channel for opening url from clip-board
ipcMain.on('open-link', () => {
  openLink(clipboard.readText())
})

// IPC channel for maximizing window
ipcMain.on('win-max', () => {
  win.isMaximized() ? win.unmaximize() : win.maximize()
})

// IPC channel to set restore-play
ipcMain.on('restore-play', (e, data) => {
  restorePlay = data
})

// IPC channel for hiding window
ipcMain.on('win-hide', () => {
  pause()
  win.hide()
})

// IPC channel for emptying stream menu items
ipcMain.on('reset-menu', () => {
  resetMenu()
})

// IPC channel for adding stream service to menu
ipcMain.on('add-stream', (e, serv) => {
  addStream(serv)
})

// IPC channel for hiding view
ipcMain.on('view-hide', () => {
  showPrefs = true
  removeView()
})

// IPC channel for showing view
ipcMain.on('view-show', () => {
  showPrefs = false
  setViewBounds()
})

// IPC channel for setting theme mode
ipcMain.on('set-theme', (e, data) => {
  nativeTheme.themeSource = data
})

// IPC channel to navigate backwards
ipcMain.on('nav-back', () => {
  navBack()
})

// IPC channel to navigate forwards
ipcMain.on('nav-forward', () => {
  navForward()
})

// IPC channel to toggle facets
ipcMain.on('toggle-facets', () => {
  toggleFacets()
})

// IPC channel to save bookmark
ipcMain.on('save-bookmark', () => {
  captureStream()
})

// IPC channel to toggle bookmarks
ipcMain.on('toggle-bookmarks', () => {
  toggleBookmarks()
})

// IPC channel to skip YouTube ads
ipcMain.on('set-ytadskip', (e, bool) => {
  ytSkipAds = bool
})

// IPC channel to skip Prime previews
ipcMain.on('set-amzprevskip', (e, bool) => {
  amzSkipPreview = bool
})

// IPC channel to skip Prime recap
ipcMain.on('set-amzrecapskip', (e, bool) => {
  amzSkipRecap = bool
})

// IPC channel to skip Netflix recap
ipcMain.on('set-nfrecapskip', (e, bool) => {
  nfSkipRecap = bool
})

// IPC channel to automatically start next episode on Netflix
ipcMain.on('set-nfepisodenext', (e, bool) => {
  nfNextEpisode = bool
})

// IPC channel to hide/show header
ipcMain.on('hide-header-bar', (e, bool) => {
  if (!isMac && !bool) {
    headerSize = 0
  } else {
    headerSize = baseHeaderSize
  }
  winAdjustHeight = isMac ? headerSize : baseMenuHeight + headerSize
})

// Build menu template
const template = [{
  label: app.name,
  submenu: [{
    label: 'About',
    click() {
      dialog.showMessageBox({
        title: `About ${app.name}`,
        message: `StreamDock\nVersion ${app.getVersion()}`,
        detail: 'Copyright \u00A9 jtvberg 2020-2021',
        buttons: []
      })
    } 
  },
  {
    type: 'separator'
  },
  {
    label: 'Preferences',
    click() {
      win.webContents.send('load-settings')
    }
  },
  ...(isMac ? [{
    type: 'separator'
  },
  {
    role: 'services'
  },
  {
    type: 'separator'
  },
  {
    role: 'hide'
  },
  {
    role: 'hideothers'
  },
  {
    role: 'unhide'
  },
  {
    type: 'separator'
  },
  {
    role: 'quit'
  }
  ] : [{
    type: 'separator'
  },
  {
    role: 'quit'
  }
  ])
  ]
},
{
  label: 'Edit',
  submenu: [{
    role: 'undo'
  },
  {
    role: 'redo'
  },
  {
    type: 'separator'
  },
  {
    role: 'cut'
  },
  {
    role: 'copy'
  },
  {
    role: 'paste'
  },
  ...(isMac ? [{
    role: 'pasteAndMatchStyle'
  },
  {
    role: 'delete'
  },
  {
    role: 'selectAll'
  },
  ] : [{
    role: 'delete'
  },
  {
    type: 'separator'
  },
  {
    role: 'selectAll'
  }
  ])
  ]
},
{
  label: 'Streams',
  submenu: []
},
{
  label: 'View',
  submenu: [{
    label: 'Toggle Bookmarks',
    click() {
      toggleBookmarks()
    }
  },
  {
    label: 'Bookmark Stream',
    click() {
      captureStream()
    }
  },
  {
    type: 'separator'
  },
  {
    label: 'Toggle Full Screen',
    id: 'fullScreen',
    click() {
      win.setFullScreen(!win.fullScreen)
    }
  },
  {
    label: 'Scale Height to 16:9',
    click() {
      scaleHeight(16, 9)
    }
  },
  {
    label: 'Scale Width to 16:9',
    click() {
      scaleWidth(16, 9)
    }
  },
  {
    label: 'Scale Height to 4:3',
    click() {
      scaleHeight(4, 3)
    }
  },
  {
    label: 'Scale Width to 4:3',
    click() {
      scaleWidth(4, 3)
    }
  },
  {
    type: 'separator'
  },
  {
    label: 'Navigate Backward',
    click() {
      navBack()
    }
  },
  {
    label: 'Navigate Forward',
    click() {
      navForward()
    }
  },
  {
    role: 'reload'
  },
  {
    role: 'forcereload'
  },
  {
    type: 'separator'
  },
  {
    label: 'Toggle Genres',
    id: 'toggleGenres',
    enabled: false,
    click() {
      toggleFacets()
    }
  },
  {
    type: 'separator'
  },
  {
    label: 'Open Copied URL',
    click() {
      openLink(clipboard.readText())
    }
  }
  ]
},
{
  label: 'Window',
  submenu: [{
    role: 'minimize'
  },
  {
    role: 'zoom'
  },
  {
    label: 'Lock On Top',
    click() {
      win.isAlwaysOnTop() ? win.setAlwaysOnTop(false) : win.setAlwaysOnTop(true, 'floating')
    }
  },
  ...(isMac ? [{
    type: 'separator'
  },
  {
    role: 'front'
  },
  {
    type: 'separator'
  },
  {
    role: 'window'
  }
  ] : [{
    role: 'close'
  }])
  ]
},
{
  role: 'help',
  submenu: [{
    label: 'Learn More',
    click: async () => {
      const { shell } = require('electron')
      await shell.openExternal('https://github.com/jtvberg/StreamDock')
    }
  },
  {
    type: 'separator'
  },
  {
    label: 'Open Devtools',
    click() {
      win.webContents.openDevTools('detach')
      view.webContents.openDevTools('detach')
    }
  }
  ]
}
]

// Set template
let menu = Menu.buildFromTemplate(template)

// Add stream service to menu & touchbar
function addStream(serv) {
  const streamMenu = Menu.getApplicationMenu().items[2]
  const menuItem = new MenuItem({
    label: serv.title,
    id: serv.id,
    click() {
      streamChange(serv)
    }
  })
  streamMenu.submenu.append(menuItem)
  Menu.setApplicationMenu(menu)

  if (isMac) {
    touchBarItems.push(
      new TouchBarButton({
        label: serv.title,
        backgroundColor: serv.bgColor,
        click: () => {
          streamChange(serv)
        }
      })
    )
    touchBar = new TouchBar({ items: touchBarItems })
    win.setTouchBar(touchBar)
  }
}

// Menu & touchbar rebuild and set
function resetMenu() {
  menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  if (isMac) {
    touchBarItems = []
    touchBar = new TouchBar({ items: touchBarItems })
    win.setTouchBar(touchBar)
  }
}