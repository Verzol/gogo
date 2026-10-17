/* Deterministic boundary/mapping checks; distribution thresholds cannot prove fairness. */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-game-randomness-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
fs.mkdirSync(output,{recursive:true});
const check = (name,value) => { assert(value,name); report.checks.push(name); };
const choose = (p,id) => p.locator(`[data-game="${id}"]`).evaluate(el=>el.click());
const action = (p,id,name) => p.locator(`#game-${id} [data-action="${name}"]`).evaluate(el=>el.click());
const select = (p,id,value) => p.selectOption(id,String(value),{force:true});
const fixed = (p,index) => p.evaluate(index=>{window.tripRandomIndex=count=>index % count;},index);
const dataset = (p,id) => p.locator('#game-'+id).evaluate(el=>({...el.dataset}));

(async()=>{
  const browser = await chromium.launch();
  try {
    const p = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    p.on('pageerror',error=>report.errors.push(error.message));
    await p.goto(url); await p.evaluate(()=>document.fonts.ready);
    check('Every slot maps equally at both ends of accepted crypto intervals',await p.evaluate(()=>{
      window.__realRandomIndex = tripRandomIndex;
      const original = crypto.getRandomValues;
      let raw;
      crypto.getRandomValues = array=>{array[0]=raw;return array;};
      try {
        for (const count of [...Array.from({length:52},(_,i)=>i+1),100,500]) {
          const limit = Math.floor(2**32/count)*count;
          for (let slot=0;slot<count;slot++) {
            for (const value of [slot,limit-count+slot]) {
              raw=value;
              if (tripRandomIndex(count)!==slot) return false;
            }
          }
        }
        for (const value of [0,1,2**32-1]) {raw=value;if(tripRandomIndex(2**32)!==value)return false;}
        return true;
      } finally {crypto.getRandomValues=original;}
    }));
    check('All incomplete crypto intervals retry until an accepted sample',await p.evaluate(()=>{
      const original = crypto.getRandomValues;
      try {
        for (const count of [3,6,7,10,52,100,500]) {
          const limit = Math.floor(2**32/count)*count;
          let calls=0;
          crypto.getRandomValues = array=>{array[0]=[limit,2**32-1,limit-1][calls++];return array;};
          if (tripRandomIndex(count)!==count-1 || calls!==3) return false;
        }
        return true;
      } finally {crypto.getRandomValues=original;}
    }));
    // Exercise the real wheel sampler; its controller captures the original function.
    for (let index=0;index<7;index++) {
      check('Wheel slot '+index+' selects that person in the full seven-person pool',await p.evaluate(index=>{
        const original=crypto.getRandomValues;
        crypto.getRandomValues=array=>{array[0]=index;return array;};
        try {document.querySelector('.wheel-spin').click();return Number(document.querySelector('#cloudWheel').dataset.winnerIndex)===index;}
        finally {crypto.getRandomValues=original;}
      },index));
    }
    await p.evaluate(()=>document.querySelectorAll('[data-wheel-person]').forEach((el,i)=>{el.checked=[1,3,6].includes(i);el.dispatchEvent(new Event('change',{bubbles:true}));}));
    for (let slot=0;slot<3;slot++) {
      check('Wheel filters eligibility without favoring a remaining person: '+slot,await p.evaluate(slot=>{
        const original=crypto.getRandomValues;
        crypto.getRandomValues=array=>{array[0]=slot;return array;};
        try {document.querySelector('.wheel-spin').click();return Number(document.querySelector('#cloudWheel').dataset.winnerIndex)===[1,3,6][slot];}
        finally {crypto.getRandomValues=original;}
      },slot));
    }
    await choose(p,'coin');
    for (let side=0;side<2;side++) {await fixed(p,side);await action(p,'coin','toss');check('Coin slot '+side+' selects its own face',(await dataset(p,'coin')).outcome===String(side));}
    await choose(p,'dice');await select(p,'#diceCount',3);
    for (let face=0;face<6;face++) {
      await p.evaluate(face=>{window.__diceCalls=[];let i=0;window.tripRandomIndex=count=>{window.__diceCalls.push(count);return (face+i++)%6;};},face);
      await action(p,'dice','roll');
      check('Each die uses an independent six-slot draw: '+face,await p.evaluate(face=>window.__diceCalls.join() === '6,6,6' && document.querySelector('#game-dice').dataset.values===JSON.stringify([face,face+1,face+2].map(n=>n%6+1)),face));
    }
    await choose(p,'cards');await select(p,'#cardCount',7);
    for (const identity of [true,false]) {
      await p.evaluate(identity=>{window.__shuffleCalls=[];window.tripRandomIndex=count=>{window.__shuffleCalls.push(count);return identity?count-1:0;};},identity);
      await action(p,'cards','shuffle');
      check('Fisher-Yates uses every required shrinking pool: '+identity,await p.evaluate(()=>window.__shuffleCalls.join()===Array.from({length:51},(_,i)=>52-i).join()));
      const hand=[];
      for(let i=0;i<8;i++){await action(p,'cards','draw');hand.push(...JSON.parse((await dataset(p,'cards')).hand));}
      check('Fisher-Yates boundary choices produce the expected full permutation: '+identity,hand.every((card,i)=>card===(identity?i:(i+1)%52)) && new Set(hand).size===52);
    }
    await choose(p,'sticks');
    for(let count=2;count<=8;count++) {
      await select(p,'#stickCount',count);
      for(let short=0;short<count;short++) {
        await fixed(p,short);await action(p,'sticks','reset');
        // Reverse click order: the short position was already fixed before any pick.
        for(let i=count-1;i>=0;i--)await p.locator(`[data-stick="${i}"]`).evaluate(el=>el.click());
        check(count+' sticks can place the only short stick in slot '+short,await p.locator('[data-stick].is-short').evaluateAll((els,short)=>els.length===1 && Number(els[0].dataset.stick)===short,short));
      }
    }
    await choose(p,'bag');await select(p,'#bagSource','members');await select(p,'#bagCount',1);
    for(let slot=0;slot<7;slot++) {
      await action(p,'bag','prepare');await fixed(p,slot);await action(p,'bag','draw');
      check('Bag slot '+slot+' selects that member without identity weights',await p.evaluate(slot=>JSON.parse(document.querySelector('#game-bag').dataset.results)[0]===TRIP_DATA.members[slot].name,slot));
    }
    await choose(p,'sticks');await select(p,'#stickCount',7);await fixed(p,0);
    await p.emulateMedia({reducedMotion:'no-preference'});
    // Inspect real paused WAAPI frames; no wall-clock guessing for the extraction.
    for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844]]) {
      await p.setViewportSize({width,height});
      for(const index of [0,1]) {
        await action(p,'sticks','reset');
        await p.locator('#game-sticks img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
        await p.locator('#game-sticks').evaluate(el=>el.scrollIntoView({block:'start'}));
        await p.locator(`[data-stick="${index}"]`).evaluate(el=>{
          window.__drawingStick=el;window.__shaft=el.querySelector('.stick-shaft');
          el.click();el.querySelector('.stick-shaft').getAnimations().forEach(a=>{a.pause();a.currentTime=0;});
        });
        const samples=[];
        for(const time of [0,450,900,1350,1799]) {
          samples.push(await p.locator(`[data-stick="${index}"] .stick-shaft`).evaluate(async(el,time)=>{
            const animation=el.getAnimations()[0];animation.currentTime=time;
            await new Promise(requestAnimationFrame);
            const box=el.getBoundingClientRect(),mask=el.parentElement.getBoundingClientRect();
            const img=[...el.querySelectorAll('img')].find(img=>getComputedStyle(img).visibility==='visible');
            const paintedBottom=img.getBoundingClientRect().top+img.getBoundingClientRect().height*(img.src.endsWith('stick_short.webp')?651:768)/800;
            return {y:box.y,top:mask.y,lip:mask.bottom,bottom:paintedBottom,inset:el.offsetHeight,busy:el.closest('section').getAttribute('aria-busy')};
          },time));
          if(time===900) {
            const file=name+'-'+(index?'long':'short')+'-mid.png';await p.screenshot({path:path.join(output,file)});report.screenshots.push(file);
          }
        }
        check(name+' '+index+' travels continuously and remains pending through its final frame',samples.every((s,i)=>s.busy==='true' && (!i || s.y<samples[i-1].y)) && samples[0].y-samples[4].y>samples[0].inset*.99);
        check(name+' '+index+' hides the lower end early, then clears the sleeve gradually',samples[1].bottom>samples[1].lip && samples[3].bottom<samples[3].lip);
        const before=samples[4];
        await p.locator('#game-sticks').evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>a.finish()));
        check(name+' '+index+' has no final artwork replacement or position jump',await p.locator(`[data-stick="${index}"]`).evaluate((el,before)=>el===window.__drawingStick && el.querySelector('.stick-shaft')===window.__shaft && Math.abs(el.querySelector('.stick-shaft').getBoundingClientRect().y-before.y)<.1 && el.classList.contains('is-revealed') && !el.closest('section').hasAttribute('aria-busy'),before));
        check(name+' '+index+' keeps its final painted length',await p.locator(`[data-stick="${index}"]`).evaluate((el,index)=>el.classList.contains('is-short')===(index===0),index));
        const file=name+'-'+(index?'long':'short')+'-final.png';await p.screenshot({path:path.join(output,file)});report.screenshots.push(file);
      }
    }
    await select(p,'#stickMode','together');
    for(let i=0;i<7;i++)await p.locator(`[data-stick="${i}"]`).evaluate(el=>el.click());
    await action(p,'sticks','reveal');
    check('Group extraction staggers all seven sticks over the same slow duration',await p.locator('#game-sticks').evaluate(el=>el.getAnimations({subtree:true}).map(a=>a.effect.getTiming()).every((t,i)=>t.duration===1800 && t.delay===i*100)));
    await p.setViewportSize({width:1440,height:1000});
    await p.locator('#game-sticks').evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>a.finish()));
    check('Resize during extraction keeps each stick at its responsive final position',await p.locator('.stick-shaft').evaluateAll(els=>els.every(el=>Math.abs(el.getBoundingClientRect().top-el.parentElement.getBoundingClientRect().top)<.1)));
    await select(p,'#stickMode','instant');
    for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844]]) {
      await p.setViewportSize({width,height});await action(p,'sticks','reset');
      await p.locator('#game-sticks').evaluate(el=>el.scrollIntoView({block:'start'}));
      await p.locator('#game-sticks').evaluate(el=>{
        [0,1,2].forEach(i=>{const stick=el.querySelector(`[data-stick="${i}"]`);stick.focus();stick.click();stick.click();});
        el.getAnimations({subtree:true}).forEach((a,i)=>{a.pause();a.currentTime=600+i*300;});
      });
      check(name+' starts three independent pulls immediately and ignores duplicate taps',await p.locator('#game-sticks').evaluate(el=>el.getAnimations({subtree:true}).length===3 && el.querySelectorAll('.is-drawing[aria-busy="true"]').length===3 && el.dataset.revealed==='0'));
      const file=name+'-overlapping-sticks.png';await p.screenshot({path:path.join(output,file)});report.screenshots.push(file);
      await p.locator('[data-stick="1"] .stick-shaft').evaluate(el=>el.getAnimations()[0].finish());
      check(name+' one completion preserves both other animations and their focus',await p.locator('#game-sticks').evaluate(el=>el.dataset.revealed==='1' && el.querySelectorAll('.is-drawing').length===2 && el.getAnimations({subtree:true}).length===2 && document.activeElement===el.querySelector('[data-stick="2"]') && el.querySelector('#stickCount').matches(':disabled') && el.hasAttribute('aria-busy')));
      await action(p,'sticks','reset');
      check(name+' reset cannot replace a round with pending pulls',(await dataset(p,'sticks')).revealed==='1');
      await p.locator('[data-stick="3"]').focus();await p.keyboard.press('Enter');
      check(name+' keyboard can pull a fourth stick while others move',await p.locator('[data-stick="3"]').getAttribute('aria-busy')==='true' && await p.locator('#game-sticks').evaluate(el=>el.getAnimations({subtree:true}).length===3));
      await p.locator('#game-sticks').evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>a.finish()));
      check(name+' final completion unlocks settings with exactly four fixed results',await p.locator('#game-sticks').evaluate(el=>el.dataset.revealed==='4' && el.dataset.shortCount==='1' && !el.querySelector('#stickCount').matches(':disabled') && !el.hasAttribute('aria-busy') && !el.querySelector('.is-drawing')));
    }
    await select(p,'#stickMode','together');
    await p.locator('#game-sticks').evaluate(el=>{
      [0,1].forEach(i=>el.querySelector(`[data-stick="${i}"]`).click());
      el.querySelector('[data-action="reveal"]').click();
      el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=500;});
      [2,3].forEach(i=>el.querySelector(`[data-stick="${i}"]`).click());
    });
    check('Group reveal remains visibly available for new selections during a pull',await p.locator('#game-sticks [data-action="reveal"]').evaluate(el=>el.getAttribute('aria-disabled')==='false' && getComputedStyle(el).opacity==='1'));
    await action(p,'sticks','reveal');await action(p,'sticks','reveal');
    check('A second group overlaps the first without restarting its sticks',await p.locator('#game-sticks').evaluate(el=>el.getAnimations({subtree:true}).length===4 && el.querySelectorAll('.is-drawing').length===4 && el.querySelector('[data-stick="0"] .stick-shaft').getAnimations()[0].currentTime===500));
    await p.locator('#game-sticks').evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>a.finish()));
    check('Overlapping groups finish with the same single short stick',(await dataset(p,'sticks')).revealed==='4' && (await dataset(p,'sticks')).shortCount==='1');
    for(const event of ['pause','hidden','pagehide','reduce','switch']) {
      await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>document.documentElement.dataset.motionPaused='false');
      await select(p,'#stickMode','instant');await action(p,'sticks','reset');
      await p.locator('#game-sticks').evaluate(el=>[0,1,2].forEach(i=>el.querySelector(`[data-stick="${i}"]`).click()));
      if(event==='pause')await p.evaluate(()=>document.documentElement.dataset.motionPaused='true');
      if(event==='hidden')await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      if(event==='pagehide')await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
      if(event==='reduce')await p.emulateMedia({reducedMotion:'reduce'});
      if(event==='switch')await choose(p,'dice');
      await p.waitForFunction(()=>!document.getElementById('game-sticks').hasAttribute('aria-busy'));
      check(event+' settles all simultaneous pulls exactly once',await p.locator('#game-sticks').evaluate(el=>el.dataset.revealed==='3' && el.dataset.shortCount==='1' && !el.querySelector('.is-drawing') && el.getAnimations({subtree:true}).length===0 && !el.querySelector('#stickCount').matches(':disabled')));
      if(event==='hidden')await p.evaluate(()=>delete document.hidden);
      if(event==='switch')await choose(p,'sticks');
    }
    await p.emulateMedia({reducedMotion:'no-preference'});
    await select(p,'#stickMode','instant');await action(p,'sticks','reset');
    await p.locator('[data-stick="0"]').evaluate(el=>{el.focus();el.click();el.click();});
    await choose(p,'dice');
    check('Double activation and leaving the panel settle the original short result once',(await dataset(p,'sticks')).revealed==='1' && (await dataset(p,'sticks')).shortCount==='1');
    await choose(p,'sticks');await action(p,'sticks','reset');
    await p.locator('[data-stick="1"]').evaluate(el=>el.click());await p.emulateMedia({reducedMotion:'reduce'});
    check('Reduced motion settles the pending long stick without an extraction',(await dataset(p,'sticks')).revealed==='1' && (await dataset(p,'sticks')).shortCount==='0' && await p.locator('#game-sticks').getAttribute('aria-busy')===null);
    await p.evaluate(()=>{window.tripRandomIndex=window.__realRandomIndex;});
    check('No uncaught browser errors',report.errors.length===0);
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
    console.log(report.checks.length+' randomness and extraction checks passed. '+output);
  } finally {await browser.close();}
})().catch(error=>{fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({...report,failure:error.stack},null,2));console.error(error);process.exitCode=1;});
