// ==UserScript==
// @name         YouTube Ad-Skip
// @icon         https://www.gstatic.com/youtube/img/branding/favicon/favicon_192x192.png
// @version      1.0.8
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
// ==/UserScript==

// Creator ID is at
// document.querySelector('a#header').href;

(function () {
    'use strict';
    //Debug mode
    const debugMode = false;

    // Initialization
	let State = "Listening";
    let BlockedInterval = 0;
    let watchPage = window.location.href.includes('watch');
    const searchBar = document.querySelector('ytd-searchbox[id="search"] div[id="container"]');
    const guideButton = document.querySelector('yt-icon-button#guide-button');
    //Debug button:
    const debugButton = document.createElement('div');
    const blockButton = document.createElement('div');
    const WhitelistButton = document.createElement('div');
    debugButton.id = "DEBUG_button";
    blockButton.id = "DEBUG_block";
    WhitelistButton.id = "Whitelist";

    setColor();
    addButtons();

    let creatorID = null;
    if (watchPage) getCreatorID();
    let Whitelist = GM_getValue("whitelist", []);


    // Function to handle the changes in the DOM
    function handleDOMChanges(mutationsList) {
        watchPage = window.location.href.includes('watch');
        //console.debug(watchPage);
        if (!watchPage) { removeWatchPageButtons(); }
        if (watchPage) { addWatchPageButtons(); }
        if (creatorIdInWhitelist() && watchPage) return;
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
                const homePageNudge = document.querySelector('ytd-feed-nudge-renderer');
                //console.debug(homePageInFeed);

                if (midVidAd) { // Mid-video ad break //
                    if (midVidAd.currentTime < midVidAd.duration) {
                        console.log(curTime + " - AdSkip: An ad is currently Playing.");
                        console.debug(midVidAd.src);
                        midVidAd.currentTime = midVidAd.duration;
                        console.log(curTime + " - AdSkip: Fast Forwarded ad to end.");
                        BlockedInterval = 10;
                        setColor();
                    }
                    const skipButton = document.querySelector('button.ytp-ad-skip-button.ytp-button');
                    if (skipButton) {
                        BlockedInterval = 10;
                        setColor();
                        clickElement(skipButton, null, 'Button found and clicked.');
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
		    homePageInFeed.forEach((temp) => removeElement(temp, '"Next Video" ad removed.'));
                }
                if (homePageInFeedTV) { // Homepage, YouTubeTV mid-feed YTTV banner. //
                    clickElement(homePageInFeedTV, 'button', "YouTubeTV ad banner dismissed. (Primetime Promo)");
                }
                if (homePageInFeedPrem) { // Homepage, YouTube mid-feed Premium banner. //
                    clickElement(homePageInFeedPrem,'button',"YouTube Premium ad banner dismissed. (Statement Banner)");
                }
                if (homePageBrandBanner) { // Homepage, YouTube mid-feed Brand banner. //
                    clickElement(homePageBrandBanner,'#dismiss-button button',"YouTube Premium ad banner dismissed. (Brand Video Banner)");
                }
                if (homePageNudge) { // Homepage, YouTube mid-feed Brand banner. //
                    clickElement(homePageNudge,'#dismiss-button button',"YouTube Nudge dismissed. (New to you in-feed)");
                }
            }
        }
    }

    function clickElement(Element, descriptor, Msg) {
        descriptor === null ? Element.click() : Element.querySelector(descriptor).click();
        removeElement(Element);
        BlockedInterval = 10;
        setColor();

        if (!Msg) { return; }
        const curTime = new Date(Date.now()).toLocaleTimeString('en-US');
        console.log(curTime + " - AdSkip: " + Msg);
    }
    function removeElement(Element, Msg) {
        if (!Element) return;
        Element.remove();
        if (!Msg) { return; }
        const curTime = new Date(Date.now()).toLocaleTimeString('en-US');
        console.log(curTime + " - AdSkip: " + Msg);
    }
    function hideElement(Element, Msg) {
        if (Element.style.display === 'none') { return; }
        Element.style.display = 'none';
        BlockedInterval = 10;
        setColor();

        if (!Msg) { return; }
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
        // Set whitelist icon color
        const WhitelistBtn = document.querySelector('div#Whitelist');
        if (!WhitelistBtn) return;
        if (creatorIdInWhitelist()) {
            WhitelistBtn.style.color = "#00FF00";
            WhitelistBtn.title = "AdSkip: Creator is in whitelist. Not skipping ads.";
        } else {
            WhitelistBtn.style.color = "#ff0000";
            WhitelistBtn.title = "AdSkip: Creator is not in whitelist. Skipping ads.";
        }
    }

    // MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver(handleDOMChanges);
    const observerOptions = { childList: true, subtree: true, };
    observer.observe(document.body, observerOptions);

    setInterval(setColor, 1000);

    // Whitelist logic //
    function getCreatorID() {
        if (!watchPage) return;
        let creatorId = document.querySelector('a#header');
        if (creatorId) { creatorID = creatorId.getAttribute("href");
        } else { setTimeout(getCreatorID, 1000); }
    }

    function creatorIdInWhitelist() {
        if (creatorID === null) getCreatorID();
        if (Whitelist.includes(creatorID) && creatorID !== null) return true;
        return false;
    }

    debugButton.innerHTML = `
        <div>
            <svg width="25px" height="25px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M4 2H3V14H4V2ZM7.29062 2.59314L6.5 3.00001V13L7.29062 13.4069L14.2906 8.40687V7.59314L7.29062 2.59314ZM13.1398 8.00001L7.5 12.0284V3.9716L13.1398 8.00001Z"/>
            </svg>
        </div>
    `;
    blockButton.innerHTML = `
        <div>
            <svg xmlns="http://www.w3.org/2000/svg" stroke="currentcolor" stroke-width="4px" width="25px" height="25px">
                <polygon points="31.663 5.5 16.337 5.5 5.5 16.337 5.5 31.663 16.337 42.5 31.663 42.5 42.5 31.663 42.5 16.337 31.663 5.5" transform="scale(.5)"/><line x1="18" y1="30" x2="30" y2="18" transform="scale(.5)"/><line x1="18" y1="18" x2="30" y2="30" transform="scale(.5)"/>
            </svg>
        </div>
    `;
    WhitelistButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 25 34">
            <style> #Whitelist path {fill:none; stroke:currentcolor; stroke-width:2;}</style>
            <path id="fingers" d="M 9.13,18.12 C 9.13,18.12 11.10,18.79 11.10,18.79 11.10,18.79 18.07,18.79 18.34,18.79 19.68,18.79 19.98,18.12 19.98,17.62 19.98,17.62 21.63,10.43 21.63,10.14 21.63,8.65 19.98,8.65 19.98,8.65" />
            <path id="thumb" d="M 8.63,9.98 C 8.63,9.98 10.94,6.48 10.94,6.48 10.94,6.48 10.94,5.24 10.94,4.49 11.31,2.83 12.69,2.83 12.91,2.83 14.58,2.47 15.19,4.28 15.38,4.49 15.87,5.15 15.87,6.23 15.87,6.48 16.14,7.00 15.38,8.65 15.38,8.65 15.38,8.65 19.98,8.65 19.98,8.65" />
            <path id="line0" d="M 5.55,30.18 C 5.55,30.18 19.74,30.18 19.74,30.18" />
            <path id="line1" d="M 5.55,26.10 C 5.55,26.10 19.74,26.10 19.74,26.10" />
            <path id="line2" d="M 5.55,22.03 C 5.55,22.03 19.74,22.03 19.74,22.03" />
            <path id="wrist" d="M 4.57,9.98 C 5.34,9.68 6.94,9.79 7.81,9.81 8.16,9.82 8.60,9.80 8.87,10.08 9.13,10.35 9.12,10.78 9.13,11.14 9.13,11.14 9.13,17.29 9.13,17.29 9.13,17.71 9.18,18.37 8.87,18.69 8.55,19.01 7.90,18.95 7.48,18.95 7.48,18.95 5.51,18.95 5.51,18.95 4.48,18.93 4.21,18.67 4.19,17.62 4.19,17.62 4.19,12.30 4.19,12.30 4.19,11.52 4.02,10.58 4.57,9.98 Z" />
            <path id="paper" d="M 2.71,1.21 C 2.71,1.21 4.69,1.16 4.69,1.16 4.69,1.16 8.14,1.16 8.14,1.16 8.14,1.16 18.91,1.16 18.91,1.16 18.91,1.16 21.88,1.16 21.88,1.16 22.34,1.16 22.71,1.17 23.11,1.47 23.63,1.86 23.68,2.39 23.68,2.99 23.68,2.99 23.68,25.85 23.68,25.85 23.68,25.85 23.68,29.93 23.68,29.93 23.68,30.49 23.76,31.43 23.53,31.92 23.19,32.64 22.58,32.75 21.88,32.75 21.88,32.75 6.25,32.75 6.25,32.75 6.25,32.75 3.29,32.75 3.29,32.75 2.83,32.75 2.43,32.71 2.06,32.39 1.60,31.99 1.56,31.49 1.56,30.92  1.56,30.92 1.56,8.31 1.56,8.31 1.56,8.31 1.56,2.83 1.56,2.83 1.57,1.97 1.88,1.46 2.71,1.21 Z" />
        </svg>
    `;

    function addButtons() {
        if (searchBar && debugMode) {
            searchBar.appendChild(debugButton);
        }
        if (searchBar && debugMode) {// && watchPage) {
            searchBar.appendChild(blockButton);
        }
    }
    function addWatchPageButtons() {
        if (document.querySelector('div#Whitelist') || !watchPage) return;
        if (searchBar && watchPage) {
            guideButton.after(WhitelistButton);
        }
    }
    function removeWatchPageButtons() {
        removeElement(document.querySelector('#Whitelist'));
        //removeElement(document.querySelector('#DEBUG_block'));
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
        console.debug(watchPage);
    });
    WhitelistButton.addEventListener('click', function() {
        if (creatorID == null) return;
        if (Whitelist.includes(creatorID)) { Whitelist.splice(Whitelist.indexOf(creatorID)); GM_setValue("whitelist", Whitelist); }
        else { Whitelist.push(creatorID); GM_setValue("whitelist", Whitelist); }
        setColor();
    });
    WhitelistButton.addEventListener('contextmenu', function() {
        Whitelist = [];
        GM_setValue("whitelist", Whitelist);
        setColor();
    });
})();
