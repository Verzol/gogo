/* Mobile layout and interaction regression. Forecasts are deterministic fixtures. */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-mobile-ui-review';
const base = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[],measurements:[]};
const payload = {daily:{time:['2026-10-23','2026-10-24','2026-10-25'],weather_code:[51,48,65],temperature_2m_min:[12,-2,8],temperature_2m_max:[18,4,14],precipitation_probability_max:[60,10,90],wind_speed_10m_max:[0,12,60],wind_gusts_10m_max:[0,22,90]}};
fs.mkdirSync(output,{recursive:true});
function check(name,result) { assert(result,name); report.checks.push(name); }
async function shot(p,name) { await p.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png'); }
async function jump(p,id) {
  await p.evaluate(id => { const el=document.getElementById(id); const offset=parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);scrollTo(0,el.getBoundingClientRect().top+scrollY-offset); },id);
  await p.waitForTimeout(800);
}
(async()=>{
  const browser=await chromium.launch();
  try {
    for(const [name,width,height] of [['narrow',320,740],['small',360,800],['phone',390,844],['wide-phone',430,932],['landscape',844,390],['desktop',1440,900]]) {
      const p=await browser.newPage({viewport:{width,height},hasTouch:width<1024});
      p.on('pageerror',e=>report.errors.push(name+': '+e.message));
      await p.route('https://api.open-meteo.com/**',r=>r.fulfill({json:payload}));
      await p.goto(base);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(650);
      check(name+' has no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
      check(name+' retains all schedule events and guides',await p.locator('.event').count()===24&&await p.locator('.place-source').count()===18);
      check(name+' separates forecasts from the countdown',await p.evaluate(()=>tripWeather.getBoundingClientRect().bottom<=arrivalCountdown.getBoundingClientRect().top));
      if(width<768) {
        check(name+' keeps the three forecast columns readable',await p.locator('.weather-condition,.weather-probability').evaluateAll(es=>es.every(e=>parseFloat(getComputedStyle(e).fontSize)>=12)));
        check(name+' has comfortable menu and motion targets',await p.locator('#navToggle,#weatherMotion').evaluateAll(es=>es.every(e=>e.offsetWidth>=44&&e.offsetHeight>=44)));
        check(name+' hides itinerary dates on the opening',await p.locator('.chapter-nav').evaluate(e=>e.inert&&getComputedStyle(e).visibility==='hidden'));
        if(width===390) {
          check('phone shows all six location stickers in its first screen',await p.locator('.location-stickers').evaluate(e=>e.querySelectorAll('button').length===6&&e.getBoundingClientRect().bottom<innerHeight));
          check('phone places the explorer before forecasts and countdown',await p.evaluate(()=>locationExplorer.getBoundingClientRect().bottom<=tripWeather.getBoundingClientRect().top&&tripWeather.getBoundingClientRect().bottom<=arrivalCountdown.getBoundingClientRect().top));
          report.measurements.push(await p.evaluate(()=>({width:innerWidth,heroHeight:document.getElementById('top').offsetHeight,weatherTop:tripWeather.offsetTop,countdownTop:arrivalCountdown.getBoundingClientRect().top})));
        }
        for(const second of [0,15,30,60,120]) {
          await p.locator('#openingWorld').evaluate((el,second)=>el.querySelectorAll('.opening-cloud img').forEach(img=>img.getAnimations().forEach(a=>{a.pause();a.currentTime=second*1000+a.effect.getTiming().duration*.35;})),second);
          await shot(p,name+'-sky-'+second);
        }
        await p.locator('#openingWorld').evaluate(el=>el.querySelectorAll('.opening-cloud img').forEach(img=>img.getAnimations().forEach(a=>a.play())));
        await p.locator('.weather-day').first().tap();await p.waitForFunction(()=>weatherParticles.dataset.weather==='rain'&&weatherParticles.dataset.rain==='drizzle'&&getComputedStyle(document.querySelector('.weather-rain')).opacity==='1');
        check(name+' displays drizzle on touch selection',await p.evaluate(()=>weatherParticles.dataset.weather==='rain'&&weatherParticles.dataset.rain==='drizzle'&&getComputedStyle(document.querySelector('.weather-rain')).opacity==='1'));
        const calm=await p.locator('.opening-cloud--left img').first().evaluate(e=>e.getAnimations()[0].playbackRate);
        const clock=await p.locator('#arrivalCountdown').evaluate(e=>e.getBoundingClientRect().top);
        await p.locator('.weather-day').nth(2).tap();await p.waitForTimeout(300);
        check(name+' wind increases motion within a mobile ceiling',await p.locator('.opening-cloud--left img').first().evaluate((e,calm)=>e.getAnimations()[0].playbackRate>calm&&e.getAnimations()[0].playbackRate<=2.4,calm));
        check(name+' selecting another day keeps the countdown stable',Math.abs(await p.locator('#arrivalCountdown').evaluate(e=>e.getBoundingClientRect().top)-clock)<2);
        await p.locator('#weatherMotion').tap();await p.waitForTimeout(100);
        const pose=await p.locator('.opening-cloud--left img').first().evaluate(e=>getComputedStyle(e).translate);
        await p.waitForTimeout(160);
        check(name+' pause retains the moving cloud pose',await p.locator('.opening-cloud--left img').first().evaluate(e=>getComputedStyle(e).translate)===pose);
        await p.locator('#weatherMotion').tap();
        await jump(p,'dayOverview');
        check(name+' provides a derived four-day overview',await p.locator('.day-overview').count()===4&&await p.locator('.day-overview li a').count()===24);
        await p.locator('.day-overview summary').first().click();
        check(name+' day overview reveals real event anchors',await p.locator('.day-overview[open] a[href="#departure"]').isVisible());
        await shot(p,name+'-overview');
      }
      await jump(p,'thao-coffee');
      if(width<768||name==='landscape') {
        check(name+' shows dates only in the itinerary',await p.locator('.chapter-nav').evaluate(e=>!e.inert&&getComputedStyle(e).visibility==='visible'));
        if(name==='landscape') {
          check('landscape keeps dates visible with the trail collapsed',await p.locator('#chapterDates').isVisible() && await p.locator('#trailPanel').isHidden());
          await p.locator('#chapterDates a[href="#day-2"]').click();await p.waitForTimeout(1300);
          check('landscape date navigation reveals the chosen day stops',await p.locator('[data-trail-day="day-2"]').isVisible());
          await p.keyboard.press('Escape');
        }
        await p.locator('#navToggle').click();
        check(name+' exposes useful support destinations',await p.locator('#navLinks a[href="#fund"]').isVisible()&&await p.locator('#navLinks a[href="#practical"]').isVisible());
        await shot(p,name+'-menu');
        await p.locator('#navLinks a[href="#packing"]').click();await p.waitForTimeout(1300);
        check(name+' support anchors clear navigation without a date overlay',await p.locator('#packing').evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('.nav').getBoundingClientRect().bottom)&&await p.locator('.chapter-nav').evaluate(e=>e.inert&&getComputedStyle(e).visibility==='hidden'));
        await shot(p,name+'-packing');
      }
      await jump(p,'cloudWheel');
      if(width<768||name==='landscape') {
        check(name+' keeps optional settings above the dial',await p.locator('.wheel-settings').evaluate(e=>!e.open&&e.getBoundingClientRect().top<document.querySelector('.wheel-stage').getBoundingClientRect().top+5));
        await p.locator('.wheel-settings summary').click();
        await p.locator('.wheel-settings summary').click();
        const person=p.locator('[data-wheel-person]').first();const selected=await person.getAttribute('aria-pressed');await person.click();
        check(name+' wheel participant toggles work with settings closed',await person.getAttribute('aria-pressed')!==selected);
      }
      await p.emulateMedia({reducedMotion:'reduce'});await p.locator('.wheel-spin').click();
      check(name+' announces a wheel winner',!!await p.locator('#cloudWheel').getAttribute('data-winner')&&await p.locator('.wheel-result').getAttribute('aria-live')==='polite');
      await shot(p,name+'-wheel');
      if(width<768) {
        await p.evaluate(()=>{document.documentElement.style.fontSize='32px';scrollTo(0,0);});await p.waitForTimeout(650);
        check(name+' enlarged title and temperatures reflow locally',await p.locator('#heroSky,.weather-range').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)));
        check(name+' enlarged header keeps the menu onscreen',await p.locator('#navToggle').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));
        await shot(p,name+'-text-200');
        await p.locator('#navToggle').click();
        check(name+' enlarged menu fits the visible viewport',await p.locator('#navLinks').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}));
        await shot(p,name+'-text-200-menu');
      }
      await p.close();
    }
    for (const mode of ['missing-gsap','file']) {
      const p=await browser.newPage({viewport:{width:390,height:844}});
      p.on('pageerror',e=>report.errors.push(mode+': '+e.message));
      await p.route('https://api.open-meteo.com/**',r=>r.fulfill({json:payload}));
      if(mode==='missing-gsap') await p.route('**/vendor/*.js',r=>r.fulfill({contentType:'application/javascript',body:'// optional motion unavailable'}));
      await p.goto(mode==='file' ? require('url').pathToFileURL(path.resolve(__dirname,'../index.html')).href : base);
      await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(600);
      await p.locator('#heroScrollAction').click();await p.waitForTimeout(1200);
      check(mode+' itinerary anchor remains usable',await p.locator('#itinerary').evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('.nav').getBoundingClientRect().bottom-1));
      await p.locator('[data-chapter="day-3"]').click();await p.waitForTimeout(1400);
      check(mode+' day anchor uses one navigation offset',await p.locator('#day-3').evaluate(e=>Math.abs(e.getBoundingClientRect().top-parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop))<3));
      await p.close();
    }
    const resized=await browser.newPage({viewport:{width:390,height:844}});
    resized.on('pageerror',e=>report.errors.push('resize: '+e.message));
    await resized.route('https://api.open-meteo.com/**',r=>r.fulfill({json:payload}));
    await resized.goto(base);await resized.evaluate(()=>document.fonts.ready);await resized.waitForTimeout(600);
    await resized.setViewportSize({width:1440,height:900});await resized.waitForTimeout(300);
    check('desktop resize restores its original cloud lanes',await resized.locator('#openingWorld .opening-cloud img').evaluateAll(es=>es.filter(e=>e.getAnimations().length).length)===18);
    await resized.setViewportSize({width:390,height:844});await resized.waitForTimeout(300);
    check('returning to phone removes excess copies and cancels retired tracks',await resized.locator('#openingWorld .opening-cloud img').evaluateAll(es=>es.filter(e=>e.getAnimations().length).length===5&&es.filter(e=>e.classList.contains('cloud-repeat')).length===2));
    await resized.close();
    check('no uncaught page errors',report.errors.length===0);
    console.log('Passed '+report.checks.length+' mobile UI checks. Evidence: '+output);
  } finally {
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
