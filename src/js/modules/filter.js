/* ════════════════════════════════════════
   FILTER PANEL
════════════════════════════════════════ */
function openFilterPanel() {
  // Sync checkbox states
  ['watched','unwatched','bookmarked'].forEach(f => {
    document.getElementById('fprow-'+f)?.classList.toggle('checked', activeFilters.has(f));
  });
  document.querySelectorAll('[id^="fpsort-"]').forEach(r => r.classList.remove('checked'));
  document.getElementById('fpsort-' + sortOrder)?.classList.add('checked');
  // Sync expand view checkbox
  document.getElementById('fprow-expandview')?.classList.toggle('checked', settingsState.expandView);

  const overlay = document.getElementById('filterPanelOverlay');
  const panel   = document.getElementById('filterPanel');
  overlay.classList.add('open');
  requestAnimationFrame(() => panel.classList.add('open'));
}

function closeFilterPanel() {
  const overlay = document.getElementById('filterPanelOverlay');
  const panel   = document.getElementById('filterPanel');
  panel.classList.remove('open');
  overlay.classList.remove('open');
}

function switchFpTab(name, btn) {
  document.querySelectorAll('.fp-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.fp-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('fp-' + name)?.classList.add('active');
}

function toggleFpFilter(key) {
  const row = document.getElementById('fprow-' + key);
  if (activeFilters.has(key)) {
    activeFilters.delete(key);
    row?.classList.remove('checked');
  } else {
    activeFilters.add(key);
    row?.classList.add('checked');
  }
  renderSubjectView();
}

function setFpSort(val, btn) {
  document.querySelectorAll('[id^="fpsort-"]').forEach(r => r.classList.remove('checked'));
  btn.classList.add('checked');
  sortOrder = val; // 'default' | 'asc' | 'desc'
  renderSubjectView();
}

function setFpDisplay(val, btn) {
  document.querySelectorAll('[id^="fpdisplay-"]').forEach(r => r.classList.remove('checked'));
  btn.classList.add('checked');
  fpDisplayMode = val;
  const inner = document.getElementById('subjectViewInner');
  if (inner) {
    inner.classList.remove('comfortable', 'compact');
    if (val === 'comfortable') inner.classList.add('comfortable');
    if (val === 'compact')     inner.classList.add('compact');
  }
}

function setFpGroup(val, btn) {
  document.querySelectorAll('[id^="fpgroup-"]').forEach(r => r.classList.remove('checked'));
  btn.classList.add('checked');
  fpGroupMode = val;
  renderSubjectView();
}

