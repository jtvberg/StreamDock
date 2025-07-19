// Imports
import { getCleanTitle, getCleanHost, elementAddFlash, elementFromHtml, copyLink } from "./util/helpers.js"

// Element references
const $homeBtn = document.querySelector('#home-btn')
const $bookmarkBtn = document.querySelector('#bookmark-btn')
const $bookmarks = document.querySelector('#bookmarks')
const $bookmarkList = document.querySelector('#bookmark-list')
const $bookmarkListBtn = document.querySelector('#bookmark-list-btn')
const $bookmarkSortOldBtn = document.querySelector('#bookmark-sort-old-btn')
const $bookmarkSortNewBtn = document.querySelector('#bookmark-sort-new-btn')
const $bookmarkSortTitleBtn = document.querySelector('#bookmark-sort-title-btn')
const $bookmarkSortHostBtn = document.querySelector('#bookmark-sort-host-btn')
const $bookmarkNewLinkBtn = document.querySelector('#bookmark-newlink-btn')

// create a bookmark tile
const createBookmarkTile = bookmarkObj => {
  const cleanTitle = getCleanTitle(bookmarkObj.title)
  const frag = document.createDocumentFragment()
  const bookmark = elementFromHtml(`<div class="bookmark-instance" data-ts="${bookmarkObj.timestamp}" title="${cleanTitle}"></div>`)
  const image = elementFromHtml(`<img class="bookmark-image" src="${bookmarkObj.img}">`)
  const deleteBtn = elementFromHtml(`<div class="fas fa-xmark bookmark-delete"></div>`)
  deleteBtn.addEventListener('click', e => {
    e.stopImmediatePropagation()
    deleteBookmark(bookmarkObj.timestamp)
  })
  const linkBtn = elementFromHtml(`<div class="fas fa-link bookmark-link"></div>`)
  linkBtn.addEventListener('click', e => {
    e.stopImmediatePropagation()
    copyLink(e, bookmarkObj.url)
  })
  const title = elementFromHtml(`<div class="bookmark-title">${cleanTitle}</div>`)
  bookmark.appendChild(image)
  bookmark.appendChild(deleteBtn)
  bookmark.appendChild(linkBtn)
  bookmark.appendChild(title)
  bookmark.addEventListener('click', () => window.electronAPI.openUrl(bookmarkObj.url))
  frag.appendChild(bookmark)
  return frag
}

// create a boookmark list item
const createBookmarkListItem = bookmarkObj => {
  const cleanTitle = getCleanTitle(bookmarkObj.title)
  const frag = document.createDocumentFragment()
  const bookmarkListItem = elementFromHtml(`<div class="bookmark-row" data-ts="${bookmarkObj.timestamp}" title="${cleanTitle}"></div>`)
  const bookmarkListTitle = elementFromHtml(`<div class="bookmark-cell">${cleanTitle}</div>`)
  const bookmarkListHost = elementFromHtml(`<div class="bookmark-cell">${getCleanHost(bookmarkObj.url)}</div>`)
  const bookmarkListTime = elementFromHtml(`<div class="bookmark-cell bookmark-cell-right">${new Date(bookmarkObj.timestamp).toLocaleString()}</div>`)
  const bookmarkListLink = elementFromHtml(`<div class="fas fa-link bookmark-cell-link"></div>`)
  const bookmarkListDelete = elementFromHtml(`<div class="fas fa-xmark bookmark-cell-delete"></div>`)
  bookmarkListItem.appendChild(bookmarkListTitle)
  bookmarkListItem.appendChild(bookmarkListHost)
  bookmarkListItem.appendChild(bookmarkListTime)
  bookmarkListItem.appendChild(bookmarkListLink)
  bookmarkListItem.appendChild(bookmarkListDelete)
  bookmarkListItem.addEventListener('click', () => window.electronAPI.openUrl(bookmarkObj.url))
  bookmarkListLink.addEventListener('click', e => {
    e.stopImmediatePropagation()
    copyLink(e, bookmarkObj.url, true)
  })
  bookmarkListDelete.addEventListener('click', e => {
    e.stopImmediatePropagation()
    deleteBookmark(bookmarkObj.timestamp)
  })
  frag.appendChild(bookmarkListItem)
  return frag
}

