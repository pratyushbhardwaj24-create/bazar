import { MATERIALS, byId, planSurface, drawSurfaceBase, drawPlacements } from './textures.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const fmtSize = (m) => `${m.size[0]} × ${m.size[1]} mm`;

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

/* ---------- Toast ---------- */
const toastEl = $('[data-toast]');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
}

/* ---------- Sample-board painter (cards, swatches, tray) ---------- */
function paintBoard(canvas, mat) {
  const [tw] = mat.size;
  const boardW = Math.min(2000, Math.max(800, tw * 2.25));
  const boardH = boardW * (canvas.height / canvas.width);
  const scale = canvas.width / boardW;
  const layout = mat.size[1] / mat.size[0] >= 4 ? 'brick' : 'straight';
  const plan = planSurface(mat, [boardW, boardH], scale, layout);
  const ctx = canvas.getContext('2d');
  drawSurfaceBase(ctx, plan, '#d9d6cf');
  drawPlacements(ctx, plan, mat, plan.placements, Math.max(1.5, canvas.width / 160));
}

function boardCanvas(mat, w, h) {
  const c = document.createElement('canvas');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  paintBoard(c, mat);
  return c;
}

/* ---------- 3D room studio ---------- */
const studio = $('[data-studio]');
const swatchWrap = $('[data-swatches]');
const nowEl = $('[data-now]');
const layoutGroup = $('[data-layout-group]');
let room = null;
let surface = 'floor';
const choice = { floor: 'grigio', wall: 'fishscale' };

const fitsSurface = (m, s) => (s === 'floor' ? m.uses.includes('floor') || m.uses.includes('outdoor') : m.uses.includes('wall'));

function buildSwatches() {
  swatchWrap.innerHTML = '';
  for (const m of MATERIALS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.setAttribute('role', 'radio');
    b.dataset.id = m.id;
    b.append(boardCanvas(m, 58, 58));
    const label = document.createElement('span');
    label.textContent = m.name.replace(/ tile$| mosaic$/, '').replace('-look', '');
    b.append(label);
    b.addEventListener('click', () => choose(m.id));
    swatchWrap.append(b);
  }
  syncSwatches();
}

function syncSwatches() {
  for (const b of $$('.swatch', swatchWrap)) {
    const m = byId[b.dataset.id];
    b.hidden = !fitsSurface(m, surface);
    const on = choice[surface] === m.id;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  }
  layoutGroup.disabled = surface !== 'floor';
  const sel = $(`.swatch[data-id="${choice[surface]}"]`, swatchWrap);
  if (sel) {
    const left = sel.offsetLeft - swatchWrap.clientWidth / 2 + sel.clientWidth / 2;
    swatchWrap.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
  }
  const f = byId[choice.floor];
  const w = byId[choice.wall];
  nowEl.innerHTML = `Floor: <strong>${f.name}</strong>, ${fmtSize(f)}. Wall: <strong>${w.name}</strong>, ${fmtSize(w)}.`;
}

function choose(id, surf = surface) {
  choice[surf] = id;
  if (room) surf === 'floor' ? room.setFloor(id) : room.setWall(id);
  syncSwatches();
}

function setSurface(s) {
  surface = s;
  for (const t of $$('[data-surface]')) t.setAttribute('aria-selected', String(t.dataset.surface === s));
  syncSwatches();
}

$$('[data-surface]').forEach((t) => t.addEventListener('click', () => setSurface(t.dataset.surface)));

// arrow keys move between swatches (radio group behaviour)
swatchWrap.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
  const visible = $$('.swatch', swatchWrap).filter((b) => !b.hidden);
  const i = visible.findIndex((b) => b.dataset.id === choice[surface]);
  const next = visible[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length];
  choose(next.dataset.id);
  next.focus();
  e.preventDefault();
});

$$('input[name="layout"]').forEach((r) => r.addEventListener('change', () => room && room.setLayout(r.value)));
$$('input[name="grout"]').forEach((r) => r.addEventListener('change', () => room && room.setGrout(r.value)));
$('[data-reset-view]').addEventListener('click', () => { room && room.resetView(); studio.classList.remove('was-dragged'); });

buildSwatches();

(async () => {
  try {
    const { createRoom } = await import('./room3d.js');
    room = createRoom($('[data-room]'), { floor: choice.floor, wall: choice.wall });
    studio.classList.add('is-3d');
    const stage = $('[data-room]');
    stage.addEventListener('pointerdown', () => studio.classList.add('was-dragged'), { once: true });
  } catch (err) {
    console.warn('3D room unavailable, showing photo instead.', err);
    nowEl.textContent = 'The 3D room needs WebGL. Here is a photo of the showroom instead.';
  }
})();

