// ==UserScript==
// @name         YouTube Ad-Skip
// @icon         https://www.gstatic.com/youtube/img/branding/favicon/favicon_192x192.png
// @version      1.0.3
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

    //let State = window.location.href.includes("watch") ? "Listening" : "LOCKED";
	let State = "Listening";
    let BlockedInterval = 0;

	//Maybe not needed since homepage has video ads.
	let currentPage = window.location.href;

    //Function to handle the URL change
    function handleURLChange() {
        const newURL = window.location.href;
        if (newURL !== currentPage) {
            // URL has changed, reset the State
            State = "Listening";
            BlockedInterval = 0;
            setColor();
            currentPage = newURL;
        }
        /*if (!window.location.href.includes("watch")) {
            State = "LOCKED";
            setColor();
            //console.debug("LOCKED");
        }*/
    }

    // Create a function to handle the changes in the DOM
    function handleDOMChanges(mutationsList) {
        if (State === "LOCKED") {return;}
        //Dec color timer and set colors.
        BlockedInterval--;
        setColor();
        //console.debug("blockedinterval: " + BlockedInterval);

        //console.log("AdSkip: Observer Listening");
        State = BlockedInterval > 0 ? State : "Listening";
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                // Check if an ad is showing
                const midVidAd = document.querySelector('.ad-showing');
				const homePageAd = document.querySelector('#player #movie_player');
				const homePagePremBanner = document.querySelector('#dismiss-button button');
                if (midVidAd) {
                    //console.log("AdSkip: An ad is currently Playing.");
                    State = "Running";
                    const skipButton = document.querySelector('button.ytp-ad-skip-button.ytp-button');
                    if (skipButton) {
                        skipButton.click();
                        //console.log("AdSkip: Button found and clicked.");
                        State = "Success";
                        BlockedInterval = 10;
                    } else {
                        //console.log("AdSkip: Skip button not ready.");
                    }
                }
                if (homePageAd.classList.contains("playing-mode")) {
					homePageAd.classList.remove("playing-mode");
					homePageAd.classList.add("ytp-small-mode");
					homePageAd.classList.add("unstarted-mode");
					console.log("AdSkip: Home Page ad paused.");
					State = "Success";
					BlockedInterval = 10;
                }
				if (homePagePremBanner) {
					homePagePremBanner.click();
					console.log("AdSkip: Home Page banner closed.");
					State = "Success";
					BlockedInterval = 10;
				}
            }
        }
    }

    // Set Menu Bar color for status reporting.
    function setColor() {
        const menuBar = document.getElementById('guide-icon');
        switch (State) {
            case "Listening":
                menuBar.style.color = '#FF0000';
                menuBar.title = "AdSkip: Listening for ads";
                break;
            case "Running":
                menuBar.style.color = '#FFFF00';
                menuBar.title = "AdSkip: Ad Detected. Trying to skip.";
                break;
            case "Success":
                menuBar.style.color = '#00FF00';
                menuBar.title = "AdSkip: Ad successfully skipped.";
                break;
            /*case "LOCKED":
                menuBar.style.color = '#666666';
                menuBar.title = "AdSkip: Not running on current page.";
                break;*/
        }
    }

    // Create a MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver(handleDOMChanges);

    // Define the options for the observer
    const observerOptions = {
        childList: true, // Watch for changes to the child elements of the target
        subtree: true, // Watch for changes in the entire subtree
    };

    // Start observing the DOM
    observer.observe(document.body, observerOptions);

	// Maybe not needed
    // Add an interval to check for URL changes
    setInterval(handleURLChange, 1000);
})();
