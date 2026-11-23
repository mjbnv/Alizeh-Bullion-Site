// Watch image importer: fetches product photos from a Shopify store (used with permission),
// removes backgrounds, trims and centres each watch, and writes uniform transparent WebP files.
//
// Usage (from the project root):
//   node tools/import-watches.mjs                 # catalogue mode: images for the colourways in assets/watches-data.js
//   node tools/import-watches.mjs --all           # every watch product in the store  -> assets/img/watches/library/
//   node tools/import-watches.mjs --all --brand Rolex
//   node tools/import-watches.mjs --refresh       # re-download the product feed instead of using the cached copy
//
// Also works for your own photos: put files named after the key (e.g. "gmt__Pepsi.jpg") in tools/own-photos/
// and they take priority over the store image.

import puppeteer from 'puppeteer';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const ALL = args.includes('--all');
const REFRESH = args.includes('--refresh');
const BRAND = args.includes('--brand') ? args[args.indexOf('--brand') + 1] : null;
const CACHE = path.join(ROOT, 'tools/cache');
const OWN = path.join(ROOT, 'tools/own-photos');
const OUT = path.join(ROOT, ALL ? 'assets/img/watches/library' : 'assets/img/watches/cut');
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh) AlizehBullion-image-importer' };
const W = 800, H = 1000; // output canvas (4:5, matches the cards)

