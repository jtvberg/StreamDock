exports.default = function (context) {
  if (process.platform === 'win32') {
    // VMP sign via EVS
    const {
      execSync
    } = require('child_process')
    console.log('VMP signing start')
    try {
      execSync('python3 -m castlabs_evs.vmp sign-pkg ./dist/win-arm64-unpacked', { stdio: 'inherit' })
    } catch (error) {
      console.error('VMP signing failed (arm):', error.message)
      throw error
    }
    try {
      execSync('python3 -m castlabs_evs.vmp sign-pkg ./dist/win-unpacked', { stdio: 'inherit' })
    } catch (error) {
      console.error('VMP signing failed (x64):', error.message)
      throw error
    }
    console.log('VMP signing complete')
  }
}