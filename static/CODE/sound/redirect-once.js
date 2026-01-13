(function () {
  'use strict';

  // Destination to send first-time visitors to. Change if needed.
  var REDIRECT_TO = 'holdup.html';

  // Key used to mark that the redirect has already happened.
  var STORAGE_KEY = 'site_redirect_once_v1';

  // Optional: query param to opt-out while testing, e.g. ?skipHoldup=1
  function hasSkipParam() {
    try {
      return new URLSearchParams(window.location.search).get('skipHoldup') === '1';
    } catch (e) {
      return false;
    }
  }

  function storageAvailable() {
    try {
      var x = '__storage_test__';
      localStorage.setItem(x, x);
      localStorage.removeItem(x);
      return true;
    } catch (e) {
      return false;
    }
  }

  function hasSeen() {
    if (storageAvailable()) {
      return localStorage.getItem(STORAGE_KEY) === '1';
    }
    // cookie fallback
    return document.cookie.split(';').some(function (c) {
      return c.trim().indexOf(STORAGE_KEY + '=1') === 0;
    });
  }

  function setSeen() {
    if (storageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
        return;
      } catch (e) {
        // fall back to cookie below
      }
    }
    var d = new Date();
    d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
    document.cookie = STORAGE_KEY + '=1; expires=' + d.toUTCString() + '; path=/; SameSite=Lax';
  }

  function isSamePath(target) {
    try {
      var current = window.location.pathname.replace(/\/+$/, '');
      var tgt = (new URL(target, window.location.href)).pathname.replace(/\/+$/, '');
      return current === tgt;
    } catch (e) {
      // Fallback: simple includes check
      return window.location.pathname.indexOf(target) !== -1;
    }
  }

  // Do nothing if user explicitly opted out via query param
  if (hasSkipParam()) return;

  // If we're already on the target page, don't redirect.
  if (isSamePath(REDIRECT_TO)) return;

  // If already seen, skip redirect.
  if (hasSeen()) return;

  // Mark as seen and perform redirect. Use replace so back button doesn't return here.
  try {
    setSeen();
    // A tiny delay gives the browser a moment to persist storage on some platforms.
    setTimeout(function () {
      window.location.replace(REDIRECT_TO);
    }, 10);
  } catch (e) {
    // Fail silently so page doesn't break.
  }
})();
