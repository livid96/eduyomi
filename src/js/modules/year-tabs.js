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
  // Update URL
  if (window._appReady && window.routerPushSubject) {
    var d = window.MASTER_DATA;
    var yearTitle = d && d[n] ? (d[n].year_title || ('Year ' + (n + 1))) : null;
    if (yearTitle) { routerPushSubject(yearTitle, ''); if (window.routerSetTitle) routerSetTitle([yearTitle]); }
  }
}

