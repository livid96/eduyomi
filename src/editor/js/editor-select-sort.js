// ─────────────────────── CUSTOM SELECT ───────────────────────
let sortSelectValue = 'natural';

function toggleCustomSelect() {
  const btn = document.getElementById('sortSelectBtn');
  const drop = document.getElementById('sortSelectDrop');
  const isOpen = drop.classList.contains('open');
  if (isOpen) { closeCustomSelect(); } else { btn.classList.add('open'); drop.classList.add('open'); }
}
function closeCustomSelect() {
  document.getElementById('sortSelectBtn').classList.remove('open');
  document.getElementById('sortSelectDrop').classList.remove('open');
}
function pickSortOption(el) {
  const val = el.dataset.value;
  const label = el.textContent.trim();
  sortSelectValue = val;
  document.getElementById('sortSelectLabel').textContent = label;
  document.querySelectorAll('#sortSelectDrop .custom-select-option').forEach(o => o.classList.toggle('selected', o === el));
  closeCustomSelect();
  applySortAndRender();
}
// Close on outside click
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('sortSelectWrap');
  if (wrap && !wrap.contains(e.target)) closeCustomSelect();
});

// ─────────────────────── SORT ───────────────────────
function getSortedYears() {
  const years = (data.years || []);
  const sort = sortSelectValue;
  const idx = years.map((y,i)=>i);
  if (sort === 'asc') return [...idx].sort((a,b)=>(years[a].year_title||'').localeCompare(years[b].year_title||''));
  if (sort === 'desc') return [...idx].sort((a,b)=>(years[b].year_title||'').localeCompare(years[a].year_title||''));
  return idx;
}
function applySortAndRender() { renderTree(); renderMain(); }

