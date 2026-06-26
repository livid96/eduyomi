// ─────────────────────── REALTIME SET ───────────────────────
// Immediate update without full re-render
function setYearTitle(yi, val) {
  data.years[yi].year_title = val;
  // Update main editor title input
  const el = document.getElementById(`yt-${yi}`);
  if (el && el !== document.activeElement) el.value = val;
  // Update tree (already editing there)
  const badge = document.querySelector(`#yr-${yi} .card-meta`);
  // Sync badge in header
  const hTitle = document.getElementById(`yh-${yi}`);
  if (hTitle && hTitle !== document.activeElement) hTitle.textContent = val;
  refreshJsonPanel();
}
function setSubName(yi, si, val) {
  if (!data.years[yi].subjects[si].subject_name) data.years[yi].subjects[si].subject_name = {};
  data.years[yi].subjects[si].subject_name.en = val;
  // Sync main editor
  const el = document.getElementById(`sn-en-${yi}-${si}`);
  if (el && el !== document.activeElement) el.value = val;
  const hEl = document.getElementById(`sh-${yi}-${si}`);
  if (hEl && hEl !== document.activeElement) hEl.textContent = val;
  refreshJsonPanel();
}
function setChTitle(yi, si, ci, val) {
  data.years[yi].subjects[si].chapters[ci].chapter_title = val;
  const el = document.getElementById(`ct-${yi}-${si}-${ci}`);
  if (el && el !== document.activeElement) el.value = val;
  const hEl = document.getElementById(`ch-${yi}-${si}-${ci}`);
  if (hEl && hEl !== document.activeElement) hEl.textContent = val;
  refreshJsonPanel();
}
function setTopicTitle(yi, si, ci, ti, val) {
  data.years[yi].subjects[si].chapters[ci].topics[ti].title = val;
  // Sync the topic input in main editor
  const el = document.querySelector(`#tp-${yi}-${si}-${ci}-${ti} input:first-child`);
  if (el && el !== document.activeElement) el.value = val;
  refreshJsonPanel();
}

// ─────────────────────── MAIN RENDER ───────────────────────
function render() { renderTree(); renderMain(); }

function renderMain() {
  const editor = document.getElementById('mainEditor');
  const years = data.years || [];
  if (!years.length && !data.browse_label) {
    editor.innerHTML = `<div class="empty-state">
      <h2>No Curriculum Loaded</h2>
      <p>Load a JSON file, paste a URL, or start fresh.</p>
      <div class="btns">
        <button class="btn btn-accent" onclick="startFresh()">＋ Start Fresh</button>
      </div></div>`;
    return;
  }

  const sortedYi = getSortedYears();
  syncColState();
  let html = '';

  // Browse label bar
  html += `<div class="browse-bar">
    <span class="browse-bar-label">Browse Label</span>
    <input value="${esc(data.browse_label||'')}" oninput="data.browse_label=this.value;refreshJsonPanel()" placeholder="e.g. Browse by Year">
    <span class="pill pill-a">${years.length} years</span>
  </div>`;

  sortedYi.forEach(yi => {
    const year = years[yi];
    const yOpen = !colState.years[yi];
    html += buildYearCard(year, yi, yOpen);
  });

  html += `<div class="add-year-btn"><button class="btn btn-accent" onclick="addYear()">＋ Add Year</button></div>`;
  editor.innerHTML = html;
  // Re-apply collapse state from colState (HTML always renders expanded)
  (data.years||[]).forEach((y, yi) => {
    if (colState.years[yi]) {
      const body = document.getElementById(`body-years-${yi}`);
      const arrow = document.getElementById(`arrow-years-${yi}`);
      if (body) body.style.display = 'none';
      if (arrow) arrow.classList.remove('open');
    }
    (y.subjects||[]).forEach((s, si) => {
      if (colState.subjects[`${yi}-${si}`]) {
        const body = document.getElementById(`body-subjects-${yi}-${si}`);
        const arrow = document.getElementById(`arrow-subjects-${yi}-${si}`);
        if (body) body.style.display = 'none';
        if (arrow) arrow.classList.remove('open');
      }
      (s.chapters||[]).forEach((_, ci) => {
        if (colState.chapters[`${yi}-${si}-${ci}`]) {
          const body = document.getElementById(`body-chapters-${yi}-${si}-${ci}`);
          const arrow = document.getElementById(`arrow-chapters-${yi}-${si}-${ci}`);
          if (body) body.style.display = 'none';
          if (arrow) arrow.classList.remove('open');
        }
      });
    });
  });
}

