// Imports and variable declarations
const { app, BrowserWindow, ipcMain, BrowserView, session } = require('electron')
// const updater = require('./updater')

// Enable Electron-Reload (dev only)
require('electron-reload')(__dirname)

// Main window
let win = null
let view = null
const createWindow = () => {
  // Check for updates after 3 seconds
  // setTimeout(updater, 3000)

  // Create main window
  win = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    hasShadow: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      plugins: true,
      nodeIntegration: true
    }
  })

  // HTML file to load into window
  win.loadFile('main.html')

  // Open DevTools (dev only)
  // win.webContents.openDevTools()

  win.on('resize', function () {
    wb = win.getBounds()
    view.setBounds({ x: 0, y: 25, width: wb.width, height: wb.height - 25 })
  })

  view = new BrowserView()
  win.addBrowserView(view)
  view.setBounds({ x: 0, y: 25, width: 800, height: 575 })
}

app.commandLine.appendSwitch('no-verify-widevine-cdm')

let isOffline = false
let widevineDir = app.getPath('userData')

app.on('ready', () => {
  app.verifyWidevineCdm({
    session: session.defaultSession,
    disableUpdate: isOffline,
    baseDir: widevineDir
  })
})

app.on('widevine-ready', (version, lastVersion) => {
  if (null !== lastVersion) {
    console.log('Widevine ' + version + ', upgraded from ' + lastVersion + ', is ready to be used!')
  } else {
    console.log('Widevine ' + version + ' is ready to be used!')
  }
  createWindow()
})

app.on('widevine-update-pending', (currentVersion, pendingVersion) => {
  console.log('Widevine ' + currentVersion + ' is ready to be upgraded to ' + pendingVersion + '!')
})

app.on('widevine-error', (error) => {
  console.log('Widevine installation encountered an error: ' + error)
  process.exit(1)
})

// CLose app if all windows are closed (not Mac)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// IPC channel to change streaming service
ipcMain.on('service-change', (e, data) => {
  switch (data) {
    case 'tv':
      view.webContents.loadURL('https://tv.youtube.com', {userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.80 Safari/537.36'})
      break
    case 'yt':
      view.webContents.loadURL('https://www.youtube.com', {userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.80 Safari/537.36'})
      break
    case 'nf':
      view.webContents.loadURL('https://www.netflix.com')
      break
    case 'hl':
      view.webContents.loadURL('https://www.hulu.com')
      break
    case 'ap':
      view.webContents.loadURL('https://www.amazon.com/gp/video/storefront/')
      break
    case 'dp':
      view.webContents.loadURL('https://www.disneyplus.com/home')
      break
    case 'ep':
      view.webContents.loadURL('https://plus.espn.com')
      break
    case 'pc':
      view.webContents.loadURL('https://www.peacocktv.com/watch/home')
      break
    case 'cb':
      view.webContents.loadURL('https://cbs.com')
      break
    case 'hm':
      view.webContents.loadURL('https://play.hbomax.com/')
      break
    case 'ab':
      view.webContents.loadURL('https://abc.com/')
      break
  }
})

// IPC channel for locking app on top
ipcMain.on('ontop-lock', function () {
  win.setAlwaysOnTop(true, 'floating')
})

// IPC channel for unlocking app on top
ipcMain.on('ontop-unlock', function () {
  win.setAlwaysOnTop(false)
})

// IPC channel for maximizing window
ipcMain.on('win-max', () => {
  win.maximize()
})

// IPC channel for restoring window
ipcMain.on('win-restore', () => {
  win.unmaximize()
})

// IPC channel for maximizing window
ipcMain.on('win-hide', () => {
  win.hide()
})
