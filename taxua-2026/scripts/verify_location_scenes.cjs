/* Actual input, async races, ownership and local-resource fallbacks. No backend writes. */
const fs = require('fs'),path = require('path'),assert = require('assert/strict');
const {pathToFileURL} = require('url');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..'),output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-location-review';
const base = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const ids = ['ridge','tree','dolphin','meadow','waterfall','coffee'];
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[],fonts:[]};
fs.mkdirSync(output,{recursive:true});
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
const fixture = {daily:{time:['2026-10-23','2026-10-24','2026-10-25'],weather_code:[0,63,73],temperature_2m_min:[12,13,10],temperature_2m_max:[23,24,20],apparent_temperature_min:[10,11,8],precipitation_probability_max:[0,85,95],precipitation_sum:[0,10,4],snowfall_sum:[0,0,1],wind_speed_10m_max:[8,20,16],wind_gusts_10m_max:[12,30,24]}};
let browser;
async function setup(options = {}) {
  const p = await browser.newPage({viewport:{width:1440,height:1000},...options});
  p.on('pageerror',error => report.errors.push(error.stack));
  const requests = [];p.on('request',r => requests.push(r.url()));
  await p.route('https://api.open-meteo.com/**',r => r.fulfill({contentType:'application/json',body:JSON.stringify(fixture)}));
  return {p,requests};
}
async function ready(p,file = false) {
  await p.goto(file ? pathToFileURL(path.join(root,'index.html')).href : base);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => !!window.JourneyLocations);
}
const button = (p,id) => p.locator(`.location-sticker[data-location="${id}"]`);
async function active(p,id) {await p.waitForFunction(id => JourneyLocations.active === id,id);await wait(800);}
async function choose(p,id,touch = false) {await button(p,id)[touch ? 'tap' : 'click']();await active(p,id);}
async function shot(p,name) {await p.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');}
async function clear(p) {await p.keyboard.press('Escape');await p.waitForFunction(() => !JourneyLocations.active);}
async function geometry(p,name) {
  check(name+' has no horizontal overflow',await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(name+' keeps six usable targets',await p.locator('.location-sticker').evaluateAll(items => items.length === 6 && items.every(el => {const b = el.getBoundingClientRect();return b.width >= 44 && b.height >= 44;})));
}
(async () => {
  browser = await chromium.launch();
  try {
    const {p,requests} = await setup();await ready(p);await wait(700);
    check('initial clouds retained, no heavy location request',!requests.some(u => /scenery\/locations\//.test(u)) && await p.locator('#locationStage').isHidden());
    check('all six sticker images decode',await p.locator('.location-sticker img').evaluateAll(items => items.every(img => img.complete && img.naturalWidth > 0)));
    for (const id of ids) {
      await button(p,id).hover();await active(p,id);
      check(id+' hover previews without holding',await button(p,id).getAttribute('aria-pressed') === 'false');
      check(id+' uses actual decoded landscape and transparent foreground',await p.locator('#locationStage .location-slot').last().locator('img').evaluateAll(items => items.every(img => img.complete && img.naturalWidth > 0)));
      check(id+' story target exists',await p.locator('.location-story').evaluate(a => !!document.querySelector(a.getAttribute('href'))));
      const ambient = p.locator('#locationStage .location-slot').last().locator(id === 'dolphin' ? '.location-mist' : '.location-foreground');
      const time = await ambient.evaluate(el => el.getAnimations()[0]?.currentTime);
      if (typeof time === 'number') await p.waitForFunction(({id,time}) => {const el = document.querySelector('#locationStage .location-slot[data-location="' + id + '"] ' + (id === 'dolphin' ? '.location-mist' : '.location-foreground'));return el?.getAnimations()[0]?.currentTime > time;},{id,time},{timeout:2000});
      check(id+' separate painted ambient layer actually advances',typeof time === 'number' && await ambient.evaluate(el => el.getAnimations()[0]?.currentTime) > time);
      if (id === 'waterfall') {
        const flow = p.locator('.location-flow'),pose = await flow.evaluate(el => getComputedStyle(el).translate);await wait(120);
        check('waterfall flow moves independently over rigid painting',await flow.evaluate(el => getComputedStyle(el).translate) !== pose && await p.locator('.location-painting:not(.location-flow)').last().evaluate(el => getComputedStyle(el).translate === 'none'));
      }
      await shot(p,'desktop-'+id);
      await button(p,id).click();check(id+' click holds',await button(p,id).getAttribute('aria-pressed') === 'true');
      await p.mouse.move(20,400);await wait(200);check(id+' remains held outside chooser',await p.evaluate(() => !!JourneyLocations.active));
      await clear(p);
    }
    await p.locator('.location-heading > p').click();
    const calls = requests.filter(u => u.includes('api.open-meteo.com')).length;
    await button(p,'tree').hover();await active(p,'tree');
    await p.locator('.location-story').hover();await wait(250);check('hover content stays while moving to its story link',await p.evaluate(() => JourneyLocations.active === 'tree'));
    await p.mouse.move(20,400);await p.waitForFunction(() => !JourneyLocations.active,{},{timeout:2000});check('unheld hover dismisses on leaving whole region',await p.evaluate(() => !JourneyLocations.active));
    await p.evaluate(() => {locationExplorer.tabIndex = -1;locationExplorer.focus();});await p.keyboard.press('Tab');await active(p,'ridge');
    await p.keyboard.press('Space');check('keyboard Space holds selection',await button(p,'ridge').getAttribute('aria-pressed') === 'true');
    await p.keyboard.press('Tab');await active(p,'tree');check('Tab previews next native button',await button(p,'tree').evaluate(el => el === document.activeElement));
    await clear(p);
    await choose(p,'ridge');await p.mouse.move(400,300);await wait(100);
    check('fine pointer produces parallax',await p.locator('#locationStage').evaluate(el => parseFloat(el.style.getPropertyValue('--look-x')) !== 0));
    await p.locator('#weatherMotion').click();
    check('pause stops scene motion and neutralizes pointer depth',await p.locator('#locationStage').evaluate(el => el.dataset.moving === 'false' && parseFloat(el.style.getPropertyValue('--look-x')) === 0));
    await choose(p,'meadow');check('selection while paused has no animated dissolve',await p.locator('#locationStage').evaluate(el => !el.getAnimations().length && !el.querySelector('.location-slot').getAnimations().length));
    await p.locator('#weatherMotion').click();
    await p.evaluate(() => {Object.defineProperty(document,'hidden',{configurable:true,get:() => true});document.dispatchEvent(new Event('visibilitychange'));});
    const hiddenPose = await p.locator('.location-mist').last().evaluate(el => getComputedStyle(el).translate);await wait(160);
    check('hidden lifecycle stops ambient motion without losing selection',await p.locator('#locationStage').evaluate(el => el.dataset.moving === 'false') && await p.locator('.location-mist').last().evaluate(el => getComputedStyle(el).translate) === hiddenPose);
    await p.evaluate(() => {delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    check('visible lifecycle resumes held scene',await p.locator('#locationStage').evaluate(el => el.dataset.moving === 'true') && await p.evaluate(() => JourneyLocations.active === 'meadow'));
    for (const card of await p.locator('.weather-day').all()) {
      await card.hover();
      check('weather hover preserves held location '+await card.getAttribute('data-date'),await p.evaluate(() => JourneyLocations.active === 'meadow') && await card.getAttribute('data-preview') === 'false');
    }
    await p.locator('.weather-day').first().click();await p.waitForFunction(() => !JourneyLocations.active);
    check('weather selection clears location and retains real forecast',await p.locator('.weather-day').first().getAttribute('aria-pressed') === 'true' && await p.locator('.weather-range').first().textContent() === '12 / 23°');
    await choose(p,'coffee');
    check('location selection clears held date',await p.locator('.weather-day[aria-pressed="true"]').count() === 0);
    check('exploration never fetches another forecast',requests.filter(u => u.includes('api.open-meteo.com')).length === calls);
    check('hidden original scenery objects cannot be targeted',await p.locator('.play-hotspot').evaluateAll(items => items.every(el => getComputedStyle(el).visibility === 'hidden' || getComputedStyle(el).display === 'none' || el.disabled)));
    await p.locator('.location-reset').click();await p.waitForFunction(() => !JourneyLocations.active);await wait(200);
    check('reset returns focus without reopening scene',await button(p,'ridge').evaluate(el => el === document.activeElement) && await p.locator('#locationStage').isHidden());
    await choose(p,'dolphin');await p.locator('.location-story').click();await wait(100);
    check('native story anchor clears composition before navigation',await p.locator('#locationStage').isHidden());
    await ready(p);await choose(p,'tree');
    await p.evaluate(() => scrollTo({top:document.getElementById('crew').offsetTop,behavior:'instant'}));await wait(500);
    check('leaving opening removes scene and restores original clouds',await p.evaluate(() => !JourneyLocations.active && !document.documentElement.dataset.locationScene && openingWorld.dataset.locationPreview === 'false'));
    await ready(p);await choose(p,'ridge');
    await p.locator('#diaryOpen').evaluate(el => {el.click();});
    await p.waitForFunction(() => !!document.querySelector('dialog[open]'));
    check('existing diary dialog clears scenic selection',await p.locator('#locationStage').isHidden());
    await p.close();

    const race = await setup();
    await race.p.route('**/ridge_wide.webp',async route => {await wait(1000);await route.continue();});
    await ready(race.p);await button(race.p,'ridge').hover();await wait(200);await button(race.p,'tree').hover();await wait(200);await button(race.p,'dolphin').click();await active(race.p,'dolphin');await wait(1000);
    check('late A/B decoding never replaces latest C intent',await race.p.evaluate(() => JourneyLocations.active === 'dolphin'));
    await race.p.evaluate(() => {window.maxLocationSlots = 0;window.slotObserver = new MutationObserver(() => {window.maxLocationSlots = Math.max(window.maxLocationSlots,document.querySelectorAll('.location-slot').length);});slotObserver.observe(locationStage,{childList:true});});
    for (const id of ids) {await button(race.p,id).click();await wait(100);}
    await active(race.p,'coffee');check('rapid switches retain at most two live compositions',await race.p.evaluate(() => maxLocationSlots <= 2));
    await race.p.close();

    const phone = await setup({viewport:{width:390,height:900},hasTouch:true});await ready(phone.p);
    for (const id of ids) {
      await choose(phone.p,id,true);
      check(id+' phone uses portrait painting',await phone.p.locator('.location-painting').last().getAttribute('src').then(src => src.endsWith('_portrait.webp')));
      await shot(phone.p,'phone-'+id);
    }
    await button(phone.p,'coffee').tap();await phone.p.waitForFunction(() => !JourneyLocations.active);check('second tap releases a held phone scene',await button(phone.p,'coffee').getAttribute('aria-pressed') === 'false');
    await geometry(phone.p,'390px phone');
    await phone.p.locator('#navToggle').tap();await wait(100);check('opening phone menu clears selected scenery',await phone.p.locator('#locationStage').isHidden());await phone.p.keyboard.press('Escape');
    await choose(phone.p,'ridge',true);await phone.p.setViewportSize({width:900,height:700});await wait(1200);
    check('orientation swaps decoded composition retaining selection',await phone.p.evaluate(() => JourneyLocations.active === 'ridge') && (await phone.p.locator('.location-painting').last().getAttribute('src')).endsWith('_wide.webp'));
    await phone.p.setViewportSize({width:820,height:1180});
    await phone.p.waitForFunction(() => locationStage.dataset.portrait === 'true');
    check('portrait tablet gets portrait art despite desktop control width',await phone.p.locator('.location-painting:not(.location-flow)').last().getAttribute('src').then(src => src.endsWith('_portrait.webp')));
    await phone.p.setViewportSize({width:740,height:390});
    await phone.p.waitForFunction(() => locationStage.dataset.portrait === 'false');
    check('landscape phone gets wide art despite mobile control width',await phone.p.locator('.location-painting:not(.location-flow)').last().getAttribute('src').then(src => src.endsWith('_wide.webp')));
    await phone.p.close();

    for (const viewport of [{width:320,height:800},{width:768,height:1024},{width:2560,height:1100},{width:900,height:430}]) {
      const a = await setup({viewport});await ready(a.p);await choose(a.p,'waterfall');await geometry(a.p,viewport.width+'x'+viewport.height);await shot(a.p,'layout-'+viewport.width+'x'+viewport.height);await a.p.close();
    }
    const text = await setup();await ready(text.p);await text.p.addStyleTag({content:'html {font-size:200% !important;}'});await text.p.evaluate(() => dispatchEvent(new Event('resize')));await wait(200);await geometry(text.p,'200 percent text');check('enlarged forecast values fit individual targets',await text.p.locator('.weather-range').evaluateAll(items => items.every(el => {const box = el.getBoundingClientRect(),parent = el.parentElement.getBoundingClientRect();return box.left >= parent.left && box.right <= parent.right + 1;})));
    await shot(text.p,'enlarged-text');await text.p.close();
    const reduced = await setup({reducedMotion:'reduce'});await ready(reduced.p);await choose(reduced.p,'tree');
    check('reduced motion selects a fully static scene',await reduced.p.locator('#locationStage').evaluate(el => el.dataset.moving === 'false' && el.getAnimations({subtree:true}).every(a => a.playState !== 'running')));
    await reduced.p.emulateMedia({media:'print'});check('print omits decorative chooser and paintings',await reduced.p.locator('#locationExplorer').isHidden() && await reduced.p.locator('#locationStage').isHidden());await reduced.p.close();
    const broken = await setup();await broken.p.route('**/ridge_wide.webp',r => r.abort());await ready(broken.p);await button(broken.p,'ridge').click();await broken.p.waitForFunction(() => document.querySelector('.location-status').textContent.includes('Chưa mở'));
    check('failed painting returns to clouds with useful retry feedback',await broken.p.locator('#locationStage').isHidden());await broken.p.unroute('**/ridge_wide.webp');await choose(broken.p,'ridge');check('failed painting can be retried',true);await broken.p.close();
    const optional = await setup();await optional.p.route('**/vendor/*min.js',r => r.abort());await ready(optional.p);await choose(optional.p,'meadow');check('scenery works without GSAP',await optional.p.evaluate(() => JourneyLocations.active === 'meadow'));await optional.p.close();
    const file = await setup();await ready(file.p,true);await choose(file.p,'coffee');check('direct-file composition decodes',await file.p.locator('.location-painting').evaluate(img => img.naturalWidth > 0));await file.p.close();
    const missing = await setup();await missing.p.route('**/location-scenes.js',r => r.abort());await missing.p.goto(base);check('missing optional controller retains ordinary trip',await missing.p.locator('#heroSummary').isVisible() && await missing.p.locator('.event').count() > 0);await missing.p.close();
    const fonts = await setup();await ready(fonts.p);const cdp = await fonts.p.context().newCDPSession(fonts.p);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const doc = await cdp.send('DOM.getDocument');
    for (const selector of ['.location-heading > p','.location-illustration']) {
      const {nodeId} = await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector});const result = await cdp.send('CSS.getPlatformFontsForNode',{nodeId});report.fonts.push({selector,...result});check(selector+' renders Vietnamese in intended local font',result.fonts.length > 0 && result.fonts.every(f => /Patrick Hand|Be Vietnam Pro/.test(f.familyName)));
    }
    await fonts.p.close();check('no uncaught browser errors',report.errors.length === 0);
    console.log('PASS',report.checks.length,'location checks');
  } finally {fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(error => {console.error(error);process.exitCode = 1;});
