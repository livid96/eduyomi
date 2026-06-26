// ─────────────────────── COMMIT MESSAGE GENERATOR ───────────────────────
function _flattenData(d) {
  const map = new Map();
  // Use positional index in keys so same-named siblings are tracked separately
  (d.years || []).forEach((y, yi) => {
    const yName = y.year_title || '';
    const yKey = `Y[${yi}]:${yName}`;
    map.set(yKey, { label: yName, type: 'year' });
    (y.subjects || []).forEach((s, si) => {
      const sName = s.subject_name?.en || '';
      const sKey = `${yKey}/S[${si}]:${sName}`;
      map.set(sKey, { label: yName + '/' + sName, type: 'subject' });
      (s.chapters || []).forEach((ch, ci) => {
        const cName = ch.chapter_title || '';
        const cKey = `${sKey}/C[${ci}]:${cName}`;
        map.set(cKey, { label: yName + '/' + sName + '/' + cName, type: 'chapter' });
        (ch.topics || []).forEach((t, ti) => {
          const tName = t.title || '';
          const tVid  = (t.url || '').trim();
          const tLabel = tName + (tVid ? ' (' + tVid + ')' : '');
          map.set(`${cKey}/T[${ti}]:${tName}`,
            { label: yName + '/' + sName + '/' + cName + '/' + tLabel, type: 'topic' });
        });
      });
    });
  });
  return map;
}

function generateCommitMessage(before, after) {
  if (!before || !after) return 'Update curriculum data';
  const lines = [];

  // Structural adds/removes — keyed by position so duplicates show separately
  const bMap = _flattenData(before);
  const aMap = _flattenData(after);
  const added = [], removed = [];
  aMap.forEach((v, k) => { if (!bMap.has(k)) added.push(v.label + ' added'); });
  bMap.forEach((v, k) => { if (!aMap.has(k)) removed.push(v.label + ' removed'); });

  // Rename / value-change detection at same positional index
  const bYears = before.years || [], aYears = after.years || [];
  for (let yi = 0; yi < Math.min(bYears.length, aYears.length); yi++) {
    const bY = bYears[yi].year_title || '', aY = aYears[yi].year_title || '';
    if (bY !== aY) lines.push(bY + ' changed to ' + aY);
    const bSubs = bYears[yi].subjects || [], aSubs = aYears[yi].subjects || [];
    for (let si = 0; si < Math.min(bSubs.length, aSubs.length); si++) {
      const bS = bSubs[si].subject_name?.en || '', aS = aSubs[si].subject_name?.en || '';
      const bSbn = bSubs[si].subject_name?.bn || '', aSbn = aSubs[si].subject_name?.bn || '';
      const yCtx = aY || bY;
      if (bS !== aS) lines.push(yCtx + '/' + bS + ' changed to ' + yCtx + '/' + aS);
      if (bSbn !== aSbn) lines.push(yCtx + '/' + (bSbn || bS) + ' (bn) changed to ' + yCtx + '/' + (aSbn || aS) + ' (bn)');
      const bChs = bSubs[si].chapters || [], aChs = aSubs[si].chapters || [];
      for (let ci = 0; ci < Math.min(bChs.length, aChs.length); ci++) {
        const bC = bChs[ci].chapter_title || '', aC = aChs[ci].chapter_title || '';
        const sCtx = aS || bS;
        if (bC !== aC) lines.push(yCtx + '/' + sCtx + '/' + bC + ' changed to ' + yCtx + '/' + sCtx + '/' + aC);
        const bTops = bChs[ci].topics || [], aTops = aChs[ci].topics || [];
        for (let ti = 0; ti < Math.min(bTops.length, aTops.length); ti++) {
          const bT = bTops[ti].title || '', aT = aTops[ti].title || '';
          const bV = (bTops[ti].url || '').trim(), aV = (aTops[ti].url || '').trim();
          const cCtx = aC || bC;
          if (bT !== aT || bV !== aV) {
            const bLabel = bT + (bV ? ' (' + bV + ')' : '');
            const aLabel = aT + (aV ? ' (' + aV + ')' : '');
            lines.push(yCtx + '/' + sCtx + '/' + cCtx + '/' + bLabel + ' changed to ' + yCtx + '/' + sCtx + '/' + cCtx + '/' + aLabel);
          }
        }
      }
    }
  }

  lines.push(...added, ...removed);

  // Append "contribute by ~username~" line
  const username = (typeof localStorage !== 'undefined' && localStorage.getItem('ej-auth-displayname')) || '';
  if (username) lines.push('contribute by ~' + username + '~');

  if (!lines.length) return 'Update curriculum data';
  return lines.join('\n');
}

