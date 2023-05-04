// HBO observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsHmRecap = null

// Skip/close HBO episode recap & intros
function hmRecapSkip(bv) {
  bv.webContents.executeJavaScript(`${hmRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsHmRecap = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${hmRecapSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${hmRecapSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function hmRecapSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${hmRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// HBO recap skip click
function hmRecapSkipClick() {
  try {
    console.log('recap episode')
    if (document.querySelector('[data-testid="SkipButton"]') != undefined) {
      document.querySelector('[data-testid="SkipButton"]').click()
    }
  } catch(err) { console.error(err) }
}

// HBO recap skip mutation observer
function hmRecapSkipMut() {
  try {
    console.log('recap mut')
    obsHmRecap = new MutationObserver(() => {
      hmRecapSkipClick()
    })
  } catch(err) { console.error(err) }
}

// HBO recap skip observer invocation
function hmRecapSkipObs() {
  try {
    console.log('recap obs')
    obsHmRecap.observe(document.querySelector('#root'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// HBO recap skip observer disconnection
function hmRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsHmRecap !== 'undefined') {
      obsHmRecap.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

// HBO observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsHmNext = null

// Automatically start next HBO episode
function hmEpisodeNext(bv) {
  bv.webContents.executeJavaScript(`${hmEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsHmNext = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${hmEpisodeNextMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${hmEpisodeNextObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function hmEpisodeNextRem(bv) {
  bv.webContents.executeJavaScript(`(${hmEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
}

// HBO next episode click
function hmEpisodeNextClick() {
  try {
    console.log('next episode')
    if (document.querySelector('[data-testid="UpNextButton"]') != undefined) {
      document.querySelector('[data-testid="UpNextButton"]').click()
    }
  } catch(err) { console.error(err) }
}

// HBO next episode mutation observer
function hmEpisodeNextMut() {
  try {
    console.log('next mut')
    obsHmNext = new MutationObserver(() => {
      hmEpisodeNextClick()
    })
  } catch(err) { console.error(err) }
}

// HBO next episode observer invocation
function hmEpisodeNextObs() {
  try {
    console.log('next obs')
    obsHmNext.observe(document.querySelector('#root'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// HBO next episode observer disconnection
function hmEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsHmNext !== 'undefined') {
      obsHmNext.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

module.exports = {
  hmRecapSkip,
  hmRecapSkipRem,
  hmEpisodeNext,
  hmEpisodeNextRem
}
