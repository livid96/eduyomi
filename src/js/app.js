/**
 * app.js — Main entry point
 * This file imports all feature modules in dependency order.
 * Edit individual files in src/js/modules/ for development.
 * 
 * Load order matters — each module may reference globals set by earlier ones.
 */

// ── 1. UI Theming ─────────────────────────────────────────────────────────
// @import modules/accent.js
// @import modules/theme.js
// @import modules/guides.js

// ── 2. Navigation Components ──────────────────────────────────────────────
// @import modules/drawer.js
// @import modules/nav-scroll.js
// @import modules/keyboard.js

// ── 3. Authentication / Crypto / Source Editor ────────────────────────────
// @import modules/crypto-source-editor.js

// ── 4. Overlays & Popups ──────────────────────────────────────────────────
// @import modules/search-popup.js
// @import modules/popup.js
// @import modules/list-popup.js

// ── 5. Core Data & Helpers ────────────────────────────────────────────────
// @import modules/helpers-and-data.js

// ── 6. Content Views ──────────────────────────────────────────────────────
// @import modules/year-tabs.js
// @import modules/subject-view.js
// @import modules/filter.js
// @import modules/search-grid.js
// @import modules/search-index.js

// ── 7. Video ──────────────────────────────────────────────────────────────
// @import modules/video-player.js
// @import modules/adblocker.js
// @import modules/bookmarks.js

// ── 8. Persistence ────────────────────────────────────────────────────────
// @import modules/backup.js
// @import modules/repo-modal.js
// @import modules/settings-modal.js

// ── 9. Router ─────────────────────────────────────────────────────────────
// @import modules/router-patch.js
