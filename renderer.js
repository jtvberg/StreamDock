// Imports and variable declarations
const { ipcRenderer, BrowserView, app } = require('electron')
const $ = require('jquery')
let winMax = false

// Invoke services load
loadServices()

// Open first service
const serv = $('.service-button').first().data('val') || 'tv'
ipcRenderer.send('service-change', serv)

// TODO: Setting: Optop on startup
// Set ontop
ipcRenderer.send('ontop-lock')

// TODO: Get from local storaage
// TODO: Abstract css
// TODO: Derive val
// Iterate through stored services and create buttons/menu entries
function loadServices () {
  $('.service-button-host').append(
    `<div class="service-button color-4" data-val="tv" title="YouTube TV">T</div>
    <div class="service-button color-4" data-val="yt" title="YouTube">Y</div>
    <div class="service-button color-1" data-val="nf" title="Netflix">N</div>
    <div class="service-button color-2" data-val="hl" title="Hulu">H</div>
    <div class="service-button color-3" data-val="ap" title="Amazon Prime Video">A</div>
    <div class="service-button color-5" data-val="dp" title="Disney+">D</div>
    <div class="service-button color-7" data-val="pc" title="Peacock">P</div>
    <div class="service-button color-10" data-val="ab" title="ABC">A</div>
    <div class="service-button color-8" data-val="cb" title="CBS">C</div>
    <div class="service-button color-9" data-val="hm" title="HBO Max">H</div>
    <div class="service-button color-6" data-val="ep" title="ESPN+">E</div>`
  )
}

// TODO: Consider moving to main
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

// TODO: Open services in new window
// TODO: Setting: let user pick whether or not a new window is created
// Service selector click handler
$('.service-button').on('click', function () {
  ipcRenderer.send('service-change', $(this).data('val'))
})

// Settings close restore View
$('#settings-modal').on('hidden.bs.modal', () => {
  ipcRenderer.send('view-show')
})

// TODO: Build list of services and persist
// TODO: Setting: let users pick and add services
// TODO: Setting: let users pick color combo of service buttons

// Settings invoke
ipcRenderer.on('load-settings', () => {
  ipcRenderer.send('view-hide')
  loadSettingsModal()
  $('#settings-modal').modal('show')
})

function loadSettingsModal() {
  $('#input-agent').val('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.80 Safari/537.36')
}
