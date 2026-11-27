// Procedural tile and stone textures, drawn on canvas.
// Every material can paint one tile into a rectangle; surfaces are built
// by laying many tiles with grout in a chosen pattern.

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function speckle(ctx, x, y, w, h, r, colors, density, size = 1.2) {
  const n = Math.floor(w * h * density);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    ctx.globalAlpha = 0.25 + r() * 0.35;
    const s = size * (0.5 + r());
    ctx.fillRect(x + r() * w, y + r() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

function veins(ctx, x, y, w, h, r, { color, count, width, alpha, wander = 0.35, blur = 1 }) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (blur) ctx.filter = `blur(${blur}px)`;
  for (let v = 0; v < count; v++) {
    const steps = 40;
    let px = x + r() * w;
    let py = y - h * 0.1;
    let angle = Math.PI / 2 + (r() - 0.5) * 1.4;
    const len = Math.max(w, h) * 1.3 / steps;
    const baseW = width * (0.4 + r());
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * (0.5 + r() * 0.6);
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let i = 0; i < steps; i++) {
      angle += (r() - 0.5) * wander;
      px += Math.cos(angle) * len;
      py += Math.sin(angle) * len;
      ctx.lineTo(px, py);
    }
    ctx.lineWidth = baseW;
    ctx.stroke();
    // thin companion vein
    if (r() > 0.4) {
      ctx.globalAlpha *= 0.6;
      ctx.lineWidth = baseW * 0.35;
      ctx.translate(width * 2, 0);
      ctx.stroke();
      ctx.translate(-width * 2, 0);
    }
  }
  ctx.restore();
}

function gradientBase(ctx, x, y, w, h, a, b, r) {
  const g = ctx.createLinearGradient(x, y, x + w * r(), y + h);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function sheen(ctx, x, y, w, h, strength) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, `rgba(255,255,255,${strength})`);
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, `rgba(255,255,255,${strength * 0.4})`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

