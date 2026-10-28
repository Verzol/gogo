/* Real HEIC bytes through the on-page picker/drop and local decoder.
 * All accounts, uploads and backend responses are browser-local fixtures. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session } = require('./verify_diary.cjs');
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const output = process.env.DIARY_HEIC_REVIEW_DIR || '/tmp/taxua-diary-heic'; fs.mkdirSync(output, { recursive: true });
const fixtures = path.join(__dirname, 'fixtures/diary_heic');
const report = { checks: [], errors: [], transport: 'Browser-local fixture sessions; real local HEIC decoder, synthetic images only' };
const check = (name, value) => { assert(value, name); report.checks.push(name); fs.writeFileSync(path.join(output, 'progress.json'), JSON.stringify(report, null, 2)); };
const payload = (source, name, mimeType) => ({ name, mimeType, buffer: fs.readFileSync(path.join(fixtures, source)) });
const ready = p => p.waitForFunction(() => !document.getElementById('diaryFiles').disabled && !document.getElementById('diaryPhotoEditor').hasAttribute('aria-busy'));
async function upload(p, files, count) {
  await p.locator('#diaryFiles').setInputFiles(files);
  await p.waitForFunction(count => window.__heicUploads.length === count, count); await ready(p);
}
async function open(p, width) {
  await p.locator('#diaryOpen').click(); if (width < 850) await p.locator('[data-diary-side="photos"]').click();
  await p.locator('[data-edit="photos"]').click(); await p.locator('#diaryEditor').waitFor();
}
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'dark' }), m = model();
      await mock(context, m);
      // Serve the actual converted JPEGs back to the editor, rather than a
      // generic media placeholder, so preview hydration is exercised too.
      const converted = new Map();
      await context.route('**/taxua-diary/upload**', async r => {
        const bytes = r.request().postDataBuffer();
        if (bytes) converted.set(new URL(r.request().url()).searchParams.get('id'), bytes);
        await r.fallback();
      });
      await context.route('**/taxua-diary/media/**', r => {
        const bytes = converted.get(new URL(r.request().url()).pathname.split('/').pop());
        return bytes ? r.fulfill({ contentType: 'image/jpeg', body: bytes }) : r.fallback();
      });
      await context.addInitScript(s => sessionStorage.setItem('taxua-diary-session-v1', JSON.stringify(s)), session(m, 'mi'));
      await context.addInitScript(() => {
        window.__heicUploads = []; window.__heicTerminated = 0;
        const NativeWorker = window.Worker;
        window.Worker = class extends NativeWorker {
          terminate() { window.__heicTerminated++; return super.terminate(); }
        };
        const fetchRequest = window.fetch;
        window.fetch = async (url, options) => {
          if (String(url).includes('/taxua-diary/upload?') && options?.body instanceof Blob) {
            const blob = options.body, bytes = new Uint8Array(await blob.arrayBuffer()), bitmap = await createImageBitmap(blob);
            const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0);
            window.__heicUploads.push({ type: blob.type, jpeg: bytes[0] === 255 && bytes[1] === 216, bytes: blob.size,
              width: bitmap.width, height: bitmap.height, pixel: [...ctx.getImageData(5, 5, 1, 1).data], metadata: new TextDecoder().decode(bytes).includes('heic-upload-fixture') }); bitmap.close();
          }
          return fetchRequest(url, options);
        };
      });
      const p = await context.newPage(), label = String(width), requests = [];
      p.on('pageerror', e => report.errors.push(label + ': ' + e.message)); p.on('request', r => requests.push(r.url()));
      await p.goto(url); await open(p, width);
      check(label + ' decoder is not loaded with public page or empty editor', !requests.some(r => /diary-heic-worker|vendor\/heif/.test(r)));
      check(label + ' picker accepts HEIC/HEIF MIME types and extensions', await p.locator('#diaryFiles').evaluate(el => ['image/heic', 'image/heif', '.heic', '.heif'].every(t => el.accept.split(',').includes(t))));
      check(label + ' upload hint fits the page', await p.locator('#diaryEditor').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await upload(p, payload('small.heic', 'iPhone.heic', 'image/heic'), 1);
      check(label + ' local fallback decodes an actual HEIC picked from device', m.uploads === 1 && m.drafts.mi.photos.length === 1 && requests.some(r => r.endsWith('/vendor/heif/libheif.js')));
      await upload(p, payload('landscape.heic', 'IMG_2026.HEIC', ''), 2);
      let pictures = await p.evaluate(() => window.__heicUploads);
      check(label + ' uppercase HEIC with empty MIME resizes to 1600 pixels', pictures[1].width === 1600 && pictures[1].height === 1067);
      check(label + ' color orientation is preserved and EXIF is stripped', pictures[1].pixel[0] > 230 && pictures[1].pixel[1] < 20 && pictures[1].pixel[2] < 20 && !pictures[1].metadata);
      await upload(p, payload('portrait.heic', 'portrait.heif', 'image/heif'), 3);
      pictures = await p.evaluate(() => window.__heicUploads);
      check(label + ' portrait retains correct orientation and pixel colors', pictures[2].width === 64 && pictures[2].height === 96 && pictures[2].pixel[1] > 110 && pictures[2].pixel[0] < 20);
      await upload(p, payload('small.heic', 'camera.jpeg', 'image/jpeg'), 4);
      check(label + ' HEIC header is recognized despite an incorrect JPEG MIME/extension', m.uploads === 4);
      await upload(p, payload('small.heic', 'camera', 'application/octet-stream'), 5);
      check(label + ' HEIC header works without image MIME or extension', m.uploads === 5);
      const bytes = fs.readFileSync(path.join(fixtures, 'small.heic')).toString('base64');
      await p.locator('#diaryPhotoPreview').evaluate((el, bytes) => {
        const data = new DataTransfer(); data.items.add(new File([Uint8Array.from(atob(bytes), c => c.charCodeAt(0))], 'drop.heic', { type: '' }));
        for (const type of ['dragenter', 'dragover', 'drop']) el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data }));
      }, bytes);
      await p.waitForFunction(() => window.__heicUploads.length === 6); await ready(p);
      check(label + ' dropping HEIC uses the same safe conversion path', m.uploads === 6);
      await upload(p, payload('collection.heif', 'collection.heif', 'image/heif-sequence'), 7);
      pictures = await p.evaluate(() => window.__heicUploads);
      check(label + ' HEIF collection selects primary image rather than first frame', pictures[6].width === 64 && pictures[6].height === 96 && pictures[6].pixel[0] > 230 && pictures[6].pixel[2] > 230);
      const before = m.requests.filter(a => a === 'reserve-photo').length;
      await p.locator('#diaryFiles').setInputFiles({ name: 'damaged.heic', mimeType: 'image/heic', buffer: Buffer.from('broken HEIC file') });
      await p.waitForFunction(() => document.getElementById('diaryUploadStatus').dataset.error === 'true'); await ready(p);
      check(label + ' corrupt HEIC shows recovery text without reserving a photo', m.requests.filter(a => a === 'reserve-photo').length === before && (await p.locator('#diaryUploadStatus').innerText()).includes('HEIC'));
      await p.locator('#diaryFiles').setInputFiles({ name: 'huge.heic', mimeType: 'image/heic', buffer: Buffer.alloc(20 * 1024 * 1024 + 1) });
      await p.waitForFunction(() => document.getElementById('diaryUploadStatus').textContent.includes('Tệp ảnh quá lớn')); await ready(p);
      check(label + ' source size limit rejects HEIC before upload', m.uploads === 7 && m.requests.filter(a => a === 'reserve-photo').length === before);
      // Force the local codec request to fail, then verify retry works without losing the existing draft.
      await context.route('**/vendor/heif/libheif.js', r => r.abort());
      await p.locator('#diaryFiles').setInputFiles(payload('small.heic', 'retry.heic', 'image/heic'));
      await p.waitForFunction(() => document.getElementById('diaryUploadStatus').textContent.includes('Chưa tải được bộ đọc HEIC')); await ready(p);
      check(label + ' missing decoder reports an error and leaves draft intact', m.uploads === 7 && m.drafts.mi.photos.length === 7);
      await context.unroute('**/vendor/heif/libheif.js');
      // Close/logout while the codec is still loading: worker is terminated and no reservation follows.
      for (const mode of ['close', 'logout']) {
        let release, started; const waiting = new Promise(r => started = r), pending = new Promise(r => release = r);
        await context.route('**/vendor/heif/libheif.js', async r => { started(); await pending; await r.abort().catch(() => {}); });
        await p.locator('#diaryFiles').setInputFiles(payload('small.heic', 'loading.heic', 'image/heic')); await Promise.race([waiting, new Promise((_, reject) => setTimeout(() => reject(new Error(label + ' decoder load did not start during ' + mode)), 15000))]);
        const terminated = await p.evaluate(() => window.__heicTerminated);
        if (mode === 'close') await p.locator('[data-close-editor]').first().click(); else await p.evaluate(() => window.TaxuaDiaryApi.clear());
        check(label + ' ' + mode + ' cancels conversion and exits promptly', !await p.locator('#diaryEditor').isVisible() && await p.evaluate(n => window.__heicTerminated > n, terminated));
        release(); await context.unroute('**/vendor/heif/libheif.js');
        check(label + ' ' + mode + ' never reserves or uploads cancelled image', m.uploads === 7 && m.requests.filter(a => a === 'reserve-photo').length === before);
        if (mode === 'logout') {
          await p.evaluate(s => sessionStorage.setItem('taxua-diary-session-v1', JSON.stringify(s)), session(m, 'mi')); await p.reload(); await open(p, width);
        } else { await p.locator('[data-edit="photos"]').click(); await p.locator('#diaryEditor').waitFor({ state: 'visible' }); }
      }
      await upload(p, [payload('small.heic', 'mixed.heic', 'image/heic'), { name: 'mixed.webp', mimeType: 'image/webp', buffer: fs.readFileSync(path.join(__dirname, '../figures/places/p13_1440.webp')) }], 2);
      // The reload reset page instrumentation, but the fixture library now contains nine photos.
      check(label + ' mixed HEIC/WebP batch reaches nine without changing cap', m.uploads === 9 && m.drafts.mi.photos.length === 9);
      await p.locator('#diaryFiles').setInputFiles(payload('small.heic', 'tenth.heic', 'image/heic')); await ready(p);
      check(label + ' tenth HEIC is rejected without upload', m.uploads === 9 && m.drafts.mi.photos.length === 9);
      const last = await p.evaluate(() => window.__heicUploads);
      check(label + ' all uploaded files are bounded JPEGs', [...pictures, ...last].every(i => i.jpeg && i.type === 'image/jpeg' && i.bytes <= 2097152 && i.width <= 1600 && i.height <= 1600 && !i.metadata));
      await p.locator('#diaryPublish').click(); await p.waitForFunction(() => document.getElementById('diarySaveStatus').textContent.includes('Đã lưu vào sổ'));
      check(label + ' converted photos publish normally', m.entries[0].photos.length === 9);
      await p.waitForFunction(() => [...document.querySelectorAll('#diaryPhotoPreview img')].every(i => i.complete && i.naturalWidth && !i.hidden));
      check(label + ' all nine converted image previews hydrate', await p.locator('#diaryPhotoPreview img:visible').count() === 9);
      await p.locator('#diaryEditor').screenshot({ path: path.join(output, width + '-nine.png') });
      await context.close();
    }
    check('no uncaught browser errors', report.errors.length === 0);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log(`${report.checks.length} HEIC upload checks passed. Evidence: ${output}`);
  } finally { await browser.close(); }
})().catch(e => { fs.writeFileSync(path.join(output, 'failed-report.json'), JSON.stringify({ ...report, failure: String(e) }, null, 2)); console.error(e); process.exitCode = 1; });
