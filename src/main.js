// Imports
const { app, BrowserWindow, WebContentsView, Tray, Menu, nativeTheme, components, ipcMain, screen, systemPreferences, clipboard } = require('electron')
const { version, productName, author, repository, bugs } = require('../package.json');
const path = require('path')
const menu = require('./util/menu')
const { ytAdsSkip, ytAdSkipRem } = require('./scripts/youtube')
const { amzGetUrl,
  amzUpgradeDismiss,
  amzPreviewSkip,
  amzPrevewSkipRem,
  amzRecapSkip,
  amzRecapSkipRem,
  amzEpisodeNext,
  amzEpisodeNextRem } = require('./scripts/prime')
const { atRecapSkip,
  atRecapSkipRem,
  atEpisodeNext,
  atEpisodeNextRem } = require('./scripts/appletv')
const { dpRecapSkip,
  dpRecapSkipRem,
  dpEpisodeNext,
  dpEpisodeNextRem } = require('./scripts/disney')
const { hmRecapSkip,
  hmRecapSkipRem,
  hmEpisodeNext,
  hmEpisodeNextRem } = require('./scripts/hbo')
const { hlRecapSkip,
  hlRecapSkipRem,
  hlEpisodeNext,
  hlEpisodeNextRem } = require('./scripts/hulu')
const { nfRecapSkip,
  nfRecapSkipRem,
  nfEpisodeNext,
  nfEpisodeNextRem } = require('./scripts/netflix')
const { cbRecapSkip,
  cbRecapSkipRem,
  cbEpisodeNext,
  cbEpisodeNextRem } = require('./scripts/paramount')
const { pcRecapSkip,
  pcRecapSkipRem,
  pcEpisodeNext,
  pcEpisodeNextRem } = require('./scripts/peacock')

// Constants
const isDev = !app.isPackaged
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'
const isWindows = process.platform === 'win32'
const windows = new Set()
const headerCollapsed = 31
const headerBase = 12
const googleAuthHost = 'accounts.google.com'
const appInfo = {
  name: productName,
  version,
  author: author.name,
  email: author.email,
  repository,
  bugs: bugs.url
}

// Vars
let mainWin = null
let tray = null
let headerView = null
let streamView = null
let facetView = null
let domain = null
let defaultAgent = null
let ratioLocked = false
let isPlaying = false
let resumePlaying = false

// load reload module in dev
if (isDev) {
  try {
    require('electron-reloader')(module)
  } catch { }
}

// disable hardware acceleration
app.disableHardwareAcceleration()

// set menu
Menu.setApplicationMenu(menu)

