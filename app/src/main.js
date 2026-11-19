// Entry point: builds the editor, then either runs it normally or stages a
// fixed `?shot=` scene for a screenshot.
import { createEditorApp } from './editor.js';
import { runShotScene } from './shots.js';
import { createState } from './state.js';

const state = createState();
const app = createEditorApp(state);

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  runShotScene(query, app).catch((error) => {
    console.error('shot scene failed', error);
    window.__shotReady = true;
  });
}
