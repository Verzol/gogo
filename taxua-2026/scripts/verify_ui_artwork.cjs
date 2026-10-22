/* Integrated checks for the supplied art and the five journal improvements.
   Uses the existing static server; writes review evidence outside the repo. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const base = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-ui-artwork-review';
fs.mkdirSync(output,{recursive:true});
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],failedResources:[],screenshots:[],measurements:[]};
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
const manifest = JSON.parse(fs.readFileSync(path.join(root,'data/sources/ui-artwork.json')));
async function jump(p,id) {
  await p.locator('#'+id).evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY-parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)));
  await wait(650);
}
async function shot(p,name) {
  await p.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');
}
(async()=>{
  for (const [name,source] of Object.entries(manifest.sources)) {
    const raw = path.join(root,source.path);
    check(name+' master hash is preserved',fs.lstatSync(raw).isFile() && crypto.createHash('sha256').update(fs.readFileSync(raw)).digest('hex')===source.sha256);
  }
  check('all thirteen cutouts and derived terrain palettes exist without upscaling',Object.values(manifest.assets).length===13 && Object.values(manifest.assets).every(a=>fs.existsSync(path.join(root,a.src)) && a.size[0]<=a.inputSize[0] && a.size[1]<=a.inputSize[1]));
  const browser = await chromium.launch();
  try {
    for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['narrow',320,780],['landscape',844,390]]) {
      const p = await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
      p.on('pageerror',e=>report.errors.push(name+': '+e.message));
      p.on('response',r=>{if(r.status()>=400 && r.url().startsWith(base))report.failedResources.push(r.url());});
      await p.route('https://api.open-meteo.com/**',r=>r.fulfill({json:{}}));
      await p.goto(base);await p.evaluate(()=>document.fonts.ready);await wait(600);
      check(name+' trail is unavailable outside the itinerary',await p.locator('.chapter-nav').evaluate(e=>e.inert && getComputedStyle(e).visibility==='hidden'));
      check(name+' all events and expanded guides remain',await p.locator('.event').count()===24 && await p.locator('.place-source').count()===18 && await p.locator('#daysList [data-guide-toggle],#daysList [data-bookmark]').count()===0);
      check(name+' trail retains all real times and native stop anchors',await p.evaluate(()=>TRIP_DATA.days.every((day,index)=>day.blocks.every(block=>{
        const a=document.querySelector('[data-trail-day="day-'+index+'"] [data-trail-stop="'+block.id+'"]');
        return a?.getAttribute('href')==='#'+block.id && a.querySelector('.trail-time').textContent.includes(block.time==null ? block.period : block.time) && document.getElementById(block.id);
      }))));
      check(name+' Maps signs are removed while original queries remain available',await p.evaluate(()=>TRIP_DATA.days.flatMap(d=>d.blocks).filter(b=>b.mapQuery).length===12 && !document.querySelector('#daysList .trail-sign') && !document.getElementById('daysList').textContent.includes('Mở bản đồ')));
      check(name+' confirmed 68 Mạc Thái Tông pickup shows gathering without an outbound departure time',await p.evaluate(() => {
        const departure = TRIP_DATA.days[0].blocks[0];
        return departure.location === '68 Mạc Thái Tông' && departure.time === '21:00' &&
          !JSON.stringify(departure).includes('22:00') && !departure.storyNote.includes('Xác nhận vị trí đón');
      }));
      await jump(p,'thao-coffee');
      check(name+' reading location highlights its stop',await p.locator('[data-trail-stop="thao-coffee"]').getAttribute('aria-current')==='location');
      await p.locator('#chapterToggle').click();
      check(name+' stop menu reveals the scenery without fading its text',await p.locator('#trailPanel').evaluate(e=>{
        const css=getComputedStyle(e),alpha=Number(css.backgroundColor.match(/[\d.]+/g)[3]);
        const compact=innerWidth<768 || (innerHeight<=520 && innerWidth>innerHeight);
        return alpha>0 && alpha<=(compact ? .72 : .5) && css.opacity==='1' && css.backdropFilter==='none' && css.textShadow!=='none';
      }));
      check(name+' selected day exposes its illustrated index',await p.locator('[data-trail-day="day-1"]').isVisible() && await p.locator('.trail-heading img:visible').evaluate(i=>i.naturalWidth>0));
      check(name+' expanded trail stays within the viewport',await p.locator('#trailPanel').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1 && r.top>=0 && r.bottom<=innerHeight+1;}));
      await shot(p,name+'-trail');
      await p.keyboard.press('Escape');
      check(name+' Escape restores focus to the trail control',await p.locator('#trailPanel').isHidden() && await p.locator('#chapterToggle').evaluate(e=>e===document.activeElement));
      await p.locator('[data-chapter="day-2"]').click();await wait(700);
      check(name+' choosing a date shows that day and native history',await p.locator('[data-trail-day="day-2"]').isVisible() && await p.evaluate(()=>location.hash==='#day-2'));
      await p.locator('[data-trail-stop="lake"]').click();await wait(700);
      check(name+' stop choice closes the list and respects the header',await p.locator('#trailPanel').isHidden() && await p.evaluate(()=>location.hash==='#lake' && document.getElementById('lake').getBoundingClientRect().top>=document.querySelector(innerWidth<768 || innerHeight<=520 ? '.chapter-nav' : '.nav').getBoundingClientRect().bottom-1));
      await p.goBack();await wait(650);
      check(name+' browser back restores the prior date anchor',await p.evaluate(()=>location.hash==='#day-2'));
      await jump(p,'thao-coffee');
      const deck=p.locator('#thao-coffee [data-photo-deck]');
      const original=await deck.locator('.deck-slide:not([hidden]) figure').getAttribute('data-asset-id');
      check(name+' exposed preview uses the real second photograph',await deck.locator('.deck-preview:not([hidden]) img').evaluate(i=>i.getAttribute('src')=== './'+TRIP_ASSETS.assets[TRIP_DATA.days[1].blocks.find(b=>b.id==='thao-coffee').photoIds[1]].variants[0].src));
      await deck.locator('.deck-preview:not([hidden])').click();await wait(500);
      check(name+' selecting the preview changes the image without flipping it',await deck.locator('.deck-slide:not([hidden]) figure').getAttribute('data-asset-id')!==original && await deck.locator('.deck-slide:not([hidden]) [data-photo-object]').getAttribute('aria-pressed')==='false');
      await p.keyboard.press('Space');
      check(name+' keyboard can silently flip the selected print',await deck.locator('.deck-slide:not([hidden]) [data-photo-object]').getAttribute('aria-pressed')==='true');
      await deck.locator('.deck-preview:not([hidden])').click();await wait(500);
      check(name+' incoming photo always resets to its front',await deck.locator('.deck-slide:not([hidden]) [data-photo-object]').getAttribute('aria-pressed')==='false');
      check(name+' photo carries no visible flip instructions',!/Lật ảnh|có lời nhắn phía sau/i.test(await deck.innerText()));
      await shot(p,name+'-photo-stack');
      await jump(p,'ameii');await shot(p,name+'-maps');
      await jump(p,'packing');
      check(name+' illustrated checklist preserves seven labels and indices',await p.locator('#packingList label').evaluateAll(labels=>labels.length===7 && labels.every((label,index)=>label.querySelector('input').value===String(index) && label.textContent.includes(TRIP_DATA.packingList.items[index].text) && label.querySelector('img').naturalWidth>0)));
      if(width<768)check(name+' checklist uses two columns',await p.locator('#packingList').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length===2));
      await p.locator('#packingList input').first().check();
      check(name+' checkmark persists under the original key',await p.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('taxua-2026-packing')))==='[0]'));
      await p.reload();await wait(700);
      check(name+' reload retains the prepared object',await p.locator('#packingList input').first().isChecked());
      await p.locator('#packingList input').first().uncheck();
      check(name+' object can be undone without reordering',await p.locator('#packingStatus').textContent()==='Đã chuẩn bị 0/7 món' && await p.locator('#packingList input').first().getAttribute('value')==='0');
      await p.locator('#packingList').evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY-100));await wait(500);await shot(p,name+'-packing');
      check(name+' no overflow or duplicate IDs',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth && new Set([...document.querySelectorAll('[id]')].map(e=>e.id)).size===document.querySelectorAll('[id]').length));
      await p.evaluate(()=>document.documentElement.style.fontSize='32px');await wait(700);await jump(p,'lake');
      await p.locator('#chapterToggle').click();
      check(name+' enlarged trail remains bounded and scrollable',await p.locator('#trailPanel').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1 && e.clientHeight>=44;}));
      await p.keyboard.press('Escape');
      check(name+' enlarged labels introduce no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await p.close();
    }
    for(const mode of ['normal-motion','missing-gsap','denied-storage','file']) {
      const p=await browser.newPage({viewport:{width:390,height:844}});
      p.on('pageerror',e=>report.errors.push(mode+': '+e.message));
      await p.route('https://api.open-meteo.com/**',r=>r.fulfill({json:{}}));
      if(mode==='missing-gsap')await p.route('**/vendor/gsap.min.js',r=>r.fulfill({contentType:'text/javascript',body:'// optional motion unavailable'}));
      if(mode==='denied-storage')await p.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw new Error('storage unavailable');};});
      await p.goto(mode==='file'?'file://'+path.join(root,'index.html'):base);await p.evaluate(()=>document.fonts.ready);await wait(900);
      await jump(p,'thao-coffee');
      if(mode==='normal-motion') {
        check('body copy reaches full opacity by 76 percent viewport',await p.locator('#thao-coffee .place-description').first().evaluate(e=>{
          const t=ScrollTrigger.getAll().find(t=>t.trigger===e),photo=ScrollTrigger.getAll().find(t=>t.trigger===document.querySelector('#thao-coffee .postcard'));
          return Math.abs((t.end-t.start)-innerHeight*.2)<1 && photo.end-photo.start>t.end-t.start;
        }));
        await p.locator('#thao-coffee .place-description').first().evaluate(e=>scrollTo(0,ScrollTrigger.getAll().find(t=>t.trigger===e).end+10));
        await wait(500);
        await p.locator('#weatherMotion').evaluate(e=>e.click());
        check('pause exposes readable copy',await p.locator('#thao-coffee h3').evaluate(e=>getComputedStyle(e).opacity==='1'));
      }
      await p.locator('#chapterToggle').click();
      check(mode+' trail works',await p.locator('#trailPanel').isVisible());
      await p.keyboard.press('Escape');
      for(let i=0;i<5;i++)await p.locator('#thao-coffee .deck-preview:not([hidden])').click();
      await wait(800);
      check(mode+' rapid photo changes settle without duplicate ghosts',await p.locator('.deck-ghost').count()===0 && await p.locator('#thao-coffee .deck-slide:not([hidden])').count()===1);
      await p.locator('#packingList input').nth(2).check();
      check(mode+' packing can be checked and undone',await p.locator('#packingList input').nth(2).isChecked());
      await p.locator('#packingList input').nth(2).uncheck();
      await p.evaluate(()=>Promise.all(['night','bluehour','daylight','jade','afternoon'].map(JourneyUI.loadBackground)));
      // Temporary frozen compositions intentionally contain unloaded inactive
      // layers. Decode assertions belong to the live stage, then check cleanup.
      check(mode+' responsive terrain decodes',await p.locator('.scene-panel .quiet-terrain img').evaluateAll(imgs=>imgs.length===5 && imgs.every(i=>i.naturalWidth>0 && i.currentSrc.includes('portrait'))));
      await p.waitForFunction(()=>document.querySelectorAll('.scene-catchup,.navigation-scene').length===0);
      check(mode+' temporary scenery clears after decoding',await p.locator('.scene-catchup,.navigation-scene').count()===0);
      await p.emulateMedia({media:'print'});
      check(mode+' print exposes photos and hides interactive previews',await p.locator('.deck-previews').first().isHidden() && await p.locator('#scenery').isHidden());
      await p.close();
    }
    check('no uncaught browser errors',report.errors.length===0);
    check('no failed local resources',report.failedResources.length===0);
    report.checkCount=report.checks.length;
    console.log(JSON.stringify({checks:report.checkCount,output}));
  } finally {
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