// Functions
// create main window and views
const createWindow = () => {
  // create main window
  mainWin = new BrowserWindow({
    width: 1024,
    height: 576,
    minWidth: 672,
    minHeight: 378,
    transparent: true,
    frame: false,
    trafficLightPosition: {
      x: 6,
      y: 5
    }
  })

  // if linux, set icon
  if (isLinux) {
    mainWin.setIcon(path.join(__dirname, '../public/res/icon.png'))
  }

  // load main window
  mainWin.loadFile(path.join(__dirname, './index.html'))

  // create browser view for header
  headerView = new WebContentsView({
    webPreferences: {
      transparent: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  headerView.webContents.loadFile(path.join(__dirname, '../public/index.html'))

  // create browser view for streams
  streamView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  })

  // create browser view for facets
  facetView = new WebContentsView({
    webPreferences: {
      transparent: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  facetView.webContents.loadFile(path.join(__dirname, '../public/facets.html'))

  // if mac, hide window buttons
  isMac ? mainWin.setWindowButtonVisibility(false) : null

  // add views to main window
  mainWin.contentView.addChildView(streamView)
  mainWin.contentView.addChildView(facetView)
  mainWin.contentView.addChildView(headerView)

  // TODO: fix 31
  mainWin.on('resize', () => {
    const wb = mainWin.getBounds()
    const hb = headerView.getBounds()
    streamView.setBounds({ x: 0, y: 0, width: wb.width, height: wb.height })
    facetView.setBounds({ x: 0, y: 0, width: facetView.getBounds().width, height: wb.height + 2 })
    setHeaderViewBounds(hb.height > headerCollapsed ? wb.height : hb.height)
  })

  // on steam view navigation check if url is valid and set userAgent
  streamView.webContents.on('did-start-navigation', () => {
    const cleanUrl = validUrl(getCurrentUrl())
    if (cleanUrl) {
      domain = cleanUrl.hostname
      headerView.webContents.executeJavaScript('localStorage.getItem("pref-agent");', true).then(response => {
        console.log(`User Agent Pref: ${response}`)
        if (response === null || response === '') { return }
        streamView.webContents.userAgent = domain === googleAuthHost ? 'Chrome' : response
      })
    }
  })

  // on stream view load get url, remove scrollbars, show stream, load scripts
  streamView.webContents.on('did-finish-load', () => {
    const cleanUrl = validUrl(getCurrentUrl())
    if (cleanUrl) {
      domain = cleanUrl.hostname
    }
    removeScrollbars(streamView)
    showStream(true, streamView)
    loadScripts(streamView, domain)
  })

  // check if call for new window matches google auth host and if so, allow otherwise deny
  streamView.webContents.setWindowOpenHandler(({ url }) => {
    const navUrl = validUrl(url) ? new URL(url) : null
    if (navUrl?.host === googleAuthHost) {
      return { action: 'allow' }
    }
    openUrl(url)
    return { action: 'deny' }
  })

  // set is playing variable on media play
  streamView.webContents.on('media-started-playing', () => {
    isPlaying = true
  })

  // set is playing variable on media pause
  streamView.webContents.on('media-paused', () => {
    isPlaying = false
  })

  // on header view load send is mac to renderer
  headerView.webContents.on('did-finish-load', () => {
    headerView.webContents.send('is-mac', isMac)
  })
  // 
  // on closing of main window, send window location to renderer and close all windows
  mainWin.on('close', () => {
    headerView.webContents.send('win-getloc', mainWin.getBounds())
    headerView.webContents.send('last-stream', getCurrentUrl())
    windows.delete(mainWin)
    windows.forEach(win => win.close())
  })

  // on main window ready set OS specific settings and send app info to renderer
  mainWin.on('ready-to-show', () => {
    headerView.webContents.send('app-info', appInfo)
    if (!isLinux) {
      setAccent()
    }
    if (isMac) {
      systemPreferences.subscribeNotification('AppleColorPreferencesChangedNotification', () => {
        setAccent()
      })
    }
    if (isWindows) {
      systemPreferences.on('accent-color-changed', () => {
        setAccent()
      })
    }
  })

  // subscribe to system theme changes and apply to tray icon
  nativeTheme.on('updated', setTrayTheme)

  // add main window to windows set
  windows.add(mainWin)
}

// create tray icon
const createTray = () => {
  tray = new Tray(path.join(__dirname, '../public/res/iconTemplate@2x.png'))
  tray.setToolTip('StreamDock')
  setTrayTheme()

  // if linux, set tray context menu
  if (isLinux) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Exit',
        click() { app.quit() }
      }
    ])
    tray.setContextMenu(contextMenu)
  }

  tray.on('click', () => toggleWin())
  tray.on('right-click', () => app.quit())

  // toggle window visibility on tray icon click
  const toggleWin = () => {
    let show = false
    windows.forEach(win => show = win.isVisible() ? true : show)
    show ? hideWin() : showWin()
  }
}

// set tray icon based on system theme and OS
const setTrayTheme = () => {
  if (!isMac) {
    if (nativeTheme.shouldUseDarkColors) {
      tray.setImage(path.join(__dirname, '../public/res/icon_tray_white_32.png'))
    } else {
      tray.setImage(path.join(__dirname, '../public/res/iconTemplate@2x.png'))
    }
  }
}

