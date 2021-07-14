# StreamDock
 Streaming service viewer because reasons

#### Main View
<img src="/res/screenshots/main.png" width="600"/>

#### Supported Services
<img src="/res/screenshots/services.png" width="600"/>

## Using the code
   Clone repo\
   Provided instructions assume you are using npm as your package manager\
   Code has not been tested with other package managers such as Yarn\
   Navigate to directory and run ```npm install``` to install dependencies

## Running the code
   Some npm scripts are already setup in package.json\
   ```npm start``` will launch the app (alternatively you can use ```electron .```)\
   You can uncomment the dev tools load on start up in ```main.js``` (~```webContents.openDevTools()```)\
   To debug ```main.js``` you can use the following commands (assumes you are using npm):\
   - ```npm run debug``` will launch in main process debug mode on port 7171
   - ```npm run break``` will launch the app and break at entry point also on port 7171
   - Use chrome://inspect and configure the target with above port

## Widevine DRM
   I used the Castlabs Electron fork for ECS located [here](https://github.com/castlabs/electron-releases).\
   Most services will NOT work when you play actual content if you just run the code.\
   You must build a package signed by Widevine for it to work properly.\
   I used the Castlabs EVS for this located [here](https://github.com/castlabs/electron-releases/wiki/EVS).\
   You must add a call in the build process to EVS via the electron-builder afterPack or afterSign hook.\
   You must sign prior to code signing on Mac and after code signing on Windows. 

   NOTE: You have to sign up for an EVS account and you will need to have Python to use it.

## Building
   The code builds for Mac, Windows and Linux.
   There are also some build scripts in place (NOTE: You may want to disable notarization in the mac build script while testing your build as this can take a long time.)

## Releases / Known Issues
   The current release works on Mac (signed and notarized) and Windows (only self-signed). It should install without much hassle on both platforms.\
   Just added Linux to the last release. The app icon is not behaving but it works the same.\
   At the moment, any service using Google auth is broken if you have to sign-in to use (so, YouTube works, YouTube TV will not.)\
   The user agent spoofing is no longer working so Google OAuth will need to be implemented. 
   Look for that in a future release.\
   As a work-around: If you have YouTube TV you can sign into ABC with it and this will also sign you in to YouTube TV and YouTube.\
   Peacock is set to off by default as the login is not working.

## App Control
   Click on the quick-access buttons across the top to load streaming services as selected in the settings menu under preferences (or use the 'Streams' menu).\
   A limited set of stream services will also be available in the Mac touch bar (because why not)\
   Left-click on the tray icon (or right-click on app header) will hide and pause the window/stream (if playing.)\
   If hidden already, another left-click will restore the window but not resume play (unless restore auto-play is checked in the settings.)\
   Right-click on the tray icon will exit the app completely.\
   If you want to minimize the app but keep playing to maintain audio, do so by minimizing to the dock/taskbar.\
   There is an always on top toggle button in the top right corner (or in 'Window' menu).\
   You can open a link from clipboard via the 'View' menu (or in the header).\
   You can scale the video to 16:9 (or 4:3) either vertically or horizontally also in the view menu (or in the header for 16:9 only).\
   You can bookmark streams via the bookmark button in the header or via the 'View' menu.\
   Toggle bookmarks via the far-left quick access button.\
   You can also view the extended Netflix genres via 'Show Genres' button or alternatively in the 'View' menu.\
   Various service-specific behaviors can be toggled in the settings under preferences including:
   - Which streaming services are present and what colors and glyphs are used to represent them in the quick access bar
   - Prime auto-skip previews
   - Netflix, Hulu, Disney+ and Prime episode recap/intro auto-skip
   - Netflix, Hulu, Disney+ and Prime 'Binge Mode' that will automatically start the next episode in a series (skipping delay)
   - You can also skip YouTube ads and dismiss ad overlays when possible (while not all ads are skippable, if turned on it will even skip ads before the skip button even appears)\

   One note: On some services there are scenarios where an option to skip something doesn't show up. For instance, on Prime, sometimes the episode recap is not skippable. There doesn't appear to be any rhyme or reason as to why sometimes you can't skip a recap or intro for certain shows on certain services but if you notice that something is playing that you chose to skip and there is no UI element that would allow a user to skip that content, the app is working as intended as there is nothing to key off of for that show/service combo. I have even seen scenarios where for a specific episode, there is no option to skip a recap but you can on other episodes of the same show/service combo.

## TODO
   - I haven't given up yet but HBO Max is pretty much impossible to work with around recap/intro/preview/next episode skipping
   - I need to look into adding Google OAuth to allow logins for YouTube TV and other services
   - Contemplating multiple windows but in general, this seems silly (leave a comment if you think there is a good reason to do this!)
   - I don't like how there is no z-order for the BrowserWindow vs. BrowserView. This means I can't render any UI elements above the view (and why video is hidden when using the preferences menu.) In general, this is not a big deal but there are some cool UI tricks I could implement if I moved portions of the UI to another BrowserView (for instance, I could use custom tooltips and auto-hide the header bar)
   - Would like to be able to allow the user to add services. As it is, you can do this by changing the URLs for existing services (which I don't recommend as there is service specific code associated with the service ID) or by adding bookmarks to other services
   - Still looking into the Peacock thing (won't allow login)
