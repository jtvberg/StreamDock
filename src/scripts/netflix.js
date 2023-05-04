// Netflix observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsNfSkip = null

// Skip/close Netlfix episode recap & intros
function nfRecapSkip(bv) {
  bv.webContents.executeJavaScript(`${nfRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsNfSkip = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${nfRecapSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${nfRecapSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function nfRecapSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${nfRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// Netflix recap skip click
function nfRecapSkipClick() {
  try {
    console.log('recap skip')
    if (document.querySelector('.watch-video--skip-content-button') != undefined) {
      document.querySelector('.watch-video--skip-content-button').click()
    }
  } catch(err) { console.error(err) }
}

// Netflix recap skip mutation observer
function nfRecapSkipMut() {
  try {
    console.log('recap mut')
    obsNfSkip = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.childNodes) {
              element.childNodes.forEach(childNode => {
                if (childNode.classList && (childNode.classList.contains('watch-video--skip-content') || childNode.classList.contains('watch-video--skip-content-button'))) {
                  nfRecapSkipClick()
                }
              })
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Netflix recap skip observer invocation
function nfRecapSkipObs() {
  try {
    console.log('recap obs')
    obsNfSkip.observe(document.querySelector('#appMountPoint'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Netflix recap skip observer disconnection
function nfRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsNfSkip !== 'undefined') {
      obsNfSkip.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

// Netflix observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsNfNext = null

// Automatically start next Netlfix episode
function nfEpisodeNext(bv) {
  bv.webContents.executeJavaScript(`${nfEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsNfNext = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${nfEpisodeNextMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${nfEpisodeNextObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function nfEpisodeNextRem(bv) {
  bv.webContents.executeJavaScript(`(${nfEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
}

// Netflix next episode click
function nfEpisodeNextClick() {
  try {
    console.log('next episode')
    if (document.querySelector('[data-uia = "next-episode-seamless-button-draining"]') != undefined) {
      document.querySelector('[data-uia = "next-episode-seamless-button-draining"]').click()
    }
    if (document.querySelector('[data-uia = "next-episode-seamless-button"]') != undefined) {
      document.querySelector('[data-uia = "next-episode-seamless-button"]').click()
    }
  } catch(err) { console.error(err) }
}

// Netflix next episode mutation observer
function nfEpisodeNextMut() {
  try {
    console.log('next mut')
    obsNfNext = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains('SeamlessControls--container')) {
              nfEpisodeNextClick()
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Netflix next episode observer invocation
function nfEpisodeNextObs() {
  try {
    console.log('next obs')
    obsNfNext.observe(document.querySelector('#appMountPoint'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Netflix next episode observer disconnection
function nfEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsNfNext !== 'undefined') {
      obsNfNext.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

module.exports = {
  nfRecapSkip,
  nfRecapSkipRem,
  nfEpisodeNext,
  nfEpisodeNextRem
}
