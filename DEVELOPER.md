# EduYomi — Developer Edition (Sliced)

This is the **developer-friendly, sliced version** of EduYomi.
The original monolithic `app.js` (2798 lines) and `main.css` (1529 lines) have been split into small, focused files.

---

## 📁 Project Structure

```
eduyomi/
├── index.html                        ← Main page (loads all modules)
├── editor.html                       ← Source editor page
├── contributors.html / license.html / 404.html
│
├── src/
│   ├── js/
│   │   ├── app.js                    ← Load-order reference (not executed)
│   │   ├── router.js                 ← Client-side router
│   │   ├── pwa.js                    ← Service worker registration
│   │   ├── pwa-manifest.js           ← PWA manifest generator
│   │   ├── theme-init.js             ← Early theme apply (before paint)
│   │   └── modules/                  ← ✅ Edit here for development
│   │       ├── accent.js             ← Accent color picker & sync
│   │       ├── theme.js              ← Dark / Light / AMOLED theme
│   │       ├── guides.js             ← Reading guides toggle
│   │       ├── drawer.js             ← Mobile side drawer
│   │       ├── nav-scroll.js         ← Navbar hide-on-scroll
│   │       ├── keyboard.js           ← Keyboard shortcuts
│   │       ├── crypto-source-editor.js ← AES encryption + GitHub source editor
│   │       ├── search-popup.js       ← Global search overlay
│   │       ├── popup.js              ← iframe popup overlay
│   │       ├── list-popup.js         ← History / Watched / Bookmarks modal
│   │       ├── helpers-and-data.js   ← Utilities, repo parsing, settings, build
│   │       ├── year-tabs.js          ← Year/Class tab switcher
│   │       ├── subject-view.js       ← Subject detail view
│   │       ├── filter.js             ← Filter panel (bottom sheet)
│   │       ├── search-grid.js        ← Live grid search/filter
│   │       ├── search-index.js       ← Full-text search index builder
│   │       ├── video-player.js       ← YouTube inline player
│   │       ├── adblocker.js          ← Ad blocker (network intercept + IMA)
│   │       ├── bookmarks.js          ← Watch / bookmark toggles
│   │       ├── backup.js             ← Backup & restore
│   │       ├── repo-modal.js         ← Multi-repo manager modal
│   │       ├── settings-modal.js     ← Settings modal
│   │       └── router-patch.js       ← URL sync patch for navigation
│   │
│   ├── css/
│   │   ├── main.css                  ← Load-order reference (not executed)
│   │   └── modules/                  ← ✅ Edit here for development
│   │       ├── 01-tokens.css         ← CSS variables, theme colors
│   │       ├── 02-ambient.css        ← Global body/html styles
│   │       ├── 03-navbar.css         ← Nav bar, search popup, theme panel, drawer
│   │       ├── 04-page-layout.css    ← Main content area layout
│   │       ├── 05-video-player.css   ← Video player card + controls
│   │       ├── 06-drawer-lists.css   ← Drawer history/watch lists
│   │       ├── 07-search-banner-and-year-tabs.css
│   │       ├── 08-subject-view-and-filter.css
│   │       ├── 09-subject-detail-and-loaders.css
│   │       ├── 10-popups.css         ← All popup/overlay modals
│   │       ├── 11-animations.css     ← Keyframe animations
│   │       └── 12-repo-modal.css     ← Repository modal
│   │
│   └── pages/                        ← HTML page fragments (used by popup iframe)
│       ├── editor.html
│       ├── modals.html
│       ├── contributors.html
│       └── license.html
│
├── public/
│   └── favicon.svg
│
├── .vscode/
│   ├── tasks.json                    ← Dev server + bundle tasks
│   ├── launch.json                   ← Browser debug config
│   └── extensions.json               ← Recommended extensions
│
└── eduyomi.code-workspace            ← Open this in VS Code
```

---

## 🚀 How to Run in VS Code

### Option 1 — Live Server (Recommended, zero setup)

1. Open VS Code → **Install** the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` in the Explorer → **"Open with Live Server"**
3. Browser opens at `http://127.0.0.1:5500` — edits auto-reload

