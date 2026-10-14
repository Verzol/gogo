/* Fund invitation acceptance; reuses :8000 and the sibling Playwright install.
   The MoMo click is intercepted locally; this never submits a contribution. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'review','fund');
fs.mkdirSync(output,{recursive:true});
const url = 'https://quy.momo.vn/v2/YTavDjFUV4?cover=6749';
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[],videos:[]};
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function scroll(p,y) {await p.evaluate(y=>scrollTo(0,y),y);await wait(350);}
async function read(item) {return item.evaluate(el=>({opacity:Number(getComputedStyle(el).opacity),y:parseFloat(el.style.getPropertyValue('--reveal-y'))||0}));}
async function scene(p) {await p.evaluate(()=>scrollTo(0,fund.getBoundingClientRect().top+scrollY+20));await wait(800);}
async function travel(p,from,to) {
  await p.evaluate(({from,to})=>new Promise(resolve=>{
    const start=performance.now();
    const step=now=>{const t=Math.min(1,(now-start)/3200);scrollTo(0,from+(to-from)*t);if(t<1)requestAnimationFrame(step);else resolve();};
    requestAnimationFrame(step);
  }),{from,to});await wait(350);
}
(async()=>{
  const browser=await chromium.launch();
  for(const [name,viewport] of [['desktop',{width:1440,height:900}],['phone',{width:390,height:844}],['narrow',{width:320,height:780}],['landscape',{width:844,height:390}],['tablet',{width:1024,height:768}],['wide',{width:2560,height:1080}]]) {
    const context=await browser.newContext({viewport,...(['desktop','phone'].includes(name)?{recordVideo:{dir:output,size:viewport}}:{})});
    await context.route(url,route=>route.fulfill({contentType:'text/html',body:'<title>MoMo link verification</title>Local click verification only.'}));
    const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.stack));
    await p.goto('http://127.0.0.1:8000/taxua-2026/');await p.evaluate(()=>document.fonts.ready);await wait(500);
    check(name+' fund follows the travel story and precedes crew',await p.locator('#fund').evaluate(el=>el.previousElementSibling.id==='itinerary'&&el.nextElementSibling.id==='crew'));
    check(name+' contribution and destination are exact',await p.locator('.fund-amount strong').textContent()==='2.400.000'&&await p.locator('.fund-amount > span').textContent()==='₫ / mỗi người'&&await p.locator('.fund-link').getAttribute('href')===url);
    check(name+' interface preserves transparent scenery',await p.locator('#fund,.fund-composition,.fund-copy,.fund-pocket').evaluateAll(items=>items.every(el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(el).backdropFilter==='none')));
    check(name+' pig uses an official resolved Lucide symbol',await p.locator('.fund-pig use').evaluate(el=>!!document.querySelector(el.getAttribute('href'))));
    await scene(p);
    check(name+' fund has the morning scene and no overflow',await p.evaluate(()=>document.documentElement.dataset.scene==='morning'&&document.documentElement.scrollWidth===innerWidth));
    for(const selector of ['.fund-eyebrow','.fund-copy > h2','.fund-intro','.fund-reminder','.fund-illustration','.fund-tally','.fund-action','.fund-arrow']) {
      const item=p.locator(selector);
      const range=await item.evaluate(el=>{const t=ScrollTrigger.getAll().find(t=>t.trigger===el);return {start:t.start,end:t.end};});
      await scroll(p,range.start);const hidden=await read(item);
      await scroll(p,(range.start+range.end)/2);const mid=await read(item);await wait(600);const paused=await read(item);
      await scroll(p,range.end+60);const full=await read(item);
      await scroll(p,range.end+20);const stable=await read(item);
      await scroll(p,(range.start+range.end)/2);const reverse=await read(item);
      check(name+' '+selector+' reveals gradually and reverses',hidden.opacity<.005&&mid.opacity>.3&&mid.opacity<.8&&full.opacity===1&&Math.abs(mid.opacity-reverse.opacity)<.015&&Math.abs(mid.y-reverse.y)<1);
      check(name+' '+selector+' holds when paused and remains steady while reading',Math.abs(mid.opacity-paused.opacity)<.01&&Math.abs(mid.y-paused.y)<1&&stable.opacity===1&&stable.y===0);
    }
    const action=p.locator('.fund-action');const end=await action.evaluate(el=>ScrollTrigger.getAll().find(t=>t.trigger===el).end);
    await scroll(p,end+10);
    await p.keyboard.press('Shift');await p.locator('.fund-link').focus();
    check(name+' MoMo invitation supports keyboard focus and a named new tab',await p.locator('.fund-link').evaluate(el=>el.matches(':focus-visible')&&el.getAttribute('aria-label').includes('MoMo')&&el.getAttribute('target')==='_blank'&&el.rel.includes('noopener')));
    const popupPromise=p.waitForEvent('popup');await p.locator('.fund-link').click();const popup=await popupPromise;await popup.waitForLoadState();
    check(name+' invitation opens the exact fund URL',popup.url()===url);
    const popupVideo=popup.video();await popup.close();if(popupVideo)fs.unlinkSync(await popupVideo.path());
    check(name+' opening MoMo preserves the travel page',await p.locator('.event').count()===24&&await p.locator('.fund-amount strong').textContent()==='2.400.000');
    await p.locator('.fund-link').evaluate(el=>el.blur());await p.mouse.move(0,0);
    if(['desktop','phone'].includes(name)) {
      const range=await p.locator('#fund').evaluate(el=>{const entries=ScrollTrigger.getAll().filter(t=>el.contains(t.trigger));return{start:Math.min(...entries.map(t=>t.start)),end:Math.max(...entries.map(t=>t.end))};});
      await scroll(p,range.start-20);await travel(p,range.start-20,range.end+50);await wait(650);await travel(p,range.end+50,range.start-20);
    }
    await scene(p);await p.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');
    if(name==='phone') {
      await scroll(p,end+10);await p.screenshot({path:path.join(output,'phone-action.png')});report.screenshots.push('phone-action.png');
      await p.evaluate(()=>document.documentElement.style.fontSize='20px');await scene(p);
      check('enlarged phone text preserves the amount and fits the viewport',await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth)&&await p.locator('.fund-amount strong').textContent()==='2.400.000');
    }
    const video=p.video();await context.close();
    if(video){const file=name+'.webm';await video.saveAs(path.join(output,file));fs.unlinkSync(await video.path());report.videos.push(file);}
  }
  for(const mode of ['reduce','missing-gsap','file']) {
    const p=await browser.newPage({viewport:{width:390,height:844},...(mode==='reduce'?{reducedMotion:'reduce'}:{})});p.on('pageerror',e=>report.errors.push(e.stack));
    if(mode==='missing-gsap')await p.route('**/vendor/{gsap,ScrollTrigger}.min.js',r=>r.fulfill({contentType:'application/javascript',body:'// optional library absent'}));
    await p.goto(mode==='file'?'file://'+path.join(root,'index.html'):'http://127.0.0.1:8000/taxua-2026/');await wait(600);await scene(p);
    check(mode+' retains fund content and exact link',await p.locator('.fund-amount strong').textContent()==='2.400.000'&&await p.locator('.fund-link').getAttribute('href')===url);
    if(mode!=='file')check(mode+' exposes all fund components without travel',await p.locator('.fund-copy > *, .fund-tally, .fund-action').evaluateAll(items=>items.every(el=>Number(getComputedStyle(el).opacity)===1)));
    await p.emulateMedia({media:'print'});
    check(mode+' print retains fund content',await p.locator('.fund-action').evaluate(el=>Number(getComputedStyle(el).opacity)===1));await p.close();
  }
  const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto('file://'+path.join(root,'itinerary.html'));
  check('reading copy includes the contribution and exact MoMo link',await nojs.locator('#fundTitle').textContent()==='Thành viên thứ 8: Heo đất!'&&await nojs.locator('a[href="'+url+'"]').count()===1&&await nojs.locator('article').count()===24);await nojs.close();
  check('all fund scenarios have no uncaught browser errors',report.errors.length===0);
  report.checkCount=report.checks.length;fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();
  console.log('Passed '+report.checkCount+' fund checks; screenshots and recordings in review/fund/.');
})().catch(e=>{console.error(e);process.exit(1);});
