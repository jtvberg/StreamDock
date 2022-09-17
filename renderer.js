// TODO: Open services in new window
// TODO: Setting: let user pick whether or not a new window is created
// TODO: Setting: add services
// TODO: Inicator for when a bookmark is added
// TODO: Watchlist vs bookmark

// Imports and variable declarations
const { ipcRenderer, nativeImage, clipboard } = require('electron')
const $ = require('jquery')
const _ = require('lodash')
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'
const isWindows = process.platform === 'win32'
const tmdbImagePath = 'https://image.tmdb.org/t/p/original'
let streamList = []
let settings = []
let nfFacets = []
let locs = []
let locId = 'US'
let bookmarks = []
let userAgent = ''
let defaultAgent = ''
let searchResults = []
let searchInput = ''

// Invoke services load and apply settings
loadSettings()
setUserAgent()
loadServices()
applyInitialSettings()
loadBookmarks()
openLastStream()

// Set system accent colors css variable
ipcRenderer.on('set-accent', (e, color) => {
  let root = document.documentElement
  root.style.setProperty('--color-system-accent', color)
  root.style.setProperty('--color-system-accent-trans', color.substring(0,7) + '80')
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
ipcRenderer.on('stream-changed', () => {
  $('.loading').show()
})

// Show home screen
ipcRenderer.on('show-homescreen', () => {
  $('.facet-host').hide()
  $('.loading').hide()
  $('.home-screen').show()
})

// Hide home screen
ipcRenderer.on('hide-homescreen', () => {
  $('.home-screen').hide()
})

// Invalid url
ipcRenderer.on('invalid-url', () => {
  alert('Invalid Link')
})

// Stream loaded
ipcRenderer.on('stream-loaded', (e, stream) => {
  if (stream) {
    settings.lastStream = stream
  }
  $('.loading').hide()
  toggleFacetsButton(new URL(stream.url).hostname)
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

// Receive always on top toggle
ipcRenderer.on('ontop', () => {
  toggleOnTop()
})

// Reveive url info from drop
ipcRenderer.on('url-info', (e, info) => {
  saveBookmark({serv: 'ot', url: info.url, title: info.title})
})

// Load Settings
function loadSettings() {
  const defaultList = getDefaultSettings()
  settings = localStorage.getItem('settings') ? JSON.parse(localStorage.getItem('settings')) : null
  if (settings) {
    // Prune old settings
    settings = _.pick(settings, _.keys(defaultList))
    // Add new settings with default values
    settings = _.assign(_.pick(defaultList, _.difference(_.keys(defaultList), _.keys(settings))), settings)
  } else {
    settings = defaultList
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

  $('.home-screen').hide()
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
  locId = settings.locId ? settings.locId : getDefaultSettings().locId

  // Auto-hide navbar buttons
  settings.hideNav ? $('.header-bar').children().addClass('nav-hide') : $('.header-bar').children().removeClass('nav-hide')

  // Hide the dock icon
  ipcRenderer.send('hide-dock-icon', settings.hideDock)

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
  // ipcRenderer.send('set-hmrecapskip', settings.hmSkipRecap)

  // Set user agent
  ipcRenderer.send('set-user-agent', userAgent)

  // Toggle search pane on home screen
  toggleSearch()
}

// Iterate through stored services and create buttons/menu entries
function loadServices() {
  const defaultList = getDefaultStreams()
  ipcRenderer.send('set-defaultstreams', defaultList)
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
  const template = document.getElementById('service-btn-instance')
  $.each(streamList, (i, serv) => {
    if (serv.active) {
      const instance = document.importNode(template.content, true)
      $('.service-btn', instance).css({ 'color': serv.color, 'background-color': serv.bgColor }).data('color', serv.color).data('bgcolor', serv.bgColor).data('val', serv.id).data('url', serv.url).prop('title', serv.title).text(serv.glyph)
      $('.service-btn-host').append(instance)
      ipcRenderer.send('add-stream', serv)
    }
  })
}

// Set user agent
function setUserAgent() {
  userAgent = 'Chrome'
  let defaultAgents = getDefaultSettings().userAgent
  if (isMac) {
    defaultAgent = defaultAgents.macos
  } else if (isLinux) {
    defaultAgent = defaultAgents.linux
  } else if (isWindows) {
    defaultAgent = defaultAgents.win
  }
  userAgent = settings.activeAgent ? settings.activeAgent : defaultAgent
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
  const defaultStreams = [
    {
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
      active: true,
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
      color: '#0066ff',
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
    },
    {
      id: 'cr',
      active: true,
      glyph: 'C',
      title: 'Crunchyroll',
      url: 'https://beta.crunchyroll.com/',
      color: '#ff5202',
      bgColor: '#ffffff'
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
    hideDock: false,
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
    showSearch: false,
    locId: 'US',
    searchApiKey: '',
    userAgent: {
      macos: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
      win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
      linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
    },
    activeAgent: null,
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
  $('.home-screen').css('opacity', '0')
  ipcRenderer.send('view-hide')
  $('#collapse-general, #collapse-services, #collapse-service-specific, #collapse-advanced, #collapse-search').collapse('hide')
  $('#ontop-check').prop('checked', settings.onTop)
  $('#last-check').prop('checked', settings.openLast)
  $('#window-check').prop('checked', settings.saveWindow)
  $('#fullscreen-check').prop('checked', settings.fullScreen)
  $('#restore-play-check').prop('checked', settings.restorePlay)
  $('#quick-check').prop('checked', settings.quickMenu)
  $('#nav-check').prop('checked', settings.hideNav)
  $('#dock-check').prop('checked', settings.hideDock)
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
  $.each(streamList, (i, serv) => {
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
  renderLocs()
  $('#agent-string-input').val(userAgent)
  $('#search-check').prop('checked', settings.showSearch)
  $('#search-api-key-input').val(settings.searchApiKey)
  $('#search-detail-modal').modal('hide')
  $('#settings-modal').modal('show')
}

// Save settings to local storage
function saveSettings() {
  userAgent = $('#agent-string-input').val()
  settings = {
    onTop: $('#ontop-check').is(':checked'),
    openLast: $('#last-check').is(':checked'),
    saveWindow: $('#window-check').is(':checked'),
    fullScreen: $('#fullscreen-check').is(':checked'),
    restorePlay: $('#restore-play-check').is(':checked'),
    quickMenu: $('#quick-check').is(':checked'),
    hideNav: $('#nav-check').is(':checked'),
    hideDock: $('#dock-check').is(':checked'),
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
    activeAgent: userAgent,
    showSearch: $('#search-check').is(':checked'),
    locId: $('#dropdown-locs').val(),
    searchApiKey: $('#search-api-key-input').val(),
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
  $('#dock-check').prop('checked', defaultSettings.hideDock)
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
  $('.serv-check').prop('checked', false)
  $('#agent-string-input').val(defaultAgent)
  $('#search-check').prop('checked', defaultSettings.showSearch)
  $('#dropdown-locs').val(defaultSettings.locId)
  $('#search-api-key-input').val(settings.searchApiKey)
  $.each(getDefaultStreams(), (i, serv) => {
    $(`#check-${serv.id}`).prop('checked', serv.active ? 'checked' : '')
  })
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
  $.each(nfFacets, (i, facet) => {
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

// Load locations into UI
function renderLocs() {
  $('#dropdown-locs').empty()
  locs.sort((a, b) => a.LocName.localeCompare(b.LocName))
  $.each(locs, (i, loc) => {
    const selected = loc.LocId === locId ? 'selected' : ''
    $('#dropdown-locs').append(`<option ${selected} value="${loc.LocId}">${loc.LocName}</option>`)
  })
}

// Sent IPC message to open stream
function openStream(id, url) {
  $('#search-detail-modal').modal('hide')
  ipcRenderer.send('service-change', {
    id: id,
    url: url
  })
}

// Load bookmarks
function loadBookmarks() {
  $('.bookmark-stream-host').empty()
  bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || []
  $.each(bookmarks, (i, bm) => {
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
  clipboard.clear('image')
  addBookmarkFlash()
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

// Toggle the NF facets button based on host
function toggleFacetsButton(host) {
  $('#facets-btn').hide()
  if (host === 'www.netflix.com') {
    $('#facets-btn').show()
  }
}

// Filter facets
function facetFilter(filter) {
  const showAll = !$('.filter-all').hasClass('toggled')
  $('.nf-facet-host').empty()
  $.each(nfFacets, (i, facet) => {
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

// Flash the bookmarks toggle when adding bookmark
function addBookmarkFlash() {
  $('#home-btn').addClass('bookmarks-btn-add').on('animationend', () => {
    $('#home-btn').removeClass('bookmarks-btn-add')
  })
}

// Call API to get search results
function getSearchResults(api, page, media, id) {
  let pages = 1
  if(!settings.searchApiKey || settings.searchApiKey.length === 0) {
    alert('You must enter a valid API key in Preferences > Search Settings for search to work')
    return
  }
  page = page ? page : 1
  if (page === 1) {
    searchInput = $('#search-input').val()
    $('#search-result-host').empty()
    searchResults = []
  } else {
    $('#results-more').remove()
  }
  const loc = locId
  const lang = 'en'
  const langLoc = `${lang}-${loc}`
  const apiKey = settings.searchApiKey
  const mediaType = media
  const searchApi = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&language=${langLoc}&query=${searchInput}&page=${page}&include_adult=false`
  const trendApi = `https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}&page=${page}&include_adult=false`
  const discApi = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${apiKey}&language=${lang}&sort_by=popularity.desc&include_adult=false&include_video=false&page=${page}&watch_region=${loc}&with_watch_monetization_types=flatrate`
  const recApi = `https://api.themoviedb.org/3/${mediaType}/${id}/recommendations?api_key=${apiKey}&language=${langLoc}&page=${page}`
  const apiCall = api === 0 ? searchApi : api === 1 ? trendApi : api === 2 ? recApi : discApi
  const formatTime = (n) => `${n / 60 ^ 0}:` + ('0' + n % 60).slice(-2)
  var getMedia = $.getJSON(apiCall)  
    .fail(() => {
      alert('Search query failed. Check that you have an internet connection and a valid API key.')
    })
    .always(() => {
      if (getMedia.responseJSON.total_results === 0) alert('No results found')
      pages = getMedia.responseJSON.total_pages
      const results = _.orderBy(_.filter(getMedia.responseJSON.results, o => o.media_type !== 'person'), 'popularity', 'desc')
      let records = results.length
      $.each(results, (i, item) => {
        const media = item.media_type ? item.media_type : mediaType
        const getDetails = $.getJSON(`https://api.themoviedb.org/3/${media}/${item.id}?api_key=${apiKey}&append_to_response=credits,watch/providers,genres,release_dates,content_ratings`)
          .always(() => {
            if (getDetails.statusText !== 'success') return
            let cast = []
            try { cast = getDetails.responseJSON.credits.cast } catch(err) { console.error(`No cast found for id ${item.id}`) }
            let providers = []
            try { providers = _.get(getDetails.responseJSON['watch/providers'].results, loc).flatrate } catch(err) { console.error(`No ${loc} stream providers found for id ${item.id}`) }
            let link = ''
            try { link = _.get(getDetails.responseJSON['watch/providers'].results, loc).link } catch(err) { console.error(`No stream link found for id ${item.id}`) }
            link = link === '' ? `https://www.themoviedb.org/${media}/${item.id}/` : link
            let genres = []
            try { genres = getDetails.responseJSON.genres } catch(err) { console.error(`No genres found for id ${item.id}`) }
            let rating = 'NA'
            try {
              if (media === 'movie') {
                rating = _.find(_.find(getDetails.responseJSON.release_dates.results, (o) => { return o.iso_3166_1 === loc}).release_dates, (r) => { return r.certification !== '' }).certification
              } else {
                rating = _.find(getDetails.responseJSON.content_ratings.results, (o) => { return o.iso_3166_1 === loc}).rating
              }
            } catch(err) { console.error(`No rating found for id ${item.id}`) }
            const title = item.title === undefined ? item.name : item.title
            const first_date = item.release_date === undefined ? item.first_air_date : item.release_date
            const poster = item.poster_path ? `https://image.tmdb.org/t/p/original${item.poster_path}` : ''
            const year = getYear(first_date)
            const runtime = getDetails.responseJSON.runtime === undefined ? getDetails.responseJSON.episode_run_time[0] : getDetails.responseJSON.runtime
            const searchResult = {
              id: item.id,
              poster,
              title,
              year,
              media,
              genres,
              runtime: formatTime(runtime),
              rating,
              tagline: getDetails.responseJSON.tagline,
              overview: item.overview,
              cast,
              providers,
              link,
              popularity: item.popularity,
              loaded: false,
              page
            }
            searchResults.push(searchResult)
            --records
            if (records === 0) {
              searchResults = _.orderBy(searchResults, 'popularity', 'desc')
              addSearchResults()
              if (page < pages) {
                addMoreTile(api, page + 1, media)
              }
            }
          })
      })
    })
}

// Convert date string to year
function getYear(input) {
  const year = new Date(input).getFullYear()
  return isNaN(year) ? 'NA' : year
}

// Add a get more results tile to the end of the results
function addMoreTile(api, page, media) {
  $('<div>', {
    id: 'results-more',
    class: 'fa fa-plus-circle fa-4x',
    title: 'Load More Results'
  }).data('page', page).data('api', api).data('media', media).appendTo('#search-result-host')
}

// Loop through search results and call addSearchResult
function addSearchResults() {
  $.each(searchResults, (i, item) => {
    if (!item.loaded) {
      addSearchResult(item)
      item.loaded = true
    }
  })
}

// Add search result to UI
function addSearchResult(result) {
  let txtGenres  = ''  
  if (result.genres && result.genres.length > 0) {
    $.each(result.genres, (i, item) => {
      txtGenres += `${item.name}, `
    })
  }

  const detailIns = $($('#search\\-result\\-instance').html())
  if (result.poster) {
    $('.result-image', detailIns).prop('src', `${result.poster}`)
  }
  if (result.providers && result.providers.length > 0) {
    $.each(result.providers, (i, item) => {
      if (i < 8) {
        const providerIns = $($('#provider\\-image\\-instance').html())
        $('.provider-image', providerIns).prop('src', `https://image.tmdb.org/t/p/original${item.logo_path}`).prop('title', `${item.provider_name}`).data('link', `${result.link}`)
        $('.result-provider-host', detailIns).append(providerIns)
      }
    })
  }
  $('.result-title', detailIns).text(`${result.title}`)
  $('.result-year', detailIns).text(`(${result.year})`)
  $('.result-rating', detailIns).text(`${result.rating}`)
  $('.result-genres', detailIns).text(txtGenres.slice(0, -2))
  $(detailIns).data('id', result.id).data('media', result.media)
  $('#search-result-host').append(detailIns)
}

// Load the search result detail modal from the searchResult array
function loadSearchDetailModal(media, id) {
  const resultDetail = searchResults.find(item => item.media === media && item.id === id)
  let txtGenres  = ''  
  if (resultDetail.genres && resultDetail.genres.length > 0) {
    $.each(resultDetail.genres, (i, item) => {
      txtGenres += `${item.name}, `
    })
  } else {
    txtGenres = 'NA  '
  }
  let txtCast = ''
  if (resultDetail.cast && resultDetail.cast.length > 0) {
    $.each(resultDetail.cast, (i, item) => {
      if (i < 5) {
        txtCast += `${item.name}, `
      }
    })
  } else {
    txtCast = 'NA  '
  }
  $('#result-detail-title').text(`${resultDetail.title}`)
  $('#result-detail-year').text(`(${resultDetail.year})`)
  $('#result-detail-image').prop('src', `${resultDetail.poster}`)
  $('#result-detail-tagline').text(`${resultDetail.tagline}`)
  $('#result-rating').text(`${resultDetail.rating}`)
  $('#result-detail-media').text(resultDetail.media === 'movie' ? 'Film' : 'TV')
  $('#result-detail-genres').text(txtGenres.slice(0, -2))
  $('#result-detail-runtime').text(`${resultDetail.runtime}`)
  $('#result-detail-overview').text(`${resultDetail.overview}`)
  $('#result-detail-cast').text(txtCast.slice(0, -2))
  $('#result-detail-tmdb-logo').prop('src', './res/serv_logos/small/tmdb.png').data('link', resultDetail.link).data('media', media).data('id', id)
  $('#result-detail-rec').data('media', media).data('id', id)
  $('#result-detail-provider-host').empty()
  if (resultDetail.providers && resultDetail.providers.length > 0) {
    $.each(resultDetail.providers, (i, item) => {
      if (i < 12) {
        const providerIns = $($('#provider\\-image\\-instance').html())
        $('.provider-image', providerIns).addClass('result-detail-provider-image').prop('src', `${tmdbImagePath}${item.logo_path}`).prop('title', `${item.provider_name}`).data('link', resultDetail.link)
        $('#result-detail-provider-host').append(providerIns)
      }
    })
  }
  $('#search-detail-modal').modal('show')
}

// Bookmark search result
function bookmarkSearchResult(media, id) {
  const resultDetail = searchResults.find(item => item.media === media && item.id === id)
  ipcRenderer.send('get-url-info', resultDetail.link)
}

// Toggle search pane on home screen
function toggleSearch() {
  if(settings.showSearch) {
    $('.home-resize, .search-host').show()
    $('.bookmark-host').css('flex-basis', '50%')
  } else {
    $('.home-resize, .search-host').hide()
    $('.bookmark-host').css('flex-basis', '100%')
  }
}

// Clear toggled state of quick search buttons
function clearSearchBtns() {
  $('.search-quick-btn').css('background-color', 'var(--color-neutral-light)')
}

// Toggle always on top
function toggleOnTop() {
  if ($('#ontop-btn').hasClass('ontop-locked')) {
    $('#ontop-btn').removeClass('ontop-locked').addClass('ontop-unlocked')
    ipcRenderer.send('ontop-unlock')
  } else {
    $('#ontop-btn').removeClass('ontop-unlocked').addClass('ontop-locked')
    ipcRenderer.send('ontop-lock')
  }
}

// Load NF facets from file
$.getJSON('nffacets.json', json => { 
  nfFacets = json
}).then(renderNfFacets)

// Load locs from file
$.getJSON('loc.json', json => { 
  locs = json
})

// Load more results on click of more tile
$(document).on('click', '#results-more', () => {
  getSearchResults($('#results-more').data('api'), $('#results-more').data('page'), $('#results-more').data('media'))
})

// Open TMDB page on click of provider image
$(document).on('click', '.result-detail-provider-image, .provider-image', function (e) {
  e.stopPropagation()
  openStream('ot', $(this).data('link'))
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

// Open TMDB detail modal
$(document).on('click', '.result-tile', function() {
  loadSearchDetailModal($(this).data('media'), $(this).data('id'))
})

// Bookmark search result event
$(document).on('click', '.result-bookmark', function(e) {
  e.stopPropagation()
  bookmarkSearchResult($(this).parent().data('media'), $(this).parent().data('id'))
})

// Open TMDB link
$('#result-detail-tmdb-logo').on('click', function() {
  openStream('ot', $(this).data('link'))
})

// Get recommendations based on title
$('#result-detail-rec').on('click', function() {
  getSearchResults(2, 1, $(this).data('media'), $(this).data('id'))
  $('#search-detail-modal').modal('hide')
})

// Home Screen toggle click handler
$('#home-btn').on('click', () => {
  ipcRenderer.send('toggle-homescreen')
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
$('#ontop-btn').on('click', () => {
  toggleOnTop()
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

// Open prefs click handler
$('#prefs-btn').on('click', () => {
  loadSettingsModal()
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
  $('.home-screen').css('opacity', '1')
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

// Settings undo user agent change
$('#agent-undo-btn').on('click', () => {
  $('#agent-string-input').val(userAgent)
})

// Settings set user agent to default
$('#agent-default-btn').on('click', () => {
  $('#agent-string-input').val(defaultAgent)
})

// Settings undo user agent change
$('#search-api-key-undo-btn').on('click', () => {
  $('#search-api-key-input').val(settings.searchApiKey)
})

// Get search results click handler
$('#search-input').on('keypress', (e) => {
  if (e.key === 'Enter' && $('#search-input').val().length > 0) {
    clearSearchBtns()
    getSearchResults(0, 1)
  }
})

// Clear search input box
$('.search-clear').on('click', () => {
  $('#search-input').val('')
  $('#search-result-host').empty()
  clearSearchBtns()
})

// Get trending titles
$('#search-trend').on('click', () => {
  $('#search-input').val('')
  clearSearchBtns()
  $('#search-trend').css('background-color', 'var(--color-system-accent-trans)')
  getSearchResults(1, 1)
})

// Get popular movie streams
$('#search-pop-movie').on('click', () => {
  $('#search-input').val('')
  clearSearchBtns()
  $('#search-pop-movie').css('background-color', 'var(--color-system-accent-trans)')
  getSearchResults(3, 1, 'movie')
})

// Get popular tv streams
$('#search-pop-tv').on('click', () => {
  $('#search-input').val('')
  clearSearchBtns()
  $('#search-pop-tv').css('background-color', 'var(--color-system-accent-trans)')
  getSearchResults(3, 1, 'tv')
})

// Drop link to create bookmark
$('body').on('dragover', false).on('drop', (e) => {
  e.preventDefault()
  if (e.originalEvent.dataTransfer.items) {
    [...e.originalEvent.dataTransfer.items].forEach(item => {
      if (item.type.match('^text/uri-list')) {
        item.getAsString(data => {
          ipcRenderer.send('get-url-info', data)
        })
      }
    })
  }
})

// Reset home screen seperator on screen height change
let ih = innerHeight
$(window).on('resize', () => {
  if(ih !== innerHeight && $('.bookmark-host').height() > 0) {
    let nh = $('.bookmark-host').height() / $('.home-screen').height() * 100
    $('.bookmark-host').css('flexBasis', `${nh}%`)
    ih = innerHeight
  }
})

// Home screen seperator functions
let isSepMouseDown = 0
$('.home-resize').on('mousedown', () => {
  isSepMouseDown = 1
})

$('body').on('mouseup', () => {
  isSepMouseDown = 0
})

$('body').on('mousemove', (e) => {
  const fb = e.clientY - 20
  if (isSepMouseDown === 1 && fb < innerHeight - 85) {
    $('.bookmark-host').css('flexBasis', fb + 'px')
  } else if (isSepMouseDown === 1) {
    $('.bookmark-host').css('flexBasis', (innerHeight - 85) + 'px')
    isSepMouseDown = 0
  } else {
    isSepMouseDown = 0
  }
})