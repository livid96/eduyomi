function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function slugify(str) { return (str||'').toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g,'-').replace(/^-+|-+$/g,''); }

/* ════════════════════════════════════════
   REPOSITORY / MASTER DATA
════════════════════════════════════════ */
const REPO_CACHE_KEY  = 'eduyomi-repo';
const ACTIVE_JSON_KEY = 'eduyomi-active-json';
function _esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function getSavedRepo() {
  try { return JSON.parse(localStorage.getItem(REPO_CACHE_KEY) || 'null'); } catch { return null; }
}
function saveRepo(repoObj) {
  localStorage.setItem(REPO_CACHE_KEY, JSON.stringify(repoObj));
}

function parseGitHubRepo(input) {
  input = (input || '').trim().replace(/\/$/, '');
  const m = input.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (m) return { user: m[1], repo: m[2] };
  const short = input.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (short) return { user: short[1], repo: short[2] };
  return null;
}

async function fetchRepoJsonList(user, repo) {
  // Detect default branch so master/main both work
  const metaRes = await fetch(`https://api.github.com/repos/${user}/${repo}`);
  if (!metaRes.ok) throw new Error(`GitHub API ${metaRes.status}: ${metaRes.statusText}`);
  const meta = await metaRes.json();
  const branch = meta.default_branch || 'main';

  const contentsRes = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/`);
  if (!contentsRes.ok) throw new Error(`GitHub API ${contentsRes.status}: ${contentsRes.statusText}`);
  const files = await contentsRes.json();
  return files.filter(f => f.type === 'file' && f.name.endsWith('.json'))
              .map(f => ({
                name:     f.name.replace(/\.json$/i, ''),
                filename: f.name,
                rawUrl:   `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${f.name}`,
                branch,
              }));
}

async function fetchJsonFromRawUrl(rawUrl) {
  const res = await fetch(rawUrl);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}


let MASTER_DATA = [];
let BROWSE_LABEL = null;

// Parses raw JSON from the data file — supports two formats:
//   1. Plain array:         [ { browse_label, year_title, subjects }, ... ]
//   2. Object with metadata: { browse_label: "...", years: [...] }
// browse_label is OPTIONAL — if missing, the label is hidden entirely.
function parseRaw(raw) {
  if (Array.isArray(raw)) {
    MASTER_DATA  = raw;
    // browse_label can live on the first array item — null if not present
    BROWSE_LABEL = (raw[0] && 'browse_label' in raw[0]) ? raw[0].browse_label : null;
  } else if (raw && typeof raw === 'object') {
    BROWSE_LABEL = ('browse_label' in raw) ? raw.browse_label : null;
    MASTER_DATA  = Array.isArray(raw.years) ? raw.years : [raw];
  } else {
    MASTER_DATA  = [];
    BROWSE_LABEL = null;
  }
}
let SEARCH_INDEX = [];
let currentYear = 0;

// State for subject detail view
let currentSubjectData = null;
let activeChapters = new Set(); // empty = show all
let sortOrder = 'default'; // 'default' | 'asc' | 'desc'
let openChapters = null; // null = use settingsState.expandView default; Set of origIdx when manually tracked

// Filter panel state
let activeFilters = new Set();
let watchedTopics = new Set(JSON.parse(localStorage.getItem('eduyomi-watched')||'[]'));
let bookmarkedTopics = new Set(JSON.parse(localStorage.getItem('eduyomi-bookmarked')||'[]'));
let fpDisplayMode = 'list';
let fpGroupMode = 'chapter';

// ── Persistent Settings ──────────────────────────────────────────
const SETTINGS_KEY = 'eduyomi-settings';
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsState));
}
const _s = loadSettings();
const settingsState = {
  adBlockEnabled:    _s.adBlockEnabled    !== false,   // default true
  showWatchBookmark: _s.showWatchBookmark !== false,
  expandView:        _s.expandView        !== false,
  playerSpeed:       _s.playerSpeed       || '1',
  playerQuality:     _s.playerQuality     || 'auto',
  autoMarkWatched:   _s.autoMarkWatched   !== false,
};

async function loadMasterData() {
  // Migrate legacy single-repo saved in REPO_CACHE_KEY into multi-repo list
  try {
    const multiRepos = JSON.parse(localStorage.getItem('eduyomi-repos') || '[]');
    if (multiRepos.length === 0) {
      const legacy = JSON.parse(localStorage.getItem(REPO_CACHE_KEY) || 'null');
      if (legacy && legacy.user && legacy.repo) {
        legacy.isActive = true;
        localStorage.setItem('eduyomi-repos', JSON.stringify([legacy]));
      }
    }
  } catch {}

  // getActiveRepo is defined later but hoisted as function — use inline fallback
  const active = (function() {
    try { return JSON.parse(localStorage.getItem('eduyomi-repos') || '[]').find(r => r.isActive) || null; } catch { return null; }
  })();
  _updateRepoNavUI(active);

  if (active && active.activeJson) {
    try {
      const _raw = await fetchJsonFromRawUrl(active.activeJson.rawUrl);
      parseRaw(_raw);
      buildPage();
      return;
    } catch(e) {
      console.warn('[Eduyomi] Cached JSON failed to load:', e);
    }
  }
  MASTER_DATA = [];
  buildPage();
  if (!active) setTimeout(() => openRepoModal(), 600);
}

function buildPage() {
  document.getElementById('loadingState').style.display = 'none';
  const splash = document.getElementById('splash-overlay');
  if (splash) splash.classList.add('hidden');

  // Reset view state so switching repos always lands on home grid
  currentSubjectData = null;
  document.getElementById('subjectView').classList.remove('visible');
  document.getElementById('yearContents').style.display = '';
  // Only show the tabs section when there is actually data loaded
  document.getElementById('tabsSection').style.display = MASTER_DATA.length > 0 ? '' : 'none';

  buildTabs();
  buildYearContents();
  buildSearchIndex();
  if (MASTER_DATA.length > 0) showYear(0, null);
}

function buildTabs() {
  const section = document.getElementById('tabsSection');
  if (section) section.style.display = MASTER_DATA.length > 0 ? '' : 'none';
  const el = document.getElementById('browseLabel');
  if (el) {
    if (BROWSE_LABEL) {
      el.textContent = BROWSE_LABEL;
      el.style.display = '';
    } else {
      el.style.display = 'none'; // hide label row if intentionally blank
    }
  }
  const row = document.getElementById('tabsRow');
  row.innerHTML = MASTER_DATA.map((y, i) => `
    <button class="tab-btn ${i===0?'active':''}" onclick="showYear(${i},this)">${esc(y.year_title)}</button>
  `).join('');
}

function buildYearContents() {
  const container = document.getElementById('yearContents');
  container.innerHTML = MASTER_DATA.map((year, yi) => {
    const subjects = year.subjects || [];
    return `<div id="year${yi}" class="year-content ${yi===0?'':'hidden'}">
      <div class="section-heading-row">
        <h2>${esc(year.year_title)} Subjects</h2>
        <span class="badge">${subjects.length} subject${subjects.length!==1?'s':''}</span>
      </div>
      <div class="subject-grid">
        ${subjects.map((sub, si) => buildCard(sub, yi, si)).join('')}
      </div>
    </div>`;
  }).join('');
}

function buildCard(sub, yi, si) {
  const name_en = sub.subject_name?.en || 'Subject';
  const name_bn = sub.subject_name?.bn || '';
  const img     = sub.img || '';
  const chapterCount = (sub.chapters||[]).length;
  const topicCount   = (sub.chapters||[]).reduce((a,ch)=>a+(ch.topics||[]).length,0);
  const keywords = [name_en, name_bn, 'year'+(yi+1)].join(' ').toLowerCase();
  return `<div class="subject-card" data-name="${esc(keywords)}" data-year="${yi}" style="--bg-img:url('${img}')" onclick='openSubjectView(${yi},${si})'>
    <div class="card-content">
      <h3>${esc(name_en)}</h3>
      ${name_bn?`<div class="card-sub">${esc(name_bn)}</div>`:''}
      <span class="tag">${chapterCount} chapter${chapterCount!==1?'s':''} · ${topicCount} topic${topicCount!==1?'s':''}</span>
    </div>
  </div>`;
}