/* ---------- Range ---------- */
const grid = $('[data-grid]');
let saved = new Set(store.get('maa:shortlist', []).filter((id) => byId[id]));

const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.5 6.9 4.5c2 0 3.4 1.1 4.1 2.3h2c.7-1.2 2.1-2.3 4.1-2.3 3.6 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';

for (const m of MATERIALS) {
  const li = document.createElement('li');
  li.className = 'card';
  li.dataset.uses = [m.cat, ...m.uses].join(' ');
  li.innerHTML = `
    <div class="card__face"><span class="card__size">${fmtSize(m)}</span><span class="card__glare"></span></div>
    <div class="card__body">
      <h3 class="card__name">${m.name}</h3>
      <p class="card__meta">${m.finish} finish, for ${m.uses.join(', ')}</p>
      <p class="card__note">${m.note}</p>
      <div class="card__actions">
        <button class="card__try" type="button">Try in 3D room</button>
        <button class="card__save" type="button" aria-pressed="${saved.has(m.id)}" aria-label="Save ${m.name} to shortlist">${heart}</button>
      </div>
    </div>`;
  const face = $('.card__face', li);
  face.prepend(boardCanvas(m, 300, 375));
  grid.append(li);

  $('.card__try', li).addEventListener('click', () => {
    const s = fitsSurface(m, 'floor') ? 'floor' : 'wall';
    setSurface(s);
    choose(m.id, s);
    $('#room').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    toast(`${m.name} is now on the ${s === 'floor' ? 'floor' : 'feature wall'}`);
  });
  $('.card__save', li).addEventListener('click', (e) => toggleSave(m.id, e.currentTarget));

  if (finePointer && !reduced) {
    face.addEventListener('pointermove', (e) => {
      const r = face.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      face.style.transform = `rotateY(${(x - 0.5) * 10}deg) rotateX(${(0.5 - y) * 10}deg)`;
      face.style.setProperty('--gx', `${x * 100}%`);
      face.style.setProperty('--gy', `${y * 100}%`);
    });
    face.addEventListener('pointerleave', () => { face.style.transform = ''; });
  }
}

// A closing tile that fills whatever space is left in the last row
const filler = document.createElement('li');
filler.className = 'filler';
filler.innerHTML = `<p class="filler__title">Many more designs on the showroom walls</p>
  <p>Highlighters, parking tiles, steps and risers, and bathroom sets. Come and see them in person.</p>
  <a class="btn btn--solid btn--sm" href="#visit">Plan your visit</a>`;
grid.append(filler);

function fitFiller() {
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const shown = $$('.card', grid).filter((c) => !c.hidden).length;
  const left = cols - (shown % cols);
  filler.style.gridColumn = `span ${left === 0 ? cols : left}`;
}
new ResizeObserver(fitFiller).observe(grid);

