// Imports and variable declarations
const { app, BrowserWindow, ipcMain, BrowserView, session, Menu } = require('electron')
// TODO: Setting: allow update to userAgent
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.80 Safari/537.36'
// const updater = require('./updater')

// Enable Electron-Reload (dev only)
require('electron-reload')(__dirname)

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
    transparent: true,
    frame: false,
    hasShadow: false,
    fullscreen: false,
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

  const headerSize = 22

  view = new BrowserView()
  win.addBrowserView(view)
  view.userAgent = userAgent
  setViewBounds()

  // Reset view on resize
  win.on('resize', function () {
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
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  })

  // IPC channel for showing view
  ipcMain.on('view-show', () => {
    setViewBounds()
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
  // if (process.platform !== 'darwin') {
    app.quit()
  // }
})

// TODO: Refactor to use settings
function setService (serv) {
  switch (serv) {
    case 'tv':
      view.webContents.loadURL('https://tv.youtube.com')
      break
    case 'yt':
      view.webContents.loadURL('https://www.youtube.com')
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
}

// TDOD: load service options from saved settings
// TODO: load last service used
// TODO: Setting: add option to load last service used
// IPC channel to change streaming service
ipcMain.on('service-change', (e, data) => {
  setService(data)
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

// TODO: Add services to menu
// Menu
const isMac = process.platform === 'darwin'
const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      {
        label: 'Preferences',
        click () { 
          win.webContents.send('load-settings')
        }
      },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'viewMenu' }
  // TODO: Refactor to use settings to generate
  {
    label: 'Services',
    submenu: [
      {
        label: 'YouTube TV',
        click () { setService('tv') }
      },
      {
        label: 'YouTube',
        click () { setService('yt') }
      },
      {
        label: 'Netflix',
        click () { setService('nf') }
      },
      {
        label: 'Hulu',
        click () { setService('hl') }
      },
      {
        label: 'Amazon Video',
        click () { setService('ap') }
      },
      {
        label: 'Disney+',
        click () { setService('dp') }
      },
      {
        label: 'Peacock',
        click () { setService('pc') }
      },
      {
        label: 'ABC',
        click () { setService('ab') }
      },
      {
        label: 'CBS',
        click () { setService('cb') }
      },
      {
        label: 'HBO Max',
        click () { setService('hm') }
      },
      {
        label: 'ESPN+',
        click () { setService('ep') }
      },
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      // TODO: Toggle menu item if full screenable from settings
      // { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
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
Menu.setApplicationMenu(menu)
