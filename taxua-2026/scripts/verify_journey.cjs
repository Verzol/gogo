/* Optional behavioral verification; no runtime/build dependency.
   Reuses the sibling Playwright installation unless PLAYWRIGHT_PATH is set.
   Requires the existing static preview on :8000. Evidence goes in review/. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = process.env.TRIP_REVIEW_DIR || path.join(root,'review');
fs.mkdirSync(output,{recursive:true});
const manifest = JSON.parse(fs.readFileSync(path.join(root,'data/sources/selected-place-photos.json'),'utf8').replace(/^\uFEFF/,''));
const schedule = JSON.parse(fs.readFileSync(path.join(root,'data/sources/schedule.json'),'utf8')).values;
const requiredRows = [7,9,10,11,12,13,14,15,16,18,19,20,21,22,23,24,25,26,27,29,30,31,32,33];
const result = {browser:'Chromium via Playwright',timestamp:new Date().toISOString(),checks:[],screenshots:[],viewports:[]};
const check = (name,condition) => {assert.ok(condition,name);result.checks.push(name);};
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const htmlTime = raw => raw ? raw.trim().split('-').map(t=>{const [h,m]=t.trim().split('h');return h.padStart(2,'0')+':'+(m||'00').padStart(2,'0');}).join('-') : null;
(async () => {
  const browser = await chromium.launch({headless:true});
  const errors = [], consoleErrors = [], failedResources = [], interruptedResources = [];
  const stubWeather = p => p.route('https://api.open-meteo.com/**',r=>r.fulfill({json:{daily:{time:['2026-10-23','2026-10-24','2026-10-25'],weather_code:[0,63,73],temperature_2m_min:[12,13,11],temperature_2m_max:[18,20,17]}}}));
  async function page(options = {}) {
    const p = await browser.newPage({viewport:{width:1440,height:900},...options});
    p.on('pageerror',error=>errors.push(error.message));
    p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    p.on('requestfailed',r=>{
      const error = r.failure()?.errorText;
      // Responsive image swaps, removed cloud copies and page reloads can
      // cancel an in-flight request. Check those URLs separately below.
      (error === 'net::ERR_ABORTED' ? interruptedResources : failedResources).push({url:r.url(),error});
    });
    p.on('response',r=>{if(r.status()>=400)failedResources.push(r.url());});
    await stubWeather(p);await p.goto('http://127.0.0.1:8000/taxua-2026/');
    await p.evaluate(()=>document.fonts.ready);await sleep(250);
    return p;
  }
  async function jump(p,id) {
    await p.evaluate(id=>window.scrollTo(0,id==='top'?0:document.getElementById(id).getBoundingClientRect().top+scrollY-(innerWidth<768?155:115)),id);
    await sleep(1100);
  }
  async function state(p) {
    return p.evaluate(()=>({
      phase:document.documentElement.dataset.scene,
      photos:[...document.querySelectorAll('.scene-panel')].map(i=>Number(getComputedStyle(i).opacity).toFixed(3)),
      chapter:document.querySelector('[data-chapter][aria-current]')?.dataset.chapter,
      progress:Number(document.querySelector('.chapter-progress').style.getPropertyValue('--progress')).toFixed(4)
    }));
  }
  async function shot(p,name) {await p.screenshot({path:path.join(output,name+'.png')});result.screenshots.push(name+'.png');}
  const p = await page();
  const blocks = await p.evaluate(()=>TRIP_DATA.days.flatMap(d=>d.blocks));
  check('All 24 source events remain in detailed-sheet order',JSON.stringify(blocks.map(b=>b.sourceRow))===JSON.stringify(requiredRows));
  check('Confirmed times exactly match the source snapshot',blocks.every(b=>b.time===htmlTime(schedule[b.sourceRow-1][2])));
  check('Untimed and optional events retain their meaning',blocks.filter(b=>b.time===null).length===requiredRows.filter(row=>!schedule[row-1][2]).length && ['lake','room-clouds','stars'].every(id=>blocks.find(b=>b.id===id).optional));
  check('All events are continuously available',await p.locator('.event').count()===24 && await p.locator('.event[hidden]').count()===0);
  const coverage = await p.locator('[data-stop-id]').evaluateAll(a=>[...new Set(a.map(e=>e.dataset.stopId))]);
  check('All 18 unique stops retain their selected photo coverage',coverage.length===18 && manifest.stops.every(s=>coverage.includes(s.stopId)));
  check('All 23 selected photographs are represented',await p.locator('figure[data-asset-id]').evaluateAll(a=>new Set(a.map(e=>e.dataset.assetId)).size)===23);
  check('Combined village café retains both nearby labels',await p.locator('[data-stop-id="lang_van_hoa_cafe"]').count()===1 && await p.locator('#village-cafe .nearby span').count()===2);
  check('P16-P18 room photos and labels remain available',await p.locator('#check-in [data-asset-id]').evaluateAll(a=>a.map(e=>e.dataset.assetId).join(','))==='P16,P17,P18' && /Best view 2/.test(await p.locator('#check-in').textContent()) && /Best view 4/.test(await p.locator('#check-in').textContent()));
  check('Dinner/stargazing conflict stays visible',await p.locator('#stars .warning').isVisible() && /19:15/.test(await p.locator('#stars .warning').textContent()));
  check('No theme selector or persistent artificial scenery remains',await p.locator('[data-theme-choice],.scene-ridges,.scene-cloud,.scene-mist,.scene-wash').count()===0);
  check('Desktop topbar shows seven local icons and all destinations are named',await p.locator('.nav-links a svg.lucide:visible').count()===7 && await p.locator('.nav-links a').evaluateAll(a=>a.every(e=>e.getAttribute('aria-label'))));
  check('Fund and wheel shortcuts are visible on desktop',await p.locator('#navLinks a[href="#fund"]').isVisible() && await p.locator('#navLinks a[href="#cloudWheel"]').isVisible());
  check('Text-only stops use the full desktop reading width',await p.locator('.event[data-visual="text"]:not(.event--transit) .event-body').evaluateAll(a=>a.length>0 && a.every(e=>e.getBoundingClientRect().width>=400)));
  check('Every Lucide symbol resolves locally',await p.locator('svg.lucide use').evaluateAll(a=>a.every(e=>document.querySelector(e.getAttribute('href')))));
  check('Primary card/navigation containers are transparent and unblurred',await p.locator('.nav,.event-body,.postcard,.section-heading,.member,.packing,.dish,.footer').evaluateAll(a=>a.every(e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)' && getComputedStyle(e).backdropFilter==='none')));
  for (const block of blocks) {
    await jump(p,block.id);
    check('Exact time or explicit uncertainty remains at '+block.id,block.time!==null ? await p.locator('#'+block.id+' .event-meta time').textContent()===block.time : /Chưa chốt giờ/.test(await p.locator('#'+block.id+' .event-meta').textContent()));
    const displayedNote = block.storyNote === undefined ? block.note : block.storyNote;
    if (displayedNote) {
      const button=p.locator('#'+block.id+' [data-note-toggle]');
      const sheet=p.locator('#note-'+block.id);
      await button.click();await sleep(450);
      check('Unfolded note preserves useful logistics at '+block.id,await button.getAttribute('aria-expanded')==='true' && await sheet.isVisible() && await sheet.textContent()===displayedNote);
      await button.click();await sleep(450);
      check('Note closes without discarding text at '+block.id,await sheet.isHidden() && await button.getAttribute('aria-expanded')==='false');
    }
    const deck=p.locator('#'+block.id+' [data-photo-deck]');
    if(await deck.count()) {
      for(let i=0;i<block.photoIds.length;i++) {
        const visible=deck.locator('.deck-slide:not([hidden])');
        await visible.locator('img').evaluate(i=>i.decode());
        check('Photo deck reveals the correct source image '+block.photoIds[i],await visible.locator('figure').getAttribute('data-asset-id')===block.photoIds[i] && await deck.locator('.deck-count').textContent()==='Góc '+(i+1)+' / '+block.photoIds.length);
        await deck.locator('[data-photo-step="1"]').click();await sleep(450);
      }
      await deck.locator('[data-photo-step="-1"]').click();await sleep(450);
      check('Previous photo wraps to last view at '+block.id,await deck.locator('.deck-slide:not([hidden]) figure').getAttribute('data-asset-id')===block.photoIds.at(-1));
      await deck.locator('[data-photo-step="1"]').click();await sleep(450);
    }
    await p.locator('#'+block.id+' img.photo:visible').evaluateAll(a=>Promise.all(a.map(i=>i.decode().catch(()=>{}))));
  }
  for (const id of ['top','departure','thao-coffee','waterfall','vi-nha','ameii','a-phu','stars','room-clouds','dinosaur-ridge','thang-10','khe-cai','village-cafe']) {
    await jump(p,id);const before=await state(p);
    await jump(p,'homeward');await jump(p,id);const after=await state(p);
    check('Scrolling back restores the same scene and chapter at '+id,JSON.stringify(before)===JSON.stringify(after));
    check('Scenery retains opaque coverage and unfiltered color at '+id,await p.locator('.scene-panel').evaluateAll(a=>a.some(i=>Number(getComputedStyle(i).opacity)>.999) && a.every(i=>getComputedStyle(i).filter==='none')));
  }
  for (const [id,phase] of [['departure','night'],['thao-coffee','dawn'],['vi-nha','noon'],['ameii','afternoon'],['a-phu','evening'],['room-clouds','predawn'],['dinosaur-ridge','morning'],['thang-10','night'],['khe-cai','predawn'],['village-cafe','morning']]) {
    await jump(p,id);check('Story scene follows scheduled period at '+id,(await state(p)).phase===phase);
  }
  await p.evaluate(()=>{const e=document.getElementById('khe-cai');window.scrollTo(0,e.getBoundingClientRect().top+scrollY+e.offsetHeight*.8-innerHeight*.46);});await sleep(1100);
  check('Khe Cải develops into the third-day dawn',(await state(p)).phase==='dawn');
  await shot(p,'desktop-second-dawn');
  for(const day of ['day-1','day-2','day-3']) {
    await p.locator('[data-chapter="'+day+'"]').click();await sleep(1400);
    check('Direct day link synchronizes scenery and active date '+day,(await state(p)).chapter===day);
  }
  await jump(p,'packing');await p.locator('#packingList input').first().check();
  check('Packing choices update status and persist',await p.locator('#packingStatus').textContent()==='Đã chuẩn bị 1/7 món' && JSON.parse(await p.evaluate(()=>localStorage.getItem('taxua-2026-packing'))).length===1);
  await p.reload();await sleep(250);check('Packing survives reload',await p.locator('#packingList input').first().isChecked());
  await p.locator('#packingList input').first().uncheck();
  await p.evaluate(()=>localStorage.setItem('taxua-2026-theme','dark'));await p.reload();await sleep(250);
  const light=await state(p);await p.emulateMedia({colorScheme:'dark'});await sleep(100);
  check('Legacy saved theme and device preference cannot change the design',await p.locator('[data-theme]').count()===0 && JSON.stringify(light)===JSON.stringify(await state(p)));
  await p.evaluate(()=>localStorage.clear());
  await p.emulateMedia({colorScheme:'light'});
  for(const viewport of [{width:2560,height:1080},{width:1024,height:768},{width:390,height:844},{width:844,height:390},{width:320,height:780},{width:1440,height:900}]) {
    await p.setViewportSize(viewport);await sleep(350);
    check('No overflow after resize '+viewport.width+'x'+viewport.height,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    check('Resize removes old motion contexts at '+viewport.width,await p.evaluate(()=>{const all=ScrollTrigger.getAll();const arrivals=all.filter(t=>t.vars.scrub!==.55);return all.filter(t=>t.vars.scrub===.55).length===1 && new Set(arrivals.map(t=>t.trigger)).size===arrivals.length;}));
    check('Background covers the full viewport at '+viewport.width,await p.locator('#scenery').evaluate(e=>{const r=e.getBoundingClientRect();return r.width===innerWidth && r.height===innerHeight;}));
  }
  await p.close();
  for(const [name,viewport] of [['desktop',{width:1440,height:900}],['wide',{width:2560,height:1080}],['phone',{width:390,height:844}],['narrow',{width:320,height:780}]]) {
    console.log('Reviewing '+name+' full journey');
    const q=await page({viewport});result.viewports.push(viewport);
    const ids=['top',...blocks.map(b=>b.id),'crew','fund','packing','destinations','food','practical'];
    for(const id of ids) {
      await jump(q,id);
      check('Full-page responsive layout stays inside '+name+' viewport at '+id,await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await q.locator('#'+id+' img[src]:visible').evaluateAll(a=>Promise.all(a.map(i=>i.decode().catch(()=>{}))));
      if(['top','waterfall','thao-coffee','vi-nha','check-in','ameii','a-phu','thang-10','khe-cai','village-cafe','lake','afternoon-cluster','town-lunch','crew','packing','destinations','food','practical'].includes(id))await shot(q,name+'-'+id);
    }
    await q.locator('.footer').scrollIntoViewIfNeeded();await sleep(1100);await shot(q,name+'-footer');
    const bad=await q.locator('img[src]').evaluateAll(a=>a.filter(i=>i.complete && !i.naturalWidth).map(i=>i.getAttribute('src')));
    check('Every delivered image resolves across '+name+' journey: '+JSON.stringify(bad),bad.length===0);
    if(viewport.width<768) {
      for(const id of ['F01','F02','F03']) {
        const figure=q.locator('[data-asset-id="'+id+'"]').first();await figure.scrollIntoViewIfNeeded();
        check(name+' illustrative caption remains exact and readable for '+id,await figure.locator('figcaption').textContent()===manifest.assets.find(a=>a.assetId===id).captionVi && await figure.locator('figcaption').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=12));
      }
      await jump(q,'packing');
      check(name+' support anchors clear navigation and hide itinerary-only dates',await q.locator('#packing').evaluate(e=>e.getBoundingClientRect().top >= document.querySelector('.nav').getBoundingClientRect().bottom) && await q.locator('.chapter-nav').evaluate(e=>getComputedStyle(e).visibility==='hidden' && e.inert));
      await q.locator('#navToggle').click();
      check(name+' menu opens with named icon links',await q.locator('#navLinks').isVisible() && await q.locator('#navToggle').getAttribute('aria-expanded')==='true');
      await shot(q,name+'-menu');await q.keyboard.press('Escape');await sleep(250);
      check(name+' Escape closes menu and restores focus',await q.locator('#navLinks').isHidden() && await q.locator('#navToggle').evaluate(e=>document.activeElement===e));
      await q.locator('#navToggle').click();await q.locator('#navLinks a[href="#crew"]').click();await sleep(1200);
      check(name+' menu closes after navigation',await q.locator('#navToggle').getAttribute('aria-expanded')==='false');
      await q.evaluate(()=>document.documentElement.style.fontSize='20px');
      for(const id of ['top','crew','packing','practical']){await jump(q,id);check(name+' enlarged text stays inside viewport at '+id,await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
    }
    await q.close();
  }
  const keyboard=await page();await keyboard.keyboard.press('Tab');
  check('Keyboard skip link is reachable',await keyboard.evaluate(()=>document.activeElement.className)==='skip-link');
  await keyboard.keyboard.press('Enter');await sleep(150);check('Skip link reaches the itinerary',await keyboard.evaluate(()=>location.hash)==='#itinerary');
  await jump(keyboard,'departure');await keyboard.locator('#departure [data-note-toggle]').focus();await keyboard.keyboard.press('Space');
  check('Notebook tab operates by keyboard',await keyboard.locator('#note-departure').isVisible());await keyboard.close();
  const reduced=await page({viewport:{width:390,height:844},reducedMotion:'reduce'});
  check('Reduced motion has no scroll timelines or pinning',await reduced.evaluate(()=>ScrollTrigger.getAll().length)===0 && await reduced.locator('.pin-spacer').count()===0);
  for(const [id,phase] of [['room-clouds','predawn'],['village-cafe','morning'],['town-lunch','noon'],['departure','night'],['top','opening']]){await jump(reduced,id);check('Reduced-motion scene works on direct jump to '+id,(await state(reduced)).phase===phase);}
  await jump(reduced,'khe-cai');await reduced.evaluate(()=>{const e=document.getElementById('khe-cai');scrollTo(0,e.getBoundingClientRect().top+scrollY+e.offsetHeight*.85-innerHeight*.46);});await sleep(150);
  check('Reduced-motion fallback retains the later dawn',(await state(reduced)).phase==='dawn');await reduced.close();
  const failed=await browser.newPage({viewport:{width:390,height:844}});failed.on('pageerror',e=>errors.push(e.message));
  await failed.route('**/vendor/{gsap,ScrollTrigger}.min.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:'// optional motion library unavailable'}));
  await failed.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage denied for verification');}}));
  await stubWeather(failed);await failed.goto('http://127.0.0.1:8000/taxua-2026/');await sleep(250);
  check('All events render without animation and with denied storage',await failed.locator('.event').count()===24 && await failed.evaluate(()=>!window.gsap));
  await jump(failed,'departure');await failed.locator('#departure [data-note-toggle]').click();check('Notes work without animation dependency',await failed.locator('#note-departure').isVisible());
  await jump(failed,'packing');await failed.locator('#packingList input').first().check();check('Packing works when storage is denied',await failed.locator('#packingStatus').textContent()==='Đã chuẩn bị 1/7 món');
  await jump(failed,'village-cafe');check('Fallback synchronizes a distant direct day jump',(await state(failed)).chapter==='day-3');await failed.close();
  const file=await browser.newPage({viewport:{width:390,height:844}});file.on('pageerror',e=>errors.push(e.message));await stubWeather(file);await file.goto('file://'+path.join(root,'index.html'));await sleep(250);
  check('Direct-file opening retains the full itinerary, icons and local GSAP',await file.locator('.event').count()===24 && await file.locator('.nav-links a svg.lucide').count()===8 && await file.evaluate(()=>window.gsap?.version)==='3.15.0');
  await jump(file,'village-cafe');await file.locator('[data-asset-id="F01"] img').evaluate(i=>i.decode());check('Direct-file photography resolves',await file.locator('[data-asset-id="F01"] img').evaluate(i=>i.naturalWidth>0));await file.close();
  const portrait=await browser.newPage();portrait.on('pageerror',e=>errors.push(e.message));await portrait.route('**/data.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,'data.js'),'utf8')+';TRIP_DATA.members[0].image="figures/people/optional-missing.jpg";'}));await stubWeather(portrait);await portrait.goto('http://127.0.0.1:8000/taxua-2026/');await portrait.locator('#crew').scrollIntoViewIfNeeded();await sleep(150);
  const fallbackMember = portrait.locator('.member').filter({has:portrait.locator('h3',{hasText:/^san$/})});
  await fallbackMember.scrollIntoViewIfNeeded();
  await fallbackMember.locator('.avatar:not(.has-portrait)').waitFor();
  check('Unavailable optional crew portrait falls back to initials for the affected member',await fallbackMember.locator('.avatar').textContent()==='S' && await fallbackMember.locator('.avatar img').count()===0 && await portrait.locator('.member .avatar img').count()===6);await portrait.close();
  const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto('file://'+path.join(root,'index.html'));check('No-JavaScript fallback remains reachable',await nojs.locator('noscript a').isVisible());await nojs.locator('noscript a').click();check('No-JavaScript reading copy contains every event',await nojs.locator('article').count()===24);await nojs.close();
  const delivery = await browser.newContext();
  for (const url of new Set(interruptedResources.map(resource=>resource.url))) {
    const response = await delivery.request.get(url);
    check('Browser-canceled responsive asset still resolves: '+url,response.ok() && (await response.body()).length>0);
  }
  await delivery.close();
  check('No unexpected JavaScript errors in any scenario',errors.length===0);
  if (consoleErrors.length || failedResources.length) {
    fs.writeFileSync(path.join(output,'resource-failures.json'),JSON.stringify({consoleErrors,failedResources},null,2)+'\n');
  }
  check('No ordinary-run console errors or failed resources: '+JSON.stringify({consoleErrors,failedResources}),consoleErrors.length===0 && failedResources.length===0);
  result.checkCount=result.checks.length;result.errorCount=errors.length;result.consoleErrors=consoleErrors;result.failedResources=failedResources;result.interruptedResources=interruptedResources;
  fs.writeFileSync(path.join(output,'browser-checks.json'),JSON.stringify(result,null,2)+'\n');
  await browser.close();console.log('Passed '+result.checks.length+' behavioral browser checks. Evidence and screenshots are in review/.');
})().catch(error=>{console.error(error);process.exit(1);});
