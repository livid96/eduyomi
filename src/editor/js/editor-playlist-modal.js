<script>
/* ═══════════════════════ YOUTUBE PLAYLIST FEATURE ═══════════════════════ */

let _playlistTarget = null;
let _playlistVideos = [];
let _playlistFetching = false;
let _playlistDebounce = null;

function openPlaylistModal(yi, si, ci) {
  _playlistTarget = {yi, si, ci};
  _playlistVideos = [];
  const input = document.getElementById('playlistUrlInput');
  document.getElementById('playlistPreview').innerHTML = '';
  document.getElementById('playlistPreview').classList.remove('show');
  document.getElementById('playlistMeta').style.display = 'none';
  document.getElementById('playlistProgress').classList.remove('show');
  document.getElementById('playlistProgressBar').style.width = '0%';
  document.getElementById('playlistError').style.display = 'none';
  document.getElementById('playlistAddBtn').disabled = true;
  input.value = '';
  input.classList.remove('invalid');
  document.getElementById('playlistModal').classList.add('open');
  setTimeout(() => input.focus(), 150);
}

function closePlaylistModal() {
  document.getElementById('playlistModal').classList.remove('open');
  _playlistFetching = false;
}

function extractPlaylistId(url) {
  url = (url || '').trim();
  try {
    const u = new URL(url);
    const list = u.searchParams.get('list');
    if (list) return list;
  } catch {}
  const m = url.match(/[?&]list=([^&\s]+)/);
  if (m) return m[1];
  // bare ID
  if (/^PL[a-zA-Z0-9_-]{10,}$/.test(url)) return url;
  return null;
}

function setPlaylistProgress(pct, text) {
  document.getElementById('playlistProgressBar').style.width = pct + '%';
  document.getElementById('playlistProgressText').textContent = text;
}

function showPlaylistError(msg) {
  const el = document.getElementById('playlistError');
  el.innerHTML = msg;
  el.style.display = 'block';
  document.getElementById('playlistProgress').classList.remove('show');
  document.getElementById('playlistAddBtn').disabled = true;
}

// ── Strategy 1: Invidious API (many instances) ──
async function tryInvidious(playlistId) {
  const INSTANCES = [
    'https://invidious.fdn.fr',
    'https://yewtu.be',
    'https://invidious.lunar.icu',
    'https://inv.tux.pizza',
    'https://invidious.privacyredirect.com',
    'https://invidious.perennialte.ch',
    'https://iv.melmac.space',
    'https://yt.artemislena.eu',
    'https://invidious.reallyaweso.me',
    'https://invidious.nerdvpn.de',
    'https://invidious.io.lol',
    'https://inv.nadeko.net',
  ];
  for (const base of INSTANCES) {
    try {
      const videos = [];
      let page = 1;
      let name = 'Playlist';
      while (page <= 20) {
        const r = await fetch(`${base}/api/v1/playlists/${playlistId}?page=${page}`, {signal: AbortSignal.timeout(7000)});
        if (!r.ok) break;
        const d = await r.json();
        if (page === 1) name = d.title || 'Playlist';
        const vids = d.videos || [];
        if (!vids.length) break;
        for (const v of vids) {
          if (v.videoId) videos.push({title: v.title || '', videoId: v.videoId});
        }
        setPlaylistProgress(30 + page * 3, `Fetching… ${videos.length} videos`);
        if (vids.length < 100) break; // last page
        page++;
      }
      if (videos.length) return {videos, name, source: 'Invidious'};
    } catch { continue; }
  }
  return null;
}

