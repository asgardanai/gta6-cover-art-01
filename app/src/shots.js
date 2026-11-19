// Fixed scenes for screenshots. `?shot=cover` draws one exported cover
// full-frame (the editor chrome hidden); `?shot=editor` opens the editor
// seeded with sample photos and a caption. Extra params pick the scene:
// photo (pier | boulevard | neon | rooftop | speedboat | both | all),
// panels (a comma list of sample names, one per panel, cycling), caption,
// subtitle, layout, grade, size, lettering. window.__shotReady is set once
// the scene has painted.

import { ensureFonts } from './fonts.js';
import { GRADE_IDS } from './grades.js';
import { LAYOUT_IDS } from './layouts.js';
import { SIZE_IDS } from './renderer.js';
import { assignPhotosCycling, resizePanels, SAMPLE_NAMES } from './state.js';

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
  // `all` loads the whole five-photo set; `both` keeps the original pair.
  const toLoad = photoChoice === 'all'
    ? SAMPLE_NAMES
    : photoChoice === 'both'
      ? ['pier', 'boulevard']
      : [photoChoice];
  for (const name of toLoad) await app.loadSample(name);
  const byName = (name) => state.photos.find((p) => p.name === name);
  // `panels=a,b,c` assigns exact photos per panel (cycling past the list);
  // without it the loaded photos cycle in load order. The order in
  // shots.json is chosen so no two neighbouring cells show the same photo.
  const wanted = (query.get('panels') ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  const ordered = wanted.length
    ? wanted.map((name) => byName(name)).filter(Boolean)
    : toLoad.map((name) => byName(name)).filter(Boolean);
  const fallback = state.photos[0];
  state.panels.forEach((panel, i) => {
    const photo = ordered[i % ordered.length] ?? fallback;
    panel.photoId = photo.id;
    // Crops stay near the face-focus default: a gentle zoom step and a
    // small deterministic nudge per panel. The renderer clamps the total
    // pan to the cover slack, so a crop can never slide the photo off its
    // panel and expose the background.
    panel.zoom = 1 + (i % 3) * 0.06;
    panel.dx = (((i * 37) % 100) / 100 - 0.5) * 0.06;
    panel.dy = (((i * 53) % 100) / 100 - 0.5) * 0.06;
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
