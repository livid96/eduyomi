// ─────────────────────── MUTATIONS ───────────────────────
function setSubImg(yi,si,val) {
  data.years[yi].subjects[si].img = val;
  const prev = document.getElementById(`imgprev-${yi}-${si}`);
  if (prev) prev.innerHTML = val ? `<img src="${esc(val)}" onerror="this.parentElement.innerHTML='<span class=img-preview-empty>🖼</span>'">` : '<span class="img-preview-empty">🖼</span>';
  refreshJsonPanel();
}
function setSub(yi,si,lang,val) {
  if (!data.years[yi].subjects[si].subject_name) data.years[yi].subjects[si].subject_name={};
  data.years[yi].subjects[si].subject_name[lang] = val;
  refreshJsonPanel();
}
function setTopicField(yi,si,ci,ti,field,val) {
  data.years[yi].subjects[si].chapters[ci].topics[ti][field] = val;
  refreshJsonPanel();
}

function addYear() {
  if (!data.years) data.years=[];
  data.years.push({year_title:'New Year',subjects:[]});
  const yi = data.years.length - 1;
  colState.years[yi] = !editorExpanded; // respect current expand state
  render(); refreshJsonPanel();
  setTimeout(() => { const el = document.getElementById(`yr-${yi}`); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }, 80);
}
function removeYear(yi) {
  data.years.splice(yi,1);
  colState.years = {}; colState.subjects = {}; colState.chapters = {};
  render(); refreshJsonPanel();
  toast('Year removed','s');
}
function moveYear(yi,dir) {
  const ni=yi+dir; if(ni<0||ni>=data.years.length) return;
  moveInArray(data.years,yi,ni); render(); refreshJsonPanel();
}
function addSubject(yi) {
  data.years[yi].subjects=data.years[yi].subjects||[];
  data.years[yi].subjects.push({subject_name:{en:'New Subject',bn:''},img:'',chapters:[]});
  const si = data.years[yi].subjects.length - 1;
  colState.years[yi] = false;
  colState.subjects[`${yi}-${si}`] = false;
  treeOpen[`y${yi}`] = true;
  render(); refreshJsonPanel();
  setTimeout(() => { const el = document.getElementById(`sub-${yi}-${si}`); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }, 80);
}
function removeSub(yi,si) {
  data.years[yi].subjects.splice(si,1);
  colState.subjects = {}; colState.chapters = {};
  render(); refreshJsonPanel();
}
function moveSub(yi,si,dir) {
  const arr=data.years[yi].subjects; const ni=si+dir;
  if(ni<0||ni>=arr.length) return; moveInArray(arr,si,ni); render(); refreshJsonPanel();
}
function addChapter(yi,si) {
  data.years[yi].subjects[si].chapters=data.years[yi].subjects[si].chapters||[];
  data.years[yi].subjects[si].chapters.push({chapter_title:'New Chapter',topics:[]});
  const ci = data.years[yi].subjects[si].chapters.length - 1;
  colState.years[yi] = false;
  colState.subjects[`${yi}-${si}`] = false;
  colState.chapters[`${yi}-${si}-${ci}`] = false;
  treeOpen[`y${yi}`] = true;
  treeOpen[`y${yi}s${si}`] = true;
  render(); refreshJsonPanel();
  setTimeout(() => { const el = document.getElementById(`ch-card-${yi}-${si}-${ci}`); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }, 80);
}
function removeCh(yi,si,ci) {
  data.years[yi].subjects[si].chapters.splice(ci,1);
  colState.chapters = {};
  render(); refreshJsonPanel();
}
function moveCh(yi,si,ci,dir) {
  const arr=data.years[yi].subjects[si].chapters; const ni=ci+dir;
  if(ni<0||ni>=arr.length) return; moveInArray(arr,ci,ni); render(); refreshJsonPanel();
}
function addTopic(yi,si,ci) {
  data.years[yi].subjects[si].chapters[ci].topics=data.years[yi].subjects[si].chapters[ci].topics||[];
  data.years[yi].subjects[si].chapters[ci].topics.push({title:'',url:''});
  colState.years[yi] = false;
  colState.subjects[`${yi}-${si}`] = false;
  colState.chapters[`${yi}-${si}-${ci}`] = false;
  treeOpen[`y${yi}`] = true;
  treeOpen[`y${yi}s${si}`] = true;
  treeOpen[`y${yi}s${si}c${ci}`] = true;
  render(); refreshJsonPanel();
  setTimeout(() => { const el = document.getElementById(`tp-${yi}-${si}-${ci}-${(data.years[yi].subjects[si].chapters[ci].topics.length-1)}`); if(el) el.scrollIntoView({behavior:'smooth',block:'nearest'}); }, 80);
}
function removeTopic(yi,si,ci,ti) {
  data.years[yi].subjects[si].chapters[ci].topics.splice(ti,1); render(); refreshJsonPanel();
}

