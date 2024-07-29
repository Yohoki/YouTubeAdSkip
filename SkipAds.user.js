// ==UserScript==
// @name         YouTube Ad-Skip
// @icon         https://www.gstatic.com/youtube/img/branding/favicon/favicon_192x192.png
// @version      1.5.000
// @homepage     https://github.com/Yohoki/YouTubeAdSkip
// @downloadURL  https://github.com/Yohoki/YouTubeAdSkip/raw/main/SkipAds.user.js
// @updateURL    https://github.com/Yohoki/YouTubeAdSkip/raw/main/SkipAds.user.js
// @description  Simple ad-blocker bypass. Clicks "Skip Ads" button as soon as possible without triggering the adblock ban.
// @author       Yohoki
// @match        https://www.youtube.com/*
// @match        https://www.youtu.be/*
// @license      GNU GPL 3.0
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

// Disable stupid rules....
/* eslint-disable no-multi-spaces */

// fixes bug in Highlight functions.
// Added new ad type: In-feed "Previously Watched" survey
// Added new ad type: In-feed "Attached" survey
//    Removed until fixed.
// Added new ad type: Watch page "Engagement Banner"
// Added new ad type: Mid-Video anti-Adblock "Enforcement" popup.
// Added some extra debugMode logging and a queue for console.log and console.debug
// Added new button-> AntiShorts, opens shorts video in watch page.
// Made some changes to try to minimize video-start lag.
// Added new action: "Reload" - reloads the current page.
// Added debug function: forceAd(type).
//    Creates a fake ad of whatever type is needed for testing.
// Added functions to resume playback after reload.


/*
//Try multiple observers, monitoring smaller sections.
Search Page -
    ytd-page-manager ytd-browse #primary #contents // Whole Feed area.
        { childList: true, }
Watch Page -
    div video // Main video
        { attributes: true, attributeFilter: ['class'], }
    div.related ytd-watch-next-secondary-results-renderer // "Up next" feed
        { childList: true, }
*/

//Debug mode
const debugMode = true;
let DebugQueue = [];
let LogQueue = [];

let BlockedInterval = 0;
let curTime = new Date(Date.now()).toLocaleTimeString('en-US');
let watchPage = window.location.href.includes('watch');
let searchPage = window.location.href.includes('search');
let shortsPage = window.location.href.includes('shorts');
let searchBar = document.querySelector('ytd-searchbox[id="search"] div[id="container"]');
let guideButton = document.querySelector('#start yt-icon-button#guide-button');
let creatorID = null;
let Whitelist = GM_getValue("whitelist", []);

let Reloading = false;
let justReloaded = GM_getValue("justReloaded", true);
let previousVideoID = GM_getValue("previousVideoID", "");
let previousVideoTime = GM_getValue("previousVideoTime", 0);

let VideoNode;

// MutationObserver to watch for changes in the DOM
const observer = new MutationObserver(handleDOMChanges);
const observerOptions = { childList: true, subtree: true, };
observer.observe(document.body, observerOptions);


/*
// New section
// MutationObserver to watch for changes in the DOM
const observer = new MutationObserver(handleDOMChanges);
let observerOptions;
// New, Specialized Observers
// Video Ads
const VidObserver = new MutationObserver(handleDOMChanges);
let VidOptions;
let VidTarget;
// WatchPage Feed
const UpNextObserver = new MutationObserver(handleDOMChanges);
let UpNextOptions;
let UpNextTarget;
// HomePage Feed
const FeedObserver = new MutationObserver(handleDOMChanges);
let FeedOptions;
let FeedTarget;
//Call function to load options and add nodes to be observed.
LoadObservers();
function LoadObservers() {
    // Main Observer. Refreshes code on page change.
    observerOptions = { childList: true, };
    observer.observe(document.body, observerOptions);

    VidOptions = { attributes: true, attributeFilter: ['class'], };
    VidTarget = document.querySelector('div#movie_player');
    if (VidTarget) VidObserver.observe(VidTarget, VidOptions);

    UpNextOptions = { childList: true, subtree: true };
    UpNextTarget = document.querySelector('div#secondary-inner');
    if (UpNextTarget) UpNextObserver.observe(UpNextTarget, UpNextOptions);

    FeedOptions = { childList: true, subtree: true };
    FeedTarget = document.querySelector('ytd-page-manager ytd-browse');
    if (FeedTarget) FeedObserver.observe(FeedTarget, FeedOptions);
};
// End new section
*/

let debugButton = document.createElement('div');
let highlightButton = document.createElement('div');
let WhitelistButton = document.createElement('div');
let AntiShortsButton = document.createElement('div');
debugButton.id = "DEBUG_button";
highlightButton.id = "DEBUG_highlight";
WhitelistButton.id = "Whitelist";
WhitelistButton.style = "color:var(--ytd-searchbox-text-color);";
WhitelistButton.title = "Whitelist not loaded. Usually happens while page is still loading."
AntiShortsButton.id = "AntiShorts";
AntiShortsButton.title = "Open Short in Watch Page."

