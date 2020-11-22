// TODO: Add system tray icon
// TODO: Right-click toggle minimize/restore and mute (if not pause)
// TODO: Click for service menu
// Imports and variable declarations
const { app, BrowserWindow, ipcMain, BrowserView, session, Menu, MenuItem } = require('electron')
// TODO: Setting: allow update to userAgent
const userAgent = ''
const isMac = process.platform === 'darwin'
// const updater = require('./updater')
let = currentService = ''
let = allowQuit = false

// Enable Electron-Reload (dev only)
// require('electron-reload')(__dirname)

// Main window and view
let win = null
let view = null
const createWindow = () => {
  // Check for updates after 3 seconds
  // setTimeout(updater, 3000)

  // Create main window
  win = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: isMac ? true : false,
    hasShadow: false,
    frame: isMac ? false : true,
    titleBarStyle: isMac ? 'hidden' : 'default',
    fullscreenable: false,
    webPreferences: {
      plugins: true,
      nodeIntegration: true
    }
  })

  // HTML file to load into window
  win.loadFile('main.html')

  // Open DevTools (dev only)
  // win.webContents.openDevTools()

  const headerSize = isMac ? 22 : 0

  view = new BrowserView()
  win.addBrowserView(view)
  setViewBounds()

  // Reset view on resize
  win.on('resize', () => {
    setViewBounds()
  })

  // Turn on fullScreen to use this to allow html driven full screen to go to maximize instead
  // win.on('enter-html-full-screen', function () {
  //   if (win.isFullScreen()) {
  //     setTimeout(function() {
  //       win.setFullScreen(false)
  //       win.maximize()
  //     }, 800)
  //   }
  // })

  // IPC channel for hiding view
  ipcMain.on('view-hide', () => {
    win.removeBrowserView(view)
  })

  // IPC channel for showing view
  ipcMain.on('view-show', () => {
    win.addBrowserView(view)
  })

  // Adjust view bounds to window
  function setViewBounds () {
    wb = win.getBounds()
    view.setBounds({ x: 0, y: headerSize, width: wb.width, height: wb.height - headerSize })
  }
}

// Widvine DRM
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

// CLose app if all windows are closed (can check for Mac)
app.on('window-all-closed', () => {
  // if (!isMac) {
    app.quit()
  // }
})

// When closing set window size and location
app.on('before-quit', (e) => {
  if (!allowQuit) {
    e.preventDefault()
    wb = win.getBounds()
    let data = {
      lastStream: currentService,
      windowSizeLocation: { x: wb.x, y: wb.y, height: wb.height, width: wb.width  }
    }
    win.webContents.send('save-settings', data)
    allowQuit = true
    app.quit()
  }
})

// IPC channel to update window size and location from settings
ipcMain.on('set-window', (e, data) => {
  win.setBounds({ x:data.x, y:data.y, height:data.height, width:data.width })
})

// IPC channel to set fullscreen allow from HTML
ipcMain.on('allow-fullscreen', (e, data) => {
  win.fullScreenable = data
})

// IPC channel to change user agent
ipcMain.on('agent-change', (e, data) => {
  view.userAgent = data
})

// IPC channel to change streaming service
ipcMain.on('service-change', (e, data) => {
  currentService = data.id
  view.webContents.loadURL(data.url)
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

// IPC channel for hiding window
ipcMain.on('win-hide', () => {
  win.hide()
})

// IPC channel for emptying stream menu items
ipcMain.on('reset-menu', () => {
  resetStreamMenu()
})

// IPC channel for adding stream service to menu
ipcMain.on('add-stream', (e, serv) => {
  addStream(serv)
})

// Menu
const template = [
  {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      {
        label: 'Preferences',
        click () { win.webContents.send('load-settings') }
      },
      ...(isMac ? [
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
      ] : [])
    ]
  },
  {
    label: 'Streams',
    submenu: []
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' }
      // TODO: Toggle menu item if full screenable from settings
      // { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      { 
        label: 'Lock On Top',
        click () { win.isAlwaysOnTop() ? win.setAlwaysOnTop(false) : win.setAlwaysOnTop(true, 'floating') }
      },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
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
      }
    ]
  }
]

let menu = Menu.buildFromTemplate(template)

function addStream (serv) {
  const streamMenu = Menu.getApplicationMenu().items[1]
  let menuItem = new MenuItem({ 
    label: serv.title,
    id: serv.id,
    click () {
      view.webContents.loadURL(serv.url)
    }
  })
  streamMenu.submenu.append(menuItem)
  Menu.setApplicationMenu(menu)
}

function resetStreamMenu () {
  menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
