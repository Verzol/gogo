/* Exploration interactions use real Leaflet with deliberately failed remote
   tiles. Native fullscreen is exercised separately from its viewport fallback. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-fullscreen-review/checks';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
fs.mkdirSync(output,{recursive:true});
const report = {timestamp:new Date().toISOString(),checks:[],errors:[],tiles:'deliberately unavailable'};
function check(name,ok) { assert.ok(ok,name);report.checks.push(name); }
const camera = page => page.evaluate(() => ({lat:reviewMap.getCenter().lat,lng:reviewMap.getCenter().lng,zoom:reviewMap.getZoom()}));
const sameCamera = (a,b) => a.zoom === b.zoom && Math.abs(a.lat-b.lat) < .0001 && Math.abs(a.lng-b.lng) < .0001;
const placePoint = (page,id = 'thao_coffee') => page.evaluate(id => {
  const place = TRIP_MAP_DATA.places[id];
  const point = reviewMap.latLngToContainerPoint([place.lat,place.lng]);
  return {x:point.x,y:point.y,zoom:reviewMap.getZoom()};
},id);
async function checkRecentering(page,name) {
  const reference = await placePoint(page);
  await page.evaluate(() => reviewMap.panBy([45,30],{animate:false}));
  const shifted = await placePoint(page);
  check(name+' manual pan offsets selected location',Math.abs(shifted.x-reference.x) > 20);
  await list(page);await choose(page,'thao-coffee:thao_coffee');
  const restored = await placePoint(page);
  check(name+' reselecting a visible location recenters at the same zoom',restored.zoom === reference.zoom && Math.hypot(restored.x-reference.x,restored.y-reference.y) <= 2);
  await list(page);await choose(page,'room-change:mua_tru_homestay');
  const nearby = await placePoint(page,'mua_tru_homestay');
  check(name+' nearby location gets the same horizontal center',Math.abs(nearby.x-reference.x) <= 2);
  await list(page);await choose(page,'thao-coffee:thao_coffee');
}
async function prepare(browser,viewport,api = 'absent') {
  const page = await browser.newPage({viewport,reducedMotion:'reduce'});
  page.on('pageerror',error => report.errors.push(error.message));
  await page.route('https://*.tile.openstreetmap.fr/**',route => route.abort());
  await page.route('https://api.open-meteo.com/**',route => route.abort());
  if (api === 'missing') await page.route('**/vendor/leaflet/leaflet.js',route => route.abort());
  await page.addInitScript(api => {
    if (api === 'absent' || api === 'missing') Element.prototype.requestFullscreen = undefined;
    if (api === 'reject') Element.prototype.requestFullscreen = () => Promise.reject(new Error('Review rejection'));
    let library;window.mapCreations = 0;
    Object.defineProperty(window,'L',{configurable:true,get:() => library,set(value) {
      library = value;const create = value.map;
      value.map = (...args) => { window.mapCreations++;return window.reviewMap = create(...args); };
    }});
  },api);
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  return page;
}
async function open(page) {
  await page.locator('[data-map-overview]').click();
  await page.locator('.leaflet-container').waitFor();
}
async function expand(page) {
  await page.locator('.atlas-fullscreen').click();
  await page.waitForFunction(() => document.querySelector('.trip-map-canvas').clientWidth === innerWidth);
  await page.waitForTimeout(100);
}
async function list(page) { await page.locator('.atlas-locations').click(); }
async function choose(page,key,keyboard = false) {
  const button = page.locator(`[data-map-visit="${key}"]`);
  if (keyboard) { await button.focus();await page.keyboard.press('Enter'); }
  else await button.click();
}
async function geometry(page,name) {
  check(name+' fills the viewport',await page.locator('.trip-map-canvas').evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.x === 0 && box.y === 0 && box.width === innerWidth && Math.abs(box.height-innerHeight) <= 1;
  }));
  check(name+' has no horizontal overflow',await page.locator('#tripAtlas').evaluate(e => e.scrollWidth <= e.clientWidth+1));
  check(name+' all day choices remain reachable',await page.locator('[data-map-day]').evaluateAll(buttons => buttons.every((button,index) => {
    const box = button.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight && box.height >= 44 && buttons.slice(index+1).every(other => {
      const next = other.getBoundingClientRect();return box.right <= next.left+1 || next.right <= box.left+1 || box.bottom <= next.top+1 || next.bottom <= box.top+1;
    });
  })));
  const collisions = await page.evaluate(() => {
    const selectors = ['.atlas-title-plate','.atlas-fullscreen','.atlas-close','.atlas-dates','.leaflet-control-zoom','.atlas-reset','.leaflet-control-attribution','.atlas-sidebar','.atlas-peek','.atlas-locations'];
    const boxes = selectors.map(selector => ({selector,element:document.querySelector(selector)})).filter(({element:e}) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map(({selector,element}) => ({selector,box:element.getBoundingClientRect()}));
    return boxes.flatMap(({selector,box},index) => [
      ...(box.left < -1 || box.top < -1 || box.right > innerWidth+1 || box.bottom > innerHeight+1 ? [selector+' outside viewport'] : []),
      ...boxes.slice(index+1).filter(({box:other}) => !(box.right <= other.left+1 || other.right <= box.left+1 || box.bottom <= other.top+1 || other.bottom <= box.top+1)).map(other => selector+' overlaps '+other.selector)
    ]);
  });
  check(name+' controls are visible and do not overlap: '+collisions.join('; '),collisions.length === 0);
}
async function selectedClear(page,name) {
  check(name+' selected sticker and label clear the paper controls',await page.evaluate(() => {
    const marker = document.querySelector('.atlas-marker.is-selected,.atlas-cluster.is-selected');
    if (!marker) return false;
    const boxes = [marker.getBoundingClientRect(),...[...document.querySelectorAll('.atlas-place-label')].filter(e => e.textContent === document.querySelector('.atlas-peek strong').textContent).map(e => e.getBoundingClientRect())];
    const controls = ['.atlas-dates','.atlas-title-plate','.atlas-sidebar','.atlas-peek','.atlas-locations','.leaflet-control-zoom','.atlas-reset'].map(s => document.querySelector(s)).filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
    return boxes.every(box => controls.every(e => {
      const other = e.getBoundingClientRect();return box.right <= other.left || other.right <= box.left || box.bottom <= other.top || other.bottom <= box.top;
    }));
  }));
}
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await prepare(browser,{width:1440,height:900});
    await open(page);
    await page.locator('[data-map-day="1"]').click();
    await choose(page,'thao-coffee:thao_coffee');
    const before = await camera(page);
    await expand(page);
    check('mode entry preserves selected day and visit',await page.locator('[data-map-day="1"]').getAttribute('aria-pressed') === 'true' && (await page.locator('.atlas-peek strong').textContent()).includes('Thào'));
    check('mode entry preserves camera',sameCamera(before,await camera(page)));
    check('mode entry keeps a single map',await page.evaluate(() => mapCreations === 1));
    await geometry(page,'desktop overview');
    await list(page);
    const priorSearch = await camera(page);
    await page.locator('.atlas-search').fill('thao');
    check('accent-insensitive local search finds Thào Coffee',await page.locator('#atlasStops li:not([hidden]) strong').allTextContents().then(names => names.includes('Thào Coffee')));
    await page.locator('.atlas-search').fill('xyz-no-place');
    check('empty search announces no results',await page.locator('#atlasStops li:not([hidden])').count() === 0 && (await page.locator('.atlas-search-status').textContent()).includes('Không có'));
    check('search does not move the map',sameCamera(priorSearch,await camera(page)));
    await page.locator('.atlas-search').fill('');
    await choose(page,'thao-coffee:thao_coffee');
    check('pointer selection collapses to compact place card',await page.locator('#tripAtlas').getAttribute('data-panel') === '' && await page.locator('.atlas-peek').isVisible());
    await selectedClear(page,'desktop selected');
    const compact = await camera(page);
    await page.locator('.atlas-peek-detail').click();
    check('full note opens without changing zoom',(await camera(page)).zoom === compact.zoom && await page.locator('#atlasDetail .atlas-read').isVisible());
    await geometry(page,'desktop detail');
    const detailCamera = await camera(page);
    await page.locator('.atlas-sidebar').hover();await page.mouse.wheel(0,300);await page.waitForTimeout(150);
    check('scrolling the note leaves map camera unchanged',sameCamera(detailCamera,await camera(page)));
    await page.locator('.atlas-panel-back').click();
    await choose(page,'thao-coffee:thao_coffee',true);
    check('keyboard list selection exposes and focuses full note',await page.locator('#tripAtlas').getAttribute('data-panel') === 'detail' && await page.locator('#atlasDetail h3').evaluate(e => e === document.activeElement));
    await page.keyboard.press('Escape');
    check('first Escape collapses overlay',await page.locator('#tripAtlas').getAttribute('data-panel') === '' && await page.locator('#tripAtlas').evaluate(e => e.classList.contains('is-exploring')));
    await page.locator('[data-peek-step="1"]').click();
    check('compact next visits another schedule entry',!(await page.locator('.atlas-peek strong').textContent()).includes('Thào Coffee'));
    check('next retains keyboard focus on a stepping control',await page.evaluate(() => !!document.activeElement.dataset.peekStep));
    await page.evaluate(() => reviewMap.setZoom(Math.min(15,reviewMap.getZoom())));
    const wheelStart = (await camera(page)).zoom;
    await page.mouse.move(950,450);await page.mouse.wheel(0,-240);
    await page.waitForFunction(zoom => reviewMap.getZoom() > zoom,wheelStart);
    check('exposed fullscreen map accepts wheel zoom',(await camera(page)).zoom > wheelStart);
    const wheelEnd = (await camera(page)).zoom;
    await page.keyboard.down('Control');await page.mouse.wheel(0,240);await page.keyboard.up('Control');
    await page.waitForFunction(zoom => reviewMap.getZoom() < zoom,wheelEnd);
    check('exposed fullscreen map accepts Ctrl+wheel zoom',(await camera(page)).zoom < wheelEnd);
    await page.locator('[data-map-day="0"]').click();
    await page.locator('.atlas-marker-host[title="Tập đoàn Viettel"]').focus();await page.keyboard.press('Enter');
    check('keyboard pin activation opens its full note',await page.locator('#tripAtlas').getAttribute('data-panel') === 'detail' && await page.locator('#atlasDetail h3').evaluate(e => e === document.activeElement));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#tripAtlas').dataset.panel === '');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#tripAtlas').classList.contains('is-exploring'));
    check('second Escape restores framed atlas',await page.locator('#tripAtlas').evaluate(e => e.open && !e.classList.contains('is-exploring')));
    check('restore preserves one Leaflet instance',await page.evaluate(() => mapCreations === 1));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#tripAtlas').open);
    check('third Escape closes atlas and restores entry focus',await page.locator('#tripAtlas').evaluate(e => !e.open) && await page.locator('[data-map-overview]').evaluate(e => e === document.activeElement));
    await page.close();

    for (const [name,width,height,large] of [['desktop',1440,900],['laptop',1024,768],['tablet',820,1024],['phone',390,844],['narrow',320,740],['landscape',844,390],['text-desktop',1440,900,true],['text-phone',390,844,true]]) {
      const page = await prepare(browser,{width,height});await open(page);
      if (large) await page.evaluate(() => document.documentElement.style.fontSize = '32px');
      await expand(page);await geometry(page,name+' overview');
      check(name+' chronological day order',(await page.locator('[data-map-day]').evaluateAll(e => e.map(b => b.dataset.mapDay))).join(',') === 'all,0,1,2,3');
      await page.locator('[data-map-day="0"]').click();
      check(name+' departure retains confirmed Viettel pickup',(await page.locator('.atlas-peek strong').textContent()) === 'Tập đoàn Viettel' && await page.evaluate(() => reviewMap.getCenter().lat > 21 && reviewMap.getCenter().lng > 105));
      await page.locator('[data-map-day="all"]').click();await list(page);
      await geometry(page,name+' list');
      await page.locator('.atlas-search').fill('doi may');
      check(name+' search normalizes Vietnamese đ',await page.locator('#atlasStops li:not([hidden]) strong').allTextContents().then(names => names.some(n => n.includes('Đồi Mây'))));
      await page.locator('.atlas-search').fill('');
      await page.locator('#atlasOptional').uncheck();
      check(name+' optional filtering remains available',await page.locator('.atlas-stop-optional').count() === 0);
      await choose(page,'thao-coffee:thao_coffee');await geometry(page,name+' peek');
      await checkRecentering(page,name);
      if (name === 'desktop') {
        const target = await placePoint(page);
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.evaluate(() => reviewMap.panBy([75,45],{animate:false}));
        await list(page);await choose(page,'thao-coffee:thao_coffee');
        await page.waitForFunction(target => {
          const place = TRIP_MAP_DATA.places.thao_coffee;
          const point = reviewMap.latLngToContainerPoint([place.lat,place.lng]);
          return Math.hypot(point.x-target.x,point.y-target.y) <= 2;
        },target);
        check('animated selection settles at the location center',(await placePoint(page)).zoom === target.zoom);
        await page.emulateMedia({reducedMotion:'reduce'});
      }
      if (!large) await selectedClear(page,name+' selected');
      await page.screenshot({path:path.join(output,name+'-peek.png')});
      await page.locator('.atlas-peek-detail').click();await geometry(page,name+' detail');
      if (!large) await selectedClear(page,name+' expanded selection');
      await page.screenshot({path:path.join(output,name+'-detail.png')});
      await page.locator('.atlas-panel-close').click();
      await page.setViewportSize({width:height,height:width});
      await page.waitForTimeout(150);await geometry(page,name+' rotated');
      await page.locator('.atlas-fullscreen').click();
      check(name+' restore retains optional setting',await page.locator('#atlasOptional').isChecked() === false);
      await page.locator('.atlas-close').click();
      await page.locator('.leaflet-container').waitFor({state:'detached'});
      check(name+' close releases Leaflet',await page.locator('.leaflet-container').count() === 0);
      await page.close();
    }

    const native = await prepare(browser,{width:1440,height:900},'native');await open(native);await expand(native);
    await native.waitForFunction(() => document.fullscreenElement?.classList.contains('atlas-shell'));
    check('native API includes map and all controls',await native.evaluate(() => document.fullscreenElement.contains(document.querySelector('.atlas-close'))));
    await list(native);await choose(native,'thao-coffee:thao_coffee');await checkRecentering(native,'native fullscreen');
    await list(native);await choose(native,'room-change:mua_tru_homestay');await native.locator('.atlas-peek-detail').click();
    const visitTrigger = native.locator('[data-native-select="atlasVisit"]');await visitTrigger.click();
    check('repeated-visit menu is visible inside native fullscreen',await native.locator('.journal-select-menu:popover-open').evaluate(e => !!e.closest(':fullscreen') && !!e.getClientRects().length));
    await native.locator('.journal-select-menu:popover-open [role="option"]').first().click();
    check('native repeated-visit menu updates selected visit',(await native.locator('.atlas-place-time').textContent()).includes('03:00'));
    await native.evaluate(() => document.exitFullscreen());await native.waitForFunction(() => !document.querySelector('#tripAtlas').classList.contains('is-exploring'));
    check('browser fullscreen exit keeps atlas open',await native.locator('#tripAtlas').evaluate(e => e.open));
    await expand(native);await native.locator('.atlas-close').click();
    await native.waitForFunction(() => !document.fullscreenElement);
    check('close releases owned native fullscreen',await native.locator('#tripAtlas').evaluate(e => !e.open));
    await native.close();

    const rejected = await prepare(browser,{width:390,height:844},'reject');await open(rejected);await expand(rejected);
    await geometry(rejected,'rejected API fallback');
    check('rejected API remains usable',await rejected.locator('.atlas-locations').isVisible());await rejected.close();

    const pending = await prepare(browser,{width:1440,height:900},'native');
    await pending.evaluate(() => {
      let current = null;
      Object.defineProperty(document,'fullscreenElement',{configurable:true,get:() => current});
      Element.prototype.requestFullscreen = function () {
        const shell = this;
        return new Promise(resolve => { window.releaseFullscreen = () => {
          current = shell;document.dispatchEvent(new Event('fullscreenchange'));resolve();
        }; });
      };
      document.exitFullscreen = () => { current = null;document.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve(); };
    });
    await open(pending);await expand(pending);await pending.locator('.atlas-close').click();
    await open(pending);await expand(pending);await pending.evaluate(() => releaseFullscreen());await pending.waitForTimeout(100);
    check('late request cannot steal a reopened atlas into fullscreen',await pending.evaluate(() => !document.fullscreenElement && tripAtlas.open && tripAtlas.classList.contains('is-exploring') && mapCreations === 2));
    await pending.locator('.atlas-fullscreen').click();await expand(pending);await pending.locator('.atlas-fullscreen').click();
    await pending.evaluate(() => releaseFullscreen());await pending.waitForTimeout(100);
    check('late request after restore leaves framed atlas intact',await pending.evaluate(() => !document.fullscreenElement && tripAtlas.open && !tripAtlas.classList.contains('is-exploring')));
    await pending.close();

    const missing = await prepare(browser,{width:390,height:844},'missing');
    await missing.locator('[data-map-overview]').click();await missing.locator('.trip-map-retry').waitFor();await missing.locator('.atlas-fullscreen').click();
    check('missing library exposes local index automatically',await missing.locator('#tripAtlas').getAttribute('data-panel') === 'list');
    await choose(missing,'thao-coffee:thao_coffee');await missing.locator('.atlas-peek-detail').click();
    check('missing library retains complete local note',await missing.locator('.atlas-read').isVisible());
    await missing.emulateMedia({media:'print'});
    check('print hides exploration',await missing.locator('#tripAtlas').isVisible() === false);await missing.close();
    check('no uncaught browser errors',report.errors.length === 0);
  } finally {
    await browser.close();fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
  }
  console.log(report.checks.length+' fullscreen assertions passed; report '+output+'/checks.json');
})().catch(error => { console.error(error);process.exitCode = 1; });