// hide windows and pause video
const hideWin = () => {
  resumePlaying = isPlaying
  pauseVideo(streamView)
  windows.forEach(win => {
    pauseVideo(win)
    win.hide()
  })
}

// show windows and resume video (if enabled)
const showWin = () => {
  windows.forEach(win => win.show())
  headerView.webContents.executeJavaScript('localStorage.getItem("pref-resume");', true).then(response => {
    if (response === 'true' && resumePlaying) {
      playVideo(streamView)
    }
  })
  headerView.webContents.send('hide-header')
}

// inject scripts into view based on host
const loadScripts = (bv = streamView, host) => {
  headerView.webContents.executeJavaScript('({...localStorage});', true).then(response => {
    facetView.webContents.send('is-netflix', false)
    sendLogData(`Using Hostname: ${host}`)
    switch (host) {
      case 'www.youtube.com':
        response['service-ad'] === 'true' ? ytAdsSkip(bv) : ytAdSkipRem(bv)
        break
      case 'www.netflix.com':
        response['service-rs'] === 'true' ? nfRecapSkip(bv) : nfRecapSkipRem(bv)
        response['service-bm'] === 'true' ? nfEpisodeNext(bv) : nfEpisodeNextRem(bv)
        if (bv === streamView) {
          facetView.webContents.send('is-netflix', true)
        }
        break
      case 'www.hulu.com':
        response['service-rs'] === 'true' ? setTimeout(hlRecapSkip, 3000, bv) : hlRecapSkipRem(bv)
        response['service-rs'] === 'true' ? setTimeout(hlEpisodeNext, 3000, bv) : hlEpisodeNextRem(bv)
        break
      case 'www.disneyplus.com':
        response['service-rs'] === 'true' ? setTimeout(dpRecapSkip, 3000, bv) : dpRecapSkipRem(bv)
        response['service-bm'] === 'true' ? setTimeout(dpEpisodeNext, 3000, bv) : dpEpisodeNextRem(bv)
        break
      case 'play.max.com':
        response['service-rs'] === 'true' ? setTimeout(hmRecapSkip, 3000, bv) : hmRecapSkipRem(bv)
        response['service-bm'] === 'true' ? setTimeout(hmEpisodeNext, 3000, bv) : hmEpisodeNextRem(bv)
        break
      case 'www.paramountplus.com':
        response['service-rs'] === 'true' ? cbRecapSkip(bv) : cbRecapSkipRem(bv)
        response['service-bm'] === 'true' ? setTimeout(cbEpisodeNext, 3000, bv) : cbEpisodeNextRem(bv)
        break
      case 'www.peacocktv.com':
        response['service-rs'] === 'true' ? setTimeout(pcRecapSkip, 3000, bv) : pcRecapSkipRem(bv)
        response['service-bm'] === 'true' ? setTimeout(pcEpisodeNext, 3000, bv) : pcEpisodeNextRem(bv)
        break
      case 'tv.apple.com':
        response['service-rs'] === 'true' ? setTimeout(atRecapSkip, 3000, bv) : atRecapSkipRem(bv)
        response['service-bm'] === 'true' ? setTimeout(atEpisodeNext, 3000, bv) : atEpisodeNextRem(bv)
        break
      case 'www.amazon.com':
        setTimeout(amzUpgradeDismiss, 3000, bv)
        response['service-ps'] === 'true' ? setTimeout(amzPreviewSkip, 3000, bv) : amzPrevewSkipRem(bv)
        response['service-rs'] === 'true' ? setTimeout(amzRecapSkip, 3000, bv) : amzRecapSkipRem(bv)
        response['service-bm'] === 'true' ? setTimeout(amzEpisodeNext, 3000, bv) : amzEpisodeNextRem(bv)
        break
      default:
        break
    }
  })
}

// set headerView bounds to match mainWin with supplied height
const setHeaderViewBounds = height => headerView.setBounds({ x: 0, y: 0, width: mainWin.getBounds().width, height })

