// ─────────────────────── INIT ───────────────────────
render();

// ─────────────────────── MOBILE ───────────────────────
function isMobile() { return window.innerWidth <= 768; }

function mobCloseSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobBackdrop');
  if (sidebar) sidebar.classList.remove('mob-open');
  if (backdrop) backdrop.classList.remove('visible');
}

// ── Tab state ──
let mobActiveTab = 'edit'; // default

function mobShowTab(tab) {
  if (!isMobile()) return;
  mobActiveTab = tab;
  document.querySelectorAll('.mob-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.mob-bar-btn').forEach(b => b.classList.remove('active'));
  const main = document.getElementById('mainEditor');

  if (tab === 'tree') {
    const drawer = document.getElementById('mobTreeDrawer');
    if (drawer && drawer.classList.contains('open')) {
      mobCloseTree();
      return;
    }
    mobOpenTree();
    document.getElementById('mobBtnTree').classList.add('active');
    if (main) main.style.display = '';
    document.getElementById('mobBtnEdit').classList.add('active');
  } else if (tab === 'edit') {
    mobCloseTree();
    if (main) main.style.display = '';
    document.getElementById('mobBtnEdit').classList.add('active');
  } else if (tab === 'files') {
    mobCloseTree();
    if (main) main.style.display = 'none';
    document.getElementById('mobFilesPanel').classList.add('active');
    document.getElementById('mobBtnFiles').classList.add('active');
    mobSyncJsonView();
    mobSyncGhFieldsFromPC();
  }
}

// Mobile expand/collapse toggle (replaces Settings tab button)
let _mobExpanded = false;
function mobToggleExpand(btn) {
  _mobExpanded = !_mobExpanded;
  btn.classList.toggle('active', _mobExpanded);
  // Reuse the desktop expand logic via the sidebar toggle button
  const desktopBtn = document.getElementById('sidebarExpandToggle');
  if (desktopBtn) {
    // Sync state then call toggleExpandAll
    const isCurrentlyActive = desktopBtn.classList.contains('active');
    if (isCurrentlyActive !== _mobExpanded) toggleExpandAll(desktopBtn);
  }
}

// ── Tree drawer ──
function mobOpenTree() {
  const drawer = document.getElementById('mobTreeDrawer');
  const backdrop = document.getElementById('mobTreeBackdrop');
  // Clone/render tree content
  const treeScroll = document.getElementById('treeScroll');
  const content = document.getElementById('mobTreeContent');
  if (treeScroll && content) content.innerHTML = treeScroll.innerHTML;
  drawer.classList.add('open');
  backdrop.classList.add('visible');
}

function mobCloseTree() {
  document.getElementById('mobTreeDrawer').classList.remove('open');
  document.getElementById('mobTreeBackdrop').classList.remove('visible');
  if (mobActiveTab === 'tree') {
    mobActiveTab = 'edit';
    document.querySelectorAll('.mob-bar-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('mobBtnEdit').classList.add('active');
    const main = document.getElementById('mainEditor');
    if (main) main.style.display = '';
  }
}

// Close tree when tree row clicked (navigate)
document.addEventListener('click', e => {
  if (!isMobile()) return;
  const row = e.target.closest('.tree-row');
  if (row && document.getElementById('mobTreeDrawer').classList.contains('open')) {
    setTimeout(() => { mobCloseTree(); mobShowTab('edit'); }, 100);
  }
});

// ── Files tab helpers ──
function mobToggleSection(bodyId, titleEl) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  body.classList.toggle('open');
  titleEl.classList.toggle('open');
}

function mobLoadFromURL() {
  const url = document.getElementById('mobUrlInput').value.trim();
  if (!url) return toast('Enter a URL','e');
  fetch(url).then(r => r.json()).then(d => {
    data = d;
    try { const parts = new URL(url).pathname.split('/'); const last = parts[parts.length-1]; if (last.endsWith('.json')) { loadedFileName = last.replace(/\.json$/i,''); lastExportedName=''; } } catch {}
    render(); toast('Loaded from URL','s');
    mobShowTab('edit');
  }).catch(() => toast('Fetch failed','e'));
}

