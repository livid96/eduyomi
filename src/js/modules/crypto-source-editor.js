// ── AES-GCM helpers using SubtleCrypto ──
async function _deriveKey(pin, salt) {
  salt = salt || 'ej-auth-salt';
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}
async function _aesEncrypt(plaintext, pin, salt) {
  const key = await _deriveKey(pin, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(iv.byteLength + ct.byteLength);
  combined.set(iv, 0); combined.set(new Uint8Array(ct), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}
async function _aesDecrypt(b64, pin, salt) {
  const key = await _deriveKey(pin, salt);
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12), ct = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plain);
}

// ── Fetch auth.json from repo ──
function openSourceEditor() {
  let activeRepo = null;
  try {
    const repos = JSON.parse(localStorage.getItem('eduyomi-repos') || '[]');
    activeRepo = repos.find(r => r.isActive) || null;
  } catch(e) {}
  _doOpenSourceEditor(activeRepo, localStorage.getItem('ej-gh-token') || '');
}

function _doOpenSourceEditor(activeRepo, token) {
  // Sync theme & accent so editor opens with matching colors
  const theme  = localStorage.getItem('eduyomi-theme')  || 'dark';
  const accent = localStorage.getItem('eduyomi-accent') || '#7c6af7';
  localStorage.setItem('ej-synced-theme',  theme);
  localStorage.setItem('ej-synced-accent', accent);
  localStorage.setItem('ej-theme',  theme);
  localStorage.setItem('ej-accent', accent);

  // Set active repo hints for the editor
  try {
    if (activeRepo) {
      const repoPath = activeRepo.user + '/' + activeRepo.repo;
      localStorage.setItem('ej-active-repo-hint', repoPath);
      if (activeRepo.activeJson && activeRepo.activeJson.rawUrl) {
        const rawMatch = activeRepo.activeJson.rawUrl.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([^/]+)\/(.+)/);
        if (rawMatch) {
          localStorage.setItem('ej-active-file-hint', 'https://github.com/' + rawMatch[1] + '/blob/' + rawMatch[2] + '/' + rawMatch[3]);
        } else {
          localStorage.removeItem('ej-active-file-hint');
        }
      } else {
        localStorage.removeItem('ej-active-file-hint');
      }
    } else {
      localStorage.removeItem('ej-active-repo-hint');
      localStorage.removeItem('ej-active-file-hint');
      localStorage.removeItem('ej-gh-token'); // clear stale token — no repo connected
    }
  } catch(e) {
    localStorage.removeItem('ej-active-repo-hint');
    localStorage.removeItem('ej-active-file-hint');
    localStorage.removeItem('ej-gh-token');
  }

  const overlay = document.getElementById('sourceEditorOverlay');
  const iframe  = document.getElementById('sourceEditorIframe');
  const loading = document.getElementById('sourceEditorLoading');

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (!iframe.dataset.loaded) {
    loading.style.opacity = '1';
    loading.style.display = 'flex';
    iframe.style.opacity = '0';

    iframe.src = 'curriculum-editor-v22.html';
    iframe.addEventListener('load', function onLoad() {
      iframe.removeEventListener('load', onLoad);
      iframe.dataset.loaded = '1';
      iframe.style.opacity = '1';
      loading.style.opacity = '0';
      setTimeout(() => { loading.style.display = 'none'; }, 300);
    });
  }
}

function closeSourceEditor() {
  document.getElementById('sourceEditorOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

function toggleDrawerSub(id) {
  document.getElementById(id).classList.toggle('open');
}

