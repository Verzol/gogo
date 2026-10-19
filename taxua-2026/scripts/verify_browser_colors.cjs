/* Whole-site rendered-color checks, including Chromium's automatic darkening.
 * Remote map/weather requests are mocked; this does not test extensions. */
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
process.env.DIARY_DARK_REVIEW_DIR ||= '/tmp/taxua-browser-colors';
const { compare, report, check } = require('./verify_diary_dark_mode.cjs');
const output = process.env.DIARY_DARK_REVIEW_DIR;
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      await context.route('**/*.tile.openstreetmap.fr/**', route => route.abort());
      await context.route('**/api.open-meteo.com/**', route => route.abort());
      const p = await context.newPage(); p.on('pageerror', e => report.errors.push(e.message));
      const cdp = await context.newCDPSession(p);
      await p.goto(url); await p.evaluate(() => document.fonts.ready);
      await p.addStyleTag({ content: '* { transition: none !important; animation: none !important; caret-color: transparent !important; }' });
      for (const [name, selector] of [
        ['hero', '#heroTitle'], ['itinerary', '#itinerary .event-body >> nth=0'],
        ['crew', '#crewGrid'], ['fund', '#fundContent'], ['packing', '#packingList'],
        ['destinations', '#destinationsGrid'], ['food', '#foodGrid'], ['practical', '#practical']
      ]) {
        await p.locator(selector).scrollIntoViewIfNeeded();
        await p.waitForTimeout(100);
        await p.evaluate(() => document.getAnimations().forEach(a => a.pause()));
        await compare(p, cdp, width, name, [selector]);
      }
      await p.locator('[data-game="coin"]').click();
      await p.locator('#game-coin .game-settings summary').click();
      await compare(p, cdp, width, 'game-fields', ['#coinSun']);
      await p.locator('[data-map-overview]').click(); await p.locator('#tripAtlas').waitFor();
      await compare(p, cdp, width, 'atlas', ['#atlasTitle', '#atlasOptional']);
      check(`${width} native inputs inherit the auto-dark opt-out`, await p.locator('#atlasOptional').evaluate(el => getComputedStyle(el).colorScheme.includes('only')));
      await p.emulateMedia({ forcedColors: 'active', colorScheme: 'dark' });
      check(`${width} atlas allows system high contrast`, await p.locator('#atlasTitle').evaluate(el => getComputedStyle(el).forcedColorAdjust === 'auto' && matchMedia('(forced-colors: active)').matches));
      await p.emulateMedia({ forcedColors: 'none' });
      await p.goto(new URL('itinerary.html', url).href); await p.evaluate(() => document.fonts.ready);
      await compare(p, cdp, width, 'reading-copy', ['header', 'article >> nth=0']);
      await context.close();
    }
    check('no uncaught browser errors', report.errors.length === 0);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`${report.checks.length} whole-site browser-color checks passed. Evidence: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
