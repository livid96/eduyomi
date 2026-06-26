/* ════════════════════════════════════════
   KEYBOARD SHORTCUTS
════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSearchPopup(); closePopup(); closeMobileDrawer(); closeSettingsModal(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearchPopup(); }
});

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
