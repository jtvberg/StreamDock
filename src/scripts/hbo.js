// HBO observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsHmRecap = null

// Skip/close HBO episode recap & intros
function hmRecapSkip(bv) {
  bv.webContents.executeJavaScript('try { let obsHmRecap = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${hmRecapSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${hmRecapSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function hmRecapSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${hmRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// HBO recap skip mutation observer
function hmRecapSkipMut() {
  try {
    console.log('recap mut')
    let lastClickTime = 0;
    
    obsHmRecap = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const skipContainer = document.querySelector('[data-testid="skip"]');
          if (skipContainer && skipContainer.style.visibility === 'visible') {
            const now = Date.now();
            if (now - lastClickTime < 1000) return;
            
            const skipButton = skipContainer.querySelector('[data-testid="player-ux-skip-button"]');
            if (skipButton && skipButton.hasAttribute('aria-label')) {
              lastClickTime = now;
              skipButton.click();
              console.log('recap skip');
            }
          }
        }
      });
    })
  } catch(err) { console.error(err) }
}

// HBO recap skip observer invocation
function hmRecapSkipObs() {
  try {
    console.log('recap obs')
    const skipContainer = document.querySelector('[data-testid="skip"]');
    
    if (skipContainer) {
      obsHmRecap.observe(skipContainer, { 
        attributes: true, 
        attributeFilter: ['style'] 
      });
    }
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
  bv.webContents.executeJavaScript('try { let obsHmNext = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${hmEpisodeNextMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${hmEpisodeNextObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function hmEpisodeNextRem(bv) {
  bv.webContents.executeJavaScript(`(${hmEpisodeNextDis.toString()})()`).catch((err) => { console.error(err) })
}

// HBO next episode mutation observer
function hmEpisodeNextMut() {
  try {
    console.log('next mut')
    obsHmNext = new MutationObserver(() => {
      const targetElement = document.querySelector('[data-testid="player-ux-up-next-button"]');
      if (targetElement) {
        targetElement.click()
        console.log('next episode')
      }
    })
  } catch(err) { console.error(err) }
}

// HBO next episode observer invocation
function hmEpisodeNextObs() {
  try {
    console.log('next obs')
    obsHmNext.observe(document.querySelector('#layer-root-player-screen'), { childList: true, subtree: true })
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
