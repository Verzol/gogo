/* Focused concept acceptance checks. No production files or backend are mutated. */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require(
  process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright',
);
const site = path.resolve(__dirname, '..');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-demo-review';
const base = (process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/').replace(
  /\/?$/,
  '/',
);
const ids = [
  'passport',
  'film',
  'cloud-notebook',
  'pocket-guide',
  'postcard',
  'soundscape',
  'perspectives',
  'bingo',
  'pig',
  'margin-notes',
  'gear',
  'zine',
  'offline',
];
const report = { checkedAt: new Date().toISOString(), checks: [], errors: [], screenshots: [] };
fs.mkdirSync(output, { recursive: true });
function check(name, value) {
  assert(value, name);
  report.checks.push(name);
  if (process.env.TRIP_VERBOSE) console.log('Verified: ' + name);
}
function watch(page, label) {
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => report.errors.push(label + ': ' + error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      report.errors.push(label + ': ' + response.status() + ' ' + response.url());
  });
  page.on('console', (message) => {
    if (message.type() === 'error') report.errors.push(label + ': ' + message.text());
  });
}
async function ready(page, id, file = false) {
  await page.goto(
    file
      ? pathToFileURL(path.join(site, 'demos', id + '.html')).href
      : base + 'demos/' + id + '.html',
  );
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll((images) =>
    Promise.all(
      images.map((image) => {
        image.loading = 'eager';
        return Promise.race([
          image.decode().catch(() => {}),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Image decode timed out: ' + image.getAttribute('src'))),
              5000,
            ),
          ),
        ]);
      }),
    ),
  );
}
async function saved(page, id) {
  return page.evaluate((id) => JSON.parse(localStorage.getItem('taxua-demos-v1:' + id)), id);
}
async function download(page, selector, filename) {
  const event = page.waitForEvent('download');
  await page.locator(selector).click();
  const file = await event;
  const target = path.join(output, filename);
  await file.saveAs(target);
  return fs.readFileSync(target, 'utf8');
}
(async () => {
  const browser = await chromium.launch();
  try {
    // Every entry has to render independently across desktop and narrow phones.
    for (const [label, width, height] of [
      ['desktop', 1440, 1000],
      ['phone', 390, 844],
      ['narrow', 320, 780],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      watch(page, label);
      for (const id of ['index'].concat(ids)) {
        await ready(page, id);
        check(
          label + ' ' + id + ' has no horizontal overflow',
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        );
        check(
          label + ' ' + id + ' loads all artwork',
          await page
            .locator('img')
            .evaluateAll((images) =>
              images.every((image) => image.complete && image.naturalWidth > 0),
            ),
        );
        check(
          label + ' ' + id + ' renders one main heading',
          (await page.locator('h1').count()) === 1,
        );
        if (id !== 'index') {
          check(
            label + ' ' + id + ' renders its concept and navigation',
            (await page.locator('#demoRoot').innerText()).length > 150 &&
              (await page.locator('#demoPagination a').count()) === 3,
          );
        }
        if (label !== 'narrow') {
          const file = id + '-' + label + '.png';
          await page.screenshot({ path: path.join(output, file), fullPage: true });
          report.screenshots.push(file);
        }
      }
      await context.close();
    }

    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
      acceptDownloads: true,
    });
    context.setDefaultTimeout(10000);
    const page = await context.newPage();
    watch(page, 'interaction');
    await ready(page, 'index');
    await page.evaluate(() => localStorage.setItem('taxua-production-sentinel', 'preserve'));
    check(
      'gallery links to 13 separate pages',
      (await page.locator('.idea').count()) === 13 &&
        new Set(
          await page
            .locator('.idea')
            .evaluateAll((items) => items.map((item) => item.getAttribute('href'))),
        ).size === 13,
    );
    await page.locator('[data-filter=keepsake]').focus();
    await page.keyboard.press('Enter');
    check(
      'gallery filter works with keyboard',
      (await page.locator('.idea:visible').count()) === 3 &&
        (await page.locator('[data-filter=keepsake]').getAttribute('aria-pressed')) === 'true',
    );
    check(
      'gallery respects reduced motion',
      await page
        .locator('.hero-cloud')
        .evaluate((node) => getComputedStyle(node).animationName === 'none'),
    );

    await ready(page, 'passport');
    await page.locator('#stampCaption').fill('Một biển mây <để nhớ>.');
    await page.locator('#stampForm button[type=submit]').click();
    check(
      'passport explicitly stamps the chosen stop',
      (await saved(page, 'passport')).stamps.san.ridge.caption === 'Một biển mây <để nhớ>.' &&
        (await page.locator('.is-stamped').count()) === 3,
    );
    await page.locator('[data-member="mi"]').click();
    check(
      'passport keeps a separate stamp collection per person',
      (await page.locator('.is-stamped').count()) === 0,
    );
    await page.locator('[data-member="san"]').click();
    await page.reload();
    check(
      'passport survives reload',
      (await page.locator('.passport-scribble').innerText()).includes('<để nhớ>'),
    );
    const svg = await download(page, '#downloadPassport', 'passport.svg');
    check(
      'passport exports a real SVG keepsake',
      svg.startsWith('<svg') && svg.includes('Hộ chiếu săn mây') && svg.includes('23.10.2026'),
    );

    await ready(page, 'film');
    await page
      .locator('[data-upload]')
      .first()
      .setInputFiles(path.join(site, 'figures/places/p04_480.webp'));
    await page.waitForFunction(() => document.querySelectorAll('.frame-image').length === 4);
    check(
      'film accepts and resizes a real local photo',
      (await saved(page, 'film')).photos.san[3].src.startsWith('data:image/jpeg;'),
    );
    await page.reload();
    check('uploaded photo survives reload', (await page.locator('.frame-image').count()) === 4);
    await page.locator('[data-delete="3"]').click();
    check('film removes a selected frame', (await page.locator('.frame-image').count()) === 3);
    for (const name of ['san', 'thảo', 'mi', 'linh', 'quanlele', 'gtm', 'trường']) {
      await page.locator('[data-member="' + name + '"]').click();
      await page.locator('#fillFilm').click();
    }
    check(
      'film enforces seven photos for each of seven people',
      Object.values((await saved(page, 'film')).photos).every((photos) => photos.length === 7),
    );
    await page.locator('#revealFilm').click();
    check(
      'collective reveal shows all 49 contributed frames',
      (await page.locator('.film-roll img').count()) === 49,
    );
    await page.locator('#revealFilm').click();
    check(
      'film can return to the locked preview',
      (await page.locator('.film-locked').count()) === 49,
    );
    const preservedFilm = JSON.stringify(await saved(page, 'film'));
    await ready(page, 'passport');
    await page.locator('#resetDemo').click();
    check(
      'reset is isolated to its own feature',
      (await page.locator('.is-stamped').count()) === 2 &&
        JSON.stringify(await saved(page, 'film')) === preservedFilm,
    );

    await ready(page, 'cloud-notebook');
    await page.locator('[data-filter="Sống Lưng Khủng Long"]').click();
    check(
      'cloud notebook has a useful empty filtered state',
      (await page.locator('.observation').count()) === 0 &&
        (await page.locator('.empty-state').innerText()).includes('dòng đầu'),
    );
    await page.locator('[name=member]').selectOption('linh',{force:true});
    await page.locator('[name=text]').fill('Mây mỏng, nắng vừa lên.');
    await page.locator('#observationForm button[type=submit]').click();
    const reports = (await saved(page, 'cloud-notebook')).reports;
    check(
      'new observation includes member, place, current time and content',
      reports[0].member === 'linh' &&
        reports[0].place === 'Sống Lưng Khủng Long' &&
        reports[0].text === 'Mây mỏng, nắng vừa lên.' &&
        /^\d\d:\d\d$/.test(reports[0].time),
    );
    check(
      'forecast clearly remains illustrative',
      (await page.locator('.field-notebook').innerText()).includes('Không phải dự báo thật'),
    );

    await ready(page, 'pocket-guide');
    let eventCount = 0;
    for (let index = 0; index < 4; index++) {
      await page.locator('[data-day="' + index + '"]').click();
      eventCount += await page.locator('.guide-stop').count();
    }
    check('pocket guide exposes all 24 source events', eventCount === 24);
    await page.locator('[data-day="2"]').click();
    await page.locator('[data-stop="dinosaur-ridge"]').click();
    check(
      'guide preserves unconfirmed times',
      (await page.locator('.guide-time').innerText()) === 'Giờ chưa chốt',
    );
    check(
      'guide hands off the exact map query',
      (await page.locator('.guide-detail a').getAttribute('href')).includes(
        encodeURIComponent('Sống Lưng Khủng Long điểm Săn Mây Tà Xùa'),
      ),
    );
    await page.locator('[data-list-stop="lake"]').click();
    check(
      'optional events remain visibly optional',
      (await page.locator('.guide-detail .tag').innerText()) === 'Tùy chọn',
    );
    await page.locator('[data-day="0"]').click();
    check(
      'pickup detail retains the canonical departure note',
      await page.locator('.guide-detail').evaluate(el => el.textContent.includes(TRIP_DATA.days[0].blocks[0].note)),
    );

    await ready(page, 'postcard');
    await page.locator('#postcardText').fill('Hẹn mình một ngày bình yên.');
    await page.reload();
    check(
      'postcard draft persists before sealing',
      (await page.locator('#postcardText').inputValue()) === 'Hẹn mình một ngày bình yên.',
    );
    await page.locator('#sealPostcard').click();
    check(
      'postcard seals into an envelope',
      (await page.locator('.sealed-envelope').count()) === 1,
    );
    await page.locator('#openPostcard').click();
    check(
      'simulated future opens the same message',
      (await page.locator('.opened-letter').textContent()).includes(
        'Hẹn mình một ngày bình yên.',
      ) && (await page.locator('.opened-letter').textContent()).includes('mô phỏng'),
    );
    check(
      'postcard download contains the actual draft',
      (await download(page, '#downloadPostcard', 'postcard.txt')).includes(
        'Hẹn mình một ngày bình yên.',
      ),
    );

    await page.addInitScript(() => {
      if (window.AudioContext) {
        const Original = window.AudioContext;
        window.AudioContext = class extends Original {
          constructor(...args) {
            super(...args);
            window.__demoAudio = this;
          }
        };
      }
    });
    await ready(page, 'soundscape');
    check(
      'sound never autoplays',
      (await page.locator('#soundPlay').getAttribute('aria-pressed')) === 'false' &&
        (await page.evaluate(() => !window.__demoAudio)),
    );
    await page.locator('#soundPlay').click();
    await page.waitForFunction(
      () => document.getElementById('soundPlay').getAttribute('aria-pressed') === 'true',
    );
    check(
      'explicit play starts a real audio context',
      await page.evaluate(() => window.__demoAudio.state === 'running'),
    );
    await page.locator('[data-scene="rain"]').click();
    check(
      'scene can change while listening',
      (await page.locator('.sound-controls h2').innerText()) === 'Mưa bên hiên nhà' &&
        (await page.locator('#soundPlay').getAttribute('aria-pressed')) === 'true',
    );
    await page.locator('#soundMute').click();
    check(
      'mute has accessible state',
      (await page.locator('#soundMute').getAttribute('aria-pressed')) === 'true',
    );
    await page.locator('#soundVolume').fill('15');
    check(
      'volume control updates its label',
      (await page.locator('.sound-volume output').innerText()) === '15%',
    );
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    check(
      'audio stops when page is hidden',
      (await page.locator('#soundPlay').getAttribute('aria-pressed')) === 'false' &&
        (await page.locator('.sound-world.is-playing').count()) === 0,
    );
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    });
    await page.locator('#soundPlay').click();
    await page.waitForFunction(
      () => document.getElementById('soundPlay').getAttribute('aria-pressed') === 'true',
    );
    await page.locator('#resetDemo').click();
    check(
      'reset stops audio and restores silent controls',
      (await page.locator('#soundPlay').getAttribute('aria-pressed')) === 'false' &&
        (await page.locator('#soundVolume').inputValue()) === '30',
    );
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    check(
      'leaving closes the audio context',
      await page.evaluate(() => window.__demoAudio.state === 'closed'),
    );

    await ready(page, 'perspectives');
    await page.locator('[data-scene="meadow"]').click();
    await page.locator('[data-member="thảo"]').click();
    check(
      'perspective selection changes both scene and author',
      (await page.locator('.perspective-photo figcaption').innerText()).includes('thảo') &&
        (await page.locator('.perspective-photo img').getAttribute('src')).includes('p04'),
    );
    await page.locator('#perspectiveText').fill('Mình muốn giữ màu xanh này.');
    await page.locator('#perspectiveForm button[type=submit]').click();
    await page.reload();
    check(
      'new perspective persists in its own scene and member',
      (await page.locator('blockquote').innerText()) === 'Mình muốn giữ màu xanh này.',
    );
    await page.locator('#restoreQuote').click();
    check(
      'sample perspective can be restored',
      (await page.locator('blockquote').innerText()) !== 'Mình muốn giữ màu xanh này.',
    );

    await ready(page, 'bingo');
    await page.locator('[data-cell="0"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-cell="1"]').click();
    await page.locator('[data-cell="2"]').click();
    check(
      'bingo celebrates a completed cooperative row',
      (await page.locator('.bingo-result').innerText()).includes('Bingo!'),
    );
    await page.locator('[data-cell="1"]').click();
    check(
      'bingo can undo a marked cell',
      (await page.locator('[data-cell="1"]').getAttribute('aria-pressed')) === 'false' &&
        !(await page.locator('.bingo-result').innerText()).includes('Bingo!'),
    );

    await ready(page, 'pig');
    for (const id of ['cloud', 'flower', 'road']) {
      await page.locator('[data-souvenir="' + id + '"]').click();
      await page.locator('#collectSouvenir').click();
    }
    check(
      'pig collects four souvenirs and reveals diary entries',
      (await saved(page, 'pig')).collected.length === 4 &&
        (await page.locator('.pig-diary blockquote').innerText()).includes('Trên xe về'),
    );

    await ready(page, 'margin-notes');
    check(
      'margin notes can attach to every source event',
      (await page.locator('#marginStop option').count()) === 24,
    );
    await page.locator('#marginForm [name=member]').selectOption('gtm',{force:true});
    await page.locator('#marginForm [name=text]').fill('Một câu có <dấu ngoặc>, vẫn là chữ.');
    await page.locator('#marginForm button[type=submit]').click();
    check(
      'margin note safely renders literal user text',
      (await page.locator('.margin-note').last().innerText()).includes('<dấu ngoặc>') &&
        (await page.locator('.margin-note ngoặc').count()) === 0,
    );
    await page.locator('#marginFilter').selectOption('gtm',{force:true});
    check('margin notes filter by author', (await page.locator('.margin-note').count()) === 1);
    await page.locator('[data-delete]').click();
    check(
      'own note can be removed without removing samples',
      (await page.locator('.margin-note').count()) === 0 &&
        (await saved(page, 'margin-notes')).notes.length === 3,
    );

    await ready(page, 'gear');
    check(
      'unowned gear cannot be marked packed',
      await page.locator('[data-packed="cable"]').isDisabled(),
    );
    await page.locator('#owner-cable').selectOption('gtm',{force:true});
    await page.locator('[data-packed="cable"]').check();
    check(
      'gear records an owner and actual packing state',
      (await saved(page, 'gear')).assignments.cable.owner === 'gtm' &&
        (await saved(page, 'gear')).assignments.cable.packed,
    );
    await page.locator('#owner-cable').selectOption('trường',{force:true});
    check(
      'reassigning resets readiness',
      !(await page.locator('[data-packed="cable"]').isChecked()),
    );
    await page.locator('#owner-cable').selectOption('',{force:true});
    check(
      'unassigning returns to unclaimed and unpacked',
      (await page.locator('[data-packed="cable"]').isDisabled()) &&
        !(await saved(page, 'gear')).assignments.cable.packed,
    );

    await ready(page, 'zine');
    await page.locator('#zineTitle').fill('Một chuyến đi để nhớ');
    await page.locator('#nextSpread').click();
    check(
      'zine turns to the second designed spread',
      (await page.locator('.zine-turner>span').innerText()) === 'Trang 3–4 / 6',
    );
    await page.locator('#zineSpread').selectOption('2',{force:true});
    check('zine stops at its last spread', await page.locator('#nextSpread').isDisabled());
    await page.evaluate(() => {
      window.print = () => {
        window.__printInvoked = true;
      };
    });
    await page.locator('#printZine').click();
    check(
      'print button invokes the native print flow',
      await page.evaluate(() => window.__printInvoked),
    );
    await page.emulateMedia({ media: 'print' });
    check(
      'print layout includes all six pages and the custom title',
      (await page.locator('.zine-print-pages .zine-page:visible').count()) === 6 &&
        (await page.locator('.zine-print-pages').innerText()).includes('Một chuyến đi để nhớ'),
    );
    await page.pdf({
      path: path.join(output, 'zine.pdf'),
      printBackground: true,
      preferCSSPageSize: true,
    });
    await page.emulateMedia({ media: 'screen' });

    await ready(page, 'offline');
    await page.locator('#savePack').click();
    await page.locator('#toggleNetwork').click();
    await page.locator('#offlineText').fill('Nhớ sạc pin máy ảnh ở home.');
    await page.locator('#offlineForm button[type=submit]').click();
    check(
      'offline demo keeps the schedule and queues a note without simulated signal',
      (await saved(page, 'offline')).pack.days.reduce((sum, day) => sum + day.blocks.length, 0) ===
        24 &&
        (await page.locator('#syncNotes').isDisabled()) &&
        (await saved(page, 'offline')).notes[0].synced === false,
    );
    await page.reload();
    check(
      'offline pack and queued note survive reload',
      (await page.locator('.queue-item').innerText()).includes('Nhớ sạc pin') &&
        (await page.locator('.offline-schedule li').count()) === 10,
    );
    await page.locator('#toggleNetwork').click();
    await page.locator('#syncNotes').click();
    check(
      'reconnection processes only a clearly simulated queue',
      (await page.locator('.queue-item small').innerText()).includes('trong mô phỏng') &&
        (await saved(page, 'offline')).notes[0].synced,
    );
    const packHTML = await download(page, '#downloadPack', 'ta-xua-lich-trong-tui.html');
    check(
      'offline download contains all 24 events with no scripts or external assets',
      (packHTML.match(/<article>/g) || []).length === 24 &&
        !/<script|<img|<link/.test(packHTML) &&
        packHTML.includes('Giờ chưa chốt'),
    );
    await context.setOffline(true);
    const offline = await context.newPage();
    watch(offline, 'downloaded offline');
    await offline.goto(pathToFileURL(path.join(output, 'ta-xua-lich-trong-tui.html')).href);
    check(
      'downloaded itinerary opens while the browser is truly offline',
      (await offline.locator('article').count()) === 24 &&
        (await offline.locator('body').innerText()).includes('chưa có giờ đến Hà Nội'),
    );
    await offline.close();
    await context.setOffline(false);
    check(
      'demo actions preserve unrelated production storage',
      await page.evaluate(() => localStorage.getItem('taxua-production-sentinel') === 'preserve'),
    );

    // Reset every demo and check direct-file behavior without any server fetches.
    for (const id of ids) {
      await ready(page, id);
      await page.locator('#resetDemo').click();
      check(
        id + ' offers an announced reset',
        (await page.locator('#demoStatus').innerText()).includes('bắt đầu lại'),
      );
    }
    await context.close();
    const direct = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });
    const filePage = await direct.newPage();
    watch(filePage, 'file');
    for (const id of ['index'].concat(ids)) {
      await ready(filePage, id, true);
      check(
        'file:// ' + id + ' renders independently',
        id === 'index'
          ? (await filePage.locator('.idea').count()) === 13
          : (await filePage.locator('#demoRoot').innerText()).length > 150,
      );
    }
    await direct.close();

    const restricted = await browser.newContext();
    const restrictedPage = await restricted.newPage();
    watch(restrictedPage, 'storage disabled');
    await restrictedPage.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new DOMException('Denied', 'SecurityError');
      };
      Storage.prototype.setItem = () => {
        throw new DOMException('Denied', 'SecurityError');
      };
    });
    await ready(restrictedPage, 'passport');
    check(
      'storage denial explains the temporary mode',
      (await restrictedPage.locator('#demoStatus').innerText()).includes('chặn lưu'),
    );
    await restrictedPage.locator('#stampForm button[type=submit]').click();
    check(
      'storage denial still permits in-page interaction',
      (await restrictedPage.locator('.is-stamped').count()) === 3,
    );
    check(
      'storage warning remains visible after interacting',
      (await restrictedPage.locator('#storageWarning').isVisible()) &&
        (await restrictedPage.locator('#storageWarning').innerText()).includes(
          'có thể mất khi tải lại',
        ),
    );
    await restricted.close();

    check('no browser errors or missing resources', report.errors.length === 0);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(
      'Passed ' +
        report.checks.length +
        ' checks; ' +
        report.screenshots.length +
        ' screenshots, zine PDF and sample downloads in ' +
        output,
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  report.failure = error.stack;
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.error(error);
  process.exitCode = 1;
});