// ─────────────────────── COLLAPSE STATE ───────────────────────
const colState = { years: {}, subjects: {}, chapters: {} };

// Rebuild colState to match current data shape, defaulting unknown items
// to collapsed (true) when editorExpanded is off, expanded (false) when on.
function syncColState() {
  const defaultVal = !editorExpanded; // true=collapsed, false=expanded
  const newYears = {}, newSubjects = {}, newChapters = {};
  (data.years||[]).forEach((y, yi) => {
    newYears[yi] = (colState.years[yi] !== undefined) ? colState.years[yi] : defaultVal;
    (y.subjects||[]).forEach((s, si) => {
      const sk = `${yi}-${si}`;
      newSubjects[sk] = (colState.subjects[sk] !== undefined) ? colState.subjects[sk] : defaultVal;
      (s.chapters||[]).forEach((_, ci) => {
        const ck = `${yi}-${si}-${ci}`;
        newChapters[ck] = (colState.chapters[ck] !== undefined) ? colState.chapters[ck] : defaultVal;
      });
    });
  });
  colState.years = newYears;
  colState.subjects = newSubjects;
  colState.chapters = newChapters;
}

function toggleCollapse(type, key) {
  colState[type][key] = !colState[type][key];
  const body = document.getElementById(`body-${type}-${key}`);
  const arrow = document.getElementById(`arrow-${type}-${key}`);
  if (body) body.style.display = colState[type][key] ? 'none' : '';
  if (arrow) arrow.classList.toggle('open', !colState[type][key]);
}

// ─────────────────────── BUILD YEAR CARD ───────────────────────
function buildYearCard(year, yi, yOpen) {
  const subCount = (year.subjects||[]).length;
  let subsHtml = (year.subjects||[]).map((sub,si) => buildSubjectCard(sub,yi,si)).join('');
  return `<div class="year-card" id="yr-${yi}"
    draggable="true" ondragstart="cardDrag(event,'year',${yi})" ondragover="cardDragOver(event,this)" ondrop="cardDrop(event,'year',${yi})" ondragleave="this.classList.remove('drag-over')">
    <div class="card-header">
      <div class="card-header-click" onclick="toggleCollapse('years',${yi})">
        <span class="drag-grip" ondragstart="event.stopPropagation()" title="Drag to reorder">⠿</span>
        <span class="collapse-arrow open" id="arrow-years-${yi}">▶</span>
        <span class="year-badge">Y${yi+1}</span>
        <input type="search" class="card-title-input" id="yt-${yi}" value="${esc(year.year_title||'')}"
          onclick="event.stopPropagation()"
          oninput="data.years[${yi}].year_title=this.value;syncTreeInput('y${yi}',this.value);refreshJsonPanel()"
          placeholder="Year title"
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        <span class="card-meta">${subCount} subject${subCount!==1?'s':''}</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-xs" onclick="event.stopPropagation();moveYear(${yi},-1)" title="Move up">↑</button>
        <button class="btn btn-xs" onclick="event.stopPropagation();moveYear(${yi},1)" title="Move down">↓</button>
        <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();removeYear(${yi})">✕</button>
      </div>
    </div>
    <div class="card-body" id="body-years-${yi}">
      <div class="section-row">
        <span class="section-label">Subjects</span>
        <button class="btn btn-sm" onclick="addSubject(${yi})">＋ Subject</button>
      </div>
      ${subsHtml || `<div style="color:var(--text-muted);font-size:13px;padding:6px 0;">No subjects yet.</div>`}
    </div>
  </div>`;
}

