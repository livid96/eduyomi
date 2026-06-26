/* ════════════════════════════════════════
   SETTINGS MODAL
════════════════════════════════════════ */
function openSettingsModal() {
  applySettingsUI();
  const modal = document.getElementById('settingsModal');
  modal.style.opacity = '0';
  modal.classList.add('open');
  modal.scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => { modal.style.opacity = ''; }));
}
function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.style.opacity = '0';
  setTimeout(() => { modal.classList.remove('open'); modal.style.opacity = ''; }, 250);
}
function toggleSettingWatchBookmark(val) {
  settingsState.showWatchBookmark = val;
  saveSettings();
  updateVideoActionBtns();
  if (currentSubjectData) renderSubjectView();
  const amRow = document.getElementById('settings-row-automarkwatched');
  if (amRow) amRow.style.display = val ? '' : 'none';
  document.querySelectorAll('.drawer-wb-item').forEach(el => el.style.display = val ? '' : 'none');
}
function toggleSettingAutoMarkWatched(val) {
  settingsState.autoMarkWatched = val;
  saveSettings();
}
function applySettingsUI() {
  const wbChk = document.getElementById('stgl-watchbookmark');
  if (wbChk) wbChk.checked = settingsState.showWatchBookmark;
  const abChk = document.getElementById('stgl-adblock');
  if (abChk) abChk.checked = settingsState.adBlockEnabled !== false;
  const amChk = document.getElementById('stgl-automarkwatched');
  if (amChk) amChk.checked = settingsState.autoMarkWatched;
  const amRow = document.getElementById('settings-row-automarkwatched');
  if (amRow) amRow.style.display = settingsState.showWatchBookmark ? '' : 'none';
  document.querySelectorAll('.drawer-wb-item').forEach(el => el.style.display = settingsState.showWatchBookmark ? '' : 'none');
  const evRow = document.getElementById('fprow-expandview');
  if (evRow) evRow.classList.toggle('checked', settingsState.expandView);
  syncSpeedSliderUI(parseFloat(settingsState.playerSpeed || '1'));
  syncQualityPillUI(settingsState.playerQuality || 'auto');
  updateVideoActionBtns();
}
function toggleFpExpandView(rowEl) {
  settingsState.expandView = !settingsState.expandView;
  saveSettings();
  rowEl.classList.toggle('checked', settingsState.expandView);
  if (currentSubjectData) renderSubjectView();
}
function formatTime(s) {
  if (isNaN(s)) return '0:00';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
  if (h>0) return `${h}:${m<10?'0'+m:m}:${sec<10?'0'+sec:sec}`;
  return `${m}:${sec<10?'0'+sec:sec}`;
}

function startTimeTracker() {
  stopTimeTracker();
  let watchMarked = watchedTopics.has(currentVideoId); // skip if already marked
  progressUpdater = setInterval(() => {
    if (!mainPlayer?.getDuration) return;
    const cur = mainPlayer.getCurrentTime();
    const dur = mainPlayer.getDuration();
    const p = dur ? (cur/dur)*100 : 0;
    seekbar.value = p;
    seekbar.style.background = `linear-gradient(to right, var(--accent) ${p}%, rgba(255,255,255,0.15) ${p}%)`;
    curTimeEl.textContent = formatTime(cur);
    durTimeEl.textContent = formatTime(dur);
    // Mark as watched at 75% progress
    if (!watchMarked && dur > 0 && p >= 75 && settingsState.autoMarkWatched) {
      watchMarked = true;
      markVideoWatched(currentVideoId);
    }
  }, 400);
}
function stopTimeTracker() { clearInterval(progressUpdater); }

function showHud() { hud.classList.add('visible'); clearTimeout(hudTimer); }
function hideHud() { if (isVideoPlaying && !selectOpen) hud.classList.remove('visible'); }
function refreshHudInactivity() { clearTimeout(hudTimer); if (isVideoPlaying && !selectOpen) hudTimer = setTimeout(hideHud, 3000); }
function toggleControlsVisible() {
  closeAllCtrlPanels();
  if (hud.classList.contains('visible')) hideHud();
  else { showHud(); if (isVideoPlaying) refreshHudInactivity(); }
}

function handlePlayPause(e) { e.stopPropagation(); isVideoPlaying ? mainPlayer.pauseVideo() : mainPlayer.playVideo(); }
function stepBackward(e) { e.stopPropagation(); mainPlayer?.seekTo(mainPlayer.getCurrentTime()-10); refreshHudInactivity(); }
function stepForward(e)  { e.stopPropagation(); mainPlayer?.seekTo(mainPlayer.getCurrentTime()+10); refreshHudInactivity(); }
function toggleCtrlPanel(panelId, btnId) {
  const panel = document.getElementById(panelId);
  const btn   = document.getElementById(btnId);
  const isOpen = panel.classList.contains('open');
  document.querySelectorAll('.ctrl-popup').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.ctrl-icon-btn').forEach(b => b.classList.remove('panel-open'));
  if (!isOpen) {
    panel.style.visibility = 'hidden';
    panel.classList.add('open');

    const isFS   = !!document.fullscreenElement;
    const zone   = document.getElementById('interaction-zone');
    const card   = document.getElementById('videoPlayerCard');
    const zoneRect = zone.getBoundingClientRect();
    const btnRect  = btn.getBoundingClientRect();
    const panelW   = panel.offsetWidth;
    const panelH   = panel.offsetHeight;
    const pad      = 12;

    if (isFS) {
      // In fullscreen: popup is position:fixed — use viewport coords directly
      let top  = btnRect.top - panelH - pad;
      let left = btnRect.left + btnRect.width / 2 - panelW / 2;
      left = Math.max(pad, Math.min(left, window.innerWidth - panelW - pad));
      top  = Math.max(pad, top);
      panel.style.top  = top  + 'px';
      panel.style.left = left + 'px';
    } else {
      // Normal: popup is position:absolute inside card
      const cardRect = card.getBoundingClientRect();
      let top  = (btnRect.top  - cardRect.top)  - panelH - pad;
      let left = (btnRect.left - cardRect.left) + btnRect.width / 2 - panelW / 2;
      // Clamp within the video zone horizontally
      const minLeft = (zoneRect.left  - cardRect.left) + pad;
      const maxLeft = (zoneRect.right - cardRect.left) - panelW - pad;
      left = Math.max(minLeft, Math.min(left, maxLeft));
      panel.style.top  = top  + 'px';
      panel.style.left = left + 'px';
    }

    panel.style.visibility = '';
    btn.classList.add('panel-open');
    selectOpen = true; clearTimeout(hudTimer); showHud();
  } else {
    selectOpen = false; refreshHudInactivity();
  }
}

