// Entry point for the gta6-cover-art-01 bounty (Node 22, standard library
// only). The app itself lives in app/ as plain static files a desktop browser
// loads offline; this program hands it in. It copies app/ and screenshots/
// from beside this file into the output directory and writes dossier.json
// there with the vendored make.fun library, which is what the judge reads.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(destination, { recursive: true });
cpSync(join(root, 'app'), join(destination, 'app'), { recursive: true });
mkdirSync(join(destination, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(destination, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; app/ over 993 files or 48 MiB, or a path over 1000 bytes).
writeFileSync(
  join(destination, 'dossier.json'),
  buildDossier(destination, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
