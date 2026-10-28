/* Browser-local fixtures only: no test users, credentials or writing in Supabase. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session } = require('./verify_diary.cjs');
const output = process.env.DIARY_MOTION_REVIEW_DIR || '/tmp/taxua-diary-motion-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
fs.mkdirSync(output, { recursive: true });
const report = { checkedAt: new Date().toISOString(), transport: 'browser-local fixtures; no production writes', checks: [], errors: [], screenshots: [] };
const check = (name, value) => { assert(value, name); report.checks.push(name); };
const markerGreens = [40,150,70,130,90,110,60];
async function clock(p, selector) {
  await p.waitForFunction(selector => document.querySelector(selector)?.getAnimations().length > 0, selector);
  await p.locator(selector).evaluate(el => { const a = el.getAnimations()[0]; a.pause(); a.currentTime = 0; });
}
async function seek(p, selector, fraction) {
  await p.locator(selector).evaluate((el, fraction) => { const a = el.getAnimations()[0]; a.currentTime = a.effect.getTiming().duration * fraction; }, fraction);
  await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function finish(p, selector) {
  await p.locator(selector).evaluate(el => el.getAnimations()[0].finish());
  await p.waitForFunction(selector => !document.querySelector(selector), selector);
}
async function shot(p, selector, name) {
  // Element screenshots enlarge the viewport for a tall sheet, dispatching a
  // real resize that correctly settles motion. Capture the current viewport
  // instead so observing a paused frame never changes the book lifecycle.
  await p.screenshot({path:path.join(output,name)}); report.screenshots.push(name);
}
async function photoDirection(p, name, owner) {
  // Inspect painted pixels, not just CSS matrices: duplicated writing or a
  // mirrored photo on the reverse must fail even when its DOM looks correct.
  const rect = await p.locator('#diaryPages .diary-page-photos .diary-photo-button').first().boundingBox();
  const png = await p.screenshot({path:path.join(output,name)}); report.screenshots.push(name);
  const colors = await p.evaluate(async ({png,rect}) => {
    const image = new Image(); image.src = 'data:image/png;base64,' + png; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image,0,0);
    return [.25,.75].map(x => [...ctx.getImageData(Math.round(rect.x + rect.width*x), Math.round(rect.y + rect.height*.5),1,1).data]);
  }, {png:png.toString('base64'),rect});
  check(name+' paints red LEFT and blue RIGHT without mirroring',colors[0][0]>colors[0][2]*1.7&&colors[1][2]>colors[1][0]*1.7);
  // Each member also has a distinct green component, so a missing/mirrored
  // reverse cannot pass by exposing the correctly oriented outgoing photo.
  check(name+' visibly paints the incoming member photograph',Math.abs((colors[0][1]+colors[1][1])/(colors[0][0]+colors[1][2])-markerGreens[owner]/205.5)<.13);
}
async function coverFace(p, name, inside) {
  // Diagnostic materials isolate which physical face is painted. WebKit can
  // pass DOM/backface checks yet paint the inside over the front if clipped.
  const style=await p.addStyleTag({content:`
    .crew-diary .diary-cover-front { background:#e02040 !important; }
    .diary-cover-inside { background:#2040e0 !important; }
    .diary-cover-front > *, .diary-cover-inside > * { visibility:hidden !important; }
  `});
  const rect=await p.locator('.diary-cover-hinge').boundingBox();
  const png=await p.screenshot(); await style.evaluate(el=>el.remove());
  const pixel=await p.evaluate(async ({png,rect})=>{
    const image=new Image(); image.src='data:image/png;base64,'+png; await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    return [...ctx.getImageData(Math.round((rect.x+rect.width*.5)*image.width/innerWidth),Math.round((rect.y+rect.height*.5)*image.height/innerHeight),1,1).data];
  },{png:png.toString('base64'),rect});
  check(name+' paints the '+(inside?'inside':'front')+' cover face',inside?pixel[2]>pixel[0]*3:pixel[0]>pixel[2]*2);
}
async function outsideSpine(p, name) {
  // Before the cover crosses the spine, nothing can occupy the left half.
  // Compare actual painted pixels with the flight hidden; checking the
  // semantic reader alone missed an expanding decorative endpaper.
  // Scenery clouds use WAAPI independently of GSAP. Freeze only surrounding
  // animation during this pixel comparison; the paused book clock is untouched.
  const ambient = await p.evaluateHandle(() => {
    const active = document.getAnimations().filter(animation =>
      animation.playState === 'running' && !animation.effect?.target?.closest?.('#crewDiary'));
    active.forEach(animation => animation.pause());
    return active;
  });
  try {
    const points = await p.locator('.diary-cover-flight').evaluate(el => {
      return [.25,.5,.75].map(y => {
        const probe = document.createElement('i');
        Object.assign(probe.style,{position:'absolute',left:'48%',top:y*100+'%',width:'0',height:'0'});
        el.append(probe); const r=probe.getBoundingClientRect(); probe.remove();
        return {x:Math.round(r.x),y:Math.round(r.y)};
      });
    });
    const visible = await p.screenshot();
    await p.locator('.diary-cover-flight').evaluate(el=>el.style.opacity='0');
    const hidden = await p.screenshot();
    await p.locator('.diary-cover-flight').evaluate(el=>el.style.opacity='');
    const differences = await p.evaluate(async ({visible,hidden,points}) => {
      const sample = async src => {
        const image = new Image(); image.src='data:image/png;base64,'+src; await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
        return points.filter(({x,y})=>x>=0&&x<innerWidth&&y>=0&&y<innerHeight).map(({x,y})=>[...ctx.getImageData(Math.round(x*image.width/innerWidth),Math.round(y*image.height/innerHeight),1,1).data]);
      };
      const [a,b]=await Promise.all([sample(visible),sample(hidden)]);
      return a.map((pixel,i)=>Math.max(...pixel.slice(0,3).map((v,c)=>Math.abs(v-b[i][c]))));
    }, {visible:visible.toString('base64'),hidden:hidden.toString('base64'),points});
    report.spineSamples ||= []; report.spineSamples.push({name,points,differences});
    check(name+' paints no escaped paper left of the spine',differences.length>0&&differences.every(d=>d<12));
  } finally {
    await ambient.evaluate(animations => animations.forEach(animation => animation.play()));
    await ambient.dispose();
  }
}
async function runEngine(type, engine) {
  const browser = await type.launch(engine === 'webkit' && process.env.DIARY_WEBKIT_EXECUTABLE ? {executablePath:process.env.DIARY_WEBKIT_EXECUTABLE} : {});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'no-preference'});
    const m = model();
    const prose = 'Tháng mười, bọn mình mang theo một cuốn sổ.\n\nMây ở rất gần, còn những điều muốn nhớ thì ở lại thật lâu.\n\nDấu tiếng Việt: Ắ Ằ Ẳ Ẵ Ặ Ế Ề Ể Ễ Ệ Ớ Ờ Ở Ỡ Ợ Ứ Ừ Ử Ữ Ự Đ đ.\n\n';
    m.entries.forEach((entry,i) => {
      entry.title = entry.name+' · '+['Những điều để nhớ','Một khoảng trời thật gần','Mùi gió trên áo'][i%3];
      entry.body = entry.name+' · TRÁI → PHẢI\n\n'+prose.repeat(4); entry.revision = 1;
      entry.photos = [0,1,2].map((_,j)=>({id:require('node:crypto').randomUUID(),caption:`Ảnh trong trang của ${entry.name} · ${j+1}`,alt:`Ảnh quan sát ${entry.name}`}));
    });
    const s = session(m,'san');
    await context.addInitScript(s=>sessionStorage.setItem('taxua-diary-session-v1',JSON.stringify(s)),s);
    await mock(context,m);
    const p = await context.newPage(); p.on('pageerror',e=>report.errors.push(engine+': '+e.message));
    const markers = await p.evaluate(({names,greens}) => names.map((name,i) => {
      const canvas = document.createElement('canvas'); canvas.width=720; canvas.height=440;
      const ctx=canvas.getContext('2d'); ctx.fillStyle=`rgb(204,${greens[i]},57)`; ctx.fillRect(0,0,360,440);
      ctx.fillStyle=`rgb(41,${greens[i]},207)`; ctx.fillRect(360,0,360,440); ctx.fillStyle='#fff'; ctx.font='bold 60px sans-serif';
      ctx.fillText('LEFT',20,90); ctx.fillText('RIGHT',400,390); ctx.fillText(name+' F →',180,180);
      return canvas.toDataURL('image/png').split(',')[1];
    }),{names:m.entries.map(entry=>entry.name),greens:markerGreens});
    await context.route('**/functions/v1/taxua-diary/media/**',route=>{
      const id=new URL(route.request().url()).pathname.split('/media/')[1];
      const index=m.entries.findIndex(entry=>entry.photos.some(photo=>photo.id===id));
      return route.fulfill({status:200,contentType:'image/png',body:Buffer.from(markers[index],'base64')});
    });
    await p.goto(url+'#crewDiary'); await p.evaluate(()=>document.fonts.ready);
    await p.locator('#diaryClosed').scrollIntoViewIfNeeded();
    await p.locator('#diaryStage').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-90,behavior:'instant'}));
    await p.waitForTimeout(700); // Allow the outer journey's scroll reveal to settle.
    // Freeze the surrounding scenery for comparable pixel samples. The book
    // runs on its independent WAAPI clock and remains fully seekable.
    await p.evaluate(()=>{ window.gsap?.globalTimeline.pause(); });
    await shot(p,'#diaryClosed',engine+'-closed.png');
    const initial = await p.locator('#diaryOpen').boundingBox();
    await p.locator('#diaryOpen').evaluate(el=>el.click());
    await clock(p,'.diary-cover-flight');
    const flight = await p.locator('.diary-cover-front').boundingBox();
    report.coverGeometry ||= {}; report.coverGeometry[engine] = {initial,flight};
    check(engine+' cover starts at the same position and dimensions', ['x','y','width','height'].every(k=>Math.abs(initial[k]-flight[k])<3));
    for (const fraction of [0,.05,.1,.2,.35,.45,.5,.75,.99]) {
      await seek(p,'.diary-cover-flight',fraction);
      check(engine+' opening keeps semantic reader hidden at '+fraction,!await p.locator('#diaryReader').isVisible());
      await shot(p,'#diaryStage',engine+'-opening-'+Math.round(fraction*100)+'.png');
      if(fraction<=.45) await outsideSpine(p,engine+' opening '+fraction);
      if([0,.35,.75].includes(fraction))await coverFace(p,engine+' opening '+fraction,fraction>.5);
    }
    await finish(p,'.diary-cover-flight');
    check(engine+' opening reveals ready reader only after landing',await p.locator('#diaryReader').isVisible());
    await p.locator('#diaryBook').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-125,behavior:'instant'}));
    await p.waitForFunction(()=>[...document.querySelectorAll('#diaryPages img[data-private-photo]')].every(x=>x.naturalWidth>0&&!x.hidden));
    await p.locator('#diaryPages .diary-writing').evaluate(el=>{el.scrollTop=80;});
    const frozen = await p.locator('#diaryPages').innerHTML();
    await p.locator('[data-diary-edge="1"]').evaluate(el=>el.click()); await clock(p,'.diary-turn-leaf');
    for (const fraction of [0,.25,.5,.75,.99]) {
      await seek(p,'.diary-turn-leaf',fraction);
      check(engine+' outgoing content remains exact at '+fraction,await p.locator('#diaryPages').innerHTML()===frozen);
      check(engine+' owner and bookmark stay outgoing at '+fraction,await p.locator('#diaryPageLabel').innerText()==='Trang của mi'&&await p.locator('[data-bookmark="0"]').getAttribute('aria-pressed')==='true'&&await p.locator('.diary-turn-leaf').getAttribute('data-owner')==='mi');
      check(engine+' moving front keeps outgoing photos at '+fraction,await p.locator('.diary-strip-front .diary-page').evaluateAll(nodes=>nodes.length===16&&nodes.every(n=>n.dataset.owner==='mi'&&n.classList.contains('diary-page-photos'))));
      check(engine+' moving reverse already contains incoming writing at '+fraction,await p.locator('.diary-strip-back .diary-page').evaluateAll(nodes=>nodes.length===16&&nodes.every(n=>n.dataset.owner==='san'&&n.classList.contains('diary-page-writing')&&n.textContent.includes('san · TRÁI → PHẢI'))));
      check(engine+' incoming photos are beneath outgoing front at '+fraction,await p.locator('.diary-turn-underlay').evaluate(el=>el.dataset.owner==='san'&&el.classList.contains('diary-page-photos')));
      check(engine+' 3D parent has no flattening filter at '+fraction,await p.locator('.diary-turn-leaf').evaluate(el=>getComputedStyle(el).filter==='none'&&getComputedStyle(el).transformStyle==='preserve-3d'));
      await shot(p,'#diaryBook',engine+'-turn-'+Math.round(fraction*100)+'.png');
      if(fraction>=.75)await photoDirection(p,engine+'-forward-photos-'+Math.round(fraction*100)+'.png',1);
    }
    check(engine+' bend has distinct strip orientations',await p.locator('.diary-sheet-strip').evaluateAll(nodes=>new Set(nodes.map(n=>getComputedStyle(n).transform)).size>4));
    await p.locator('[data-diary-edge="1"]').evaluate(el=>{el.click();el.click();});
    await p.locator('.diary-turn-preview').evaluate(el=>window.__diaryPreparedImages=[...el.querySelectorAll('img[data-private-photo]')]);
    await finish(p,'.diary-turn-leaf');
    check(engine+' both pages and announcement commit together after turn',await p.locator('#diaryPageLabel').innerText()==='Trang của san'&&await p.locator('#diaryPages .diary-page').evaluateAll(nodes=>nodes.every(n=>n.dataset.owner==='san')));
    check(engine+' rapid input cannot queue extra turns',await p.locator('[data-bookmark="1"]').getAttribute('aria-pressed')==='true');
    check(engine+' landing reuses decoded incoming images and clears staging',await p.locator('#diaryPages img[data-private-photo]').evaluateAll(nodes=>nodes.length===3&&nodes.every(n=>n.naturalWidth>0&&!n.hidden))&&await p.locator('.diary-turn-preview,.diary-turn-underlay').count()===0);
    check(engine+' landing keeps the exact prepared photo nodes',await p.locator('#diaryPages img[data-private-photo]').evaluateAll(nodes=>nodes.every((n,i)=>n===window.__diaryPreparedImages[i])));
    await p.locator('#diaryReader').screenshot({path:path.join(output,engine+'-open-desktop.png')}); report.screenshots.push(engine+'-open-desktop.png');
    await p.locator('#diaryPages .diary-writing').evaluate(el=>{el.scrollTop=110;});
    await p.locator('[data-diary-edge="-1"]').evaluate(el=>el.click()); await clock(p,'.diary-turn-leaf');
    for(const fraction of [.25,.5,.75,.9,.99]){
      await seek(p,'.diary-turn-leaf',fraction);
      check(engine+' backward front preserves outgoing writing and scroll at '+fraction,await p.locator('.diary-strip-front .diary-writing').evaluateAll(nodes=>nodes.length===16&&nodes.every(n=>Math.abs(n.scrollTop-110)<1&&n.textContent.includes('san · TRÁI → PHẢI'))));
      check(engine+' backward reverse carries incoming photographs at '+fraction,await p.locator('.diary-strip-back .diary-page').evaluateAll(nodes=>nodes.length===16&&nodes.every(n=>n.dataset.owner==='mi'&&n.classList.contains('diary-page-photos')&&n.querySelector('figcaption').textContent.includes('mi'))));
      await shot(p,'#diaryBook',engine+'-backward-'+Math.round(fraction*100)+'.png');
      if(fraction>=.75)await photoDirection(p,engine+'-backward-photos-'+Math.round(fraction*100)+'.png',0);
    }
    await finish(p,'.diary-turn-leaf');
    check(engine+' backward landing commits previous whole person',await p.locator('#diaryPageLabel').innerText()==='Trang của mi');
    await p.locator('#diaryClose').evaluate(el=>el.click()); await clock(p,'.diary-cover-flight');
    for(const fraction of [.25,.5,.65,.8,.99]) {
      await seek(p,'.diary-cover-flight',fraction);
      await shot(p,'#diaryStage',engine+'-closing-'+Math.round(fraction*100)+'.png');
      if(fraction>=.65)await outsideSpine(p,engine+' closing '+fraction);
    }
    await finish(p,'.diary-cover-flight');
    check(engine+' closing returns the actual cover and removes animation layers',await p.locator('#diaryClosed').isVisible()&&!await p.locator('#diaryReader').isVisible()&&await p.locator('.diary-cover-flight,.diary-turn-leaf').count()===0);
    await p.setViewportSize({width:390,height:844});
    // WebKit can deliver the resize event after setViewportSize resolves.
    // Let that real lifecycle event settle before starting a new gesture.
    await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await p.waitForTimeout(150);
    await p.locator('#diaryStage').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-70,behavior:'instant'}));
    await p.locator('#diaryOpen').evaluate(el=>el.click()); await clock(p,'.diary-cover-flight');
    for(const fraction of [0,.05,.1,.2,.35,.45,.5,.75,.99]) {
      await seek(p,'.diary-cover-flight',fraction);
      await shot(p,'#diaryStage',engine+'-phone-opening-'+Math.round(fraction*100)+'.png');
      if(fraction<=.45)await outsideSpine(p,engine+' phone opening '+fraction);
    }
    check(engine+' phone has a real opening animation',await p.locator('.diary-cover-hinge').evaluate(el=>getComputedStyle(el).transform.startsWith('matrix3d(')));
    await finish(p,'.diary-cover-flight');
    await p.locator('#diaryBook').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-100,behavior:'instant'}));
    await p.locator('[data-diary-edge="1"]').evaluate(el=>el.click()); await clock(p,'.diary-turn-leaf'); await seek(p,'.diary-turn-leaf',.75);
    check(engine+' phone turn keeps old person until landing',await p.locator('#diaryPageLabel').innerText()==='Trang của mi');
    check(engine+' phone writing reveals the incoming person during turn',await p.locator('.diary-turn-underlay').getAttribute('data-owner')==='san'&&await p.locator('.diary-strip-back .diary-page').evaluateAll(nodes=>nodes.length===10&&nodes.every(n=>n.dataset.owner==='san')));
    await shot(p,'#diaryBook',engine+'-phone-turn-75.png'); await finish(p,'.diary-turn-leaf');
    await p.locator('[data-diary-side="photos"]').click(); await shot(p,'#diaryReader',engine+'-phone-photos.png');
    check(engine+' three photo frames and footer fit phone paper',await p.locator('#diaryPages .diary-page-photos').evaluate(el=>el.scrollHeight<=el.clientHeight+1));
    check(engine+' phone has no horizontal document overflow',await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
    await p.locator('[data-diary-edge="-1"]').evaluate(el=>el.click()); await clock(p,'.diary-turn-leaf');
    await seek(p,'.diary-turn-leaf',.75);
    check(engine+' phone photo reverse and underlay already belong to destination',await p.locator('.diary-turn-underlay').getAttribute('data-owner')==='mi'&&await p.locator('.diary-strip-back .diary-page').evaluateAll(nodes=>nodes.length===10&&nodes.every(n=>n.dataset.owner==='mi'&&n.classList.contains('diary-page-photos'))));
    await photoDirection(p,engine+'-phone-backward-photos-75.png',0);
    await p.evaluate(()=>document.documentElement.dataset.motionPaused='true');
    check(engine+' pause settles phone turn exactly once',await p.locator('.diary-turn-leaf').count()===0&&await p.locator('#diaryPageLabel').innerText()==='Trang của mi');
    await p.evaluate(()=>delete document.documentElement.dataset.motionPaused);
    await p.locator('#diaryClose').evaluate(el=>el.click()); await clock(p,'.diary-cover-flight');
    for(const fraction of [.25,.5,.65,.8,.99]) {
      await seek(p,'.diary-cover-flight',fraction);
      await shot(p,'#diaryStage',engine+'-phone-closing-'+Math.round(fraction*100)+'.png');
      if(fraction>=.65)await outsideSpine(p,engine+' phone closing '+fraction);
    }
    await finish(p,'.diary-cover-flight');
    check(engine+' phone closes back to its original cover',await p.locator('#diaryClosed').isVisible()&&!await p.locator('#diaryReader').isVisible());
    await p.locator('#diaryOpen').evaluate(el=>el.click()); await clock(p,'.diary-cover-flight'); await finish(p,'.diary-cover-flight');
    await p.locator('[data-diary-edge="1"]').evaluate(el=>el.click()); await clock(p,'.diary-turn-leaf');
    await p.evaluate(()=>window.TaxuaDiaryApi.clear());
    check(engine+' logout cancels every private surface immediately',await p.locator('.diary-turn-leaf,.diary-cover-flight,.diary-turn-preview,.diary-turn-underlay').count()===0&&await p.locator('#diaryPages').evaluate(el=>el.childElementCount===0));
    await context.close();
  } finally { await browser.close(); }
}
(async()=>{
  await runEngine(chromium,'chromium');
  if(process.env.DIARY_WEBKIT==='1')await runEngine(webkit,'webkit');
  check('No uncaught browser errors',report.errors.length===0);
  fs.rmSync(path.join(output,'failure.json'),{force:true});
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(report.checks.length+' diary motion checks passed. '+output);
})().catch(error=>{fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({...report,failure:error.message},null,2));console.error(error.stack);process.exitCode=1;});
