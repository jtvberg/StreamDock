# StreamDock 2.0.0, The Sequel!
 It took two years and a lack of focus to get 1.0.0 out the door and upon completion I looked at what I had wrought and wept.
 What a mess. It worked. I would say it worked well but it needed some serious refactoring. So serious that I just started from scratch.

 The point of the app is still the same in that it was born out of my desire to fill the damn window instead of going fullscreen. Seriously, I want a window with the video content only... why isn't there a button for that? Theater mode, miniplayer, fullscreen... WORTHLESS!

 It only took a month to rework and in that time, I also managed to knock out all the to-dos that I felt like were still relevant.
 StreamDock still has all the principal functionality it did before with some caveats...

# Material Changes
 - The bar at the top is still there but now it disappears. This was much more straight forward that I thought (clarity being the value of just starting over)
 - Menus are out. Menus were fine in macOS but really made the UI ugly on Windows in Linux. Now, everything is either in the header or an internal control.
 - Other aspect ratios are out. Outside of 16x9 there are so many cinema standards that are very close to each other. 4x3 is rare and typically has the bars to make it 16x9 anyway. However, I did add an aspect ratio lock so that when you get it where you want it you can scale as needed.
 - Dark vs. Light modes. There is so little UI to this thing it hardly seems worth it so I scraped it for now. Dark is king!
 - No more stream IDs! If you never looked at the code this isn't all that relevant but the crux of it was that it pigeon-holed me into some less-than-ideal circumstances. There are 'pre-loaded' stream services but the app no longer cares about them. Delete them all if you want.
 - That said, there is now a stream editor that allows you to add/remove/reorder the streaming services that show up in the header bar.
 - There are still service specific scripts to do things like skip ads, previews or recaps but now those are based on the domain of what you are watching, not the stream definition. This has the side of effect of making those scripts work on links you open which they did not before.
 - Script toggles in the preferences pane now apply to all services. Sorry, but I didn't see much use for turning off recaps or enabling binge-mode on a service-by-service basis. If you turn something on or off, it will apply to all services where there are scripts in place (noted below.)
 - Window and Linux are now first-class citizens. I spent a lot more time getting the 'native' feel for those OS's.
 - Child windows now get the full boat of scripted service features, but I won't be adding others like aspect ratio or always on top.
 - Search is still in place with some subtle UI changes. The initial search returns less info than before. This is to save on API calls. Getting all the details as before would require up to 21 calls per search. Now it is just 1 and the detail modal will get the rest as you click on a title. I may revisit that.
 - Resuming play when restoring the window now only activates if the video being restored was playing when you hid it. Used to be that if you had resume turned on it would resume play after restore whether it was playing or not.
 - There is a button in the advanded tab under settings you can use to wipe all your data from StreamDock. This will reset the app as if it was freshly installed and restart. This will log you out of all services and delete all bookmarks and updated settings. :rotating_light:**This cannot be undone!**:rotating_light:
 - Touchbar is out. Was anyone really using that?
 - Electron: Using the latest stable version.
 - Security: Node integration is now turned off and context isolation is turned on. A preload script only exposes node functionality as needed.
 - No more Bootstrap, lodash or jQuery. The only primary dependencies are Electron and FontAwesome (for glyphs.)
 - The code... in my opinion it is waaayyyy better. Much easier to read and far less convoluted. Separation of concerns and whatnot...

#### Main View
<img src="/public/res/screenshots/main.png" width="600"/>

#### Homescreen (Bookmarks & Stream Search)
<img src="/public/res/screenshots/bookmarks.png" width="600"/>
<img src="/public/res/screenshots/search.png" width="600"/>

#### Stream Search Detail
<img src="/public/res/screenshots/search-details.png" width="600"/>

