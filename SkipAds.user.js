// ==UserScript==
// @name         YouTube Ad-Skip
// @icon         https://www.gstatic.com/youtube/img/branding/favicon/favicon_192x192.png
// @version      1.0.1
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

    let State = "Listening";
    let BlockedInterval = 0;
    let currentPage = window.location.href;

    // Function to handle the URL change
    function handleURLChange() {
        const newURL = window.location.href;
        if (newURL !== currentPage) {
            // URL has changed, reset the State
            State = "Listening";
            BlockedInterval = 0;
            setColor();
            currentPage = newURL;
        }
        if (!window.location.href.includes("watch")) {
            State = "LOCKED";
            //console.debug("LOCKED");
        }
    }

    // Create a function to handle the changes in the DOM
    function handleDOMChanges(mutationsList) {
        if (State === "LOCKED") {return;}
        //Dec color timer and set colors.
        BlockedInterval--;
        setColor();
        //console.debug("blockedinterval: " + BlockedInterval);

        //console.log("AdSkip Observer Listening");
        State = BlockedInterval > 0 ? State : "Listening";
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                // Check if an ad is showing
                const adShowing = document.querySelector('.ad-showing');
                if (adShowing) {
                    //console.log("Ad is currently Playing.");
                    State = "Running";
                    const skipButton = document.querySelector('button.ytp-ad-skip-button.ytp-button');
                    if (skipButton) {
                        skipButton.click();
                        //console.log("Button found and clicked.");
                        State = "Success";
                        BlockedInterval = 20;
                    } else {
                        //console.log("Skip button not ready.");
                    }
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
            case "LOCKED":
                menuBar.style.color = '#666666';
                menuBar.title = "AdSkip: Not running on current page.";
                break;
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

    // Add an interval to check for URL changes
    setInterval(handleURLChange, 1000);
})();
