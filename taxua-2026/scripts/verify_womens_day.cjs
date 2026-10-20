/* Real input, background ownership and stale-load cancellation; no backend writes. */
const fs = require('fs'),path = require('path'),assert = require('assert/strict');
const {pathToFileURL} = require('url');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const base = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-womens-day-review';
fs.mkdirSync(output,{recursive:true});
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
const fixture = {daily:{time:['2026-10-23','2026-10-24','2026-10-25'],weather_code:[0,63,73],temperature_2m_min:[12,13,10],temperature_2m_max:[23,24,20],precipitation_probability_max:[0,85,95],precipitation_sum:[0,10,4],snowfall_sum:[0,0,1],wind_speed_10m_max:[8,20,16],wind_gusts_10m_max:[12,30,24]}};
const bouquet = p => p.locator('.wd-invite--hero .wd-bouquet');
const flower = (p,id) => p.locator('.wd-flower[data-recipient="' + id + '"]');
const active = (p,id) => p.waitForFunction(id => JourneyWomensDay.active === id,id);
async function ready(p,url = base) {await p.goto(url);await p.waitForFunction(() => !!window.JourneyWomensDay);await p.evaluate(() => document.fonts.ready);}
async function shot(p,name) {await wait(750);await p.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');}
async function crew(p) {await p.evaluate(() => document.querySelector('#crew').scrollIntoView({behavior:'instant'}));await wait(850);}
async function layout(p,name) {
  check(name+' has no horizontal overflow',await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(name+' has three usable flower targets',await p.locator('.wd-flower').evaluateAll(items => items.length === 3 && items.every(el => {const r = el.getBoundingClientRect();return r.width >= 44 && r.height >= 44;})));
  check(name+' scene fills viewport',await p.locator('.wd-landscape').evaluate(el => {const r = el.getBoundingClientRect();return r.width >= innerWidth && r.height >= innerHeight;}));
  check(name+' has dark readable greeting ink',await p.locator('.wd-invite[data-active="true"] .wd-message').evaluate(el => getComputedStyle(el).color === 'rgb(23, 62, 70)'));
}
async function nativeArt(p,name) {
  check(name+' uses a full native painting without blur',await p.locator('.wd-landscape').evaluate(img => {
    const portrait = innerWidth <= innerHeight,style = getComputedStyle(img);
    return img.src.includes('_native_') && img.naturalWidth >= (portrait ? 1000 : 1600) && img.naturalHeight >= (portrait ? 1500 : 900) && style.filter === 'none' && style.transform === 'none';
  }));
}
(async () => {
  const browser = await chromium.launch();
  async function page(options = {}) {
    const p = await browser.newPage({viewport:{width:1440,height:1000},...options});
    p.on('pageerror',error => report.errors.push(error.stack));
    await p.route('https://api.open-meteo.com/**',route => route.fulfill({contentType:'application/json',body:JSON.stringify(fixture)}));
    return p;
  }
  try {
    const p = await page(),requests = [];p.on('request',r => requests.push(r.url()));await ready(p);await wait(700);
    check('initial page does not request a floral landscape',!requests.some(url => /womens_day\/landscape_/.test(url)));
    check('no cloud reset buttons remain',await p.locator('.wd-reset').count() === 0);
    check('exactly the confirmed recipients have flowers',(await p.locator('.wd-flower').evaluateAll(items => items.map(el => el.dataset.recipient).sort())).join(',') === 'linh,mi,thao');
    check('seven portraits and seven diary links retained',await p.locator('#crewGrid .avatar img').count() === 7 && await p.locator('#crewGrid .diary-crew-link').count() === 7);
    check('flower and diary link remain separate controls',await p.locator('.wd-flower .diary-crew-link,.diary-crew-link .wd-flower').count() === 0);
    await bouquet(p).hover();await active(p,'hero');
    check('hover previews without holding',await bouquet(p).getAttribute('aria-pressed') === 'false');
    await p.mouse.move(5,400);await active(p,'');check('leaving unheld bouquet restores original scene',await p.locator('#womensDayStage').isHidden());
    await bouquet(p).focus();await active(p,'hero');await p.keyboard.press('Space');
    check('keyboard Space holds bouquet',await bouquet(p).getAttribute('aria-pressed') === 'true');
    await shot(p,'desktop-hero');await layout(p,'desktop');
    check('wide screen loads wide artwork',await p.locator('.wd-landscape').getAttribute('src') === './figures/decor/painted/womens_day/landscape_wide.webp');
    check('real Vietnamese greeting is in HTML',await p.locator('.wd-invite--hero h2').textContent() === 'Chúc mừng ngày Phụ nữ Việt Nam');
    check('original painted hotspots are suppressed',await p.locator('.play-hotspot').evaluateAll(items => items.every(el => el.hidden || getComputedStyle(el).visibility === 'hidden' || el.disabled)));
    await p.mouse.move(5,400);await wait(220);
    check('leaving a held bouquet does not rebuild its scene',await p.evaluate(() => JourneyWomensDay.active === 'hero') && await bouquet(p).getAttribute('aria-busy') === 'false');
    await p.locator('.weather-day').first().hover();await wait(200);check('weather hover leaves floral scene held',await p.evaluate(() => JourneyWomensDay.active === 'hero'));
    await p.locator('.weather-day').first().click();await active(p,'');check('deliberate weather choice takes ownership',await p.locator('.weather-day').first().getAttribute('aria-pressed') === 'true');
    await bouquet(p).click();await active(p,'hero');check('bouquet clears held weather',await p.locator('.weather-day[aria-pressed="true"]').count() === 0);
    if (await p.locator('.location-sticker').count()) {
      await p.locator('.location-sticker[data-location="tree"]').click();await active(p,'');await p.waitForFunction(() => JourneyLocations.active === 'tree');
      check('location choice replaces floral background',await p.locator('#womensDayStage').isHidden());
      await bouquet(p).click();await active(p,'hero');check('bouquet clears held location',await p.evaluate(() => !JourneyLocations.active));
    }
    await bouquet(p).click();await active(p,'');await wait(300);
    check('second bouquet click restores clouds without reopening',await bouquet(p).getAttribute('aria-pressed') === 'false' && await p.locator('#womensDayStage').isHidden());
    await bouquet(p).click();await active(p,'hero');await p.locator('.hero-date').click();await wait(300);
    check('outside click restores clouds and hides greeting',await p.evaluate(() => !JourneyWomensDay.active) && await p.locator('#womensDayStage').isHidden() && await p.locator('.wd-invite--hero .wd-message').isHidden());
    check('general bouquet does not preload personal landscapes',!requests.some(url => /landscape_(mi|thao|linh)_/.test(url)));
    await crew(p);
    const before = await flower(p,'mi').boundingBox();await flower(p,'mi').hover();await active(p,'mi');await wait(350);
    const after = await flower(p,'mi').boundingBox();check('greeting does not move hovered portrait',Math.abs(before.y - after.y) < 1 && Math.abs(before.x - after.x) < 1);
    await flower(p,'mi').click();await active(p,'mi');await shot(p,'desktop-crew');await layout(p,'crew');
    check('mi gets her own pink landscape',(await p.locator('.wd-landscape').getAttribute('src')).endsWith('landscape_mi_native_wide.webp'));
    await nativeArt(p,'mi desktop');
    check('mi does not preload other recipients or portrait art',!requests.some(url => /landscape_(thao|linh)_|landscape_mi_native_portrait/.test(url)));
    check('active crew bouquet retains an accessible name',await p.locator('.wd-invite--crew .wd-bouquet').getAttribute('aria-label') === 'Một chút hoa, gửi các nàng, 20/10');
    for (const id of ['thao','linh']) {
      await p.keyboard.press('Tab');await flower(p,id).focus();await active(p,id);await p.keyboard.press('Enter');
      check(id+' has its own personal greeting',await p.locator('.wd-invite--crew .wd-message p').textContent() === 'Chúc ' + (id === 'thao' ? 'thảo' : 'linh') + ' một ngày 20/10 thật vui!');
      check(id+' loads its own decoded painting',await p.locator('.wd-landscape').evaluate((img,id) => img.src.endsWith('landscape_' + id + '_native_wide.webp') && img.naturalWidth > 0,id));
      await nativeArt(p,id+' desktop');
      await shot(p,'desktop-crew-'+id);
    }
    await p.keyboard.press('Escape');await p.mouse.click(2,300);
    for (const id of ['mi','thao','linh']) {
      await p.locator('.wd-member[data-member-id="' + id + '"] .avatar').hover();await active(p,id);
      check(id+' portrait hover selects the matching painting',(await p.locator('.wd-landscape').getAttribute('src')).endsWith('landscape_' + id + '_native_wide.webp'));
    }
    await p.evaluate(() => document.getElementById('fund').scrollIntoView({behavior:'instant'}));await active(p,'');
    check('scrolling past crew clears floral scenery',await p.locator('#womensDayStage').isHidden());
    await ready(p);await bouquet(p).click();await active(p,'hero');await p.locator('#weatherMotion').click();
    await bouquet(p).click();await active(p,'hero');
    check('pause cancels petals and scene fades',await p.locator('.wd-petal').count() === 0 && await p.locator('#womensDayStage').evaluate(el => el.getAnimations().every(a => a.playState !== 'running')));
    await p.keyboard.press('Escape');await active(p,'');await bouquet(p).click();await active(p,'hero');
    check('paused activation still shows greeting without particles',await p.locator('.wd-petal').count() === 0);
    await p.emulateMedia({media:'print'});check('print hides invitations and flowers',await bouquet(p).isHidden() && await flower(p,'mi').isHidden());await p.emulateMedia({media:'screen'});
    await p.close();

    for (const width of [390,320,820,740]) {
      const phone = await page({viewport:{width,height:width === 740 ? 390 : width === 820 ? 1180 : 844},hasTouch:true,isMobile:width < 768,reducedMotion:'reduce'});
      await ready(phone);await bouquet(phone).tap();await active(phone,'hero');await layout(phone,width+'px');
      const orientation = width === 740 ? 'wide' : 'portrait';
      check(width+'px chooses art by screen shape',(await phone.locator('.wd-landscape').getAttribute('src')).includes('landscape_' + orientation));
      check(width+'px reduced motion has no particles or fade',await phone.locator('.wd-petal').count() === 0 && await phone.locator('#womensDayStage').evaluate(el => el.getAnimations().length === 0));
      await shot(phone,'hero-'+width);await bouquet(phone).tap();await active(phone,'');
      await crew(phone);await flower(phone,'mi').tap();await active(phone,'mi');await layout(phone,'crew '+width+'px');await shot(phone,'crew-'+width);
      check(width+'px mi uses her own '+orientation+' painting',(await phone.locator('.wd-landscape').getAttribute('src')).endsWith('landscape_mi_native_' + orientation + '.webp'));
      await nativeArt(phone,'mi '+width+'px');
      for (const id of ['thao','linh']) {
        await flower(phone,id).tap();await active(phone,id);
        check(width+'px '+id+' uses its own '+orientation+' painting',(await phone.locator('.wd-landscape').getAttribute('src')).endsWith('landscape_' + id + '_native_' + orientation + '.webp'));
        await nativeArt(phone,id+' '+width+'px');
        if (width === 390) await shot(phone,'crew-'+id+'-'+width);
      }
      await phone.touchscreen.tap(2,300);await active(phone,'');check(width+'px outside tap clears floral scenery',await phone.locator('#womensDayStage').isHidden());
      await flower(phone,'mi').tap();await active(phone,'mi');
      await phone.setViewportSize({width:width === 740 ? 390 : 740,height:width === 740 ? 844 : 390});
      await phone.waitForFunction(() => !JourneyWomensDay.active || womensDayStage.dataset.orientation === (innerWidth <= innerHeight ? 'portrait' : 'wide'));
      check(width+'px rotation leaves no stale artwork',await phone.evaluate(() => !JourneyWomensDay.active || womensDayStage.dataset.orientation === (innerWidth <= innerHeight ? 'portrait' : 'wide')));
      await phone.close();
    }
    const race = await page();
    await race.route('**/womens_day/landscape_wide.webp',async route => {await wait(600);await route.continue();});
    await ready(race);await bouquet(race).hover();await wait(220);await race.mouse.move(2,400);await wait(1000);
    check('cancelled hover decode cannot resurrect background',await race.locator('#womensDayStage').isHidden() && await race.evaluate(() => !JourneyWomensDay.active));
    await race.reload();await race.waitForFunction(() => !!window.JourneyWomensDay);await bouquet(race).click();await wait(180);await race.keyboard.press('Escape');await wait(1000);
    check('Escape cancels pending held image request',await race.locator('#womensDayStage').isHidden() && await bouquet(race).getAttribute('aria-pressed') === 'false');
    await race.reload();await race.waitForFunction(() => !!window.JourneyWomensDay);await bouquet(race).click();await wait(180);await race.locator('.hero-date').click();await wait(1000);
    check('outside click cancels pending floral decode',await race.locator('#womensDayStage').isHidden() && await race.evaluate(() => !JourneyWomensDay.active) && await bouquet(race).getAttribute('aria-pressed') === 'false');
    if (await race.locator('.location-sticker').count()) {
      await race.reload();await race.waitForFunction(() => !!window.JourneyWomensDay);await bouquet(race).click();await wait(150);await race.locator('.location-sticker[data-location="ridge"]').click();await race.waitForFunction(() => JourneyLocations.active === 'ridge');await wait(800);
      check('later location wins against pending floral decode',await race.locator('#womensDayStage').isHidden() && await race.evaluate(() => !JourneyWomensDay.active && JourneyLocations.active === 'ridge'));
    }
    await race.route('**/womens_day/landscape_mi_*.webp',async route => {await wait(700);await route.continue();});
    await ready(race);await crew(race);await flower(race,'mi').click();await wait(180);await flower(race,'thao').click();await active(race,'thao');await wait(1000);
    check('later recipient wins against a slow earlier painting',await race.locator('.wd-landscape').evaluate(img => img.src.endsWith('landscape_thao_native_wide.webp')));
    await flower(race,'linh').hover();await active(race,'linh');await race.mouse.move(2,300);await active(race,'thao');
    check('leaving another flower preview restores held recipient painting',await race.locator('.wd-landscape').evaluate(img => img.src.endsWith('landscape_thao_native_wide.webp')));
    await race.close();
    const failure = await page();await failure.route('**/womens_day/landscape_*.webp',r => r.abort());await ready(failure);await bouquet(failure).click();
    await failure.waitForFunction(() => document.querySelector('.wd-invite--hero .wd-status').textContent.includes('Chưa mở'));
    check('failed art keeps greeting readable and base scenery usable',await failure.locator('#womensDayStage').isHidden() && await failure.locator('.wd-invite--hero .wd-message').isVisible());
    await failure.unroute('**/womens_day/landscape_*.webp');await bouquet(failure).click();await active(failure,'hero');check('failed art can be retried',await failure.locator('.wd-landscape').isVisible());await failure.close();
    const missing = await page();await missing.route('**/womens_day/flower_*.webp',r => r.abort());await ready(missing);await crew(missing);
    await missing.waitForFunction(() => [...document.querySelectorAll('.wd-flower-fallback')].every(el => !el.hidden));
    check('failed flower art leaves three visible named controls',await missing.locator('.wd-flower-fallback:visible').count() === 3 && await flower(missing,'mi').getAttribute('aria-label') === 'Hoa hôm nay dành cho mi.');
    await flower(missing,'mi').click();await active(missing,'mi');check('fallback flower can still open greeting',await missing.locator('.wd-invite--crew .wd-message').isVisible());await missing.close();
    const local = await page({reducedMotion:'reduce'});await ready(local,pathToFileURL(path.resolve(__dirname,'../index.html')).href);await bouquet(local).click();await active(local,'hero');check('direct-file trip retains celebration',await local.locator('.wd-landscape').isVisible());await local.close();
    const noGsap = await page();await noGsap.route('**/vendor/*gsap*',r => r.abort());await noGsap.route('**/vendor/ScrollTrigger*',r => r.abort());await ready(noGsap);await bouquet(noGsap).click();await active(noGsap,'hero');check('missing GSAP keeps native celebration working',await noGsap.locator('.wd-landscape').isVisible());await noGsap.close();
    check('no uncaught browser errors',report.errors.length === 0);
    console.log('Passed',report.checks.length,'Women’s Day checks.');
  } finally {fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(error => {console.error(error);process.exitCode = 1;});
