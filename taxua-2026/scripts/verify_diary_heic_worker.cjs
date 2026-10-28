/* Worker allocation boundary, CSP, timeout and native-decoding fallback.
 * Synthetic/local images and browser-only account fixtures; no backend writes. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session } = require('./verify_diary.cjs');
const output = process.env.DIARY_HEIC_REVIEW_DIR || '/tmp/taxua-diary-heic'; fs.mkdirSync(output, { recursive: true });
const report = { checks: [], errors: [] }, check = (name, value) => { assert(value, name); report.checks.push(name); };
(async () => {
  // A claimed dimension above 50 MP must be rejected before RGBA allocation/display.
  let allocated = false, displayed = false, freed = false, result;
  const context = { Blob, importScripts() {}, ImageData: function() { allocated = true; }, self: { postMessage: data => result = data },
    buildLibheif: () => ({ HeifDecoder: class { decode() { return [{ is_primary: () => true, get_width: () => 10000, get_height: () => 5001, display() { displayed = true; }, free() { freed = true; } }]; } } }) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../diary-heic-worker.js'), 'utf8'), context);
  await context.self.onmessage({ data: new Blob(['fixture']) });
  check('oversized decoded dimensions reject before allocation/display', result.error === 'IMAGE_DIMENSIONS' && !allocated && !displayed && freed);
  const browser = await chromium.launch();
  try {
    const c = await browser.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' }), m = model(); await mock(c, m);
    await c.addInitScript(s => sessionStorage.setItem('taxua-diary-session-v1', JSON.stringify(s)), session(m, 'mi'));
    const p = await c.newPage(), requests = []; p.on('pageerror', e => report.errors.push(e.message)); p.on('request', r => requests.push(r.url()));
    await p.goto(process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/'); await p.locator('#diaryOpen').click(); await p.locator('[data-diary-side="photos"]').click(); await p.locator('[data-edit="photos"]').click();
    // iOS can keep a HEIC filename after the picker has already transcoded its bytes.
    await p.locator('#diaryFiles').setInputFiles({ name: 'transcoded.HEIC', mimeType: 'image/heic', buffer: fs.readFileSync(path.join(__dirname, '../figures/places/p13_1440.webp')) });
    await p.waitForFunction(() => window.__diaryUploadChecks.length === 1 && !document.getElementById('diaryFiles').disabled);
    check('native decoding accepts transcoded bytes retaining HEIC name', m.uploads === 1 && m.drafts.mi.photos.length === 1 && await p.evaluate(() => window.__diaryUploadChecks.every(Boolean)));
    check('successful native decoding never requests worker or codec', !requests.some(r => /diary-heic-worker|vendor\/heif/.test(r)));
    await c.route('**/diary-heic-worker.js', async r => {
      const response = await r.fetch(); await r.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': "default-src 'none'; script-src 'self'; connect-src 'none'" } });
    });
    const encoded = fs.readFileSync(path.join(__dirname, 'fixtures/diary_heic/small.heic')).toString('base64');
    const decoded = await p.evaluate(bytes => new Promise((resolve, reject) => {
      const w = new Worker('./diary-heic-worker.js'), timer = setTimeout(() => { w.terminate(); reject(new Error('CSP decode timed out')); }, 15000);
      w.onerror = e => { e.preventDefault(); clearTimeout(timer); w.terminate(); reject(new Error(e.message)); };
      w.onmessage = ({ data }) => { clearTimeout(timer); const result = data.bitmap ? { width: data.bitmap.width, height: data.bitmap.height } : data; data.bitmap?.close(); w.terminate(); resolve(result); };
      w.postMessage(new Blob([Uint8Array.from(atob(bytes), c => c.charCodeAt(0))]));
    }), encoded);
    check('actual decoder works under CSP without unsafe-eval or external connections', decoded.width === 96 && decoded.height === 64);
    await c.unroute('**/diary-heic-worker.js');
    await c.route('**/diary-heic-worker.js', r => r.fulfill({ contentType: 'application/javascript', body: 'self.onmessage = () => {};' }));
    await p.clock.install();
    await p.locator('#diaryFiles').setInputFiles({ name: 'slow.heic', mimeType: 'image/heic', buffer: Buffer.from(encoded, 'base64') });
    await p.waitForFunction(() => document.getElementById('diaryUploadStatus').textContent.includes('Đang đọc ảnh HEIC'));
    await p.clock.fastForward(60001);
    await p.waitForFunction(() => document.getElementById('diaryUploadStatus').textContent.includes('mất quá lâu') && !document.getElementById('diaryFiles').disabled);
    check('conversion timeout restores controls without reserving or altering draft', m.uploads === 1 && m.requests.filter(a => a === 'reserve-photo').length === 1 && m.drafts.mi.photos.length === 1);
    await p.locator('[data-close-editor]').first().click();
    check('timeout does not trap the editor', !await p.locator('#diaryEditor').isVisible());
    await c.close();
  } finally { await browser.close(); }
  check('no uncaught browser errors', report.errors.length === 0);
  fs.writeFileSync(path.join(output, 'worker-report.json'), JSON.stringify(report, null, 2)); console.log(`${report.checks.length} HEIC worker checks passed. Evidence: ${output}`);
})().catch(e => { console.error(e); process.exitCode = 1; });
