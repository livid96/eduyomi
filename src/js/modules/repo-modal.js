// ── Multi-repo helpers ─────────────────────────────────────────
const MULTI_REPO_KEY = 'eduyomi-repos';

function getAllSavedRepos() {
  try { return JSON.parse(localStorage.getItem(MULTI_REPO_KEY) || '[]'); } catch { return []; }
}
function saveAllRepos(repos) {
  localStorage.setItem(MULTI_REPO_KEY, JSON.stringify(repos));
}
function getActiveRepo() {
  return getAllSavedRepos().find(r => r.isActive) || null;
}
function upsertRepo(repoObj) {
  const repos = getAllSavedRepos();
  const idx = repos.findIndex(r => r.user === repoObj.user && r.repo === repoObj.repo);
  if (idx >= 0) repos[idx] = { ...repos[idx], ...repoObj };
  else repos.push(repoObj);
  saveAllRepos(repos);
  const active = repos.find(r => r.isActive);
  if (active) localStorage.setItem(REPO_CACHE_KEY, JSON.stringify(active));
}
function setActiveRepo(user, repo) {
  const repos = getAllSavedRepos();
  repos.forEach(r => { r.isActive = (r.user === user && r.repo === repo); });
  saveAllRepos(repos);
  const active = repos.find(r => r.isActive);
  if (active) localStorage.setItem(REPO_CACHE_KEY, JSON.stringify(active));

  // Sync active repo hint to editor iframe (github repo path)
  const repoPath = user + '/' + repo;
  localStorage.setItem('ej-active-repo-hint', repoPath);

  // Build and store the real file URL hint
  let fileHint = '';
  if (active && active.activeJson && active.activeJson.rawUrl) {
    const rawMatch = active.activeJson.rawUrl.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([^/]+)\/(.+)/);
    if (rawMatch) fileHint = 'https://github.com/' + rawMatch[1] + '/blob/' + rawMatch[2] + '/' + rawMatch[3];
  }
  if (fileHint) localStorage.setItem('ej-active-file-hint', fileHint);
  else localStorage.removeItem('ej-active-file-hint');

  // Push live to editor iframe (only updates field if editor is already open)
  _syncEditorFileUrl(fileHint || ('https://github.com/' + repoPath + '/blob/main/'));

  return active || null;
}
function deleteRepo(user, repo) {
  let repos = getAllSavedRepos();
  const wasActive = repos.some(r => r.user === user && r.repo === repo && r.isActive);
  repos = repos.filter(r => !(r.user === user && r.repo === repo));
  if (wasActive && repos.length > 0) repos[0].isActive = true;
  saveAllRepos(repos);
  // Remove per-repo token immediately
  localStorage.removeItem('ej-gh-token-' + user + '/' + repo);
  // If this was the active repo, also clear the global editor token
  if (wasActive) {
    localStorage.removeItem('ej-gh-token');
    // If a new active repo has its own saved token, load it
    if (repos.length > 0) {
      const newActive = repos[0];
      const newTok = localStorage.getItem('ej-gh-token-' + newActive.user + '/' + newActive.repo) || '';
      if (newTok) localStorage.setItem('ej-gh-token', newTok);
    }
  }
  if (repos.length === 0) {
    localStorage.removeItem(REPO_CACHE_KEY); localStorage.removeItem(ACTIVE_JSON_KEY);
    localStorage.removeItem('ej-active-repo-hint'); localStorage.removeItem('ej-active-file-hint');
    if (wasActive) _syncEditorClearUrl();
  } else if (wasActive) {
    localStorage.setItem(REPO_CACHE_KEY, JSON.stringify(repos[0]));
    // Sync new active repo to editor
    const newActive = repos[0];
    let newFileHint = '';
    if (newActive.activeJson && newActive.activeJson.rawUrl) {
      const rawMatch = newActive.activeJson.rawUrl.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([^/]+)\/(.+)/);
      if (rawMatch) newFileHint = 'https://github.com/' + rawMatch[1] + '/blob/' + rawMatch[2] + '/' + rawMatch[3];
    }
    localStorage.setItem('ej-active-repo-hint', newActive.user + '/' + newActive.repo);
    if (newFileHint) localStorage.setItem('ej-active-file-hint', newFileHint);
    else localStorage.removeItem('ej-active-file-hint');
    _syncEditorFileUrl(newFileHint || ('https://github.com/' + newActive.user + '/' + newActive.repo + '/blob/main/'));
  }
}