const videoDesc = { // Main video descriptor - not an ad //
    Selector: '#movie_player',
    Descriptor: 'video'
}

const AdTypes = {
    midVidAd: { // Mid-video ad break //
        Selector: '#movie_player.ad-showing',
        Message: null,
        Descriptor: 'video',
        Action: 'midVidAd'
    },
    midVidAdButton: { // Mid-video ad break //
        Selector: '.ytp-ad-skip-button-slot button',
        Message: 'Button found and clicked. (Mid-Vid Ad)',
        Descriptor: null,
        Action: 'click'
    },
    midVidPaper: { // Mid-Video Pop-up modal //
        Selector: 'tp-yt-paper-dialog',
        Message: '"Paper Dialogue" pop-up dismissed.',
        Descriptor: '#dismiss-button button',
        Action: 'click'
    },
    midVidEnforce: { // Mid-Video "Anti-adblocker modal //
        Selector: 'ytd-enforcement-message-view-model',
        Message: null, // Page reloaded, log erased on reload.
        Descriptor: null,
        Action: 'reload'
    },
    watchPlayerAd: {
        Selector: '#player-ads',
        Message: '"Companion Ad" top-of-feed removed',
        Descriptor: null,
        Action: 'remove'
    },
    watchEngagementBanner: { // Watch page top-of-feed Enagement banner //
        Selector: 'ytd-engagement-panel-title-header-renderer',
        Message: '"Engagement Ad" top-of-feed removed;',
        Descriptor: 'ytd-ad-engagement-panel-banner-renderer',
        Action: 'remove'
    },
    homePageMasthead: { // Top of feed large banner ad, with or without a video. //
        Selector: 'div#masthead-ad',
        Message: 'Home Page banner ad removed. (MastHead)',
        Descriptor: null,
        Action: 'remove'
    },
    homePageInFeedTV: { // Homepage, YouTubeTV mid-feed YTTV banner. //
        Selector: 'ytd-primetime-promo-renderer',
        Message: "YouTubeTV ad banner dismissed. (Primetime Promo)",
        Descriptor: 'button',
        Action: 'click'
    },
    homePageInFeedPrem: { // Homepage, YouTube mid-feed Premium banner. //
        Selector: 'ytd-statement-banner-renderer',
        Message: "YouTube Premium ad banner dismissed. (Statement Banner)",
        Descriptor: 'button',
        Action: 'click'
    },
    homePageBrandBanner: { // Homepage, YouTube mid-feed Brand banner. //
        Selector: 'ytd-brand-video-singleton-renderer',
        Message: "YouTube Premium ad banner dismissed. (Brand Video Banner)",
        Descriptor: '#dismiss-button button',
        Action: 'click'
    },
    homePageBrandShelf: { // Homepage, Mid-Feed full-row "featured" banner.
        Selector: 'ytd-brand-video-shelf-renderer',
        Message: 'Mid-Feed "Featured" shelf dismissed. (Brand Shelf)',
        Descriptor: 'div#dismiss-button',
        Action: 'click'
    },
    homePageNudge: { // Homepage, YouTube mid-feed Brand banner. //
        Selector: 'ytd-feed-nudge-renderer',
        Message: "YouTube Nudge dismissed. (New to you in-feed)",
        Descriptor: '#dismiss-button button',
        Action: 'click'
    },
    homePagePaper: { // Mid-Video Pop-up modal //
        Selector: 'tp-yt-paper-dialog',
        Message: '"Paper Dialogue" pop-up dismissed.',
        Descriptor: 'button',
        Action: 'click'
    },
    homePageSurvey: { // In-Feed "Prev Watched" Survey //
        Selector: 'ytd-inline-survey-renderer',
        Message: 'In-feed survey dismissed.',
        Desctiptor: '#dismiss-button button',
        Action: 'click'
    },
    searchPagePyv: { // Search Page, YouTube pre-feed ad. //
        Selector: 'ytd-search-pyv-renderer',
        Message: "Search page Pre-Feed ad hidden.",
        Descriptor: null,
        Action: 'remove'
    },
    inFeedAdSlot: { // Search Page in-feed. //
        Selector: 'ytd-ad-slot-renderer',
        Message: '"Ad Slot" in-feed ad hidden.',
        Descriptor: null,
        Action: 'remove'
    },
    ShortsAdSlot: { // Shorts Ad. //
        Selector: '#shorts-player.ad-created',
        Message: 'YT Short ad Skipped.',
        Descripto: null,
        Action: 'key',
        Key: 40,
    }
};
debugButton.innerHTML = `
    <div>
        <svg xmlns="http://www.w3.org/2000/svg" width="2rem" viewBox="0 0 100 91" fill="none" stroke="var(--ytd-searchbox-text-color)" stroke-width="6">
            <path id="Bug" d="M 31.00,33.00 C 31.00,33.00 31.75,16.62 50.00,17.00 69.62,16.88 70.00,33.00 70.00,33.00 70.00,33.00 70.00,62.00 70.00,62.00 70.00,62.00 68.88,78.62 50.00,79.00 31.12,79.25 31.00,62.00 31.00,62.00 31.00,62.00 31.00,33.00 31.00,33.00 Z M 38.88,8.25 C 38.88,8.25 50.12,26.62 61.62,8.50 61.62,8.50 51.38,27.25 38.88,8.25 Z M 43.62,40.00 C 43.62,40.00 56.25,40.25 56.25,40.25M 43.50,55.62 C 43.50,55.62 56.50,55.62 56.50,55.62M 92.25,11.62 C 92.25,11.62 92.25,25.75 92.25,25.75 92.25,25.75 71.00,37.25 71.00,37.25M 8.00,11.00 C 8.00,11.00 8.00,25.00 8.00,25.00 8.00,25.00 29.50,37.00 29.50,37.00M 5.00,48.00 C 8.00,48.00 29.00,48.00 29.00,48.00M 95.00,48.00 C 92.00,48.00 71.00,48.00 71.00,48.00M 92.00,85.00 C 92.00,85.00 92.00,70.00 92.00,70.00 92.00,70.00 71.00,59.00 71.00,59.00M 8.00,85.00 C 8.00,85.00 8.00,70.00 8.00,70.00 8.00,70.00 29.00,59.00 33.00,59.00" />
        </svg>
    </div>
`;
highlightButton.innerHTML = `
    <div>
        <svg xmlns="http://www.w3.org/2000/svg" width="2rem" viewBox="0 0 626 626">
	        <symbol id="FirstFill">
		        <g>
			        <path id="Highlight" d="M 164.00,417.11 C 164.00,417.11 199.00,417.11 199.00,417.11 199.00,417.11 262.00,417.11 262.00,417.11 262.00,417.11 453.00,417.11 453.00,417.11 460.48,417.01 467.93,418.17 475.00,420.70 480.41,422.63 487.40,426.34 492.00,429.76 507.99,441.65 517.91,461.09 518.00,481.00 518.00,481.00 518.00,495.00 518.00,495.00 518.00,495.00 518.00,522.00 518.00,522.00 517.58,557.19 487.69,584.95 453.00,585.00 453.00,585.00 172.00,585.00 172.00,585.00 137.31,584.95 107.42,557.19 107.00,522.00 107.00,522.00 107.00,495.00 107.00,495.00 107.00,469.27 107.97,453.14 128.00,434.04 132.81,429.45 137.10,426.71 143.00,423.76 150.93,419.79 155.41,418.83 164.00,417.11 Z" />
    		    </g>
	        </symbol>
	        <symbol id="FirstDraw">
    		    <g>
	    		    <path id="TargetCircle" d="M 305.00,202.43 C 357.96,195.89 396.31,247.90 376.80,297.00 373.66,304.88 368.92,311.94 362.99,318.00 357.30,323.80 350.47,329.24 343.00,332.56 331.89,337.50 323.08,339.14 311.00,339.00 260.63,338.41 230.11,282.88 252.37,239.00 263.09,217.87 282.22,206.16 305.00,202.43 Z" />
		        </g>
    	    </symbol>
	        <symbol id="CutsTarget">
		        <g>
			        <path id="CutVerti" d="M 313.00,172.00 C 313.00,172.00 313.00,369.00 313.00,369.00" />
			        <path id="CutHori" d="M 215.00,270.00 C 215.00,270.00 413.00,270.00 413.00,270.00" />
    		    </g>
	        </symbol>
	        <symbol id="CutsCSS">
		        <g>
			        <path id="CutC" d="M 236.00,481.75 C 234.50,453.75 198.50,462.50 198.75,478.50 198.75,478.50 198.50,520.00 198.50,520.50 197.75,540.75 234.75,544.00 236.00,519.75 236.00,519.75 258.25,520.00 258.50,520.00 253.50,568.50 177.75,573.00 177.25,520.00 177.25,520.00 177.00,482.00 177.00,482.00 175.00,427.50 257.25,429.25 258.50,482.00 258.50,482.00 236.00,482.00 236.00,481.75 Z" />
			        <path id="CutS0" d="M 351.50,454.75 C 351.50,454.75 342.50,472.25 342.50,472.25 342.50,472.25 301.25,450.75 295.00,475.75 295.00,475.75 293.50,487.25 318.00,490.00 318.00,490.00 358.00,493.50 354.25,523.25 354.25,523.25 358.00,559.25 311.50,558.00 311.50,558.00 286.75,561.50 267.75,544.25 267.75,544.25 277.75,527.00 277.75,527.00 277.75,527.00 294.50,539.50 310.75,537.00 310.75,537.00 329.50,540.00 333.00,525.00 333.00,525.00 334.75,509.50 306.75,510.75 306.75,510.75 270.50,507.25 273.75,477.50 273.75,477.50 269.50,442.50 313.00,442.50 312.50,442.50 335.50,440.25 351.50,454.75 Z" />
			        <path id="CutS1" d="M 446.50,454.75 C 446.50,454.75 437.50,472.25 437.50,472.25 437.50,472.25 396.25,450.75 390.00,475.75 390.00,475.75 388.50,487.25 413.00,490.00 413.00,490.00 453.00,493.50 449.25,523.25 449.25,523.25 453.00,559.25 406.50,558.00 406.50,558.00 381.75,561.50 362.75,544.25 362.75,544.25 372.75,527.00 372.75,527.00 372.75,527.00 389.50,539.50 405.75,537.00 405.75,537.00 424.50,540.00 428.00,525.00 428.00,525.00 429.75,509.50 401.75,510.75 401.75,510.75 365.50,507.25 368.75,477.50 368.75,477.50 364.50,442.50 408.00,442.50 407.50,442.50 430.50,440.25 446.50,454.75 Z" />
		        </g>
    	    </symbol>
        	<symbol id="SecondDraw">
		    <g>
                <path id="TargetBullseye" d="M 309.00,251.31 C 311.22,251.17 312.72,250.94 315.00,251.31 340.35,252.86 338.08,291.72 312.00,289.90 291.24,288.46 286.14,258.36 309.00,251.31 Z" />
                <path id="Dogear" d="M 394.00,46.00 C 394.00,46.00 394.00,164.00 394.00,164.00 394.00,164.00 514.00,165.00 514.00,165.00" />
                <path id="RBracket" d="M 412.00,183.00 C 412.00,183.00 440.00,183.00 440.00,205.00 440.00,205.00 440.00,247.00 440.00,247.00 440.00,270.00 476.00,270.00 476.00,270.00 476.00,270.00 440.00,270.00 440.00,291.00 440.00,291.00 440.00,336.00 440.00,336.00 440.00,361.00 412.00,361.00 412.00,361.00" />
                <path id="TargetSights" d="M 215.00,270.00 C 215.00,270.00 281.75,270.00 281.75,270.00M 313.00,172.00 C 313.00,172.00 313.00,238.00 313.00,238.00M 413.00,270.00 C 413.00,270.00 345.50,270.00 345.50,270.00M 313.00,369.00 C 313.00,369.00 313.00,302.75 313.00,302.75" />
                <path id="LBracket" d="M 214.00,183.00 C 214.00,183.00 186.00,183.00 186.00,205.00 186.00,205.00 186.00,247.00 186.00,247.00 186.00,270.00 150.00,270.00 150.00,270.00 150.00,270.00 186.00,270.00 186.00,291.00 186.00,291.00 186.00,336.00 186.00,336.00 186.00,361.00 214.00,361.00 214.00,361.00" />
                <path id="Page" d="M 107.00,374.00 C 107.00,374.00 107.00,40.00 107.00,40.00 107.00,40.00 398.00,40.00 398.00,40.00 398.00,40.00 518.00,161.00 518.00,161.00 518.00,161.00 518.00,374.00 518.00,374.00" />
		    </g>
            </symbol>
            <use href="#FirstFill" style="stroke:none; fill:var(--ytd-searchbox-text-color);" />
            <use href="#FirstDraw" style="stroke:var(--ytd-searchbox-text-color); stroke-width:20px; fill:none;" />
            <use href="#CutsTarget" style="stroke:var(--ytd-searchbox-background); stroke-width:40px; fill:none;" />
            <use href="#CutsCSS" style="stroke:none; fill:var(--ytd-searchbox-background);" />
            <use href="#SecondDraw" style="stroke:var(--ytd-searchbox-text-color); stroke-width:20px; fill:none; stroke-linecap:round;" />
        </svg>
    </div>
`;
WhitelistButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="2rem" viewBox="0 0 25 34">
        <style>
            #Whitelist {fill:none; stroke:currentcolor; stroke-width:2;}
            #Whitelist .thin {fill:none; stroke:currentcolor; stroke-width:1; stroke-linecap:round;}
        </style>
        <path class="thin" id="fingers" d="M 9.13,18.12 C 9.13,18.12 11.10,18.79 11.10,18.79 11.10,18.79 18.07,18.79 18.34,18.79 19.68,18.79 19.98,18.12 19.98,17.62 19.98,17.62 21.63,10.43 21.63,10.14 21.63,8.65 19.98,8.65 19.98,8.65" />
        <path class="thin" id="thumb" d="M 8.63,9.98 C 8.63,9.98 10.94,6.48 10.94,6.48 10.94,6.48 10.94,5.24 10.94,4.49 11.31,2.83 12.69,2.83 12.91,2.83 14.58,2.47 15.19,4.28 15.38,4.49 15.87,5.15 15.87,6.23 15.87,6.48 16.14,7.00 15.38,8.65 15.38,8.65 15.38,8.65 19.98,8.65 19.98,8.65" />
        <path id="line0" d="M 5.55,30.18 C 5.55,30.18 19.74,30.18 19.74,30.18" />
        <path id="line1" d="M 5.55,26.10 C 5.55,26.10 19.74,26.10 19.74,26.10" />
        <path id="line2" d="M 5.55,22.03 C 5.55,22.03 19.74,22.03 19.74,22.03" />
        <path class="thin" id="wrist" d="M 4.57,9.98 C 5.34,9.68 6.94,9.79 7.81,9.81 8.16,9.82 8.60,9.80 8.87,10.08 9.13,10.35 9.12,10.78 9.13,11.14 9.13,11.14 9.13,17.29 9.13,17.29 9.13,17.71 9.18,18.37 8.87,18.69 8.55,19.01 7.90,18.95 7.48,18.95 7.48,18.95 5.51,18.95 5.51,18.95 4.48,18.93 4.21,18.67 4.19,17.62 4.19,17.62 4.19,12.30 4.19,12.30 4.19,11.52 4.02,10.58 4.57,9.98 Z" />
        <path class="thin" id="paper" d="M 2.71,1.21 C 2.71,1.21 4.69,1.16 4.69,1.16 4.69,1.16 8.14,1.16 8.14,1.16 8.14,1.16 18.91,1.16 18.91,1.16 18.91,1.16 21.88,1.16 21.88,1.16 22.34,1.16 22.71,1.17 23.11,1.47 23.63,1.86 23.68,2.39 23.68,2.99 23.68,2.99 23.68,25.85 23.68,25.85 23.68,25.85 23.68,29.93 23.68,29.93 23.68,30.49 23.76,31.43 23.53,31.92 23.19,32.64 22.58,32.75 21.88,32.75 21.88,32.75 6.25,32.75 6.25,32.75 6.25,32.75 3.29,32.75 3.29,32.75 2.83,32.75 2.43,32.71 2.06,32.39 1.60,31.99 1.56,31.49 1.56,30.92  1.56,30.92 1.56,8.31 1.56,8.31 1.56,8.31 1.56,2.83 1.56,2.83 1.57,1.97 1.88,1.46 2.71,1.21 Z" />
    </svg>
