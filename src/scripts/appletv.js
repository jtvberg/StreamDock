// Apple TV observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsAtRecap = null

// Skip/close Apple TV episode recap & intros
function atRecapSkip(bv) {
  bv.webContents.executeJavaScript(`${atRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsAtRecap = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${atRecapSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${atRecapSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function atRecapSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${atRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// Apple TV recap skip click
function atRecapSkipClick() {
  try {
    if (document.querySelector('.skip-intro__button') != undefined) {
      document.querySelector('.skip-intro__button').click()
      console.log('recap skip')
    }
  } catch(err) { console.error(err) }
}

// Apple TV recap skip mutation observer
function atRecapSkipMut() {
  try {
    console.log('recap mut')
    obsAtRecap = new MutationObserver((ml) => {
      console.log(ml)
      for (const mut of ml) {
        if (mut.type === 'childList') {
          for (const an of mut.addedNodes) {
            if (an.classList?.contains('skip-intro__container')) {
              atRecapSkipClick()
            }
          }
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Apple TV recap skip observer invocation
function atRecapSkipObs() {
  try {
    console.log('recap obs')
    obsAtRecap.observe(document.querySelector('#video-player-ember8'), { childList: true })
  } catch (err) { console.error(err) }
}

// Apple TV recap skip observer disconnection
function atRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsAtRecap !== 'undefined') {
      obsAtRecap.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

// Apple TV observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsAtNext = null

// Automatically start next Apple TV episode
function atEpisodeNext(bv) {
  bv.webContents.executeJavaScript(`${atEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsAtNext = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${atEpisodeNextMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${atEpisodeNextObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function atEpisodeNextRem(bv) {
  bv.webContents.executeJavaScript(`(${atEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
}

// Apple TV next episode click
function atEpisodeNextClick() {
  try {
    if (document.querySelector('.post-play__cta-button') != undefined) {
      document.querySelector('.post-play__cta-button').click()
      console.log('next episode')
    }
  } catch(err) { console.error(err) }
}

// Apple TV next episode mutation observer
function atEpisodeNextMut() {
  try {
    console.log('next mut')
    obsAtNext = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes[0]?.classList?.contains('playback-modal__blur')) {
          atEpisodeNextClick()
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Apple TV next episode observer invocation
function atEpisodeNextObs() {
  try {
    console.log('next obs')
    obsAtNext.observe(document.querySelector('.playback-modal'), { childList: true })
  } catch (err) { console.error(err) }
}

// Apple TV next episode observer disconnection
function atEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsAtNext !== 'undefined') {
      obsAtNext.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

module.exports = {
  atRecapSkip,
  atRecapSkipRem,
  atEpisodeNext,
  atEpisodeNextRem
}