function closeAllCtrlPanels() {
  document.querySelectorAll('.ctrl-popup').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.ctrl-icon-btn').forEach(b => b.classList.remove('panel-open'));
  selectOpen = false;
}
function onSpeedSlider(el) {
  const rate = parseFloat((el.value / 100).toFixed(2));
  const label = (rate === Math.round(rate) ? rate : rate) + '×';
  document.getElementById('speed-label').textContent = label;
  document.getElementById('speed-label-popup').textContent = label;
  // Fill track
  const pct = ((el.value - 25) / (400 - 25)) * 100;
  el.style.background = `linear-gradient(to right, var(--accent) ${pct}%, rgba(255,255,255,0.18) ${pct}%)`;
  mainPlayer?.setPlaybackRate(rate);
  settingsState.playerSpeed = String(rate);
  saveSettings();
  // Sync presets highlight
  document.querySelectorAll('.speed-preset').forEach(b => {
    b.classList.toggle('active', parseFloat(b.textContent) === rate);
  });
}

function setSpeedPreset(rate) {
  const sl = document.getElementById('speed-slider');
  if (!sl) return;
  sl.value = Math.round(rate * 100);
  onSpeedSlider(sl);
}

function setQuality(q, btn) {
  document.querySelectorAll('.q-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const labelMap = { auto:'Auto', hd1080:'1080p', hd720:'720p', large:'480p', medium:'360p', small:'240p' };
  document.getElementById('quality-label').textContent = labelMap[q] || 'Auto';
  settingsState.playerQuality = q;
  saveSettings();
  if (!mainPlayer || !currentVideoId) return;
  const currentTime = mainPlayer.getCurrentTime() || 0;
  const wasPlaying  = isVideoPlaying;
  // Reload video at the suggested quality — the only reliable way in modern YT API
  mainPlayer.loadVideoById({
    videoId: currentVideoId,
    startSeconds: currentTime,
    suggestedQuality: q === 'auto' ? 'default' : q
  });
  if (!wasPlaying) setTimeout(() => mainPlayer.pauseVideo(), 600);
  closeAllCtrlPanels();
}

function syncSpeedSliderUI(rate) {
  const sl = document.getElementById('speed-slider');
  const lb = document.getElementById('speed-label');
  const lbp = document.getElementById('speed-label-popup');
  if (!sl) return;
  const val = Math.round(rate * 100);
  sl.value = val;
  const pct = ((val - 25) / (400 - 25)) * 100;
  sl.style.background = `linear-gradient(to right, var(--accent) ${pct}%, rgba(255,255,255,0.18) ${pct}%)`;
  const txt = (rate === Math.round(rate) ? rate : rate.toFixed(2)) + '×';
  if (lb)  lb.textContent  = txt;
  if (lbp) lbp.textContent = txt;
  document.querySelectorAll('.speed-preset').forEach(b => {
    b.classList.toggle('active', parseFloat(b.textContent) === rate);
  });
}

function syncQualityPillUI(q) {
  document.querySelectorAll('.q-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.q === q);
  });
  const label = { auto:'Auto', hd1080:'1080p', hd720:'720p', large:'480p', medium:'360p', small:'240p' };
  const ql = document.getElementById('quality-label');
  if (ql) ql.textContent = label[q] || 'Auto';
}

function initFullscreen(e) {
  e.stopPropagation();
  const card = document.getElementById('videoPlayerCard');
  if (!document.fullscreenElement) {
    card.requestFullscreen().catch(()=>{});
    if (screen.orientation?.lock) screen.orientation.lock('landscape').catch(()=>{});
  } else {
    document.exitFullscreen().catch(()=>{});
  }
}

function attachGestureListeners() {
  let sX, sT, dragging = false;
  const zone = document.getElementById('interaction-zone');
  zone.addEventListener('pointerdown', e => {
    if (e.target.closest('.control-panel')) return;
    sX = e.clientX; sT = mainPlayer?.getCurrentTime()||0; dragging = true;
  });
  window.addEventListener('pointermove', e => {
    if (!dragging || !mainPlayer) return;
    const delta = e.clientX - sX;
    if (Math.abs(delta) > 60) {
      const nT = Math.max(0, Math.min(sT + (delta*0.4), mainPlayer.getDuration()||0));
      toast.style.opacity = '1';
      toast.textContent = (delta>0?'» ':'« ') + formatTime(nT);
      mainPlayer.seekTo(nT);
    }
  });
  window.addEventListener('pointerup', () => { dragging = false; toast.style.opacity = '0'; });
}


