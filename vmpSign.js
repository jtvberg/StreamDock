const { exec } = require('child_process')
exports.default = async function() {
  console.log('afterPack')
  exec("python3 -m castlabs_evs.vmp sign-pkg ./dist/mac")
}