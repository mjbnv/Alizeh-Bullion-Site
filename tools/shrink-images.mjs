// Resizes the watch photos to the size the site actually displays them (480×600, sharp on
// high-resolution phones), so pages load much faster. Originals are kept in tools/cache/originals/
// (not published). Safe to re-run: already-shrunk photos are skipped.
// Usage: node tools/shrink-images.mjs
import puppeteer from 'puppeteer';
import { readFile, writeFile, readdir, mkdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['assets/img/watches/library', 'assets/img/watches/cut'];
const W = 480, H = 600, QUALITY = 0.82;

const browser = await puppeteer.launch();
const page = await browser.newPage();
let before = 0, after = 0, done = 0, skipped = 0;

for (const dir of DIRS) {
  const abs = path.join(ROOT, dir);
  const backup = path.join(ROOT, 'tools/cache/originals', dir);
  await mkdir(backup, { recursive: true });
  const files = (await readdir(abs).catch(() => [])).filter((f) => f.endsWith('.webp'));
  for (const f of files) {
    const file = path.join(abs, f);
    const buf = await readFile(file);
    before += buf.length;
    // Read the image size from the WebP header; skip files that are already small enough.
    const kind = buf.toString('ascii', 12, 16);
    const [w, h] = kind === 'VP8X' ? [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1]
      : kind === 'VP8 ' ? [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff]
      : kind === 'VP8L' ? [(buf.readUInt32LE(21) & 0x3fff) + 1, ((buf.readUInt32LE(21) >> 14) & 0x3fff) + 1]
      : [Infinity, Infinity];
    if (w <= W && h <= H) { after += buf.length; skipped++; continue; }
    if (!(await stat(path.join(backup, f)).catch(() => null))) await copyFile(file, path.join(backup, f));
    const out = await page.evaluate(async (src, W, H, Q) => {
      const img = new Image(); img.src = src; await img.decode();
      const s = Math.min(W / img.naturalWidth, H / img.naturalHeight, 1);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      x.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      return c.toDataURL('image/webp', Q).split(',')[1];
    }, `data:image/webp;base64,${buf.toString('base64')}`, W, H, QUALITY);
    const small = Buffer.from(out, 'base64');
    await writeFile(file, small);
    after += small.length; done++;
    if (done % 200 === 0) process.stdout.write(`\r${done} photos resized`);
  }
}
await browser.close();
const mb = (n) => (n / 1e6).toFixed(0) + ' MB';
console.log(`\nResized ${done}, already small ${skipped}. Total ${mb(before)} -> ${mb(after)}. Originals in tools/cache/originals/`);
