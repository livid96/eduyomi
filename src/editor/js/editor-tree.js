// ─────────────────────── TREE ───────────────────────
function renderTree() {
  const scroll = document.getElementById('treeScroll');
  const q = document.getElementById('sidebarSearch').value.toLowerCase().trim();
  const years = data.years || [];
  const sortedYi = getSortedYears();

  if (!years.length) { scroll.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:10px;">No data loaded</div>`; return; }

  let html = '';
  sortedYi.forEach(yi => {
    const year = years[yi];
    const yKey = `y${yi}`;
    if (treeOpen[yKey] === undefined) treeOpen[yKey] = false;
    const yOpen = treeOpen[yKey];

    // Filter check
    const yearMatch = !q || (year.year_title||'').toLowerCase().includes(q);
    let subHtml = '';
    let anySubMatch = false;

    (year.subjects||[]).forEach((sub, si) => {
      const sKey = `y${yi}s${si}`;
      if (treeOpen[sKey] === undefined) treeOpen[sKey] = false;
      const sOpen = treeOpen[sKey];
      const subName = sub.subject_name?.en || '';
      const subMatch = !q || subName.toLowerCase().includes(q) || yearMatch;

      let chHtml = '';
      let anyChMatch = false;
      (sub.chapters||[]).forEach((ch, ci) => {
        const cKey = `y${yi}s${si}c${ci}`;
        if (treeOpen[cKey] === undefined) treeOpen[cKey] = false;
        const cOpen = treeOpen[cKey];
        const chTitle = ch.chapter_title||'';
        const chMatch = !q || chTitle.toLowerCase().includes(q) || subMatch;

        let topHtml = '';
        let anyTopMatch = false;
        (ch.topics||[]).forEach((t, ti) => {
          const topMatch = !q || (t.title||'').toLowerCase().includes(q) || chMatch;
          if (topMatch) { anyTopMatch = true; }
          if (topMatch || !q)
            topHtml += `<div class="tree-item depth-3" draggable="true" ondragstart="treeDragStart(event,'topic',${yi},${si},${ci},${ti})" ondragover="treeDragOver(event,this)" ondrop="treeDrop(event,'topic',${yi},${si},${ci},${ti})" ondragleave="treeDragLeave(this)">
              <div class="tree-row" onclick="scrollToId('tp-${yi}-${si}-${ci}-${ti}')">
                <span style="width:13px"></span><span style="width:13px"></span>
                <span class="tree-drag-handle" title="Drag">⠿</span>
                <span class="tree-label-wrap">
                  <input class="tree-editable" value="${esc(t.title||'')}" placeholder="Topic title" onclick="event.stopPropagation()" onchange="setTopicTitle(${yi},${si},${ci},${ti},this.value)" title="Edit topic title">
                  ${t.url?'<span class="tree-badge">▶</span>':''}
                </span>
                <button class="tree-remove" onclick="event.stopPropagation();removeTopic(${yi},${si},${ci},${ti})" title="Remove topic">−</button>
                <button class="tree-goto" onclick="event.stopPropagation();gotoItem(${yi},${si},${ci},${ti})" title="Go to in editor & JSON">→</button>
              </div>
            </div>`;
        });
        if (chMatch || anyTopMatch || !q) { anyChMatch = true; }
        if (chMatch || anyTopMatch || !q)
          chHtml += `<div class="tree-item depth-2" draggable="true" ondragstart="treeDragStart(event,'chapter',${yi},${si},${ci})" ondragover="treeDragOver(event,this)" ondrop="treeDrop(event,'chapter',${yi},${si},${ci})" ondragleave="treeDragLeave(this)">
            <div class="tree-row" onclick="scrollToId('ch-${yi}-${si}-${ci}')">
              <span style="width:13px"></span>
              <span class="tree-toggle ${cOpen?'open':''}" onclick="event.stopPropagation();toggleTree('${cKey}')">▶</span>
              <span class="tree-drag-handle">⠿</span>
              <span class="tree-label-wrap">
                <input class="tree-editable" value="${esc(ch.chapter_title||'')}" onclick="event.stopPropagation()" onchange="setChTitle(${yi},${si},${ci},this.value)" title="Edit chapter title">
                <span class="tree-badge">${(ch.topics||[]).length}</span>
              </span>
              <button class="tree-add" onclick="event.stopPropagation();addTopic(${yi},${si},${ci})" title="Add topic">+</button>
              <button class="tree-remove" onclick="event.stopPropagation();removeCh(${yi},${si},${ci})" title="Remove chapter">−</button>
              <button class="tree-goto" onclick="event.stopPropagation();gotoItem(${yi},${si},${ci})" title="Go to in editor & JSON">→</button>
            </div>
            ${cOpen ? `<div class="tree-children" id="tc-${cKey}">${topHtml}</div>` : `<div class="tree-children" id="tc-${cKey}" style="display:none">${topHtml}</div>`}
          </div>`;
      });

      if (subMatch || anyChMatch || !q) { anySubMatch = true; }
      if (subMatch || anyChMatch || !q)
        subHtml += `<div class="tree-item depth-1" draggable="true" ondragstart="treeDragStart(event,'subject',${yi},${si})" ondragover="treeDragOver(event,this)" ondrop="treeDrop(event,'subject',${yi},${si})" ondragleave="treeDragLeave(this)">
          <div class="tree-row" onclick="scrollToId('sub-${yi}-${si}')">
            <span style="width:13px"></span>
            <span class="tree-toggle ${sOpen?'open':''}" onclick="event.stopPropagation();toggleTree('${sKey}')">▶</span>
            <span class="tree-drag-handle">⠿</span>
            <span class="tree-label-wrap">
              <input class="tree-editable" value="${esc(subName)}" onclick="event.stopPropagation()" onchange="setSubName(${yi},${si},this.value)" title="Edit subject name">
              <span class="tree-badge">${(sub.chapters||[]).length}c</span>
            </span>
            <button class="tree-add" onclick="event.stopPropagation();addChapter(${yi},${si})" title="Add chapter">+</button>
            <button class="tree-remove" onclick="event.stopPropagation();removeSub(${yi},${si})" title="Remove subject">−</button>
            <button class="tree-goto" onclick="event.stopPropagation();gotoItem(${yi},${si})" title="Go to in editor & JSON">→</button>
          </div>
          ${sOpen ? `<div class="tree-children" id="tc-${sKey}">${chHtml}</div>` : `<div class="tree-children" id="tc-${sKey}" style="display:none">${chHtml}</div>`}
        </div>`;
    });

    if (yearMatch || anySubMatch || !q)
      html += `<div class="tree-item depth-0" draggable="true" ondragstart="treeDragStart(event,'year',${yi})" ondragover="treeDragOver(event,this)" ondrop="treeDrop(event,'year',${yi})" ondragleave="treeDragLeave(this)">
        <div class="tree-row" onclick="scrollToId('yr-${yi}')">
          <span class="tree-toggle ${yOpen?'open':''}" onclick="event.stopPropagation();toggleTree('${yKey}')">▶</span>
          <span style="width:13px"></span>
          <span class="tree-drag-handle">⠿</span>
          <span class="tree-label-wrap">
            <input class="tree-editable" value="${esc(year.year_title||'')}" onclick="event.stopPropagation()" onchange="setYearTitle(${yi},this.value)" title="Edit year title">
            <span class="tree-badge">${(year.subjects||[]).length}s</span>
          </span>
          <button class="tree-add" onclick="event.stopPropagation();addSubject(${yi})" title="Add subject">+</button>
          <button class="tree-remove" onclick="event.stopPropagation();removeYear(${yi})" title="Remove year">−</button>
          <button class="tree-goto" onclick="event.stopPropagation();gotoItem(${yi})" title="Go to in editor & JSON">→</button>
        </div>
        ${yOpen ? `<div class="tree-children" id="tc-${yKey}">${subHtml}</div>` : `<div class="tree-children" id="tc-${yKey}" style="display:none">${subHtml}</div>`}
      </div>`;
  });

  scroll.innerHTML = html;
  // Sync mobile tree drawer if open
  if (isMobile && isMobile()) {
    const drawer = document.getElementById('mobTreeDrawer');
    if (drawer && drawer.classList.contains('open')) {
      const content = document.getElementById('mobTreeContent');
      if (content) content.innerHTML = html;
    }
  }
}

function toggleTree(key) {
  treeOpen[key] = !treeOpen[key];
  const ch = document.getElementById(`tc-${key}`);
  if (ch) ch.style.display = treeOpen[key] ? '' : 'none';
  // update arrow
  renderTree(); // simple re-render for arrows
}

function collapseAll() { Object.keys(treeOpen).forEach(k => treeOpen[k] = false); renderTree(); }
function expandAll() { Object.keys(treeOpen).forEach(k => treeOpen[k] = true); renderTree(); }
function filterTree() { renderTree(); }

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) { el.scrollIntoView({ behavior:'smooth', block:'start' }); el.style.boxShadow = '0 0 0 2px var(--accent)'; setTimeout(()=>el.style.boxShadow='',1500); }
}

