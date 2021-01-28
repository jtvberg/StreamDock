// Modules and variable definition
const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')

// Uncomment below for updater logging
// autoUpdater.logger = require('electron-log')
// autoUpdater.logger.transports.file.level = 'info'

// Disabable auto-download of updates
autoUpdater.autoDownload = false

// Check for app updates
module.exports = () => {
  autoUpdater.on('error', (err) => {
    console.log(err)
  })
  // Check for updates
  autoUpdater.checkForUpdates()
  // Listen for update
  autoUpdater.on('update-available', () => {
    // Prompt for user to update
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version of StreamDock is available. Do you want to update now?',
      buttons: ['Update', 'Cancel'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      // Download if Update chosen
      if (result.response === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })

  // Listen for update
  autoUpdater.on('update-downloaded', () => {
    // Prompt for user to update
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Install and restart now?',
      buttons: ['Install', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      // Download if Update chosen
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true)
      }
    })
  })
}
