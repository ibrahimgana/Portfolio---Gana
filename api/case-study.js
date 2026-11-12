'use strict';

const crypto = require('crypto');

const PROJECTS = {
  ubec: {
    slug: 'ubec',
    index: '01',
    name: 'UBEC',
    category: 'Digital product · System',
    lede: 'A digital product and system built for UBEC. The full case study is being written.'
  },
  syteboxx: {
    slug: 'syteboxx',
    index: '02',
    name: 'Syteboxx',
    category: 'Construction management system',
    lede: 'A construction management system. The full case study is being written.'
  },
  orbit: {
    slug: 'orbit',
    index: '03',
    name: 'Orbit',
    category: 'Internal workspace · TRI AI',
    lede: 'An internal digital workspace and navigation layer for TRI AI that brings Google Workspace tools, documents, activities and workflows into a more discoverable, organised experience.'
  }
};

const CASE_SECTIONS = [
  {
    id: 'overview',
    num: '01',
    title: 'Project overview',
    placeholder: 'A concise introduction to the project, what it is, who it serves and why it matters.'
  },
  {
    id: 'problem',
    num: '02',
    title: 'The problem',
    placeholder: 'The problem, need or opportunity that prompted the work.'
  },
  {
    id: 'context',
    num: '03',
    title: 'Context and background',
    placeholder: 'The organisational, technical and human context around the project.'
  },
  {
    id: 'role',
    num: '04',
    title: 'My role',
    placeholder: 'My responsibilities, collaborators and the boundaries of my contribution.'
  },
  {
    id: 'approach',
    num: '05',
    title: 'The approach',
    placeholder: 'How the work was framed and approached, from first principles to delivery.'
  },
  {
    id: 'research',
    num: '06',
    title: 'Research and thinking',
    placeholder: 'Research, interviews, observations and the thinking that shaped decisions.'
  },
  {
    id: 'design',
    num: '07',
    title: 'Design and implementation',
    placeholder: 'Design decisions, systems, prototypes and implementation details.'
  },
  {
    id: 'features',
    num: '08',
    title: 'Key features',
    placeholder: 'The parts of the product or system that matter most, and why.'
  },
  {
    id: 'challenges',
    num: '09',
    title: 'Challenges and decisions',
    placeholder: 'Trade-offs, constraints, challenges and the decisions made along the way.'
  },
  {
    id: 'outcomes',
    num: '10',
    title: 'Outcomes and learnings',
    placeholder: 'What changed, what was learned and what I would carry forward.'
  },
  {
    id: 'visuals',
    num: '11',
    title: 'Project visuals and screenshots',
    placeholder: 'Screenshots, mockups and artefacts will be added here.'
  }
];

const NAV_ITEMS = [
  { path: '/', label: 'Home' },
  { path: '/who-am-i', label: 'Who Am I?' },
  { path: '/featured', label: 'Featured' },
  { path: '/notes', label: 'Notes' },
  { path: '/work', label: 'Work' },
  { path: '/the-shelf', label: 'The Shelf' },
  { path: '/say-hello', label: 'Say Hello' }
];

const COOKIE_PREFIX = 'work_session_';
const DEFAULT_TTL_SECONDS = 30 * 60;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_PASSWORD_LENGTH = 1024;
const MAX_BODY_BYTES = 16 * 1024;

const attemptBuckets = new Map();

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const lockIcon = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.2" y="7" width="9.6" height="6.6" rx="1.1"></rect><path d="M5.6 7V5.3a2.4 2.4 0 0 1 4.8 0V7"></path></svg>`;

function sessionTtlSeconds() {
  const configured = Number(process.env.WORK_SESSION_TTL_SECONDS);
  if (!Number.isFinite(configured) || configured < 60) return DEFAULT_TTL_SECONDS;
  return Math.min(Math.floor(configured), 24 * 60 * 60);
}

function sessionSecret() {
  const secret = process.env.WORK_SESSION_SECRET || '';
  return secret.length >= 32 ? secret : '';
}

function passwordHashFor(project) {
  return process.env['WORK_PASSWORD_HASH_' + project.toUpperCase()] || '';
}

