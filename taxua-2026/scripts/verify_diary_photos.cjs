/* Count-aware layouts and private photo viewing with browser-local fixtures. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session } = require('./verify_diary.cjs');
const output = process.env.DIARY_PHOTOS_REVIEW_DIR || '/tmp/taxua-diary-photos-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = { checkedAt: new Date().toISOString(), transport: 'browser-local fixtures; no crew credentials or backend writes', checks: [], errors: [], screenshots: [] };
fs.mkdirSync(output, { recursive: true });
const check = (name, value) => { assert(value, name); report.checks.push(name); };
async function fixture(browser, options = {}, missing) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce', ...options });
  const m = model();
  await context.addInitScript(s => sessionStorage.setItem('taxua-diary-session-v1', JSON.stringify(s)), session(m, 'mi'));
  await mock(context, m);
  if (missing) await context.route('**/' + missing, r => r.abort());
  const p = await context.newPage(); p.on('pageerror', error => report.errors.push(error.message));
  await p.goto(url + '#crewDiary'); await p.locator('#diaryOpen').click(); await p.locator('#diaryReader').waitFor();
  await p.evaluate(() => document.fonts.ready);
  return { context, p, m };
}
async function shot(p, selector, name) {
  await p.locator(selector).screenshot({ path: path.join(output, name) }); report.screenshots.push(name);
}
async function runEngine(type, engine) {
  const browser = await type.launch(engine === 'webkit' && process.env.DIARY_WEBKIT_EXECUTABLE ? { executablePath: process.env.DIARY_WEBKIT_EXECUTABLE } : {});
  try {
    const { context, p, m } = await fixture(browser);
    for (const width of [1440, 820, 390, 320]) {
      await p.setViewportSize({ width, height: 1050 });
      if (width <= 850) await p.locator('[data-diary-side="photos"]').click();
      for (let count = 0; count <= 9; count++) {
        m.entries[0].photos = Array.from({ length: count }, (_, i) => ({ id: `layout-${count}-${i}`, caption: `Kỷ niệm ${i + 1} trên mây`, alt: `Phong cảnh ${i + 1}` }));
        await p.locator('#diaryRefresh').click();
        await p.waitForFunction(count => document.querySelector('#diaryPages [data-photo-count]')?.dataset.photoCount === String(count), count);
        const leaf = p.locator('#diaryPages .diary-page-photos');
        await leaf.scrollIntoViewIfNeeded(); await p.mouse.move(0, 0);
        await p.waitForFunction(() => [...document.querySelectorAll('#diaryPages img[data-private-photo]')].every(img => img.complete && img.naturalWidth > 0 && !img.hidden));
        check(`${engine} ${count} photos all appear at ${width}`, await leaf.locator('[data-view-photo]').count() === count);
        check(`${engine} ${count} photo layout and footer fit at ${width}`, await leaf.evaluate(el => {
          const page = el.getBoundingClientRect(), footer = el.querySelector('footer').getBoundingClientRect();
          return el.scrollHeight <= el.clientHeight + 1 && [...el.querySelectorAll('.diary-print')].every(print => {
            const r = print.getBoundingClientRect();
            return r.left >= page.left - 1 && r.right <= page.right + 1 && r.top >= page.top && r.bottom <= footer.top + 1;
          });
        }));
        check(`${engine} ${count} photos have usable targets at ${width}`, await leaf.locator('[data-view-photo]').evaluateAll(nodes => nodes.every(node => { const r = node.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })));
        if (width === 1440 || width === 390) await shot(p, '#diaryPages .diary-page-photos', `${engine}-${width}-${count}.png`);
      }
      check(engine + ' album shortcut is removed at ' + width, await p.locator('[data-album]').count() === 0 && !(await p.locator('#diaryPages').innerText()).includes('Xem đủ'));
      for (let i = 0; i < 9; i++) {
        await p.locator('#diaryPages [data-view-photo]').nth(i).click();
        check(`${engine} photo ${i + 1} opens full view at ${width}`, await p.locator('.diary-photo-nav [role="status"]').innerText() === `Ảnh ${i + 1} / 9` && await p.locator('.diary-full-photo').getAttribute('alt') === `Phong cảnh ${i + 1}`);
        await p.keyboard.press('Escape');
      }
      await p.locator('#diaryPages [data-view-photo]').first().click();
      check(engine + ' first photo disables previous at ' + width, await p.locator('[data-diary-photo-step="-1"]').isDisabled());
      await p.locator('[data-diary-photo-step="1"]').click();
      check(engine + ' next arrow advances and retains focus at ' + width, await p.locator('.diary-photo-nav [role="status"]').innerText() === 'Ảnh 2 / 9' && await p.locator('[data-diary-photo-step="1"]').evaluate(el => el === document.activeElement));
      await p.keyboard.press('ArrowLeft');
      check(engine + ' keyboard goes back without turning the person at ' + width, await p.locator('.diary-photo-nav [role="status"]').innerText() === 'Ảnh 1 / 9' && await p.locator('#diaryPageLabel').innerText() === 'Trang của mi');
      for (let i = 0; i < 8; i++) await p.keyboard.press('ArrowRight');
      check(engine + ' last photo disables next at ' + width, await p.locator('.diary-photo-nav [role="status"]').innerText() === 'Ảnh 9 / 9' && await p.locator('[data-diary-photo-step="1"]').isDisabled());
      await p.keyboard.press('ArrowRight');
      check(engine + ' last photo does not wrap or leave the owner at ' + width, await p.locator('.diary-photo-nav [role="status"]').innerText() === 'Ảnh 9 / 9' && await p.locator('#diaryPageLabel').innerText() === 'Trang của mi');
      if (width === 390) await shot(p, '#diarySheet', engine + '-popup-phone.png');
      await p.locator('[data-diary-photo-step="-1"]').click();
      check(engine + ' previous arrow returns to photo eight at ' + width, await p.locator('.diary-photo-nav [role="status"]').innerText() === 'Ảnh 8 / 9');
      await p.locator('[data-close-sheet]').click();
      check(engine + ' closing popup clears its private image at ' + width, await p.locator('.diary-full-photo').count() === 0);
    }
    await p.setViewportSize({ width: 1440, height: 1050 });
    for (let i = 0; i < 7; i++) {
      await p.locator(`[data-bookmark="${i}"]`).click();
      check(engine + ' only signed-in owner has edit controls on person ' + i, await p.locator('#diaryPages [data-edit]').count() === (i === 0 ? 2 : 0));
    }
    await p.locator('[data-bookmark="0"]').click();
    m.entries[0].photos = []; await p.locator('#diaryRefresh').click();
    await p.waitForFunction(() => document.querySelector('[data-photo-count]')?.dataset.photoCount === '0');
    delete m.drafts.mi; m.libraries.mi = [];
    await p.locator('[data-edit="photos"]').click(); await p.locator('#diaryEditor').waitFor();
    const image = path.resolve(__dirname, '../figures/places/p13_480.webp');
    await p.locator('[data-editor-tab="photos"]').click();
    await p.locator('#diaryFiles').setInputFiles(Array.from({ length: 10 }, () => image));
    await p.waitForFunction(() => !document.getElementById('diaryFiles').disabled && document.querySelectorAll('[data-photo-row]').length === 9);
    check(engine + ' tenth file is rejected before reserving or uploading', m.uploads === 9 && m.requests.filter(action => action === 'reserve-photo').length === 9 && m.drafts.mi.photos.length === 9 && (await p.locator('#diaryUploadStatus').innerText()).includes('9 ảnh'));
    await p.locator('#diaryPublish').click();
    await p.waitForFunction(() => document.getElementById('diarySaveStatus').textContent.includes('Đã lưu vào sổ'));
    await p.locator('[data-close-editor]').first().click();
    check(engine + ' all nine uploaded photos publish together', await p.locator('#diaryPages [data-view-photo]').count() === 9);
    await p.locator('#diaryPages [data-view-photo]').last().click();
    await p.evaluate(() => window.TaxuaDiaryApi.clear());
    check(engine + ' session loss closes popup and clears all private images', !await p.locator('#diarySheet').isVisible() && await p.locator('#diaryPages img,.diary-full-photo').count() === 0);
    await context.close();
    const fallback = await fixture(browser, {}, 'diary-motion.css');
    fallback.m.entries[0].photos = Array.from({ length: 9 }, (_, i) => ({ id: `fallback-${i}`, caption: 'Mây', alt: 'Ảnh mẫu' }));
    await fallback.p.locator('#diaryRefresh').click();
    await fallback.p.waitForFunction(() => document.querySelectorAll('#diaryPages [data-view-photo]').length === 9);
    check(engine + ' nine-photo layout fits without decorative CSS', await fallback.p.locator('#diaryPages .diary-page-photos').evaluate(el => el.scrollHeight <= el.clientHeight + 1));
    await fallback.context.close();
  } finally { await browser.close(); }
}
(async () => {
  await runEngine(chromium, 'chromium');
  if (process.env.DIARY_WEBKIT === '1') await runEngine(webkit, 'webkit');
  check('No uncaught browser errors', report.errors.length === 0);
  fs.rmSync(path.join(output, 'failure.json'), { force: true });
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(report.checks.length + ' diary photo checks passed. ' + output);
})().catch(error => { fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ ...report, failure: error.stack }, null, 2)); console.error(error.stack); process.exitCode = 1; });