// ── Modal open/close ─────────────────────────────────────────────
function openRepoModal() {
  document.getElementById('repoInput').value = '';
  setRepoStatus('');
  _renderSavedRepos();
  document.getElementById('repoModal').classList.add('open');
  setTimeout(() => document.getElementById('repoInput').focus(), 250);
}
function closeRepoModal() {
  document.getElementById('repoModal').classList.remove('open');
}

// ── Status helper ────────────────────────────────────────────────
function setRepoStatus(msg, type) {
  const el = document.getElementById('repoStatus');
  el.className = 'repo-status' + (type ? ' ' + type : '');
  if (!msg) { el.innerHTML = ''; return; }
  el.innerHTML = type === 'loading'
    ? `<span class="repo-spinner"></span>${_esc(msg)}`
    : _esc(msg);
}

// ── Render saved repos list (cards with files inside) ────────────
// Store file objects in a global map so onclick can reference by safe index key
window._repoFileMap = {};

function _repoAvatarFallback(img) {
  const svg = '<svg viewBox="0 0 16 16" fill="currentColor" width="18" height="18"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  img.parentElement.innerHTML = svg;
}

function _renderSavedRepos() {
  const repos = getAllSavedRepos();
  const section = document.getElementById('repoSavedSection');
  const list    = document.getElementById('repoSavedList');
  if (!repos.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  window._repoFileMap = {};

  list.innerHTML = repos.map(r => {
    const key = r.user + '/' + r.repo;
    const filesCount = r.files ? r.files.length : 0;
    const branch = (r.files && r.files[0] && r.files[0].branch) || 'main';

    const filesHtml = (r.files && r.files.length > 0) ? r.files.map((f, fi) => {
      const mapKey = r.user + '__' + r.repo + '__' + fi;
      window._repoFileMap[mapKey] = { fileObj: f, user: r.user, repo: r.repo };
      const isActive = r.isActive && r.activeJson && r.activeJson.rawUrl === f.rawUrl;
      return '<div class="repo-file-row' + (isActive ? ' active' : '') + '" data-mapkey="' + _esc(mapKey) + '">'
        + '<div class="repo-file-dot"></div>'
        + '<span class="repo-file-name">' + _esc(f.name) + '</span>'
        + (isActive
            ? '<span class="repo-file-active-tag">Active</span>'
            : '<button class="repo-file-load-btn" data-mapkey="' + _esc(mapKey) + '">Load</button>')
        + '</div>';
    }).join('') : '<div style="padding:9px 14px;font-size:.78rem;color:var(--text-muted)">No JSON files found</div>';

    const rmId = 'rmdel-' + Math.random().toString(36).slice(2);
    return '<div class="repo-saved-card' + (r.isActive ? ' active' : '') + '">'
      + '<div class="repo-saved-top">'
      + '<div class="repo-saved-icon"><img src="https://github.com/' + _esc(r.user) + '.png?size=68" alt="' + _esc(r.user) + '" onerror="_repoAvatarFallback(this)"/></div>'
      + '<div class="repo-saved-info">'
      + '<div class="repo-saved-name">' + _esc(r.directUrl ? (r.activeJson && r.activeJson.filename ? r.activeJson.filename : key) : key) + '</div>'
      + '<div class="repo-saved-meta">' + filesCount + ' file' + (filesCount!==1?'s':'') + (r.directUrl ? ' · direct link' : ' · ' + _esc(branch)) + '</div>'
      + '</div>'
      + (r.isActive ? '<span class="repo-saved-badge">Active</span>' : '')
      + '<button class="repo-saved-del" title="Remove" id="' + rmId + '" data-user="' + _esc(r.user) + '" data-repo="' + _esc(r.repo) + '">✕</button>'
      + '</div>'
      + '<div class="repo-files-list">' + filesHtml + '</div>'
      + '</div>';
  }).join('');
}

// ── Event delegation for repo modal buttons ──────────────────────
document.addEventListener('click', function(e) {
  // Delete repo
  const delBtn = e.target.closest('.repo-saved-del');
  if (delBtn) {
    const user = delBtn.getAttribute('data-user');
    const repo = delBtn.getAttribute('data-repo');
    if (user && repo) removeRepo(user, repo);
    return;
  }
  // Load file (Load button or clicking the whole row)
  const loadBtn = e.target.closest('.repo-file-load-btn');
  if (loadBtn) {
    e.stopPropagation();
    const mapKey = loadBtn.getAttribute('data-mapkey');
    if (mapKey) loadFileFromCard(mapKey);
    return;
  }
  const fileRow = e.target.closest('.repo-file-row');
  if (fileRow) {
    const mapKey = fileRow.getAttribute('data-mapkey');
    if (mapKey) loadFileFromCard(mapKey);
    return;
  }
});

// ── Load a file from within a card (also switches active repo) ───
async function loadFileFromCard(mapKey) {
  const entry = window._repoFileMap[mapKey];
  if (!entry) { setRepoStatus('File reference lost — please reopen the modal.', 'error'); return; }
  const { fileObj, user, repo } = entry;

  setRepoStatus('Loading ' + _esc(fileObj.filename || fileObj.name) + '…', 'loading');
  try {
    const data = await fetchJsonFromRawUrl(fileObj.rawUrl);
    parseRaw(data);

    // Switch active repo and persist chosen file
    const repos = getAllSavedRepos();
    repos.forEach(r => { r.isActive = (r.user === user && r.repo === repo); });
    const r = repos.find(x => x.user === user && x.repo === repo);
    if (r) { r.activeJson = fileObj; }
    saveAllRepos(repos);
    if (r) localStorage.setItem(REPO_CACHE_KEY, JSON.stringify(r));
    localStorage.setItem(ACTIVE_JSON_KEY, JSON.stringify(fileObj));

    _updateRepoNavUI(getActiveRepo());
    _renderSavedRepos();
    buildPage();
    setRepoStatus('✓ Loaded "' + _esc(fileObj.name) + '" successfully', 'success');

    // Live sync to editor: update file URL and hints
    let newFileHint = '';
    if (fileObj.rawUrl) {
      const rawMatch = fileObj.rawUrl.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([^/]+)\/(.+)/);
      if (rawMatch) newFileHint = 'https://github.com/' + rawMatch[1] + '/blob/' + rawMatch[2] + '/' + rawMatch[3];
    }
    localStorage.setItem('ej-active-repo-hint', user + '/' + repo);
    if (newFileHint) localStorage.setItem('ej-active-file-hint', newFileHint);
    else localStorage.removeItem('ej-active-file-hint');
    _syncEditorFileUrl(newFileHint);
  } catch(e) {
    setRepoStatus('Failed to load. Is the repo public with valid JSON?', 'error');
    console.error('[Repo] loadFileFromCard:', e);
  }
}

