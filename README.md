# StreamDock
 This thing was really born out of my desire to fill the damn window instead of going fullscreen. Seriously, I want a window with the video content only... why isn't there a button for that? Theater mode, miniplayer, fullscreen... WORTHLESS!
 
 StreamDock 'natively' supports YouTube, YouTube TV, Netflix, Hulu, Prime Video, Disney+, Apple TV+, Peacock, ABC.com, Paramount+, HBO Max, ESPN+ and CrunchyRoll.
I say 'natively' as there are links built in already and in some cases, service specfic functions available. That said, you can open any service via the link symbol in the corner and then bookmark it.

I also wanted a way to find where something might be streaming. The search on the home page powered by TMDB will show you what services (now based on your region as of 0.7.3) are currently streaming a title.

#### Main View
<img src="/res/screenshots/main.png" width="600"/>

#### Supported Services (+others)
<img src="/res/screenshots/services.png" width="600"/>

#### Bookmarks & Stream Search
<img src="/res/screenshots/search.png" width="600"/>

#### Stream Search Detail
<img src="/res/screenshots/search-detail.png" width="600"/>

## Using the code
   - Clone repo
   - Provided instructions assume you are using npm as your package manager
   - Code has not been tested with other package managers such as Yarn
   - Navigate to directory and run ```npm install``` to install dependencies

## Running the code
   Some npm scripts are already setup in package.json\
   ```npm start``` will launch the app (alternatively you can use ```electron .```)\
   Devtools are set to open on start up when in dev mode\
   To debug ```main.js``` you can use the following commands (assumes you are using npm):
   - ```npm run debug``` will launch in main process debug mode on port 7171
   - ```npm run break``` will launch the app and break at entry point also on port 7171
   - Use chrome://inspect and configure the target with above port

## Widevine DRM
   I used the Castlabs Electron fork for ECS located [here](https://github.com/castlabs/electron-releases).
   - Most services will NOT work when you play actual content if you just run the code
   - You must build a package signed by Widevine for it to work properly

   I used the Castlabs EVS for this located [here](https://github.com/castlabs/electron-releases/wiki/EVS).
   - You must add a call in the build process to EVS via the electron-builder afterPack or afterSign hook
   - You must sign prior to code signing on Mac and after code signing on Windows

   NOTE: You must sign up for an EVS account (free) and you will need to have Python to use it.

## Building
   The code builds for Mac, Windows and Linux.
   There are also some build scripts in place (NOTE: You may want to disable notarization in the mac build script while testing your build as this can take a long time.)

## Releases / Known Issues
   The current release works on Mac (signed and notarized). There are previous versions for Windows (self-signed) and Linux.
   
   The auto-update should prompt you as new releases come out and then, post download, prompt you to install/restart. Sometimes, it won't do the restart. If you wait a minute and exit the app completely, it should automatically restart the new version (I think I have a fix for this coming in the next release.)

   Peacock is working now. I don't know why. I have retured it to show by default.
   
   At the moment, any service using Google auth may not allow you to login. This only matters if you have to sign-in to use (so, YouTube works (but it is anonymous), YouTubeTV will not.) The user agent spoofing is tempremental.
   
   The previously suggested work-around to change the user agent to 'Chrome' for login and then back to a full user agent string to avoid the 'unsupport browser' issue is now just the way it works. You no longer need to do this manually. If it sees you navigate to a Google sign-on page it automatically sets the user agent for you. This appears to be working for the included services.

   Other services you may want to add that use 'sign in with Google' may not work.

## App Control
   - Click on the quick-access buttons across the top to load streaming services as selected in the settings menu under preferences (or use the 'Streams' menu)
   - A limited set of stream services will also be available in the Mac touch bar (because why not)
   - Left-click on the tray icon (or right-click on app header) will hide and pause the window/stream (if playing)
   - If hidden already, another left-click will restore the window but not resume play (unless restore auto-play is checked in the settings)
   - Right-click on the tray icon will exit the app completely
   - If you want to minimize the app but keep playing to maintain audio, do so by minimizing to the dock/taskbar
   - There is an always on top toggle button in the top right corner (or in 'Window' menu)
   - You can open a link from clipboard via the 'View' menu (or in the header)
   - You can scale the video to 16:9 (or 4:3, 2:1, 2.4:1) either vertically or horizontally also in the view menu (or in the header for 16:9 only)
   - You can bookmark streams via the bookmark button in the header or via the 'View' menu
   - Bookmarks are located in the home screen via the home button or via the 'View' menu

## Service Specific Features
   You can view the extended Netflix genres via 'Show Genres' button or alternatively in the 'View' menu.\
   Various service-specific behaviors can be toggled in the settings under preferences including:
   - Which streaming services are present and what colors and glyphs are used to represent them in the quick access bar
   - Prime auto-skip previews
   - Netflix, Hulu, Disney+ and Prime episode recap/intro auto-skip
   - Netflix, Hulu, Disney+ and Prime 'Binge Mode' that will automatically start the next episode in a series (skipping delay)
   - You can also skip YouTube ads and dismiss ad overlays when possible (while not all ads are skippable, if turned on it will even skip ads before the skip button even appears)

   One note: On some services there are scenarios where an option to skip something doesn't show up. For instance, on Prime, sometimes the episode recap is not skippable. There doesn't appear to be any rhyme or reason as to why sometimes you can't skip a recap or intro for certain shows on certain services, but if you notice that something is playing that you chose to skip and there is no UI element that would allow a user to skip that content, the app is working as intended as there is nothing to key off of for that show/service combo. I have even seen scenarios where for a specific episode, there is no option to skip a recap, but you can on other episodes of the same show/service combo.

## Stream Search
   Just added in 0.7.0 you can now search for a stream from the home screen
   - The search uses the TMDB API to find titles and show you were you can stream them (but the API does not supply deep links!)
   - TMDB is a community driven movie and TV database. You can check it out [here](https://www.themoviedb.org/)
   - Clicking on a search result entry will show you details about the title (clicking on a provider icon will take you to the TMDB page that has the deep link)
   - Within the detail view there is a link to the TMDB page (logo, bottom left) where you can see the various ways to get the content
   - The search result will only list subscription services but if you go to the TMDB page, you can also see purchase and rental options
   - Clicking on one of the streaming options at TMDB will open the link in the app however, some services, like HBO, will ask who is watching and then lose it's way to the content
   - The primary search defaults to US only but you can pick your region in the preferences (this effects search only!)
   - There are also 3 quick search buttons: Popular films and TV shows that can be streamed and then 1 more for trending titles over the last week (but may not be on a stream service yet)
   - Some price of admission: you will need to enable the search pane it in the settings and provide an API key. This requires you create a free account on TMDB and generate the v3 key

## TODO
   - Looking to add a watch queue to the home screen
   - Need to add some of the skipping features to other services
   - I haven't given up yet but HBO Max is pretty much impossible to work with around recap/intro/preview/next episode skipping
   - I need to investigate adding Google OAuth to allow more reliable logins for YouTube TV and other services
   - Contemplating multiple windows but in general, this seems silly (leave a comment if you think there is a good reason to do this!)
   - I don't like how there is no z-order for the BrowserWindow vs. BrowserView. This means I can't render any UI elements above the view (and why video is hidden when using the preferences menu.) In general, this is not a big deal but there are some cool UI tricks I could implement if I moved portions of the UI to another BrowserView (for instance, I could use custom tooltips and auto-hide the header bar)
   - Would like to be able to allow the user to add services. As it is, you can do this by changing the URLs for existing services (which I don't recommend as there is service specific code associated with the service ID) or by adding bookmarks to other services
