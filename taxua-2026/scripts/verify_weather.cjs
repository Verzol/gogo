/* Deterministic weather and opening acceptance. No fixture controls on the site.
   Reports and screenshots are separate from older review evidence. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {pathToFileURL} = require('url');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = process.env.WEATHER_REVIEW_DIR || path.join(root,'review','sky-weather');
const base = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const dates = ['2026-10-23','2026-10-24','2026-10-25'];
const report = {checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[],requests:[]};
fs.mkdirSync(output,{recursive:true});
const check = (name,value) => { assert(value,name); report.checks.push(name); };
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
function fixture(codes = [0,63,73],extra = {}) {
  return {daily:{time:[...dates],weather_code:codes,temperature_2m_min:[4,12,-2],temperature_2m_max:[16,19,3],apparent_temperature_min:[1,10,-6],precipitation_probability_max:[0,80,95],precipitation_sum:[0,12,3],snowfall_sum:[0,0,2],wind_speed_10m_max:[8,24,12],wind_gusts_10m_max:[15,35,22],...extra}};
}
let browser;
async function page(options = {}) {
  const context = await browser.newContext({viewport:options.viewport || {width:1440,height:900},timezoneId:options.timezoneId || 'Asia/Ho_Chi_Minh',hasTouch:!!options.touch,reducedMotion:options.reduced ? 'reduce' : 'no-preference'});
  const p = await context.newPage();
  p.on('pageerror',e => report.errors.push(e.message));
  await p.clock.install({time:new Date(options.time || '2026-10-15T08:00:00Z')});
  let calls = 0;
  if (options.init) await p.addInitScript(options.init);
  if (options.noGsap) await p.route('**/vendor/*',r => r.abort());
  if (options.brokenCloud) await p.route('**/cloud_overcast*.webp',r => r.fulfill({contentType:'image/webp',body:'invalid optional cloud'}));
  if (options.cloudDelay) await p.route('**/cloud_overcast*.webp',async r => { await sleep(700); await r.continue(); });
  await p.route('https://api.open-meteo.com/**',async route => {
    calls++;
    const url = new URL(route.request().url());
    report.requests.push({start:url.searchParams.get('start_date'),end:url.searchParams.get('end_date'),timezone:url.searchParams.get('timezone')});
    if (options.delay) await sleep(options.delay);
    if (options.timeout) return;
    if (options.offline) return route.abort();
    return route.fulfill({status:options.status || 200,contentType:'application/json',body:JSON.stringify(options.payload || fixture())});
  });
  await p.goto(options.file ? pathToFileURL(path.join(root,'index.html')).href : base);
  await p.evaluate(() => document.fonts.ready);
  if (!options.delay) await p.waitForFunction(() => !document.getElementById('weatherDetail').textContent.includes('Đang lấy'));
  const end = () => context.close();
  return {p,context,calls:() => calls,end};
}
async function shot(p,name) { await p.screenshot({path:path.join(output,name+'.png')}); report.screenshots.push(name+'.png'); }
async function preview(p,index,kind) {
  await p.locator('.weather-day').nth(index).hover();
  await p.waitForFunction(kind => document.getElementById('openingWorld').dataset.weather === kind,kind);
  await sleep(800);
}
async function checkCloudSupply(p,name) {
  const supply = await p.evaluate(async () => {
    const clouds = [...openingWorld.querySelectorAll('.opening-cloud img')].flatMap(el => el.getAnimations().map(animation => ({el,animation,running:animation.playState === 'running'})));
    clouds.forEach(({animation}) => animation.pause());
    await Promise.all(clouds.map(({animation}) => animation.ready));
    clouds.forEach(item => item.time = item.animation.currentTime);
    let minimum = Infinity, covered = true;
    // Seek fifteen minutes of actual animation phases, including multiple
    // offscreen wraps. No wall-clock wait or production debug controls.
    for (let second = 0; second <= 900; second++) {
      clouds.forEach(({animation,time}) => { animation.currentTime = time + second * 1000; });
      const visible = clouds.map(({el}) => ({el,rect:el.getBoundingClientRect()})).filter(({rect:r}) => r.width && r.left < innerWidth && r.right > 0 && r.top < innerHeight && r.bottom > 0);
      minimum = Math.min(minimum,visible.length);
      for (const lane of ['far','passing']) {
        const boxes = visible.filter(({el}) => el.parentElement.classList.contains('opening-cloud--' + lane)).map(({rect}) => rect);
        covered &&= [.1,.5,.9].every(point => boxes.some(box => box.left <= innerWidth * point && box.right >= innerWidth * point));
      }
    }
    clouds.forEach(({animation,time,running}) => { animation.currentTime = time; if (running) animation.play(); });
    return {minimum,covered,count:clouds.length};
  });
  check(name+' replenishes clouds throughout fifteen minutes of animation',supply.minimum >= 6 && supply.covered);
  check(name+' uses a bounded pool of staggered clouds',supply.count >= 15 && supply.count <= 18);
}
(async () => {
  browser = await chromium.launch();
  try {
    const a = await page(); const p = a.p;
    check('three trip dates, not departure or a rolling forecast',JSON.stringify(await p.locator('.weather-day time').evaluateAll(items => items.map(i => i.dateTime))) === JSON.stringify(dates));
    check('requests only the eligible dates in Vietnam time',a.calls() === 1 && report.requests.at(-1).start === dates[0] && report.requests.at(-1).end === dates[2] && report.requests.at(-1).timezone === 'Asia/Ho_Chi_Minh');
    check('response temperatures and precipitation probability appear',await p.locator('.weather-range').first().textContent() === '4 / 16°' && (await p.locator('.weather-probability').nth(1).textContent()).includes('80%'));
    check('forecast omits interaction instructions and explanatory paragraphs',!await p.locator('.weather-illustration,.weather-caveat').count() && !/rê chuột|Chạm hoặc|Minh họa|còn có thể thay đổi/.test(await p.locator('#tripWeather').textContent()));
    check('motion control is an accessible icon beside the weather heading',await p.locator('#weatherMotion').evaluate(el => {
      const button = el.getBoundingClientRect(),heading = document.getElementById('weatherTitle').getBoundingClientRect();
      return el.closest('.weather-heading') && el.getAttribute('aria-label') === 'Dừng chuyển động' && el.title === el.getAttribute('aria-label') && el.querySelector('.sr-only').getBoundingClientRect().width === 1 && el.querySelector('svg') && button.width >= 44 && button.height >= 44 && button.left >= heading.right;
    }));
    await checkCloudSupply(p,'desktop');
    const startCloud = await p.locator('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').evaluate(el => el.getBoundingClientRect().left);
    await sleep(650);
    const cloudTravel = await p.locator('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').evaluate(el => el.getBoundingClientRect().left) - startCloud;
    check('default cloud flow is visibly faster and one-way',cloudTravel > 9 && cloudTravel < 30);
    check('cloud recycling occurs fully outside both viewport edges',await p.locator('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').evaluate(el => {
      const animation = el.getAnimations()[0], time = animation.currentTime;
      const duration = animation.effect.getTiming().duration;
      animation.pause(); animation.currentTime = duration - .1;
      const exited = el.getBoundingClientRect().left > innerWidth;
      animation.currentTime = duration + .1;
      const recycled = el.getBoundingClientRect().right < 0;
      animation.currentTime = time; animation.play();
      return exited && recycled;
    }));
    await shot(p,'desktop-opening');
    const initialClock = await p.locator('#arrivalCountdown').boundingBox();
    await preview(p,0,'clear');
    check('cold clear day cools the light without snow',await p.evaluate(() => Number(document.getElementById('openingWorld').style.getPropertyValue('--cold')) > 0 && document.getElementById('weatherParticles').dataset.weather === ''));
    await shot(p,'desktop-cold-clear');
    await preview(p,1,'rain');
    check('rain has moving streaks',await p.evaluate(() => weatherParticles.dataset.weather === 'rain' && getComputedStyle(document.querySelector('.weather-rain'),'::before').animationName === 'rain-fall'));
    await shot(p,'desktop-rain');
    await preview(p,2,'snow');
    check('snow code produces flakes',await p.evaluate(() => weatherParticles.dataset.weather === 'snow'));
    await shot(p,'desktop-snow');
    check('weather details do not move the countdown',JSON.stringify(await p.locator('#arrivalCountdown').boundingBox()) === JSON.stringify(initialClock));
    check('hover does not change chapter, hash or request count',a.calls() === 1 && await p.evaluate(() => !location.hash && scenery.dataset.phase === 'opening'));
    await p.locator('.weather-day').nth(1).click();await p.mouse.move(700,450);
    check('click holds a preview',await p.locator('.weather-day').nth(1).getAttribute('aria-pressed') === 'true' && await p.locator('#weatherReset').isVisible());
    await p.keyboard.press('Escape');
    check('Escape restores the opening',await p.locator('#openingWorld').getAttribute('data-weather') === '' && await p.locator('#weatherReset').isHidden());
    await p.locator('.weather-day').nth(2).focus(); await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');
    await p.waitForFunction(() => openingWorld.dataset.weather === 'snow');
    check('keyboard focus previews weather',await p.locator('#weatherDetail').textContent().then(s => s.includes('25/10')));
    await p.keyboard.press('Space');
    check('Space holds focused day',await p.locator('.weather-day').nth(2).getAttribute('aria-pressed') === 'true');
    await p.locator('#weatherReset').click();
    check('visible reset clears the held date',await p.locator('.weather-day[aria-pressed="true"]').count() === 0);
    await preview(p,1,'rain');
    await p.locator('#weatherMotion').click();
    check('pause freezes cloud and sticker loops',await p.evaluate(() => document.querySelector('.opening-cloud img').getAnimations().every(a => a.playState === 'paused') && getComputedStyle(document.querySelector('.hero-stamp')).animationPlayState === 'paused'));
    await p.evaluate(() => Promise.all(document.querySelector('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').getAnimations().map(a => a.ready)));
    const pausedCloud = await p.locator('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').evaluate(el => getComputedStyle(el).translate);
    await sleep(200);
    check('paused cloud retains its actual position',await p.locator('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').evaluate(el => getComputedStyle(el).translate) === pausedCloud);
    check('pause also freezes the rain fields',await p.evaluate(() => getComputedStyle(document.querySelector('.weather-rain'),'::before').animationPlayState === 'paused'));
    check('paused motion icon offers resume with the updated accessible name',await p.locator('#weatherMotion').getAttribute('aria-label') === 'Bật chuyển động' && await p.locator('#weatherMotion use').getAttribute('href') === '#trip-play');
    check('pause freezes every incoming cloud too',await p.locator('#openingWorld .cloud-repeat').evaluateAll(items => items.every(el => el.getAnimations().every(a => a.playState === 'paused'))));
    await p.locator('#weatherMotion').click();
    await p.locator('.weather-day').nth(1).click();
    await p.locator('[data-chapter="day-2"]').click();await sleep(1600);
    check('anchor travel clears weather and particles',await p.evaluate(() => openingWorld.dataset.weather === '' && weatherParticles.dataset.weather === '' && document.querySelectorAll('.navigation-scene,.scene-catchup').length === 0));
    check('all six story worlds still decode',await p.evaluate(async () => { await Promise.all(['sunrise','night','bluehour','daylight','jade','afternoon'].map(id => JourneyUI.loadBackground(id))); return [...document.querySelectorAll('.scene-panel')].every(p => p.dataset.ready && [...p.querySelectorAll('img')].every(i => i.naturalWidth)); }));
    await p.locator('.brand').click();await sleep(1600);
    const end = await p.evaluate(() => JourneyScenery.openingBounds().end);
    await p.evaluate(y => scrollTo(0,y),end * .55);await sleep(900);
    const pose = await p.locator('.scene-sunrise .opening-depth').evaluate(el => el.style.transform);
    await shot(p,'desktop-descent');
    await p.evaluate(y => scrollTo(0,y),end * .8);await sleep(800);await p.evaluate(y => scrollTo(0,y),end * .55);await sleep(800);
    check('terrain descent reverses at the same physical position',await p.locator('.scene-sunrise .opening-depth').evaluate(el => el.style.transform) === pose);
    await p.evaluate(() => scrollTo(0,JourneyScenery.openingBounds().clear + innerHeight));await sleep(1300);
    check('cloud opening clears at the story handoff',await p.locator('#openingWorld').isHidden());
    await shot(p,'desktop-story');
    await a.end();
    const wet = await page({payload:fixture([51,63,95],{wind_speed_10m_max:[0,36,60],wind_gusts_10m_max:[0,55,90]})});
    await preview(wet.p,0,'rain');
    const rainSettings = () => wet.p.evaluate(() => {
      const rain = getComputedStyle(document.querySelector('.weather-rain'),'::before');
      return {type:weatherParticles.dataset.rain,duration:parseFloat(rain.animationDuration),tile:parseFloat(rain.backgroundSize),opacity:parseFloat(rain.opacity),rate:document.querySelector('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').getAnimations()[0].playbackRate,slant:parseFloat(weatherParticles.style.getPropertyValue('--rain-slant'))};
    });
    const drizzle = await rainSettings();
    check('drizzle has visible short streaks',drizzle.type === 'drizzle' && drizzle.opacity >= .6 && drizzle.duration >= 1);
    await wet.p.locator('.weather-day').first().click();
    await wet.p.locator('#weatherMotion').click();await sleep(900);
    check('held drizzle remains visible while motion is paused',await wet.p.evaluate(() => weatherParticles.dataset.weather === 'rain' && getComputedStyle(document.querySelector('.weather-rain')).opacity === '1'));
    const clip = {x:490,y:200,width:260,height:280};
    const withRain = await wet.p.screenshot({clip});
    const stillRain = await wet.p.screenshot({clip});
    await wet.p.locator('#weatherParticles').evaluate(el => el.style.visibility = 'hidden');
    const withoutRain = await wet.p.screenshot({clip});
    check('drizzle visibly paints over a stable sky',withRain.equals(stillRain) && !withRain.equals(withoutRain));
    await wet.p.locator('#weatherParticles').evaluate(el => el.style.visibility = '');
    await shot(wet.p,'desktop-drizzle');
    const noJump = await wet.p.evaluate(() => {
      const cloud = document.querySelector('#openingWorld .opening-cloud--left img:not(.cloud-repeat)');
      const before = getComputedStyle(cloud).translate;
      document.querySelectorAll('.weather-day')[1].dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}));
      return getComputedStyle(cloud).translate === before;
    });
    check('wind changes preserve the cloud position',noJump);
    await wet.p.locator('#weatherMotion').click();
    await preview(wet.p,1,'rain');
    const moderate = await rainSettings();
    check('higher wind and gusts accelerate clouds',moderate.rate > drizzle.rate * 2.5);
    const windyStart = await wet.p.locator('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').evaluate(el => el.getBoundingClientRect().left);
    await sleep(650);
    const windyTravel = await wet.p.locator('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').evaluate(el => el.getBoundingClientRect().left) - windyStart;
    check('wind visibly increases distance travelled in the same interval',windyTravel > cloudTravel * 2.5);
    check('moderate rain falls faster, denser and at a wind-driven slant',moderate.duration < drizzle.duration / 2 && moderate.tile < drizzle.tile && moderate.slant < -10);
    await preview(wet.p,2,'storm');
    const storm = await rainSettings();
    check('storm rain is stronger than moderate rain',storm.type === 'storm' && storm.duration < moderate.duration && storm.tile < moderate.tile && storm.opacity > moderate.opacity);
    await shot(wet.p,'desktop-windy-storm');
    await wet.p.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,value:true}); document.dispatchEvent(new Event('visibilitychange')); });
    await wet.p.evaluate(() => Promise.all(document.querySelector('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').getAnimations().map(a => a.ready)));
    const hiddenPose = await wet.p.locator('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').evaluate(el => getComputedStyle(el).translate);
    await sleep(200);
    check('hidden tabs retain cloud pose and pause particles',await wet.p.locator('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').evaluate(el => getComputedStyle(el).translate) === hiddenPose && await wet.p.evaluate(() => getComputedStyle(document.querySelector('.weather-rain'),'::before').animationPlayState === 'paused'));
    await wet.p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(100);
    check('returning to a visible tab resumes cloud flow',await wet.p.locator('#openingWorld .opening-cloud--left img:not(.cloud-repeat)').evaluate(el => getComputedStyle(el).translate) !== hiddenPose);
    await wet.end();
    const severity = await page({payload:fixture([55,65,75],{wind_speed_10m_max:[8,8,8],wind_gusts_10m_max:[15,15,15]})});
    await preview(severity.p,0,'rain');
    const denseDrizzle = await severity.p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.weather-rain'),'::before').opacity));
    check('dense drizzle differs from light drizzle',denseDrizzle > drizzle.opacity);
    await preview(severity.p,1,'rain');
    check('heavy rain uses long dense streaks',await severity.p.evaluate(() => weatherParticles.dataset.rain === 'heavy' && getComputedStyle(document.querySelector('.weather-rain')).getPropertyValue('--rain-length').trim() === '125px'));
    await preview(severity.p,2,'snow');
    check('heavy snow uses a stronger flake field',await severity.p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.weather-snow'),'::before').opacity) > .9));
    await severity.end();
    for (const [name,width,height] of [['phone',390,844],['narrow',320,780],['tablet',768,1024],['wide',2560,1080],['landscape',844,390]]) {
      const b = await page({viewport:{width,height},touch:name === 'phone'});
      check(name+' no horizontal overflow',await b.p.evaluate(() => document.documentElement.scrollWidth === innerWidth));
      check(name+' forecast and clock do not overlap',await b.p.evaluate(() => {const a=tripWeather.getBoundingClientRect(),b=arrivalCountdown.getBoundingClientRect();return a.bottom <= b.top;}));
      check(name+' all date buttons have usable touch targets',await b.p.locator('.weather-day').evaluateAll(items => items.every(e => e.offsetWidth >= 44 && e.offsetHeight >= 44)));
      await shot(b.p,name+'-opening');
      if (name === 'phone') {
        await checkCloudSupply(b.p,'phone');
        check('phone motion icon stays beside its heading with a touch-sized target',await b.p.locator('#weatherMotion').evaluate(el => {
          const button = el.getBoundingClientRect(),heading = document.getElementById('weatherTitle').getBoundingClientRect();
          return button.width >= 44 && button.height >= 44 && button.left >= heading.right && button.right <= innerWidth;
        }));
        await b.p.locator('.weather-day').nth(1).tap();await sleep(900);
        check('phone tap holds rain without navigating',await b.p.locator('.weather-day').nth(1).getAttribute('aria-pressed') === 'true' && await b.p.evaluate(() => location.hash === '' && weatherParticles.dataset.weather === 'rain'));
        await shot(b.p,'phone-rain');
        await b.p.evaluate(() => scrollTo(0,JourneyScenery.openingBounds().clear + 100));await sleep(1000);
        check('scrolling out of the hero clears touch weather',await b.p.evaluate(() => !openingWorld.dataset.weather && !weatherParticles.dataset.weather));
      }
      await b.end();
    }
    // Null and unknown values are not silently converted to zero or sunshine.
    const n = await page({payload:fixture([null,48,66],{temperature_2m_min:[null,4,2],temperature_2m_max:[null,8,7],precipitation_probability_max:[null,null,45],snowfall_sum:[0,0,0]})});
    check('all-null weather stays unavailable',await n.p.locator('.weather-day').first().getAttribute('aria-disabled') === 'true' && await n.p.locator('.weather-range').first().textContent() === '— / —°');
    await preview(n.p,1,'fog');check('rime fog does not snow',await n.p.evaluate(() => weatherParticles.dataset.weather === ''));
    await preview(n.p,2,'rain');check('freezing rain uses rain, not flakes',await n.p.evaluate(() => weatherParticles.dataset.weather === 'rain'));
    await n.end();
    const unknown = await page({payload:fixture([999,0,0])});await preview(unknown.p,0,'cloudy');check('unknown weather uses a neutral label and cloud',await unknown.p.locator('.weather-condition').first().textContent() === 'Chưa rõ trạng thái');await unknown.end();
    for (const [name,options] of [['offline',{offline:true}],['timeout',{timeout:true}],['400',{status:400}],['429',{status:429}],['500',{status:500}],['malformed',{payload:{daily:{time:dates}}}],['denied storage',{init:() => {Object.defineProperty(Storage.prototype,'getItem',{value:() => {throw new Error('denied');}});Object.defineProperty(Storage.prototype,'setItem',{value:() => {throw new Error('denied');}});}}]]) {
      const b = await page(options);
      check(name+' keeps the journal readable',await b.p.locator('.event').count() === 24 && await b.p.locator('#arrivalCountdown').isVisible());
      if (name !== 'denied storage') check(name+' offers retry without fabricated temperatures',await b.p.locator('#weatherRetry').isVisible() && await b.p.locator('.weather-range').first().textContent() === '— / —°');
      await b.end();
    }
    const partialPayload = fixture();
    for (const field of Object.keys(partialPayload.daily)) partialPayload.daily[field].splice(1,1);
    const partial = await page({payload:partialPayload});
    check('missing API dates stay independently unavailable',await partial.p.locator('.weather-day').nth(1).getAttribute('aria-disabled') === 'true' && await partial.p.locator('.weather-day').nth(2).getAttribute('aria-disabled') === 'false');
    await partial.end();
    const broken = await page({brokenCloud:true});await preview(broken.p,1,'rain');
    check('missing optional weather art retains the sky and forecast',await broken.p.locator('#openingOvercast img:not(.cloud-repeat)').isHidden() && await broken.p.locator('.weather-day').nth(1).textContent().then(s => s.includes('12 / 19°')));await broken.end();
    const decodeRace = await page({cloudDelay:true});
    await decodeRace.p.locator('.weather-day').nth(1).hover();await decodeRace.p.locator('.weather-day').first().hover();await sleep(1000);
    check('late cloud decoding cannot restore an older preview',await decodeRace.p.evaluate(() => openingWorld.dataset.weather === 'clear' && weatherParticles.dataset.weather === ''));await decodeRace.end();
    for (const [name,time,start,end] of [['before horizon','2026-10-01T00:00:00Z',null,null],['partial horizon','2026-10-08T00:00:00Z',dates[0],dates[0]],['partial past','2026-10-24T00:00:00Z',dates[1],dates[2]],['after trip','2026-10-26T00:00:00Z',null,null]]) {
      const b = await page({time});
      check(name+' keeps three dates visible',await b.p.locator('.weather-day').count() === 3);
      check(name+' bounds the request dates',start ? b.calls() === 1 && report.requests.at(-1).start === start && report.requests.at(-1).end === end : b.calls() === 0);
      await b.end();
    }
    const tz = await page({timezoneId:'America/Los_Angeles',time:'2026-10-23T18:00:00Z'});
    check('eligibility follows Vietnam date across timezones',report.requests.at(-1).start === dates[1] && await tz.p.locator('.weather-condition').first().textContent() === 'Ngày đã qua');await tz.end();
    const midnight = await page({time:'2026-10-23T16:59:59Z'});
    await midnight.p.clock.runFor(1600);
    check('an open page retires yesterday at Vietnam midnight',await midnight.p.locator('.weather-condition').first().textContent() === 'Ngày đã qua' && await midnight.p.locator('.weather-day').first().getAttribute('aria-disabled') === 'true');
    await midnight.end();
    const cache = await page();const key = await cache.p.evaluate(() => Object.keys(localStorage).find(k => k.startsWith('taxua-weather-v1:')));
    await cache.p.reload();await sleep(400);check('fresh cache avoids another request',cache.calls() === 1);
    await cache.p.evaluate(key => {const v=JSON.parse(localStorage.getItem(key));v.fetchedAt-=2*3600000;localStorage.setItem(key,JSON.stringify(v));},key);
    await cache.p.route('https://api.open-meteo.com/**',r => r.abort());await cache.p.reload();await cache.p.waitForFunction(() => document.getElementById('weatherRetry').hidden === false);
    check('failed refresh labels saved forecast explicitly',await cache.p.locator('#weatherFreshness').textContent().then(s => s.includes('Dự báo đã lưu')) && await cache.p.locator('.weather-range').first().textContent() === '4 / 16°');
    await cache.p.evaluate(key => {const v=JSON.parse(localStorage.getItem(key));v.fetchedAt-=25*3600000;localStorage.setItem(key,JSON.stringify(v));},key);await cache.p.reload();await sleep(400);
    check('cache older than 24 hours is discarded',await cache.p.locator('.weather-range').first().textContent() === '— / —°');
    await cache.p.evaluate(key => localStorage.setItem(key,'broken json'),key);await cache.p.reload();await sleep(300);check('corrupt cache is tolerated',await cache.p.locator('.event').count() === 24);await cache.end();
    for (const [name,options] of [['reduced motion',{reduced:true}],['missing GSAP',{noGsap:true}],['direct file',{file:true}]]) {
      const b = await page(options);await preview(b.p,1,'rain');
      check(name+' retains forecast and all events',await b.p.locator('.event').count() === 24 && await b.p.locator('.weather-range').first().textContent() === '4 / 16°');
      if (options.reduced) check('reduced motion stops cloud and rain loops',await b.p.evaluate(() => document.querySelector('.ambient').getAnimations().every(a => a.playState === 'paused') && getComputedStyle(document.querySelector('.weather-rain'),'::before').animationName === 'none'));
      await b.p.emulateMedia({media:'print'});check(name+' print omits forecast and scenery',await b.p.locator('#tripWeather').isHidden() && await b.p.locator('#scenery').isHidden());await b.end();
    }
    const race = await page({delay:900});await race.p.evaluate(() => scrollTo(0,2500));await sleep(1800);
    check('late forecast never activates a scene below the hero',await race.p.evaluate(() => !openingWorld.dataset.weather && !weatherParticles.dataset.weather));await race.end();
    const loading = await page({delay:2400});
    const loadingClock = await loading.p.locator('#arrivalCountdown').boundingBox();
    await loading.p.waitForFunction(() => !document.getElementById('weatherDetail').textContent.includes('Đang lấy'));
    check('arrival of forecast values does not move the clock',JSON.stringify(await loading.p.locator('#arrivalCountdown').boundingBox()) === JSON.stringify(loadingClock));
    await loading.end();
    check('no uncaught page errors',report.errors.length === 0);
    console.log('Passed '+report.checks.length+' sky/weather checks.');
  } finally {
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
