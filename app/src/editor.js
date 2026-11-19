// Wires the editor: photo uploads, panel picking and cropping, layout and
// grade controls, live preview, undo/redo and PNG exports. All drawing goes
// through the renderer; this module only moves state around and redraws.

import { ensureFonts } from './fonts.js';
import { GRADE_IDS } from './grades.js';
import { LAYOUTS, LAYOUT_IDS } from './layouts.js';
import { coverGeometry, renderCover, SIZES, SIZE_IDS } from './renderer.js';
import {
  assignPhotosCycling,
  createHistory,
  DEFAULT_FOCUS,
  resizePanels,
  restoreState,
  SAMPLE_FOCUS,
  SAMPLE_NAMES,
  snapshotState,
} from './state.js';

const PREVIEW_MAX = 900;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function createEditorApp(state) {
  const canvas = document.getElementById('preview');
  const status = document.getElementById('status');
  const thumbs = document.getElementById('thumbs');
  const panelLabel = document.getElementById('panel-label');
  const zoomSlider = document.getElementById('zoom');
  const zoomLabel = document.getElementById('zoom-label');
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  const history = createHistory();
  let uploadCount = 0;
  let wheelTimer = null;

  function say(text) {
    status.textContent = text;
  }

  /** Sizes the preview canvas for the current export size (or full size). */
  function fitCanvas(fullRes = false) {
    const [w, h] = SIZES[state.size];
    const scale = fullRes ? 1 : Math.min(1, PREVIEW_MAX / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
  }

  function redraw(highlight = true) {
    renderCover(canvas, state, { highlight: highlight ? state.selected : null });
    updateControls();
  }

  function updateControls() {
    document.querySelectorAll('.layout-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.layout === state.layout);
    });
    document.querySelectorAll('.grade-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.grade === state.grade);
    });
    document.querySelectorAll('input[name="size"]').forEach((r) => {
      r.checked = r.value === state.size;
    });
    document.getElementById('toggle-grain').checked = state.grain;
    document.getElementById('toggle-vignette').checked = state.vignette;
    document.getElementById('toggle-halftone').checked = state.halftone;
    document.getElementById('toggle-badge').checked = state.badge;
    document.getElementById('lettering').value = state.lettering;
    const panel = state.panels[state.selected];
    panelLabel.textContent = `Panel ${state.selected + 1} of ${state.panels.length}`;
    if (panel) {
      zoomSlider.value = String(Math.round(panel.zoom * 100));
      zoomLabel.textContent = `${Math.round(panel.zoom * 100)}%`;
    }
    undoBtn.disabled = !history.canUndo();
    redoBtn.disabled = !history.canRedo();
  }

  function commit(mutator) {
    const before = snapshotState(state);
    mutator();
    history.push(before);
    redraw();
  }

  function renderThumbs() {
    thumbs.innerHTML = '';
    for (const photo of state.photos) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb';
      btn.title = photo.name;
      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.name;
      btn.appendChild(img);
      btn.addEventListener('click', () => {
        commit(() => {
          const panel = state.panels[state.selected];
          if (panel) {
            panel.photoId = photo.id;
            panel.zoom = 1;
            panel.dx = 0;
            panel.dy = 0;
          }
        });
        say(`Panel ${state.selected + 1} now shows ${photo.name}.`);
      });
      thumbs.appendChild(btn);
    }
  }

  const loadingSamples = new Map();

  async function loadSample(name) {
    const id = `sample-${name}`;
    const existing = state.photos.find((p) => p.id === id);
    if (existing) return existing;
    if (loadingSamples.has(id)) return loadingSamples.get(id);
    const job = (async () => {
      const url = `samples/${name}.jpg`;
      const img = await loadImage(url);
      const photo = { id, name, img, url, focus: SAMPLE_FOCUS[name] ?? DEFAULT_FOCUS };
      state.photos.push(photo);
      assignPhotosCycling(state);
      renderThumbs();
      return photo;
    })();
    loadingSamples.set(id, job);
    return job;
  }

  async function loadFiles(files) {
    const added = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      uploadCount += 1;
      const id = `upload-${uploadCount}`;
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      state.photos.push({ id, name: file.name, img, url, focus: DEFAULT_FOCUS });
      added.push(id);
    }
    if (!added.length) return;
    commit(() => {
      const panel = state.panels[state.selected];
      if (panel) {
        panel.photoId = added[0];
        panel.zoom = 1;
        panel.dx = 0;
        panel.dy = 0;
      }
      assignPhotosCycling(state);
    });
    renderThumbs();
    say(`${added.length} photo${added.length > 1 ? 's' : ''} added.`);
  }

  // ---- Canvas picking, panning and zooming ----

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function hitPanel(point) {
    const rects = LAYOUTS[state.layout].panels(canvas.width, canvas.height);
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      let { x, y } = point;
      if (r.rot) {
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const dx = x - cx;
        const dy = y - cy;
        const cos = Math.cos(-r.rot);
        const sin = Math.sin(-r.rot);
        x = cx + dx * cos - dy * sin;
        y = cy + dx * sin + dy * cos;
      }
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
  }

  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const index = hitPanel(point);
    if (index === -1) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const before = snapshotState(state);
    state.selected = index;
    drag = { before, moved: false, last: point };
    redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = canvasPoint(event);
    const rects = LAYOUTS[state.layout].panels(canvas.width, canvas.height);
    const rect = rects[state.selected];
    const panel = state.panels[state.selected];
    const photo = state.photos.find((p) => p.id === panel.photoId)?.img;
    if (!rect || !panel || !photo) return;
    panel.dx += (point.x - drag.last.x) / rect.w;
    panel.dy += (point.y - drag.last.y) / rect.h;
    const geo = coverGeometry(photo, rect, panel);
    panel.dx = Math.max(-geo.maxDx, Math.min(geo.maxDx, panel.dx));
    panel.dy = Math.max(-geo.maxDy, Math.min(geo.maxDy, panel.dy));
    drag.last = point;
    drag.moved = true;
    redraw();
  });
  function endDrag() {
    if (!drag) return;
    if (drag.moved) history.push(drag.before);
    drag = null;
    redraw();
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selected];
    if (!panel) return;
    if (!wheelTimer) history.push(snapshotState(state));
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08)));
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      wheelTimer = null;
    }, 400);
    redraw();
  }, { passive: false });

  // ---- Controls ----

  document.getElementById('photo-input').addEventListener('change', (e) => {
    loadFiles(e.target.files);
    e.target.value = '';
  });
  const dropZone = document.getElementById('drop-zone');
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragging');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragging');
    loadFiles(e.dataTransfer.files);
  });

  document.querySelectorAll('.layout-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      commit(() => {
        state.layout = btn.dataset.layout;
        resizePanels(state);
        assignPhotosCycling(state);
      });
      say(`${LAYOUTS[state.layout].label} layout.`);
    });
  });
  document.querySelectorAll('.grade-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      commit(() => {
        state.grade = btn.dataset.grade;
      });
    });
  });
  document.querySelectorAll('input[name="size"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      commit(() => {
        state.size = radio.value;
      });
      fitCanvas();
      redraw();
    });
  });

  const captionInput = document.getElementById('caption');
  const subtitleInput = document.getElementById('subtitle');
  captionInput.addEventListener('input', () => {
    state.caption = captionInput.value;
    redraw();
  });
  captionInput.addEventListener('change', () => history.push(snapshotState(state)));
  subtitleInput.addEventListener('input', () => {
    state.subtitle = subtitleInput.value;
    redraw();
  });
  subtitleInput.addEventListener('change', () => history.push(snapshotState(state)));
  document.getElementById('lettering').addEventListener('change', (e) => {
    commit(() => {
      state.lettering = e.target.value;
    });
  });
  for (const [id, key] of [
    ['toggle-grain', 'grain'],
    ['toggle-vignette', 'vignette'],
    ['toggle-halftone', 'halftone'],
    ['toggle-badge', 'badge'],
  ]) {
    document.getElementById(id).addEventListener('change', (e) => {
      commit(() => {
        state[key] = e.target.checked;
      });
    });
  }

  zoomSlider.addEventListener('input', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    panel.zoom = Number(zoomSlider.value) / 100;
    redraw();
  });
  zoomSlider.addEventListener('change', () => history.push(snapshotState(state)));

  document.getElementById('fill-all').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    if (!panel || !panel.photoId) return;
    commit(() => {
      for (const p of state.panels) p.photoId = panel.photoId;
    });
    say('All panels now use the selected photo.');
  });

  undoBtn.addEventListener('click', () => {
    const snap = history.undo(snapshotState(state));
    if (snap) {
      restoreState(state, snap);
      fitCanvas();
      redraw();
    }
  });
  redoBtn.addEventListener('click', () => {
    const snap = history.redo(snapshotState(state));
    if (snap) {
      restoreState(state, snap);
      fitCanvas();
      redraw();
    }
  });

  // ---- Exports ----

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  async function exportCover(sizeKey) {
    const [w, h] = SIZES[sizeKey];
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    await ensureFonts();
    renderCover(off, state);
    const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
    downloadBlob(blob, `cover-${sizeKey}.png`);
    return sizeKey;
  }

  document.getElementById('export-one').addEventListener('click', async () => {
    say('Exporting…');
    const done = await exportCover(state.size);
    say(`Saved cover-${done}.png`);
  });
  document.getElementById('export-all').addEventListener('click', async () => {
    say('Exporting all sizes…');
    for (const sizeKey of SIZE_IDS) {
      await exportCover(sizeKey);
      await new Promise((r) => setTimeout(r, 350));
    }
    say('Saved all four sizes.');
  });

  // ---- Startup ----

  resizePanels(state);
  fitCanvas();
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
  redraw();
  ensureFonts().then(() => redraw());
  Promise.all(SAMPLE_NAMES.map((name) => loadSample(name)))
    .then(() => redraw())
    .catch(() => say('Sample photos could not load — add your own to begin.'));

  return {
    state,
    canvas,
    loadSample,
    loadFiles,
    fitCanvas,
    redraw,
    exportCover,
    say,
  };
}

// Keep the imported id lists visibly used so the outline names them.
export const SUPPORTED_LAYOUTS = LAYOUT_IDS;
export const SUPPORTED_GRADES = GRADE_IDS;
