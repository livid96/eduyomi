/**
 * router.js — History-based SPA router for Eduyomi
 *
 * Clean URL structure:
 *   /                                    Home (year grid)
 *   /year-title                          Year tab selected
 *   /year-title/subject-name             Subject view
 *   /year-title/subject-name/chapter     Subject + chapter highlighted
 *   /year-title/subject-name/ch/topic    Subject + topic highlighted
 *   /editor                              Curriculum editor (separate page)
 *   /contributors                        Contributors page
 *   /license                             License page
 */

(function () {
  'use strict';

  // ── Base path (works on GitHub Pages subdirectories too) ─────────────────────
  var BASE = (function () {
    // If served from a subpath like /eduyomi/, strip that prefix
    var base = document.querySelector('base[href]');
    if (base) return base.getAttribute('href').replace(/\/$/, '');
    return '';
  })();

  // ── Slug helpers ─────────────────────────────────────────────────────────────
  function slugify(str) {
    return (str || '').toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  function deslugify(slug) {
    return (slug || '').replace(/-/g, ' ');
  }
  window._routerSlugify   = slugify;
  window._routerDeslugify = deslugify;

  // ── Build a clean path URL ───────────────────────────────────────────────────
  window.buildDeepLink = function (year, subject, chapter, topic) {
    var path = BASE + '/' + slugify(String(year));
    if (subject) path += '/' + slugify(subject);
    if (chapter) path += '/' + slugify(chapter);
    if (topic)   path += '/' + slugify(topic);
    return path;
  };

  // ── Parse the current path into route parts ──────────────────────────────────
  window.parseRoute = function () {
    var raw   = location.pathname.replace(BASE, '').replace(/^\//, '');
    var parts = raw ? raw.split('/') : [];
    return {
      year:    parts[0] ? deslugify(parts[0]) : null,
      subject: parts[1] ? deslugify(parts[1]) : null,
      chapter: parts[2] ? deslugify(parts[2]) : null,
      topic:   parts[3] ? deslugify(parts[3]) : null,
    };
  };

  // ── Navigate (push real history entry) ───────────────────────────────────────
  window.navigateTo = function (year, subject, chapter, topic) {
    var url = buildDeepLink(year, subject, chapter, topic);
    history.pushState(null, '', url);
    handleRoute();
  };

  // ── Router push helpers (called by router-patch.js) ──────────────────────────
  window.routerPushHome = function () {
    history.replaceState(null, '', BASE + '/');
    document.title = 'Eduyomi';
  };
  window.routerPushSubject = function (year, subjectName) {
    var url = subjectName
      ? buildDeepLink(year, subjectName)
      : BASE + '/' + (window._routerSlugify ? window._routerSlugify(String(year)) : String(year));
    history.replaceState(null, '', url);
  };
  window.routerPushChapter = function (year, subjectName, chapterName) {
    history.replaceState(null, '', buildDeepLink(year, subjectName, chapterName));
  };
  window.routerPushTopic = function (year, subjectName, chapterName, topicTitle) {
    history.replaceState(null, '', buildDeepLink(year, subjectName, chapterName, topicTitle));
  };

  // ── Update <title> ───────────────────────────────────────────────────────────
  window.routerSetTitle = function (parts) {
    document.title = ['Eduyomi'].concat(parts || []).join(' · ');
  };

  // ── Main route handler ───────────────────────────────────────────────────────
  function handleRoute() {
    var route = parseRoute();

    if (!window._appReady) {
      window._pendingRoute = route;
      return;
    }

    // Real pages — never intercept these
    var path = location.pathname;
    if (/\/(editor|contributors|license)(\.html)?/.test(path)) return;

    if (!route.year) {
      if (typeof goHome === 'function') goHome();
      return;
    }

    var data = window.curriculumData;
    if (!data || !data.length) return;

    // Match year by slug
    var yi = data.findIndex(function (y) {
      return slugify(String(y.year_title || y.year || '')) === slugify(route.year);
    });
    if (yi < 0) { if (typeof goHome === 'function') goHome(); return; }

    if (!route.subject) {
      if (typeof showYear === 'function') showYear(yi, null);
      return;
    }

    // Match subject by slug
    var si = data[yi].subjects.findIndex(function (s) {
      var name = (s.subject_name && s.subject_name.en) || s.name || s.subject || '';
      return slugify(name) === slugify(route.subject);
    });
    if (si < 0) { if (typeof showYear === 'function') showYear(yi, null); return; }

    if (typeof openSubjectView === 'function') openSubjectView(yi, si);

    // Scroll to chapter / topic after render
    if (route.chapter) {
      requestAnimationFrame(function () {
        var chSlug = slugify(route.chapter);
        document.querySelectorAll('.chapter-header').forEach(function (el) {
          if (slugify(el.dataset.chapter || el.textContent) === chSlug) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (el.classList.contains('collapsed')) el.click();
          }
        });

        if (route.topic) {
          var topSlug = slugify(route.topic);
          document.querySelectorAll('.topic-item').forEach(function (el) {
            if (slugify(el.dataset.title || '') === topSlug) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              var btn = el.querySelector('.play-btn, .topic-play');
              if (btn) btn.click();
            }
          });
        }
      });
    }
  }

  // ── Browser back/forward ─────────────────────────────────────────────────────
  window.addEventListener('popstate', handleRoute);

  // ── Called by app-init (after all modules load) ──────────────────────────────
  window.routerInit = function () {
    window._appReady = true;
    handleRoute();
  };

})();
