// ─────────────────────── LOAD ───────────────────────
function startFresh() { data = {browse_label:'', years:[{year_title:'New Year',subjects:[]}]}; loadedFileName=''; lastExportedName=''; render(); refreshJsonPanel(); toast('Fresh start — Year 1 added','s'); }

function loadFromURL() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return toast('Enter a URL','e');
  fetch(url).then(r => r.json()).then(d => {
    data=d;
    // Try to extract file name from URL
    try { const parts = new URL(url).pathname.split('/'); const last = parts[parts.length-1]; if (last.endsWith('.json')) { loadedFileName = last.replace(/\.json$/i,''); lastExportedName=''; } } catch {}
    render(); toast('Loaded from URL','s');
  }).catch(() => toast('Fetch failed','e'));
}
function loadFile(e) {
  const f = e.target.files[0]; if (!f) return;
  loadedFileName = f.name.replace(/\.json$/i, '');
  lastExportedName = '';
  const r = new FileReader();
  r.onload = ev => { try { data = JSON.parse(ev.target.result); closeJsonPanel(); render(); toast('File loaded','s'); } catch { toast('Invalid JSON','e'); } };
  r.readAsText(f);
}
function saveLocal() {
  // Save back to the opened file (triggers download with original filename)
  const name = loadedFileName || lastExportedName || 'curriculum';
  const b = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(b);
  a.download = name + '.json'; a.click();
  lastExportedName = name;
  toast(`Saved as "${name}.json"`, 's');
}
function loadLocal() {
  const s = localStorage.getItem('ej-data');
  if (!s) return toast('Nothing saved','e');
  data = JSON.parse(s); render(); toast('Restored','s');
}
let lastExportedName = '';
let loadedFileName = ''; // tracks the name of the file that was loaded

function exportJSON() {
  const input = document.getElementById('exportFilename');
  if (input) input.value = lastExportedName || loadedFileName || 'curriculum';
  document.getElementById('exportModal').classList.add('open');
  setTimeout(() => input && input.select(), 80);
}
function closeExportModal() {
  document.getElementById('exportModal').classList.remove('open');
}
function doExport() {
  const input = document.getElementById('exportFilename');
  let name = (input ? input.value.trim() : '') || loadedFileName || 'curriculum';
  name = name.replace(/\.json$/i, '');
  lastExportedName = name;
  const b = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(b);
  a.download = name + '.json'; a.click();
  closeExportModal();
  toast(`Exported as "${name}.json"`, 's');
}
// Close modal on backdrop click
document.getElementById('exportModal').addEventListener('click', function(e) {
  if (e.target === this) closeExportModal();
});
// Close on Escape (merged with existing keydown listener in initFileDrop)
function copyJSON() { navigator.clipboard.writeText(JSON.stringify(data,null,2)); toast('Copied','s'); }