// toggle bookmark list view
const bookmarkListView = () => {
  if ($bookmarkListBtn.classList.contains('toggled-bg')) {
    $bookmarkListBtn.classList.remove('toggled-bg')
    $bookmarks.style.display = ''
    $bookmarkList.style.display = ''
  } else {
    $bookmarkListBtn.classList.add('toggled-bg')
    $bookmarks.style.display = 'none'
    $bookmarkList.style.display = 'flex'
  }
}

// add bookmark to UI and local storage
const addBookmark = bookmarkObj => {
  $bookmarks.appendChild(createBookmarkTile(bookmarkObj))
  $bookmarkList.appendChild(createBookmarkListItem(bookmarkObj))
  elementAddFlash($homeBtn)
  const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || []
  bookmarks.push(bookmarkObj)
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
  // console.log('Bookmark Added')
}

// delete bookmark by timestamp
const deleteBookmark = timestamp => {
  document.querySelectorAll('.bookmark-instance, .bookmark-row').forEach(bm => {
    if (bm.dataset.ts == timestamp) {
      bm.classList.add('element-fadeout')
      setTimeout(() => {
        bm.remove()
      }, 300)
    }
  })
  const bookmarks = JSON.parse(localStorage.getItem('bookmarks'))
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks.filter(bm => bm.timestamp !== timestamp)))
  // console.log('Bookmark Deleted')
}

// get bookmarks from local storage
const getBookmarks = () => {
  const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || []
  loadBookmarks(bookmarks)
}

// load bookmarks from array
const loadBookmarks = bookmarks => {
  const fragTiles = document.createDocumentFragment()
  const fragList = document.createDocumentFragment()
  bookmarks.forEach(bm => {
    fragTiles.appendChild(createBookmarkTile(bm))
    fragList.appendChild(createBookmarkListItem(bm))
  })
  $bookmarks.appendChild(fragTiles)
  $bookmarkList.appendChild(fragList)
}

// sort bookmarks by order param
const sortBookmarks = order => {
  const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || []
  switch (order) {
    case 'old':
      // sort boomarks by timestamp ascending
      bookmarks.sort((a, b) => a.timestamp - b.timestamp)
      break
    case 'new':
      // sort boomarks by timestamp descending
      bookmarks.sort((a, b) => b.timestamp - a.timestamp)
      break
    case 'title':
      // sort boomarks by title ascending
      bookmarks.sort((a, b) => getCleanTitle(a.title) < getCleanTitle(b.title) ? -1 : 1)
      break
    case 'host':
      // sort boomarks by host ascending
      bookmarks.sort((a, b) => getCleanHost(a.url) < getCleanHost(b.url) ? -1 : 1)
      break
    default:
      bookmarks.sort((a, b) => a.timestamp - b.timestamp)
      break
  }
  $bookmarks.replaceChildren([])
  $bookmarkList.replaceChildren([])
  loadBookmarks(bookmarks)
}

$bookmarkNewLinkBtn.addEventListener('click', async () => window.electronAPI.urlToBookmark(`${await navigator.clipboard.readText()}`))

$bookmarkBtn.addEventListener('click', window.electronAPI.createBookmark)

$bookmarkListBtn.addEventListener('click', bookmarkListView)

$bookmarkSortOldBtn.addEventListener('click', () => sortBookmarks('old'))

$bookmarkSortNewBtn.addEventListener('click', () => sortBookmarks('new'))

$bookmarkSortHostBtn.addEventListener('click', () => sortBookmarks('host'))

$bookmarkSortTitleBtn.addEventListener('click', () => sortBookmarks('title'))

window.electronAPI.sendBookmark((e, bookmarkObj) => addBookmark(bookmarkObj))

// Setup
getBookmarks()