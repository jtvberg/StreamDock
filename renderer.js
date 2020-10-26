// Imports and variable declarations
const { ipcRenderer, BrowserView } = require('electron')
const $ = require('jquery')
let winMax = false

// Open first service
const serv = $('.service-button').first().data('val') || 'tv'
ipcRenderer.send('service-change', serv)

// Set ontop
ipcRenderer.send('ontop-lock')

// Window max/restore on header double click
function maxRestoreWindow () {
  if (!winMax) {
    ipcRenderer.send('win-max')
    winMax = true
  } else {
    ipcRenderer.send('win-restore')
    winMax = false
  }
}

// Toggle keep on top
$('.ontop-button').on('click', function () {
  if ($(this).hasClass('ontop-locked')) {
    $(this).removeClass('ontop-locked').addClass('ontop-unlocked')
    ipcRenderer.send('ontop-unlock')
  } else {
    $(this).removeClass('ontop-unlocked').addClass('ontop-locked')
    ipcRenderer.send('ontop-lock')
  }
})

// Header double-click handler
$('.header-bar').on('dblclick', () => {
  maxRestoreWindow()
})

// Service selector click handler
$('.service-button').on('click', function () {
  ipcRenderer.send('service-change', $(this).data('val'))
})
