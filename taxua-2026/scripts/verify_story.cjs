/* Focused review for researched place copy, chapter pacing and fast flings.
   Optional maintenance helper; uses the existing static preview on :8000. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'review/story');
fs.mkdirSync(output,{recursive:true});
const report = {timestamp:new Date().toISOString(),checks:[],measurements:[],screenshots:[],errors:[]};
const check = (name,ok) => {assert.ok(ok,name);report.checks.push(name);};
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
const groups = [
  ['thao-coffee','waterfall','vi-nha'], ['check-in','ameii','a-phu'],
  ['home-breakfast'], ['dinosaur-ridge','lake','bep-cui','room-change'],
  ['meadow','afternoon-cluster','doi-may'], ['day-3','khe-cai'],
  ['last-breakfast','village-cafe','town-lunch','homeward','fund','crew']
];
async function jump(p,id) {
  await p.evaluate(id=>{const el=document.getElementById(id);scrollTo(0,el.getBoundingClientRect().top+scrollY-110);},id);
  await wait(1250);
}
async function scenery(p) {
  return p.locator('.scene-panel').evaluateAll(images=>images.filter(i=>Number(i.style.opacity)>.99).sort((a,b)=>Number(b.style.zIndex)-Number(a.style.zIndex))[0]?.dataset.background);
}
(async()=>{
  const browser = await chromium.launch({headless:true});
  for(const [name,width,baseline] of [['desktop',1440,16264],['phone',390,20773]]) {
    const p = await browser.newPage({viewport:{width,height:900}});
    p.on('pageerror',e=>report.errors.push(e.message));
    await p.goto('http://127.0.0.1:8000/taxua-2026/');await p.evaluate(()=>document.fonts.ready);await wait(500);
    const guides = await p.evaluate(()=>Object.values(TRIP_DATA.placeGuides));
    check(name+' all 18 places have sourced introductions',guides.length===18 && guides.every(g=>g.paragraphs.length>=2 && g.source.url.startsWith('https://')));
    check(name+' each place introduction appears once in the story',await p.locator('.event .place-source').count()===18);
    check(name+' no repeated arrival clock in arrival copy',await p.locator('#arrival .story-cue').textContent().then(t=>!t.includes('03:00')));
    check(name+' unrelated Mộc Châu/fireworks note is absent from story',!/Mộc Châu|pháo hoa/.test(await p.locator('#daysList').textContent()));
    check(name+' optional and unknown times remain explicit',await p.locator('.event-meta .optional').count()===3 && await p.locator('.time-stamp small').count()===6);
    check(name+' live music remains unconfirmed',await p.locator('#note-thang-10').textContent().then(t=>t.includes('chưa được xác nhận')));
    check(name+' shared afternoon has three individual anchors',await p.locator('.cluster-card[id]').count()===3);
    const measurement = await p.evaluate(()=>({width:innerWidth,viewportHeight:innerHeight,storyHeight:document.getElementById('daysList').offsetHeight,clusterHeight:document.getElementById('afternoon-cluster').offsetHeight}));
    measurement.growth=measurement.storyHeight/baseline-1;report.measurements.push(measurement);
    check(name+' travel story gives substantially more scroll room',measurement.growth>=.35 && measurement.growth<.65);
    check(name+' clustered stops have space for separate reading moments',measurement.clusterHeight>measurement.viewportHeight*3);
    // A chapter must actually hold its photograph while visiting its stops.
    for(const group of groups) {
      const seen=[];
      for(const id of group) {await jump(p,id);seen.push(await scenery(p));}
      check(name+' one scenery chapter holds across '+group.join(', '),new Set(seen).size===1);
    }
    await p.evaluate(()=>Promise.all(['jade','daylight','night','bluehour','afternoon'].map(id=>JourneyUI.loadBackground(id))));
    await jump(p,'departure');
    await p.evaluate(()=>scrollTo(0,document.getElementById('meadow').getBoundingClientRect().top+scrollY+50));
    await wait(120);
    check(name+' fast jump keeps one outgoing snapshot while dissolving',await p.locator('#sceneLayers > .scene-catchup').count()===1);
    const samples=[];
    for(let i=0;i<5;i++) {samples.push(await p.locator('.scene-panel').evaluateAll(a=>a.filter(i=>Number(i.style.opacity)>.01).map(i=>i.dataset.background)));await wait(170);}
    check(name+' fast jump skips all crossed scenery',samples.every(ids=>ids.length===1 && ids[0]==='afternoon'));
    await wait(400);
    check(name+' fast jump clears temporary layers',await p.locator('.scene-catchup').count()===0);
    for(const id of ['waterfall','place-cay_co_don','place-lan_co_don','place-mom_ca_heo','khe-cai']) {
      await jump(p,id);
      const y=await p.locator('#'+id+' .event-body').evaluate(e=>e.getBoundingClientRect().top+scrollY-170);
      await p.evaluate(y=>scrollTo(0,y),y);await wait(1200);
      const filename=name+'-'+id+'.png';await p.screenshot({path:path.join(output,filename)});report.screenshots.push(filename);
      check(name+' story stop stays within viewport '+id,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await p.goto('http://127.0.0.1:8000/taxua-2026/itinerary.html#schedule-2');
    check(name+' full schedule remains accessible with all 24 events',await p.locator('article').count()===24 && await p.locator('#schedule-2').count()===1);
    check(name+' reading copy includes all place introductions',await p.locator('a').filter({hasText:'Đọc thêm'}).count()===18);
    await p.close();
  }
  // A failed photograph must not leave a permanent catch-up veil, and later
  // chapters still need to work when the visitor continues scrolling.
  const failed=await browser.newPage();failed.on('pageerror',e=>report.errors.push(e.message));
  await failed.route('**/ridge_far_bluehour.webp',r=>r.fulfill({status:200,contentType:'image/webp',body:'invalid image fixture'}));
  await failed.goto('http://127.0.0.1:8000/taxua-2026/');await wait(500);
  await jump(failed,'day-3');
  check('Failed manual destination clears the temporary overlay',await failed.locator('.scene-catchup').count()===0);
  check('Failed manual destination preserves an opaque photo',await failed.locator('.scene-panel').evaluateAll(a=>a.some(i=>i.dataset.ready && Number(i.style.opacity)===1)));
  await jump(failed,'town-lunch');
  check('Scrolling continues after failed scenery decode',await scenery(failed)==='jade' && await failed.locator('.scene-catchup').count()===0);
  await failed.close();
  check('Story review has no unexpected JavaScript errors',report.errors.length===0);
  report.checkCount=report.checks.length;
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();console.log('Passed '+report.checkCount+' story checks. Evidence in review/story/.');
})().catch(e=>{console.error(e);process.exit(1);});
