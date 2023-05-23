// Peacock observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsPcRecap = null

// Skip/close Peacock episode recap & intros
function pcRecapSkip(bv) {
  bv.webContents.executeJavaScript(`${pcRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsPcRecap = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${pcRecapSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${pcRecapSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function pcRecapSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${pcRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// Peacock recap skip click
function pcRecapSkipClick() {
  try {
    console.log('recap episode')
    if (document.querySelector('.playback-controls__skip--button') != undefined) {
      document.querySelector('.playback-controls__skip--button').click()
    }
  } catch(err) { console.error(err) }
}

// Peacock recap skip mutation observer
function pcRecapSkipMut() {
  try {
    console.log('recap mut')
    obsPcRecap = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes[0]?.classList?.contains('playback-controls__skip--button')) {
          pcRecapSkipClick()
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Peacock recap skip observer invocation
function pcRecapSkipObs() {
  try {
    console.log('recap obs')
    obsPcRecap.observe(document.querySelector('.primary-layout__content'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Peacock recap skip observer disconnection
function pcRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsPcRecap !== 'undefined') {
      obsPcRecap.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

// Peacock observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsPcNext = null

// Automatically start next Peacock episode
function pcEpisodeNext(bv) {
  bv.webContents.executeJavaScript(`${pcEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsPcNext = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${pcEpisodeNextMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${pcEpisodeNextObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function pcEpisodeNextRem(bv) {
  bv.webContents.executeJavaScript(`(${pcEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
}

// Peacock next episode click
function pcEpisodeNextClick() {
  try {
    console.log('next episode')
    if (document.querySelector('.playback-binge__image') != undefined) {
      document.querySelector('.playback-binge__image').click()
    }
  } catch(err) { console.error(err) }
}

// Peacock next episode mutation observer
function pcEpisodeNextMut() {
  try {
    console.log('next mut')
    obsPcNext = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes[0]?.classList?.contains('playback-binge__container')) {
          pcEpisodeNextClick()
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Peacock next episode observer invocation
function pcEpisodeNextObs() {
  try {
    console.log('next obs')
    obsPcNext.observe(document.querySelector('.primary-layout__content'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Peacock next episode observer disconnection
function pcEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsPcNext !== 'undefined') {
      obsPcNext.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

module.exports = {
  pcRecapSkip,
  pcRecapSkipRem,
  pcEpisodeNext,
  pcEpisodeNextRem
}
