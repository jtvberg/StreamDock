// Disney observer dummy declaration (this is not actually used as it is sent over as a string!)
let obsDpSkip = null

// Skip/close Disney episode recap & intros
function dpSkip(bv) {
  bv.webContents.executeJavaScript('try { let obsDpSkip = null } catch(err) { console.error(err) }')
    .then(() => bv.webContents.executeJavaScript(`(${dpSkipMut.toString()})()`))
    .then(() => bv.webContents.executeJavaScript(`(${dpSkipObs.toString()})()`))
    .catch((err) => { console.error(err) })
}

// Remove observer
function dpSkipRem(bv) {
  bv.webContents.executeJavaScript(`(${dpSkipDis.toString()})()`).catch((err) => { console.error(err) })
}

// Disney recap skip mutation observer
function dpSkipMut() {
  try {
    console.log('recap mut')
    obsDpSkip = new MutationObserver(() => {
      const targetElement = document.querySelector('.skip__button');
      if (targetElement) {
        targetElement.click()
        console.log('skipping')
      }
    })
  } catch(err) { console.error(err) }
}

// Disney recap skip observer invocation
function dpSkipObs() {
  try {
    console.log('recap obs')
    obsDpSkip.observe(document.querySelector('#app_body_content'), { childList: true, subtree: true })
  } catch (err) { console.error(err) }
}

// Disney recap skip observer disconnection
function dpSkipDis() {
  try {
    console.log('recap dis')
    if (typeof obsDpSkip !== 'undefined') {
      obsDpSkip.disconnect()
    }
  } catch (err) { console.error('No observer found') }
}

module.exports = {
  dpSkip,
  dpSkipRem
}