// set facetView bounds to match mainWin with supplied width
const setFacetViewBounds = width => facetView.setBounds({ x: 0, y: 0, width, height: mainWin.getBounds().height + 2 })

// open url in streamView and send stream opened message to renderer
const openUrl = url => {
  sendLogData(`Open URL: ${url}`)
  streamView.webContents.loadURL(url)
  showStream(false)
  headerView.webContents.send('stream-opened')
}

// toggle streamView visibility
const showStream = bool => {
  if (bool) {
    const wb = mainWin.getBounds()
    streamView.setBounds({ x: 0, y: 0, width: wb.width, height: wb.height })
  } else {
    streamView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  }
}

// check if url is valid return url if valid or false if invalid
const validUrl = url => {
  let valid
  try {
    valid = new URL(url)
  } catch (err) {
    sendLogData(`Invalid URL: ${url}`)
    return false
  }
  return valid
}

// get system preference for accent color and send to renderers
const setAccent = () => {
  headerView.webContents.send('set-accent', `#${systemPreferences.getAccentColor()}`)
  facetView.webContents.send('set-accent', `#${systemPreferences.getAccentColor()}`)
}

// navigate back in view if possible
const navBack = () => streamView.webContents.navigationHistory.canGoBack() ? streamView.webContents.navigationHistory.goBack() : null

// inject pause video function into view
const pauseVideo = bv => bv.webContents.executeJavaScript(`(${defaultPause.toString()})()`)

// default pause video function
const defaultPause = () => {
  try {
    document.querySelectorAll('video').forEach(input => { input.pause() })
  } catch (err) { console.error(err) }
}

// inject play video function into view
const playVideo = bv => bv.webContents.executeJavaScript(`(${defaultPlay.toString()})()`)

// default play video function
const defaultPlay = () => {
  try {
    document.querySelectorAll('video').forEach(input => { input.play() })
  } catch (err) { console.error(err) }
}

// set window fullscreenable
const setFullScreen = (bool) => {
  if (isMac) { mainWin.setFullScreen(false) }
  setTimeout(() => {
    mainWin.setFullScreenable(bool)
  }, 500)
}

// scale window height to width ratio
const scaleHeight = (width, height) => {
  const ws = mainWin.getSize()
  mainWin.setAspectRatio(0)
  mainWin.setSize(ws[0], Math.round(ws[0] * (height / width)))
  if (ratioLocked) { lockRatio() }
}

// scale window width to height ratio
const scaleWidth = (width, height) => {
  const ws = mainWin.getSize()
  mainWin.setAspectRatio(0)
  mainWin.setSize(Math.round(ws[1] * (width / height)), ws[1])
  if (ratioLocked) { lockRatio() }
}

// lock aspect ratio
const lockRatio = () => {
  const ws = mainWin.getSize()
  mainWin.setAspectRatio(ws[0] / ws[1])
  ratioLocked = true
}

// unlock aspect ratio
const unlockRatio = () => {
  mainWin.setAspectRatio(0)
  ratioLocked = false
}

// remove scrollbars from view
const removeScrollbars = bv => bv.webContents.executeJavaScript(`document.body.insertAdjacentHTML('beforeend', '<style> ::-webkit-scrollbar { display: none; } </style>')`)

