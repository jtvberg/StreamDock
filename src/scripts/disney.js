// Disney observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsDpRecap = null

// Skip/close Disney episode recap & intros
function dpRecapSkip(bv) {
  bv.webContents.executeJavaScript(`${dpRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsDpRecap = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${dpRecapSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${dpRecapSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function dpRecapSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${dpRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// Disney recap skip click
function dpRecapSkipClick() {
  try {
    if (document.querySelector('.skip__button') != undefined) {
      document.querySelector('.skip__button').click()
      console.log('recap skip')
    }
  } catch(err) { console.error(err) }
}

// Disney recap skip mutation observer
function dpRecapSkipMut() {
  try {
    console.log('recap mut')
    obsDpRecap = new MutationObserver(() => {
      dpRecapSkipClick()
    })
  } catch(err) { console.error(err) }
}

// Disney recap skip observer invocation
function dpRecapSkipObs() {
  try {
    console.log('recap obs')
    obsDpRecap.observe(document.querySelector('.hudson-container'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Disney recap skip observer disconnection
function dpRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsDpRecap !== 'undefined') {
      obsDpRecap.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

// Disney observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsDpNext = null

// Automatically start next Disney episode
function dpEpisodeNext(bv) {
  bv.webContents.executeJavaScript(`${dpEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsDpNext = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${dpEpisodeNextMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${dpEpisodeNextObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function dpEpisodeNextRem(bv) {
  bv.webContents.executeJavaScript(`(${dpEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
}

// Disney next episode click
function dpEpisodeNextClick() {
  try {
    if (document.querySelectorAll('[data-testid = "up-next-play-button"]')[0] != undefined) {
      document.querySelectorAll('[data-testid = "up-next-play-button"]')[0].click()
      console.log('next episode')
    }
  } catch(err) { console.error(err) }
}

// Disney next episode mutation observer
function dpEpisodeNextMut() {
  try {
    console.log('next mut')
    obsDpNext = new MutationObserver(() => {
      dpEpisodeNextClick()
    })
  } catch(err) { console.error(err) }
}

// Disney next episode observer invocation
function dpEpisodeNextObs() {
  try {
    console.log('next obs')
    obsDpNext.observe(document.querySelector('.hudson-container'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Disney next episode observer disconnection
function dpEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsDpNext !== 'undefined') {
      obsDpNext.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

module.exports = {
  dpRecapSkip,
  dpRecapSkipRem,
  dpEpisodeNext,
  dpEpisodeNextRem
}
