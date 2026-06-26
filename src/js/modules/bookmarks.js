/* ════════════════════════════════════════
   VIDEO WATCH / BOOKMARK TOGGLES
════════════════════════════════════════ */
function markVideoWatched(videoId) {
  if (!videoId || watchedTopics.has(videoId)) return;
  watchedTopics.add(videoId);
  localStorage.setItem('eduyomi-watched', JSON.stringify([...watchedTopics]));
  updateVideoActionBtns();
  // Update the topic row icon live without full re-render
  const topicEl = document.getElementById('topic-' + videoId);
  if (topicEl) {
    topicEl.classList.add('topic-watched');
    const watchBtn = topicEl.querySelector('.topic-icon-btn');
    if (watchBtn) { watchBtn.classList.add('ti-active','ti-watch-active'); watchBtn.title = 'Mark unwatched'; }
  }
}

function updateVideoActionBtns() {
  const wBtn = document.getElementById('vid-watch-btn');
  const bBtn = document.getElementById('vid-bookmark-btn');
  if (!wBtn || !bBtn) return;
  // Show/hide based on setting
  const show = settingsState.showWatchBookmark;
  wBtn.style.display = show ? '' : 'none';
  bBtn.style.display = show ? '' : 'none';
  if (!currentVideoId) return;
  wBtn.classList.toggle('active-watch', watchedTopics.has(currentVideoId));
  wBtn.title = watchedTopics.has(currentVideoId) ? 'Mark as unwatched' : 'Mark as watched';
  bBtn.classList.toggle('active-bookmark', bookmarkedTopics.has(currentVideoId));
  bBtn.title = bookmarkedTopics.has(currentVideoId) ? 'Remove bookmark' : 'Bookmark';
}

function toggleVideoWatched() {
  if (!currentVideoId) return;
  if (watchedTopics.has(currentVideoId)) watchedTopics.delete(currentVideoId);
  else watchedTopics.add(currentVideoId);
  localStorage.setItem('eduyomi-watched', JSON.stringify([...watchedTopics]));
  updateVideoActionBtns();
  if (currentSubjectData) renderSubjectView();
}

function toggleVideoBookmarked() {
  if (!currentVideoId) return;
  if (bookmarkedTopics.has(currentVideoId)) bookmarkedTopics.delete(currentVideoId);
  else bookmarkedTopics.add(currentVideoId);
  localStorage.setItem('eduyomi-bookmarked', JSON.stringify([...bookmarkedTopics]));
  updateVideoActionBtns();
  if (currentSubjectData) renderSubjectView();
}

// Inline topic-row toggles (no full re-render, just flip the button state)
function toggleTopicWatched(videoId, btn) {
  if (!videoId) return;
  if (watchedTopics.has(videoId)) {
    watchedTopics.delete(videoId);
    btn.classList.remove('ti-active','ti-watch-active');
    btn.title = 'Mark watched';
    btn.closest('.topic-item')?.classList.remove('topic-watched');
  } else {
    watchedTopics.add(videoId);
    btn.classList.add('ti-active','ti-watch-active');
    btn.title = 'Mark unwatched';
    btn.closest('.topic-item')?.classList.add('topic-watched');
  }
  localStorage.setItem('eduyomi-watched', JSON.stringify([...watchedTopics]));
  if (currentVideoId === videoId) updateVideoActionBtns();
}

function toggleTopicBookmarked(videoId, btn) {
  if (!videoId) return;
  if (bookmarkedTopics.has(videoId)) {
    bookmarkedTopics.delete(videoId);
    btn.classList.remove('ti-active','ti-bookmark-active');
    btn.title = 'Bookmark';
  } else {
    bookmarkedTopics.add(videoId);
    btn.classList.add('ti-active','ti-bookmark-active');
    btn.title = 'Remove bookmark';
  }
  localStorage.setItem('eduyomi-bookmarked', JSON.stringify([...bookmarkedTopics]));
  if (currentVideoId === videoId) updateVideoActionBtns();
}

