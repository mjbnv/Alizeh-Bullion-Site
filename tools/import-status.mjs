// Shows how far the watch photo import has got, per brand.
// Usage (from the project root):  node tools/import-status.mjs
// Add --watch to refresh every 10 seconds (Ctrl+C to stop):  node tools/import-status.mjs --watch
import { readFile, readdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const feed = JSON.parse(await readFile(path.join(ROOT, 'tools/cache/products.json'), 'utf8'));
const watches = feed.filter((p) => p.images.length && /watch/i.test(p.type || 'watch'));

async function show() {
  const files = new Set(await readdir(path.join(ROOT, 'assets/img/watches/library')).catch(() => []));
  const ids = new Set([...files].map((f) => (f.match(/-(\d+)\.webp$/) || [])[1]).filter(Boolean));
  const by = {};
  for (const p of watches) {
    const b = (by[p.vendor] ||= { total: 0, done: 0 });
    b.total++; if (ids.has(String(p.id))) b.done++;
  }
  let workers = [];
  try {
    workers = execSync('ps -ax -o command', { encoding: 'utf8' }).split('\n')
      .filter((l) => l.startsWith('node tools/import-watches.mjs'))
      .map((l) => (l.match(/--brand (.+)$/) || [, 'all brands (main run)'])[1].trim());
  } catch {}
  const done = Object.values(by).reduce((s, b) => s + b.done, 0);
  const rows = Object.entries(by).sort((a, b) => b[1].total - a[1].total);
  const bar = (d, t) => { const n = Math.round((d / t) * 20); return '█'.repeat(n) + '░'.repeat(20 - n); };

  if (process.argv.includes('--watch')) console.clear();
  console.log(`\nWatch photo import — ${new Date().toLocaleTimeString()}`);
  console.log(`Overall: ${done} / ${watches.length} photos  ${bar(done, watches.length)}  ${Math.round((done / watches.length) * 100)}%`);
  console.log(`Workers running: ${workers.length ? workers.length + ' (' + workers.join(', ') + ')' : 'none (import finished or stopped)'}\n`);
  for (const [b, { done: d, total: t }] of rows.filter(([, v]) => v.done < v.total).slice(0, 25)) {
    console.log(`  ${b.padEnd(22)} ${String(d).padStart(4)} / ${String(t).padEnd(4)} ${bar(d, t)}`);
  }
  const complete = rows.filter(([, v]) => v.done === v.total).map(([b]) => b);
  if (complete.length) console.log(`\n  Finished (${complete.length}): ${complete.join(', ')}`);
  const left = rows.filter(([, v]) => v.done < v.total).length - 25;
  if (left > 0) console.log(`  …and ${left} more brands still to do`);
}

await show();
if (process.argv.includes('--watch')) setInterval(show, 10000);
