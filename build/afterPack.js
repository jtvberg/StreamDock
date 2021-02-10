exports.default = function (context) {
  // Skip if not mac
  if (process.platform !== 'darwin') return

  // VMP sign via EVS
  const { execSync } = require('child_process')
  console.log('VMP signing start')
  execSync('python3 -m castlabs_evs.vmp sign-pkg ./dist/mac ' + context.appOutDir)
  console.log('VMP signing complete')
}