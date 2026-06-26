/* ════════════════════════════════════════
   SEARCH POPUP
════════════════════════════════════════ */
function openSearchPopup() {
  const o = document.getElementById('searchPopupOverlay');
  o.classList.add('active');
  requestAnimationFrame(() => requestAnimationFrame(() => { o.classList.add('visible'); document.getElementById('searchPopupInput').focus(); }));
  document.body.style.overflow = 'hidden';
}
function closeSearchPopup() {
  const o = document.getElementById('searchPopupOverlay');
  o.classList.remove('visible');
  document.body.style.overflow = '';
  setTimeout(() => o.classList.remove('active'), 280);
  document.getElementById('searchPopupInput').value = '';
  document.getElementById('searchPopupResults').innerHTML = '';
}

function handlePopupSearch(query) {
  const q = query.trim().toLowerCase();
  const container = document.getElementById('searchPopupResults');
  if (!q) { container.innerHTML = ''; return; }
  const scored = SEARCH_INDEX.map(item => ({ item, score: scoreItem(item, q) })).filter(x => x.score > 0).sort((a,b) => b.score - a.score).slice(0, 30);
  if (!scored.length) { container.innerHTML = `<div class="popup-empty">No results for "<strong>${esc(query)}</strong>"</div>`; return; }
  const local  = scored.filter(x => x.item.isLocal).map(x => x.item);
  const remote = scored.filter(x => !x.item.isLocal).map(x => x.item);
  let html = '';
  if (local.length) { html += `<div class="popup-section-label">Subjects</div>`; local.forEach(r => html += popupItem(r, false)); }
  if (remote.length) { if (local.length) html += '<div class="popup-divider"></div>'; html += `<div class="popup-section-label">Chapters & Topics</div>`; remote.forEach(r => html += popupItem(r, true)); }
  container.innerHTML = html;
}
function popupItem(r, isOther) {
  if (r.video_id) {
    return `<div class="popup-result-item" onclick="closeSearchPopup();setTimeout(()=>openTopicVideoFromSearch('${esc(r.video_id)}','${esc(r.title)}','${esc(r.subject_path||'')}','${esc(r.chapter_en||'')}',${r.yi??'null'},${r.si??'null'}),320)">
      <div class="popup-result-icon">${r.emoji||'📚'}</div>
      <div class="popup-result-body">
        <div class="popup-result-title">${esc(r.title)}</div>
        ${r.title_bn?`<div class="popup-result-subtitle">${esc(r.title_bn)}</div>`:''}
        <div class="popup-result-path ${isOther?'accent-path':''}">${esc(r.path)}</div>
      </div></div>`;
  }
  return `<a class="popup-result-item" href="${esc(r.href||'#')}" onclick="closeSearchPopup()">
    <div class="popup-result-icon">${r.emoji||'📚'}</div>
    <div class="popup-result-body">
      <div class="popup-result-title">${esc(r.title)}</div>
      ${r.title_bn?`<div class="popup-result-subtitle">${esc(r.title_bn)}</div>`:''}
      <div class="popup-result-path ${isOther?'accent-path':''}">${esc(r.path)}</div>
    </div></a>`;
}

