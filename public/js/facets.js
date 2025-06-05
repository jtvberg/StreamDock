// Imports
import nfFacets from '../res/nffacets.json' with { type: 'json' }

// Constants
const facetsCollapsed = 12
const facetsExpanded = 250

// Element references
const $facetPanel = document.querySelector('#facet-panel')
const $facetHost = document.querySelector('#facet-host')
const $facetTitle = document.querySelector('#facet-title')
const $facetInput = document.querySelector('#facet-input')
const $facetClear = document.querySelector('#facet-clear-btn')

// Vars
let isNetflix = false
let showAllFacets = false
let facetsTimeOut

window.electronAPI.setAccent((e, color) => {
  let root = document.documentElement
  root.style.setProperty('--color-system-accent', color)
  root.style.setProperty('--color-system-accent-trans', color.substring(0, 7) + '80')
})

window.electronAPI.setIsNetflix((e, bool) => {
  isNetflix = bool
  setTitle()
})

const elementFromHtml = html => {
  const template = document.createElement('template')
  template.innerHTML = html.trim()
  return template.content.firstElementChild
}

const expandFacets = () => {
  if (isNetflix) {
    window.electronAPI.winFocus()
    clearTimeout(facetsTimeOut)
    $facetPanel.classList.add('visible')
    window.electronAPI.facetWidth(facetsExpanded)
  }
}

const collapseFacets = () => {
  facetsTimeOut = window.setTimeout(() => {
    $facetPanel.classList.remove('visible')
    window.electronAPI.facetWidth(facetsCollapsed)
  }, 800)
}

const openFacet = (code) => {
  window.electronAPI.openUrl(`https://www.netflix.com/browse/genre/${code}`)
  window.electronAPI.facetWidth(facetsCollapsed)
}

const createFacet = (facet, txt, weight, category) => {
  const fac = elementFromHtml(`<div class="facet" data-code="${facet.Code}"></div>`)
  category ? fac.classList.add('cat') : null
  fac.style.fontWeight = weight
  fac.textContent = txt
  fac.addEventListener('click', () => openFacet(facet.Code))
  return fac
}

const setTitle = () => {
  if (isNetflix) {
    $facetTitle.textContent = 'Netflix Genres'
  }
}

const loadFacets = () => {
  const frag = document.createDocumentFragment()
  nfFacets.forEach(facet => {
    if (showAllFacets) {
      if (facet.Category === 'Genre') {
        frag.appendChild(createFacet(facet, `${facet.Genre}`, 700, true))
      } else {
        frag.appendChild(createFacet(facet, `- ${facet.Genre}`, 200, false))
      }
    } else {
      if (facet.Code !== '0' && facet.Category === 'Genre') {
        frag.appendChild(createFacet(facet, `${facet.Genre}`, 700, true))
      } else if (facet.Code !== '0' && facet.Category !== 'A-Z') {
        frag.appendChild(createFacet(facet, `- ${facet.Genre}`, 200, false))
      }
    }
  })
  $facetHost.appendChild(frag)
}

const filterFacets = () => {
  const filter = $facetInput.value
  $facetHost.childNodes.forEach(facet => {
    if (filter === '' || facet.textContent.toLowerCase().includes(filter.toLowerCase())) {
      facet.style.display = ''
      if (!facet.classList.contains('cat')) {
        let el = facet.previousElementSibling
        while (el) {
          if (el.classList.contains('cat')) {
            el.style.display = ''
            return
          }
          el = el.previousElementSibling
        }
      }
    } else {
      facet.style.display = 'none'
    }
  })
}

loadFacets()
collapseFacets()

$facetPanel.addEventListener('mouseenter', expandFacets)

$facetPanel.addEventListener('mouseleave', collapseFacets)

$facetInput.addEventListener('keyup', filterFacets)

$facetClear.addEventListener('click', () => {
  $facetInput.value = ''
  filterFacets()
})
