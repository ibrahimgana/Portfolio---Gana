/**
 * ══════════════════════════════════════════════════════════════════
 * PORTFOLIO MUSIC PLAYER CONFIGURATION
 * ══════════════════════════════════════════════════════════════════
 * To change the featured music, replace the URL below with any
 * YouTube video URL or playlist URL.
 *
 * Supported formats:
 * - Standard video: 'https://www.youtube.com/watch?v=VIDEO_ID'
 * - Short URL:      'https://youtu.be/VIDEO_ID'
 * - Playlist:       'https://www.youtube.com/playlist?list=PLAYLIST_ID'
 * - Video in list:  'https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID'
 * - Raw video ID:   'VIDEO_ID'
 * - Raw list ID:    'PLAYLIST_ID'
 */
const MUSIC_CONFIG = {
  // Replace this URL with any YouTube track or playlist you prefer:
  url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Lofi Girl - chill beats to relax/study to
  defaultVolume: 70
};

(function () {
  'use strict';

  // ══════════════════════════════════════════════════
  // URL PARSING & TARGET RESOLUTION
  // ══════════════════════════════════════════════════
  function parseYouTubeUrl(raw) {
    if (!raw) return { videoId: 'jfKfPfyJRdk', playlistId: null };
    const str = String(raw).trim();
    let videoId = null;
    let playlistId = null;

    try {
      const listMatch = str.match(/[?&]list=([^#&?]+)/);
      if (listMatch) playlistId = listMatch[1];

      const vMatch = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (vMatch) {
        videoId = vMatch[1];
      } else if (str.length === 11 && !str.includes('/') && !str.includes('.')) {
        videoId = str;
      } else if (!videoId && (str.startsWith('PL') || str.startsWith('OLAK5uy_')) && !str.includes('/')) {
        playlistId = str;
      }
    } catch (e) {
      console.warn('[MusicPlayer] URL parse error:', e);
    }

    return { videoId, playlistId };
  }

  const { videoId: initialVideoId, playlistId: initialPlaylistId } = parseYouTubeUrl(MUSIC_CONFIG.url);

  // ══════════════════════════════════════════════════
  // DOM REFERENCES
  // ══════════════════════════════════════════════════
  const widget = document.getElementById('musicWidget');
  const toggleBtn = document.getElementById('musicToggle');
  const toggleLabel = document.getElementById('musicToggleLabel');
  const card = document.getElementById('musicCard');
  const closeBtn = document.getElementById('musicCloseBtn');

  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const ytLink = document.getElementById('musicYtLink');

  const thumbImg = document.getElementById('musicThumb');
  const titleEl = document.getElementById('musicTitle');
  const artistEl = document.getElementById('musicArtist');

  const progressBar = document.getElementById('musicProgressBar');
  const progressFill = document.getElementById('musicProgressFill');
  const progressHandle = document.getElementById('musicProgressHandle');
  const timeCurrent = document.getElementById('musicTimeCurrent');
  const timeTotal = document.getElementById('musicTimeTotal');

  const playBtn = document.getElementById('musicPlayBtn');
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');

  const prevNav = document.getElementById('musicPlaylistNav');
  const nextNav = document.getElementById('musicPlaylistNavNext');
  const prevBtn = document.getElementById('musicPrevBtn');
  const nextBtn = document.getElementById('musicNextBtn');

  const volBtn = document.getElementById('musicVolBtn');
  const volSlider = document.getElementById('musicVolSlider');
  const iconVolHigh = document.getElementById('iconVolHigh');
  const iconVolMuted = document.getElementById('iconVolMuted');

  // State
  let ytPlayer = null;
  let isApiReady = false;
  let isPlayerReady = false;
  let isPlaying = false;
  let isMuted = false;
  let isExpanded = false;
  let progressTimer = null;
  let isScrubbing = false;
  let lastVolume = MUSIC_CONFIG.defaultVolume || 70;

  // ══════════════════════════════════════════════════
  // YOUTUBE IFRAME API INITIALIZATION
  // ══════════════════════════════════════════════════
  function initPlayer() {
    if (!window.YT || !window.YT.Player) return;

    const playerVars = {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      playsinline: 1
    };

    if (window.location.origin && window.location.origin !== 'null' && window.location.protocol.startsWith('http')) {
      playerVars.origin = window.location.origin;
    }

    if (initialPlaylistId) {
      playerVars.listType = 'playlist';
      playerVars.list = initialPlaylistId;
    }

    try {
      ytPlayer = new YT.Player('ytPlayer', {
        height: '200',
        width: '200',
        videoId: initialVideoId || undefined,
        playerVars: playerVars,
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError
        }
      });
    } catch (err) {
      console.warn('[MusicPlayer] Error instantiating YT Player:', err);
    }
  }

  // Hook into YouTube global callback or execute if script is already present
  if (window.YT && window.YT.Player) {
    initPlayer();
  } else {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prevReady === 'function') prevReady();
      initPlayer();
    };
  }

  // ══════════════════════════════════════════════════
  // PLAYER EVENT HANDLERS
  // ══════════════════════════════════════════════════
  function onPlayerReady(event) {
    isPlayerReady = true;
    ytPlayer.setVolume(lastVolume);
    if (volSlider) volSlider.value = lastVolume;

    updateTrackInfo();
    updatePlaylistVisibility();
    setStatus('Ready', false);

    // Initial thumbnail fallback if videoId is known
    if (initialVideoId && thumbImg) {
      thumbImg.src = `https://img.youtube.com/vi/${initialVideoId}/mqdefault.jpg`;
      thumbImg.style.display = 'block';
    }
  }

  function onPlayerStateChange(event) {
    if (!ytPlayer) return;

    // YT.PlayerState: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
    switch (event.data) {
      case YT.PlayerState.PLAYING:
        isPlaying = true;
        setPlayingUI(true);
        setStatus('Playing', true);
        startProgressTracking();
        updateTrackInfo();
        updatePlaylistVisibility();
        break;

      case YT.PlayerState.PAUSED:
        isPlaying = false;
        setPlayingUI(false);
        setStatus('Paused', false);
        stopProgressTracking();
        break;

      case YT.PlayerState.BUFFERING:
        setStatus('Buffering', true);
        break;

      case YT.PlayerState.ENDED:
        isPlaying = false;
        setPlayingUI(false);
        setStatus('Ended', false);
        stopProgressTracking();
        updateProgress(0, 0);
        break;

      case YT.PlayerState.CUED:
        isPlaying = false;
        setPlayingUI(false);
        setStatus('Ready', false);
        updateTrackInfo();
        updatePlaylistVisibility();
        break;

      default:
        break;
    }
  }

  function onPlayerError(event) {
    console.warn('[MusicPlayer] YouTube API error:', event.data);
    setStatus('Unavailable', false);
    if (statusDot) statusDot.style.background = '#d9534f';
    if (titleEl) titleEl.textContent = 'Playback restricted';
    if (artistEl) artistEl.textContent = 'Track cannot be embedded';
    setPlayingUI(false);
    stopProgressTracking();
  }

  // ══════════════════════════════════════════════════
  // UI SYNCHRONIZATION
  // ══════════════════════════════════════════════════
  function setStatus(text, active) {
    if (statusText) statusText.textContent = text;
    if (statusDot) {
      statusDot.className = 'status-dot' + (active ? ' is-active' : '');
    }
  }

  function setPlayingUI(playing) {
    if (widget) widget.classList.toggle('is-playing', playing);
    if (iconPlay) iconPlay.style.display = playing ? 'none' : 'block';
    if (iconPause) iconPause.style.display = playing ? 'block' : 'none';
    if (playBtn) playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    if (toggleLabel) toggleLabel.textContent = playing ? 'Playing' : 'Music';
  }

  function updateTrackInfo() {
    if (!ytPlayer || typeof ytPlayer.getVideoData !== 'function') return;

    try {
      const data = ytPlayer.getVideoData();
      const currentId = data.video_id || initialVideoId;

      if (data.title && titleEl) {
        titleEl.textContent = data.title;
        titleEl.title = data.title;
      }

      if (artistEl) {
        artistEl.textContent = data.author ? data.author : 'YouTube Audio';
      }

      if (thumbImg && currentId) {
        thumbImg.src = `https://img.youtube.com/vi/${currentId}/mqdefault.jpg`;
        thumbImg.style.display = 'block';
      }

      if (ytLink && currentId) {
        let linkUrl = `https://www.youtube.com/watch?v=${currentId}`;
        if (initialPlaylistId) {
          linkUrl += `&list=${initialPlaylistId}`;
        }
        ytLink.href = linkUrl;
      }
    } catch (e) {
      // Ignore if data is not accessible yet
    }
  }

  function updatePlaylistVisibility() {
    if (!ytPlayer) return;
    const isPlaylist = (initialPlaylistId && initialPlaylistId.length > 0) ||
      (typeof ytPlayer.getPlaylist === 'function' && Array.isArray(ytPlayer.getPlaylist()) && ytPlayer.getPlaylist().length > 1);

    if (prevNav) prevNav.style.display = isPlaylist ? 'block' : 'none';
    if (nextNav) nextNav.style.display = isPlaylist ? 'block' : 'none';
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m + ':' + (rem < 10 ? '0' : '') + rem;
  }

  function startProgressTracking() {
    stopProgressTracking();
    progressTimer = setInterval(() => {
      if (!isScrubbing && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        const cur = ytPlayer.getCurrentTime() || 0;
        const dur = ytPlayer.getDuration() || 0;
        updateProgress(cur, dur);
      }
    }, 300);
  }

  function stopProgressTracking() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  function updateProgress(current, duration) {
    if (timeCurrent) timeCurrent.textContent = formatTime(current);
    if (timeTotal) timeTotal.textContent = formatTime(duration);

    const pct = duration > 0 ? clamp((current / duration) * 100, 0, 100) : 0;
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressHandle) progressHandle.style.left = pct + '%';
    if (progressBar) progressBar.setAttribute('aria-valuenow', Math.round(pct));
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  // ══════════════════════════════════════════════════
  // USER CONTROLS & INTERACTIONS
  // ══════════════════════════════════════════════════

  // Toggle Collapse / Expand
  function setExpanded(expand) {
    isExpanded = expand;
    if (widget) widget.classList.toggle('is-expanded', expand);
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(expand));
    if (card) card.setAttribute('aria-hidden', String(!expand));
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setExpanded(!isExpanded);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setExpanded(false);
    });
  }

  // Close when clicking outside of the card
  document.addEventListener('click', (e) => {
    if (isExpanded && widget && !widget.contains(e.target)) {
      setExpanded(false);
    }
  });

  // Play / Pause
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (!isPlayerReady || !ytPlayer) {
        setStatus('Loading...', true);
        return;
      }
      if (isPlaying) {
        ytPlayer.pauseVideo();
      } else {
        ytPlayer.playVideo();
      }
    });
  }

  // Playlist Navigation
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (ytPlayer && typeof ytPlayer.previousVideo === 'function') {
        ytPlayer.previousVideo();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (ytPlayer && typeof ytPlayer.nextVideo === 'function') {
        ytPlayer.nextVideo();
      }
    });
  }

  // Volume Control
  function applyVolume(vol) {
    lastVolume = clamp(vol, 0, 100);
    if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
      ytPlayer.setVolume(lastVolume);
    }
    if (volSlider) volSlider.value = lastVolume;

    const muted = lastVolume === 0;
    isMuted = muted;
    if (iconVolHigh) iconVolHigh.style.display = muted ? 'none' : 'block';
    if (iconVolMuted) iconVolMuted.style.display = muted ? 'block' : 'none';
  }

  if (volSlider) {
    volSlider.addEventListener('input', (e) => {
      applyVolume(Number(e.target.value));
      if (ytPlayer && ytPlayer.isMuted && ytPlayer.isMuted()) {
        ytPlayer.unMute();
      }
    });
  }

  if (volBtn) {
    volBtn.addEventListener('click', () => {
      if (!ytPlayer) return;
      if (isMuted) {
        ytPlayer.unMute();
        applyVolume(lastVolume > 0 ? lastVolume : 70);
      } else {
        ytPlayer.mute();
        isMuted = true;
        if (iconVolHigh) iconVolHigh.style.display = 'none';
        if (iconVolMuted) iconVolMuted.style.display = 'block';
        if (volSlider) volSlider.value = 0;
      }
    });
  }

  // Progress Bar Seek / Scrub
  function seekFromEvent(e) {
    if (!progressBar || !ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
    const rect = progressBar.getBoundingClientRect();
    const pos = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const dur = ytPlayer.getDuration() || 0;
    if (dur > 0) {
      const targetTime = pos * dur;
      updateProgress(targetTime, dur);
      ytPlayer.seekTo(targetTime, true);
    }
  }

  if (progressBar) {
    progressBar.addEventListener('click', (e) => {
      seekFromEvent(e);
    });

    progressBar.addEventListener('pointerdown', (e) => {
      isScrubbing = true;
      progressBar.setPointerCapture(e.pointerId);
      seekFromEvent(e);

      const onPointerMove = (moveEvent) => {
        if (isScrubbing) seekFromEvent(moveEvent);
      };

      const onPointerUp = (upEvent) => {
        isScrubbing = false;
        progressBar.removeEventListener('pointermove', onPointerMove);
        progressBar.removeEventListener('pointerup', onPointerUp);
        try { progressBar.releasePointerCapture(upEvent.pointerId); } catch (_) {}
      };

      progressBar.addEventListener('pointermove', onPointerMove);
      progressBar.addEventListener('pointerup', onPointerUp);
    });
  }

  // Keyboard accessibility for scrub bar
  if (progressBar) {
    progressBar.addEventListener('keydown', (e) => {
      if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
      const cur = ytPlayer.getCurrentTime() || 0;
      const dur = ytPlayer.getDuration() || 0;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        ytPlayer.seekTo(Math.max(0, cur - 5), true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        ytPlayer.seekTo(Math.min(dur, cur + 5), true);
      }
    });
  }

})();