function buildSubjectCard(sub, yi, si) {
  const sOpen = !colState.subjects[`${yi}-${si}`];
  const name = sub.subject_name?.en || 'Subject';
  const chs = (sub.chapters||[]);
  let chHtml = chs.map((ch,ci) => buildChapterCard(ch,yi,si,ci)).join('');
  return `<div class="subject-card" id="sub-${yi}-${si}"
    draggable="true" ondragstart="cardDrag(event,'subject',${yi},${si});event.stopPropagation()" ondragover="cardDragOver(event,this);event.stopPropagation()" ondrop="cardDrop(event,'subject',${yi},${si});event.stopPropagation()" ondragleave="this.classList.remove('drag-over')">
    <div class="subject-header">
      <div class="subject-header-click" onclick="toggleCollapse('subjects','${yi}-${si}')">
        <span class="drag-grip" title="Drag">⠿</span>
        <span class="collapse-arrow open" id="arrow-subjects-${yi}-${si}">▶</span>
        <span class="subj-dot"></span>
        <span class="subj-title" id="sh-${yi}-${si}">${esc(name)}</span>
        <span class="pill pill-g" style="margin-left:6px;">${chs.length}ch</span>
      </div>
      <div style="display:flex;gap:4px;" onclick="event.stopPropagation()">
        <button class="btn btn-xs" onclick="moveSub(${yi},${si},-1)">↑</button>
        <button class="btn btn-xs" onclick="moveSub(${yi},${si},1)">↓</button>
        <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();removeSub(${yi},${si})">✕</button>
      </div>
    </div>
    <div class="subject-body" id="body-subjects-${yi}-${si}">
      <div class="bilingual-row">
        <div class="field-group">
          <label class="field-label">Name (EN)</label>
          <input type="search" class="field-input" id="sn-en-${yi}-${si}" value="${esc(sub.subject_name?.en||'')}"
            oninput="setSub(${yi},${si},'en',this.value);syncTreeInput('y${yi}s${si}',this.value);document.getElementById('sh-${yi}-${si}').textContent=this.value;refreshJsonPanel()"
            placeholder="English"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>
        <div class="field-group">
          <label class="field-label">Name (BN)</label>
          <input type="search" class="field-input" value="${esc(sub.subject_name?.bn||'')}"
            oninput="setSub(${yi},${si},'bn',this.value)" placeholder="বাংলা"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>
      </div>
      <div class="img-field-row">
        <div class="img-preview" id="imgprev-${yi}-${si}">
          ${sub.img ? `<img src="${esc(sub.img)}" onerror="this.parentElement.innerHTML='<span class=img-preview-empty>🖼</span>'">` : '<span class="img-preview-empty">🖼</span>'}
        </div>
        <div class="field-group" style="flex:1">
          <label class="field-label">Image URL</label>
          <input type="search" class="field-input url-input" value="${esc(sub.img||'')}"
            oninput="setSubImg(${yi},${si},this.value)" placeholder="https://…"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>
      </div>
      <hr class="div">
      <div class="section-row">
        <span class="section-label">Chapters</span>
        <button class="btn btn-sm" onclick="addChapter(${yi},${si})">＋ Chapter</button>
      </div>
      ${chHtml || `<div style="color:var(--text-muted);font-size:12px;padding:4px 0;">No chapters yet.</div>`}
    </div>
  </div>`;
}

