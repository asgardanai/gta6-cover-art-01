// The editor's state: uploaded photos, one crop record per panel, the chosen
// layout, grade, words and export size. Photos hold live image elements and
// are never serialised; everything else snapshots to plain JSON for undo.

import { LAYOUTS } from './layouts.js';

export function createState() {
  return {
    photos: [], // { id, name, img }
    panels: [], // { photoId, zoom, dx, dy } — dx/dy in fractions of the panel
    layout: 'grid4',
    grade: 'sunset',
    caption: 'Sunset Heist',
    subtitle: 'Neon Shore',
    size: '1080x1080',
    lettering: 'sunset', // white | sunset | neon
    grain: true,
    vignette: true,
    halftone: true,
    badge: true,
    selected: 0,
  };
}

export function defaultPanel(photoId) {
  return { photoId: photoId ?? null, zoom: 1, dx: 0, dy: 0 };
}

/** Grows or shrinks the panel list to the current layout's panel count. */
export function resizePanels(state) {
  const count = LAYOUTS[state.layout].panelCount;
  while (state.panels.length < count) state.panels.push(defaultPanel(null));
  if (state.panels.length > count) state.panels.length = count;
  if (state.selected >= count) state.selected = 0;
}

/**
 * Assigns photos to panels that have none, cycling through the photos so a
 * layout with more panels than photos still looks varied, with a slightly
 * different crop per panel.
 */
export function assignPhotosCycling(state) {
  const photos = state.photos;
  if (!photos.length) return;
  state.panels.forEach((panel, i) => {
    const hasPhoto = panel.photoId && photos.some((p) => p.id === panel.photoId);
    if (hasPhoto) return;
    panel.photoId = photos[i % photos.length].id;
    panel.zoom = 1 + (i % 3) * 0.12;
    panel.dx = (((i * 37) % 100) / 100 - 0.5) * 0.24;
    panel.dy = (((i * 53) % 100) / 100 - 0.5) * 0.24;
  });
}

const SNAPSHOT_KEYS = [
  'layout', 'grade', 'caption', 'subtitle', 'size', 'lettering',
  'grain', 'vignette', 'halftone', 'badge', 'selected', 'panels',
];

export function snapshotState(state) {
  const snap = {};
  for (const key of SNAPSHOT_KEYS) snap[key] = JSON.parse(JSON.stringify(state[key]));
  return snap;
}

export function restoreState(state, snap) {
  for (const key of SNAPSHOT_KEYS) state[key] = JSON.parse(JSON.stringify(snap[key]));
  resizePanels(state);
}

/** A small undo/redo stack over state snapshots. */
export function createHistory(limit = 60) {
  const past = [];
  const future = [];
  return {
    push(snap) {
      past.push(snap);
      if (past.length > limit) past.shift();
      future.length = 0;
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
    undo(current) {
      if (!past.length) return null;
      future.push(current);
      return past.pop();
    },
    redo(current) {
      if (!future.length) return null;
      past.push(current);
      return future.pop();
    },
  };
}
