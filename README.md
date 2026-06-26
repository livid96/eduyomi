# Eduyomi

Free Education Portal — Learn anything, anytime.

## Project Structure

```
eduyomi/
├── index.html              ← Main SPA shell
├── editor.html             ← Curriculum editor  → /editor
├── contributors.html       ← Contributors page  → /contributors
├── license.html            ← License page       → /license
├── 404.html                ← GitHub Pages deep-link redirect
├── public/
│   └── favicon.svg
└── src/
    ├── css/
    │   └── main.css        ← All styles
    ├── js/
    │   ├── router.js       ← Hash-based SPA router
    │   ├── app.js          ← Main app logic
    │   ├── pwa-manifest.js ← PWA manifest blob injection
    │   ├── pwa.js          ← Service worker registration
    │   └── theme-init.js   ← Theme flicker prevention
    └── pages/
        ├── modals.html     ← All modal/overlay HTML fragments
        ├── editor.html     ← Editor source (also at root)
        ├── contributors.html
        └── license.html
```

## URL Structure

| URL | Content |
|-----|---------|
| `/` | Year grid (home) |
| `/#/:year/:subject` | Subject view |
| `/#/:year/:subject/:chapter` | Subject view, chapter scrolled into view |
| `/#/:year/:subject/:chapter/:topic` | Subject view, topic highlighted |
| `/editor` | Curriculum editor |
| `/contributors` | Contributors |
| `/license` | License |

## Development

Open `index.html` in a browser (or serve with any static server):

```bash
npx serve .
# or
python -m http.server 8080
```

## Deployment

Push to GitHub and enable GitHub Pages from the repo settings.  
The `404.html` handles deep-link routing for direct URL access.
