// ─────────────────────── FILE DRAG & DROP ───────────────────────
(function initFileDrop() {
  const overlay = document.getElementById('dropOverlay');
  const hint = document.getElementById('loadDropHint');
  let dragCounter = 0; // track nested dragenter/dragleave

  function hasFiles(e) {
    return e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
  }

  function showDropOverlay() {
    overlay.classList.add('visible');
    if (hint) hint.classList.add('pulsing');
  }
  window.hideDropOverlay = function() {
    overlay.classList.remove('visible', 'over');
    if (hint) hint.classList.remove('pulsing');
    dragCounter = 0;
  };

  function readDroppedFile(file) {
    if (!file || !file.name.endsWith('.json')) {
      toast('Please drop a .json file', 'e');
      hideDropOverlay(); return;
    }
    loadedFileName = file.name.replace(/\.json$/i, '');
    lastExportedName = '';
    const r = new FileReader();
    r.onload = ev => {
      try {
        data = JSON.parse(ev.target.result);
        closeJsonPanel();
        render();
        toast(`✓ Loaded "${file.name}"`, 's');
      } catch { toast('Invalid JSON in file', 'e'); }
      hideDropOverlay();
    };
    r.readAsText(file);
  }

  // Window-level: show overlay whenever ANY file is dragged over the page
  window.addEventListener('dragenter', e => {
    if (!hasFiles(e)) return;
    dragCounter++;
    if (dragCounter === 1) showDropOverlay();
  });

  window.addEventListener('dragleave', e => {
    if (!hasFiles(e)) return;
    dragCounter--;
    if (dragCounter <= 0) hideDropOverlay();
  });

  window.addEventListener('dragover', e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    overlay.classList.add('over');
  });

  window.addEventListener('drop', e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragCounter = 0;
    const file = e.dataTransfer.files[0];
    readDroppedFile(file);
  });

  // Also handle direct drop on the overlay/zone (redundant but explicit)
  overlay.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    dragCounter = 0;
    const file = e.dataTransfer.files[0];
    readDroppedFile(file);
  });
  overlay.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });

  // Keyboard Escape to dismiss
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (overlay.classList.contains('visible')) hideDropOverlay();
      if (document.getElementById('exportModal').classList.contains('open')) closeExportModal();
    }
  });
})();

// ─────────────────────── EXPAND VIEW TOGGLES ───────────────────────
function toggleExpandAll(btn) {
  btn.classList.toggle('active');
  const isExpanded = btn.classList.contains('active');
  editorExpanded = isExpanded;
  if (isExpanded) {
    // Expand sidebar tree
    Object.keys(treeOpen).forEach(k => treeOpen[k] = true);
    renderTree();
    // Expand editor cards
    document.querySelectorAll('.card-body, .subject-body, .chapter-body').forEach(el => el.style.display = '');
    document.querySelectorAll('.collapse-arrow').forEach(el => el.classList.add('open'));
    (data.years||[]).forEach((y,yi) => {
      colState.years[yi] = false;
      (y.subjects||[]).forEach((s,si) => {
        colState.subjects[`${yi}-${si}`] = false;
        (s.chapters||[]).forEach((_,ci) => { colState.chapters[`${yi}-${si}-${ci}`] = false; });
      });
    });
  } else {
    // Collapse sidebar tree
    Object.keys(treeOpen).forEach(k => treeOpen[k] = false);
    renderTree();
    // Collapse editor cards
    document.querySelectorAll('.card-body, .subject-body, .chapter-body').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.collapse-arrow').forEach(el => el.classList.remove('open'));
    (data.years||[]).forEach((y,yi) => {
      colState.years[yi] = true;
      (y.subjects||[]).forEach((s,si) => {
        colState.subjects[`${yi}-${si}`] = true;
        (s.chapters||[]).forEach((_,ci) => { colState.chapters[`${yi}-${si}-${ci}`] = true; });
      });
    });
  }
}