const painters = {
  statuario(ctx, x, y, w, h, r) {
    gradientBase(ctx, x, y, w, h, '#f6f5f2', '#ebe9e5', r);
    speckle(ctx, x, y, w, h, r, ['#d9d8d4', '#cfd2d6'], 0.002);
    veins(ctx, x, y, w, h, r, { color: '#8e959e', count: 3, width: Math.max(w, h) * 0.006, alpha: 0.55, blur: 1.2 });
    veins(ctx, x, y, w, h, r, { color: '#b9bec5', count: 5, width: Math.max(w, h) * 0.003, alpha: 0.5, blur: 0.6 });
  },
  grigio(ctx, x, y, w, h, r) {
    gradientBase(ctx, x, y, w, h, '#aeb7c1', '#8f9aa7', r);
    veins(ctx, x, y, w, h, r, { color: '#5c6673', count: 6, width: Math.max(w, h) * 0.012, alpha: 0.45, blur: 2.5, wander: 0.25 });
    veins(ctx, x, y, w, h, r, { color: '#c98a4b', count: 3, width: Math.max(w, h) * 0.006, alpha: 0.75, blur: 1.2, wander: 0.25 });
    veins(ctx, x, y, w, h, r, { color: '#eef1f4', count: 4, width: Math.max(w, h) * 0.003, alpha: 0.7, blur: 0.5, wander: 0.25 });
  },
  ivory(ctx, x, y, w, h, r) {
    gradientBase(ctx, x, y, w, h, '#f1ece2', '#e7e1d5', r);
    speckle(ctx, x, y, w, h, r, ['#ddd5c6', '#f8f5ef'], 0.004);
  },
  kota(ctx, x, y, w, h, r) {
    gradientBase(ctx, x, y, w, h, '#7d8a78', '#6a7666', r);
    speckle(ctx, x, y, w, h, r, ['#5a6556', '#8f9a88', '#4e5a4d'], 0.02, 1.6);
    veins(ctx, x, y, w, h, r, { color: '#55604f', count: 4, width: Math.max(w, h) * 0.01, alpha: 0.35, blur: 3, wander: 0.15 });
  },
  wood(ctx, x, y, w, h, r) {
    const vertical = h > w;
    gradientBase(ctx, x, y, w, h, '#a8764a', '#8d5f39', r);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const lines = 26;
    for (let i = 0; i < lines; i++) {
      ctx.strokeStyle = r() > 0.5 ? '#6f4626' : '#c08e5f';
      ctx.globalAlpha = 0.18 + r() * 0.25;
      ctx.lineWidth = 0.6 + r() * 1.6;
      ctx.beginPath();
      const off = r();
      for (let t = 0; t <= 1.001; t += 0.05) {
        const wob = Math.sin(t * 9 + off * 20) * 1.4;
        const a = vertical ? x + (i / lines) * w + wob : x + t * w;
        const b = vertical ? y + t * h : y + (i / lines) * h + wob;
        t === 0 ? ctx.moveTo(a, b) : ctx.lineTo(a, b);
      }
      ctx.stroke();
    }
    // a knot
    if (r() > 0.4) {
      const kx = x + w * (0.2 + r() * 0.6);
      const ky = y + h * (0.2 + r() * 0.6);
      for (let k = 6; k > 0; k--) {
        ctx.strokeStyle = '#5e3a1f';
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(kx, ky, k * (vertical ? 1.5 : 3), k * (vertical ? 3 : 1.5), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },
  terrazzo(ctx, x, y, w, h, r) {
    gradientBase(ctx, x, y, w, h, '#ebe6dd', '#e1dbd0', r);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const colors = ['#1c2b5a', '#2e7d6b', '#c2913e', '#9aa0a8', '#d7c9b3', '#b5543c'];
    const n = Math.floor((w * h) / 140);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = colors[Math.floor(r() * colors.length)];
      ctx.globalAlpha = 0.85;
      const cx = x + r() * w;
      const cy = y + r() * h;
      const s = 1.5 + r() * Math.max(w, h) * 0.018;
      ctx.beginPath();
      const sides = 4 + Math.floor(r() * 3);
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2 + r();
        const rr = s * (0.6 + r() * 0.5);
        k === 0 ? ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },
  concrete(ctx, x, y, w, h, r) {
    gradientBase(ctx, x, y, w, h, '#8f9294', '#7d8083', r);
    speckle(ctx, x, y, w, h, r, ['#6c6f72', '#a3a6a8', '#5f6265'], 0.03, 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (let i = 0; i < 6; i++) {
      const cx = x + r() * w;
      const cy = y + r() * h;
      const rad = Math.max(w, h) * (0.15 + r() * 0.3);
      const tint = r() > 0.5 ? '255,255,255' : '0,0,0';
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(${tint},0.07)`);
      g.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    ctx.restore();
  },
  fishscale(ctx, x, y, w, h, r) {
    ctx.fillStyle = '#1f6f6a';
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const cols = 4;
    const s = w / cols;
    const rows = Math.ceil(h / (s * 0.5)) + 2;
    for (let row = rows; row >= -1; row--) {
      for (let c = -1; c <= cols; c++) {
        const cx = x + c * s + (row % 2 ? s / 2 : 0) + s / 2;
        const cy = y + row * s * 0.5;
        const tone = 0.85 + r() * 0.3;
        const g = ctx.createRadialGradient(cx, cy + s * 0.15, s * 0.05, cx, cy + s * 0.2, s * 0.6);
        g.addColorStop(0, `rgb(${Math.floor(150 * tone)},${Math.floor(214 * tone)},${Math.floor(203 * tone)})`);
        g.addColorStop(1, `rgb(${Math.floor(52 * tone)},${Math.floor(140 * tone)},${Math.floor(132 * tone)})`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, s / 2 - 0.8, 0, Math.PI);
        ctx.lineTo(cx - s / 2 + 0.8, cy);
        ctx.fill();
      }
    }
    ctx.restore();
  },
  moroccan(ctx, x, y, w, h, r) {
    ctx.fillStyle = '#f3f1ea';
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const cx = x + w / 2;
    const cy = y + h / 2;
    const R = Math.min(w, h) / 2;
    ctx.fillStyle = '#1c2b5a';
    // corner quarter circles form circles when tiled
    for (const [ax, ay] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
      ctx.beginPath();
      ctx.arc(ax, ay, R * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
    // centre star from four arcs
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const rr = k % 2 ? R * 0.28 : R * 0.62;
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c2913e';
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    speckle(ctx, x, y, w, h, r, ['#ffffff'], 0.002);
  },
  makrana(ctx, x, y, w, h, r) {
    gradientBase(ctx, x, y, w, h, '#fbfaf7', '#f0eee8', r);
    speckle(ctx, x, y, w, h, r, ['#e2e0da', '#d6d9dc'], 0.006, 1.4);
    veins(ctx, x, y, w, h, r, { color: '#c9ccd0', count: 7, width: Math.max(w, h) * 0.004, alpha: 0.35, blur: 2.2, wander: 0.6 });
  },
};

export const MATERIALS = [
  { id: 'statuario', name: 'Statuario-look marble tile', size: [800, 1600], finish: 'Glossy', uses: ['floor', 'wall', 'bathroom'], cat: 'marble', rough: 0.12, note: 'White with soft grey veins. Big slabs mean fewer joints across the floor.' },
  { id: 'grigio', name: 'Grigio-look marble tile', size: [800, 1600], finish: 'High gloss', uses: ['floor', 'wall'], cat: 'marble', rough: 0.08, note: 'Blue-grey with amber veins, like the slab on display in the showroom.' },
  { id: 'makrana', name: 'White marble', size: [600, 1200], finish: 'Polished', uses: ['floor', 'wall'], cat: 'marble', rough: 0.18, note: 'Natural Indian white marble for floors, steps and temple rooms.' },
  { id: 'ivory', name: 'Ivory vitrified tile', size: [600, 600], finish: 'Glossy', uses: ['floor'], cat: 'floor', rough: 0.15, note: 'Plain, bright and easy to clean. A safe choice for bedrooms and halls.' },
  { id: 'kota', name: 'Kota-stone look tile', size: [600, 600], finish: 'Matt', uses: ['floor', 'outdoor'], cat: 'outdoor', rough: 0.85, note: 'The familiar green-grey stone look, with grip for verandas and stairs.' },
  { id: 'wood', name: 'Wood-look plank', size: [200, 1200], finish: 'Matt', uses: ['floor'], cat: 'floor', rough: 0.7, note: 'Looks like timber, does not mind a wet mop or the Bihar monsoon.' },
  { id: 'terrazzo', name: 'Terrazzo-look tile', size: [600, 600], finish: 'Satin', uses: ['floor', 'kitchen'], cat: 'floor', rough: 0.45, note: 'Coloured chips that hide everyday dust between cleans.' },
  { id: 'concrete', name: 'Concrete-look tile', size: [600, 1200], finish: 'Matt', uses: ['floor', 'outdoor', 'bathroom'], cat: 'outdoor', rough: 0.9, note: 'Grey and grippy. Good for parking, terraces and bathroom floors.' },
  { id: 'fishscale', name: 'Teal fish-scale mosaic', size: [300, 300], finish: 'Glossy', uses: ['wall', 'bathroom', 'kitchen'], cat: 'wall', rough: 0.1, note: 'A hand-made look for a shower wall or kitchen backsplash.' },
  { id: 'moroccan', name: 'Blue pattern tile', size: [200, 200], finish: 'Matt', uses: ['wall', 'kitchen', 'floor'], cat: 'wall', rough: 0.6, note: 'Indigo and white pattern for a feature wall or a small balcony.' },
];

export const byId = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

const cache = new Map();

/** Returns a canvas holding one tile of `mat` at the given pixel size. */
export function tileCanvas(mat, pw, ph, variant = 0) {
  pw = Math.max(4, Math.round(pw));
  ph = Math.max(4, Math.round(ph));
  const key = `${mat.id}:${pw}x${ph}:${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = pw;
  c.height = ph;
  const ctx = c.getContext('2d');
  painters[mat.id](ctx, 0, 0, pw, ph, rng(hash(mat.id) + variant * 7919));
  if (mat.rough < 0.3) sheen(ctx, 0, 0, pw, ph, 0.12);
  cache.set(key, c);
  return c;
}

function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Lays tiles over a surface. Returns the list of tile placements so the
 * caller can animate them in; call `drawPlacements` to paint.
 *  surfaceMM: [width, height] of the surface in millimetres
 *  scale:     pixels per millimetre
 *  layout:    'straight' | 'brick' | 'diagonal'
 */
export function planSurface(mat, surfaceMM, scale, layout) {
  const [tw, th] = mat.size;
  const W = surfaceMM[0] * scale;
  const H = surfaceMM[1] * scale;
  const pw = tw * scale;
  const ph = th * scale;
  const placements = [];
  const diagonal = layout === 'diagonal';
  const span = diagonal ? Math.hypot(W, H) : 0;
  const x0 = diagonal ? -span / 2 : 0;
  const y0 = diagonal ? -span / 2 : 0;
  const x1 = diagonal ? span / 2 : W;
  const y1 = diagonal ? span / 2 : H;
  let row = 0;
  for (let y = y0; y < y1; y += ph, row++) {
    const offset = layout === 'brick' && row % 2 ? -pw / 2 : 0;
    let col = 0;
    for (let x = x0 + offset; x < x1; x += pw, col++) {
      placements.push({ x, y, w: pw, h: ph, v: (row * 7 + col * 3) % 4 });
    }
  }
  return { W, H, pw, ph, placements, diagonal };
}

export function drawSurfaceBase(ctx, plan, grout) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, plan.W, plan.H);
}

export function drawPlacements(ctx, plan, mat, list, groutPx) {
  ctx.save();
  if (plan.diagonal) {
    ctx.translate(plan.W / 2, plan.H / 2);
    ctx.rotate(Math.PI / 4);
  }
  for (const p of list) {
    const img = tileCanvas(mat, plan.pw - groutPx, plan.ph - groutPx, p.v);
    ctx.drawImage(img, p.x + groutPx / 2, p.y + groutPx / 2);
  }
  ctx.restore();
}

/** Draw a single preview tile into an existing canvas (for swatches and cards). */
export function paintPreview(canvas, mat, variant = 0) {
  const ctx = canvas.getContext('2d');
  const img = tileCanvas(mat, canvas.width, canvas.height, variant);
  ctx.drawImage(img, 0, 0);
}
