/* Browser-local navigation fixtures; no accounts, credentials or media writes. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session } = require('./verify_diary.cjs');
const output = process.env.DIARY_NAVIGATION_REVIEW_DIR || '/tmp/taxua-diary-navigation-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = { checkedAt: new Date().toISOString(), transport: 'browser-local fixtures; no backend writes', checks: [], errors: [], screenshots: [] };
fs.mkdirSync(output, { recursive: true });
const check = (name, value) => { assert(value, name); report.checks.push(name); };
const settle = p => p.waitForFunction(() => !document.querySelector('.diary-turn-leaf,.diary-turn-preview') && document.getElementById('diaryBook').getAttribute('aria-busy') === 'false');
async function selected(p, index) {
  await p.waitForFunction(index => document.querySelector(`[data-bookmark="${index}"]`).getAttribute('aria-pressed') === 'true', index);
  await settle(p);
}
async function reveal(p) {
  await p.locator('#diaryBook').evaluate(el => scrollTo({top:scrollY + el.getBoundingClientRect().top - 145, behavior:'instant'}));
  await p.waitForTimeout(180);
}
async function shot(p, name) {
  await p.screenshot({path:path.join(output,name)}); report.screenshots.push(name);
}
async function fixture(browser, options = {}, missing) {
  const context = await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'no-preference',...options});
  const m = model(), s = session(m,'san');
  m.entries[1].body = 'Lời viết được chọn và cuộn như bình thường.\n\n'.repeat(70);
  m.entries[1].photos = [0,1,2].map(i => ({id:require('node:crypto').randomUUID(),caption:'Ảnh cục bộ '+(i+1),alt:'Ảnh quan sát thao tác'}));
  await context.addInitScript(s => sessionStorage.setItem('taxua-diary-session-v1',JSON.stringify(s)),s);
  await mock(context,m);
  if(missing)await context.route('**/'+missing,route=>route.abort());
  const p = await context.newPage(); p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(url+'#crewDiary'); await p.evaluate(()=>document.fonts.ready);
  await p.locator('#diaryOpen').click(); await p.locator('#diaryReader').waitFor();
  await settle(p);
  await reveal(p);
  return {context,p,m};
}
async function centeredArtwork(p, name) {
  // Compare visible alpha bounds, not just <img>/button rectangles: faint
  // neighboring ribbon fragments previously shifted the apparent cloth center.
  const samples=await p.locator('#diaryBookmarks button').evaluateAll(nodes=>Promise.all(nodes.map(async button=>{
    const portrait=button.querySelector('img'),r=portrait.getBoundingClientRect(),b=button.getBoundingClientRect();
    const ribbon=new Image();ribbon.src=getComputedStyle(button).backgroundImage.slice(5,-2);await ribbon.decode();
    const canvas=document.createElement('canvas');canvas.width=ribbon.width;canvas.height=1;
    const ctx=canvas.getContext('2d'),scale=b.width/ribbon.width;
    ctx.drawImage(ribbon,0,-Math.floor(b.height*.5/scale));
    const row=ctx.getImageData(0,0,canvas.width,1).data,cloth=[];
    for(let x=0;x<canvas.width;x++)if(row[x*4+3]>128)cloth.push(x);
    const clothCenter=b.left+(cloth[0]+cloth.at(-1)+1)*.5*scale;
    canvas.width=portrait.naturalWidth;canvas.height=portrait.naturalHeight;ctx.drawImage(portrait,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let left=canvas.width,right=0,top=canvas.height,bottom=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
    const fit=Math.min(r.width/canvas.width,r.height/canvas.height);
    const x=r.left+r.width*.5+((left+right)*.5-canvas.width*.5)*fit;
    const y=r.top+r.height*.5+((top+bottom)*.5-canvas.height*.5)*fit;
    return {person:button.title,selected:button.getAttribute('aria-pressed')==='true',horizontal:x-clothCenter,vertical:y-(b.top+b.height*.5)};
  })));
  report.alignmentSamples ||= [];report.alignmentSamples.push({name,samples});
  check(name+' visible stickers are centered on their cloth',samples.every(s=>Math.abs(s.horizontal)<1&&Math.abs(s.vertical)<.25));
}
async function drag(p, direction, distance, options = {}) {
  // Native dialog focus restoration and the journey's resize refresh can
  // move the viewport. Bring paper into view before computing pointer input.
  await p.locator('#diaryBook').scrollIntoViewIfNeeded();
  const rect=await p.locator('#diaryBook').boundingBox();
  const x=direction===1?rect.x+rect.width-16:rect.x+16, y=rect.y+rect.height*.55;
  await p.mouse.move(x,y); await p.mouse.down();
  await p.mouse.move(x-direction*distance,y,{steps:8});
  if(options.waitForLeaf!==false)await p.locator('.diary-turn-leaf').waitFor();
  return {x,y};
}
async function completedDrags(p, engine, layout) {
  // Exercise real pointer release at the clamped endpoint. Merely waiting for
  // eventual selection would also pass when play() restarts the whole turn.
  for (const overshoot of [false, true]) for (const direction of [1,-1]) {
    const before=await p.locator('[data-bookmark][aria-pressed="true"]').getAttribute('data-bookmark');
    const target=Number(before)+direction;
    const width=await p.locator('#diaryPages > .diary-page:visible').first().evaluate(el=>el.getBoundingClientRect().width);
    const label=engine+' '+layout+' '+(overshoot?'overshot':'complete')+' drag '+direction;
    await drag(p,direction,overshoot?width*1.2:width+1);
    check(label+' stays held at the endpoint',await p.locator('.diary-turn-leaf').getAttribute('data-progress')==='1.0000'&&await p.locator('[data-bookmark][aria-pressed="true"]').getAttribute('data-bookmark')===before);
    await p.mouse.up();
    check(label+' lands immediately without replay',await p.evaluate(target=>!document.querySelector('.diary-turn-leaf,.diary-turn-preview,.diary-turn-underlay')&&document.querySelector(`[data-bookmark="${target}"]`).getAttribute('aria-pressed')==='true'&&document.getElementById('diaryBook').getAttribute('aria-busy')==='false',target));
    await selected(p,target);
  }
  const frozen=await p.locator('#diaryPages').innerHTML();
  const width=await p.locator('#diaryPages > .diary-page:visible').first().evaluate(el=>el.getBoundingClientRect().width);
  await drag(p,1,width+1); await p.keyboard.press('Escape'); await p.mouse.up(); await settle(p);
  check(engine+' '+layout+' Escape still reverses a fully held turn',await p.locator('#diaryPages').innerHTML()===frozen);
  // Reaching the endpoint does not commit while held: pulling back must still
  // scrub the same leaf and allow rollback on release.
  const start=await drag(p,1,width+1);
  await p.mouse.move(start.x-30,start.y,{steps:8}); await p.waitForTimeout(180);
  check(engine+' '+layout+' full drag can be pulled back before release',Number(await p.locator('.diary-turn-leaf').getAttribute('data-progress'))<.24);
  await p.mouse.up(); await settle(p);
  check(engine+' '+layout+' pulled-back full drag restores the exact spread',await p.locator('#diaryPages').innerHTML()===frozen);
}
async function runEngine(type, engine) {
  const browser=await type.launch(engine==='webkit'&&process.env.DIARY_WEBKIT_EXECUTABLE?{executablePath:process.env.DIARY_WEBKIT_EXECUTABLE}:{});
  try {
    const {context,p}=await fixture(browser,{deviceScaleFactor:2});
    check(engine+' seven sticker bookmarks retain accessible names',await p.locator('#diaryBookmarks button').evaluateAll(nodes=>nodes.length===7&&nodes.every(n=>n.getAttribute('aria-label').startsWith('Trang của ')&&n.title&&n.querySelector('img').getAttribute('alt')==='')));
    check(engine+' empty pages omit all invitation and empty-state copy',await p.locator('#diaryPages').evaluate(el=>!/(Trang này đang chờ|vài dòng của|Chưa có ảnh trong trang này|Mấy ô trống|chưa có lời viết)/.test(el.textContent)));
    check(engine+' empty pages retain three illustrated frames and writing lines',await p.locator('.diary-empty-photo').count()===3&&await p.locator('.diary-blank-lines').count()===1);
    for(const [width,height] of [[1440,1050],[820,1024],[390,844],[320,780]]) {
      await p.setViewportSize({width,height}); await p.waitForTimeout(180); await reveal(p);
      check(engine+' portraits stay inside their bookmarks at '+width,await p.locator('#diaryBookmarks button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect(),i=n.querySelector('img'),q=i.getBoundingClientRect();return i.complete&&i.naturalWidth>0&&q.left>=r.left&&q.right<=r.right+.5&&q.top>=r.top&&q.bottom<=r.bottom+.5;})));
      check(engine+' cloth stays proportional and detailed at '+width,await p.locator('#diaryBookmarks button').evaluateAll(nodes=>Promise.all(nodes.map(async n=>{
        const css=getComputedStyle(n),image=new Image();image.src=css.backgroundImage.slice(5,-2);await image.decode();
        const portrait=n.querySelector('img'),r=portrait.getBoundingClientRect();
        return ['100%','100% auto'].includes(css.backgroundSize)&&image.naturalWidth>=n.clientWidth*devicePixelRatio&&portrait.naturalWidth>=r.width*devicePixelRatio&&getComputedStyle(portrait).filter==='none';
      })).then(results=>results.every(Boolean))));
      check(engine+' no bookmark text or horizontal document overflow at '+width,await p.locator('.diary-bookmark-fallback').evaluateAll(nodes=>nodes.every(n=>n.hidden))&&await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
      await centeredArtwork(p,engine+' bookmarks at '+width);
      await p.locator('#diaryBookmarks').screenshot({path:path.join(output,engine+'-bookmarks-'+width+'.png')});
      report.screenshots.push(engine+'-bookmarks-'+width+'.png');
    }
    await p.setViewportSize({width:1440,height:1050}); await p.waitForTimeout(180); await reveal(p);
    await shot(p,engine+'-empty-spread.png');
    check(engine+' first previous edge is disabled and next is usable',await p.locator('[data-diary-edge="-1"]').isDisabled()&&await p.locator('[data-diary-edge="1"]').isEnabled());
    await p.locator('[data-diary-edge="1"]').click(); await selected(p,1);
    check(engine+' right paper edge changes the whole person',await p.locator('#diaryPages .diary-page').evaluateAll(nodes=>nodes.every(n=>n.dataset.owner==='san')));
    await p.locator('[data-diary-edge="-1"]').click(); await selected(p,0);
    check(engine+' left paper edge goes back',await p.locator('#diaryPageLabel').innerText()==='Trang của mi');
    await p.locator('[data-diary-edge="1"]').focus(); await p.keyboard.press('Enter'); await selected(p,1);
    check(engine+' edge control works with keyboard',await p.locator('#diaryPageLabel').innerText()==='Trang của san');
    await reveal(p);
    const start=await drag(p,1,160);
    const held=await p.locator('.diary-turn-leaf').getAttribute('data-progress');
    await p.waitForTimeout(100);
    check(engine+' held drag pauses the leaf and keeps outgoing selection',await p.locator('.diary-turn-leaf').evaluate(el=>el.getAnimations()[0].playState==='paused')&&await p.locator('#diaryPageLabel').innerText()==='Trang của san');
    await p.mouse.move(start.x-245,start.y,{steps:6});
    check(engine+' leaf progress follows pointer displacement',Number(await p.locator('.diary-turn-leaf').getAttribute('data-progress'))>Number(held)+.1);
    check(engine+' dragged leaf has outgoing front and incoming reverse',await p.locator('.diary-strip-front .diary-page').evaluateAll(nodes=>nodes.every(n=>n.dataset.owner==='san'))&&await p.locator('.diary-strip-back .diary-page').evaluateAll(nodes=>nodes.every(n=>n.dataset.owner==='thao')));
    await shot(p,engine+'-held-drag.png'); await p.mouse.up(); await selected(p,2);
    await p.waitForTimeout(400);
    check(engine+' release commits once without a ghost edge click',await p.locator('#diaryPageLabel').innerText()==='Trang của thảo');
    const frozen=await p.locator('#diaryPages').innerHTML();
    await drag(p,-1,45); await p.waitForTimeout(180); await p.mouse.up(); await settle(p);
    check(engine+' short drag returns to exact old spread',await p.locator('#diaryPages').innerHTML()===frozen&&await p.locator('#diaryPageLabel').innerText()==='Trang của thảo');
    await drag(p,-1,190); await p.keyboard.press('Escape'); await p.mouse.up(); await settle(p);
    check(engine+' Escape rolls the page back without changing owner',await p.locator('#diaryPageLabel').innerText()==='Trang của thảo');
    await drag(p,-1,190);
    await p.locator('#diaryBook').dispatchEvent('pointercancel',{pointerId:1,isPrimary:true,pointerType:'mouse'});
    await p.mouse.up(); await settle(p);
    check(engine+' pointer cancellation clears the drag and staging',await p.locator('.diary-turn-leaf,.diary-turn-preview,.diary-turn-underlay').count()===0&&await p.locator('#diaryBook').getAttribute('data-dragging')===null&&await p.locator('#diaryPageLabel').innerText()==='Trang của thảo');
    await drag(p,-1,620); await p.waitForTimeout(100);
    check(engine+' a full drag still waits for release to change owner',await p.locator('#diaryPageLabel').innerText()==='Trang của thảo'&&await p.locator('.diary-turn-leaf').count()===1);
    await p.mouse.up();
    check(engine+' fully dragged page lands on release without replaying',await p.locator('.diary-turn-leaf').count()===0&&await p.locator('#diaryPageLabel').innerText()==='Trang của san');
    await selected(p,1); await reveal(p);
    await completedDrags(p,engine,'desktop');
    const text=await p.locator('.diary-writing').boundingBox();
    await p.mouse.move(text.x+8,text.y+15); await p.mouse.down(); await p.mouse.move(text.x+150,text.y+15,{steps:8}); await p.mouse.up();
    check(engine+' selecting prose does not turn the book',await p.locator('.diary-turn-leaf,.diary-turn-preview').count()===0&&await p.evaluate(()=>!getSelection().isCollapsed));
    await p.evaluate(()=>getSelection().removeAllRanges());
    await p.locator('[data-view-photo]').first().click();
    check(engine+' photo clicks still open the private image',await p.locator('.diary-full-photo').count()===1&&await p.locator('.diary-turn-leaf').count()===0);
    await p.locator('[data-close-sheet]').click();
    await p.locator('[data-edit="writing"]').click();
    await p.locator('#diaryEditor').waitFor({state:'visible'});
    check(engine+' own edit button reuses session without turning the book',await p.locator('#diaryEditor').isVisible()&&!await p.locator('#diaryAuth').isVisible()&&await p.locator('.diary-turn-leaf').count()===0);
    await p.keyboard.press('Escape');
    await p.locator('#diaryEditor').waitFor({state:'hidden'});
    await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(180); await reveal(p);
    await completedDrags(p,engine,'phone writing');
    await p.locator('[data-diary-side="photos"]').click();
    await completedDrags(p,engine,'phone photos');
    await p.locator('[data-diary-side="writing"]').click();
    await drag(p,1,115); await p.mouse.up(); await selected(p,2);
    check(engine+' phone writing drag changes person',await p.locator('.diary-page-writing').isVisible());
    await shot(p,engine+'-phone-writing.png');
    await p.locator('[data-diary-side="photos"]').click(); await reveal(p);
    await drag(p,-1,115); await p.mouse.up(); await selected(p,1);
    check(engine+' phone photo drag retains the photo side',await p.locator('.diary-page-photos').isVisible()&&!await p.locator('.diary-page-writing').isVisible());
    await shot(p,engine+'-phone-photos.png');
    await p.locator('[data-bookmark="6"]').click(); await selected(p,6);
    await centeredArtwork(p,engine+' last bookmark selected');
    check(engine+' last next edge is disabled and last sticker stays visible',await p.locator('[data-diary-edge="1"]').isDisabled()&&await p.locator('[data-bookmark="6"]').evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return r.left>=p.left&&r.right<=p.right+1;}));
    await reveal(p); await drag(p,-1,115);
    await p.evaluate(()=>window.TaxuaDiaryApi.clear()); await p.mouse.up();
    check(engine+' logout while dragging removes every private layer',await p.locator('.diary-turn-leaf,.diary-turn-preview,.diary-turn-underlay').count()===0&&await p.locator('#diaryPages').evaluate(el=>el.childElementCount===0)&&!await p.locator('#diaryReader').isVisible());
    await context.close();
    for(const missing of ['reduced-motion','diary-motion.js','diary-motion.css','quanlele_scarf.webp']) {
      const f=await fixture(browser,{reducedMotion:missing==='reduced-motion'?'reduce':'no-preference'},missing==='reduced-motion'?null:missing);
      if(missing==='quanlele_scarf.webp') {
        check(engine+' missing sticker has named contained fallback',await f.p.locator('[data-bookmark="3"] .diary-bookmark-fallback').isVisible()&&await f.p.locator('[data-bookmark="3"]').evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.getAttribute('aria-label')==='Trang của quanlele'));
      } else {
        if(missing==='diary-motion.css') {
          await f.p.setViewportSize({width:390,height:844});
          check(engine+' portrait bookmarks also fit without decorative styles',await f.p.locator('#diaryBookmarks button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect(),q=n.querySelector('img').getBoundingClientRect();return q.left>=r.left&&q.right<=r.right+.5&&q.top>=r.top&&q.bottom<=r.bottom+.5;})));
        }
        await drag(f.p,1,190,{waitForLeaf:false}); await f.p.mouse.up(); await selected(f.p,1);
        check(engine+' swipe works with '+missing,await f.p.locator('.diary-turn-leaf').count()===0&&await f.p.locator('#diaryPageLabel').innerText()==='Trang của san');
      }
      await f.context.close();
    }
    if(engine==='chromium') {
      const f=await fixture(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
      const client=await f.context.newCDPSession(f.p), paper=await f.p.locator('#diaryBook').boundingBox();
      const y=paper.y+paper.height*.5, x=paper.x+paper.width-14;
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      for(let d=20;d<=140;d+=20)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-d,y}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await selected(f.p,1);
      check('chromium real touch swipe turns a phone leaf',await f.p.locator('#diaryPageLabel').innerText()==='Trang của san');
      await f.p.locator('[data-diary-side="writing"]').click(); await reveal(f.p);
      const writing=await f.p.locator('.diary-writing').boundingBox(), sx=writing.x+writing.width*.5, sy=writing.y+Math.min(170,writing.height*.7);
      const before=await f.p.locator('.diary-writing').evaluate(el=>el.scrollTop);
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
      for(let d=20;d<=120;d+=20)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx,y:sy-d}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await f.p.waitForTimeout(250);
      check('chromium real vertical touch scrolls writing without turning',await f.p.locator('.diary-writing').evaluate((el,before)=>el.scrollTop>before,before)&&await f.p.locator('.diary-turn-leaf').count()===0&&await f.p.locator('#diaryPageLabel').innerText()==='Trang của san');
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
      for(let d=20;d<=120;d+=20)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx-d,y:sy}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await selected(f.p,2);
      check('chromium horizontal touch through prose changes person',await f.p.locator('#diaryPageLabel').innerText()==='Trang của thảo');
      await f.context.close();
    }
  } finally {await browser.close();}
}
(async()=>{
  await runEngine(chromium,'chromium');
  if(process.env.DIARY_WEBKIT==='1')await runEngine(webkit,'webkit');
  check('No uncaught browser errors',report.errors.length===0);
  fs.rmSync(path.join(output,'failure.json'),{force:true});
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(report.checks.length+' diary navigation checks passed. '+output);
})().catch(error=>{fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({...report,failure:error.stack},null,2));console.error(error.stack);process.exitCode=1;});
