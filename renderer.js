// Imports and variable declarations
const { ipcRenderer, ipcMain } = require('electron')
const $ = require('jquery')
let winMax = false

// Window max/restore on header double click
function maxRestoreWindow () {
  if (!winMax) {
    ipcRenderer.send('win-max')
    $('body').css('background-color', '#00000000')
    $('.header-bar').addClass('header-bar-max')
    winMax = true
  } else {
    ipcRenderer.send('win-restore')
    winMax = false
    $('body').css('background-color', '#161616be')
    $('.header-bar').removeClass('header-bar-max')
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
