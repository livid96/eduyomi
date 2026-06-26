/* ═══════════════════════════════════════════════════════════════
   ROUTER INTEGRATION PATCH
   Exposes curriculumData so the router can resolve slugs.
   NOTE: Router push calls are now made directly inside the
   actual functions (subject-view.js, year-tabs.js, video-player.js)
   because function declarations are hoisted and bypass window.xxx wraps.
═══════════════════════════════════════════════════════════════ */
(function () {

  // Expose MASTER_DATA as curriculumData for the router
  Object.defineProperty(window, 'curriculumData', {
    get: function () { return window.MASTER_DATA || []; }
  });

  // ── Signal router when app is ready after first buildPage ─────
  var _origBuildPage = window.buildPage;
  window.buildPage = function () {
    _origBuildPage && _origBuildPage.apply(this, arguments);
    if (!window._appReady && window.routerInit) {
      setTimeout(routerInit, 50);
    }
  };

})();
