// TODO: Open services in new window
// TODO: Setting: let user pick whether or not a new window is created
// TODO: Setting: add services

// Imports and variable declarations
const { ipcRenderer } = require('electron')
const $ = require('jquery')
const isMac = process.platform === 'darwin'
let streamList = []
let settings = []

// Invoke services load and apply settings
loadSettings()
loadServices()
applyInitialSettings()
openStream()

// Settings modal invoke main
ipcRenderer.on('load-settings', () => {
  loadSettingsModal()
})

// Settings save invoke from main
ipcRenderer.on('save-settings', (e, data) => {
  settings.windowSizeLocation = data.windowSizeLocation
  localStorage.setItem('settings', JSON.stringify(settings))
})

// Stream changed
ipcRenderer.on('stream-changed', () => {
  $('.loading').show()
})

// Stream loaded
ipcRenderer.on('stream-loaded', () => {
  $('.loading').hide()
})

// Receive logs from other processes
ipcRenderer.on('log', (e, data) => {
  console.log(data)
})

// Load Settings
function loadSettings () {
  settings = localStorage.getItem('settings') ? JSON.parse(localStorage.getItem('settings')) : getDefaultSettings()
}

// Apply loaded settings
function applyInitialSettings () {
  // Show lock button if Mac
  if (isMac) { $('.ontop-button').show() }

  // Set window on top
  if (settings.onTop) {
    ipcRenderer.send('ontop-lock')
  } else {
    $('.ontop-button').removeClass('ontop-locked').addClass('ontop-unlocked')
  }

  // Set window size and location
  if (settings.saveWindow) {
    ipcRenderer.send('set-window', settings.windowSizeLocation)
  }

  applyUpdateSettings () 
}

// Apply loaded settings
function applyUpdateSettings () {
  // Auto-hide navbar buttons
  settings.hideNav ? $('.header-bar').children().addClass('nav-hide') : $('.header-bar').children().removeClass('nav-hide')

  // Set full-screenable
  ipcRenderer.send('allow-fullscreen', settings.fullScreen)

  // Set restore auto-play
  ipcRenderer.send('restore-play', settings.restorePlay)
}

// Iterate through stored services and create buttons/menu entries
function loadServices () {
  const defaultList = getDefaultStreams()
  streamList = localStorage.getItem('streamList') ? JSON.parse(localStorage.getItem('streamList')) : defaultList
  
  // Add new default streams to stream list
  if (defaultList.length !== streamList.length) {
    defaultList.forEach(item => {
      let miss = true
      streamList.forEach(serv => {
        if (item.id === serv.id) { miss = false }
      })
      if (miss) { streamList.push(item) }
    })
  }
  ipcRenderer.send('reset-menu')
  $('.service-button-host').empty()
  streamList.forEach(function (serv) {
    if (serv.active) {
      if (isMac && settings.quickMenu) {
        $('.service-button-host').append(`<div class="service-button-color" style="color:${serv.color}; background-color:${serv.bgColor};"><div class="service-button" data-val="${serv.id}" data-url="${serv.url}" title="${serv.title}">${serv.glyph}</div></div>`)
      }
      ipcRenderer.send('add-stream', serv)
    }
  })
}

// Open last used service or first one in list
function openStream () {
  if (settings.openLast) {
    ipcRenderer.send('service-change', { id: settings.lastStream, url: streamList.find(item => item.id === settings.lastStream).url })
  } else {
    ipcRenderer.send('service-change', { id: streamList[0].id, url: streamList[0].url })
  }
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
    { id: 'at', active: true, glyph: 'T', title: 'Apple TV+', url: 'https://tv.apple.com/', color: '#ffffff', bgColor: '#000000' },
    { id: 'pc', active: true, glyph: 'P', title: 'Peacock', url: 'https://www.peacocktv.com/watch/home', color: '#000000', bgColor: '#ffffff' },
    { id: 'ab', active: true, glyph: 'A', title: 'ABC', url: 'https://abc.com', color: '#ffffff', bgColor: '#000000' },
    { id: 'cb', active: true, glyph: 'C', title: 'CBS', url: 'https://cbs.com', color: '#0095f7', bgColor: '#ffffff' },
    { id: 'hm', active: true, glyph: 'H', title: 'HBO Max', url: 'https://play.hbomax.com', color: '#ffffff', bgColor: '#7e5ee4' },
    { id: 'ep', active: true, glyph: 'E', title: 'ESPN+', url: 'https://plus.espn.com', color: '#000000', bgColor: '#ffaf00' }
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
    restorePlay: true,
    quickMenu: true,
    hideNav: true,
    lastStream: getDefaultStreams()[0].id,
    windowSizeLocation: { x: 0, y: 0, height: 600, width: 800 }
  }
  return defaultSettings
}

// Window max/restore on header double click
function maxRestoreWindow () {
  ipcRenderer.send('win-max')
}

