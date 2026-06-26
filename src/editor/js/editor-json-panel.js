// ─────────────────────── JSON PANEL ───────────────────────
let jsonPanelDirty = false; // true = user is actively typing in textarea

function isJsonPanelOpen() {
  return document.getElementById('jsonPanel').classList.contains('open');
}
function openJsonPanel() {
  const panel = document.getElementById('jsonPanel');
  const ta = document.getElementById('rawJson');
  panel.classList.add('open');
  jsonPanelDirty = false;
  ta.value = JSON.stringify(data, null, 2);
}
function closeJsonPanel() {
  const panel = document.getElementById('jsonPanel');
  const ta = document.getElementById('rawJson');
  panel.classList.remove('open');
  jsonPanelDirty = false;
  if (ta) ta.blur(); // force release focus so panel never gets stuck
  // Reset expand toggle
  const tog = document.getElementById('jsonExpandToggle');
  if (tog) {
    tog.classList.remove('active');
    const lbl = tog.querySelector('.json-expand-label');
    if (lbl) lbl.textContent = 'Expand';
  }
}
function refreshJsonPanel() {
  if (!isJsonPanelOpen()) {
    // Still update mobile JSON view
    const mta = document.getElementById('mobRawJson');
    if (mta) mta.value = JSON.stringify(data, null, 2);
    return;
  }
  const ta = document.getElementById('rawJson');
  if (!ta) return;
  if (jsonPanelDirty) return; // user is actively editing, don't overwrite
  const scroll = ta.scrollTop;
  ta.value = JSON.stringify(data, null, 2);
  ta.scrollTop = scroll;
  // Also sync mobile JSON view
  const mta = document.getElementById('mobRawJson');
  if (mta) mta.value = JSON.stringify(data, null, 2);
}
function toggleJsonPanel() {
  if (isJsonPanelOpen()) closeJsonPanel(); else openJsonPanel();
}
function applyRaw() {
  try {
    data = JSON.parse(document.getElementById('rawJson').value);
    jsonPanelDirty = false;
    render();
    closeJsonPanel();
    toast('Applied','s');
  } catch { toast('Invalid JSON','e'); }
}

// Wire up dirty flag on the textarea
document.addEventListener('DOMContentLoaded', () => {
  const ta = document.getElementById('rawJson');
  if (ta) {
    ta.addEventListener('input', () => { jsonPanelDirty = true; });
    ta.addEventListener('blur',  () => {
      // When user blurs without applying, revert dirty state so live updates resume
      // but only if still valid JSON (don't discard their edits silently)
      try { JSON.parse(ta.value); jsonPanelDirty = false; refreshJsonPanel(); } catch {}
    });
  }
});

// ─── Go-to: scroll GUI + highlight JSON path ────────────────────────────────
function gotoItem(yi, si, ci, ti) {
  // 1. Scroll main editor to the element
  let guiId;
  if (ti !== undefined)      guiId = `tp-${yi}-${si}-${ci}-${ti}`;
  else if (ci !== undefined) guiId = `ch-card-${yi}-${si}-${ci}`;
  else if (si !== undefined) guiId = `sub-${yi}-${si}`;
  else                       guiId = `yr-${yi}`;

  // Expand collapsed ancestors in main editor
  if (si !== undefined && colState.subjects && colState.subjects[`${yi}-${si}`]) toggleCollapse('subjects',`${yi}-${si}`);
  if (ci !== undefined && colState.chapters && colState.chapters[`${yi}-${si}-${ci}`]) toggleCollapse('chapters',`${yi}-${si}-${ci}`);
  if (colState.years && colState.years[yi]) toggleCollapse('years', yi);

  setTimeout(() => {
    const el = document.getElementById(guiId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'box-shadow .2s';
      el.style.boxShadow = '0 0 0 2px var(--accent)';
      setTimeout(() => el.style.boxShadow = '', 1600);
    }
  }, 80);

  // 2. Open JSON panel and scroll to the matching key
  if (!isJsonPanelOpen()) openJsonPanel();
  jsonPanelDirty = false;
  const ta = document.getElementById('rawJson');
  const json = JSON.stringify(data, null, 2);
  ta.value = json;

  // Build a search string to locate the right spot in JSON
  let searchStr;
  if (ti !== undefined) {
    // Find the ti-th topic inside the right chapter - search for its title
    const topicTitle = data.years?.[yi]?.subjects?.[si]?.chapters?.[ci]?.topics?.[ti]?.title || '';
    searchStr = topicTitle ? `"title": "${topicTitle}"` : null;
  } else if (ci !== undefined) {
    const chTitle = data.years?.[yi]?.subjects?.[si]?.chapters?.[ci]?.chapter_title || '';
    searchStr = chTitle ? `"chapter_title": "${chTitle}"` : null;
  } else if (si !== undefined) {
    const subName = data.years?.[yi]?.subjects?.[si]?.subject_name?.en || '';
    searchStr = subName ? `"en": "${subName}"` : null;
  } else {
    const yearTitle = data.years?.[yi]?.year_title || '';
    searchStr = yearTitle ? `"year_title": "${yearTitle}"` : null;
  }

  if (searchStr) {
    const idx = json.indexOf(searchStr);
    if (idx !== -1) {
      // Calculate line number
      const before = json.substring(0, idx);
      const line = before.split('\n').length - 1;
      // Scroll textarea to that line
      setTimeout(() => {
        const lines = ta.value.split('\n');
        let charPos = 0;
        for (let i = 0; i < line; i++) charPos += lines[i].length + 1;
        ta.focus();
        ta.setSelectionRange(charPos, charPos + (lines[line]||'').length);
        // Scroll to selection
        const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 18;
        ta.scrollTop = Math.max(0, (line - 4) * lineHeight);
        // Highlight briefly then release focus cleanly
        setTimeout(() => { ta.blur(); jsonPanelDirty = false; }, 800);
      }, 120);
    }
  }
}

