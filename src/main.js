// Imports
const { app, BrowserWindow, BrowserView, Tray, Menu, nativeTheme, components, ipcMain, screen, systemPreferences, clipboard } = require('electron')
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

if (isDev) {
  try {
    require('electron-reloader')(module)
  } catch {}
}

app.disableHardwareAcceleration()
Menu.setApplicationMenu(menu)

// Functions
const createWindow = () => {
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

  if (isLinux) {
    mainWin.setIcon(path.join(__dirname, '../public/res/icon.png'))
  }

  mainWin.loadFile(path.join(__dirname, './index.html'))
  
  headerView = new BrowserView({
    webPreferences: { 
      preload: path.join(__dirname, 'preload.js')
    }
  })
  headerView.webContents.loadFile(path.join(__dirname, '../public/index.html'))
  headerView.setAutoResize({ width: true, height: false })

  streamView = new BrowserView()
  streamView.setAutoResize({ width: true, height: true })

  facetView = new BrowserView({
    webPreferences: { 
      preload: path.join(__dirname, 'preload.js')
    }
  })
  facetView.webContents.loadFile(path.join(__dirname, '../public/facets.html'))
  facetView.setAutoResize({ width: false, height: true })

  isMac ? mainWin.setWindowButtonVisibility(false) : null
  mainWin.addBrowserView(streamView)
  mainWin.addBrowserView(facetView)
  mainWin.addBrowserView(headerView)

  streamView.setBounds({
    x: 0,
    y: 0,
    width: mainWin.getBounds().width,
    height: mainWin.getBounds().height
  })

  streamView.webContents.on('did-start-navigation', () => {
    const cleanUrl = validUrl(getCurrentUrl())
    if (cleanUrl) {
      domain = cleanUrl.hostname
      headerView.webContents.executeJavaScript('localStorage.getItem("pref-agent");', true).then(response => {
        streamView.webContents.userAgent = domain === 'accounts.google.com' ? 'Chrome' : response ? response : null || defaultAgent
      })
    }
  })

  streamView.webContents.on('did-finish-load', () => {
    const cleanUrl = validUrl(getCurrentUrl())
    if (cleanUrl) {
      domain = cleanUrl.hostname
    }
    removeScrollbars()
    showStream(true, streamView)
    loadScripts(streamView, domain)
  })

  streamView.webContents.setWindowOpenHandler(({ url }) => {
    const navUrl = validUrl(url) ? new URL(url) : null
    if (navUrl && navUrl.host === googleAuthHost) {
      return { action: 'allow' }
    }
    openUrl(url)
    return { action: 'deny' }
  })

  streamView.webContents.on('media-started-playing', () => {
    isPlaying = true
  })

  streamView.webContents.on('media-paused', () => {
    isPlaying = false
  })

  headerView.webContents.on('did-finish-load', () => {
    headerView.webContents.send('is-mac', isMac)
  })

  mainWin.on('close', () => {
    headerView.webContents.send('win-getloc', mainWin.getBounds())
    headerView.webContents.send('last-stream', getCurrentUrl())
    windows.delete(mainWin)
    windows.forEach(win => win.close())
  })

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

  nativeTheme.on('updated', setTrayTheme)

  windows.add(mainWin)
}

const createTray = () => {
  tray = new Tray(path.join(__dirname, '../public/res/iconTemplate@2x.png'))
  tray.setToolTip('StreamDock')
  setTrayTheme()
  if (isLinux) {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Exit',
        click() { app.quit() }
      }
    ])
    tray.setContextMenu(contextMenu)
  }
  tray.on('click', () => toggleWin())
  tray.on('right-click', () => app.quit())

  const toggleWin = () => {
    let show = false
    windows.forEach(win => show = win.isVisible() ? true : show)
    if (show) {
      hideWin()
    } else {
      windows.forEach(win => win.show())
      headerView.webContents.executeJavaScript('localStorage.getItem("pref-resume");', true).then(response => {
        if (response === 'true' && resumePlaying) {
          playVideo(streamView)
        }
      })
      headerView.webContents.send('hide-header')
    }
  }
}

const setTrayTheme = () => {
  if (!isMac) {
    if (nativeTheme.shouldUseDarkColors) {
      tray.setImage(path.join(__dirname, '../public/res/icon_tray_white_32.png'))
    } else {
      tray.setImage(path.join(__dirname, '../public/res/iconTemplate@2x.png'))
    }
  }
}

const hideWin = () => {
  resumePlaying = isPlaying
  pauseVideo(streamView)
  windows.forEach(win => {
    pauseVideo(win)
    win.hide()
  })
}