// ─────────────────────── GITHUB SYNC ───────────────────────
let ghFileSha = null; // SHA of the file currently loaded from GitHub (needed for PUT)

function toggleLoadPanel() {
  const title = document.getElementById('loadPanelTitle');
  const body  = document.getElementById('loadPanelBody');
  title.classList.toggle('open');
  body.classList.toggle('open');
}

function toggleGhPanel() {
  const title = document.getElementById('ghPanelTitle');
  const body  = document.getElementById('ghPanelBody');
  title.classList.toggle('open');
  body.classList.toggle('open');
}

/* ── Token field masking (no type=password, no browser toolbar) ── */
let _ghTokenEyeOpen = false;

function _maskToken(input) {
  const real = input.dataset.real || '';
  if (!_ghTokenEyeOpen) {
    input.value = real ? '•'.repeat(real.length) : '';
    input.style.letterSpacing = real ? '3px' : '';
  }
}
function _unmaskToken(input) {
  input.value = input.dataset.real || '';
  input.style.letterSpacing = '';
}

function ghTokenFocus(input) {
  // Restore real text so user can edit
  input.value = input.dataset.real || '';
  input.style.letterSpacing = '';
}
function ghTokenBlur(input) {
  // Commit whatever the user typed as the real value, save, then re-mask
  const real = input.value.trim();
  input.dataset.real = real;
  // Sync both fields
  ['ghToken','mobGhToken'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el !== input) el.dataset.real = real;
  });
  // Persist to localStorage
  if (real) localStorage.setItem('ej-gh-token', real);
  else localStorage.removeItem('ej-gh-token');
  // Re-mask
  if (!_ghTokenEyeOpen) _maskToken(input);
}
function ghTokenToggleEye() {
  _ghTokenEyeOpen = !_ghTokenEyeOpen;
  const eye = document.getElementById('ghTokenEye');
  if (eye) eye.textContent = _ghTokenEyeOpen ? '🙈' : '👁';
  ['ghToken','mobGhToken'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (_ghTokenEyeOpen) _unmaskToken(el);
    else _maskToken(el);
  });
}
// Called oninput — only saves dataset.real (actual chars typed while unmasked/focused)
function ghSaveToken() {
  const inp = document.getElementById('ghToken');
  if (!inp) return;
  // Only trust input.value when the field is focused (unmasked); otherwise use dataset.real
  const real = (document.activeElement === inp) ? inp.value.trim() : (inp.dataset.real || '');
  inp.dataset.real = real;
  const mob = document.getElementById('mobGhToken');
  if (mob) mob.dataset.real = real;
  if (real) localStorage.setItem('ej-gh-token', real);
  else localStorage.removeItem('ej-gh-token');
}

function ghSaveSettings() {
  localStorage.setItem('ej-gh-fileurl', document.getElementById('ghFileUrl').value.trim());
}

