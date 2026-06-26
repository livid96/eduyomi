/* ════════════════════════════════════════
   SUBJECT DETAIL VIEW
════════════════════════════════════════ */
function openSubjectView(yi, si) {
  if (searchActive) return;
  currentSubjectData = { yi, si, sub: MASTER_DATA[yi].subjects[si] };
  activeChapters = new Set();
  sortOrder = 'default';
  openChapters = null; // reset to default (use settingsState.expandView)
  document.getElementById('yearContents').style.display = 'none';
  document.getElementById('tabsSection').style.display = 'none';
  document.getElementById('subjectView').classList.add('visible');
  renderSubjectView();
  // Update URL
  if (window._appReady && window.routerPushSubject) {
    var d = window.MASTER_DATA;
    var yearTitle = d && d[yi] ? (d[yi].year_title || ('Year ' + (yi + 1))) : null;
    var s = d && d[yi] && d[yi].subjects[si];
    var subjectName = s ? ((s.subject_name && s.subject_name.en) || s.name || s.subject || '') : null;
    if (yearTitle && subjectName) {
      routerPushSubject(yearTitle, subjectName);
      if (window.routerSetTitle) routerSetTitle([yearTitle, subjectName]);
    }
  }
}

function goBack() {
  document.getElementById('subjectView').classList.remove('visible');
  document.getElementById('yearContents').style.display = '';
  document.getElementById('tabsSection').style.display = '';
  currentSubjectData = null;
  if (window._appReady && window.routerPushHome) { routerPushHome(); routerSetTitle && routerSetTitle([]); }
}

function goHome() {
  if (currentSubjectData) goBack();
  handleSearch('');
}

function renderSubjectView() {
  if (!currentSubjectData) return;
  const { yi, sub } = currentSubjectData;
  const chapters = sub.chapters || [];
  const yearLabel = MASTER_DATA[yi]?.year_title || '';
  const name_en = sub.subject_name?.en || 'Subject';
  const name_bn = sub.subject_name?.bn || '';

  const inner = document.getElementById('subjectViewInner');

  // Sort chapters
  const displayChapters = sortOrder === 'desc'
    ? [...chapters].map((ch,i)=>({ch,origIdx:i})).reverse()
    : chapters.map((ch,i)=>({ch,origIdx:i}));

  // Helper: render a single topic item
  function renderTopicItem(topic, chapterOrigIdx, topicIdx) {
    const t_en = topic.title || '—';
    const t_bn = '';
    const videoId = topic.url || '';
    const hasVideo = !!videoId;
    const isWatched    = hasVideo && watchedTopics.has(videoId);
    const isBookmarked = hasVideo && bookmarkedTopics.has(videoId);
    const vid = esc(videoId);
    const showWBIcons = settingsState.showWatchBookmark;
    const iconsBtns = (hasVideo && showWBIcons) ? `
      <div class="topic-icons" onclick="event.stopPropagation()">
        <button class="topic-icon-btn ${isWatched?'ti-active ti-watch-active':''}" title="${isWatched?'Mark unwatched':'Mark watched'}"
          onclick="toggleTopicWatched('${vid}',this)">
          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3.5"/></svg>
        </button>
        <button class="topic-icon-btn ${isBookmarked?'ti-active ti-bookmark-active':''}" title="${isBookmarked?'Remove bookmark':'Bookmark'}"
          onclick="toggleTopicBookmarked('${vid}',this)">
          <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>` : '';
    return `<div class="topic-item ${hasVideo?'':'no-video'} ${isWatched?'topic-watched':''}" id="topic-${esc(videoId||chapterOrigIdx+'-'+topicIdx)}"
      onclick="${hasVideo?`playTopic('${vid}','${esc(t_en)}')`:''}"
      style="${hasVideo?'':'cursor:default;opacity:.65'}">
      <div class="topic-play-icon">
        <svg viewBox="0 0 10 10"><polygon points="3,1 9,5 3,9"/></svg>
      </div>
      <div class="topic-text">
        <div class="topic-en">${esc(t_en)}</div>
        ${t_bn?`<div class="topic-bn">${esc(t_bn)}</div>`:''}
        ${!hasVideo?`<div class="topic-no-video">No video available</div>`:''}
      </div>
      ${iconsBtns}
    </div>`;
  }

  // Helper: apply active filters to a topics array
  function applyFilters(topics) {
    if (activeFilters.size === 0) return topics;
    return topics.filter(topic => {
      const vid = topic.url || '';
      const watched = watchedTopics.has(vid);
      if (activeFilters.has('watched')    && !watched)                          return false;
      if (activeFilters.has('unwatched')  && watched)                           return false;
      if (activeFilters.has('bookmarked') && !bookmarkedTopics.has(vid))        return false;
      return true;
    });
  }

  let chaptersHtml = '';

  if (fpGroupMode === 'none') {
    // Flat list: collect all topics from all (sorted) chapters, apply filters, render without chapter headers
    let allTopics = [];
    displayChapters.forEach(({ch, origIdx}) => {
      let topics = applyFilters(ch.topics || []);
      topics.forEach((topic, ti) => allTopics.push({ topic, origIdx, ti }));
    });
    if (allTopics.length === 0) {
      chaptersHtml = '';
    } else {
      chaptersHtml = `<div class="chapter-block" style="margin-bottom:0">
        <div class="topic-list open" style="border-radius:var(--radius-lg)">
          ${allTopics.map(({topic, origIdx, ti}) => renderTopicItem(topic, origIdx, ti)).join('')}
        </div>
      </div>`;
    }
  } else {
    // Grouped by chapter (default)
    chaptersHtml = displayChapters.map(({ch, origIdx}) => {
      const ch_en = ch.chapter_title || `Chapter ${origIdx+1}`;
      const ch_bn = '';
      let topics = applyFilters(ch.topics || []);
      if (activeFilters.size > 0 && topics.length === 0) return '';

      const topicsHtml = topics.map((topic, ti) => renderTopicItem(topic, origIdx, ti)).join('');
      // Use manually tracked open state if available, otherwise fall back to expandView setting
      const isExpanded = openChapters !== null ? openChapters.has(origIdx) : settingsState.expandView;

      return `<div class="chapter-block" data-orig-idx="${origIdx}">
        <div class="chapter-header-row ${isExpanded?'open':''}" onclick="toggleChapter(this)">
          <div class="chapter-num">${origIdx+1}</div>
          <div class="chapter-title-text">
            <div class="chapter-title-en">${origIdx+1}. ${esc(ch_en)}</div>
            ${ch_bn?`<div class="chapter-title-bn">${esc(ch_bn)}</div>`:''}
          </div>
          <span class="chapter-topic-count">${topics.length} topic${topics.length!==1?'s':''}</span>
          <svg class="chapter-chevron" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>
        </div>
        <div class="topic-list ${isExpanded?'open':''}">${topicsHtml||'<div style="padding:14px 18px;font-size:.82rem;color:var(--text-muted);">No topics yet</div>'}</div>
      </div>`;
    }).join('');
  }

  const hasActiveFilter = activeFilters.size > 0 || sortOrder !== 'default';

  inner.innerHTML = `
    <div class="section-heading-row">
      <h2>${esc(name_en)}</h2>
      ${name_bn?`<span class="badge">${esc(name_bn)}</span>`:''}
      <span class="badge">${esc(yearLabel)}</span>
      <button class="filter-menu-btn ${hasActiveFilter?'has-filter':''}" onclick="openFilterPanel()" title="Filter &amp; Sort" style="margin-left:auto">
        <svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
    ${!chaptersHtml.trim()?`<div style="padding:40px 0;text-align:center;color:var(--text-muted);">No topics match the current filter.</div>`:''}
    ${chaptersHtml}
  `;
  // Re-apply display mode class
  if (fpDisplayMode === 'comfortable') inner.classList.add('comfortable');
  else if (fpDisplayMode === 'compact') inner.classList.add('compact');
}

