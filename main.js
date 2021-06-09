/* eslint-disable quotes */
// TODO: Peacock won't login
// TODO: Scrollbar css

// Imports and variable declarations
const { app, BrowserWindow, ipcMain, BrowserView, Tray, TouchBar, session, Menu, MenuItem, systemPreferences, clipboard, nativeTheme, dialog } = require('electron')
const { TouchBarButton } = TouchBar
const path = require('path')
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'
const isWindows = process.platform === 'win32'
const updater = require('./updater')
const baseHeaderSize = 22
const baseMenuHeight = isLinux ? 25 : 57
const baseAdjustWidth = isWindows ? 16 : 0
const facetAdjustWidth = isWindows ? 265 : 250
const bookmarkAdjustWidth = 230
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
let hlSkipRecap = false
let hlNextEpisode = false
let showBookmarks = false
let userAgent = ''
let currentStream = ''
let touchBarItems = []

// OS variables
if (isMac) {
  systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true)
  systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true)
  userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
} else if (isWindows) {
  userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36'
} else if (isLinux) {
  app.disableHardwareAcceleration()
  userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36'
} else {
  userAgent = 'Chrome'
}

// Dev code
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
    transparent: isMac,
    hasShadow: false,
    frame: !isMac,
    visualEffectState: 'active',
    titleBarStyle: isMac ? 'hidden' : 'default',
    trafficLightPosition: {
      x: 7,
      y: 7
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
  // win.webContents.openDevTools('detach')

  // Create main browserView
  view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

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
    if (!isLinux) {
      getAccent()
    }
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
    setWinTrayTheme()
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
    default:
      view.webContents.executeJavaScript(`(${defaultPause.toString()})()`)
      break
  }
}

// Amazon pause function
function atPause() {
  try {
    document.querySelector('apple-tv-plus-player').shadowRoot.querySelector('amp-video-player-internal').shadowRoot.querySelector('amp-video-player').shadowRoot.querySelector('video').pause()
  } catch (err) { console.log(err) }
}

// Hulu pause function
function hlPause() {
  try {
    document.querySelector('.PauseButton').click()
  } catch (err) { console.log(err) }
}

// Default pause function
function defaultPause() {
  try {
    document.querySelectorAll('video').forEach(input => { input.pause() })
  } catch (err) { console.log(err) }
}

// Play stream
function play() {
  if (!showBookmarks) {
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
  } catch (err) { console.log(err) }
}

// Hulu play function
function hlPlay() {
  try {
    document.querySelector('.PlayButton').click()
  } catch (err) { console.log(err) }
}

// Amazon play function
function amzPlay() {
  try {
    document.querySelectorAll('.rendererContainer>video').forEach(input => { input.play() })
  } catch (err) { console.log(err) }
}

