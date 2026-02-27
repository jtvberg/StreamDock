
class Stream {
  constructor(active, glyph, title, url, color, bgColor, order = 1) {
    this.active = active,
    this.glyph = glyph,
    this.title = title,
    this.url = url,
    this.color = color,
    this.bgColor = bgColor,
    this.order = order,
    this.id = getNewStreamId()
  }
  // validate URL
  // update all elements
}

export const getStreams = defaults => {
  const streams = [
    new Stream(
      true,
      'Y',
      'YouTube',
      'https://www.youtube.com',
      '#ff0000',
      '#ffffff',
      1
    ),
    new Stream(
      true,
      'T',
      'YouTube TV',
      'https://tv.youtube.com',
      '#ff0000',
      '#ffffff',
      2
    ),
    new Stream(
      true,
      'N',
      'Netflix',
      'https://www.netflix.com',
      '#db272e',
      '#000000',
      3
    ),
    new Stream(
      true,
      'H',
      'Hulu',
      'https://www.hulu.com',
      '#ffffff',
      '#1ce783',
      4
    ),
    new Stream(
      true,
      'P',
      'Prime Video',
      'https://www.amazon.com/gp/video/storefront',
      '#ffffff',
      '#00aee4',
      5
    ),
    new Stream(
      true,
      'D',
      'Disney+',
      'https://www.disneyplus.com/home',
      '#ffffff',
      '#1a3676',
      6
    ),
    new Stream(
      true,
      'T',
      'Apple TV+',
      'https://tv.apple.com/',
      '#ffffff',
      '#000000',
      7
    ),
    new Stream(
      true,
      'P',
      'Peacock',
      'https://www.peacocktv.com/watch/home',
      '#000000',
      '#ffffff',
      8
    ),
    new Stream(
      true,
      'A',
      'ABC',
      'https://abc.com',
      '#ffffff',
      '#000000',
      9
    ),
    new Stream(
      true,
      'P',
      'Paramount+',
      'https://www.paramountplus.com/',
      '#0066ff',
      '#ffffff',
      10
    ),
    new Stream(
      true,
      'M',
      'Max',
      'https://play.max.com',
      '#ffffff',
      '#0000f2',
      11
    ),
    new Stream(
      true,
      'U',
      'Tubi',
      'https://tubitv.com/home',
      '#ff1b77',
      '#000000',
      12
    ),
    new Stream(
      true,
      'E',
      'ESPN+',
      'https://plus.espn.com',
      '#000000',
      '#ffaf00',
      13
    ),
    new Stream(
      true,
      'C',
      'Crunchyroll',
      'https://beta.crunchyroll.com/',
      '#ff5202',
      '#ffffff',
      15
    ),
    new Stream(
      true,
      'P',
      'Plex',
      'https://app.plex.tv/desktop/#!/',
      '#e5a00f',
      '#000000',
      16
    ),
    new Stream(
      true,
      'S',
      'Spotify',
      'https://open.spotify.com',
      '#1ed760',
      '#000000',
      17
    )
  ]
  return defaults ? streams : JSON.parse(localStorage.getItem('streams')) || streams
}

export const setStreams = streams => localStorage.setItem('streams', JSON.stringify(streams))

class Pref {
  constructor(id, category, type, label, description, defaults, live) {
    this.id = id,
    this.category = category,
    this.type = type,
    this.label = label,
    this.description = description,
    this.defaults = defaults,
    this.live = live
  }
  state() {
    localStorage.getItem(this.id) ? null : this.update(this.defaults)
    return JSON.parse(localStorage.getItem(this.id))
  }
  update(change) { localStorage.setItem(this.id, JSON.stringify(change)) }
}

