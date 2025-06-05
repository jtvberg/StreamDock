// Check if linux as the elements are named differently... nice one AMZ
const isLinux = process.platform === 'linux'

// Prime observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsAmzUpgrade = null

// Prime dismiss browser upgrade notification (NO LINUX)
function amzUpgradeDismiss(bv) {
  if (!isLinux) {
    bv.webContents.executeJavaScript(`
      try {
        let obsAmzUpgrade = null;
        
        ${amzUpgradeDismissMut.toString()}
        ${amzUpgradeDismissObs.toString()}
        
        amzUpgradeDismissMut();
        amzUpgradeDismissObs();
      } catch(err) { 
        console.error('Upgrade dismiss error:', err); 
      }
    `).catch((err) => { console.error(err); })
  }
}

// Prime upgrade your browser dismiss mutation observer
function amzUpgradeDismissMut() {
  try {
    console.log('upgrade mut');
    let dismissedNotifications = new Set();
    obsAmzUpgrade = new MutationObserver(() => {
      const notificationContainer = document.querySelector('.f1lb32c2');
      if (notificationContainer) {
        const dismissLink = Array.from(notificationContainer.querySelectorAll('a'))
          .find(link => link.textContent.includes("Don't show again"));
        
        if (dismissLink) {
          const notificationId = notificationContainer.innerHTML.substring(0, 100);
          if (!dismissedNotifications.has(notificationId)) {
            dismissedNotifications.add(notificationId);
            dismissLink.click();
            console.log('upgrade dismissed');
            setTimeout(() => {
              dismissedNotifications.delete(notificationId);
            }, 3000);
          }
        }
      }
    })
  } catch(err) { console.error(err); }
}

// Prime upgrade your browser dismiss observer invocation
function amzUpgradeDismissObs() {
  try {
    console.log('upgrade obs');
    obsAmzUpgrade.observe(document.querySelector('.atvwebplayersdk-player-container'), { childList: true, subtree: true });
  } catch (err) { console.error(err); }
}

// Prime dummy declarations (this is not actually used as it is sent over as a string!)
let obsAmzPreview = null
let eleAmzPreview = null
let obsEleAmzPreview = null

// Skip/close Prime previews
function amzPreviewSkip(bv) {
  eleAmzPreview = 'fu4rd6c'
  obsEleAmzPreview = '.atvwebplayersdk-player-container'
  if (isLinux) {
    eleAmzPreview = 'adSkipButton'
    obsEleAmzPreview = '.bottomPanel'
  }
  
  // Execute everything in one go to ensure proper scope
  bv.webContents.executeJavaScript(`
    try {
      let obsAmzPreview = null;
      let eleAmzPreview = '${eleAmzPreview}';
      let obsEleAmzPreview = '${obsEleAmzPreview}';
      
      ${amzPreviewSkipMut.toString()}
      ${amzPreviewSkipObs.toString()}

      amzPreviewSkipMut();
      amzPreviewSkipObs();
    } catch(err) { 
      console.error('Preview skip error:', err); 
    }
  `).catch((err) => { console.error(err); })
}

// Remove observer
function amzPrevewSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${amzPreviewSkipDis.toString()})()`).catch((err) => { console.error(err); })
}

// Prime preview skip mutation observer
function amzPreviewSkipMut() {
  try {
    console.log('prev mut')
    obsAmzPreview = new MutationObserver(() => {
      const targetElement = document.querySelector(`.${eleAmzPreview}`);
      if (targetElement) {
        targetElement.click();
        console.log('prev skip');
      }
    })
  } catch(err) { console.error(err); }
}

// Prime preview skip observer invocation
function amzPreviewSkipObs() {
  try {
    console.log('prev obs');
    obsAmzPreview.observe(document.querySelector(obsEleAmzPreview), { childList: true, subtree: true });
  } catch (err) { console.error(err); }
}

// Prime preview skip observer disconnection
function amzPreviewSkipDis() {
  try {
    console.log('prev dis');
    if (typeof obsAmzPreview !== 'undefined') {
      obsAmzPreview.disconnect();
    }
  } catch (err) { console.error('No observer found'); }
}

// Prime dummy declarations (this is not actually used as it is sent over as a string!)
let obsAmzRecap = null
let eleAmzRecap = null
let obsEleAmzRecap = null

// Skip/close Prime episode recap & intros
function amzRecapSkip(bv) {
  eleAmzRecap = 'atvwebplayersdk-skipelement-button'
  obsEleAmzRecap = '.atvwebplayersdk-player-container'
  if (isLinux) {
    eleAmzRecap = 'skipElement'
    obsEleAmzRecap = '.notificationsWrapper'
  }
  
  // Execute everything in one go to ensure proper scope
  bv.webContents.executeJavaScript(`
    try {
      let obsAmzRecap = null;
      let eleAmzRecap = '${eleAmzRecap}';
      let obsEleAmzRecap = '${obsEleAmzRecap}';
      
      ${amzRecapSkipClick.toString()}
      ${amzRecapSkipMut.toString()}
      ${amzRecapSkipObs.toString()}

      amzRecapSkipMut();
      amzRecapSkipObs();
    } catch(err) { 
      console.error('Recap skip error:', err); 
    }
  `).catch((err) => { console.error(err) })
}

// Remove observer
function amzRecapSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${amzRecapSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// Prime recap skip click
function amzRecapSkipClick(ele) {
  try {
    if (document.querySelector(ele) != undefined) {
      document.querySelector(ele).click()
      console.log('recap skip')
    }
  } catch(err) { console.error(err) }
}

// Prime recap skip mutation observer
function amzRecapSkipMut() {
  try {
    console.log('recap mut')
    let clickedButtons = new Set();
    obsAmzRecap = new MutationObserver(() => {
      const targetElement = document.querySelector(`.${eleAmzRecap}`);
      if (targetElement) {
        const buttonId = targetElement.textContent.trim() + '_' + targetElement.getBoundingClientRect().left;
        if (!clickedButtons.has(buttonId)) {
          console.log('Found skip button:', targetElement.textContent, 'at', new Date().toLocaleTimeString());
          console.log('Button HTML:', targetElement.outerHTML);
          clickedButtons.add(buttonId);
          amzRecapSkipClick(`.${eleAmzRecap}`);
          setTimeout(() => {
            clickedButtons.delete(buttonId);
          }, 3000);
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

// Prime next episode mutation observer
function amzEpisodeNextMut() {
  try {
    console.log('next mut')
    obsAmzNext = new MutationObserver(() => {
      const targetElement = document.querySelector(`.${eleAmzNext}`);
      if (targetElement) {
        targetElement.click()
        console.log('next episode')
      }
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
  amzUpgradeDismiss,
  amzPreviewSkip,
  amzPrevewSkipRem,
  amzRecapSkip,
  amzRecapSkipRem,
  amzEpisodeNext,
  amzEpisodeNextRem
}
