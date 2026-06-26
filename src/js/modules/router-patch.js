/* ═══════════════════════════════════════════════════════════════
   ROUTER INTEGRATION PATCH
   Wraps key navigation functions to keep the clean URL in sync.
   Exposes curriculumData so the router can resolve slugs.
═══════════════════════════════════════════════════════════════ */
(function () {

  // Expose MASTER_DATA as curriculumData for the router
  Object.defineProperty(window, 'curriculumData', {
    get: function () { return window.MASTER_DATA || []; }
  });

  // ── Helpers ───────────────────────────────────────────────────
  function yearOf(yi) {
    var d = window.MASTER_DATA;
    return d && d[yi] ? (d[yi].year_title || ('Year ' + (yi + 1))) : null;
  }
  function subjectOf(yi, si) {
    var d = window.MASTER_DATA;
    if (!d || !d[yi] || !d[yi].subjects[si]) return null;
    var s = d[yi].subjects[si];
    return (s.subject_name && s.subject_name.en) || s.name || s.subject || 'subject';
  }

  // ── Wrap goHome ───────────────────────────────────────────────
  var _origGoHome = window.goHome;
  window.goHome = function () {
    _origGoHome && _origGoHome.apply(this, arguments);
    if (window.routerPushHome)  routerPushHome();
    if (window.routerSetTitle)  routerSetTitle([]);
  };

  // ── Wrap goBack ───────────────────────────────────────────────
  var _origGoBack = window.goBack;
  window.goBack = function () {
    _origGoBack && _origGoBack.apply(this, arguments);
    if (window.routerPushHome)  routerPushHome();
    if (window.routerSetTitle)  routerSetTitle([]);
  };

  // ── Wrap showYear ─────────────────────────────────────────────
  var _origShowYear = window.showYear;
  window.showYear = function (n, btn) {
    _origShowYear && _origShowYear.apply(this, arguments);
    var year = yearOf(n);
    if (!year) return;
    // Push /year-slug to the URL
    if (window.routerPushSubject) routerPushSubject(year, '');
    if (window.routerSetTitle)    routerSetTitle([year]);
  };

  // ── Wrap openSubjectView ──────────────────────────────────────
  var _origOpenSubjectView = window.openSubjectView;
  window.openSubjectView = function (yi, si) {
    _origOpenSubjectView && _origOpenSubjectView.apply(this, arguments);
    var year = yearOf(yi), subject = subjectOf(yi, si);
    if (!year || !subject) return;
    if (window.routerPushSubject) routerPushSubject(year, subject);
    if (window.routerSetTitle)    routerSetTitle([year, subject]);
  };

  // ── Wrap buildPage — signals router when app is ready ─────────
  var _origBuildPage = window.buildPage;
  window.buildPage = function () {
    _origBuildPage && _origBuildPage.apply(this, arguments);
    if (!window._appReady && window.routerInit) {
      setTimeout(routerInit, 50);
    }
  };

  // ── Wrap toggleChapter — update URL with chapter slug ─────────
  var _origToggleChapter = window.toggleChapter;
  window.toggleChapter = function (headerEl) {
    _origToggleChapter && _origToggleChapter.apply(this, arguments);
    var csd = window.currentSubjectData;
    if (!csd) return;
    var year = yearOf(csd.yi), subj = subjectOf(csd.yi, csd.si);
    var ch   = headerEl && (headerEl.dataset.chapter || headerEl.textContent.trim());
    if (year && subj && ch && window.routerPushChapter) {
      routerPushChapter(year, subj, ch);
    }
  };

  // ── Wrap video play — update URL with topic slug ───────────────
  // Intercept clicks on .topic-item play buttons to push topic URL
  document.addEventListener('click', function (e) {
    var topicEl = e.target.closest && e.target.closest('.topic-item');
    var isPlay  = e.target.closest && (e.target.closest('.play-btn, .topic-play, .topic-title'));
    if (!topicEl || !isPlay) return;
    var csd = window.currentSubjectData;
    if (!csd) return;
    var year    = yearOf(csd.yi);
    var subject = subjectOf(csd.yi, csd.si);
    var chapter = topicEl.closest('.chapter-block');
    var chName  = chapter ? (chapter.querySelector('.chapter-header')?.dataset.chapter ||
                             chapter.querySelector('.chapter-header')?.textContent.trim()) : null;
    var topic   = topicEl.dataset.title || topicEl.querySelector('.topic-name')?.textContent.trim();
    if (year && subject && chName && topic && window.routerPushTopic) {
      routerPushTopic(year, subject, chName, topic);
      if (window.routerSetTitle) routerSetTitle([year, subject, topic]);
    }
  }, true); // capture phase so it runs before the play handler

})();
