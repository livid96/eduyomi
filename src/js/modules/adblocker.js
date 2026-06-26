/* ════════════════════════════════════════
   FULL-POWER AD BLOCKER
   Strategy: network intercept + YT IMA SDK
   nullification + player-state ad detection
   + rapid seek-past + DOM nuke + mute guard
   + request interception + IMA nullification
   + postMessage hijack + CSS injection + iframe sandbox
════════════════════════════════════════ */

const _adBlockState = {
  domObserver: null,
  adCheckInterval: null,
  iframeObserver: null,
  adMuted: false,
  lastNotice: 0,
  adSeekCount: 0,
  lastAdSeek: 0,
  cssInjected: new WeakSet(),
  hookedIframes: new WeakSet(),
};

function isAdBlockEnabled() { return settingsState.adBlockEnabled !== false; }

(function initAdBlocker() {

  /* ══ LAYER 1: Block ad network requests (fetch + XHR) — expanded host list ══ */
  const AD_HOSTS = [
    // Google / DoubleClick core
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'googleads.g.doubleclick.net', 'ad.doubleclick.net', 'cm.g.doubleclick.net',
    'static.doubleclick.net', 'securepubads.g.doubleclick.net',
    'tpc.googlesyndication.com', 'pagead2.googlesyndication.com',
    'adservice.google.com', 'www.googleadservices.com',
    'fundingchoicesmessages.google.com',
    // YouTube ad endpoints
    'ads.youtube.com', 'ad.youtube.com', 'imasdk.googleapis.com',
    'youtube.com/pagead', 'youtube.com/api/stats/ads',
    'youtube.com/get_video_info?ad', 'youtube.com/ptracking',
    'youtube.com/api/stats/qoe?', 'yt.be/ad',
    'youtube.com/youtubei/v1/player/ad_break',
    'youtube.com/youtubei/v1/log_event',
    // 3rd-party ad/tracking networks
    'yandex.ru/ads', 'criteo.com', 'moatads.com',
    'adnxs.com', 'openx.net', 'rubiconproject.com', 'pubmatic.com',
    'smartadserver.com', 'taboola.com', 'outbrain.com',
    'amazon-adsystem.com', 'media.net', 'lijit.com',
    'advertising.com', 'casalemedia.com', 'synacor.com',
    'spotxchange.com', 'adsrvr.org', 'quantserve.com',
    'scorecardresearch.com', 'googletagservices.com', 'googletagmanager.com',
    'analytics.google.com', 'bat.bing.com', 'connect.facebook.net',
    'static.ads-twitter.com', 'ads.linkedin.com',
    // Telemetry/beacons that feed ad targeting
    'yt3.ggpht.com/ytc/AKedOL',
  ];

  // Regex patterns for URL paths that are ad-related even on non-ad hosts
  const AD_PATH_PATTERNS = [
    /\/pagead\//i, /\/adview\?/i, /[?&]ad_type=/i,
    /[?&]adformat=/i, /\/ads\//i, /adbreak/i,
    /\/get_midroll_info/i, /\/api\/stats\/ads/i,
  ];

  function isAdURL(url) {
    if (!url || typeof url !== 'string') return false;
    if (AD_HOSTS.some(h => url.includes(h))) return true;
    if (AD_PATH_PATTERNS.some(p => p.test(url))) return true;
    return false;
  }

  const _FAKE_AD_RESPONSE = JSON.stringify({
    adBreaks: [], adPlacements: [], playerAds: [],
    adSlots: [], adPods: [], prerollAds: [],
  });

  // Override fetch
  const _origFetch = window.fetch;
  window.fetch = function(input, init) {
    if (!isAdBlockEnabled()) return _origFetch.apply(this, arguments);
    const url = typeof input === 'string' ? input : (input?.url || '');
    if (isAdURL(url)) {
      console.debug('[AdBlock] ✗ fetch blocked:', url.slice(0, 80));
      return Promise.resolve(new Response(_FAKE_AD_RESPONSE,
        { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return _origFetch.apply(this, arguments);
  };

  // Override XHR
  const _origXHROpen = XMLHttpRequest.prototype.open;
  const _origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._adBlocked = isAdBlockEnabled() && isAdURL(typeof url === 'string' ? url : '');
    if (this._adBlocked) console.debug('[AdBlock] ✗ XHR blocked:', String(url).slice(0, 80));
    return _origXHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    if (this._adBlocked) {
      // Fire load event with fake empty response so callers don't hang
      setTimeout(() => {
        try {
          Object.defineProperty(this, 'status', { value: 200 });
          Object.defineProperty(this, 'responseText', { value: _FAKE_AD_RESPONSE });
          this.dispatchEvent(new Event('load'));
        } catch(e) {}
      }, 0);
      return;
    }
    return _origXHRSend.apply(this, arguments);
  };

  /* ══ LAYER 2: Beacon / sendBeacon block ══ */
  const _origSendBeacon = navigator.sendBeacon?.bind(navigator);
  if (_origSendBeacon) {
    navigator.sendBeacon = function(url, data) {
      if (!isAdBlockEnabled()) return _origSendBeacon(url, data);
      if (isAdURL(url)) { console.debug('[AdBlock] ✗ beacon blocked:', url.slice(0, 80)); return true; }
      return _origSendBeacon(url, data);
    };
  }

  /* ══ LAYER 3: Nullify YT IMA SDK (full stub) ══ */
  function buildIMAStub() {
    const noop = () => {};
    const noopObj = () => ({ addEventListener: noop, removeEventListener: noop, destroy: noop });
    return {
      AdDisplayContainer: function() { return { initialize: noop, destroy: noop }; },
      AdError: class AdError extends Error { constructor(m) { super(m); } static Type = {}; static ErrorCode = {}; },
      AdErrorEvent: { Type: { AD_ERROR: 'adError' } },
      AdEvent: { Type: {
        CONTENT_PAUSE_REQUESTED: 'contentPauseRequested',
        CONTENT_RESUME_REQUESTED: 'contentResumeRequested',
        LOADED: 'loaded', STARTED: 'started', COMPLETE: 'complete',
        FIRST_QUARTILE: 'firstQuartile', MIDPOINT: 'midpoint',
        THIRD_QUARTILE: 'thirdQuartile', ALL_ADS_COMPLETED: 'allAdsCompleted',
        SKIPPED: 'skipped', SKIPPABLE_STATE_CHANGED: 'skippableStateChanged',
        IMPRESSION: 'impression', PAUSED: 'pause', RESUMED: 'resume',
        CLICK: 'click', LOG: 'log', AD_BREAK_READY: 'adBreakReady',
        AD_METADATA: 'adMetadata', DURATION_CHANGE: 'durationChange',
        INTERACTION: 'interaction', LINEAR_CHANGED: 'linearChanged',
        USER_CLOSE: 'userClose', VIDEO_CLICKED: 'videoClicked',
        VIDEO_ICON_CLICKED: 'videoIconClicked', VIEWABLE_IMPRESSION: 'viewableImpression',
      }},
      AdsLoader: function() {
        return {
          addEventListener: noop, removeEventListener: noop,
          requestAds(req) { try { req?._resolve?.(); } catch(e){} },
          contentComplete: noop, destroy: noop,
          getSettings() { return { setAutoPlayAdBreaks: noop, setDisableCustomPlaybackForIOS10Plus: noop,
            setLocale: noop, setNumRedirects: noop, setPlayerType: noop,
            setPlayerVersion: noop, setVpaidMode: noop }; },
        };
      },
      AdsManager: function() {
        return {
          init: noop, start: noop, destroy: noop, stop: noop, pause: noop, resume: noop,
          addEventListener: noop, removeEventListener: noop,
          getCuePoints() { return []; }, getRemainingTime() { return 0; },
          getVolume() { return 1; }, setVolume: noop,
          resize: noop, collapse: noop, expand: noop,
          isCustomClickTrackingUsed() { return false; },
          isCustomPlaybackUsed() { return false; },
        };
      },
      AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: 'adsManagerLoaded' } },
      AdsRenderingSettings: function() {},
      AdsRequest: function() {},
      AdPodInfo: function() { return { getAdPosition() { return 0; }, getTotalAds() { return 0; } }; },
      CompanionAd: function() {},
      ImaSdkSettings: function() { return {
        setAutoPlayAdBreaks: noop, setDisableCustomPlaybackForIOS10Plus: noop,
        setLocale: noop, setNumRedirects: noop, setPlayerType: noop,
        setPlayerVersion: noop, setVpaidMode: noop,
        getCompanionBackfill() { return 'always'; },
        getDisableCustomPlaybackForIOS10Plus() { return false; },
        getLocale() { return 'en'; },
        getNumRedirects() { return 4; },
        getPlayerType() { return 'Unknown'; },
        getPlayerVersion() { return '1.0'; },
        getPpid() { return ''; },
        getVpaidMode() { return 0; },
      }; },
      UiElements: { AD_ATTRIBUTION: 'adAttribution', COUNTDOWN: 'countdown' },
      ViewMode: { FULLSCREEN: 'fullscreen', NORMAL: 'normal' },
      VERSION: '3.999.999',
    };
  }

  function installIMAStub(win) {
    if (!win) return;
    try {
      if (!win.google) win.google = {};
      win.google.ima = buildIMAStub();
      // Also stub YT's internal ad scheduler reference
      if (win.ytAdConfig) win.ytAdConfig = { adBreaks: [], adPlacements: [] };
    } catch(e) {}
  }
  installIMAStub(window);

  /* ══ LAYER 4: postMessage interception — block YT ad control messages ══ */
  const _origAddEventListener = EventTarget.prototype.addEventListener;
  window.addEventListener('message', function(evt) {
    if (!isAdBlockEnabled()) return;
    try {
      const data = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;
      if (data && (data.event === 'adStart' || data.event === 'adBreak' ||
          data.event === 'onAdStart' || String(data.func || '').toLowerCase().includes('ad'))) {
        evt.stopImmediatePropagation();
      }
    } catch(e) {}
  }, true); // capture phase — runs before YT's own handlers

  /* ══ LAYER 5: Nuke ad DOM elements — extended selector list ══ */
  const AD_SELECTORS = [
    // In-stream overlays
    '.ytp-ad-overlay-container', '.ytp-ad-text-overlay', '.ytp-ad-image-overlay',
    '.ytp-ad-player-overlay', '.ytp-ad-player-overlay-instream-info',
    '.ytp-ad-preview-container', '.ytp-ad-skip-button-container',
    '.ytp-ad-overlay-slot', '.ytp-ad-overlay-image',
    // Ad UI chrome
    '.ytp-ad-module', '.ytp-ad-message-container', '.ytp-ad-action-interstitial',
    '.ytp-ad-progress', '.ytp-ad-progress-list', '.ytp-ad-simple-ad-badge',
    '.ytp-ad-duration-remaining', '.ytp-ad-visit-advertiser-button',
    '.ytp-ad-button-icon', '.ytp-ad-button', '.ytp-ad-preview-text',
    '.ytp-ad-skip-button-modern', '.ytp-ad-overlay-close-button',
    '.ytp-ad-survey', '.ytp-ad-feedback-dialog-container',
    '.ytp-ad-player-overlay-skip-or-preview', '.ytp-ad-action-interstitial-slot',
    '.ytp-ad-player-overlay-layout', '.ytp-ad-clickthrough-url',
    // Page-level YT ad elements
    '.ytp-suggested-action', 'ytd-action-companion-ad-renderer',
    'ytd-banner-promo-renderer', 'ytd-statement-banner-renderer',
    'ytd-promoted-sparkles-web-renderer', 'ytd-promoted-video-renderer',
    'ytd-display-ad-renderer', 'ytd-companion-slot-renderer',
    'ytd-video-masthead-ad-v3-renderer', 'ytd-in-feed-ad-layout-renderer',
    'ytd-promoted-sparkles-text-search-renderer', 'ytd-search-pyv-renderer',
    'ytd-ad-slot-renderer', 'yt-about-this-ad-renderer',
    'ytm-promoted-sparkles-web-renderer', 'ytd-brand-video-singleton-renderer',
    '#player-ads', '#masthead-ad', '#watch-flexy[ad-showing]',
    // Generic ad containers
    'div[id^="google_ads_"]', 'ins.adsbygoogle',
    '[class*="ad-banner"]', '[id*="ad-banner"]',
    '[id^="dfp-ad"]', '[class^="dfp-ad"]',
    'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
    'iframe[src*="googleadservices"]', 'iframe[src*="imasdk"]',
    // Survey & interstitial
    '.ytp-ce-element', '.ytp-cards-teaser',
  ];

  function nukeAdDOM(root) {
    if (!isAdBlockEnabled() || !root) return;
    AD_SELECTORS.forEach(sel => {
      try {
        root.querySelectorAll(sel).forEach(el => {
          el.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;height:0!important;width:0!important;max-height:0!important;overflow:hidden!important;';
        });
      } catch(e) {}
    });
  }

  /* ══ LAYER 6: CSS injection into iframe document ══ */
  function injectAdBlockCSS(doc) {
    if (!doc || _adBlockState.cssInjected.has(doc)) return;
    try {
      const style = doc.createElement('style');
      style.textContent = AD_SELECTORS.map(s => `${s}{display:none!important;height:0!important;}`).join('\n') + `
        .ad-showing .ytp-chrome-bottom { display: block !important; }
        .ad-showing video { display: block !important; }
        .ytp-ad-progress-list { display: none !important; }
        .ytp-ad-module { display: none !important; }
        [id*="-ad-"], [class*="-ad-"] { display: none !important; }
      `;
      (doc.head || doc.documentElement).appendChild(style);
      _adBlockState.cssInjected.add(doc);
    } catch(e) {}
  }

  /* ══ Iframe DOM hook (observe + CSS inject) ══ */
  function hookIframeDOM() {
    const iframe = document.getElementById('youtube-engine');
    if (!iframe) return;
    let iDoc;
    try { iDoc = iframe.contentDocument || iframe.contentWindow?.document; } catch(e) { return; }
    if (!iDoc || _adBlockState.hookedIframes.has(iDoc)) return;
    _adBlockState.hookedIframes.add(iDoc);
    // Install IMA stub inside iframe window too
    try { installIMAStub(iframe.contentWindow); } catch(e) {}
    nukeAdDOM(iDoc);
    injectAdBlockCSS(iDoc);
    if (_adBlockState.iframeObserver) _adBlockState.iframeObserver.disconnect();
    _adBlockState.iframeObserver = new MutationObserver(() => {
      if (isAdBlockEnabled()) { nukeAdDOM(iDoc); injectAdBlockCSS(iDoc); }
    });
    try { _adBlockState.iframeObserver.observe(iDoc.documentElement, { childList: true, subtree: true, attributes: true }); } catch(e) {}
  }

  /* Observe the main document */
  _adBlockState.domObserver = new MutationObserver(() => { if (isAdBlockEnabled()) nukeAdDOM(document); });
  _adBlockState.domObserver.observe(document.documentElement, { childList: true, subtree: true });
  nukeAdDOM(document);

  /* ══ LAYER 7: Auto-click all skip buttons every 200ms ══ */
  function aggressiveSkip() {
    if (!isAdBlockEnabled()) return;
    const iframe = document.getElementById('youtube-engine');
    let iDoc;
    try { iDoc = iframe?.contentDocument || iframe?.contentWindow?.document; } catch(e) {}
    const roots = [document];
    if (iDoc && iDoc !== document) roots.push(iDoc);

    const SKIP_SELECTORS = [
      '.ytp-skip-ad-button', '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern', '.ytp-ad-skip-button-slot',
      'button[class*="skip"]', '.videoAdUiSkipButton',
      '.ytp-ad-skip-button-container button',
    ];

    roots.forEach(root => {
      SKIP_SELECTORS.forEach(sel => {
        try {
          root.querySelectorAll(sel).forEach(btn => {
            if (btn.offsetParent !== null || getComputedStyle(btn).display !== 'none') {
              btn.click();
              // Also dispatch synthetic events in case click() is overridden
              btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              console.debug('[AdBlock] ✓ Skip clicked');
            }
          });
        } catch(e) {}
      });
    });
  }

  /* ══ LAYER 8: Player-state ad detection + seek-past + YT internal API patch ══ */

  // Patch YT's own internal ad-related functions once the player loads
  function patchYTInternals(win) {
    if (!win || win._abPatched) return;
    try {
      // Disable YT's ad scheduler if accessible
      if (win.yt?.ads) { win.yt.ads = null; }
      if (win._yt_player) {
        const p = win._yt_player;
        ['getAdvertisement', 'getAdState', 'getAdMetadata'].forEach(fn => {
          if (typeof p[fn] === 'function') p[fn] = () => null;
        });
      }
      win._abPatched = true;
    } catch(e) {}
  }

  function detectAndKillAd() {
    if (!mainPlayer || !isAdBlockEnabled()) return;

    let adPlaying = false;

    // Method A: YT IFrame API getVideoData — isAd flag
    try {
      const d = mainPlayer.getVideoData?.();
      if (d && (d.isAd === true || (currentVideoId && d.video_id && d.video_id !== currentVideoId))) {
        adPlaying = true;
      }
    } catch(e) {}

    // Method B: Duration heuristic — playing video < 35s = likely ad
    try {
      const dur   = mainPlayer.getDuration?.() || 0;
      const state = mainPlayer.getPlayerState?.();
      if ((state === 1 || state === 3) && dur > 0 && dur < 35 && currentVideoId) adPlaying = true;
    } catch(e) {}

    // Method C: DOM presence of ad overlay elements in iframe
    try {
      const iframe = document.getElementById('youtube-engine');
      const iDoc   = iframe?.contentDocument || iframe?.contentWindow?.document;
      if (iDoc) {
        const adEl = iDoc.querySelector(
          '.ytp-ad-player-overlay,.ytp-ad-module,.ytp-ad-progress-list,.ytp-ad-simple-ad-badge'
        );
        if (adEl && adEl.offsetParent !== null) adPlaying = true;
        // Method D: Check <video> element for ad src pattern
        try {
          const vid = iDoc.querySelector('video');
          if (vid && vid.src && /googlevideo\.com.*adformat/i.test(vid.src)) adPlaying = true;
        } catch(e2) {}
        // Patch internals if we have iframe access
        try { patchYTInternals(iframe.contentWindow); } catch(e2) {}
      }
    } catch(e) {}

    // Method E: Player class attribute — YT sets .ad-showing on wrapper
    try {
      const wr = document.querySelector('.html5-video-player,.ytp-player');
      if (wr && wr.classList.contains('ad-showing')) adPlaying = true;
    } catch(e) {}

    if (adPlaying) {
      aggressiveSkip();
      hookIframeDOM();

      // Mute during ad
      if (!_adBlockState.adMuted) {
        try { mainPlayer.mute?.(); _adBlockState.adMuted = true; } catch(e) {}
      }

      // Seek to end of ad (throttled to prevent loops)
      const now = Date.now();
      if (now - _adBlockState.lastAdSeek > 600) {
        _adBlockState.lastAdSeek = now;
        _adBlockState.adSeekCount++;
        try {
          const dur = mainPlayer.getDuration?.() || 0;
          if (dur > 0) mainPlayer.seekTo?.(dur, true);
        } catch(e) {}
      }

      // Show notice (throttled)
      if (now - _adBlockState.lastNotice > 4000) {
        _adBlockState.lastNotice = now;
        showAdBlockNotice();
      }

    } else {
      // Ad ended — restore unmuted state
      if (_adBlockState.adMuted) {
        try { mainPlayer.unMute?.(); _adBlockState.adMuted = false; } catch(e) {}
      }
      _adBlockState.adSeekCount = 0;
    }
  }

  /* ══ LAYER 9: Block dynamically injected ad <script> tags ══ */
  const _origCreateElement = document.createElement.bind(document);
  document.createElement = function(tag) {
    const el = _origCreateElement(tag);
    if (isAdBlockEnabled() && tag.toLowerCase() === 'script') {
      const _origSetAttribute = el.setAttribute.bind(el);
      el.setAttribute = function(name, value) {
        if (name === 'src' && isAdURL(value)) {
          console.debug('[AdBlock] ✗ script blocked:', value.slice(0, 80));
          return; // drop the src silently
        }
        return _origSetAttribute(name, value);
      };
      Object.defineProperty(el, 'src', {
        set(value) {
          if (isAdBlockEnabled() && isAdURL(value)) {
            console.debug('[AdBlock] ✗ script.src blocked:', value.slice(0, 80));
            return;
          }
          el.setAttribute('src', value);
        },
        get() { return el.getAttribute('src') || ''; },
        configurable: true,
      });
    }
    return el;
  };

  /* ══ Ad watcher loop ══ */
  function startAdWatcher() {
    if (_adBlockState.adCheckInterval) return;
    _adBlockState.adCheckInterval = setInterval(() => {
      if (!isAdBlockEnabled()) {
        if (_adBlockState.adMuted) { try { mainPlayer?.unMute?.(); } catch(e) {} _adBlockState.adMuted = false; }
        return;
      }
      aggressiveSkip();
      hookIframeDOM();
      detectAndKillAd();
    }, 200); // 200ms — tighter loop
    console.debug('[AdBlock] Watcher started');
  }

  /* ══ Ad notice toast ══ */
  function showAdBlockNotice() {
    if (!isAdBlockEnabled()) return;
    let notice = document.getElementById('adblock-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'adblock-notice';
      Object.assign(notice.style, {
        position: 'absolute', top: '14px', left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10,12,24,0.88)',
        border: '1px solid rgba(74,222,128,0.35)',
        color: '#fff', fontSize: '0.72rem', fontWeight: '700',
        letterSpacing: '0.04em', padding: '6px 14px',
        borderRadius: '20px', zIndex: '9999',
        display: 'flex', alignItems: 'center', gap: '7px',
        backdropFilter: 'blur(10px)', pointerEvents: 'none',
      });
      notice.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span style="color:#4ade80">Ad blocked</span>`;
      const card = document.getElementById('videoPlayerCard');
      if (card) card.appendChild(notice);
    }
    notice.style.animation = 'none';
    void notice.offsetWidth;
    notice.style.animation = 'adblock-fade 2.5s ease forwards';
  }

  /* ══ Keyframes ══ */
  const abStyle = document.createElement('style');
  abStyle.textContent = `
    @keyframes adblock-fade {
      0%   { opacity:0; transform:translateX(-50%) translateY(-6px) scale(.95); }
      12%  { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
      72%  { opacity:1; }
      100% { opacity:0; transform:translateX(-50%) translateY(-3px); }
    }
  `;
  document.head.appendChild(abStyle);

  /* ══ Wire to player lifecycle ══ */
  const _hookInterval = setInterval(() => {
    if (typeof doLoadVideo === 'function') {
      clearInterval(_hookInterval);
      const _orig = doLoadVideo;
      window.doLoadVideo = function() {
        const r = _orig.apply(this, arguments);
        startAdWatcher();
        _adBlockState.adSeekCount = 0;
        _adBlockState.lastAdSeek  = 0;
        return r;
      };
    }
  }, 80);

  window.addEventListener('load', () => setTimeout(startAdWatcher, 800));
  console.log('%c[Eduyomi AdBlock] 🛡️ MAXIMUM POWER — 9 layers active', 'color:#4ade80;font-weight:bold;font-size:13px;');

})();

function toggleAdBlock(enabled) {
  settingsState.adBlockEnabled = enabled;
  saveSettings();
  if (enabled) {
    console.log('%c[AdBlock] Enabled ✓', 'color:#4ade80;font-weight:bold;');
  } else {
    // Restore hidden elements
    document.querySelectorAll('[style*="display:none!important"]').forEach(el => el.style.cssText = '');
    const notice = document.getElementById('adblock-notice');
    if (notice) notice.remove();
    if (_adBlockState.adMuted) { try { mainPlayer?.unMute?.(); } catch(e) {} _adBlockState.adMuted = false; }
    console.log('%c[AdBlock] Disabled', 'color:#f87171;font-weight:bold;');
  }
}

function openVideoOnYT(e) {
  e.preventDefault();
  const vid = document.getElementById('creator-link').dataset.videoId || currentVideoId;
  if (vid) window.open('https://www.youtube.com/watch?v=' + vid, '_blank');
}

function closePlayer() {
  videoSect.classList.remove('visible');
  if (mainPlayer?.pauseVideo) mainPlayer.pauseVideo();
  isVideoPlaying = false;
  stopTimeTracker();
  document.querySelectorAll('.topic-item').forEach(el => el.classList.remove('playing'));
  currentVideoId = null;
}

