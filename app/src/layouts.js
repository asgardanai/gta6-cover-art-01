// Panel layouts. Every layout is a function of the canvas size in pixels and
// returns panel rectangles (fractions converted to pixels), a title box for
// the caption, and a background gradient. Panels may carry `rot` (radians)
// and `frame: 'polaroid'` for the tilted snapshot cards.

function gutter(w, h) {
  return Math.round(Math.min(w, h) * 0.014);
}

export const LAYOUTS = {
  grid4: {
    label: 'Four Panel',
    panelCount: 4,
    bg: ['#22102e', '#160a20'],
    panels(w, h) {
      const g = gutter(w, h);
      const band = h * 0.8;
      const pw = (w - 3 * g) / 2;
      const ph = (band - 3 * g) / 2;
      return [
        { x: g, y: g, w: pw, h: ph },
        { x: 2 * g + pw, y: g, w: pw, h: ph },
        { x: g, y: 2 * g + ph, w: pw, h: ph },
        { x: 2 * g + pw, y: 2 * g + ph, w: pw, h: ph },
      ];
    },
    title(w, h) {
      return { x: w * 0.045, y: h * 0.815, w: w * 0.91, h: h * 0.16, align: 'left', size: h * 0.085 };
    },
  },

  hero3: {
    label: 'Hero + Three',
    panelCount: 4,
    bg: ['#1c0f2b', '#120818'],
    panels(w, h) {
      const g = gutter(w, h);
      const band = h * 0.82;
      const heroW = w * 0.6 - 1.5 * g;
      const rx = w * 0.6 + 0.5 * g;
      const rw = w - rx - g;
      const rh = (band - 4 * g) / 3;
      return [
        { x: g, y: g, w: heroW, h: band - 2 * g },
        { x: rx, y: g, w: rw, h: rh },
        { x: rx, y: 2 * g + rh, w: rw, h: rh },
        { x: rx, y: 3 * g + 2 * rh, w: rw, h: rh },
      ];
    },
    title(w, h) {
      return { x: w * 0.045, y: h * 0.835, w: w * 0.91, h: h * 0.14, align: 'left', size: h * 0.08 };
    },
  },

  fullbleed: {
    label: 'Full Bleed',
    panelCount: 1,
    bg: ['#180c22', '#0e0614'],
    scrim: true,
    panels(w, h) {
      return [{ x: 0, y: 0, w, h }];
    },
    title(w, h) {
      return { x: w * 0.05, y: h * 0.78, w: w * 0.9, h: h * 0.18, align: 'left', size: h * 0.11 };
    },
  },

  nine: {
    label: 'Nine Panel',
    panelCount: 8,
    bg: ['#241130', '#150a1e'],
    panels(w, h) {
      const g = gutter(w, h);
      const cw = (w - 4 * g) / 3;
      const ch = (h - 4 * g) / 3;
      const cells = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (row === 1 && col === 1) continue; // centre cell is the title block
          cells.push({ x: g + col * (cw + g), y: g + row * (ch + g), w: cw, h: ch });
        }
      }
      return cells;
    },
    title(w, h) {
      const g = gutter(w, h);
      const cw = (w - 4 * g) / 3;
      const ch = (h - 4 * g) / 3;
      return {
        x: g + cw + g,
        y: g + ch + g,
        w: cw,
        h: ch,
        align: 'center',
        size: ch * 0.28,
        block: true,
      };
    },
  },

  tilted: {
    label: 'Tilted Snapshots',
    panelCount: 3,
    bg: ['#2a1238', '#12071c'],
    panels(w, h) {
      return [
        { x: w * 0.05, y: h * 0.17, w: w * 0.54, h: h * 0.48, rot: -0.09, frame: 'polaroid' },
        { x: w * 0.44, y: h * 0.3, w: w * 0.51, h: h * 0.46, rot: 0.07, frame: 'polaroid' },
        { x: w * 0.12, y: h * 0.6, w: w * 0.56, h: h * 0.34, rot: -0.03, frame: 'polaroid' },
      ];
    },
    title(w, h) {
      return { x: w * 0.05, y: h * 0.025, w: w * 0.9, h: h * 0.12, align: 'center', size: h * 0.075 };
    },
  },

  poster: {
    label: 'Poster',
    panelCount: 3,
    bg: ['#200f2c', '#140919'],
    panels(w, h) {
      const g = gutter(w, h);
      const topH = h * 0.5 - 2 * g;
      const midY = h * 0.5 + g;
      const midH = h * 0.28 - 2 * g;
      const midW = (w - 3 * g) / 2;
      return [
        { x: g, y: g, w: w - 2 * g, h: topH },
        { x: g, y: midY, w: midW, h: midH },
        { x: 2 * g + midW, y: midY, w: midW, h: midH },
      ];
    },
    title(w, h) {
      return { x: w * 0.045, y: h * 0.815, w: w * 0.91, h: h * 0.16, align: 'left', size: h * 0.085 };
    },
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);
