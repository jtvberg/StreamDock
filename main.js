/* eslint-disable quotes */
// Imports and variable declarations
const { app, BrowserWindow, ipcMain, BrowserView, Tray, TouchBar, Menu, MenuItem, components, systemPreferences, clipboard, nativeTheme, dialog, shell } = require('electron')
const { TouchBarButton } = TouchBar
const path = require('path')
const isDev = !app.isPackaged
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'
const isWindows = process.platform === 'win32'
const updater = require('./updater')
const baseHeaderSize = 22
const baseMenuHeight = isLinux ? 25 : 57
const baseAdjustWidth = isWindows ? 16 : 0
const facetAdjustWidth = isWindows ? 265 : 250
let headerSize = baseHeaderSize
let winAdjustHeight = isMac ? headerSize : baseMenuHeight + headerSize
let wb = { x: 0, y: 0, height: 0, width: 0 }
let allowQuit = false
let isPlaying = false
let restorePlay = false
let showFacets = false
let showPrefs = false
let ytSkipAds = false
let ytScreenFull = false
let amzSkipPreview = false
let amzSkipRecap = false
let amzNextEpisode = false
let nfSkipRecap = false
let nfNextEpisode = false
let hlSkipRecap = false
let hlNextEpisode = false
let dpNextEpisode = false
let dpSkipRecap = false
let hmNextEpisode = false
let hmSkipRecap = false
let cbNextEpisode = false
let cbSkipRecap = false
let atNextEpisode = false
let atSkipRecap = false
let pcNextEpisode = false
let pcSkipRecap = false
let showHomescreen = false
let frameless = false
let userAgent = ''
let currentStream = ''
let touchBarItems = []
let defaultStreams = []
let googleAuthHost = 'accounts.google.com'

// OS variables
if (isMac) {
  systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true)
  systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true)
}

