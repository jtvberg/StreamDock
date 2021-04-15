// TODO: Open services in new window
// TODO: Setting: let user pick whether or not a new window is created
// TODO: Setting: add services

// Imports and variable declarations
const { ipcRenderer, nativeImage, clipboard } = require('electron')
const $ = require('jquery')
let streamList = []
let settings = []
let nfFacets = []
let bookmarks = []

// Invoke services load and apply settings
loadSettings()
loadServices()
applyInitialSettings()
loadBookmarks()
openLastStream()

// Set system accent color css variable
ipcRenderer.on('set-accent', (e, color) => {
  let root = document.documentElement
  root.style.setProperty('--color-system-accent', color)
})

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
ipcRenderer.on('stream-changed', (e, url) => {
  $('.loading').show()
  if (url && !url.includes('.netflix.com')) {
    $('.facet-host').hide()
    $('#facets-btn').hide()
  }
})

// Show bookmarks
ipcRenderer.on('show-bookmarks', () => {
  $('.facet-host').hide()
  $('.loading').hide()
  $('.bookmark-host').show()
})

// Hide bookmarks
ipcRenderer.on('hide-bookmarks', () => {
  $('.bookmark-host').hide()
})

// Stream loaded
ipcRenderer.on('stream-loaded', (e, stream) => {
  settings.lastStream = stream
  if (settings.lastStream.url.includes('.netflix.com')) {
    $('#facets-btn').show()
  } else {
    $('#facets-btn').hide()
  }
  $('.loading').hide()
})

// Stream url updated
ipcRenderer.on('stream-update', (e, stream) => {
  settings.lastStream = stream
})

// Save bookmark
ipcRenderer.on('save-bookmark', (e, stream) => {
  saveBookmark(stream)
})

// Show Netflix facets
ipcRenderer.on('show-facets', (e, bool) => {
  bool ? $('.facet-host').show() : $('.facet-host').hide()
})

// Receive logs from other processes
ipcRenderer.on('log', (e, info) => {
  console.log(info)
})

// Load Settings
function loadSettings() {
  const defaultList = getDefaultSettings()
  settings = localStorage.getItem('settings') ? JSON.parse(localStorage.getItem('settings')) : defaultList
  // Add new default settings to current settings
  if (Object.keys(settings).length !== Object.keys(defaultList).length) {
    for (var prop in defaultList) {
      if (!Object.prototype.hasOwnProperty.call(settings, prop)) {
        settings[prop] = defaultList[prop]
      }
    }
  }
}

// Apply loaded settings
function applyInitialSettings() {
  // Set window on top
  if (settings.onTop) {
    ipcRenderer.send('ontop-lock')
  } else {
    $('.ontop-btn').removeClass('ontop-locked').addClass('ontop-unlocked')
  }

  // Set window size and location
  if (settings.saveWindow) {
    ipcRenderer.send('set-window', settings.windowSizeLocation)
  }

  $('.bookmark-host').hide()
  $('.facet-host').hide()
  $('#facets-btn').hide()

  applyUpdateSettings()
}

// Apply loaded settings
function applyUpdateSettings() {
  // Show quick-nav
  settings.quickMenu ? $('.service-btn-host').show() : $('.service-btn-host').hide()
  ipcRenderer.send('hide-header-bar', settings.quickMenu)

  // Auto-hide navbar buttons
  settings.hideNav ? $('.header-bar').children().addClass('nav-hide') : $('.header-bar').children().removeClass('nav-hide')

  // Set full-screenable
  ipcRenderer.send('allow-fullscreen', settings.fullScreen)

  // Set restore auto-play
  ipcRenderer.send('restore-play', settings.restorePlay)

  // Set the theme
  ipcRenderer.send('set-theme', settings.themeMode ? settings.themeMode : 'system')

  // Skip YouTube ad skip
  ipcRenderer.send('set-ytadskip', settings.ytSkipAds)

  // Skip Prime preview skip
  ipcRenderer.send('set-amzprevskip', settings.amzSkipPreview)

  // Skip Prime recap skip
  ipcRenderer.send('set-amzrecapskip', settings.amzSkipRecap)

  // Skip Netflix recap skip
  ipcRenderer.send('set-nfrecapskip', settings.nfSkipRecap)
}

