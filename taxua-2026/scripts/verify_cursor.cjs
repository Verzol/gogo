/* Native cursor semantics and real interactions; no pointer-following layer. */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {chromium,webkit} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-cursor-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
fs.mkdirSync(output,{recursive:true});
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const cursor = locator => locator.evaluate(el=>getComputedStyle(el).cursor);
const painted = (value,shape,phase) => value.includes(`${shape}_${phase}.png`) && value.endsWith(shape==='arrow'?'auto':'pointer');
const state = (value,shape,fallback) => value.includes('/'+shape+'_') && value.endsWith(fallback);
const pencil = value => value.includes('/diary_pencil.png');
const settle = page => page.waitForTimeout(200);
async function setup(browser,options={}) {
  const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',...options});
  p.on('pageerror',error=>report.errors.push(error.message));
  await p.route('https://api.open-meteo.com/**',r=>r.abort());
  await p.route('**/*.tile.openstreetmap.fr/**',r=>r.abort());
  return p;
}
async function photo(p,name) {
  await p.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');
}
async function diaryPencilChecks(browser) {
  // Reuse the diary's browser-local fixture: no real credentials/backend writes.
  const {model,mock,session,authenticate}=require('./verify_diary.cjs');
  const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
  const m=model(),s=session(m,'san');
  m.entries.forEach(entry=>{entry.body='Lời viết kiểm thử để chọn và đọc như bình thường.';});
  await context.addInitScript(s=>sessionStorage.setItem('taxua-diary-session-v1',JSON.stringify(s)),s);
  await mock(context,m);
  const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(url+'#crewDiary');await p.evaluate(()=>document.fonts.ready);
  check('Closed cover, heading and surrounding section keep regular cursors',(await Promise.all(['#crewDiary','#diaryTitle','#diaryOpen','#diaryStatus'].map(selector=>cursor(p.locator(selector))))).every(value=>!pencil(value))&&state(await cursor(p.locator('#diaryOpen')),'hand','pointer'));
  const art=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/sources/diary-pencil-artwork.json'))).asset;
  await p.locator('#diaryOpen').click();await p.locator('#diaryReader').waitFor();
  await p.waitForFunction(()=>!document.querySelector('.diary-cover-flight,.diary-turn-leaf')&&document.getElementById('diaryBook').getAttribute('aria-busy')==='false');
  check('Open book paper, writing and photo page use pencil',(await Promise.all(['#diaryPages','.diary-writing','.diary-page-photos'].map(selector=>cursor(p.locator(selector).first())))).every(pencil));
  check('Open book toolbar, bookmarks and surroundings keep regular cursors',(await Promise.all(['#diaryRefresh','#diaryBookmarks button','#diaryTurnHint','#crewDiary'].map(selector=>cursor(p.locator(selector).first())))).every(value=>!pencil(value)));
  check('Pencil decodes at 32px and uses its graphite hotspot',await p.evaluate(async art=>{const img=new Image();img.src=art.path;await img.decode();return img.width===32&&img.height===32&&getComputedStyle(document.getElementById('diaryPages')).cursor.includes(art.hotspot.join(' '));},art));
  const writing=p.locator('#diaryPages .diary-writing');await writing.scrollIntoViewIfNeeded();
  const selection=await writing.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el.querySelector('p'));const r=range.getClientRects()[0];return {x:r.x,y:r.y,width:r.width,height:r.height};});
  await p.mouse.move(selection.x+1,selection.y+selection.height/2);await p.mouse.down();await p.mouse.move(selection.x+Math.min(selection.width-1,200),selection.y+selection.height/2,{steps:8});await p.mouse.up();
  check('Pencil cursor preserves real mouse text selection',await p.evaluate(()=>getSelection().toString().length>0));
  await p.evaluate(()=>getSelection().removeAllRanges());
  const edge=p.locator('[data-diary-edge="1"]');await edge.scrollIntoViewIfNeeded();
  check('Enabled paper edge shows pencil',pencil(await cursor(edge)));
  const e=await edge.boundingBox();await p.mouse.move(e.x+e.width/2,e.y+e.height/2);await p.mouse.down();await p.mouse.move(e.x+e.width/2-90,e.y+e.height/2,{steps:8});
  check('Active diary drag keeps grabbing on paper and controls',state(await cursor(edge),'grabbing','grabbing')&&state(await cursor(p.locator('#diaryPages')),'grabbing','grabbing'));
  await p.keyboard.press('Escape');await p.mouse.up();await settle(p);
  check('Cancelling diary drag restores pencil',pencil(await cursor(edge)));
  await p.locator('[data-bookmark="1"]').click();await authenticate(p,'san',true);
  const editor=p.locator('#diaryEditBody');
  check('Editor dialog fields and save actions keep regular themed cursors',state(await cursor(editor),'text','text')&&state(await cursor(p.locator('#diaryEditTitle')),'text','text')&&state(await cursor(p.locator('#diaryPublish')),'hand','pointer'));
  await editor.fill('Nét chì trên giấy.');await editor.press('End');await editor.pressSequentially(' Tà Xùa.');
  check('Editor preserves Vietnamese typing and caret placement',await editor.inputValue()==='Nét chì trên giấy. Tà Xùa.');
  await editor.press('Control+a');
  check('Editor preserves keyboard text selection',await editor.evaluate(el=>el.selectionEnd-el.selectionStart===el.value.length));
  await p.locator('#diaryPublish').evaluate(el=>el.disabled=true);
  check('Disabled diary action shows unavailable cursor',state(await cursor(p.locator('#diaryPublish')),'unavailable','not-allowed'));await p.locator('#diaryPublish').evaluate(el=>el.disabled=false);
  await p.emulateMedia({forcedColors:'active'});
  check('Forced colors restores diary text and action cursors',(await cursor(editor))==='text'&&(await cursor(p.locator('#diaryPublish')))==='pointer');
  await p.emulateMedia({forcedColors:'none',media:'print'});
  check('Print removes book-page pencil',!pencil(await cursor(p.locator('#diaryPages'))));
  await p.emulateMedia({forcedColors:'none',media:'screen'});
  await editor.evaluate(el=>el.closest('dialog').close());
  await p.locator('#diaryClose').click();
  check('Closing book removes pencil from page surfaces',!pencil(await cursor(p.locator('#diaryPages'))));await context.close();
}
async function toyCursorChecks(browser) {
  const p=await setup(browser,{reducedMotion:'no-preference'});await p.goto(url);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(650);
  await p.locator('#fund').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-85,behavior:'instant'}));await p.waitForTimeout(1100);
  const coin=p.locator('.fund-toy-coin').first();await coin.scrollIntoViewIfNeeded();
  check('Draggable coin shows open hand',state(await cursor(coin),'grab','grab'));
  await coin.locator('img').evaluate(el=>el.decode());await coin.hover();
  const b=await coin.boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();
  await p.mouse.move(b.x+b.width/2+70,b.y+b.height/2-30,{steps:12});
  report.coinDrag=await coin.evaluate(el=>({cursor:getComputedStyle(el).cursor,classes:el.className,paused:document.documentElement.dataset.motionPaused,hidden:document.hidden}));
  check('Real coin drag switches to closed hand',state(await cursor(coin),'grabbing','grabbing'));
  await p.mouse.up();await settle(p);
  check('Releasing coin restores open hand',state(await cursor(coin),'grab','grab'));
  await p.close();
}
async function baseChecks(browser,name) {
  const p=await setup(browser);await p.goto(url);await p.evaluate(()=>document.fonts.ready);await settle(p);
  check(name+': painted arrow and hand on desktop',painted(await cursor(p.locator('html')),'arrow','day')&&painted(await cursor(p.locator('.brand')),'hand','day'));
  const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/sources/cursor-artwork.json')));
  check(name+': every native cursor decodes at 32px',await p.evaluate(async assets=>{
    return (await Promise.all(assets.map(async asset=>{const img=new Image();img.src=asset.path;await img.decode();return img.naturalWidth===32&&img.naturalHeight===32;}))).every(Boolean);
  },Object.values(manifest.assets)));
  check(name+': measured hotspots reach the browser',await p.locator('html').evaluate((el,hotspot)=>getComputedStyle(el).cursor.includes(hotspot.join(' ')),manifest.crops.arrow.hotspot)&&await p.locator('.brand').evaluate((el,hotspot)=>getComputedStyle(el).cursor.includes(hotspot.join(' ')),manifest.crops.hand.hotspot));
  for(const [world,phase,palette] of [['sunrise','opening','day'],['night','night','night'],['bluehour','predawn','predawn'],['jade','dawn','dawn'],['jade','morning','morning'],['daylight','noon','noon'],['afternoon','afternoon','afternoon'],['afternoon','evening','evening']]) {
    await p.evaluate(({world,phase})=>{JourneyUI.setSceneryTone(world);document.documentElement.dataset.scene=phase;},{world,phase});
    check(name+': '+phase+' selects matching arrow and hand',painted(await cursor(p.locator('html')),'arrow',palette)&&painted(await cursor(p.locator('.brand')),'hand',palette));
    check(name+': '+phase+' supplies every interaction palette',await p.evaluate(({assets,palette})=>{const style=getComputedStyle(document.documentElement);return Object.values(assets).filter(asset=>asset.path.endsWith('_'+palette+'.png')).every(asset=>{const value=style.getPropertyValue(asset.cssVariable);return value.includes(asset.path.split('/').pop())&&value.includes(asset.hotspot.join(' '))&&value.trim().endsWith(asset.fallback);});},{assets:manifest.assets,palette}));
  }
  // Back to real navigation: inspect the scenery state after a native scroll.
  await p.locator('#departure').evaluate(el=>el.scrollIntoView());await settle(p);
  check(name+': native chapter navigation changes the palette',painted(await cursor(p.locator('html')),'arrow','night'));
  await p.locator('#top').evaluate(el=>el.scrollIntoView());await settle(p);
  await p.locator('.map-invitation-button').first().click();await settle(p);
  const map=p.locator('#tripAtlas .leaflet-container');await map.waitFor();
  check(name+': atlas canvas uses painted open hand',state(await cursor(map),'grab','grab'));
  const zoomIn=p.locator('.leaflet-control-zoom-in'),zoomOut=p.locator('.leaflet-control-zoom-out');
  check(name+': map zoom controls use magnifying cursors',state(await cursor(zoomIn),'zoom_in','zoom-in')&&state(await cursor(zoomOut),'zoom_out','zoom-out'));
  await zoomIn.click();await settle(p);
  await p.locator('.atlas-fullscreen').click();await settle(p);
  await p.locator('.atlas-locations').click();
  check(name+': atlas search uses painted I-beam',state(await cursor(p.locator('.atlas-search')),'text','text'));
  await p.locator('.atlas-search').fill('Tà Xùa');
  check(name+': atlas search accepts text',await p.locator('.atlas-search').inputValue()==='Tà Xùa');
  const box=await map.boundingBox();await p.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await p.mouse.down();
  await p.mouse.move(box.x+box.width*.5+45,box.y+box.height*.5+30,{steps:5});
  check(name+': real map drag uses painted closed hand',state(await cursor(map),'grabbing','grabbing'));await p.mouse.up();
  check(name+': releasing map restores open hand',state(await cursor(map),'grab','grab'));
  await photo(p,name+'-atlas');await p.locator('.atlas-close').click();
  check(name+': closed diary page edges do not use pencil',!pencil(await cursor(p.locator('.diary-page-edge').first())));
  check(name+': diary dialogs keep regular text cursors',state(await cursor(p.locator('#diaryPassword')),'text','text')&&state(await cursor(p.locator('#diaryEditBody')),'text','text'));
  const spin=p.locator('.wheel-spin');
  await spin.evaluate(el=>el.setAttribute('aria-disabled','true'));
  check(name+': disabled game action shows unavailable cursor',state(await cursor(spin),'unavailable','not-allowed'));
  await spin.evaluate(el=>el.setAttribute('aria-disabled','false'));
  const reset=p.locator('.wheel-reset');await reset.evaluate(el=>el.disabled=true);
  check(name+': busy wheel control keeps wait cursor',state(await cursor(reset),'wait','wait'));await reset.evaluate(el=>el.disabled=false);
  const packing=p.locator('#packingList input').first();const initial=await packing.isChecked();
  check(name+': checkbox uses the painted hand',(await cursor(packing)).includes('/hand_'));
  await packing.click();check(name+': checkbox still toggles',await packing.isChecked()!==initial);await packing.click();
  await p.locator('#top').evaluate(el=>el.scrollIntoView());await settle(p);
  // Screenshots omit OS cursors. These temporary, noninteractive overlays show
  // the exact native PNGs at 32px for artwork review, not OS rendering evidence.
  await p.evaluate(()=>{
    for(const [shape,x,y] of [['arrow',690,215],['hand',1180,48]]) {
      const value=getComputedStyle(shape==='arrow'?document.documentElement:document.querySelector('.brand')).cursor;
      const img=document.createElement('img');img.dataset.cursorPreview='';img.src=value.match(/url\("?([^"\)]+)/)[1];img.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:32px;height:32px;z-index:100;pointer-events:none`;document.body.append(img);
    }
  });
  await photo(p,name+'-hero-artwork-preview');await p.locator('[data-cursor-preview]').evaluateAll(els=>els.forEach(el=>el.remove()));
  await p.emulateMedia({media:'print'});
  check(name+': print has native cursors',!(await cursor(p.locator('html'))).includes('.png')&&(await cursor(p.locator('.brand')))==='pointer');
  await p.emulateMedia({media:'screen'});
  if(name==='chromium') {
    await p.emulateMedia({forcedColors:'active'});
    check('Forced colors restores native arrow and hand',(await cursor(p.locator('html')))==='auto'&&(await cursor(p.locator('.brand')))==='pointer');
    await p.emulateMedia({forcedColors:'none'});
    const thumb=p.getByRole('scrollbar');await thumb.scrollIntoViewIfNeeded();
    check('Painted scrollbar handle uses open hand',state(await cursor(thumb),'grab','grab'));
    const t=await thumb.boundingBox();await p.mouse.move(t.x+t.width/2,t.y+t.height/2);await p.mouse.down();await p.mouse.move(t.x+t.width/2,t.y+t.height/2+80,{steps:5});
    check('Scrollbar dragging overrides all custom cursors',state(await cursor(thumb),'grabbing','grabbing')&&state(await cursor(p.locator('.brand')),'grabbing','grabbing'));await p.mouse.up();
    check('Releasing scrollbar restores painted hand',(await cursor(p.locator('.brand'))).includes('/hand_'));
  }
  await p.close();
}
(async()=>{
  const browser=await chromium.launch();
  try {
    await baseChecks(browser,'chromium');
    await diaryPencilChecks(browser);
    await toyCursorChecks(browser);
    for(const [name,options] of [['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['narrow',{viewport:{width:320,height:740},isMobile:true,hasTouch:true}],['coarse-desktop',{hasTouch:true}]]) {
      const p=await setup(browser,options);const requests=[];
      p.on('request',r=>{if(r.url().includes('/painted/cursor/')) requests.push(r.url());});
      await p.goto(url);await settle(p);
      check(name+': no custom cursor or artwork requests',!(await cursor(p.locator('html'))).includes('.png')&&(await cursor(p.locator('.brand')))==='pointer'&&requests.length===0);
      check(name+': no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      check(name+': diary keeps native cursor',!pencil(await cursor(p.locator('#diaryOpen'))));
      await photo(p,name);
      if(name==='phone') {await p.locator('#crewDiary').scrollIntoViewIfNeeded();await photo(p,'diary-phone');}
      await p.close();
    }
    for(const [name,pattern] of [['missing-artwork','**/painted/cursor/*.png*'],['missing-stylesheet','**/cursor.css*'],['missing-palettes','**/cursor-palettes.css*']]) {
      const p=await setup(browser);await p.route(pattern,r=>r.abort());await p.goto(url);await settle(p);
      const value=await cursor(p.locator('.brand'));
      check(name+': hand retains native pointer fallback',value.endsWith('pointer'));
      check(name+': diary retains native pointer and text fallbacks',(await cursor(p.locator('#diaryOpen'))).endsWith('pointer')&&(await cursor(p.locator('#diaryEditBody'))).endsWith('text'));
      await p.locator('.nav-links a').first().click();await settle(p);
      check(name+': navigation still works',await p.evaluate(()=>scrollY>100));await p.close();
    }
    const file=await setup(browser);await file.goto('file://'+path.resolve(__dirname,'../index.html'));await settle(file);
    check('Direct-file cursor resolves local PNG',painted(await cursor(file.locator('html')),'arrow','day')&&await file.evaluate(async()=>{const img=new Image();img.src='./figures/decor/painted/cursor/arrow_day.png';await img.decode();return img.naturalWidth===32;}));
    check('Direct-file cover keeps regular hand and pencil asset resolves locally',state(await cursor(file.locator('#diaryOpen')),'hand','pointer')&&await file.evaluate(async()=>{const img=new Image();img.src='./figures/decor/painted/cursor/diary_pencil.png';await img.decode();return img.naturalWidth===32;}));await file.close();
    const noScript=await setup(browser,{javaScriptEnabled:false});await noScript.goto(url);
    check('No-JavaScript page keeps painted arrow',painted(await cursor(noScript.locator('html')),'arrow','day'));
    check('No-JavaScript closed diary keeps regular hand',state(await cursor(noScript.locator('#diaryOpen')),'hand','pointer'));await noScript.close();
    if(process.env.CURSOR_WEBKIT==='1') {
      const wk=await webkit.launch();try {await baseChecks(wk,'webkit');} finally {await wk.close();}
    }
    check('No uncaught browser errors',report.errors.length===0);
    console.log(JSON.stringify({passed:report.checks.length,errors:report.errors,evidence:output}));
  } finally {fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
