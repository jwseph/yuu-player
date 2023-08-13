# [Yuu Player](https://yuu.pages.dev/)
A YouTube playlist player made with React and Tailwind

## Important features
- True shuffle
  - YouTube and YouTube Music only shuffle playlists in a range of ±200 from the current video
- No ads
- Autoplay
  - Auto-skips unavailable videos but doesn't hide them
- Saves playlist queues
- Plays audio when phone's screen is off
  - Chrome on iOS
  - Firefox + desktop mode on Android

## Todo
- Improve UI in general

## Known bugs
- If you manually end a video while it is loading, the player may begin repeatedly skipping videos
  - This has something to do with the feature that skips unavailable videos, but I'm not sure how to fix it.