const loadScripts = (bv = streamView, host) => {
  headerView.webContents.executeJavaScript('({...localStorage});', true).then(response => {
    facetView.webContents.send('is-netflix', false)
    switch(host) {
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
        response['service-rs'] === 'true' ? hlRecapSkip(bv) : hlRecapSkipRem(bv)
        response['service-bm'] === 'true' ? hlEpisodeNext(bv) : hlEpisodeNextRem(bv)
        break
      case 'www.disneyplus.com':
        response['service-rs'] === 'true' ? setTimeout(dpRecapSkip, 3000, bv) : dpRecapSkipRem(bv)
        response['service-bm'] === 'true' ? setTimeout(dpEpisodeNext, 3000, bv) : dpEpisodeNextRem(bv)
        break
      case 'play.hbomax.com':
        response['service-rs'] === 'true' ? hmRecapSkip(bv) : hmRecapSkipRem(bv)
        response['service-bm'] === 'true' ? hmEpisodeNext(bv) : hmEpisodeNextRem(bv)
        break
      case 'www.paramountplus.com':
        response['service-rs'] === 'true' ? cbRecapSkip(bv) : cbRecapSkipRem(bv)
        response['service-bm'] === 'true' ? cbEpisodeNext(bv) : cbEpisodeNextRem(bv)
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

const setHeaderViewBounds = height => headerView.setBounds({ x: 0, y: 0, width: mainWin.getBounds().width, height})

const setFacetViewBounds = width => facetView.setBounds({ x: 0, y: 0, width, height: mainWin.getBounds().height})

const openUrl = url => {
  streamView.webContents.loadURL(url)
  showStream(false)
  headerView.webContents.send('stream-opened')
}

const showStream = bool => {
  if (bool) {
    const wb = mainWin.getBounds()
    streamView.setBounds({ x: 0, y: 0, width: wb.width, height: wb.height })
  } else {
    streamView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  }
}

const validUrl = url => {
  let valid
  try {
    valid = new URL(url)
  } catch (err) {
    console.log('invalid URL: ' + url)
    return false
  }
  return valid
}

const setAccent = () => {
  headerView.webContents.send('set-accent', `#${systemPreferences.getAccentColor()}`)
  facetView.webContents.send('set-accent', `#${systemPreferences.getAccentColor()}`)
}

const navBack = () => streamView.webContents.canGoBack() ? streamView.webContents.goBack() : null

const pauseVideo = bv => bv.webContents.executeJavaScript(`(${defaultPause.toString()})()`)

const defaultPause = () => {
  try {
    document.querySelectorAll('video').forEach(input => { input.pause() })
  } catch (err) { console.error(err) }
}

const playVideo = bv => bv.webContents.executeJavaScript(`(${defaultPlay.toString()})()`)

const defaultPlay = () => {
  try {
    document.querySelectorAll('video').forEach(input => { input.play() })
  } catch (err) { console.error(err) }
}

const setFullScreen = (bool) => {
  if (isMac) { mainWin.setFullScreen(false) }
  setTimeout(() => {
    mainWin.setFullScreenable(bool)
  }, 500)
}

const scaleHeight = (width, height) => {
  const ws = mainWin.getSize()
  mainWin.setAspectRatio(0)
  mainWin.setSize(ws[0], Math.round(ws[0] * (height / width)))
  if (ratioLocked) { lockRatio() }
}

const scaleWidth = (width, height) => {
  const ws = mainWin.getSize()
  mainWin.setAspectRatio(0)
  mainWin.setSize(Math.round(ws[1] * (width / height)), ws[1])
  if (ratioLocked) { lockRatio() }
}

const lockRatio = () => {
  const ws = mainWin.getSize()
  mainWin.setAspectRatio(ws[0] / ws[1])
  ratioLocked = true
}

const unlockRatio = () => {
  mainWin.setAspectRatio(0)
  ratioLocked = false
}

const removeScrollbars = () => streamView.webContents.executeJavaScript(`document.body.insertAdjacentHTML('beforeend', '<style> ::-webkit-scrollbar { display: none; } </style>')`)

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
    loadScripts(child, validUrl(getCurrentUrl(child)).hostname)
  })
  child.on('closed', () => {
    windows.delete(child)
    child.destroy()
  })
}

const getCurrentUrl = (bv = streamView) => {
  return bv.webContents.getURL()
  // amzGetUrl()
}

const createBookmark = async () => {
  const image = await streamView.webContents.capturePage()
  const bookmarkObj = {
    title: streamView.webContents.getTitle(),
    img: image.resize({ height: 180 }).toDataURL(),
    url: getCurrentUrl(),
    timestamp: Date.now()
  }
  headerView.webContents.send('send-bookmark', bookmarkObj)
}

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
      const image = await ghostWin.webContents.capturePage()
      const bookmarkObj = {
        title: ghostWin.webContents.getTitle(),
        img: image.resize({ height: 180 }).toDataURL(),
        url: ghostWin.webContents.getURL(),
        timestamp: Date.now()
      }
      headerView.webContents.send('send-bookmark', bookmarkObj)
      ghostWin.destroy()
    })
  }
}

const clearAppData = async relaunch => {
  await headerView.webContents.session.clearStorageData().catch(err => console.log(err))
  if (relaunch) { 
    app.relaunch()
  } 
  app.exit()
}

// App events
app.whenReady().then(async () => {
  await components.whenReady()
  createWindow()
  createTray()
  app.focus({ steal: true })
  if (isDev) {
    // mainWin.webContents.openDevTools({ mode: 'detach' })
    headerView.webContents.openDevTools({ mode: 'detach' })
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

ipcMain.on('create-bookmark', createBookmark)

ipcMain.on('nav-back', navBack)

ipcMain.on('url-to-bookmark', (e, url) => urlToBookmark(url))

ipcMain.on('default-agent', (e, agent) => defaultAgent = agent)

ipcMain.on('open-link', () => openUrl(clipboard.readText()))

ipcMain.on('open-newin', () => openNewin(getCurrentUrl()))

ipcMain.on('open-devtools', () => {
  streamView.webContents.openDevTools({ mode: 'detach' })
  headerView.webContents.openDevTools({ mode: 'detach' })
})

ipcMain.on('update-header-height', (e, { height, base }) => {
  if (!mainWin) return
  if (height) {
    isMac ? height > base ? mainWin.setWindowButtonVisibility(true) : mainWin.setWindowButtonVisibility(mainWin.isFullScreen()) : null
    headerView.setAutoResize({ width: true, height: false })
    setHeaderViewBounds(height)
  } else {
    setHeaderViewBounds(mainWin.getBounds().height)
    headerView.setAutoResize({ width: true, height: true })
  }
})

ipcMain.on('update-facets-width', (e, width) => {
  setFacetViewBounds(width)
})