`;
AntiShortsButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="2rem" viewBox="0 0 1649 2049">
  <path id="Ouline" fill="red" stroke="none" stroke-width="0"
        d="M 214.00,488.00 C 214.00,488.00 1066.00,42.00 1066.00,43.00 1586.00,-182.00 1854.00,534.00 1409.00,749.00 1409.00,749.00 1268.00,820.00 1272.00,819.00 1672.00,848.00 1780.00,1370.00 1456.00,1548.00 1456.00,1548.00 693.00,1947.00 631.00,1981.00 177.00,2244.00 -260.00,1668.00 202.00,1323.00 202.00,1323.00 380.00,1230.00 380.00,1230.00 46.00,1216.00 -194.00,764.00 214.00,488.00 Z" />
  <path id="No" fill="none" stroke="var(--yt-spec-base-background)" stroke-width="150"
        d="M 408.00,1025.00 C 411.00,819.00 561.00,614.00 820.00,608.00 1059.00,609.00 1234.00,770.00 1242.00,1025.00 1243.00,1229.00 1091.00,1437.00 820.00,1442.00 506.00,1434.00 411.00,1157.00 408.00,1025.00 Z M 533.00,728.00 C 533.00,728.00 588.00,783.00 588.00,783.00M 1118.00,1319.00 C 1118.00,1319.00 957.00,1156.00 957.00,1156.00" />
  <path id="Play" fill="var(--yt-spec-wordmark-text)" stroke="none" stroke-width="0"
        d="M 601.00,707.00 C 601.00,707.00 1113.00,1024.00 1113.00,1024.00 1113.00,1024.00 601.00,1338.00 601.00,1338.00 601.00,1338.00 601.00,707.00 601.00,707.00 Z" />
</svg>
`;