// Auto-expand a specific item in the editor (used after add operations)
function expandEditorItem(yi, si, ci) {
  // Expand the year
  colState.years[yi] = false;
  const yBody = document.getElementById(`body-years-${yi}`);
  const yArrow = document.getElementById(`arrow-years-${yi}`);
  if (yBody) yBody.style.display = '';
  if (yArrow) yArrow.classList.add('open');

  if (si !== undefined) {
    colState.subjects[`${yi}-${si}`] = false;
    const sBody = document.getElementById(`body-subjects-${yi}-${si}`);
    const sArrow = document.getElementById(`arrow-subjects-${yi}-${si}`);
    if (sBody) sBody.style.display = '';
    if (sArrow) sArrow.classList.add('open');
  }

  if (ci !== undefined) {
    colState.chapters[`${yi}-${si}-${ci}`] = false;
    const cBody = document.getElementById(`body-chapters-${yi}-${si}-${ci}`);
    const cArrow = document.getElementById(`arrow-chapters-${yi}-${si}-${ci}`);
    if (cBody) cBody.style.display = '';
    if (cArrow) cArrow.classList.add('open');
  }
}

function toggleJsonExpand(btn) {
  btn.classList.toggle('active');
  const ta = document.getElementById('rawJson');
  const lbl = btn.querySelector('.json-expand-label');
  const isExpanded = btn.classList.contains('active');
  if (isExpanded) {
    try { ta.value = JSON.stringify(JSON.parse(ta.value), null, 2); } catch {}
    ta.style.fontSize = '12.5px';
    if (lbl) lbl.textContent = 'Compact';
  } else {
    try { ta.value = JSON.stringify(JSON.parse(ta.value)); } catch {}
    ta.style.fontSize = '11px';
    if (lbl) lbl.textContent = 'Expand';
  }
}

// ─────────────────────── RESIZABLE PANELS ───────────────────────
(function initResize() {
  // Sidebar resize (right edge)
  const sidebarHandle = document.getElementById('sidebarResizeHandle');
  const sidebar = document.getElementById('sidebar');
  const app = document.querySelector('.app');
  let sResizing = false, sStartX = 0, sStartW = 0;

  sidebarHandle.addEventListener('mousedown', e => {
    sResizing = true; sStartX = e.clientX; sStartW = sidebar.offsetWidth;
    sidebarHandle.classList.add('dragging');
    app.classList.add('resizing-h');
    e.preventDefault();
  });

  // JSON panel resize (left edge)
  const jsonHandle = document.getElementById('jsonResizeHandle');
  const jsonPanel = document.getElementById('jsonPanel');
  let jResizing = false, jStartX = 0, jStartW = 0;

  jsonHandle.addEventListener('mousedown', e => {
    if (!jsonPanel.classList.contains('open')) return;
    jResizing = true; jStartX = e.clientX; jStartW = jsonPanel.offsetWidth;
    jsonHandle.classList.add('dragging');
    app.classList.add('resizing-h');
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (sResizing) {
      const newW = Math.max(180, Math.min(600, sStartW + (e.clientX - sStartX)));
      sidebar.style.width = newW + 'px';
      sidebar.style.minWidth = newW + 'px';
      // deactivate expand toggle if manually resizing
      const tog = document.getElementById('sidebarExpandToggle');
      if (tog) tog.classList.remove('active');
    }
    if (jResizing) {
      const delta = jStartX - e.clientX; // dragging left handle: move left = bigger
      const newW = Math.max(260, Math.min(800, jStartW + delta));
      jsonPanel.style.width = newW + 'px';
      jsonPanel.style.transition = 'none';
      const tog = document.getElementById('jsonExpandToggle');
      if (tog) tog.classList.remove('active');
    }
  });

  document.addEventListener('mouseup', () => {
    if (sResizing) { sResizing = false; sidebarHandle.classList.remove('dragging'); app.classList.remove('resizing-h'); }
    if (jResizing) { jResizing = false; jsonHandle.classList.remove('dragging'); app.classList.remove('resizing-h'); jsonPanel.style.transition = ''; }
  });
})();

// ─────────────────────── DRAG CLEANUP (dragend global) ───────────────────────
document.addEventListener('dragend', () => {
  document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  cardDragSrc = null; dragSrc = null;
});

