// Check if linux as the elements are named differently... nice one AMZ
const isLinux = process.platform === 'linux'

// Track the acutal URL for Amazon Prime videos
function amzGetUrl() {
  try {
    view.webContents.executeJavaScript(`
      console.log('getUrl')
      let sdAmzUrl = '${view.webContents.getURL()}'
      try {
          document.querySelectorAll('.tst-title-card').forEach(function (tile) { tile.dispatchEvent(new MouseEvent('mouseover', { 'bubbles': true })) })
          document.querySelectorAll('.tst-play-button').forEach(function (btn) { btn.addEventListener('click', function () { sdAmzUrl = this.href }) })
        } catch(err) { console.error(err) }
    `)
  } catch(err) { console.error(err) }
}

// Prime observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsAmzUpgrade = null

// Prime dismiss browser upgrade notification (NO LINUX)
function amzUpgradeDismiss(bv) {
  if (!isLinux) {
    bv.webContents.executeJavaScript(`${amzUpgradeDismissClick.toString()}`).catch((err) => { console.error(err) })
    bv.webContents.executeJavaScript('try { let obsAmzUpgrade = null } catch(err) { console.error(err) }')
      .then(() => bv.webContents.executeJavaScript(`(${amzUpgradeDismissMut.toString()})()`))
      .then(() => bv.webContents.executeJavaScript(`(${amzUpgradeDismissObs.toString()})()`))
      .catch((err) => { console.error(err) })
  }
}

// Prime upgrade your browser dismiss click
function amzUpgradeDismissClick() {
  try {
    console.log('upgrade dismiss')
    if (document.querySelector('.f1dk4awg') != undefined) {
      document.querySelector('.f1dk4awg').click()
    }
  } catch(err) { console.error(err) }
}

