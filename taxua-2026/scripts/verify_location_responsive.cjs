/* Verify art direction across screen shapes, independently of chooser breakpoints. */
const fs = require('fs'),path = require('path'),assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-location-responsive';
const base = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const shapes = [[1920,1080],[1440,900],[1280,1024],[820,1180],[390,844],[320,740],[740,390],[2560,1080],[2560,720],[768,768]];
const ids = ['ridge','tree','dolphin','meadow','waterfall','coffee'];
const report = {checkedAt:new Date().toISOString(),screens:[],errors:[]};
fs.mkdirSync(output,{recursive:true});
(async () => {
  const browser = await chromium.launch();
  try {
    const p = await browser.newPage({reducedMotion:'reduce'});
    p.on('pageerror',e => report.errors.push(e.stack));
    await p.route('https://api.open-meteo.com/**',r => r.fulfill({contentType:'application/json',body:'{}'}));
    await p.goto(base);await p.waitForFunction(() => !!window.JourneyLocations);
    await p.evaluate(() => document.fonts.ready);
    for (const [width,height] of shapes) {
      await p.keyboard.press('Escape');await p.setViewportSize({width,height});
      await p.evaluate(() => scrollTo({top:0,behavior:'instant'}));
      for (const id of ids) {
        // Real hover/touch semantics are covered by verify_location_scenes.cjs.
        // Dispatch here without scrolling the chooser off the hero on short screens.
        await p.locator('.location-sticker[data-location="'+id+'"]').evaluate(el => el.click());
        const variant = width <= height ? 'portrait' : 'wide';
        await p.waitForFunction(({id,variant}) => JourneyLocations.active === id &&
          document.querySelector('.location-slot:last-child .location-painting').src.endsWith('_'+variant+'.webp'),{id,variant});
        await p.waitForFunction(() => [...document.querySelectorAll('.location-slot:last-child img')].every(i => i.complete && i.naturalWidth > 0));
        const result = await p.locator('.location-slot').last().evaluate(slot => {
          const img = slot.querySelector('.location-painting'),rect = img.getBoundingClientRect();
          const anchor = slot.querySelector('.location-steam,.location-spray');
          const detail = anchor?.getBoundingClientRect();
          return {src:img.src,native:[img.naturalWidth,img.naturalHeight],
            covers:rect.left <= 0 && rect.top <= 0 && rect.right >= innerWidth && rect.bottom >= innerHeight,
            decoded:[...slot.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0),
            detailVisible:!detail || (Number.isFinite(parseFloat(anchor.style.left)) && Number.isFinite(parseFloat(anchor.style.top)) && detail.right > 0 && detail.left < innerWidth && detail.bottom > 0 && detail.top < innerHeight),
            overflow:document.documentElement.scrollWidth > innerWidth + 1,
            position:getComputedStyle(img).objectPosition};
        });
        assert(result.covers && result.decoded && result.detailVisible && !result.overflow,`${id} at ${width}x${height}: ${JSON.stringify(result)}`);
        report.screens.push({id,width,height,variant,...result});
        await p.screenshot({path:path.join(output,`${id}-${width}x${height}.png`)});
      }
    }
    assert.equal(report.errors.length,0,'No uncaught browser errors');
    console.log('PASS',report.screens.length,'scene/viewport combinations');
  } finally {
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2));
    await browser.close();
  }
})().catch(e => {console.error(e);process.exitCode = 1;});
