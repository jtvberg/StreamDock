// Imports
import { searchTitle, getTrendingTitles, getDiscoveryTitles, getRecommendedTitles, getTitleDetails, getEpisode } from './util/tmdb.js'
import { getPrefs } from "./util/settings.js"
import { getYear, elementFromHtml } from "./util/helpers.js"
import { getImagePath, getTitlePath } from './util/tmdb.js'
import { changeHomeLayout } from './renderer.js'
import { cacheImage, getCachedImage } from "./util/imageCache.js"
import { playLibraryItem } from "./library.js"
import { getLibrary } from "./util/libraryManager.js"

// Constants
const tmdbImagePath = getImagePath()
const tmdbTitlePath = getTitlePath()

// Element references
const $searchHotBtn = document.querySelector('#search-hot-btn')
const $searchTvBtn = document.querySelector('#search-tv-btn')
const $searchFilmBtn = document.querySelector('#search-film-btn')
const $searchClearBtn = document.querySelector('#search-clear-btn')
const $searchResults = document.querySelector('#search-results')
const $searchNoResults = document.querySelector('#search-noresults')
const $searchError = document.querySelector('#search-error')
const $searchOverlay = document.querySelector('#search-overlay')
const $searchInput = document.querySelector('#search-input')
const $modal = document.querySelector('#modal')
const $modalTitle = document.querySelector('#modal-title')
const $modalRating = document.querySelector('#modal-rating')
const $modalMedia = document.querySelector('#modal-media')
const $modalGenre = document.querySelector('#modal-genre')
const $modalRuntime = document.querySelector('#modal-runtime')
const $modalLanguage = document.querySelector('#modal-language')
const $modalBookmark = document.querySelector('#modal-bookmark')
const $modalRecommendations = document.querySelector('#modal-recommendations')
const $modalPoster = document.querySelector('#modal-poster')
const $modalNoposter = document.querySelector('#modal-noposter')
const $modalTagline = document.querySelector('#modal-tagline')
const $modalOverview = document.querySelector('#modal-overview')
const $modalCast = document.querySelector('#modal-cast')
const $modalTmdbLogo = document.querySelector('#modal-tmdb-logo')
const $modalProviders = document.querySelector('#modal-providers')
const $modalCarouselLeft = document.querySelector('#modal-carousel-left')
const $modalCarouselRight = document.querySelector('#modal-carousel-right')
const $modalNotFound = document.querySelectorAll('.not-found')

// Vars
let currentResultElement = null

// Functions
export const setCurrentResultElement = (element) => {
  currentResultElement = element
}

const getTrending = async (time = 'week', page = 1) => {
  if (page === 1) { clearResults() }
  const response = await getTrendingTitles(time, page)
  const queryObj = { query: 'trending', time }
  parseResponse(response, queryObj)
}

const getDiscovery = async (media_type, page = 1) => {
  if (page === 1) { clearResults() }
  const response = await getDiscoveryTitles(media_type, page)
  const queryObj = { query: 'discovery', media_type }
  parseResponse(response, queryObj)
}

const getRecommendations = async (id, media_type, page = 1) => {
  changeHomeLayout(document.querySelector('#search-nav-btn'))
  if (page === 1) { clearResults() }
  const response = await getRecommendedTitles(id, media_type, page)
  const queryObj = { query: 'recommendations', id, media_type }
  parseResponse(response, queryObj)
}

const getSearch = async (term, page = 1, accumulatedResults = [], pagesFetched = 0) => {
  if (page === 1) { 
    clearResults()
    accumulatedResults = []
    pagesFetched = 0
  }
  
  const response = await searchTitle(term, page)

  if (response <= 1) {
    const queryObj = { query: 'search', term }
    parseResponse(response, queryObj)
    return
  }

  const validResults = response.results?.filter(r => r.media_type !== 'person') || []
  accumulatedResults.push(...validResults)
  pagesFetched++
  
  const minResults = 20
  const maxPagesFetched = 10

  if (
    accumulatedResults.length < minResults &&
    response.page < response.total_pages &&
    pagesFetched < maxPagesFetched
  ) {
    await getSearch(term, page + 1, accumulatedResults, pagesFetched)
    return
  }

  const syntheticResponse = {
    results: accumulatedResults,
    total_results: accumulatedResults.length,
    total_pages: response.total_pages,
    page: page
  }

  const queryObj = { query: 'search', term }
  parseResponse(syntheticResponse, queryObj)
}