// Iterate through stored services and create buttons/menu entries
function loadServices() {
  const defaultList = getDefaultStreams()
  streamList = localStorage.getItem('streamList') ? JSON.parse(localStorage.getItem('streamList')) : defaultList

  // Add new default streams to stream list
  if (defaultList.length !== streamList.length) {
    defaultList.forEach(item => {
      let miss = true
      streamList.forEach(serv => {
        if (item.id === serv.id) {
          miss = false
        }
      })
      if (miss) {
        streamList.push(item)
      }
    })
  }
  ipcRenderer.send('reset-menu')
  $('.service-btn-host').empty()
  $('.service-btn-host').append('<div class="far fa-bookmark fa-xs bookmarks-btn" title="Toggle Bookmarks"></div>')
  streamList.forEach(function (serv) {
    if (serv.active) {
      $('.service-btn-host').append(`<div class="service-btn-color" style="color:${serv.color}; background-color:${serv.bgColor};"><div class="service-btn" data-val="${serv.id}" data-url="${serv.url}" title="${serv.title}">${serv.glyph}</div></div>`)
      ipcRenderer.send('add-stream', serv)
    }
  })
}

// Open last stream or first service in list
function openLastStream() {
  if (settings.openLast && settings.lastStream.url) {
    openStream(settings.lastStream.id, settings.lastStream.url)
  } else {
    openStream(streamList[0].id, streamList[0].url)
  }
}

// Return default streams
function getDefaultStreams() {
  const defaultStreams = [{
    id: 'yt',
    active: true,
    glyph: 'Y',
    title: 'YouTube',
    url: 'https://www.youtube.com',
    color: '#ff0000',
    bgColor: '#ffffff'
  },
  {
    id: 'tv',
    active: true,
    glyph: 'T',
    title: 'YouTube TV',
    url: 'https://tv.youtube.com',
    color: '#ff0000',
    bgColor: '#ffffff'
  },
  {
    id: 'nf',
    active: true,
    glyph: 'N',
    title: 'Netflix',
    url: 'https://www.netflix.com',
    color: '#ffffff',
    bgColor: '#db272e'
  },
  {
    id: 'hl',
    active: true,
    glyph: 'H',
    title: 'Hulu',
    url: 'https://www.hulu.com',
    color: '#ffffff',
    bgColor: '#1ce783'
  },
  {
    id: 'ap',
    active: true,
    glyph: 'P',
    title: 'Prime Video',
    url: 'https://www.amazon.com/gp/video/storefront',
    color: '#ffffff',
    bgColor: '#00aee4'
  },
  {
    id: 'dp',
    active: true,
    glyph: 'D',
    title: 'Disney+',
    url: 'https://www.disneyplus.com/home',
    color: '#ffffff',
    bgColor: '#1a3676'
  },
  {
    id: 'at',
    active: true,
    glyph: 'T',
    title: 'Apple TV+',
    url: 'https://tv.apple.com/',
    color: '#ffffff',
    bgColor: '#000000'
  },
  {
    id: 'pc',
    active: false,
    glyph: 'P',
    title: 'Peacock',
    url: 'https://www.peacocktv.com/watch/home',
    color: '#000000',
    bgColor: '#ffffff'
  },
  {
    id: 'ab',
    active: true,
    glyph: 'A',
    title: 'ABC',
    url: 'https://abc.com',
    color: '#ffffff',
    bgColor: '#000000'
  },
  {
    id: 'cb',
    active: true,
    glyph: 'P',
    title: 'Paramount+',
    url: 'https://www.paramountplus.com/',
    color: '#0166a4',
    bgColor: '#ffffff'
  },
  {
    id: 'hm',
    active: true,
    glyph: 'H',
    title: 'HBO Max',
    url: 'https://play.hbomax.com',
    color: '#ffffff',
    bgColor: '#7e5ee4'
  },
  {
    id: 'ep',
    active: true,
    glyph: 'E',
    title: 'ESPN+',
    url: 'https://plus.espn.com',
    color: '#000000',
    bgColor: '#ffaf00'
  }
  ]
  return defaultStreams
}

