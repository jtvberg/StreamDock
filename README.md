# Temporal
 Streaming service viewer because reasons

#### Main View
<img src="/res/screenshots/main.png" width="600"/>

#### Supported Services
<img src="/res/screenshots/services.png" width="600"/>

## Using the code
    Clone repo
    Provided instructions assume you are using npm as your package manager
    Code has not been tested with other package managers such as Yarn
    Navigate to directory and run 'npm install' to install dependencies

## Running the code
    Some npm scripts are already setup in package.json
    'npm start' will launch the app (alternatively you can use 'electron .')
    You can uncomment the dev tools load on start up in main.js (~webContents.openDevTools())
    To debug main.js you can use the following commands (assumes you are using npm):
    'npm run debug' will launch in main process debug mode on port 7171
    'npm run break' will launch the app and break at entry point also on port 7171
    Use chrome://inspect and configure the target with above port

## Widevine DRM
    I used the Castlabs Electron fork for ECS located[here](https://github.com/castlabs/electron-releases)
    Most services will NOT work when you play actual content if you just run the code
    You must build a package signed by Widevine for it to work properly
    I used the Castlabs EVS for this located[here](https://github.com/castlabs/electron-releases/wiki/EVS)
    You must add a call in the build process to EVS via the electron-builder afterPack or afterSign hook
    You must sign prior to code signing on Mac and after code signing on Windows
