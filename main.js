// Imports and variable declarations
const { app, BrowserWindow, ipcMain, BrowserView, Tray, session, Menu, MenuItem, systemPreferences } = require('electron')
const path = require('path')
const isMac = process.platform === 'darwin'
const updater = require('./updater')
const headerSize = isMac ? 22 : 0
const windowAdjust = isMac ? 22 : 57
let wb = { x: 0, y: 0, height: 0, width: 0 }
let allowQuit = false

systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true)
systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true)

// Enable Electron-Reload (dev only)
// require('electron-reload')(__dirname)

// Main window and view
let win = null
let view = null
let tray = null

// Create window
const createWindow = () => {
  // Check for updates after 3 seconds
  setTimeout(updater, 3000)

  // Create main window
  win = new BrowserWindow({
    height: 600,
    width: 800,
    minHeight: 280,
    minWidth: 580,
    transparent: !!isMac,
    hasShadow: false,
    frame: !isMac,
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

  // Create main browserView
  view = new BrowserView()

  // Show browserView when loaded
  view.webContents.on('did-finish-load', () => {
    addView()
  })

  // Reset view on resize
  win.on('resize', () => {
    setViewBounds()
  })

  // Capture window location on move
  win.on('move', () => {
    wb = win.getBounds()
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

  // Kill view on dev tools open
  win.webContents.on('devtools-opened', () => {
    removeView()
  })

  // Restpre view on dev tools close
  win.webContents.on('devtools-closed', () => {
    addView()
  })

  // IPC channel for hiding view
  ipcMain.on('view-hide', () => {
    removeView()
  })

  // IPC channel for showing view
  ipcMain.on('view-show', () => {
    addView()
  })
}

// Create tray
const createTray = () => {
  tray = new Tray(path.join(__dirname, '/res/logo/icon.png'))
  tray.setToolTip('StreamDock')
  tray.on('click', () => {
    win.isVisible() ? win.hide() : win.show()
  })
  tray.on('right-click', () => {
    app.quit()
  })
}

// Remove view from window
function removeView () {
  if (win.getBrowserView()) {
    win.removeBrowserView(view)
  }
}

// Add view to window
function addView () {
  win.addBrowserView(view)
  setViewBounds()
}

// Adjust view bounds to window
function setViewBounds () {
  wb = win.getBounds()
  view.setBounds({ x: 0, y: headerSize, width: wb.width, height: wb.height - windowAdjust })
}

// Change stream service
function streamChange (url) {
  removeView()
  view.webContents.loadURL(url)
}

// Widvine DRM
app.commandLine.appendSwitch('no-verify-widevine-cdm')
const isOffline = false
const widevineDir = app.getPath('userData')

app.on('ready', () => {
  app.verifyWidevineCdm({
    session: session.defaultSession,
    disableUpdate: isOffline,
    baseDir: widevineDir
  })
})

app.on('widevine-ready', (version, lastVersion) => {
  if (lastVersion !== null) {
    console.log('Widevine ' + version + ', upgraded from ' + lastVersion + ', is ready to be used!')
  } else {
    console.log('Widevine ' + version + ' is ready to be used!')
  }
  createWindow()
  createTray()
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
  app.quit()
})

// When closing set window size and location
app.on('before-quit', (e) => {
  if (!allowQuit) {
    e.preventDefault()
    const data = {
      windowSizeLocation: { x: wb.x, y: wb.y, height: wb.height, width: wb.width }
    }
    win.webContents.send('save-settings', data)
    allowQuit = true
    app.quit()
  }
})

// IPC channel to update window size and location from settings
ipcMain.on('set-window', (e, data) => {
  win.setBounds({ x: data.x, y: data.y, height: data.height, width: data.width })
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
  streamChange(data.url)
})

// IPC channel for locking app on top
ipcMain.on('ontop-lock', () => {
  win.setAlwaysOnTop(true, 'floating')
})

// IPC channel for unlocking app on top
ipcMain.on('ontop-unlock', () => {
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

// Menu template
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
      ] : [
        { type: 'separator' },
        { role: 'quit' }])
    ]
  },
  {
    label: 'Streams',
    submenu: []
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
      ] : [
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
    ]
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

// Menu add stream service to menu
function addStream (serv) {
  const streamMenu = Menu.getApplicationMenu().items[1]
  const menuItem = new MenuItem({
    label: serv.title,
    id: serv.id,
    click () {
      streamChange(serv.url)
    }
  })
  streamMenu.submenu.append(menuItem)
  Menu.setApplicationMenu(menu)
}

// Menu rebuild and set
function resetStreamMenu () {
  menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
