/* ════════════════════════════════════════
   NAV SCROLL HIDE
════════════════════════════════════════ */
(function() {
  let lastY = 0, ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const nav = document.getElementById('navbar');
      if (y > lastY + 8 && y > 80) nav.classList.add('nav-hidden');
      else if (y < lastY - 8) nav.classList.remove('nav-hidden');
      lastY = y; ticking = false;
    });
  }, { passive: true });
})();

