/* ════════════════════════════════════════
   POPUP (iframe overlay)
════════════════════════════════════════ */
var _popupCloseTimer = null;

function _freshIframe() {
  // Replace the iframe element entirely — guarantees a clean slate with no stale listeners or cached state
  const wrap = document.getElementById('popup-frame-wrap');
  const old  = document.getElementById('popup-iframe');
  if (old) old.remove();
  const el = document.createElement('iframe');
  el.id    = 'popup-iframe';
  el.title = 'Popup';
  el.style.cssText = 'width:100%;height:85vh;max-height:85vh;border:none;display:block;border-radius:28px;';
  wrap.appendChild(el);
  return el;
}

function openPopup(page) {
  if (_popupCloseTimer) { clearTimeout(_popupCloseTimer); _popupCloseTimer = null; }

  const o      = document.getElementById('popup-overlay');
  const loader = document.getElementById('popup-loader');

  // Show spinner
  loader.classList.add('show');

  // Always create a brand-new iframe — eliminates ALL caching/listener/blank-state issues
  const iframe = _freshIframe();

  // Hide spinner exactly once when the new iframe finishes loading
  iframe.addEventListener('load', function handler() {
    iframe.removeEventListener('load', handler);
    loader.classList.remove('show');
  });

  iframe.src = page;

  o.classList.add('active');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => o.classList.add('visible')));
}

function closePopup() {
  const o = document.getElementById('popup-overlay');
  o.classList.remove('visible');
  document.body.style.overflow = '';
  _popupCloseTimer = setTimeout(() => {
    o.classList.remove('active');
    // Reset loader state for next open — no need to touch iframe src
    document.getElementById('popup-loader').classList.add('show');
    _popupCloseTimer = null;
  }, 350);
}

// Listen for back-button message from iframe pages (e.g. license.html)
window.addEventListener('message', function(e) {
  if (e.data === 'popup:close') closePopup();
});

// ── Push real-time updates to the source editor iframe ────────────
function _syncEditorFileUrl(url) {
  try {
    const iframe = document.getElementById('sourceEditorIframe');
    if (iframe && iframe.dataset.loaded && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'ej:sync-gh-fileurl', url: url || '' }, '*');
    }
  } catch(e) {}
}
function _syncEditorClearUrl() {
  try {
    const iframe = document.getElementById('sourceEditorIframe');
    if (iframe && iframe.dataset.loaded && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'ej:clear-gh-fileurl' }, '*');
    }
  } catch(e) {}
}