//Run Main Code
setInterval(DecBlockedInterval, 1000);
setInterval(Main, 500);
setInterval(setColor, 1000);
setInterval(QueueDebug, 5000);
setInterval(QueueLog, 5000);
handleDOMChanges([{ type: 'childList', addedNodes: [document.body] }]);

function handleDOMChanges(mutationsList) {

    //console.debug("Running DOM Code");
    watchPage = window.location.href.includes('watch');
    searchPage = window.location.href.includes('search');
    shortsPage = window.location.href.includes('shorts');
    curTime = new Date(Date.now()).toLocaleTimeString('en-US');
    if (!watchPage) removeWatchPageButtons();
    addWatchPageButtons();
    if (creatorIdInWhitelist() && watchPage) return;
    mutationsList.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((addedNode) => {
                if (addedNode instanceof HTMLElement) {
                    Object.values(AdTypes).forEach (Type => {
                        const matchedNodes = addedNode.querySelectorAll(Type.Selector);
                        matchedNodes.forEach( node => handleAdElement(node, Type) );
                    });
                }
            });
        }
    });
}
/*function handleDOMChanges(mutations, caller) {
    watchPage = window.location.href.includes('watch');
    searchPage = window.location.href.includes('search');
    shortsPage = window.location.href.includes('shorts');
    curTime = new Date(Date.now()).toLocaleTimeString('en-US');
    if (!watchPage) removeWatchPageButtons();
    addWatchPageButtons();
    if (creatorIdInWhitelist() && watchPage) return;
    switch(caller) {
        case VidObserver:
            //console.debug("Video tag has triggered a mutation.");
            if (VidTarget.className.includes('ad-showing')) {
                handleAdElement(VidTarget, AdTypes.midVidAd);
                //console.debug("Blocked ad!");
            }
            break;
        case observer:
            //console.debug("Body tag has triggered a mutation.");
            //if (!VidTarget || !document.body.contains(VidTarget)) LoadObservers();
            LoadObservers();
            break;
        default: //console.debug("Error");
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((addedNode) => {
                        if (addedNode instanceof HTMLElement) {
                            Object.values(AdTypes).forEach (Type => {
                                const matchedNodes = addedNode.querySelectorAll(Type.Selector);
                                matchedNodes.forEach( node => handleAdElement(node, Type) );
                            });
                        }
                    });
                }
            });
        break;
    }
}*/

