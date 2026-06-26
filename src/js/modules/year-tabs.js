/* ════════════════════════════════════════
   YEAR TABS
════════════════════════════════════════ */
let searchActive = false;

function showYear(n, btn) {
  currentYear = n;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelectorAll('.tab-btn')[n]?.classList.add('active');
  document.querySelectorAll('.year-content').forEach(c => c.classList.add('hidden'));
  document.getElementById('year' + n)?.classList.remove('hidden');
}

