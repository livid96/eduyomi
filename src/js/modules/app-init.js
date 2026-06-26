/* ════════════════════════════════════════
   APP INIT
   Runs after ALL modules are loaded.
   Equivalent to the bare calls at the end
   of the original monolithic app.js.
════════════════════════════════════════ */
loadMasterData();
applySettingsUI();
// Re-run after DOM is fully painted so modal elements exist
setTimeout(applySettingsUI, 0);
