/* Global background audio component.
 *
 * One <audio> element for the whole single-page site.
 * Selects one configured track per visit and keeps it for the session.
 * Remembers the previous visit's track to avoid immediate repetition.
 * Never autoplays; fades in/out only after an explicit toggle.
 *
 * Track configuration lives in audio-tracks.js.
 */
(() => {
  'use strict';

  const toggle = document.getElementById('audioToggle');
  const label = document.getElementById('audioLabel');
  const audio = document.getElementById('siteAudio');
  if (!toggle || !audio) return;

  const configured = Array.isArray(window.SITE_AUDIO_TRACKS)
    ? window.SITE_AUDIO_TRACKS
    : [];
  const tracks = configured.filter(track => track && track.id && track.file);

  const LABEL_ON = 'Audio On';
  const LABEL_OFF = 'Audio Off';
  const TARGET_VOLUME = 0.22;
  const FADE_IN_MS = 1500;
  const FADE_OUT_MS = 700;
  const FADE_STEP_MS = 40;
  const SESSION_KEY = 'ibrahim-gana:audio-session-track';
  const LAST_KEY = 'ibrahim-gana:audio-last-track';

  const failed = new Set();
  let isOn = false;
  let wantsPlay = false;
  let fadeTimer = null;
  let currentIndex = -1;
  let warned = false;

  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0;

  function read(store, key) {
    try { return window[store].getItem(key); } catch (err) { return null; }
  }

  function write(store, key, value) {
    try { window[store].setItem(key, value); } catch (err) { /* storage unavailable */ }
  }

  function remove(store, key) {
    try { window[store].removeItem(key); } catch (err) { /* storage unavailable */ }
  }

  function indexOfId(id) {
    if (!id) return -1;
    for (let i = 0; i < tracks.length; i += 1) {
      if (tracks[i].id === id) return i;
    }
    return -1;
  }

  function availableIndices() {
    const list = [];
    for (let i = 0; i < tracks.length; i += 1) {
      if (!failed.has(i)) list.push(i);
    }
    return list;
  }

  function pickIndex() {
    const available = availableIndices();
    if (!available.length) return -1;

    const sessionIndex = indexOfId(read('sessionStorage', SESSION_KEY));
    if (sessionIndex !== -1 && !failed.has(sessionIndex)) return sessionIndex;

    const lastIndex = indexOfId(read('localStorage', LAST_KEY));
    let pool = available;
    if (available.length > 1 && lastIndex !== -1) {
      const withoutLast = available.filter(i => i !== lastIndex);
      if (withoutLast.length) pool = withoutLast;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function remember(index) {
    const track = tracks[index];
    if (!track) return;
    write('sessionStorage', SESSION_KEY, track.id);
    write('localStorage', LAST_KEY, track.id);
  }

  function setUi(on) {
    isOn = on;
    toggle.classList.toggle('is-on', on);
    toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    toggle.setAttribute('aria-label', on ? 'Turn audio off' : 'Turn audio on');
    if (label) label.textContent = on ? LABEL_ON : LABEL_OFF;
  }

  function clampVolume(value) {
    return Math.max(0, Math.min(1, value));
  }

  function clearFade() {
    if (fadeTimer !== null) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }

  function fadeTo(target, duration, done) {
    clearFade();

    const start = audio.volume;
    const delta = target - start;

    if (duration <= 0 || Math.abs(delta) < 0.001) {
      audio.volume = clampVolume(target);
      if (typeof done === 'function') done();
      return;
    }

    const steps = Math.max(1, Math.round(duration / FADE_STEP_MS));
    let step = 0;

    fadeTimer = setInterval(() => {
      step += 1;
      audio.volume = clampVolume(start + delta * (step / steps));
      if (step >= steps) {
        clearFade();
        audio.volume = clampVolume(target);
        if (typeof done === 'function') done();
      }
    }, FADE_STEP_MS);
  }

  function warnUnavailable() {
    if (warned) return;
    warned = true;
    console.warn('[Audio] No playable tracks found. Add MP3 files under audio/ and list them in audio-tracks.js.');
  }

  function failAll() {
    wantsPlay = false;
    clearFade();
    audio.pause();
    audio.volume = 0;
    setUi(false);
    warnUnavailable();
  }

  function loadTrack(index) {
    const track = tracks[index];
    if (!track) return false;
    currentIndex = index;
    audio.preload = 'auto';
    audio.src = track.file;

    const onError = () => {
      audio.removeEventListener('error', onError);
      if (index === currentIndex) handleMediaError(index);
    };
    audio.addEventListener('error', onError);

    audio.load();
    return true;
  }

  function handlePlayFailure(err, index) {
    if (!wantsPlay || index !== currentIndex) return;
    if (audio.error || (err && err.name === 'NotSupportedError')) {
      handleMediaError(index);
      return;
    }
    wantsPlay = false;
    clearFade();
    setUi(false);
    audio.volume = 0;
  }

  function attemptPlay() {
    const index = currentIndex;
    audio.volume = 0;

    let playResult;
    try {
      playResult = audio.play();
    } catch (err) {
      handlePlayFailure(err, index);
      return;
    }

    if (playResult && typeof playResult.then === 'function') {
      playResult
        .then(() => {
          if (wantsPlay && index === currentIndex && !failed.has(index)) {
            fadeTo(TARGET_VOLUME, FADE_IN_MS);
          }
        })
        .catch(err => handlePlayFailure(err, index));
    } else {
      fadeTo(TARGET_VOLUME, FADE_IN_MS);
    }
  }

  function handleMediaError(index) {
    if (index !== currentIndex) return;
    failed.add(index);
    remove('sessionStorage', SESSION_KEY);
    clearFade();
    audio.volume = 0;

    if (!wantsPlay) {
      setUi(false);
      return;
    }

    const next = pickIndex();
    if (next === -1 || !loadTrack(next)) {
      failAll();
      return;
    }
    remember(next);

    setTimeout(() => {
      if (wantsPlay) attemptPlay();
    }, 0);
  }

  function startPlayback() {
    if (isOn) return;

    wantsPlay = true;
    setUi(true);
    clearFade();

    if (!tracks.length) {
      failAll();
      return;
    }

    if (currentIndex === -1 || failed.has(currentIndex)) {
      const index = pickIndex();
      if (index === -1 || !loadTrack(index)) {
        failAll();
        return;
      }
      remember(index);
    }

    attemptPlay();
  }

  function stopPlayback() {
    wantsPlay = false;
    setUi(false);
    fadeTo(0, FADE_OUT_MS, () => {
      audio.pause();
      /* Keep currentTime so toggling on again in the same session resumes. */
    });
  }

  toggle.addEventListener('click', () => {
    if (isOn) stopPlayback();
    else startPlayback();
  });

  setUi(false);
})();
