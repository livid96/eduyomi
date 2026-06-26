// ─────────────────────── STATE ───────────────────────
let data = {};
let lastCommittedData = null; // deep snapshot of data after last pull/push
let treeOpen = {};    // key → bool (open)
let dragSrc = null;   // {type, yi, si, ci, ti}
let editorExpanded = false; // tracks editor expand view state


// ─────────────────────── THEME ───────────────────────
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  // Write to all shared keys so both pages stay in sync
  localStorage.setItem('ej-theme', t);
  localStorage.setItem('ej-synced-theme', t);
  localStorage.setItem('eduyomi-theme', t);
  document.querySelectorAll('.theme-bg-btn').forEach(b => b.classList.toggle('active', b.dataset.t === t));
}
function setAccent(el) {
  const c = el.dataset.c;
  document.documentElement.style.setProperty('--accent-custom', c);
  // Write to all shared keys so both pages stay in sync
  localStorage.setItem('ej-accent', c);
  localStorage.setItem('ej-synced-accent', c);
  localStorage.setItem('eduyomi-accent', c);
  document.querySelectorAll('.accent-dot').forEach(d => d.classList.toggle('active', d.dataset.c === c));
}
function initTheme() {
  // Read from shared keys in priority order
  const t = localStorage.getItem('eduyomi-theme') || localStorage.getItem('ej-synced-theme') || localStorage.getItem('ej-theme') || 'dark';
  const a = localStorage.getItem('eduyomi-accent') || localStorage.getItem('ej-synced-accent') || localStorage.getItem('ej-accent') || '#7c6af7';
  setTheme(t);
  document.documentElement.style.setProperty('--accent-custom', a);
  document.querySelectorAll('.accent-dot').forEach(d => d.classList.toggle('active', d.dataset.c === a));
}
initTheme();