const cfg = JSON.parse(await readFile(path.join(ROOT, 'tools/watch-sources.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
await mkdir(CACHE, { recursive: true }); await mkdir(OUT, { recursive: true });

// ── 1. Product feed (cached) ──
async function loadFeed() {
  const file = path.join(CACHE, 'products.json');
  if (!REFRESH) { try { return JSON.parse(await readFile(file, 'utf8')); } catch {} }
  const all = [];
  for (let page = 1; page < 200; page++) {
    const res = await fetch(`${cfg.source}/products.json?limit=250&page=${page}`, { headers: UA });
    if (!res.ok) throw new Error(`feed page ${page}: HTTP ${res.status}`);
    const { products } = await res.json();
    if (!products.length) break;
    all.push(...products.map((p) => ({ id: p.id, title: p.title, handle: p.handle, vendor: p.vendor, type: p.product_type, images: p.images.map((i) => i.src) })));
    process.stdout.write(`\rfeed: ${all.length} products`);
    await sleep(600);
  }
  process.stdout.write('\n');
  await writeFile(file, JSON.stringify(all));
  return all;
}

// ── 2. Background removal + framing (runs in headless Chrome canvas) ──
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');
async function cutout(buf, mime) {
  const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
  return page.evaluate(async (dataUrl, W, H) => {
    const img = new Image(); img.src = dataUrl; await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, w, h), px = d.data;
    const idx = (i, j) => (j * w + i) * 4;
    // Border sample: already transparent?
    const border = [];
    for (let i = 0; i < w; i += 4) border.push(idx(i, 0), idx(i, h - 1));
    for (let j = 0; j < h; j += 4) border.push(idx(0, j), idx(w - 1, j));
    const transparent = border.filter((k) => px[k + 3] < 20).length / border.length > 0.5;
    let keyed = false;
    if (!transparent) {
      // Background colour = median of border pixels; flood-fill from edges within tolerance.
      const med = [0, 1, 2].map((ch) => border.map((k) => px[k + ch]).sort((a, b) => a - b)[border.length >> 1]);
      const dist = (k) => Math.max(Math.abs(px[k] - med[0]), Math.abs(px[k + 1] - med[1]), Math.abs(px[k + 2] - med[2]));
      const T = 22, SOFT = 48;
      const mask = new Uint8Array(w * h), stack = [];
      for (let i = 0; i < w; i++) stack.push(i, (h - 1) * w + i);
      for (let j = 0; j < h; j++) stack.push(j * w, j * w + w - 1);
      while (stack.length) {
        const p = stack.pop();
        if (mask[p]) continue;
        if (dist(p * 4) > T) continue;
        mask[p] = 1;
        const i = p % w, j = (p / w) | 0;
        if (i > 0) stack.push(p - 1); if (i < w - 1) stack.push(p + 1);
        if (j > 0) stack.push(p - w); if (j < h - 1) stack.push(p + w);
      }
      for (let p = 0; p < w * h; p++) {
        if (mask[p]) { px[p * 4 + 3] = 0; continue; }
        const i = p % w, j = (p / w) | 0;
        const near = (i > 0 && mask[p - 1]) || (i < w - 1 && mask[p + 1]) || (j > 0 && mask[p - w]) || (j < h - 1 && mask[p + w]);
        if (near) { const t = Math.min(1, Math.max(0, (dist(p * 4) - T) / (SOFT - T))); px[p * 4 + 3] = Math.round(px[p * 4 + 3] * (0.35 + 0.65 * t)); }
      }
      x.putImageData(d, 0, 0); keyed = true;
    }
    // Trim to visible pixels
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (px[idx(i, j) + 3] > 12) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    if (x1 <= x0 || y1 <= y0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    // Fit into W×H with 4% padding, centred
    const pad = 0.04, s = Math.min((W * (1 - 2 * pad)) / bw, (H * (1 - 2 * pad)) / bh);
    const o = document.createElement('canvas'); o.width = W; o.height = H;
    const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high';
    ox.drawImage(c, x0, y0, bw, bh, (W - bw * s) / 2, (H - bh * s) / 2, bw * s, bh * s);
    return { data: o.toDataURL('image/webp', 0.9).split(',')[1], keyed, transparent };
  }, dataUrl, W, H);
}

async function download(url) {
  const sized = url.replace(/(\.(jpg|jpeg|png|webp))(\?|$)/i, '_1200x$1$3');
  const mimeOf = (u) => (/\.png/i.test(u) ? 'image/png' : /\.webp/i.test(u) ? 'image/webp' : 'image/jpeg');
  for (const u of [sized, url]) {
    try {
      const res = await fetch(u, { headers: UA });
      if (res.ok) return { buf: Buffer.from(await res.arrayBuffer()), mime: res.headers.get('content-type') || mimeOf(u) };
    } catch {}
    // Some CDNs reject Node's fetch; fall back to curl
    const buf = await new Promise((resolve) => execFile('curl', ['-fsSL', '-A', UA['User-Agent'], u], { encoding: 'buffer', maxBuffer: 50e6 }, (err, out) => resolve(err ? null : out)));
    if (buf && buf.length) return { buf, mime: mimeOf(u) };
  }
  throw new Error('download failed');
}

// Reference numbers must match whole (so "6239" doesn't match "336239"); words match as substrings.
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (title, kw) => /\d/.test(kw)
  ? new RegExp(`(^|[^A-Z0-9])M?${esc(kw.toUpperCase())}([^0-9]|$)`).test(title.toUpperCase())
  : title.toUpperCase().includes(kw.toUpperCase());
function pick(feed, rule) {
  const cands = feed.filter((p) => p.images.length && /rolex/i.test(p.vendor + ' ' + p.title) && !(rule.not || []).some((n) => has(p.title, n)));
  for (const set of rule.any) { const hit = cands.find((p) => set.every((k) => has(p.title, k))); if (hit) return hit; }
  return null;
}

// Parse a listing title into model / reference / size / metal / dial for filtering and display.
const ROLEX_MODELS = [
  [/daytona/i, 'Cosmograph Daytona'], [/gmt[\s-]*master/i, 'GMT-Master II'], [/sea[\s-]*dweller|deepsea/i, 'Sea-Dweller'],
  [/submariner/i, 'Submariner'], [/yacht[\s-]*master/i, 'Yacht-Master'], [/sky[\s-]*dweller/i, 'Sky-Dweller'],
  [/land[\s-]*dweller/i, 'Land-Dweller'], [/day[\s-]*date|president/i, 'Day-Date'], [/datejust|date[\s-]*just/i, 'Datejust'],
  [/explorer/i, 'Explorer'], [/air[\s-]*king/i, 'Air-King'], [/milgauss/i, 'Milgauss'], [/\b1908\b|perpetual 1908/i, '1908'],
  [/pearlmaster/i, 'Pearlmaster'], [/cellini/i, 'Cellini'], [/oyster perpetual/i, 'Oyster Perpetual'],
];
const ROLEX_REF_MODEL = [[/^1165|^1265|^1166|^1265/, 'Cosmograph Daytona'], [/^1267|^1167|^1267/, 'GMT-Master II'], [/^1266|^1166|^1246|^1146/, 'Submariner'],
  [/^2282|^1282|^1182|^2182/, 'Day-Date'], [/^1262|^1263|^1264|^1162|^2781|^2791|^2792|^1272/, 'Datejust'], [/^3362|^3369|^3269/, 'Sky-Dweller'],
  [/^1266|^2266|^1366/, 'Sea-Dweller'], [/^1266[5-8]|^2266|^1686/, 'Yacht-Master'], [/^1243|^2243|^2240/, 'Explorer'], [/^1343|^1260|^2770|^1240/, 'Oyster Perpetual'], [/^525/, '1908']];
// The store spells a few brands two ways; merge them so each brand has one filter.
const BRAND_ALIASES = { 'tag heuer': 'TAG Heuer', 'studio underd0g': 'Studio Underdog', 'parmigiani': 'Parmigiani Fleurier', 'glashutte original': 'Glashütte Original' };
const normBrand = (b) => BRAND_ALIASES[(b || '').trim().toLowerCase()] || (b || '').trim() || 'Other';

// Collection names for the main non-Rolex brands. First match wins, so list sub-lines first.
const BRAND_MODELS = {
  'Audemars Piguet': [[/royal oak offshore/i, 'Royal Oak Offshore'], [/royal oak concept/i, 'Royal Oak Concept'], [/royal oak/i, 'Royal Oak'], [/code 11\.?59/i, 'Code 11.59'], [/millenary/i, 'Millenary'], [/jules audemars/i, 'Jules Audemars']],
  'Patek Philippe': [[/nautilus/i, 'Nautilus'], [/aquanaut/i, 'Aquanaut'], [/grand complication/i, 'Grand Complications'], [/complication/i, 'Complications'], [/calatrava/i, 'Calatrava'], [/twenty[\s~-]*4/i, 'Twenty~4'], [/gondolo/i, 'Gondolo'], [/golden ellipse/i, 'Golden Ellipse'], [/cubitus/i, 'Cubitus']],
  'Hublot': [[/spirit of big bang/i, 'Spirit of Big Bang'], [/square bang/i, 'Square Bang'], [/big bang/i, 'Big Bang'], [/classic fusion/i, 'Classic Fusion'], [/\bmp[\s-]?\d/i, 'MP Collection']],
  'Franck Muller': [[/vanguard/i, 'Vanguard'], [/cintr[ée]e|curvex/i, 'Cintrée Curvex'], [/long island/i, 'Long Island'], [/casablanca/i, 'Casablanca'], [/conquistador/i, 'Conquistador'], [/master square/i, 'Master Square'], [/crazy hours/i, 'Crazy Hours']],
  'Breitling': [[/navitimer/i, 'Navitimer'], [/chronomat/i, 'Chronomat'], [/superocean/i, 'Superocean'], [/avenger/i, 'Avenger'], [/premier/i, 'Premier'], [/bentley/i, 'Bentley'], [/endurance/i, 'Endurance'], [/top time/i, 'Top Time']],
  'Ulysse Nardin': [[/freak/i, 'Freak'], [/diver/i, 'Diver'], [/marine/i, 'Marine'], [/blast/i, 'Blast'], [/executive/i, 'Executive'], [/classico/i, 'Classico']],
  'Bvlgari': [[/octo/i, 'Octo'], [/serpenti/i, 'Serpenti'], [/aluminium/i, 'Aluminium'], [/diagono/i, 'Diagono'], [/bvlgari bvlgari|bulgari bulgari/i, 'Bvlgari Bvlgari'], [/divas/i, 'Divas’ Dream'], [/lvcea|lucea/i, 'Lvcea']],
  'Cartier': [[/santos/i, 'Santos'], [/tank/i, 'Tank'], [/ballon bleu/i, 'Ballon Bleu'], [/panth[eè]re/i, 'Panthère'], [/pasha/i, 'Pasha'], [/ronde/i, 'Ronde'], [/drive/i, 'Drive'], [/calibre/i, 'Calibre'], [/baignoire/i, 'Baignoire'], [/cl[ée] de/i, 'Clé'], [/crash/i, 'Crash']],
  'Omega': [[/speedmaster/i, 'Speedmaster'], [/seamaster|aqua terra|planet ocean/i, 'Seamaster'], [/constellation/i, 'Constellation'], [/de ville/i, 'De Ville']],
  'F.P. Journe': [[/chronom[eè]tre bleu/i, 'Chronomètre Bleu'], [/octa/i, 'Octa'], [/[ée]l[ée]gante/i, 'Élégante'], [/tourbillon/i, 'Tourbillon Souverain'], [/centigraphe/i, 'Centigraphe'], [/r[ée]sonance/i, 'Chronomètre à Résonance'], [/linesport|lineSport/i, 'LineSport']],
  'Girard-Perregaux': [[/laureato/i, 'Laureato'], [/1966/i, '1966'], [/vintage 1945/i, 'Vintage 1945'], [/cat'?s eye/i, 'Cat’s Eye']],
  'Chopard': [[/happy sport/i, 'Happy Sport'], [/happy diamonds/i, 'Happy Diamonds'], [/alpine eagle/i, 'Alpine Eagle'], [/mille miglia/i, 'Mille Miglia'], [/l\.?u\.?c/i, 'L.U.C'], [/imp[ée]riale/i, 'Impériale']],
  'Longines': [[/master collection/i, 'Master Collection'], [/hydroconquest/i, 'HydroConquest'], [/conquest/i, 'Conquest'], [/spirit/i, 'Spirit'], [/dolcevita/i, 'DolceVita'], [/legend diver/i, 'Legend Diver'], [/primaluna/i, 'PrimaLuna']],
  'Zenith': [[/defy/i, 'Defy'], [/chronomaster/i, 'Chronomaster'], [/el primero/i, 'El Primero'], [/pilot/i, 'Pilot'], [/elite/i, 'Elite']],
  'Jaeger-LeCoultre': [[/reverso/i, 'Reverso'], [/master/i, 'Master'], [/polaris/i, 'Polaris'], [/rendez[\s-]*vous/i, 'Rendez-Vous']],
  'Panerai': [[/luminor/i, 'Luminor'], [/radiomir/i, 'Radiomir'], [/submersible/i, 'Submersible']],
  'Piaget': [[/polo/i, 'Polo'], [/altiplano/i, 'Altiplano'], [/possession/i, 'Possession'], [/limelight/i, 'Limelight']],
  'IWC': [[/portugieser|portuguese/i, 'Portugieser'], [/big pilot/i, 'Big Pilot'], [/pilot/i, 'Pilot’s Watch'], [/portofino/i, 'Portofino'], [/aquatimer/i, 'Aquatimer'], [/ingenieur/i, 'Ingenieur'], [/da vinci/i, 'Da Vinci']],
  'Vacheron Constantin': [[/overseas/i, 'Overseas'], [/patrimony/i, 'Patrimony'], [/traditionnelle/i, 'Traditionnelle'], [/fiftysix/i, 'Fiftysix'], [/historiques/i, 'Historiques'], [/[ée]g[ée]rie/i, 'Égérie']],
  'Tudor': [[/black bay/i, 'Black Bay'], [/pelagos/i, 'Pelagos'], [/royal/i, 'Royal'], [/ranger/i, 'Ranger']],
  'Oris': [[/aquis/i, 'Aquis'], [/big crown/i, 'Big Crown'], [/divers sixty[\s-]*five/i, 'Divers Sixty-Five'], [/prope?ilot/i, 'ProPilot']],
  'Breguet': [[/marine/i, 'Marine'], [/classique/i, 'Classique'], [/type xx/i, 'Type XX'], [/reine de naples/i, 'Reine de Naples'], [/tradition/i, 'Tradition']],
  'Blancpain': [[/fifty fathoms/i, 'Fifty Fathoms'], [/villeret/i, 'Villeret'], [/air command/i, 'Air Command']],
  'Jacob & Co': [[/astronomia/i, 'Astronomia'], [/epic x/i, 'Epic X'], [/bugatti/i, 'Bugatti'], [/opera/i, 'Opera']],
  'Roger Dubuis': [[/excalibur/i, 'Excalibur']],
  'TAG Heuer': [[/carrera/i, 'Carrera'], [/monaco/i, 'Monaco'], [/aquaracer/i, 'Aquaracer'], [/formula 1/i, 'Formula 1']],
};

function describe(title, rawBrand) {
  const brand = normBrand(rawBrand);
  const t = title.replace(/\s+/g, ' ').trim();
  // Brand-specific reference formats first, then the Rolex-style fallback.
  const BRAND_REF = {
    'Audemars Piguet': /\b(\d{5}[A-Z]{2}(?:\.[A-Z0-9]{2,8}){1,3})\b/i,          // 26331ST.OO.1220ST.01
    'Patek Philippe': /\b(\d{4}(?:\/\d{1,4})?[A-Z]{0,3}(?:-\d{3})?)\b(?!\s?mm)/i, // 5711/1A-010, 5167A-001
    Omega: /\b(\d{3}\.\d{2}\.\d{2}\.\d{2}\.\d{2}\.\d{3})\b/,                  // 310.30.42.50.01.002
    'Richard Mille': /\b(RM\s?-?\d{2,3}(?:-\d{2})?)\b/i,                         // RM 011, RM 07-01
  };
  const refM = (BRAND_REF[brand] && t.match(BRAND_REF[brand])) || t.match(/\bM?(\d{5,6}[A-Z]{0,8}(?:[-\s]\d{4})?)\b/i) || t.match(/\b(\d{4})\b(?!\s?mm)/i);
  const ref = refM ? refM[1].toUpperCase().replace(/\s(?=\d{4}$)/, '-').replace(/^RM\s?-?/, 'RM ') : '';
  let model = '';
  if (/rolex/i.test(brand)) {
    model = (ROLEX_MODELS.find(([re]) => re.test(t)) || [])[1] || (ROLEX_REF_MODEL.find(([re]) => re.test(ref)) || [])[1] || 'Other models';
    if (model === 'Datejust' && /lady/i.test(t)) model = 'Lady-Datejust';
  } else if (brand === 'Richard Mille') {
    const rm = t.match(/\bRM\s?-?(\d{2,3})(?:[-\s](\d{2}))?/i);
    model = rm ? `RM ${rm[1].padStart(3, '0')}` : 'Other models';
  } else {
    model = ((BRAND_MODELS[brand] || []).find(([re]) => re.test(t)) || [])[1] || 'Other models';
  }
  const size = (t.match(/(\d{2}(?:\.\d)?)\s?mm/i) || t.match(/(?:datejust|day[\s-]*date|oyster perpetual|explorer|air[\s-]*king|yacht[\s-]*master|sky[\s-]*dweller|1908|pearlmaster)\s+(?:ii\s+)?(\d{2})\b/i) || [])[1] || '';
  const metal = (t.match(/(platinum|everose|rose gold|white gold|yellow gold|oystersteel|stainless steel|steel)/i) || [])[1] || '';
  const noRef = (refM ? t.replace(refM[0], ' ') : t).replace(/\bM?\d{4,6}[A-Z]{0,8}(?:[-\s]\d{4})?\b/gi, ' ').replace(/\b[A-Z]{2,6}\b(?=\s)/g, (m) => (/^(TBR|RBR|LN|LV|LB|BLRO|BLNR|GRNR|VTNR|CHNR|SACI|SA|BR|ADJ|MOP|YLW|BLK)$/.test(m) ? ' ' : m));
  const STOP = /^(rolex|oyster|perpetual|professional|cosmograph|daytona|datejust|lady|day|date|day-date|gmt|master|ii|submariner|sky|dweller|sky-dweller|yacht|yacht-master|explorer|president|presidential|oystersteel|steel|stainless|gold|everose|platinum|18k|18kt|18ct|and|&|with|mm|watch|men'?s|ladies|automatic|bezel|bracelet|fluted|jubilee|\d+|\d+mm|-)$/i;
  const words = noRef.replace(/[,;()]/g, ' ').split(/\s+/).filter((w) => w && !/^[A-Z]{2,5}$/.test(w));
  const di = words.findIndex((w) => /^dial$/i.test(w));
  const picked = [];
  for (let k = di - 1; di > 0 && k >= 0 && picked.length < 4; k--) { if (STOP.test(words[k])) break; picked.unshift(words[k]); }
  const dial = picked.join(' ');
  const name = t.replace(new RegExp(`^(${esc(brand)}|${esc(rawBrand || brand)})\\s*`, 'i'), '').replace(/\s*(men'?s|women'?s|ladies|unisex)\s+watch\s*-?$/i, '').trim();
  return { name, model, ref, size, metal: metal.replace(/\b\w/g, (c) => c.toUpperCase()), dial: dial.replace(/\b\w/g, (c) => c.toUpperCase()) };
}

const feed = await loadFeed();
console.log(`feed: ${feed.length} products (cached in tools/cache/products.json)`);

if (args.includes('--catalogue-only')) {
  // Rebuild assets/watch-catalogue.js from photos already downloaded. No downloads; safe while an import runs.
  const libDir = path.join(ROOT, 'assets/img/watches/library');
  const byId = Object.fromEntries((await readdir(libDir)).map((f) => [(f.match(/-(\d+)\.webp$/) || [])[1], f]).filter(([id]) => id));
  const list = feed.filter((p) => byId[p.id] && /watch/i.test(p.type || 'watch'))
    .map((p) => ({ id: p.id, title: p.title, brand: normBrand(p.vendor), ...describe(p.title, p.vendor), file: `assets/img/watches/library/${byId[p.id]}` }));
  await writeFile(path.join(ROOT, 'assets/watch-catalogue.js'), `// Generated by tools/import-watches.mjs --catalogue-only on ${new Date().toISOString().slice(0, 10)}. Re-run the tool to update.\nwindow.AB_CATALOGUE = ${JSON.stringify(list)};\n`);
  console.log(`catalogue: ${list.length} listings from ${new Set(list.map((m) => m.brand)).size} brands -> assets/watch-catalogue.js`);
  await browser.close();
  process.exit(0);
}

if (ALL) {
  // ── Library mode: every watch product ──
  const list = feed.filter((p) => p.images.length && /watch/i.test(p.type || 'watch') && (!BRAND || (p.vendor || '').toLowerCase() === BRAND.toLowerCase()));
  // Extra workers on the same brand can share the work: --reverse starts from the end, --skip N starts N items in.
  if (args.includes('--reverse')) list.reverse();
  if (args.includes('--skip')) list.push(...list.splice(0, Number(args[args.indexOf('--skip') + 1]) || 0));
  const manifest = [];
  let n = 0;
  for (const p of list) {
    const file = `${slug(p.vendor || 'watch')}-${slug(p.title).slice(0, 70)}-${p.id}.webp`;
    const out = path.join(OUT, file);
    try {
      if (!(await stat(out).catch(() => null))) {
        const { buf, mime } = await download(p.images[0]);
        const r = await cutout(buf, mime);
        if (!r) throw new Error('empty image');
        await writeFile(out, Buffer.from(r.data, 'base64'));
        await sleep(250);
      }
      manifest.push({ id: p.id, title: p.title, brand: normBrand(p.vendor), ...describe(p.title, p.vendor), file: `assets/img/watches/library/${file}`, product: `${cfg.source}/products/${p.handle}` });
    } catch (e) { console.warn(`\n  skip ${p.title}: ${e.message}`); }
    process.stdout.write(`\rlibrary: ${++n}/${list.length}`);
  }
  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  // Site catalogue (read by watches.html). Merges with any brands imported earlier.
  const catFile = path.join(ROOT, 'assets/watch-catalogue.js');
  let existing = [];
  try { existing = JSON.parse((await readFile(catFile, 'utf8')).replace(/^[\s\S]*?window\.AB_CATALOGUE = /, '').replace(/;\s*$/, '')); } catch {}
  const brands = new Set(manifest.map((m) => m.brand));
  const merged = [...existing.filter((m) => !brands.has(m.brand)), ...manifest.map(({ product, ...m }) => m)];
  await writeFile(catFile, `// Generated by tools/import-watches.mjs --all on ${new Date().toISOString().slice(0, 10)}. Re-run the tool to update.\nwindow.AB_CATALOGUE = ${JSON.stringify(merged)};\n`);
  console.log(`\nlibrary: ${manifest.length} images -> ${path.relative(ROOT, OUT)}/ ; catalogue: ${merged.length} listings -> assets/watch-catalogue.js`);
} else {
  // ── Catalogue mode: one image per colourway on the Watches page ──
  const own = await readdir(OWN).catch(() => []);
  const result = {};
  for (const [key, rule] of Object.entries(cfg.watches)) {
    const ownFile = own.find((f) => f.replace(/\.[^.]+$/, '') === key.replace(':', '__'));
    try {
      let src, buf, mime, title;
      if (ownFile) { buf = await readFile(path.join(OWN, ownFile)); mime = ownFile.endsWith('.png') ? 'image/png' : 'image/jpeg'; title = 'Own photo'; }
      else {
        const p = pick(feed, rule);
        if (!p) { console.log(`  –  ${key.padEnd(26)} no match (illustration stays)`); continue; }
        ({ buf, mime } = await download(p.images[0])); title = p.title; src = `${cfg.source}/products/${p.handle}`;
      }
      const r = await cutout(buf, mime);
      if (!r) throw new Error('empty image');
      const file = `${slug(key)}.webp`;
      await writeFile(path.join(OUT, file), Buffer.from(r.data, 'base64'));
      result[key] = { src: `assets/img/watches/cut/${file}`, title, product: src || null };
      console.log(`  ✓  ${key.padEnd(26)} ${title.slice(0, 60)}${r.keyed ? '  [background removed]' : r.transparent ? '  [already transparent]' : ''}`);
      await sleep(250);
    } catch (e) { console.log(`  !  ${key.padEnd(26)} ${e.message}`); }
  }
  const js = `// Generated by tools/import-watches.mjs on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand; re-run the tool.\nwindow.AB_WATCH_IMAGES = ${JSON.stringify(result, null, 1)};\n`;
  await writeFile(path.join(ROOT, 'assets/watch-images.js'), js);
  console.log(`\n${Object.keys(result).length}/${Object.keys(cfg.watches).length} colourways have photos -> assets/watch-images.js`);
}
await browser.close();