const noResults = (bool) => {
  $searchNoResults.style.display = bool ? 'flex' : ''
}

const showError = (bool) => {
  $searchError.style.display = bool ? 'flex' : ''
}

const parseResponse = (response, queryObj) => {
  showError(false)
  noResults(false)
  switch (response) {
    case 1:
      showError(true)
      clearResults()
      return
    case -1:
      showError(true)
      clearResults()
      return
    case 0:
      noResults(true)
      clearResults()
      return
  }
  response.total_results === 0 ? noResults(true) : console.log(`${response.total_results} results found`)
  $searchClearBtn.style.visibility = ''
  
  if (response.results) {
    appendResults(response.results, queryObj)
  }
  
  if (response.total_pages > response.page) {
    addNextPageBtn(response.page, queryObj)
  }
}

const addNextPageBtn = (page, queryObj) => {
  const frag = document.createDocumentFragment()
  const resultTile = elementFromHtml(`<div id="next-page-btn" class="result-tile fas fa-plus"></div>`)
  resultTile.addEventListener('click', () => loadNextPage(page + 1, queryObj))
  frag.appendChild(resultTile)
  $searchResults.appendChild(frag)
}

const loadNextPage = (page, queryObj) => {
  document.querySelector('#next-page-btn')?.remove()
  
  switch (queryObj.query) {
    case 'trending':
      getTrending(queryObj.time, page)
      break
    case 'discovery':
      getDiscovery(queryObj.media_type, page)
      break
    case 'recommendations':
      getRecommendations(queryObj.id, queryObj.media_type, page)
      break
    case 'search':
      getSearch(queryObj.term, page)
      break
  }
}

const appendResults = (results, queryObj) => {
  const frag = document.createDocumentFragment()
  results.forEach((result) => {
    frag.appendChild(createResultTile(result, queryObj.media_type))
  })
  $searchResults.appendChild(frag)
}

const createResultTile = (result, media_type = result.media_type) => {
  const poster = result.poster_path ? `${tmdbImagePath}${result.poster_path}` : null
  const resultTile = elementFromHtml(`<div class="result-tile"></div>`)
  const resultPoster = elementFromHtml(`<img class="result-poster" src="${poster}"></img>`)
  const resultDetails = elementFromHtml(`<div class="result-details"></div>`)
  const resultTitle = elementFromHtml(`<div class="result-title" title="${result.title || result.name}">${result.title || result.name}</div>`)
  const resultYear = elementFromHtml(`<div class="result-year" title="${getYear(result.release_date || result.first_air_date)}">(${getYear(result.release_date || result.first_air_date)})</div>`)

  resultDetails.appendChild(resultTitle)
  resultDetails.appendChild(resultYear)
  resultTile.appendChild(resultDetails)
  poster ? resultTile.appendChild(resultPoster) : null

  resultTile.dataset.id = result.id
  resultTile.dataset.mediaType = media_type
  resultTile.dataset.isNavigable = 'true'

  const streamingUrl = `${tmdbTitlePath}${media_type}/${result.id}`
  resultTile.dataset.url = streamingUrl
  
  resultTile.addEventListener('click', () => {
    currentResultElement = resultTile
    showDetails({ 
      ...result,
      id: result.id,
      media_type,
      url: streamingUrl
    })
    updateCarouselButtons()
  })
  return resultTile
}

const clearResults = () => {
  $searchOverlay.style.display = ''
  $searchInput.value = ''
  $searchClearBtn.style.visibility = 'hidden'
  $searchResults.replaceChildren([])
  currentResultElement = null
}

