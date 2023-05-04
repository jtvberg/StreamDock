const { Menu, app } = require('electron')
const isMac = process.platform === 'darwin'
const template = [
  {
    label: app.getName(),
    submenu: [
      ...(isMac ? [
        {
          type: 'separator'
        },
        {
          role: 'services'
        },
        {
          type: 'separator'
        },
        {
          role: 'hide'
        },
        {
          role: 'hideothers'
        },
        {
          role: 'unhide'
        }
      ] : []),
      {
        type: 'separator'
      },
      {
        role: 'quit'
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        role: 'undo'
      },
      {
        role: 'redo'
      },
      {
        type: 'separator'
      },
      {
        role: 'cut'
      },
      {
        role: 'copy'
      },
      {
        role: 'paste'
      },
      ...(isMac ? [
        {
          role: 'pasteAndMatchStyle'
        }
      ] : []),
      {
        role: 'delete'
      },
      {
        role: 'selectAll'
      }
    ]
  },
  {
    label: 'Window',
    submenu: [
      {
        role: 'minimize'
      },
      ...(isMac ? [
        {
          role: 'zoom'
        },
        {
          role: 'front'
        },
        {
          type: 'separator'
        },
      ] : [
        {
          role: 'close'
        }
      ])
    ]
  }
]

module.exports = Menu.buildFromTemplate(template)