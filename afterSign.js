const { notarize } = require('electron-notarize')

exports.default = async function (context) {
  // Skip if not mac build
  if (process.platform !== 'darwin') return
  console.log('notarizing')
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

  // VMP sign via EVS
  const { execSync } = require('child_process')
  console.log('VMP signing start')
  execSync('py -3 -m castlabs_evs.vmp sign-pkg ./dist/win-unpacked')
  console.log('VMP signing complete')
}
