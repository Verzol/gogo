/* Deterministic browser acceptance for the local chance-object collection. */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-games-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
fs.mkdirSync(output,{recursive:true});
const check = (name,value) => { assert(value,name); report.checks.push(name); };
const choose = (p,id) => p.locator(`[data-game="${id}"]`).click();
async function action(p,id,action) {
  const control=p.locator(`#game-${id} [data-action="${action}"]`);
  if(await control.getAttribute('aria-disabled')==='true') await control.evaluate(el=>el.click());
  else if(await control.locator('.game-object-caption').count()) await control.locator('.game-object-caption').click();
  else { await control.evaluate(el=>{const drawer=el.closest('details');if(drawer)drawer.open=true;}); await control.click(); }
}
async function fill(p,selector,value) {
  await p.locator(selector).evaluate(el=>{const drawer=el.closest('details');if(drawer)drawer.open=true;});
  await p.fill(selector,value);
}
const select = (p,selector,value) => p.selectOption(selector,value,{force:true});
const data = (p,id,key) => p.locator(`#game-${id}`).getAttribute('data-'+key);
const fixed = (p,value) => p.evaluate(value => { window.tripRandomIndex = count => Math.min(value,count-1); },value);
async function imageCheck(p) {
  return p.locator('#tripGames img:visible').evaluateAll(images=>Promise.all(images.map(async img=>{try {await img.decode();return img.naturalWidth>0;}catch{return false;}}))).then(values=>values.every(Boolean));
}
(async()=>{
  const browser=await chromium.launch();
  try {
    const p=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    p.on('pageerror',e=>report.errors.push(e.message));
    await p.goto(url); await p.evaluate(()=>document.fonts.ready);
    check('Six choices default to original wheel',await p.locator('.game-choice').count()===6 && await p.locator('#cloudWheel').isVisible() && await p.locator('[data-game="wheel"]').getAttribute('aria-pressed')==='true');
    check('All choices control existing elements',await p.locator('.game-choice').evaluateAll(buttons=>buttons.every(button=>document.getElementById(button.getAttribute('aria-controls')))));
    check('Roster and section order are preserved',await p.evaluate(()=>TRIP_DATA.members.length===7 && document.getElementById('crew').nextElementSibling.id==='fund' && document.getElementById('fund').nextElementSibling.id==='packing'));
    check('Unbiased sampler rejects incomplete upper interval',await p.evaluate(()=>{
      const original=crypto.getRandomValues.bind(crypto);let calls=0,result;
      crypto.getRandomValues=values=>{values[0]=calls++===0?4294967295:5;return values;};
      try {result=tripRandomIndex(6);}finally{crypto.getRandomValues=original;}
      window.__realTripRandomIndex=tripRandomIndex;return result===5 && calls===2;
    }));
    check('Sampler rejects invalid pool sizes',await p.evaluate(()=>[0,-1,1.1,Infinity,2**32+1].every(value=>{try{tripRandomIndex(value);return false;}catch(e){return e instanceof RangeError;}})));
    await choose(p,'coin');await fixed(p,1);await action(p,'coin','toss');
    check('Cloud outcome matches visible coin face',await data(p,'coin','outcome')==='1' && await p.locator('#game-coin .game-status').innerText()==='Mây' && await p.locator('.coin-turn').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a<-.99));
    await fixed(p,0);await select(p,'#coinMode','best');await fill(p,'#coinSun','Đi cà phê');await fill(p,'#coinCloud','Ở homestay');
    await action(p,'coin','toss');await action(p,'coin','toss');
    check('First to two wins uses custom labels',await p.locator('#game-coin .game-status').innerText()==='Đi cà phê thắng ván này!' && await p.locator('#game-coin [data-action="toss"]').innerText()==='Ván mới');
    await action(p,'coin','toss');
    check('New coin round clears score and history',await p.locator('.coin-history li').count()===0 && (await p.locator('.coin-score').innerText()).includes('0 : 0'));
    await select(p,'#coinMode','single');for(let i=0;i<11;i++)await action(p,'coin','toss');
    check('Coin history is bounded',await p.locator('.coin-history li').count()===8);
    await choose(p,'dice');await select(p,'#diceCount','3');await fixed(p,5);await action(p,'dice','roll');
    check('Three sixes remain accessible without arithmetic clutter',await data(p,'dice','values')==='[6,6,6]' && await p.locator('#game-dice .game-status').innerText()==='Đã lắc: 6, 6, 6' && await p.locator('.dice-history li .sr-only').allTextContents().then(values=>values.join('|')==='6, 6, 6'));
    await p.locator('[data-die="0"]').click();await fixed(p,0);await action(p,'dice','roll');
    check('Held die survives reroll and history retains both snapshots',await data(p,'dice','values')==='[6,1,1]' && await p.locator('[data-die="0"]').getAttribute('aria-pressed')==='true' && (await p.locator('.dice-history li .sr-only').allTextContents()).join('|')==='6, 6, 6|6, 1, 1');
    await p.locator('[data-die="1"]').click();await p.locator('[data-die="2"]').click();await action(p,'dice','roll');
    check('All-held blocks reroll and explains recovery',await data(p,'dice','values')==='[6,1,1]' && await p.locator('#game-dice [data-action="roll"]').getAttribute('aria-disabled')==='true' && (await p.locator('#game-dice .game-hint').innerText()).includes('Bỏ giữ'));
    check('All-held reroll adds no history',await p.locator('.dice-history li').count()===2);
    await select(p,'#diceCount','1');
    check('Changing dice count clears history',await p.locator('#game-dice .game-history').isHidden() && await p.locator('.dice-history li').count()===0);
    await action(p,'dice','roll');
    check('Changing count clears holds and supports one die',await p.locator('[data-die]').count()===1 && await data(p,'dice','values')==='[1]' && await p.locator('[data-die]').getAttribute('aria-pressed')==='false');
    for(let i=0;i<10;i++){await fixed(p,i%6);await action(p,'dice','roll');}
    check('Dice history keeps only the last eight rolls in order',(await p.locator('.dice-history li .sr-only').allTextContents()).join('|')==='3|4|5|6|1|2|3|4');
    await action(p,'dice','reset');
    check('Dice reset hides and clears recent rolls',await p.locator('#game-dice .game-history').isHidden() && await p.locator('.dice-history li').count()===0);
    check('Dice maximum remains three',await p.locator('#diceCount option').evaluateAll(options=>options.length===3 && options.at(-1).value==='3'));
    await choose(p,'cards');check('Fresh deck contains 52 cards',await data(p,'cards','remaining')==='52');
    await select(p,'#cardCount','8');await action(p,'cards','draw');
    check('Eight-card hand removes eight unique cards',await p.locator('[data-card]').count()===8 && await data(p,'cards','remaining')==='44' && new Set(JSON.parse(await data(p,'cards','hand'))).size===8);
    await action(p,'cards','shuffle');await select(p,'#cardCount','7');await action(p,'cards','draw');
    check('Draw removes seven and conceals accessible identities',await data(p,'cards','remaining')==='45' && await p.locator('[data-card]').count()===7 && await p.locator('[data-card]').evaluateAll(cards=>cards.every(card=>card.getAttribute('aria-label').startsWith('Lá úp') && card.querySelector('.card-turn').getAttribute('aria-hidden')==='true')));
    await p.locator('[data-card="0"]').focus();await p.keyboard.press('Enter');
    check('Keyboard reveals one card and retains focus',await data(p,'cards','revealed')==='1' && await p.locator('[data-card="0"]').evaluate(el=>document.activeElement===el && !el.getAttribute('aria-label').startsWith('Lá úp')));
    await action(p,'cards','reveal');check('Reveal-all preserves deck size',await data(p,'cards','revealed')==='7' && await data(p,'cards','remaining')==='45');
    const drawn=JSON.parse(await data(p,'cards','hand'));
    for(let i=0;i<7;i++){await action(p,'cards','draw');drawn.push(...JSON.parse(await data(p,'cards','hand')));}
    check('Exhausting deck produces all 52 cards without duplicates',drawn.length===52 && new Set(drawn).size===52 && await data(p,'cards','remaining')==='0');
    const lastHand=await data(p,'cards','hand');await action(p,'cards','draw');
    check('Empty deck preserves final three cards',JSON.parse(lastHand).length===3 && await data(p,'cards','hand')===lastHand && await p.locator('#game-cards [data-action="draw"]').getAttribute('aria-disabled')==='true');
    await action(p,'cards','reveal');await action(p,'cards','shuffle');
    check('Shuffle resets deck and hand',await data(p,'cards','remaining')==='52' && await p.locator('[data-card]').count()===0);
    await choose(p,'sticks');
    for(let count=2;count<=8;count++){
      await select(p,'#stickCount',String(count));
      check(count+' sticks use one pouch up to four, otherwise two balanced pouches',await p.locator('.stick-rack').evaluateAll((racks,count)=>count<=4 ? racks.length===1 && racks[0].querySelectorAll('[data-stick]').length===count : racks.length===2 && racks.every((rack,i)=>rack.querySelectorAll('[data-stick]').length===(i===0?Math.ceil(count/2):Math.floor(count/2))),count));
      check(count+' sticks look identical before reveal',await p.locator('[data-stick]').count()===count && await p.locator('.stick-window img:visible').evaluateAll(images=>images.every(img=>img.src.endsWith('/stick_long.webp'))));
      for(let i=0;i<count;i++)await p.locator(`[data-stick="${i}"]`).click();
      check(count+' sticks contain exactly one short',await data(p,'sticks','short-count')==='1' && await data(p,'sticks','revealed')===String(count));
    }
    await select(p,'#stickMode','together');await p.locator('[data-stick="0"]').click();await p.locator('[data-stick="1"]').click();await p.locator('[data-stick="1"]').click();
    check('Together mode selects and deselects without revealing',await data(p,'sticks','revealed')==='0' && await p.locator('[data-stick="0"]').getAttribute('aria-pressed')==='true' && await p.locator('[data-stick="1"]').getAttribute('aria-pressed')==='false');
    await action(p,'sticks','reveal');check('Group reveal only opens selected sticks',await data(p,'sticks','revealed')==='1');
    for(let i=1;i<8;i++)await p.locator(`[data-stick="${i}"]`).click();await action(p,'sticks','reveal');
    check('Second group reveal retains exactly one short',await data(p,'sticks','revealed')==='8' && await data(p,'sticks','short-count')==='1');
    await choose(p,'bag');await select(p,'#bagCount','8');await action(p,'bag','draw');
    const first=JSON.parse(await data(p,'bag','results'));await action(p,'bag','draw');const second=JSON.parse(await data(p,'bag','results'));
    check('No-repeat draws cap to available balls',first.length===8 && second.length===2 && new Set([...first,...second]).size===10 && await data(p,'bag','remaining')==='0');
    check('Bag history groups both draws in chronological order',await p.locator('.bag-history li').evaluateAll((rows,batches)=>JSON.stringify(rows.map(row=>[...row.querySelectorAll('.history-token')].map(token=>token.textContent)))===JSON.stringify(batches),[first,second]));
    await action(p,'bag','draw');check('Empty bag adds no history',await p.locator('.bag-history li').count()===2);check('Empty bag retains results and explains recovery',await data(p,'bag','results')===JSON.stringify(second) && (await p.locator('#game-bag .game-status').innerText()).includes('Đã bốc hết túi'));
    await select(p,'#bagSource','members');check('Changed source blocks draw until preparation',await p.locator('#game-bag [data-action="draw"]').getAttribute('aria-disabled')==='true');
    await action(p,'bag','prepare');
    check('New bag clears history',await p.locator('#game-bag .game-history').isHidden() && await p.locator('.bag-history li').count()===0);
    await action(p,'bag','draw');
    check('Roster bag draws the seven real names',await p.evaluate(()=>JSON.parse(document.getElementById('game-bag').dataset.results).sort().join('|')===TRIP_DATA.members.map(member=>member.name).sort().join('|')));
    await p.waitForFunction(()=>document.querySelectorAll('#game-bag .bag-person.has-portrait').length===14);
    check('Each member result and history entry uses the matching scarf sticker',await p.evaluate(()=>[...document.querySelectorAll('#game-bag .bag-person')].every(token=>{
      const member=TRIP_DATA.members.find(member=>member.name===token.getAttribute('aria-label'));
      const image=token.querySelector('img');
      return token.getAttribute('role')==='img' && image.getAttribute('src')==='./'+member.image && image.naturalWidth>0 && getComputedStyle(token.querySelector('.bag-person-fallback')).visibility==='hidden';
    })) && await p.locator('.bag-results .bag-person').count()===7 && await p.locator('.bag-history .bag-person').count()===7 && await p.locator('.bag-results .lottery-label').count()===0);
    for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['narrow',320,780]]) {
      await p.setViewportSize({width,height});
      check(name+' member stickers and history fit viewport',await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth && [...document.querySelectorAll('.bag-person')].every(el=>{const rect=el.getBoundingClientRect();return rect.left>=0 && rect.right<=innerWidth;})));
      const file=name+'-bag-members.png';await p.locator('#game-bag').screenshot({path:path.join(output,file)});report.screenshots.push(file);
    }
    await p.setViewportSize({width:1440,height:1000});
    await p.route('**/*missing-sticker-check*',route=>route.abort());
    await p.locator('.bag-person-art').evaluateAll(images=>images.forEach(image=>{image.src+='?missing-sticker-check';}));
    await p.waitForFunction(()=>document.querySelectorAll('.bag-person.art-missing').length===14);
    check('Failed member portraits show accessible names in results and history',await p.locator('.bag-person').evaluateAll(tokens=>tokens.every(token=>getComputedStyle(token.querySelector('.bag-person-fallback')).visibility==='visible' && token.querySelector('.bag-person-fallback').textContent===token.getAttribute('aria-label') && token.querySelector('img').hidden)));
    await p.unroute('**/*missing-sticker-check*');
    await select(p,'#bagSource','custom');
    check('Unapplied source change keeps existing member results as stickers',await p.locator('.bag-results .bag-person').count()===7 && await p.locator('.bag-history .bag-person').count()===7);
    for(const value of ['San\nsan','','x'.repeat(25)]){await fill(p,'#bagList',value);await action(p,'bag','prepare');check('Invalid custom list '+JSON.stringify(value)+' is rejected',!!await p.locator('.game-error').innerText() && await p.locator('#game-bag [data-action="draw"]').getAttribute('aria-disabled')==='true');}
    await fill(p,'#bagList','mi\nlinh');await action(p,'bag','prepare');await action(p,'bag','draw');
    check('Custom member-like labels remain literal text',await p.locator('#game-bag .bag-person').count()===0 && (await p.locator('.bag-results .lottery-label').allTextContents()).sort().join('|')==='linh|mi' && await p.locator('.bag-history .history-token').count()===2);
    await select(p,'#bagSource','members');
    check('Unapplied member source does not reinterpret custom labels as portraits',await p.locator('#game-bag .bag-person').count()===0 && await p.locator('.bag-results .lottery-label').count()===2);
    await select(p,'#bagSource','custom');
    await fill(p,'#bagList','<b>mây</b>\nNắng');await action(p,'bag','prepare');await action(p,'bag','draw');
    check('Custom names render as literal text',JSON.parse(await data(p,'bag','results')).includes('<b>mây</b>') && await p.locator('.bag-results b,.bag-history b').count()===0 && (await p.locator('.bag-history').innerText()).includes('<b>mây</b>'));
    await p.locator('#bagNoRepeat').evaluate(el=>el.closest('details').open=true);await p.uncheck('#bagNoRepeat');await action(p,'bag','prepare');await fixed(p,0);await action(p,'bag','draw');
    check('Replacement allows repeats and preserves pool',JSON.parse(await data(p,'bag','results')).length===8 && new Set(JSON.parse(await data(p,'bag','results'))).size===1 && await data(p,'bag','remaining')==='2');
    await select(p,'#bagSource','numbers');
    for(const [from,to] of [['0','10'],['1','501'],['4','2'],['1.5','3'],['1','10000']]){await fill(p,'#bagFrom',from);await fill(p,'#bagTo',to);await action(p,'bag','prepare');check('Invalid range '+from+'..'+to+' rejected',!!await p.locator('.game-error').innerText() && await p.locator('#game-bag [data-action="draw"]').getAttribute('aria-disabled')==='true');}
    await fill(p,'#bagFrom','1');await fill(p,'#bagTo','500');await p.check('#bagNoRepeat');await action(p,'bag','prepare');
    check('500-number maximum prepares successfully',await data(p,'bag','remaining')==='500' && await p.locator('.game-error').innerText()==='');
    for(let i=0;i<3;i++)await action(p,'bag','draw');
    const saved=await data(p,'bag','results');await choose(p,'coin');await choose(p,'bag');check('Switch preserves bag state',await data(p,'bag','results')===saved && await data(p,'bag','remaining')==='476' && await p.locator('.bag-history li').count()===3);
    const expectedBagHistory=[];
    for(let i=0;i<10;i++){await fixed(p,i);await action(p,'bag','draw');expectedBagHistory.push(JSON.parse(await data(p,'bag','results')));}
    check('Bag history retains the latest eight complete batches',await p.locator('.bag-history li').evaluateAll((rows,batches)=>JSON.stringify(rows.map(row=>[...row.querySelectorAll('.history-token')].map(token=>token.textContent)))===JSON.stringify(batches),expectedBagHistory.slice(-8)));
    await action(p,'bag','refill');
    check('Refill clears bag history',await p.locator('.bag-history li').count()===0 && await p.locator('#game-bag .game-history').isHidden());
    await fixed(p,0);
    for(const id of ['dice','bag']) {
      await choose(p,id);
      for(const event of ['switch','pause','reduce','hidden','pagehide']) {
        await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>document.documentElement.dataset.motionPaused='false');
        await action(p,id,id==='dice'?'reset':'refill');
        await p.locator(`#game-${id} [data-action="${id==='dice'?'roll':'draw'}"]`).evaluate(el=>{el.click();el.click();});
        check(id+' history waits for animation completion: '+event,await p.locator(`.${id}-history li`).count()===0);
        if(event==='switch')await choose(p,'coin');
        if(event==='pause')await p.evaluate(()=>document.documentElement.dataset.motionPaused='true');
        if(event==='reduce')await p.emulateMedia({reducedMotion:'reduce'});
        if(event==='hidden')await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
        if(event==='pagehide')await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
        await p.waitForFunction(id=>!document.getElementById('game-'+id).hasAttribute('aria-busy'),id);
        check(id+' interruption records one completed turn: '+event,await p.locator(`.${id}-history li`).count()===1);
        if(event==='hidden')await p.evaluate(()=>delete document.hidden);
        if(event==='switch') {
          await choose(p,id);await p.waitForTimeout(1100);
          check(id+' switching back preserves history without late duplicates',await p.locator(`.${id}-history li`).count()===1);
        }
      }
    }
    await p.emulateMedia({reducedMotion:'no-preference'});await choose(p,'coin');await action(p,'coin','reset');
    await p.evaluate(()=>document.querySelector('#game-coin [data-action="toss"]').click());
    check('Animated toss locks settings and marks busy',await p.locator('#game-coin').getAttribute('aria-busy')==='true' && await p.locator('#coinMode').isDisabled());
    await p.evaluate(()=>document.querySelector('[data-game="dice"]').click());
    check('Switch settles pending outcome exactly once',await data(p,'coin','outcome')==='0' && await p.locator('.coin-history li').count()===1 && await p.locator('#game-coin').getAttribute('aria-busy')===null);
    await choose(p,'coin');await p.waitForTimeout(1200);check('Cancelled animation cannot add a duplicate outcome',await p.locator('.coin-history li').count()===1);
    for(const event of ['pause','reduce','hidden','pagehide']){
      await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>document.documentElement.dataset.motionPaused='false');
      await p.evaluate(()=>document.querySelector('#game-coin [data-action="toss"]').click());
      if(event==='pause')await p.evaluate(()=>document.documentElement.dataset.motionPaused='true');
      if(event==='reduce')await p.emulateMedia({reducedMotion:'reduce'});
      if(event==='hidden')await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      if(event==='pagehide')await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
      await p.waitForTimeout(20);check(event+' settles and unlocks pending toss',await p.locator('#game-coin').getAttribute('aria-busy')===null && !await p.locator('#coinMode').isDisabled());
      if(event==='hidden')await p.evaluate(()=>delete document.hidden);
    }
    await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>{document.documentElement.dataset.motionPaused='false';window.tripRandomIndex=window.__realTripRandomIndex;location.hash='game-cards';});await p.waitForTimeout(100);
    check('Card hash opens correct panel',await p.locator('#game-cards').isVisible() && await p.locator('#cloudWheel').isHidden());
    await p.evaluate(()=>location.hash='cloudWheel');await p.waitForTimeout(100);check('Wheel hash opens original wheel',await p.locator('#cloudWheel').isVisible());
    await choose(p,'coin');await p.locator('a[href="#cloudWheel"]').first().evaluate(el=>el.click());check('Native wheel navigation activates wheel',await p.locator('#cloudWheel').isVisible() && await p.locator('#game-coin').isHidden());
    // Let every object's normal animation finish through the shared lifecycle.
    await p.emulateMedia({reducedMotion:'no-preference'});
    for(const [id,move] of [['coin','toss'],['dice','roll'],['cards','draw'],['sticks','reveal'],['bag','draw']]) {
      await choose(p,id);
      if(id==='dice') await action(p,id,'reset');
      if(id==='cards') await action(p,id,'shuffle');
      if(id==='sticks') {await action(p,id,'reset');await p.locator('[data-stick="0"]').click();}
      await action(p,id,move);
      await p.waitForFunction(id=>!document.getElementById('game-'+id).hasAttribute('aria-busy'),id);
      check(id+' normal animation settles and unlocks',await p.locator('#game-'+id+' [data-game-lock]').evaluate(el=>!el.disabled));
      if(id==='cards') {
        await action(p,id,'reveal');
        await p.waitForFunction(()=>document.getElementById('game-cards').dataset.revealed==='7');
        check('Animated card flip reveals matching hand',await p.locator('.playing-card.is-revealed').count()===7);
      }
    }
    await choose(p,'sticks');await select(p,'#stickMode','instant');
    await p.locator('[data-stick="0"]').evaluate(el=>{el.focus();el.click();});
    await p.locator('[data-game="dice"]').focus();await p.keyboard.press('Enter');
    check('Leaving a pending stick reveal keeps focus on the picker',await p.locator('[data-game="dice"]').evaluate(el=>document.activeElement===el) && await data(p,'sticks','revealed')==='1');
    await choose(p,'cards');await action(p,'cards','shuffle');await action(p,'cards','draw');
    await p.waitForFunction(()=>!document.getElementById('game-cards').hasAttribute('aria-busy'));
    await p.locator('[data-card="0"]').evaluate(el=>{el.focus();el.click();});
    await p.locator('[data-game="bag"]').focus();await p.keyboard.press('Enter');
    check('Leaving a pending card flip keeps focus and selected result',await p.locator('[data-game="bag"]').evaluate(el=>document.activeElement===el) && await data(p,'cards','revealed')==='1');
    await p.emulateMedia({reducedMotion:'reduce'});
    for(const [name,width,height] of [['desktop',1440,1000],['tablet',820,900],['phone',390,844],['narrow',320,780],['landscape',844,390]]){
      await p.setViewportSize({width,height});
      for(const id of ['coin','dice','cards','sticks','bag']){
        await choose(p,id);if(id==='cards'){await action(p,id,'shuffle');await select(p,'#cardCount','8');await action(p,id,'draw');await action(p,id,'reveal');}
        if(id==='dice'){await select(p,'#diceCount','3');for(let i=0;i<8;i++)await action(p,id,'roll');}
        if(id==='bag'){await select(p,'#bagCount','8');for(let i=0;i<8;i++)await action(p,id,'draw');}
        check(name+' '+id+' has no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));check(name+' '+id+' artwork decodes',await imageCheck(p));
        await p.locator('#game-'+id).evaluate(el=>el.scrollIntoView({block:'start'}));
        if(['desktop','phone','narrow'].includes(name)){const file=name+'-'+id+'.png';await p.screenshot({path:path.join(output,file)});report.screenshots.push(file);}
      }
    }
    await p.setViewportSize({width:390,height:844});await p.addStyleTag({content:':root {font-size:32px !important;}'});
    for(const id of ['coin','dice','cards','sticks','bag']){await choose(p,id);check('200% text '+id+' fits viewport',await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));}
    await p.emulateMedia({media:'print'});check('Print hides interactive collection',await p.locator('#tripGames').isHidden());await p.close();
    // Real topbar activation must complete travel, including a queued game refresh.
    // Checking only the visible panel missed navigation being cancelled at 120ms.
    for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844]]) {
      const q=await browser.newPage({viewport:{width,height},hasTouch:width<768});
      q.on('pageerror',e=>report.errors.push(name+' navigation: '+e.message));
      await q.goto(url);await q.evaluate(()=>document.fonts.ready);
      for(const source of ['default','sticks','same-hash-keyboard']) {
        if(source==='sticks')await q.locator('[data-game="sticks"]').evaluate(el=>el.click());
        await q.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
        if(width<768)await q.locator('#navToggle').click();
        const link=q.locator('.nav a[href="#cloudWheel"]');
        if(source==='same-hash-keyboard'){await link.focus();await q.keyboard.press('Enter');}
        else await link.locator('svg').click();
        await q.waitForFunction(()=>document.activeElement.id==='cloudWheel' && !document.querySelector('.navigation-scene'));
        check(name+' topbar reaches the wheel from '+source,await q.locator('#cloudWheel').evaluate(el=>location.hash==='#cloudWheel' && !el.hidden && Math.abs(el.getBoundingClientRect().top-parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop))<3));
        check(name+' topbar selects and focuses the wheel from '+source,await q.locator('[data-game="wheel"]').getAttribute('aria-pressed')==='true' && await q.locator('#cloudWheel').evaluate(el=>document.activeElement===el));
        if(width<768)check('Phone menu closes after wheel navigation from '+source,await q.locator('#navToggle').getAttribute('aria-expanded')==='false' && await q.locator('#navLinks').evaluate(el=>el.inert));
        if(source==='sticks') {
          const file=name+'-topbar-wheel.png';await q.screenshot({path:path.join(output,file)});report.screenshots.push(file);
        }
      }
      await q.close();
    }
    for(const mode of ['file','no-gsap','no-art','no-animation','math-random','no-games-script']){
      const q=await browser.newPage({viewport:{width:390,height:844},reducedMotion:mode==='no-animation'?'no-preference':'reduce'});q.on('pageerror',e=>report.errors.push(mode+': '+e.message));
      if(mode==='no-gsap')await q.route('**/*gsap*',route=>route.abort());
      if(mode==='no-art')await q.route('**/painted/games/**',route=>route.abort());
      if(mode==='no-animation')await q.addInitScript(()=>{Element.prototype.animate=undefined;});
      if(mode==='math-random')await q.addInitScript(()=>{crypto.getRandomValues=undefined;});
      if(mode==='no-games-script')await q.route('**/games.js',route=>route.abort());
      await q.goto(mode==='file'?'file://'+path.join(root,'index.html'):url);
      if(mode==='no-games-script'){
        check('Missing games script retains original wheel',await q.locator('#cloudWheel').isVisible());await q.locator('.wheel-spin').click();check('Fallback wheel still chooses member',!!await q.locator('#cloudWheel').getAttribute('data-winner'));
      }else{
        for(const id of ['coin','dice','cards','sticks','bag']){
          await choose(q,id);if(id==='coin')await action(q,id,'toss');if(id==='dice')await action(q,id,'roll');if(id==='cards'){await action(q,id,'draw');await action(q,id,'reveal');}if(id==='sticks')await q.locator('[data-stick="0"]').click();if(id==='bag')await action(q,id,'draw');
          check(mode+' '+id+' completes interaction',!!await q.locator('#game-'+id+' .game-status').innerText() && await q.locator('#game-'+id).getAttribute('aria-busy')===null);
        }
        if(mode==='no-art'){await choose(q,'dice');check('Missing dice art shows numeric faces',await q.locator('.die-number').first().isVisible());check('Missing history art shows numeric results',await q.locator('.history-value').first().isVisible());check('Missing art explains fallback',await q.locator('.game-art-notice').isVisible());}
      }
      await q.close();
    }
    check('No uncaught browser errors',report.errors.length===0);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(report.checks.length+' game checks passed. '+output);
  }finally{await browser.close();}
})().catch(error=>{fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({...report,failure:error.stack},null,2));console.error(error);process.exitCode=1;});