// Return default settings
function getDefaultSettings() {
  const defaultSettings = {
    onTop: true,
    openLast: true,
    saveWindow: true,
    fullScreen: false,
    restorePlay: true,
    quickMenu: true,
    hideNav: false,
    themeMode: 'system',
    lastStream: { id: getDefaultStreams()[0].id, url: getDefaultStreams()[0].url },
    ytSkipAds: true,
    amzSkipPreview: true,
    amzSkipRecap: false,
    nfSkipRecap: false,
    windowSizeLocation: {
      x: 0,
      y: 0,
      height: 600,
      width: 800
    }
  }
  return defaultSettings
}

// Window max/restore on header double click
function maxRestoreWindow() {
  ipcRenderer.send('win-max')
}

// Load stored values into settings modal
function loadSettingsModal() {
  $('.facet-host').css({ 'opacity': '0' })
  $('.bookmark-host').css({ 'opacity': '0' })
  ipcRenderer.send('view-hide')
  $('#collapse-general, #collapse-services').collapse('hide')
  $('#ontop-check').prop('checked', settings.onTop)
  $('#last-check').prop('checked', settings.openLast)
  $('#window-check').prop('checked', settings.saveWindow)
  $('#fullscreen-check').prop('checked', settings.fullScreen)
  $('#restore-play-check').prop('checked', settings.restorePlay)
  $('#quick-check').prop('checked', settings.quickMenu)
  $('#nav-check').prop('checked', settings.hideNav)
  $('#yt-skip-check').prop('checked', settings.ytSkipAds)
  $('#amz-preview-check').prop('checked', settings.amzSkipPreview)
  $('#amz-recap-check').prop('checked', settings.amzSkipRecap)
  $('#nf-recap-check').prop('checked', settings.nfSkipRecap)
  $('input[name=radio-theme]').prop('checked', false).parent('.btn').removeClass('active')
  $(`input[name=radio-theme][value=${settings.themeMode}]`).prop('checked', true).parent('.btn').addClass('active')
  $('#settings-services-available').empty()
  const defaultStreams = getDefaultStreams()
  streamList.forEach(function (serv) {
    const defaultStream = defaultStreams.find(item => item.id === serv.id)
    const checked = serv.active ? 'checked' : ''
    $('#settings-services-available').append(
      `<div class="service-host" data-id="${serv.id}">
        <div class="custom-control custom-checkbox serv-check-host">
          <input type="checkbox" class="custom-control-input serv-check" id="check-${serv.id}" data-id="${serv.id}" ${checked}>
          <label class="custom-control-label serv-check-label" for="check-${serv.id}" style="width:0px"></label>
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
function saveSettings() {
  settings = {
    onTop: $('#ontop-check').is(':checked'),
    openLast: $('#last-check').is(':checked'),
    saveWindow: $('#window-check').is(':checked'),
    fullScreen: $('#fullscreen-check').is(':checked'),
    restorePlay: $('#restore-play-check').is(':checked'),
    quickMenu: $('#quick-check').is(':checked'),
    hideNav: $('#nav-check').is(':checked'),
    ytSkipAds: $('#yt-skip-check').is(':checked'),
    amzSkipPreview: $('#amz-preview-check').is(':checked'),
    amzSkipRecap: $('#amz-recap-check').is(':checked'),
    nfSkipRecap: $('#nf-recap-check').is(':checked'),
    themeMode: $('#choose-theme input:radio:checked').val(),
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
function loadDefaultSettings() {
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
    $(this).parent().find('.serv-color-btn').css('color', $(this).val())
  })
  $('.text-glyph').each(function () {
    $(this).val($(this).data('default-glyph'))
  })
}

// Load NF facets into UI
function renderNfFacets() {
  $('.nf-facet-host').empty()
  const showAll = !$('.filter-all').hasClass('toggled')
  $.each(nfFacets, function(i, facet) {
    if (facet.Category === 'Genre') {
      $('.nf-facet-host').append(`<div class="nf-facet" data-code="${facet.Code}" style="font-weight: 800">${facet.Genre}</div>`)
    } else if (facet.Category !== 'A-Z') {
      $('.nf-facet-host').append(`<div class="nf-facet" data-code="${facet.Code}">- ${facet.Genre}</div>`)
    } else if (showAll) {
      $('.nf-facet-host').append(`<div class="nf-facet" data-code="${facet.Code}">- ${facet.Genre}</div>`)
    }
  })
  if (!showAll) {
    $('.nf-facet-host').children().last().remove()
  }
}

// Sent IPC message to open stream
function openStream(id, url) {
  ipcRenderer.send('service-change', {
    id: id,
    url: url
  })
}

// Load bookmarks
function loadBookmarks() {
  $('.bookmark-stream-host').empty()
  bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || []
  bookmarks.forEach(function (bm) {
    addBookmark(bm)
  })
}

// Update bookmarks
function addBookmark(bookmark) {
  $('.bookmark-stream-host').append(`<div class="bookmark-tile" data-ts="${bookmark.timestamp}">
    <img src="${bookmark.image}" style="width: 100%">
    <div class="fas fa-link bookmark-url-btn fa-2x" data-url="${bookmark.url}" title="Copy URL"></div>
    <div class="fas fa-times-circle bookmark-delete-btn fa-2x" data-ts="${bookmark.timestamp}" title="Delete Bookmark"></div>
    <div class="fas fa-circle fa-3x bookmark-play-btn-bg"></div>
    <div class="fas fa-play fa-2x bookmark-play-btn" data-val="${bookmark.serv}" data-url="${bookmark.url}" title="Play Stream"></div>
    <div class="bookmark-title" title="${bookmark.title}">${bookmark.title}</div>
  </div>`)
}

// Resize image and store off with url
function saveBookmark(stream) {
  const img = nativeImage.createFromDataURL(clipboard.readImage().toDataURL())
  const imgSize = img.getSize()
  const bookmark = {
    serv: stream.id,
    url: stream.url,
    title: stream.title,
    image: img.resize({ width: 200, height: 200 * imgSize.height / imgSize.width }).toDataURL(),
    timestamp: Date.now()
  }
  addBookmark(bookmark)
  bookmarks.push(bookmark)
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
}

// Delete bookmark
function deleteBookmark(ts) {
  $.each(bookmarks, function(i){
    if (this.timestamp === ts){
      bookmarks.splice(i, 1)
    }
  })
  $('.bookmark-tile').each(function () {
    if ($(this).data('ts') === ts) {
      $(this).remove()
    }
  })
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
}

// Sent IPC message to open genre facets
function toggleFacets() {
  ipcRenderer.send('toggle-facets')
}

// Filter facets
function facetFilter(filter) {
  const showAll = !$('.filter-all').hasClass('toggled')
  $('.nf-facet-host').empty()
  $.each(nfFacets, function(i, facet) {
    if (showAll && facet.Code !== '0' && (facet.Genre.toLowerCase().includes(filter) || facet.Category.toLowerCase().includes(filter))) {
      $('.nf-facet-host').append(`<div class="nf-facet" data-code="${facet.Code}">${facet.Genre}</div>`)
    } else if (facet.Category !== 'A-Z' && facet.Code !== '0' && (facet.Genre.toLowerCase().includes(filter) || facet.Category.toLowerCase().includes(filter))) {
      $('.nf-facet-host').append(`<div class="nf-facet" data-code="${facet.Code}">${facet.Genre}</div>`)
    }
  })
  if (filter === '') {
    renderNfFacets()
  }
}

// Load NF facets from file
$.getJSON('nffacets.json', function(json) { 
  nfFacets = json
}).then(renderNfFacets)

// Bookmarks toggle click handler
$(document).on('click', '.bookmarks-btn', () => {
  ipcRenderer.send('toggle-bookmarks')
})

// NF facet click handler
$(document).on('click', '.nf-facet', function () {
  if ($(this).data('code') > 0) {
    openStream('nf', `https://www.netflix.com/browse/genre/${$(this).data('code')}`)
  }
})

// Service selector click handler
$(document).on('click', '.service-btn', function () {
  openStream($(this).data('val'), $(this).data('url'))
})

// Activate color picker
$(document).on('click', '.serv-color-btn', function () {
  $(this).parent().find('.serv-color-input').trigger('click')
})

// Track color picker changes
$(document).on('change', '.serv-color-input', function () {
  $(this).parent().find('.serv-color-btn').css('color', $(this).val())
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

// Invert servivce btn colors on hover
$(document).on('mouseenter', '.service-btn', function () {
  const c = $(this).closest('.service-btn-color').css('color')
  const b = $(this).closest('.service-btn-color').css('background-color')
  $(this).css({
    'color': b,
    'background-color': c
  })
})

// Restore service btn color
$(document).on('mouseleave', '.service-btn', function () {
  $(this).css({
    'color': '',
    'background-color': ''
  })
})

// Play bookmarked stream
$(document).on('click', '.bookmark-play-btn', function () {
  openStream($(this).data('val'), $(this).data('url'))
})

// Play bookmarked stream
$(document).on('click', '.bookmark-delete-btn', function () {
  deleteBookmark($(this).data('ts'))
})

// Copy bookmark link to clipboard
$(document).on('click', '.bookmark-url-btn', function () {
  clipboard.writeText($(this).data('url'))
})

// Stop button dblclick from bubbling up to header
$('.service-btn-host, .control-btn-host').on('dblclick', (e) => {
  e.stopPropagation()
})

// Clear facet filter
$('.filter-clear').on('click', () => {
  $('.facet-filter').val('')
  renderNfFacets()
})

// Toggle show all facets
$('.filter-all').on('click', () => {
  if ($('.filter-all').hasClass('toggled')) {
    $('.filter-all').removeClass('toggled')
  } else {
    $('.filter-all').addClass('toggled')
  }
  facetFilter($('.facet-filter').val().toLowerCase())
})

// Toggle show all facets
$('.facet-filter').on('input', function () {
  facetFilter($(this).val().toLowerCase())
})

// Toggle keep on top
$('#ontop-btn').on('click', function () {
  if ($(this).hasClass('ontop-locked')) {
    $(this).removeClass('ontop-locked').addClass('ontop-unlocked')
    ipcRenderer.send('ontop-unlock')
  } else {
    $(this).removeClass('ontop-unlocked').addClass('ontop-locked')
    ipcRenderer.send('ontop-lock')
  }
})

// Toggle genre facets
$('#facets-btn').on('click', () => {
  toggleFacets()
})

// Bookmark location
$('#bookmark-btn').on('click', () => {
  ipcRenderer.send('save-bookmark')
})

// Back button click handler
$('#back-btn').on('click', () => {
  ipcRenderer.send('nav-back')
})

// Open link from clipboard click handler
$('#link-btn').on('click', () => {
  ipcRenderer.send('open-link')
})

// Scale horizontal click handler
$('#scaleh-btn').on('click', () => {
  ipcRenderer.send('scale-width')
})

// Scale vertical click handler
$('#scalev-btn').on('click', () => {
  ipcRenderer.send('scale-height')
})

// Header double-click handler
$('.header-bar').on('dblclick', () => {
  maxRestoreWindow()
})

// Header right-click handler
$('.header-bar').on('contextmenu', () => {
  ipcRenderer.send('win-hide')
})

// Settings close restore View
$('#settings-modal').on('hidden.bs.modal', () => {
  $('.facet-host').css({ 'opacity': '1' })
  $('.bookmark-host').css({ 'opacity': '1' })
  ipcRenderer.send('view-show')
})

// Settings save button handler
$('#settings-save-btn').on('click', () => {
  saveSettings()
})

// Settings default button handler
$('#settings-default-btn').on('click', () => {
  loadDefaultSettings()
})