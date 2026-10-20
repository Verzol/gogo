/* Guard against greeting/loading text moving the opening and forecast. */
const fs = require('fs'),path = require('path'),assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const base = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-womens-day-layout';
const report = {checks:[],errors:[],measurements:[]};
const check = (name,value) => {assert(value,name);report.checks.push(name);};
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
const boxes = p => p.evaluate(() => Object.fromEntries(['.hero','.hero-copy','.hero-summary','.arrival-countdown','.wd-invite--hero'].map(selector => {
  const r = document.querySelector(selector).getBoundingClientRect();
  return [selector,{x:r.x + scrollX,y:r.y + scrollY,width:r.width,height:r.height}];
})));
const stable = (before,after) => Object.keys(before).every(s => Object.keys(before[s]).every(k => Math.abs(before[s][k] - after[s][k]) < 1));
(async () => {
  fs.mkdirSync(output,{recursive:true});const browser = await chromium.launch();
  try {
    for (const [width,height,enlarged] of [[1440,1000],[1024,768],[768,1024],[390,844],[320,800],[740,390],[320,800,true]]) {
      const name = width + 'x' + height + (enlarged ? ' enlarged' : '');
      const p = await browser.newPage({viewport:{width,height},reducedMotion:width === 1440 ? 'no-preference' : 'reduce'});
      p.on('pageerror',e => report.errors.push(e.message));
      await p.route('https://api.open-meteo.com/**',r => r.abort());
      await p.route('**/womens_day/landscape_*.webp',async r => {await wait(600);await r.continue();});
      await p.goto(base);await p.waitForFunction(() => !!window.JourneyWomensDay);await p.evaluate(() => document.fonts.ready);
      if (enlarged) await p.addStyleTag({content:'html {font-size:200% !important;}'});
      await wait(800);
      const button = p.locator('.wd-invite--hero .wd-bouquet'),message = p.locator('.wd-invite--hero .wd-message');
      const before = await boxes(p);
      check(name+' hides inactive greeting',await message.isHidden());
      await button.click();await p.waitForFunction(() => document.querySelector('.wd-invite--hero .wd-bouquet').getAttribute('aria-busy') === 'true');
      check(name+' loading keeps layout stable',stable(before,await boxes(p)));
      await p.waitForFunction(() => JourneyWomensDay.active === 'hero');await wait(800);
      const shown = await boxes(p);report.measurements.push({name,before,shown});
      check(name+' visible greeting keeps layout stable',stable(before,shown) && await message.isVisible());
      if (!enlarged && [1440,390].includes(width)) await p.screenshot({path:path.join(output,'active-'+width+'.png'),fullPage:false});
      await p.keyboard.press('Escape');await wait(200);
      check(name+' dismissal keeps layout stable',stable(before,await boxes(p)) && await message.isHidden());
      await p.mouse.click(2,10);await button.hover();await p.waitForFunction(() => JourneyWomensDay.active === 'hero');
      check(name+' hover keeps layout stable',stable(before,await boxes(p)));
      await p.mouse.move(2,10);await p.waitForFunction(() => !JourneyWomensDay.active);
      check(name+' hover exit keeps layout stable',stable(before,await boxes(p)));
      await p.close();
    }
    check('no uncaught browser errors',report.errors.length === 0);
    console.log('PASS',report.checks.length,'Women’s Day layout checks');
  } finally {fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(error => {console.error(error);process.exitCode = 1;});