const updateCarouselButtons = () => {
  const prevElement = getPreviousNavigable(currentResultElement)
  const nextElement = getNextNavigable(currentResultElement)
  
  if (!prevElement) {
    $modalCarouselLeft.style.color = 'gray'
    $modalCarouselLeft.style.cursor = 'default'
  } else {
    $modalCarouselLeft.style.color = ''
    $modalCarouselLeft.style.cursor = 'pointer'
  }

  if (!nextElement) {
    $modalCarouselRight.style.color = 'gray'
    $modalCarouselRight.style.cursor = 'default'
  } else {
    $modalCarouselRight.style.color = ''
    $modalCarouselRight.style.cursor = 'pointer'
  }
}

const getPreviousNavigable = (element) => {
  if (!element) return null
  let prev = element.previousElementSibling
  while (prev) {
    if (prev.dataset.isNavigable === 'true') return prev
    prev = prev.previousElementSibling
  }
  return null
}

const getNextNavigable = (element) => {
  if (!element) return null
  let next = element.nextElementSibling
  while (next) {
    if (next.dataset.isNavigable === 'true') return next
    next = next.nextElementSibling
  }
  return null
}

const showPrevious = () => {
  const prevElement = getPreviousNavigable(currentResultElement)
  if (!prevElement) return
  
  currentResultElement = prevElement
  const isLocal = prevElement.dataset.isLocal === 'true'
  const result = {
    id: Number(prevElement.dataset.id) || null,
    media_type: prevElement.dataset.mediaType,
    url: prevElement.dataset.url,
    isLocal,
    cleanTitle: prevElement.dataset.cleanTitle,
    season: prevElement.dataset.season ? Number(prevElement.dataset.season) : undefined,
    episode: prevElement.dataset.episode ? Number(prevElement.dataset.episode) : undefined
  }
  showDetails(result)
  updateCarouselButtons()
}

const showNext = () => {
  const nextElement = getNextNavigable(currentResultElement)
  if (!nextElement) return
  
  currentResultElement = nextElement
  const isLocal = nextElement.dataset.isLocal === 'true'
  const result = {
    id: Number(nextElement.dataset.id) || null,
    media_type: nextElement.dataset.mediaType,
    url: nextElement.dataset.url,
    isLocal,
    cleanTitle: nextElement.dataset.cleanTitle,
    season: nextElement.dataset.season ? Number(nextElement.dataset.season) : undefined,
    episode: nextElement.dataset.episode ? Number(nextElement.dataset.episode) : undefined
  }
  showDetails(result)
  updateCarouselButtons()
}