// open child window with url
const openNewin = url => {
  const wb = mainWin.getBounds()
  const ch = 600
  const cw = Math.round(ch * (wb.width / wb.height))
  let child = new BrowserWindow({
    height: ch,
    width: cw,
    minWidth: 672,
    minHeight: 378,
    transparent: true,
    fullscreenable: false,
    frame: false,
    titleBarStyle: isMac ? 'customButtonsOnHover' : 'hidden'
  })
  if (isLinux) {
    child.setIcon(path.join(__dirname, '../public/res/icon.png'))
  }
  child.loadURL(url)
  child.once('ready-to-show', () => {
    windows.add(child)
    child.show()
  })
  child.webContents.on('did-finish-load', () => {
    child.webContents.executeJavaScript(`document.body.insertAdjacentHTML('beforeend', '<div class="sd-frameless-header"></div><style> .sd-frameless-header { position: fixed; top: 0; left: 0; width: calc(100% - 25px); height: 15px; opacity: 0; z-index: 99999; cursor: -webkit-grab; cursor: grab; -webkit-user-drag: none; -webkit-app-region: drag; } ::-webkit-scrollbar { display: none; } </style>')`)
    if (!isMac) {
      child.webContents.executeJavaScript(`document.body.insertAdjacentHTML('beforeend', '<div class="sd-frameless-close" onclick="window.close();">&times;</div><style> .sd-frameless-close { position: fixed; top: 4px; right: 4px; display: flex; height: 27px; align-items: center; justify-content: center; font-family: sans-serif; font-size: 36px; color: #dbdbdb; background-color: #0f0f0f; border-radius: 50%; z-index: 999999; opacity: 0; aspect-ratio: 1 / 1; user-select: none;} .sd-frameless-close:hover { opacity: 1 } </style>')`)
    }
    // isDev && child.webContents.openDevTools('detach')
    removeScrollbars(child)
    loadScripts(child, validUrl(getCurrentUrl(child)).hostname)
  })
  child.on('closed', () => {
    windows.delete(child)
    child.destroy()
  })
}

// get current url from view parameter or streamView
const getCurrentUrl = (bv = streamView) => {
  return bv.webContents.getURL()
  // amzGetUrl()
}

// create and send bookmark object to renderer from streamView
const createBookmark = async bv => {
  const image = await bv.webContents.capturePage()
  const bookmarkObj = {
    title: bv.webContents.getTitle(),
    img: image.resize({ height: 180 }).toDataURL(),
    url: getCurrentUrl(bv),
    timestamp: Date.now()
  }
  headerView.webContents.send('send-bookmark', bookmarkObj)
}

// open url in hidden window and create and send bookmark object to renderer
const urlToBookmark = url => {
  if (validUrl(url)) {
    let ghostWin = new BrowserWindow({
      width: 960,
      height: 540,
      frame: false,
      show: false
    })
    ghostWin.loadURL(url)
    ghostWin.webContents.audioMuted = true
    ghostWin.webContents.on('did-finish-load', async () => {
      await createBookmark(ghostWin)
      ghostWin.destroy()
    })
  }
}

// clear app data and relaunch if bool is true
const clearAppData = async relaunch => {
  await headerView.webContents.session.clearStorageData().catch(err => sendLogData(`Clear Data Error: ${err}`))
  if (relaunch) {
    app.relaunch()
  }
  app.exit()
}

// send log data to renderer
const sendLogData = log => {
  headerView.webContents.send('log-data', log)
}

async function performTrustedClick(webContents, selector) {
  if (!webContents || webContents.isDestroyed()) {
    console.log(`performTrustedClick: webContents for ${selector} is not available or destroyed.`);
    return false;
  }
  console.log(`Attempting trusted click for selector: ${selector}`);
  try {
    const rect = await webContents.executeJavaScript(`
      (() => {
        const el = document.querySelector('${selector}');
        // Check if element exists, is part of the layout (offsetParent), and has dimensions
        if (el && el.offsetParent !== null && typeof el.getBoundingClientRect === 'function') {
          const bounds = el.getBoundingClientRect();
          if (bounds.width > 0 && bounds.height > 0) { // Basic visibility check
            return {
              x: Math.round(bounds.left + bounds.width / 2),
              y: Math.round(bounds.top + bounds.height / 2),
              found: true
            };
          }
        }
        return { found: false };
      })();
    `);

    if (rect && rect.found) {
      console.log(`Element ${selector} found at x: ${rect.x}, y: ${rect.y}. Sending input events.`);
      await webContents.sendInputEvent({ type: 'mouseDown', button: 'left', x: rect.x, y: rect.y, clickCount: 1 });
      await new Promise(resolve => setTimeout(resolve, 30)); // Small delay for reliability
      await webContents.sendInputEvent({ type: 'mouseUp', button: 'left', x: rect.x, y: rect.y, clickCount: 1 });
      console.log(`Trusted click sequence sent to: ${selector}`);
      return true;
    } else {
      console.log(`Element ${selector} not found or not visible for trusted click.`);
      return false;
    }
  } catch (error) {
    console.error(`Error performing trusted click for ${selector}:`, error.message);
    return false;
  }
}