function handleAdElement(element, type, descriptorOverride = false, descriptor = null) {
    var Descriptor = descriptorOverride ? descriptor : type.Descriptor;
    if (!element) return;
    switch (type.Action) {
        case 'midVidAd': fastForwardVideo(element, Descriptor); break;
        case 'click': clickElement(element, Descriptor, type.Message); break;
        case 'hide': hideElement(element, Descriptor, type.Message); break;
        case 'remove': removeElement(element, Descriptor, type.Message); break;
        case 'reload': reloadPage(); break;
        case 'key': pressKey(element, Descriptor, type.Message, type.Key); break;
        default: break;
    }
    setColor();
}

function fastForwardVideo(Element, descriptor=null, time=null){
    var Target = descriptor == null ? Element : Element.querySelector(descriptor);
    if (!Target.duration || Target.currentTime >= Math.floor(Target.duration)) return;
    if (!time) time = Target.duration;

    Target.currentTime = time;
    QueueLog(curTime + " - AdSkip: A video has been Fast Forwarded.");
    BlockedInterval = 10;
}
function finishReloading() {
    // Sanity checks
    if (!justReloaded) return; // Not needed? Skip.
    if (!previousVideoTime) { QueueDebug(curTime + " Adskip: Previous video time not found."); return; }
    if (!previousVideoID || previousVideoID != getVideoID()) { QueueDebug(curTime + " AdSkip: Previous video ID mismatch. " + getVideoID() + " != " + previousVideoID); return; }

    waitForVideoNode().then(() => {
        /* Run code here that requires Video Node */
        if (VideoNode.className.includes('ad-showing')) { // Is showing ad? Observe and call later.
            var config = { attributes: true, attributeFilter: ['class'] };
            var observer = new MutationObserver(function(mutationsList, observer) {
                if (VideoNode.classList.contains('ad-showing')) { return; }
                fastForwardVideo(VideoNode, null, previousVideoTime);
                GM_setValue("previousVideoID"  , null);
                GM_setValue("previousVideoTime", null);
                GM_setValue("justReloaded"     , false);
                justReloaded = false; // stop looping
                QueueLog(curTime + 'AdSkip: Video refreshed, Fast Forwarding.')
                observer.disconnect();
            });
            //QueueDebug("Waiting for Video node to FastForward.");
            observer.observe(VideoNode, config);
            return;
        }
        if (!VideoNode.className.includes('ad-showing')) { // No ad playing? FF and reset.
            fastForwardVideo(VideoNode, null, previousVideoTime);
            QueueLog(curTime + 'AdSkip: Video refreshed, Fast Forwarding.');
            GM_setValue("previousVideoID"  , null);
            GM_setValue("previousVideoTime", null);
            GM_setValue("justReloaded"     , false);
            justReloaded = false; // stop looping
            return;
        }
    })
    .catch((error) => { QueueDebug(curTime + "AdSkip: Video node not found while resuming video."); return; });
    // Other code afterwards, pass or fail... Same as `.finally(()=>{})`
    //Block C
}
function reloadPage() {
    if (Reloading) return; //don't keep reloading if lagging, etc.

    waitForVideoNode().then(() => { // Store video info for refresh.
        GM_setValue("previousVideoID"  , getVideoID());
        GM_setValue("previousVideoTime", VideoNode.currentTime);
        GM_setValue("justReloaded"     , true);

        // Lock reloading and refresh page.
        Reloading = true;
        location.reload();
    });
}
function waitForVideoNode() {
    return new Promise((resolve, reject) => {
        if (VideoNode) {/* QueueDebug("Video node already found");*/ resolve(VideoNode); } // Already have video node? resolve.
        VideoNode = document.querySelector(`${videoDesc.Selector} ${videoDesc.Descriptor}`);
        if (VideoNode) { /*QueueDebug("Video node found while searching");*/ resolve(VideoNode); } // Newly Aquired Video node? resolve.

        // else, Wait for video node to be added to DOM
        /*QueueDebug("Creating observer for video node");*/
        const videoObserver = new MutationObserver((mutationsList, observer) => {
            /*QueueDebug("Observer is waiting for video node");*/
            VideoNode = document.querySelector(`${videoDesc.Selector} ${videoDesc.Descriptor}`);
            if (VideoNode) { videoObserver.disconnect(); /*QueueDebug("Video node found after wait");*/ resolve(VideoNode); }
        });
        videoObserver.observe(document.body, { childList: true, subtree: true });
    });
}

