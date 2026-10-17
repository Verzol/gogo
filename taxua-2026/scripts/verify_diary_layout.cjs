/* Long-content, materials, typography and expiry checks using browser-local data. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session } = require('./verify_diary.cjs');
const output = process.env.DIARY_LAYOUT_REVIEW_DIR || '/tmp/taxua-diary-layout-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
fs.mkdirSync(output, { recursive: true });
const report = { checkedAt: new Date().toISOString(), transport: 'browser-local fixtures; no production writes', checks: [], errors: [], screenshots: [] };
const check = (name, value) => { assert(value, name); report.checks.push(name); };
async function fixture(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce', ...options });
  const m = model(), s = session(m, 'san');
  m.entries[0].title = 'Những ngày ở trên mây, nơi bọn mình nhớ tiếng gió và một khoảng trời thật gần bên nhau mãi về sau. Ắ ặ'.slice(0, 100);
  m.entries[0].body = 'Mỗi ngày, bọn mình viết một trang mới. Mây rất gần, niềm vui cũng vậy.\n\n'.repeat(120).slice(0, 8000);
  m.entries[0].photos = Array.from({ length: 12 }, (_, i) => ({ id: require('node:crypto').randomUUID(), caption: 'Kỷ niệm trên đường đến Tà Xùa, một buổi sáng rất nhiều mây và gió. '.repeat(4).slice(0, 160), alt: 'Ảnh kiểm thử cục bộ ' + i }));
  await context.addInitScript(s => sessionStorage.setItem('taxua-diary-session-v1', JSON.stringify(s)), s);
  await mock(context, m);
  const p = await context.newPage(); p.on('pageerror', e => report.errors.push(e.message));
  return { context, p, m };
}
async function shot(p, selector, name) {
  await p.locator(selector).screenshot({ path: path.join(output, name) }); report.screenshots.push(name);
}
async function runEngine(type, engine) {
  const browser = await type.launch(engine === 'webkit' && process.env.DIARY_WEBKIT_EXECUTABLE ? { executablePath: process.env.DIARY_WEBKIT_EXECUTABLE } : {});
  try {
    const { context, p, m } = await fixture(browser);
    await p.goto(url + '#crewDiary'); await p.locator('#diaryOpen').click(); await p.locator('#diaryReader').waitFor();
    for (const [width, height] of [[1440, 1050], [820, 1024], [390, 844], [320, 780], [740, 390]]) {
      await p.setViewportSize({ width, height }); await p.waitForTimeout(150);
      if (width <= 850) await p.locator('[data-diary-side="writing"]').click();
      check(engine + ' long writing remains readable at ' + width, await p.locator('.diary-writing').evaluate(el => el.clientHeight >= 100 && el.scrollHeight > el.clientHeight));
      check(engine + ' full title and book footer fit at ' + width, await p.locator('.diary-page-writing').evaluate(el => el.scrollHeight <= el.clientHeight + 1));
      check(engine + ' no horizontal overflow at ' + width, await p.evaluate(() => document.documentElement.scrollWidth === innerWidth));
      await p.locator('[data-full-writing]').click();
      check(engine + ' complete 8000-character reading at ' + width, await p.locator('.diary-full-writing').innerText() === m.entries[0].body);
      await p.locator('[data-close-sheet]').click();
      if (width <= 850) await p.locator('[data-diary-side="photos"]').click();
      await p.locator('[data-album]').click();
      check(engine + ' all twelve complete captions at ' + width, await p.locator('.diary-album-item > figcaption').evaluateAll((nodes, caption) => nodes.length === 12 && nodes.every(n => n.textContent === caption), m.entries[0].photos[0].caption));
      check(engine + ' long captions stay inside their own figure at ' + width, await p.locator('.diary-album-item').evaluateAll(nodes => nodes.every(n => n.querySelector('figcaption').getBoundingClientRect().bottom <= n.getBoundingClientRect().bottom + 1)));
      if (width === 320) await shot(p, '#diarySheet', engine + '-long-album-320.png');
      await p.locator('[data-close-sheet]').click();
    }
    await p.setViewportSize({ width: 1440, height: 1050 });
    await p.evaluate(() => document.documentElement.style.fontSize = '32px');
    await p.waitForFunction(() => document.querySelector('#crewDiary').classList.contains('diary-large-text'));
    await p.locator('[data-diary-side="writing"]').click();
    check(engine + ' enlarged text has complete natural-height writing', await p.locator('.diary-writing').evaluate(el => getComputedStyle(el).overflowY === 'visible' && el.scrollHeight <= el.clientHeight + 1));
    await p.locator('[data-diary-side="photos"]').click(); await p.locator('[data-album]').click();
    check(engine + ' enlarged captions cannot overlap the next frame', await p.locator('.diary-album-item').evaluateAll(nodes => nodes.every(n => n.querySelector('figcaption').getBoundingClientRect().bottom <= n.getBoundingClientRect().bottom + 1)));
    await p.locator('[data-close-sheet]').click(); await p.evaluate(() => document.documentElement.style.fontSize = '');
    await p.waitForFunction(() => !document.querySelector('#crewDiary').classList.contains('diary-large-text'));
    check(engine + ' Vietnamese NFC and decomposed marks shape equally', await p.evaluate(async () => {
      const sample = 'Tà Xùa · Những ngày ở trên mây · Ắ Ằ Ẳ Ẵ Ặ Ế Ề Ể Ễ Ệ Ớ Ờ Ở Ỡ Ợ Ứ Ừ Ử Ữ Ự Đ đ';
      for (const font of ['400 30px Mali', '500 30px Mali', '600 42px "Dancing Script"']) {
        await document.fonts.load(font, sample);
        if (!document.fonts.check(font, sample)) return false;
        const ctx = document.createElement('canvas').getContext('2d'); ctx.font = font;
        if (Math.abs(ctx.measureText(sample.normalize('NFC')).width - ctx.measureText(sample.normalize('NFD')).width) > .1) return false;
      }
      return true;
    }));
    await context.close();
    for (const missing of ['diary-motion.js', 'diary-motion.css', 'art-and-fonts']) {
      const f = await fixture(browser, { reducedMotion: 'no-preference' });
      if (missing === 'art-and-fonts') {
        await f.context.route('**/figures/decor/painted/diary/**', r => r.abort());
        await f.context.route('**/mali_normal_*.woff2', r => r.abort());
        await f.context.route('**/dancing_script_variable.woff2', r => r.abort());
      } else await f.context.route('**/' + missing, r => r.abort());
      await f.p.goto(url + '#crewDiary'); await f.p.locator('#diaryOpen').click(); await f.p.locator('#diaryReader').waitFor();
      await f.p.locator('[data-diary-edge="1"]').evaluate(el => el.click());
      await f.p.waitForFunction(() => document.getElementById('diaryPageLabel').textContent === 'Trang của san');
      check(engine + ' authenticated navigation survives missing ' + missing, await f.p.locator('#diaryReader').isVisible() && await f.p.locator('.diary-cover-flight,.diary-turn-leaf').count() === 0);
      await f.context.close();
    }
    const f = await fixture(browser, { reducedMotion: 'no-preference' });
    for (const phase of ['opening', 'turn']) {
      f.m.expire = false; await f.p.goto(url + '?diaryReview=' + phase + '#crewDiary'); await f.p.locator('#diaryOpen').click();
      if (phase === 'turn') { await f.p.locator('#diaryReader').waitFor(); await f.p.locator('[data-diary-edge="1"]').evaluate(el => el.click()); }
      const selector = phase === 'opening' ? '.diary-cover-flight' : '.diary-turn-leaf';
      await f.p.locator(selector).waitFor(); await f.p.locator(selector).evaluate(el => { const a = el.getAnimations()[0]; a.pause(); a.currentTime = a.effect.getTiming().duration * .5; });
      f.m.expire = true; await f.p.evaluate(() => window.TaxuaDiaryApi.read().catch(() => {}));
      check(engine + ' server expiry cancels private ' + phase + ' immediately', await f.p.locator('.diary-cover-flight,.diary-turn-leaf,.diary-motion-note,.diary-turn-preview,.diary-turn-underlay').count() === 0 && await f.p.locator('#diaryPages').evaluate(el => el.childElementCount === 0) && !await f.p.locator('#diaryReader').isVisible());
    }
    await f.context.close();
  } finally { await browser.close(); }
}
(async () => {
  await runEngine(chromium, 'chromium');
  if (process.env.DIARY_WEBKIT === '1') await runEngine(webkit, 'webkit');
  check('No uncaught browser errors', report.errors.length === 0);
  fs.rmSync(path.join(output, 'failure.json'), { force: true });
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(report.checks.length + ' diary layout checks passed. ' + output);
})().catch(error => { fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ ...report, failure: error.message }, null, 2)); console.error(error.stack); process.exitCode = 1; });