## Using the code
 - Clone repo
 - Provided instructions assume you are using npm as your package manager
 - Code has not been tested with other package managers such as Yarn
 - Navigate to directory and run ```npm install``` to install dependencies
 - DO NOT USE THE NPM VERSION OF STREAMDOCK (I didn't put it there and it is old AF)
 - And, really, just use a release...

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
 Bookmarks and settings from older versions of StreamDock will not show up properly in 2.0.0+
 :rotating_light:**Note: If you are currently using StreamDock 1.x.x or older, I highly recommend you use the Clear Data function in the advanced section in the settings!**:rotating_light:
 
 The current release works on macOS (signed, notarized and tested on Monterey and Ventura), Windows 10/11 (self-signed) and Linux (tested on Mint).

 The auto-update should prompt you as new releases come out and then, post download, prompt you to install/restart. Sometimes, it won't do the restart. If you wait a minute and exit the app completely, it should automatically restart the new version.

 No known issues.

## App Control
 - Click on the quick-access buttons across the top to load streaming services as setup in the stream editor
 - Left-click on the tray icon (or right-click on app header) will hide and pause the window/stream (if playing)
 - If hidden already, another left-click will restore the window but not resume play (unless auto-play on restore is checked in preferences)
 - Right-click on the tray icon will exit the app completely
 - If you want to minimize the app but keep playing to maintain audio, do so by minimizing to the dock/taskbar
 - There is an always on top toggle button in the top right corner
 - You can open a link from clipboard via the link button in the header
 - You can scale the video to 16:9 either vertically or horizontally by clicking on the corresponding arrow buttons in the header
 - You can also open the current stream in a new window from a header button

## Bookmarking
 - You can bookmark a stream you are currently watching via the bookmark button in the header
 - Bookmarks are located in the home screen via the home button
 - There is a toggle between a list and tile view
 - You can add a bookmark from a copied link directly if you hit the link button while on the home screen
 - You can also create bookmarks by dragging links on the header (up until you see the mouse turn to a plus sign) or bookmark screen (this can take a second to complete)
 - You can drag YouTube videos directly from browse to the header which is particularly useful
 - The home screen button will flash when the bookmark has been successfully added

## Service Specific Features
 Various service-specific behaviors can be toggled in the settings under streaming service options including:
 - Which streaming services are present and what colors and glyphs are used to represent them in the quick access bar
 - You can also skip YouTube ads and dismiss ad overlays when possible (while not all ads are skippable, if turned on it will skip ads before the skip button even appears)
 - You can view the extended Netflix genres by mousing over the left edge of the window when in Netflix
 
On AppleTV, Disney+, HBO Max, Hulu, Netflix, Paramount+, Peacock and Prime Video:
 - There are recap, preview and opening credits auto-skipping options
 - Binge-mode will automatically start the next episode as soon as skipping is allowed
 
One note: On some services there are scenarios where an option to skip something doesn't show up. Usually, it's the opening credits for the first episode of a season.

## Stream Search
 You can search for a stream from the home screen.
 - The search uses the TMDB API to find titles and show you where you can stream them (but the API does not supply deep links!)
 - TMDB is a community driven movie and TV database. You can check it out [here](https://www.themoviedb.org/)
 - Clicking on a search result entry will show you details about the title (clicking on a provider icon will take you to the TMDB page that has the deep link)
 - Within the detail view there is a link to the TMDB page (logo, bottom left) where you can see the various ways to get the content
 - The search result will only list subscription services but if you go to the TMDB page, you can also see purchase and rental options
 - Clicking on one of the streaming options at TMDB will open the link in the app however, some services, like HBO, will ask who is watching and then lose its way to the content
 - The primary search defaults to US only but you can pick your region in the preferences (this effects search only!)
 - There are also 3 quick search buttons: Popular films and TV shows that can be streamed and then 1 more for trending titles over the last week (but may not be on a stream service yet)
 - Some price of admission: to use search in the home screen you will need to enable 'show search' in the search settings and provide an API key. This requires you create a free account on TMDB and generate the v3 key.
