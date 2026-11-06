(() => {
  'use strict';

  /* Admin mode check for book adding */
  if (window.location.search.includes('admin')) {
    document.body.classList.add('is-admin');
  }

  /* ══════════════════════════════════════════════════
     AUDIO CONTROLS
     ══════════════════════════════════════════════════ */
  const audio = document.getElementById('bgMusic');
  const soundToggle = document.getElementById('soundToggle');
  const soundText = document.getElementById('soundText');
  let isAudioPlaying = false;
  audio.volume = 0.35;

  function playAudio() {
    audio.play().then(() => {
      isAudioPlaying = true;
      soundToggle.classList.add('is-playing');
      soundText.textContent = 'Audio: On';
    }).catch(e => console.log('Audio blocked.'));
  }

  function pauseAudio() {
    audio.pause();
    isAudioPlaying = false;
    soundToggle.classList.remove('is-playing');
    soundText.textContent = 'Audio: Off';
  }

  soundToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    isAudioPlaying ? pauseAudio() : playAudio();
  });

  const unlockAudio = () => {
    if (!isAudioPlaying) playAudio();
    document.removeEventListener('pointerdown', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  };
  document.addEventListener('pointerdown', unlockAudio);
  document.addEventListener('keydown', unlockAudio);

  /* ══════════════════════════════════════════════════
     DATA & STATE
     ══════════════════════════════════════════════════ */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;
  document.documentElement.classList.add(isTouch ? 'is-touch' : 'is-desktop');
  document.getElementById('stageHint').textContent = isTouch ? 'Tap a node to explore' : 'Hover to read · Click to enter';

  const NS = 'http://www.w3.org/2000/svg';

  // 5 Orbiting Nodes
  const NODES = [
    { id: 'about',   label: 'Who Am I?', angle: -1.57, rad: 0.82, speed:  0.045, size: 7.5, title: 'Who Am I?',  desc: 'My personal story, background, experiences, interests, values and how I think.' },
    { id: 'notes',   label: 'Notes',     angle: -0.31, rad: 0.75, speed: -0.038, size: 7,   title: 'Notes',      desc: 'My writing archive, including articles, reflections, observations and essays.' },
    { id: 'work',    label: 'Work',      angle:  0.94, rad: 0.88, speed:  0.035, size: 8,   title: 'Work',       desc: 'My projects, products, experiments and things I have designed or built.' },
    { id: 'reading', label: 'The Shelf', angle:  2.20, rad: 0.80, speed: -0.052, size: 7,   title: 'The Shelf',  desc: 'My reading collection, including books I am currently reading and books I have read.' },
    { id: 'contact', label: 'Say Hello', angle:  3.45, rad: 0.70, speed:  0.040, size: 6.5, title: 'Say Hello',  desc: 'Get in touch with me for collaborations, conversations or just to say hi.' }
  ];

  const NODE_LINKS = [[0,1], [1,2], [2,3], [3,4], [4,0], [0,2], [1,3], [2,4]];

  const PARTICLES = [];
  NODES.forEach((n, i) => {
    for (let k = 0; k < 3; k++) {
      PARTICLES.push({
        parent: i,
        angle: (k / 3) * Math.PI * 2 + i * 1.7,
        speed: (i % 2 ? -1 : 1) * (0.22 + k * 0.11),
        dist: 28 + k * 15,
        size: 1.4 + (k % 2) * 0.6,
        phase: i * 2.1 + k * 1.9,
        x: 0, y: 0, a: 0.5
      });
    }
  });

  // PAGES DATA
  const PAGES = {
    about: {
      kicker: '01 — Who Am I?',
      title: 'My story',
      desc: 'A deeper look into my background, experiences, interests, values, and the way I think about the world.',
      items: ['Design engineering', 'Product strategy', 'Systems & complexity']
    },
    notes: {
      kicker: '02 — Notes',
      title: 'Ideas and reflections',
      desc: 'Essays and articles that try to connect what usually stays separate: design and cognition, architecture and strategy, reading and building.',
      items: ['Memory Is an Interface', 'Second-Order Design', 'Dependencies Are the Real Material']
    },
    work: {
      kicker: '03 — Work',
      title: 'Things I have built',
      desc: 'A selection of projects, products, experiments and systems described by their architecture and outcomes.',
      items: ['Atlas — a knowledge graph', 'Cadence — scheduling as feedback', 'Meridian — a design system']
    },
    contact: {
      kicker: '05 — Say Hello',
      title: "Let's connect",
      desc: 'Whether you want to discuss systems thinking, collaborate on a project, or just say hello.',
      items: ['hello@ibrahimgana.com', 'LinkedIn', 'Twitter', 'GitHub']
    }
  };

  // READING PAGE DATA
  let books = [
    { id: '1', title: 'On Writing Well',         author: 'William Zinsser',  cover: 'https://covers.openlibrary.org/b/isbn/9780060891541-L.jpg', status: 'reading', progress: 65 },
    { id: '2', title: 'Moonwalking with Einstein', author: 'Joshua Foer',    cover: 'https://covers.openlibrary.org/b/isbn/9780143120537-L.jpg', status: 'read' },
    { id: '3', title: 'Secrets of Mental Math',   author: 'Arthur Benjamin', cover: 'https://covers.openlibrary.org/b/isbn/9780307338402-L.jpg', status: 'read' }
  ];

  /* ══════════════════════════════════════════════════
     DOM ELEMENTS
     ══════════════════════════════════════════════════ */
  const stage     = document.getElementById('stage');
  const canvas    = document.getElementById('network');
  const ctx       = canvas.getContext('2d');
  const labelsEl  = document.getElementById('labels');
  const portrait  = document.querySelector('.portrait');
  const tooltip   = document.getElementById('tooltip');
  const ttTitle   = document.getElementById('ttTitle');
  const ttDesc    = document.getElementById('ttDesc');
  const ttCta     = document.getElementById('ttCta');
  const loader    = document.getElementById('loader');
  const countEl   = document.getElementById('count');
  const ruleEl    = document.getElementById('rule');
  const page      = document.getElementById('page');
  const pageInner = document.getElementById('pageInner');

  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, pr = 0, R = 0, T = 0;
  let appear = 0, appearStart = 0, loaded = false;
  let activeNode = null, tooltipW = 240, tooltipH = 120;
  let pageOpen = false, openOrigin = null, lastFocusedNode = null;
  let pointer = { x: -9999, y: -9999, active: false, nx: 0, ny: 0 };
  let parallax = { x: 0, y: 0 }, rotOffset = 0, rotTarget = 0;

  /* ══════════════════════════════════════════════════
     LOADER LOGIC
     ══════════════════════════════════════════════════ */
  const markLinks = document.getElementById('loaderLinks');
  const markDots  = document.getElementById('loaderDots');
  const LINES = [], DOTS = [];

  (function buildMark() {
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3 - Math.PI / 2;
      const x = 60 + Math.cos(a) * 40;
      const y = 60 + Math.sin(a) * 40;
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', 60); line.setAttribute('y1', 60);
      line.setAttribute('x2', x);  line.setAttribute('y2', y);
      line.setAttribute('stroke-dasharray', 40);
      line.setAttribute('stroke-dashoffset', 40);
      markLinks.appendChild(line); LINES.push(line);
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      dot.setAttribute('r', 2.8); dot.setAttribute('fill', '#1C1B1A'); dot.setAttribute('opacity', 0);
      markDots.appendChild(dot); DOTS.push(dot);
    }
    const core = document.createElementNS(NS, 'circle');
    core.setAttribute('cx', 60); core.setAttribute('cy', 60);
    core.setAttribute('r', 3.6); core.setAttribute('fill', '#722F37'); core.setAttribute('opacity', 0);
    markDots.appendChild(core); DOTS.push(core);
  })();

  function renderLoader(p) {
    countEl.textContent = String(Math.floor(p)).padStart(2, '0');
    ruleEl.style.transform = 'scaleX(' + (p / 100) + ')';
    LINES.forEach((line, k) => {
      const lp = clamp((p / 100) * 6 - k, 0, 1);
      line.setAttribute('stroke-dashoffset', 40 * (1 - lp));
    });
    DOTS.forEach((dot, k) => {
      const lp = clamp((p / 100) * 6 - (k - 1), 0, 1);
      dot.setAttribute('opacity', lp);
      const base = k === DOTS.length - 1 ? 3.6 : 2.8;
      dot.setAttribute('r', base * (0.4 + lp * 0.6));
    });
  }

  function startLoader() {
    const duration = RM ? 160 : 8500;
    const t0 = performance.now();
    function step(now) {
      const t = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - t, 2.4);
      renderLoader(e * 100);
      if (t < 1) requestAnimationFrame(step);
      else finishLoader();
    }
    requestAnimationFrame(step);
  }

  function finishLoader() {
    renderLoader(100);
    setTimeout(() => {
      loader.classList.add('done');
      document.body.classList.add('loaded');
      loaded = true;
      appearStart = performance.now();
      setTimeout(() => { loader.remove(); }, 1000);
      const id = location.hash.replace('#', '');
      if (PAGES[id] || id === 'reading') setTimeout(() => navigate(id), 900);
    }, RM ? 0 : 240);
  }

  /* ══════════════════════════════════════════════════
     NETWORK LOGIC
     ══════════════════════════════════════════════════ */
  function resize() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width  = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    cx = W / 2; cy = H / 2;
    R = W < 500 ? Math.min(W * 0.36, H * 0.40) : Math.min(W * 0.42, H * 0.44);
    pr = portrait.getBoundingClientRect().width / 2 || 50;
    NODES.forEach(n => { if (n.el) n.lw = n.el.offsetWidth || 70; });
  }

  function buildLabels() {
    NODES.forEach(n => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'node'; b.textContent = n.label;
      b.setAttribute('aria-label', n.label + ' — ' + n.desc);
      b.addEventListener('pointerenter', () => { if (!isTouch) setActive(n); });
      b.addEventListener('pointerleave', () => { if (!isTouch && activeNode === n) setActive(null); });
      b.addEventListener('focus', () => { lastFocusedNode = n; setActive(n); });
      b.addEventListener('blur',  () => { if (!isTouch && activeNode === n) setActive(null); });
      b.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        if (isTouch) onNodeTap(n); else navigate(n.id);
      });
      labelsEl.appendChild(b); n.el = b; n.lw = b.offsetWidth || 70;
    });
  }

  function updateLabels() {
    NODES.forEach((n, i) => {
      const el = n.el; if (!el) return;
      const a = easeOut(clamp((appear - i * 0.12) / 0.64, 0, 1));
      el.style.opacity = a.toFixed(3);
      const gap = n.size + 14;
      const side = (n.x + gap + n.lw > W - 12) ? -1 : 1;
      const lx = n.x + side * gap;
      el.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + n.y.toFixed(1) + 'px,0) translate(' + (side > 0 ? '0' : '-100%') + ',-50%)';
      el.classList.toggle('is-hover', activeNode === n);
    });
  }

  function setActive(n) {
    if (activeNode === n) return;
    activeNode = n;
    canvas.style.cursor = n && !isTouch ? 'pointer' : 'default';
    if (n) {
      ttTitle.textContent = n.title;
      ttDesc.textContent  = n.desc;
      ttCta.querySelector('span').textContent = 'Explore ' + n.label;
      tooltip.classList.add('on');
      tooltipW = tooltip.offsetWidth;
      tooltipH = tooltip.offsetHeight;
    } else {
      tooltip.classList.remove('on');
    }
  }

  function updateTooltip() {
    if (!activeNode || isTouch) return;
    const n = activeNode;
    let x = n.x + n.size + 26;
    let y = n.y - tooltipH / 2;
    if (x + tooltipW > W - 14) x = n.x - n.size - 26 - tooltipW;
    x = clamp(x, 14, Math.max(14, W - tooltipW - 14));
    y = clamp(y, 14, Math.max(14, H - tooltipH - 14));
    tooltip.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
  }

  function updateNodes() {
    for (let i = 0; i < NODES.length; i++) {
      const n = NODES[i];
      const ang    = n.angle + T * n.speed + Math.sin(T * 0.47 + i * 1.7) * 0.10 + rotOffset;
      const breathe = Math.sin(T * 0.8 + i * 2.1) * 0.035;
      const rad    = R * (n.rad + breathe);
      let x = cx + Math.cos(ang) * rad + parallax.x * (14 + i * 4);
      let y = cy + Math.sin(ang) * rad * 0.94 + parallax.y * (14 + i * 4);
      n.x = clamp(x, 34, W - 34);
      n.y = clamp(y, 34, H - 34);
    }
  }

  function updateParticles() {
    for (const p of PARTICLES) {
      const parent = NODES[p.parent];
      const a = p.angle + T * p.speed;
      p.x = parent.x + Math.cos(a) * p.dist;
      p.y = parent.y + Math.sin(a) * p.dist * 0.9;
      p.a = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(T * 1.3 + p.phase));
    }
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (appear <= 0.001) return;

    const hv = activeNode;
    const related = hv ? new Set([hv.id]) : null;
    if (hv) {
      const idx = NODES.indexOf(hv);
      NODE_LINKS.forEach(([a, b]) => {
        if (a === idx) related.add(NODES[b].id);
        if (b === idx) related.add(NODES[a].id);
      });
    }
    const nodeAlpha = (n) => { if (!related) return 1; return related.has(n.id) ? 1 : 0.22; };

    // Dashed orbit ring around the portrait centre
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(RM ? 0 : T * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, pr + 14, 0, Math.PI * 2);
    ctx.setLineDash([1.5, 7]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(28,27,26,' + (0.20 * appear) + ')';
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);

    // Particle trails
    for (const p of PARTICLES) {
      const fade = nodeAlpha(NODES[p.parent]) * appear;
      ctx.beginPath();
      ctx.moveTo(NODES[p.parent].x, NODES[p.parent].y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(28,27,26,' + (0.075 * fade) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Node-to-node links
    for (const [a, b] of NODE_LINKS) {
      const A = NODES[a], B = NODES[b];
      const hot  = hv && (hv === A || hv === B);
      const fade = Math.min(nodeAlpha(A), nodeAlpha(B));
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.strokeStyle = hot ? 'rgba(114,47,55,0.45)' : 'rgba(28,27,26,' + (0.085 * fade * appear) + ')';
      ctx.lineWidth   = hot ? 1.2 : 1;
      ctx.stroke();
    }

    // Lines from portrait edge to each node
    for (const n of NODES) {
      const dx = n.x - cx, dy = n.y - cy;
      const d  = Math.hypot(dx, dy) || 1;
      const x1 = cx + (dx / d) * (pr + 9);
      const y1 = cy + (dy / d) * (pr + 9);
      const hot  = hv === n;
      const fade = nodeAlpha(n);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = hot ? 'rgba(114,47,55,0.78)' : 'rgba(28,27,26,' + (0.115 * fade * appear) + ')';
      ctx.lineWidth   = hot ? 1.4 : 1;
      ctx.stroke();
    }

    // Particle dots
    for (const p of PARTICLES) {
      const fade = nodeAlpha(NODES[p.parent]) * appear;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(28,27,26,' + (p.a * 0.5 * fade) + ')';
      ctx.fill();
    }

    // Node dots
    for (let i = 0; i < NODES.length; i++) {
      const n  = NODES[i];
      const na = easeOut(clamp((appear - i * 0.12) / 0.64, 0, 1));
      if (na <= 0.001) continue;
      const hot  = hv === n;
      const fade = nodeAlpha(n);
      const r    = n.size * na * (hot ? 1.55 : 1);
      if (hot) {
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(114,47,55,0.085)'; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 7,  0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(114,47,55,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = hot ? 'rgba(114,47,55,1)' : 'rgba(28,27,26,' + (na * (0.55 + 0.45 * fade)) + ')';
      ctx.fill();
    }
  }

  let lastTs = 0;
  function loop(now) {
    if (!lastTs) lastTs = now;
    const dt = Math.min((now - lastTs) / 1000, 0.05); lastTs = now;
    if (!RM) T += dt;
    appear = (loaded && appearStart) ? clamp((now - appearStart) / 1200, 0, 1) : 0;

    const tpx = (pointer.active && !RM) ? pointer.nx : 0;
    const tpy = (pointer.active && !RM) ? pointer.ny : 0;
    parallax.x += (tpx - parallax.x) * 0.06;
    parallax.y += (tpy - parallax.y) * 0.06;
    rotTarget   = (pointer.active && !RM) ? pointer.nx * 0.12 : 0;
    rotOffset  += (rotTarget - rotOffset) * 0.04;

    updateNodes(); updateParticles(); draw(); updateLabels(); updateTooltip();
    requestAnimationFrame(loop);
  }

  function hitTest(x, y) {
    const pad = isTouch ? 44 : 32;
    let best = null, bestD = pad;
    for (const n of NODES) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  /* ══════════════════════════════════════════════════
     POINTER EVENTS
     ══════════════════════════════════════════════════ */
  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    pointer.x = x; pointer.y = y; pointer.active = true;
    pointer.nx = (x / W - 0.5) * 2;
    pointer.ny = (y / H - 0.5) * 2;
    if (!isTouch) setActive(hitTest(x, y));
  }, { passive: true });

  canvas.addEventListener('pointerleave', () => {
    pointer.active = false; pointer.x = -9999; pointer.y = -9999;
    if (!isTouch) setActive(null);
  });

  canvas.addEventListener('click', e => {
    if (isTouch) return;
    const rect = canvas.getBoundingClientRect();
    const hit  = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) navigate(hit.id);
  });

  let tapStart = null;
  canvas.addEventListener('pointerdown', e => { if (isTouch) tapStart = { x: e.clientX, y: e.clientY }; }, { passive: true });
  canvas.addEventListener('pointerup',   e => {
    if (!isTouch || !tapStart) return;
    const dx = e.clientX - tapStart.x, dy = e.clientY - tapStart.y;
    tapStart = null;
    if (Math.hypot(dx, dy) > 12) return;
    const rect = canvas.getBoundingClientRect();
    onNodeTap(hitTest(e.clientX - rect.left, e.clientY - rect.top));
  }, { passive: true });

  function onNodeTap(node) {
    if (!node) { setActive(null); return; }
    if (activeNode === node) { navigate(node.id); return; }
    setActive(node);
    if (navigator.vibrate) navigator.vibrate(8);
  }

  ttCta.addEventListener('click', e => { e.stopPropagation(); if (activeNode) navigate(activeNode.id); });

  /* ══════════════════════════════════════════════════
     PAGE NAVIGATION & RENDERING
     ══════════════════════════════════════════════════ */
  function navigate(id) {
    if (pageOpen) return;
    if (id === 'home') { goBack(); return; }

    const isReading = id === 'reading';
    const data = PAGES[id];
    if (!isReading && !data) return;

    pageOpen = true;
    setActive(null);

    const n    = NODES.find(x => x.id === id);
    const rect = canvas.getBoundingClientRect();
    const x    = n ? rect.left + n.x : window.innerWidth  / 2;
    const y    = n ? rect.top  + n.y : window.innerHeight / 2;
    openOrigin = { x, y };

    if (isReading) {
      page.classList.add('reading-mode');
      pageInner.innerHTML = `
        <button class="page-back" onclick="goBack()">← Back to the network</button>
        <div class="reading-header">
          <h1 class="page-title">The Shelf.</h1>
          <p class="page-desc">Books I am reading, books I have read, and ideas I come across along the way.</p>
        </div>
        <section id="currentSection" class="current-reading"></section>
        <section>
          <div class="reading-section-header">
            <h2>Books I have read</h2>
            <button class="add-btn" id="openAddModal">+ Add a book</button>
          </div>
          <div class="book-grid" id="readGrid"></div>
        </section>
      `;
      renderBooks();
    } else {
      page.classList.remove('reading-mode');
      pageInner.innerHTML = `
        <button class="page-back" onclick="goBack()">← Back to the network</button>
        <p class="page-kicker">${data.kicker}</p>
        <h2 class="page-title">${data.title}</h2>
        <p class="page-desc">${data.desc}</p>
        <ul class="page-items">${data.items.map(t => '<li>' + t + '</li>').join('')}</ul>
      `;
    }

    history.replaceState(null, '', '#' + id);
    document.body.classList.add('page-open');

    page.hidden = false;
    page.classList.remove('is-open');

    page.style.transition = 'none';
    page.style.clipPath = 'circle(0px at ' + x + 'px ' + y + 'px)';
    page.style.webkitClipPath = 'circle(0px at ' + x + 'px ' + y + 'px)';
    void page.offsetWidth;
    page.style.transition = '';

    const maxR = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 80;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!pageOpen) return;
        page.classList.add('is-open');
        page.style.clipPath = 'circle(' + maxR + 'px at ' + x + 'px ' + y + 'px)';
        page.style.webkitClipPath = 'circle(' + maxR + 'px at ' + x + 'px ' + y + 'px)';
      });
    });

    setTimeout(() => {
      if (pageOpen) {
        const backBtn = page.querySelector('.page-back');
        if (backBtn) backBtn.focus({ preventScroll: true });
      }
    }, RM ? 0 : 460);
  }

  window.goBack = function () {
    if (!pageOpen) return;
    pageOpen = false;

    page.classList.remove('is-open');
    document.body.classList.remove('page-open');

    const o = openOrigin || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    page.style.clipPath = 'circle(0px at ' + o.x + 'px ' + o.y + 'px)';
    page.style.webkitClipPath = 'circle(0px at ' + o.x + 'px ' + o.y + 'px)';

    setTimeout(() => { if (!pageOpen) page.hidden = true; }, RM ? 20 : 980);

    history.replaceState(null, '', location.pathname);
    if (lastFocusedNode && lastFocusedNode.el) lastFocusedNode.el.focus({ preventScroll: true });
  };

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pageOpen) goBack(); });

  document.querySelectorAll('.sr-nav a').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); navigate(a.dataset.nav); });
  });

  /* ══════════════════════════════════════════════════
     READING PAGE LOGIC
     ══════════════════════════════════════════════════ */
  window.openDetail = (id) => {
    const book = books.find(b => b.id === id);
    if (!book) return;
    document.getElementById('modalCover').src = book.cover;
    document.getElementById('modalTitle').textContent  = book.title;
    document.getElementById('modalAuthor').textContent = book.author;
    document.getElementById('detailModal').classList.add('active');
  };

  window.closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  };

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModals(); });
  });

  document.addEventListener('click', (e) => {
    if (e.target.id === 'openAddModal') {
      document.getElementById('addModal').classList.add('active');
    }
  });

  document.getElementById('addBookForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title  = document.getElementById('inputTitle').value;
    const author = document.getElementById('inputAuthor').value;
    const cover  = document.getElementById('inputCover').value || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop';
    const status = document.getElementById('inputStatus').value;
    books.push({ id: Date.now().toString(), title, author, cover, status });
    renderBooks();
    e.target.reset();
    closeModals();
  });

  function renderBooks() {
    const currentBook    = books.find(b => b.status === 'reading');
    const currentSection = document.getElementById('currentSection');

    if (currentSection) {
      if (currentBook) {
        currentSection.style.display = 'flex';
        currentSection.innerHTML = `
          <div class="current-cover" onclick="openDetail('${currentBook.id}')">
            <img src="${currentBook.cover}" alt="${currentBook.title}" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop'">
          </div>
          <div class="current-details">
            <span class="status-badge">Currently Reading</span>
            <h2 class="current-title">${currentBook.title}</h2>
            <p class="current-author">${currentBook.author}</p>
            ${currentBook.progress ? `
            <div class="progress-container">
              <div class="progress-label"><span>Progress</span><span>${currentBook.progress}%</span></div>
              <div class="progress-track"><div class="progress-fill" style="width: ${currentBook.progress}%"></div></div>
            </div>` : ''}
          </div>
        `;
      } else {
        currentSection.style.display = 'none';
      }
    }

    const readGrid = document.getElementById('readGrid');
    if (readGrid) {
      const readBooks = books.filter(b => b.status !== 'reading');
      readGrid.innerHTML = readBooks.map(book => `
        <div class="book-card" onclick="openDetail('${book.id}')">
          <div class="book-card-cover">
            <img src="${book.cover}" alt="${book.title}" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop'">
          </div>
          <h3 class="book-card-title">${book.title}</h3>
          <p class="book-card-author">${book.author}</p>
        </div>
      `).join('');
    }
  }

  /* ══════════════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════════════ */
  buildLabels(); resize();
  if ('ResizeObserver' in window) new ResizeObserver(() => resize()).observe(stage);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));

  startLoader();
  requestAnimationFrame(loop);
})();
