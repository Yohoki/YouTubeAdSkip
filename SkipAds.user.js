// ==UserScript==
// @name         YouTube Ad-Skip
// @icon         https://www.gstatic.com/youtube/img/branding/favicon/favicon_192x192.png
// @version      1.0.7
// @homepage     https://github.com/Yohoki/YouTubeAdSkip
// @downloadURL  https://github.com/Yohoki/YouTubeAdSkip/raw/main/SkipAds.user.js
// @updateURL    https://github.com/Yohoki/YouTubeAdSkip/raw/main/SkipAds.user.js
// @description  Simple ad-blocker bypass. Clicks "Skip Ads" button as soon as possible without triggering the adblock ban.
// @author       Yohoki
// @match        https://www.youtube.com/*
// @match        https://www.youtu.be/*
// @license      GNU GPL 3.0
// ==/UserScript==

(function () {
    'use strict';
    //Debug mode
    const debugMode = false;

    // Initialization
    let State = "Listening";
    let BlockedInterval = 0;
    let watchPage = window.location.href.includes('watch');
    setColor();

    // Function to handle the changes in the DOM
    function handleDOMChanges(mutationsList) {
        const curTime = new Date(Date.now()).toLocaleTimeString('en-US');
        //console.debug("AdSkip - Video page? : window.location.href.includes('watch'));
        //console.debug(curTime + " - AdSkip: Observer Listening");
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {

                // Check if an ad is showing
                const midVidAd = document.querySelector('.ad-showing video');
                const midVidPaper = document.querySelector('tp-yt-paper-dialog');
		const homePageMasthead = document.querySelectorAll('div#masthead-ad');
                const homePageInFeed = document.querySelectorAll('ytd-rich-item-renderer');
                const homePageInFeedTV = document.querySelector('ytd-primetime-promo-renderer');
                const homePageInFeedPrem = document.querySelector('ytd-statement-banner-renderer');
                const homePageBrandBanner = document.querySelector('ytd-brand-video-singleton-renderer');
                //console.debug(homePageInFeed);

                if (midVidAd) { // Mid-video ad break //
                    if (midVidAd.currentTime < midVidAd.duration) {
                        console.log(curTime + " - AdSkip: An ad is currently Playing.");
                        midVidAd.currentTime = midVidAd.duration;
                        console.log(curTime + " - AdSkip: Fast Forwarded ad to end.");
                    }
                    /*console.log(curTime + " - AdSkip: An ad is currently Playing.");
                    const skipButton = document.querySelector('button.ytp-ad-skip-button.ytp-button');
                    if (skipButton) {
                        State = "Listening";
                        clickElement(skipButton, null, 'Button found and clicked.');
                    } else {
                        State = "Running";
                        BlockedInterval = 0;
                        setColor();
                        //console.log(curTime + " - AdSkip: Skip button not ready.");
                    }*/
                }
                if (homePageMasthead.length > 0) { // Top of feed large banner ad, with or without a video. //
                    homePageMasthead.forEach(temp => removeElement(temp, "Home Page banner ad removed. (MastHead)"));
                }
                if (midVidPaper) { // Mid-Video Pop-up modal //
                    clickElement(midVidPaper, '#dismiss-button button', '"Paper Dialogue" pop-up  dismissed.');
                }
                if (homePageInFeed.length>0 && !watchPage) { // Homepage, Small in-feed ads that look like a video. //
                    homePageInFeed.forEach(temp => {
                        if (temp.querySelector('ytd-ad-slot-renderer')) { removeElement(temp, "Home Page in-feed ad removed."); }
                    });
                }
                if (homePageInFeed.length>0 && watchPage) { // Watch Page, in-feed ad that look like a video. //
		    homePageInFeed.forEach((temp) => removeElement(temp, '"Next Video" ad removed.'));//hideElement(temp, '"Next Video" ad hidden.'));
                }
                if (homePageInFeedTV) { // Homepage, YouTubeTV mid-feed YTTV banner. //
                    clickElement(homePageInFeedTV, 'button', "YouTubeTV ad banner dismissed. (Primetime Promo)");
                }
                if (homePageInFeedPrem) { // Homepage, YouTube mid-feed Premium banner. //
                    clickElement(homePageInFeedPrem,'button',"YouTube Premium ad banner dismissed. (Statement Banner)");
                }
                if (homePageBrandBanner) { // Homepage, YouTube mid-feed Brand banner. //
                    clickElement(homePageInFeedPrem,'#dismiss-button button',"YouTube Premium ad banner dismissed. (Brand Video Banner)");
                }
            }
        }
    }

    function clickElement(Element, descriptor, Msg) {
        descriptor === null ? Element.click() : Element.querySelector(descriptor).click();
        removeElement(Element);
        BlockedInterval = 10;
        setColor();

        if (Msg === null) { return; }
        const curTime = new Date(Date.now()).toLocaleTimeString('en-US');
        console.log(curTime + " - AdSkip: " + Msg);
    }
    function removeElement(Element, Msg) {
        Element.remove();
        const curTime = new Date(Date.now()).toLocaleTimeString('en-US');
        console.log(curTime + " - AdSkip: " + Msg);
    }
    function hideElement(Element, Msg) {
        if (Element.style.display === 'none') { return; }
        Element.style.display = 'none';
        BlockedInterval = 10;
        setColor();

        if (Msg === null) { return; }
        const curTime = new Date(Date.now()).toLocaleTimeString('en-US');
        console.log(curTime + " - AdSkip: " + Msg);
    }
    function DEBUG_highlightElement(Element) {
        //Element.style.backgroundColor = '#FFFF00';
        setTimeout(function() {
            Element.style.transition = 'background-color 1s';
            Element.style.backgroundColor = '#00FF00'; // Set to transparent to start the fade
        }, 1);
        Element.addEventListener('transitionend', function() {
            Element.style.removeProperty('background-color');
            Element.style.removeProperty('transition');
        }, { once: true });
    }

    // Set Menu Bar color for status reporting.
    function setColor() {
        const menuBar = document.querySelector('#guide-icon');
        if (BlockedInterval>0) {
            menuBar.style.color = '#00FF00';
            menuBar.title = "AdSkip: Ad successfully skipped.";
            BlockedInterval--;
            return;
            //console.debug("blockedinterval: " + BlockedInterval);
        }
        switch (State) {
            case "Listening":
                menuBar.style.color = '#FF0000';
                menuBar.title = "AdSkip: Listening for ads";
                break;
            case "Running":
                menuBar.style.color = '#FFFF00';
                menuBar.title = "AdSkip: Ad Detected. Trying to skip.";
                break;
            default:
                menuBar.style.color = '#666666';
                menuBar.title = "AdSkip: Not running on current page. Sum Ting Wong";
                break;
        }
    }

    // MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver(handleDOMChanges);
    const observerOptions = { childList: true, subtree: true, };
    observer.observe(document.body, observerOptions);

    setInterval(setColor, 1000);

    //Debug button:
    const debugButton = document.createElement('div');
    const blockButton = document.createElement('div');
    const searchBar = document.querySelector('ytd-searchbox[id="search"] div[id="container"]');

    debugButton.innerHTML = `
        <div id="DEBUG_button">
            <svg width="25px" height="25px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M4 2H3V14H4V2ZM7.29062 2.59314L6.5 3.00001V13L7.29062 13.4069L14.2906 8.40687V7.59314L7.29062 2.59314ZM13.1398 8.00001L7.5 12.0284V3.9716L13.1398 8.00001Z"/>
            </svg>
        </div>
    `;
    blockButton.innerHTML = `
        <div id="DEBUG_block">
            <svg xmlns="http://www.w3.org/2000/svg" stroke="currentcolor" stroke-width="4px" width="25px" height="25px">
                <polygon points="31.663 5.5 16.337 5.5 5.5 16.337 5.5 31.663 16.337 42.5 31.663 42.5 42.5 31.663 42.5 16.337 31.663 5.5" transform="scale(.5)"/><line x1="18" y1="30" x2="30" y2="18" transform="scale(.5)"/><line x1="18" y1="18" x2="30" y2="30" transform="scale(.5)"/>
            </svg>
        </div>
    `;

    if (searchBar && debugMode) {
        searchBar.appendChild(debugButton);
    }
    if (searchBar && debugMode && watchPage) {
        searchBar.appendChild(blockButton);
    }
    debugButton.addEventListener('click', function() {
        const searchBarText = document.querySelector('input#search').value;
        const Elements = document.querySelectorAll(searchBarText)
        Elements.forEach(temp => {
            console.debug(temp);
            DEBUG_highlightElement(temp);
        });
    });
    blockButton.addEventListener('click', function() {
        const searchBarText = document.querySelector('input#search').value;
        const Elements = document.querySelectorAll(searchBarText);
        Elements.forEach(temp => {
            console.debug(temp);
            temp.currentTime = temp.duration;
        });
    });
})();