function ghParseUrl(url) {
  try {
    // Format 1: https://github.com/owner/repo/blob/branch/path/to/file.json
    const m1 = url.match(/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)/);
    if (m1) return { repo: m1[1], branch: m1[2], path: m1[3] };
    // Format 2: https://raw.githubusercontent.com/owner/repo/refs/heads/branch/path/to/file.json
    const m2 = url.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/refs\/heads\/([^/]+)\/(.+)/);
    if (m2) return { repo: m2[1], branch: m2[2], path: m2[3] };
    // Format 3: https://raw.githubusercontent.com/owner/repo/branch/path/to/file.json
    const m3 = url.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([^/]+)\/(.+)/);
    if (m3) return { repo: m3[1], branch: m3[2], path: m3[3] };
    return null;
  } catch { return null; }
}

// Session-scoped token (survives clearSensitiveData which wipes localStorage)
let _sessionGhToken = '';

function ghInitInputs() {
  const tok = _sessionGhToken || localStorage.getItem('ej-gh-token') || '';
  const tokenInp = document.getElementById('ghToken');
  const mobTokInp = document.getElementById('mobGhToken');
  if (tokenInp) {
    tokenInp.dataset.real = tok;
    _maskToken(tokenInp);
  }
  if (mobTokInp) {
    mobTokInp.dataset.real = tok;
    _maskToken(mobTokInp);
  }

  // Use saved file URL first, then the specific active file hint, then fallback to repo hint
  let fileUrl = localStorage.getItem('ej-gh-fileurl') || '';
  if (!fileUrl) {
    const fileHint = localStorage.getItem('ej-active-file-hint') || '';
    if (fileHint) {
      fileUrl = fileHint;
    } else {
      const repoHint = localStorage.getItem('ej-active-repo-hint') || '';
      if (repoHint) fileUrl = 'https://github.com/' + repoHint + '/blob/main/';
    }
  }
  const urlInp = document.getElementById('ghFileUrl');
  if (urlInp) urlInp.value = fileUrl;
  const mobUrl = document.getElementById('mobGhFileUrl');
  if (mobUrl) mobUrl.value = fileUrl;

  // Apply accent & theme from Eduyomi host
  const theme  = localStorage.getItem('ej-synced-theme') || localStorage.getItem('eduyomi-theme');
  const accent = localStorage.getItem('ej-synced-accent') || localStorage.getItem('eduyomi-accent');
  if (theme)  document.documentElement.setAttribute('data-theme', theme);
  if (accent) document.documentElement.style.setProperty('--accent-custom', accent);

  // Auto-pull if both token and a valid file URL are already saved
  if (tok && fileUrl && ghParseUrl(fileUrl)) {
    setTimeout(ghFetch, 600);
  }
}
// Run after DOM is ready so all input elements exist
document.addEventListener('DOMContentLoaded', ghInitInputs);

// ── Real-time sync: listen for messages from parent (index.html) ──
window.addEventListener('message', function(e) {
  try {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    // Update GitHub file URL field live
    if (d.type === 'ej:sync-gh-fileurl') {
      const url = d.url || '';
      const inp = document.getElementById('ghFileUrl');
      const mob = document.getElementById('mobGhFileUrl');
      if (inp) { inp.value = url; ghSaveSettings(); }
      if (mob) mob.value = url;
    }
    // Update theme/accent live
    if (d.type === 'ej:sync-theme') {
      if (d.theme) document.documentElement.setAttribute('data-theme', d.theme);
      if (d.accent) document.documentElement.style.setProperty('--accent-custom', d.accent);
    }
    // Clear GitHub URL (repo removed)
    if (d.type === 'ej:clear-gh-fileurl') {
      const inp = document.getElementById('ghFileUrl');
      const mob = document.getElementById('mobGhFileUrl');
      if (inp) { inp.value = ''; localStorage.removeItem('ej-gh-fileurl'); }
      if (mob) mob.value = '';
    }
  } catch(err) {}
});