// ─────────────────────── TREE DRAG ───────────────────────
function treeDragStart(e, type, yi, si, ci, ti) {
  e.stopPropagation();
  dragSrc = {type, yi, si, ci, ti};
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', JSON.stringify({type,yi,si,ci,ti}));
  setTimeout(() => e.currentTarget.classList.add('dragging'), 0);
}
function treeDragOver(e, el) {
  e.preventDefault(); e.stopPropagation();
  if (!dragSrc) return;
  e.dataTransfer.dropEffect = 'move';
  const row = el.querySelector(':scope > .tree-row');
  if (row) row.classList.add('drag-over');
}
function treeDragLeave(el) {
  const row = el.querySelector(':scope > .tree-row');
  if (row) row.classList.remove('drag-over');
}
function treeDrop(e, type, yi, si, ci, ti) {
  e.preventDefault(); e.stopPropagation();
  const el = e.currentTarget;
  const row = el.querySelector(':scope > .tree-row');
  if (row) row.classList.remove('drag-over');
  if (!dragSrc || dragSrc.type !== type) { dragSrc = null; return; }
  const s = dragSrc; dragSrc = null;
  if (type === 'year' && s.yi !== yi) {
    moveInArray(data.years, s.yi, yi); render(); refreshJsonPanel();
  } else if (type === 'subject' && s.yi === yi && s.si !== si) {
    moveInArray(data.years[yi].subjects, s.si, si); render(); refreshJsonPanel();
  } else if (type === 'chapter' && s.yi === yi && s.si === si && s.ci !== ci) {
    moveInArray(data.years[yi].subjects[si].chapters, s.ci, ci); render(); refreshJsonPanel();
  } else if (type === 'topic' && s.yi === yi && s.si === si && s.ci === ci && s.ti !== ti) {
    moveInArray(data.years[yi].subjects[si].chapters[ci].topics, s.ti, ti); render(); refreshJsonPanel();
  }
}
function moveInArray(arr, from, to) { const item = arr.splice(from, 1)[0]; arr.splice(to, 0, item); }