export const showDetails = async (result) => {
  showError(false)
  $modalPoster.style.display = 'none'
  $modalNoposter.style.display = ''
  $modalPoster.src = ""
  
  const id = result.id
  const media_type = result.media_type || (result.title ? 'movie' : 'tv')
  const url = result.url
  const isLocal = result.isLocal || false
  const season = result.season ?? -1
  const episode = result.episode ?? -1
  const lastPlayTime = result.lastPlayTime || 0
  
  $modal.dataset.id = id
  $modal.dataset.media_type = media_type
  $modal.dataset.url = null
  
  let details = {}
  if (id === undefined || id === null) {
    $modalNotFound.forEach(el => el.style.display = 'none')
  } else {
    $modalNotFound.forEach(el => el.style.display = '')
    $modal.dataset.url = isLocal ? `${tmdbTitlePath}${media_type}/${id}` : url
    details = await getTitleDetails(id, media_type)
  }

  if (details === 1) {
    alert("Unable to show details for this item: No API key found.")
  } else if (details === -1) {
    alert("Unable to show details for this item: Check your internet connection.")
  }
  let episodeDetails = null
  if (media_type === 'tv' && Number.isInteger(season) && Number.isInteger(episode) && season >= 0 && episode >= 0) {
    episodeDetails = await getEpisode(id, season, episode)
  }
  const loc = getPrefs().find(pref => pref.id === 'search-loc').state()
  $searchOverlay.style.display = 'flex'
  const posterUrl = (episodeDetails ? getStillUrl(episodeDetails) : getPosterUrl(details)) || (details.poster_path ? `${tmdbImagePath}${details.poster_path}` : null)
  const posterPath = episodeDetails ? episodeDetails.still_path : details.backdrop_path || details.poster_path
  console.log(posterUrl, posterPath)
  if (posterUrl) {
    if (isLocal) {
      const cachedPoster = await getCachedImage(posterPath)
      if (cachedPoster) {
        $modalPoster.src = cachedPoster
      } else {
        cacheImage(posterUrl, posterPath).then(cached => {
          if (cached) {
            $modalPoster.src = cached
          } else {
            $modalPoster.src = posterUrl
          }
        })
      }
    } else {
      $modalPoster.src = posterUrl
    }
    $modalNoposter.style.display = 'none'
    $modalPoster.style.display = ''
  }

  const title = result.cleanTitle || getTitle(episodeDetails || details)
  $modalTitle.textContent = `${title} (${getYear(episodeDetails?.air_date || details.first_air_date || details.release_date) || ''})`
  $modalRating.textContent = getRating(details, media_type, loc)
  const mediaInfo = getMedia(episodeDetails || details, media_type)
  $modalMedia.textContent = mediaInfo.mediaType
  $modalMedia.title = media_type === 'movie' ? 'Media Type' : mediaInfo.isEpisode ? 'Season/Episode' : '# of Seasons/Episodes'
  $modalGenre.textContent = getGenre(details)
  $modalRuntime.textContent = getRuntime(episodeDetails || details)
  $modalLanguage.textContent = getLanguage(details)
  const tagline = media_type === 'tv' ? (episodeDetails?.name ? `"${episodeDetails.name}"` : getTagline(details)) : getTagline(details)
  $modalTagline.style.display = ''
  tagline === `""` ? $modalTagline.style.display = 'none' : $modalTagline.textContent = tagline
  $modalOverview.textContent = getOverview(episodeDetails || details)
  $modalCast.textContent = getCast(details)
  $modalProviders.replaceChildren([])
  
  let libraryUrl = isLocal ? url : null
  let libraryTime = isLocal ? lastPlayTime : 0
  
  if (!isLocal && id) {
    const library = getLibrary()
    const libraryItem = library.find(item => 
      item.metadata?.id === id && 
      item.type === media_type
    )
    if (libraryItem) {
      libraryUrl = libraryItem.url
      libraryTime = libraryItem.lastPlayTime || 0
    }
  }
  
  if (libraryUrl) {
    const frag = document.createDocumentFragment()
    const pb = elementFromHtml('<div class="modal-play fas fa-play"></div>')
    pb.addEventListener('click', () => {
      playLibraryItem({ url: libraryUrl, lastPlayTime: libraryTime })
      $searchOverlay.style.display = ''
    })
    frag.appendChild(pb)
    $modalProviders.appendChild(frag)
  }
  
  getProviders(details, loc).forEach(p => {
    const frag = document.createDocumentFragment()
    const pe = elementFromHtml(`<img class="modal-provider-image" src="${p.path}" title="${p.name}">`)
    pe.addEventListener('click', () => window.electronAPI.openUrl(p.link))
    frag.appendChild(pe)
    $modalProviders.appendChild(frag)
  })
  updateCarouselButtons()
}

function getPosterUrl(input) {
  return input.backdrop_path ? `${tmdbImagePath}${input.backdrop_path}` : null
}

function getStillUrl(input) {
  return input.still_path ? `${tmdbImagePath}${input.still_path}` : null
}

function getTitle(input) {
  return `${input.title || input.name || ''}`
}

