/* Photo-sized viewer: local accounts and transformed public landscape fixtures. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session } = require('./verify_diary.cjs');
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const output = process.env.DIARY_VIEWER_REVIEW_DIR || '/tmp/taxua-diary-viewer';
fs.mkdirSync(output, { recursive: true });
const report = { checkedAt: new Date().toISOString(), transport: 'Mocked accounts and local public-photo derivatives; no private crew media', checks: [], errors: [] };
const check = (label, value) => { assert(value, label); report.checks.push(label); };
const shapes = [['portrait',960,1280],['landscape',1600,900],['square',900,900],['panorama',1800,450],['tall',450,1800],['small',240,160]];
const ready = p => p.waitForFunction(() => { const i = document.querySelector('.diary-full-photo'); return i?.naturalWidth && !i.hidden && document.querySelector('.diary-photo-detail-image').getAttribute('aria-busy') === 'false'; });
async function metrics(p) {
  return p.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom }; };
    const sheet = document.getElementById('diarySheet'), img = sheet.querySelector('.diary-full-photo');
    const stage = sheet.querySelector('.diary-photo-detail-image'), meta = sheet.querySelector('.diary-photo-meta'),canvas=sheet.querySelector('.diary-photo-detail');
    return { sheet:rect(sheet), img:rect(img), stage:rect(stage), meta:rect(meta), canvas:rect(canvas), captionClear:getComputedStyle(meta).backgroundColor==='rgba(0, 0, 0, 0)', captionFont:getComputedStyle(meta).fontSize, natural:{width:img.naturalWidth,height:img.naturalHeight},
      headingsHidden:document.getElementById('diarySheetEyebrow').hidden && document.getElementById('diarySheetTitle').clientWidth <= 1,
      sheetClear:getComputedStyle(sheet).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(sheet).padding === '0px',
      overflow:sheet.scrollWidth > sheet.clientWidth + 1 && getComputedStyle(sheet).overflowX!=='hidden',
      controls:[...sheet.querySelectorAll('[data-diary-photo-step],[data-close-sheet]')].map(b => ({...rect(b),background:getComputedStyle(b).backgroundColor})),
      caption:sheet.querySelector('.diary-photo-caption').textContent, counter:sheet.querySelector('.diary-photo-position').textContent,
      title:document.getElementById('diarySheetTitle').textContent };
  });
}
(async () => {
  const b = await chromium.launch();
  try {
    const generator = await b.newPage();
    const base = fs.readFileSync(path.join(__dirname,'../figures/places/p13_1440.webp')).toString('base64');
    const fixtures = new Map();
    for (const [id,w,h] of shapes) {
      const encoded = await generator.evaluate(async ({base,w,h}) => {
        const img = new Image(); img.src = 'data:image/webp;base64,' + base; await img.decode();
        const c = document.createElement('canvas'); c.width=w;c.height=h;const ctx=c.getContext('2d');
        const scale=Math.max(w/img.width,h/img.height);ctx.drawImage(img,(w-img.width*scale)/2,(h-img.height*scale)/2,img.width*scale,img.height*scale);
        return c.toDataURL('image/jpeg',.85).split(',')[1];
      },{base,w,h});
      fixtures.set(id,Buffer.from(encoded,'base64'));
    }
    await generator.close();
    for (const [width,height,font] of [[1440,1050,1],[981,884,1],[390,844,1],[320,568,1],[844,390,1],[390,844,2]]) {
      const label=`${width}x${height} text ${font}`, c=await b.newContext({viewport:{width,height},hasTouch:width<500,reducedMotion:'reduce',colorScheme:'dark'});
      const m=model(); m.entries[0].body='Những dòng trong sổ.\n'.repeat(600);
      m.entries[0].photos=shapes.map(([id])=>({id,caption:id==='small'?'':id==='tall'?'Kỷ niệm, mây và gió. '.repeat(8).slice(0,160):'Tà Xùa, những ngày ở trên mây.',alt:'Ảnh '+id}));
      await mock(c,m);
      await c.route('**/taxua-diary/media/**', r=>{
        const id=new URL(r.request().url()).pathname.split('/').pop();
        return fixtures.has(id)?r.fulfill({contentType:'image/jpeg',body:fixtures.get(id)}):r.fallback();
      });
      await c.addInitScript(s=>{try{if(location.origin===s.origin)localStorage.setItem('taxua-diary-session-v1',JSON.stringify(s.value));}catch{}},{origin:new URL(url).origin,value:session(m,'mi')});
      const p=await c.newPage();p.on('pageerror',e=>report.errors.push(label+': '+e.message));await p.goto(url);await p.evaluate(()=>document.fonts.ready);
      if(font>1)await p.addStyleTag({content:'html {font-size:200% !important}'});
      await p.locator('#diaryOpen').click();await p.locator('#diaryReader').waitFor({state:'visible'});
      if(width<850)await p.locator('[data-diary-side="photos"]').click();
      await p.locator('[data-view-photo="portrait"]').click(); await ready(p);
      let portraitWidth, fixedControls;
      for(let i=0;i<shapes.length;i++){
        const [id]=shapes[i];if(i){await p.keyboard.press('ArrowRight');await ready(p);}
        await p.mouse.move(0,0);const g=await metrics(p);report.lastGeometry={label,id,...g};
        if(!i){portraitWidth=g.stage.width;fixedControls=g.controls;}
        check(label+' '+id+' keeps arrows fixed across image shapes',g.controls.every((v,j)=>Math.abs(v.x-fixedControls[j].x)<1&&Math.abs(v.y-fixedControls[j].y)<1));
        check(label+' '+id+' removes visible heading block',g.headingsHidden&&g.sheetClear);
        check(label+' '+id+' preserves full image proportions',Math.abs(g.img.width/g.img.height-g.natural.width/g.natural.height)<.015&&!await p.locator('.diary-full-photo').getAttribute('data-crop-x'));
        check(label+' '+id+' fits viewport without sideways scrolling',!g.overflow&&g.sheet.x>=0&&g.sheet.right<=width+1&&g.sheet.y>=0&&g.sheet.bottom<=height+1);
        check(label+' '+id+' has no image mat and fits the reading area',Math.abs(g.img.width-g.stage.width)<1&&Math.abs(g.img.height-g.stage.height)<1&&g.stage.x>=g.canvas.x-1&&g.stage.y>=g.canvas.y-1);
        check(label+' '+id+' has transparent usable controls',g.controls.every(v=>v.width>=44&&v.height>=44&&v.background.startsWith('rgba(')&&parseFloat(v.background.split(',')[3])<.5));
        check(label+' '+id+' exposes compact position and owner accessibly',g.counter===`${i+1} / 6`&&g.title.includes('của mi'));
        check(label+' '+id+' keeps entire caption',g.caption===m.entries[0].photos[i].caption);
        if(width>=981&&id==='portrait')check(label+' portrait dialog follows narrow image',g.stage.width<width*.8&&Math.abs(g.stage.width-g.img.width)<=1);
        if(width>=981&&id==='landscape')check(label+' landscape resizes dialog',g.stage.width>portraitWidth);
        if(['portrait','landscape','tall'].includes(id))await p.screenshot({path:`${output}/${width}-${height}-${font}-${id}.png`});
        await p.locator('[data-photo-zoom="in"]').click();
        const enlarged=await metrics(p);
        check(label+' '+id+' zoom enlarges full frame without a viewport cap',Math.abs(enlarged.stage.width-g.stage.width*1.5)<1&&Math.abs(enlarged.stage.height-g.stage.height*1.5)<1);
        check(label+' '+id+' frame also grows vertically when space permits',enlarged.stage.height>=g.stage.height-1);
        check(label+' '+id+' enlarges entire image proportionally',Math.abs(enlarged.img.width/g.img.width-1.5)<.015&&Math.abs(enlarged.img.height/g.img.height-1.5)<.015);
        check(label+' '+id+' frame contains the complete enlarged image',Math.abs(enlarged.img.x-enlarged.stage.x)<1&&Math.abs(enlarged.img.y-enlarged.stage.y)<1&&Math.abs(enlarged.img.width-enlarged.stage.width)<1&&Math.abs(enlarged.img.height-enlarged.stage.height)<1);
        check(label+' '+id+' caption remains transparent and exactly still',enlarged.captionClear&&enlarged.captionFont===g.captionFont&&Math.abs(enlarged.meta.x-g.meta.x)<1&&Math.abs(enlarged.meta.y-g.meta.y)<1&&Math.abs(enlarged.meta.width-g.meta.width)<1&&Math.abs(enlarged.meta.height-g.meta.height)<1);
        check(label+' '+id+' keeps dialog and arrows inside viewport while zoomed',!enlarged.overflow&&enlarged.sheet.x>=0&&enlarged.sheet.right<=width+1&&enlarged.controls.every((v,j)=>Math.abs(v.x-g.controls[j].x)<1&&Math.abs(v.y-g.controls[j].y)<1));
        if(['portrait','landscape'].includes(id))await p.screenshot({path:`${output}/${width}-${height}-${font}-${id}-zoom.png`});
        await p.keyboard.press('0');
        const reset=await metrics(p);
        check(label+' '+id+' reset restores frame and complete photograph',Math.abs(reset.stage.width-g.stage.width)<1&&Math.abs(reset.stage.height-g.stage.height)<1&&Math.abs(reset.img.width-reset.stage.width)<1);

      }
      // A small photo must expand completely without introducing a crop.
      await p.locator('[data-photo-zoom="in"]').click();
      if(width>=981){
        const whole=await metrics(p);
        check(label+' small photo remains fully visible after zoom',Math.abs(whole.img.width-whole.stage.width)<1&&Math.abs(whole.img.height-whole.stage.height)<1);
      }
      await p.keyboard.press('0');
      const smallFit=await metrics(p);
      for(let j=0;j<6;j++)await p.keyboard.press('+');
      const beyond=await metrics(p);
      check(label+' zoom exceeds previous 5x limit and frame grows beyond viewport',parseInt(await p.locator('[data-photo-scale]').textContent())>500&&beyond.stage.width>width&&Math.abs(beyond.stage.width-beyond.img.width)<1);
      check(label+' high zoom does not move or scale caption',beyond.captionClear&&Math.abs(beyond.meta.y-smallFit.meta.y)<1&&beyond.captionFont===smallFit.captionFont);
      await p.keyboard.press('0');
      // Use a landscape for overflow/panning: a tiny image may fit even at 5x.
      for(let j=0;j<4;j++){await p.keyboard.press('ArrowLeft');await ready(p);}
      // Real mouse wheel/drag, toolbar and keyboard zoom on every viewport.
      const stageBox=await p.locator('.diary-photo-detail-image').boundingBox();
      const center={x:stageBox.x+stageBox.width/2,y:stageBox.y+stageBox.height/2};
      await p.mouse.move(center.x,center.y);await p.mouse.wheel(0,-300);
      await p.waitForFunction(()=>document.querySelector('[data-photo-scale]').textContent!=='100%');
      const scaleBefore=await p.locator('[data-photo-scale]').textContent();
      check(label+' wheel zooms without resizing controls',parseInt(scaleBefore)>100&&await p.locator('.diary-photo-detail-image').getAttribute('data-magnified')==='true');
      const beforePan=await p.locator('.diary-photo-detail-image').boundingBox();
      await p.mouse.down();await p.mouse.move(center.x+35,center.y+24,{steps:5});
      const afterPan=await p.locator('.diary-photo-detail-image').boundingBox(),pan=Math.max(afterPan.x-beforePan.x,afterPan.y-beforePan.y);
      check(label+' drag pans overflowing image before release',pan>10);await p.mouse.up();
      await p.keyboard.press('0');check(label+' keyboard reset fits image',await p.locator('[data-photo-scale]').textContent()==='100%');
      await p.locator('[data-photo-zoom="in"]').click();check(label+' toolbar zooms',parseInt(await p.locator('[data-photo-scale]').textContent())>100);
      await p.locator('[data-photo-zoom="reset"]').click();
      await p.mouse.dblclick(center.x,center.y);check(label+' double click zooms',await p.locator('[data-photo-scale]').textContent()==='250%');
      await p.mouse.move(center.x,center.y);await p.mouse.down();await p.mouse.move(width-1,0,{steps:5});await p.mouse.up();
      const bounded=await p.locator('.diary-photo-detail-image').evaluate(el=>{
        const s=el.getBoundingClientRect(),c=el.closest('.diary-photo-detail').getBoundingClientRect();
        return Math.abs(s.x+s.width/2-c.x-c.width/2)<=Math.max(0,(s.width-c.width)/2)+1&&Math.abs(s.y+s.height/2-c.y-c.height/2)<=Math.max(0,(s.height-c.height)/2)+1;
      });
      check(label+' outside release clamps pan and keeps viewer open',bounded&&await p.locator('#diarySheet').isVisible()&&await p.locator('.diary-photo-detail-image').getAttribute('data-dragging')==='false');
      await p.keyboard.press('0');
      const zoomControls=await p.locator('.diary-photo-zoom').boundingBox(),captionRect=await p.locator('.diary-photo-meta').boundingBox();
      check(label+' zoom controls stay below fixed caption',zoomControls.y>=captionRect.y+captionRect.height-1);
      for(let j=0;j<4;j++){await p.keyboard.press('ArrowRight');await ready(p);}
      if(width===1440){
        await p.keyboard.press('ArrowLeft');await ready(p);
        await p.setViewportSize({width:620,height:820});await p.waitForTimeout(100);
        const resized=await metrics(p);
        check(label+' open viewer refits after resize',resized.sheet.right<=621&&resized.sheet.bottom<=821&&!resized.overflow);
        await p.setViewportSize({width,height});await p.waitForTimeout(100);
        await p.keyboard.press('ArrowRight');await ready(p);
      }
      check(label+' last boundary stays within album',await p.locator('[data-diary-photo-step="1"]').isDisabled());
      await p.keyboard.press('ArrowRight');check(label+' keyboard does not wrap',await p.locator('.diary-photo-position').textContent()==='6 / 6');
      await p.keyboard.press('Escape');await p.locator('#diarySheet').waitFor({state:'hidden'});
      check(label+' Escape clears image and returns focus',await p.locator('.diary-full-photo').count()===0&&await p.locator('[data-view-photo="portrait"]').evaluate(el=>el===document.activeElement));
      await p.locator('[data-view-photo="portrait"]').click();await ready(p);
      await p.mouse.click(2,2);check(label+' backdrop click closes',!await p.locator('#diarySheet').isVisible());
      await p.locator('[data-view-photo="portrait"]').click();await ready(p);
      if(width===390&&font===1){
        const client=await c.newCDPSession(p), r=await p.locator('.diary-photo-detail-image').boundingBox(), x=r.x+r.width*.7,y=r.y+r.height*.5;
        await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
        for(let d=15;d<=90;d+=15)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-d,y}]});
        await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await p.waitForFunction(()=>document.querySelector('.diary-photo-position').textContent==='2 / 6');await ready(p);
        check(label+' real touch swipe advances photo',await p.locator('.diary-photo-position').textContent()==='2 / 6');
        const touchStage=await p.locator('.diary-photo-detail-image').boundingBox(),tx=touchStage.x+touchStage.width/2,ty=touchStage.y+touchStage.height/2;
        const touches=(distance,shift=0)=>[{x:tx-distance+shift,y:ty,id:1},{x:tx+distance+shift,y:ty,id:2}];
        await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches(30)});
        for(let distance=35;distance<=70;distance+=5)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches(distance,8)});
        check(label+' real two finger pinch zooms inside photo',parseInt(await p.locator('[data-photo-scale]').textContent())>150);
        await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+78,y:ty,id:2}]});
        await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+110,y:ty+20,id:2}]});
        await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        check(label+' pinch and one finger continuation never navigate',await p.locator('.diary-photo-position').textContent()==='2 / 6');
        await p.keyboard.press('0');
        const tap=async()=>{await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty,id:3}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
        await tap();await tap();check(label+' double tap magnifies',await p.locator('[data-photo-scale]').textContent()==='250%');
        await tap();await tap();check(label+' double tap resets magnified photo',await p.locator('[data-photo-scale]').textContent()==='100%');
        const beforeZoom=await p.locator('.diary-full-photo').evaluate(el=>el.clientWidth);
        await client.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});await p.waitForTimeout(100);
        check(label+' native pinch zoom preserves image CSS size',await p.locator('.diary-full-photo').evaluate(el=>el.clientWidth)===beforeZoom);
        await p.locator('.diary-photo-detail-image').evaluate(el=>{
          el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:7,isPrimary:true,clientX:200,clientY:200}));
          el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:7,isPrimary:true,clientX:100,clientY:200}));
        });
        check(label+' panning while zoomed does not change photo',await p.locator('.diary-photo-position').textContent()==='2 / 6');
        await client.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});

      }
      await p.locator('[data-close-sheet]').click();await p.locator('#diarySheet').waitFor({state:'hidden'});
      // Writing shares the dialog shell: the photo layout must not leak into it.
      if(width<850)await p.locator('[data-diary-side="writing"]').click();
      await p.locator('[data-full-writing]').click();
      check(label+' reading sheet keeps heading and paper',!await p.locator('#diarySheet').evaluate(el=>el.classList.contains('diary-photo-viewer'))&&await p.locator('#diarySheetTitle').evaluate(el=>el.clientWidth>1)&&await p.locator('#diarySheetEyebrow').isVisible());
      await p.locator('[data-close-sheet]').click();
      await c.close();
    }
    // Full-size media can be delayed or fail independently from thumbnails.
    const c=await b.newContext({viewport:{width:1200,height:900},reducedMotion:'reduce'}),m=model();
    m.entries[0].photos=['portrait','landscape','failed'].map(id=>({id,caption:'Ảnh '+id,alt:id}));await mock(c,m);
    let release,entered,failFull=true;const mediaRequests=[];const held=new Promise(r=>release=r),started=new Promise(r=>entered=r);
    await c.route('**/taxua-diary/media/**',async r=>{
      const parsed=new URL(r.request().url()),id=parsed.pathname.split('/').pop();mediaRequests.push(id+':'+parsed.searchParams.get('size'));
      if(parsed.searchParams.get('size')==='full'&&id==='portrait'){entered();await held;}
      if(parsed.searchParams.get('size')==='full'&&id==='failed'&&failFull==='corrupt')return r.fulfill({contentType:'image/jpeg',body:Buffer.from('invalid-image-fixture')});
      if(parsed.searchParams.get('size')==='full'&&id==='failed'&&failFull)return r.fulfill({status:503,contentType:'application/json',body:'{"error":"REQUEST_FAILED"}'});
      return r.fulfill({contentType:'image/jpeg',body:fixtures.get(id)||fixtures.get('portrait')});
    });
    await c.addInitScript(s=>{try{sessionStorage.setItem('taxua-diary-session-v1',JSON.stringify(s))}catch{}},session(m,'mi'));
    const p=await c.newPage();p.on('pageerror',e=>report.errors.push('async: '+e.message));await p.goto(url);
    await p.locator('#diaryOpen').click();
    await p.waitForFunction(()=>[...document.querySelectorAll('#diaryPages img[data-private-photo]')].every(img=>img.naturalWidth&&!img.hidden));
    await p.locator('[data-view-photo="portrait"]').click();await started;
    await p.locator('.diary-full-photo').waitFor({state:'visible'});
    await p.waitForFunction(()=>document.querySelector('.diary-full-photo').naturalWidth>0);
    check('slow full image immediately shows already loaded thumbnail',await p.locator('.diary-photo-detail-image').getAttribute('aria-busy')==='true'&&!await p.locator('.diary-photo-detail-image .diary-image-fallback').isVisible()&&await p.locator('[data-close-sheet]').isVisible());
    check('opening preview does not fetch its thumbnail twice',mediaRequests.filter(r=>r==='portrait:thumb').length===1);
    check('neighbors do not compete with selected full download',mediaRequests.filter(r=>r.endsWith(':full')).length===1);
    await p.mouse.move(600,450);await p.mouse.wheel(0,-200);
    check('thumbnail can zoom while full image is still downloading',parseInt(await p.locator('[data-photo-scale]').textContent())>100);
    await p.keyboard.press('ArrowRight');await ready(p);const wide=await p.locator('.diary-photo-detail-image').evaluate(e=>e.clientWidth);release();await p.waitForTimeout(100);
    check('late image never replaces newly selected photograph',await p.locator('.diary-full-photo').getAttribute('alt')==='landscape'&&await p.locator('.diary-photo-detail-image').evaluate(e=>e.clientWidth)===wide);
    await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>document.querySelector('.diary-photo-detail-image').getAttribute('aria-busy')==='false');
    check('failed full-size media retains preview, retry and navigation',!await p.locator('.diary-full-photo').isHidden()&&await p.locator('[data-retry-photo]').isVisible()&&await p.locator('[data-diary-photo-step="-1"]').isEnabled());
    failFull='corrupt';await p.locator('[data-retry-photo]').click();
    await p.waitForFunction(()=>document.querySelector('.diary-photo-detail-image').getAttribute('aria-busy')==='false');
    check('corrupt full image keeps usable preview and retry',await p.locator('[data-retry-photo]').isVisible()&&await p.locator('.diary-full-photo').evaluate(el=>el.naturalWidth>0&&!el.hidden));
    failFull=false;const attemptsBeforeRetry=mediaRequests.filter(r=>r==='failed:full').length;
    await p.locator('[data-retry-photo]').click();await ready(p);
    check('retry replaces preview with full image without reopening',await p.locator('.diary-full-photo').getAttribute('data-quality')==='full'&&mediaRequests.filter(r=>r==='failed:full').length===attemptsBeforeRetry+1);
    await p.keyboard.press('ArrowLeft');await ready(p);
    await p.keyboard.press('ArrowLeft');await ready(p);
    check('returning to viewed photo reuses full size cache',mediaRequests.filter(r=>r==='portrait:full').length===1);
    await p.keyboard.press('ArrowRight');await ready(p);
    check('viewer recovers from media failure without reopening',await p.locator('.diary-full-photo').getAttribute('alt')==='landscape');
    m.expire=true;await p.evaluate(()=>TaxuaDiaryApi.read().catch(()=>{}));
    check('session loss closes viewer and clears private image',!await p.locator('#diarySheet').isVisible()&&await p.locator('.diary-full-photo').count()===0);
    check('session loss clears cached thumbnail and full photo',await p.evaluate(()=>!TaxuaDiaryApi.cachedPhoto('portrait')&&!TaxuaDiaryApi.cachedPhoto('portrait','full')));
    await c.close();
    // Prefetch only immediate neighbors, and honor data-saving preferences.
    for(const saveData of [false,true]){
      const c=await b.newContext({viewport:{width:1200,height:900},reducedMotion:'reduce'}),m=model(),requests=[];
      let releaseSelected;const selectedGate=new Promise(r=>releaseSelected=r);
      m.entries[0].photos=shapes.map(([id])=>({id,caption:'',alt:id}));await mock(c,m);
      await c.route('**/taxua-diary/media/**',async r=>{
        const u=new URL(r.request().url()),id=u.pathname.split('/').pop();requests.push(id+':'+u.searchParams.get('size'));
        if(saveData&&id==='square'&&u.searchParams.get('size')==='full')await selectedGate;
        return r.fulfill({contentType:'image/jpeg',body:fixtures.get(id)});
      });
      await c.addInitScript(({s,saveData})=>{sessionStorage.setItem('taxua-diary-session-v1',JSON.stringify(s));Object.defineProperty(navigator,'connection',{value:{saveData,effectiveType:'4g'}});},{s:session(m,'mi'),saveData});
      const p=await c.newPage();p.on('pageerror',e=>report.errors.push('prefetch: '+e.message));await p.goto(url);await p.locator('#diaryOpen').click();
      await p.waitForFunction(()=>[...document.querySelectorAll('#diaryPages img[data-private-photo]')].every(el=>el.naturalWidth&&!el.hidden));
      await p.locator('[data-view-photo="square"]').click();
      if(saveData){
        await p.locator('[data-photo-zoom="in"]').click();const before=await p.locator('[data-photo-scale]').textContent();
        releaseSelected();await ready(p);
        check('full image upgrade preserves zoom without hiding preview',await p.locator('[data-photo-scale]').textContent()===before&&await p.locator('.diary-full-photo').getAttribute('data-quality')==='full');
      }else await ready(p);
      if(saveData){await p.waitForTimeout(350);check('data saving skips full size prefetch',requests.filter(r=>r.endsWith(':full')).join()==='square:full');}
      else{
        await p.waitForFunction(()=>TaxuaDiaryApi.cachedPhoto('landscape','full')&&TaxuaDiaryApi.cachedPhoto('panorama','full'));
        check('only immediate neighbors prefetch',requests.filter(r=>r.endsWith(':full')).length===3);
        await p.keyboard.press('ArrowRight');await ready(p);
        check('next photo uses prefetched full image without new request',requests.filter(r=>r==='panorama:full').length===1);
      }
      await p.locator('[data-close-sheet]').click();const count=requests.length;await p.waitForTimeout(250);
      check('close cancels scheduled speculative downloads '+saveData,requests.length===count);
      await c.close();
    }
    check('no uncaught browser errors',report.errors.length===0);
    fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));console.log(report.checks.length+' photo-viewer checks passed; '+output);
  }finally{await b.close();}
})().catch(e=>{fs.writeFileSync(output+'/failure.json',JSON.stringify({...report,failure:e.stack},null,2));console.error(e);process.exitCode=1;});