function scrollToId(id) {
  // Expand any collapsed ancestors in the editor before scrolling
  const el = document.getElementById(id);
  if (!el) return;
  // Parse the id to expand ancestors
  const parts = id.split('-');
  if (id.startsWith('tp-') && parts.length >= 5) {
    const yi = +parts[1], si = +parts[2], ci = +parts[3];
    if (colState.years[yi]) toggleCollapse('years', yi);
    if (colState.subjects[`${yi}-${si}`]) toggleCollapse('subjects', `${yi}-${si}`);
    if (colState.chapters[`${yi}-${si}-${ci}`]) toggleCollapse('chapters', `${yi}-${si}-${ci}`);
  } else if (id.startsWith('ch-card-') && parts.length >= 5) {
    const yi = +parts[2], si = +parts[3], ci = +parts[4];
    if (colState.years[yi]) toggleCollapse('years', yi);
    if (colState.subjects[`${yi}-${si}`]) toggleCollapse('subjects', `${yi}-${si}`);
  } else if (id.startsWith('sub-') && parts.length >= 4) {
    const yi = +parts[1], si = +parts[2];
    if (colState.years[yi]) toggleCollapse('years', yi);
  }
  setTimeout(() => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.style.transition = 'box-shadow .2s';
      target.style.boxShadow = '0 0 0 2px var(--accent)';
      setTimeout(() => { target.style.boxShadow = ''; }, 1600);
    }
  }, 60);
}

// ─────────────────────── SEARCH ───────────────────────
function buildSearchIndex() {
  const results = [];
  const years = data.years || [];
  years.forEach((year,yi) => {
    results.push({type:'year',icon:'📅',title:year.year_title||'Year',sub:'',id:`yr-${yi}`});
    (year.subjects||[]).forEach((sub,si) => {
      results.push({type:'subject',icon:'📖',title:sub.subject_name?.en||'Subject',sub:year.year_title||'',id:`sub-${yi}-${si}`});
      (sub.chapters||[]).forEach((ch,ci) => {
        results.push({type:'chapter',icon:'📑',title:ch.chapter_title||'Chapter',sub:`${year.year_title} → ${sub.subject_name?.en||''}`,id:`ch-card-${yi}-${si}-${ci}`});
        (ch.topics||[]).forEach((t,ti) => {
          results.push({type:'topic',icon:t.url?'▶':'•',title:t.title||'Topic',sub:`${sub.subject_name?.en||''} → ${ch.chapter_title||''}`,url:t.url||'',id:`tp-${yi}-${si}-${ci}-${ti}`});
        });
      });
    });
  });
  return results;
}

function onHeaderSearch() {
  const q = document.getElementById('headerSearch').value.toLowerCase().trim();
  const drop = document.getElementById('headerSearchDrop');
  if (!q) { drop.innerHTML = ''; drop.classList.remove('open'); return; }
  const idx = buildSearchIndex();
  const hits = idx.filter(r => r.title.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q) || (r.url||'').toLowerCase().includes(q)).slice(0, 12);
  if (!hits.length) { drop.innerHTML = `<div class="search-empty">No results</div>`; drop.classList.add('open'); return; }
  drop.innerHTML = hits.map(r => `<div class="search-result-item" onmousedown="event.preventDefault();scrollToId('${r.id}');if(isMobile())mobShowTab('edit');closeHeaderSearch()">
    <div class="search-result-icon">${r.icon}</div>
    <div class="search-result-body">
      <div class="search-result-title">${esc(r.title)}</div>
      <div class="search-result-sub">${esc(r.sub)}${r.url ? ` · <span style="font-family:var(--font-mono);color:var(--accent)">${esc(r.url)}</span>` : ''}</div>
    </div>
  </div>`).join('');
  drop.classList.add('open');
}
function openHeaderSearch() { if (document.getElementById('headerSearch').value.trim()) document.getElementById('headerSearchDrop').classList.add('open'); }
function closeHeaderSearch() { document.getElementById('headerSearchDrop').classList.remove('open'); document.getElementById('headerSearch').value = ''; }
function closeHeaderSearchDelay() { setTimeout(closeHeaderSearch, 200); }

// ─────────────────────── UTILS ───────────────────────
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function toast(msg, type='s') {
  const c=document.getElementById('toastStack');
  const t=document.createElement('div'); t.className=`toast ${type}`; t.textContent=msg;
  c.appendChild(t); setTimeout(()=>t.remove(),2800);
}

