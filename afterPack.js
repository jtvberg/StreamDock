exports.default = function (ctx) {
  // Skip if not mac
  if (process.platform !== 'darwin') return

  // VMP sign via EVS
  const { execSync } = require('child_process')
  execSync('python3 -m castlabs_evs.vmp sign-pkg ./dist/mac ' + ctx.appOutDir)
}
