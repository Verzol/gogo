/* Loading regressions: real pointer movement, decoded-node reuse, pending intent,
   bounded scene DOM, and responsive picture requests. No backend writes. */
const fs = require('fs'),path = require('path'),assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const base = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-loading-review';
fs.mkdirSync(output,{recursive:true});
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],measurements:{}};
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
const button = (p,id) => p.locator('.location-sticker[data-location="'+id+'"]');
async function active(p,id) {await p.waitForFunction(id => JourneyLocations.active === id,id);await wait(850);}
let browser;
(async () => {
  browser = await chromium.launch();
  try {
    const p = await browser.newPage({viewport:{width:1440,height:1000}}),requests = [];
    p.on('request',r => requests.push(r.url()));p.on('pageerror',e => report.errors.push(e.message));
    await p.route('https://api.open-meteo.com/**',r => r.abort());
    await p.addInitScript(() => {
      window.loadingAudit = {decodes:[],mutations:0};
      const decode = HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode = function() {loadingAudit.decodes.push(this.src);return decode.call(this);};
    });
    await p.goto(base);await p.waitForFunction(() => !!window.JourneyLocations);
    await button(p,'tree').click();await active(p,'tree');
    await p.evaluate(() => {
      window.heldSlot = locationStage.lastElementChild;
      loadingAudit.decodes = [];
      new MutationObserver(records => {loadingAudit.mutations += records.length;}).observe(locationStage,{childList:true});
    });
    const start = requests.length,transforms = [];
    for (let i = 0;i < 20;i++) {
      await p.mouse.move(25+i*40,260+(i%2)*40);await wait(25);
      transforms.push(await p.locator('.location-depth--far').evaluate(el => getComputedStyle(el).transform));
    }
    check('pointer movement keeps main painting stationary',transforms.every(t => t === 'none'));
    check('pointer movement makes no scenic image requests',!requests.slice(start).some(u => u.includes('/scenery/locations/')));
    check('pointer movement performs no image decoding',await p.evaluate(() => loadingAudit.decodes.length === 0));
    check('pointer movement retains exact DOM composition',await p.evaluate(() => heldSlot === locationStage.lastElementChild && loadingAudit.mutations === 0));
    check('foreground parallax remains available',await p.locator('.location-depth--near').evaluate(el => getComputedStyle(el).transform !== 'none'));
    report.measurements.pointer = {newScenicRequests:requests.slice(start).filter(u => u.includes('/scenery/locations/')).length,decodes:await p.evaluate(() => loadingAudit.decodes.length),slotMutations:await p.evaluate(() => loadingAudit.mutations),paintingTransforms:[...new Set(transforms)]};
    // Delay B so cancelling it must keep the original held A node/fade untouched.
    let release,started;
    const gate = new Promise(resolve => {release = resolve;}),pending = new Promise(resolve => {started = resolve;});
    await p.route('**/waterfall_wide.webp',async route => {started();await gate;await route.continue();});
    await button(p,'waterfall').hover();await pending;
    await p.mouse.move(25,300);await wait(220);
    check('cancelled hover restores held scene without rebuilding',await p.evaluate(() => JourneyLocations.active === 'tree' && heldSlot === locationStage.lastElementChild && loadingAudit.mutations === 0));
    release();await wait(900);
    check('cancelled decode cannot replace held scene',await p.evaluate(() => JourneyLocations.active === 'tree' && heldSlot === locationStage.lastElementChild));
    const count = await p.evaluate(() => loadingAudit.decodes.length);
    await button(p,'waterfall').click();await active(p,'waterfall');
    check('prepared scene is reused without decoding again',await p.evaluate(count => loadingAudit.decodes.length === count,count));
    await button(p,'tree').click();await active(p,'tree');
    check('recent scene reuses actual decoded DOM node',await p.evaluate(() => heldSlot === locationStage.lastElementChild));
    check('recent scene revisit does not decode again',await p.evaluate(count => loadingAudit.decodes.length === count,count));
    // Re-enter before the cloud-return fade finishes: avoid fading the same
    // cached DOM node out and in, which would expose a flash of clouds.
    await button(p,'tree').click();await wait(40);await button(p,'tree').click();await wait(500);
    check('re-entering during dismissal retains painting and restores caption',await p.evaluate(() => heldSlot === locationStage.lastElementChild && JourneyLocations.active === 'tree' && !document.querySelector('.location-story').hidden && locationName.textContent === 'Cây Cô Đơn'));
    await p.keyboard.press('Escape');await wait(500);await button(p,'tree').click();await active(p,'tree');
    check('reset then reopen reuses decoded composition',await p.evaluate(count => heldSlot === locationStage.lastElementChild && loadingAudit.decodes.length === count,count));
    await p.screenshot({path:path.join(output,'desktop-tree.png')});
    // More than two recent worlds evicts the oldest cached composition.
    await button(p,'meadow').click();await active(p,'meadow');await button(p,'coffee').click();await active(p,'coffee');
    await button(p,'tree').click();await active(p,'tree');
    check('old decoded composition is evicted after two newer worlds',await p.evaluate(() => heldSlot !== locationStage.lastElementChild));
    check('live scenic DOM stays bounded',await p.locator('.location-slot').count() <= 2);
    await p.close();
    const phone = await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),phoneRequests = [];
    phone.on('request',r => phoneRequests.push(r.url()));phone.on('pageerror',e => report.errors.push(e.message));
    await phone.route('https://api.open-meteo.com/**',r => r.abort());await phone.goto(base);
    await phone.evaluate(() => JourneyScenery.load('night'));
    check('phone story scenery decodes portrait source',await phone.locator('#sceneLayers > .scene-panel.scene-night .quiet-terrain-image').evaluate(img => img.complete && img.naturalWidth > 0 && img.currentSrc.includes('portrait')));
    check('phone avoids unused wide story terrain request',!phoneRequests.some(u => /ui_quiet_terrain_wide_night\.webp/.test(u)));
    check('story worlds omit permanently hidden legacy ridge downloads',!phoneRequests.some(u => /ridge_(mid|near)_night\.webp/.test(u)));
    await button(phone,'coffee').tap();await active(phone,'coffee');await phone.screenshot({path:path.join(output,'phone-coffee.png')});
    check('no uncaught browser errors',report.errors.length === 0);await phone.close();
    console.log('PASS',report.checks.length,'loading checks');
  } finally {fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(error => {console.error(error);process.exitCode = 1;});
