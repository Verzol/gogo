/* Six-face geometry, continuous 3D landing and held-die interaction checks. */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-dice-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[]};
fs.mkdirSync(output,{recursive:true});
const check = (name,value) => { assert(value,name); report.checks.push(name); };
const matrix = p => p.locator('.die-cube').first().evaluate(el=>Array.from(new DOMMatrix(getComputedStyle(el).transform).toFloat64Array()));
const settled = p => p.waitForFunction(()=>!document.querySelector('#game-dice').hasAttribute('aria-busy'));
const roll = p => p.locator('#game-dice [data-action="roll"]').evaluate(el=>el.click());
(async()=>{
  const browser = await chromium.launch();
  try {
    const p = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    p.on('pageerror',error=>report.errors.push(error.message));
    await p.goto(url);
    await p.locator('[data-game="dice"]').click();
    await p.selectOption('#diceCount','3',{force:true});
    await p.locator('#game-dice img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
    check('Each cube contains six different painted faces',await p.locator('.die-cube').evaluateAll(cubes=>cubes.length===3 && cubes.every(cube=>[...cube.querySelectorAll('[data-face]')].map(el=>el.dataset.face).join()==='1,2,3,4,5,6' && [...cube.querySelectorAll('img')].every(img=>img.naturalWidth>0))));
    check('All three axes form standard opposite face pairs',await p.locator('.die-cube').first().evaluate(cube=>{
      const normal = face => {const m = new DOMMatrix(getComputedStyle(cube.querySelector(`[data-face="${face}"]`)).transform);return [m.m31,m.m32,m.m33];};
      return [[1,6],[2,5],[3,4]].every(([a,b])=>normal(a).every((v,i)=>Math.abs(v+normal(b)[i])<.001));
    }));
    for (let face=1;face<=6;face++) {
      await p.evaluate(face=>window.tripRandomIndex=()=>face-1,face);
      await roll(p);await settled(p);
      check(`Face ${face} is the dominant visible result on all cubes`,await p.locator('.die').evaluateAll((dice,face)=>dice.every(die=>{
        const camera = new DOMMatrix(getComputedStyle(die.querySelector('.die-view')).transform);
        const cube = camera.multiply(new DOMMatrix(getComputedStyle(die.querySelector('.die-cube')).transform));
        const normals = [...die.querySelectorAll('.die-face')].map(el=>cube.multiply(new DOMMatrix(getComputedStyle(el).transform)).m33);
        return normals.indexOf(Math.max(...normals))===face-1 && normals[face-1]>.8 && normals.filter(n=>n>0.1).length===3 && Number(die.dataset.value)===face && die.getAttribute('aria-label').includes(`: ${face}.`);
      }),face));
    }
    await p.locator('[data-die="0"]').click();
    await p.emulateMedia({reducedMotion:'no-preference'});
    await p.evaluate(()=>document.documentElement.dataset.motionPaused='false');
    await p.evaluate(()=>{
      window.tripRandomIndex=()=>1;
      window.__heldDie=document.querySelector('[data-die="0"]');
      window.__diceCubes=[...document.querySelectorAll('.die-cube')];
    });
    await roll(p);
    check('Held cube stays still while each free cube tumbles and bounces',await p.locator('.die').evaluateAll(dice=>dice[0].getAnimations({subtree:true}).length===0 && dice.slice(1).every(die=>{
      const animations=die.getAnimations({subtree:true});
      return animations.length===2 && animations.some(a=>a.effect.target.classList.contains('die-cube')) && animations.some(a=>a.effect.target.classList.contains('die-flight'));
    })));
    await settled(p);
    check('Reroll preserves cube DOM, held value and new outcomes',await p.evaluate(()=>document.querySelector('[data-die="0"]')===window.__heldDie && [...document.querySelectorAll('.die-cube')].every((cube,i)=>cube===window.__diceCubes[i]) && document.querySelector('#game-dice').dataset.values==='[6,2,2]'));
    await p.locator('[data-die="0"]').click();
    await p.selectOption('#diceCount','1',{force:true});
    for (let face=1;face<=6;face++) {
      await p.evaluate(face=>window.tripRandomIndex=()=>face-1,face);
      await p.evaluate(()=>document.documentElement.dataset.motionPaused='false');
      await roll(p);
      check(`Roll to ${face} starts both animations`,await p.locator('#game-dice').evaluate(panel=>panel.getAnimations({subtree:true}).length===2));
      await p.locator('#game-dice').evaluate(panel=>panel.getAnimations({subtree:true}).forEach(a=>a.pause()));
      const frames=[];
      for (const time of [0,180,400,650,1249]) {
        await p.locator('#game-dice').evaluate((panel,time)=>panel.getAnimations({subtree:true}).forEach(a=>a.currentTime=time),time);
        frames.push(await matrix(p));
        if(face===4 && time===400) await p.locator('#game-dice').screenshot({path:path.join(output,'mid-roll-desktop.png')});
      }
      check(`Roll to ${face} rotates through distinct 3D frames`,frames.slice(1,4).every((frame,i)=>frame.some((value,j)=>Math.abs(value-frames[i][j])>.01)));
      const end=frames.at(-1);
      await p.locator('#game-dice').evaluate(panel=>panel.getAnimations({subtree:true}).forEach(a=>a.finish()));
      await settled(p);
      const rest=await matrix(p);
      check(`Landing on ${face} keeps the final orientation without a jump`,end.every((value,i)=>Math.abs(value-rest[i])<.001));
    }
    await p.selectOption('#diceCount','3',{force:true});
    await p.emulateMedia({reducedMotion:'reduce'});await roll(p);
    check('Reduced motion settles all cubes with no active animations',await p.locator('#game-dice').evaluate(panel=>!panel.hasAttribute('aria-busy') && panel.getAnimations({subtree:true}).length===0 && panel.dataset.values==='[6,6,6]'));
    for (const width of [1440,390,320]) {
      await p.setViewportSize({width,height:1000});
      await p.locator('#game-dice').scrollIntoViewIfNeeded();
      check(`Cubes and hold controls fit at ${width}px`,await p.locator('.die').evaluateAll(dice=>document.documentElement.scrollWidth===innerWidth && dice.every(die=>{
        const r=die.getBoundingClientRect();return r.width>=44 && r.height>=44 && r.left>=0 && r.right<=innerWidth;
      })));
      await p.locator('#game-dice').screenshot({path:path.join(output,`dice-${width}.png`)});
    }
    await p.locator('[data-die="1"]').focus();await p.keyboard.press('Enter');
    check('Keyboard toggles the hold without losing focus',await p.locator('[data-die="1"]').evaluate(die=>document.activeElement===die && die.getAttribute('aria-pressed')==='true'));
    check('No uncaught browser errors',report.errors.length===0);
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
    console.log(report.checks.length+' 3D dice checks passed. '+output);
  } finally {await browser.close();}
})().catch(error=>{fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({...report,failure:error.stack},null,2));console.error(error);process.exitCode=1;});
