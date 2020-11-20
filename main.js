// Imports and variable declarations
const { app, BrowserWindow, ipcMain, BrowserView, session, Menu, MenuItem } = require('electron')
// TODO: Setting: allow update to userAgent
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.80 Safari/537.36'
const isMac = process.platform === 'darwin'
// const updater = require('./updater')

// Enable Electron-Reload (dev only)
// require('electron-reload')(__dirname)

// TODO: Add system tray icon
// TODO: Right-click toggle minimize/restore and mute (if not pause)
// TODO: Click for service menu

// TODO: Remember screen location and size
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
    fullscreen: false,
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
  view.userAgent = userAgent
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

  function setViewBounds () {
    wb = win.getBounds()
    view.setBounds({ x: 0, y: headerSize, width: wb.width, height: wb.height - headerSize })
  }
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

// CLose app if all windows are closed (can check for Mac)
app.on('window-all-closed', function () {
  // if (!isMac) {
    app.quit()
  // }
})

// TDOD: load service options from saved settings
// TODO: load last service used
// TODO: Setting: add option to load last service used
// IPC channel to change streaming service
ipcMain.on('service-change', (e, url) => {
  view.webContents.loadURL(url)
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

// IPC channel for maximizing window
ipcMain.on('add-stream', (e, serv) => {
  addStreams(serv)
})

// TODO: Add services to menu
// Menu
const template = [
  {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      // {
      //   label: 'Preferences',
      //   click () { win.webContents.send('load-settings') }
      // },
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
  // TODO: Refactor to use settings to generate
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
      { type: 'separator' },
      // TODO: Toggle menu item if full screenable from settings
      { role: 'togglefullscreen' }
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

const menu = Menu.buildFromTemplate(template)
const streamMenu = menu.items[1]
function addStreams (serv) {
  let menuItem = new MenuItem({ 
    label: serv.title,
    click () {
      view.webContents.loadURL(serv.url)
    }
  })
  streamMenu.submenu.append(menuItem)
  Menu.setApplicationMenu(menu)
}
