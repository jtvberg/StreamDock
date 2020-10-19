// Imports and variable declarations
const { app, BrowserWindow, ipcMain, BrowserView, session } = require('electron')
const { data } = require('jquery')
// const updater = require('./updater')

// Enable Electron-Reload (dev only)
// require('electron-reload')(__dirname)

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
    webPreferences: {
      plugins: true,
      nodeIntegration: true
    }
  })

  // HTML file to load into window
  win.loadFile('main.html')

  // Set initial state of always on top
  // win.setAlwaysOnTop(true, 'floating')

  // Open DevTools (dev only)
  // win.webContents.openDevTools()

  win.on('resize', function () {
    wb = win.getBounds()
    view.setBounds({ x: 0, y: 25, width: wb.width, height: wb.height - 25 })
  })

  view = new BrowserView()
  win.setBrowserView(view)
  view.setBounds({ x: 0, y: 25, width: 800, height: 575 })
  view.webContents.loadURL('https://www.netflix.com')
  // view.webContents.loadURL('https://tv.youtube.com')
  // view.webContents.loadURL('https://www.hulu.com')
  // view.webContents.loadURL('https://www.amazon.com/gp/video/storefront/')
  // view.webContents.loadURL('https://www.disneyplus.com/home')
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
    case 'nf':
      view.webContents.loadURL('https://www.netflix.com')
      break
    case 'yt':
      view.webContents.loadURL('https://tv.youtube.com', {userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.80 Safari/537.36'})
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
