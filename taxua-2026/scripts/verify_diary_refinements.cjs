/* Balanced roster, bounded photo sizing and interruptible editing.
 * Browser-local transport fixtures only; no real crew accounts or media writes. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session } = require('./verify_diary.cjs');
const output = process.env.DIARY_REFINEMENT_REVIEW_DIR || '/tmp/taxua-diary-refinements'; fs.mkdirSync(output, { recursive: true });
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = { checks: [], errors: [], transport: 'Browser-local fixtures; no hosted crew mutations' };
const check = (label, value) => { assert(value, label); report.checks.push(label); };
const visible = p => p.waitForFunction(() => document.getElementById('diaryEditor').open);
const ready = p => p.waitForFunction(() => [...document.querySelectorAll('#diaryPhotoPreview img')].every(i => i.complete && i.naturalWidth && !i.hidden));
const save = async p => { await p.locator('#diarySaveDraft').click(); await p.waitForFunction(() => document.getElementById('diarySaveStatus').textContent.includes('được lưu riêng')); };
const open = async (p, tab = 'writing') => { if (p.viewportSize().width < 850 && !await p.locator(`[data-edit="${tab}"]`).isVisible()) await p.locator(`[data-diary-side="${tab}"]`).click(); await p.locator(`[data-edit="${tab}"]`).click(); await visible(p); };
const closed = p => p.waitForFunction(() => !document.getElementById('diaryEditor').open);
async function run(type, engine) {
  const browser = await type.launch();
  try {
    for (const width of [1440, 390, 320]) {
      const c = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference', colorScheme: 'dark', hasTouch: width < 500 });
      const m = model(); await mock(c, m); let gate;
      // Hold one real UI request, then either forward to the base fixture or reject it.
      await c.route('**/functions/v1/taxua-diary/**', async route => {
        if (!gate || gate.used || route.request().method() === 'OPTIONS' || !new URL(route.request().url()).pathname.endsWith('/' + gate.action)) return route.fallback();
        const held = gate; held.used = true; held.started(); await held.promise;
        if (held.fail) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"REQUEST_FAILED"}' });
        return route.fallback();
      });
      function hold(action, fail = false) {
        let release, started; const promise = new Promise(r => release = r), waiting = new Promise(r => started = r);
        gate = { action, promise, release, started, used: false, fail }; return { release, waiting };
      }
      const p = await c.newPage(), label = `${engine} ${width}`;
      p.on('pageerror', e => report.errors.push(label + ': ' + e.message));
      await p.goto(url); await p.locator('#diaryOpen').click();
      check(label + ' login has two balanced rows of four', await p.locator('.diary-auth-members label').evaluateAll(els => {
        const rows = new Map(); els.forEach(el => { const y = Math.round(el.getBoundingClientRect().top); rows.set(y, (rows.get(y) || 0) + 1); });
        return els.length === 8 && rows.size === 2 && [...rows.values()].every(n => n === 4);
      }));
      check(label + ' login has no horizontal overflow', await p.locator('#diaryAuth').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await p.locator('#diaryAuth').screenshot({ path: path.join(output, `${engine}-${width}-login.png`) });
      // Reload with an isolated tab session rather than claiming any hosted account.
      await p.evaluate(s => sessionStorage.setItem('taxua-diary-session-v1', JSON.stringify(s)), session(m, 'mi'));
      m.entries[0].photos = Array.from({ length: 8 }, (_, i) => ({ id: `photo-${i}`, caption: `Tấm ảnh ${i + 1}`, alt: 'Mây trên núi', ...(i === 0 ? { crop: { x: .3, y: .7, zoom: 1.7 } } : {}) }));
      m.libraries.mi = structuredClone(m.entries[0].photos);
      await p.reload(); await p.locator('#diaryOpen').click(); if (width < 850) await p.locator('[data-diary-side="photos"]').click();
      await open(p, 'photos'); await ready(p);
      check(label + ' corner grip icons removed', await p.locator('[data-grip-photo],.diary-photo-grip').count() === 0);
      check(label + ' packing remains bounded and never overlaps', await p.evaluate(() => {
        const sizes = [undefined, 'small', 'medium', 'large']; let seed = 571;
        for (let n = 1; n <= 9; n++) for (let trial = 0; trial < 250; trial++) {
          const photos = Array.from({ length: n }, () => ({ size: sizes[(seed = (seed * 1664525 + 1013904223) >>> 0) >>> 30] }));
          const plan = TaxuaDiaryPhotos.layout(photos);
          if (!plan || plan.rows > 8 || plan.rows < 4 || plan.boxes.length !== n) return false;
          for (const a of plan.boxes) if (a.x < 0 || a.y < 0 || a.x + a.w > 6 || a.y + a.h > plan.rows) return false;
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            const a = plan.boxes[i], b = plan.boxes[j];
            if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) return false;
          }
        } return true;
      }));
      check(label + ' eight photos use three three two without strip', await p.evaluate(() => {
        const boxes = TaxuaDiaryPhotos.layout(Array.from({ length: 8 }, () => ({}))).boxes;
        return boxes.every(b => b.w === 2 && b.h === 2) && boxes[6].x === 1 && boxes[7].x === 3;
      }));
      await p.locator('#diaryEditor').screenshot({ path: path.join(output, `${engine}-${width}-eight.png`) });
      await p.locator('[data-arrange="size"]').click(); await p.locator('[data-photo-size="large"]').click();
      check(label + ' changing size animates existing frames', await p.locator('#diaryPhotoPreview').evaluate(el => el.getAnimations({ subtree: true }).some(a => a.playState === 'running')));
      check(label + ' selected size has visible pressed state', await p.locator('[data-photo-size="large"]').getAttribute('aria-pressed') === 'true');
      await p.locator('[data-close-note]').click(); await save(p);
      check(label + ' size saves with original crop', m.drafts.mi.photos[0].size === 'large' && m.drafts.mi.photos[0].crop.zoom === 1.7);
      await p.locator('[data-select-photo="photo-1"]').click(); await p.locator('[data-arrange="size"]').click();
      check(label + ' oversized composition cannot be selected', await p.locator('[data-photo-size="large"]').isDisabled());
      await p.locator('[data-close-note]').click(); await p.locator('[data-select-photo="photo-0"]').click();
      await p.locator('[data-arrange="size"]').click();
      await p.locator('#diaryEditor').screenshot({ path: path.join(output, `${engine}-${width}-sizes.png`) });
      await p.locator('[data-close-note]').click(); await p.locator('#diaryPublish').click();
      await p.waitForFunction(() => document.getElementById('diarySaveStatus').textContent.includes('Đã lưu vào sổ'));
      await p.locator('[data-close-editor]').first().click(); await closed(p);
      check(label + ' publication keeps bounded size', m.entries[0].photos[0].size === 'large');
      const readerArea = await p.locator('#diaryPages [data-view-photo="photo-0"]').evaluate(el => el.closest('figure').style.gridArea);
      await open(p, 'photos'); await ready(p);
      check(label + ' reader and reopened editor use identical saved geometry', readerArea === await p.locator('[data-frame-photo="photo-0"]').evaluate(el => el.style.gridArea));
      await p.locator('[data-arrange="swap"]').click(); await p.locator('[data-select-photo="photo-7"]').click(); await save(p);
      check(label + ' moving enlarged photo late keeps its size instead of falling back', await p.locator('[data-frame-photo="photo-0"]').evaluate(el => el.style.gridColumnEnd === 'span 4' && el.style.gridRowEnd === 'span 4'));
      await p.locator('[data-arrange="swap"]').click(); await p.locator('[data-select-photo="photo-7"]').click(); await save(p);
      await p.locator('[data-arrange="size"]').click(); await p.locator('[data-photo-size="auto"]').click(); await p.locator('[data-close-note]').click(); await save(p);
      check(label + ' auto restores balanced default', !m.drafts.mi.photos[0].size && await p.locator('[data-frame-photo="photo-0"]').evaluate(el => el.style.gridColumnEnd === 'span 2'));
      // Destination frames remain reachable: the toolbar must not eat the click.
      await p.locator('[data-arrange="swap"]').click(); check(label + ' swap mode removes toolbar obstruction', !await p.locator('#diaryCropTools').isVisible());
      await p.locator('[data-select-photo="photo-4"]').click(); await save(p);
      check(label + ' target click swaps and exits swap mode', m.drafts.mi.photos[4].id === 'photo-0' && await p.locator('#diaryCropTools').isVisible());
      await p.locator('[data-editor-tab="writing"]').click();
      m.failSave = true; await p.locator('#diaryEditBody').fill('Giữ lời viết khi mạng lỗi.'); await p.locator('#diarySaveDraft').click();
      await p.locator('#diaryConflict').waitFor({ state: 'visible' });
      check(label + ' error has concise status and actionable retry', await p.locator('#diarySaveStatus').innerText() === 'Chưa lưu được.' && await p.locator('#diaryRetrySave').isVisible() && !await p.locator('#diaryReloadDraft').isVisible());
      check(label + ' feedback and footer fit dialog', await p.locator('#diaryEditor').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await p.locator('#diaryEditor').screenshot({ path: path.join(output, `${engine}-${width}-failure.png`) });
      await p.locator('[data-close-editor]').first().click(); await closed(p);
      check(label + ' X exits failed save immediately', !await p.locator('#diaryEditor').isVisible());
      await open(p); await p.locator('#diaryRecovery').waitFor({ state: 'visible' }); await p.locator('#diaryRestoreWriting').click();
      check(label + ' recovery restores writing and all photo metadata', await p.locator('#diaryEditBody').inputValue() === 'Giữ lời viết khi mạng lỗi.' && await p.locator('#diaryPhotoPreview [data-frame-photo]').count() === 8);
      m.failSave = false; await save(p);
      // A dirty close while a previous snapshot is in flight must save the newer one with the returned revision.
      const slow = hold('save-draft'); await p.locator('#diaryEditBody').fill('Bản trước.'); await p.locator('#diarySaveDraft').click(); await slow.waiting;
      await p.locator('#diaryEditBody').fill('Bản cuối trước khi đóng.'); await p.locator('[data-close-editor]').first().click(); await closed(p); slow.release();
      await open(p);
      check(label + ' background close serializes revisions and saves latest snapshot', await p.locator('#diaryEditBody').inputValue() === 'Bản cuối trước khi đóng.' && m.drafts.mi.body === 'Bản cuối trước khi đóng.');
      // Backdrop closes on a deliberate outside click, not an inside-to-outside drag.
      const bounds = await p.locator('#diaryEditor').boundingBox(), x = Math.max(1, bounds.x - 5), y = bounds.y + 5;
      await p.mouse.move(bounds.x + 20, bounds.y + 20); await p.mouse.down(); await p.mouse.move(x, y); await p.mouse.up();
      check(label + ' dragging out of dialog does not dismiss', await p.locator('#diaryEditor').isVisible());
      await p.mouse.click(x, y); await closed(p); check(label + ' backdrop click exits editor', !await p.locator('#diaryEditor').isVisible());
      await open(p); await p.locator('#diaryEditBody').fill('Nháp riêng ở đây.'); m.drafts.mi.revision++;
      await p.locator('#diarySaveDraft').click(); await p.locator('#diaryReloadDraft').waitFor({ state: 'visible' });
      check(label + ' conflict offers reload without retry overwrite', !await p.locator('#diaryRetrySave').isVisible());
      await p.keyboard.press('Escape'); await closed(p); await open(p); await p.locator('#diaryRestoreWriting').click();
      check(label + ' Escape exits conflict and retains recoverable work', await p.locator('#diaryEditBody').inputValue() === 'Nháp riêng ở đây.'); await save(p);
      for (const fail of [false, true]) {
        const pub = hold('publish', fail); await p.locator('#diaryPublish').click(); await pub.waiting;
        check(label + ' close remains enabled during publish ' + fail, !await p.locator('[data-close-editor]').first().isDisabled());
        await p.locator('[data-close-editor]').first().click(); await closed(p); pub.release();
        // Opening waits for publication to finish; an immediate edit attempt simply reports busy.
        await p.waitForFunction(() => document.getElementById('diaryStatus').textContent.includes('Đã lưu vào sổ') || document.getElementById('diaryStatus').textContent.includes('Chưa lưu vào sổ'));
        await open(p); check(label + ' reopens safely after detached publish ' + fail, await p.locator('#diaryEditBody').inputValue() === 'Nháp riêng ở đây.');
      }
      await p.locator('[data-editor-tab="photos"]').click();
      const upload = hold('upload'); await p.locator('#diaryFiles').setInputFiles(path.join(__dirname, '../figures/places/p13_1440.webp')); await upload.waiting;
      await p.locator('[data-close-editor]').first().click(); await closed(p); upload.release();
      await p.waitForTimeout(150); await open(p, 'photos');
      await p.waitForFunction(() => document.querySelectorAll('#diaryRecoveredPhotos [data-attach-photo]').length === 1);
      check(label + ' upload finishing after close is recoverable and not auto-attached', m.libraries.mi.length === 9 && m.drafts.mi.photos.length === 8 && !await p.locator('#diaryPhotoEditor').getAttribute('aria-busy'));
      await p.keyboard.press('Escape'); await closed(p);
      m.entries[0].photos = Array.from({ length: 6 }, (_, i) => ({ id: `fixture-${i}`, caption: 'Khung đã chọn cỡ', alt: 'Mây', size: i < 2 ? 'large' : 'small' }));
      m.libraries.mi = [...structuredClone(m.entries[0].photos), { id: 'fixture-extra', state: 'ready', width: 640, height: 360 }]; delete m.drafts.mi;
      await p.locator('#diaryRefresh').click(); await p.waitForFunction(() => document.querySelector('#diaryPages [data-photo-count]')?.dataset.photoCount === '6');
      await open(p, 'photos'); await p.locator('#diaryRecoveredDrawer').evaluate(el => el.open = true);
      await p.locator('[data-attach-photo="fixture-extra"]').click(); await save(p);
      check(label + ' adding a photo gently shrinks crowded custom frames', m.drafts.mi.photos.length === 7 && m.drafts.mi.photos[0].size === 'large' && m.drafts.mi.photos[1].size === 'medium' && await p.locator('[data-frame-photo="fixture-0"]').evaluate(el => el.style.gridColumnEnd === 'span 4'));
      await p.keyboard.press('Escape'); await closed(p);
      await c.close();
    }
  } finally { await browser.close(); }
}
(async () => {
  await run(chromium, 'chromium'); if (process.env.DIARY_WEBKIT === '1') await run(webkit, 'webkit');
  check('no uncaught browser errors', report.errors.length === 0);
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log(`${report.checks.length} refinement checks passed. Evidence: ${output}`);
})().catch(e => { fs.writeFileSync(path.join(output, 'failed-report.json'), JSON.stringify({ ...report, failure: String(e) }, null, 2)); console.error(e); process.exitCode = 1; });
