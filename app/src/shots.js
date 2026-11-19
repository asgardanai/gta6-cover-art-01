// Fixed scenes for screenshots. `?shot=cover` draws one exported cover
// full-frame (the editor chrome hidden); `?shot=editor` opens the editor
// seeded with a sample photo and caption. Extra params pick the scene:
// photo (pier | boulevard | both), caption, subtitle, layout, grade, size,
// lettering. window.__shotReady is set once the scene has painted.

import { ensureFonts } from './fonts.js';
import { GRADE_IDS } from './grades.js';
import { LAYOUT_IDS } from './layouts.js';
import { SIZE_IDS } from './renderer.js';
import { assignPhotosCycling, resizePanels } from './state.js';

function pickParam(query, name, allowed, fallback) {
  const value = query.get(name);
  return value && allowed.includes(value) ? value : fallback;
}

export async function runShotScene(query, app) {
  const { state } = app;
  const shot = query.get('shot');
  const photoChoice = query.get('photo') ?? 'pier';

  state.layout = pickParam(query, 'layout', LAYOUT_IDS, state.layout);
  state.grade = pickParam(query, 'grade', GRADE_IDS, state.grade);
  state.size = pickParam(query, 'size', SIZE_IDS, state.size);
  state.lettering = pickParam(query, 'lettering', ['white', 'sunset', 'neon'], state.lettering);
  state.caption = query.get('caption') ?? state.caption;
  state.subtitle = query.get('subtitle') ?? state.subtitle;
  resizePanels(state);

  // Load the demo photos in a fixed order so every panel assignment is stable.
  if (photoChoice === 'both') {
    await app.loadSample('pier');
    await app.loadSample('boulevard');
  } else {
    await app.loadSample(photoChoice);
  }
  const byName = (name) => state.photos.find((p) => p.name === name);
  const ordered = photoChoice === 'both'
    ? [byName('pier'), byName('boulevard')].filter(Boolean)
    : [byName(photoChoice) ?? state.photos[0]];
  state.panels.forEach((panel, i) => {
    panel.photoId = ordered[i % ordered.length].id;
    panel.zoom = 1 + (i % 3) * 0.1;
    panel.dx = (((i * 37) % 100) / 100 - 0.5) * 0.2;
    panel.dy = (((i * 53) % 100) / 100 - 0.5) * 0.2;
  });
  assignPhotosCycling(state);

  const captionInput = document.getElementById('caption');
  const subtitleInput = document.getElementById('subtitle');
  if (captionInput) captionInput.value = state.caption;
  if (subtitleInput) subtitleInput.value = state.subtitle;

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    app.fitCanvas(true);
  } else {
    app.fitCanvas(false);
  }
  await ensureFonts();
  app.redraw(shot !== 'cover');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
