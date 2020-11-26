const { notarize } = require('electron-notarize')

console.log('notarizing')
exports.default = async function (context) {
  // Skip if not mac build
  if (process.platform !== 'darwin') return

  // Get contex vars
  const appName = context.packager.appInfo.productFilename
  const appDir = context.appOutDir

  // Notarize
  return await notarize({
    appBundleId: 'com.jtvberg.streamdock',
    appPath: `${appDir}/${appName}.app`,
    appleId: process.env.appleId,
    appleIdPassword: process.env.appleIdPassword
  })
}

exports.default = function () {
  // Skip if mac build
  if (process.platform === 'darwin') return

  const { execSync } = require('child_process')
  // VMP sign via EVS
  execSync('py -3 -m castlabs_evs.vmp sign-pkg ./dist/win-unpacked')
}
