import { getPrefs } from "./settings.js"

let requestToken = ''
let sessionId = ''

export function getHost() {
  return 'https://api.themoviedb.org'
}

export function getTitlePath() {
  return 'https://www.themoviedb.org/'
}

export function getImagePath() {
  return 'https://image.tmdb.org/t/p/original'
}

function getApiKey() {
  return getPrefs().find(pref => pref.id === 'search-api').state()
}

function getUsername() {
  return ''
}

function getPassword() {
  return ''
}

function getLoc() {
  return getPrefs().find(pref => pref.id === 'search-loc').state()
}

function getLang() {
  return 'en'
}

function getLangLoc() {
  return `${getLang()}-${getLoc()}`
}

function showResponse(response) {
  console.log(JSON.stringify(response))
}

const removeParentheses = str => {
  return str.replace(/\s*\([^)]*\)/g, '').trim()
}

async function apiGet(url) {
  try {
    if (getApiKey() === '') { return 1 }
    const response = await fetch(url, {
      method: 'GET',
      dataType: 'json',
      headers: { 'Content-Type': 'application/json' }
    })
    if (response?.ok) {
      return await response.json()
    }
    else {
      return -1
    }
  } catch (err) { return -1 }
}

async function apiPost(url, body) {
  try {
    if (getApiKey() === '') { return 1 }
    const response = await fetch(url, {
      method: 'POST',
      dataType: 'json',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (response?.ok) {
      return await response.json()
    }
    else {
      return -1
    }
  } catch (err) { return -1 }
}

async function getRequestToken() {
  const response = await apiGet(`${getHost()}/3/authentication/token/new?api_key=${getApiKey()}`)
  showResponse(response)
}

async function validateRequestToken() {
  const response = await apiPost(`${getHost()}/3/authentication/token/validate_with_login?api_key=${getApiKey()}`, { username: getUsername(), password: getPassword(), request_token: requestToken })
  showResponse(response)
}

async function getSessionId() {
  const response = await apiGet(`${getHost()}/3/authentication/session/new?api_key=${getApiKey()}&request_token=${requestToken}`)
  showResponse(response)
}

async function setFav(media_type, media_id, favorite) {
  const response = await apiPost(`${getHost()}/3/account/${getUsername()}/favorite?api_key=${getApiKey()}&session_id=${sessionId}`, { media_type, media_id, favorite })
  showResponse(response)
}

async function getLists() {
  const response = await apiGet(`${getHost()}/3/account/${getUsername()}/lists?api_key=${getApiKey()}&session_id=${sessionId}`)
  showResponse(response)
}

async function getList(id) {
  const response = await apiGet(`${getHost()}/3/list/${id}?api_key=${getApiKey()}&session_id=${sessionId}`)
  showResponse(response)
}

async function setList(name, description) {
  const response = await apiPost(`${getHost()}/3/list?api_key=${getApiKey()}&session_id=${sessionId}`, { name, description, language: 'en' })
  showResponse(response)
}

async function setListItem(list, media_id) {
  const response = await apiPost(`${getHost()}/3/list/${list}/add_item?api_key=${getApiKey()}&session_id=${sessionId}`, { media_id })
  showResponse(response)
}

async function getFavs(type) {
  const response = await apiGet(`${getHost()}/3/account/${getUsername()}/favorite/${type}?api_key=${getApiKey()}&session_id=${sessionId}`)
  showResponse(response)
}

export async function searchTitle(term, page) {
  const url = new URL(`${getHost()}/3/search/multi`)
  url.searchParams.append('api_key', getApiKey())
  url.searchParams.append('language', getLangLoc())
  url.searchParams.append('query', term)
  url.searchParams.append('page', page)
  url.searchParams.append('include_adult', false)
  return await apiGet(url)
}

export async function searchMovie(term, page) {
  const url = new URL(`${getHost()}/3/search/movie`)
  url.searchParams.append('api_key', getApiKey())
  url.searchParams.append('language', getLangLoc())
  url.searchParams.append('query', removeParentheses(term))
  url.searchParams.append('page', page)
  url.searchParams.append('include_adult', false)
  return await apiGet(url)
}

export async function searchTv(term, page) {
  const url = new URL(`${getHost()}/3/search/tv`)
  url.searchParams.append('api_key', getApiKey())
  url.searchParams.append('language', getLangLoc())
  url.searchParams.append('query', removeParentheses(term))
  url.searchParams.append('page', page)
  url.searchParams.append('include_adult', false)
  return await apiGet(url)
}

export async function getSeason(series, season) {
  const url = new URL(`${getHost()}/3/tv/${series}/season/${season}`)
  url.searchParams.append('api_key', getApiKey())
  url.searchParams.append('language', getLangLoc())
  return await apiGet(url)
}

export async function getEpisode(series, season, episode) {
  const url = new URL(`${getHost()}/3/tv/${series}/season/${season}/episode/${episode}`)
  url.searchParams.append('api_key', getApiKey())
  url.searchParams.append('language', getLangLoc())
  return await apiGet(url)
}

export async function getTrendingTitles(time, page) {
  const url = new URL(`${getHost()}/3/trending/all/${time}`)
  url.searchParams.append('api_key', getApiKey())
  url.searchParams.append('language', getLangLoc())
  url.searchParams.append('page', page)
  url.searchParams.append('include_adult', false)
  return await apiGet(url)
}

export async function getDiscoveryTitles(media_type, page) {
  const url = new URL(`${getHost()}/3/discover/${media_type}`)
  url.searchParams.append('api_key', getApiKey())
  url.searchParams.append('language', getLangLoc())
  url.searchParams.append('sort_by', 'popularity.desc')
  url.searchParams.append('include_adult', false)
  url.searchParams.append('include_video', false)
  url.searchParams.append('page', page)
  url.searchParams.append('watch_region', getLoc())
  url.searchParams.append('with_watch_monetization_types', 'flatrate')
  return await apiGet(url)
}

export async function getRecommendedTitles(id, media_type, page) {
  const url = new URL(`${getHost()}/3/${media_type}/${id}/recommendations`)
  url.searchParams.append('api_key', getApiKey())
  url.searchParams.append('language', getLangLoc())
  url.searchParams.append('page', page)
  url.searchParams.append('include_adult', false)
  return await apiGet(url)
}

export async function getTitleDetails(id, media_type) {
  const url = new URL(`${getHost()}/3/${media_type}/${id}`)
  url.searchParams.append('api_key', getApiKey())
  url.searchParams.append('language', getLangLoc())
  url.searchParams.append('append_to_response', 'credits,watch/providers,genres,release_dates,content_ratings')
  return await apiGet(url)
}