// App events
app.whenReady().then(async () => {
  await components.whenReady()
  createWindow()
  createTray()
  app.focus({ steal: true })
  if (isDev) {
    // mainWin.webContents.openDevTools({ mode: 'detach' })
    // headerView.webContents.openDevTools({ mode: 'detach' })
    // streamView.webContents.openDevTools({ mode: 'detach' })
    // facetView.webContents.openDevTools({ mode: 'detach' })
  } else {
    const updater = require('./util/updater')
    setTimeout(updater, 3000)
  }
})

app.on('window-all-closed', async () => app.quit())

// IPC channels
ipcMain.on('clear-data', (e, bool) => clearAppData(bool))

ipcMain.on('win-hide', hideWin)

ipcMain.on('win-focus', () => app.focus({ steal: true }))

ipcMain.on('win-setloc', (e, bounds) => mainWin.setBounds(bounds))

ipcMain.on('win-lock', (e, bool) => mainWin.setAlwaysOnTop(bool, 'floating'))

ipcMain.on('win-ratio', (e, bool) => bool ? lockRatio() : unlockRatio())

ipcMain.on('win-scale-height', (e, { x, y }) => scaleHeight(x, y))

ipcMain.on('win-scale-width', (e, { x, y }) => scaleWidth(x, y))

ipcMain.on('win-max', () => mainWin.isMaximized() ? mainWin.unmaximize() : mainWin.maximize())

ipcMain.on('win-min', () => mainWin.minimize())

ipcMain.on('win-close', () => mainWin.close())

ipcMain.on('win-fullscreen', (e, bool) => setFullScreen(bool))

ipcMain.on('win-move', (e, { mouseX, mouseY }) => {
  if (!mainWin.isMaximized()) {
    const { x, y } = screen.getCursorScreenPoint()
    mainWin.setPosition(x - mouseX, y - (mouseY))
  } else {
    headerView.webContents.send('win-stopdrag')
    mainWin.unmaximize()
  }
})

ipcMain.on('open-url', (e, url) => openUrl(url))

ipcMain.on('create-bookmark', () => createBookmark(streamView))

ipcMain.on('nav-back', navBack)

ipcMain.on('url-to-bookmark', (e, url) => urlToBookmark(url))

ipcMain.on('default-agent', (e, agent) => defaultAgent = agent)

ipcMain.on('open-link', () => openUrl(clipboard.readText()))

ipcMain.on('open-newin', () => openNewin(getCurrentUrl()))

ipcMain.on('open-devtools', () => {
  streamView.webContents.openDevTools({ mode: 'detach' })
  headerView.webContents.openDevTools({ mode: 'detach' })
})

ipcMain.on('update-header-height', (e, height) => {
  if (!mainWin) return
  if (height) {
    isMac ? height > headerBase ? mainWin.setWindowButtonVisibility(true) : mainWin.setWindowButtonVisibility(mainWin.isFullScreen()) : null
    setHeaderViewBounds(height)
  } else {
    setHeaderViewBounds(mainWin.getBounds().height)
  }
})

ipcMain.on('update-facets-width', (e, width) => {
  setFacetViewBounds(width)
})

ipcMain.handle('set-header-height', async (e) => {
  return { height: headerCollapsed, base: headerBase }
})

ipcMain.on('request-trusted-click', async (event, selector) => {
  const webContents = event.sender;
  await performTrustedClick(webContents, selector);
});