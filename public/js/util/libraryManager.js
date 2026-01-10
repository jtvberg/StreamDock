// library cache
let library = []
let saveTimer = null
let isDirty = false
let metadataCache = null

// initialize from localStorage
export const initLibrary = () => {
  const raw = JSON.parse(localStorage.getItem('library')) || []
  library = raw.map(item => migrateLibraryItem(item))
  return library
}

// migrate legacy library items to current structure
const migrateLibraryItem = (item) => {
  return {
    ...item,
    isUserUpdated: item.isUserUpdated ?? undefined,
    isMetadataLocked: item.isMetadataLocked ?? undefined,
    excludeTitle: item.excludeTitle ?? undefined,
    lastPlayTime: item.lastPlayTime ?? 0,
    metadata: item.metadata || {}
  }
}

// get full library
export const getLibrary = (includeExcluded = false) => {
  if (includeExcluded) {
    return library
  }
  return library.filter(item => item.excludeTitle !== true)
}

// get filtered library by type
export const getLibraryByType = (type, includeExcluded = false) => {
  const filtered = library.filter(item => {
    if (!includeExcluded && item.excludeTitle === true) return false
    if (!type) return true
    return item.type === type
  })
  return filtered
}

// find single item by URL
export const findLibraryItem = (url) => {
  return library.find(item => item.url === url)
}

// find items by directory
export const findLibraryItemsByDir = (dir) => {
  return library.filter(item => item.dir === dir)
}

// create object from library item
export const toSearchResult = (item) => {
  const parenthesesText = item.title ? (item.title.match(/\(([^)]+)\)/) || [])[1] || '' : ''
  const episode = item.type === 'tv' ? ` s${item.season}e${item.episode}` : ''
  const cleanTitle = `${item.metadata?.title || item.metadata?.name || item.title || 'Unknown Title'} ${episode}${parenthesesText ? ` - ${parenthesesText}` : ''}`.trim()
  
  return {
    ...item.metadata,
    title: item.title,
    cleanTitle,
    url: item.url,
    path: item.path,
    isLocal: true,
    lastPlayTime: item.lastPlayTime || 0,
    season: item.season,
    episode: item.episode,
    excludeTitle: item.excludeTitle ?? false,
    manualUpdate: item.manualUpdate ?? false
  }
}

// update single item properties
export const updateLibraryItem = (url, updates) => {
  const item = findLibraryItem(url)
  if (item) {
    Object.assign(item, updates)
    isDirty = true
    scheduleSave()
    return true
  }
  return false
}

// update item metadata only
export const updateLibraryItemMetadata = (url, metadata) => {
  const item = findLibraryItem(url)
  if (item) {
    item.metadata = {
      ...metadata,
      media_type: item.type
    }
    item.releaseYear = getYear(metadata.release_date || metadata.first_air_date)
    item.releaseDate = getDate(metadata.release_date || metadata.first_air_date)
    isDirty = true
    scheduleSave()
    return true
  }
  return false
}

// helper to get year from date
const getYear = (input) => {
  const year = new Date(input).getFullYear()
  return isNaN(year) ? undefined : year
}

// helper to get timestamp from date
const getDate = (input) => {
  const date = new Date(input)
  return isNaN(date) ? undefined : date.getTime()
}

// check if item should skip metadata updates
export const shouldSkipMetadataUpdate = (item) => {
  if (item.manualUpdate === true) return true
  return false
}

// cache locked metadata for a directory
export const cacheLockedMetadata = (dir) => {
  if (!metadataCache) {
    metadataCache = {}
  }
  
  const lockedItems = library.filter(item => 
    item.dir === dir && item.isMetadataLocked === true
  )
  
  lockedItems.forEach(item => {
    metadataCache[item.url] = JSON.parse(JSON.stringify(item))
  })
  
  return metadataCache
}

// restore locked metadata from cache
const restoreLockedMetadataFromCache = (dir) => {
  if (!metadataCache) return

  Object.keys(metadataCache).forEach(url => {
    const cachedItem = metadataCache[url]
    const existingItem = library.find(item => item.url === url)
    
    if (existingItem && cachedItem.dir === dir) {
      existingItem.metadata = cachedItem.metadata
      existingItem.releaseYear = cachedItem.releaseYear
      existingItem.releaseDate = cachedItem.releaseDate
      existingItem.isUserUpdated = cachedItem.isUserUpdated
      existingItem.isMetadataLocked = cachedItem.isMetadataLocked
      existingItem.isHidden = cachedItem.isHidden
      existingItem.lastPlayTime = cachedItem.lastPlayTime
    }
  })

  clearMetadataCache()
  isDirty = true
  scheduleSave()
}

