// The cover renderer: draws the whole cover — panels, grades, lettering,
// badge, grain and vignette — onto any canvas at that canvas's own size, so
// the live preview and the full-resolution exports share one code path.

import { GRADES } from './grades.js';
import { LAYOUTS } from './layouts.js';

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
  '1080x1920': [1080, 1920],
};

export const SIZE_IDS = Object.keys(SIZES);

/** Cover-fit geometry for a photo in a panel, with the panel's zoom and pan. */
export function coverGeometry(photo, rect, panel) {
  const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
  const scale = base * panel.zoom;
  const dw = photo.naturalWidth * scale;
  const dh = photo.naturalHeight * scale;
  return {
    dw,
    dh,
    maxDx: Math.max(0, (dw - rect.w) / 2 / rect.w),
    maxDy: Math.max(0, (dh - rect.h) / 2 / rect.h),
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

/** Draws one photo panel: the photo (cover-fit, zoomed, panned), its grade, and its frame. */
function drawPanel(ctx, rect, panel, photo, grade) {
  const rot = rect.rot ?? 0;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.save();
  if (rot) {
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.translate(-cx, -cy);
  }
  if (rect.frame === 'polaroid') {
    const pad = Math.min(rect.w, rect.h) * 0.045;
    ctx.fillStyle = '#f7f2e8';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = Math.min(rect.w, rect.h) * 0.04;
    ctx.shadowOffsetY = Math.min(rect.w, rect.h) * 0.015;
    ctx.fillRect(rect.x - pad, rect.y - pad, rect.w + pad * 2, rect.h + pad * 4);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  const radius = Math.min(rect.w, rect.h) * 0.012;
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.clip();
  if (photo) {
    const geo = coverGeometry(photo, rect, panel);
    const px = cx + panel.dx * rect.w - geo.dw / 2;
    const py = cy + panel.dy * rect.h - geo.dh / 2;
    ctx.filter = grade.filter;
    ctx.drawImage(photo, px, py, geo.dw, geo.dh);
    ctx.filter = 'none';
  } else {
    const empty = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    empty.addColorStop(0, '#3a1a4d');
    empty.addColorStop(1, '#1c0e28');
    ctx.fillStyle = empty;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = `${Math.round(rect.h * 0.09)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', cx, cy);
  }
  for (const overlay of grade.overlays) {
    const grad = ctx.createLinearGradient(
      rect.x + overlay.from[0] * rect.w,
      rect.y + overlay.from[1] * rect.h,
      rect.x + overlay.to[0] * rect.w,
      rect.y + overlay.to[1] * rect.h,
    );
    for (const [stop, color] of overlay.stops) grad.addColorStop(stop, color);
    ctx.globalCompositeOperation = overlay.blend;
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // Inked edge: a dark band around the panel so the grid reads as poster art.
  ctx.save();
  if (rot) {
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.translate(-cx, -cy);
  }
  ctx.strokeStyle = rect.frame === 'polaroid' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(10, 4, 16, 0.55)';
  ctx.lineWidth = Math.max(1.5, Math.min(rect.w, rect.h) * 0.008);
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.stroke();
  ctx.restore();
}

/** Wraps the caption into at most two lines that fit, shrinking as needed. */
function fitCaptionLines(ctx, text, maxWidth, startSize) {
  const words = text.split(/\s+/).filter(Boolean);
  let size = startSize;
  const minSize = startSize * 0.45;
  while (size > minSize) {
    ctx.font = `${size}px Anton, sans-serif`;
    const lines = [];
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (ctx.measureText(trial).width <= maxWidth || !line) {
        line = trial;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 2) return { lines, size };
    size *= 0.88;
  }
  ctx.font = `${size}px Anton, sans-serif`;
  return { lines: [text], size };
}

function drawHalftone(ctx, box) {
  const step = Math.max(6, box.w * 0.055);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  for (let row = 0, y = box.y + step / 2; y < box.y + box.h; y += step, row++) {
    for (let col = 0, x = box.x + step / 2; x < box.x + box.w; x += step, col++) {
      const r = step * 0.16 + ((row + col) % 3) * step * 0.05;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** The heat meter: five gold stars beside the caption. */
function drawStarRow(ctx, x, y, size, align) {
  const gap = size * 1.35;
  const total = gap * 4 + size;
  const startX = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  ctx.fillStyle = '#ffcf3f';
  ctx.strokeStyle = 'rgba(20, 8, 20, 0.8)';
  ctx.lineWidth = Math.max(1, size * 0.08);
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, startX + size / 2 + i * gap, y, size / 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** A diagonal ribbon across the top-right corner. */
function drawBadgeRibbon(ctx, w, h) {
  const len = w * 0.3;
  const band = Math.max(18, h * 0.048);
  ctx.save();
  ctx.translate(w, 0);
  ctx.rotate(-Math.PI / 4);
  const cx = w * 0.075;
  const grad = ctx.createLinearGradient(-cx - len / 2, 0, -cx + len / 2, 0);
  grad.addColorStop(0, '#ff2d78');
  grad.addColorStop(1, '#ff7a18');
  ctx.fillStyle = grad;
  ctx.fillRect(-cx - len / 2, -band / 2, len, band);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(-cx - len / 2, -band / 2, len, Math.max(1, band * 0.06));
  ctx.fillRect(-cx - len / 2, band / 2 - Math.max(1, band * 0.06), len, Math.max(1, band * 0.06));
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(band * 0.52)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('COVER ART', -cx, 0);
  ctx.restore();
}

let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(160, 160);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  noiseTile = tile;
  return tile;
}

function applyGrain(ctx, w, h) {
  const pattern = ctx.createPattern(getNoiseTile(), 'repeat');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(5, 0, 10, 0.34)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/** Draws the caption and subtitle into the layout's title box. */
function drawCaption(ctx, title, state, w, h) {
  const text = (state.caption || '').trim().toUpperCase();
  if (!text && !(state.subtitle || '').trim()) return;
  if (title.block) {
    ctx.fillStyle = '#1d0d2a';
    ctx.fillRect(title.x, title.y, title.w, title.h);
    if (state.halftone) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(title.x, title.y, title.w, title.h);
      ctx.clip();
      drawHalftone(ctx, title);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = Math.max(1, title.w * 0.006);
    ctx.strokeRect(title.x, title.y, title.w, title.h);
  }
  const pad = title.block ? title.w * 0.08 : 0;
  const maxWidth = title.w - pad * 2;
  const { lines, size } = fitCaptionLines(ctx, text || ' ', maxWidth, title.size);
  const sub = (state.subtitle || '').trim();
  const subSize = size * 0.42;
  const lineHeight = size * 1.02;
  const totalHeight = lines.length * lineHeight + (sub ? subSize * 1.7 : 0);
  let top = title.y + (title.h - totalHeight) / 2;
  if (!title.block && title.align === 'left') top = title.y;
  const alignX = title.align === 'center' ? title.x + title.w / 2 : title.x + pad;
  ctx.textAlign = title.align === 'center' ? 'center' : 'left';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.02)}px`;
  lines.forEach((line, i) => {
    const y = top + size + i * lineHeight;
    ctx.save();
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(18, 6, 20, 0.9)';
    ctx.lineWidth = size * 0.07;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = size * 0.14;
    ctx.shadowOffsetY = size * 0.03;
    if (state.lettering === 'sunset') {
      const grad = ctx.createLinearGradient(0, y - size, 0, y);
      grad.addColorStop(0, '#ffe259');
      grad.addColorStop(0.55, '#ffa751');
      grad.addColorStop(1, '#ff5e8a');
      ctx.fillStyle = grad;
    } else if (state.lettering === 'neon') {
      ctx.shadowColor = 'rgba(255, 45, 150, 0.85)';
      ctx.shadowBlur = size * 0.28;
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.strokeText(line, alignX, y);
    ctx.fillText(line, alignX, y);
    ctx.restore();
  });
  if (sub) {
    const y = top + lines.length * lineHeight + subSize * 1.25;
    ctx.save();
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = state.lettering === 'neon' ? '#7df9e8' : '#ffd9ec';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(sub, alignX, y);
    ctx.restore();
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

/**
 * Renders the cover onto `canvas` at the canvas's own size.
 * opts.highlight — panel index to outline (preview only, never on export).
 */
export function renderCover(canvas, state, opts = {}) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const layout = LAYOUTS[state.layout];
  const grade = GRADES[state.grade];

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, layout.bg[0]);
  bg.addColorStop(1, layout.bg[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const rects = layout.panels(w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    const photo = panel && panel.photoId
      ? state.photos.find((p) => p.id === panel.photoId)?.img ?? null
      : null;
    drawPanel(ctx, rect, panel ?? { photoId: null, zoom: 1, dx: 0, dy: 0 }, photo, grade);
  });

  if (layout.scrim) {
    const scrim = ctx.createLinearGradient(0, h * 0.55, 0, h);
    scrim.addColorStop(0, 'rgba(10, 5, 15, 0)');
    scrim.addColorStop(1, 'rgba(10, 5, 15, 0.72)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h);
  }

  const title = layout.title(w, h);
  drawCaption(ctx, title, state, w, h);

  if (state.badge && state.layout !== 'tilted') {
    drawBadgeRibbon(ctx, w, h);
    const starSize = Math.max(12, h * 0.028);
    if (title.align === 'center') {
      drawStarRow(ctx, title.x + title.w / 2, title.y + title.h - starSize * 0.4, starSize, 'center');
    } else {
      drawStarRow(ctx, title.x + title.w, title.y + title.h * 0.32, starSize, 'right');
    }
  }

  if (state.grain) applyGrain(ctx, w, h);
  if (state.vignette) applyVignette(ctx, w, h);

  if (opts.highlight !== undefined && opts.highlight !== null) {
    const rect = rects[opts.highlight];
    if (rect) {
      ctx.save();
      ctx.strokeStyle = '#ff2d78';
      ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.004);
      ctx.setLineDash([Math.max(6, w * 0.012), Math.max(4, w * 0.008)]);
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      if (rect.rot) {
        ctx.translate(cx, cy);
        ctx.rotate(rect.rot);
        ctx.translate(-cx, -cy);
      }
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
  }
}