### Option 2 — Built-in Task (Python, no install)

1. Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac)
2. Select **"🚀 Start Dev Server (Python)"**
3. Open `http://localhost:5500` in your browser

### Option 3 — Terminal

```bash
# Python (built into macOS/Linux/Windows with Python installed)
python3 -m http.server 5500

# OR Node.js
npx http-server . -p 5500 -c-1 -o
```

> ⚠️ **Do not open `index.html` directly as a file** (`file://`).
> The app fetches JSON data from GitHub — that requires HTTP, not file:// protocol.

---

## 🔧 Development Workflow

1. Open `eduyomi.code-workspace` in VS Code (double-click or `code eduyomi.code-workspace`)
2. Start Live Server (Option 1 above)
3. Edit any file in `src/js/modules/` or `src/css/modules/`
4. Browser reloads automatically

### Which file to edit?

| Task | File |
|------|------|
| Change accent colors | `src/js/modules/accent.js` |
| Fix theme switching | `src/js/modules/theme.js` |
| Edit video player | `src/js/modules/video-player.js` |
| Fix ad blocker | `src/js/modules/adblocker.js` |
| Fix search | `src/js/modules/search-grid.js` or `search-index.js` |
| Edit repo/GitHub login | `src/js/modules/repo-modal.js` |
| Edit settings | `src/js/modules/settings-modal.js` |
| Fix navigation | `src/js/modules/router-patch.js` or `src/js/router.js` |
| Change design tokens | `src/css/modules/01-tokens.css` |
| Edit navbar styles | `src/css/modules/03-navbar.css` |
| Edit video styles | `src/css/modules/05-video-player.css` |

---

## 📦 Bundling for Production/Deployment

When ready to deploy, concatenate all modules back into single files:

**In VS Code:** `Ctrl+Shift+B` → **"📦 Bundle All (JS + CSS)"**

**Or in terminal:**
```bash
# JS
cat src/js/modules/*.js > dist/app.bundle.js   # ⚠️ order matters! see tasks.json

# CSS
cat src/css/modules/*.css > dist/main.bundle.css
```

Then update `index.html` to reference `dist/app.bundle.js` and `dist/main.bundle.css`.

---

## 📌 Notes

- **No build tool required** — the site runs as plain HTML/CSS/JS
- **Module load order matters** — `index.html` loads scripts in the correct order
- **Global scope** — all modules share the `window` global scope (not ES modules)
- **PWA** — service worker is in `src/js/pwa.js`; manifest in `src/js/pwa-manifest.js`

---

## 🖊️ Editor Page (also sliced)

`editor.html` (3667 lines) → split into a clean HTML skeleton + separate files:

```
src/editor/
├── editor.html              ← 250-line HTML skeleton only (no inline CSS/JS)
├── css/
│   ├── editor-gate.css      ← Password gate styles
│   └── editor-main.css      ← Full editor UI styles (992 lines)
└── js/
    ├── editor-theme-init.js ← Early theme apply
    ├── editor-sync.js       ← Sync theme/accent from parent
    ├── editor-state-theme.js← App state & theme vars
    ├── editor-load.js       ← JSON file loading
    ├── editor-json-panel.js ← Raw JSON panel + goto
    ├── editor-select-sort.js← Custom select & sort
    ├── editor-tree.js       ← Sidebar tree view
    ├── editor-render.js     ← Main render + year cards
    ├── editor-drag.js       ← Card/topic drag & drop
    ├── editor-mutations.js  ← Data mutations + search
    ├── editor-ui-panels.js  ← Expand/resize/file drag
    ├── editor-github.js     ← Commit gen + GitHub sync
    ├── editor-init.js       ← Init + mobile + tabs
    ├── editor-playlist-modal.js ← Playlist modal
    └── editor-video-lookup.js   ← YouTube video lookup
```

The root `editor.html` is the deployable version (paths point to `src/editor/`).
The `src/editor/editor.html` is the dev-friendly version (relative paths for working inside the folder).
