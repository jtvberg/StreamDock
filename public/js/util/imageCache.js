// store image as Blob in IndexedDB
export async function cacheImage(url, key) {
  const db = await openDB()
  const response = await fetch(url)
  if (!response.ok) return
  const blob = await response.blob()
  const tx = db.transaction('images', 'readwrite')
  tx.objectStore('images').put(blob, key)
  await tx.complete
  db.close()
}

// retrieve image Blob URL from IndexedDB
export async function getCachedImage(key) {
  const db = await openDB()
  const tx = db.transaction('images', 'readonly')
  const store = tx.objectStore('images')
  const request = store.get(key)
  db.close()
  return new Promise((resolve) => {
    request.onsuccess = () => {
      const blob = request.result
      if (blob instanceof Blob) {
        resolve(URL.createObjectURL(blob))
      } else {
        resolve(null)
      }
    }
    request.onerror = () => resolve(null)
  })
}

// open (or create) the IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('image-cache', 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('images')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}