// TODO: Open services in new window
// TODO: Setting: let user pick whether or not a new window is created
// TODO: Setting: let users pick and add services
// TODO: Setting: let users pick color combo of service buttons
// Imports and variable declarations
const { ipcRenderer } = require('electron')
const $ = require('jquery')
const isMac = process.platform === 'darwin'
let streamList = []
let settings = []
let winMax = false

// Invoke services load and apply settings
loadSettings()
loadServices()
applySettings()

// Settings modal invoke main
ipcRenderer.on('load-settings', () => {
  loadSettingsModal()
})

// Settings save invoke from main
ipcRenderer.on('save-settings', (e, data) => {
  settings.windowSizeLocation = data.windowSizeLocation
  localStorage.setItem('settings', JSON.stringify(settings))
})

// Load Settings
function loadSettings () {
  settings = localStorage.getItem('settings') ? JSON.parse(localStorage.getItem('settings')) : getDefaultSettings()
}

// Apply loaded settings
function applySettings () {
  // Show lock button if Mac
  if (isMac) { $('.ontop-button').show() }

  // Set windo on top
  if (settings.onTop) {
    ipcRenderer.send('ontop-lock')
  } else {
    $('.ontop-button').removeClass('ontop-locked').addClass('ontop-unlocked')
  }

  // Open last used service or first one in list
  if (settings.openLast) {
    ipcRenderer.send('service-change', { id: settings.lastStream, url: streamList.find(item => item.id === settings.lastStream).url })
  } else {
    ipcRenderer.send('service-change', { id: streamList[0].id, url: streamList[0].url })
  }

  // Set window size and location
  if (settings.saveWindow) {
    ipcRenderer.send('set-window', settings.windowSizeLocation)
  }
}

// Iterate through stored services and create buttons/menu entries
function loadServices () {
  streamList = localStorage.getItem('streamList') ? JSON.parse(localStorage.getItem('streamList')) : getDefaultStreams()
  ipcRenderer.send('agent-change', settings.userAgent)
  ipcRenderer.send('allow-fullscreen', settings.fullScreen)
  ipcRenderer.send('reset-menu')
  $('.service-button-host').empty()
  streamList.forEach(function (serv) {
    if (serv.active) {
      if (isMac && settings.quickMenu) {
        $('.service-button-host').append(`<div class="service-button" data-val="${serv.id}" data-url="${serv.url}" title="${serv.title}" style="color:${serv.color}; background-color:${serv.bgColor};">${serv.glyph}</div>`)
      }
      ipcRenderer.send('add-stream', serv)
    }
  })
}

// Return default streams
function getDefaultStreams () {
  const defaultStreams = [
    { id: 'yt', active: true, glyph: 'Y', title: 'YouTube', url: 'https://www.youtube.com', color: '#ff0000', bgColor: '#ffffff' },
    { id: 'tv', active: true, glyph: 'T', title: 'YouTube TV', url: 'https://tv.youtube.com', color: '#ff0000', bgColor: '#ffffff' },
    { id: 'nf', active: true, glyph: 'N', title: 'Netflix', url: 'https://www.netflix.com', color: '#ffffff', bgColor: '#db272e' },
    { id: 'hl', active: true, glyph: 'H', title: 'Hulu', url: 'https://www.hulu.com', color: '#ffffff', bgColor: '#1ce783' },
    { id: 'ap', active: true, glyph: 'P', title: 'Amazon Prime TV', url: 'https://www.amazon.com/gp/video/storefront', color: '#ffffff', bgColor: '#00aee4' },
    { id: 'dp', active: true, glyph: 'D', title: 'Disney+', url: 'https://www.disneyplus.com/home', color: '#ffffff', bgColor: '#1a3676' },
    { id: 'pc', active: true, glyph: 'P', title: 'Peacock', url: 'https://www.peacocktv.com/watch/home', color: '#000000', bgColor: '#ffffff' },
    { id: 'ab', active: true, glyph: 'A', title: 'ABC', url: 'https://abc.com', color: '#ffffff', bgColor: '#000000' },
    { id: 'cb', active: true, glyph: 'C', title: 'CBS', url: 'https://cbs.com', color: '#0095f7', bgColor: '#ffffff' },
    { id: 'hm', active: true, glyph: 'H', title: 'HBO Max', url: 'https://play.hbomax.com', color: '#ffffff', bgColor: '#7e5ee4' },
    { id: 'ep', active: false, glyph: 'E', title: 'ESPN+', url: 'https://plus.espn.com', color: '#000000', bgColor: '#ffaf00' }
  ]
  return defaultStreams
}

