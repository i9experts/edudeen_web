/*
 * Edudeen UI audit - paste into the browser console (or run through Playwright page.evaluate).
 * Reports: horizontal scroll (hs), broken images, unlabeled buttons (noname), tiny text (<12px),
 * "undefined"/"NaN" text, stuck loaders, "$" amounts, and font families in use.
 * Returns a plain object and also console.table()s the summary.
 */
(() => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };
  const root = document.scrollingElement || document.documentElement;
  const scrollers = [...document.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible' && e.clientWidth > 0 && vis(e) && e.getBoundingClientRect().right > innerWidth + 1);
  const hs = root.scrollWidth > innerWidth + 1 || scrollers.length > 0;

  const brokenImages = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).map((i) => i.currentSrc.slice(0, 120));

  const nameOf = (el) =>
    (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || el.innerText || el.textContent || '').trim() ||
    (el.querySelector('img[alt]:not([alt=""])') ? 'img' : '');
  const unlabeled = [...document.querySelectorAll('button, [role="button"], a[href]')]
    .filter((el) => vis(el) && !nameOf(el))
    .map((el) => (el.outerHTML || '').slice(0, 110));

  const tiny = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  const texts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim();
    const el = n.parentElement;
    if (!t || !el || !vis(el) || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue;
    texts.push([t, el]);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12 && !seen.has(el)) { seen.add(el); tiny.push(`${fs}px ${t.slice(0, 40)}`); }
  }
  const bad = texts.filter(([t]) => /\b(undefined|NaN|\[object Object\]|null)\b/.test(t)).map(([t]) => t.slice(0, 80));
  const usd = texts.filter(([t]) => /\$\s?\d/.test(t)).map(([t]) => t.slice(0, 60));

  const loaders = [...document.querySelectorAll('[class*="animate-spin"], [class*="animate-pulse"], [aria-busy="true"], [class*="skeleton" i]')].filter(vis);

  const fonts = {};
  document.querySelectorAll('body *').forEach((el) => {
    if (!el.childNodes.length || ![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) return;
    const f = getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
    fonts[f] = (fonts[f] || 0) + 1;
  });

  const out = {
    url: location.pathname,
    width: innerWidth,
    hs,
    hsCulprits: scrollers.slice(0, 5).map((e) => e.tagName + '.' + String(e.className).slice(0, 50)),
    brokenImages,
    noname: unlabeled.length,
    nonameSamples: unlabeled.slice(0, 5),
    tiny: tiny.length,
    tinySamples: tiny.slice(0, 8),
    badText: bad.slice(0, 8),
    stuckLoaders: loaders.length,
    usd: usd.length,
    usdSamples: usd.slice(0, 5),
    fonts,
  };
  console.table({ hs: out.hs, brokenImages: brokenImages.length, noname: out.noname, tiny: out.tiny, badText: bad.length, stuckLoaders: out.stuckLoaders, usd: out.usd });
  return out;
})();