// clear metadata cache
export const clearMetadataCache = () => {
  metadataCache = null
}

// sync directory files with library (add new, remove deleted, fetch metadata for items without it)
export const rescanDirectory = async (dir, newItems, type, fetchMetadata = false, allowCacheRestore = false) => {
  const existingItemsInDir = findLibraryItemsByDir(dir)
  const newUrls = newItems.map(item => item.url)
  const existingUrls = existingItemsInDir.map(item => item.url)
  const urlsToRemove = existingUrls.filter(url => !newUrls.includes(url))
  const hadDeletions = urlsToRemove.length > 0
  
  urlsToRemove.forEach(url => {
    const index = library.findIndex(item => item.url === url)
    if (index > -1) {
      library.splice(index, 1)
      isDirty = true
    }
  })

  // Check against ALL library items, not just this directory
  const allExistingUrls = new Set(library.map(item => item.url))
  const itemsToAdd = newItems.filter(item => !allExistingUrls.has(item.url))
  
  itemsToAdd.forEach(item => {
    library.push({
      ...item,
      dir,
      type,
      metadata: {},
      lastPlayTime: 0
    })
    isDirty = true
  })

  if (isDirty) {
    saveImmediately()
  }

  // restore locked items from cache if flag is set
  if (allowCacheRestore && metadataCache !== null) {
    restoreLockedMetadataFromCache(dir)
  }

  let itemsNeedingMetadata = []
  if (fetchMetadata) {
    itemsNeedingMetadata = findLibraryItemsByDir(dir).filter(item => 
      item.type === type && 
      !shouldSkipMetadataUpdate(item) &&
      (!item.metadata || !item.metadata.id)
    )
  }

  return { itemsNeedingMetadata, hadDeletions }
}

// force reload metadata for all items in directory (except manual)
export const refreshDirectoryMetadata = (dir, type) => {
  const itemsInDir = findLibraryItemsByDir(dir).filter(item => item.type === type)
  itemsInDir.forEach(item => {
    if (item.manualUpdate !== true) {
      item.metadata = {}
      item.releaseYear = undefined
      item.releaseDate = undefined
      isDirty = true
    }
  })

  if (isDirty) {
    saveImmediately()
  }

  return itemsInDir.filter(item => !shouldSkipMetadataUpdate(item))
}

// remove items by filter function and preserver locked metadata if needed
export const removeLibraryItems = (filterer, preserveLocked = false, targetDir = null) => {
  if (preserveLocked && targetDir) {
    cacheLockedMetadata(targetDir)
  }
  
  const before = library.length
  library = library.filter(item => !filterer(item))
  const removed = before - library.length
  // console.log(`removeLibraryItems: removed ${removed} items, library now has ${library.length} items`)
  if (library.length !== before) {
    isDirty = true
    saveImmediately()
  }
  return removed
}

// sort library in-place
export const sortLibrary = (comparer) => {
  library.sort(comparer)
  isDirty = true
  scheduleSave()
}

// toggle exclude flag for item
export const setExcludeTitle = (url, exclude) => {
  const item = findLibraryItem(url)
  if (item) {
    item.excludeTitle = exclude
    isDirty = true
    scheduleSave()
    return true
  }
  return false
}

// set manual metadata flag
export const setManualMetadata = (url, metadata) => {
  const item = findLibraryItem(url)
  if (item) {
    item.metadata = {
      ...metadata,
      media_type: item.type
    }
    item.releaseYear = getYear(metadata.release_date || metadata.first_air_date)
    item.releaseDate = getDate(metadata.release_date || metadata.first_air_date)
    item.manualUpdate = true
    isDirty = true
    saveImmediately()
    return true
  }
  return false
}

// save
const scheduleSave = () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveImmediately, 500)
}

// immediate save
export const saveImmediately = () => {
  if (isDirty) {
    localStorage.setItem('library', JSON.stringify(library))
    isDirty = false
  }
  clearTimeout(saveTimer)
}

// cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', saveImmediately)
}
