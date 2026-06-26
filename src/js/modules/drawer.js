/* ════════════════════════════════════════
   MOBILE DRAWER
════════════════════════════════════════ */
function renderDrawerLists() {
  // Helpers
  function topicTitle(vid) {
    for (const year of MASTER_DATA) {
      for (const sub of (year.subjects||[])) {
        for (const ch of (sub.chapters||[])) {
          for (const t of (ch.topics||[])) {
            if (t.url === vid) return t.title || vid;
          }
        }
      }
    }
    return vid;
  }
  function makeItem(vid, onRemove) {
    const title = topicTitle(vid);
    const div = document.createElement('div');
    div.className = 'drawer-history-item';
    div.innerHTML = `<span class="drawer-history-item-text" title="${esc(title)}">${esc(title)}</span>
      <button class="drawer-history-remove" title="Remove"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
    div.querySelector('.drawer-history-item-text').onclick = () => { closeMobileDrawer(); playTopic(vid, title); };
    div.querySelector('.drawer-history-remove').onclick = (e) => { e.stopPropagation(); onRemove(vid); renderDrawerLists(); };
    return div;
  }
  function fill(listId, ids, onRemove) {
    const el = document.getElementById(listId);
    if (!el) return;
    el.innerHTML = '';
    if (!ids.length) { el.innerHTML = '<div class="drawer-empty-note">Nothing here yet</div>'; return; }
    ids.forEach(vid => el.appendChild(makeItem(vid, onRemove)));
  }

  // History (ordered, stored separately)
  const history = JSON.parse(localStorage.getItem('eduyomi-history') || '[]');
  fill('drawerHistoryList', history, (vid) => {
    const h = JSON.parse(localStorage.getItem('eduyomi-history') || '[]');
    localStorage.setItem('eduyomi-history', JSON.stringify(h.filter(v => v !== vid)));
  });

  // All Watched
  fill('drawerWatchedList', [...watchedTopics], (vid) => {
    watchedTopics.delete(vid);
    localStorage.setItem('eduyomi-watched', JSON.stringify([...watchedTopics]));
    if (currentSubjectData) renderSubjectView();
  });

  // All Bookmarked
  fill('drawerBookmarkedList', [...bookmarkedTopics], (vid) => {
    bookmarkedTopics.delete(vid);
    localStorage.setItem('eduyomi-bookmarked', JSON.stringify([...bookmarkedTopics]));
    if (currentSubjectData) renderSubjectView();
  });
}

function openMobileDrawer() {
  document.getElementById('mobileDrawer').classList.add('open');
  document.getElementById('mobileDrawerBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMobileDrawer() {
  document.getElementById('mobileDrawer').classList.remove('open');
  document.getElementById('mobileDrawerBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}