function mobSyncGhFieldsFromPC() {
  const pcUrl = document.getElementById('ghFileUrl');
  const pcTok = document.getElementById('ghToken');
  const mobUrl = document.getElementById('mobGhFileUrl');
  const mobTok = document.getElementById('mobGhToken');
  if (pcUrl && mobUrl && !mobUrl.value) mobUrl.value = pcUrl.value;
  if (pcTok && mobTok && !mobTok.dataset.real) {
    const realVal = pcTok.dataset.real || '';
    mobTok.dataset.real = realVal;
    _maskToken(mobTok);
  }
}

function mobSyncGhUrl() {
  const v = document.getElementById('mobGhFileUrl').value;
  const pc = document.getElementById('ghFileUrl');
  if (pc) { pc.value = v; ghSaveSettings(); }
}
function mobSyncGhToken() {
  // oninput fires with real chars (field unmasked while focused)
  const mob = document.getElementById('mobGhToken');
  const v = mob.value;
  mob.dataset.real = v;
  const pc = document.getElementById('ghToken');
  if (pc) { pc.dataset.real = v; }
  ghSaveToken();
}

function mobGhPush() {
  const msg = document.getElementById('mobGhCommitMsg');
  const pcMsg = document.getElementById('ghCommitMsg');
  // Sync mobile's (possibly edited) message to the PC field so ghPush() picks it up
  if (pcMsg && msg) pcMsg.value = msg.value.trim() || 'Update curriculum data';
  ghPush();
  document.getElementById('mobGhCommitRow').style.display = 'none';
}
function mobCancelCommit() {
  document.getElementById('mobGhCommitRow').style.display = 'none';
}

// ghPushModal handles both mobile and PC (defined as single function below)

// ghSetStatus already handles both PC and mobile via ghSetStatusBoth below

// ── Raw JSON in Files tab ──
function mobSyncJsonView() {
  const ta = document.getElementById('mobRawJson');
  if (ta) ta.value = JSON.stringify(data, null, 2);
}

function mobApplyRawJson() {
  const ta = document.getElementById('mobRawJson');
  if (!ta) return;
  try {
    data = JSON.parse(ta.value);
    render(); refreshJsonPanel(); toast('JSON applied','s');
  } catch(e) { toast('Invalid JSON: ' + e.message, 'e'); }
}

function mobCopyJson() {
  const ta = document.getElementById('mobRawJson');
  if (!ta) return;
  navigator.clipboard.writeText(ta.value).then(() => toast('Copied!','s')).catch(() => {
    ta.select(); document.execCommand('copy'); toast('Copied!','s');
  });
}

// Keep mobile JSON view in sync when data changes (handled inside refreshJsonPanel directly)

// ── Init on mobile: default to Edit tab ──
window.addEventListener('load', () => {
  if (isMobile()) {
    document.querySelectorAll('.mob-bar-btn').forEach(b => b.classList.remove('active'));
    const editBtn = document.getElementById('mobBtnEdit');
    if (editBtn) editBtn.classList.add('active');
    mobActiveTab = 'edit';
    // gh fields are handled by ghInitInputs(), no need to re-set here
    // Sync theme button active state inside the Files > Appearance section
    const savedTheme = localStorage.getItem('ej-synced-theme') || localStorage.getItem('eduyomi-theme') || 'dark';
    document.querySelectorAll('.theme-bg-btn').forEach(b => b.classList.toggle('active', b.dataset.t === savedTheme));
    const savedAccent = localStorage.getItem('ej-synced-accent') || localStorage.getItem('eduyomi-accent') || '#7c6af7';
    document.querySelectorAll('.accent-dot').forEach(d => d.classList.toggle('active', d.dataset.c === savedAccent));
  }
});

// ── Re-render tree drawer when tree updates (handled inside renderTree directly) ──

</script>
