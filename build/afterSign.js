const { execSync } = require('child_process')

exports.default = function (context) {
  if (process.platform === 'win32') {
    console.log('VMP signing start')
    const arch = context.arch
    let outDir = ''

    if (arch === 'x64') {
      outDir = './dist/win-unpacked'
    } else if (arch === 'arm64') {
      outDir = './dist/win-arm64-unpacked'
    }

    if (outDir) {
      try {
        execSync(`python3 -m castlabs_evs.vmp sign-pkg ${outDir}`, { stdio: 'inherit' })
      } catch (error) {
        console.error(`VMP signing failed (${arch}):`, error.message)
        throw error
      }
    }

    console.log('VMP signing complete')
  }
}