// Default play function
function defaultPlay() {
  try {
    document.querySelectorAll('video').forEach(input => { input.play() })
  } catch (err) { console.log(err) }
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
  // if (!showPrefs) {
    updateShowFacets()
    let waw = showFacets ? facetAdjustWidth : baseAdjustWidth
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
  setTimeout(amzUpgradeDismiss, 3000)
  setTimeout(amzPreviewSkip, 3000)
  setTimeout(amzRecapSkip, 3000)
  nfRecapSkip()
  nfEpisodeNext()
  setTimeout(hlRecapSkip, 3000)
  setTimeout(hlEpisodeNext, 3000)
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

// Scale height to supplied aspect ratio
function scaleHeight(width, height) {
  win.setBounds({
    x: wb.x,
    y: wb.y,
    height: Math.round((((wb.width - baseAdjustWidth) * height) / width) + winAdjustHeight),
    width: wb.width
  })
}

// Scale width to supplied aspect ratio
function scaleWidth(width, height) {
  win.setBounds({
    x: wb.x,
    y: wb.y,
    height: wb.height,
    width: Math.round(((wb.height - winAdjustHeight) * width) / height) + baseAdjustWidth
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

// TODO: Make docked on left of video
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
    view.setBounds({ x: 0, y: 0, width: 0, height: 0})
    // view.setBounds({ x: bookmarkAdjustWidth, y: baseHeaderSize, width: wb.width - bookmarkAdjustWidth, height: wb.height - baseHeaderSize })
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
    url = await view.webContents.executeJavaScript(`try { console.log('got url'); sdAmzUrl; } catch(err) { console.log('not yet') }`)
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

//#region YouTube scripts

// YouTube observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsYtAds = null

// YouTube ad script injection
function ytAdsSkip() {
  if (ytSkipAds && currentStream === 'yt') {
    view.webContents.executeJavaScript(`${ytAdOverlayClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript(`${ytPromoCloseClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript(`${ytAdSkipClick.toString()}`)
      .then(() => ('ytAdSkipClick()'))
      .catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsYtAds = null } catch(err) { console.log(err) }')
      .then(() => view.webContents.executeJavaScript(`(${ytAdSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${ytAdSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'yt') {
    view.webContents.executeJavaScript(`(${ytAdSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// YouTube overlay close click
function ytAdOverlayClick() {
  try {
    console.log('overlay close')
    if (document.querySelector('.ytp-ad-overlay-close-button') != undefined) {
      document.querySelector('.ytp-ad-overlay-close-button').click()
    }
  } catch(err) { console.log(err) }
}

// YouTube promo close click
function ytPromoCloseClick() {
  try {
    console.log('promo skip')
    if (document.querySelectorAll('#dismiss-button').length > 0) {
      document.querySelectorAll('#dismiss-button').forEach(input => { input.click() })
    }
  } catch(err) { console.log(err) }
}

// YouTube ad skip click
function ytAdSkipClick() {
  try {
    console.log('ad skip')
    if (document.querySelector('.ytp-ad-skip-button') != undefined) {
      document.querySelector('.ytp-ad-skip-button').click()
    }
  } catch(err) { console.log(err) }
}

// YouTube ad skip mutation observer
function ytAdSkipMut() {
  try {
    console.log('ads mut')
    obsYtAds = new MutationObserver(function(ml) {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.target.classList.contains('ytp-ad-text')) {
          ytAdSkipClick()
        }
        if (mut.type === 'childList' && mut.target.classList.contains('ytp-ad-module')) {
          ytAdOverlayClick()
        }
        if (mut.type === 'childList' && mut.target.classList.contains('ytd-mealbar-promo-renderer')) {
          ytPromoCloseClick()
        }
      }
    })
  } catch (err) { console.log(err) }
}

// YouTube ad skip observer invocation
function ytAdSkipObs() {
  try {
    console.log('ads obs')
    obsYtAds.observe(document.querySelector('ytd-app'), { childList: true, subtree: true })
  } catch (err) { console.log(err) }
}

// YouTube ad skip observer disconnection
function ytAdSkipDis() {
  try {
    console.log('ads dis')
    if (typeof obsYtAds !== 'undefined') {
      obsYtAds.disconnect()
    }
  } catch (err) { console.log(err) }
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
            document.querySelectorAll('.tst-title-card').forEach(function(tile) { tile.dispatchEvent(new MouseEvent('mouseover', { 'bubbles': true })) })
            document.querySelectorAll('.tst-play-button').forEach(function(btn) { btn.addEventListener('click', function() { sdAmzUrl = this.href }) })
          } catch(err) { console.log(err) }
      `)
    } catch(err) { console.log(err) }
  }
}

// Prime observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsAmzUpgrade = null

// Prime dismiss browser upgrade notification
function amzUpgradeDismiss() {
  if (currentStream === 'ap') {
    view.webContents.executeJavaScript(`${amzUpgradeDismissClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsAmzUpgrade = null } catch(err) { console.log(err) }')
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
  } catch(err) { console.log(err) }
}

// Prime upgrade your browser dismiss mutation observer
function amzUpgradeDismissMut() {
  try {
    console.log('upgrade mut')
    obsAmzUpgrade = new MutationObserver(function(ml) {
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
  } catch(err) { console.log(err) }
}

// Prime upgrade your browser dismiss observer invocation
function amzUpgradeDismissObs() {
  try {
    console.log('upgrade obs')
    obsAmzUpgrade.observe(document.querySelector('.webPlayerUIContainer'), { childList: true, subtree: true })
  } catch (err) { console.log(err) }
}

// Prime observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsAmzPreview = null

// Skip/close Prime previews
function amzPreviewSkip() {
  if (amzSkipPreview && currentStream === 'ap') {
    view.webContents.executeJavaScript(`${amzPrevSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsAmzPreview = null } catch(err) { console.log(err) }')
      .then(() => view.webContents.executeJavaScript(`(${amzPreviewSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${amzPreviewSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'ap') {
    view.webContents.executeJavaScript(`(${amzPreviewSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Prime preview skip click
function amzPrevSkipClick() {
  try {
    console.log('prev skip')
    if (document.querySelector('.fu4rd6c') != undefined) {
      document.querySelector('.fu4rd6c').click()
    }
  } catch(err) { console.log(err) }
}

// Prime preview skip mutation observer
function amzPreviewSkipMut() {
  try {
    console.log('prev mut')
    obsAmzPreview = new MutationObserver(function(ml) {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains('fu4rd6c')) {
              amzPrevSkipClick()
            }
          })
        }
      }
    })
  } catch(err) { console.log(err) }
}

// Prime preview skip observer invocation
function amzPreviewSkipObs() {
  try {
    console.log('prev obs')
    obsAmzPreview.observe(document.querySelector('.webPlayerUIContainer'), { childList: true, subtree: true })
  } catch (err) { console.log(err) }
}

// Prime preview skip observer disconnection
function amzPreviewSkipDis() {
  try {
    console.log('prev dis')
    if (typeof obsAmzPreview !== 'undefined') {
      obsAmzPreview.disconnect()
    }
  } catch (err) { console.log(err) }
}

// Prime observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsAmzRecap = null

// Skip/close Prime episode recap & intros
function amzRecapSkip() {
  if (amzSkipRecap && currentStream === 'ap') {
    view.webContents.executeJavaScript(`${amzRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsAmzRecap = null } catch(err) { console.log(err) }')
      .then(() => view.webContents.executeJavaScript(`(${amzRecapSkipMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${amzRecapSkipObs.toString()})()`))
      .catch((err) => { console.error(err) })
  } else if (currentStream === 'ap') {
    view.webContents.executeJavaScript(`(${amzRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
  }
}

// Prime recap skip click
function amzRecapSkipClick() {
  try {
    console.log('recap skip')
    if (document.querySelector('.atvwebplayersdk-skipelement-button') != undefined) {
      document.querySelector('.atvwebplayersdk-skipelement-button').click()
    }
  } catch(err) { console.log(err) }
}

// Prime recap skip mutation observer
function amzRecapSkipMut() {
  try {
    console.log('recap mut')
    obsAmzRecap = new MutationObserver(function(ml) {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains('atvwebplayersdk-skipelement-button')) {
              amzRecapSkipClick()
            }
          })
        }
      }
    })
  } catch(err) { console.log(err) }
}

// Prime recap skip observer invocation
function amzRecapSkipObs() {
  try {
    console.log('recap obs')
    obsAmzRecap.observe(document.querySelector('.webPlayerUIContainer'), { childList: true, subtree: true })
  } catch (err) { console.log(err) }
}

// Prime recap skip observer disconnection
function amzRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsAmzRecap !== 'undefined') {
      obsAmzRecap.disconnect()
    }
  } catch (err) { console.log(err) }
}

//#endregion

//#region Netflix scripts

// Netflix observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsNfSkip = null

// Skip/close Netlfix episode recap & intros
function nfRecapSkip() {
  if (nfSkipRecap && currentStream === 'nf') {
    view.webContents.executeJavaScript(`${nfRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsNfSkip = null } catch(err) { console.log(err) }')
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
    if (document.querySelector('.skip-credits') != undefined) {
      document.querySelector('.skip-credits > a').click()
    }
  } catch(err) { console.log(err) }
}

// Netflix recap skip mutation observer
function nfRecapSkipMut() {
  try {
    console.log('recap mut')
    obsNfSkip = new MutationObserver(function(ml) {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains('skip-credits')) {
              nfEpisodeNextClick()
            }
          })
        }
      }
    })
  } catch(err) { console.log(err) }
}

// Netflix recap skip observer invocation
function nfRecapSkipObs() {
  try {
    console.log('recap obs')
    obsNfSkip.observe(document.querySelector('#appMountPoint'), { childList: true, subtree: true })
  } catch (err) { console.log(err) }
}

// Netflix recap skip observer disconnection
function nfRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsNfSkip !== 'undefined') {
      obsNfSkip.disconnect()
    }
  } catch (err) { console.log('dis ' + err) }
}

// Netflix observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsNfNext = null

// Automatically start next Netlfix episode
function nfEpisodeNext() {
  if (nfNextEpisode && currentStream === 'nf') {
    view.webContents.executeJavaScript(`${nfEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsNfNext = null } catch(err) { console.log(err) }')
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
  } catch(err) { console.log(err) }
}

// Netflix next episode mutation observer
function nfEpisodeNextMut() {
  try {
    console.log('next mut')
    obsNfNext = new MutationObserver(function(ml) {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains('main-hitzone-element-container')) {
              nfEpisodeNextClick()
            }
          })
        }
      }
    })
  } catch(err) { console.log(err) }
}

// Netflix next episode observer invocation
function nfEpisodeNextObs() {
  try {
    console.log('next obs')
    obsNfNext.observe(document.querySelector('#appMountPoint'), { childList: true, subtree: true })
  } catch (err) { console.log(err) }
}

// Netflix next episode observer disconnection
function nfEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsNfNext !== 'undefined') {
      obsNfNext.disconnect()
    }
  } catch (err) { console.log(err) }
}

//#endregion

//#region Hulu scripts

// Hulu observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsHlRecapSkip = null

// Hulu recap & credits script injection
function hlRecapSkip() {
  if (hlSkipRecap && currentStream === 'hl') {
    view.webContents.executeJavaScript(`${hlRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsHlRecapSkip = null } catch(err) { console.log(err) }')
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
  } catch(err) { console.log(err) }
}

// Hulu skip mutation observer
function hlRecapSkipMut() {
  try {
    console.log('skip mut')
    obsHlRecapSkip = new MutationObserver(function() {
      hlRecapSkipClick()
    })
  } catch (err) { console.log(err) }
}

// Hulu skip observer invocation
function hlRecapSkipObs() {
  try {
    console.log('skip obs')
    obsHlRecapSkip.observe(document.querySelector('.SkipButton').parentElement, { attributes: true, attributeFilter: ['style'] })
  } catch (err) { console.log(err) }
}

// Hulu skip observer disconnect
function hlRecapSkipDis() {
  try {
    console.log('skip dis')
    if (typeof obsHlRecapSkip !== 'undefined') {
      obsHlRecapSkip.disconnect()
    }
  } catch (err) { console.log(err) }
}

// Hulu observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsHlNext = null

// Automatically start next Hulu episode
function hlEpisodeNext() {
  if (hlNextEpisode && currentStream === 'hl') {
    view.webContents.executeJavaScript(`${hlEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
    view.webContents.executeJavaScript('try { let obsHlNext = null } catch(err) { console.log(err) }')
      .then(() => view.webContents.executeJavaScript(`(${hlEpisodeNextMut.toString()})()`))
      .then(() => view.webContents.executeJavaScript(`(${hlEpisodeNextObs.toString()})()`))
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
  } catch(err) { console.log(err) }
}

// Hulu next episode mutation observer
function hlEpisodeNextMut() {
  try {
    console.log('next mut')
    obsHlNext = new MutationObserver(function() {
      hlEpisodeNextClick()
    })
  } catch(err) { console.log(err) }
}

// Hulu next episode observer invocation
function hlEpisodeNextObs() {
  try {
    console.log('next obs')
    obsHlNext.observe(document.querySelector('.EndCardButton').closest('.ControlsContainer__transition'), { attributes: true, attributeFilter: ['visibility'] })
  } catch (err) { console.log(err) }
}

// Hulu next episode observer disconnection
function hlEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsHlNext !== 'undefined') {
      obsHlNext.disconnect()
    }
  } catch (err) { console.log(err) }
}

//#endregion

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
  ytAdsSkip()
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