// Prime upgrade your browser dismiss mutation observer
function amzUpgradeDismissMut() {
  try {
    console.log('upgrade mut')
    obsAmzUpgrade = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains('f1jhb4b3')) {
              amzUpgradeDismissClick()
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Prime upgrade your browser dismiss observer invocation
function amzUpgradeDismissObs() {
  try {
    console.log('upgrade obs')
    obsAmzUpgrade.observe(document.querySelector('.webPlayerUIContainer'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Prime dummy declarations (this is not actually used as it is sent over as a string!)
let obsAmzPreview = null
let eleAmzPreview = null
let obsEleAmzPreview = null

// Skip/close Prime previews
function amzPreviewSkip(bv) {
  eleAmzPreview = 'fu4rd6c'
  obsEleAmzPreview = '.webPlayerUIContainer'
  if (isLinux) {
    eleAmzPreview = 'adSkipButton'
    obsEleAmzPreview = '.bottomPanel'
  }
  bv.webContents.executeJavaScript(`${amzPrevSkipClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('let obsAmzPreview = null')
    .then(() => bv.webContents.executeJavaScript(`let eleAmzPreview = '${eleAmzPreview}'`))
    .then(() => bv.webContents.executeJavaScript(`let obsEleAmzPreview = '${obsEleAmzPreview}'`))
    .then(() => bv.webContents.executeJavaScript(`(${amzPreviewSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${amzPreviewSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function amzPrevewSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${amzPreviewSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// Prime preview skip click
function amzPrevSkipClick(ele) {
  try {
    console.log('prev skip')
    if (document.querySelector(ele) != undefined) {
      document.querySelector(ele).click()
    }
  } catch(err) { console.error(err) }
}

// Prime preview skip mutation observer
function amzPreviewSkipMut() {
  try {
    console.log('prev mut')
    obsAmzPreview = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains(eleAmzPreview)) {
              amzPrevSkipClick(`.${eleAmzPreview}`)
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Prime preview skip observer invocation
function amzPreviewSkipObs() {
  try {
    console.log('prev obs')
    obsAmzPreview.observe(document.querySelector(obsEleAmzPreview), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Prime preview skip observer disconnection
function amzPreviewSkipDis() {
  try {
    console.log('prev dis')
    if (typeof obsAmzPreview !== 'undefined') {
      obsAmzPreview.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

// Prime dummy declarations (this is not actually used as it is sent over as a string!)
let obsAmzRecap = null
let eleAmzRecap = null
let obsEleAmzRecap = null

// Skip/close Prime episode recap & intros
function amzRecapSkip(bv) {
  eleAmzRecap = 'atvwebplayersdk-skipelement-button'
  obsEleAmzRecap = '.webPlayerUIContainer'
  if (isLinux) {
    eleAmzRecap = 'skipElement'
    obsEleAmzRecap = '.notificationsWrapper'
  }
  bv.webContents.executeJavaScript(`${amzRecapSkipClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('let obsAmzRecap = null')
    .then(() => bv.webContents.executeJavaScript(`let eleAmzRecap = '${eleAmzRecap}'`))
    .then(() => bv.webContents.executeJavaScript(`let obsEleAmzRecap = '${obsEleAmzRecap}'`))
    .then(() => bv.webContents.executeJavaScript(`(${amzRecapSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${amzRecapSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function amzRecapSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${amzRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// Prime recap skip click
function amzRecapSkipClick(ele) {
  try {
    console.log('recap skip')
    if (document.querySelector(ele) != undefined) {
      document.querySelector(ele).click()
    }
  } catch(err) { console.error(err) }
}

// Prime recap skip mutation observer
function amzRecapSkipMut() {
  try {
    console.log('recap mut')
    obsAmzRecap = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.addedNodes && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(element => {
            if (element.classList && element.classList.contains(eleAmzRecap)) {
              amzRecapSkipClick(`.${eleAmzRecap}`)
            }
          })
        }
      }
    })
  } catch(err) { console.error(err) }
}

// Prime recap skip observer invocation
function amzRecapSkipObs() {
  try {
    console.log('recap obs')
    obsAmzRecap.observe(document.querySelector(obsEleAmzRecap), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Prime recap skip observer disconnection
function amzRecapSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsAmzRecap !== 'undefined') {
      obsAmzRecap.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

// Prime dummy declarations (this is not actually used as it is sent over as a string!)
let obsAmzNext = null
let eleAmzNext = null
let obsEleAmzNext = null

// Automatically start next Prime episode
function amzEpisodeNext(bv) {
  eleAmzNext = 'atvwebplayersdk-nextupcard-button'
  obsEleAmzNext = '.atvwebplayersdk-nextupcard-wrapper'
  if (isLinux) {
    eleAmzNext = 'nextUpCard'
    obsEleAmzNext = '.notificationsWrapper'
  }
  bv.webContents.executeJavaScript(`${amzEpisodeNextClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('let obsAmzNext = null')
    .then(() => bv.webContents.executeJavaScript(`let eleAmzNext = '${eleAmzNext}'`))
    .then(() => bv.webContents.executeJavaScript(`let obsEleAmzNext = '${obsEleAmzNext}'`))
    .then(() => bv.webContents.executeJavaScript(`(${amzEpisodeNextMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${amzEpisodeNextObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function amzEpisodeNextRem(bv) {
  bv.webContents.executeJavaScript(`(${amzEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
}

// Prime next episode click
function amzEpisodeNextClick(ele) {
  try {
    console.log('next episode')
    if (document.querySelector(ele) != undefined) {
      document.querySelector(ele).click()
    }
  } catch(err) { console.error(err) }
}

// Prime next episode mutation observer
function amzEpisodeNextMut() {
  try {
    console.log('next mut')
    obsAmzNext = new MutationObserver(() => {
      amzEpisodeNextClick(`.${eleAmzNext}`)
    })
  } catch(err) { console.error(err) }
}

// Prime next episode observer invocation
function amzEpisodeNextObs() {
  try {
    console.log('next obs')
    obsAmzNext.observe(document.querySelector(obsEleAmzNext), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Prime next episode observer disconnection
function amzEpisodeNextDis() {
  try {
    console.log('next dis')
    if (typeof obsAmzNext !== 'undefined') {
      obsAmzNext.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

module.exports = {
  amzGetUrl,
  amzUpgradeDismiss,
  amzPreviewSkip,
  amzPrevewSkipRem,
  amzRecapSkip,
  amzRecapSkipRem,
  amzEpisodeNext,
  amzEpisodeNextRem
}
