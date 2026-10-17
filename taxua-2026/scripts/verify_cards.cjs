/* All 52 generated card faces, correct mapping, readable fallbacks and responsive cards. */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-cards-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
fs.mkdirSync(output,{recursive:true});
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const action = (p,name) => p.locator(`#game-cards [data-action="${name}"]`).evaluate(el=>el.click());
(async()=>{
  const browser = await chromium.launch();
  try {
    const p = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    p.on('pageerror',e=>report.errors.push(e.message));
    await p.goto(url);await p.evaluate(()=>document.fonts.ready);
    await p.locator('[data-game="cards"]').evaluate(el=>el.click());
    await p.selectOption('#cardCount','8',{force:true});
    // An identity Fisher-Yates shuffle exposes every rank/suit without rerolling.
    await p.evaluate(()=>{window.tripRandomIndex=count=>count-1;window.__cardFaces=[];});
    await action(p,'shuffle');
    const seen=[];
    for(let batch=0;batch<7;batch++) {
      await action(p,'draw');
      const ids=JSON.parse(await p.locator('#game-cards').getAttribute('data-hand'));
      seen.push(...ids);
      check('Hand '+batch+' conceals all accessible identities before reveal',await p.locator('[data-card]').evaluateAll(cards=>cards.every(card=>card.getAttribute('aria-label').startsWith('Lá úp') && card.querySelector('.card-turn').getAttribute('aria-hidden')==='true')));
      await action(p,'reveal');
      await p.locator('.card-front img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
      const faces=await p.locator('[data-card]').evaluateAll((cards,ids)=>cards.map((card,i)=>{
        const front=card.querySelector('.card-front'),pips=[...front.querySelectorAll('.card-pip')].map(pip=>pip.getBoundingClientRect());
        const box=card.getBoundingClientRect();
        const corners=[...front.querySelectorAll('.card-corner')].map(el=>el.getBoundingClientRect());
        const intersects=(a,b)=>a.left<b.right-.5 && a.right>b.left+.5 && a.top<b.bottom-.5 && a.bottom>b.top+.5;
        window.__cardFaces.push({id:ids[i],html:card.outerHTML});
        return {id:ids[i],label:card.getAttribute('aria-label'),rank:front.querySelector('.card-corner').firstChild.textContent,pips:pips.length,ace:!!front.querySelector('.card-ace'),court:!!front.querySelector('.card-court'),asset:front.querySelector('.card-face-art').getAttribute('src'),loaded:front.classList.contains('has-card-art') && front.querySelector('.card-face-art').naturalWidth>0,red:front.classList.contains('is-red'),clear:pips.every((pip,j)=>pip.left>=box.left && pip.right<=box.right && pip.top>=box.top && pip.bottom<=box.bottom && !corners.some(corner=>intersects(pip,corner)) && pips.every((other,k)=>k===j || !intersects(pip,other)))};
      }),ids);
      for(const face of faces) {
        const value=Math.floor(face.id/4)+1;
        check('Card '+face.id+' has its own generated image and an accurate fallback',face.loaded && face.asset.endsWith('/'+['spades','hearts','clubs','diamonds'][face.id%4]+'_'+['ace','two','three','four','five','six','seven','eight','nine','ten','jack','queen','king'][value-1]+'.webp') && face.rank===['A','2','3','4','5','6','7','8','9','10','J','Q','K'][value-1] && face.red===([1,3].includes(face.id%4)) && (value===1 ? face.ace && !face.pips && !face.court : value<=10 ? face.pips===value && face.clear && !face.court : face.court));
      }
    }
    check('Every one of the 52 rank/suit combinations was rendered once',seen.length===52 && new Set(seen).size===52);
    await p.evaluate(()=>{
      const gallery=document.createElement('section');gallery.id='cardReview';gallery.className='card-hand';
      gallery.style.cssText='position:relative;display:grid;grid-template-columns:repeat(13,118.4px);gap:12px;width:max-content;padding:24px;margin:0;overflow:visible;background:#28565a;';
      gallery.innerHTML=window.__cardFaces.sort((a,b)=>(a.id%4-b.id%4)||a.id-b.id).map(face=>face.html).join('');
      document.body.append(gallery);
    });
    await p.setViewportSize({width:1800,height:1000});
    await p.locator('#cardReview img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
    await p.locator('#cardReview').screenshot({path:path.join(output,'all_52_faces.png')});report.screenshots.push('all_52_faces.png');
    await p.locator('#cardReview').evaluate(el=>el.remove());
    for(const [name,width,height,scale] of [['desktop',1440,1000,16],['tablet',820,1000,16],['phone',390,844,16],['narrow',320,780,16],['large-text',1440,1000,32]]) {
      await p.setViewportSize({width,height});await p.evaluate(scale=>document.documentElement.style.fontSize=scale+'px',scale);
      await action(p,'shuffle');
      // Last two full batches include all twelve illustrated courts.
      for(let i=0;i<6;i++)await action(p,'draw');
      await action(p,'reveal');
      check(name+' eight full-size cards remain on one row without page overflow',await p.locator('[data-card]').evaluateAll(cards=>cards.length===8 && cards.every(card=>Math.abs(card.getBoundingClientRect().top-cards[0].getBoundingClientRect().top)<1 && card.getBoundingClientRect().width>=118) && document.documentElement.scrollWidth===innerWidth));
      if(name==='desktop')check('Desktop shows all eight cards together',await p.locator('.card-hand').evaluate(el=>el.scrollWidth===el.clientWidth));
      await p.locator('[data-card="7"]').focus();await p.keyboard.press('Enter');
      check(name+' eighth card remains reachable with the keyboard',await p.locator('[data-card="7"]').evaluate(el=>{const r=el.getBoundingClientRect();return document.activeElement===el && r.left>=0 && r.right<=innerWidth;}));
      await p.locator('.card-hand').evaluate(el=>el.scrollLeft=0);
      await p.locator('.card-hand img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
      await p.locator('#game-cards').screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');
    }
    await p.close();
    for(const mode of ['file','missing-face']) {
      const q=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});q.on('pageerror',e=>report.errors.push(mode+': '+e.message));
      if(mode==='missing-face')await q.route('**/deck/*_king.webp',route=>route.abort());
      await q.goto(mode==='file'?'file://'+path.resolve(__dirname,'../index.html'):url);
      await q.locator('[data-game="cards"]').evaluate(el=>el.click());
      await q.evaluate(()=>window.tripRandomIndex=count=>count-1);await action(q,'shuffle');await q.selectOption('#cardCount','8',{force:true});
      for(let i=0;i<7;i++)await action(q,'draw');await action(q,'reveal');
      check(mode+' kings keep their rank, suit and accessible identity',await q.locator('[data-card]').evaluateAll(cards=>cards.length===4 && cards.every(card=>card.classList.contains('is-revealed') && !card.getAttribute('aria-label').startsWith('Lá úp') && card.querySelector('.card-corner').textContent==='K')));
      if(mode==='missing-face') {await q.locator('.card-court-fallback').first().waitFor({state:'visible'});check('Missing generated faces fall back to readable kings and suits',await q.locator('.card-court-fallback').first().isVisible());}
      else check('Direct-file generated card faces decode',await q.locator('.card-face-art').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().then(()=>true)))).then(values=>values.every(Boolean)));
      await q.close();
    }
    check('No uncaught browser errors',report.errors.length===0);
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(report.checks.length+' card checks passed. '+output);
  }finally{await browser.close();}
})().catch(error=>{fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({...report,failure:error.stack},null,2));console.error(error);process.exitCode=1;});
