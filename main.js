// Imports and variable declarations
const { app, BrowserWindow, ipcMain, BrowserView, session } = require('electron')
const updater = require('./updater')

// Enable Electron-Reload (dev only)
// require('electron-reload')(__dirname)

// Main window
let win = null
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
    // userAgent: 'Chrome',
    webPreferences: {
      plugins: true,
      nodeIntegration: false
    }
  })

  // HTML file to load into window
  win.loadFile('main.html')

  // Show window when ready
  // win.once('ready-to-show', () => {
  //   win.show()
  // })

  // Set initial state of always on top
  // win.setAlwaysOnTop(true, 'floating')

  // Open DevTools (dev only)
  // win.webContents.openDevTools()

  const view = new BrowserView()
  win.setBrowserView(view)
  view.setBounds({ x: 0, y: 0, width: 800, height: 600 })
  view.setAutoResize({ width: true, height: true })
  view.webContents.loadURL('https://www.netflix.com')
  // view.webContents.loadURL('https://www.hulu.com', {userAgent: 'Chrome'})
  // view.webContents.loadURL('https://www.amazon.com/gp/video/storefront/', {userAgent: 'Chrome'})
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

// // IPC channel for locking app on top
// ipcMain.on('ontop-lock', function () {
//   win.setAlwaysOnTop(true, 'floating')
// })

// // IPC channel for unlocking app on top
// ipcMain.on('ontop-unlock', function () {
//   win.setAlwaysOnTop(false)
// })

// // IPC channel for maximizing window
// ipcMain.on('win-max', () => {
//   win.maximize()
// })

// // IPC channel for restoring window
// ipcMain.on('win-restore', () => {
//   win.unmaximize()
// })

// // IPC channel for maximizing window
// ipcMain.on('win-hide', () => {
//   win.hide()
// })
