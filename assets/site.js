// Alizeh Bullion — shared chrome (header, footer, WhatsApp), motion, currency preference and live-rate helpers.
(() => {
  // ── Business details: replace these placeholders with the real ones ──
  const CONFIG = {
    whatsapp: '971502315116',          // main enquiries (gold, rates, general). International format, digits only
    whatsappWatches: '971547585007',   // watch dealer: used only by the watch buttons on the watches page
    phoneDisplay: '+971 50 000 0000',
    phoneHref: '+971500000000',
    landlineDisplay: '+971 4 000 0000',
    landlineHref: '+97140000000',
    email: 'info@alizehbullion.com',
    addressLines: ['Showroom 00, Gold Souk Building', 'Your Street, Your City'],
    hours: [['Saturday – Thursday', '10:00 – 21:00'], ['Friday', '16:00 – 21:00']],
    mapUrl: 'https://maps.google.com/?q=Alizeh+Bullion',
    social: { instagram: '#', facebook: '#', linkedin: '#' },
  };

  const UNITS = { oz: 31.1034768, g: 1, '10g': 10, kg: 1000, tola: 11.6638038, '10tola': 116.638038 };
  const KARATS = { '24K': 0.999, '22K': 0.916, '21K': 0.875, '18K': 0.75, '14K': 0.585 };
  const METAL_NAMES = { XAU: 'Gold', XAG: 'Silver', XPT: 'Platinum', XPD: 'Palladium' };
  const SYMBOL = { USD: '$', AED: 'AED ', PKR: 'Rs ' };

  const mark = (cls = '') => `<svg class="${cls}" viewBox="0 0 100 90" aria-hidden="true"><defs><linearGradient id="abg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9CF8C"/><stop offset=".45" stop-color="#C9A55E"/><stop offset=".7" stop-color="#B68F45"/><stop offset="1" stop-color="#D8B970"/></linearGradient></defs><path fill="url(#abg)" d="M4 88 44 2h14l16 38-14 12-9-22-30 58zM64 58l14-12 18 42H80z"/></svg>`;
  const waIcon = (cls = 'w-5 h-5') => `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>`;
  const icon = {
    phone: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    mail: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    pin: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    clock: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    arrow: '<svg class="arr w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    instagram: '<svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg>',
    facebook: '<svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8.5c0-.3.2-.5.5-.5Z"/></svg>',
    linkedin: '<svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9h4v12H4zM6 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm4 6h4v1.7c.6-1 1.9-2 3.9-2 4 0 4.1 2.7 4.1 6V21h-4v-5.5c0-1.4 0-3.1-2-3.1s-2.2 1.5-2.2 3V21H10z"/></svg>',
  };

  const waLink = (msg = 'Hello Alizeh Bullion, I would like to make an enquiry.', number = CONFIG.whatsapp) =>
    `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  // Watch enquiries go to the watch dealer's WhatsApp instead of the main number.
  const waWatchLink = (msg) => waLink(msg, CONFIG.whatsappWatches);

  // ── Currency preference (shared across pages) ──
  const CURRENCIES = ['USD', 'AED', 'PKR'];
  let currency = localStorage.getItem('ab-currency');
  const setCurrency = (c) => {
    if (!CURRENCIES.includes(c)) return;
    currency = c; localStorage.setItem('ab-currency', c);
    document.querySelectorAll('[data-currency-switch] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === c)));
    document.dispatchEvent(new CustomEvent('ab:currency', { detail: c }));
  };
  const switcher = (label = 'Currency') =>
    `<div class="seg" role="group" aria-label="${label}" data-currency-switch>${CURRENCIES.map((c) => `<button type="button" data-c="${c}" aria-pressed="${c === currency}">${c}</button>`).join('')}</div>`;

  // ── Rates ──
  let rates = null;
  const toCur = (usd, c = currency) => (rates && rates.fx[c] ? usd * rates.fx[c] : null);
  // side: spot | bid | ask | low | high ; purity: karat key or fraction
  const quote = (metal, side = 'spot', unit = 'g', purity = 1) => {
    if (!rates) return null;
    const p = typeof purity === 'string' ? KARATS[purity] : purity;
    const perOz = side === 'spot' ? rates.usdPerOz[metal] : rates.quotes?.[metal]?.[side];
    if (perOz == null) return null;
    return toCur((perOz / UNITS.oz) * UNITS[unit] * p);
  };
  const price = (metal, unit = 'g', karat = null) => quote(metal, 'spot', unit, karat || 1);
  const fmt = (v, c = currency) => {
    if (v == null || !isFinite(v)) return '—';
    const digits = c === 'PKR' || v >= 10000 ? 0 : 2;
    return SYMBOL[c] + v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };
  const timeAgo = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  async function loadRates() {
    try {
      const r = await fetch('/api/rates', { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      rates = await r.json();
      if (!currency) setCurrency(rates.defaultCurrency || 'USD');
      document.dispatchEvent(new CustomEvent('ab:rates', { detail: rates }));
      renderTicker();
      clearTimeout(loadRates.t);
      loadRates.t = setTimeout(loadRates, (rates.refreshSeconds || 60) * 1000);
    } catch {
      document.dispatchEvent(new CustomEvent('ab:rates-error'));
      clearTimeout(loadRates.t); loadRates.t = setTimeout(loadRates, 30000);
    }
  }

  // ── Header ──
  const page = document.body.dataset.page;
  const links = [
    ['index.html', 'Home', 'home'], ['index.html#about', 'About', 'about'], ['gold.html', 'Gold', 'gold'],
    ['watches.html', 'Watches', 'watches'], ['rates.html', 'Live Rates', 'rates'], ['index.html#contact', 'Contact', 'contact'],
  ];
  const navLinks = () => links.map(([href, label, key]) => `<a class="nav-link" href="${href}" ${key === page ? 'aria-current="page"' : ''}>${label}</a>`).join('');
  const logo = (size = 'sm') => `<span class="flex items-center gap-3">${mark(size === 'sm' ? 'w-9 h-8' : 'w-12 h-11')}<span class="leading-none"><span class="wordmark block ${size === 'sm' ? 'text-[0.95rem]' : 'text-xl'} text-ink">Alizeh</span><span class="wordmark block ${size === 'sm' ? 'text-[0.56rem] mt-1' : 'text-[0.7rem] mt-1.5'} text-gold-deep !tracking-[0.62em]">Bullion</span></span></span>`;

  const header = document.querySelector('[data-header]');
  if (header) header.outerHTML = `
  <a class="skip" href="#main">Skip to content</a>
  <div class="surface-champagne border-b border-gold/25 text-[0.76rem] text-ink-soft relative z-[51]">
    <div class="max-w-site mx-auto px-5 md:px-8 h-10 flex items-center gap-6">
      <div class="marquee flex-1 min-w-0" aria-label="Indicative metal prices"><div class="marquee-track" data-ticker><span class="px-4">Loading market prices…</span></div></div>
      <div class="hidden md:flex items-center gap-5 shrink-0">
        <a class="nav-link !text-[0.76rem] !p-0 flex items-center gap-2" href="tel:${CONFIG.phoneHref}">${icon.phone.replace('w-5 h-5', 'w-3.5 h-3.5')}${CONFIG.phoneDisplay}</a>
        <a class="nav-link !text-[0.76rem] !p-0 flex items-center gap-2" href="mailto:${CONFIG.email}">${icon.mail.replace('w-5 h-5', 'w-3.5 h-3.5')}${CONFIG.email}</a>
      </div>
    </div>
  </div>
  <header class="site-header sticky top-0 z-50 border-b border-gold/20 bg-[#F8F7F3]/[.97] backdrop-blur-md">
    <div class="bar max-w-site mx-auto px-5 md:px-8 h-[5rem] flex items-center justify-between gap-6">
      <a href="index.html" class="rounded-md active:opacity-70" aria-label="Alizeh Bullion home">${logo()}</a>
      <nav class="hidden xl:flex items-center gap-8" aria-label="Main">${navLinks()}</nav>
      <div class="hidden xl:flex items-center gap-3">
        ${switcher()}
        <a class="btn btn-wa btn-sm" href="${waLink()}" target="_blank" rel="noopener">${waIcon('w-4 h-4')}WhatsApp</a>
      </div>
      <div class="flex xl:hidden items-center gap-2">
        <a class="icon-btn !text-[#1F7A47]" href="${waLink()}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${waIcon('w-6 h-6')}</a>
        <button class="icon-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu" data-menu-btn>
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </div>
    </div>
    <div id="mobile-menu" class="menu-panel xl:hidden absolute inset-x-0 top-full surface-marble soft border-b border-gold/25" style="box-shadow:var(--sh-2)">
      <nav class="max-w-site mx-auto px-5 py-6 flex flex-col" aria-label="Mobile">
        ${links.map(([href, label, key]) => `<a class="h-card text-[1.35rem] py-3 border-b border-gold/20 nav-link !text-ink !font-semibold" href="${href}" ${key === page ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
        <div class="flex flex-wrap items-center gap-3 mt-6">${switcher('Currency (menu)')}<a class="btn btn-outline btn-sm" href="tel:${CONFIG.phoneHref}">Call ${CONFIG.phoneDisplay}</a></div>
      </nav>
    </div>
  </header>`;

  const btn = document.querySelector('[data-menu-btn]');
  const panel = document.getElementById('mobile-menu');
  const toggleMenu = (open) => {
    panel.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  btn?.addEventListener('click', () => toggleMenu(!panel.classList.contains('open')));
  panel?.addEventListener('click', (e) => { if (e.target.closest('a')) toggleMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel?.classList.contains('open')) { toggleMenu(false); btn.focus(); } });

  const siteHeader = document.querySelector('.site-header');
  const onScroll = () => {
    siteHeader?.classList.toggle('scrolled', window.scrollY > 40);
    document.querySelector('.to-top')?.classList.toggle('show', window.scrollY > 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── Footer ──
  const footer = document.querySelector('[data-footer]');
  if (footer) footer.outerHTML = `
  <footer class="surface-champagne grain border-t border-gold/30">
    <div class="max-w-site mx-auto px-5 md:px-8 pt-16 pb-12 grid gap-12 md:grid-cols-2 lg:grid-cols-12">
      <div class="lg:col-span-4">
        ${logo('lg')}
        <p class="text-sm text-ink-soft mt-6 max-w-xs">A bullion trading house dealing in refined gold, scrap gold, jewellery and luxury watches.</p>
        <p class="accent-serif text-lg text-gold-dark mt-4">Trust / Value / Legacy</p>
        <div class="flex gap-2 mt-6">
          ${Object.entries(CONFIG.social).map(([k, href]) => `<a class="icon-btn border border-gold/40 !w-10 !h-10" href="${href}" aria-label="Alizeh Bullion on ${k[0].toUpperCase() + k.slice(1)}">${icon[k]}</a>`).join('')}
        </div>
      </div>
      <div class="lg:col-span-2">
        <h2 class="label !text-[0.68rem] mb-5">Company</h2>
        <ul class="space-y-2.5 text-sm">${links.map(([h, l]) => `<li><a class="nav-link !text-sm" href="${h}">${l}</a></li>`).join('')}</ul>
      </div>
      <div class="lg:col-span-2">
        <h2 class="label !text-[0.68rem] mb-5">Services</h2>
        <ul class="space-y-2.5 text-sm">
          <li><a class="nav-link !text-sm" href="gold.html#bullion">Bullion trading</a></li>
          <li><a class="nav-link !text-sm" href="gold.html#scrap">Scrap gold</a></li>
          <li><a class="nav-link !text-sm" href="gold.html#jewellery">Jewellery</a></li>
          <li><a class="nav-link !text-sm" href="watches.html">Luxury watches</a></li>
          <li><a class="nav-link !text-sm" href="rates.html">Live rates</a></li>
        </ul>
      </div>
      <div class="lg:col-span-4">
        <h2 class="label !text-[0.68rem] mb-5">Contact</h2>
        <ul class="space-y-3 text-sm text-ink-soft">
          <li class="flex gap-3"><span class="text-gold-deep mt-0.5">${icon.pin}</span><address class="not-italic">${CONFIG.addressLines.join('<br>')}</address></li>
          <li class="flex gap-3"><span class="text-gold-deep">${icon.phone}</span><a class="nav-link !p-0 !text-sm" href="tel:${CONFIG.phoneHref}">${CONFIG.phoneDisplay}</a></li>
          <li class="flex gap-3"><span class="text-gold-deep">${icon.mail}</span><a class="nav-link !p-0 !text-sm" href="mailto:${CONFIG.email}">${CONFIG.email}</a></li>
          <li class="flex gap-3"><span class="text-gold-deep mt-0.5">${icon.clock}</span><span>${CONFIG.hours.map(([d, h]) => `${d}: <span class="num">${h}</span>`).join('<br>')}</span></li>
        </ul>
      </div>
    </div>
    <div class="max-w-site mx-auto px-5 md:px-8"><div class="rule-gold"></div></div>
    <div class="max-w-site mx-auto px-5 md:px-8 py-6 flex flex-col md:flex-row gap-2 justify-between text-xs text-ink-soft">
      <span>© ${new Date().getFullYear()} Alizeh Bullion. All rights reserved. Prices shown are indicative; contact us for a firm quote.</span>
      <span>Independent dealer. Not affiliated with or endorsed by Rolex SA.</span>
    </div>
  </footer>
  <a class="wa-float" href="${waLink()}" target="_blank" rel="noopener" aria-label="Chat with Alizeh Bullion on WhatsApp"><span class="txt">Chat with us</span><span class="ico">${waIcon('w-7 h-7')}</span></a>
  <a class="to-top" href="#main" aria-label="Back to top"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg></a>`;

  // ── Ticker (seamless marquee: content duplicated) ──
  function renderTicker() {
    const el = document.querySelector('[data-ticker]');
    if (!el || !rates) return;
    const item = (label, bid, ask) => `<span class="flex items-center gap-2 px-5 whitespace-nowrap"><span class="font-semibold text-ink">${label}</span><span class="num">Bid ${fmt(bid)}</span><span class="text-gold" aria-hidden="true">·</span><span class="num">Ask ${fmt(ask)}</span></span><span class="text-gold/70" aria-hidden="true">|</span>`;
    const once = [
      item('Gold oz', quote('XAU', 'bid', 'oz'), quote('XAU', 'ask', 'oz')),
      item('Gold 24K g', quote('XAU', 'bid', 'g', '24K'), quote('XAU', 'ask', 'g', '24K')),
      item('Gold 22K g', quote('XAU', 'bid', 'g', '22K'), quote('XAU', 'ask', 'g', '22K')),
      item('Gold tola', quote('XAU', 'bid', 'tola'), quote('XAU', 'ask', 'tola')),
      item('Silver oz', quote('XAG', 'bid', 'oz'), quote('XAG', 'ask', 'oz')),
      item('Platinum oz', quote('XPT', 'bid', 'oz'), quote('XPT', 'ask', 'oz')),
      item('Palladium oz', quote('XPD', 'bid', 'oz'), quote('XPD', 'ask', 'oz')),
    ].join('') + (rates.demo ? '<span class="px-5 text-gold-dark whitespace-nowrap">Sample prices</span><span class="text-gold/70" aria-hidden="true">|</span>' : '');
    el.innerHTML = `<span class="flex items-center">${once}</span><span class="flex items-center" aria-hidden="true">${once}</span>`;
  }

  // ── Scroll reveal + counters ──
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.dataset.count != null) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;

  function countUp(el) {
    const end = parseFloat(el.dataset.count), dur = 1800, suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = end.toLocaleString('en-US') + suffix; return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = Math.round(end * e).toLocaleString('en-US') + suffix;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function reveal(root = document) {
    root.querySelectorAll('[data-stagger]').forEach((wrap) => {
      const gap = Number(wrap.dataset.stagger) || 90;
      [...wrap.children].forEach((ch, i) => { if (!ch.hasAttribute('data-reveal')) ch.setAttribute('data-reveal', ''); ch.style.setProperty('--d', `${i * gap}ms`); });
    });
    root.querySelectorAll('[data-reveal]:not(.in), [data-count]').forEach((el) => {
      if (!io || reduce) { el.classList.add('in'); if (el.dataset.count != null) countUp(el); return; }
      io.observe(el);
    });
  }

  // Wire all switchers (header + any on the page)
  const wire = () => {
    document.querySelectorAll('[data-currency-switch] button').forEach((b) => {
      if (b.dataset.wired) return; b.dataset.wired = '1';
      b.addEventListener('click', () => setCurrency(b.dataset.c));
    });
    if (currency) setCurrency(currency);
  };
  document.addEventListener('ab:currency', renderTicker);

  window.AB = { CONFIG, UNITS, KARATS, METAL_NAMES, icon, mark, waIcon, waLink, waWatchLink, switcher, wire, reveal, quote, price, fmt, toCur, timeAgo,
    get rates() { return rates; }, get currency() { return currency; }, setCurrency };

  const init = () => {
    // Add data-wa-to="watches" to a button to send it to the watch dealer instead of the main number.
    document.querySelectorAll('[data-wa]').forEach((a) => {
      const number = a.dataset.waTo === 'watches' ? CONFIG.whatsappWatches : CONFIG.whatsapp;
      a.href = waLink(a.dataset.wa || undefined, number); a.target = '_blank'; a.rel = 'noopener';
    });
    document.querySelectorAll('[data-tel]').forEach((a) => { a.href = `tel:${CONFIG.phoneHref}`; });
    document.querySelectorAll('[data-wa-icon]').forEach((el) => (el.outerHTML = waIcon()));
    document.querySelectorAll('[data-mark]').forEach((el) => (el.innerHTML = mark('w-full h-full')));
    document.querySelectorAll('[data-icon]').forEach((el) => (el.outerHTML = icon[el.dataset.icon] || ''));
    wire(); reveal(); onScroll();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  loadRates();
})();
