/* Actual pointer/keyboard play, cancellation, touch scrolling and fallbacks.
   All reports stay outside the checkout. No payment or private-diary writes. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-playful-review';
const base = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
fs.mkdirSync(output,{recursive:true});
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[],feeding:[],variations:[]};
const check = (name,value) => { assert(value,name);report.checks.push(name); };
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
const fixture = {daily:{time:['2026-10-23','2026-10-24','2026-10-25'],weather_code:[0,63,73],temperature_2m_min:[12,13,10],temperature_2m_max:[23,24,20],apparent_temperature_min:[10,11,8],precipitation_probability_max:[0,85,95],precipitation_sum:[0,10,4],snowfall_sum:[0,0,1],wind_speed_10m_max:[8,20,16],wind_gusts_10m_max:[12,30,24]}};
async function setup(browser,options = {}) {
  const p = await browser.newPage({viewport:{width:1440,height:900},...options});
  p.on('pageerror',error => report.errors.push(error.stack));
  await p.route('https://api.open-meteo.com/**',route => route.fulfill({contentType:'application/json',body:JSON.stringify(fixture)}));
  return p;
}
async function ready(p,url = base) {
  await p.goto(url);await p.evaluate(() => document.fonts.ready);await wait(650);
}
async function jump(p,id,offset = -85) {
  await p.evaluate(({id,offset}) => {
    const el = document.getElementById(id);
    scrollTo({top:el.getBoundingClientRect().top + scrollY + offset,behavior:'instant'});
  },{id,offset});
  await wait(1100);
}
async function center(locator) { const b = await locator.boundingBox();assert(b,'visible target');return {x:b.x + b.width / 2,y:b.y + b.height / 2}; }
async function slot(p) {
  return p.locator('.fund-pig').evaluate(el => {
    const b = el.getBoundingClientRect(),m = new DOMMatrix(getComputedStyle(el).transform);
    const point = m.transformPoint({x:el.offsetWidth * (.56991 - .5),y:el.offsetHeight * (.21702 - .5)});
    return {x:b.left + b.width / 2 + point.x,y:b.top + b.height / 2 + point.y};
  });
}
async function mouseDrag(p,locator,to,release = true) {
  const from = await center(locator);
  await p.mouse.move(from.x,from.y);await p.mouse.down();
  await p.mouse.move(to.x,to.y,{steps:12});await wait(80);
  if (release) await p.mouse.up();
}
async function shot(p,name) { await p.screenshot({path:path.join(output,name + '.png')});report.screenshots.push(name + '.png'); }
async function settled(p) {
  await p.waitForFunction(() => !document.querySelector('.fund-coin-flight,.is-feeding,.is-play-dragging,.is-play-return') && !playEffects.children.length,{},{timeout:4000});
  return true;
}
async function variedFeeding(p,name) {
  const tosses = await p.evaluate(() => {
    const art = document.querySelector('.fund-pig-art');
    const originalRandom = Math.random,originalAnimate = art.animate;
    let seed = 9127;
    Math.random = () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;return seed / 4294967296; };
    const reactions = [];
    art.animate = function(frames,options) {
      reactions.push({kind:this.dataset.reaction,frames,duration:options.duration});
      return originalAnimate.call(this,frames,options);
    };
    window.playfulReview = {reactions,restore:() => { Math.random = originalRandom;art.animate = originalAnimate; }};
    for (let i = 0;i < 16;i++) document.querySelector('.fund-pig').click();
    const tosses = [...document.querySelectorAll('.fund-coin-flight')].map(el => {
      const animation = el.getAnimations()[0],frames = animation.effect.getKeyframes();
      const angle = frame => Number(frame.transform.match(/rotate\(([-\d.]+)deg\)/)[1]);
      const start = new DOMMatrix(frames[0].transform),end = new DOMMatrix(frames.at(-1).transform);
      return {kind:el.dataset.toss,duration:animation.effect.getTiming().duration,
        origin:[start.m41,start.m42],end:[end.m41,end.m42],
        direction:Math.sign(angle(frames.at(-1)) - angle(frames[0])),
        foreground:Number(frames[0].zIndex),entry:Number(frames.at(-1).zIndex),
        shape:frames.map(f => f.transform)};
    });
    // A fixed draw cycles the non-repeating reaction choices, covering every
    // actual pose without a probabilistic coverage assertion.
    Math.random = () => .01;
    return tosses;
  });
  check(name + ' tosses use all four visibly different flight styles',new Set(tosses.map(t => t.kind)).size === 4 && new Set(tosses.map(t => JSON.stringify(t.shape))).size === 16);
  check(name + ' coins launch from multiple sides with both spin directions',new Set(tosses.map(t => t.direction)).size === 2 && Math.max(...tosses.map(t => t.origin[0])) - Math.min(...tosses.map(t => t.origin[0])) > 100);
  check(name + ' every coin gets its own flight timing',new Set(tosses.map(t => t.duration)).size > 8);
  check(name + ' every path converges behind the same slot front',tosses.every(t => t.foreground > t.entry && t.entry === 1 && Math.abs(t.end[0] - tosses[0].end[0]) < .01 && Math.abs(t.end[1] - tosses[0].end[1]) < .01));
  await wait(250);await shot(p,name + '-varied-tosses');
  check(name + ' side throws retain native page width',await p.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  check(name + ' all randomized coins and reactions settle',await settled(p));
  const reactions = await p.evaluate(() => { const {reactions,restore} = window.playfulReview;restore();delete window.playfulReview;return reactions; });
  check(name + ' every landing triggers a reaction with all five poses covered',reactions.length === 16 && new Set(reactions.map(r => r.kind)).size === 5 && new Set(reactions.map(r => JSON.stringify(r.frames.slice(1)))).size === 5);
  check(name + ' pig avoids consecutive identical reactions',reactions.every((r,i) => !i || r.kind !== reactions[i - 1].kind));
  report.variations.push({name,tosses,reactions});
}
(async () => {
  const browser = await chromium.launch();
  for (const [name,width,height] of [['desktop',1440,900],['phone',390,844],['narrow',320,780]]) {
    const p = await setup(browser,{viewport:{width,height}});await ready(p);
    const sun = p.locator('.play-hotspot[data-kind="sun"]:visible');
    await sun.waitFor({state:'visible'});
    check(name + ' exposes a visible sun with an accessible native button',await sun.getAttribute('aria-label') === 'Chạm hoặc kéo mặt trời' && await sun.evaluate(el => !el.closest('[aria-hidden="true"]')));
    await sun.click();await wait(130);
    check(name + ' sun produces painted feedback without changing forecast or hash',await p.locator('.play-particle').count() > 0 && await p.evaluate(() => !location.hash && !document.querySelector('.weather-day[aria-pressed="true"]')));
    await shot(p,name + '-sun');await wait(1200);
    const sunPoint = await center(sun);
    await mouseDrag(p,sun,{x:sunPoint.x - 45,y:sunPoint.y + 18},false);
    check(name + ' sun accepts a bounded drag',await p.locator('.opening-sun').evaluate(el => Math.abs(parseFloat(el.style.getPropertyValue('--play-x'))) > 10));
    await p.mouse.up();await wait(700);
    check(name + ' sun returns to its original composition',await p.locator('.opening-sun').evaluate(el => !el.style.getPropertyValue('--play-x')));
    await sun.focus();await p.keyboard.press('Space');await wait(80);
    check(name + ' keyboard triggers the same sun action',await p.locator('#playEffects > *').count() > 0);
    await p.keyboard.press('Escape');
    check(name + ' Escape clears active effects',await p.locator('#playEffects > *').count() === 0);
    await jump(p,'fund');
    await p.locator('.fund-pig img').evaluate(el => el.decode());
    await p.locator('.fund-pig').click();
    const feeding = await p.evaluate(() => ({world:document.documentElement.dataset.sceneryWorld,paused:document.documentElement.dataset.motionPaused,coins:document.querySelectorAll('.fund-coin-flight').length,front:getComputedStyle(document.querySelector('.fund-slot-mask')).backgroundImage}));
    report.feeding.push({name,...feeding});
    check(name + ' pig sends one independent coin toward its slot',feeding.coins === 1 && feeding.front.includes('pig_front.webp'));
    await wait(280);
    await shot(p,name + '-feeding');
    check(name + ' pig reaction cleans up after landing',await settled(p));
    await p.locator('.fund-pig').focus();await p.keyboard.press('Enter');await wait(100);
    await p.keyboard.press('Enter');
    check(name + ' repeated keyboard activation launches independent coins',await p.locator('.fund-coin-flight').count() === 2);
    await p.keyboard.press('Escape');
    const toy = p.locator('.fund-toy-coin');
    await mouseDrag(p,toy,await slot(p),false);
    check(name + ' valid drop highlights the slot',await p.locator('.fund-illustration').evaluate(el => el.classList.contains('is-drop-ready')));
    await p.mouse.up();await wait(120);
    check(name + ' dropped coin becomes exactly one feeding animation',await p.locator('.fund-coin-flight').count() === 1);
    check(name + ' dropped coin and pig settle',await settled(p));
    const miss = await center(toy);
    await mouseDrag(p,toy,{x:12,y:Math.min(750,miss.y + 110)});await wait(550);
    check(name + ' missed drop returns the coin without feeding',await toy.evaluate(el => !el.style.translate && el.getAnimations().length === 0) && await p.locator('.fund-coin-flight').count() === 0);
    await mouseDrag(p,toy,await slot(p),false);await p.keyboard.press('Escape');await p.mouse.up();
    check(name + ' Escape cancels a captured coin drag',await p.locator('.is-coin-dragging,.is-drop-ready,.fund-coin-flight').count() === 0 && await toy.evaluate(el => !el.style.translate));
    await p.locator('.fund-pig').click();
    const firstFlight = await p.locator('.fund-coin-flight').elementHandle();
    // Record the actual removal in the page; screenshot encoding may finish
    // after later coins land, so a subsequent Node-side count is too late.
    const firstLanding = firstFlight.evaluate(el => new Promise(resolve => {
      const observer = new MutationObserver(changes => {
        if (changes.some(change => [...change.removedNodes].some(node => node.classList?.contains('fund-coin-flight')))) {
          observer.disconnect();
          resolve({remaining:document.querySelectorAll('.fund-coin-flight').length,feeding:document.querySelector('.fund-illustration').classList.contains('is-feeding')});
        }
      });
      observer.observe(el.parentElement,{childList:true});
    }));
    await wait(120);await p.locator('.fund-pig').click();
    await wait(120);await p.locator('.fund-pig').click();
    check(name + ' three actual pig clicks launch three overlapping coins',await p.locator('.fund-coin-flight').count() === 3);
    check(name + ' later clicks preserve the first coin and its progress',await firstFlight.evaluate(el => el.isConnected && el.getAnimations()[0]?.currentTime >= 200));
    check(name + ' loose coin stays visible and available during feeding',await toy.evaluate(el => el.getAttribute('aria-disabled') !== 'true' && Number(getComputedStyle(el.querySelector('img')).opacity) > 0));
    await shot(p,name + '-multiple-coins');
    const landed = await firstLanding;
    check(name + ' first landing leaves later coins in flight',landed.remaining > 0 && landed.remaining < 3 && landed.feeding);
    check(name + ' all overlapping coins land and clean up',await settled(p));
    await variedFeeding(p,name);
    await p.locator('.fund-pig').evaluate(el => { for (let i = 0;i < 16;i++) el.click(); });
    check(name + ' rapid burst launches one independent coin per click',await p.locator('.fund-coin-flight').count() === 16);
    await p.evaluate(() => { document.documentElement.dataset.motionPaused = 'true'; });await wait(70);
    check(name + ' pausing cancels active coin and particle motion',await p.locator('.fund-coin-flight,#playEffects > *').count() === 0);
    await p.locator('.fund-pig').click();await wait(80);
    check(name + ' paused pig provides static feedback',await p.locator('.fund-coin-flight').count() === 0 && await p.locator('.play-particle--heart').count() === 1);
    await p.evaluate(() => { document.documentElement.dataset.motionPaused = 'false'; });await wait(100);
    await shot(p,name + '-fund');
    check(name + ' play preserves contribution, destination and roster',await p.evaluate(() => document.querySelector('.fund-amount strong').textContent === '2.400.000' && document.querySelector('.fund-link').href === 'https://quy.momo.vn/v2/YTavDjFUV4?cover=6749' && TRIP_DATA.members.length === 7 && document.querySelectorAll('.event').length === 24));
    check(name + ' no horizontal overflow',await p.evaluate(() => document.documentElement.scrollWidth === innerWidth));
    await jump(p,'stars',300);
    const moon = p.locator('.play-hotspot[data-kind="moon"]:visible');await moon.waitFor({state:'visible'});
    await moon.click();await wait(100);
    check(name + ' night exposes moon play and stars',await p.locator('.play-particle--star').count() > 0);
    await shot(p,name + '-moon');
    if (await p.locator('#navToggle').isVisible()) await p.locator('#navToggle').click();
    await p.locator('.nav-fund').click();await wait(1700);
    check(name + ' anchor travel leaves no cloned controls or effects',await p.locator('.navigation-scene button,.scene-catchup button,#sceneLayers .play-particle').count() === 0 && await p.locator('.play-hotspot').count() === 2 && await p.locator('#playEffects > *').count() === 0);
    await p.emulateMedia({media:'print'});
    check(name + ' print hides toys and keeps the contribution',await p.locator('#playSurface').isHidden() && await toy.isHidden() && await p.locator('.fund-amount').isVisible());
    await p.close();
  }
  const clouds = await setup(browser);await ready(clouds);
  const cloud = clouds.locator('.play-hotspot[data-kind="cloud"]:visible');await cloud.waitFor({state:'visible'});
  await cloud.focus();await clouds.keyboard.press('Enter');await wait(100);
  check('cloud click creates two short painted wisps',await clouds.locator('.play-particle--cloud').count() === 2);
  await shot(clouds,'cloud-wisps');
  const cloudFrom = await center(cloud);
  await mouseDrag(clouds,cloud,{x:cloudFrom.x + 50,y:cloudFrom.y},false);
  check('cloud drag pauses only its phase-preserving flow',await clouds.locator('[data-play-held="true"]').count() === 1 && await clouds.locator('[data-play-held="true"]').evaluate(el => el.getAnimations().some(a => a.playState === 'paused')));
  await clouds.mouse.up();await cloud.evaluate(el => el.blur());await wait(700);
  check('released cloud resumes its flow',await clouds.locator('[data-play-held="true"]').count() === 0);
  // The existing ambient float never satisfies locator.click's stability gate.
  // Click its current painted position with real mouse input instead.
  const cupPoint = await center(clouds.locator('.playful-cup'));
  await clouds.mouse.click(cupPoint.x,cupPoint.y);await wait(100);
  check('coffee emits an independent steam curl',await clouds.locator('.play-steam').count() === 1);
  await shot(clouds,'coffee-steam');
  await clouds.locator('#weatherMotion').click();
  await clouds.locator('.weather-day').nth(1).click();await wait(100);
  check('paused forecast hides the sun hit region with its painting',await clouds.locator('.play-hotspot[data-kind="sun"]').isHidden());
  await clouds.locator('#weatherReset').click();await wait(100);
  check('paused clear sky restores its sun hit region without a timer',await clouds.locator('.play-hotspot[data-kind="sun"]').isVisible());
  await clouds.locator('#weatherMotion').click();
  await clouds.locator('.fund-pig').evaluate(el => el.click());await clouds.emulateMedia({reducedMotion:'reduce'});await wait(100);
  check('switching to reduced motion removes in-flight animation',await clouds.locator('.fund-coin-flight,#playEffects > *').count() === 0);
  await clouds.locator('.weather-day').nth(1).click();await wait(100);
  check('reduced-motion forecast hides the invisible sun hit region',await clouds.locator('.play-hotspot[data-kind="sun"]').isHidden());
  await clouds.locator('#weatherReset').click();await wait(100);
  check('reduced-motion clear sky restores its visible sun hit region',await clouds.locator('.play-hotspot[data-kind="sun"]').isVisible());
  await clouds.close();
  for (const mode of ['reduce','missing-gsap','missing-art','file','storage-denied']) {
    const p = await setup(browser,{viewport:{width:390,height:844},...(mode === 'reduce' ? {reducedMotion:'reduce'} : {})});
    if (mode === 'missing-gsap') await p.route('**/vendor/{gsap,ScrollTrigger}.min.js',route => route.fulfill({contentType:'application/javascript',body:''}));
    if (mode === 'missing-art') await p.route('**/painted/playful/*.webp',route => route.fulfill({contentType:'image/webp',body:'invalid optional art fixture'}));
    if (mode === 'storage-denied') await p.addInitScript(() => { Object.defineProperty(window,'localStorage',{get() { throw new DOMException('Blocked','SecurityError'); }}); });
    await ready(p,mode === 'file' ? 'file://' + path.join(root,'index.html') : base);await jump(p,'fund');
    await p.locator('.fund-pig').click();await wait(100);
    check(mode + ' retains usable fund and play feedback',await p.locator('.fund-link').isVisible() && await p.locator('.fund-pig').getAttribute('aria-label') === 'Cho heo ăn một xu vui');
    if (mode === 'reduce') check('reduced motion uses static feedback',await p.locator('.fund-coin-flight').count() === 0 && await p.locator('.play-particle--heart').count() === 1);
    if (mode === 'missing-art') check('missing pig restores its reserved icon',await p.locator('.fund-pig.is-fallback').count() === 1 && await p.locator('.fund-pig-fallback').isVisible());
    await p.close();
  }
  const touch = await setup(browser,{viewport:{width:390,height:844},hasTouch:true,isMobile:true});await ready(touch);
  await touch.locator('.play-hotspot[data-kind="sun"]:visible').tap();await wait(70);
  check('touch tap activates the sun',await touch.locator('.play-particle').count() > 0);
  const sunTouch = await center(touch.locator('.play-hotspot[data-kind="sun"]:visible'));
  const session = await touch.context().newCDPSession(touch);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sunTouch.x,y:sunTouch.y}]});
  for (let i = 1;i <= 8;i++) { await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sunTouch.x,y:sunTouch.y - i * 14}]});await wait(20); }
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(600);
  check('vertical touch gesture on scenery retains native page scrolling',await touch.evaluate(() => scrollY > 35 && !document.querySelector('.is-play-dragging')));
  await jump(touch,'fund');
  for (let i = 0;i < 3;i++) { await touch.locator('.fund-pig').tap();await wait(70); }
  check('phone pig launches one coin per actual touch tap',await touch.locator('.fund-coin-flight').count() === 3);
  await settled(touch);
  const touchCoin = await center(touch.locator('.fund-toy-coin')),touchSlot = await slot(touch);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchCoin]});
  for (let i = 1;i <= 10;i++) {
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchCoin.x + (touchSlot.x - touchCoin.x) * i / 10,y:touchCoin.y + (touchSlot.y - touchCoin.y) * i / 10}]});
    await wait(20);
  }
  check('phone touch drag highlights the pig slot',await touch.locator('.is-drop-ready').count() === 1);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  check('phone touch drop feeds exactly one coin',await touch.locator('.fund-coin-flight').count() === 1);
  await touch.close();
  check('all scenarios have no uncaught browser errors',report.errors.length === 0);
  report.checkCount = report.checks.length;
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2) + '\n');
  fs.rmSync(path.join(output,'failure.json'),{force:true});
  await browser.close();console.log('Passed ' + report.checkCount + ' playful-object checks; ' + output);
})().catch(error => { fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({error:error.stack,...report},null,2));console.error(error);process.exit(1); });
