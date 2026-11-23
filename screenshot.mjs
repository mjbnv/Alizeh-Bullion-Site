// Full-page screenshot via Puppeteer.
// Usage: node screenshot.mjs <url> [label] [width]
// Saves to "./temporary screenshots/screenshot-N[-label].png" (auto-incremented, never overwritten).
import puppeteer from 'puppeteer';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [url = 'http://localhost:3000', label, width = '1440'] = process.argv.slice(2);
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'temporary screenshots');
await mkdir(dir, { recursive: true });

const nums = (await readdir(dir))
  .map(f => /^screenshot-(\d+)/.exec(f)?.[1])
  .filter(Boolean).map(Number);
const n = (nums.length ? Math.max(...nums) : 0) + 1;
const out = path.join(dir, `screenshot-${n}${label ? `-${label}` : ''}.png`);

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: Number(width), height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 500)); // let fonts/animations settle
  await page.screenshot({ path: out, fullPage: true });
  console.log(out);
} finally {
  await browser.close();
}
