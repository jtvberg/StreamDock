import { getPrefs } from "./settings.js"

let requestToken = ''
let sessionId = ''

function getHost() {
  return 'https://api.themoviedb.org'
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

async function apiGet(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      dataType: 'json',
      headers: { 'Content-Type': 'application/json' }
    })
    if (response?.ok) {
      return await response.json()
    }
    else {
      return 0
    }
  } catch (err) { return 0 }
}

async function apiPost(url, body) {
  try {
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
      return 0
    }
  } catch (err) { return 0 }
}

async function getRequestToken() {
  const response = await apiGet(`${apiHost}/3/authentication/token/new?api_key=${getApiKey()}`)
  showResponse(response)
}

async function validateRequestToken() {
  const response = await apiPost(`${apiHost}/3/authentication/token/validate_with_login?api_key=${getApiKey()}`, { username: getUsername(), password: getPassword(), request_token: requestToken })
  showResponse(response)
}

async function getSessionId() {
  const response = await apiGet(`${apiHost}/3/authentication/session/new?api_key=${getApiKey()}&request_token=${requestToken}`)
  showResponse(response)
}

async function setFav(media_type, media_id, favorite) {
  const response = await apiPost(`${apiHost}/3/account/${getUsername()}/favorite?api_key=${getApiKey()}&session_id=${sessionId}`, { media_type, media_id, favorite })
  showResponse(response)
}

async function getLists() {
  const response = await apiGet(`${apiHost}/3/account/${getUsername()}/lists?api_key=${getApiKey()}&session_id=${sessionId}`)
  showResponse(response)
}

async function getList(id) {
  const response = await apiGet(`${apiHost}/3/list/${id}?api_key=${getApiKey()}&session_id=${sessionId}`)
  showResponse(response)
}

async function setList(name, description) {
  const response = await apiPost(`${apiHost}/3/list?api_key=${getApiKey()}&session_id=${sessionId}`, { name, description, language: 'en' })
  showResponse(response)
}

async function setListItem(list, media_id) {
  const response = await apiPost(`${apiHost}/3/list/${list}/add_item?api_key=${getApiKey()}&session_id=${sessionId}`, { media_id })
  showResponse(response)
}

async function getFavs(type) {
  const response = await apiGet(`${apiHost}/3/account/${getUsername()}/favorite/${type}?api_key=${getApiKey()}&session_id=${sessionId}`)
  showResponse(response)
}

export async function searchTitle(term, page) {
  return await apiGet(`${getHost()}/3/search/multi?api_key=${getApiKey()}&language=${getLangLoc()}&query=${encodeURIComponent(term)}&page=${page}&include_adult=false`)
}

export async function getTrendingTitles(time, page) {
  return await apiGet(`${getHost()}/3/trending/all/${time}?api_key=${getApiKey()}&language=${getLangLoc()}&page=${page}&include_adult=false`)
}

export async function getDiscoveryTitles(media_type, page) {
  return await apiGet(`${getHost()}/3/discover/${media_type}?api_key=${getApiKey()}&language=${getLangLoc()}&sort_by=popularity.desc&include_adult=false&include_video=false&page=${page}&watch_region=${getLoc()}&with_watch_monetization_types=flatrate`)
}

export async function getRecommendedTitles(id, media_type, page) {
  return await apiGet(`${getHost()}/3/${media_type}/${id}/recommendations?api_key=${getApiKey()}&language=${getLangLoc()}&page=${page}&include_adult=false`)
}

export async function getTitleDetails(id, media_type) {
  return await apiGet(`${getHost()}/3/${media_type}/${id}?api_key=${getApiKey()}&append_to_response=credits,watch/providers,genres,release_dates,content_ratings`)
}
