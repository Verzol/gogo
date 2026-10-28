/* Direct page editing with browser-local accounts and media only. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session } = require('./verify_diary.cjs');
const output = process.env.DIARY_PAGE_REVIEW_DIR || '/tmp/taxua-diary-page-editing';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = { checkedAt: new Date().toISOString(), checks: [], errors: [], transport: 'Browser-local fixtures; no crew account writes' };
fs.mkdirSync(output, { recursive: true });
const check = (label, value) => { assert(value, label); report.checks.push(label); };
const image = path.join(__dirname, '../figures/places/p13_1440.webp');
const save = async p => { await p.locator('#diarySaveDraft').click(); await p.waitForFunction(() => document.getElementById('diarySaveStatus').textContent.includes('được lưu riêng')); };
const ready = p => p.waitForFunction(() => [...document.querySelectorAll('#diaryPhotoPreview img')].every(i => !i.hidden && i.naturalWidth && i.style.width));
async function run() {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390, 320]) {
      const label = String(width), c = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 1100 }, hasTouch: width < 500, reducedMotion: 'no-preference' });
      const m = model(); await mock(c, m); await c.addInitScript(s => sessionStorage.setItem('taxua-diary-session-v1', JSON.stringify(s)), session(m, 'mi'));
      const p = await c.newPage(); p.on('pageerror', e => report.errors.push(e.message));
      await p.goto(url); await p.locator('#diaryOpen').click();
      await p.locator('[data-edit="writing"]').click();
      const title = 'Mây, gió và những người bạn', body = 'Tà Xùa, tháng mười.\n\nMình nhớ tiếng gió, nhớ mây và nhớ những người bạn.\nẮ ặ ễ ự · thảo\n<img src=x onerror=window.diaryUnsafe=1>';
      await p.locator('#diaryEditTitle').fill(title); await p.locator('#diaryEditBody').fill(body); await save(p);
      check(label + ' writing is a native field on the painted ruled leaf', await p.locator('#diaryEditBody').evaluate(el => el.closest('.diary-page') && getComputedStyle(el).backgroundImage.includes('repeating-linear-gradient') && getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)'));
      check(label + ' Vietnamese and newlines save privately', m.drafts.mi.body === body && m.entries[0].body === '');
      await p.locator('#diaryEditor').screenshot({ path: path.join(output, label + '-writing.png') });
      await p.locator('#diaryPublish').click(); await p.waitForFunction(() => document.getElementById('diarySaveStatus').textContent.includes('Đã lưu vào sổ'));
      check(label + ' reader and editor use the same ink metrics', await p.evaluate(() => {
        const reader = getComputedStyle(document.querySelector('#diaryPages .diary-writing')), field = getComputedStyle(document.getElementById('diaryEditBody'));
        return reader.font === field.font && reader.padding === field.padding && reader.backgroundImage === field.backgroundImage;
      }));
      check(label + ' markup stays plain text', !await p.evaluate(() => window.diaryUnsafe) && await p.locator('#diaryPages .diary-writing').textContent() === body);
      await p.locator('[data-editor-tab="photos"]').click();
      check(label + ' upload affordance is on the empty paper', await p.locator('#diaryPhotoPreview [data-add-photos]').count() === 2 && !await p.locator('#diaryFiles').isVisible());
      const picker = p.waitForEvent('filechooser'); await p.locator('.diary-drop-invitation').click(); await (await picker).setFiles(image);
      await p.waitForFunction(() => document.querySelectorAll('[data-frame-photo]').length === 1 && !document.getElementById('diaryFiles').disabled); await ready(p);
      check(label + ' on-page picker normalizes and attaches upload', m.uploads === 1 && m.drafts.mi.photos.length === 1);
      await p.locator('[data-caption]').fill('Mây của bọn mình');
      const publications = m.requests.filter(a => a === 'publish').length;
      await p.keyboard.press('Enter'); await p.waitForTimeout(100);
      check(label + ' Enter in a caption never publishes the draft', m.requests.filter(a => a === 'publish').length === publications);
      await save(p);
      const first = m.drafts.mi.photos[0].id;
      await p.locator('[data-photo-note]').click(); await p.locator('#diaryPhotoFields [data-caption]').fill('Chuyến đi <b>không quên</b>');
      await p.locator('[data-alt]').fill('Những mái nhà nép dưới sườn núi.'); await p.locator('[data-close-note]').click(); await save(p);
      check(label + ' contextual note and caption on frame stay in sync', await p.locator('#diaryPhotoPreview [data-caption]').inputValue() === 'Chuyến đi <b>không quên</b>' && m.drafts.mi.photos[0].alt.includes('sườn núi'));
      // Actual DataTransfer drop uses the same secure normalization path as the picker.
      const bytes = fs.readFileSync(image).toString('base64');
      await p.locator('#diaryPhotoPreview').evaluate((el, bytes) => {
        const data = new DataTransfer(); data.items.add(new File([Uint8Array.from(atob(bytes), c => c.charCodeAt(0))], 'drop.webp', { type: 'image/webp' }));
        for (const type of ['dragenter', 'dragover', 'drop']) el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data }));
      }, bytes);
      await p.waitForFunction(() => document.querySelectorAll('[data-frame-photo]').length === 2 && !document.getElementById('diaryFiles').disabled); await ready(p);
      check(label + ' dropping files uploads without navigation', m.uploads === 2 && p.url().includes('/taxua-2026/') && !await p.locator('.diary-upload-curtain').isVisible());
      check(label + ' missed file drop cannot navigate away from the editor', await p.locator('#diaryEditorTitle').evaluate(el => {
        const data = new DataTransfer(); data.items.add(new File(['unused'], 'missed.png', { type: 'image/png' }));
        const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }); el.dispatchEvent(event); return event.defaultPrevented;
      }));
      await p.locator('[data-arrange="crop"]').click();
      check(label + ' crop lifts the actual frame on the paper', await p.locator('[data-crop-pan]').evaluate(el => el.closest('[data-frame-photo]').parentElement.classList.contains('diary-page')));
      await p.locator('#diaryCropZoom').evaluate(el => { el.value = '1.8'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await p.locator('[data-crop-pan]').focus(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown');
      await p.locator('#diaryEditor').screenshot({ path: path.join(output, label + '-crop.png') });
      await p.locator('[data-crop-action="done"]').click(); await save(p);
      const photo = structuredClone(m.drafts.mi.photos[0]);
      await p.locator('[data-detach-photo]').click(); await save(p);
      check(label + ' removal is reversible and publication stays intact', m.drafts.mi.photos.length === 1 && m.libraries.mi.length === 2 && await p.locator('#diaryPhotoUndo').isVisible());
      await p.locator('[data-undo-photo]').click(); await save(p);
      check(label + ' undo restores position caption description and crop', JSON.stringify(m.drafts.mi.photos[0]) === JSON.stringify(photo));
      await p.locator(`[data-select-photo="${first}"]`).focus(); await p.keyboard.press('Alt+ArrowRight');
      const focusKept = await p.locator(`[data-select-photo="${first}"]`).evaluate(el => el === document.activeElement); await save(p);
      check(label + ' keyboard moves with metadata and focus', m.drafts.mi.photos[1].id === first && focusKept);
      const second = m.drafts.mi.photos[0].id;
      await p.locator(`[data-select-photo="${first}"]`).click(); await p.locator(`[data-select-photo="${first}"]`).scrollIntoViewIfNeeded();
      const a = await p.locator(`[data-select-photo="${first}"]`).boundingBox(), target = await p.locator(`[data-select-photo="${second}"]`).boundingBox();
      const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 }, end = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
      const before = await p.locator(`[data-frame-photo="${first}"]`).boundingBox();
      if (width < 500) {
        const cdp = await c.newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
        for (let n = 1; n <= 8; n++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * n / 8, y: start.y + (end.y - start.y) * n / 8 }] });
        const moved = await p.locator(`[data-frame-photo="${first}"]`).boundingBox();
        check(label + ' touch frame follows finger before release', Math.abs(moved.y - before.y) + Math.abs(moved.x - before.x) > 50);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await p.mouse.move(start.x, start.y); await p.mouse.down(); await p.mouse.move(end.x, end.y, { steps: 8 });
        const moved = await p.locator(`[data-frame-photo="${first}"]`).boundingBox();
        check(label + ' frame follows pointer continuously', Math.abs(moved.y - before.y) + Math.abs(moved.x - before.x) > 50);
        await p.mouse.up();
        check(label + ' dropping animates objects into their slots', await p.locator('#diaryPhotoPreview').evaluate(el => el.getAnimations({ subtree: true }).some(a => a.playState === 'running')));
      }
      await save(p); check(label + ' direct drag commits new slot', m.drafts.mi.photos[0].id === first);
      await p.waitForTimeout(300);
      await p.locator('#diaryEditor').screenshot({ path: path.join(output, label + '-photos.png') });
      await p.locator('[data-photo-note]').click(); await p.keyboard.press('Escape');
      check(label + ' Escape closes contextual note before editor', !await p.locator('#diaryPhotoFields').isVisible() && await p.locator('#diaryEditor').isVisible());
      await p.locator('#diaryFiles').setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
      await p.waitForFunction(() => document.getElementById('diaryUploadStatus').dataset.error === 'true');
      check(label + ' invalid file keeps draft and re-enables controls', m.uploads === 2 && !await p.locator('[data-add-photos]').first().isDisabled());
      await p.locator('[data-editor-tab="writing"]').click();
      await p.evaluate(() => document.documentElement.style.fontSize = '32px');
      await p.waitForFunction(() => document.getElementById('diaryEditor').classList.contains('diary-editor-large-text'));
      check(label + ' enlarged writing keeps the whole leaf available', await p.locator('.diary-writing-leaf').evaluate(el => el.scrollHeight <= el.clientHeight + 1));
      check(label + ' enlarged writing preserves Vietnamese prose', await p.locator('#diaryEditBody').inputValue() === body);
      await p.evaluate(() => document.documentElement.style.fontSize = '');
      check(label + ' page and tools fit the dialog', await p.locator('#diaryEditor').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await p.evaluate(() => window.TaxuaDiaryApi.clear());
      check(label + ' logout clears page note and undo state', await p.locator('[data-frame-photo]').count() === 0 && await p.locator('#diaryPhotoFields').textContent() === '' && !await p.locator('#diaryPhotoUndo').isVisible());
      await c.close();
    }
    check('no uncaught browser errors', report.errors.length === 0);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`${report.checks.length} direct page-editing checks passed. Evidence: ${output}`);
  } finally { await browser.close(); }
}
run().catch(e => { fs.writeFileSync(path.join(output, 'failed-report.json'), JSON.stringify({ ...report, failure: String(e) }, null, 2)); console.error(e); process.exitCode = 1; });
