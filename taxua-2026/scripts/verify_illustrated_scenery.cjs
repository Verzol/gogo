/* Painted stage acceptance: real asset decoding, phase correctness, reversible
   blends, fast travel, responsive framing and graceful optional-art failure. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = process.env.TRIP_REVIEW_DIR || path.join(root,'review','illustrated');
const base = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const ids = ['sunrise','night','bluehour','daylight','jade','afternoon'];
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],failedResources:[],optionalWeatherFailures:[],screenshots:[],samples:[]};
fs.mkdirSync(output,{recursive:true});
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const wait = ms => new Promise(r=>setTimeout(r,ms));
async function jump(p,id,within = 0) {
  await p.evaluate(({id,within})=>{const e=document.getElementById(id);const readingOffset=id==='home-breakfast'?e.offsetHeight*.5-innerHeight*.46:within;scrollTo(0,id==='top'?0:e.getBoundingClientRect().top+scrollY+readingOffset);},{id,within});
  await wait(1200);
}
async function state(p) {
  return p.evaluate(()=>[...document.querySelectorAll('.scene-panel')].map(e=>({id:e.dataset.background,opacity:Number(e.style.opacity),z:Number(e.style.zIndex)})));
}
function visible(items) {return items.filter(e=>e.opacity>.5).sort((a,b)=>b.z-a.z)[0]?.id;}
async function shot(p,name) {
  await p.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');
}
(async()=>{
  const browser = await chromium.launch();
  for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['narrow',320,780],['tablet',768,1024],['wide',2560,1080],['landscape',844,390]]) {
    const p = await browser.newPage({viewport:{width,height}});
    p.on('pageerror',e=>report.errors.push(e.stack));
    // Optional forecasts can still be in flight when a scenery-only page closes.
    const failedResource = url => (url.startsWith('https://api.open-meteo.com/') ? report.optionalWeatherFailures : report.failedResources).push(url);
    p.on('requestfailed',r=>failedResource(r.url()));
    p.on('response',r=>{if(r.status()>=400) failedResource(r.url());});
    await p.goto(base);await p.evaluate(()=>document.fonts.ready);await wait(1000);
    await p.evaluate(ids=>Promise.all(ids.map(id=>JourneyUI.loadBackground(id))),ids);
    check(name+' all six composed scenes decode',await p.locator('.scene-panel').evaluateAll(items=>items.length===6&&items.every(p=>p.dataset.ready==='true'&&[...p.querySelectorAll('img')].every(i=>i.naturalWidth>0))));
    check(name+' photographic backgrounds are absent',await p.locator('#scenery img').evaluateAll(items=>items.every(i=>!i.src.includes('/backgrounds/')&&i.src.includes('/scenery/painted/'))));
    check(name+' scenery is full width with no blur',await p.locator('#scenery').evaluate(el=>el.getBoundingClientRect().width===innerWidth&&getComputedStyle(el).filter==='none'));
    check(name+' mountain framing does not bury the opening words',await p.evaluate(()=>{if(innerHeight<=520&&innerWidth>innerHeight){const range=document.createRange();range.selectNodeContents(document.getElementById('heroSky'));return getComputedStyle(document.querySelector('.scene-sunrise .painted-terrain')).maskImage!=='none'&&range.getBoundingClientRect().right<innerWidth*.75;}return document.querySelector('.scene-sunrise .ridge-far').getBoundingClientRect().top>document.getElementById('heroTitle').getBoundingClientRect().bottom;}));
    check(name+' no horizontal overflow at opening',await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
    await shot(p,name+'-opening');
    // Dawn variants develop within a night chapter; breakfast never inherits
    // the fully starry night merely because it shares a broad chapter tag.
    check(name+' scheduled lighting respects morning stops',await p.evaluate(()=>JourneyUI.sceneFor(document.getElementById('room-clouds')).background==='bluehour'&&['home-breakfast','last-breakfast'].every(id=>JourneyUI.sceneFor(document.getElementById(id)).background==='jade')));
    if(['desktop','phone'].includes(name)) {
      for(const [id,expected] of [['departure','night'],['thao-coffee','jade'],['ameii','afternoon'],['stars','night'],['dinosaur-ridge','daylight'],['khe-cai','bluehour'],['fund','jade']]) {
        // Sample the first ticket before the intentional pre-arrival blend.
        await jump(p,id,100);
        check(name+' settled scene at '+id,visible(await state(p))===expected);
        check(name+' no overflow at '+id,await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
        await shot(p,name+'-'+id);
      }
      const samples=[];
      // Small physical steps reconstruct a continuous blend in both directions.
      const departureTop=await p.locator('#departure').evaluate(e=>e.getBoundingClientRect().top+scrollY);
      for(let y=0;y<departureTop+height*.25;y+=height*.1){await p.evaluate(y=>scrollTo(0,y),y);await wait(650);samples.push({y,layers:await state(p)});}
      const partial=samples.filter(s=>s.layers.some(i=>i.id==='night'&&i.opacity>.03&&i.opacity<.97));
      check(name+' opening blend spans several scroll steps',partial.length>=3);
      check(name+' dissolves always retain opaque coverage',samples.every(s=>s.layers.some(i=>i.opacity===1)));
      const midpoint=partial[Math.floor(partial.length/2)];await p.evaluate(y=>scrollTo(0,y),midpoint.y);await wait(750);
      check(name+' reverse scroll reproduces the same scenery blend',(await state(p)).every((e,i)=>Math.abs(e.opacity-midpoint.layers[i].opacity)<.015));
      report.samples.push({name,samples});
      // The date rail now belongs to the itinerary on desktop as well.
      await jump(p,'departure');
      await p.locator('[data-chapter="day-3"]').click();await wait(120);
      check(name+' distant navigation retains a frozen outgoing composition',await p.locator('.navigation-scene').count()===1);
      check(name+' navigation goes directly to destination scenery',(await state(p)).filter(i=>i.opacity>0).every(i=>i.id==='bluehour'));
      await wait(1500);
      check(name+' navigation finishes with focus and clears snapshots',await p.evaluate(()=>document.activeElement.id==='day-3')&&await p.locator('.navigation-scene,.scene-catchup').count()===0);
      await p.locator('[data-chapter="day-0"]').click();await wait(100);await p.mouse.wheel(0,80);await wait(1000);
      check(name+' wheel input interrupts navigation cleanly',await p.locator('.navigation-scene').count()===0);
      await jump(p,'home-breakfast');
      await jump(p,'meadow');await jump(p,'home-breakfast');
      check(name+' returning to breakfast restores a daylight scene',visible(await state(p))==='jade');
    }
    await jump(p,'packing',80);await shot(p,name+'-packing');
    check(name+' supporting content remains in bounds',await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
    await p.close();
  }
  for(const mode of ['reduce','missing-gsap','file','cold-http']) {
    const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:mode==='reduce'?'reduce':'no-preference'});
    p.on('pageerror',e=>report.errors.push(e.stack));
    if(mode==='missing-gsap') await p.route('**/vendor/gsap.min.js',r=>r.fulfill({contentType:'application/javascript',body:'// optional enhancement disabled'}));
    await p.goto(mode==='file'?'file://'+path.join(root,'index.html'):base);await wait(1000);
    await jump(p,'home-breakfast');
    check(mode+' scenery still follows morning lighting',visible(await state(p))==='jade');
    check(mode+' all 24 events remain available',await p.locator('.event').count()===24);
    if(['reduce','missing-gsap'].includes(mode))check(mode+' content stays visible without motion',await p.locator('#home-breakfast h3').evaluate(e=>Number(getComputedStyle(e).opacity)===1));
    await p.emulateMedia({media:'print'});
    check(mode+' print exposes content and hides the scenery',await p.locator('#scenery').isHidden()&&await p.locator('#home-breakfast h3').evaluate(e=>Number(getComputedStyle(e).opacity)===1));
    await p.close();
  }
  // A cutout failure falls back to the scalable sky rather than a stuck veil.
  const broken=await browser.newPage();
  broken.on('pageerror',e=>report.errors.push(e.stack));
  await broken.route('**/ridge_far_bluehour.webp',r=>r.fulfill({status:200,contentType:'image/webp',body:'invalid image fixture'}));
  await broken.goto(base);await broken.evaluate(()=>document.fonts.ready);await wait(1000);await jump(broken,'khe-cai',100);
  await broken.waitForFunction(()=>document.querySelector('.scene-bluehour').dataset.ready==='true' && Number(document.querySelector('.scene-bluehour').style.opacity)===1 && document.querySelectorAll('.scene-catchup,.navigation-scene').length===0);
  check('failed optional cutout keeps an opaque blue-hour sky',visible(await state(broken))==='bluehour'&&await broken.locator('.scene-catchup,.navigation-scene').count()===0);
  await jump(broken,'fund');check('scrolling continues after failed artwork',visible(await state(broken))==='jade');await broken.close();
  const delayed=await browser.newPage();
  let release;const gate=new Promise(r=>release=r);
  await delayed.route('**/ridge_far_bluehour.webp',async r=>{await gate;await r.continue();});
  await delayed.goto(base,{waitUntil:'domcontentloaded'});await wait(1000);
  await jump(delayed,'departure');
  await delayed.locator('[data-chapter="day-3"]').click();await wait(1400);
  check('navigation waits with outgoing composition while a layer decodes',await delayed.locator('.navigation-scene').count()===1);
  release();await wait(1600);
  check('late layer completes navigation and removes its snapshot',await delayed.locator('.navigation-scene').count()===0&&visible(await state(delayed))==='bluehour');await delayed.close();
  check('normal scenarios have no browser errors',report.errors.length===0);
  check('normal scenarios have no failed resources',report.failedResources.length===0);
  report.checkCount=report.checks.length;
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
  const links=report.screenshots.map(f=>`<figure><img src="${f}" loading="lazy" alt="${f.replace(/[-.]/g,' ')}"><figcaption>${f}</figcaption></figure>`).join('');
  fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Painted scenery review</title><style>body{margin:30px;background:#173c46;color:#fffdf7;font:16px system-ui}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}figure{margin:0}img{width:100%;height:auto}figcaption{margin:8px 0}</style><h1>Painted scenery review</h1><p>${report.checkCount} browser checks passed. ${report.checkedAt}</p><main>${links}</main></html>`);
  await browser.close();console.log('Passed '+report.checkCount+' painted scenery checks; review/illustrated/.');
})().catch(e=>{console.error(e);process.exit(1);});
