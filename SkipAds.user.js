// ==UserScript==
// @name         YouTube Ad-Skip
// @icon         https://www.gstatic.com/youtube/img/branding/favicon/favicon_192x192.png
// @version      1.0.5
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

    // Initialization
	let State = "Listening";
    let BlockedInterval = 0;
    setColor();

    // Function to handle the changes in the DOM
    function handleDOMChanges(mutationsList) {
        const curTime = new Date(Date.now()).toLocaleTimeString('en-US');
        //console.debug(curTime + " - AdSkip: Observer Listening");
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {

                // Check if an ad is showing
                const midVidAd = document.querySelector('.ad-showing');
				const homePageIframe = document.getElementById('player');
                //const homePagePremBanner = document.getElementById('masthead-ad');
                const homePagePremBanner = document.querySelectorAll('[id=masthead-ad]');
				const homePageInFeed = document.querySelectorAll('ytd-ad-slot-renderer');//.parentElement;
                //console.debug(homePageInFeed);
                if (!midVidAd && !homePageIframe && !homePagePremBanner && !homePageInFeed) {
                    State = "Listening";
                    return;
                }

                if (midVidAd) { // Mid-video ad break //
                    console.log(curTime + " - AdSkip: An ad is currently Playing.");
                    const skipButton = document.querySelector('button.ytp-ad-skip-button.ytp-button');
                    if (skipButton) {
                        skipButton.click();
                        console.log(curTime + " - AdSkip: Button found and clicked.");
                        State = "Listening"
                        BlockedInterval = 10;
                        setColor();
                    } else {
                        State = "Running";
                        BlockedInterval = 0;
                        setColor();
                        //console.log(curTime + " - AdSkip: Skip button not ready.");
                    }
                }
				if (homePageIframe) { // Hopepage Video ad inside iframe //
					const VideoAd = homePageIframe.contentDocument?.querySelector('#movie_player');
				    if (VideoAd && VideoAd.classList.contains("playing-mode")) {
						VideoAd.classList.remove("playing-mode");
						VideoAd.classList.add("ytp-small-mode");
						VideoAd.classList.add("unstarted-mode");
                        console.log(curTime + " - AdSkip: Home Page video ad paused.");
						BlockedInterval = 10;
					}
				}
				/*if (homePagePremBanner) { // Homepage, Large banner ad for premium subscription //
                    if (homePagePremBanner.style.display != 'none') {
                        homePagePremBanner.style.display = "none";
                        console.log(curTime + " - AdSkip: Home Page banner hidden.");
                        BlockedInterval = 10;
                    }
				}*/
                if (homePagePremBanner.length>0) {
                    homePagePremBanner.forEach((banner) => {
                        if (banner.style.display != 'none') {
                            banner.style.display = 'none';
                            console.log(curTime + " - AdSkip: Home Page banner hidden.");
                            BlockedInterval = 10;
                        }
                    });
                }
                if (homePageInFeed.length>0) {
				    homePageInFeed.forEach((temp) => { // Homepage, Small in-feed ads that look like a video. //
                        const inFeed = temp.parentElement.parentElement;
                        if (inFeed.style.display != 'none') {
                            inFeed.style.display = 'none';
                            console.log(curTime + " - AdSkip: Home Page in-feed ad hidden.");
                            BlockedInterval = 10;
                        }
                    });
                }
            }
        }
    }

    // Set Menu Bar color for status reporting.
    function setColor() {
        const menuBar = document.getElementById('guide-icon');
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
            /* case "Success":
                break; */
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
})();
