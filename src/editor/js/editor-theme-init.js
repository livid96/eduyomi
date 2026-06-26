
/* ── Sync theme & accent from index.html (runs before any paint) ── */
(function(){
  var theme  = localStorage.getItem('eduyomi-theme')  || localStorage.getItem('ej-synced-theme')  || localStorage.getItem('ej-theme')  || 'dark';
  var accent = localStorage.getItem('eduyomi-accent') || localStorage.getItem('ej-synced-accent') || localStorage.getItem('ej-accent') || '#7c6af7';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.setProperty('--accent-custom', accent);
})();