// ── Strategy 3: YouTube RSS feed via CORS proxy ──
async function tryRSSProxy(playlistId) {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`,
  ];
  for (const proxy of proxies) {
    try {
      const r = await fetch(proxy, {signal: AbortSignal.timeout(8000)});
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      const xmlStr = j ? (j.contents || j.data || '') : await r.text();
      if (!xmlStr || !xmlStr.includes('<entry>')) continue;
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlStr, 'application/xml');
      const entries = xml.querySelectorAll('entry');
      const videos = [];
      entries.forEach(entry => {
        const videoId = entry.querySelector('videoId')?.textContent || entry.querySelector('[name="videoId"]')?.getAttribute('yt:videoId') || '';
        const idEl = entry.getElementsByTagNameNS('http://www.youtube.com/xml/schemas/2015','videoId')[0];
        const id = (idEl?.textContent || videoId || '').trim();
        const title = entry.querySelector('title')?.textContent || '';
        if (id) videos.push({title, videoId: id});
      });
      const name = xml.querySelector('title')?.textContent || 'Playlist';
      if (videos.length) return {videos, name, source: 'RSS'};
    } catch { continue; }
  }
  return null;
}

// ── Strategy 4: YouTube page scrape via proxy ──
async function tryScrapeProxy(playlistId) {
  const ytUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(ytUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(ytUrl)}`,
  ];
  for (const proxy of proxies) {
    try {
      const r = await fetch(proxy, {signal: AbortSignal.timeout(10000)});
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      const html = j ? (j.contents || '') : await r.text();
      if (!html) continue;
      // Extract from ytInitialData
      const match = html.match(/var ytInitialData\s*=\s*(\{.+?\});<\/script>/s) ||
                    html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
      const videos = [];
      const name = (html.match(/<title>([^<]+)<\/title>/) || [])[1]?.replace(' - YouTube','') || 'Playlist';
      // Grab all videoIds from page
      const ids = [...new Set([...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map(m => m[1]))];
      const titles = [...html.matchAll(/"title":\{"runs":\[{"text":"([^"]+)"\}/g)].map(m => m[1]);
      ids.forEach((id, i) => videos.push({title: titles[i] || '', videoId: id}));
      if (videos.length) return {videos, name, source: 'Scraped'};
    } catch { continue; }
  }
  return null;
}

async function fetchPlaylist(playlistId) {
  setPlaylistProgress(10, 'Trying Invidious API…');
  let result = await tryInvidious(playlistId);
  if (result) return result;

  setPlaylistProgress(55, 'Trying RSS feed…');
  result = await tryRSSProxy(playlistId);
  if (result) return result;

  setPlaylistProgress(75, 'Trying page scrape…');
  result = await tryScrapeProxy(playlistId);
  if (result) return result;

  throw new Error(
    'All fetch methods failed. The playlist may be <b>private</b>, or all API services are temporarily down.<br><br>' +
    '💡 <b>Tip:</b> Make sure the playlist is set to <b>Public</b> on YouTube, then try again.'
  );
}

function onPlaylistUrlChange() {
  clearTimeout(_playlistDebounce);
  _playlistDebounce = setTimeout(triggerPlaylistFetch, 700);
}

async function triggerPlaylistFetch() {
  if (_playlistFetching) return;
  const url = document.getElementById('playlistUrlInput').value.trim();
  document.getElementById('playlistError').style.display = 'none';
  document.getElementById('playlistPreview').classList.remove('show');
  document.getElementById('playlistMeta').style.display = 'none';
  document.getElementById('playlistAddBtn').disabled = true;
  _playlistVideos = [];

  if (!url) return;

  const listId = extractPlaylistId(url);
  if (!listId) {
    document.getElementById('playlistUrlInput').classList.add('invalid');
    showPlaylistError('No playlist ID found. Paste a YouTube playlist URL containing <b>list=PL…</b>');
    return;
  }
  document.getElementById('playlistUrlInput').classList.remove('invalid');
  document.getElementById('playlistProgress').classList.add('show');
  _playlistFetching = true;

  try {
    const result = await fetchPlaylist(listId);
    _playlistFetching = false;
    _playlistVideos = result.videos;

    if (!_playlistVideos.length) {
      showPlaylistError('Playlist found but returned 0 videos. It may be private or empty.');
      return;
    }

    setPlaylistProgress(100, `✓ ${_playlistVideos.length} videos loaded via ${result.source}`);

    const preview = document.getElementById('playlistPreview');
    preview.innerHTML = _playlistVideos.map((v, i) =>
      `<div class="playlist-preview-item">
        <span class="playlist-preview-num">${i+1}</span>
        <span class="playlist-preview-title" title="${esc(v.title)}">${esc(v.title || '(no title)')}</span>
        <span class="playlist-preview-id">${esc(v.videoId)}</span>
      </div>`
    ).join('');
    preview.classList.add('show');

    const meta = document.getElementById('playlistMeta');
    meta.style.display = 'flex';
    meta.innerHTML = `<strong>${esc(result.name)}</strong> <span class="playlist-meta-badge">${_playlistVideos.length} videos</span>`;
    document.getElementById('playlistAddBtn').disabled = false;
    setTimeout(() => document.getElementById('playlistProgress').classList.remove('show'), 2000);
  } catch(e) {
    _playlistFetching = false;
    showPlaylistError(e.message || 'Failed to fetch playlist.');
  }
}

function confirmAddPlaylist() {
  if (!_playlistVideos.length || !_playlistTarget) return;
  const {yi, si, ci} = _playlistTarget;
  const useTitle = document.getElementById('playlistUseTitle').checked;
  data.years[yi].subjects[si].chapters[ci].topics = data.years[yi].subjects[si].chapters[ci].topics || [];
  const topics = data.years[yi].subjects[si].chapters[ci].topics;
  _playlistVideos.forEach(v => topics.push({title: useTitle ? (v.title || '') : '', url: v.videoId}));
  colState.years[yi] = false;
  colState.subjects[`${yi}-${si}`] = false;
  colState.chapters[`${yi}-${si}-${ci}`] = false;
  treeOpen[`y${yi}`] = true;
  treeOpen[`y${yi}s${si}`] = true;
  treeOpen[`y${yi}s${si}c${ci}`] = true;
  closePlaylistModal();
  render(); refreshJsonPanel();
  toast(`✓ Added ${_playlistVideos.length} videos from playlist`, 's');
  setTimeout(() => { const el = document.getElementById(`ch-card-${yi}-${si}-${ci}`); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }, 80);
}
</script>