function isConfigured(project) {
  return Boolean(sessionSecret() && passwordHashFor(project));
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function createSessionToken(project) {
  const secret = sessionSecret();
  const payload = Buffer.from(JSON.stringify({
    project,
    issuedAt: Date.now(),
    expiresAt: Date.now() + sessionTtlSeconds() * 1000
  })).toString('base64url');
  return payload + '.' + sign(payload, secret);
}

function verifySessionToken(token, project) {
  if (!token || typeof token !== 'string') return false;
  const secret = sessionSecret();
  if (!secret) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  const expected = sign(payload, secret);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return false;

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (error) {
    return false;
  }

  if (!data || data.project !== project) return false;
  if (!Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now()) return false;
  return true;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || N < 1024 || N > 1048576) return false;
  if (!Number.isInteger(r) || r < 1 || r > 32) return false;
  if (!Number.isInteger(p) || p < 1 || p > 16) return false;

  let salt;
  let expected;
  try {
    salt = Buffer.from(parts[4], 'base64url');
    expected = Buffer.from(parts[5], 'base64url');
  } catch (error) {
    return false;
  }

  if (salt.length < 16 || salt.length > 64) return false;
  if (expected.length < 32 || expected.length > 128) return false;

  let derived;
  try {
    derived = crypto.scryptSync(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: 128 * 1024 * 1024
    });
  } catch (error) {
    return false;
  }

  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function parseCookies(header) {
  const cookies = Object.create(null);
  if (!header) return cookies;
  String(header).split(';').forEach(part => {
    const separator = part.indexOf('=');
    if (separator < 0) return;
    const name = part.slice(0, separator).trim();
    if (!name) return;
    const rawValue = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch (error) {
      cookies[name] = rawValue;
    }
  });
  return cookies;
}

function isSecureRequest(req) {
  return Boolean(process.env.VERCEL) ||
    process.env.NODE_ENV === 'production' ||
    req.headers['x-forwarded-proto'] === 'https';
}

function sessionCookie(project, token, maxAge, secure) {
  return COOKIE_PREFIX + project + '=' + token +
    '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge +
    (secure ? '; Secure' : '');
}

function clearSessionCookie(project, secure) {
  return COOKIE_PREFIX + project + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' +
    (secure ? '; Secure' : '');
}

function normalizedHost(value) {
  if (!value) return '';
  const first = String(value).split(',')[0].trim();
  if (!first) return '';
  try {
    return new URL('https://' + first).host.toLowerCase();
  } catch (error) {
    return '';
  }
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;

  let originHost;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch (error) {
    return false;
  }

  const hosts = [
    req.headers.host,
    req.headers['x-forwarded-host'],
    req.headers['x-vercel-forwarded-host']
  ];

  return hosts.some(host => normalizedHost(host) === originHost);
}

function clientKey(req, project) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const address = forwarded || (req.socket && req.socket.remoteAddress) || 'unknown';
  return project + ':' + address;
}

function pruneAttempts() {
  const now = Date.now();
  for (const [key, bucket] of attemptBuckets) {
    if (now > bucket.resetAt) attemptBuckets.delete(key);
  }
}

function isRateLimited(key) {
  const bucket = attemptBuckets.get(key);
  if (!bucket) return false;
  if (Date.now() > bucket.resetAt) {
    attemptBuckets.delete(key);
    return false;
  }
  return bucket.count >= MAX_ATTEMPTS;
}

function recordFailure(key) {
  const now = Date.now();
  let bucket = attemptBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    attemptBuckets.set(key, bucket);
  }
  bucket.count += 1;
}

