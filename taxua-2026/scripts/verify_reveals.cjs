/* Reversible foreground motion: physical scroll samples, pause/reading states,
   independent gestures and forward/reverse recordings. Reuses :8000. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = process.env.TRIP_REVIEW_DIR || path.join(root,'review','reveals');
fs.mkdirSync(output,{recursive:true});
const report = {checkedAt:new Date().toISOString(),checks:[],samples:{},videos:[],errors:[]};
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
async function scroll(page,y) {await page.evaluate(y => scrollTo(0,y),y);await wait(400);}
async function bounds(item) {
  return item.evaluate(el => {
    const t = ScrollTrigger.getAll().find(t => t.trigger === el);
    return t && {start:t.start,end:t.end};
  });
}
async function sample(item) {
  return item.evaluate(el => {
    const css = getComputedStyle(el);
    const travel = css.translate === 'none' ? [0,0] : css.translate.split(' ').map(parseFloat);
    return {opacity:Number(css.opacity),x:travel[0] || 0,y:travel[1] || 0,
      rotation:parseFloat(css.rotate) || 0,scroll:scrollY,
      overflow:document.documentElement.scrollWidth > innerWidth + 1};
  });
}
function equal(a,b) {
  return Math.abs(a.opacity-b.opacity)<.015 && Math.abs(a.x-b.x)<1 && Math.abs(a.y-b.y)<1 && Math.abs(a.rotation-b.rotation)<.05;
}
async function travel(page,from,to,duration=2200) {
  await page.evaluate(({from,to,duration}) => new Promise(resolve => {
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1,(now-start)/duration);
      scrollTo(0,from+(to-from)*p);
      if(p<1)requestAnimationFrame(frame);else resolve();
    }
    requestAnimationFrame(frame);
  }),{from,to,duration});
  await wait(350);
}
(async () => {
  const browser = await chromium.launch({headless:true});
  for(const [name,viewport] of [['desktop',{width:1440,height:900}],['phone',{width:390,height:844}]]) {
    const context = await browser.newContext({viewport});
    const p = await context.newPage();
    p.on('pageerror',error => report.errors.push(error.stack));
    await p.goto('http://127.0.0.1:8000/taxua-2026/');await p.evaluate(() => document.fonts.ready);await wait(700);
    check(name+' opening hero is immediately readable',await p.locator('#heroTitle').evaluate(el => Number(getComputedStyle(el).opacity) === 1 && !el.closest('.scroll-reveal-hidden')));
    const cases = [
      ['ticket','#departure .event-inner'],['photo','#thao-coffee .postcard'],
      ['text','#thao-coffee h3'],['collage','#check-in .stay-photos > figure'],
      ['room-two','#check-in .stay-photos > figure:nth-child(2)'],
      ['room-three','#check-in .stay-photos > figure:nth-child(3)'],
      ['cluster-photo','.cluster-card .postcard'],['cluster-text','.cluster-card h4'],
      ['sticker','.packing-heading > img'],['crew','.member'],
      ['packing','.checklist li'],['destination','.destination-index a'],
      ['food','.dish'],['facts','.trip-facts > div'],['footer','.footer h2']
    ];
    for(const [kind,selector] of cases) {
      const item = p.locator(selector).first();
      const range = await bounds(item);
      check(name+' '+kind+' has a measurable reveal range',range && range.end>range.start);
      const samples = [];
      for(const progress of [0,.25,.5,.75,1]) {
        await scroll(p,range.start+(range.end-range.start)*progress);
        samples.push(await sample(item));
      }
      check(name+' '+kind+' starts transparent with real displacement',samples[0].opacity < .005 && Math.hypot(samples[0].x,samples[0].y)>15);
      check(name+' '+kind+' reveals gradually across several positions',samples[1].opacity>.02 && samples[2].opacity>.3 && samples[2].opacity<.8 && samples[3].opacity<.99 && samples.every((s,i)=>!i||s.opacity>=samples[i-1].opacity));
      check(name+' '+kind+' finishes fully visible and settled',samples[4].opacity>.999 && Math.hypot(samples[4].x,samples[4].y)<.1);
      await scroll(p,range.end+80);
      const reading = await sample(item);
      await scroll(p,range.end+30);
      check(name+' '+kind+' stays stable during small reading-zone reversals',equal(reading,await sample(item)));
      for(const index of [3,2,1,0]) {
        await scroll(p,range.start+(range.end-range.start)*index/4);
        check(name+' '+kind+' reverses exactly at '+index+'/4',equal(samples[index],await sample(item)));
      }
      await scroll(p,(range.start+range.end)/2);
      const paused = await sample(item);await wait(750);
      check(name+' '+kind+' holds partial progress while paused',equal(paused,await sample(item)));
      check(name+' '+kind+' causes no horizontal overflow',samples.every(s => !s.overflow));
      if(name==='phone')check('phone '+kind+' uses vertical travel',samples.every(s=>Math.abs(s.x)<.01));
      report.samples[name+'-'+kind] = {range,samples,paused};
    }
    // All rendered foreground groups are covered, including repeated rows.
    check(name+' every scrapbook/support item has reveal coverage',await p.locator('.event:not(.event--transit) .event-body > h3, .postcard:not(.cluster-card), .stay-photos > figure, .cluster-card h4, .member, .checklist li, .destination-index a, .dish, .trip-facts > div, .practical-costs > p, .footer > *').evaluateAll(items => items.every(el => el.classList.contains('scroll-reveal'))));
    const collage = await p.locator('#check-in .stay-photos > figure').evaluateAll(items => items.map(el => {const t=ScrollTrigger.getAll().find(t=>t.trigger===el);return {start:t.start,top:el.offsetTop};}));
    check(name+' collage photographs have distinct entrance positions',new Set(collage.map(t=>t.start)).size===collage.length);
    if(name==='desktop') {
      await scroll(p,0);
      check('desktop photos enter from both layout sides',await p.locator('.postcard:not(.cluster-card), .stay-photos > figure').evaluateAll(items => {const x=items.map(el=>parseFloat(el.style.getPropertyValue('--reveal-x')));return x.some(n=>n<0)&&x.some(n=>n>0);}));
    }
    // Opening the longest note changes layout, but never replaces its reveal.
    const longId = await p.evaluate(() => [...document.querySelectorAll('.note-sheet')].sort((a,b)=>b.textContent.length-a.textContent.length)[0].id);
    const note = p.locator('#'+longId);
    const button = p.locator('[aria-controls="'+longId+'"]');
    await button.scrollIntoViewIfNeeded();await wait(700);await button.click();await wait(600);
    const noteRange = await bounds(note);
    await scroll(p,noteRange.end+10);
    check(name+' long note unfolds fully without clipping its text',await note.evaluate(el=>!el.hidden&&!el.inert&&Number(getComputedStyle(el).opacity)>.999&&!el.style.height&&getComputedStyle(el).overflow!=='hidden'));
    await scroll(p,(noteRange.start+noteRange.end)/2);const noteMid=await sample(note);
    await scroll(p,noteRange.end+10);await scroll(p,(noteRange.start+noteRange.end)/2);
    check(name+' expanded long note reverses along its original path',equal(noteMid,await sample(note)));
    await scroll(p,noteRange.end+10);await button.click();await wait(600);
    check(name+' long note closes with its scroll controller intact',await note.isHidden() && !!await bounds(note));
    // Deck clicks own inner slides; outer travel survives repeated gestures.
    const deck = p.locator('#thao-coffee [data-photo-deck]');
    const deckRange = await bounds(deck);
    await scroll(p,deckRange.end+10);
    for(let i=0;i<4;i++){await deck.locator('.deck-preview:not([hidden])').click();await wait(70);}
    await wait(650);
    const afterDeck = await bounds(deck);
    await scroll(p,(afterDeck.start+afterDeck.end)/2);
    check(name+' photo clicks preserve reversible outer motion',await deck.evaluate(el=>Number(getComputedStyle(el).opacity)>.3&&Number(getComputedStyle(el).opacity)<.8) && await deck.locator('.deck-ghost').count()===0);
    // Keyboard focus temporarily makes useful content visible without killing
    // its scroll trigger; blur returns to the same partial state.
    const link = p.locator('.destination-index a').first();const linkRange=await bounds(link);
    await scroll(p,(linkRange.start+linkRange.end)/2);const beforeFocus=await sample(link);
    await p.keyboard.press('Shift');await link.evaluate(el=>el.focus({preventScroll:true}));await wait(250);
    check(name+' keyboard focus exposes its component',await link.evaluate(el=>el.matches(':focus-visible')&&Number(getComputedStyle(el).opacity)===1));
    await link.evaluate(el=>el.blur());await wait(250);
    check(name+' blur restores scroll progress and future reversal',equal(beforeFocus,await sample(link))&&!!await bounds(link));
    await scroll(p,linkRange.start);check(name+' focused content can still retreat later',(await sample(link)).opacity<.005);
    // Reload and direct-link initialization, without a once-only history.
    await p.goto('http://127.0.0.1:8000/taxua-2026/#day-2');await wait(800);
    check(name+' direct link starts with its heading readable',await p.locator('#day-2 h2').evaluate(el=>Number(getComputedStyle(el).opacity)===1));
    check(name+' direct link leaves future components hidden',await p.locator('#village-cafe h3').evaluate(el=>Number(getComputedStyle(el).opacity)===0));
    await p.reload();await wait(800);
    check(name+' reload preserves a readable destination',await p.locator('#day-2 h2').evaluate(el=>Number(getComputedStyle(el).opacity)===1));
    await p.emulateMedia({media:'print'});
    check(name+' print exposes all foreground content',await p.locator('.scroll-reveal').evaluateAll(items=>items.every(el=>Number(getComputedStyle(el).opacity)===1&&getComputedStyle(el).translate==='none'&&getComputedStyle(el).rotate==='none')));
    await p.emulateMedia({media:'screen',reducedMotion:'reduce'});await wait(300);
    check(name+' reduced motion removes travel and keeps all content visible',await p.evaluate(()=>ScrollTrigger.getAll().length===0&&document.querySelectorAll('.scroll-reveal').length===0));
    if(name==='phone') {
      await p.locator('#navToggle').click();check('reduced-motion phone menu opens',await p.locator('#navLinks').isVisible());
      await p.keyboard.press('Escape');check('reduced-motion phone menu closes',await p.locator('#navLinks').isHidden());
    }
    await context.close();
    // Dedicated recordings have slow physical movement, pauses and reversal,
    // rather than test jumps. Their timestamps form a review contact sheet.
    const recorded = await browser.newContext({viewport,recordVideo:{dir:output,size:viewport}});
    const videoPage = await recorded.newPage();
    await videoPage.goto('http://127.0.0.1:8000/taxua-2026/');await wait(700);
    for(const selector of ['#thao-coffee .postcard','#check-in .stay-photos > figure']) {
      const ranges=await videoPage.locator(selector).evaluateAll(items=>items.map(el=>{const t=ScrollTrigger.getAll().find(t=>t.trigger===el);return {start:t.start,end:t.end};}));
      const r={start:Math.min(...ranges.map(r=>r.start)),end:Math.max(...ranges.map(r=>r.end))};
      await scroll(videoPage,r.start-70);
      await travel(videoPage,r.start-70,r.end+80,selector.includes('stay-photos')?3400:2200);await wait(600);
      await travel(videoPage,r.end+80,r.start-70,selector.includes('stay-photos')?3400:2200);await wait(600);
    }
    const recordedButton=videoPage.locator('[aria-controls="'+longId+'"]');
    await recordedButton.scrollIntoViewIfNeeded();await wait(600);await recordedButton.click();await wait(600);
    const r=await bounds(videoPage.locator('#'+longId));
    await scroll(videoPage,r.start-50);await travel(videoPage,r.start-50,r.end+80);await wait(600);
    await travel(videoPage,r.end+80,r.start-50);await wait(600);
    const video=videoPage.video();await recorded.close();
    const filename=name+'.webm';await video.saveAs(path.join(output,filename));fs.unlinkSync(await video.path());
    report.videos.push(filename);
  }
  check('all reveal scenarios have no uncaught browser errors',report.errors.length===0);
  report.checkCount=report.checks.length;
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
  console.log('Passed '+report.checkCount+' reversible-reveal checks; recordings in review/reveals/.');
})().catch(error=>{console.error(error);process.exit(1);});
