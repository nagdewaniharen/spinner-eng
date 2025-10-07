////////////////////////////
// Custom Google Tracking //
////////////////////////////

if (storageAvailable('localStorage')) {
    var __dimension131 = localStorage.getItem("googleClientId");
} else {
    var __dimension131 = "";
}
const TRACKING_ID = "UA-85618867-1", _GAP_ = { dimension83: d83, dimension85: aff_id, dimension131: __dimension131 }; //object collection of parameters to feed GA

if (_GAP_.dimension131 != null) { //we have a clientId we want to use
    __gaTracker("create", TRACKING_ID, "auto", {
        clientId: _GAP_.dimension131
    });
} else { //we don't have a clientId, create one
    __gaTracker("create", TRACKING_ID, "auto");
    __gaTracker(function (t) {
        _GAP_.dimension131 = t.get("clientId");
    });

    localStorage.setItem("googleClientId", _GAP_.dimension131);
}

function isGoogleAnalyticsLoaded() {
    return typeof __gaTracker !== "undefined" && __gaTracker.loaded === true;
}

function logGAEvent(cat, act, lab) { //function call to log some user event
    var _eventGADATA = JSON.parse(JSON.stringify(_GAP_)); //new json object here
    _eventGADATA.hitCallback = function () {
        console.log("Event Complete: " + act);
    };

    try {
        if (isGoogleAnalyticsLoaded()) {
            __gaTracker('send', 'event', cat, act, lab, _eventGADATA);
        } else {
            console.log("GA Error: Undefined");
        }
    } catch (err) {
        console.log("GA Error: " + err);
    }
}

__gaTracker("send", "pageview", _GAP_); //record a page view

//send an event with no user action
var _loadGADATA = JSON.parse(JSON.stringify(_GAP_)); //new json object here 
_loadGADATA.nonInteraction = true;
_loadGADATA.hitCallback = function () { console.log("DOM Ready"); };
__gaTracker('send', 'event', "Presale Page", "DOM Ready", "DOM Ready", _loadGADATA);

////////////////////////////
//       Spin Wheel       //
////////////////////////////

var gameHasPlayed = pes_get_interaction();

//PES Set
function pes_set_interaction() {
    if (!storageAvailable('localStorage')) return;
    localStorage.setItem('hasInteracted-time-' + gameType + "-" + gameTheme + "-" + gameVariation, new Date().getTime());
    localStorage.setItem('hasInteracted-' + gameType + "-" + gameTheme + "-" + gameVariation, 1);
}

//PES Get
function pes_get_interaction() {
    if (!storageAvailable('localStorage')) return false;

    var interacted = parseInt(localStorage.getItem('hasInteracted-' + gameType + "-" + gameTheme + "-" + gameVariation)) == 1 ? true : false;
    var interactionTime = parseInt(localStorage.getItem('hasInteracted-time-' + gameType + "-" + gameTheme + "-" + gameVariation));
    var interactionValid = false;

    var lastSegment = gameVariation.split('-')[1];

    if (interacted && lastSegment.substring(0, 3) == "app") {
        interactionValid = true;
    } else if (interacted) {
        var expiry = 86400 * 7 * 1000; //7 days in milliseconds
        var now = new Date().getTime();
        if (isNaN(interactionTime)) {
            interactionValid = false;
        } else if (now - interactionTime < expiry) {
            interactionValid = true;
        } else {
            interactionValid = false;
        }
    }

    return interactionValid;
}

function storageAvailable(type) {
    var storage;
    try {
        storage = window[type];
        var x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch (e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            (storage && storage.length !== 0);
    }
}
/***************************************************
 * Duplicated from 69_onPageLoad that needs to be updated if below has been modified an OAuth version also exists at oAuthForm.js
 */

var doGameLinkOut;
var doGameLinkoutWithOverride;
var gameHasPlayed = pes_get_interaction();

(function () {
    function linkout(overrideLink = false) {
        logGAEvent("Presale Page", "linkout-click", "User Event");
        AmplitudeHelper.trackOutbound("linkout-click")
        let link = overrideLink ? overrideLink : presellLinkout;

        if (crossDomainEnaled) {
            link += `&${crossDomainKey}=${btag5Amplitude}`;
        }

        var redirect = window.open(link, "_blank");
        redirect.focus();
    }

    doGameLinkOut = function () { linkout(); };
    doGameLinkOutWithOverride = function (overrideLink) { linkout(overrideLink); };
})()