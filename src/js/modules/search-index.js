/* ════════════════════════════════════════
   SEARCH INDEX
════════════════════════════════════════ */
function buildSearchIndex() {
  SEARCH_INDEX = [];
  MASTER_DATA.forEach((year, yi) => {
    const yearLabel = year.year_title||('Year '+(yi+1));
    (year.subjects||[]).forEach((sub, si) => {
      const name_en = sub.subject_name?.en||'';
      const name_bn = sub.subject_name?.bn||'';
      SEARCH_INDEX.push({
        title: name_en, title_bn: name_bn, tag: yearLabel,
        keywords: [name_en,name_bn,yearLabel].join(' ').toLowerCase(),
        path: yearLabel+' › '+name_en, href: '#', isLocal: true, emoji: '📚',
      });
      (sub.chapters||[]).forEach((ch, ci) => {
        const ch_en = ch.chapter_title || '';
        SEARCH_INDEX.push({
          title: ch_en, title_bn: '', tag: name_en,
          keywords: [ch_en,name_en,name_bn,yearLabel].join(' ').toLowerCase(),
          path: yearLabel+' › '+name_en+' › '+ch_en, href: '#', isLocal: false, emoji: '📖',
        });
        (ch.topics||[]).forEach(topic => {
          const t_en = topic.title || '';
          const vid  = topic.url || null;
          SEARCH_INDEX.push({
            title: t_en, title_bn: '', tag: ch_en,
            keywords: [t_en,ch_en,name_en,name_bn,yearLabel].join(' ').toLowerCase(),
            path: yearLabel+' › '+name_en+' › '+ch_en+' › '+t_en,
            href: '#', isLocal: false,
            emoji: vid ? '▶️' : '📝',
            video_id: vid,
            subject_path: name_en, chapter_en: ch_en,
            yi, si,
          });
        });
      });
    });
  });
}

function openTopicVideoFromSearch(videoId, title, subjectPath, chapterEn, yi, si) {
  if (!videoId) return;
  // Navigate to the subject view if we have location info
  if (yi != null && si != null) {
    // Switch to correct year tab
    showYear(yi, null);
    // Open subject view
    openSubjectView(yi, si);
    // Small delay to let the DOM render, then play + scroll to topic
    setTimeout(() => {
      playTopic(videoId, title);
      setTimeout(() => {
        const topicEl = document.getElementById('topic-' + videoId);
        if (topicEl) topicEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }, 50);
  } else {
    playTopic(videoId, title);
  }
}