function toggleChapter(headerEl) {
  headerEl.classList.toggle('open');
  const list = headerEl.nextElementSibling;
  if (list) list.classList.toggle('open');
  // Record open state so renderSubjectView can restore it
  const block = headerEl.closest('.chapter-block');
  const origIdx = block ? parseInt(block.dataset.origIdx) : -1;
  if (origIdx >= 0) {
    if (openChapters === null) {
      // Initialize from current DOM state of all chapters
      openChapters = new Set();
      document.querySelectorAll('.chapter-block').forEach(b => {
        const hdr = b.querySelector('.chapter-header-row');
        if (hdr && hdr.classList.contains('open')) openChapters.add(parseInt(b.dataset.origIdx));
      });
    }
    if (headerEl.classList.contains('open')) openChapters.add(origIdx);
    else openChapters.delete(origIdx);
  }
  // Update URL with chapter slug
  if (window._appReady && window.routerPushChapter && currentSubjectData) {
    var d = window.MASTER_DATA;
    var yi = currentSubjectData.yi, si = currentSubjectData.si;
    var yearTitle = d && d[yi] ? (d[yi].year_title || ('Year ' + (yi + 1))) : null;
    var s = d && d[yi] && d[yi].subjects[si];
    var subjectName = s ? ((s.subject_name && s.subject_name.en) || s.name || s.subject || '') : null;
    var titleEl = headerEl.querySelector('.chapter-title-en');
    var chName = titleEl ? titleEl.textContent.replace(/^\d+\.\s*/, '').trim() : null;
    if (yearTitle && subjectName && chName) routerPushChapter(yearTitle, subjectName, chName);
  }
}

function toggleChapterFilter(idx) {
  if (activeChapters.has(idx)) activeChapters.delete(idx);
  else activeChapters.add(idx);
  renderSubjectView();
}

function clearChapterFilter() {
  activeChapters = new Set();
  renderSubjectView();
}

function toggleSort() {
  sortOrder = sortOrder === 'asc' ? 'desc' : sortOrder === 'desc' ? 'default' : 'asc';
  renderSubjectView();
}

