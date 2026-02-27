# Release Update

New release (2.3.0)

- Bumps all packages to latest stable versions (except FA)
- A mea culpa for the Windows users... it appears shortly after the last release the user agent aged out on Windows... I don't know why things still worked on macOS but I didn't notice (as I don't use Windows all that often)
- Local media
  - Another mea culpa to the Windows users, somewhere along the line I backed out a change that then broke local media functionality for windows (fixed)
  - You can now select correct title from API if the initial result is incorrect
  - You can also lock metadata and hide library items
  - More detail on this in the Local File Support section
- Reworked the Search/Library detail
  - I switched to using the backdrop when available in the detail as it is more meaningful for episodes
  - The title image in the detail now appears, as available, in this order: Backdrop > Poster > Not found glyph
  - There are now carousel buttons in the detail modal so you can navigate through titles from there (top right)
  - If a search result matches a title in your library, there will be a play button in the detail modal (bottom left)
- The stream loading indicator is back (not sure what happened there)
- Netflix facet refresh: This was considerable effort... I searched around and then consolidated 20+ lists of IDs into around 7000 and then wrote some python to iterate through the IDs to see if a valid page returned with a genre title... this brought the number down to around 1400 as most were no longer valid (though, 400+ were not in the list I used before). I then scrubbed those down manually to something that made sense as a lot of the facets were so esoteric that a search would make more sense (does anyone really need a "Action & Adventure starring Anthony Wong Chau-Sang" facet?). Anyway, hope you're happy.
- Contextual buttons (left menu) are now more obvious (accent color)
- Host of bug fixes and refinements

# Dev Update

Even after a recent update to the service scripts, I noticed a couple are not working reliably. I will revisit those next.

# StreamDock 2.0.0, The Sequel! (Old News)

It took two years and a lack of focus to get 1.0.0 out the door and upon completion I looked at what I had wrought and wept.
What a mess. It worked. I would say it worked well but it needed some serious refactoring. So serious that I just started from scratch.

The point of the app is still the same in that it was born out of my desire to fill the damn window instead of going fullscreen. Seriously, I want a window with the video content only... why isn't there a button for that? Theater mode, miniplayer, fullscreen... WORTHLESS! Now it has ev

Anyway, enjoy.

#### Main View

<img src="/public/res/screenshots/main-view.png" width="600"/>

#### Home Screen (Bookmarks & Stream Search)

<img src="/public/res/screenshots/bookmark-view.png" width="600"/>
<img src="/public/res/screenshots/search-view.png" width="600"/>

#### Stream Search Detail

<img src="/public/res/screenshots/media-detail.png" width="600"/>

#### Stream Edit View

<img src="/public/res/screenshots/settings-streams.png" width="600"/>

## Using the code

- Clone repo
- Provided instructions assume you are using npm as your package manager
- Code has not been tested with other package managers such as Yarn
- Navigate to directory and run `npm install` to install dependencies
- DO NOT USE THE NPM VERSION OF STREAMDOCK (I didn't put it there and it is old AF)
- And, really, just use a release...

NOTE: There is an odd bug some people run into where the dist for Castlabs Electron won't load. To fix, delete the dist directory under Electron in the node_modules directory and then run install.js from it (`node install.js`). That should fix it.

## Running the code

Some npm scripts are already setup in package.json\
 `npm start` will launch the app (alternatively you can use `electron .`)\
 Devtools are set to open on start up when in dev mode\
 To debug `main.js` you can use the following commands (assumes you are using npm):

- `npm run debug` will launch in main process debug mode on port 7171
- `npm run break` will launch the app and break at entry point also on port 7171
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
There are also some build scripts in place (NOTE: The buildMacTest script is in place to skip building for multiple environments and notarization.)
You need to create a .env file. There is an example.env file for guidance.

## Releases / Known Issues

Bookmarks and settings from older versions of StreamDock will not show up properly in 2.0.0+

:rotating_light:**Note: If you are currently using StreamDock 1.x.x or older, I highly recommend you use the Clear Data function in the advanced section in the settings!**:rotating_light:

The current release works on macOS (signed, notarized and tested on Sequoia), Windows 11 (self-signed). Linux will be in a future release (but you should be able to build your own).
Version 2.0.1 is the first release that includes a macOS distribution for Apple silicon. This was a miss on my part as the application will run much slower given the JS will be interpreted twice via Rosetta. Be sure to use the arm64 dmg if you have an MX chip.

The auto-update should prompt you as new releases come out and then, post download, prompt you to install/restart. Sometimes, it won't do the restart. If you wait a minute and exit the app completely, it should automatically restart the new version.

App Issues:

- Dragging a window around might still on occasion make the mouse 'stick' to the header. This should be much more rare than in previous versions. You can still hit escape to disconnect it
- Hulu will resume playing when minimized to tray after a short amount of time. If you pause it before you minimize to tray, it does not. I have not found a root cause for this and it only happens on Hulu. This may have been around for quite some time.

Netflix Issues:

- If you open a Netlfix child window, playing a video will likely give you an error. This is beacuse you have 2 windows open in the same 'browser'. If you close the Netflix session in the main window, the child will play
- If you get this screen it most likely means you have not properly VMP signed the package:
  <img src="/public/res/screenshots/e100.png" width="600"/>
- If you see this with a release, you probably need to update your user agent in the settings

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
- Not all services work the same, I added caveats in the settings descriptions

NOTE: On some services there are scenarios where an option to skip something doesn't show up. Usually, it's the opening credits for the first episode of a season.

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

NOTE: Some price of admission: to use search in the home screen you will need to enable 'show search' in the search settings and provide an API key. This requires you create a free account on TMDB and generate the v3 key.

## Local File Support

You can now play local files in StreamDock.

- First turn on 'Show Library' feature in settings
- If you have a TMDB API key entered, StreamDock will attempt to find the title and add metadata as it adds the files to the home screen if you have 'Fetch Metadata' turned on
- If the API comes back with the wrong metadata, you can right-click on the title and select 'Update Metadata' to choose the correct option
- Updating one item in a season will update all items for that show/season
- If a title was updated, it will show an icon to the right of the menu item
- Updating also automatically locks the metadata so it does not get updated when refreshing
- You can unlock or hide the title in the same menu and there is a toggle to show hidden items in the menu on the left
- You can also toggle poster/backdrop caching so they show up offline
- Add directories to scan (be sure to pick media type TV/Movie as this drives TMDB lookups)
- There are also options to rescan a directory on startup to see if anything new has been added
- On each directory entry there are options to rescan or completely refresh all files and metadata
- There are status symbols at the front of each directory entry to give you a status of file/metadata/errors for loads
- Show episodes work if you name them with a '.s01e01' after the name (it's not case sensitive and it doesn't need to be 2 digits)
- There is a 'Group by Season' toggle to collapse TV shows into seasons
- Supports mp4, mov, avi, mkv and webm
