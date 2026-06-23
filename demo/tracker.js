/**
 * tracker.js
 * ---------------------------------------------------------------------
 * A drop-in analytics tracking script. Include it on any page with:
 *
 *   <script src="tracker.js" data-api-url="http://localhost:5000/api/events"></script>
 *
 * It will:
 *   1. Assign (or reuse) a session_id, persisted in localStorage so it
 *      survives page reloads and navigation within the same browser.
 *   2. Fire a `page_view` event as soon as the script loads.
 *   3. Fire a `click` event (with x/y viewport coordinates) on every
 *      click anywhere on the page.
 *   4. POST each event to the backend API as JSON.
 *
 * No external dependencies — designed to be embeddable on any page,
 * including ones that aren't part of this project.
 * ---------------------------------------------------------------------
 */
(function () {
  'use strict';

  // ---- Configuration -----------------------------------------------
  // The API endpoint is read from the script tag's data-api-url
  // attribute so the same file can be reused against different
  // backends without editing the source.
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var API_URL =
    (currentScript && currentScript.getAttribute('data-api-url')) ||
    'http://localhost:5000/api/events';

  var SESSION_STORAGE_KEY = 'analytics_session_id';
  var SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes of inactivity = new session
  var LAST_ACTIVE_KEY = 'analytics_last_active';

  // ---- Session handling ----------------------------------------------
  function generateSessionId() {
    // RFC4122-ish v4 UUID, good enough for a session identifier.
    return 'sess-' + (
      [1e7] + -1e3 + -4e3 + -8e3 + -1e11
    ).replace(/[018]/g, function (c) {
      return (
        c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16);
    });
  }

  function getSessionId() {
    try {
      var existing = localStorage.getItem(SESSION_STORAGE_KEY);
      var lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);
      var now = Date.now();

      var expired = !lastActive || now - lastActive > SESSION_TTL_MS;

      if (!existing || expired) {
        existing = generateSessionId();
        localStorage.setItem(SESSION_STORAGE_KEY, existing);
      }

      localStorage.setItem(LAST_ACTIVE_KEY, String(now));
      return existing;
    } catch (e) {
      // localStorage may be unavailable (e.g. privacy mode). Fall back to
      // an in-memory id that lasts for the page lifetime only.
      if (!window.__analyticsFallbackSessionId) {
        window.__analyticsFallbackSessionId = generateSessionId();
      }
      return window.__analyticsFallbackSessionId;
    }
  }

  // ---- Event sending -------------------------------------------------
  function sendEvent(payload) {
    var body = JSON.stringify(payload);

    // Prefer sendBeacon when available — it's fire-and-forget and works
    // even as the page is being unloaded. Fall back to fetch otherwise.
    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: 'application/json' });
      var sent = navigator.sendBeacon(API_URL, blob);
      if (sent) return;
    }

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      keepalive: true,
    }).catch(function (err) {
      // Swallow network errors — tracking should never break the host page.
      console.warn('[analytics] failed to send event:', err);
    });
  }

  function track(eventType, extra) {
    var payload = Object.assign(
      {
        session_id: getSessionId(),
        event_type: eventType,
        page_url: window.location.href,
        timestamp: new Date().toISOString(),
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
      },
      extra || {}
    );
    sendEvent(payload);
  }

  // ---- Wire up listeners ---------------------------------------------
  function init() {
    // page_view fires once per page load.
    track('page_view');

    // click fires on every click, anywhere in the document.
    document.addEventListener(
      'click',
      function (e) {
        track('click', { x: e.clientX, y: e.clientY });
      },
      true
    );
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  // Expose a tiny manual API in case a host page wants to fire custom events.
  window.Analytics = {
    track: track,
    getSessionId: getSessionId,
  };
})();
