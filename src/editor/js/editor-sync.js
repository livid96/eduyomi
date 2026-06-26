
// ── Sync theme & accent from Eduyomi host ──
(function() {
  const theme  = localStorage.getItem('ej-synced-theme') || localStorage.getItem('eduyomi-theme') || 'dark';
  const accent = localStorage.getItem('ej-synced-accent') || localStorage.getItem('eduyomi-accent') || '#7c6af7';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.setProperty('--accent-custom', accent);
})();