// ── Add new repo (Connect button) ───────────────────────────────
async function setRepo() {
  const input = document.getElementById('repoInput').value.trim();
  if (!input) { setRepoStatus('Enter a repository or direct .json URL.', 'error'); return; }

  // ── MODE 1: Direct .json URL ─────────────────────────────────
  const isDirectJson = /\.json(\?.*)?$/i.test(input) && /^https?:\/\//i.test(input);
  if (isDirectJson) {
    setRepoStatus('Loading direct JSON link…', 'loading');
    try {
      const data = await fetchJsonFromRawUrl(input);
      parseRaw(data);

      // Build a synthetic repo+file entry so it persists
      const urlObj   = new URL(input);
      const fileName = urlObj.pathname.split('/').pop();
      const fileEntry = {
        name:    fileName.replace(/\.json$/i, ''),
        filename: fileName,
        rawUrl:  input,
        branch:  '',
      };
      // Use hostname as "user", path-hash as "repo" for a unique key
      const syntheticUser = urlObj.hostname;
      const syntheticRepo = '_direct_' + btoa(input).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);

      // Check duplicate
      const existing = getAllSavedRepos().find(r => r.user === syntheticUser && r.repo === syntheticRepo);
      if (!existing) {
        const repos = getAllSavedRepos();
        repos.forEach(r => r.isActive = false);
        repos.push({ user: syntheticUser, repo: syntheticRepo, files: [fileEntry], activeJson: fileEntry, isActive: true, directUrl: input });
        saveAllRepos(repos);
        localStorage.setItem(REPO_CACHE_KEY, JSON.stringify(repos[repos.length - 1]));
      } else {
        const repos = getAllSavedRepos();
        repos.forEach(r => r.isActive = (r.user === syntheticUser && r.repo === syntheticRepo));
        const r = repos.find(x => x.user === syntheticUser && x.repo === syntheticRepo);
        if (r) r.activeJson = fileEntry;
        saveAllRepos(repos);
        localStorage.setItem(REPO_CACHE_KEY, JSON.stringify(r));
      }
      localStorage.setItem(ACTIVE_JSON_KEY, JSON.stringify(fileEntry));
      _updateRepoNavUI(getActiveRepo());
      document.getElementById('repoInput').value = '';
      _renderSavedRepos();
      buildPage();
      setRepoStatus('✓ Loaded "' + _esc(fileEntry.name) + '" from direct link', 'success');
    } catch(e) {
      setRepoStatus('Failed to load JSON. Check the URL and make sure CORS is allowed.', 'error');
      console.warn('[Repo] direct json:', e);
    }
    return;
  }

  // ── MODE 2: user/repo or GitHub URL ──────────────────────────
  const parsed = parseGitHubRepo(input);
  if (!parsed) { setRepoStatus('Use format: user/repo, a GitHub URL, or a direct .json link.', 'error'); return; }

  // Check duplicate
  const existing = getAllSavedRepos().find(r => r.user === parsed.user && r.repo === parsed.repo);
  if (existing) {
    setRepoStatus('Already added. Select a file below.', 'error');
    document.getElementById('repoInput').value = '';
    _renderSavedRepos();
    return;
  }

  setRepoStatus(`Connecting to ${parsed.user}/${parsed.repo}…`, 'loading');
  try {
    const files = await fetchRepoJsonList(parsed.user, parsed.repo);
    // Make this new repo active, deactivate others
    const repos = getAllSavedRepos();
    repos.forEach(r => r.isActive = false);
    repos.push({ user: parsed.user, repo: parsed.repo, files, activeJson: null, isActive: true });
    saveAllRepos(repos);
    localStorage.setItem(REPO_CACHE_KEY, JSON.stringify(repos[repos.length - 1]));

    _updateRepoNavUI(getActiveRepo());
    document.getElementById('repoInput').value = '';
    _renderSavedRepos();
    setRepoStatus(files.length
      ? `✓ Added — pick a dataset below`
      : `✓ Added (no .json files found in root)`, 'success');
  } catch(e) {
    setRepoStatus('Could not reach repo. Check the name & make sure it is public.', 'error');
    console.warn('[Repo]', e);
  }
}

