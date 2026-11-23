// Builds the public website into dist/ for Cloudflare Pages.
// Only the pages and the assets folder are published: tools, notes, settings and .env stay private.
// The live-rate API lives in functions/ (Cloudflare picks that up separately).
// Usage: npm run build
import { cp, rm, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'dist');

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const pages = (await readdir(ROOT)).filter((f) => f.endsWith('.html'));
for (const f of pages) await cp(path.join(ROOT, f), path.join(OUT, f));
await cp(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });

// Browser caching: photos and fonts rarely change, so let visitors keep them for 30 days.
// Scripts, styles and the watch catalogue are re-checked so updates show up straight away.
await writeFile(path.join(OUT, '_headers'), `/assets/img/*
  Cache-Control: public, max-age=2592000

/assets/*.js
  Cache-Control: public, max-age=0, must-revalidate

/assets/*.css
  Cache-Control: public, max-age=0, must-revalidate
`);

console.log(`Built ${pages.length} pages + assets -> dist/`);