function clickElement(Element, descriptor, Msg) {
    //if (descriptor && !Element.querySelector(descriptor)) return;
    //Element.querySelector(descriptor).click();
    try { !descriptor ? Element.click() : Element.querySelector(descriptor).click(); }
    catch {} //Suppress console.error() in case of button not existing.
    removeElement(Element);
    BlockedInterval = 10;
    if (!Msg) return;
    QueueLog(curTime + " - AdSkip: " + Msg);
    if (debugMode) QueueLog(Element);
}
function removeElement(Element, descriptor, Msg) {
    if (!Element) return;
    if (descriptor && !Element.querySelector(descriptor)) return;
    !descriptor ? Element.remove() : Element.querySelector(descriptor).remove();
    BlockedInterval = 10;
    if (!Msg) return;
    QueueLog(curTime + " - AdSkip: " + Msg);
    if (debugMode) QueueLog(Element);
}
function pressKey(Element, descriptor, Msg, Key) {
    if (!Element || !Key) return;
    if (descriptor && !Element.querySelector(descriptor)) return;

    const event = new KeyboardEvent('keydown', {'keyCode': Key});
    Element.dispatchEvent(event);

    BlockedInterval = 10;
    if (!Msg) return;
    QueueLog(curTime + " - AdSkip: " + Msg);
    if (debugMode) QueueLog(Element);
}
function hideElement(Element, descriptor, Msg) {
    if (!Element) return;
    if (descriptor && !Element.querySelector(descriptor)) return;
    if (descriptor) Element = Element.querySelector(descriptor);
    if (Element.style.display === 'none') return;
    Element.style.display = 'none';
    BlockedInterval = 10;
    if (!Msg) return;
    QueueLog(curTime + " - AdSkip: " + Msg);
    if (debugMode) QueueLog(Element);
}
function DEBUG_highlightElement(Element) {
    QueueDebug(Element);
    if (!Element) return;
    QueueDebug('ElementHighlighted');
    setTimeout(function() {
        Element.style.transition = 'background-color 1s';
        Element.style.backgroundColor = '#00FF00'; // Set to transparent to start the fade
        Element.addEventListener('transitionend', function() {
            Element.style.removeProperty('background-color');
            Element.style.removeProperty('transition');
        }, { once: true });
    }, 100);
}

