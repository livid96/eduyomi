// ─────────────────────── CARD DRAG (main editor) ───────────────────────
let cardDragSrc = null;
function cardDrag(e, type, yi, si, ci, ti) {
  cardDragSrc = {type, yi, si, ci, ti};
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', JSON.stringify({type,yi,si,ci,ti}));
  const el = e.currentTarget;
  setTimeout(() => el.classList.add('dragging'), 0);
  // Mark all topic drop zones as receptive when dragging a topic
  if (type === 'topic') {
    document.querySelectorAll('.topics-dropzone').forEach(z => z.classList.add('topic-drag-active'));
  }
}
function cardDragOver(e, el) {
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  el.classList.add('drag-over');
}
function cardDrop(e, type, yi, si, ci, ti) {
  e.preventDefault(); e.stopPropagation();
  const el = e.currentTarget;
  el.classList.remove('drag-over');
  el.classList.remove('dragging');
  document.querySelectorAll('.dragging').forEach(d => d.classList.remove('dragging'));
  document.querySelectorAll('.topics-dropzone').forEach(z => z.classList.remove('topic-drag-active','topic-drag-hover'));
  if (!cardDragSrc || cardDragSrc.type !== type) { cardDragSrc = null; return; }
  const s = cardDragSrc; cardDragSrc = null;
  if (type==='year' && s.yi!==yi) { moveInArray(data.years, s.yi, yi); render(); refreshJsonPanel(); }
  else if (type==='subject' && s.yi===yi && s.si!==si) { moveInArray(data.years[yi].subjects, s.si, si); render(); refreshJsonPanel(); }
  else if (type==='chapter' && s.yi===yi && s.si===si && s.ci!==ci) { moveInArray(data.years[yi].subjects[si].chapters, s.ci, ci); render(); refreshJsonPanel(); }
  else if (type==='topic') {
    // Same chapter reorder
    if (s.yi===yi && s.si===si && s.ci===ci && s.ti!==ti) {
      moveInArray(data.years[yi].subjects[si].chapters[ci].topics, s.ti, ti);
      render(); refreshJsonPanel();
    }
    // Cross-chapter move: drop ON a topic row in a different chapter → insert before that topic
    else if (!(s.yi===yi && s.si===si && s.ci===ci)) {
      const topic = data.years[s.yi].subjects[s.si].chapters[s.ci].topics.splice(s.ti, 1)[0];
      data.years[yi].subjects[si].chapters[ci].topics.splice(ti, 0, topic);
      render(); refreshJsonPanel();
      toast('Topic moved to another chapter','s');
    }
  }
}

// ── Cross-chapter drop zone handlers (drop on empty area of a chapter) ──
function topicsZoneDragOver(e, el, yi, si, ci) {
  if (!cardDragSrc || cardDragSrc.type !== 'topic') return;
  e.preventDefault(); e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  el.classList.add('topic-drag-hover');
}
function topicsZoneDragLeave(el) {
  el.classList.remove('topic-drag-hover');
}
function topicsZoneDrop(e, yi, si, ci) {
  e.preventDefault(); e.stopPropagation();
  const el = document.getElementById(`topics-${yi}-${si}-${ci}`);
  if (el) { el.classList.remove('topic-drag-hover'); el.classList.remove('topic-drag-active'); }
  document.querySelectorAll('.topics-dropzone').forEach(z => z.classList.remove('topic-drag-active','topic-drag-hover'));
  document.querySelectorAll('.dragging').forEach(d => d.classList.remove('dragging'));
  if (!cardDragSrc || cardDragSrc.type !== 'topic') { cardDragSrc = null; return; }
  const s = cardDragSrc; cardDragSrc = null;
  // Same chapter — ignore (cardDrop handles reorder)
  if (s.yi===yi && s.si===si && s.ci===ci) return;
  // Move topic to end of target chapter
  const topic = data.years[s.yi].subjects[s.si].chapters[s.ci].topics.splice(s.ti, 1)[0];
  data.years[yi].subjects[si].chapters[ci].topics = data.years[yi].subjects[si].chapters[ci].topics || [];
  data.years[yi].subjects[si].chapters[ci].topics.push(topic);
  render(); refreshJsonPanel();
  toast('Topic moved to another chapter','s');
}

// Clear drag state on dragend
document.addEventListener('dragend', () => {
  cardDragSrc = null;
  document.querySelectorAll('.topics-dropzone').forEach(z => z.classList.remove('topic-drag-active','topic-drag-hover'));
  document.querySelectorAll('.dragging').forEach(d => d.classList.remove('dragging'));
}, true);

// ─────────────────────── SYNC TREE INPUTS (realtime) ───────────────────────
function syncTreeInput(key, val) {
  // key = 'y0', 'y0s1', 'y0s1c2'
  const inputs = document.querySelectorAll(`.tree-editable`);
  // We look for the input inside the matching tree item
  // Simple approach: re-render tree silently
  renderTree();
}
function syncTopicTree(yi, si, ci, ti, val) {
  // Update matching sidebar tree-editable input directly (no full re-render)
  const treeItem = document.querySelector(`#treeScroll .tree-item.depth-3:nth-of-type(${ti+1})`);
  // Use a more reliable selector via the drag handler attribute
  const allTopics = document.querySelectorAll(`[ondragstart*="treeDragStart(event,'topic',${yi},${si},${ci},${ti})"]`);
  allTopics.forEach(el => {
    const inp = el.querySelector('.tree-editable');
    if (inp && inp !== document.activeElement) inp.value = val;
  });
}

