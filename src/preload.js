// Imports
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    logData: data => ipcRenderer.on('log-data', data),
    clearData: bool => ipcRenderer.send('clear-data', bool),
    defaultAgent: agent => ipcRenderer.send('default-agent', agent),
    updateHeaderHeight: height => ipcRenderer.send('update-header-height', height),
    facetWidth: width => ipcRenderer.send('update-facets-width', width),
    urlToBookmark: url => ipcRenderer.send('url-to-bookmark', url),
    openUrl: url => ipcRenderer.send('open-url', url),
    openNewin: () => ipcRenderer.send('open-newin'),
    openLink: () => ipcRenderer.send('open-link'),
    openDevTools: () => ipcRenderer.send('open-devtools'),
    createBookmark: () => ipcRenderer.send('create-bookmark'),
    sendBookmark: bookmarkObj => ipcRenderer.on('send-bookmark', bookmarkObj),
    navBack: () => ipcRenderer.send('nav-back'),
    winMax: () => ipcRenderer.send('win-max'),
    winMin: () => ipcRenderer.send('win-min'),
    winHide: () => ipcRenderer.send('win-hide'),
    winClose: () => ipcRenderer.send('win-close'),
    winFocus: () => ipcRenderer.send('win-focus'),
    winMove: mouseObj => ipcRenderer.send('win-move', mouseObj),
    winLock: bool => ipcRenderer.send('win-lock', bool),
    winRatio: bool => ipcRenderer.send('win-ratio', bool),
    winFullscreen: bool => ipcRenderer.send('win-fullscreen', bool),
    winScaleHeight: ratio => ipcRenderer.send('win-scale-height', ratio),
    winScaleWidth: ratio => ipcRenderer.send('win-scale-width', ratio),
    winSetLoc: boundsObj => ipcRenderer.send('win-setloc', boundsObj),
    winGetLoc: boundsObj => ipcRenderer.on('win-getloc', boundsObj),
    winStopdrag: bool => ipcRenderer.on('win-stopdrag', bool),
    setAccent: color => ipcRenderer.on('set-accent', color),
    hideHeader: bool => ipcRenderer.on('hide-header', bool),
    lastStream: url => ipcRenderer.on('last-stream', url),
    setIsNetflix: bool => ipcRenderer.on('is-netflix', bool),
    streamOpened: bool => ipcRenderer.on('stream-opened', bool),
    getHeaderHeight: heightObj => ipcRenderer.invoke('set-header-height', heightObj),
    setIsMac: bool => ipcRenderer.once('is-mac', bool),
    getAppInfo: appInfo => ipcRenderer.once('app-info', appInfo),
    signalElementReadyForTrustedClick: (selector) => {
      ipcRenderer.send('request-trusted-click', selector)
    }
})
