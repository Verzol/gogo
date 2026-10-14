/* Focused arrival-clock verification. Reuses :8000 and sibling Playwright. */
const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'review','countdown');
const preview = 'http://127.0.0.1:8000/taxua-2026/';
const target = Date.parse('2026-10-23T03:00:00+07:00');
const start = new Date('2026-10-14T08:00:00Z');
const report = {checkedAt:new Date().toISOString(),fixtureTime:start.toISOString(),target:'2026-10-23T03:00:00+07:00',checks:[],errors:[],screenshots:[]};
fs.mkdirSync(output,{recursive:true});
function check(name,value) { assert(value,name); report.checks.push(name); }
async function digits(page) { return page.locator('.countdown-number').allTextContents(); }
async function frozenPage(context,time = start,url = preview) {
  const page = await context.newPage();
  page.on('pageerror',error => report.errors.push(error.message));
  await page.clock.install({time});
  await page.clock.pauseAt(time);
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  return page;
}
(async () => {
  const browser = await chromium.launch();
  try {
    for (const [name,width,height] of [['desktop',1440,900],['phone',390,844],['narrow',320,780],['tablet',1024,768],['landscape',844,390],['wide',2560,1080]]) {
      const context = await browser.newContext({viewport:{width,height}});
      const page = await frozenPage(context);
      await page.clock.runFor(500);
      check(name+' counts to arrival accurately',JSON.stringify(await digits(page)) === JSON.stringify(['08','12','00','00']));
      check(name+' labels the Vietnam appointment explicitly',await page.locator('.countdown-arrival time').getAttribute('datetime') === report.target && /03:00, 23\/10\/2026/.test(await page.locator('.countdown-arrival').textContent()));
      check(name+' preserves a transparent unblurred composition',await page.locator('.arrival-countdown,.countdown-units,.countdown-unit').evaluateAll(items => items.every(el => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(el).backdropFilter === 'none')));
      check(name+' fits all four units without horizontal overflow',await page.evaluate(() => {
        const rects = [...document.querySelectorAll('.countdown-unit')].map(el => el.getBoundingClientRect());
        return document.documentElement.scrollWidth === innerWidth && rects.every((r,i) => r.left >= 0 && r.right <= innerWidth && (!i || r.left >= rects[i-1].right));
      }));
      check(name+' does not overlap the heading or CTA',await page.evaluate(() => {
        const countdown = document.getElementById('arrivalCountdown').getBoundingClientRect();
        return ['#heroTitle','.hero-actions','.hero-stamp'].every(selector => {
          const el = document.querySelector(selector); if (getComputedStyle(el).display === 'none') return true;
          const r = el.getBoundingClientRect();
          return countdown.left >= r.right || countdown.right <= r.left || countdown.top >= r.bottom || countdown.bottom <= r.top;
        });
      }));
      check(name+' provides a readable timer without per-second announcements',await page.locator('[role="timer"]').getAttribute('aria-live') === 'off' && /8 ngày, 12 giờ/.test(await page.locator('#countdownSummary').textContent()));
      check(name+' preserves the complete journey and fund',await page.locator('.event').count() === 24 && await page.locator('.fund-link').getAttribute('href') === 'https://quy.momo.vn/v2/YTavDjFUV4?cover=6749');
      await page.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');
      if (name === 'phone') {
        const before = await page.locator('#arrivalCountdown').boundingBox();
        await page.clock.runFor(1008);
        check('one second advances the clock without drift',JSON.stringify(await digits(page)) === JSON.stringify(['08','11','59','59']));
        const after = await page.locator('#arrivalCountdown').boundingBox();
        check('ticking does not move or resize the countdown',JSON.stringify(before) === JSON.stringify(after));
        await page.evaluate(() => document.documentElement.style.fontSize = '20px');
        check('enlarged phone text remains within the viewport',await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
      }
      await context.close();
    }
    for (const timezoneId of ['America/New_York','Asia/Tokyo']) {
      const context = await browser.newContext({timezoneId});
      const page = await frozenPage(context);
      check(timezoneId+' preserves the same arrival instant',JSON.stringify(await digits(page)) === JSON.stringify(['08','12','00','00']) && /03:00, 23\/10\/2026/.test(await page.locator('.countdown-arrival').textContent()));
      await context.close();
    }
    for (const [name,time,expected] of [
      ['departure',new Date('2026-10-22T22:00:00+07:00'),['00','05','00','00']],
      ['minute boundary',new Date(target - 61000),['00','00','01','01']],
      ['arrival boundary',new Date(target - 1000),['00','00','00','01']],
      ['after arrival',new Date(target + 86400000),['00','00','00','00']]
    ]) {
      const context = await browser.newContext();
      const page = await frozenPage(context,time);
      check(name+' shows the correct remaining duration',JSON.stringify(await digits(page)) === JSON.stringify(expected));
      if (name === 'minute boundary') {
        await page.clock.runFor(2008);
        check('minute rollover preserves seconds correctly',JSON.stringify(await digits(page)) === JSON.stringify(['00','00','00','59']));
      }
      if (name === 'arrival boundary' || name === 'after arrival') {
        await page.clock.runFor(1008);
        check(name+' ends at zero with scheduled-arrival copy',JSON.stringify(await digits(page)) === JSON.stringify(['00','00','00','00']) && /Đã đến giờ hẹn trên núi!/.test(await page.locator('.countdown-title').textContent()));
        await page.clock.runFor(2000);
        check(name+' never becomes negative',JSON.stringify(await digits(page)) === JSON.stringify(['00','00','00','00']));
      }
      await context.close();
    }
    const context = await browser.newContext({reducedMotion:'reduce'});
    const page = await frozenPage(context);
    await page.clock.runFor(1008);
    check('reduced motion keeps accurate ticks without number animations',await page.locator('.countdown-number').evaluateAll(items => items.every(el => el.getAnimations().length === 0)) && JSON.stringify(await digits(page)) === JSON.stringify(['08','11','59','59']));
    await page.clock.setSystemTime(new Date('2026-10-22T23:30:00+07:00'));
    await page.evaluate(() => dispatchEvent(new Event('pageshow')));
    check('returning to the page recomputes elapsed time',JSON.stringify(await digits(page)) === JSON.stringify(['00','03','30','00']));
    await page.emulateMedia({media:'print'});
    check('print keeps the countdown in normal flow with readable ink',await page.locator('#arrivalCountdown').evaluate(el => getComputedStyle(el).position === 'static' && getComputedStyle(el).color === 'rgb(24, 59, 70)'));
    await context.close();

    const edited = await browser.newContext();
    await edited.route('**/data.js',route => route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'data.js'),'utf8').replace('"time": "03:00"','"time": "04:00"')}));
    const retargeted = await frozenPage(edited);
    check('arrival schedule edits automatically retarget the countdown',JSON.stringify(await digits(retargeted)) === JSON.stringify(['08','13','00','00']) && /04:00/.test(await retargeted.locator('.countdown-arrival').textContent()));
    await edited.close();

    const fallback = await browser.newContext();
    await fallback.route('**/vendor/gsap*.js',route => route.abort());
    const basic = await frozenPage(fallback);
    check('countdown works independently of GSAP',await basic.locator('#arrivalCountdown').isVisible() && JSON.stringify(await digits(basic)) === JSON.stringify(['08','12','00','00']));
    await fallback.close();
    const direct = await browser.newContext();
    const filePage = await frozenPage(direct,start,pathToFileURL(path.join(root,'index.html')).href);
    check('direct file use supports the same countdown',JSON.stringify(await digits(filePage)) === JSON.stringify(['08','12','00','00']));
    await direct.close();
    const noScript = await browser.newContext({javaScriptEnabled:false});
    const staticPage = await noScript.newPage();await staticPage.goto(preview);
    check('no JavaScript never displays a frozen or misleading clock',!await staticPage.locator('#arrivalCountdown').isVisible() && await staticPage.locator('noscript a[href="./itinerary.html"]').isVisible());
    await noScript.close();

    const interactive = await browser.newContext({viewport:{width:390,height:844}});
    const realPage = await interactive.newPage();realPage.on('pageerror',error => report.errors.push(error.message));
    await realPage.goto(preview);await realPage.evaluate(() => document.fonts.ready);await realPage.waitForTimeout(500);
    await realPage.locator('#navToggle').click();
    check('phone menu still opens',await realPage.locator('#navToggle').getAttribute('aria-expanded') === 'true');
    await realPage.keyboard.press('Escape');
    check('phone menu still closes with Escape',await realPage.locator('#navToggle').getAttribute('aria-expanded') === 'false');
    await realPage.waitForTimeout(450);
    await realPage.locator('.hero-actions a').click();
    await realPage.waitForFunction(() => scrollY > 300);
    check('itinerary navigation still reaches the story',await realPage.evaluate(() => location.hash === '#itinerary' && scrollY > 300));
    await interactive.close();
    check('all countdown scenarios completed without JavaScript errors',report.errors.length === 0);
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
    console.log(report.checks.length+' countdown checks passed; screenshots in review/countdown/.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error);process.exitCode = 1; });
