/* ════════════════════════════════════════
   GUIDES
════════════════════════════════════════ */
function toggleGuides(e) {
  e.stopPropagation();
  const dd = document.getElementById('guidesDropdown');
  const btn = document.getElementById('guidesBtn');
  dd.classList.toggle('open');
  btn.classList.toggle('open', dd.classList.contains('open'));
}

