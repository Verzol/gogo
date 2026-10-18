/* Reversible photographs, expanded guides and removal of reading bookmarks.
   Optional maintenance helper, using the existing sibling Playwright. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-photo-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
fs.mkdirSync(output,{recursive:true});
const report = {timestamp:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
const check = (name,ok) => { assert.ok(ok,name); report.checks.push(name); };
const settle = p => p.waitForTimeout(750);
async function frame(p,selector) {
  await p.evaluate(selector => scrollTo(0,document.querySelector(selector).getBoundingClientRect().top + scrollY - 155),selector);
  await settle(p);
}
async function screenshot(p,name) {
  await p.screenshot({path:path.join(output,name+'.png')});
  report.screenshots.push(name+'.png');
}
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({hasTouch:true});
    await context.route('https://api.open-meteo.com/**',route => route.fulfill({json:{daily:{time:['2026-10-23','2026-10-24','2026-10-25'],weather_code:[0,3,61],temperature_2m_min:[12,13,11],temperature_2m_max:[18,20,17]}}}));
    const page = async (options={}) => {
      const p = await context.newPage();
      p.on('pageerror',error => report.errors.push(error.message));
      if (options.viewport) await p.setViewportSize(options.viewport);
      if (options.reduce) await p.emulateMedia({reducedMotion:'reduce'});
      if (options.noGsap) await p.route('**/vendor/*.min.js',route => route.fulfill({body:'/* dependency intentionally unavailable */',contentType:'application/javascript'}));
      await p.goto(options.file ? 'file://' + path.resolve(__dirname,'../index.html') : url);
      await p.evaluate(() => document.fonts.ready);
      await settle(p);
      return p;
    };
    for (const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['narrow',320,720]]) {
      const p = await page({viewport:{width,height}});
      check(name+' preserves all researched paragraphs and sources in expanded content',await p.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.place-description'));
        const expected = Object.values(TRIP_DATA.placeGuides).flatMap(guide => guide.paragraphs);
        return items.length === expected.length && expected.every(text => items.filter(el => el.textContent === text).length === 1) && items.every(el => !el.closest('details')) && document.querySelectorAll('.place-source').length === 18;
      }));
      check(name+' removes fold, bookmark and visible photo-prompt UI',await p.locator('.place-guide,.guide-paper,.bookmark-toggle,#readingBookmark,#bookmarkStatus,.photo-tools,.photo-turn,.deck-controls,[data-photo-step]').count() === 0 && !/Lật ảnh|có lời nhắn phía sau|Kẹp trang này/.test(await p.locator('body').innerText()));
      check(name+' photo positions are announced without visible counters',await p.locator('.deck-count').evaluateAll(items => items.length === 3 && items.every(el => el.classList.contains('sr-only') && el.getAttribute('aria-live') === 'polite' && el.offsetWidth === 1)));
      const figure = p.locator('#ameii figure');
      const turn = figure.locator('[data-photo-turn]');
      await frame(p,'#ameii .postcard');
      await screenshot(p,name+'-front');
      const before = await figure.boundingBox();
      await figure.locator('img').click();
      await settle(p);
      check(name+' clicking the photograph turns it without changing layout height',await turn.getAttribute('aria-pressed') === 'true' && Math.abs((await figure.boundingBox()).height - before.height) < 1);
      check(name+' reverse exposes real credit and scheduled date',await figure.locator('.photo-back').getAttribute('aria-hidden') === 'false' && await figure.locator('.photo-back').evaluate(el => !el.inert) && /Trong lịch trình/.test(await figure.locator('.photo-date').textContent()) && /Cáo Lang Thang/.test(await figure.locator('.photo-credit').textContent()));
      check(name+' reverse content is announced through the focused photo button',await turn.evaluate(el => el.getAttribute('aria-label').includes(el.querySelector('.photo-back').textContent.trim().replace(/\s+/g,' '))));
      await screenshot(p,name+'-back');
      await figure.locator('.photo-back-heading').click();
      check(name+' clicking reverse text restores the photograph',await turn.getAttribute('aria-pressed') === 'false');
      await turn.focus();
      await p.keyboard.press('Space');
      check(name+' Space opens the reverse with keyboard focus retained',await turn.getAttribute('aria-pressed') === 'true' && await turn.evaluate(el => el === document.activeElement));
      await p.keyboard.press('Enter');
      check(name+' Enter restores the front and hides reverse content',await turn.getAttribute('aria-pressed') === 'false' && await figure.locator('.photo-back').evaluate(el => el.inert) && await turn.getAttribute('aria-describedby') === null);
      if (width < 768) {
        await turn.tap();
        check(name+' touch tap opens the reverse',await turn.getAttribute('aria-pressed') === 'true');
        await turn.tap();
      }
      for (let i=0;i<6;i++) await turn.click();
      check(name+' repeated quick turns settle on the front',await turn.getAttribute('aria-pressed') === 'false');
      await frame(p,'#village-cafe .postcard');
      await p.locator('#village-cafe [data-photo-turn]').click();
      check(name+' illustrative caption remains outside the clickable photo',await p.locator('#village-cafe figcaption').isVisible() && await p.locator('#village-cafe figcaption').textContent() === 'Ảnh minh họa.' && await p.locator('#village-cafe [data-photo-turn] figcaption').count() === 0);
      await p.locator('#village-cafe figcaption').click();
      check(name+' clicking the caption leaves the reverse open',await p.locator('#village-cafe [data-photo-turn]').getAttribute('aria-pressed') === 'true');
      await frame(p,'#a-phu .postcard');
      await p.locator('#a-phu .deck-slide:not([hidden]) [data-photo-turn]').click();
      await p.locator('#a-phu .deck-preview:not([hidden])').click();
      await settle(p);
      check(name+' deck navigation resets incoming photos and removes transition clones',await p.locator('#a-phu .deck-slide:not([hidden]) [data-photo-turn]').getAttribute('aria-pressed') === 'false' && await p.locator('#a-phu .deck-ghost').count() === 0);
      check(name+' no overflow or duplicate IDs after interaction',await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && new Set(Array.from(document.querySelectorAll('[id]'),el => el.id)).size === document.querySelectorAll('[id]').length));
      await p.close();
    }
    const p = await page({viewport:{width:320,height:720},reduce:true});
    await p.evaluate(() => document.documentElement.style.fontSize = '32px');
    await frame(p,'#ameii .postcard');
    const turn = p.locator('#ameii [data-photo-turn]');
    await turn.click();
    await turn.focus();
    await p.keyboard.press('PageDown');
    check('enlarged reverse can scroll using keyboard without turning',await turn.getAttribute('aria-pressed') === 'true' && await p.locator('#ameii .photo-back').evaluate(el => el.scrollTop > 0));
    check('enlarged text stays within the 320px viewport',await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await screenshot(p,'enlarged-back');
    await p.pdf({path:path.join(output,'journal-print.pdf'),format:'A4',printBackground:false});
    await p.emulateMedia({media:'print'});
    check('print shows photograph fronts with all guide text expanded',await p.locator('.photo-back').evaluateAll(items => items.every(el => getComputedStyle(el).display === 'none')) && await p.locator('.photo-front').evaluateAll(items => items.every(el => getComputedStyle(el).transform === 'none')) && await p.locator('.place-description').evaluateAll(items => items.every(el => getComputedStyle(el).opacity === '1')));
    await p.close();
    for (const [name,options] of [['reduced',{reduce:true}],['no-gsap',{noGsap:true}],['direct-file',{file:true,reduce:true}]]) {
      const q = await page(options);
      const turn = q.locator('#ameii [data-photo-turn]');
      await frame(q,'#ameii .postcard');
      await turn.click();
      check(name+' supports clicking photos without optional dependencies',await turn.getAttribute('aria-pressed') === 'true');
      if (options.reduce) check(name+' photo turn is instant',await q.locator('#ameii .photo-back').evaluate(el => getComputedStyle(el).transitionDuration === '0s'));
      await q.close();
    }
    check('all scenarios complete without uncaught JavaScript errors',report.errors.length === 0);
    console.log('Passed ' + report.checks.length + ' photo interaction checks. Evidence: ' + output);
  } finally {
    fs.writeFileSync(path.join(output,'journal-checks.json'),JSON.stringify(report,null,2)+'\n');
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