// ── Remove a repo ────────────────────────────────────────────────
function removeRepo(user, repo) {
  deleteRepo(user, repo);
  const active = getActiveRepo();
  _updateRepoNavUI(active);
  _renderSavedRepos();
  if (!active) { MASTER_DATA = []; buildPage(); }
  setRepoStatus('Repository removed.', '');
}

// ── Nav UI sync ──────────────────────────────────────────────────
function _updateRepoNavUI(repoObj) {
  const drawerLabel = document.getElementById('repoDrawerLabel');
  const drawerDot   = document.getElementById('repoDrawerDot');
  if (repoObj && repoObj.activeJson) {
    // Show only the JSON filename (no extension)
    const name = repoObj.activeJson.name;
    if (drawerLabel) drawerLabel.textContent = name.length > 16 ? name.slice(0,15)+'…' : name;
    if (drawerDot)   drawerDot.style.display = 'block';
  } else {
    if (drawerLabel) drawerLabel.textContent = 'Repository';
    if (drawerDot)   drawerDot.style.display = 'none';
  }
}

// ── Legacy clearRepo (kept for backup/restore compat) ───────────
function clearRepo() {
  if (!confirm('Remove all repositories? Watched/bookmarked data is not affected.')) return;
  localStorage.removeItem(REPO_CACHE_KEY);
  localStorage.removeItem(ACTIVE_JSON_KEY);
  localStorage.removeItem(MULTI_REPO_KEY);
  MASTER_DATA = []; _repoJsonFiles = [];
  setRepoStatus('All repositories removed.', '');
  _updateRepoNavUI(null);
  _renderSavedRepos();
  buildPage();
}



