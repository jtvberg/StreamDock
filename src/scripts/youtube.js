// YouTube observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsYtAds = null;

// YouTube ad script injection
function ytAdSkip(bv) {
  bv.webContents.executeJavaScript('try { let obsYtAds = null; } catch(err) { console.error("Error declaring obsYtAds in page:", err); }')
    .then(() => bv.webContents.executeJavaScript(`(${ytAdSkipObserverSetup.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${ytAdSkipObserveStart.toString()})()`))
    .catch((err) => { console.error('ad setup err'); });
}

// Remove observer
function ytAdSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${ytAdSkipObserveDisconnect.toString()})()`).catch((err) => { console.error(err); });
}

// Sets up the MutationObserver in the page context
function ytAdSkipObserverSetup() {
  try {
    const allTargetSelectors = [
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-ad-overlay-close-button',
      '#dismiss-button',
      '[aria-label="Dismiss"]'
    ];
    const signaledElements = new Set();

    function checkForTargetElements() {
      let foundAndSignaled = false;
      for (const selector of allTargetSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element && element.offsetParent !== null && !signaledElements.has(element)) {
            console.log('ad skip');
            if (typeof window.electronAPI?.signalElementReadyForTrustedClick === 'function') {
              window.electronAPI.signalElementReadyForTrustedClick(selector);
              signaledElements.add(element);
              setTimeout(() => signaledElements.delete(element), 5000);
              foundAndSignaled = true;
            }
          }
        });
      }
      return foundAndSignaled;
    }
    const periodicCheck = setInterval(() => {
      checkForTargetElements();
    }, 1000);

    obsYtAds = new MutationObserver((mutationsList, observer) => {
      const hasChildListMutations = mutationsList.some(mutation => mutation.type === 'childList' && mutation.addedNodes.length > 0);
      if (hasChildListMutations) {
        checkForTargetElements();
      }
    });
    obsYtAds.periodicCheck = periodicCheck;
  } catch (err) {
    console.error('ad mut err');
  }
}

// Starts the observer
function ytAdSkipObserveStart() {
  try {
    const targetNode = document.querySelector('ytd-app');
    if (targetNode && obsYtAds) {
      obsYtAds.observe(targetNode, { childList: true, subtree: true });
      console.log('ad mut');
    }
  } catch (err) { console.error('ad obs err'); }
}

// Disconnects the observer
function ytAdSkipObserveDisconnect() {
  try {
    if (obsYtAds) {
      if (typeof obsYtAds.disconnect === 'function') {
        obsYtAds.disconnect();
        console.log('ad obs dis');
      }
      if (obsYtAds.periodicCheck) {
        clearInterval(obsYtAds.periodicCheck);
      }
      obsYtAds = null;
    }
  } catch (err) { console.error('No observer found'); }
}

module.exports = {
  ytAdSkip,
  ytAdSkipRem
};
