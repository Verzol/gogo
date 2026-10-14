/* Motion-specific browser acceptance. Uses the existing :8000 preview and
   sibling Playwright; retains desktop/phone recordings in review/motion/. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'review','motion');
fs.mkdirSync(output,{recursive:true});
const report = {checkedAt:new Date().toISOString(),checks:[],samples:{},videos:[]};
const check = (name,value) => { assert(value,name); report.checks.push(name); };
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
async function jump(page,id) {
  await page.evaluate(id => scrollTo(0,id === 'top' ? 0 : document.getElementById(id).getBoundingClientRect().top + scrollY - (innerWidth < 768 ? 148 : 110)),id);
  await wait(1050);
}
async function state(page) {
  return page.evaluate(() => ({y:scrollY,phase:scenery.dataset.phase,
    photos:[...document.querySelectorAll('.scene-photo')].map(img => ({id:img.dataset.background,opacity:Number(img.style.opacity),z:Number(img.style.zIndex)})),
    ghosts:document.querySelectorAll('.deck-ghost,.navigation-scene,.scene-catchup').length,
    target:document.activeElement.id,hash:location.hash
  }));
}
(async () => {
  const browser = await chromium.launch({headless:true});
  const errors = [];
  for (const [name,viewport] of [['desktop',{width:1440,height:900}],['phone',{width:390,height:844}]]) {
    const context = await browser.newContext({viewport,recordVideo:{dir:output,size:viewport}});
    const p = await context.newPage();
    p.on('pageerror',e => {errors.push(e.stack);console.error(e.stack);});
    await p.goto('http://127.0.0.1:8000');
    await p.evaluate(() => document.fonts.ready);
    await wait(1100);
    check(name+' retains native scrolling without pinning',await p.locator('.pin-spacer').count() === 0);
    // Sweep the opening/night transition in physical scroll steps; scenery
    // must spend several steps blending instead of finishing in one wheel tick.
    const openingSamples = [];
    for (let y = 0; y < viewport.height * 1.5; y += 60) {
      await p.evaluate(y => scrollTo(0,y),y);
      await wait(650);
      openingSamples.push(await state(p));
    }
    const partial = openingSamples.filter(s => s.photos.some(i => i.id === 'B03' && i.opacity > .03 && i.opacity < .97));
    check(name+' opening landscape blends across multiple wheel steps',partial.length >= 3);
    check(name+' blends retain an opaque full-color photograph underneath',openingSamples.every(s => s.photos.some(i => i.opacity >= .999)));
    report.samples[name+'-opening'] = openingSamples;
    const sampleY = partial[Math.floor(partial.length / 2)].y;
    await p.evaluate(y => scrollTo(0,y),sampleY);await wait(850);
    const reverse = await state(p);
    const prior = openingSamples.find(s => s.y === sampleY);
    check(name+' reverse scrolling reconstructs the same dissolve',reverse.photos.every((photo,i) => Math.abs(photo.opacity - prior.photos[i].opacity) < .015));
    // Nearby stops sharing the same photograph should hold it steady.
    for (const id of ['thao-coffee','waterfall','vi-nha']) {
      await jump(p,id);
      check(name+' holds the daytime photograph at '+id,(await state(p)).photos.find(i => i.id === 'B01').opacity === 1);
    }
    await jump(p,'a-phu');await p.screenshot({path:path.join(output,name+'-sunset.png')});
    await jump(p,'thang-10');await p.screenshot({path:path.join(output,name+'-night.png')});
    check(name+' sunset yields to the scheduled night',(await state(p)).phase === 'night');
    // Distant anchor navigation shows just the destination image over a frozen
    // outgoing composite. It should not flash intermediate daytime/night scenes.
    await jump(p,'top');
    await p.locator('[data-chapter="day-3"]').click();
    await wait(130);
    const midway = await state(p);
    const targetY = await p.locator('#day-3').evaluate(el => el.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
    check(name+' navigation visibly travels before reaching its destination',midway.y > 0 && midway.y < targetY - 100);
    check(name+' long navigation blends only to the destination scenery',midway.photos.filter(i => i.opacity > 0).every(i => i.id === 'B04'));
    await wait(1300);
    const arrived = await state(p);
    check(name+' navigation ends at the real anchor with focus',arrived.hash === '#day-3' && arrived.target === 'day-3' && Math.abs(arrived.y - targetY) < 2);
    check(name+' navigation clears its temporary visual layers',arrived.ghosts === 0);
    await p.goBack();await wait(1000);
    check(name+' browser back restores the preceding location',(await state(p)).hash !== '#day-3');
    // An actual wheel input must stop programmatic travel promptly.
    await jump(p,'top');await p.locator('[data-chapter="day-3"]').click();await wait(130);
    await p.mouse.wheel(0,80);await wait(180);const stopped = (await state(p)).y;
    await wait(650);const later = await state(p);
    check(name+' wheel interrupts navigation without later resuming',Math.abs(later.y - stopped) < 3 && later.y < targetY - 100 && later.ghosts === 0);
    await jump(p,'top');await p.locator('[data-chapter="day-3"]').click();await wait(130);
    await p.keyboard.press('ArrowDown');await wait(250);const keyStop = (await state(p)).y;
    await wait(650);
    check(name+' keyboard interrupts navigation',Math.abs((await state(p)).y - keyStop) < 3);
    // Rapid retargeting must end at the last chosen day and keep focus there.
    await p.locator('[data-chapter="day-1"]').click();await wait(100);
    await p.locator('[data-chapter="day-2"]').click();await wait(1400);
    check(name+' rapid navigation selects the final destination',(await state(p)).target === 'day-2' && (await state(p)).ghosts === 0);
    await jump(p,'departure');
    const note = p.locator('#note-departure');
    const toggle = p.locator('#departure [data-note-toggle]');
    await toggle.click();await wait(110);
    const midHeight = await note.evaluate(el => el.getBoundingClientRect().height);
    await wait(320);
    const fullHeight = await note.evaluate(el => el.getBoundingClientRect().height);
    check(name+' notebook visibly unfolds instead of appearing instantly',midHeight > 0 && midHeight < fullHeight - 2);
    await toggle.click();await wait(70);await toggle.click();await wait(450);
    check(name+' notebook reversals end open and readable',await toggle.getAttribute('aria-expanded') === 'true' && await note.isVisible() && await note.evaluate(el => !el.inert && !el.style.height));
    await toggle.click();await wait(450);
    check(name+' notebook closes after its animation',await note.isHidden());
    await jump(p,'thao-coffee');
    const deck = p.locator('#thao-coffee [data-photo-deck]');
    await deck.locator('[data-photo-step="1"]').click();await wait(100);
    check(name+' photo deck has a visible outgoing/incoming transition',await deck.locator('.deck-ghost').count() === 1);
    await wait(450);
    check(name+' photo deck clears temporary layers and height',await deck.locator('.deck-ghost').count() === 0 && await deck.evaluate(el => !el.style.height));
    for (let i = 0; i < 5; i++) { await deck.locator('[data-photo-step="1"]').click(); await wait(40); }
    await wait(600);
    check(name+' repeated photo clicks leave exactly one selected view',await deck.locator('.deck-slide:not([hidden])').count() === 1 && await deck.locator('.deck-ghost').count() === 0 && await deck.locator('.deck-slide:not([hidden])').evaluate(el => !el.style.opacity));
    await jump(p,'packing');await p.locator('#packingList input').first().check();await wait(400);
    check(name+' packing feedback settles without moving the stamp',await p.locator('#packingStatus').evaluate(el => !el.style.transform) && /1\/7/.test(await p.locator('#packingStatus').textContent()));
    if (name === 'phone') {
      await p.locator('#navToggle').click();await wait(80);
      check('phone menu visibly animates open',await p.locator('#navLinks').evaluate(el => Number(getComputedStyle(el).opacity) > 0 && Number(getComputedStyle(el).opacity) < 1));
      await wait(400);await p.keyboard.press('Escape');
      check('phone closing menu becomes inert immediately',await p.locator('#navLinks').evaluate(el => el.inert));
      await wait(250);
      check('phone menu closes and restores toggle focus',await p.locator('#navLinks').isHidden() && await p.locator('#navToggle').evaluate(el => document.activeElement === el));
      await p.locator('#navToggle').click();await wait(50);await p.locator('#navToggle').click();await wait(50);await p.locator('#navToggle').click();await wait(450);
      check('phone menu reversals end fully open',await p.locator('#navLinks').evaluate(el => !el.inert && !el.style.opacity && !el.classList.contains('closing')));
      await p.keyboard.press('Escape');await wait(250);
    }
    // Supporting content follows scroll position, including repeat visits.
    for (const [id,selector] of [['food','.dish'],['practical','.trip-facts > div']]) {
      const item = p.locator('#'+id+' '+selector).first();
      const bounds = await item.evaluate(el => {const t=ScrollTrigger.getAll().find(t=>t.trigger===el);return {start:t.start,end:t.end};});
      const middle = (bounds.start + bounds.end) / 2;
      await p.evaluate(y => scrollTo(0,y),middle);await wait(500);
      const partial = await item.evaluate(el => Number(getComputedStyle(el).opacity));
      check(name+' supporting section '+id+' reveals gradually',partial > .3 && partial < .8);
      await wait(850);
      check(name+' supporting section '+id+' holds at a paused scroll position',Math.abs(await item.evaluate(el => Number(getComputedStyle(el).opacity)) - partial) < .01);
      await p.evaluate(y => scrollTo(0,y),bounds.end + 5);await wait(500);
      check(name+' supporting section '+id+' is fully readable in its reading zone',await item.evaluate(el => Number(getComputedStyle(el).opacity)) === 1);
      await p.evaluate(y => scrollTo(0,y),middle);await wait(500);
      check(name+' supporting section '+id+' reverses at the same position',Math.abs(await item.evaluate(el => Number(getComputedStyle(el).opacity)) - partial) < .01);
    }
    await p.locator('.footer').scrollIntoViewIfNeeded();await wait(1000);
    await p.screenshot({path:path.join(output,name+'-footer.png')});
    check(name+' footer remains readable after its entrance',await p.locator('.footer h2').evaluate(el => Number(getComputedStyle(el).opacity) === 1));
    // Preference changes mid-interaction clean up transforms and event handlers.
    await jump(p,'departure');await toggle.click();await wait(80);
    await p.emulateMedia({reducedMotion:'reduce'});await wait(250);
    check(name+' reduced motion disposes every scroll animation',await p.evaluate(() => ScrollTrigger.getAll().length === 0));
    check(name+' reduced motion leaves the open notebook intact',await note.isVisible() && await note.evaluate(el => !el.style.height));
    await p.locator('[data-chapter="day-3"]').click();await wait(100);
    check(name+' reduced-motion navigation is immediate',await p.locator('#day-3').evaluate(el => el.getBoundingClientRect().top < innerHeight / 2));
    await p.emulateMedia({reducedMotion:'no-preference'});await wait(300);
    await p.emulateMedia({reducedMotion:'reduce'});await p.emulateMedia({reducedMotion:'no-preference'});await wait(300);
    check(name+' repeated motion preference changes do not accumulate triggers',await p.evaluate(() => {const all=ScrollTrigger.getAll(),entries=all.filter(t=>t.vars.scrub!==.55);return all.filter(t=>t.vars.scrub===.55).length===1 && new Set(entries.map(t=>t.trigger)).size===entries.length;}));
    const video = p.video();
    await context.close();
    const filename = name+'.webm';
    await video.saveAs(path.join(output,filename));
    fs.unlinkSync(await video.path());
    report.videos.push(filename);
  }
  // Delayed image delivery must retain the current landscape during travel.
  const delayed = await browser.newPage();
  delayed.on('pageerror',e => errors.push(e.message));
  let deliverNavigationImage;
  const navigationImageGate = new Promise(resolve => {deliverNavigationImage=resolve;});
  await delayed.route('**/backgrounds/b04_*.webp',async route => { await navigationImageGate; await route.continue(); });
  await delayed.goto('http://127.0.0.1:8000',{waitUntil:'domcontentloaded'});await wait(1000);
  await delayed.locator('[data-chapter="day-3"]').click();await wait(1250);
  check('Delayed scenery retains the outgoing photograph',await delayed.locator('.navigation-scene').count() === 1 && await delayed.locator('.navigation-photo').evaluateAll(a => a.some(i => i.naturalWidth && Number(i.style.opacity) === 1)));
  deliverNavigationImage();await wait(2000);
  check('Delayed scenery finishes after decoding',await delayed.locator('.navigation-scene').count() === 0 && (await state(delayed)).phase === 'predawn');
  await delayed.close();
  const manual = await browser.newPage();
  manual.on('pageerror',e => errors.push(e.stack));
  let deliverManualImage;
  const manualImageGate = new Promise(resolve => {deliverManualImage=resolve;});
  await manual.route('**/backgrounds/b04_*.webp',async route => { await manualImageGate; await route.continue(); });
  await manual.goto('http://127.0.0.1:8000',{waitUntil:'domcontentloaded'});await wait(1000);
  await manual.evaluate(() => scrollTo(0,document.getElementById('day-3').getBoundingClientRect().top + scrollY - 110));
  await wait(1000);
  check('Delayed manual scrolling retains an opaque photograph',await manual.locator('.scene-photo').evaluateAll(a => a.some(i => i.naturalWidth && Number(i.style.opacity) === 1)));
  deliverManualImage();
  await manual.waitForSelector('.scene-catchup',{state:'attached'});await wait(150);
  check('Late manual scenery visibly dissolves after decoding',await manual.locator('.scene-catchup').evaluate(el => {const opacity=Number(getComputedStyle(el).opacity);return opacity > 0 && opacity < 1;}));
  await wait(900);
  check('Late manual scenery clears its temporary layer',await manual.locator('.scene-catchup').count() === 0 && (await state(manual)).photos.find(i => i.id === 'B04').opacity === 1);
  await manual.close();
  const missing = await browser.newPage();
  missing.on('pageerror',e => errors.push(e.stack));
  await missing.route('**/backgrounds/b04_*.webp',route => route.fulfill({status:200,contentType:'image/webp',body:'invalid image for decode failure verification'}));
  await missing.goto('http://127.0.0.1:8000');await wait(1000);
  await missing.locator('[data-chapter="day-3"]').click();await wait(1500);
  check('Failed destination image preserves a visible photograph and usable page',await missing.locator('.navigation-scene').count() === 0 && await missing.locator('.scene-photo').evaluateAll(a => a.some(i => i.naturalWidth && Number(i.style.opacity) === 1)) && await missing.locator('.event').count() === 24);
  await missing.close();
  if(errors.length)console.error(errors);
  check('Motion scenarios have no uncaught browser errors',errors.length === 0);
  report.checkCount = report.checks.length;
  report.errors = errors;
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
  console.log('Passed '+report.checkCount+' motion checks; desktop/phone recordings in review/motion/.');
})().catch(error => { console.error(error); process.exit(1); });
