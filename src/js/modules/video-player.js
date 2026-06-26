/* ════════════════════════════════════════
   VIDEO PLAYER
════════════════════════════════════════ */
let mainPlayer = null;
let playerReady = false;
let isVideoPlaying = false;
let progressUpdater = null;
let hudTimer = null;
let currentVideoId = null;
let currentVideoTitle = '';
let selectOpen = false;

const seekbar    = document.getElementById('master-seekbar');
const curTimeEl  = document.getElementById('cur-time');
const durTimeEl  = document.getElementById('dur-time');
const hud        = document.getElementById('hud');
const toast      = document.getElementById('gesture-toast');
const videoSect  = document.getElementById('videoSection');

function onYouTubeIframeAPIReady() {
  mainPlayer = new YT.Player('youtube-engine', {
    height: '100%', width: '100%',
    playerVars: {
      autoplay: 0, controls: 0, rel: 0, modestbranding: 1,
      disablekb: 1, playsinline: 1, iv_load_policy: 3, fs: 0,
      origin: location.origin || '*',
      // Ad suppression params
      cc_load_policy: 0, hl: 'en', enablejsapi: 1,
    },
    events: { onStateChange: onStateChange, onReady: onPlayerReady }
  });
  // YT API sets inline width/height in px — remove them so CSS takes over
  setTimeout(() => {
    const iframe = document.querySelector('#youtube-engine iframe');
    if (iframe) { iframe.style.width = '100%'; iframe.style.height = '100%'; }
  }, 500);
}

function onPlayerReady() {
  playerReady = true;
  seekbar.addEventListener('input', () => {
    if (!mainPlayer?.getDuration) return;
    mainPlayer.seekTo(mainPlayer.getDuration() * (seekbar.value / 100));
    refreshHudInactivity();
  });
  attachGestureListeners();
  if (pendingVideoId) { doLoadVideo(pendingVideoId, pendingVideoTitle); pendingVideoId = null; pendingVideoTitle = ''; }
}

function onStateChange(event) {
  const btn = document.getElementById('master-pp-btn');
  if (event.data === YT.PlayerState.PLAYING) {
    btn.innerHTML = 'Ⅱ'; isVideoPlaying = true;
    startTimeTracker(); refreshHudInactivity();
  } else {
    btn.innerHTML = '▶'; isVideoPlaying = false;
    stopTimeTracker(); showHud();
  }
}

let pendingVideoId = null, pendingVideoTitle = '';

async function playTopic(videoId, title) {
  currentVideoId = videoId;
  currentVideoTitle = title;

  // Record in watch history (most recent first, no duplicates)
  const hist = JSON.parse(localStorage.getItem('eduyomi-history') || '[]');
  const filtered = hist.filter(v => v !== videoId);
  filtered.unshift(videoId);
  localStorage.setItem('eduyomi-history', JSON.stringify(filtered.slice(0, 50)));

  // Show section and scroll to top
  videoSect.classList.add('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.getElementById('display-title').textContent = title;
  // Update watch/bookmark button states
  updateVideoActionBtns();

  // Highlight playing topic
  document.querySelectorAll('.topic-item').forEach(el => el.classList.remove('playing'));
  const topicEl = document.getElementById('topic-' + videoId);
  if (topicEl) topicEl.classList.add('playing');

  // Fetch channel info
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    const d = await r.json();
    const link = document.getElementById('creator-link');
    link.textContent = d.author_name;
    link.dataset.videoId = videoId;
  } catch(e) {
    const link = document.getElementById('creator-link');
    link.textContent = 'Academic Source';
    link.dataset.videoId = videoId;
  }

  if (playerReady && mainPlayer?.loadVideoById) {
    doLoadVideo(videoId, title);
  } else {
    pendingVideoId = videoId;
    pendingVideoTitle = title;
  }
}

function doLoadVideo(videoId) {
  const savedQ    = settingsState.playerQuality || 'auto';
  const savedRate = parseFloat(settingsState.playerSpeed || '1');
  mainPlayer.loadVideoById({
    videoId: videoId,
    suggestedQuality: savedQ === 'auto' ? 'default' : savedQ
  });
  showHud();
  syncSpeedSliderUI(savedRate);
  if (savedRate !== 1) mainPlayer.setPlaybackRate(savedRate);
  syncQualityPillUI(savedQ);
}