// Return default settings
function getDefaultSettings () {
  const defaultSettings = {
    onTop: true,
    openLast: true,
    saveWindow: true,
    fullScreen: false,
    quickMenu: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.80 Safari/537.36',
    lastStream: 'yt',
    windowSizeLocation: { x: 0, y: 0, height: 600, width: 800 }
  }
  return defaultSettings
}

// TODO: Consider moving to main and checking for state instead of using a variable
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

// Load stored values into settings modal
function loadSettingsModal () {
  ipcRenderer.send('view-hide')
  $('#collapse-general, #collapse-services').collapse('hide')
  $('#ontop-check').prop('checked', settings.onTop)
  $('#last-check').prop('checked', settings.openLast)
  $('#window-check').prop('checked', settings.saveWindow)
  $('#fullscreen-check').prop('checked', settings.fullScreen)
  $('#quick-check').prop('checked', settings.quickMenu)
  $('#agent-input').val(settings.userAgent)
  $('#settings-services-available').empty()
  streamList.forEach(function (serv) {
    const checked = serv.active ? 'checked' : ''
    $('#settings-services-available').append(
      `<div class="service-host">
        <div class="form-check">
          <input type="checkbox" class="service-check" id="check-${serv.id}" data-val="${serv.id}" ${checked}>
          <img class="service-${serv.id}" src="./res/serv_logos/small/${serv.id}.png" for="check-${serv.id}"></img>
        </div>
      </div>`)
  })
  $('#settings-modal').modal('show')
}

// Save settings to local storage
function saveSettings () {
  settings = {
    onTop: $('#ontop-check').is(':checked'),
    openLast: $('#last-check').is(':checked'),
    saveWindow: $('#window-check').is(':checked'),
    fullScreen: $('#fullscreen-check').is(':checked'),
    quickMenu: $('#quick-check').is(':checked'),
    userAgent: $('#agent-input').val(),
    lastStream: settings.lastStream,
    windowSizeLocation: settings.windowSizeLocation
  }
  localStorage.setItem('settings', JSON.stringify(settings))

  $('.service-check').each(function () {
    streamList.find(item => item.id === $(this).data('val')).active = $(this).is(':checked')
  })
  localStorage.setItem('streamList', JSON.stringify(streamList))

  $('#settings-modal').modal('hide')
  loadServices()
}

// Load default settings into settings modal
function loadDefaultSettings () {
  const defaultSettings = getDefaultSettings()
  $('#ontop-check').prop('checked', defaultSettings.onTop)
  $('#last-check').prop('checked', defaultSettings.openLast)
  $('#window-check').prop('checked', defaultSettings.saveWindow)
  $('#fullscreen-check').prop('checked', defaultSettings.fullScreen)
  $('#quick-check').prop('checked', defaultSettings.quickMenu)
  $('.service-check').prop('checked', true)
  $('#agent-input').val(defaultSettings.userAgent)
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
  ipcRenderer.send('service-change', { id: $(this).data('val'), url: $(this).data('url') })
  settings.lastStream = $(this).data('val')
})

// Settings close restore View
$('#settings-modal').on('hidden.bs.modal', () => {
  ipcRenderer.send('view-show')
})

// Settings save button handler
$('#settings-save-button').on('click', () => {
  saveSettings()
})

// Settings default button handler
$('#settings-default-button').on('click', () => {
  loadDefaultSettings()
})
