// YouTube observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsYtAds = null;

// YouTube ad script injection
function ytAdsSkip(bv) {
  bv.webContents.executeJavaScript(`${ytAdOverlayClick.toString()}`).catch((err) => { console.error(err); });
  bv.webContents.executeJavaScript(`${ytPromoCloseClick.toString()}`).catch((err) => { console.error(err); });
  bv.webContents.executeJavaScript('try { let obsYtAds = null; } catch(err) { console.error("Error declaring obsYtAds in page:", err); }')
    .then(() => bv.webContents.executeJavaScript(`(${ytAdSkipObserverSetup.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${ytAdSkipObserveStart.toString()})()`))
    .catch((err) => { console.error('Error injecting or starting YouTube ad observer:', err); });
}

// Remove observer
function ytAdSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${ytAdSkipObserveDisconnect.toString()})()`).catch((err) => { console.error(err); });
}

// YouTube overlay close click (standard click)
function ytAdOverlayClick() {
  try {
    const overlayButton = document.querySelector('.ytp-ad-overlay-close-button');
    if (overlayButton) {
      overlayButton.click();
      console.log('YT: Overlay ad closed');
    }
  } catch (err) { console.error('YT: Error closing overlay ad:', err); }
}

// YouTube promo close click (standard click)
function ytPromoCloseClick() {
  try {
    let promoClosed = false;
    const dismissButtons = document.querySelectorAll('#dismiss-button');
    if (dismissButtons.length > 0) {
      dismissButtons.forEach(input => { input.click(); });
      promoClosed = true;
    }
    const ariaDismissButton = document.querySelector('[aria-label="Dismiss"]');
    if (ariaDismissButton) {
      ariaDismissButton.click();
      promoClosed = true;
    }
    if (promoClosed) console.log('YT: Promo dismissed');
  } catch (err) { console.error('YT: Error dismissing promo:', err); }
}

// Sets up the MutationObserver in the page context
function ytAdSkipObserverSetup() {
  try {
    console.log('YT: Setting up ad skip MutationObserver.');
    const adSkipSelectors = ['.ytp-skip-ad-button', '.ytp-ad-skip-button-modern'];
    const signaledButtons = new Set();

    obsYtAds = new MutationObserver((mutationsList, observer) => {
      let adButtonFoundAndSignaled = false;
      for (const selector of adSkipSelectors) {
        const adSkipButton = document.querySelector(selector);
        if (adSkipButton && adSkipButton.offsetParent !== null && !signaledButtons.has(adSkipButton)) {
          console.log(`YT: Detected skip button "${selector}". Requesting trusted click.`);
          if (typeof window.electronAPI?.signalElementReadyForTrustedClick === 'function') {
            window.electronAPI.signalElementReadyForTrustedClick(selector);
            signaledButtons.add(adSkipButton); // Mark as signaled
            // Clear this button from signaled set after a delay to allow re-signaling if it reappears for a new ad
            setTimeout(() => signaledButtons.delete(adSkipButton), 5000); 
            adButtonFoundAndSignaled = true;
            // break; // Found one, no need to check other ad skip selectors in this mutation cycle for this specific button type
          } else {
            console.warn(`YT: electronIntercom.signalElementReadyForTrustedClick not found. Falling back to standard .click() for ${selector}`);
            adSkipButton.click();
          }
        }
      }

      if (!adButtonFoundAndSignaled) {
          for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
              ytAdOverlayClick();
              ytPromoCloseClick();
            }
          }
      }
    });
  } catch (err) {
    console.error('YT: Error setting up MutationObserver:', err);
  }
}

// Starts the observer
function ytAdSkipObserveStart() {
  try {
    const targetNode = document.querySelector('ytd-app');
    if (targetNode && obsYtAds) {
      obsYtAds.observe(targetNode, { childList: true, subtree: true });
      console.log('YT: Ad skip MutationObserver started on ytd-app.');
    } else {
      if (!targetNode) console.error('YT: ytd-app element not found for observer.');
      if (!obsYtAds) console.error('YT: obsYtAds not initialized before observe.');
    }
  } catch (err) { console.error('YT: Error starting MutationObserver:', err); }
}

// Disconnects the observer
function ytAdSkipObserveDisconnect() {
  try {
    if (obsYtAds && typeof obsYtAds.disconnect === 'function') {
      obsYtAds.disconnect();
      console.log('YT: Ad skip MutationObserver disconnected.');
      obsYtAds = null;
    }
  } catch (err) { console.error('YT: Error disconnecting MutationObserver:', err); }
}

module.exports = {
  ytAdsSkip,
  ytAdSkipRem
};
