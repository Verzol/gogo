/* Browser-local accounts only. Compare rendered pixels: Chromium auto-darkening
 * changes paint colors without changing the computed CSS color. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, authenticate } = require('./verify_diary.cjs');
const output = process.env.DIARY_DARK_REVIEW_DIR || '/tmp/taxua-diary-dark-mode';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = { checks: [], errors: [], comparisons: [], transport: 'Browser-local fixtures; no live accounts or writes' };
fs.mkdirSync(output, { recursive: true });
function check(name, value) { assert(value, name); report.checks.push(name); }
async function difference(page, a, b) {
  return page.evaluate(async ([a, b]) => {
    async function pixels(base64) {
      const img = new Image(); img.src = 'data:image/png;base64,' + base64; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const context = canvas.getContext('2d'); context.drawImage(img, 0, 0);
      return context.getImageData(0, 0, img.width, img.height).data;
    }
    const x = await pixels(a), y = await pixels(b);
    if (x.length !== y.length) return { changed: 1, mean: 255 };
    let changed = 0, total = 0;
    for (let i = 0; i < x.length; i += 4) {
      const delta = Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]);
      if (delta > 12) changed++; total += delta;
    }
    return { changed: changed / (x.length / 4), mean: total / (x.length / 4 * 3) };
  }, [a.toString('base64'), b.toString('base64')]);
}
async function compare(page, cdp, width, name, selectors) {
  for (const selector of selectors) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.locator(selector).evaluate(async el => {
      await Promise.all([...el.querySelectorAll('img')].map(img => img.decode().catch(() => {})));
    });
  }
  await cdp.send('Emulation.setAutoDarkModeOverride', { enabled: false });
  await page.emulateMedia({ colorScheme: 'light' });
  const baseline = [];
  for (const selector of selectors) baseline.push(await page.locator(selector).screenshot({ animations: 'disabled' }));
  for (const forced of [false, true]) {
    await page.emulateMedia({ colorScheme: 'dark' });
    await cdp.send('Emulation.setAutoDarkModeOverride', { enabled: forced });
    for (let i = 0; i < selectors.length; i++) {
      const file = `${width}-${name}-${forced ? 'auto-dark' : 'dark'}-${i}.png`;
      const shot = await page.locator(selectors[i]).screenshot({ path: path.join(output, file), animations: 'disabled' });
      const diff = await difference(page, baseline[i], shot);
      report.comparisons.push({ width, name, forced, selector: selectors[i], ...diff });
      check(`${width} ${name} ${selectors[i]} retains paper/ink under ${forced ? 'auto-dark' : 'dark preference'}`, diff.changed < .005 && diff.mean < .5);
    }
  }
}
async function run() {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1050 }, reducedMotion: 'reduce' });
      const m = model(); m.entries[1].title = 'Một ngày trên mây'; m.entries[1].body = 'Nhớ những ngày cùng nhau ở Tà Xùa.';
      m.entries[1].photos = [{ id: 'photo-one', caption: 'Mây chiều', alt: 'Núi và mây' }];
      await mock(context, m); const p = await context.newPage();
      p.on('pageerror', e => report.errors.push(e.message));
      const cdp = await context.newCDPSession(p);
      await p.goto(url); await p.locator('#diaryOpen').click();
      await p.waitForFunction(() => !document.getElementById('diaryAuthSubmit').disabled);
      await p.evaluate(() => document.fonts.ready);
      await p.addStyleTag({ content: '.crew-diary *, .diary-dialog * { transition: none !important; caret-color: transparent !important; }' });
      await compare(p, cdp, width, 'login', ['#diaryAuth']);
      // authenticate() opens the book itself; dismiss the inspection dialog first.
      await p.keyboard.press('Escape'); await authenticate(p);
      await compare(p, cdp, width, 'reader', ['#diaryPages']);
      await p.locator('[data-edit="writing"]').click(); await p.locator('#diaryEditor').waitFor();
      await compare(p, cdp, width, 'writing', ['#diaryEditorTitle', '#diaryEditBody']);
      await p.locator('[data-editor-tab="photos"]').click();
      await p.waitForFunction(() => [...document.querySelectorAll('#diaryPhotoPreview img')].every(i => !i.hidden && i.complete && i.naturalWidth));
      await compare(p, cdp, width, 'photos', ['#diaryPhotoPreview', '#diaryPhotoFields']);
      await p.locator('[data-arrange="crop"]').click();
      await compare(p, cdp, width, 'crop', ['#diaryCropTools']);
      await p.emulateMedia({ forcedColors: 'active', colorScheme: 'dark' });
      check(`${width} system high contrast remains enabled`, await p.locator('#diaryEditor').evaluate(el => {
        const style = getComputedStyle(el); return matchMedia('(forced-colors: active)').matches && style.forcedColorAdjust === 'auto' && style.color !== 'rgb(41, 58, 49)';
      }));
      await context.close();
    }
    check('no uncaught browser errors', report.errors.length === 0);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`${report.checks.length} diary dark-mode checks passed. Evidence: ${output}`);
  } finally { await browser.close(); }
}
module.exports = { compare, difference, report, check };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