// Enhance doBackup to include repo info
const _origDoBackup = doBackup;
doBackup = function() {
  const payload = {
    version: 3,
    exported: new Date().toISOString(),
    watched:    [...watchedTopics],
    bookmarked: [...bookmarkedTopics],
    settings:   { ...settingsState },
    repo: getActiveRepo() || null,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `eduyomi-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  closeBackupRestoreModal();
};

// Enhance doRestore to restore repo too
const _origDoRestore = doRestore;
doRestore = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const data = JSON.parse(e.target.result);
      if (![1,2,3].includes(data.version) || !Array.isArray(data.watched) || !Array.isArray(data.bookmarked)) {
        alert('Invalid backup file. Please choose a valid Eduyomi backup.'); return;
      }
      data.watched.forEach(id    => watchedTopics.add(id));
      data.bookmarked.forEach(id => bookmarkedTopics.add(id));
      localStorage.setItem('eduyomi-watched',    JSON.stringify([...watchedTopics]));
      localStorage.setItem('eduyomi-bookmarked', JSON.stringify([...bookmarkedTopics]));
      if (data.settings) { Object.assign(settingsState, data.settings); saveSettings(); applySettingsUI(); }
      // Restore repo (v3)
      if (data.repo) {
        saveRepo(data.repo);
        _updateRepoNavUI(data.repo);
        if (data.repo.activeJson) {
          try {
            const _restoreRaw = await fetchJsonFromRawUrl(data.repo.activeJson.rawUrl);
            parseRaw(_restoreRaw);
            buildPage();
          } catch(e) { console.warn('[Restore] Could not reload repo JSON:', e); }
        }
      }
      document.getElementById('brm-watched-count').textContent  = watchedTopics.size;
      document.getElementById('brm-bookmark-count').textContent = bookmarkedTopics.size;
      if (currentSubjectData) renderSubjectView();
      updateVideoActionBtns();
      closeBackupRestoreModal();
      setTimeout(() => alert(`✅ Restored ${data.watched.length} watched and ${data.bookmarked.length} bookmarked topics${data.repo ? ' + repository' : ''}.`), 150);
    } catch(err) {
      alert('Could not read backup file. Make sure it is a valid Eduyomi backup.');
    }
  };
  reader.readAsText(file);
};

// Init repo UI on page load
(function initRepoUI() {
  const saved = getSavedRepo();
  _updateRepoNavUI(saved);
})();


function openBackupRestoreModal(mode) {
  _brmMode = mode;
  const modal = document.getElementById('backupRestoreModal');
  document.getElementById('brm-watched-count').textContent  = watchedTopics.size;
  document.getElementById('brm-bookmark-count').textContent = bookmarkedTopics.size;
  if (mode === 'backup') {
    document.getElementById('brm-title').textContent = 'Backup Data';
    document.getElementById('brm-sub').textContent   = 'Download your watched & bookmarked topics as a file to keep them safe long-term.';
    document.getElementById('brm-backup-actions').style.display  = '';
    document.getElementById('brm-restore-actions').style.display = 'none';
  } else {
    document.getElementById('brm-title').textContent = 'Restore Data';
    document.getElementById('brm-sub').textContent   = 'Restore watched & bookmarked topics from a previously saved backup file. This will merge with your current data.';
    document.getElementById('brm-backup-actions').style.display  = 'none';
    document.getElementById('brm-restore-actions').style.display = '';
  }
  modal.classList.add('open');
}

function closeBackupRestoreModal() {
  document.getElementById('backupRestoreModal').classList.remove('open');
  // reset file input so same file can be picked again
  const fi = document.getElementById('brm-file-input');
  if (fi) fi.value = '';
}

function doBackup() {
  const payload = {
    version: 2,
    exported: new Date().toISOString(),
    watched:    [...watchedTopics],
    bookmarked: [...bookmarkedTopics],
    settings:   { ...settingsState },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = `eduyomi-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  closeBackupRestoreModal();
}

function doRestore(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (![1,2].includes(data.version) || !Array.isArray(data.watched) || !Array.isArray(data.bookmarked)) {
        alert('Invalid backup file. Please choose a valid Eduyomi backup.');
        return;
      }
      // Merge (union) with current data
      data.watched.forEach(id    => watchedTopics.add(id));
      data.bookmarked.forEach(id => bookmarkedTopics.add(id));
      localStorage.setItem('eduyomi-watched',    JSON.stringify([...watchedTopics]));
      localStorage.setItem('eduyomi-bookmarked', JSON.stringify([...bookmarkedTopics]));
      // Restore settings if present (v2)
      if (data.settings) {
        Object.assign(settingsState, data.settings);
        saveSettings();
        applySettingsUI();
      }
      // Refresh counts in modal
      document.getElementById('brm-watched-count').textContent  = watchedTopics.size;
      document.getElementById('brm-bookmark-count').textContent = bookmarkedTopics.size;
      if (currentSubjectData) renderSubjectView();
      updateVideoActionBtns();
      closeBackupRestoreModal();
      // Small success feedback
      setTimeout(() => alert(`✅ Restored ${data.watched.length} watched and ${data.bookmarked.length} bookmarked topics.`), 150);
    } catch(err) {
      alert('Could not read backup file. Make sure it is a valid Eduyomi backup.');
    }
  };
  reader.readAsText(file);
}

