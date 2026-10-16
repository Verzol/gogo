/* Real pointer/keyboard coverage for journal controls and object-led games. */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-controls-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
fs.mkdirSync(output,{recursive:true});
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const game = (p,id) => p.locator(`[data-game="${id}"]`).click();
const openMenu = (p,id) => p.locator(`[data-native-select="${id}"]`).click();
async function photo(p,name) {await p.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');}
async function menuFits(p) {return p.locator('.journal-select-menu:popover-open').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1 && r.top>=0 && r.bottom<=innerHeight+1;});}
(async()=>{
  const browser=await chromium.launch();
  try {
    const p=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    p.on('pageerror',e=>report.errors.push(e.message));
    await p.route('**/*.tile.openstreetmap.fr/**',route=>route.abort());
    await p.goto(url);await p.evaluate(()=>document.fonts.ready);
    for(const id of ['coin','dice','cards','sticks','bag']) {
      await game(p,id);
      check(id+' starts without visible form fields',await p.locator(`#game-${id} input:visible,#game-${id} select:visible,#game-${id} textarea:visible`).count()===0);
      check(id+' icon actions have accessible names, local Lucide symbols and touch targets',await p.locator(`#game-${id} .game-icon-button:visible`).evaluateAll(buttons=>buttons.length>0 && buttons.every(button=>{
        const box=button.getBoundingClientRect();const ref=button.querySelector('use')?.getAttribute('href');
        return button.getAttribute('aria-label') && !button.textContent.trim() && ref && document.querySelector(ref) && box.width>=44 && box.height>=44;
      })));
    }
    await p.evaluate(()=>window.tripRandomIndex=()=>0);
    await game(p,'coin');await p.locator('.coin-object .coin-face--front').click();
    check('Tapping painted coin produces a result',await p.locator('#game-coin').getAttribute('data-outcome')==='0');
    await p.locator('.coin-object').focus();await p.keyboard.press('Space');
    check('Space on the coin performs one toss',await p.locator('.coin-history li').count()===2);
    await p.locator('#game-coin .game-chip[data-value="best"]').click();
    check('Coin match choice uses a quick chip',await p.locator('#coinMode').inputValue()==='best' && await p.locator('.coin-history li').count()===0);
    await p.locator('#game-coin .game-settings summary').click();await p.fill('#coinSun','Trà nóng');
    check('Optional coin labels use translucent themed fields',await p.locator('#coinSun').evaluate(el=>getComputedStyle(el).backgroundColor.startsWith('rgba(') && getComputedStyle(el).color==='rgb(255, 244, 220)'));
    await p.locator('#game-coin .game-settings summary').click();
    await game(p,'dice');await p.locator('[data-die="0"] img').click();
    check('Tapping an unrolled die rolls the tray',await p.locator('#game-dice').getAttribute('data-values')==='[1,1]');
    await p.locator('[data-die="0"]').click();await p.evaluate(()=>window.tripRandomIndex=n=>Math.min(5,n-1));
    await p.locator('.dice-tray-hit .game-object-caption').click();
    check('Tray reroll preserves the directly held die',await p.locator('#game-dice').getAttribute('data-values')==='[1,6]');
    check('Dice communicate outcomes on the objects, without visible arithmetic or result lists',await p.locator('#game-dice').evaluate(el=>el.querySelector('.game-status').classList.contains('sr-only') && !el.querySelector('.dice-history') && !!el.querySelector('.die.is-held .die-held use')));
    await p.locator('#game-dice .game-chip[data-value="3"]').click();
    check('Dice count chips replace a settings form',await p.locator('[data-die]').count()===3 && await p.locator('#game-dice .game-settings:visible').count()===0);
    await game(p,'cards');await p.locator('.card-deck > img').click();
    check('Tapping the deck deals three concealed cards',await p.locator('[data-card]').count()===3 && await p.locator('#game-cards').getAttribute('data-remaining')==='49');
    await p.locator('[data-card="0"]').focus();await p.keyboard.press('Enter');
    check('Card object still reveals by keyboard',await p.locator('#game-cards').getAttribute('data-revealed')==='1');
    check('Card indices are at least 24px and suit symbols at least 18px',await p.locator('.card-corner').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=24 && parseFloat(getComputedStyle(el.querySelector('small')).fontSize)>=18));
    await game(p,'bag');await p.locator('.bag-draw .bag-closed').click();
    check('Tapping bag draws without opening a form',JSON.parse(await p.locator('#game-bag').getAttribute('data-results')).length===1);
    check('Ball numbers are at least 32px',await p.locator('.lottery-ball > span').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=32));
    await p.locator('#game-bag .game-chip[data-value="members"]').click();
    check('Roster chip immediately prepares a playable bag',await p.locator('#game-bag').getAttribute('data-remaining')==='7' && !await p.locator('.game-settings').last().getAttribute('open'));
    await p.locator('.bag-draw').focus();await p.keyboard.press('Enter');
    check('Enter on bag draws a member name',await p.evaluate(()=>TRIP_DATA.members.some(member=>JSON.parse(document.getElementById('game-bag').dataset.results).includes(member.name))));
    await p.locator('#game-bag .game-chip[data-value="custom"]').click();
    check('Custom list chip opens only the necessary editor',await p.locator('#bagList').isVisible() && await p.locator('#bagList').evaluate(el=>el===document.activeElement));
    await p.evaluate(()=>{const label=document.createElement('label');label.htmlFor='bagCount';label.id='externalSelectLabel';label.textContent='Số lượt bốc';document.getElementById('bagCount').closest('fieldset').before(label);});
    await p.locator('#externalSelectLabel').click();
    check('External native label focuses enhanced combobox',await p.locator('[data-native-select="bagCount"]').evaluate(el=>el===document.activeElement));
    await p.locator('#externalSelectLabel').evaluate(el=>el.remove());
    await p.fill('#bagList','Mây\nNắng\nGió');
    await openMenu(p,'bagCount');
    check('Dropdown opens a themed listbox',await p.locator('.journal-select-menu:popover-open').count()===1 && await menuFits(p));
    check('Dropdown menu inherits translucent jade palette',await p.locator('.journal-select-menu:popover-open').evaluate(el=>getComputedStyle(el).backgroundColor==='rgba(25, 65, 68, 0.97)'));
    await photo(p,'bag-dropdown-desktop');
    await p.getByRole('option',{name:'3',exact:true}).click();
    check('Pointer selection updates native value and visible label',await p.locator('#bagCount').inputValue()==='3' && await p.locator('[data-native-select="bagCount"]').innerText()==='3');
    const count=p.locator('[data-native-select="bagCount"]');
    await count.focus();await p.keyboard.press('End');await p.keyboard.press('Escape');
    check('Escape cancels highlighted choice and retains focus',await p.locator('#bagCount').inputValue()==='3' && await count.evaluate(el=>el===document.activeElement) && await count.getAttribute('aria-expanded')==='false');
    await p.keyboard.press('ArrowDown');await p.keyboard.press('Home');await p.keyboard.press('Enter');
    check('Arrow/Home/Enter commits through keyboard',await p.locator('#bagCount').inputValue()==='1');
    await p.keyboard.press('7');check('Typeahead selects a matching option',await p.locator('#bagCount').inputValue()==='7');
    await p.keyboard.press('Enter');await p.keyboard.press('Tab');
    check('Tab closes dropdown without trapping focus',await count.getAttribute('aria-expanded')==='false' && !await count.evaluate(el=>el===document.activeElement));
    await openMenu(p,'bagCount');await p.locator('#bagList').click();
    check('Outside pointer closes dropdown',await count.getAttribute('aria-expanded')==='false');
    await p.locator('#game-bag [data-action="prepare"]').click();
    check('Preparing custom bag returns focus to the object',!await p.locator('#bagList').isVisible() && await p.locator('.bag-draw').evaluate(el=>document.activeElement===el));
    await p.locator('#game-bag .game-chip[data-value="custom"]').click();
    check('Selected custom-list chip reopens its editor',await p.locator('#bagList').isVisible() && await p.locator('#bagList').evaluate(el=>el===document.activeElement));
    await p.locator('#game-bag [data-action="prepare"]').click();
    await p.locator('.bag-draw').click();
    check('Custom bag draw respects actual available names',await p.locator('#game-bag').evaluate(el=>JSON.parse(el.dataset.results).sort().join('|')===['Mây','Nắng','Gió'].sort().join('|')));
    await p.locator('#game-bag [data-action="refill"]').focus();await p.keyboard.press('Enter');
    check('Refill icon restores an exhausted bag through keyboard',await p.locator('#game-bag').getAttribute('data-remaining')==='3' && await p.locator('.bag-draw').getAttribute('aria-disabled')==='false');
    await p.locator('#game-bag .game-settings summary').click();
    const repeat=p.locator('#bagNoRepeat');await repeat.uncheck();
    check('Bag checkbox is custom and still toggles',!await repeat.isChecked() && await repeat.evaluate(el=>getComputedStyle(el).appearance==='none'));
    await p.locator('#game-bag [data-action="prepare"]').click();
    await p.emulateMedia({reducedMotion:'no-preference'});
    await p.locator('.bag-draw').evaluate(el=>el.click());
    await p.waitForFunction(()=>document.querySelector('[data-native-select="bagCount"]').disabled);
    check('Pending object draw disables dropdowns and quick chips',await count.isDisabled() && await p.locator('#game-bag .game-chip').first().isDisabled());
    await p.evaluate(()=>document.querySelector('[data-game="coin"]').click());
    check('Switch settles selected bag result once and unlocks settings',await count.isEnabled() && await p.locator('#game-bag').getAttribute('aria-busy')===null);
    await p.emulateMedia({reducedMotion:'reduce'});
    await game(p,'wheel');await p.locator('#wheelNoRepeat').check();
    check('Wheel repeat checkbox uses shared custom style',await p.locator('#wheelNoRepeat').evaluate(el=>getComputedStyle(el).appearance==='none'));
    await p.locator('#packing').scrollIntoViewIfNeeded();await p.locator('#packingList input').first().check();
    check('Packing checkbox retains functional checked state and sunrise palette',await p.locator('#packingList input').first().evaluate(el=>el.checked && getComputedStyle(el).appearance==='none' && getComputedStyle(el).backgroundColor==='rgb(246, 212, 155)'));
    await photo(p,'packing-checkboxes');
    await p.locator('[data-map-overview]').click();await p.locator('#atlasOptional').uncheck();
    check('Atlas optional checkbox shares the paper style',await p.locator('#atlasOptional').evaluate(el=>getComputedStyle(el).appearance==='none'));
    await p.locator('[data-map-day="2"]').click();await p.locator('[data-map-visit="room-change:mua_tru_homestay"]').click();
    await openMenu(p,'atlasVisit');
    check('Atlas dropdown belongs to modal and fits viewport',await p.locator('.journal-select-menu:popover-open').evaluate(el=>!!el.closest('dialog[open]')) && await menuFits(p));
    check('Atlas menu inherits cream paper and dark jade ink',await p.locator('.journal-select-menu:popover-open').evaluate(el=>getComputedStyle(el).color==='rgb(35, 76, 73)'));
    await photo(p,'atlas-dropdown');
    await p.keyboard.press('Escape');check('First Escape closes menu and keeps atlas open',await p.locator('#tripAtlas').isVisible() && await p.locator('.journal-select-menu:popover-open').count()===0);
    await openMenu(p,'atlasVisit');await p.getByRole('option').filter({hasText:'05:15'}).click();
    check('Atlas selection rerenders visit and retains combobox focus',(await p.locator('.atlas-place-time').innerText()).includes('05:15') && await p.locator('[data-native-select="atlasVisit"]').evaluate(el=>el===document.activeElement));
    await p.keyboard.press('Escape');
    await game(p,'sticks');await p.locator('#game-sticks .game-chip[data-value="together"]').click();
    for(let i=0;i<7;i++)await p.locator(`[data-stick="${i}"]`).click();
    await p.locator('#game-sticks [data-action="reveal"]').click();
    check('Completed sticks have no assigned names or visible transcript',await p.locator('#game-sticks').evaluate(el=>el.dataset.shortCount==='1' && el.querySelector('.game-status').classList.contains('sr-only') && !el.querySelector('.stick-label') && TRIP_DATA.members.every(member=>![...el.querySelectorAll('[data-stick]')].some(stick=>stick.getAttribute('aria-label').includes(member.name)))));
    check('Stick reveal and reset stay within reach below the racks',await p.locator('#game-sticks').evaluate(el=>{
      const row=el.querySelector('.game-play-actions');return row.querySelectorAll('button').length===2 && row.getBoundingClientRect().top>=el.querySelector('.stick-racks').getBoundingClientRect().bottom;
    }));
    await game(p,'cards');await p.locator('#game-cards .game-chip[data-value="7"]').click();await p.locator('.card-deck').click();
    for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['narrow',320,780],['landscape',844,390]]) {
      await p.setViewportSize({width,height});
      for(const id of ['coin','dice','cards','sticks','bag']) {
        await game(p,id);await p.locator('#game-'+id).evaluate(el=>el.scrollIntoView({block:'start'}));
        check(name+' '+id+' fits viewport',await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
        if(name==='phone'||name==='desktop')await photo(p,name+'-'+id);
      }
      await p.locator('#game-bag .game-settings').evaluate(el=>el.open=true);await openMenu(p,'bagCount');
      check(name+' custom menu stays inside viewport',await menuFits(p));await p.keyboard.press('Escape');
      if(name==='phone'||name==='narrow') {
        await game(p,'cards');await p.locator('[data-card="6"]').focus();await p.keyboard.press('Enter');
        check(name+' last card can be reached without shrinking or losing scroll position',await p.locator('[data-card="6"]').evaluate(el=>{
          const box=el.getBoundingClientRect();return el.classList.contains('is-revealed') && box.width>=118 && box.left>=0 && box.right<=innerWidth && el===document.activeElement;
        }));
        await photo(p,name+'-cards-last');
      }
    }
    await p.setViewportSize({width:320,height:780});await game(p,'bag');
    await p.locator('#game-bag .game-chip[data-value="numbers"]').click();
    await p.locator('#game-bag .game-settings').evaluate(el=>el.open=true);
    await p.fill('#bagFrom','9999');await p.fill('#bagTo','9999');
    await p.locator('#game-bag [data-action="prepare"]').click();await p.locator('.bag-draw').click();
    const labelFits = () => p.locator('.lottery-label').first().evaluate(el=>{
      const range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect(),box=el.getBoundingClientRect();
      return text.left>=box.left-1 && text.right<=box.right+1 && text.top>=box.top-1 && text.bottom<=box.bottom+1;
    });
    check('Four-digit ball number fits on one line on a narrow phone',await labelFits() && await p.locator('.lottery-label').first().evaluate(el=>{
      const range=document.createRange();range.selectNodeContents(el);return range.getClientRects().length===1;
    }));await photo(p,'narrow-four-digit-ball');
    await p.locator('#game-bag .game-chip[data-value="custom"]').click();await p.fill('#bagList','W'.repeat(24));
    await openMenu(p,'bagCount');await p.getByRole('option',{name:'1',exact:true}).click();
    await p.locator('#game-bag [data-action="prepare"]').click();await p.locator('.bag-draw').click();
    check('Maximum-length custom label stays readable beneath its token',await labelFits() && await p.locator('.lottery-label').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));await photo(p,'narrow-long-label');
    await p.setViewportSize({width:390,height:844});await p.addStyleTag({content:':root{font-size:32px !important}'});
    check('Long token label fits with 200% text',await labelFits());
    await p.locator('#game-bag .game-settings').evaluate(el=>el.open=true);await openMenu(p,'bagCount');
    check('200% text keeps menu inside viewport',await menuFits(p) && await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));await p.keyboard.press('Escape');
    await p.emulateMedia({forcedColors:'active'});
    check('Forced colors restores system checkbox affordance',await repeat.evaluate(el=>getComputedStyle(el).appearance==='auto'));
    await p.close();
    for(const mode of ['demo','file','no-popover','no-script']) {
      const q=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});q.on('pageerror',e=>report.errors.push(mode+': '+e.message));
      if(mode==='no-popover')await q.addInitScript(()=>{HTMLElement.prototype.showPopover=undefined;});
      if(mode==='no-script')await q.route('**/controls.js',route=>route.abort());
      await q.goto(mode==='file'?'file://'+path.resolve(__dirname,'../demos/passport.html'):url+'demos/passport.html');
      if(mode==='demo'||mode==='file') {
        await openMenu(q,'passportStop');check(mode+' dynamically rendered select opens custom menu',await q.locator('.journal-select-menu:popover-open').count()===1 && await menuFits(q));
        await q.keyboard.press('End');await q.keyboard.press('Enter');
        check(mode+' choosing option updates select value',await q.locator('#passportStop').evaluate(el=>el.selectedIndex===el.options.length-1));
        if(mode==='demo')await photo(q,'demo-passport');
      } else {
        check(mode+' retains styled native select fallback',await q.locator('#passportStop').isVisible() && await q.locator('#passportStop').evaluate(el=>getComputedStyle(el).appearance==='none'));
      }
      await q.close();
    }
    const sound=await browser.newPage({viewport:{width:390,height:844}});sound.on('pageerror',e=>report.errors.push('sound: '+e.message));await sound.goto(url+'demos/soundscape.html');
    check('Sound volume uses custom slider track and thumb',await sound.locator('#soundVolume').evaluate(el=>getComputedStyle(el).appearance==='none'));
    await sound.locator('#soundVolume').focus();const before=await sound.locator('#soundVolume').inputValue();await sound.keyboard.press('ArrowRight');
    check('Custom slider retains native keyboard adjustment',Number(await sound.locator('#soundVolume').inputValue())===Number(before)+1);await photo(sound,'demo-slider');await sound.close();
    check('No uncaught browser errors',report.errors.length===0);
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(report.checks.length+' control checks passed. '+output);
  }finally{await browser.close();}
})().catch(error=>{fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({...report,failure:error.stack},null,2));console.error(error);process.exitCode=1;});