app.disableHardwareAcceleration()

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
    minHeight: 400,
    minWidth: 672,
    transparent: isMac,
    frame: !isMac,
    visualEffectState: 'active',
    titleBarStyle: isMac ? 'hidden' : 'default',
    trafficLightPosition: {
      x: 6,
      y: 3
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Add app icon in Linux (automatic otherwise)
  if (isLinux) {
    win.setIcon(path.join(__dirname, '/res/logo/icon.png'))
  }

  // HTML file to load into window
  win.loadFile('main.html', {
    userAgent: 'Chrome'
  })

  // Open DevTools (window, dev only)
  isDev && win.webContents.openDevTools('detach')

  // Create main browserView
  view = new BrowserView()

  // Show browserView when loaded
  view.webContents.on('did-finish-load', () => {
    // Open DevTools (view, dev only)
    isDev && view.webContents.openDevTools('detach')
    sendCurrentStream()
    setView()
    streamLoaded()
  })

  // Set current stream URL and switch user agent if google login (most reliable event)
  view.webContents.on('did-start-navigation', () => {
    const navUrl = validateLink(view.webContents.getURL()) ? new URL(view.webContents.getURL()) : null
    if (navUrl && navUrl.host === googleAuthHost) {
      view.webContents.userAgent = 'Chrome'
    } else {
      view.webContents.userAgent = userAgent
    }
    sendCurrentStream()
    if (currentStream === 'yt') {
      // ytFullScreen()
    }
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

  // Prevent new window open in current view except for Google Login
  view.webContents.setWindowOpenHandler(({ url }) => {
    const navUrl = validateLink(url) ? new URL(url) : null
    if (navUrl && navUrl.host === googleAuthHost) {
      return { action: 'allow' }
    }
    view.webContents.loadURL(url)
    return { action: 'deny' }
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

  // Hide instead of close window (Mac)
  win.on('close', (e) => {
    e.preventDefault()
    if (isMac) {
      pause()
      win.hide()
    } else {
      app.quit()
    }
  })

  // When win ready set accent color and subscribe to changes if macOS
  win.on('ready-to-show', () => {
    if (!isLinux) {
      getAccent()
    }
    if (isMac) {
      systemPreferences.subscribeNotification('AppleColorPreferencesChangedNotification', () => {
        getAccent()
      })
    }
  })

  // Open any window links in external browser
  win.webContents.on('will-navigate', (e, url) => {
    e.preventDefault()
    shell.openExternal(url)
  })

  // Set vibrancy to match theme on update
  nativeTheme.on('updated', () => {
    if (nativeTheme.shouldUseDarkColors) {
      win.setVibrancy('dark')
    } else {
      win.setVibrancy('light')
    }
    setWinTrayTheme()
  })
}

// Create tray
const createTray = () => {
  tray = new Tray(path.join(__dirname, '/res/logo/iconTemplate@2x.png'))
  tray.setToolTip('StreamDock')
  if (isLinux) {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Toggle Window',
        click() { toggleWin() }
      },
      { label: 'Exit',
        click() { app.quit() }
      }
    ])
    tray.setContextMenu(contextMenu)
  }
  tray.on('click', () => {
    toggleWin()
  })
  tray.on('right-click', () => {
    app.quit()
  })

  function toggleWin() {
    const isVisible = win.isVisible()
    view.webContents.focus()
    if (isVisible) {
      pause()
    } else if (restorePlay) {
      play()
    }
    isVisible ? win.hide() : win.show()
  }
}

// Get system accent color
function getAccent() {
  win.webContents.send('set-accent', `#${systemPreferences.getAccentColor()}`)
}

// Set systray color in win10/Linux
function setWinTrayTheme() {
  if (!isMac) {
    if (nativeTheme.shouldUseDarkColors) {
      tray.setImage(path.join(__dirname, '/res/logo/icon_tray_white_32.png'))
    } else {
      tray.setImage(path.join(__dirname, '/res/logo/iconTemplate@2x.png'))
    }
  }
}

// Pause stream
function pause() {
  switch (currentStream) {
    case 'at':
      view.webContents.executeJavaScript(`(${atPause.toString()})()`)
      break
    case 'hl':
      view.webContents.executeJavaScript(`(${hlPause.toString()})()`)
      break
    case 'cr':
      view.webContents.mainFrame.frames.forEach(frame => {
        const url = new URL(frame.url)
        if (url.host === 'static.crunchyroll.com') {
          frame.executeJavaScript(`(${defaultPause.toString()})()`)
          return
        }
      })
      break
    default:
      view.webContents.executeJavaScript(`(${defaultPause.toString()})()`)
      break
  }
}

// Amazon pause function
function atPause() {
  try {
    document.querySelector('apple-tv-plus-player').shadowRoot.querySelector('amp-video-player-internal').shadowRoot.querySelector('amp-video-player').shadowRoot.querySelector('video').pause()
  } catch (err) { console.error(err) }
}

// Hulu pause function
function hlPause() {
  try {
    document.querySelector('.PauseButton').click()
  } catch (err) { console.error(err) }
}

// Default pause function
function defaultPause() {
  try {
    document.querySelectorAll('video').forEach(input => { input.pause() })
  } catch (err) { console.error(err) }
}

// Play stream
function play() {
  if (!showHomescreen) {
    switch (currentStream) {
      case 'at':
        view.webContents.executeJavaScript(`(${atPlay.toString()})()`)
        break
      case 'ap':
        view.webContents.executeJavaScript(`(${amzPlay.toString()})()`)
        break
      case 'hl':
        view.webContents.executeJavaScript(`(${hlPlay.toString()})()`)
        break
      case 'cr':
        view.webContents.mainFrame.frames.forEach(frame => {
          const url = new URL(frame.url)
          if (url.host === 'static.crunchyroll.com') {
            frame.executeJavaScript(`(${defaultPlay.toString()})()`)
            return
          }
        })
        break
      default:
        view.webContents.executeJavaScript(`(${defaultPlay.toString()})()`)
        break
    }
  }
}

// Apple play function
function atPlay() {
  try {
    document.querySelector('apple-tv-plus-player').shadowRoot.querySelector('amp-video-player-internal').shadowRoot.querySelector('amp-video-player').shadowRoot.querySelector('video').play()
  } catch (err) { console.error(err) }
}

// Hulu play function
function hlPlay() {
  try {
    document.querySelector('.PlayButton').click()
  } catch (err) { console.error(err) }
}

// Amazon play function
function amzPlay() {
  try {
    document.querySelectorAll('.rendererContainer>video').forEach(input => { input.play() })
  } catch (err) { console.error(err) }
}

// Default play function
function defaultPlay() {
  try {
    document.querySelectorAll('video').forEach(input => { input.play() })
  } catch (err) { console.error(err) }
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
  if (!showHomescreen && !showPrefs) {
    updateShowFacets()
    const waw = showFacets ? facetAdjustWidth : baseAdjustWidth
    const wah = frameless ? 0 : winAdjustHeight
    const hs = frameless ? 0 : headerSize
    view.setBounds({
      x: 0,
      y: hs,
      width: wb.width - waw,
      height: wb.height - wah
    })
  }
}

// Change stream service
function streamChange(stream) {
  if (validateLink(stream.url)) {
    const currentHost = new URL(stream.url).hostname
    isPlaying ? pause() : null
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    showHomescreen = false
    currentStream = stream.id === 'ot' ? setStreamId(currentHost) : stream.id
    updateShowFacets()
    view.webContents.loadURL(stream.url, { userAgent: userAgent })
    win.webContents.send('hide-homescreen')
    win.webContents.send('stream-changed')
  } else {
    win.webContents.send('invalid-url')
  }
}

// Stream loaded
function streamLoaded() {
  setTimeout(ytFullScreen, 3000)
  ytAdsSkip()
  amzGetUrl()
  setTimeout(amzUpgradeDismiss, 3000)
  setTimeout(amzPreviewSkip, 3000)
  setTimeout(amzRecapSkip, 3000)
  setTimeout(amzEpisodeNext, 3000)
  nfRecapSkip()
  nfEpisodeNext()
  setTimeout(hlRecapSkip, 3000)
  setTimeout(hlEpisodeNext, 3000)
  setTimeout(dpRecapSkip, 3000)
  setTimeout(dpEpisodeNext, 3000)
  setTimeout(hmRecapSkip(), 3000)
  setTimeout(hmEpisodeNext(), 3000)
  setTimeout(cbRecapSkip(), 3000)
  setTimeout(cbEpisodeNext(), 3000)
  setTimeout(atRecapSkip, 3000)
  setTimeout(atEpisodeNext, 3000)
  setTimeout(pcRecapSkip, 3000)
  setTimeout(pcEpisodeNext, 3000)
  enableFacets()
  noFrame()
  removeScrollbars()
}

// Toggle facets if Netflix
function updateShowFacets() {
  showFacets = showFacets && currentStream === 'nf'
  win.webContents.send('show-facets', showFacets)
}

// Open copied link in new BrowserView
function openLink(url) {
  currentStream = 'ot'
  const stream = {
    id: currentStream,
    url: url
  }
  streamChange(stream)
}

// Navigate view backwards
function navBack() {
  if (view.getBounds().width === 0) {
    showHomescreen = false
    win.webContents.send('hide-homescreen')
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
  win.webContents.send('stream-changed')
  setTimeout(setViewBounds, 1000)
}

// Set the stream ID if it needs to be derived
function setStreamId(host) {
  let serv = defaultStreams.find(item => new URL(item.url).hostname === host)
  return serv ? serv.id : 'ot'
}

// Scale height to supplied aspect ratio
function scaleHeight(width, height) {
  height = Math.round((((wb.width - baseAdjustWidth) * height) / width) + (frameless ? 0 : winAdjustHeight))
  win.setBounds({
    x: wb.x,
    y: wb.y,
    height: height,
    width: wb.width
  })
}

// Scale width to supplied aspect ratio
function scaleWidth(width, height) {
  width = Math.round(((wb.height - (frameless ? 0 : winAdjustHeight)) * width) / height) + baseAdjustWidth
  win.setBounds({
    x: wb.x,
    y: wb.y,
    height: wb.height,
    width: width
  })
}

// Check if url is valid
function validateLink(url) {
  try {
    new URL(url)
  } catch (err) {
    console.log('invalid URL')
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

// Toggle home screen page
function toggleHomescreen() {
  if (showHomescreen) {
    showHomescreen = false
    win.webContents.send('hide-homescreen')
    setViewBounds()
  } else {
    isPlaying ? pause() : null
    showHomescreen = true
    win.webContents.send('show-homescreen')
    view.setBounds({ x: 0, y: 0, width: 0, height: 0})
  }
}

// Toggle facets view
function toggleFacets() {
  showFacets = currentStream === 'nf' && view.getBounds().width === wb.width - baseAdjustWidth
  setViewBounds()
}

// Enable genre menuitem
function enableFacets() {
  menu.getMenuItemById('toggleGenres').enabled = currentStream === 'nf'
}

// Toggle always on top
function toggleOnTop() {
  win.webContents.send('ontop')
}

// Get info (image, title) from url
function getUrlInfo(url) {
  if (validateLink(url)) {
    let ghostWin = new BrowserWindow({
      width: 1024,
      height: 600,
      show: false
    })
    ghostWin.loadURL(url)
    ghostWin.webContents.audioMuted = true
    ghostWin.webContents.on('did-finish-load', () => {
      ghostWin.webContents.capturePage().then(image => {
        clipboard.writeImage(image)
        win.webContents.send('url-info', { url: ghostWin.webContents.getURL(), title: ghostWin.webContents.getTitle() })
        ghostWin.destroy()
      })
    })
  }
}

// Get current url and then open child window
function openNewin() {
  const hs = frameless ? 0 : headerSize
  const ch = 600
  const cw = Math.round(ch * (wb.width / (wb.height - hs)))
  getCurrentUrl().then(url => {
    const child = new BrowserWindow({
      height: ch,
      width: cw,
      frame: false,
      fullscreenable: false,
      titleBarStyle: isMac ? 'customButtonsOnHover' : 'hidden'
    })
    child.loadURL(url)
    child.once('ready-to-show', () => {
      child.show()
    })
    child.webContents.once('did-finish-load', () => {
      child.webContents.executeJavaScript(`document.body.insertAdjacentHTML('beforeend', '<div class="sd-framless-header"></div><style> .sd-framless-header { position: fixed; top: 0; left: 0; width: 100%; height: 15px; opacity: 0; z-index: 99999; cursor: -webkit-grab; cursor: grab; -webkit-user-drag: none; -webkit-app-region: drag; } ::-webkit-scrollbar { display: none; } </style>')`)
      setTimeout(ytFullScreen, 1500, child)
      setTimeout(ytAdsSkip, 3000, child)
      // amzUpgradeDismiss()
      // amzPreviewSkip()
      // amzRecapSkip()
      // amzEpisodeNext()
      // nfRecapSkip()
      // nfEpisodeNext()
      // hlRecapSkip()
      // hlEpisodeNext()
      // dpRecapSkip()
      // dpEpisodeNext()
      // hmRecapSkip()
      // hmEpisodeNext()
      // cbRecapSkip()
      // cbEpisodeNext()
      // atRecapSkip()
      // atEpisodeNext()
      // pcRecapSkip()
      // pcEpisodeNext()
      isDev && child.webContents.openDevTools('detach')
    })
  })
}

// Toggle frameless window
function toggleFrame() {
  if (isMac) {
    if (!frameless) {
      frameless = true
    } else {
      frameless = false
    }
    noFrame()
  }
}

// Set framless window
function noFrame() {
  if (frameless) {
    view.webContents.executeJavaScript(
      `document.body.insertAdjacentHTML('beforeend', '<div class="sd-framless-header"></div><style> .sd-framless-header { position: fixed; top: 0; left: 0; width: 100%; height: 13px; opacity: 0; z-index: 99999; cursor: -webkit-grab; cursor: grab; -webkit-user-drag: none; -webkit-app-region: drag; } </style>')`
    )
  } else {
    view.webContents.executeJavaScript(`if(document.querySelector('.sd-framless-header')) document.querySelector('.sd-framless-header').remove()`)
  }
  setViewBounds()
}

// Remove scrollbars from stream view
function removeScrollbars() {
  view.webContents.executeJavaScript(
    `document.body.insertAdjacentHTML('beforeend', '<style> ::-webkit-scrollbar { display: none; } </style>')`
  )
}

// Send bookmark to renderer
async function sendBookmark() {
  await getCurrentUrl().then((currentUrl) => {
    win.webContents.send('save-bookmark', { id: currentStream, title: view.webContents.getTitle(), url: currentUrl })
  }).catch((err) => { console.error('SBM:'+err) })
}

// Send current stream object
async function sendCurrentStream() {
  await getCurrentUrl().then((currentUrl) => {
    if (validateLink(currentUrl)) {
      currentStream = setStreamId(new URL(currentUrl).hostname)
      win.webContents.send('stream-loaded', { id: currentStream, url: currentUrl })
    }
  }).catch((err) => { console.error('SCS:'+err) })
}

// Get current URL
async function getCurrentUrl() {
  let url = view.webContents.getURL()
  if (currentStream === 'ap') {
    let urlAp = await view.webContents.executeJavaScript(
      `try { console.log('got url'); sdAmzUrl; } catch(err) { console.error('not yet') }`
    ).catch((err) => { console.error('GCU:'+err) })
    url = urlAp === undefined ? url : urlAp
  }
  return url
}

// Before close
async function beforeClose() {
  allowQuit = true
  await saveSettings().catch((err) => { 
    console.error('BC:'+err) 
  }).finally(() => {
    tray.destroy()
    BrowserWindow.getAllWindows().forEach(wins => {
      wins.destroy()
    })
    app.quit()
  })
}

// Send settings
async function saveSettings() {
  const data = {
    windowSizeLocation: {
      x: wb.x,
      y: wb.y,
      height: wb.height,
      width: wb.width
    }
  }
  await sendCurrentStream().then(
    win.webContents.send('save-settings', data)
  ).catch((err) => { console.error('SS:'+err) })
}

//#region YouTube scripts

// YouTube observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsYtAds = null

// YouTube ad script injection
function ytAdsSkip(bv = view) {
  if (currentStream === 'yt') {
    if (ytSkipAds) {
      bv.webContents.executeJavaScript(`${ytAdOverlayClick.toString()}`).catch((err) => { console.error(err) })
      bv.webContents.executeJavaScript(`${ytPromoCloseClick.toString()}`).catch((err) => { console.error(err) })
      bv.webContents.executeJavaScript(`${ytAdSkipClick.toString()}`)
        .then(() => bv.webContents.executeJavaScript('ytAdSkipClick()'))
        .catch((err) => { console.error(err) })
      bv.webContents.executeJavaScript('try { let obsYtAds = null } catch(err) { console.error(err) }')
        .then(() => bv.webContents.executeJavaScript(`(${ytAdSkipMut.toString()})()`))
        .then(() => bv.webContents.executeJavaScript(`(${ytAdSkipObs.toString()})()`))
        .catch((err) => { console.error(err) })
    } else {
      bv.webContents.executeJavaScript(`(${ytAdSkipDis.toString()})()`).catch((err) => { console.error(err) })
    }
  }
}

// YouTube overlay close click
function ytAdOverlayClick() {
  try {
    console.log('overlay close')
    if (document.querySelector('.ytp-ad-overlay-close-button') != undefined) {
      document.querySelector('.ytp-ad-overlay-close-button').click()
    }
  } catch(err) { console.error(err) }
}

// YouTube promo close click
function ytPromoCloseClick() {
  try {
    console.log('promo skip')
    if (document.querySelectorAll('#dismiss-button').length > 0) {
      document.querySelectorAll('#dismiss-button').forEach(input => { input.click() })
    }
  } catch(err) { console.error(err) }
}

// YouTube ad skip click
function ytAdSkipClick() {
  try {
    console.log('ad skip')
    if (document.querySelector('.ytp-ad-skip-button') != undefined) {
      document.querySelector('.ytp-ad-skip-button').click()
    }
  } catch(err) { console.error(err) }
}

// YouTube ad skip mutation observer
function ytAdSkipMut() {
  try {
    console.log('ads mut')
    obsYtAds = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.target.classList.contains('ytp-ad-text')) {
          ytAdSkipClick()
        }
        if (mut.type === 'childList' && mut.target.classList.contains('ytp-ad-module')) {
          ytAdOverlayClick()
        }
        if (mut.type === 'childList' && (mut.target.classList.contains('ytd-mealbar-promo-renderer') || mut.target.nodeName.toLowerCase() === 'tp-yt-paper-dialog')) {
          ytPromoCloseClick()
        }
      }
    })
  } catch (err) { console.error(err) }
}