$$('[data-filters] button').forEach((b) => b.addEventListener('click', () => {
  const f = b.dataset.filter;
  $$('[data-filters] button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  for (const card of $$('.card', grid)) card.hidden = f !== 'all' && !card.dataset.uses.split(' ').includes(f);
  fitFiller();
}));

/* ---------- Shortlist ---------- */
const tray = $('[data-tray]');
const trayBody = $('[data-tray-body]');
const trayToggle = $('[data-tray-toggle]');
const trayCount = $('[data-tray-count]');

function toggleSave(id, btn) {
  saved.has(id) ? saved.delete(id) : saved.add(id);
  if (btn) btn.setAttribute('aria-pressed', String(saved.has(id)));
  store.set('maa:shortlist', [...saved]);
  renderTray(true);
  toast(saved.has(id) ? `Saved ${byId[id].name}` : `Removed ${byId[id].name}`);
}

function renderTray(bump) {
  tray.hidden = saved.size === 0;
  trayCount.textContent = saved.size;
  if (bump && !reduced) { trayCount.classList.remove('bump'); void trayCount.offsetWidth; trayCount.classList.add('bump'); }
  const list = $('[data-tray-list]');
  list.innerHTML = '';
  for (const id of saved) {
    const m = byId[id];
    const li = document.createElement('li');
    li.append(boardCanvas(m, 34, 34));
    const s = document.createElement('span');
    s.textContent = `${m.name}, ${fmtSize(m)}`;
    const x = document.createElement('button');
    x.type = 'button';
    x.setAttribute('aria-label', `Remove ${m.name}`);
    x.textContent = '×';
    x.addEventListener('click', () => {
      const cardBtn = $$('.card__save').find((b) => b.getAttribute('aria-label').includes(m.name));
      toggleSave(id, cardBtn);
    });
    li.append(s, x);
    list.append(li);
  }
  if (saved.size === 0) { trayBody.hidden = true; trayToggle.setAttribute('aria-expanded', 'false'); }
}

trayToggle.addEventListener('click', () => {
  const open = trayBody.hidden;
  trayBody.hidden = !open;
  trayToggle.setAttribute('aria-expanded', String(open));
});
$('[data-clear]').addEventListener('click', () => {
  saved = new Set();
  store.set('maa:shortlist', []);
  $$('.card__save').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  renderTray();
});
$('[data-share]').addEventListener('click', async () => {
  const lines = [...saved].map((id) => `- ${byId[id].name} (${fmtSize(byId[id])}, ${byId[id].finish})`);
  const text = `My tile shortlist for Maa Enterprises, MG Road, Aurangabad:\n${lines.join('\n')}`;
  try {
    if (navigator.share) await navigator.share({ title: 'Tile shortlist', text });
    else { await navigator.clipboard.writeText(text); toast('List copied. Paste it into WhatsApp or SMS.'); }
  } catch { /* share cancelled */ }
});
renderTray();

/* ---------- 360 showroom ---------- */
const panoEl = $('[data-pano]');
let pano = null;
const SHOP_LON = 205;
new IntersectionObserver(async ([e], obs) => {
  if (!e.isIntersecting) return;
  obs.disconnect();
  try {
    const { createPano } = await import('./pano.js');
    pano = createPano(panoEl, 'assets/photos/storefront-360.jpg', { startLon: SHOP_LON - 40 });
  } catch (err) {
    console.warn('360 view unavailable', err);
    panoEl.innerHTML = '<img src="assets/photos/storefront.jpg" alt="Front of Ganga Complex on MG Road with the NITCO board" style="width:100%;height:100%;object-fit:cover">';
  }
}, { rootMargin: '400px' }).observe(panoEl);
$('[data-pano-look]').addEventListener('click', () => pano && pano.lookAt(SHOP_LON, 4));
$$('[data-pano-zoom]').forEach((b) => b.addEventListener('click', () => pano && pano.zoom(Number(b.dataset.panoZoom))));

// photo strip: drag to scroll with a mouse
const strip = $('[data-strip]');
let sx = null;
strip.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse') return;
  sx = { x: e.clientX, left: strip.scrollLeft };
  strip.classList.add('is-dragging');
});
addEventListener('pointermove', (e) => { if (sx) strip.scrollLeft = sx.left - (e.clientX - sx.x); });
addEventListener('pointerup', () => { sx = null; strip.classList.remove('is-dragging'); });

/* ---------- Calculator ---------- */
const form = $('[data-calc]');
const mini = $('[data-mini]');
let lastMini = '';
function calc() {
  const unit = form.unit.value;
  const len = parseFloat(form.len.value) || 0;
  const wid = parseFloat(form.wid.value) || 0;
  const waste = Number(form.waste.value);
  $('[data-waste-out]').textContent = `${waste}%`;
  const [dims, perBox] = form.size.value.split('|');
  const [tw, th] = dims.split('x').map(Number);
  const areaM2 = unit === 'ft' ? len * wid * 0.092903 : len * wid;
  const tileM2 = (tw / 1000) * (th / 1000);
  const boxM2 = tileM2 * Number(perBox);
  const tiles = areaM2 > 0 ? Math.ceil((areaM2 * (1 + waste / 100)) / tileM2) : 0;
  const boxes = Math.ceil(tiles / Number(perBox));
  const sqft = areaM2 / 0.092903;
  $('[data-boxes]').textContent = boxes;
  $('[data-area]').textContent = areaM2 ? `${sqft.toFixed(0)} sq ft (${areaM2.toFixed(1)} m²)` : '–';
  $('[data-tiles]').textContent = tiles ? `${tiles} tiles` : '–';
  $('[data-covers]').textContent = boxes ? `${(boxes * boxM2 / 0.092903).toFixed(0)} sq ft` : '–';

  // tiny floor plan of the room with tiles at true proportion
  const roomW = unit === 'ft' ? len * 304.8 : len * 1000;
  const roomH = unit === 'ft' ? wid * 304.8 : wid * 1000;
  const cols = Math.min(24, Math.max(1, Math.ceil(roomW / tw)));
  const rows = Math.min(24, Math.max(1, Math.ceil(roomH / th)));
  const key = `${cols}x${rows}`;
  if (key !== lastMini && roomW && roomH) {
    lastMini = key;
    mini.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    mini.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    mini.style.aspectRatio = `${roomW} / ${roomH}`;
    mini.style.height = roomW >= roomH ? 'auto' : '92px';
    mini.style.width = roomW >= roomH ? '92px' : 'auto';
    mini.innerHTML = Array.from({ length: cols * rows }, (_, i) => `<i style="animation-delay:${Math.min(i * 8, 400)}ms"></i>`).join('');
  }
}
form.addEventListener('input', calc);
form.addEventListener('submit', (e) => e.preventDefault());
calc();

