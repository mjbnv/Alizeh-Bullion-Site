// Illustrated watch faces generated from colour data — a consistent stand-in until real photos are added.
// No maker logos or wordmarks are drawn.
(() => {
  const METALS = {
    steel: ['#F4F5F6', '#C9CCD0', '#9EA3A8'],
    white: ['#F6F7F8', '#D3D6DA', '#A9AEB3'],
    platinum: ['#F7F7F5', '#D9D9D5', '#B0B0AB'],
    yellow: ['#F6E2A4', '#D7B25A', '#A8823A'],
    everose: ['#F4D2C2', '#D9A38B', '#A9715A'],
    twotone: ['#F4F5F6', '#C9CCD0', '#9EA3A8'],
    twotoneRose: ['#F4F5F6', '#C9CCD0', '#9EA3A8'],
  };
  const GOLD = { twotone: METALS.yellow, twotoneRose: METALS.everose };
  let uid = 0;
  const pt = (cx, cy, r, deg) => { const a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const arc = (cx, cy, r1, r2, a0, a1) => {
    const [x1, y1] = pt(cx, cy, r2, a0), [x2, y2] = pt(cx, cy, r2, a1), [x3, y3] = pt(cx, cy, r1, a1), [x4, y4] = pt(cx, cy, r1, a0);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M${x1} ${y1}A${r2} ${r2} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${large} 0 ${x4} ${y4}Z`;
  };
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 255000; };

  function watchSVG(w) {
    const c = w.colors, id = 'w' + (++uid);
    const m = METALS[c.case] || METALS.steel, g = GOLD[c.case];
    const cx = 120, cy = 150, R = 86;
    const bezelInner = c.bezelStyle === 'smooth' || c.bezelStyle === 'fluted' ? 72 : 68;
    const dialR = bezelInner - 3;
    const light = lum(c.dial) > 0.55;
    const ink = light ? '#2A2A2C' : '#EDEDED';
    let s = `<svg viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of the ${w.nickname} ${w.model}">
    <defs>
      <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m[0]}"/><stop offset=".5" stop-color="${m[1]}"/><stop offset="1" stop-color="${m[2]}"/></linearGradient>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${(g || m)[0]}"/><stop offset=".5" stop-color="${(g || m)[1]}"/><stop offset="1" stop-color="${(g || m)[2]}"/></linearGradient>
      <radialGradient id="${id}d" cx=".42" cy=".36" r=".75"><stop offset="0" stop-color="${c.dial}" stop-opacity=".82"/><stop offset=".55" stop-color="${c.dial}"/><stop offset="1" stop-color="${c.dial}"/></radialGradient>
      <linearGradient id="${id}sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <clipPath id="${id}c"><circle cx="${cx}" cy="${cy}" r="${dialR}"/></clipPath>
      <filter id="${id}sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#8A6A2F" flood-opacity=".28"/></filter>
    </defs>
    <g filter="url(#${id}sh)">`;

    // Bracelet: three-link (Oyster) or five-link (Jubilee); centre links gold on two-tone
    const links = (y0, y1, dir) => {
      let o = `<path d="M84 ${y0}L${84 + dir * 0} ${y1}H156L156 ${y0}Z" fill="url(#${id}m)"/>`;
      const step = 11;
      for (let y = Math.min(y0, y1); y < Math.max(y0, y1); y += step) {
        o += `<line x1="84" x2="156" y1="${y}" y2="${y}" stroke="${m[2]}" stroke-opacity=".55" stroke-width=".8"/>`;
      }
      if (c.jubilee) {
        o += `<rect x="104" y="${Math.min(y0, y1)}" width="32" height="${Math.abs(y1 - y0)}" fill="url(#${id}g)" opacity=".9"/>`;
        o += `<line x1="98" x2="98" y1="${y0}" y2="${y1}" stroke="${m[2]}" stroke-opacity=".5"/><line x1="142" x2="142" y1="${y0}" y2="${y1}" stroke="${m[2]}" stroke-opacity=".5"/>`;
      } else {
        o += `<rect x="102" y="${Math.min(y0, y1)}" width="36" height="${Math.abs(y1 - y0)}" fill="url(#${id}g)" opacity="${g ? 1 : .55}"/>`;
      }
      return o;
    };
    s += links(0, 70, 1) + links(230, 300, 1);
    // Lugs + case
    s += `<path d="M78 70H162L170 104H70Z M70 196H170L162 230H78Z" fill="url(#${id}m)"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R + 6}" fill="url(#${id}m)"/>`;
    // Crown (and guards)
    const crownX = c.lefty ? cx - R - 13 : cx + R + 3;
    s += `<rect x="${crownX}" y="${cy - 9}" width="10" height="18" rx="2.5" fill="url(#${id}m)" stroke="${m[2]}" stroke-width=".6"/>`;
    if (w.family === 'daytona') {
      s += `<rect x="${cx + R - 2}" y="${cy - 50}" width="10" height="12" rx="2" fill="url(#${id}m)" transform="rotate(30 ${cx + R} ${cy - 44})"/><rect x="${cx + R - 2}" y="${cy + 38}" width="10" height="12" rx="2" fill="url(#${id}m)" transform="rotate(-30 ${cx + R} ${cy + 44})"/>`;
    }

    // Bezel
    const bz = c.bezel, st = c.bezelStyle;
    if (st === 'gmt') {
      s += `<path d="${arc(cx, cy, bezelInner, R, -90, 90)}" fill="${bz[0]}"/><path d="${arc(cx, cy, bezelInner, R, 90, 270)}" fill="${bz[1]}"/>`;
      for (let h = 0; h < 24; h++) {
        const [x, y] = pt(cx, cy, (R + bezelInner) / 2, h * 15);
        if (h === 0) s += `<path d="M${x} ${y + 4}l-4.5 -7.5h9z" fill="#F2F2F2"/>`;
        else if (h % 2 === 0) s += `<text x="${x}" y="${y + 3}" font-size="7.5" font-family="Montserrat,Arial" font-weight="600" fill="#F2F2F2" text-anchor="middle" transform="rotate(${h * 15} ${x} ${y})">${h}</text>`;
        else s += `<circle cx="${x}" cy="${y}" r="1.4" fill="#F2F2F2"/>`;
      }
    } else if (st === 'dive') {
      s += `<path d="${arc(cx, cy, bezelInner, R, 0, 359.99)}" fill="${bz[0]}"/>`;
      const fg = lum(bz[0]) > 0.6 ? '#3a3a3a' : '#F2F2F2';
      for (let i = 0; i < 60; i += 5) {
        const [x, y] = pt(cx, cy, (R + bezelInner) / 2, i * 6);
        if (i === 0) s += `<path d="M${x} ${y + 4}l-5 -8h10z" fill="none" stroke="${fg}" stroke-width="1.4"/>`;
        else if (i % 10 === 0) s += `<text x="${x}" y="${y + 3.2}" font-size="9" font-family="Montserrat,Arial" font-weight="600" fill="${fg}" text-anchor="middle" transform="rotate(${i * 6} ${x} ${y})">${i}</text>`;
        else s += `<rect x="${x - 1.2}" y="${y - 4}" width="2.4" height="8" fill="${fg}" transform="rotate(${i * 6} ${x} ${y})"/>`;
      }
      for (let i = 1; i < 15; i++) { const [x1, y1] = pt(cx, cy, R - 3, i * 6), [x2, y2] = pt(cx, cy, R - 8, i * 6); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fg}" stroke-width="1"/>`; }
    } else if (st === 'tachy') {
      const metal = bz[0].toUpperCase() === '#D7D9DC' || bz[0].toUpperCase() === '#D7B25A';
      s += `<path d="${arc(cx, cy, bezelInner, R, 0, 359.99)}" fill="${metal ? `url(#${id}${bz[0].toUpperCase() === '#D7B25A' ? 'g' : 'm'})` : bz[0]}"/>`;
      const fg = metal ? '#2A2A2C' : '#EDEDED';
      for (let i = 0; i < 48; i++) { const [x1, y1] = pt(cx, cy, R - 2.5, i * 7.5), [x2, y2] = pt(cx, cy, R - (i % 4 ? 6 : 9), i * 7.5); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fg}" stroke-width="${i % 4 ? .7 : 1.3}"/>`; }
      [400, 200, 150, 120, 100, 85, 75, 65].forEach((n, i) => { const a = 30 + i * 38; const [x, y] = pt(cx, cy, bezelInner + 5, a); s += `<text x="${x}" y="${y + 2.5}" font-size="6.5" font-family="Montserrat,Arial" font-weight="600" fill="${n === 100 && c.accent ? c.accent : fg}" text-anchor="middle" transform="rotate(${a} ${x} ${y})">${n}</text>`; });
    } else if (st === 'fluted') {
      s += `<path d="${arc(cx, cy, bezelInner, R, 0, 359.99)}" fill="url(#${id}${bz[0] === '#D7B25A' ? 'g' : 'm'})"/>`;
      for (let i = 0; i < 64; i++) { const [x1, y1] = pt(cx, cy, R - 1, i * 5.625), [x2, y2] = pt(cx, cy, bezelInner + 1, i * 5.625); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${i % 2 ? '#ffffff' : '#000000'}" stroke-opacity="${i % 2 ? .5 : .16}" stroke-width="2.6"/>`; }
    } else if (st === 'rainbow') {
      const cols = ['#E0262B', '#F05A28', '#F7941D', '#FFC20E', '#8DC63F', '#1DB16A', '#00A99D', '#1C75BC', '#2E3192', '#662D91', '#9E1F63', '#D6246E'];
      for (let i = 0; i < 36; i++) s += `<path d="${arc(cx, cy, bezelInner, R, i * 10 + .6, i * 10 + 9.4)}" fill="${cols[Math.floor(i / 3)]}"/>`;
    } else if (st === 'diamond') {
      s += `<path d="${arc(cx, cy, bezelInner, R, 0, 359.99)}" fill="url(#${id}g)"/>`;
      for (let i = 0; i < 36; i++) { const [x, y] = pt(cx, cy, (R + bezelInner) / 2, i * 10); s += `<circle cx="${x}" cy="${y}" r="6" fill="#FBFBFA" stroke="#C9C9C6" stroke-width=".6"/><circle cx="${x - 1.6}" cy="${y - 1.6}" r="1.6" fill="#fff"/>`; }
    } else {
      s += `<path d="${arc(cx, cy, bezelInner, R, 0, 359.99)}" fill="url(#${id}m)"/>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="${bezelInner}" fill="${m[2]}"/>`;

    // Dial
    s += `<circle cx="${cx}" cy="${cy}" r="${dialR}" fill="url(#${id}d)"/>`;
    if (c.pattern === 'tiger') {
      for (let i = -6; i < 7; i++) s += `<path d="M${cx - 70} ${cy + i * 12}q35 -10 70 0t70 0" stroke="#2A2016" stroke-width="3.5" fill="none" opacity=".55" clip-path="url(#${id}c)"/>`;
    }
    if (c.pattern === 'puzzle') {
      const pc = ['#E8423F', '#F7A62B', '#3BB273', '#2D7DD2', '#8E5CC9', '#F25C9A', '#F4D35E', '#22B5C9'];
      let k = 0;
      for (let y = cy - dialR; y < cy + dialR; y += 16) for (let x = cx - dialR; x < cx + dialR; x += 16) {
        s += `<rect x="${x}" y="${y}" width="15" height="15" rx="3" fill="${pc[k++ % pc.length]}" opacity=".9" clip-path="url(#${id}c)"/>`; k += (x * 7 + y) % 3;
      }
    }
    if (c.pattern === 'palm') {
      for (let i = 0; i < 9; i++) { const a = i * 40 + 10; const [x, y] = pt(cx, cy, 34 + (i % 3) * 10, a); s += `<path d="M${x} ${y}q8 -10 18 -6M${x} ${y}q-2 -12 6 -18M${x} ${y}q-10 -6 -16 2" stroke="${'#3E5A30'}" stroke-width="2" fill="none" opacity=".7"/>`; }
    }
    // Indices
    for (let i = 0; i < 12; i++) {
      const a = i * 30;
      if (w.family === 'daytona' && (i === 3 || i === 6 || i === 9)) continue;
      if (c.day && i === 0) continue;
      if (c.date && i === 3 && w.family !== 'daytona') continue;
      const [x, y] = pt(cx, cy, dialR - 12, a);
      if (w.family === 'datejust' && c.accent) {
        const roman = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'][i];
        s += `<text x="${x}" y="${y + 3.5}" font-size="9.5" font-family="'Playfair Display',Georgia" font-weight="600" fill="${c.accent}" text-anchor="middle">${roman}</text>`;
      } else if (w.family === 'submariner' || w.family === 'gmt' || w.family === 'datejust' && w.ref === '1625') {
        if (i % 3 === 0) s += `<rect x="${x - 3.2}" y="${y - 8}" width="6.4" height="16" rx="1" fill="#F4F2EA" stroke="${m[1]}" stroke-width="1" transform="rotate(${a} ${x} ${y})"/>`;
        else s += `<circle cx="${x}" cy="${y}" r="4.4" fill="#F4F2EA" stroke="${m[1]}" stroke-width="1"/>`;
        if (i === 0) s += ``;
      } else {
        s += `<rect x="${x - 1.8}" y="${y - 7}" width="3.6" height="14" rx="1" fill="url(#${id}${c.case === 'yellow' || c.case === 'twotone' ? 'g' : 'm'})" stroke="${light ? '#00000033' : '#ffffff22'}" stroke-width=".5" transform="rotate(${a} ${x} ${y})"/>`;
      }
    }
    // Minute track
    for (let i = 0; i < 60; i++) { if (i % 5 === 0) continue; const [x1, y1] = pt(cx, cy, dialR - 2, i * 6), [x2, y2] = pt(cx, cy, dialR - 5, i * 6); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-opacity=".45" stroke-width=".7"/>`; }

    // Daytona sub-dials
    if (w.family === 'daytona') {
      [[cx - 27, cy], [cx + 27, cy], [cx, cy + 27]].forEach(([x, y]) => {
        const ring = c.subRing;
        s += `<circle cx="${x}" cy="${y}" r="14" fill="${ring ? c.dial : c.sub}" stroke="${ring ? c.sub : c.sub}" stroke-width="${ring ? 2.4 : 0}"/>`;
        for (let i = 0; i < 12; i++) { const [a1, b1] = pt(x, y, 13, i * 30), [a2, b2] = pt(x, y, 10.5, i * 30); s += `<line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" stroke="${ring ? (lum(c.dial) > .55 ? '#333' : '#ddd') : (lum(c.sub) > .55 ? '#333' : '#ddd')}" stroke-width=".7"/>`; }
        const [hx, hy] = pt(x, y, 10, 300);
        s += `<line x1="${x}" y1="${y}" x2="${hx}" y2="${hy}" stroke="${lum(ring ? c.dial : c.sub) > .55 ? '#222' : '#eee'}" stroke-width="1.3" stroke-linecap="round"/>`;
      });
    }
    // Windows
    if (c.day) s += `<rect x="${cx - 22}" y="${cy - dialR + 10}" width="44" height="13" rx="1.5" fill="#FAFAF7" stroke="${m[2]}" stroke-width="1.4"/><text x="${cx}" y="${cy - dialR + 19.6}" font-size="7.5" font-family="Montserrat,Arial" font-weight="700" fill="#1E1E1E" text-anchor="middle" letter-spacing=".08em">${c.pattern === 'puzzle' ? '♥ ★ ☺' : 'MONDAY'}</text>`;
    if (c.date && w.family !== 'daytona') {
      s += `<rect x="${cx + dialR - 27}" y="${cy - 7}" width="15" height="14" rx="1.5" fill="#FAFAF7" stroke="${m[2]}" stroke-width="1.4"/><text x="${cx + dialR - 19.5}" y="${cy + 3.5}" font-size="9" font-family="Montserrat,Arial" font-weight="700" fill="#1E1E1E" text-anchor="middle">${c.pattern === 'puzzle' ? '♥' : '23'}</text>`;
    }

    // Hands (10:10 position)
    const hand = c.hand;
    const handPath = (len, wdt, deg, fill) => { const [x, y] = pt(cx, cy, len, deg); const [lx, ly] = pt(cx, cy, wdt, deg - 90), [rx, ry] = pt(cx, cy, wdt, deg + 90); return `<path d="M${lx} ${ly}L${x} ${y}L${rx} ${ry}Z" fill="${fill}" stroke="${light ? '#00000055' : '#00000088'}" stroke-width=".5"/>`; };
    if (w.family === 'submariner' || w.family === 'gmt') {
      const [hx, hy] = pt(cx, cy, 30, 305);
      s += `<line x1="${cx}" y1="${cy}" x2="${hx}" y2="${hy}" stroke="${hand}" stroke-width="3.2"/><circle cx="${pt(cx, cy, 25, 305)[0]}" cy="${pt(cx, cy, 25, 305)[1]}" r="6" fill="#F4F2EA" stroke="${hand}" stroke-width="2"/>`;
      s += handPath(dialR - 10, 2.6, 60, hand);
      if (w.family === 'gmt') { const [gx, gy] = pt(cx, cy, dialR - 6, 160); s += `<line x1="${cx}" y1="${cy}" x2="${gx}" y2="${gy}" stroke="${c.accent || '#C0282F'}" stroke-width="1.6"/><path d="M${gx} ${gy}l${Math.cos((160 - 90) * Math.PI / 180) * -8 - 4} ${Math.sin((160 - 90) * Math.PI / 180) * -8}l8 0z" fill="${c.accent || '#C0282F'}"/>`; }
    } else {
      s += handPath(36, 3.4, 305, hand) + handPath(dialR - 10, 2.6, 60, hand);
    }
    const [sx, sy] = pt(cx, cy, dialR - 6, 200);
    s += `<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="${w.family === 'daytona' && c.accent ? c.accent : hand}" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="3.4" fill="${hand}"/>`;

    // Crystal sheen
    s += `<circle cx="${cx}" cy="${cy}" r="${dialR}" fill="url(#${id}sheen)"/></g></svg>`;
    return s;
  }
  window.watchSVG = watchSVG;
})();
