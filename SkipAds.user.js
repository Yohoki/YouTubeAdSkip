// ==UserScript==
// @name         YouTube Ad-Skip
// @icon         https://www.gstatic.com/youtube/img/branding/favicon/favicon_192x192.png
// @version      1.1.001
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
    const highlightButton = document.createElement('div');
    const WhitelistButton = document.createElement('div');
    debugButton.id = "DEBUG_button";
    highlightButton.id = "DEBUG_block";
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
            <svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 100 91" fill="none" stroke="currentcolor" stroke-width="6">
                <path id="Bug" d="M 31.00,33.00 C 31.00,33.00 31.75,16.62 50.00,17.00 69.62,16.88 70.00,33.00 70.00,33.00 70.00,33.00 70.00,62.00 70.00,62.00 70.00,62.00 68.88,78.62 50.00,79.00 31.12,79.25 31.00,62.00 31.00,62.00 31.00,62.00 31.00,33.00 31.00,33.00 Z M 38.88,8.25 C 38.88,8.25 50.12,26.62 61.62,8.38 61.62,8.50 51.38,27.25 38.88,8.25 Z M 43.62,40.00 C 43.62,40.00 56.25,40.25 56.25,40.25M 43.50,55.62 C 43.50,55.62 56.50,55.62 56.50,55.62M 92.25,11.62 C 92.25,11.62 92.25,25.75 92.25,25.75 92.25,25.75 71.00,37.25 71.00,37.25M 8.00,11.00 C 8.00,11.00 8.00,25.00 8.00,25.00 8.00,25.00 29.50,37.00 29.50,37.00M 8.00,48.00 C 8.00,48.00 29.00,48.00 29.00,48.00M 92.00,48.00 C 92.00,48.00 71.00,48.00 71.00,48.00M 92.00,85.00 C 92.00,85.00 92.00,70.00 92.00,70.00 92.00,70.00 71.00,59.00 71.00,59.00M 8.00,85.00 C 8.00,85.00 8.00,70.00 8.00,70.00 8.00,70.00 29.00,59.00 29.00,59.00" />
            </svg>
        </div>
    `;
    highlightButton.innerHTML = `
        <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 626 626">
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
            <use href="#FirstFill" style="stroke:none; fill:currentcolor;" />
            <use href="#FirstDraw" style="stroke:currentcolor; stroke-width:20px; fill:none;" />
            <use href="#CutsTarget" style="stroke:var(--ytd-searchbox-background); stroke-width:40px; fill:none;" />
            <use href="#CutsCSS" style="stroke:none; fill:var(--ytd-searchbox-background);" />
            <use href="#SecondDraw" style="stroke:currentcolor; stroke-width:20px; fill:none;" />
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
            searchBar.appendChild(highlightButton);
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
    highlightButton.addEventListener('click', function() {
        const searchBarText = document.querySelector('input#search').value;
        const Elements = document.querySelectorAll(searchBarText)
        Elements.forEach(temp => {
            console.debug(temp);
            DEBUG_highlightElement(temp);
        });
    });
    debugButton.addEventListener('click', function() {
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
