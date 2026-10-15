/* Member-wheel acceptance checks. Evidence defaults to /tmp, not tracked galleries. */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-wheel-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
fs.mkdirSync(output,{recursive:true});
function check(name,value) { assert(value,name); report.checks.push(name); }
async function reveal(page) {
  await page.evaluate(()=>scrollTo(0,document.getElementById('cloudWheel').getBoundingClientRect().top+scrollY-150));
  await page.waitForTimeout(650);
}
async function alignment(page) {
  return page.evaluate(()=>{
    const root = document.getElementById('cloudWheel');
    const angle = -Number(root.dataset.rotation);
    const segment = 360 / TRIP_DATA.members.length;
    const actual = Math.floor((((angle % 360 + 360) % 360) + segment / 2) / segment) % TRIP_DATA.members.length;
    const matrix = new DOMMatrix(getComputedStyle(root.querySelector('.wheel-rotor')).transform);
    const visual = ((Math.atan2(matrix.b,matrix.a) * 180 / Math.PI) % 360 + 360) % 360;
    const expected = Number(root.dataset.rotation) % 360;
    const difference = Math.abs(visual-expected);
    return actual === Number(root.dataset.winnerIndex) && Math.min(difference,360-difference) < .1 && root.dataset.winner === root.querySelector('.wheel-result-name').textContent;
  });
}
async function choose(page,index,enabled) {
  const input=page.locator(`[data-wheel-person="${index}"]`);
  if (await input.isChecked() !== enabled) await input.locator('..').click();
}
(async()=>{
  const browser=await chromium.launch();
  for (const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['narrow',320,780],['tablet',1024,768],['landscape',844,390]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    page.on('pageerror',error=>report.errors.push(name+': '+error.message));
    await page.goto(url); await page.evaluate(()=>document.fonts.ready); await reveal(page);
    check(name+' keeps seven real members and source section order',await page.locator('.wheel-member').count()===7 && await page.locator('#crew').evaluate(el=>el.nextElementSibling.id==='fund'&&el.nextElementSibling.nextElementSibling.id==='packing'));
    check(name+' uses transparent journal layout',await page.locator('#cloudWheel,.wheel-composition,.wheel-notes').evaluateAll(items=>items.every(el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(el).backdropFilter==='none')));
    await page.locator('#cloudWheel img').evaluateAll(items=>Promise.all(items.map(img=>img.decode())));
    check(name+' artwork loads',await page.locator('#cloudWheel img').evaluateAll(items=>items.every(img=>img.complete&&img.naturalWidth>0)));
    await page.locator('.wheel-spin').click();
    check(name+' reduced-motion result matches pointer and painted rotation',await alignment(page));
    check(name+' rotation introduces no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
    check(name+' result is announced accessibly',await page.locator('.wheel-result').getAttribute('aria-live')==='polite' && !!await page.locator('#cloudWheel').getAttribute('data-winner'));
    await reveal(page); await page.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');
    if (name==='phone') {
      await page.locator('.wheel-notes').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'phone-result.png')});report.screenshots.push('phone-result.png');
      await page.evaluate(()=>document.documentElement.style.fontSize='20px');
      check('enlarged phone text has no overflow',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
    }
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(url);await reveal(page);
  // Select each member individually: every painted segment must map correctly.
  for(let index=0;index<7;index++) {
    for(let member=0;member<7;member++)await choose(page,member,member===index);
    await page.locator('.wheel-spin').click();
    check('single participant '+index+' wins at the correct sector',Number(await page.locator('#cloudWheel').getAttribute('data-winner-index'))===index && await alignment(page));
  }
  for(let index=0;index<7;index++)await choose(page,index,false);
  check('empty selection disables spin and explains recovery',await page.locator('.wheel-spin').isDisabled() && (await page.locator('.wheel-result-note').textContent()).includes('Chọn ít nhất'));
  for(let index=0;index<7;index++)await choose(page,index,true);
  await page.locator('#wheelNoRepeat').check();
  const winners=new Set();
  for(let index=0;index<7;index++) {
    await page.locator('.wheel-spin').click();
    winners.add(await page.locator('#cloudWheel').getAttribute('data-winner'));
    check('no-repeat pick '+index+' matches pointer',await alignment(page));
  }
  check('no-repeat round picks everyone exactly once',winners.size===7 && await page.locator('.wheel-spin').isDisabled());
  check('round completion retains the final winner and offers restart',(await page.locator('.wheel-result-note').textContent()).includes('Bắt đầu lại') && !!await page.locator('#cloudWheel').getAttribute('data-winner'));
  await page.locator('.wheel-reset').click();
  check('restart clears round and restores all selected people',await page.locator('.wheel-spin').isEnabled() && await page.locator('.was-picked').count()===0 && await page.locator('.wheel-result-name').textContent()==='?');
  await page.locator('#wheelNoRepeat').uncheck();
  for(let index=1;index<7;index++)await choose(page,index,false);
  await page.locator('.wheel-spin').click();await page.locator('.wheel-spin').click();
  check('default mode permits repeat selections',await page.locator('#cloudWheel').getAttribute('data-winner')==='san' && await page.locator('.wheel-spin').isEnabled());
  await page.locator('.wheel-spin').focus();await page.keyboard.press('Enter');
  check('keyboard can spin and keeps visible focus',await page.locator('#cloudWheel').getAttribute('data-winner')==='san'&&await page.locator('.wheel-spin').evaluate(el=>el.matches(':focus-visible')));
  await page.close();

  const animated=await browser.newPage({viewport:{width:1440,height:1000}});
  animated.on('pageerror',error=>report.errors.push(error.message));
  await animated.goto(url);await reveal(animated);
  const range=await animated.locator('.wheel-stage').evaluate(el=>{
    const trigger=ScrollTrigger.getAll().find(item=>item.trigger===el);
    return {start:trigger.start,end:trigger.end};
  });
  const halfway=(range.start+range.end)/2;
  await animated.evaluate(y=>scrollTo(0,y),halfway);await animated.waitForTimeout(400);
  const forward=await animated.locator('.wheel-stage').evaluate(el=>Number(getComputedStyle(el).opacity));
  await animated.evaluate(y=>scrollTo(0,y),range.end+20);await animated.waitForTimeout(400);
  await animated.evaluate(y=>scrollTo(0,y),halfway);await animated.waitForTimeout(400);
  check('wheel scroll reveal reverses to the same partial visibility',forward>.3&&forward<.8&&await animated.locator('.wheel-stage').evaluate((el,value)=>Math.abs(Number(getComputedStyle(el).opacity)-value)<.02,forward));
  // Focus exposes the wrapper even if it is midway through a scroll reveal.
  await animated.locator('.wheel-spin').focus();
  await animated.locator('.wheel-rotor').evaluate(el=>el.addEventListener('transitionend',event=>{
    if(event.target===el&&event.propertyName==='transform')window.wheelFinishedAtTransition=!document.getElementById('cloudWheel').classList.contains('is-spinning');
  }));
  await animated.locator('.wheel-spin').evaluate(el=>{el.click();el.click();el.click();});
  check('spinning locks participant and repeat edits',await animated.locator('.wheel-spin').isDisabled()&&await animated.locator('.wheel-participants').evaluate(el=>el.disabled)&&await animated.locator('#wheelNoRepeat').isDisabled());
  const planned=await animated.locator('#cloudWheel').getAttribute('data-rotation');
  await animated.setViewportSize({width:390,height:844});
  await animated.waitForFunction(()=>!document.getElementById('cloudWheel').classList.contains('is-spinning'));
  check('rapid clicks produce one spin and resize preserves alignment',await animated.locator('#cloudWheel').getAttribute('data-rotation')===planned&&await alignment(animated));
  check('normal animation completes through the transition event',await animated.evaluate(()=>window.wheelFinishedAtTransition===true));
  check('animated phone wheel has no overflow',await animated.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  await animated.locator('.wheel-spin').click();await animated.emulateMedia({reducedMotion:'reduce'});
  await animated.waitForFunction(()=>!document.getElementById('cloudWheel').classList.contains('is-spinning'));
  check('switching to reduced motion settles an active spin correctly',await alignment(animated));
  await animated.emulateMedia({reducedMotion:'no-preference'});
  await animated.locator('.wheel-spin').click();
  await animated.evaluate(()=>document.documentElement.dataset.motionPaused='true');
  await animated.waitForFunction(()=>!document.getElementById('cloudWheel').classList.contains('is-spinning'));
  check('decorative-motion pause settles the active spin',await alignment(animated));
  // The completion fallback must also recover if the transition event is absent.
  await animated.evaluate(()=>{document.documentElement.dataset.motionPaused='false';document.querySelector('.wheel-rotor').addEventListener('transitionend',event=>event.stopImmediatePropagation(),true);});
  await animated.locator('.wheel-spin').click();
  await animated.waitForFunction(()=>!document.getElementById('cloudWheel').classList.contains('is-spinning'));
  check('fallback timer finishes a spin without a transition event',await alignment(animated));
  await animated.emulateMedia({media:'print'});
  check('print omits the interactive wheel',await animated.locator('#cloudWheel').isHidden());
  await animated.close();

  for(const mode of ['file','no-gsap','no-storage','no-crypto','missing-art']) {
    const fallback=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    fallback.on('pageerror',error=>report.errors.push(mode+': '+error.message));
    if(mode==='no-gsap')await fallback.route('**/vendor/*.js',route=>route.fulfill({contentType:'application/javascript',body:'// unavailable optional library'}));
    if(mode==='no-storage')await fallback.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage denied');}});});
    if(mode==='no-crypto')await fallback.addInitScript(()=>Object.defineProperty(crypto,'getRandomValues',{value:undefined}));
    if(mode==='missing-art')await fallback.route('**/figures/decor/painted/wheel_*.webp',route=>route.abort());
    await fallback.goto(mode==='file'?'file://'+path.join(root,'index.html'):url);await reveal(fallback);
    await fallback.locator('.wheel-spin').click();
    check(mode+' retains functional selection and pointer alignment',await alignment(fallback));
    await fallback.close();
  }
  check('all wheel scenarios have no uncaught browser errors',report.errors.length===0);
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();console.log('Passed '+report.checks.length+' wheel checks. Evidence: '+output);
})().catch(error=>{console.error(error);process.exit(1);});
