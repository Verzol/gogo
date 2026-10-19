/* Period-correct schedule art and fixed painted backpack reveal regression. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const output = process.env.TRIP_REVIEW_DIR || path.resolve(__dirname,'../review/reveals');
fs.mkdirSync(output,{recursive:true});
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[]};
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
async function scroll(p,y) {await p.evaluate(y=>scrollTo(0,y),y);await wait(500);}
async function bounds(item) {return item.evaluate(el=>{const t=ScrollTrigger.getAll().find(t=>t.trigger===el);return t&&{start:t.start,end:t.end};});}
(async()=>{
  const browser = await chromium.launch();
  for(const [name,viewport] of [['desktop',{width:1440,height:900}],['phone',{width:390,height:844}]]) {
    const p=await browser.newPage({viewport});p.on('pageerror',error=>report.errors.push(error.stack));
    await p.goto('http://127.0.0.1:8000/taxua-2026/');await p.evaluate(()=>document.fonts.ready);await wait(700);
    const scheduleArtwork = () => p.locator('.day-heading img[data-sticker]').evaluateAll(images => images.length === 3 && images.every(img => img.dataset.stickerPhase === 'morning' && img.getAttribute('src').endsWith('_day.webp')));
    check(name+' day headings start with fixed daytime artwork',await scheduleArtwork());
    check(name+' early cloud-watching uses the official decorative Lucide sunrise',await p.locator('#room-clouds .event-inner > .schedule-icon').evaluate(el => el.getAttribute('aria-hidden') === 'true' && el.querySelector('use').getAttribute('href') === '#trip-sunrise' && !!document.getElementById('trip-sunrise')));
    for(const id of ['departure','room-clouds','thang-10','arrival']) {
      await p.evaluate(id=>scrollTo(0,document.getElementById(id).getBoundingClientRect().top+scrollY-110),id);await wait(1000);
      check(name+' schedule artwork remains daytime while scrolling to '+id,await scheduleArtwork());
    }
    if(name === 'desktop') {
      const sunrise=p.locator('#room-clouds .event-inner > .schedule-icon');const range=await bounds(sunrise);
      check('sunrise participates in the existing reversible reveal at its note',!!range && await sunrise.evaluate((el,range)=>Math.abs(range.end-(el.closest('.event').getBoundingClientRect().top+scrollY))<innerHeight,range));
      const midpoint=(range.start+range.end)/2;
      await scroll(p,midpoint);const forward=await sunrise.evaluate(svg=>Number(getComputedStyle(svg).opacity));
      await scroll(p,range.end+10);await p.screenshot({path:path.join(output,'schedule-sunrise.png')});await scroll(p,midpoint);
      check('sunrise reverses to the same scroll opacity',forward>.3 && forward<.8 && await sunrise.evaluate((svg,forward)=>Math.abs(Number(getComputedStyle(svg).opacity)-forward)<.015,forward));
    }
    const artwork = p.locator('.packing-heading > img');const artworkRange=await bounds(artwork);
    await scroll(p,artworkRange.end+10);
    const original = await artwork.getAttribute('src');
    for (const id of ['departure','thang-10','home-breakfast']) {
      await p.evaluate(id => scrollTo(0,document.getElementById(id).getBoundingClientRect().top + scrollY),id);await wait(950);
      check(name+' painted backpack stays fixed at '+id,await artwork.getAttribute('src')===original);
    }
    await scroll(p,(artworkRange.start+artworkRange.end)/2);
    const forward = await artwork.evaluate(img=>Number(getComputedStyle(img).opacity));
    await scroll(p,artworkRange.end+10);
    check(name+' new backpack is fully visible in its reading zone',await artwork.evaluate(img=>img.naturalWidth>0&&Number(getComputedStyle(img).opacity)===1));
    await scroll(p,(artworkRange.start+artworkRange.end)/2);
    check(name+' new backpack reverses at the same scroll position',forward>.3&&forward<.8&&await artwork.evaluate((img,forward)=>Math.abs(Number(getComputedStyle(img).opacity)-forward)<.015,forward));
    await p.close();
  }
  for(const mode of ['reduced','no-gsap','file']) {
    const p=await browser.newPage({reducedMotion:mode === 'reduced' ? 'reduce' : 'no-preference'});
    p.on('pageerror',error=>report.errors.push(error.stack));
    if(mode === 'no-gsap') await p.route('**/vendor/gsap*.js',route=>route.abort());
    await p.goto(mode === 'file' ? 'file://'+path.resolve(__dirname,'../index.html') : 'http://127.0.0.1:8000/taxua-2026/');await wait(700);
    for(const id of ['departure','arrival']) {
      await p.evaluate(id=>scrollTo(0,document.getElementById(id).getBoundingClientRect().top+scrollY-110),id);await wait(1000);
      check(mode+' fixed schedule artwork survives '+id,await p.locator('.day-heading img[data-sticker]').evaluateAll(images=>images.length === 3 && images.every(img=>img.getAttribute('src').endsWith('_day.webp'))));
    }
    check(mode+' sunrise remains available',await p.locator('#room-clouds use[href="#trip-sunrise"]').count() === 2);
    await p.close();
  }
  check('artwork regression has no uncaught browser errors',report.errors.length===0);
  report.checkCount=report.checks.length;
  fs.writeFileSync(path.join(output,'artwork-checks.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();console.log('Passed '+report.checkCount+' artwork regression checks.');
})().catch(error=>{console.error(error);process.exit(1);});
