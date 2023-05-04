// Modules and variable definition
const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')

autoUpdater.autoDownload = false

module.exports = () => {
  autoUpdater.on('error', (err) => {
    console.error(err)
  })
  autoUpdater.checkForUpdates()
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version of StreamDock is available. Do you want to update now?',
      buttons: ['Update', 'Cancel'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Install and restart now?',
      buttons: ['Install', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
  })
}