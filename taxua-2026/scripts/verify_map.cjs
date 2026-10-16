/* Map behavior, geographic honesty and lifecycle checks. External tiles are
   deliberately unavailable here; inspect real online tiles separately. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const crypto = require('crypto');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-map-review';
fs.mkdirSync(output,{recursive:true});
const report = {timestamp:new Date().toISOString(),checks:[],errors:[],tileMode:'deliberate network failure'};
function check(name,ok) { assert.ok(ok,name);report.checks.push(name); }
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
async function open(page) {
  await page.locator('[data-map-overview]').click();
  await page.waitForSelector('.leaflet-container');
}
async function noOverflow(page,selector) {
  return page.locator(selector).evaluate(element => element.scrollWidth <= element.clientWidth + 1);
}
async function trackMap(page) {
  // Keep production code private; observe the real Leaflet factory in review.
  await page.addInitScript(() => {
    let library;
    Object.defineProperty(window,'L',{
      configurable:true,get:() => library,
      set(value) {
        library = value;
        const create = value.map;
        value.map = (...args) => window.reviewMap = create(...args);
      }
    });
  });
}
async function wheelZoom(page,name) {
  // Close-together selected venues can start at the maximum detail zoom.
  await page.evaluate(() => reviewMap.setZoom(Math.min(reviewMap.getZoom(),reviewMap.getMaxZoom()-2)));
  await page.locator('.trip-map-canvas').scrollIntoViewIfNeeded();
  const box = await page.locator('.trip-map-canvas').boundingBox();
  await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6);
  const initial = await page.evaluate(() => ({zoom:reviewMap.getZoom(),scroll:scrollY,width:innerWidth}));
  await page.mouse.wheel(0,-240);
  await page.waitForFunction(zoom => reviewMap.getZoom() > zoom,initial.zoom);
  check(name+' wheel zooms in',await page.evaluate(zoom => reviewMap.getZoom() > zoom,initial.zoom));
  const zoomed = await page.evaluate(() => reviewMap.getZoom());
  await page.keyboard.down('Control');
  try {
    await page.mouse.wheel(0,240);
    await page.waitForFunction(zoom => reviewMap.getZoom() < zoom,zoomed);
  } finally { await page.keyboard.up('Control'); }
  check(name+' Ctrl+wheel zooms out',await page.evaluate(zoom => reviewMap.getZoom() < zoom,zoomed));
  check(name+' wheel targets the map without moving or zooming the page',await page.evaluate(state => scrollY === state.scroll && innerWidth === state.width,initial));
}
function regionContainsMap() {
  const bounds = L.latLngBounds(TRIP_MAP_DATA.navigationBounds);
  const view = reviewMap.getPixelBounds();
  const northWest = reviewMap.project(bounds.getNorthWest());
  const southEast = reviewMap.project(bounds.getSouthEast());
  // Leaflet clamps at whole-pixel positions; allow that rounding at any zoom.
  return view.min.x >= northWest.x-2 && view.min.y >= northWest.y-2 &&
    view.max.x <= southEast.x+2 && view.max.y <= southEast.y+2;
}
async function withinRegion(page) {
  return page.evaluate(regionContainsMap);
}

(async() => {
  for (const manifestPath of ['map-artwork.json','map-treasure-artwork.json','map-torn-paper-artwork.json']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root,'data/sources',manifestPath)));
    for (const [name,source] of Object.entries(manifest.sources)) {
      const bytes = fs.readFileSync(path.join(root,source.path));
      check(name+' master hash retained',crypto.createHash('sha256').update(bytes).digest('hex') === source.sha256);
      const derivative = manifest.assets[name];
      check(name+' output has no upscaling',derivative.size[0] <= source.size[0] && derivative.size[1] <= source.size[1]);
      check(name+' derivative hash',crypto.createHash('sha256').update(fs.readFileSync(path.join(root,derivative.src))).digest('hex') === derivative.sha256);
    }
  }
  const browser = await chromium.launch({headless:true});
  try {
    for (const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['narrow',320,740],['landscape',844,390]]) {
      const page = await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
      await trackMap(page);
      page.on('pageerror',error => report.errors.push(name+': '+error.message));
      const remote = [];
      await page.route('https://a.tile.openstreetmap.fr/**',route => { remote.push(route.request().url());return route.abort(); });
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      check(name+' no tiles before opening',remote.length === 0);
      check(name+' Leaflet loads on demand',await page.evaluate(() => !window.L));
      check(name+' 24 original events preserved',await page.locator('.event[data-source-row]').count() === 24);
      check(name+' 18 guides preserved',await page.locator('#daysList .place-source').count() === 18);
      check(name+' no rejected sign controls',await page.locator('.trail-sign').count() === 0);
      check(name+' one atlas invitation',await page.locator('[data-map-overview]').count() === 1);
      check(name+' atlas entry lives beside the hero invitation',await page.locator('.hero-copy .hero-actions [data-map-overview]').count() === 1);
      check(name+' itinerary has no duplicate atlas entry',await page.locator('#itinerary [data-map-overview]').count() === 0);
      if (height > 550) check(name+' atlas entry is visible on arrival',await page.locator('[data-map-overview]').evaluate(button => {
        const box = button.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth;
      }));
      check(name+' page does not overflow',await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
      await open(page);
      check(name+' one active map',await page.locator('.leaflet-container').count() === 1);
      check(name+' date choices retain readable labels and touch targets',await page.locator('[data-map-day]').evaluateAll(buttons => buttons.length === 5 && buttons.every(button => {
        const box = button.getBoundingClientRect();
        return box.height >= 44 && box.width >= 44 && button.textContent.trim();
      })));
      check(name+' illustrated dates load',await page.locator('[data-map-day] img').evaluateAll(images => Promise.all(images.map(image => image.decode().then(() => true).catch(() => false))).then(values => values.every(Boolean))));
      check(name+' dialog name',await page.locator('#tripAtlas').getAttribute('aria-labelledby') === 'atlasTitle');
      check(name+' close receives focus',await page.locator('.atlas-close').evaluate(element => element === document.activeElement));
      check(name+' atlas does not overflow horizontally',await noOverflow(page,'#tripAtlas'));
      const rect = await page.locator('#tripAtlas').boundingBox();
      check(name+' atlas fits viewport',rect.x >= -1 && rect.y >= -1 && rect.x+rect.width <= width+1 && rect.y+rect.height <= height+1);
      await page.waitForSelector('.trip-map-retry:not([hidden])');
      const openingTiles = await page.locator('.leaflet-tile').evaluateAll(images => images.map(image => image.src));
      check(name+' opening requests only the final viewport tiles',remote.length > 0 && remote.every(url => openingTiles.includes(url)));
      check(name+' tile failure keeps a readable fallback',(await page.locator('.trip-map-status').textContent()).includes('Chưa tải được'));
      check(name+' attribution remains visible',await page.locator('.leaflet-control-attribution').isVisible());
      check(name+' attribution includes OSM and provider',/OpenStreetMap.*OSM France/.test(await page.locator('.leaflet-control-attribution').textContent()));
      check(name+' missing-pin labels match available coordinates',await page.locator('#atlasStops [data-map-visit]').evaluateAll(buttons => buttons.every(button => {
        const place = TRIP_MAP_DATA.places[button.dataset.mapVisit.split(':').pop()];
        return !!button.querySelector('.atlas-unresolved') === !(Number.isFinite(place.lat) && Number.isFinite(place.lng));
      })));
      const geo = await page.evaluate(() => Object.values(TRIP_MAP_DATA.places).map(place => ({lat:place.lat,lng:place.lng,status:place.status,precision:place.precision,sourceUrls:place.sourceUrls})));
      check(name+' unresolved places have no invented coordinates',geo.every(place => place.status !== 'unresolved' || (place.lat === null && place.lng === null)));
      check(name+' every geographic point has provenance',geo.every(place => place.lat === null || place.sourceUrls.length > 0));
      await page.evaluate(() => reviewMap.setView([10.7769,106.7009],10,{animate:false}));
      await page.locator('.atlas-reset').click();
      check(name+' compass reset returns to the trip',await page.evaluate(() => reviewMap.getCenter().lat > 21.2 && reviewMap.getCenter().lat < 21.5 && reviewMap.getCenter().lng < 104.7));
      await wheelZoom(page,name+' atlas');
      await page.evaluate(() => { reviewMap.setZoom(-10);reviewMap.panBy([100000,100000],{animate:false}); });
      await page.waitForFunction(regionContainsMap);
      check(name+' zoom-out and distant panning stay in Vietnam',await withinRegion(page));
      await page.evaluate(() => reviewMap.panBy([-100000,-100000],{animate:false}));
      await page.waitForFunction(regionContainsMap);
      check(name+' opposite boundary also holds',await withinRegion(page));
      const mapBox = await page.locator('.trip-map-canvas').boundingBox();
      await page.mouse.move(mapBox.x+mapBox.width*.6,mapBox.y+mapBox.height*.6);
      await page.mouse.down();
      await page.mouse.move(mapBox.x+mapBox.width*.2,mapBox.y+mapBox.height*.2,{steps:10});
      await page.mouse.up();
      await page.waitForFunction(regionContainsMap);
      check(name+' native dragging respects the boundary',await withinRegion(page));
      await page.locator('.trip-map-canvas').focus();
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(regionContainsMap);
      check(name+' keyboard panning respects the boundary',await withinRegion(page));
      await page.locator('[data-map-day="0"]').click();
      check(name+' departure view keeps the map in Vietnam',await withinRegion(page));
      check(name+' departure lists Tập đoàn Viettel',(await page.locator('#atlasStops').textContent()).includes('Tập đoàn Viettel'));
      check(name+' departure pin uses the organizer coordinates',await page.evaluate(() => {
        const pickup = TRIP_MAP_DATA.places.hanoi_pickup;
        return pickup.lat === 21.0253150367579 && pickup.lng === 105.7854235877089 &&
          reviewMap.getCenter().distanceTo(L.latLng(pickup.lat,pickup.lng)) < 100;
      }));
      check(name+' departure marker is selected',await page.locator('.atlas-marker.is-selected').count() === 1);
      check(name+' departure retains gathering and departure times',/21:30/.test(await page.locator('#atlasDetail').textContent()) && /22:00/.test(await page.locator('#atlasDetail').textContent()));
      check(name+' departure exposes the supplied source link',await page.locator('#atlasDetail a[href="https://maps.app.goo.gl/BbCVS9ZQuAuS2LZE9"]').count() === 1);
      check(name+' departure no longer claims the pickup is unresolved',await page.locator('#atlasStops .atlas-unresolved').count() === 0);
      await page.locator('[data-map-day="all"]').click();
      check(name+' nearby pins group at overview zoom',await page.locator('.atlas-cluster').count() > 0);
      const beforeExpansion = await page.locator('.atlas-marker-host').count();
      await page.locator('.atlas-cluster-host').first().focus();
      await page.keyboard.press('Enter');
      check(name+' keyboard expands nearby places',await page.locator('.atlas-marker-host').count() > beforeExpansion);
      check(name+' marker focus survives group expansion',await page.evaluate(() => document.activeElement.classList.contains('atlas-marker-host')));
      await page.locator('[data-map-day="2"]').click();
      check(name+' correct day pressed',await page.locator('[data-map-day="2"]').getAttribute('aria-pressed') === 'true');
      check(name+' afternoon has three separate places',await page.locator('#atlasStops [data-map-visit^="afternoon-cluster:"]').count() === 3);
      check(name+' no invented afternoon order',(await page.locator('#atlasStops [data-map-visit^="afternoon-cluster:"]').allTextContents()).every(text => text.includes('chưa chốt thứ tự')));
      check(name+' unordered afternoon places have no connecting index line',await page.locator('.atlas-stop-connected [data-map-visit^="afternoon-cluster:"]').count() === 0);
      check(name+' unknown times explicit',(await page.locator('[data-map-visit="dinosaur-ridge:song_lung_khung_long"]').textContent()).includes('chưa chốt giờ'));
      await page.locator('[data-map-visit="lake:ho_mat_ngoc"]').click();
      check(name+' optional selection shows detail',(await page.locator('#atlasDetail').textContent()).includes('tùy chọn'));
      check(name+' list selection focuses its visible detail heading',await page.locator('#atlasDetail h3').evaluate(element => element === document.activeElement));
      await page.locator('#atlasOptional').uncheck();
      check(name+' optional item hidden',await page.locator('[data-map-visit="lake:ho_mat_ngoc"]').count() === 0);
      check(name+' hidden selection cleared',await page.locator('.atlas-welcome').count() === 1);
      await page.locator('#atlasOptional').check();
      await page.locator('[data-map-visit="room-change:mua_tru_homestay"]').click();
      check(name+' home base is grouped',await page.locator('#atlasVisit option').count() === 2);
      await page.locator('#atlasVisit').selectOption('home-breakfast:mua_tru_homestay',{force:true});
      check(name+' repeated visit changes actual time',(await page.locator('.atlas-place-time').textContent()).includes('05:15'));
      await page.locator('[data-map-step="1"]').click();
      check(name+' next step selects ridge',(await page.locator('#atlasDetail h3').textContent()).includes('Khủng Long'));
      check(name+' keyboard focus survives stepping',await page.evaluate(() => document.activeElement?.hasAttribute('data-map-step')));
      await page.locator('[data-map-day="1"]').click();
      await page.locator('[data-map-visit="thao-coffee:thao_coffee"]').click();
      check(name+' photo belongs to selected stop',(await page.locator('.atlas-photo img').getAttribute('src')).includes('p08_'));
      check(name+' selected marker is shown',await page.locator('.atlas-marker.is-selected').count() === 1);
      if (width < 768) {
        await page.locator('.atlas-sheet-toggle').click();
        check(name+' mobile details expand',await page.locator('#tripAtlas').evaluate(element => element.classList.contains('is-expanded')));
        check(name+' detail state is accessible',await page.locator('.atlas-sheet-toggle').getAttribute('aria-expanded') === 'true');
        check(name+' expanded atlas stays within width',await noOverflow(page,'#tripAtlas'));
        await page.waitForFunction(regionContainsMap);
        check(name+' expanded map retains its geographic bounds',await withinRegion(page));
      }
      await page.keyboard.press('Escape');
      await pause(50);
      check(name+' Escape closes',!(await page.locator('#tripAtlas').evaluate(element => element.open)));
      check(name+' map is released when closed',await page.locator('.leaflet-container').count() === 0);
      check(name+' overview focus restored',await page.locator('[data-map-overview]').evaluate(element => element === document.activeElement));
      const previewRequestStart = remote.length;
      await page.locator('#thao-coffee .place-map-action').click();
      await page.waitForSelector('.place-map-preview .leaflet-container');
      await page.waitForSelector('.place-map-preview .leaflet-tile',{state:'attached'});
      const previewTiles = await page.locator('.leaflet-tile').evaluateAll(images => images.map(image => image.src));
      const previewRequests = remote.slice(previewRequestStart);
      check(name+' preview requests only the selected viewport tiles',previewRequests.length > 0 && previewRequests.every(url => previewTiles.includes(url)));
      check(name+' inline preview is singular',await page.locator('.place-map-preview').count() === 1);
      check(name+' preview expanded state',await page.locator('#thao-coffee .place-map-action').getAttribute('aria-expanded') === 'true');
      await wheelZoom(page,name+' preview');
      check(name+' preview retains Vietnam bounds',await withinRegion(page));
      await page.locator('.preview-atlas').click();
      await page.waitForSelector('#tripAtlas .leaflet-container');
      check(name+' preview hands off to atlas',await page.locator('.place-map-preview').count() === 0 && await page.locator('.leaflet-container').count() === 1);
      check(name+' handoff preserves selection',(await page.locator('#atlasDetail h3').textContent()).includes('Thào'));
      await page.locator('.atlas-read').click();
      await pause(100);
      check(name+' native story return works',await page.evaluate(() => location.hash === '#thao-coffee' && !document.getElementById('tripAtlas').open));
      check(name+' story receives focus',await page.locator('#thao-coffee').evaluate(element => element === document.activeElement));
      await page.locator('[data-chapter="day-2"]').click();
      const dayMapButton = page.locator('[data-trail-day="day-2"] .trail-map-action');
      await dayMapButton.click();
      await page.waitForSelector('#tripAtlas .leaflet-container');
      check(name+' day menu opens the matching map',await page.locator('[data-map-day="2"]').getAttribute('aria-pressed') === 'true');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.getElementById('trailPanel').hidden);
      check(name+' day menu is restored on close',await dayMapButton.isVisible());
      check(name+' day map trigger regains focus',await dayMapButton.evaluate(element => element === document.activeElement));
      await page.close();
    }
    const large = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await large.route('https://a.tile.openstreetmap.fr/**',route => route.abort());
    await large.goto(url);
    await large.evaluate(() => document.documentElement.style.fontSize = '32px');
    await open(large);
    check('200% text atlas width',await noOverflow(large,'#tripAtlas'));
    check('200% text close is reachable',await large.locator('.atlas-close').isVisible());
    check('200% text dates do not overlap',await large.locator('[data-map-day]').evaluateAll(buttons => buttons.every((button,index) => {
      const a = button.getBoundingClientRect();
      return buttons.slice(index+1).every(other => {
        const b = other.getBoundingClientRect();
        return a.right <= b.left+1 || b.right <= a.left+1 || a.bottom <= b.top+1 || b.bottom <= a.top+1;
      });
    })));
    check('200% text gives the map a usable viewport',await large.locator('.trip-map-canvas').evaluate(element => element.getBoundingClientRect().height >= 180));
    await large.emulateMedia({media:'print'});
    await large.waitForFunction(() => !document.getElementById('tripAtlas').open);
    check('print hides map invitation',!(await large.locator('.map-invitation').isVisible()));
    check('print closes map',!(await large.locator('#tripAtlas').evaluate(element => element.open)));
    await large.close();
    const file = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    file.on('pageerror',error => report.errors.push('file: '+error.message));
    await file.goto('file://' + path.join(root,'index.html'));
    await file.locator('[data-map-overview]').click();
    check('file mode has local fallback',(await file.locator('.trip-map-status').textContent()).includes('bản web'));
    check('file mode still has place list',await file.locator('#atlasStops li').count() > 0);
    await file.locator('[data-map-visit="thao-coffee:thao_coffee"]').click();
    check('file mode local photo works',await file.locator('.atlas-photo img').evaluate(image => image.complete && image.naturalWidth > 0));
    check('file mode skips speculative library loading',await file.locator('link[rel="preload"][as="script"]').count() === 0);
    await file.close();
    for (const trigger of ['approach','focus']) {
      const warm = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
      warm.on('pageerror',error => report.errors.push('warmup '+trigger+': '+error.message));
      // CDP blocking preserves HTTP caching, unlike Playwright request routing.
      const network = await warm.context().newCDPSession(warm);
      await network.send('Network.enable');
      await network.send('Network.setBlockedURLs',{urls:['https://a.tile.openstreetmap.fr/*','https://api.open-meteo.com/*']});
      let libraryRequests = 0;
      let tileRequests = 0;
      warm.on('request',request => {
        if (request.url().endsWith('/vendor/leaflet/leaflet.js')) libraryRequests++;
        if (request.url().startsWith('https://a.tile.openstreetmap.fr/')) tileRequests++;
      });
      await warm.goto(url);
      const entry = warm.locator('[data-map-overview]');
      if (trigger === 'focus') await entry.focus();
      else await entry.scrollIntoViewIfNeeded();
      await warm.waitForFunction(() => performance.getEntriesByType('resource').some(resource => resource.name.endsWith('/vendor/leaflet/leaflet.js')));
      check(trigger+' warms the local library once',libraryRequests === 1);
      check(trigger+' keeps library execution on demand',await warm.evaluate(() => !window.L));
      check(trigger+' never prefetches map tiles',tileRequests === 0);
      await open(warm);
      await warm.waitForSelector('.atlas-marker-host,.atlas-cluster-host');
      check(trigger+' opening reuses the downloaded script',libraryRequests === 1);
      check(trigger+' pins work while tiles are unavailable',await warm.locator('.atlas-marker-host,.atlas-cluster-host').count() > 0);
      await warm.close();
    }
    const saving = await browser.newPage({reducedMotion:'reduce'});
    await saving.addInitScript(() => Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true}));
    await saving.goto(url);
    await saving.locator('[data-map-overview]').focus();
    await pause(100);
    check('data saver skips speculative library loading',await saving.locator('link[rel="preload"][as="script"]').count() === 0);
    check('data saver keeps library execution on demand',await saving.evaluate(() => !window.L));
    await saving.close();
    const missing = await browser.newPage({reducedMotion:'reduce'});
    await missing.route('**/vendor/leaflet/leaflet.js',route => route.abort());
    await missing.goto(url);
    await missing.locator('[data-map-overview]').click();
    await missing.waitForSelector('.trip-map-retry:not([hidden])');
    check('missing library has graceful fallback',(await missing.locator('.trip-map-status').textContent()).includes('Chưa mở được'));
    check('missing library leaves list usable',await missing.locator('#atlasStops li').count() > 0);
    await missing.close();
    const missingArt = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    missingArt.on('pageerror',error => report.errors.push('missing art: '+error.message));
    await missingArt.route('**/map_treasure_*.webp',route => route.abort());
    await missingArt.route('https://a.tile.openstreetmap.fr/**',route => route.abort());
    await missingArt.goto(url);
    await open(missingArt);
    await missingArt.waitForSelector('.atlas-compass img[hidden]',{state:'attached'});
    check('missing decoration retains compass control icon',await missingArt.locator('.atlas-compass svg').isVisible());
    check('missing decoration retains the live title',await missingArt.locator('#atlasTitle').isVisible());
    await missingArt.locator('[data-map-day="0"]').click();
    check('missing decoration retains usable date navigation',(await missingArt.locator('#atlasDetail h3').textContent()) === 'Tập đoàn Viettel');
    check('missing decoration does not overflow the atlas',await noOverflow(missingArt,'#tripAtlas'));
    await missingArt.close();
    const overlap = await browser.newPage({reducedMotion:'reduce'});
    await overlap.route('https://a.tile.openstreetmap.fr/**',route => route.abort());
    await overlap.goto(url);
    await overlap.evaluate(() => {
      // Exercise a real coordinate collision without changing the source registry.
      const home = TRIP_MAP_DATA.places.mua_tru_homestay;
      Object.assign(TRIP_MAP_DATA.places.thao_coffee,{lat:home.lat,lng:home.lng});
    });
    await open(overlap);
    for (let step = 0; step < 6 && !(await overlap.locator('.atlas-overlap-choices').count()); step++) {
      const group = overlap.locator('.atlas-cluster-host[title*="Thào Coffee"]');
      await group.focus();await overlap.keyboard.press('Enter');
    }
    check('exact overlap offers place choices at maximum zoom',await overlap.locator('.atlas-overlap-choices button').count() === 2);
    check('overlap choice receives keyboard focus',await overlap.locator('.atlas-overlap-choices button').first().evaluate(element => element === document.activeElement));
    await overlap.locator('.atlas-overlap-choices button').filter({hasText:'Thào Coffee'}).click();
    check('overlap choice selects the correct place',(await overlap.locator('#atlasDetail h3').textContent()).includes('Thào Coffee'));
    await overlap.close();
    check('no uncaught browser errors',report.errors.length === 0);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
  }
  console.log(report.checks.length+' map assertions passed; report '+output+'/checks.json');
})().catch(error => { console.error(error);process.exitCode = 1; });
