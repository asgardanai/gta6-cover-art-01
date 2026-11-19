// Loads the two display fonts shipped under app/fonts/ — Anton for the big
// caption, Pacifico for the script subtitle. Both are SIL Open Font License
// fonts, so the app can ship them. Loading is best-effort with a timeout: a
// missing font must never block the editor, it just falls back to sans-serif.
const DISPLAY_FONTS = [
  { family: 'Anton', sample: '100px Anton' },
  { family: 'Pacifico', sample: '100px Pacifico' },
];

let fontsPromise = null;

/** Resolves once both display fonts are usable (or after a short timeout). */
export function ensureFonts() {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    if (!('fonts' in document)) return;
    const loads = DISPLAY_FONTS.map((f) =>
      document.fonts.load(f.sample, 'Sunset Heist 0123456789').catch(() => null),
    );
    const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
    await Promise.race([Promise.all(loads), timeout]);
    await document.fonts.ready.catch(() => null);
  })();
  return fontsPromise;
}
