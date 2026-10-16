// Layered watercolor stage. Shared cutouts decode once; skies and stars scale
// to any viewport without enlarging a flattened concept image.
const JourneyScenery = (() => {
  const folder = './figures/scenery/painted/';
  const presets = {
    sunrise:{terrain:'',near:'ridge_near',sun:true,cloud:true},
    night:{terrain:'_night',near:'ridge_near',moon:true,stars:true},
    bluehour:{terrain:'_bluehour',near:'ridge_near',moon:true,stars:true,cloud:true},
    daylight:{terrain:'',near:'ridge_serrated',sun:true,cloud:true,detail:'rock_outcrop'},
    jade:{terrain:'',near:'meadow_left',sun:true,cloud:true,detail:'solitary_tree',lake:true},
    afternoon:{terrain:'',near:'meadow_right',sun:true,rays:false,cloud:true,detail:'hillside_hut'}
  };
  const loads = new Map();
  const panelLoads = new Map();
  const panels = new Map();
  let opening;
  let bounds = {end:1,clear:1};
  let openingFrame = 0;
  let previewRequest = 0;
  let wasInside = true;
  const cloudMotions = new Map();
  const cloudStreams = new WeakMap();
  let windRate = 1;
  const compactSky = matchMedia('(max-width:767px), (max-height:520px) and (orientation:landscape)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const smooth = value => { const p = Math.max(0,Math.min(1,value)); return p * p * (3 - 2 * p); };
  function cutout(name,role,extra = '') {
    return `<img class="painted-piece ${role}" data-src="${folder}${name}.webp" alt="" decoding="async" ${extra}>`;
  }
  function stars() {
    let seed = 2026;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    let dots = '';
    for (let i = 0; i < 95; i++) {
      const x = random() * 1600, y = random() * 500;
      // Keep a quiet reading area; all stars stay above the mountain horizon.
      const opacity = (x > 340 && x < 1080 ? .24 : .6) * (.4 + random() * .6);
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(.5 + random() * 1.3).toFixed(1)}" opacity="${opacity.toFixed(2)}"/>`;
    }
    return `<svg class="painted-stars" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" fill="#ffedcb">${dots}</svg>`;
  }
  function init() {
    const stage = document.getElementById('sceneLayers');
    Object.entries(presets).forEach(([id,p]) => {
      const panel = document.createElement('div');
      panel.className = 'scene-panel scene-' + id;
      panel.dataset.background = id;
      panel.style.opacity = id === 'sunrise' ? 1 : 0;
      panel.innerHTML = `<div class="painted-sky"></div>${p.stars ? stars() : ''}
        ${p.sun ? `<div class="painted-sun">${p.rays !== false ? cutout('sun_rays','sun-rays') : ''}${cutout('sun_disc','sun-disc')}</div>` : ''}
        ${p.moon ? cutout('moon','painted-moon') : ''}
        ${p.cloud ? cutout('cloud_sky_puff','sky-cloud') + cutout('cloud_distant_wisp','high-wisp') : ''}
        <div class="opening-depth"><div class="painted-terrain${id === 'sunrise' ? '' : ' painted-terrain--quiet'}">
          <div class="ridge-band ridge-far">${cutout('ridge_far' + p.terrain,'ridge-image')}<div class="ridge-fill"></div></div>
          ${p.cloud ? cutout('cloud_valley_ribbon','valley-cloud') : ''}
          <div class="ridge-band ridge-mid">${cutout('ridge_mid' + p.terrain,'ridge-image')}<div class="ridge-fill"></div></div>
          <div class="ridge-band ridge-near">${cutout(p.near + p.terrain,'ridge-image')}<div class="ridge-fill"></div></div>
          ${id === 'sunrise' ? '' : `<picture class="quiet-terrain"><source media="(max-width:767px)" data-srcset="${folder}ui_quiet_terrain_portrait${p.terrain}.webp">${cutout('ui_quiet_terrain_wide' + p.terrain,'quiet-terrain-image')}</picture>`}
          ${p.lake ? cutout('lake','valley-lake') : ''}
          ${p.detail ? cutout(p.detail,'landscape-detail detail-' + p.detail) : ''}
        </div></div>`;
      stage.appendChild(panel);
      panels.set(id,panel);
    });
    initOpening(stage);
    initCloudFlow(stage);
  }
  // Bounded, staggered copies share each one-way track. Phones use fewer lanes
  // and copies; every reset remains fully offscreen at either composition.
  // Playback-rate updates retain time/position when a forecast changes wind.
  function moveCloud(image,speed,copies = 3) {
    if (!image.animate) return;
    const translate = parseFloat(getComputedStyle(image).translate) || 0;
    const box = image.getBoundingClientRect();
    let stream = cloudStreams.get(image);
    if (!box.width || !copies) {
      (stream || [image]).forEach(cloud => {
        cloudMotions.get(cloud)?.animation.cancel();
        cloudMotions.delete(cloud);
        if (cloud !== image) cloud.remove();
      });
      image.style.removeProperty('translate');
      cloudStreams.delete(image);
      return;
    }
    if (!stream) {
      stream = [image];
      cloudStreams.set(image,stream);
    }
    while (stream.length > copies) {
      const cloud = stream.pop();
      cloudMotions.get(cloud)?.animation.cancel();
      cloudMotions.delete(cloud);
      cloud.remove();
    }
    while (stream.length < copies) {
      const copy = image.cloneNode(true);
      copy.classList.add('cloud-repeat');
      copy.removeAttribute('fetchpriority');
      copy.addEventListener('error',() => { copy.hidden = true; });
      stream[stream.length - 1].after(copy);
      stream.push(copy);
    }
    const left = box.left - translate;
    const isOpening = !image.closest('.scene-panel');
    const margin = Math.max(40,innerWidth * (compactSky.matches && isOpening ? .12 : .3));
    const from = -box.width - left - margin;
    const to = innerWidth - left + margin;
    const duration = (to - from) / speed * 1000;
    const time = Math.max(0,Math.min(duration - 1,(translate - from) / speed * 1000));
    stream.forEach((cloud,index) => {
      cloudMotions.get(cloud)?.animation.cancel();
      const phase = (time + duration * index / stream.length) % duration;
      cloud.style.translate = (from + phase * speed / 1000) + 'px 0';
      const animation = cloud.animate([{translate:from + 'px 0'},{translate:to + 'px 0'}],{duration,iterations:Infinity,easing:'linear'});
      animation.pause();
      animation.currentTime = phase;
      cloudMotions.set(cloud,{animation,panel:image.closest('.scene-panel')});
    });
    syncCloudFlow();
  }
  function syncCloudFlow() {
    const paused = reduced.matches || document.hidden || document.documentElement.dataset.motionPaused === 'true';
    cloudMotions.forEach(({animation,panel}) => {
      const active = !paused && (panel ? panel.dataset.ambient === 'true' : !opening.hidden);
      const rate = panel ? 1 : compactSky.matches ? Math.min(2.4,windRate) : windRate;
      if (animation.playbackRate !== rate) animation.updatePlaybackRate(rate);
      if (active && animation.playState !== 'running') animation.play();
      if (!active && animation.playState !== 'paused') animation.pause();
    });
  }
  function initCloudFlow(stage) {
    const speeds = {far:8,left:20,right:17,high:13,low:23,passing:26};
    measureClouds();
    const observer = new MutationObserver(records => {
      if (!opening.hidden && records.some(record => record.target === opening)) measureClouds();
      syncCloudFlow();
    });
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion-paused']});
    observer.observe(opening,{attributes:true,attributeFilter:['hidden']});
    panels.forEach(panel => observer.observe(panel,{attributes:true,attributeFilter:['data-ambient']}));
    document.addEventListener('visibilitychange',syncCloudFlow);
    reduced.addEventListener('change',syncCloudFlow);
    function measureClouds() {
      // Re-measure only on layout changes, never in an animation frame loop.
      opening.querySelectorAll('.opening-cloud').forEach(holder => {
        const type = Object.keys(speeds).find(key => holder.classList.contains('opening-cloud--' + key));
        const phone = {high:[10,1],left:[15,2],far:[8,2]}[type];
        const scale = Math.max(.85,Math.min(1.1,innerWidth / 390));
        moveCloud(holder.firstElementChild,compactSky.matches && phone ? phone[0] * scale : speeds[type],compactSky.matches ? phone?.[1] || 0 : 3);
      });
      stage.querySelectorAll('.scene-panel .sky-cloud:not(.cloud-repeat),.scene-panel .high-wisp:not(.cloud-repeat)').forEach(image => moveCloud(image,image.classList.contains('high-wisp') ? 6 : 10));
      const overcast = document.querySelector('#openingOvercast img');
      if (overcast) moveCloud(overcast,14,compactSky.matches ? 0 : 3);
      document.getElementById('weatherParticles')?.style.setProperty('--wind-speed',compactSky.matches ? Math.min(2.4,windRate) : windRate);
    }
    addEventListener('resize',measureClouds);
  }
  function cloudImage(name,extra = '') {
    const wide = name === 'cloud_sea_far' || name === 'cloud_transition_near';
    return `<img class="ambient" ${extra} src="${folder}${name}.webp" srcset="${folder}${name}_phone.webp ${wide ? 780 : 640}w, ${folder}${name}.webp ${wide ? 1440 : 1152}w" sizes="(max-width:767px) ${wide ? '100vw' : '85vw'}, ${wide ? '100vw' : '48vw'}" alt="" decoding="async">`;
  }
  function initOpening(stage) {
    opening = document.createElement('div');
    opening.className = 'opening-world';
    opening.id = 'openingWorld';
    opening.innerHTML = `<div class="opening-backdrop"></div>
      ${['clear','cloudy','fog','rain','snow','storm'].map(id => `<div class="weather-sky weather-sky--${id}"></div>`).join('')}
      <div class="weather-cold"></div>
      <div class="opening-cloud opening-cloud--far">${cloudImage('cloud_sea_far')}</div>
      <div class="opening-cloud opening-cloud--left">${cloudImage('cloud_hero_left','fetchpriority="high"')}</div>
      <div class="opening-cloud opening-cloud--right">${cloudImage('cloud_hero_right')}</div>
      <div class="opening-cloud opening-cloud--high">${cloudImage('cloud_hero_right')}</div>
      <div class="opening-cloud opening-cloud--low">${cloudImage('cloud_hero_left')}</div>
      <div class="opening-cloud opening-cloud--passing">${cloudImage('cloud_transition_near')}</div>
      <div class="opening-overcast" id="openingOvercast"></div>`;
    opening.querySelectorAll('img').forEach(img => img.addEventListener('error',() => { img.hidden = true; }));
    stage.appendChild(opening);
    const measure = () => {
      const hero = document.getElementById('top');
      const essential = [...hero.querySelectorAll('.hero-copy,.hero-summary')].map(el => el.getBoundingClientRect().bottom + scrollY);
      const first = document.querySelector('.event');
      const bottom = Math.max(1,...essential);
      bounds.clear = bottom - innerHeight * .1;
      bounds.start = Math.max(0,bottom - innerHeight * .75);
      bounds.end = Math.max(bounds.start + innerHeight * .45,(first?.getBoundingClientRect().top + scrollY || hero.offsetHeight) - innerHeight * .42);
      updateOpening();
    };
    const queue = () => { if (!openingFrame) openingFrame = requestAnimationFrame(updateOpening); };
    addEventListener('scroll',queue,{passive:true});
    addEventListener('resize',measure);
    addEventListener('pageshow',measure);
    if (window.ResizeObserver) new ResizeObserver(measure).observe(document.getElementById('top'));
    document.fonts?.ready.then(measure);
    const syncVisibility = () => { document.documentElement.dataset.motionHidden = String(document.hidden); };
    document.addEventListener('visibilitychange',syncVisibility);
    syncVisibility();
    reduced.addEventListener('change',updateOpening);
    measure();
  }
  function updateOpening() {
    openingFrame = 0;
    if (!opening) return;
    const p = smooth(scrollY / bounds.end);
    const terrainProgress = smooth((scrollY - bounds.start) / Math.max(1,bounds.end - bounds.start));
    const staticMode = reduced.matches || !window.gsap || !window.ScrollTrigger;
    const exit = smooth((p - .12) / .88);
    opening.style.opacity = (1 - exit).toFixed(4);
    if (opening.hidden !== (p >= 1)) opening.hidden = p >= 1;
    opening.style.setProperty('--cloud-exit',staticMode ? '0px' : (-innerHeight * p * .6).toFixed(2) + 'px');
    // Keep lateral descent inside the track's offscreen margin at either size.
    opening.style.setProperty('--cloud-part',staticMode ? '0px' : (innerWidth * p * (compactSky.matches ? .08 : .24)).toFixed(2) + 'px');
    panels.forEach(panel => {
      const depth = panel.querySelector('.opening-depth');
      depth.style.transform = `translateY(${staticMode ? 0 : (innerHeight * (1 - terrainProgress) * .72).toFixed(2)}px)`;
    });
    const inside = scrollY < bounds.clear;
    if (!inside && wasInside) document.dispatchEvent(new Event('journey:opening-exit'));
    wasInside = inside;
    const particles = document.getElementById('weatherParticles');
    if (particles) particles.style.opacity = (inside ? 1 - exit : 0).toFixed(4);
  }
  async function previewWeather(state) {
    const request = ++previewRequest;
    if (!opening) return;
    opening.dataset.weather = state?.kind || '';
    opening.style.setProperty('--cold',state?.cold || 0);
    opening.style.setProperty('--wind-speed',state?.windFactor || 1);
    windRate = state?.windFactor || 1;
    syncCloudFlow();
    const particles = document.getElementById('weatherParticles');
    particles.dataset.weather = state?.precipitation || '';
    particles.dataset.rain = state?.rainType || '';
    particles.style.setProperty('--rain-strength',state?.intensity || .4);
    particles.style.setProperty('--wind-speed',compactSky.matches ? Math.min(2.4,windRate) : windRate);
    particles.style.setProperty('--rain-slant',-(state?.windSlant || 0) + 'deg');
    particles.style.setProperty('--snow-slant',-(state?.windSlant || 0) * .3 + 'deg');
    particles.style.setProperty('--snow-strength',state?.intensity || .65);
    if (state && state.kind !== 'clear') {
      const holder = document.getElementById('openingOvercast');
      if (!holder.firstElementChild) {
        holder.innerHTML = cloudImage('cloud_overcast');
        holder.firstElementChild.addEventListener('error',event => { event.target.hidden = true; });
        moveCloud(holder.firstElementChild,14,compactSky.matches ? 0 : 3);
      }
      const decoded = await holder.firstElementChild.decode().then(() => true,() => false);
      if (request === previewRequest) opening.dataset.cloudReady = String(decoded);
    }
  }
  function load(id) {
    const panel = panels.get(id);
    if (!panel) return Promise.resolve(false);
    if (panel.dataset.ready) return Promise.resolve(true);
    if (panelLoads.has(id)) return panelLoads.get(id);
    panel.querySelectorAll('source[data-srcset]').forEach(source => { source.srcset = source.dataset.srcset; });
    const decoded = Promise.all([...panel.querySelectorAll('img')].map(img => {
      const src = img.dataset.src;
      // Each instance still needs its own decoded pixels before it can paint.
      if (!loads.has(src)) {
        const resource = new Image();
        resource.src = src;
        loads.set(src,resource.decode().then(() => true,() => false));
      }
      return loads.get(src).then(ok => {
        if (!ok) { img.hidden = true; return; }
        if (!img.getAttribute('src')) img.src = src;
        return img.decode().catch(() => { img.hidden = true; });
      });
    })).then(() => {
      // The vector sky always works, even if an optional cutout fails to load.
      panel.dataset.ready = 'true';
      return true;
    });
    panelLoads.set(id,decoded);
    return decoded;
  }
  function drift(y) {
    const offset = Math.sin(y / (Math.max(1,innerHeight) * 5)) * 14;
    panels.forEach(panel => {
      const active = String(Number(panel.style.opacity) > 0);
      if (panel.dataset.ambient !== active) panel.dataset.ambient = active;
      if (Number(panel.style.opacity) > 0) panel.style.setProperty('--scenery-drift',offset.toFixed(2) + 'px');
    });
  }
  return {init,load,drift,previewWeather,openingBounds:() => bounds,heroActive:() => scrollY < bounds.clear,isReady:id => !!panels.get(id)?.dataset.ready};
})();