function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return Promise.resolve(req.body);
    if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString('utf8'));
    if (typeof req.body === 'object') return Promise.resolve(new URLSearchParams(req.body).toString());
  }

  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function head(title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#F9F8F6">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%23722F37'/%3E%3Ccircle cx='16' cy='16' r='4' fill='%23F9F8F6'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
</head>`;
}

function bottomNavHTML() {
  return `<div class="page-nav">
    <nav class="about-closing-links" aria-label="Page navigation">
      ${NAV_ITEMS.map(item => {
        const current = item.path === '/work' ? ' aria-current="page"' : '';
        return `<a href="${item.path}"${current}>${escapeHtml(item.label)} <span class="closing-arrow" aria-hidden="true">↗</span></a>`;
      }).join('')}
    </nav>
  </div>`;
}

function shell(title, body) {
  return `${head(title)}
<body class="page-open">
  <a class="skip-link" href="#page">Skip to content</a>
  <main class="page case-mode is-open" id="page" tabindex="-1">
    <div class="page-inner">
      ${body}
      ${bottomNavHTML()}
    </div>
  </main>
  <script src="/case-study.js" defer></script>
</body>
</html>`;
}

function renderGate(project, options) {
  const error = options && options.error ? options.error : '';
  const notConfigured = Boolean(options && options.notConfigured);
  const ttlMinutes = Math.max(1, Math.round(sessionTtlSeconds() / 60));
  const ttlLabel = ttlMinutes === 1 ? '1 minute' : ttlMinutes + ' minutes';

  return shell(project.name + ' — Protected case study — Ibrahim Gana', `
    <a class="page-back" href="/work">← Selected Work</a>
    <header class="case-gate">
      <div class="case-gate-intro">
        <p class="page-kicker">Protected case study · ${escapeHtml(project.index)} / 03</p>
        <h1 class="page-title case-gate-title">${escapeHtml(project.name)}</h1>
        <p class="case-gate-category">${escapeHtml(project.category)}</p>
        <p class="case-gate-lede">${escapeHtml(project.lede)}</p>
        <p class="case-gate-lock">${lockIcon} Password protected</p>
      </div>
      <div class="case-gate-panel">
        <h2 class="case-gate-panel-title">Enter the password</h2>
        ${notConfigured ? `
          <p class="case-gate-note">This case study is protected, but its password has not been configured yet.</p>
        ` : `
          <form class="case-gate-form" method="post" action="/work/${escapeHtml(project.slug)}">
            <label class="case-field-label" for="casePassword">Password</label>
            <div class="case-password-field">
              <input id="casePassword" name="password" type="password" autocomplete="current-password" maxlength="${MAX_PASSWORD_LENGTH}" required autofocus${error ? ' aria-invalid="true" aria-describedby="casePasswordError"' : ''}>
              <button class="case-password-toggle" type="button" data-password-toggle aria-controls="casePassword" aria-pressed="false">Show</button>
            </div>
            ${error ? `<p class="case-gate-error" id="casePasswordError" role="alert">${escapeHtml(error)}</p>` : ''}
            <button class="case-gate-submit" type="submit">Open case study <span aria-hidden="true">→</span></button>
          </form>
          <p class="case-gate-hint">Access is limited to invited readers. Sessions expire after ${ttlLabel}.</p>
        `}
      </div>
    </header>
  `);
}

function renderSection(section) {
  const isVisuals = section.id === 'visuals';
  const visuals = isVisuals ? `
    <div class="case-visual-grid" aria-label="Project visual placeholders">
      ${['Interface overview', 'Key screen', 'Workflow detail', 'Supporting visual'].map(label => `
        <div class="case-visual"><span>${escapeHtml(label)}</span></div>
      `).join('')}
    </div>
  ` : '';

  const body = section.content
    ? `<div class="case-section-content">${section.content}</div>`
    : `<div class="case-placeholder">
        <span class="case-placeholder-label">Content placeholder</span>
        <p>${escapeHtml(section.placeholder)} The full case study will be added here.</p>
      </div>`;

  return `
    <section class="case-section" id="${escapeHtml(section.id)}">
      <p class="case-section-kicker">Section ${escapeHtml(section.num)}</p>
      <h2 class="case-section-title">${escapeHtml(section.title)}</h2>
      <div class="case-section-body">
        ${body}
        ${visuals}
      </div>
    </section>`;
}

function renderCaseStudy(project) {
  return shell(project.name + ' — Selected Work — Ibrahim Gana', `
    <a class="page-back" href="/work">← Selected Work</a>
    <header class="case-study-header">
      <p class="page-kicker">Selected Work · Case Study ${escapeHtml(project.index)} / 03</p>
      <h1 class="page-title case-study-title">${escapeHtml(project.name)}</h1>
      <p class="case-study-lede">${escapeHtml(project.lede)}</p>
      <div class="case-study-meta">
        <span><span class="case-meta-label">Project</span>${escapeHtml(project.name)}</span>
        <span><span class="case-meta-label">Category</span>${escapeHtml(project.category)}</span>
        <span><span class="case-meta-label">Status</span>Case study in progress</span>
      </div>
    </header>
    <div class="case-draft-note">
      <span class="case-draft-label">Draft structure</span>
      <p>This case study is password protected and its content is being written. The sections below are clearly labelled placeholders.</p>
    </div>
    <div class="case-study-layout">
      <nav class="case-toc" aria-label="Case study contents">
        <p class="case-toc-title">Contents</p>
        <ol>
          ${CASE_SECTIONS.map(section => `
            <li><a href="#${escapeHtml(section.id)}"><span class="case-toc-num">${escapeHtml(section.num)}</span><span>${escapeHtml(section.title)}</span></a></li>
          `).join('')}
        </ol>
      </nav>
      <article class="case-article">
        ${CASE_SECTIONS.map(renderSection).join('')}
        <footer class="case-study-footer">
          <span>Private case study · ${escapeHtml(project.name)}</span>
          <form class="case-lock-form" method="post" action="/work/${escapeHtml(project.slug)}">
            <input type="hidden" name="action" value="logout">
            <button type="submit">Lock case study <span aria-hidden="true">↗</span></button>
          </form>
        </footer>
      </article>
    </div>
  `);
}

function sendHtml(res, status, html) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "script-src 'self'",
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com"
  ].join('; '));
  res.end(html);
}

function sendNotFound(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end('Case study not found.');
}

module.exports = async function handler(req, res) {
  pruneAttempts();

  const url = new URL(req.url, 'http://localhost');
  const projectKey = url.searchParams.get('project') || '';
  const project = Object.prototype.hasOwnProperty.call(PROJECTS, projectKey) ? PROJECTS[projectKey] : null;
  if (!project) {
    sendNotFound(res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST');
    res.setHeader('Cache-Control', 'no-store');
    res.end('Method not allowed.');
    return;
  }

  const secure = isSecureRequest(req);
  const configured = isConfigured(project.slug);

  if (req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[COOKIE_PREFIX + project.slug];

    if (configured && verifySessionToken(token, project.slug)) {
      sendHtml(res, 200, renderCaseStudy(project));
      return;
    }

    sendHtml(res, configured ? 200 : 503, renderGate(project, { notConfigured: !configured }));
    return;
  }

  if (!isSameOrigin(req)) {
    sendHtml(res, 403, renderGate(project, { error: 'This request could not be verified. Please try again.' }));
    return;
  }

  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    sendHtml(res, 400, renderGate(project, { error: 'Something went wrong. Please try again.' }));
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    sendHtml(res, 413, renderGate(project, { error: 'Something went wrong. Please try again.' }));
    return;
  }

  const params = new URLSearchParams(body);

  if (params.get('action') === 'logout') {
    res.statusCode = 303;
    res.setHeader('Location', '/work/' + project.slug);
    res.setHeader('Set-Cookie', clearSessionCookie(project.slug, secure));
    res.setHeader('Cache-Control', 'no-store');
    res.end();
    return;
  }

  if (!configured) {
    sendHtml(res, 503, renderGate(project, { notConfigured: true }));
    return;
  }

  const key = clientKey(req, project.slug);
  if (isRateLimited(key)) {
    res.setHeader('Retry-After', String(Math.ceil(RATE_WINDOW_MS / 1000)));
    sendHtml(res, 429, renderGate(project, { error: 'Too many attempts. Please wait a few minutes and try again.' }));
    return;
  }

  const password = params.get('password') || '';
  if (!password) {
    sendHtml(res, 400, renderGate(project, { error: 'Please enter a password.' }));
    return;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    recordFailure(key);
    sendHtml(res, 401, renderGate(project, { error: 'That password is incorrect. Please try again.' }));
    return;
  }

  if (!verifyPassword(password, passwordHashFor(project.slug))) {
    recordFailure(key);
    sendHtml(res, 401, renderGate(project, { error: 'That password is incorrect. Please try again.' }));
    return;
  }

  attemptBuckets.delete(key);
  const token = createSessionToken(project.slug);
  res.statusCode = 303;
  res.setHeader('Location', '/work/' + project.slug);
  res.setHeader('Set-Cookie', sessionCookie(project.slug, token, sessionTtlSeconds(), secure));
  res.setHeader('Cache-Control', 'no-store');
  res.end();
};
