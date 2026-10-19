/* Exercise Dark Reader's real dynamic rendering engine with local browser
 * fixtures. Supply DARKREADER_PATH from the pinned darkreader@4.9.133 package;
 * it is a verification dependency, never a shipped website script. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, authenticate } = require('./verify_diary.cjs');
const { difference } = require('./verify_diary_dark_mode.cjs');
const engine = process.env.DARKREADER_PATH;
assert(engine && fs.existsSync(engine), 'Set DARKREADER_PATH to darkreader@4.9.133/darkreader.js outside the checkout');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-darkreader-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = { engine: 'Dark Reader dynamic-theme API, 4.9.133; not extension browser chrome', checks: [], errors: [], comparisons: [] };
fs.mkdirSync(output, { recursive: true });
const check = (name, value) => { assert(value, name); report.checks.push(name); };
async function inject(p) {
  await p.addScriptTag({ path: engine });
  await p.evaluate(() => { DarkReader.setFetchMethod(window.fetch); DarkReader.enable(); });
}
async function unchanged(p, width, name, selector) {
  await p.locator(selector).scrollIntoViewIfNeeded();
  await p.locator(selector).evaluate(async el => {
    await Promise.all([...el.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
    document.getAnimations().forEach(a => a.pause());
  });
  await p.evaluate(() => DarkReader.disable());
  const before = await p.locator(selector).screenshot({ animations: 'disabled' });
  await p.evaluate(() => DarkReader.enable());
  await p.waitForTimeout(100);
  check(`${width} ${name} respects the site's Dark Reader opt-out`, await p.locator('style.darkreader').count() === 0);
  const after = await p.locator(selector).screenshot({ path: path.join(output, `${width}-${name}.png`), animations: 'disabled' });
  const diff = await difference(p, before, after); report.comparisons.push({ width, name, ...diff });
  check(`${width} ${name} preserves rendered paper and ink`, diff.changed < .005 && diff.mean < .5);
}
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1050 }, reducedMotion: 'reduce', colorScheme: 'dark' });
      const m = model(); m.entries[1].body = 'Cùng nhau lên Tà Xùa.'; await mock(context, m);
      const p = await context.newPage(); p.on('pageerror', e => report.errors.push(e.message));
      await p.goto(url); await p.evaluate(() => document.fonts.ready); await inject(p);
      await p.addStyleTag({ content: '* { transition: none !important; animation: none !important; caret-color: transparent !important; }' });
      for (const [name, selector] of [['hero', '#heroTitle'], ['itinerary', '#itinerary .event-body >> nth=0'], ['crew', '#crewGrid'], ['fund', '#fundContent'], ['packing', '#packingList'], ['destinations', '#destinationsGrid'], ['food', '#foodGrid'], ['practical', '#practical']]) {
        await unchanged(p, width, name, selector);
      }
      await p.locator('#diaryOpen').click(); await p.waitForFunction(() => !document.getElementById('diaryAuthSubmit').disabled);
      await unchanged(p, width, 'login', '#diaryAuth');
      // Negative control: prove this engine actually recolors when the lock is absent.
      await p.evaluate(() => { DarkReader.disable(); document.querySelector('meta[name="darkreader-lock"]').remove(); DarkReader.enable(); });
      await p.waitForFunction(() => document.querySelector('style.darkreader--sync'));
      check(`${width} negative control activates real Dark Reader recoloring`, await p.locator('#diaryAuth').evaluate(el => getComputedStyle(el).color !== 'rgb(41, 58, 49)'));
      await p.evaluate(() => { const meta = document.createElement('meta'); meta.name = 'darkreader-lock'; document.head.append(meta); });
      await p.waitForFunction(() => !document.querySelector('style.darkreader'));
      check(`${width} inserting the opt-out removes existing recoloring`, await p.locator('#diaryAuth').evaluate(el => getComputedStyle(el).color === 'rgb(41, 58, 49)'));
      await p.keyboard.press('Escape'); await authenticate(p);
      await unchanged(p, width, 'reader', '#diaryPages');
      await p.locator('[data-edit="writing"]').click(); await p.locator('#diaryEditor').waitFor();
      await unchanged(p, width, 'editor', '#diaryEditBody');
      await p.goto(new URL('itinerary.html', url).href); await p.evaluate(() => document.fonts.ready); await inject(p);
      await unchanged(p, width, 'reading-copy', 'header');
      await context.close();
    }
    check('no uncaught browser errors', report.errors.length === 0);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`${report.checks.length} Dark Reader engine checks passed. Evidence: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ ...report, failure: error.stack }, null, 2)); console.error(error); process.exitCode = 1; });
