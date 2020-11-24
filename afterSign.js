exports.default = async function () {
  const { exec } = require('child_process')
  exec('python3 -m castlabs_evs.vmp sign-pkg ./dist/win')
}
