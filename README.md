Quick and dirty greasyfork userscript to auto-skip YouTube in-video Ads

Will try to detect an ad playing, then click the "Skip Ads" button as soon as possible. This shouldn't be detectable by YouTube's ad-block detection scripts, but does allow some ads to play. A nice middle ground between allowing ads to play and user convienience.

The hamburger menu button (Top left of screen, three horizontal bars) will show status of the program.

- 🔴**Red**: The script is active in the background but not currently trying to block an ad.
- 🟡**Yellow**: The script has detected an ad playing and is attempting to click the skip button.
- 🟢**Green**: The button was successfully clicked and the ad should have been skipped.


[Install Here](https://github.com/Yohoki/YouTubeAdSkip/raw/main/SkipAds.user.js)
