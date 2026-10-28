/* Real photo editing over browser-local fixtures. Never creates live users. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session } = require('./verify_diary.cjs');
const output = process.env.DIARY_EDITOR_REVIEW_DIR || '/tmp/taxua-diary-photo-editor'; fs.mkdirSync(output, { recursive: true });
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = { checks: [], errors: [], transport: 'Browser-local fixtures, no backend writes' };
const check = (name, value) => { assert(value, name); report.checks.push(name); };
const ready = p => p.waitForFunction(() => document.getElementById('diaryEditor').open && document.querySelector('#diaryPhotoPreview .diary-page') && [...document.querySelectorAll('#diaryPhotoPreview img')].every(i => !i.hidden && i.complete && i.naturalWidth && i.style.width));
async function save(p) { await p.locator('#diarySaveDraft').click(); await p.waitForFunction(() => document.getElementById('diarySaveStatus').textContent.includes('được lưu riêng')); }
async function covered(p, label) {
  check(label, await p.locator('#diaryEditor img[data-crop-x]:visible').evaluateAll(imgs => imgs.every(img => {
    const matrix = new DOMMatrix(getComputedStyle(img).transform), box = img.parentElement;
    return matrix.e <= 1 && matrix.f <= 1 && matrix.e + img.offsetWidth >= box.clientWidth - 1 && matrix.f + img.offsetHeight >= box.clientHeight - 1;
  })));
}
async function run(type, engine) {
  const browser = await type.launch();
  try {
    for (const width of [1440, 390, 320]) {
      const c = await browser.newContext({ viewport: { width, height: 1050 }, reducedMotion: 'reduce', colorScheme: width < 500 ? 'dark' : 'light', hasTouch: width < 500 });
      const m = model(); await mock(c, m);
      await c.route('**/taxua-diary/media/**', route => {
        const id = new URL(route.request().url()).pathname.split('/').pop();
        const name = id === 'photo-1' ? 'p20_1440.webp' : id === 'photo-2' ? 'f03_1440.webp' : 'p13_1440.webp';
        return route.fulfill({ contentType: 'image/webp', body: fs.readFileSync(path.join(__dirname, '../figures/places', name)) });
      });
      await c.addInitScript(s => sessionStorage.setItem('taxua-diary-session-v1', JSON.stringify(s)), session(m, 'mi'));
      const p = await c.newPage(); p.on('pageerror', e => report.errors.push(e.message));
      const label = `${engine} ${width}`;
      await p.goto(url); await p.locator('#diaryOpen').click(); if (width < 850) await p.locator('[data-diary-side="photos"]').click();
      for (let count = 0; count <= 9; count++) {
        m.entries[0].photos = Array.from({ length: count }, (_, i) => ({ id: `photo-${i}`, caption: `Ảnh ${i + 1}`, alt: 'Mây ở Tà Xùa', ...(i === 0 ? { crop: { x: .27, y: .68, zoom: 1.42 } } : {}) }));
        m.libraries.mi = m.entries[0].photos.map(photo => ({ ...photo, width: 640, height: 360 })); delete m.drafts.mi;
        await p.locator('#diaryRefresh').click(); await p.waitForFunction(n => document.querySelector('#diaryPages [data-photo-count]')?.dataset.photoCount === String(n), count);
        await p.locator('[data-edit="photos"]').click(); await p.waitForFunction(n => document.querySelector('#diaryPhotoPreview [data-photo-count]')?.dataset.photoCount === String(n), count); await ready(p);
        check(`${label} count ${count} has all frames`, await p.locator('[data-frame-photo]').count() === count);
        check(`${label} count ${count} fits paper`, await p.locator('#diaryPhotoPreview').evaluate(el => {
          const outer = el.getBoundingClientRect(); return [...el.querySelectorAll('.diary-print')].every(f => { const r = f.getBoundingClientRect(); return r.left >= outer.left - 1 && r.right <= outer.right + 1 && r.top >= outer.top && r.bottom <= outer.bottom + 1; });
        }));
        check(`${label} count ${count} no horizontal overflow`, await p.locator('#diaryEditor').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        if (count === 9) break;
        await p.locator('[data-close-editor]').first().click();
      }
      await p.locator('#diaryEditor').screenshot({ path: path.join(output, `${engine}-${width}-arrange.png`) });
      await p.locator('[data-arrange="swap"]').click();
      if (width < 500) { const r = await p.locator('[data-select-photo="photo-8"]').boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); }
      else await p.locator('[data-select-photo="photo-8"]').click();
      await save(p);
      check(label + ' tap swaps photos with metadata', m.drafts.mi.photos[8].id === 'photo-0' && m.drafts.mi.photos[0].id === 'photo-8' && m.drafts.mi.photos[8].crop.zoom === 1.42);
      await p.locator('[data-select-photo="photo-0"]').focus(); await p.keyboard.press('Alt+ArrowLeft');
      check(label + ' keyboard reorder retains focus', await p.locator('[data-select-photo="photo-0"]').evaluate(el => el === document.activeElement)); await save(p);
      check(label + ' keyboard reorder saves', m.drafts.mi.photos[7].id === 'photo-0');
      await p.locator('[data-select-photo="photo-8"]').click();
      const grip = p.locator('[data-select-photo="photo-8"]'), target = p.locator('[data-select-photo="photo-1"]');
      await grip.scrollIntoViewIfNeeded(); const a = await grip.boundingBox(), b = await target.boundingBox();
      await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
      check(label + ' frame follows pointer before release', await p.locator('[data-frame-photo="photo-8"]').evaluate(el => el.dataset.dragSource === 'true' && el.style.transform.includes('translate(')));
      check(label + ' draft order unchanged while holding drag', m.drafts.mi.photos[0].id === 'photo-8');
      await p.mouse.up(); await save(p);
      check(label + ' grip drag swaps destination', m.drafts.mi.photos[1].id === 'photo-8');
      const order = JSON.stringify(m.drafts.mi.photos); const cg = await p.locator('[data-select-photo="photo-8"]').boundingBox();
      await p.mouse.move(cg.x + cg.width / 2, cg.y + cg.height / 2); await p.mouse.down(); await p.mouse.move(3, 3, { steps: 6 }); await p.mouse.up();
      check(label + ' drop outside cancels', JSON.stringify(m.drafts.mi.photos) === order);
      await p.locator('[data-arrange="crop"]').click(); const saves = m.requests.filter(a => a === 'save-draft').length;
      await p.locator('#diaryCropZoom').focus(); await p.keyboard.press('End');
      await p.locator('#diaryCropZoom').evaluate(el => { el.value = '2.30'; el.dispatchEvent(new Event('input', { bubbles: true })); }); await p.locator('[data-crop-pan]').focus(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(1100);
      check(label + ' crop remains provisional', m.requests.filter(a => a === 'save-draft').length === saves && !m.drafts.mi.photos.find(p => p.id === 'photo-8').crop);
      await covered(p, label + ' crop covers aperture');
      const panBox = p.locator('[data-crop-pan]'); await panBox.scrollIntoViewIfNeeded();
      const pb = await panBox.boundingBox(), beforeDrag = await panBox.locator('img').getAttribute('style');
      await p.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2); await p.mouse.down();
      await p.mouse.move(pb.x + pb.width + 100, pb.y + pb.height + 100, { steps: 10 });
      await covered(p, label + ' dragging past boundary leaves no empty edge');
      await panBox.dispatchEvent('pointercancel', { pointerId: 1 }); await p.mouse.up();
      check(label + ' canceled crop drag restores its starting position', await panBox.locator('img').getAttribute('style') === beforeDrag);

      await p.locator('#diaryEditor').screenshot({ path: path.join(output, `${engine}-${width}-crop.png`) });
      await p.locator('[data-crop-action="done"]').click(); await save(p);
      const crop = structuredClone(m.drafts.mi.photos.find(p => p.id === 'photo-8').crop);
      check(label + ' accepted crop saves', crop.zoom === 2.3 && crop.x < .5 && crop.y < .5);
      await p.locator('[data-arrange="crop"]').click(); await p.locator('[data-crop-action="reset"]').click(); await p.locator('[data-crop-action="cancel"]').click(); await save(p);
      check(label + ' cancel restores crop', JSON.stringify(m.drafts.mi.photos.find(p => p.id === 'photo-8').crop) === JSON.stringify(crop));
      await p.locator('[data-arrange="crop"]').click(); await p.keyboard.press('Escape');
      check(label + ' Escape cancels crop only', await p.locator('#diaryEditor').isVisible() && await p.locator('[data-arrange="crop"]').isVisible());
      await p.locator('[data-editor-tab="writing"]').click(); await p.locator('#diaryEditBody').fill('Lời viết giữ lại khi sắp ảnh.'); await p.locator('[data-editor-tab="photos"]').click(); await save(p);
      check(label + ' tabs preserve text and photos', m.drafts.mi.body.includes('sắp ảnh') && m.drafts.mi.photos.find(p => p.id === 'photo-8').crop.zoom === 2.3);
      await p.locator('#diaryPublish').click(); await p.waitForFunction(() => document.getElementById('diarySaveStatus').textContent.includes('Đã lưu vào sổ'));
      check(label + ' publishes crop and order', m.entries[0].photos[1].id === 'photo-8' && m.entries[0].photos[1].crop.zoom === 2.3);
      await p.locator('[data-close-editor]').first().click(); await p.locator('[data-edit="photos"]').click(); await ready(p);
      check(label + ' reopen restores crop', await p.locator('[data-select-photo="photo-8"] img').getAttribute('data-crop-zoom') === '2.3');
      const previewStyle = await p.locator('[data-select-photo="photo-8"] img').getAttribute('style');
      await p.locator('[data-close-editor]').first().click();
      check(label + ' reader uses the same framing as preview', await p.locator('#diaryPages [data-view-photo="photo-8"] img').getAttribute('style') === previewStyle);
      await p.locator('#diaryPages [data-view-photo="photo-8"]').click();
      check(label + ' viewer keeps full photo', !await p.locator('.diary-full-photo').getAttribute('data-crop-x')); await p.locator('[data-close-sheet]').click();
      await p.locator('[data-edit="photos"]').click(); await ready(p); await p.locator('[data-select-photo="photo-8"]').click();
      await p.locator('[data-arrange="crop"]').click(); await p.locator('#diaryCropZoom').evaluate(el => { el.value = '1.75'; el.dispatchEvent(new Event('input', { bubbles: true })); }); await p.locator('[data-crop-action="done"]').click();
      m.failSave = true; await p.locator('#diarySaveDraft').click(); await p.locator('#diaryKeepWritingClose').waitFor(); await p.locator('#diaryKeepWritingClose').click(); m.failSave = false;
      await p.locator('[data-edit="photos"]').click(); await p.locator('#diaryRestoreWriting').click(); await save(p);
      check(label + ' failed save recovery restores crop', m.drafts.mi.photos.find(p => p.id === 'photo-8').crop.zoom === 1.75);
      m.drafts.mi.revision++; await p.locator('[data-arrange="swap"]').click(); await p.locator('[data-select-photo="photo-4"]').click(); await p.locator('#diarySaveDraft').click(); await p.locator('#diaryConflict').waitFor();
      check(label + ' conflict stays recoverable', await p.locator('#diaryKeepWritingClose').isVisible() && await p.locator('#diaryPublish').isDisabled());
      await p.evaluate(() => window.TaxuaDiaryApi.clear());
      check(label + ' logout clears private surfaces', await p.locator('[data-frame-photo]').count() === 0 && await p.locator('[data-crop-pan]').count() === 0);
      await c.close();
    }
  } finally { await browser.close(); }
}
(async () => {
  await run(chromium, 'chromium'); if (process.env.DIARY_WEBKIT === '1') await run(webkit, 'webkit');
  check('no browser errors', report.errors.length === 0); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log(`${report.checks.length} photo-editor checks passed. Evidence: ${output}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
