// Paramount observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsCbRecap = null

// Skip/close Paramount episode recap & intros
function cbRecapSkip(bv) {
  bv.webContents.executeJavaScript(`${cbRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsCbRecap = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${cbRecapSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${cbRecapSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function cbRecapSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${cbRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// Paramount recap skip click
function cbRecapSkipClick() {
  try {
    if (document.querySelector('.skip-button') != undefined) {
      document.querySelector('.skip-button').click()
      console.log('recap skip')
    }
  } catch(err) { console.error(err) }
}

// Paramount recap skip mutation observer
function cbRecapSkipMut() {
  try {
    console.log('recap mut')
    obsCbRecap = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'attributes' && mut.target.classList?.contains('skip-button')) {
          cbRecapSkipClick()
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Paramount recap skip observer invocation
function cbRecapSkipObs() {
  try {
    console.log('recap obs')
    obsCbRecap.observe(document.querySelector('#main-container'), { subtree: true, attributes: true, attributeFilter: ['disabled'] })
  } catch (err) { console.error(err) }
}

// Paramount recap skip observer disconnection
function cbRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsCbRecap !== 'undefined') {
      obsCbRecap.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

// Paramount observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsCbNext = null

// Automatically start next Paramount episode
function cbEpisodeNext(bv) {
  bv.webContents.executeJavaScript(`${cbEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsCbNext = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${cbEpisodeNextMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${cbEpisodeNextObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function cbEpisodeNextRem(bv) {
  bv.webContents.executeJavaScript(`(${cbEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
}

// Paramount next episode click
function cbEpisodeNextClick() {
  try {
    if (document.querySelector('.watch-now-btn') != undefined) {
      document.querySelector('.watch-now-btn').click()
      console.log('next episode')
    }
  } catch(err) { console.error(err) }
}

// Paramount next episode mutation observer
function cbEpisodeNextMut() {
  try {
    console.log('next mut')
    obsCbNext = new MutationObserver(() => {
      cbEpisodeNextClick()
    })
  } catch(err) { console.error(err) }
}

// Paramount next episode observer invocation
function cbEpisodeNextObs() {
  try {
    console.log('next obs')
    obsCbNext.observe(document.querySelector('.base-container'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Paramount next episode observer disconnection
function cbEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsCbNext !== 'undefined') {
      obsCbNext.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

module.exports = {
  cbRecapSkip,
  cbRecapSkipRem,
  cbEpisodeNext,
  cbEpisodeNextRem
}
