// Hulu observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsHlRecapSkip = null

// Hulu recap & credits script injection
function hlRecapSkip(bv) {
  bv.webContents.executeJavaScript(`${hlRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsHlRecapSkip = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${hlRecapSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${hlRecapSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function hlRecapSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${hlRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// Hulu skip click
function hlRecapSkipClick() {
  try {
    console.log('skip recap')
    if (document.querySelector('.SkipButton__button') != undefined) {
      document.querySelector('.SkipButton__button').click()
    }
  } catch(err) { console.error(err) }
}

// Hulu skip mutation observer
function hlRecapSkipMut() {
  try {
    console.log('skip mut')
    obsHlRecapSkip = new MutationObserver(() => {
      hlRecapSkipClick()
    })
  } catch (err) { console.error(err) }
}

// Hulu skip observer invocation
function hlRecapSkipObs() {
  try {
    console.log('skip obs')
    obsHlRecapSkip.observe(document.querySelector('.SkipButton').parentElement, { attributes: true, attributeFilter: ['style'] })
  } catch (err) { console.error(err) }
}

// Hulu skip observer disconnect
function hlRecapSkipDis() {
  try {
    console.log('skip dis')
    if (typeof obsHlRecapSkip !== 'undefined') {
      obsHlRecapSkip.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

// Hulu dummy declarations (this is not actually used as it is sent over as a string!)
let obsHlNext = null
let obsHlNextImp = null
let obsHlNextBool = true

// Automatically start next Hulu episode
function hlEpisodeNext(bv) {
  bv.webContents.executeJavaScript('let obsHlNextBool = true')
  bv.webContents.executeJavaScript(`${hlEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsHlNext = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${hlEpisodeNextMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`${hlEpisodeNextObs.toString()}`))
    .catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsHlNextImp = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${hlEpisodeNextImpMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${hlEpisodeNextImpObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function hlEpisodeNextRem(bv) {
  bv.webContents.executeJavaScript(`(${hlEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
}

// Hulu next episode click
function hlEpisodeNextClick() {
  try {
    console.log('next episode')
    if (document.querySelector('.EndCardButton').closest('.ControlsContainer__transition').style.visibility === 'visible') {
      document.querySelector('.EndCardButton').click()
    }
  } catch(err) { console.error(err) }
}

// Hulu next episode implementation mutation observer
function hlEpisodeNextImpMut() {
  try {
    console.log('imp mut')
    obsHlNextImp = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains('PlayerMetadata')) {
              setTimeout(hlEpisodeNextObs, 3000)
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Hulu next episode implementation observer invocation
function hlEpisodeNextImpObs() {
  try {
    console.log('imp obs')
    obsHlNextImp.observe(document.querySelector('.ControlsContainer'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Hulu next episode mutation observer
function hlEpisodeNextMut() {
  try {
    console.log('next mut')
    obsHlNext = new MutationObserver(() => {
      hlEpisodeNextClick()
    })
  } catch(err) { console.error(err) }
}

// Hulu next episode observer invocation
function hlEpisodeNextObs() {
  try {
    if (obsHlNextBool) {
      console.log('next obs')
      obsHlNext.observe(document.querySelector('.EndCardButton').closest('.ControlsContainer__transition'), { attributes: true })
      obsHlNextBool = false
    }
  } catch (err) { console.error(err) }
}

// Hulu next episode observer disconnection
function hlEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsHlNext !== 'undefined') {
      obsHlNext.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

module.exports = {
  hlRecapSkip,
  hlRecapSkipRem,
  hlEpisodeNext,
  hlEpisodeNextRem
}