function getRating(input, media_type, loc) {
  let rating = 'NA'
  try {
    if (media_type === 'tv') {
      rating = input.content_ratings.results.find(c => c.iso_3166_1 === loc).rating
    } else {
      rating = input.release_dates.results.find(r => r.iso_3166_1 === loc).release_dates.find(d => d.certification !== '').certification
    }
  } catch (err) { console.log(`No genres found for id ${input.id}`) }
  return rating
}

function getMedia(input, media_type) {
  if (media_type === 'movie') {
    return { mediaType: 'Film', isEpisode: false }
  } else {
    const { isEpisode, seasonInfo } = getSeasonInfo(input)
    return { mediaType: seasonInfo, isEpisode }
  }
}

function getGenre(input) {
  let genre = ''
  try {
    input.genres.forEach(g => {
      genre += `${g.name}, `
    })
  } catch (err) { console.log(`No genres found for id ${input.id}`) }
  return genre === '' ? 'NA' : genre.slice(0, -2)
}

function getRuntime(input) {
  let formattedTime = 'NA'
  try {
    const time = input.runtime || input.last_episode_to_air?.runtime || input.episode_run_time?.[0]
    const formatTime = (n) => {
      if (typeof n !== 'number' || isNaN(n)) return 'NA'
      const mins = n % 60
      const hrs = Math.floor(n / 60)
      if (isNaN(hrs) || isNaN(mins)) return 'NA'
      return `${hrs}:${('0' + mins).slice(-2)}`
    }
    formattedTime = formatTime(time)
  } catch (err) { console.log(`No duration found`) }
  return formattedTime
}

function getLanguage(input) {
  return input.original_language ? input.original_language.toUpperCase() : 'NA'
}

function getTagline(input) {
  return input.tagline ? `"${input.tagline.replace(/["]+/g, '')}"` : `""` 
}

function getOverview(input) {
  return input.overview ? input.overview : 'NA'
}

function getCast(input) {
  let cast = ''
  try {
    input.credits.cast.filter(c => c.order < 8).forEach(n => {
      if (n.name && n.name !== '') {
        cast += `${n.name}, `
      }
    })
  } catch (err) { console.log(`No cast found for id ${input.id}`) }
  return cast === '' ? 'NA' : cast.slice(0, -2)
}

function getSeasonInfo(input) {
  let isEpisode = true
  let seasonInfo = 'TV'
  // console.log(input)
  try {
    isEpisode = input.episode_number !== undefined
    seasonInfo = `S:${input.season_number ?? input.number_of_seasons ?? 'NA'} E:${input.episode_number ?? input.number_of_episodes ?? 'NA'}`
  } catch (err) { console.log(`No season info found for id ${input.id}`) }
  return { isEpisode, seasonInfo }
}

function getProviders(input, loc) {
  const logos = []
  try {
    input['watch/providers'].results[loc].flatrate.forEach(l => logos.push({ path: tmdbImagePath+l.logo_path, name: l.provider_name, link: input['watch/providers'].results[loc].link }))
  } catch (err) { console.log(`No streaming providers found for id ${input.id} in ${loc} locale`) }
  return logos
}

clearResults()

// Events
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $searchOverlay.style.display = ''
  }
})

$searchOverlay.addEventListener('click', e => e.target.style.display = '')

$searchHotBtn.addEventListener('click', () => getTrending())

$searchTvBtn.addEventListener('click', () => getDiscovery('tv'))

$searchFilmBtn.addEventListener('click', () => getDiscovery('movie'))

$searchClearBtn.addEventListener('click', () => clearResults())

$searchInput.addEventListener('keydown', e => e.key === 'Enter' ? getSearch(e.target.value) : null)

$modalBookmark.addEventListener('click', () => window.electronAPI.urlToBookmark($modal.dataset.url))

$modalRecommendations.addEventListener('click', e => getRecommendations($modal.dataset.id, $modal.dataset.media_type, 1))

$modalTmdbLogo.addEventListener('click', () => window.electronAPI.openUrl($modal.dataset.url))

$modalCarouselLeft.addEventListener('click', () => showPrevious())

$modalCarouselRight.addEventListener('click', () => showNext())