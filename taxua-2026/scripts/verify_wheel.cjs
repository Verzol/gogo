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
    const upright = Array.from(root.querySelectorAll('.wheel-member-inner')).every(label=>{
      const combined = matrix.multiply(new DOMMatrix(getComputedStyle(label).transform));
      return Math.abs(combined.a-1)<.002 && Math.abs(combined.b)<.002;
    });
    return actual === Number(root.dataset.winnerIndex) && Math.min(difference,360-difference) < .1 && upright && root.dataset.winner === root.querySelector('.wheel-result-name').textContent;
  });
}
async function choose(page,index,enabled) {
  const input=page.locator(`[data-wheel-person="${index}"]`);
  if ((await input.getAttribute('aria-pressed') === 'true') !== enabled) await input.click();
}
async function labelsFitThroughoutRotation(page) {
  return page.locator('.wheel-dial').evaluate(dial=>{
    const previousTurn=dial.style.getPropertyValue('--wheel-turn');
    const wasInstant=dial.classList.contains('is-instant');
    dial.classList.add('is-instant');
    const bounds=dial.getBoundingClientRect();
    const centerX=bounds.left+bounds.width/2;
    const centerY=bounds.top+bounds.height/2;
    // The live painted sectors end at radius 145 in the 400-unit SVG.
    const safeRadius=bounds.width*145/400-1;
    try {
      for(let angle=0;angle<360;angle+=5) {
        dial.style.setProperty('--wheel-turn',angle+'deg');
        for(const label of dial.querySelectorAll('.wheel-name,.wheel-initial')) {
          const box=label.getBoundingClientRect();
          for(const x of [box.left,box.right])for(const y of [box.top,box.bottom]) {
            if(Math.hypot(x-centerX,y-centerY)>safeRadius)return false;
          }
        }
      }
      return true;
    } finally {
      if(previousTurn)dial.style.setProperty('--wheel-turn',previousTurn);
      else dial.style.removeProperty('--wheel-turn');
      dial.classList.toggle('is-instant',wasInstant);
    }
  });
}
async function winnerSticker(page,selector='.wheel-result-person') {
  return page.locator(selector).evaluate(async element=>{
    const image=element.querySelector('.wheel-winner-sticker');
    if(!image)return false;
    try { await image.decode(); } catch { return false; }
    const root=document.getElementById('cloudWheel');
    const member=TRIP_DATA.members[Number(root.dataset.winnerIndex)];
    return image.getAttribute('src')==='./'+member.image && image.naturalWidth>0 && image.alt==='' && image.getAttribute('aria-hidden')==='true' && getComputedStyle(image).objectFit==='contain';
  });
}
async function readableWinner(page) {
  return page.evaluate(()=>{
    const name=document.querySelector('.wheel-result-name');
    const box=name.getBoundingClientRect();
    const banner=document.querySelector('.wheel-winner-banner');
    const visible=box.top>=document.querySelector('.nav').getBoundingClientRect().bottom&&box.bottom<=innerHeight;
    return (visible||(!banner.hidden&&banner.querySelector('strong').textContent.slice(0,-1)===name.textContent))&&banner.getAttribute('aria-hidden')==='true'&&name.closest('.wheel-result').getAttribute('aria-live')==='polite';
  });
}
async function land(page) {
  await page.locator('.wheel-spin').click();
  // Finish the real CSS transition; the existing normal-spin checks also wait
  // its full duration. This keeps repeated celebration lifecycle checks brief.
  await page.locator('.wheel-dial').evaluate(el=>el.getAnimations({subtree:true}).forEach(animation=>animation.finish()));
  await page.waitForFunction(()=>!document.getElementById('cloudWheel').classList.contains('is-spinning'));
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
    check(name+' names and portraits stay inside the inner rim through a full rotation',await labelsFitThroughoutRotation(page));
    check(name+' waiting state has no winner sticker',await page.locator('.wheel-result-person img').count()===0);
    check(name+' removes the separate participant list',await page.locator('.wheel-participants,.wheel-choices').count()===0);
    check(name+' exposes seven named wheel toggle buttons',await page.locator('[data-wheel-person]').evaluateAll(items=>items.length===7&&items.every(el=>el.tagName==='BUTTON'&&el.getAttribute('aria-label')&&el.getAttribute('aria-pressed')==='true'&&!el.closest('[aria-hidden="true"]'))));
    check(name+' wheel controls have usable non-overlapping targets',await page.locator('[data-wheel-person]').evaluateAll(items=>{
      const boxes=items.map(el=>el.getBoundingClientRect());
      return boxes.every((box,i)=>box.width>=44&&box.height>=44&&boxes.every((other,j)=>i===j||box.right<=other.left||other.right<=box.left||box.bottom<=other.top||other.bottom<=box.top));
    }));
    // Click the actual portrait, then its name: both parts of the upright button work.
    await page.locator('[data-wheel-person="2"] img').click();
    check(name+' clicking the portrait excludes and mutes its member',await page.locator('[data-wheel-person="2"]').getAttribute('aria-pressed')==='false'&&await page.locator('.wheel-member[data-wheel-index="2"]').evaluate(el=>el.classList.contains('is-excluded'))&&(await page.locator('#wheelAvailability').textContent()).startsWith('6'));
    await page.locator('[data-wheel-person="2"] .wheel-name').click();
    check(name+' clicking the name includes them again',await page.locator('[data-wheel-person="2"]').getAttribute('aria-pressed')==='true');
    await page.locator('.wheel-spin').click();
    check(name+' reduced-motion result matches pointer and painted rotation',await alignment(page));
    await choose(page,0,false);
    check(name+' member toggles still work after the wheel rotates',await page.locator('[data-wheel-person="0"]').getAttribute('aria-pressed')==='false');
    await choose(page,0,true);
    check(name+' displays the matching complete winner sticker',await winnerSticker(page));
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
  const firstPerson=page.locator('[data-wheel-person="0"]');
  await firstPerson.focus();await page.keyboard.press('Space');
  check('Space excludes a member and retains visible keyboard focus',await firstPerson.getAttribute('aria-pressed')==='false'&&await firstPerson.evaluate(el=>el.matches(':focus-visible')));
  await page.keyboard.press('Enter');
  check('Enter restores the same member',await firstPerson.getAttribute('aria-pressed')==='true');
  // Select each member individually: every painted segment must map correctly.
  for(let index=0;index<7;index++) {
    for(let member=0;member<7;member++)await choose(page,member,member===index);
    await page.locator('.wheel-spin').click();
    check('single participant '+index+' wins at the correct sector',Number(await page.locator('#cloudWheel').getAttribute('data-winner-index'))===index && await alignment(page));
    check('single participant '+index+' displays only their own sticker',await winnerSticker(page)&&await page.locator('.wheel-result-person img').count()===1);
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
  check('completed round retains the final winner sticker',await winnerSticker(page));
  await page.locator('.wheel-reset').click();
  check('restart clears round and restores all selected people',await page.locator('.wheel-spin').isEnabled() && await page.locator('.was-picked').count()===0 && await page.locator('.wheel-result-name').textContent()==='?');
  check('restart removes the winner sticker',await page.locator('.wheel-result-person img').count()===0);
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
  check('spinning locks participant and repeat edits',await animated.locator('.wheel-spin').isDisabled()&&await animated.locator('[data-wheel-person]').evaluateAll(items=>items.every(el=>el.disabled))&&await animated.locator('#wheelNoRepeat').isDisabled());
  await animated.locator('[data-wheel-person="0"]').evaluate(el=>el.click());
  check('a member click cannot change a pending spin',await animated.locator('[data-wheel-person="0"]').getAttribute('aria-pressed')==='true');
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

  for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['narrow',320,780]]) {
    const celebration=await browser.newPage({viewport:{width,height}});
    celebration.on('pageerror',error=>report.errors.push('celebration '+name+': '+error.message));
    await celebration.goto(url+'#cloudWheel');await reveal(celebration);
    await celebration.locator('.wheel-spin').click();
    check(name+' celebration waits for the confirmed result',await celebration.locator('.wheel-celebration').isHidden()&&await celebration.locator('.wheel-winner-banner').isHidden());
    await celebration.locator('.wheel-dial').evaluate(el=>el.getAnimations({subtree:true}).forEach(animation=>animation.finish()));
    await celebration.waitForFunction(()=>!document.getElementById('cloudWheel').classList.contains('is-spinning'));
    await celebration.waitForTimeout(350);
    check(name+' landing produces bounded confetti and cloud artwork',await celebration.locator('.wheel-confetti').count()===(width<768?18:32)&&await celebration.locator('.wheel-celebration-cloud').count()===(width<768?2:3));
    check(name+' decoration stays behind content and outside navigation snapshots',await celebration.locator('.wheel-celebration').evaluate(el=>el.parentElement.id==='scenery'&&!el.closest('#sceneLayers')&&el.getAttribute('aria-hidden')==='true'&&getComputedStyle(el).pointerEvents==='none'));
    check(name+' keeps the winner readable without duplicate announcements',await readableWinner(celebration));
    check(name+' celebration retains the selected sticker',await winnerSticker(celebration));
    if(width<768) {
      // Explicitly place the result below the viewport to exercise the banner.
      await celebration.locator('.wheel-result').evaluate(el=>el.style.marginTop='100vh');
      await land(celebration);
      check(name+' phone banner pairs the matching sticker and winner name',await celebration.locator('.wheel-winner-banner').isVisible()&&await winnerSticker(celebration,'.wheel-winner-banner')&&await readableWinner(celebration));
      await celebration.locator('.wheel-result').evaluate(el=>el.style.marginTop='');
    }
    check(name+' celebration does not overflow',await celebration.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
    if(width<768)check(name+' banner fits below phone navigation',await celebration.locator('.wheel-winner-banner').evaluate(el=>{const box=el.getBoundingClientRect();return el.hidden||(box.left>=0&&box.right<=innerWidth&&box.top>document.querySelector('.nav').getBoundingClientRect().bottom);}));
    const particle=celebration.locator('.wheel-confetti').first();
    const first=await particle.evaluate(el=>el.getBoundingClientRect().top);await celebration.waitForTimeout(200);
    check(name+' particles actually move',Math.abs(await particle.evaluate(el=>el.getBoundingClientRect().top)-first)>2);
    await celebration.screenshot({path:path.join(output,'celebration-'+name+'.png')});report.screenshots.push('celebration-'+name+'.png');
    await celebration.waitForFunction(()=>document.querySelector('.wheel-celebration').hidden);
    check(name+' timed cleanup removes every particle and announcement',await celebration.locator('.wheel-celebration > *').count()===0&&await celebration.locator('.wheel-winner-banner').isHidden());
    if(name==='phone') {
      await land(celebration);
      await celebration.locator('.wheel-spin').click();
      check('new spin clears the previous celebration immediately',await celebration.locator('.wheel-celebration > *').count()===0&&await celebration.locator('.wheel-winner-banner').isHidden());
      check('new spin removes the previous winner sticker',await celebration.locator('.wheel-result-person img').count()===0);
      await celebration.locator('.wheel-dial').evaluate(el=>el.getAnimations({subtree:true}).forEach(animation=>animation.finish()));
      await celebration.waitForFunction(()=>!document.getElementById('cloudWheel').classList.contains('is-spinning'));
      await celebration.locator('.wheel-settings summary').click();
      await celebration.locator('.wheel-reset').click();
      await celebration.locator('.wheel-settings summary').click();
      check('reset removes the active celebration',await celebration.locator('.wheel-celebration > *').count()===0&&await celebration.locator('.wheel-winner-banner').isHidden());
      await land(celebration);
      await celebration.evaluate(()=>document.documentElement.dataset.motionPaused='true');
      check('pause clears confetti and banner',await celebration.locator('.wheel-celebration > *').count()===0&&await celebration.locator('.wheel-winner-banner').isHidden());
      await celebration.locator('.wheel-spin').click();
      check('paused selection retains a static phone announcement',await celebration.locator('.wheel-celebration > *').count()===0&&await readableWinner(celebration));
      await celebration.evaluate(()=>document.documentElement.dataset.motionPaused='false');
      await celebration.emulateMedia({reducedMotion:'reduce'});
      await celebration.locator('.wheel-spin').click();
      check('reduced motion uses a static phone result without particles',await celebration.locator('.wheel-celebration > *').count()===0&&await readableWinner(celebration)&&await celebration.locator('.wheel-winner-banner').evaluate(el=>el.getAnimations().length===0));
      await celebration.emulateMedia({reducedMotion:'no-preference'});await land(celebration);
      await celebration.evaluate(()=>scrollTo(0,0));
      await celebration.waitForFunction(()=>document.querySelector('.wheel-celebration').hidden);
      check('leaving the wheel clears the effect and banner',await celebration.locator('.wheel-celebration > *').count()===0&&await celebration.locator('.wheel-winner-banner').isHidden());
      await reveal(celebration);await land(celebration);
      await celebration.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')));
      check('pagehide removes the celebration',await celebration.locator('.wheel-celebration > *').count()===0&&await celebration.locator('.wheel-winner-banner').isHidden());
      await land(celebration);
      await celebration.evaluate(()=>{
        Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
        document.dispatchEvent(new Event('visibilitychange'));
      });
      check('a hidden tab clears all active decoration',await celebration.locator('.wheel-celebration > *').count()===0&&await celebration.locator('.wheel-winner-banner').isHidden());
      await land(celebration);
      check('a result completed in a hidden tab creates no celebration',await celebration.locator('.wheel-celebration > *').count()===0&&await celebration.locator('.wheel-winner-banner').isHidden());
      await celebration.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      await land(celebration);await celebration.emulateMedia({media:'print'});
      check('print hides both decorative layers',await celebration.locator('.wheel-celebration').isHidden()&&await celebration.locator('.wheel-winner-banner').isHidden());
    }
    await celebration.close();
  }

  for(const mode of ['file','no-gsap','no-storage','no-crypto','missing-art','missing-portraits','no-portraits']) {
    const fallback=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    fallback.on('pageerror',error=>report.errors.push(mode+': '+error.message));
    if(mode==='no-gsap')await fallback.route('**/vendor/*.js',route=>route.fulfill({contentType:'application/javascript',body:'// unavailable optional library'}));
    if(mode==='no-storage')await fallback.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage denied');}});});
    if(mode==='no-crypto')await fallback.addInitScript(()=>Object.defineProperty(crypto,'getRandomValues',{value:undefined}));
    if(mode==='missing-art')await fallback.route('**/figures/decor/painted/wheel_*.webp',route=>route.abort());
    if(mode==='missing-portraits')await fallback.route('**/figures/people/*.webp',route=>route.abort());
    if(mode==='no-portraits')await fallback.route('**/data.js',async route=>{
      const response=await route.fetch();
      const body=(await response.text()).replace(/,\s*"image":\s*"figures\/people\/[^"]+"/g,'');
      await route.fulfill({response,body});
    });
    await fallback.goto(mode==='file'?'file://'+path.join(root,'index.html'):url);await reveal(fallback);
    await fallback.locator('.wheel-spin').click();
    check(mode+' retains functional selection and pointer alignment',await alignment(fallback));
    if(mode==='missing-portraits'||mode==='no-portraits') {
      await fallback.waitForFunction(()=>!document.querySelector('.wheel-result-person img'));
      check(mode+' keeps the winner name without a broken result image',!!await fallback.locator('.wheel-result-name').textContent()&&await fallback.locator('.wheel-result-person img').count()===0);
      check(mode+' mobile banner also falls back to the winner name',await fallback.locator('.wheel-winner-banner').evaluate(async el=>{
        if(el.hidden)return true;
        const image=el.querySelector('img');
        if(image)await new Promise(resolve=>{if(image.complete)resolve();else image.addEventListener('error',resolve,{once:true});});
        return !el.querySelector('img')&&!el.classList.contains('has-portrait')&&el.querySelector('strong').textContent===document.getElementById('cloudWheel').dataset.winner+'!';
      }));
    } else check(mode+' retains the matching winner sticker',await winnerSticker(fallback));
    await fallback.close();
  }
  check('all wheel scenarios have no uncaught browser errors',report.errors.length===0);
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();console.log('Passed '+report.checks.length+' wheel checks. Evidence: '+output);
})().catch(error=>{console.error(error);process.exit(1);});