// YouTube ad skip observer invocation
function ytAdSkipObs() {
  try {
    console.log('ads obs')
    obsYtAds.observe(document.querySelector('ytd-app'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// YouTube ad skip observer disconnection
function ytAdSkipDis() {
  try {
    console.log('ads dis')
    if (typeof obsYtAds !== 'undefined') {
      obsYtAds.disconnect()
    }
  } catch (err) { console.error(err) }
}

// YouTube observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsYtFs = null

// YouTube ad script injection
function ytFullScreen(bv = view) {
  if (currentStream === 'yt' && ytScreenFull) {
    bv.webContents.executeJavaScript(`${ytFullScreenClick.toString()}`)
      .then(() => bv.webContents.focus())
      .then(() => bv.webContents.sendInputEvent({type: 'keyDown', keyCode: 'f'}))
      .then(() => bv.webContents.executeJavaScript('ytFullScreenClick()'))
      .catch((err) => { console.error(err) })
    bv.webContents.executeJavaScript('try { let obsYtFs = null } catch(err) { console.error(err) }')
      .then(() => bv.webContents.executeJavaScript(`(${ytFullScreenMut.toString()})()`))
      .then(() => bv.webContents.executeJavaScript(`(${ytFullScreenObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'yt') {
    bv.webContents.executeJavaScript(`(${ytFullScreenDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// YouTube fullscreen click
function ytFullScreenClick() {
  try {
    console.log('fs click')
    document.querySelectorAll('.ytp-fullscreen-button').forEach(input => { 
      if (input.getAttribute('title') && !input.getAttribute('title').includes('Exit')) {
        input.focus()
        input.click()
      }
    })
  } catch(err) { console.error(err) }
}

// YouTube fullscreen mutation observer
function ytFullScreenMut() {
  try {
    console.log('fs mut')
    obsYtFs = new MutationObserver(() => {
      ytFullScreenClick()
      // for(const mut of ml) {
      //   console.log(mut)
      // }
    })
  } catch (err) { console.error(err) }
}

// YouTube fullscreen observer invocation
function ytFullScreenObs() {
  try {
    console.log('fs obs')
    obsYtFs.observe(document.querySelector('#ytd-player'), { subtree: true, attributes: true, attributeFilter: ['src'] })
  } catch (err) { console.error(err) }
}

// YouTube fullscreen observer disconnection
function ytFullScreenDis() {
  try {
    console.log('fs dis')
    if (typeof obsYtFs !== 'undefined') {
      obsYtFs.disconnect()
    }
  } catch (err) { console.error(err) }
}

//#endregion

//#region Amazon Prime scripts

// Track the acutal URL for Amazon Prime videos
function amzGetUrl() {
  if (currentStream === 'ap') {
    try {
      view.webContents.executeJavaScript(`
        console.log('getUrl')
        let sdAmzUrl = '${view.webContents.getURL()}'
        try {
            document.querySelectorAll('.tst-title-card').forEach(function (tile) { tile.dispatchEvent(new MouseEvent('mouseover', { 'bubbles': true })) })
            document.querySelectorAll('.tst-play-button').forEach(function (btn) { btn.addEventListener('click', function () { sdAmzUrl = this.href }) })
          } catch(err) { console.error(err) }
      `)
    } catch(err) { console.error(err) }
  }
}

// Prime observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsAmzUpgrade = null

// Prime dismiss browser upgrade notification
function amzUpgradeDismiss() {
  if (!isLinux && currentStream === 'ap') {
    view.webContents.executeJavaScript(`${amzUpgradeDismissClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsAmzUpgrade = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${amzUpgradeDismissMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${amzUpgradeDismissObs.toString()})()`))
      .catch((err) => { console.error(err) })
  }
}

// Prime upgrade your browser dismiss click
function amzUpgradeDismissClick() {
  try {
    console.log('upgrade dismiss')
    if (document.querySelector('.f1dk4awg') != undefined) {
      document.querySelector('.f1dk4awg').click()
    }
  } catch(err) { console.error(err) }
}

// Prime upgrade your browser dismiss mutation observer
function amzUpgradeDismissMut() {
  try {
    console.log('upgrade mut')
    obsAmzUpgrade = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains('f1jhb4b3')) {
              amzUpgradeDismissClick()
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Prime upgrade your browser dismiss observer invocation
function amzUpgradeDismissObs() {
  try {
    console.log('upgrade obs')
    obsAmzUpgrade.observe(document.querySelector('.webPlayerUIContainer'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Prime dummy declarations (this is not actually used as it is sent over as a string!)
let obsAmzPreview = null
let eleAmzPreview = null
let obsEleAmzPreview = null

// Skip/close Prime previews
function amzPreviewSkip() {
  if (amzSkipPreview && currentStream === 'ap') {
    eleAmzPreview = 'fu4rd6c'
    obsEleAmzPreview = '.webPlayerUIContainer'
    if (isLinux) {
      eleAmzPreview = 'adSkipButton'
      obsEleAmzPreview = '.bottomPanel'
    }
    view.webContents.executeJavaScript(`${amzPrevSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('let obsAmzPreview = null')
      .then(() => view.webContents.executeJavaScript(`let eleAmzPreview = '${eleAmzPreview}'`))
      .then(() => view.webContents.executeJavaScript(`let obsEleAmzPreview = '${obsEleAmzPreview}'`))
      .then(() => view.webContents.executeJavaScript(`(${amzPreviewSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${amzPreviewSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'ap') {
    view.webContents.executeJavaScript(`(${amzPreviewSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Prime preview skip click
function amzPrevSkipClick(ele) {
  try {
    console.log('prev skip')
    if (document.querySelector(ele) != undefined) {
      document.querySelector(ele).click()
    }
  } catch(err) { console.error(err) }
}

// Prime preview skip mutation observer
function amzPreviewSkipMut() {
  try {
    console.log('prev mut')
    obsAmzPreview = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains(eleAmzPreview)) {
              amzPrevSkipClick(`.${eleAmzPreview}`)
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Prime preview skip observer invocation
function amzPreviewSkipObs() {
  try {
    console.log('prev obs')
    obsAmzPreview.observe(document.querySelector(obsEleAmzPreview), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Prime preview skip observer disconnection
function amzPreviewSkipDis() {
  try {
    console.log('prev dis')
    if (typeof obsAmzPreview !== 'undefined') {
      obsAmzPreview.disconnect()
    }
  } catch (err) { console.error(err) }
}

// Prime dummy declarations (this is not actually used as it is sent over as a string!)
let obsAmzRecap = null
let eleAmzRecap = null
let obsEleAmzRecap = null

// Skip/close Prime episode recap & intros
function amzRecapSkip() {
  if (amzSkipRecap && currentStream === 'ap') {
    eleAmzRecap = 'atvwebplayersdk-skipelement-button'
    obsEleAmzRecap = '.webPlayerUIContainer'
    if (isLinux) {
      eleAmzRecap = 'skipElement'
      obsEleAmzRecap = '.notificationsWrapper'
    }
    view.webContents.executeJavaScript(`${amzRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('let obsAmzRecap = null')
      .then(() => view.webContents.executeJavaScript(`let eleAmzRecap = '${eleAmzRecap}'`))
      .then(() => view.webContents.executeJavaScript(`let obsEleAmzRecap = '${obsEleAmzRecap}'`))
      .then(() => view.webContents.executeJavaScript(`(${amzRecapSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${amzRecapSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'ap') {
    view.webContents.executeJavaScript(`(${amzRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Prime recap skip click
function amzRecapSkipClick(ele) {
  try {
    console.log('recap skip')
    if (document.querySelector(ele) != undefined) {
      document.querySelector(ele).click()
    }
  } catch(err) { console.error(err) }
}

// Prime recap skip mutation observer
function amzRecapSkipMut() {
  try {
    console.log('recap mut')
    obsAmzRecap = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains(eleAmzRecap)) {
              amzRecapSkipClick(`.${eleAmzRecap}`)
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Prime recap skip observer invocation
function amzRecapSkipObs() {
  try {
    console.log('recap obs')
    obsAmzRecap.observe(document.querySelector(obsEleAmzRecap), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Prime recap skip observer disconnection
function amzRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsAmzRecap !== 'undefined') {
      obsAmzRecap.disconnect()
    }
  } catch (err) { console.error(err) }
}

// Prime dummy declarations (this is not actually used as it is sent over as a string!)
let obsAmzNext = null
let eleAmzNext = null
let obsEleAmzNext = null

// Automatically start next Prime episode
function amzEpisodeNext() {
  if (amzNextEpisode && currentStream === 'ap') {
    eleAmzNext = 'atvwebplayersdk-nextupcard-button'
    obsEleAmzNext = '.atvwebplayersdk-nextupcard-wrapper'
    if (isLinux) {
      eleAmzNext = 'nextUpCard'
      obsEleAmzNext = '.notificationsWrapper'
    }
    view.webContents.executeJavaScript(`${amzEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('let obsAmzNext = null')
      .then(() => view.webContents.executeJavaScript(`let eleAmzNext = '${eleAmzNext}'`))
      .then(() => view.webContents.executeJavaScript(`let obsEleAmzNext = '${obsEleAmzNext}'`))
      .then(() => view.webContents.executeJavaScript(`(${amzEpisodeNextMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${amzEpisodeNextObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'ap') {
    view.webContents.executeJavaScript(`(${amzEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Prime next episode click
function amzEpisodeNextClick(ele) {
  try {
    console.log('next episode')
    if (document.querySelector(ele) != undefined) {
      document.querySelector(ele).click()
    }
  } catch(err) { console.error(err) }
}

// Prime next episode mutation observer
function amzEpisodeNextMut() {
  try {
    console.log('next mut')
    obsAmzNext = new MutationObserver(() => {
      amzEpisodeNextClick(`.${eleAmzNext}`)
    })
  } catch(err) { console.error(err) }
}

// Prime next episode observer invocation
function amzEpisodeNextObs() {
  try {
    console.log('next obs')
    obsAmzNext.observe(document.querySelector(obsEleAmzNext), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Prime next episode observer disconnection
function amzEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsAmzNext !== 'undefined') {
      obsAmzNext.disconnect()
    }
  } catch (err) { console.error(err) }
}

//#endregion

//#region Netflix scripts

// Netflix observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsNfSkip = null

// Skip/close Netlfix episode recap & intros
function nfRecapSkip() {
  if (nfSkipRecap && currentStream === 'nf') {
    view.webContents.executeJavaScript(`${nfRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsNfSkip = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${nfRecapSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${nfRecapSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'nf') {
    view.webContents.executeJavaScript(`(${nfRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Netflix recap skip click
function nfRecapSkipClick() {
  try {
    console.log('recap skip')
    if (document.querySelector('.watch-video--skip-content-button') != undefined) {
      document.querySelector('.watch-video--skip-content-button').click()
    }
  } catch(err) { console.error(err) }
}

// Netflix recap skip mutation observer
function nfRecapSkipMut() {
  try {
    console.log('recap mut')
    obsNfSkip = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.childNodes) {
              element.childNodes.forEach(childNode => {
                if (childNode.classList && (childNode.classList.contains('watch-video--skip-content') || childNode.classList.contains('watch-video--skip-content-button'))) {
                  nfRecapSkipClick()
                }
              })
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Netflix recap skip observer invocation
function nfRecapSkipObs() {
  try {
    console.log('recap obs')
    obsNfSkip.observe(document.querySelector('#appMountPoint'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Netflix recap skip observer disconnection
function nfRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsNfSkip !== 'undefined') {
      obsNfSkip.disconnect()
    }
  } catch (err) { console.error('dis ' + err) }
}

// Netflix observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsNfNext = null

// Automatically start next Netlfix episode
function nfEpisodeNext() {
  if (nfNextEpisode && currentStream === 'nf') {
    view.webContents.executeJavaScript(`${nfEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsNfNext = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${nfEpisodeNextMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${nfEpisodeNextObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'nf') {
    view.webContents.executeJavaScript(`(${nfEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Netflix next episode click
function nfEpisodeNextClick() {
  try {
    console.log('next episode')
    if (document.querySelector('[data-uia = "next-episode-seamless-button-draining"]') != undefined) {
      document.querySelector('[data-uia = "next-episode-seamless-button-draining"]').click()
    }
    if (document.querySelector('[data-uia = "next-episode-seamless-button"]') != undefined) {
      document.querySelector('[data-uia = "next-episode-seamless-button"]').click()
    }
  } catch(err) { console.error(err) }
}

// Netflix next episode mutation observer
function nfEpisodeNextMut() {
  try {
    console.log('next mut')
    obsNfNext = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains('SeamlessControls--container')) {
              nfEpisodeNextClick()
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Netflix next episode observer invocation
function nfEpisodeNextObs() {
  try {
    console.log('next obs')
    obsNfNext.observe(document.querySelector('#appMountPoint'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Netflix next episode observer disconnection
function nfEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsNfNext !== 'undefined') {
      obsNfNext.disconnect()
    }
  } catch (err) { console.error(err) }
}

//#endregion

//#region Hulu scripts

// Hulu observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsHlRecapSkip = null

// Hulu recap & credits script injection
function hlRecapSkip() {
  if (hlSkipRecap && currentStream === 'hl') {
    view.webContents.executeJavaScript(`${hlRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsHlRecapSkip = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${hlRecapSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${hlRecapSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'hl') {
    view.webContents.executeJavaScript(`(${hlRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Hulu skip click
function hlRecapSkipClick() {
  try {
    console.log('skip recap')
    if (document.querySelector('.SkipButton__button') != undefined) {
      document.querySelector('.SkipButton__button').click()
    }
  } catch(err) { console.error(err) }
}

// Hulu skip mutation observer
function hlRecapSkipMut() {
  try {
    console.log('skip mut')
    obsHlRecapSkip = new MutationObserver(() => {
      hlRecapSkipClick()
    })
  } catch (err) { console.error(err) }
}

// Hulu skip observer invocation
function hlRecapSkipObs() {
  try {
    console.log('skip obs')
    obsHlRecapSkip.observe(document.querySelector('.SkipButton').parentElement, { attributes: true, attributeFilter: ['style'] })
  } catch (err) { console.error(err) }
}

// Hulu skip observer disconnect
function hlRecapSkipDis() {
  try {
    console.log('skip dis')
    if (typeof obsHlRecapSkip !== 'undefined') {
      obsHlRecapSkip.disconnect()
    }
  } catch (err) { console.error(err) }
}

// Hulu dummy declarations (this is not actually used as it is sent over as a string!)
let obsHlNext = null
let obsHlNextImp = null
let obsHlNextBool = true

// Automatically start next Hulu episode
function hlEpisodeNext() {
  if (hlNextEpisode && currentStream === 'hl') {
    view.webContents.executeJavaScript('let obsHlNextBool = true')
    view.webContents.executeJavaScript(`${hlEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsHlNext = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${hlEpisodeNextMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`${hlEpisodeNextObs.toString()}`))
      .catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsHlNextImp = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${hlEpisodeNextImpMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${hlEpisodeNextImpObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'hl') {
    view.webContents.executeJavaScript(`(${hlEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Hulu next episode click
function hlEpisodeNextClick() {
  try {
    console.log('next episode')
    if (document.querySelector('.EndCardButton').closest('.ControlsContainer__transition').style.visibility === 'visible') {
      document.querySelector('.EndCardButton').click()
    }
  } catch(err) { console.error(err) }
}

// Hulu next episode implementation mutation observer
function hlEpisodeNextImpMut() {
  try {
    console.log('imp mut')
    obsHlNextImp = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains('PlayerMetadata')) {
              setTimeout(hlEpisodeNextObs, 3000)
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Hulu next episode implementation observer invocation
function hlEpisodeNextImpObs() {
  try {
    console.log('imp obs')
    obsHlNextImp.observe(document.querySelector('.ControlsContainer'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Hulu next episode mutation observer
function hlEpisodeNextMut() {
  try {
    console.log('next mut')
    obsHlNext = new MutationObserver(() => {
      hlEpisodeNextClick()
    })
  } catch(err) { console.error(err) }
}

// Hulu next episode observer invocation
function hlEpisodeNextObs() {
  try {
    if (obsHlNextBool) {
      console.log('next obs')
      obsHlNext.observe(document.querySelector('.EndCardButton').closest('.ControlsContainer__transition'), { attributes: true })
      obsHlNextBool = false
    }
  } catch (err) { console.error(err) }
}

// Hulu next episode observer disconnection
function hlEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsHlNext !== 'undefined') {
      obsHlNext.disconnect()
    }
  } catch (err) { console.error(err) }
}

//#endregion

//#region Disney+ scripts

// Disney observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsDpRecap = null

// Skip/close Disney episode recap & intros
function dpRecapSkip() {
  if (dpSkipRecap && currentStream === 'dp') {
    view.webContents.executeJavaScript(`${dpRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsDpRecap = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${dpRecapSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${dpRecapSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'dp') {
    view.webContents.executeJavaScript(`(${dpRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Disney recap skip click
function dpRecapSkipClick() {
  try {
    console.log('recap episode')
    if (document.querySelector('.skip__button') != undefined) {
      document.querySelector('.skip__button').click()
    }
  } catch(err) { console.error(err) }
}

// Disney recap skip mutation observer
function dpRecapSkipMut() {
  try {
    console.log('recap mut')
    obsDpRecap = new MutationObserver(() => {
      dpRecapSkipClick()
    })
  } catch(err) { console.error(err) }
}

// Disney recap skip observer invocation
function dpRecapSkipObs() {
  try {
    console.log('recap obs')
    obsDpRecap.observe(document.querySelector('.hudson-container'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Disney recap skip observer disconnection
function dpRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsDpRecap !== 'undefined') {
      obsDpRecap.disconnect()
    }
  } catch (err) { console.error(err) }
}

// Disney observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsDpNext = null

// Automatically start next Disney episode
function dpEpisodeNext() {
  if (dpNextEpisode && currentStream === 'dp') {
    view.webContents.executeJavaScript(`${dpEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsDpNext = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${dpEpisodeNextMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${dpEpisodeNextObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'dp') {
    view.webContents.executeJavaScript(`(${dpEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Disney next episode click
function dpEpisodeNextClick() {
  try {
    console.log('next episode')
    if (document.querySelectorAll('[data-testid = "up-next-play-button"]')[0] != undefined) {
      document.querySelectorAll('[data-testid = "up-next-play-button"]')[0].click()
    }
  } catch(err) { console.error(err) }
}

// Disney next episode mutation observer
function dpEpisodeNextMut() {
  try {
    console.log('next mut')
    obsDpNext = new MutationObserver(() => {
      dpEpisodeNextClick()
    })
  } catch(err) { console.error(err) }
}

// Disney next episode observer invocation
function dpEpisodeNextObs() {
  try {
    console.log('next obs')
    obsDpNext.observe(document.querySelector('#app_scene_content'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Disney next episode observer disconnection
function dpEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsDpNext !== 'undefined') {
      obsDpNext.disconnect()
    }
  } catch (err) { console.error(err) }
}

//#endregion

//#region HBO Max scripts

// HBO observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsHmRecap = null

// Skip/close HBO episode recap & intros
function hmRecapSkip() {
  if (hmSkipRecap && currentStream === 'hm') {
    view.webContents.executeJavaScript(`${hmRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsHmRecap = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${hmRecapSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${hmRecapSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'hm') {
    view.webContents.executeJavaScript(`(${hmRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// HBO recap skip click
function hmRecapSkipClick() {
  try {
    console.log('recap episode')
    if (document.querySelector('[data-testid="SkipButton"]') != undefined) {
      document.querySelector('[data-testid="SkipButton"]').click()
    }
  } catch(err) { console.error(err) }
}

// HBO recap skip mutation observer
function hmRecapSkipMut() {
  try {
    console.log('recap mut')
    obsHmRecap = new MutationObserver(() => {
      hmRecapSkipClick()
    })
  } catch(err) { console.error(err) }
}

// HBO recap skip observer invocation
function hmRecapSkipObs() {
  try {
    console.log('recap obs')
    obsHmRecap.observe(document.querySelector('#root'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// HBO recap skip observer disconnection
function hmRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsHmRecap !== 'undefined') {
      obsHmRecap.disconnect()
    }
  } catch (err) { console.error(err) }
}

// HBO observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsHmNext = null

// Automatically start next HBO episode
function hmEpisodeNext() {
  if (hmNextEpisode && currentStream === 'hm') {
    view.webContents.executeJavaScript(`${hmEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsHmNext = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${hmEpisodeNextMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${hmEpisodeNextObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'hm') {
    view.webContents.executeJavaScript(`(${hmEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// HBO next episode click
function hmEpisodeNextClick() {
  try {
    console.log('next episode')
    if (document.querySelector('[data-testid="UpNextButton"]') != undefined) {
      document.querySelector('[data-testid="UpNextButton"]').click()
    }
  } catch(err) { console.error(err) }
}

// HBO next episode mutation observer
function hmEpisodeNextMut() {
  try {
    console.log('next mut')
    obsHmNext = new MutationObserver(() => {
      hmEpisodeNextClick()
    })
  } catch(err) { console.error(err) }
}

// HBO next episode observer invocation
function hmEpisodeNextObs() {
  try {
    console.log('next obs')
    obsHmNext.observe(document.querySelector('#root'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// HBO next episode observer disconnection
function hmEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsHmNext !== 'undefined') {
      obsHmNext.disconnect()
    }
  } catch (err) { console.error(err) }
}

//#endregion

//#region Paramount (formerly CBS) scripts

// Paramount observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsCbRecap = null

// Skip/close Paramount episode recap & intros
function cbRecapSkip() {
  if (cbSkipRecap && currentStream === 'cb') {
    view.webContents.executeJavaScript(`${cbRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsCbRecap = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${cbRecapSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${cbRecapSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'cb') {
    view.webContents.executeJavaScript(`(${cbRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Paramount recap skip click
function cbRecapSkipClick() {
  try {
    console.log('recap episode')
    if (document.querySelector('.skip-button') != undefined) {
      document.querySelector('.skip-button').click()
    }
  } catch(err) { console.error(err) }
}

// Paramount recap skip mutation observer
function cbRecapSkipMut() {
  try {
    console.log('recap mut')
    obsCbRecap = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'attributes') {
          cbRecapSkipClick()
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Paramount recap skip observer invocation
function cbRecapSkipObs() {
  try {
    console.log('recap obs')
    obsCbRecap.observe(document.querySelector('#main-container'), { subtree: true, attributes: true, attributeFilter: ['disabled'] })
  } catch (err) { console.error(err) }
}

// Paramount recap skip observer disconnection
function cbRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsCbRecap !== 'undefined') {
      obsCbRecap.disconnect()
    }
  } catch (err) { console.error(err) }
}

// Paramount observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsCbNext = null

// Automatically start next Paramount episode
function cbEpisodeNext() {
  if (cbNextEpisode && currentStream === 'cb') {
    view.webContents.executeJavaScript(`${cbEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsCbNext = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${cbEpisodeNextMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${cbEpisodeNextObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'cb') {
    view.webContents.executeJavaScript(`(${cbEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Paramount next episode click
function cbEpisodeNextClick() {
  try {
    console.log('next episode')
    if (document.querySelector('.watch-now-btn') != undefined) {
      document.querySelector('.watch-now-btn').click()
    }
  } catch(err) { console.error(err) }
}

// Paramount next episode mutation observer
function cbEpisodeNextMut() {
  try {
    console.log('next mut')
    obsCbNext = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes[0] && mut.addedNodes[0].classList && mut.addedNodes[0].classList.contains('single-video-bottom-right')) {
          cbEpisodeNextClick()
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Paramount next episode observer invocation
function cbEpisodeNextObs() {
  try {
    console.log('next obs')
    obsCbNext.observe(document.querySelector('#main-container'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Paramount next episode observer disconnection
function cbEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsCbNext !== 'undefined') {
      obsCbNext.disconnect()
    }
  } catch (err) { console.error(err) }
}

//#endregion

//#region Peacock

// Paramount observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsPcRecap = null

// Skip/close Paramount episode recap & intros
function pcRecapSkip() {
  if (pcSkipRecap && currentStream === 'pc') {
    view.webContents.executeJavaScript(`${pcRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsPcRecap = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${pcRecapSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${pcRecapSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'pc') {
    view.webContents.executeJavaScript(`(${pcRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Paramount recap skip click
function pcRecapSkipClick() {
  try {
    console.log('recap episode')
    if (document.querySelector('.playback-controls__skip--button') != undefined) {
      document.querySelector('.playback-controls__skip--button').click()
    }
  } catch(err) { console.error(err) }
}

// Paramount recap skip mutation observer
function pcRecapSkipMut() {
  try {
    console.log('recap mut')
    obsPcRecap = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes[0] && mut.addedNodes[0].classList && mut.addedNodes[0].classList.contains('playback-controls__skip--button')) {
          pcRecapSkipClick()
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Paramount recap skip observer invocation
function pcRecapSkipObs() {
  try {
    console.log('recap obs')
    obsPcRecap.observe(document.querySelector('.primary-layout__content'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Paramount recap skip observer disconnection
function pcRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsPcRecap !== 'undefined') {
      obsPcRecap.disconnect()
    }
  } catch (err) { console.error(err) }
}

// Paramount observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsPcNext = null

// Automatically start next Paramount episode
function pcEpisodeNext() {
  if (pcNextEpisode && currentStream === 'pc') {
    view.webContents.executeJavaScript(`${pcEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsPcNext = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${pcEpisodeNextMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${pcEpisodeNextObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'pc') {
    view.webContents.executeJavaScript(`(${pcEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Paramount next episode click
function pcEpisodeNextClick() {
  try {
    console.log('next episode')
    if (document.querySelector('.playback-binge__image') != undefined) {
      document.querySelector('.playback-binge__image').click()
    }
  } catch(err) { console.error(err) }
}

// Paramount next episode mutation observer
function pcEpisodeNextMut() {
  try {
    console.log('next mut')
    obsPcNext = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes[0] && mut.addedNodes[0].classList && mut.addedNodes[0].classList.contains('playback-binge__container')) {
          pcEpisodeNextClick()
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Paramount next episode observer invocation
function pcEpisodeNextObs() {
  try {
    console.log('next obs')
    obsPcNext.observe(document.querySelector('.primary-layout__content'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Paramount next episode observer disconnection
function pcEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsPcNext !== 'undefined') {
      obsPcNext.disconnect()
    }
  } catch (err) { console.error(err) }
}

//#endregion

//#region Apple TV

// Apple TV observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsAtRecap = null

// Skip/close Apple TV episode recap & intros
function atRecapSkip() {
  if (atSkipRecap && currentStream === 'at') {
    view.webContents.executeJavaScript(`${atRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsAtRecap = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${atRecapSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${atRecapSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'at') {
    view.webContents.executeJavaScript(`(${atRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Apple TV recap skip click
function atRecapSkipClick() {
  try {
    console.log('recap episode')
    if (document.querySelector('.skip__button') != undefined) {
      document.querySelector('.skip__button').click()
    }
  } catch(err) { console.error(err) }
}

// Apple TV recap skip mutation observer
function atRecapSkipMut() {
  try {
    console.log('recap mut')
    obsAtRecap = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'attributes') {
          atRecapSkipClick()
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Apple TV recap skip observer invocation
function atRecapSkipObs() {
  try {
    console.log('recap obs')
    obsAtRecap.observe(document.querySelector('.skip__button'), { attributes: true })
  } catch (err) { console.error(err) }
}

// Apple TV recap skip observer disconnection
function atRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsAtRecap !== 'undefined') {
      obsAtRecap.disconnect()
    }
  } catch (err) { console.error(err) }
}

// Apple TV observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsAtNext = null

// Automatically start next Apple TV episode
function atEpisodeNext() {
  if (atNextEpisode && currentStream === 'at') {
    view.webContents.executeJavaScript(`${atEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsAtNext = null } catch(err) { console.error(err) }')
      .then(() => view.webContents.executeJavaScript(`(${atEpisodeNextMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${atEpisodeNextObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'at') {
    view.webContents.executeJavaScript(`(${atEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Apple TV next episode click
function atEpisodeNextClick() {
  try {
    console.log('next episode')
    if (document.querySelector('amp-up-next').shadowRoot.querySelector('.up-next__button') != undefined) {
      document.querySelector('amp-up-next').shadowRoot.querySelector('.up-next__button').click()
    }
  } catch(err) { console.error(err) }
}

// Apple TV next episode mutation observer
function atEpisodeNextMut() {
  try {
    console.log('next mut')
    obsAtNext = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList') {
          atEpisodeNextClick()
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Apple TV next episode observer invocation
function atEpisodeNextObs() {
  try {
    console.log('next obs')
    obsAtNext.observe(document.querySelector('amp-up-next').shadowRoot.querySelector('.up-next__button'), { childList: true })
  } catch (err) { console.error(err) }
}

// Apple TV next episode observer disconnection
function atEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsAtNext !== 'undefined') {
      obsAtNext.disconnect()
    }
  } catch (err) { console.error(err) }
}

//#endregion

// Load electron-reload in dev
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
  })
}

// Load Widevine component and instantiate UI
app.whenReady().then(async () => {
  await components.whenReady()
  console.log('components ready:', components.status())
  createWindow()
  createTray()
  setWinTrayTheme()
  !isDev && setTimeout(updater, 3000)
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

// IPC channel for hiding dock icon
ipcMain.on('hide-dock-icon', (e, data) => {
  if (app.dock !== undefined) {
    data ? app.dock.hide() : app.dock.show()
  }
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
  if (!showHomescreen) {
    captureStream()
  }
})

// IPC channel to toggle bookmarks
ipcMain.on('toggle-homescreen', () => {
  toggleHomescreen()
})

// IPC channel to skip YouTube ads
ipcMain.on('set-ytadskip', (e, bool) => {
  ytSkipAds = bool
  ytAdsSkip()
})

// IPC channel to auto fullscreen YouTube
ipcMain.on('set-ytfullscreen', (e, bool) => {
  ytScreenFull = bool
  ytFullScreen()
})

// IPC channel to skip Prime previews
ipcMain.on('set-amzprevskip', (e, bool) => {
  amzSkipPreview = bool
  amzPreviewSkip()
})

// IPC channel to skip Prime recap
ipcMain.on('set-amzrecapskip', (e, bool) => {
  amzSkipRecap = bool
  amzRecapSkip()
})

// IPC channel to automatically start next episode on Prime
ipcMain.on('set-amzepisodenext', (e, bool) => {
  amzNextEpisode = bool
  amzEpisodeNext()
})

// IPC channel to skip Netflix recap
ipcMain.on('set-nfrecapskip', (e, bool) => {
  nfSkipRecap = bool
  nfRecapSkip()
})

// IPC channel to automatically start next episode on Netflix
ipcMain.on('set-nfepisodenext', (e, bool) => {
  nfNextEpisode = bool
  nfEpisodeNext()
})

// IPC channel to skip Hulu recap
ipcMain.on('set-hlrecapskip', (e, bool) => {
  hlSkipRecap = bool
  hlRecapSkip()
})

// IPC channel to automatically start next episode on Hulu
ipcMain.on('set-hlepisodenext', (e, bool) => {
  hlNextEpisode = bool
  hlEpisodeNext()
})

// IPC channel to skip Disney recap
ipcMain.on('set-dprecapskip', (e, bool) => {
  dpSkipRecap = bool
  dpRecapSkip()
})

// IPC channel to automatically start next episode on Disney
ipcMain.on('set-dpepisodenext', (e, bool) => {
  dpNextEpisode = bool
  dpEpisodeNext()
})

// IPC channel to skip HBO recap
ipcMain.on('set-hmrecapskip', (e, bool) => {
  hmSkipRecap = bool
  hmRecapSkip()
})

// IPC channel to automatically start next episode on HBO
ipcMain.on('set-hmepisodenext', (e, bool) => {
  hmNextEpisode = bool
  hmEpisodeNext()
})

// IPC channel to skip Paramount recap
ipcMain.on('set-cbrecapskip', (e, bool) => {
  cbSkipRecap = bool
  cbRecapSkip()
})

// IPC channel to automatically start next episode on Paramount
ipcMain.on('set-cbepisodenext', (e, bool) => {
  cbNextEpisode = bool
  cbEpisodeNext()
})

// IPC channel to skip Apple recap
ipcMain.on('set-atrecapskip', (e, bool) => {
  atSkipRecap = bool
  atRecapSkip()
})

// IPC channel to automatically start next episode on Apple
ipcMain.on('set-atepisodenext', (e, bool) => {
  atNextEpisode = bool
  atEpisodeNext()
})

// IPC channel to skip Peacock recap
ipcMain.on('set-pcrecapskip', (e, bool) => {
  pcSkipRecap = bool
  pcRecapSkip()
})

// IPC channel to automatically start next episode on Peacock
ipcMain.on('set-pcepisodenext', (e, bool) => {
  pcNextEpisode = bool
  pcEpisodeNext()
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

// IPC channel to set user agent
ipcMain.on('set-user-agent', (e, data) => {
  userAgent = data
})

// IPC channel to set defualt streams
ipcMain.on('set-defaultstreams', (e, data) => {
  defaultStreams = data
})

// IPC channel to get url info from dropped link
ipcMain.on('get-url-info', (e, url) => {
  getUrlInfo(url)
})

// IPC channel to open child window
ipcMain.on('newin-open', () => {
  openNewin()
})

// IPC channel to toggle frameless
ipcMain.on('frameless-toggle', () => {
  toggleFrame()
})

// Build menu template
const template = [
  {
    label: app.name,
    submenu: [
      {
        label: 'About',
        click() {
          dialog.showMessageBox({
            title: `About ${app.name}`,
            message: `StreamDock\nVersion ${app.getVersion()}`,
            detail: 'Copyright \u00A9 jtvberg 2020-2022',
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
      ...(isMac ? [
        {
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
        }
      ] : []),
      {
        type: 'separator'
      },
      {
        role: 'quit'
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
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
      ...(isMac ? [
        {
          role: 'pasteAndMatchStyle'
        }
      ] : []),
      {
        role: 'delete'
      },
      {
        role: 'selectAll'
      }
    ]
  },
  {
    label: 'Streams',
    submenu: []
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Toggle Home Screen',
        click() {
          toggleHomescreen()
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
        label: 'Open Stream in New Window',
        id: 'newin',
        click() {
          openNewin()
        }
      },
      {
        label: 'Toggle Full Screen',
        id: 'fullScreen',
        click() {
          win.setFullScreen(!win.fullScreen)
        }
      },
      {
        label: 'Scale Height',
        submenu: [
          {
            label: '16:9',
            click() {
              scaleHeight(16, 9)
            }
          },
          {
            label: '4:3',
            click() {
              scaleHeight(4, 3)
            }
          },
          {
            label: '2:1',
            click() {
              scaleHeight(2, 1)
            }
          },
          {
            label: '2.4:1',
            click() {
              scaleHeight(12, 5)
            }
          }
        ]
      },
      {
        label: 'Scale Width',
        submenu: [
          {
            label: '16:9',
            click() {
              scaleWidth(16, 9)
            }
          },
          {
            label: '4:3',
            click() {
              scaleWidth(4, 3)
            }
          },
          {
            label: '2:1',
            click() {
              scaleWidth(2, 1)
            }
          },
          {
            label: '2.4:1',
            click() {
              scaleWidth(12, 5)
            }
          }
        ]
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
    submenu: [
      {
        role: 'minimize'
      },
      {
        role: 'zoom'
      },
      {
        label: 'Toggle Always On Top',
        click() {
          toggleOnTop()
        }
      },
      ...(isMac ? [
        {
          label: 'Toggle Frameless Window',
          id: 'frameless',
          click() {
            toggleFrame()
          }
        },
        {
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
      ] : [
        {
          role: 'close'
        }
      ])
    ]
  },
  {
    role: 'help',
    submenu: [
      {
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