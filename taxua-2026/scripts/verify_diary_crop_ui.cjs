/* Crop geometry and editor usability with browser-local accounts/photos only. */
const assert = require('node:assert/strict'), fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session } = require('./verify_diary.cjs');
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const output = process.env.DIARY_CROP_REVIEW_DIR || '/tmp/taxua-diary-crop-ui';
const report = { checkedAt: new Date().toISOString(), checks: [], errors: [], transport: 'Browser-local fixtures; no real crew writes' };
fs.mkdirSync(output, { recursive: true });
for (const name of ['failure.json', 'failure-layout.png', 'report.json']) fs.rmSync(output + '/' + name, { force: true });
const check = (name, value) => { assert(value, name); report.checks.push(name); };
const ready = p => p.waitForFunction(() => [...document.querySelectorAll('#diaryPhotoPreview img')].every(i => !i.hidden && i.naturalWidth && i.style.width));
async function geometry(p) {
  return p.evaluate(() => {
    const tools = document.getElementById('diaryCropTools'), image = document.querySelector('[data-crop-pan]');
    const photo = image.closest('[data-frame-photo]'), paper = document.querySelector('#diaryPhotoPreview > .diary-page');
    const rect = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const aperture = rect(image), dock = rect(tools), buttons = [...tools.querySelectorAll('button')];
    const center = document.elementFromPoint((aperture.left + aperture.right) / 2, (aperture.top + aperture.bottom) / 2);
    return { aperture, frame: rect(photo), dock, paper: rect(paper), footer: rect(paper.querySelector('footer')), dialog: rect(document.getElementById('diaryEditor')),
      target: Boolean(center?.closest('[data-crop-pan]')), overflow: document.getElementById('diaryEditor').scrollWidth > document.getElementById('diaryEditor').clientWidth + 1,
      buttons: buttons.map(el => ({ ...rect(el), font: getComputedStyle(el.querySelector('span')).fontSize })),
      slider: rect(document.getElementById('diaryCropZoom')) };
  });
}
(async () => {
  const b = await chromium.launch();
  try {
    for (const [width, height, textScale] of [[1440,1050,1],[737,925,1],[390,844,1],[320,568,1],[844,390,1],[390,844,2]].filter(v => !process.env.DIARY_CROP_SCENARIO || v.join(',') === process.env.DIARY_CROP_SCENARIO)) {
      const label = `${width}x${height} text ${textScale}`, c = await b.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: width < 500, colorScheme: 'dark' });
      const m = model(); await mock(c, m);
      await c.addInitScript(s => { if (location.origin === s.origin) localStorage.setItem('taxua-diary-session-v1', JSON.stringify(s.session)); }, { origin: new URL(url).origin, session: session(m, 'mi') });
      const p = await c.newPage(); p.on('pageerror', e => report.errors.push(label + ': ' + e.message));
      await p.goto(url); await p.evaluate(() => document.fonts.ready);
      if (textScale > 1) await p.addStyleTag({ content: `html { font-size: ${textScale * 100}% !important; }` });
      await p.locator('#diaryOpen').click(); await p.locator('#diaryReader').waitFor({ state: 'visible' });
      if (width < 850) await p.locator('[data-diary-side="photos"]').click();
      check(label + ' reader controls clear the page selector', await p.locator('.diary-reader-tools').evaluate(el => { const a = el.getBoundingClientRect(), b = document.querySelector('.diary-mobile-sides').getBoundingClientRect(); return !b.width || b.right <= a.left + 1; }));
      for (const count of [1,2,3,4,5,6,7,8,9]) {
        m.entries[0].photos = Array.from({ length: count }, (_, i) => ({ id: `photo-${i}`, caption: `Ảnh ${i + 1}`, alt: 'Mây trên núi', ...(count === 9 && i === 0 ? { size: 'large' } : {}) }));
        m.libraries.mi = structuredClone(m.entries[0].photos); delete m.drafts.mi;
        await p.locator('#diaryRefresh').click();
        await p.waitForFunction(n => document.querySelector('#diaryPages [data-photo-count]')?.dataset.photoCount === String(n), count);
        await p.locator('[data-edit="photos"]').click(); await ready(p);
        check(label + ' count ' + count + ' add control fits paper header', await p.locator('#diaryPhotoPreview [data-add-photos]').evaluate(el => { const a = el.getBoundingClientRect(), b = el.closest('.diary-page').getBoundingClientRect(); return a.left >= b.left && a.right <= b.right; }));
        for (const index of new Set([0, count - 1])) {
          await p.locator(`[data-select-photo="photo-${index}"]`).click();
          const originalPage = await p.locator('#diaryPhotoPreview').evaluate(el => ({ height: el.firstElementChild.style.height, ratio: el.style.getPropertyValue('--preview-ratio') }));
          await p.locator('[data-arrange="crop"]').click();
          const g = await geometry(p), item = label + ' count ' + count + ' frame ' + index;
          report.lastGeometry = { item, ...g };
          if (g.dock.bottom > g.footer.top + 1) await p.locator('#diaryEditor').screenshot({ path: output + '/failure-layout.png' });
          check(item + ' controls clear the complete photo frame', g.dock.top >= g.frame.bottom + 8);
          check(item + ' controls stay inside paper above footer', g.dock.left >= g.paper.left && g.dock.right <= g.paper.right && g.dock.bottom <= g.footer.top + 1);
          check(item + ' photo and controls visible together', g.aperture.top >= g.dialog.top && g.dock.bottom <= g.dialog.bottom && g.target);
          check(item + ' buttons match in size and text', g.buttons.every(v => v.width >= 44 && v.height >= 44 && v.font === g.buttons[0].font && Math.abs(v.width - g.buttons[0].width) < 1 && Math.abs(v.height - g.buttons[0].height) < 1));
          check(item + ' zoom has a touch target and no overflow', g.slider.height >= 44 && !g.overflow);
          await p.locator('#diaryEditor').evaluate(el => el.scrollTop = el.scrollHeight);
          const scrolled = await geometry(p);
          check(item + ' scrolling never overlays crop controls', scrolled.dock.top >= scrolled.frame.bottom + 8);
          await p.locator('[data-crop-action="cancel"]').click();
          check(item + ' cancel restores page dimensions', await p.locator('#diaryPhotoPreview').evaluate((el, original) => el.firstElementChild.style.height === original.height && el.style.getPropertyValue('--preview-ratio') === original.ratio, originalPage));
        }
        if ([3,8].includes(count)) {
          await p.locator('[data-arrange="crop"]').click();
          await p.locator('#diaryEditor').screenshot({ path: `${output}/${width}-${height}-${textScale}-count-${count}.png` });
          await p.locator('[data-crop-action="done"]').click();
        }
        if (count === 9) {
          await p.locator('[data-arrange="size"]').click();
          await p.locator('[data-photo-note]').click();
          check(label + ' notes replace size choices with one click', await p.locator('#diaryPhotoFields [data-caption]').isVisible() && await p.locator('[data-photo-note]').getAttribute('aria-expanded') === 'true' && await p.locator('[data-arrange="size"]').getAttribute('aria-expanded') === 'false');
          await p.locator('[data-arrange="size"]').click();
          check(label + ' size choices replace notes with one click', await p.locator('[data-photo-size="auto"]').isVisible() && await p.locator('[data-photo-note]').getAttribute('aria-expanded') === 'false');
          await p.locator('[data-close-note]').click();
          check(label + ' closing note resets expanded state', !await p.locator('#diaryPhotoFields').isVisible() && await p.locator('[data-arrange="size"]').getAttribute('aria-expanded') === 'false');
        }
        await p.locator('[data-close-editor]').first().click(); await p.locator('#diaryEditor').waitFor({ state: 'hidden' });
      }
      await c.close();
    }
    check('no uncaught browser errors', report.errors.length === 0);
    fs.writeFileSync(output + '/report.json', JSON.stringify(report, null, 2));
    console.log(report.checks.length + ' crop UI checks passed; ' + output);
  } finally { await b.close(); }
})().catch(e => { fs.writeFileSync(output + '/failure.json', JSON.stringify({ ...report, failure: e.stack }, null, 2)); console.error(e); process.exitCode = 1; });