// Load stored values into settings modal
function loadSettingsModal () {
  ipcRenderer.send('view-hide')
  $('#collapse-general, #collapse-services').collapse('hide')
  $('#ontop-check').prop('checked', settings.onTop)
  $('#last-check').prop('checked', settings.openLast)
  $('#window-check').prop('checked', settings.saveWindow)
  $('#fullscreen-check').prop('checked', settings.fullScreen)
  $('#restore-play-check').prop('checked', settings.restorePlay)
  $('#quick-check').prop('checked', settings.quickMenu)
  $('#nav-check').prop('checked', settings.hideNav)
  $('#settings-services-available').empty()
  defaultStreams = getDefaultStreams()
  streamList.forEach(function (serv, index) {
    const defaultStream = defaultStreams.find(item => item.id === serv.id)
    const checked = serv.active ? 'checked' : ''
    $('#settings-services-available').append(
      `<div class="service-host" data-id="${serv.id}">
        <div class="form-check serv-check-host">
          <input type="checkbox" class="serv-check" id="check-${serv.id}" data-id="${serv.id}" ${checked}>
        </div>
        <img src="./res/serv_logos/large/${serv.id}.png" for="check-${serv.id}"></img>
        <div class="input-group input-group-sm serv-url">
          <input type="url" class="form-control text-url" id="input-url-${serv.id}" data-undo-url="${serv.url}" data-default-url="${defaultStream.url}" value="${serv.url}"/>
          <div class="input-group-append">
            <button class="btn btn-outline-secondary url-undo-btn" type="button" title="Revert to previous">Undo</button>
            <button class="btn btn-outline-secondary url-default-btn" type="button" title="Load default URL">Default</button>
          </div>
        </div>
        <div class="input-group input-group-sm serv-glyph-pick">
          <label class="label-text">Quick Access Glyph:</label>
          <input type="text" class="form-control text-glyph" id="input-glyph-${serv.id}"" data-default-glyph="${defaultStream.glyph}" value="${serv.glyph}" maxlength="1"/>
        </div>
        <div class="serv-color-pick">
          <span class="fa fa-square serv-color-btn" style="color:${serv.color};"></span>  
          <input type="color" class="serv-color-input" id="serv-color-${serv.id}" data-undo-color="${serv.color}" data-default-color="${defaultStream.color}" value="${serv.color}">
          <label class="label-text" for="serv-color-${serv.id}">Color</label>
        </div>
        <div class="serv-bg-pick">
          <span class="fa fa-square serv-color-btn" style="color:${serv.bgColor};"></span>
          <input type="color" class="serv-color-input" id="serv-bg-${serv.id}" data-undo-color="${serv.bgColor}" data-default-color="${defaultStream.bgColor}" value="${serv.bgColor}">
          <label class="label-text" for="serv-bg-${serv.id}">Background</label>
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
    restorePlay: $('#restore-play-check').is(':checked'),
    quickMenu: $('#quick-check').is(':checked'),
    hideNav: $('#nav-check').is(':checked'),
    lastStream: settings.lastStream,
    windowSizeLocation: settings.windowSizeLocation
  }
  localStorage.setItem('settings', JSON.stringify(settings))

  $('.service-host').each(function () {
    const id = $(this).data('id')
    const result = streamList.find(item => item.id === id)
    result.glyph = $(`#input-glyph-${id}`).val()
    result.active = $(`#check-${id}`).is(':checked')
    result.color = $(`#serv-color-${id}`).val()
    result.bgColor = $(`#serv-bg-${id}`).val()
    result.url = $(`#input-url-${id}`).val()
  })
  localStorage.setItem('streamList', JSON.stringify(streamList))

  $('#settings-modal').modal('hide')
  loadServices()
  applyUpdateSettings()
}

// Load default settings into settings modal
function loadDefaultSettings () {
  const defaultSettings = getDefaultSettings()
  $('#ontop-check').prop('checked', defaultSettings.onTop)
  $('#last-check').prop('checked', defaultSettings.openLast)
  $('#window-check').prop('checked', defaultSettings.saveWindow)
  $('#fullscreen-check').prop('checked', defaultSettings.fullScreen)
  $('#restore-play-check').prop('checked', defaultSettings.restorePlay)
  $('#quick-check').prop('checked', defaultSettings.quickMenu)
  $('.serv-check').prop('checked', true)
  $('.serv-color-input').each(function () {
    $(this).val($(this).data('default-color'))
    $(this).parent().find('.serv-color-btn').css('color',$(this).val())
  })
  $('.text-glyph').each(function () {
    $(this).val($(this).data('default-glyph'))
  })
}

// Service selector click handler
$(document).on('click', '.service-button', function () {
  $('.loading').show()
  ipcRenderer.send('service-change', { id: $(this).data('val'), url: $(this).data('url') })
  settings.lastStream = $(this).data('val')
})

// Activate color picker
$(document).on('click', '.serv-color-btn', function () {
  $(this).parent().find('.serv-color-input').trigger('click')
})

// Track color picker changes
$(document).on('change', '.serv-color-input', function () {
  $(this).parent().find('.serv-color-btn').css('color',$(this).val())
})

// Reset to previous URL
$(document).on('click', '.url-undo-btn', function () {
  const urlText = $(this).closest('.serv-url').find('.text-url')
  $(urlText).val($(urlText).data('undo-url'))
})

// Load default URL
$(document).on('click', '.url-default-btn', function () {
  const urlText = $(this).closest('.serv-url').find('.text-url')
  $(urlText).val($(urlText).data('default-url'))
})

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