export const getPrefs = () => {
  const prefs = [
    new Pref(
      'pref-window',
      'prefs',
      'checkbox',
      'Remember Window Location',
      'Check to maintain last window size and location from previous session',
      true,
      true
    ),
    new Pref(
      'pref-last',
      'prefs',
      'checkbox',
      'Remember Last Stream',
      'Check to load the last stream from previous session',
      true,
      true
    ),
    new Pref(
      'pref-resume',
      'prefs',
      'checkbox',
      'Auto-play on Restore',
      'Check to enable auto-playback when restored from tray',
      true,
      true
    ),
    new Pref(
      'pref-fullscreen',
      'prefs',
      'checkbox',
      'Allow Fullscreen',
      'Check to allow fullscreen (leave off to fullscreen stream to window)',
      false,
      true
    ),
    new Pref(
      'pref-agent',
      'advanced',
      'text',
      'User Agent',
      'Override User Agent',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      true
    ),
    new Pref(
      'search-show',
      'search',
      'checkbox',
      'Show Search',
      'Show search panel in homescreen',
      false,
      true
    ),
    new Pref(
      'search-api',
      'search',
      'text',
      'Search API Key',
      'Enter the search v3 API key (obtain one <a href="https://www.themoviedb.org/login" target="_blank" title="https://www.themoviedb.org/login" rel="noopener noreferrer">here</a>)',
      '',
      true
    ),
    new Pref(
      'search-loc',
      'search',
      'select',
      'Search Location',
      'Select location for provider search',
      'US',
      true
    ),
    new Pref(
      'library-show',
      'library',
      'checkbox',
      'Show Library',
      'Show library panel in homescreen',
      false,
      true
    ),
    new Pref(
      'library-scan',
      'library',
      'checkbox',
      'Automatic Scan',
      'Automatically scan library for new content on startup',
      false,
      true
    ),
    new Pref(
      'library-meta',
      'library',
      'checkbox',
      'Fetch Metadata',
      'Attempt to get metadata from TMDB for library content (API key required)',
      false,
      true
    ),
    new Pref(
      'library-cache',
      'library',
      'checkbox',
      'Cache Poster & Backdrop Images',
      'Cache poster & backdrop images from TMDB for library content (API key required)',
      false,
      true
    ),
    new Pref(
      'library-external',
      'library',
      'checkbox',
      'Open Video in External Player',
      'Attempt to open videos in external player (if available)',
      false,
      true
    ),    
    new Pref(
      'service-ad',
      'service',
      'checkbox',
      'Skip and Dismiss Ads',
      'Check to automatically skip or dismiss ads when possible (YouTube only)',
      true,
      true
    ),
    new Pref(
      'service-rs',
      'service',
      'checkbox',
      'Skip Episode Recaps',
      'Check to automatically skip recaps and intros (also starts next episode on Disney+)',
      true,
      true
    ),
    new Pref(
      'service-bm',
      'service',
      'checkbox',
      'Binge Mode',
      'Check to automatically start the next episode',
      true,
      true
    ),
    new Pref(
      'service-ps',
      'service',
      'checkbox',
      'Skip Previews',
      'Check to automatically skip previews (Amazon Prime Video only)',
      true,
      true
    ),
    new Pref(
      'back-btn',
      'prefs-show',
      'checkbox',
      'Back Button',
      'Hide Back Button App Control in Header',
      false,
      true
    ),
    new Pref(
      'link-btn',
      'prefs-show',
      'checkbox',
      'Open Copied Link Button',
      'Hide Copied Link Button App Control in Header',
      false,
      true
    ),
    new Pref(
      'newin-btn',
      'prefs-show',
      'checkbox',
      'Open in New Window Button',
      'Hide New Window Button App Control in Header',
      false,
      true
    ),
    new Pref(
      'scaleh-btn',
      'prefs-show',
      'checkbox',
      'Scale Height Button',
      'Hide Scale Height Button App Control in Header',
      false,
      true
    ),
    new Pref(
      'scalew-btn',
      'prefs-show',
      'checkbox',
      'Scale Width Button',
      'Hide Scale Width Button App Control in Header',
      false,
      true
    ),
    new Pref(
      'constrain-btn',
      'prefs-show',
      'checkbox',
      'Aspect Ratio Lock Button',
      'Hide Aspect Ratio Lock Button App Control in Header',
      false,
      true
    ),
    new Pref(
      'ontop-btn',
      'prefs-show',
      'checkbox',
      'Lock Window On Top Button',
      'Hide Lock Window On Top Button App Control in Header',
      false,
      true
    )
  ]
  return prefs
}

export const getLastStream = () => localStorage.getItem('last-stream') || getStreams()[0].url

export const setLastStream = url => localStorage.setItem('last-stream', url)

export const getWinBounds = () => JSON.parse(localStorage.getItem('bounds'))

export const setWinBounds = bounds => localStorage.setItem('bounds', JSON.stringify(bounds))

export const getWinLock = () => localStorage.getItem('ontop-lock')

export const setWinLock = bool => localStorage.setItem('ontop-lock', bool)

export const getWinRatio = () => localStorage.getItem('ratio-lock')

export const setWinRatio = bool => localStorage.setItem('ratio-lock', bool)

export const setVideoPaused = bool => localStorage.setItem('video-paused', bool)

export const getNewStreamId = () => Date.now().toString(36) + Math.random().toString(36).substring(2)