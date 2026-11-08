(() => {
  'use strict';

  /* Admin mode check for book adding */
  if (window.location.search.includes('admin')) {
    document.body.classList.add('is-admin');
  }

  /* ══════════════════════════════════════════════════
     DATA & STATE
     ══════════════════════════════════════════════════ */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;
  document.documentElement.classList.add(isTouch ? 'is-touch' : 'is-desktop');
  document.getElementById('stageHint').textContent = isTouch ? 'Tap a node to explore' : 'Hover to read · Click to enter';

  const NS = 'http://www.w3.org/2000/svg';

  /* ══════════════════════════════════════════════════
     ROUTING
     ══════════════════════════════════════════════════ */
  const ROUTES = {
    home: { path: '/', label: 'Home' },
    about: { path: '/who-am-i', label: 'Who Am I?' },
    notes: { path: '/notes', label: 'Notes' },
    work: { path: '/work', label: 'Work' },
    reading: { path: '/the-shelf', label: 'The Shelf' },
    hello: { path: '/say-hello', label: 'Say Hello' }
  };

  const APP_BASE = (() => {
    try {
      const script = document.currentScript || Array.from(document.scripts).find(s => /(?:^|\/)main\.js(?:\?|$)/.test(s.src));
      if (script && script.src) {
        const dir = new URL('.', script.src).pathname;
        return dir.endsWith('/') ? dir : dir + '/';
      }
    } catch (err) { /* fall through */ }
    return '/';
  })();

  const LEGACY_HASHES = {
    '#about': 'about',
    '#work': 'work',
    '#notes': 'notes',
    '#reading': 'reading'
  };

  const slugify = value => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  function pathForRoute(id) {
    return APP_BASE.replace(/\/$/, '') + (ROUTES[id] || ROUTES.home).path;
  }

  function routeFromPath(pathname) {
    let path = pathname || '/';
    if (APP_BASE !== '/' && path.startsWith(APP_BASE)) {
      path = '/' + path.slice(APP_BASE.length);
    } else if (APP_BASE !== '/' && path === APP_BASE.slice(0, -1)) {
      path = '/';
    }
    path = path.replace(/\/+$/, '') || '/';
    return Object.keys(ROUTES).find(id => ROUTES[id].path === path) || 'home';
  }

  // 4 Orbiting Nodes (Who Am I, Work, The Shelf, Notes)
  const NODES = [
    { id: 'about', label: 'Who Am I?', angle: -1.90, rad: 0.80, speed: 0.038, size: 7.5, title: 'Who Am I?', desc: 'My story, systems thinking philosophy, background and engineering values.' },
    { id: 'work', label: 'Work', angle: -0.45, rad: 0.86, speed: -0.032, size: 8.0, title: 'Work', desc: 'Selected projects, products, architectures and experiments I have built.' },
    { id: 'reading', label: 'The Shelf', angle: 1.05, rad: 0.78, speed: 0.035, size: 7.0, title: 'The Shelf', desc: 'Books I am reading, library archive, and distilled margin notes.' },
    { id: 'notes', label: 'Notes', angle: 2.55, rad: 0.82, speed: -0.034, size: 7.0, title: 'Notes', desc: 'Writings on interaction design, dependencies, and cognitive topology.' }
  ];

  // Complete K4 graph: 4 perimeter links + 2 cross diagonals
  const NODE_LINKS = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [0, 2], [1, 3]
  ];

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

  // RICH PAGE CONTENT DATA
  const WORKS = [
    {
      title: 'Atlas — Spatial Knowledge Graph',
      role: 'Design Engineering & Architecture',
      year: '2025',
      desc: 'An associative knowledge environment exploring how documents, thoughts, and dependencies link in a high-dimensional topology.',
      tags: ['TypeScript', 'WebGL / Canvas', 'Graph Theory', 'Information Architecture']
    },
    {
      title: 'Cadence — Adaptive Feedback System',
      role: 'Systems Design & Prototyping',
      year: '2024',
      desc: 'Treating time and attention as a continuous closed-loop control system, adjusting calendar density based on cognitive friction.',
      tags: ['Interaction Design', 'State Machines', 'Design Engineering']
    },
    {
      title: 'Meridian — Token-Driven Design Framework',
      role: 'Design Systems Architecture',
      year: '2024',
      desc: 'A compositional design system grounded in harmonic ratios, mathematical spacing constraints, and fluid type scales.',
      tags: ['Design Systems', 'Tokens', 'CSS Architecture', 'Figma']
    },
    {
      title: 'Monolith — Generative Typographic Engine',
      role: 'Creative Engineering',
      year: '2023',
      desc: 'Experiments in algorithmic layout, variable font kinetics, and optical sizing rules on responsive surfaces.',
      tags: ['Creative Coding', 'Typography', 'SVG / Canvas']
    }
  ];

  const ESSAYS = [
    {
      title: 'Memory Is an Interface',
      meta: 'Essay · 6 min read',
      desc: 'Why humans remember through physical and conceptual spaces, and how software fails when it forces hierarchical folders over semantic trails.'
    },
    {
      title: 'Dependencies Are the Real Material',
      meta: 'Observation · 4 min read',
      desc: 'In software and architecture alike, you do not build with pixels or functions — you build with the contracts and coupling between them.'
    },
    {
      title: 'Second-Order Design',
      meta: 'Reflection · 5 min read',
      desc: 'Designing not just for how a product looks on day one, but for how users will adapt, bend, and subvert its rules over time.'
    },
    {
      title: 'The Topology of Taste',
      meta: 'Essay · 7 min read',
      desc: 'Good taste is not an unexplainable gift — it is a high-resolution mental map built by cataloging thousands of subtle differences.'
    }
  ];

  /* ══════════════════════════════════════════════════
     WHO AM I? — EDITORIAL JOURNEY
     To use your own photographs, add `src` (and optionally
     `alt`) to any artefact below. An empty `src` renders a
     clearly labelled placeholder.
       { label: 'Conference photograph', src: 'images/smw-2018.jpg', alt: '...' }
     ══════════════════════════════════════════════════ */
  const ABOUT_PORTRAIT = {
    src: 'https://res.cloudinary.com/ibrahimygana/image/upload/v1794010258/oi462t9x0wyopwryvfgc.jpg',
    alt: 'Portrait of Ibrahim Gana'
  };

  const ABOUT_CHAPTERS = [
    {
      num: '01',
      title: 'The Wake-up Call',
      tag: '2018 · Social Media Week Lagos',
      intro: 'I took leave from my facilities management job to attend Social Media Week Lagos. The experience exposed me to young people doing interesting things with technology, business and creativity. I returned with a different perspective and resigned from my job.',
      artefacts: [
        { label: 'Conference photograph', src: '' },
        { label: 'Event badge or ticket', src: '' },
        { label: 'Memorabilia', src: '' }
      ]
    },
    {
      num: '02',
      title: 'A New Beginning',
      tag: 'Code Lagos',
      intro: 'At Social Media Week, I came across Code Lagos and applied. After resigning, I spent some time figuring out my next move. Then an email arrived inviting me to begin the programme. I returned to Lagos and started learning to code.',
      artefacts: [
        { label: 'Code Lagos photograph', src: '' },
        { label: 'Computer and code snippet', src: '' },
        { label: 'Early learning material', src: '' }
      ]
    },
    {
      num: '03',
      title: 'Learning and Sharing',
      tag: 'From learning to teaching',
      intro: 'I started teaching others to code, including blind learners. This was an important part of my journey from being a student to helping other people access technology.',
      artefacts: [
        { label: 'Teaching photograph', src: '' },
        { label: 'Workshop or learning session', src: '' },
        { label: 'Community moment', src: '' }
      ]
    },
    {
      num: '04',
      title: 'Building a Startup',
      tag: 'Stylebitt',
      intro: 'I moved from learning about technology to building with it. Through Stylebitt, I worked on using technology to solve practical problems in the fashion industry.',
      artefacts: [
        { label: 'Stylebitt interface', src: '' },
        { label: 'Team photograph', src: '' },
        { label: 'Fashion production artefact', src: '' }
      ]
    },
    {
      num: '05',
      title: 'Exploring Artificial Intelligence',
      tag: 'AI Saturdays Lagos → TRI AI',
      intro: 'My journey into technology continued into artificial intelligence. I joined AI Saturdays Lagos, which has since become TRI AI, and became involved in building a learning and research community around AI.',
      artefacts: [
        { label: 'TRI AI community photograph', src: '' },
        { label: 'Event or cohort', src: '' },
        { label: 'Project or learning material', src: '' }
      ]
    },
    {
      num: '06',
      title: 'Still Becoming',
      tag: 'Present day',
      intro: 'I continue to explore the intersections of design, technology, systems thinking, research and building.',
      artefacts: [
        { label: 'Current portrait', src: '' },
        { label: 'Workspace, books or sketches', src: '' },
        { label: 'Current project', src: '' }
      ]
    }
  ];

  // READING PAGE DATA
  let books = [
    {
      id: '1',
      title: 'On Writing Well',
      author: 'William Zinsser',
      cover: 'https://covers.openlibrary.org/b/isbn/9780060891541-L.jpg',
      status: 'reading',
      progress: 65,
      takeaway: 'Clutter is the disease of writing. Simplify, prune every word that serves no function, and let the underlying idea breathe.'
    },
    {
      id: '2',
      title: 'Moonwalking with Einstein',
      author: 'Joshua Foer',
      cover: 'https://covers.openlibrary.org/b/isbn/9780143120537-L.jpg',
      status: 'read',
      takeaway: 'Memory is an architecture. The more we know, the more hooks we have to hang new knowledge upon.'
    },
    {
      id: '3',
      title: 'Secrets of Mental Math',
      author: 'Arthur Benjamin',
      cover: 'https://covers.openlibrary.org/b/isbn/9780307338402-L.jpg',
      status: 'read',
      takeaway: 'Math is pattern recognition and modular representation. When you understand the symmetry of numbers, calculation dissolves.'
    },

  ];

  const BOOKS_KEY = 'ibrahim-gana:shelf';
  try {
    const savedBooks = JSON.parse(localStorage.getItem(BOOKS_KEY) || 'null');
    if (Array.isArray(savedBooks) && savedBooks.length) books = savedBooks;
  } catch (err) { /* keep the default shelf */ }

  function saveBooks() {
    try { localStorage.setItem(BOOKS_KEY, JSON.stringify(books)); } catch (err) { /* storage unavailable */ }
  }

  /* ══════════════════════════════════════════════════
     DOM ELEMENTS
     ══════════════════════════════════════════════════ */
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('network');
  const ctx = canvas.getContext('2d');
  const labelsEl = document.getElementById('labels');
  const portrait = document.querySelector('.portrait');
  const tooltip = document.getElementById('tooltip');
  const ttTitle = document.getElementById('ttTitle');
  const ttDesc = document.getElementById('ttDesc');
  const ttCta = document.getElementById('ttCta');
  const loader = document.getElementById('loader');
  const countEl = document.getElementById('count');
  const ruleEl = document.getElementById('rule');
  const page = document.getElementById('page');
  const pageInner = document.getElementById('pageInner');
  const homeView = document.getElementById('homeView');
  const skipLink = document.getElementById('skipLink');

  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, pr = 0, R = 0, T = 0;
  let appear = 0, appearStart = 0, loaded = false;
  let activeNode = null, tooltipW = 240, tooltipH = 120;
  let currentRoute = null, lastFocusedNode = null;
  let pointer = { x: -9999, y: -9999, active: false, nx: 0, ny: 0 };
  let parallax = { x: 0, y: 0 }, rotOffset = 0, rotTarget = 0;

  /* ══════════════════════════════════════════════════
     LOADER LOGIC
     ══════════════════════════════════════════════════ */
  const markLinks = document.getElementById('loaderLinks');
  const markDots = document.getElementById('loaderDots');
  const LINES = [], DOTS = [];

  (function buildMark() {
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3 - Math.PI / 2;
      const x = 60 + Math.cos(a) * 40;
      const y = 60 + Math.sin(a) * 40;
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', 60); line.setAttribute('y1', 60);
      line.setAttribute('x2', x); line.setAttribute('y2', y);
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
    const duration = RM ? 160 : 1200;
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
    }, RM ? 0 : 240);
  }

  /* ══════════════════════════════════════════════════
     NETWORK LOGIC
     ══════════════════════════════════════════════════ */
  function resize() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    DPR = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    cx = W / 2; cy = H / 2;
    pr = (portrait.getBoundingClientRect().width / 2) || (W < 500 ? 44 : 54);
    R = W < 500
      ? Math.max(pr + 42, Math.min(W * 0.35, H * 0.36))
      : Math.min(W * 0.42, H * 0.44);
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
      b.addEventListener('blur', () => { if (!isTouch && activeNode === n) setActive(null); });
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

      // Position label away from center towards outer edges
      let side = 1;
      if (n.x > cx) {
        side = (n.x + gap + n.lw > W - 12) ? -1 : 1;
      } else {
        side = (n.x - gap - n.lw < 12) ? 1 : -1;
      }
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
      ttDesc.textContent = n.desc;
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
      const ang = n.angle + T * n.speed + Math.sin(T * 0.47 + i * 1.7) * 0.10 + rotOffset;
      const breathe = Math.sin(T * 0.8 + i * 2.1) * 0.035;
      const rad = R * (n.rad + breathe);
      let x = cx + Math.cos(ang) * rad + parallax.x * (14 + i * 4);
      let y = cy + Math.sin(ang) * rad * 0.94 + parallax.y * (14 + i * 4);
      n.x = clamp(x, 28, W - 28);
      n.y = clamp(y, 28, H - 28);
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

    // Dashed orbit ring around portrait centre
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
      const hot = hv && (hv === A || hv === B);
      const fade = Math.min(nodeAlpha(A), nodeAlpha(B));
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.strokeStyle = hot ? 'rgba(114,47,55,0.45)' : 'rgba(28,27,26,' + (0.085 * fade * appear) + ')';
      ctx.lineWidth = hot ? 1.2 : 1;
      ctx.stroke();
    }

    // Lines from portrait edge to each node
    for (const n of NODES) {
      const dx = n.x - cx, dy = n.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const x1 = cx + (dx / d) * (pr + 9);
      const y1 = cy + (dy / d) * (pr + 9);
      const hot = hv === n;
      const fade = nodeAlpha(n);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = hot ? 'rgba(114,47,55,0.78)' : 'rgba(28,27,26,' + (0.115 * fade * appear) + ')';
      ctx.lineWidth = hot ? 1.4 : 1;
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
      const n = NODES[i];
      const na = easeOut(clamp((appear - i * 0.12) / 0.64, 0, 1));
      if (na <= 0.001) continue;
      const hot = hv === n;
      const fade = nodeAlpha(n);
      const r = n.size * na * (hot ? 1.55 : 1);
      if (hot) {
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(114,47,55,0.085)'; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 7, 0, Math.PI * 2);
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
    if (!RM) T += dt * (isTouch ? (activeNode ? 0 : 0.55) : 1);
    appear = (loaded && appearStart) ? clamp((now - appearStart) / 1200, 0, 1) : 0;

    const canParallax = pointer.active && !RM && !isTouch;
    const tpx = canParallax ? pointer.nx : 0;
    const tpy = canParallax ? pointer.ny : 0;
    parallax.x += (tpx - parallax.x) * 0.06;
    parallax.y += (tpy - parallax.y) * 0.06;
    rotTarget = canParallax ? pointer.nx * 0.12 : 0;
    rotOffset += (rotTarget - rotOffset) * 0.04;

    if (currentRoute === 'home' && !document.hidden) {
      updateNodes(); updateParticles(); draw(); updateLabels(); updateTooltip();
    }
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
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) navigate(hit.id);
  });

  let tapStart = null;
  canvas.addEventListener('pointerdown', e => { if (isTouch) tapStart = { x: e.clientX, y: e.clientY }; }, { passive: true });
  canvas.addEventListener('pointerup', e => {
    if (!isTouch || !tapStart) return;
    const dx = e.clientX - tapStart.x, dy = e.clientY - tapStart.y;
    tapStart = null;
    pointer.active = false;
    if (Math.hypot(dx, dy) > 12) return;
    const rect = canvas.getBoundingClientRect();
    onNodeTap(hitTest(e.clientX - rect.left, e.clientY - rect.top));
  }, { passive: true });
  canvas.addEventListener('pointercancel', () => { tapStart = null; pointer.active = false; }, { passive: true });

  function onNodeTap(node) {
    if (!node) { setActive(null); return; }
    if (activeNode === node) { navigate(node.id); return; }
    setActive(node);
    if (navigator.vibrate) navigator.vibrate(8);
  }

  ttCta.addEventListener('click', e => { e.stopPropagation(); if (activeNode) navigate(activeNode.id); });

  /* ══════════════════════════════════════════════════
     WHO AM I? — RENDERING & INTERACTIONS
     ══════════════════════════════════════════════════ */
  let aboutRail = null;
  let aboutRevealObserver = null;

  function aboutMedia(art) {
    const hasSrc = !!art.src;
    const inner = hasSrc
      ? `<img src="${escapeHtml(art.src)}" alt="${escapeHtml(art.alt || art.label)}" loading="lazy" decoding="async">`
      : `<div class="media-placeholder"><span class="media-plus" aria-hidden="true">+</span><span class="media-note">Image placeholder</span></div>`;
    return `
      <figure class="about-media${hasSrc ? '' : ' is-placeholder'}" data-reveal>
        <div class="about-media-frame">${inner}</div>
        <figcaption><span>${escapeHtml(art.label)}</span>${hasSrc ? '' : '<span class="media-replace">Replace</span>'}</figcaption>
      </figure>`;
  }

  function aboutChapterHTML(ch) {
    const detailsId = 'aboutDetails' + ch.num;
    const primary = ch.artefacts[0];
    const rest = ch.artefacts.slice(1);
    return `
      <li class="about-chapter">
        <span class="about-chapter-dot" aria-hidden="true"></span>
        <button class="about-chapter-head" id="aboutChapter${ch.num}" type="button" aria-expanded="false" aria-controls="${detailsId}">
          <span class="about-chapter-num">${ch.num}</span>
          <span class="about-chapter-heading">
            <span class="about-chapter-title">${escapeHtml(ch.title)}</span>
            <span class="about-chapter-tag">${escapeHtml(ch.tag)}</span>
          </span>
          <span class="about-chapter-toggle" aria-hidden="true">
            <span class="about-chapter-toggle-label">Explore</span>
            <span class="about-chapter-plus"></span>
          </span>
        </button>
        <div class="about-chapter-body">
          <div class="about-chapter-text">
            <p class="about-chapter-intro">${escapeHtml(ch.intro)}</p>
            <div class="about-chapter-details" id="${detailsId}" role="region" aria-labelledby="aboutChapter${ch.num}" inert>
              <div class="about-chapter-details-inner">
                <div class="about-media-grid">${rest.map(aboutMedia).join('')}</div>
              </div>
            </div>
          </div>
          <div class="about-chapter-media">${aboutMedia(primary)}</div>
        </div>
      </li>`;
  }

  function aboutPortraitHTML() {
    const hasSrc = !!ABOUT_PORTRAIT.src;
    const inner = hasSrc
      ? `<img src="${escapeHtml(ABOUT_PORTRAIT.src)}" alt="${escapeHtml(ABOUT_PORTRAIT.alt)}" decoding="async">`
      : `<div class="media-placeholder"><span class="media-plus" aria-hidden="true">+</span><span class="media-note">Portrait placeholder</span></div>`;
    return `
      <figure class="about-portrait-figure" data-reveal>
        <div class="about-media-frame about-portrait-frame${hasSrc ? '' : ' is-placeholder'}">${inner}</div>
        ${hasSrc ? '' : '<figcaption><span>Portrait</span><span class="media-replace">Replace</span></figcaption>'}
      </figure>`;
  }

  function renderAboutPage() {
    return `
      <button class="page-back" onclick="goBack()">← Back to the network</button>

      <header class="about-intro">
        <div class="about-identity">
          <p class="page-kicker">01 — Who Am I?</p>
          <h1 class="about-title">Who Am I?</h1>
          <div class="about-identity-block">
            <h2 class="about-name">Ibrahim Gana</h2>
            <p class="roles about-roles">Design Engineer · Systems Thinker · Builder</p>
          </div>
          <p class="about-lede">I build at the intersection of design, technology, research, and systems thinking. I am interested in how things work, how ideas connect, and how different disciplines come together to shape what we create.</p>
        </div>
        ${aboutPortraitHTML()}
      </header>

      <div class="about-connector" aria-hidden="true">
        <svg viewBox="0 0 160 140" preserveAspectRatio="xMidYMid meet">
          <path class="connector-line" d="M80 0 V56 C80 92 44 92 44 140" />
          <path class="connector-line is-accent" d="M80 0 V56 C80 92 116 92 116 140" />
          <circle cx="80" cy="4" r="3.5" />
        </svg>
      </div>

      <section class="about-journey" aria-labelledby="aboutJourneyTitle">
        <div class="about-journey-head" data-reveal>
          <p class="page-kicker">02 — The Journey</p>
          <h2 class="about-section-title" id="aboutJourneyTitle">A life in <em>connections.</em></h2>
        </div>
        <div class="about-journey-track" id="aboutJourneyTrack">
          <div class="about-rail" aria-hidden="true"><div class="about-rail-fill" id="aboutRailFill"></div></div>
          <ol class="about-chapters">
            ${ABOUT_CHAPTERS.map(aboutChapterHTML).join('')}
          </ol>
        </div>
      </section>

      <section class="about-closing" aria-labelledby="aboutClosingTitle">
        <h2 class="about-closing-quote" id="aboutClosingTitle">Eventually, <em>everything</em> connects.</h2>
        <p class="about-closing-text">What started as a decision to attend a conference became a journey through technology, teaching, entrepreneurship and research. I am still exploring. Still learning. Still building.</p>
      </section>
    `;
  }

  function updateAboutRail() {
    if (!aboutRail) return;
    const rect = aboutRail.track.getBoundingClientRect();
    const focus = window.innerHeight * 0.55;
    const p = clamp((focus - rect.top) / Math.max(rect.height, 1), 0, 1);
    aboutRail.fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
  }

  function initAboutPage() {
    const track = document.getElementById('aboutJourneyTrack');
    const fill = document.getElementById('aboutRailFill');
    aboutRail = (track && fill) ? { track, fill } : null;
    updateAboutRail();

    page.querySelectorAll('.about-chapter-head').forEach(btn => {
      btn.addEventListener('click', () => {
        const chapter = btn.closest('.about-chapter');
        const details = chapter.querySelector('.about-chapter-details');
        const open = !chapter.classList.contains('is-open');
        chapter.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (details) details.inert = !open;
        const label = btn.querySelector('.about-chapter-toggle-label');
        if (label) label.textContent = open ? 'Close' : 'Explore';
      });
    });

    if (aboutRevealObserver) aboutRevealObserver.disconnect();
    const reveals = page.querySelectorAll('[data-reveal]');
    if (!RM && 'IntersectionObserver' in window) {
      aboutRevealObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            aboutRevealObserver.unobserve(entry.target);
          }
        }
      }, { root: null, threshold: 0.12 });
      reveals.forEach(el => aboutRevealObserver.observe(el));
    } else {
      reveals.forEach(el => el.classList.add('is-revealed'));
    }
  }

  let aboutRailRaf = 0;
  window.addEventListener('scroll', () => {
    if (!aboutRail || aboutRailRaf) return;
    aboutRailRaf = requestAnimationFrame(() => { aboutRailRaf = 0; updateAboutRail(); });
  }, { passive: true });
  window.addEventListener('resize', () => { if (aboutRail) updateAboutRail(); });

  /* ══════════════════════════════════════════════════
     PAGE NAVIGATION & RENDERING
     ══════════════════════════════════════════════════ */
  const PAGE_TITLES = {
    home: 'Ibrahim Gana — Eventually, everything connects',
    about: 'Who Am I? — Ibrahim Gana',
    notes: 'Notes — Ibrahim Gana',
    work: 'Work — Ibrahim Gana',
    reading: 'The Shelf — Ibrahim Gana',
    hello: 'Say Hello — Ibrahim Gana'
  };

  const workSlug = work => slugify(work.title);
  const noteSlug = note => slugify(note.title);
  const findWork = slug => WORKS.find(w => workSlug(w) === slug);
  const findNote = slug => ESSAYS.find(n => noteSlug(n) === slug);

  function updateNav(id) {
    if (skipLink) skipLink.setAttribute('href', id === 'home' ? '#homeView' : '#page');
  }

  const BOTTOM_NAV_ITEMS = [
    { route: 'about', label: 'Who Am I?' },
    { route: 'notes', label: 'Notes' },
    { route: 'work', label: 'Work' },
    { route: 'reading', label: 'The Shelf' },
    { route: 'hello', label: 'Say Hello' }
  ];

  function bottomNavHTML(activeRoute) {
    return `
      <div class="page-nav">
        <nav class="about-closing-links" aria-label="Page navigation">
          ${BOTTOM_NAV_ITEMS.map(item => `
            <a href="${pathForRoute(item.route)}" data-route="${item.route}"${item.route === activeRoute ? ' aria-current="page"' : ''}>${item.label} <span class="closing-arrow" aria-hidden="true">↗</span></a>
          `).join('')}
        </nav>
      </div>
    `;
  }

  function detailForRoute(route) {
    const params = new URLSearchParams(window.location.search);
    if (route === 'work') return params.get('work');
    if (route === 'notes') return params.get('note');
    return null;
  }

  function routeUrl(route, detail) {
    const key = route === 'work' ? 'work' : route === 'notes' ? 'note' : null;
    return pathForRoute(route) + (key && detail ? '?' + key + '=' + encodeURIComponent(detail) : '');
  }

  function renderWorkIndex() {
    return `
      <button class="page-back" type="button" onclick="goBack()">← Back to the network</button>
      <header class="route-head">
        <p class="page-kicker">02 — Selected Works</p>
        <h1 class="page-title">Things I have built</h1>
        <p class="page-desc">Systems, interaction models, and tools described by their architecture, constraints, and outcomes.</p>
      </header>
      <div class="work-list">
        ${WORKS.map(work => `
          <article class="work-item">
            <button class="work-open" type="button" onclick="openWork('${workSlug(work)}')" aria-label="Open ${escapeHtml(work.title)}">
              <span class="work-year" aria-hidden="true">${escapeHtml(work.year)}</span>
              <span class="work-copy">
                <span class="work-header">
                  <span class="work-name">${escapeHtml(work.title)}</span>
                  <span class="work-meta">${escapeHtml(work.role)}</span>
                </span>
                <span class="work-desc">${escapeHtml(work.desc)}</span>
                <span class="work-tags">
                  ${work.tags.map(tag => `<span class="work-tag">${escapeHtml(tag)}</span>`).join('')}
                </span>
                <span class="work-action">View project <span aria-hidden="true">→</span></span>
              </span>
            </button>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderWorkDetail(work) {
    return `
      <button class="page-back" type="button" onclick="closeWorkDetail()">← All work</button>
      <article class="detail-page">
        <header class="route-head">
          <p class="page-kicker">Selected Work · ${escapeHtml(work.year)}</p>
          <h1 class="page-title detail-title">${escapeHtml(work.title)}</h1>
          <p class="detail-lede">${escapeHtml(work.desc)}</p>
        </header>
        <dl class="detail-meta">
          <div><dt>Role</dt><dd>${escapeHtml(work.role)}</dd></div>
          <div><dt>Year</dt><dd>${escapeHtml(work.year)}</dd></div>
        </dl>
        <div class="detail-tags">
          ${work.tags.map(tag => `<span class="work-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="detail-mark" aria-hidden="true">
          <span>${escapeHtml(work.year)}</span>
          <span>${escapeHtml(work.title.split('—')[0].trim())}</span>
        </div>
      </article>
    `;
  }

  function renderNotesIndex() {
    return `
      <button class="page-back" type="button" onclick="goBack()">← Back to the network</button>
      <header class="route-head">
        <p class="page-kicker">04 — Writings</p>
        <h1 class="page-title">Notes &amp; Reflections</h1>
        <p class="page-desc">Connecting ideas across design, cognitive models, system dependencies, and building on the web.</p>
      </header>
      <div class="notes-list">
        ${ESSAYS.map(note => `
          <article class="note-item">
            <button class="note-open" type="button" onclick="openNote('${noteSlug(note)}')" aria-label="Read ${escapeHtml(note.title)}">
              <span class="note-meta">${escapeHtml(note.meta)}</span>
              <span class="note-title">${escapeHtml(note.title)}</span>
              <span class="note-desc">${escapeHtml(note.desc)}</span>
              <span class="note-action">Read note <span aria-hidden="true">→</span></span>
            </button>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderNoteDetail(note) {
    return `
      <button class="page-back" type="button" onclick="closeNoteDetail()">← All notes</button>
      <article class="article-page">
        <header class="route-head">
          <p class="page-kicker">${escapeHtml(note.meta)}</p>
          <h1 class="page-title article-title">${escapeHtml(note.title)}</h1>
        </header>
        <p class="article-lede">${escapeHtml(note.desc)}</p>
        <div class="article-rule" aria-hidden="true"></div>
        <p class="article-note">This note is part of the working archive. Longer-form versions are published as they are ready.</p>
        <div class="article-end">
          <span>Ibrahim Gana</span>
          <button type="button" onclick="closeNoteDetail()">Back to all notes <span aria-hidden="true">↗</span></button>
        </div>
      </article>
    `;
  }

  function renderShelfPage() {
    return `
      <button class="page-back" type="button" onclick="goBack()">← Back to the network</button>
      <header class="reading-header route-head">
        <p class="page-kicker">03 — Library</p>
        <h1 class="page-title">The Shelf.</h1>
        <p class="page-desc">Books that shaped how I think about craft, systems, and cognition. Currently reading and selected library additions.</p>
      </header>
      <section id="currentSection" class="current-reading" aria-label="Currently reading"></section>
      <section class="shelf-section">
        <div class="reading-section-header">
          <h2>Read</h2>
          <button class="add-btn" id="openAddModal" type="button">+ Add a book</button>
        </div>
        <div class="book-grid" id="readGrid"></div>
      </section>
      <section class="shelf-section">
        <div class="reading-section-header">
          <h2>Want to Read</h2>
        </div>
        <div class="book-grid" id="wantGrid"></div>
      </section>
    `;
  }

  function renderHelloPage() {
    return `
      <div class="hello-layout">
        <div class="hello-copy">
          <p class="page-kicker">05 — Contact</p>
          <h1 class="page-title">Say Hello.</h1>
          <p class="page-desc">For collaborations, questions, or just a good conversation, send a note. I read everything that arrives with care.</p>
          <a class="hello-email" href="mailto:ibrahim@tri-ai.org">ibrahim@tri-ai.org <span aria-hidden="true">↗</span></a>
        </div>
        <form class="hello-form" id="helloForm">
          <div class="form-group">
            <label for="helloName">Name</label>
            <input id="helloName" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="form-group">
            <label for="helloEmail">Email</label>
            <input id="helloEmail" name="email" type="email" autocomplete="email" required>
          </div>
          <div class="form-group">
            <label for="helloMessage">Message</label>
            <textarea id="helloMessage" name="message" rows="5" required></textarea>
          </div>
          <button class="form-submit" type="submit">Open email draft <span aria-hidden="true">↗</span></button>
        </form>
      </div>
    `;
  }

  function initHelloForm() {
    const form = document.getElementById('helloForm');
    if (!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('helloName').value.trim();
      const email = document.getElementById('helloEmail').value.trim();
      const message = document.getElementById('helloMessage').value.trim();
      const subject = 'Hello from ' + (name || 'your site');
      const body = message + (name || email ? '\n\n— ' + name + (email ? ' (' + email + ')' : '') : '');
      window.location.href = 'mailto:ibrahim@tri-ai.org?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  function renderRoute(id, options = {}) {
    const route = ROUTES[id] ? id : 'home';
    const detail = options.detail || null;
    const isHome = route === 'home';
    const previous = currentRoute;

    if (!options.initial) {
      if (options.replace) {
        history.replaceState({ route, detail }, '', routeUrl(route, detail));
      } else if (options.push !== false) {
        history.pushState({ route, detail }, '', routeUrl(route, detail));
      }
    }

    currentRoute = route;

    document.body.classList.toggle('page-open', !isHome);
    if (homeView) homeView.hidden = !isHome;
    if (page) page.hidden = isHome;
    if (page) page.dataset.current = route;
    updateNav(route);

    if (isHome) {
      if (page) {
        page.classList.remove('is-open');
        page.classList.remove('about-mode', 'reading-mode', 'work-mode', 'notes-mode', 'hello-mode');
      }
      pageInner.innerHTML = '';
      aboutRail = null;
      setActive(null);
      closeModals();
      document.title = PAGE_TITLES.home;
      window.scrollTo(0, 0);
      if (previous && previous !== 'home') homeView.focus({ preventScroll: true });
      requestAnimationFrame(() => resize());
      return;
    }

    closeModals();
    setActive(null);
    if (route !== 'about') aboutRail = null;

    page.classList.remove('is-open');
    page.classList.toggle('about-mode', route === 'about');
    page.classList.toggle('reading-mode', route === 'reading');
    page.classList.toggle('work-mode', route === 'work');
    page.classList.toggle('notes-mode', route === 'notes');
    page.classList.toggle('hello-mode', route === 'hello');

    let work = null;
    let note = null;
    if (route === 'work') work = findWork(detail);
    if (route === 'notes') note = findNote(detail);

    let title = PAGE_TITLES[route];
    if (work) title = work.title + ' — Ibrahim Gana';
    if (note) title = note.title + ' — Ibrahim Gana';
    document.title = title;

    if (route === 'about') {
      pageInner.innerHTML = renderAboutPage();
    } else if (route === 'work') {
      pageInner.innerHTML = work ? renderWorkDetail(work) : renderWorkIndex();
    } else if (route === 'notes') {
      pageInner.innerHTML = note ? renderNoteDetail(note) : renderNotesIndex();
    } else if (route === 'reading') {
      pageInner.innerHTML = renderShelfPage();
    } else if (route === 'hello') {
      pageInner.innerHTML = renderHelloPage();
    }
    pageInner.insertAdjacentHTML('beforeend', bottomNavHTML(route));

    window.scrollTo(0, 0);
    if (route === 'about') initAboutPage();
    if (route === 'reading') renderBooks();
    if (route === 'hello') initHelloForm();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (currentRoute !== route) return;
        page.classList.add('is-open');
        if (route === 'about') updateAboutRail();
      });
    });

    if (!options.initial) {
      setTimeout(() => {
        if (currentRoute === route && page) page.focus({ preventScroll: true });
      }, RM ? 0 : 60);
    }
  }

  function navigate(id, options = {}) {
    const route = ROUTES[id] ? id : 'home';
    if (route === currentRoute && !options.detail && !detailForRoute(route)) {
      window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
      return;
    }
    renderRoute(route, options);
  }

  window.goToPage = function (id) { navigate(id); };
  window.openWork = function (slug) { navigate('work', { detail: slug }); };
  window.closeWorkDetail = function () { navigate('work'); };
  window.openNote = function (slug) { navigate('notes', { detail: slug }); };
  window.closeNoteDetail = function () { navigate('notes'); };
  window.goBack = function () { if (currentRoute !== 'home') navigate('home'); };

  pageInner.addEventListener('click', event => {
    const link = event.target.closest('.page-nav a[data-route]');
    if (!link) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.dataset.route);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && currentRoute && currentRoute !== 'home') goBack();
  });

  window.addEventListener('popstate', () => {
    const route = routeFromPath(window.location.pathname);
    renderRoute(route, { push: false, detail: detailForRoute(route) });
  });

  /* ══════════════════════════════════════════════════
     READING PAGE LOGIC
     ══════════════════════════════════════════════════ */
  window.openDetail = (id) => {
    const book = books.find(b => b.id === id);
    if (!book) return;
    document.getElementById('modalCover').src = book.cover;
    document.getElementById('modalTitle').textContent = book.title;
    document.getElementById('modalAuthor').textContent = book.author;
    const takeawayEl = document.getElementById('modalTakeaway');
    if (takeawayEl) {
      takeawayEl.textContent = book.takeaway || 'A book from my reading collection. Eventually, everything connects.';
    }
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
    const title = document.getElementById('inputTitle').value;
    const author = document.getElementById('inputAuthor').value;
    const cover = document.getElementById('inputCover').value || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop';
    const status = document.getElementById('inputStatus').value;
    books.push({ id: Date.now().toString(), title, author, cover, status });
    saveBooks();
    renderBooks();
    e.target.reset();
    closeModals();
  });

  function renderBooks() {
    const currentBook = books.find(b => b.status === 'reading');
    const currentSection = document.getElementById('currentSection');

    if (currentSection) {
      if (currentBook) {
        currentSection.style.display = 'flex';
        currentSection.innerHTML = `
          <div class="current-cover" onclick="openDetail('${escapeHtml(currentBook.id)}')">
            <img src="${escapeHtml(currentBook.cover)}" alt="${escapeHtml(currentBook.title)}" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop'">
          </div>
          <div class="current-details">
            <span class="status-badge">Currently Reading</span>
            <h2 class="current-title">${escapeHtml(currentBook.title)}</h2>
            <p class="current-author">${escapeHtml(currentBook.author)}</p>
            ${currentBook.progress ? `
            <div class="progress-container">
              <div class="progress-label"><span>Progress</span><span>${currentBook.progress}%</span></div>
              <div class="progress-track"><div class="progress-fill" style="width: ${currentBook.progress}%"></div></div>
            </div>` : ''}
          </div>
        `;
      } else {
        currentSection.style.display = 'none';
        currentSection.innerHTML = '';
      }
    }

    const bookCard = book => `
      <div class="book-card" onclick="openDetail('${escapeHtml(book.id)}')">
        <div class="book-card-cover">
          <img src="${escapeHtml(book.cover)}" alt="${escapeHtml(book.title)}" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop'">
        </div>
        <h3 class="book-card-title">${escapeHtml(book.title)}</h3>
        <p class="book-card-author">${escapeHtml(book.author)}</p>
      </div>
    `;

    const readGrid = document.getElementById('readGrid');
    if (readGrid) {
      const readBooks = books.filter(b => b.status === 'read');
      readGrid.innerHTML = readBooks.length
        ? readBooks.map(bookCard).join('')
        : '<p class="shelf-empty">No books marked as read yet.</p>';
    }

    const wantGrid = document.getElementById('wantGrid');
    if (wantGrid) {
      const wantBooks = books.filter(b => b.status === 'want');
      wantGrid.innerHTML = wantBooks.length
        ? wantBooks.map(bookCard).join('')
        : '<p class="shelf-empty">Nothing queued yet. The next book will find its way here.</p>';
    }
  }

  /* ══════════════════════════════════════════════════
     LO-FI AUDIO CONTROLS
     ══════════════════════════════════════════════════ */
  const bgMusic = document.getElementById('bgMusic');
  const soundToggle = document.getElementById('soundToggle');
  const soundText = document.getElementById('soundText');
  let isAudioPlaying = false;

  if (bgMusic && soundToggle && soundText) {
    bgMusic.volume = 0.35;

    function playAudio() {
      bgMusic.play().then(() => {
        isAudioPlaying = true;
        soundToggle.classList.add('is-playing');
        soundText.textContent = 'Audio: On';
      }).catch(err => {
        console.log('Audio playback waiting for user action:', err);
      });
    }

    function pauseAudio() {
      bgMusic.pause();
      isAudioPlaying = false;
      soundToggle.classList.remove('is-playing');
      soundText.textContent = 'Audio: Off';
    }

    soundToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isAudioPlaying) {
        pauseAudio();
      } else {
        playAudio();
      }
    });

    bgMusic.addEventListener('pause', () => {
      if (!bgMusic.seeking && isAudioPlaying) {
        pauseAudio();
      }
    });
  }

  /* ══════════════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════════════ */
  function resolveInitialRoute() {
    try {
      const redirect = sessionStorage.getItem('spa:redirect');
      if (redirect) {
        sessionStorage.removeItem('spa:redirect');
        const target = new URL(redirect, window.location.origin);
        window.history.replaceState(null, '', target.pathname + target.search + target.hash);
      }
    } catch (err) { /* ignore unavailable session storage */ }

    if (LEGACY_HASHES[window.location.hash]) {
      const id = LEGACY_HASHES[window.location.hash];
      window.history.replaceState(null, '', pathForRoute(id));
      return id;
    }

    return routeFromPath(window.location.pathname);
  }

  buildLabels(); resize();
  if ('ResizeObserver' in window) new ResizeObserver(() => resize()).observe(stage);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));

  const initialRoute = resolveInitialRoute();
  renderRoute(initialRoute, { initial: true, detail: detailForRoute(initialRoute) });

  startLoader();
  requestAnimationFrame(loop);
})();