// Set Menu Bar color for status reporting.
function setColor() {
    const menuBar = document.querySelector('#guide-icon');
    if (!menuBar) { setTimeout(setColor, 1); return; }
    if (BlockedInterval>0) {
        menuBar.style.color = '#00FF00';
        menuBar.title = "AdSkip: Ad successfully skipped.";
        return;
    }
    switch (true) {
        case (BlockedInterval == 0):
            menuBar.style.color = '#FF0000';
            menuBar.title = "AdSkip: Listening for ads";
            break;
        case (BlockedInterval >= 1):
            menuBar.style.color = '#FFFF00';
            menuBar.title = "AdSkip: Ad Detected. Trying to skip.";
            break;
        default:
            menuBar.style.color = '#666666';
            menuBar.title = "AdSkip: Not running on current page. Sum Ting Wong";
            break;
    }
    // Set whitelist icon color
    const WhitelistBtn = document.querySelector('div#Whitelist');
    if (!WhitelistBtn) return;
    if (creatorIdInWhitelist()) {
        WhitelistBtn.style.color = "#00FF00";
        WhitelistBtn.title = "AdSkip: Creator is in whitelist. Not skipping ads.";
        return;
    }
    WhitelistBtn.style.color = "#ff0000";
    WhitelistBtn.title = "AdSkip: Creator is not in whitelist. Skipping ads.";
}
function getSearchBar() {
    searchBar = document.querySelector('ytd-searchbox[id="search"] div[id="container"]')
    if (!searchBar) { setTimeout(getSearchBar, 1); return; }
}
function getGuideButton() {
    guideButton = document.querySelector('#start yt-icon-button#guide-button');
    if (!guideButton) { setTimeout(getGuideButton, 1); return; }
}