function ghSetStatus(msg, type) {
  const el = document.getElementById('ghStatus');
  if (el) { el.textContent = msg; el.className = 'gh-status show ' + (type || ''); if (type === 'ok') setTimeout(() => { el.className = 'gh-status'; }, 3000); }
  // Also update mobile status
  const mel = document.getElementById('mobGhStatus');
  if (mel) { mel.textContent = msg; mel.className = 'gh-status show ' + (type || ''); if (type === 'ok') setTimeout(() => { mel.className = 'gh-status'; }, 3000); }
}
function ghClearStatus() {
  const el = document.getElementById('ghStatus'); if (el) el.className = 'gh-status';
  const mel = document.getElementById('mobGhStatus'); if (mel) mel.className = 'gh-status';
}

function ghGetFields() {
  const token = _sessionGhToken || localStorage.getItem('ej-gh-token') || '';
  const url   = localStorage.getItem('ej-gh-fileurl') || localStorage.getItem('ej-active-file-hint') || '';
  const parsed = ghParseUrl(url);
  if (!parsed) return { token, repo: '', path: '', branch: 'main' };
  return { token, repo: parsed.repo, path: parsed.path, branch: parsed.branch };
}

async function ghFetch() {
  const { token, repo, path, branch } = ghGetFields();
  if (!repo || !path) return ghSetStatus('Enter a valid GitHub file URL', 'err');
  if (!token)         return ghSetStatus('Enter your GitHub token', 'err');
  ghSetStatus('⏳ Fetching…', 'loading');
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || res.status); }
    const json = await res.json();
    ghFileSha = json.sha;
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(json.content.replace(/\n/g, '')), c => c.charCodeAt(0)));
    data = JSON.parse(decoded);
    lastCommittedData = JSON.parse(JSON.stringify(data)); // snapshot after pull
    loadedFileName = path.split('/').pop().replace(/\.json$/i, '');
    lastExportedName = '';
    render();
    ghSetStatus('✓ Pulled from GitHub', 'ok');
    toast('✓ Pulled from GitHub', 's');
  } catch(e) {
    ghSetStatus('✗ ' + e.message, 'err');
    toast('GitHub fetch failed: ' + e.message, 'e');
  }
}

function ghPushModal() {
  const autoMsg = generateCommitMessage(lastCommittedData, data);
  if (isMobile()) {
    const row = document.getElementById('mobGhCommitRow');
    const msg = document.getElementById('mobGhCommitMsg');
    if (row && msg) { row.style.display = 'flex'; msg.value = autoMsg; }
  } else {
    const row = document.getElementById('ghCommitRow');
    const msg = document.getElementById('ghCommitMsg');
    if (row && msg) { row.style.display = 'flex'; msg.value = autoMsg; }
  }
}
function ghCancelCommit() {
  document.getElementById('ghCommitRow').style.display = 'none';
  ghClearStatus();
}

async function ghPush() {
  const { token, repo, path, branch } = ghGetFields();
  if (!repo || !path) return ghSetStatus('Enter a valid GitHub file URL', 'err');
  if (!token)         return ghSetStatus('Enter your GitHub token', 'err');
  const commitMsg = document.getElementById('ghCommitMsg').value.trim() || 'Update curriculum data';

  ghSetStatus('⏳ Pushing…', 'loading');
  try {
    // If we don't have SHA yet (new file or not pulled), try to fetch it first
    if (!ghFileSha) {
      const check = await fetch(
        `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      );
      if (check.ok) { const j = await check.json(); ghFileSha = j.sha; }
    }

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const body = { message: commitMsg, content, branch };
    if (ghFileSha) body.sha = ghFileSha;

    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || res.status); }
    const j = await res.json();
    ghFileSha = j.content.sha; // update SHA for next push
    lastCommittedData = JSON.parse(JSON.stringify(data)); // snapshot after push
    document.getElementById('ghCommitRow').style.display = 'none';
    ghSetStatus('✓ Pushed to GitHub', 'ok');
    toast('✓ Committed to GitHub', 's');
  } catch(e) {
    ghSetStatus('✗ ' + e.message, 'err');
    toast('GitHub push failed: ' + e.message, 'e');
  }
}

