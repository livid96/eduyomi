(function() {
  if (!('serviceWorker' in navigator)) return;

  const SW_VERSION = 'eduyomi-v1';

  const swCode = `
const CACHE = '${SW_VERSION}';
const OFFLINE_URL = self.location.href;

// Assets to pre-cache on install
const PRE_CACHE = [OFFLINE_URL];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For navigation requests: network-first, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For same-origin assets: cache-first
  if (url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => new Response('', {status: 408}));
      })
    );
    return;
  }

  // For YouTube / external API calls: network-only (no cache)
  event.respondWith(fetch(event.request).catch(() => new Response('', {status: 503})));
});
`;

  const blob = new Blob([swCode], { type: 'application/javascript' });
  const swUrl = URL.createObjectURL(blob);

  navigator.serviceWorker.register(swUrl, { scope: './' })
    .then(reg => {
      console.log('[PWA] Service worker registered:', reg.scope);
      // Check for updates every 60 s
      setInterval(() => reg.update(), 60000);
    })
    .catch(err => console.warn('[PWA] SW registration failed:', err));

  // A2HS (Add-to-Home-Screen) prompt
  let deferredPrompt = null;
  window.settingsInstallApp = async function() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    // After install, update subtitle to "Installed" and disable click
    const btn = document.getElementById('settingsInstallBtn');
    if (btn) {
      btn.onclick = null;
      btn.style.cursor = 'default';
      const sub = btn.querySelector('.settings-toggle-sub');
      if (sub) sub.textContent = 'Already installed on your device';
    }
  };
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    // Restore clickable state in case it was previously shown as installed
    const btn = document.getElementById('settingsInstallBtn');
    if (btn) {
      btn.onclick = function(){ window.settingsInstallApp(); };
      btn.style.cursor = 'pointer';
      const sub = btn.querySelector('.settings-toggle-sub');
      if (sub) sub.textContent = 'Add Eduyomi to your home screen';
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Eduyomi installed!');
    deferredPrompt = null;
    const btn = document.getElementById('settingsInstallBtn');
    if (btn) {
      btn.onclick = null;
      btn.style.cursor = 'default';
      const sub = btn.querySelector('.settings-toggle-sub');
      if (sub) sub.textContent = 'Already installed on your device';
    }
  });
})();

// ── Live-sync theme & accent from editor (storage event fires when another tab/page writes localStorage) ──
window.addEventListener('storage', function(e) {
  if (e.key === 'eduyomi-theme' || e.key === 'ej-synced-theme' || e.key === 'ej-theme') {
    const theme = e.newValue;
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
      if (typeof updateThemeIcon === 'function') updateThemeIcon(theme);
    }
  }
  if (e.key === 'eduyomi-accent' || e.key === 'ej-synced-accent' || e.key === 'ej-accent') {
    const accent = e.newValue;
    if (accent) {
      document.documentElement.style.setProperty('--accent-custom', accent);
      if (typeof updateLogoAccentFilter === 'function') updateLogoAccentFilter(accent);
      currentAccentHex = accent;
      document.querySelectorAll('.accent-swatch').forEach(s => {
        const bg = s.style.background || s.style.backgroundColor;
        s.classList.toggle('active', bg.toLowerCase() === accent.toLowerCase() || bg.toLowerCase() === hexToRgb(accent));
      });
    }
  }
});