// Whitelist logic //
function getCreatorID() {
    if (!watchPage) return;
    let creatorId = document.querySelector('a#header');
    if (!creatorId) { setTimeout(getCreatorID, 1); return; }
    creatorID = creatorId.getAttribute("href");
}
function creatorIdInWhitelist() {
    if (!creatorID) getCreatorID();
    return Whitelist.includes(creatorID);
}
function addButtons() {
    if (!debugMode) return;
    if (!searchBar) { setTimeout(addButtons, 1); return; }
    if (!searchBar.querySelector('#DEBUG_button')) searchBar.appendChild(debugButton);
    if (!searchBar.querySelector('#DEBUG_highlight')) searchBar.appendChild(highlightButton);
}
function addWatchPageButtons() {
    if (shortsPage && !document.querySelector('div#AntiShorts')) guideButton.after(AntiShortsButton);
    if (!watchPage) return;
    if (!searchBar || !guideButton) { setTimeout(getGuideButton, 1); return; }
    if (!document.querySelector('div#Whitelist')) guideButton.after(WhitelistButton);
}
function removeWatchPageButtons() { removeElement(document.querySelector('#Whitelist'),null,null); }
function DecBlockedInterval() { if (BlockedInterval > 0) BlockedInterval--; }

function getVideoID() {
    var ID = window.location.pathname.split("/").pop();
    if (ID == 'watch') {
        var Params = new URLSearchParams(window.location.search);
        return Params.get('v');
    }
    else return ID;
}

function QueueDebug(msg) {
    if (msg) { DebugQueue.push(msg); return; }
    if (DebugQueue.length) console.debug(DebugQueue);
    DebugQueue = [];
    return;
}
function QueueLog(msg) {
    if (msg) { LogQueue.push(msg); return; }
    if (LogQueue.length) console.log(LogQueue);
    LogQueue = [];
    return;
}

highlightButton.addEventListener('click', function() {
    const searchBarText = document.querySelector('input#search').value;
    const Elements = Array.from(document.querySelectorAll(searchBarText));
    Elements.forEach(temp => {
        QueueDebug(temp);
        DEBUG_highlightElement(temp);
    });
});

// Code run when Debug button is clicked... Used for whatever is needed.
debugButton.addEventListener('click', function() { forceAd(AdTypes.midVidEnforce); });

function forceAd(type) {
    let debugNode = document.createElement(type.Descriptor?
                                           `${type.Selector} ${type.Descriptor}`
                                         : `${type.Selector}`);

    waitForVideoNode().then(()=>{ VideoNode.appendChild(debugNode); });
}

WhitelistButton.addEventListener('click', function() {
    if (!creatorID) return;
    if (Whitelist.includes(creatorID)) { Whitelist.splice(Whitelist.indexOf(creatorID)); GM_setValue("whitelist", Whitelist); }
    else { Whitelist.push(creatorID); GM_setValue("whitelist", Whitelist); }
    setColor();
});
WhitelistButton.addEventListener('contextmenu', function() {
    Whitelist = [];
    GM_setValue("whitelist", Whitelist);
    setColor();
});

AntiShortsButton.addEventListener('click',
    function() { window.location.href = "https://youtube.com/watch?v=" + getVideoID(); });

function Main() {
    'use strict';
    //console.debug("Running main code");
    getSearchBar();
    getGuideButton();
    addButtons();
    if (watchPage) getCreatorID();
    // Call the handling function once for the existing nodes
    handleDOMChanges([{ type: 'childList', addedNodes: [document.body] }]);
    finishReloading();
};
