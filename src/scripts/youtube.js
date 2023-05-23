// YouTube observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsYtAds = null

// YouTube ad script injection
function ytAdsSkip(bv) {
  bv.webContents.executeJavaScript(`${ytAdOverlayClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript(`${ytPromoCloseClick.toString()}`).catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript(`${ytAdSkipClick.toString()}`)
    .then(() => bv.webContents.executeJavaScript('ytAdSkipClick()'))
    .catch((err) => { console.error(err) })
  bv.webContents.executeJavaScript('try { let obsYtAds = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${ytAdSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${ytAdSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function ytAdSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${ytAdSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// YouTube overlay close click
function ytAdOverlayClick() {
  try {
    console.log('overlay close')
    if (document.querySelector('.ytp-ad-overlay-close-button') != undefined) {
      document.querySelector('.ytp-ad-overlay-close-button').click()
    }
  } catch(err) { console.error(err) }
}

// YouTube promo close click
function ytPromoCloseClick() {
  try {
    console.log('promo skip')
    if (document.querySelectorAll('#dismiss-button')?.length > 0) {
      document.querySelectorAll('#dismiss-button').forEach(input => { input.click() })
    }
  } catch(err) { console.error(err) }
}

// YouTube ad skip click
function ytAdSkipClick() {
  try {
    console.log('ad skip')
    if (document.querySelector('.ytp-ad-skip-button') != undefined) {
      document.querySelector('.ytp-ad-skip-button').click()
    }
  } catch(err) { console.error(err) }
}

// YouTube ad skip mutation observer
function ytAdSkipMut() {
  try {
    console.log('ads mut')
    obsYtAds = new MutationObserver((ml) => {
      for(const mut of ml) {
        if (mut.type === 'childList' && mut.target.classList.contains('ytp-ad-text')) {
          ytAdSkipClick()
        }
        if (mut.type === 'childList' && mut.target.classList.contains('ytp-ad-module')) {
          ytAdOverlayClick()
        }
        if (mut.type === 'childList' && (mut.target.id === 'dismiss-button' || mut.target.classList.contains('ytd-popup-container') || mut.target.classList.contains('yt-mealbar-promo-renderer') || mut.target.nodeName.toLowerCase() === 'tp-yt-paper-dialog')) {
          ytPromoCloseClick()
        }
      }
    })
  } catch (err) { console.error(err) }
}

// YouTube ad skip observer invocation
function ytAdSkipObs() {
  try {
    console.log('ads obs')
    obsYtAds.observe(document.querySelector('ytd-app'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// YouTube ad skip observer disconnection
function ytAdSkipDis() {
  try {
    console.log('ads dis')
    if (typeof obsYtAds !== 'undefined') {
      obsYtAds.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

module.exports = {
  ytAdsSkip,
  ytAdSkipRem
}