function buildChapterCard(ch, yi, si, ci) {
  const cOpen = !colState.chapters[`${yi}-${si}-${ci}`];
  const topics = ch.topics||[];
  let topHtml = topics.map((t,ti) => buildTopicRow(t,yi,si,ci,ti)).join('');
  return `<div class="chapter-card" id="ch-card-${yi}-${si}-${ci}"
    draggable="true" ondragstart="cardDrag(event,'chapter',${yi},${si},${ci});event.stopPropagation()" ondragover="cardDragOver(event,this);event.stopPropagation()" ondrop="cardDrop(event,'chapter',${yi},${si},${ci});event.stopPropagation()" ondragleave="this.classList.remove('drag-over')">
    <div class="chapter-header">
      <div class="chapter-header-click" onclick="toggleCollapse('chapters','${yi}-${si}-${ci}')">
        <span class="drag-grip" title="Drag">⠿</span>
        <span class="collapse-arrow open" id="arrow-chapters-${yi}-${si}-${ci}">▶</span>
        <span class="ch-dot"></span>
        <span class="ch-title" id="ch-${yi}-${si}-${ci}">${esc(ch.chapter_title||'')}</span>
        <span style="color:var(--text-muted);font-size:11px;margin-left:6px;">${topics.length}t</span>
      </div>
      <div style="display:flex;gap:4px;" onclick="event.stopPropagation()">
        <button class="btn btn-xs" onclick="moveCh(${yi},${si},${ci},-1)">↑</button>
        <button class="btn btn-xs" onclick="moveCh(${yi},${si},${ci},1)">↓</button>
        <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();removeCh(${yi},${si},${ci})">✕</button>
      </div>
    </div>
    <div class="chapter-body" id="body-chapters-${yi}-${si}-${ci}">
      <div class="field-group" style="margin-bottom:10px;">
        <label class="field-label">Chapter Title</label>
        <input type="search" class="field-input" id="ct-${yi}-${si}-${ci}" value="${esc(ch.chapter_title||'')}"
          oninput="data.years[${yi}].subjects[${si}].chapters[${ci}].chapter_title=this.value;syncTreeInput('y${yi}s${si}c${ci}',this.value);document.getElementById('ch-${yi}-${si}-${ci}').textContent=this.value;refreshJsonPanel()"
          placeholder="Chapter title"
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
      </div>
      <div class="topics-header"><span>Title</span><span>URL</span><span></span></div>
      <div id="topics-${yi}-${si}-${ci}" class="topics-dropzone"
        ondragover="topicsZoneDragOver(event,this,${yi},${si},${ci})"
        ondragleave="topicsZoneDragLeave(this)"
        ondrop="topicsZoneDrop(event,${yi},${si},${ci})">${topHtml}</div>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button class="btn btn-sm" onclick="addTopic(${yi},${si},${ci})">＋ Topic</button>
        <button class="btn btn-sm" style="color:var(--red);border-color:color-mix(in srgb,var(--red) 25%,transparent)" onclick="openPlaylistModal(${yi},${si},${ci})" title="Add all videos from a YouTube playlist">▶ + Playlist</button>
      </div>
    </div>
  </div>`;
}

function buildTopicRow(t, yi, si, ci, ti) {
  return `<div class="topic-row" id="tp-${yi}-${si}-${ci}-${ti}"
    draggable="true" ondragstart="cardDrag(event,'topic',${yi},${si},${ci},${ti});event.stopPropagation()" ondragover="cardDragOver(event,this);event.stopPropagation()" ondrop="cardDrop(event,'topic',${yi},${si},${ci},${ti});event.stopPropagation()" ondragleave="this.classList.remove('drag-over')">
    <input type="search" value="${esc(t.title||'')}" placeholder="Topic title"
      oninput="setTopicField(${yi},${si},${ci},${ti},'title',this.value);syncTopicTree(${yi},${si},${ci},${ti},this.value)"
      autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
    <input type="search" class="topic-url-input" value="${esc(t.url||'')}" placeholder="Video ID or YouTube URL…"
      oninput="handleUrlInput(this,${yi},${si},${ci},${ti})"
      autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
    <div style="display:flex;gap:3px;justify-content:flex-end;">
      <span class="topic-drag" title="Drag">⠿</span>
      <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();removeTopic(${yi},${si},${ci},${ti})">✕</button>
    </div>
  </div>`;
}

function extractYoutubeId(val) {
  val = val.trim();
  // Already a plain ID (11 chars, no slashes/dots)
  if (/^[a-zA-Z0-9_-]{11}$/.test(val)) return val;
  try {
    const url = new URL(val);
    // youtube.com/watch?v=ID or with extra params
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    // youtu.be/ID
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0];
    // youtube.com/embed/ID or /shorts/ID
    const m = url.pathname.match(/(?:embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  } catch {}
  // Fallback: grab v= param from raw string
  const m = val.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  return val; // return as-is if nothing matched
}

function handleUrlInput(el, yi, si, ci, ti) {
  const raw = el.value;
  const id = extractYoutubeId(raw);
  if (id !== raw) {
    el.value = id;
  }
  setTopicField(yi, si, ci, ti, 'url', el.value);
}