/* ---------- Opening hours (IST) ---------- */
const HOURS = { 0: [570, 1170], 1: [570, 1140], 2: [570, 1170], 3: [570, 1170], 4: [570, 1170], 5: [570, 1170], 6: [570, 1170] };
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const t12 = (m) => { const h = Math.floor(m / 60); const mm = m % 60; return `${((h + 11) % 12) + 1}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`; };

function istNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, mins: Number(get('hour')) * 60 + Number(get('minute')) };
}

function renderHours() {
  const { day, mins } = istNow();
  const [o, c] = HOURS[day];
  const open = mins >= o && mins < c;
  let msg;
  if (open) msg = `Open now, closes at ${t12(c)}`;
  else if (mins < o) msg = `Closed now, opens today at ${t12(o)}`;
  else msg = `Closed now, opens tomorrow at ${t12(HOURS[(day + 1) % 7][0])}`;
  const pill = $('[data-open-pill]');
  pill.hidden = false;
  pill.textContent = open ? 'Open now' : 'Closed now';
  pill.classList.toggle('is-closed', !open);
  const status = $('[data-open-status]');
  status.textContent = msg;
  status.classList.toggle('is-closed', !open);
  const order = [1, 2, 3, 4, 5, 6, 0];
  $('[data-hours]').innerHTML = order.map((d) => `<tr class="${d === day ? 'is-today' : ''}"><th scope="row">${DAY[d]}</th><td>${t12(HOURS[d][0])} – ${t12(HOURS[d][1])}</td></tr>`).join('');
}
renderHours();
setInterval(renderHours, 60_000);

/* ---------- Header state + active nav ---------- */
const top = $('[data-top]');
addEventListener('scroll', () => top.classList.toggle('is-scrolled', scrollY > 8), { passive: true });
const navLinks = $$('.nav a');
const sections = navLinks.map((a) => $(a.getAttribute('href')));
const navObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((s) => s && navObserver.observe(s));

/* ---------- Write a Google review: button, copy link, QR ---------- */
const REVIEW_URL = $('[data-review-link]').href;
const qrBox = $('[data-qr]');
let qrSvg = '';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

// Build the QR as our own SVG path so it uses the brand colour and scales crisply.
function qrPath(url) {
  const qr = window.qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { d, n };
}

function qrMarkup(url, { label = false } = {}) {
  const { d, n } = qrPath(url);
  const pad = 2;
  const size = n + pad * 2;
  if (!label) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code for writing a Google review"><rect width="${size}" height="${size}" fill="#fff"/><path transform="translate(${pad} ${pad})" fill="#1c2b5a" d="${d}"/></svg>`;
  }
  // printable counter card, 600 x 820 units
  const s = 440 / n;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820" viewBox="0 0 600 820">
  <rect width="600" height="820" rx="28" fill="#1c2b5a"/>
  <text x="300" y="92" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="#fff">Maa Enterprises</text>
  <text x="300" y="134" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#c8cfe4">Tiles &amp; marble, MG Road, Aurangabad</text>
  <rect x="60" y="170" width="480" height="480" rx="18" fill="#fff"/>
  <path transform="translate(80 190) scale(${s})" fill="#1c2b5a" shape-rendering="crispEdges" d="${d}"/>
  <text x="300" y="712" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="30" fill="#fff">Scan to review us on Google</text>
  <text x="300" y="760" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="#c2913e" letter-spacing="6">★★★★★</text>
</svg>`;
}

// Library is bundled locally (js/vendor), so the code is ready as soon as the page is idle.
(window.requestIdleCallback || ((f) => setTimeout(f, 200)))(async () => {
  try {
    await loadScript('js/vendor/qrcode.min.js');
    qrSvg = qrMarkup(REVIEW_URL);
    qrBox.innerHTML = qrSvg;
  } catch {
    qrBox.textContent = 'QR code could not load. Use the button instead.';
  }
});

$('[data-copy-review]').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(REVIEW_URL);
    toast('Review link copied. Paste it into WhatsApp for your customers.');
  } catch {
    prompt('Copy this link:', REVIEW_URL);
  }
});

$('[data-qr-download]').addEventListener('click', () => {
  if (!window.qrcode) { toast('QR code is still loading'); return; }
  const blob = new Blob([qrMarkup(REVIEW_URL, { label: true })], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'maa-enterprises-google-review-qr.svg';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
