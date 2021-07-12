// TODO: Open services in new window
// TODO: Setting: let user pick whether or not a new window is created
// TODO: Setting: add services

// Imports and variable declarations
const { ipcRenderer, nativeImage, clipboard } = require('electron')
const $ = require('jquery')
const isMac = process.platform === 'darwin'
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
  if (settings.lastStream.url && settings.lastStream.url.includes('.netflix.com')) {
    $('#facets-btn').show()
  } else {
    $('#facets-btn').hide()
  }
  $('.loading').hide()
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
  // Set background if win10
  if (!isMac) {
    $('body').css('background-color', 'var(--color-bg)')
  }

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
  !settings.quickMenu && !isMac ? $('.header-bar').hide() : $('.header-bar').show()
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

  // Skip Prime next episode
  ipcRenderer.send('set-amzepisodenext', settings.amzNextEpisode)

  // Skip Netflix recap skip
  ipcRenderer.send('set-nfrecapskip', settings.nfSkipRecap)

  // Skip Netflix next episode
  ipcRenderer.send('set-nfepisodenext', settings.nfNextEpisode)

  // Skip Hulu recap skip
  ipcRenderer.send('set-hlrecapskip', settings.hlSkipRecap)

  // Skip Hulu next episode
  ipcRenderer.send('set-hlepisodenext', settings.hlNextEpisode)

  // Skip Disney recap skip
  ipcRenderer.send('set-dprecapskip', settings.dpSkipRecap)

  // Skip Disney next episode
  ipcRenderer.send('set-dpepisodenext', settings.dpNextEpisode)

  // Skip HBO recap skip
  ipcRenderer.send('set-hmrecapskip', settings.hmSkipRecap)

  // Skip HBO next episode
  ipcRenderer.send('set-hmepisodenext', settings.hmNextEpisode)
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
  const template = document.getElementById('service-btn-instance')
  streamList.forEach(function (serv) {
    if (serv.active) {
      const instance = document.importNode(template.content, true)
      $('.service-btn', instance).css({ 'color': serv.color, 'background-color': serv.bgColor }).data('color', serv.color).data('bgcolor', serv.bgColor).data('val', serv.id).data('url', serv.url).prop('title', serv.title).text(serv.glyph)
      $('.service-btn-host').append(instance)
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
    amzSkipPreview: false,
    amzSkipRecap: false,
    amzNextEpisode: false,
    nfSkipRecap: false,
    nfNextEpisode: false,
    hlSkipRecap: false,
    hlNextEpisode: false,
    dpSkipRecap: false,
    dpNextEpisode: false,
    hmSkipRecap: false,
    hmNextEpisode: false,
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
  $('.facet-host').css('opacity', '0')
  $('.bookmark-host').css('opacity', '0')
  ipcRenderer.send('view-hide')
  $('#collapse-general, #collapse-services, #collapse-service-specific').collapse('hide')
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
  $('#amz-next-check').prop('checked', settings.amzNextEpisode)
  $('#nf-recap-check').prop('checked', settings.nfSkipRecap)
  $('#nf-next-check').prop('checked', settings.nfNextEpisode)
  $('#hl-recap-check').prop('checked', settings.hlSkipRecap)
  $('#hl-next-check').prop('checked', settings.hlNextEpisode)
  $('#dp-recap-check').prop('checked', settings.dpSkipRecap)
  $('#dp-next-check').prop('checked', settings.dpNextEpisode)
  $('#hm-recap-check').prop('checked', settings.hmSkipRecap)
  $('#hm-next-check').prop('checked', settings.hmNextEpisode)
  $('input[name=radio-theme]').prop('checked', false).parent('.btn').removeClass('active')
  $(`input[name=radio-theme][value=${settings.themeMode}]`).prop('checked', true).parent('.btn').addClass('active')
  $('#settings-services-available').empty()
  const defaultStreams = getDefaultStreams()
  const template = document.getElementById('service-host-instance')
  streamList.forEach(function (serv) {
    const defaultStream = defaultStreams.find(item => item.id === serv.id)
    const checked = serv.active ? 'checked' : ''
    const instance = document.importNode(template.content, true)
    $('.service-host', instance).data('id', serv.id)
    $('.serv-check', instance).data('id', serv.id).prop('id', `check-${serv.id}`).prop('checked', checked)
    $('.serv-check-label', instance).prop('for', `check-${serv.id}`)
    $('.serv-check-img', instance).prop('src', `./res/serv_logos/large/${serv.id}.png`).prop('for', `check-${serv.id}`)
    $('.serv-url-input', instance).prop('id', `input-url-${serv.id}`).data('undo-url', serv.url).data('default-url', defaultStream.url).prop('value', serv.url)
    $('.text-glyph', instance).prop('id', `input-glyph-${serv.id}`).data('default-glyph', defaultStream.glyph).prop('value', serv.glyph)
    $('.serv-color-pick-btn', instance).css('color', serv.color)
    $('.serv-color-pick-input', instance).prop('id', `serv-color-${serv.id}`).data('undo-color', serv.color).data('default-color', defaultStream.color).prop('value', serv.color)
    $('.serv-color-pick-label', instance).prop('for', `serv-color-${serv.id}`)
    $('.serv-bg-pick-btn', instance).css('color', serv.bgColor)
    $('.serv-bg-pick-input', instance).prop('id', `serv-bg-${serv.id}`).data('undo-color', serv.bgColor).data('default-color', defaultStream.bgColor).prop('value', serv.bgColor)
    $('.serv-bg-pick-label', instance).prop('for', `serv-bg-${serv.id}`)
    $('#settings-services-available').append(instance)
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
    amzNextEpisode: $('#amz-next-check').is(':checked'),
    nfSkipRecap: $('#nf-recap-check').is(':checked'),
    nfNextEpisode: $('#nf-next-check').is(':checked'),
    hlSkipRecap: $('#hl-recap-check').is(':checked'),
    hlNextEpisode: $('#hl-next-check').is(':checked'),
    dpSkipRecap: $('#dp-recap-check').is(':checked'),
    dpNextEpisode: $('#dp-next-check').is(':checked'),
    hmSkipRecap: $('#hm-recap-check').is(':checked'),
    hmNextEpisode: $('#hm-next-check').is(':checked'),
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
  $('#nav-check').prop('checked', defaultSettings.hideNav)
  $('#yt-skip-check').prop('checked', defaultSettings.ytSkipAds)
  $('#amz-preview-check').prop('checked', defaultSettings.amzSkipPreview)
  $('#amz-recap-check').prop('checked', defaultSettings.amzSkipRecap)
  $('#amz-next-check').prop('checked', defaultSettings.amzNextEpisode)
  $('#nf-recap-check').prop('checked', defaultSettings.nfSkipRecap)
  $('#nf-next-check').prop('checked', defaultSettings.nfNextEpisode)
  $('#hl-recap-check').prop('checked', defaultSettings.hlSkipRecap)
  $('#hl-next-check').prop('checked', defaultSettings.hlNextEpisode)
  $('#dp-recap-check').prop('checked', defaultSettings.dpSkipRecap)
  $('#dp-next-check').prop('checked', defaultSettings.dpNextEpisode)
  $('#hm-recap-check').prop('checked', defaultSettings.hmSkipRecap)
  $('#hm-next-check').prop('checked', defaultSettings.hmNextEpisode)
  // TODO: this should come from servuce defaults not all 'true'
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

// Add bookmarks to UI
function addBookmark(bookmark) {
  const instance = $($('#boomark\\-instance').html())
  $('.bookmark-image', instance).prop('src', bookmark.image)
  $('.bookmark-url-btn', instance).data('url', bookmark.url)
  $('.bookmark-delete-btn', instance).data('ts', bookmark.timestamp)
  $('.bookmark-play-btn', instance).data('url', bookmark.url).data('val', bookmark.serv)
  $('.bookmark-title', instance).prop('title', bookmark.title).text(bookmark.title)
  $('.bookmark-stream-host').append(instance)
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
  $(this).css({ 'color': $(this).data('bgcolor'), 'background-color': $(this).data('color') })
})

// Restore service btn color
$(document).on('mouseleave', '.service-btn', function () {
  $(this).css({ 'color': $(this).data('color'), 'background-color': $(this).data('bgcolor') })
})

// Play bookmarked stream
$(document).on('click', '.bookmark-play-btn', function () {
  openStream($(this).data('val'), $(this).data('url'))
})

// Play bookmarked stream
$(document).on('click', '.bookmark-delete-btn', function () {
  deleteBookmark($(this).data('ts'))
  $(this).closest('.bookmark-tile').remove()
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
  $('.facet-host').css('opacity', '1')
  $('.bookmark-host').css('opacity', '1')
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