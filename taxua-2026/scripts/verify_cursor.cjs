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
  }
  // Back to real navigation: inspect the scenery state after a native scroll.
  await p.locator('#departure').evaluate(el=>el.scrollIntoView());await settle(p);
  check(name+': native chapter navigation changes the palette',painted(await cursor(p.locator('html')),'arrow','night'));
  await p.locator('#top').evaluate(el=>el.scrollIntoView());await settle(p);
  await p.locator('.map-invitation-button').first().click();await settle(p);
  const map=p.locator('#tripAtlas .leaflet-container');await map.waitFor();
  check(name+': atlas canvas keeps native grab cursor',(await cursor(map))==='grab');
  await p.locator('.atlas-fullscreen').click();await settle(p);
  await p.locator('.atlas-locations').click();
  check(name+': atlas search keeps text cursor',(await cursor(p.locator('.atlas-search')))==='text');
  await p.locator('.atlas-search').fill('Tà Xùa');
  check(name+': atlas search accepts text',await p.locator('.atlas-search').inputValue()==='Tà Xùa');
  const box=await map.boundingBox();await p.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await p.mouse.down();
  await p.mouse.move(box.x+box.width*.5+45,box.y+box.height*.5+30,{steps:5});
  check(name+': real map drag keeps grabbing cursor',(await cursor(map))==='grabbing');await p.mouse.up();
  await photo(p,name+'-atlas');await p.locator('.atlas-close').click();
  check(name+': diary page edges retain grab cursor',(await cursor(p.locator('.diary-page-edge').first()))==='grab');
  check(name+': diary password and editor retain text cursors',(await cursor(p.locator('#diaryPassword')))==='text'&&(await cursor(p.locator('#diaryEditBody')))==='text');
  const spin=p.locator('.wheel-spin');
  await spin.evaluate(el=>el.setAttribute('aria-disabled','true'));
  check(name+': disabled game action has native cursor',(await cursor(spin))==='default');
  await spin.evaluate(el=>el.setAttribute('aria-disabled','false'));
  const reset=p.locator('.wheel-reset');await reset.evaluate(el=>el.disabled=true);
  check(name+': busy wheel control keeps wait cursor',(await cursor(reset))==='wait');await reset.evaluate(el=>el.disabled=false);
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
    check('Painted scrollbar handle keeps grab cursor',(await cursor(thumb))==='grab');
    const t=await thumb.boundingBox();await p.mouse.move(t.x+t.width/2,t.y+t.height/2);await p.mouse.down();await p.mouse.move(t.x+t.width/2,t.y+t.height/2+80,{steps:5});
    check('Scrollbar dragging overrides all custom cursors',(await cursor(thumb))==='grabbing'&&(await cursor(p.locator('.brand')))==='grabbing');await p.mouse.up();
    check('Releasing scrollbar restores painted hand',(await cursor(p.locator('.brand'))).includes('/hand_'));
  }
  await p.close();
}
(async()=>{
  const browser=await chromium.launch();
  try {
    await baseChecks(browser,'chromium');
    for(const [name,options] of [['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['narrow',{viewport:{width:320,height:740},isMobile:true,hasTouch:true}],['coarse-desktop',{hasTouch:true}]]) {
      const p=await setup(browser,options);const requests=[];
      p.on('request',r=>{if(r.url().includes('/painted/cursor/')) requests.push(r.url());});
      await p.goto(url);await settle(p);
      check(name+': no custom cursor or artwork requests',!(await cursor(p.locator('html'))).includes('.png')&&(await cursor(p.locator('.brand')))==='pointer'&&requests.length===0);
      check(name+': no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await photo(p,name);await p.close();
    }
    for(const [name,pattern] of [['missing-artwork','**/painted/cursor/*.png'],['missing-stylesheet','**/cursor.css']]) {
      const p=await setup(browser);await p.route(pattern,r=>r.abort());await p.goto(url);await settle(p);
      const value=await cursor(p.locator('.brand'));
      check(name+': hand retains native pointer fallback',value.endsWith('pointer'));
      await p.locator('.nav-links a').first().click();await settle(p);
      check(name+': navigation still works',await p.evaluate(()=>scrollY>100));await p.close();
    }
    const file=await setup(browser);await file.goto('file://'+path.resolve(__dirname,'../index.html'));await settle(file);
    check('Direct-file cursor resolves local PNG',painted(await cursor(file.locator('html')),'arrow','day')&&await file.evaluate(async()=>{const img=new Image();img.src='./figures/decor/painted/cursor/arrow_day.png';await img.decode();return img.naturalWidth===32;}));await file.close();
    const noScript=await setup(browser,{javaScriptEnabled:false});await noScript.goto(url);
    check('No-JavaScript page keeps painted arrow',painted(await cursor(noScript.locator('html')),'arrow','day'));await noScript.close();
    if(process.env.CURSOR_WEBKIT==='1') {
      const wk=await webkit.launch();try {await baseChecks(wk,'webkit');} finally {await wk.close();}
    }
    check('No uncaught browser errors',report.errors.length===0);
    console.log(JSON.stringify({passed:report.checks.length,errors:report.errors,evidence:output}));
  } finally {fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
