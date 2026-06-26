/* ════════════════════════════════════════
   ACCENT COLORS
════════════════════════════════════════ */
const ACCENT_COLORS = [
  { hex: '#2563EB', label: 'Electric Blue' },
  { hex: '#7C3AED', label: 'Deep Violet' },
  { hex: '#A855F7', label: 'Lavender' },
  { hex: '#F43F5E', label: 'Rose Red' },
  { hex: '#10B981', label: 'Emerald' },
  { hex: '#064E3B', label: 'Dark Green' },
  { hex: '#F59E0B', label: 'Goldenrod' },
  { hex: '#0EA5E9', label: 'Sky Cyan' },
  { hex: '#DC2626', label: 'Crimson' },
  { hex: '#EC4899', label: 'Pink' },
  { hex: '#FBCFE8', label: 'Soft Pink' },
  { hex: '#FB7185', label: 'Light Rose' },
  { hex: '#F97316', label: 'Orange' },
  { hex: '#FFEDD5', label: 'Peach' },
  { hex: '#78350F', label: 'Warm Coffee' },
];

let currentAccentHex = localStorage.getItem('eduyomi-accent') || '#7c6af7';

function renderAccentGrids() {
  ['accentGrid','drawerAccentGrid'].forEach(id => {
    const g = document.getElementById(id);
    if (!g) return;
    g.innerHTML = ACCENT_COLORS.map(c => `
      <button class="accent-swatch ${c.hex.toLowerCase()===currentAccentHex.toLowerCase()?'active':''}"
        style="background:${c.hex}" title="${c.label}" onclick="setAccent('${c.hex}')"></button>
    `).join('');
  });
}
renderAccentGrids();

function hexToHue(hex) {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
    if (d === 0) return 0;
    let h = max === r ? ((g-b)/d)%6 : max === g ? (b-r)/d+2 : (r-g)/d+4;
    return Math.round(h * 60 + 360) % 360;
  }
  function updateLogoAccentFilter(hex) {
    const targetHue = hexToHue(hex);
    // sepia(1) maps any color to ~38deg hue reference
    // so we rotate from 38 to targetHue
    const rotation = targetHue - 38;
    document.documentElement.style.setProperty('--logo-accent-hue',
      `grayscale(1) sepia(1) hue-rotate(${rotation}deg) saturate(2) brightness(1.1)`);
  }
  function setAccent(hex) {
  currentAccentHex = hex;
  localStorage.setItem('eduyomi-accent', hex);
  localStorage.setItem('ej-synced-accent', hex);
  localStorage.setItem('ej-accent', hex); // keep editor in sync
  document.documentElement.style.setProperty('--accent-custom', hex);
  updateLogoAccentFilter(hex);
  document.querySelectorAll('.accent-swatch').forEach(s => {
    const bg = s.style.background || s.style.backgroundColor;
    s.classList.toggle('active', bg.toLowerCase()===hex.toLowerCase() || bg.toLowerCase()===hexToRgb(hex));
  });
  // Live-sync to Source Editor iframe if open
  try {
    const iframe = document.getElementById('sourceEditorIframe');
    if (iframe && iframe.contentDocument) {
      iframe.contentDocument.documentElement.style.setProperty('--accent-custom', hex);
    }
  } catch(e) {}
}
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `rgb(${parseInt(r[1],16)}, ${parseInt(r[2],16)}, ${parseInt(r[3],16)})` : hex;
}

