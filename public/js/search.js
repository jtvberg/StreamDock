// Imports
import { searchTitle, getTrendingTitles, getDiscoveryTitles, getRecommendedTitles, getTitleDetails } from './util/tmdb.js'
import { getPrefs } from "./util/settings.js"
import { getYear, elementFromHtml } from "./util/helpers.js"
import { getImagePath, getTitlePath } from './util/tmdb.js'
import { changeHomeLayout } from './renderer.js'

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

// Functions
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

const getSearch = async (term, page = 1) => {
  if (page === 1) { clearResults() }
  const response = await searchTitle(term, page)
  const queryObj = { query: 'search', term }
  parseResponse(response, queryObj)
}

const noResults = (bool) => {
  $searchNoResults.style.display = bool ? 'flex' : ''
}

const showError = (bool) => {
  $searchError.style.display = bool ? 'flex' : ''
}

const parseResponse = (response, queryObj) => {
  showError(false)
  if (response === 0) {
    clearResults()
    showError(true)
    return
  }
  response.total_results === 0 ? noResults(true) : console.log(`${response.total_results} results found`)
  $searchClearBtn.style.visibility = ''
  appendResults(response.results, queryObj)
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
  document.querySelector('#next-page-btn').remove()
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
  results.forEach(result => {
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
  resultTile.addEventListener('click', () => showDetails(result.id, media_type))
  return resultTile
}

const clearResults = () => {
  noResults(false)
  $searchOverlay.style.display = ''
  $searchInput.value = ''
  $searchClearBtn.style.visibility = 'hidden'
  $searchResults.replaceChildren([])
}

export const showDetails = async (id, media_type) => {
  showError(false)
  const result = await getTitleDetails(id, media_type)
  if (result === 0) {
    clearResults()
    showError(true)
    return
  }
  $modalPoster.style.display = ''
  $modalNoposter.style.display = ''
  const loc = getPrefs().find(pref => pref.id === 'search-loc').state()
  $searchOverlay.style.display = 'flex'
  $modal.dataset.id = id
  $modal.dataset.media_type = media_type
  $modal.dataset.url = `${tmdbTitlePath}${media_type}/${id}`
  const posterPath = getPosterPath(result)
  if (posterPath) { 
    $modalPoster.src = posterPath
  } else {
    $modalPoster.style.display = 'none'
    $modalNoposter.style.display = 'flex'
  }
  $modalTitle.textContent = getTitle(result)
  $modalRating.textContent = getRating(result, media_type, loc)
  $modalMedia.textContent = getMedia(result, media_type)
  $modalGenre.textContent = getGenre(result)
  $modalRuntime.textContent = getRuntime(result)
  $modalLanguage.textContent = getLanguage(result)
  const tagline = getTagline(result)
  $modalTagline.style.display = ''
  tagline === `""` ? $modalTagline.style.display = 'none' : $modalTagline.textContent = tagline
  $modalOverview.textContent = getOverview(result)
  $modalCast.textContent = getCast(result)
  $modalProviders.replaceChildren([])
  getProviders(result, loc).forEach(p => {
    const frag = document.createDocumentFragment()
    const pe = elementFromHtml(`<img class="modal-provider-image" src="${p.path}" title="${p.name}">`)
    pe.addEventListener('click', () => window.electronAPI.openUrl(p.link))
    frag.appendChild(pe)
    $modalProviders.appendChild(frag)
  })
}

function getPosterPath(input) {
  return input.poster_path ? `${tmdbImagePath}${input.poster_path}` : null
}

function getTitle(input) {
  return `${input.title || input.name || ''} (${getYear(input.release_date || input.first_air_date) || ''})`
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
  return media_type === 'movie' ? 'Film' : getSeasonInfo(input)
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
    const time = input.runtime || input.last_episode_to_air.runtime || input.episode_run_time[0]
    const formatTime = (n) => `${n / 60 ^ 0}:` + ('0' + n % 60).slice(-2)
    formattedTime = formatTime(time)
  } catch (err) { console.log(`No duration found`) }
  return formattedTime
}

function getLanguage(input) {
  return input.original_language ? input.original_language.toUpperCase() : 'NA'
}

function getTagline(input) {
  return input.tagline ? `"${input.tagline}"` : `""` 
}

function getOverview(input) {
  return input.overview ? input.overview : 'NA'
}

function getCast(input) {
  let cast = ''
  try {
    input.credits.cast.filter(c => c.order < 8).forEach(n => {
      cast += `${n.name}, `
    })
  } catch (err) { console.log(`No cast found for id ${input.id}`) }
  return cast === '' ? 'NA' : cast.slice(0, -2)
}

function getSeasonInfo(input) {
  let season = 'TV'
  try {
    season = `S:${input.number_of_seasons === undefined ? 'NA' : input.number_of_seasons} E:${input.number_of_episodes === undefined ? 'NA' : input.number_of_episodes }`
  } catch (err) { console.log(`No season info found for id ${input.id}`) }
  return season
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
$searchOverlay.addEventListener('click', e => e.target.style.display = '')

$searchHotBtn.addEventListener('click', () => getTrending())

$searchTvBtn.addEventListener('click', () => getDiscovery('tv'))

$searchFilmBtn.addEventListener('click', () => getDiscovery('movie'))

$searchClearBtn.addEventListener('click', () => clearResults())

$searchInput.addEventListener('keydown', e => e.key === 'Enter' ? getSearch(e.target.value) : null)

$modalBookmark.addEventListener('click', () => window.electronAPI.urlToBookmark($modal.dataset.url))

$modalRecommendations.addEventListener('click', e => getRecommendations($modal.dataset.id, $modal.dataset.media_type, 1))

$modalTmdbLogo.addEventListener('click', () => window.electronAPI.openUrl($modal.dataset.url))
