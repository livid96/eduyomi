/* ════════════════════════════════════════
   TEST / FALLBACK DATA
════════════════════════════════════════ */
// ── List Popup (History / Watched / Bookmarks) ──────────────────────
const LIST_POPUP_CONFIG = {
  history: {
    title: 'Watch History',
    icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    emptyIcon: '🕐',
    emptyText: 'No videos watched yet.<br>Start playing a topic!',
  },
  watched: {
    title: 'Watched',
    icon: '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3.5"/></svg>',
    emptyIcon: '👁',
    emptyText: 'No watched topics yet.',
  },
  bookmarks: {
    title: 'Bookmarks',
    icon: '<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    emptyIcon: '🔖',
    emptyText: 'No bookmarks yet.',
  },
};

let _listPopupType = null;

function openListPopup(type) {
  _listPopupType = type;
  _renderListPopup();
  const ov = document.getElementById('listPopupOverlay');
  ov.classList.add('active');
  requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('visible')));
}

function clearListPopup() {
  const type = _listPopupType;
  if (!type) return;
  if (!confirm('Remove all items from ' + LIST_POPUP_CONFIG[type].title + '?')) return;
  if (type === 'history') {
    localStorage.removeItem('eduyomi-history');
  } else if (type === 'watched') {
    watchedTopics.clear();
    localStorage.setItem('eduyomi-watched', '[]');
    if (currentSubjectData) renderSubjectView();
  } else if (type === 'bookmarks') {
    bookmarkedTopics.clear();
    localStorage.setItem('eduyomi-bookmarked', '[]');
    if (currentSubjectData) renderSubjectView();
  }
  _renderListPopup();
}

function closeListPopup() {
  const ov = document.getElementById('listPopupOverlay');
  ov.classList.remove('visible');
  setTimeout(() => ov.classList.remove('active'), 300);
}

function _renderListPopup() {
  const type = _listPopupType;
  const cfg = LIST_POPUP_CONFIG[type];
  document.getElementById('lp-icon').innerHTML = cfg.icon;
  document.getElementById('lp-title').textContent = cfg.title;

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

  let ids = [];
  if (type === 'history') ids = JSON.parse(localStorage.getItem('eduyomi-history') || '[]');
  else if (type === 'watched') ids = [...watchedTopics];
  else if (type === 'bookmarks') ids = [...bookmarkedTopics];

  document.getElementById('lp-count').textContent = ids.length ? ids.length + ' item' + (ids.length !== 1 ? 's' : '') : '';

  const list = document.getElementById('lp-list');
  list.innerHTML = '';

  if (!ids.length) {
    list.innerHTML = `<div class="lp-empty"><div class="lp-empty-icon">${cfg.emptyIcon}</div>${cfg.emptyText}</div>`;
    return;
  }

  ids.forEach((vid, i) => {
    const title = topicTitle(vid);
    const item = document.createElement('div');
    item.className = 'lp-item';
    item.innerHTML = `
      <span class="lp-item-num">${i + 1}</span>
      <span class="lp-item-text" title="${esc(title)}">${esc(title)}</span>
      <button class="lp-item-remove" title="Remove">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    item.querySelector('.lp-item-text').onclick = () => {
      closeListPopup();
      playTopic(vid, title);
    };
    item.querySelector('.lp-item-remove').onclick = (e) => {
      e.stopPropagation();
      if (type === 'history') {
        const h = JSON.parse(localStorage.getItem('eduyomi-history') || '[]');
        localStorage.setItem('eduyomi-history', JSON.stringify(h.filter(v => v !== vid)));
      } else if (type === 'watched') {
        watchedTopics.delete(vid);
        localStorage.setItem('eduyomi-watched', JSON.stringify([...watchedTopics]));
        if (currentSubjectData) renderSubjectView();
      } else if (type === 'bookmarks') {
        bookmarkedTopics.delete(vid);
        localStorage.setItem('eduyomi-bookmarked', JSON.stringify([...bookmarkedTopics]));
        if (currentSubjectData) renderSubjectView();
      }
      _renderListPopup();
    };
    list.appendChild(item);
  });
}


