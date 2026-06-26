/* ════════════════════════════════════════
   SEARCH (main grid filter)
════════════════════════════════════════ */
function scoreItem(item, q) {
  const kw = (item.keywords||'').toLowerCase();
  const t  = (item.title||'').toLowerCase();
  const tg = (item.tag||'').toLowerCase();
  if (t===q) return 100;
  if (t.startsWith(q)) return 80;
  if (kw.includes(q)||t.includes(q)) return 60;
  if (tg.includes(q)) return 40;
  const words = q.split(/\s+/);
  const matched = words.filter(w => kw.includes(w)||t.includes(w));
  if (matched.length) return Math.round(30*matched.length/words.length);
  return 0;
}

function handleSearch(query) {
  const q = query.trim().toLowerCase();
  const banner    = document.getElementById('searchBanner');
  const noResults = document.getElementById('noResults');
  const tabsSect  = document.getElementById('tabsSection');
  const allCards  = document.querySelectorAll('.subject-card');

  if (!q) {
    searchActive = false;
    banner.classList.remove('visible');
    noResults.classList.remove('visible');
    tabsSect.style.display = '';
    document.querySelectorAll('.year-content').forEach(yc => yc.classList.add('hidden'));
    document.getElementById('year'+currentYear)?.classList.remove('hidden');
    allCards.forEach(c => c.classList.remove('search-hidden'));
    return;
  }

  searchActive = true;
  tabsSect.style.display = 'none';
  document.querySelectorAll('.year-content').forEach(yc => yc.classList.remove('hidden'));

  let count = 0;
  allCards.forEach(card => {
    const score = scoreItem({ title: card.querySelector('h3')?.textContent||'', keywords: card.getAttribute('data-name')||'' }, q);
    card.classList.toggle('search-hidden', score===0);
    if (score>0) count++;
  });

  document.querySelectorAll('.year-content').forEach(yc => {
    const visible = Array.from(yc.querySelectorAll('.subject-card')).some(c => !c.classList.contains('search-hidden'));
    yc.classList.toggle('hidden', !visible);
  });

  document.getElementById('searchTerm').textContent  = query;
  document.getElementById('resultCount').textContent = count;
  banner.classList.add('visible');
  noResults.classList.toggle('visible', count===0);
}

function clearSearch() {
  handleSearch('');
}

