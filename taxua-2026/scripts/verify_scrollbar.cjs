/* Real pointer/keyboard coverage for the optional painted page scrollbar. */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {chromium,firefox,webkit} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-scrollbar-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[],otherBrowsers:{}};
fs.mkdirSync(output,{recursive:true});
const check = (name,value) => { assert(value,name);report.checks.push(name); };
const settle = page => page.waitForTimeout(150);
const active = page => page.evaluate(()=>document.documentElement.classList.contains('cloud-scrollbar-active'));
const position = page => page.evaluate(()=>scrollY);
async function synced(page,name) {
  await settle(page);
  const result = await page.evaluate(()=>{
    const rail=document.querySelector('.cloud-scrollbar');
    const thumb=rail.querySelector('[role="scrollbar"]');
    const r=rail.getBoundingClientRect(),t=thumb.getBoundingClientRect();
    const progress=scrollY/(document.documentElement.scrollHeight-document.documentElement.clientHeight);
    return Math.abs((t.top-r.top)/(r.height-t.height)-progress)<.002 && t.top>=r.top-1 && t.bottom<=r.bottom+1 && Math.abs(Number(thumb.getAttribute('aria-valuenow'))-progress*100)<=.51;
  });
  check(name,result);
}
async function photo(page,name) { await page.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png'); }
async function setup(browser,options={}) {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',...options});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('https://api.open-meteo.com/**',r=>r.abort());
  await page.route('**/*.tile.openstreetmap.fr/**',r=>r.abort());
  return page;
}
(async()=>{
  const browser=await chromium.launch({ignoreDefaultArgs:['--hide-scrollbars']});
  try {
    const page=await setup(browser);
    await page.goto(url);await page.evaluate(()=>document.fonts.ready);await settle(page);
    const thumb=page.getByRole('scrollbar');
    check('Desktop enables one accessible painted scrollbar',await active(page) && await thumb.count()===1 && !!await thumb.getAttribute('aria-controls'));
    check('All eight cloud palettes decode',await thumb.locator('img').evaluateAll(images=>images.length===8&&images.every(img=>img.complete&&img.naturalWidth===160&&img.naturalHeight===128)));
    check('Only the root native bar is hidden',await page.evaluate(()=>getComputedStyle(document.documentElement).scrollbarWidth==='none'&&getComputedStyle(document.querySelector('.photo-back')).scrollbarWidth==='thin'));
    check('The thumb has at least a 44px target',await thumb.evaluate(el=>el.offsetWidth>=44&&el.offsetHeight>=44));
    await synced(page,'Thumb is synchronized at the top');
    check('Dotted track and solid progress line are visible',await page.locator('.cloud-scrollbar').evaluate(el=>getComputedStyle(el,'::before').backgroundImage.includes('repeating-linear-gradient')&&getComputedStyle(el.querySelector('.cloud-scrollbar-fill')).backgroundColor!=='rgba(0, 0, 0, 0)'));
    await photo(page,'desktop-hero');
    await page.mouse.wheel(0,570);await settle(page);
    check('Ordinary wheel scrolling remains native',await position(page)>400);
    await synced(page,'Native wheel movement updates the thumb');
    await thumb.focus();const before=await position(page);await page.keyboard.press('ArrowDown');await settle(page);
    check('ArrowDown moves 40px',Math.abs(await position(page)-before-40)<=1);
    await page.keyboard.press('PageDown');await settle(page);
    check('PageDown moves by a reading viewport',await position(page)>before+600);
    await page.keyboard.press('Home');await settle(page);check('Home reaches the beginning',await position(page)===0);
    await page.keyboard.press('End');await synced(page,'End reaches the bottom and synchronizes');
    check('End reaches the document end',await page.evaluate(()=>Math.abs(scrollY-document.documentElement.scrollHeight+document.documentElement.clientHeight)<2));
    await page.keyboard.press('PageUp');await settle(page);check('PageUp leaves the document end',Number(await thumb.getAttribute('aria-valuenow'))<100);
    await page.keyboard.press('Home');await settle(page);
    let t=await thumb.boundingBox(),r=await page.locator('.cloud-scrollbar').boundingBox();
    await page.mouse.move(t.x+t.width/2,t.y+12);await page.mouse.down();
    await page.mouse.move(t.x+t.width/2,r.y+r.height/2,{steps:8});await settle(page);
    check('Real drag moves the document into its middle',await page.evaluate(()=>scrollY/(document.documentElement.scrollHeight-innerHeight)>.4&&scrollY/(document.documentElement.scrollHeight-innerHeight)<.6));
    await page.mouse.move(t.x+t.width/2,r.y+r.height+100,{steps:5});await page.mouse.up();
    await synced(page,'Drag clamps at the document end');
    check('Pointer release clears capture styling',!await page.evaluate(()=>document.documentElement.classList.contains('cloud-scrollbar-dragging')));
    await page.keyboard.press('Home');await settle(page);
    r=await page.locator('.cloud-scrollbar').boundingBox();await page.mouse.click(r.x+22,r.y+r.height*.75);await settle(page);
    check('Track click pages instead of jumping to the pointer percentage',await position(page)>500&&await position(page)<1000);
    await thumb.focus();t=await thumb.boundingBox();await page.mouse.move(t.x+22,t.y+20);await page.mouse.down();
    await page.evaluate(()=>dispatchEvent(new Event('blur')));
    check('Window blur cancels an active drag',!await page.evaluate(()=>document.documentElement.classList.contains('cloud-scrollbar-dragging')));await page.mouse.up();
    await page.evaluate(()=>document.getElementById('departure').scrollIntoView());await settle(page);
    check('Date rail clears the painted control',await page.evaluate(()=>document.querySelector('.chapter-nav').getBoundingClientRect().right<document.querySelector('.cloud-scrollbar').getBoundingClientRect().left-4));
    await page.locator('#chapterToggle').click();await settle(page);await photo(page,'desktop-open-trail');
    check('Open trail panel stays clear of the scrollbar',await page.locator('#trailPanel').evaluate(el=>el.getBoundingClientRect().right<document.querySelector('.cloud-scrollbar').getBoundingClientRect().left));
    await thumb.focus();
    check('Expanded trail menu suppresses the overlapping hover hint',await page.locator('.cloud-scrollbar-hint').evaluate(el=>getComputedStyle(el).display==='none'));
    await page.keyboard.press('Escape');
    await thumb.focus();
    check('Focused hint clears the itinerary date rail',await page.locator('.cloud-scrollbar-hint').evaluate(el=>getComputedStyle(el).visibility==='visible'&&el.getBoundingClientRect().right<document.querySelector('.chapter-nav').getBoundingClientRect().left));
    await photo(page,'desktop-scrollbar-focus');
    const note=page.locator('.note-toggle').first();await note.click();await settle(page);await synced(page,'Expanded notes recompute scroll range');await note.click();
    for (const world of ['sunrise','night','bluehour','daylight','jade','afternoon']) {
      const found=await page.evaluate(world=>{
        const el=[...document.querySelectorAll('.hero,.event,.day-heading,.support-section')].find(el=>el.dataset.phase&&JourneyUI.sceneFor(el).background===world);
        if(!el) return false;
        el.scrollIntoView();return true;
      },world);
      check(world+' has a real scene for review',found);await page.waitForTimeout(450);await photo(page,'world-'+world);
      check(world+' chooses the matching cloud palette',await page.evaluate(world=>{
        const root=document.documentElement;
        const defaults={sunrise:'day',night:'night',bluehour:'predawn',daylight:'noon',jade:'morning',afternoon:'afternoon'};
        const phase=world==='jade'&&root.dataset.scene==='dawn'?'dawn':world==='afternoon'&&root.dataset.scene==='evening'?'evening':defaults[world];
        const visible=[...document.querySelectorAll('.cloud-scrollbar-thumb img')].filter(img=>getComputedStyle(img).visibility==='visible');
        return root.dataset.sceneryWorld===world&&visible.length===1&&visible[0].classList.contains('cloud-scrollbar-'+phase);
      },world));
      await synced(page,world+' retains correct thumb position');
    }
    for(const [world,phase] of [['jade','dawn'],['jade','morning'],['afternoon','afternoon'],['afternoon','evening']]) {
      await page.evaluate(({world,phase})=>{JourneyUI.setSceneryTone(world);document.documentElement.dataset.scene=phase;},{world,phase});
      check(phase+' retains a distinct painted palette within its world',await page.locator('.cloud-scrollbar-thumb img').evaluateAll((images,phase)=>{const visible=images.filter(img=>getComputedStyle(img).visibility==='visible');return visible.length===1&&visible[0].classList.contains('cloud-scrollbar-'+phase);},phase));
    }
    await page.evaluate(()=>document.getElementById('top').scrollIntoView());await settle(page);
    const top=await position(page);await page.locator('.map-invitation').first().click();await settle(page);
    check('Atlas modal suspends the page control',!await active(page)&&await page.locator('.cloud-scrollbar').isHidden());
    check('Atlas sidebar retains a themed native scrollbar',await page.locator('.atlas-sidebar').evaluate(el=>getComputedStyle(el).scrollbarWidth==='thin'&&getComputedStyle(el).scrollbarColor!=='auto'));
    await page.locator('.atlas-fullscreen').click();await settle(page);
    check('Fullscreen atlas keeps the page control suspended',await page.locator('.cloud-scrollbar').isHidden());
    await page.locator('.atlas-fullscreen').click();await page.locator('.atlas-close').click();await settle(page);
    check('Closing atlas restores control and reading position',await active(page)&&Math.abs(await position(page)-top)<2);
    await thumb.focus();await page.keyboard.press('End');await settle(page);
    await page.setViewportSize({width:1000,height:900});await settle(page);
    report.breakpointState=await page.evaluate(()=>({active:document.documentElement.classList.contains('cloud-scrollbar-active'),nativeWidth:getComputedStyle(document.documentElement).scrollbarWidth,focus:document.activeElement.tagName}));
    check('Breakpoint teardown restores native bar and releases focus',!await active(page)&&await thumb.count()===0&&await page.evaluate(()=>getComputedStyle(document.documentElement).scrollbarWidth!=='none'&&document.activeElement.tagName==='MAIN'));
    check('Breakpoint teardown preserves the bottom reading position through native reflow',await page.evaluate(()=>Math.abs(scrollY-document.documentElement.scrollHeight+document.documentElement.clientHeight)<3));
    await page.setViewportSize({width:1440,height:900});await synced(page,'Desktop reactivation follows restored scroll position');
    await page.emulateMedia({forcedColors:'active'});await settle(page);
    check('Forced colors restores platform scrollbar',!await active(page)&&await page.evaluate(()=>getComputedStyle(document.documentElement).scrollbarColor==='auto'));
    await page.emulateMedia({forcedColors:'none'});await settle(page);
    await page.emulateMedia({media:'print'});await settle(page);check('Print removes the decorative control',await page.getByRole('scrollbar').count()===0);
    await page.emulateMedia({media:'screen'});await settle(page);
    await page.evaluate(()=>{document.querySelectorAll('body > :not(.cloud-scrollbar)').forEach(el=>{el.dataset.scrollbarTestStyle=el.getAttribute('style')||'';el.style.display='none';});});await settle(page);
    check('No-scroll documents retain native fallback without a false thumb',!await active(page)&&await page.locator('.cloud-scrollbar').isHidden());
    await page.close();

    for(const [name,options] of [['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['narrow',{viewport:{width:320,height:740},isMobile:true,hasTouch:true}],['landscape',{viewport:{width:1180,height:480}}],['coarse-desktop',{viewport:{width:1440,height:900},hasTouch:true}]]) {
      const p=await setup(browser,options);await p.goto(url);await settle(p);
      check(name+' keeps native bars and no page-edge touch blocker',!await active(p)&&await p.getByRole('scrollbar').count()===0);
      check(name+' has no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await photo(p,name);await p.close();
    }
    const zoom=await setup(browser,{viewport:{width:1100,height:800}});await zoom.goto(url);
    await zoom.evaluate(()=>document.documentElement.style.fontSize='200%');await settle(zoom);
    check('Enlarged text keeps the scrollbar and topbar separated',await zoom.locator('.nav').evaluate(el=>el.getBoundingClientRect().right<document.querySelector('.cloud-scrollbar').getBoundingClientRect().left));
    check('Enlarged text has no horizontal overflow',await zoom.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await photo(zoom,'desktop-200-text');await zoom.close();

    for(const kind of ['images','script','css','observer','gsap']) {
      const p=await setup(browser);
      if(kind==='images') await p.route('**/scrollbar_cloud_*.webp*',r=>r.abort());
      if(kind==='script') await p.route('**/scrollbar.js',r=>r.abort());
      if(kind==='css') await p.route('**/scrollbar.css',r=>r.abort());
      if(kind==='observer') await p.addInitScript(()=>window.ResizeObserver=undefined);
      if(kind==='gsap') await p.route('**/vendor/gsap.min.js',r=>r.abort());
      await p.goto(url);await settle(p);
      if(['script','css','observer'].includes(kind)) check('Missing '+kind+' retains native scrollbar',!await active(p)&&await p.evaluate(()=>getComputedStyle(document.documentElement).scrollbarWidth!=='none'));
      else {check('Missing '+kind+' retains working control',await active(p));await p.getByRole('scrollbar').focus();await p.keyboard.press('End');await synced(p,'Missing '+kind+' still reaches the end');}
      if(kind==='images') {check('Failed paintings leave a visible CSS thumb',await p.locator('.cloud-scrollbar-thumb').evaluate(el=>getComputedStyle(el,'::before').backgroundColor!=='rgba(0, 0, 0, 0)'));await photo(p,'missing-artwork');}
      await p.close();
    }
    const file=await setup(browser);await file.goto('file://'+path.resolve(__dirname,'../index.html'));await settle(file);
    check('Direct-file use enhances successfully',await active(file));await file.getByRole('scrollbar').focus();await file.keyboard.press('End');await synced(file,'Direct-file scrollbar works');await file.close();
    const motion=await setup(browser,{reducedMotion:'no-preference'});await motion.goto(url);await motion.evaluate(()=>document.fonts.ready);await motion.waitForTimeout(600);
    await motion.locator('.nav-links a[href="#food"]').click();await motion.waitForTimeout(140);
    const moving=await position(motion);check('Distant anchor begins enhanced travel',moving>0);
    await motion.getByRole('scrollbar').focus();await motion.keyboard.press('Home');await motion.waitForTimeout(1400);
    check('Scrollbar keys interrupt enhanced travel without resumption',await position(motion)===0);await synced(motion,'Interrupted journey synchronizes thumb');
    await motion.locator('.nav-links a[href="#food"]').click();await motion.waitForTimeout(140);
    t=await motion.getByRole('scrollbar').boundingBox();r=await motion.locator('.cloud-scrollbar').boundingBox();
    await motion.mouse.move(t.x+22,t.y+20);await motion.mouse.down();await motion.mouse.move(t.x+22,r.y+r.height*.4,{steps:6});await motion.mouse.up();
    const stopped=await position(motion);await motion.waitForTimeout(1400);
    check('Pointer drag interrupts enhanced travel without resumption',Math.abs(await position(motion)-stopped)<2);await motion.close();
    for(const [name,type] of [['firefox',firefox],['webkit',webkit]]) report.otherBrowsers[name]=fs.existsSync(type.executablePath())?'installed; not exercised by this helper':'browser binary unavailable';
    check('No uncaught browser errors',report.errors.length===0);
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2));
    console.log(`Passed ${report.checks.length} scrollbar checks; ${output}`);
  } catch(error) {
    report.failure=error.stack;fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify(report,null,2));throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
