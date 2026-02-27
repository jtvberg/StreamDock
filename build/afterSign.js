const { execSync } = require('child_process')

exports.default = function (context) {
  if (process.platform === 'win32') {
    console.log('VMP signing start')

    if (context.arch === 3) {
      console.log('Skipping VMP signing for arm64 (not supported)')
      console.log('VMP signing complete')
      return
    }

    const outDir = context.appOutDir
    console.log(`Signing outDir: ${outDir}`)

    try {
      execSync(`python3 -m castlabs_evs.vmp sign-pkg "${outDir}"`, { stdio: 'inherit' })
    } catch (error) {
      console.error(`VMP signing failed:`, error.message)
      throw error
    }

    console.log('VMP signing complete')
  }
}