/* Optional opening exploration. Two decoded scenic slots; no story/forecast writes. */
(() => {
  'use strict';
  if (typeof LOCATION_SCENES === 'undefined' || typeof JourneyScenery === 'undefined') return;
  const root = document.documentElement,hero = document.getElementById('top');
  // Artwork follows viewport shape; controls follow the independent CSS width breakpoints.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'),portraitView = matchMedia('(max-aspect-ratio: 1/1)');
  const stage = document.createElement('div');stage.id = 'locationStage';stage.className = 'location-stage';stage.setAttribute('aria-hidden','true');stage.hidden = true;
  document.getElementById('scenery').append(stage);
  const chooser = document.createElement('section');chooser.id = 'locationExplorer';chooser.className = 'location-explorer';chooser.setAttribute('aria-label','Ghé những miền Tà Xùa');
  chooser.innerHTML = '<div class="location-heading"><p>Ghé một miền Tà Xùa</p><button type="button" class="location-reset" hidden>Về biển mây <span aria-hidden="true">↶</span></button></div><div class="location-stickers" role="group" aria-label="Chọn phong cảnh"></div><div class="location-caption"><div><h2 id="locationName">Mỗi hình dán, một miền cảnh.</h2><p id="locationLine">Chạm để ghé qua, cuộn để lên đường.</p></div><a class="location-story" hidden>Đến trang nhật ký <span aria-hidden="true">↗</span></a></div><p class="location-illustration">Tranh minh họa địa điểm</p><p class="sr-only location-status" role="status" aria-live="polite"></p>';
  hero.insertBefore(chooser,document.getElementById('heroSummary'));
  root.dataset.locationsReady = 'true';
  const resetButton = chooser.querySelector('.location-reset'),name = chooser.querySelector('#locationName'),line = chooser.querySelector('#locationLine'),story = chooser.querySelector('.location-story'),status = chooser.querySelector('.location-status');
  const buttons = new Map(),cache = new Map();
  let suppressFocus = false;
  let selected = '',desired = '',visible = '',version = 0,intent = 0,leave = 0,frame = 0,stopped = false;
  let desiredPortrait = '';
  let fade = null,settling = Promise.resolve(),lastPoint = {x:0,y:0};
  const canMove = () => !reduced.matches && root.dataset.motionPaused !== 'true' && !document.hidden && !stopped;
  const base = './figures/scenery/locations/';
  const image = src => new Promise((resolve,reject) => {
    const img = new Image();img.decoding = 'async';img.onload = () => img.decode().then(() => resolve(img),reject);img.onerror = reject;img.src = src;
  });
  const blocked = () => !!document.querySelector('dialog[open],.navigation-scene') || document.getElementById('navToggle')?.getAttribute('aria-expanded') === 'true';
  function busy(id,value) { buttons.get(id)?.setAttribute('aria-busy',String(value)); }
  function controls() {
    buttons.forEach((button,id) => {button.setAttribute('aria-pressed',String(id === selected));button.dataset.preview = String(id === desired);});
    resetButton.hidden = !desired && !visible;
  }
  async function prepare(id,portrait) {
    const key = id + (portrait ? '_portrait' : '_wide');
    if (!cache.has(key)) {
      const sources = [base + key + '.webp',base + id + '_foreground.webp'];
      if (id === 'waterfall') sources.push(base + 'waterfall_flow_' + (portrait ? 'portrait' : 'wide') + '.webp',base + 'spray.webp');
      const promise = Promise.all(sources.map(image)).then(async loaded => {
        const slot = build(LOCATION_SCENES.find(scene => scene.id === id),loaded,portrait);
        // Cache the actual decoded composition, not resources that must be cloned
        // and decoded again on every visit. Include small ambient cutouts too.
        await Promise.all([...slot.querySelectorAll('.location-mist,.location-bird')].map(img => img.decode().catch(() => {img.hidden = true;})));
        return slot;
      }).catch(error => {if (cache.get(key) === promise) cache.delete(key);throw error;});
      cache.set(key,promise);
      // Keep two recent compositions rather than six full decoded worlds.
      while (cache.size > 2) cache.delete(cache.keys().next().value);
    }
    const pending = cache.get(key);
    cache.delete(key);cache.set(key,pending);
    return pending;
  }
  function build(scene,loaded,portrait) {
    const slot = document.createElement('div');slot.className = 'location-slot';slot.dataset.location = scene.id;slot.dataset.effect = scene.effect;slot.dataset.portrait = String(portrait);
    const plate = document.createElement('div');plate.className = 'location-depth location-depth--far';
    const painting = loaded[0];painting.alt = '';painting.className = 'location-painting';plate.append(painting);
    const mist = document.createElement('div');mist.className = 'location-depth location-depth--mist';
    const wisp = new Image();wisp.src = scene.id === 'ridge' ? './figures/scenery/painted/cloud_valley_ribbon.webp' : base + 'mist.webp';wisp.alt = '';wisp.className = 'location-mist';mist.append(wisp);
    if (scene.id === 'waterfall') {
      const flow = loaded[2];flow.alt = '';flow.className = 'location-painting location-flow';plate.append(flow);
      const spray = loaded[3];spray.alt = '';spray.className = 'location-spray';plate.append(spray);
    }
    const near = document.createElement('div');near.className = 'location-depth location-depth--near';
    const foreground = loaded[1];foreground.alt = '';foreground.className = 'location-foreground';
    if (scene.id === 'coffee') {foreground.classList.add('location-steam');plate.append(foreground);} else near.append(foreground);
    slot.append(plate,mist,near);
    if (scene.effect === 'reflection' || scene.effect === 'water') {
      const shimmer = document.createElement('div');shimmer.className = 'location-water-light';slot.append(shimmer);
    }
    if (scene.effect === 'birds') {
      for (let i = 0;i < 2;i++) {const bird = new Image();bird.src = base + 'birds.webp';bird.alt = '';bird.className = 'location-bird location-bird--' + i;slot.append(bird);}
    }
    return slot;
  }
  function positionDetails() {
    stage.querySelectorAll('.location-slot').forEach(slot => {
      const painting = slot.querySelector('.location-painting');
      const detail = slot.querySelector('.location-steam,.location-spray');
      if (!detail || !painting.naturalWidth || !painting.naturalHeight) return;
      const width = painting.clientWidth,height = painting.clientHeight;
      const scale = Math.max(width / painting.naturalWidth,height / painting.naturalHeight);
      const artWidth = painting.naturalWidth * scale,artHeight = painting.naturalHeight * scale;
      const portrait = slot.dataset.portrait === 'true';
      const point = slot.dataset.location === 'coffee' ? (portrait ? [.755,.778] : [.724,.765]) : (portrait ? [.635,.81] : [.66,.79]);
      const style = getComputedStyle(slot),x = parseFloat(style.getPropertyValue('--art-x')) / 100,y = parseFloat(style.getPropertyValue('--art-y')) / 100;
      detail.style.left = ((width - artWidth) * x + artWidth * point[0]) + 'px';
      detail.style.top = ((height - artHeight) * y + artHeight * point[1]) + 'px';
      detail.style.width = Math.max(45,artWidth * (slot.dataset.location === 'coffee' ? .065 : .18)) + 'px';
    });
  }
  addEventListener('resize',positionDetails);
  function announce(scene) {status.textContent = selected ? 'Đang ngắm ' + scene.name + '.' : '';}
  async function show(id,{hold = false,keepWeather = false} = {}) {
    if (blocked() || !JourneyScenery.heroActive()) return;
    clearTimeout(intent);clearTimeout(leave);
    const scene = LOCATION_SCENES.find(item => item.id === id);if (!scene) return;
    document.dispatchEvent(new Event('journey:location-preview'));
    if (hold) selected = id;
    const portrait = portraitView.matches,orientation = String(portrait);
    // Pointerenter, focus and click can request the same scene before it loads.
    if (desired === id && desiredPortrait === orientation) {controls();if (visible === id) announce(scene);return;}
    // Leaving a brief different hover restores the already visible held world.
    // Cancel the pending request without rebuilding or replaying its fade.
    if (visible === id && stage.dataset.portrait === orientation && !stage.hidden) {
      // Re-entering during the cloud-return fade also keeps the same painting.
      if (!desired) {fade?.cancel();fade = null;settling = Promise.resolve();stage.style.opacity = '1';}
      ++version;desired = id;desiredPortrait = orientation;
      name.textContent = scene.name;line.textContent = scene.line;story.href = '#' + scene.target;story.hidden = false;
      buttons.forEach((_,key) => busy(key,false));controls();announce(scene);return;
    }
    if (!keepWeather) window.JourneyWeather?.clearPreview();
    desired = id;desiredPortrait = orientation;const ticket = ++version;
    buttons.forEach((_,key) => busy(key,key === id));controls();status.textContent = hold ? 'Đang mở ' + scene.name + '…' : '';
    try {
      const slot = await prepare(id,portrait);
      await settling;
      if (ticket !== version || !JourneyScenery.heroActive() || blocked()) return;
      slot.style.opacity = '0';stage.append(slot);stage.hidden = false;
      stage.dataset.portrait = String(portrait);stage.style.opacity = '1';
      root.dataset.locationScene = id;JourneyScenery.setLocationPreview(true);
      positionDetails();
      visible = id;name.textContent = scene.name;line.textContent = scene.line;story.href = '#' + scene.target;story.hidden = false;
      const old = [...stage.children].filter(node => node !== slot);
      if (canMove() && slot.animate) {
        fade = slot.animate([{opacity:0},{opacity:1}],{duration:750,easing:'cubic-bezier(.2,.65,.3,1)',fill:'forwards'});
        const animation = fade;
        settling = animation.finished.catch(() => {}).then(() => {
          if (slot.isConnected) slot.style.opacity = '1';animation.cancel();old.forEach(node => node.remove());
          if (fade === animation) fade = null;
        });
      } else {slot.style.opacity = '1';old.forEach(node => node.remove());settling = Promise.resolve();}
      busy(id,false);controls();announce(scene);syncMotion();
    } catch (_) {
      if (ticket !== version) return;
      clear(true);status.textContent = 'Chưa mở được phong cảnh. Chạm hình dán để thử lại nhé.';
    } finally {if (ticket === version) buttons.forEach((_,key) => busy(key,false));}
  }
  function finishClear() {
    stage.replaceChildren();stage.hidden = true;stage.dataset.moving = 'false';stage.style.opacity = '1';visible = '';
    delete root.dataset.locationScene;JourneyScenery.setLocationPreview(false);controls();
  }
  function clear(instant = false) {
    ++version;desired = selected = desiredPortrait = '';clearTimeout(intent);clearTimeout(leave);
    buttons.forEach((_,id) => busy(id,false));
    fade?.cancel();fade = null;settling = Promise.resolve();
    name.textContent = 'Mỗi hình dán, một miền cảnh.';line.textContent = 'Chạm để ghé qua, cuộn để lên đường.';story.hidden = true;status.textContent = '';
    if (!instant && canMove() && !stage.hidden && stage.animate) {
      // Finish the current incoming layer before fading the composition as a whole.
      [...stage.children].forEach(node => {node.style.opacity = '1';});
      const ticket = version,animation = stage.animate([{opacity:1},{opacity:0}],{duration:450,easing:'ease-out'});
      fade = animation;
      settling = animation.finished.catch(() => {}).then(() => {if (ticket === version) finishClear();animation.cancel();if (fade === animation) fade = null;});
    } else finishClear();
    controls();
  }
  LOCATION_SCENES.forEach((scene,index) => {
    const button = document.createElement('button');button.type = 'button';button.className = 'location-sticker';button.dataset.location = scene.id;
    button.setAttribute('aria-label','Ngắm ' + scene.name);button.setAttribute('aria-pressed','false');button.style.setProperty('--sticker-angle',[-7,4,-3,6,-5,3][index] + 'deg');
    const sticker = new Image();sticker.src = './figures/decor/painted/location_stickers/' + scene.id + '.webp';sticker.alt = '';sticker.width = 104;sticker.height = 90;sticker.decoding = 'async';
    sticker.addEventListener('error',() => {sticker.hidden = true;});
    const label = document.createElement('span');label.textContent = scene.label;button.append(sticker,label);chooser.querySelector('.location-stickers').append(button);buttons.set(scene.id,button);
    button.addEventListener('pointerenter',event => {
      if (event.pointerType === 'touch') return;
      clearTimeout(intent);clearTimeout(leave);intent = setTimeout(() => show(scene.id),160);
    });
    button.addEventListener('focus',() => {if (!suppressFocus && button.matches(':focus-visible')) show(scene.id);});
    button.addEventListener('click',() => {if (selected === scene.id) clear();else show(scene.id,{hold:true});});
  });
  chooser.addEventListener('pointerenter',() => clearTimeout(leave));
  chooser.addEventListener('pointerleave',event => {
    if (event.pointerType === 'touch') return;
    clearTimeout(intent);leave = setTimeout(() => {if (selected) {if (desired !== selected) show(selected);} else {const focused = document.activeElement.closest?.('.location-sticker');if (focused && focused.matches(':focus-visible')) show(focused.dataset.location);else clear();}},120);
  });
  chooser.addEventListener('focusout',() => {queueMicrotask(() => {if (!chooser.contains(document.activeElement) && !selected && !chooser.matches(':hover')) clear();});});
  resetButton.addEventListener('click',() => {clear();suppressFocus = true;buttons.values().next().value.focus({preventScroll:true});suppressFocus = false;});
  // Reset button focus must not immediately re-open the first scene.
  resetButton.addEventListener('mousedown',event => event.preventDefault());
  document.addEventListener('keydown',event => {if (event.key === 'Escape') clear(true);});
  document.addEventListener('journey:opening-exit',() => clear(true));
  document.addEventListener('journey:location-reset',() => clear(true));
  document.addEventListener('journey:weather-preview',() => clear(true));
  document.addEventListener('click',event => {if (event.target.closest('a[href^="#"]')) clear(true);},true);
  const overlayObserver = new MutationObserver(() => {if (blocked()) clear(true);});
  overlayObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  const nav = document.getElementById('navToggle');if (nav) overlayObserver.observe(nav,{attributes:true,attributeFilter:['aria-expanded']});
  function syncMotion() {
    stage.dataset.moving = String(canMove() && !stage.hidden);
    if (!canMove()) {
      if (fade) fade.finish();
      lastPoint = {x:0,y:0};stage.style.setProperty('--look-x','0');stage.style.setProperty('--look-y','0');
      cancelAnimationFrame(frame);frame = 0;
    }
  }
  new MutationObserver(syncMotion).observe(root,{attributes:true,attributeFilter:['data-motion-paused']});
  reduced.addEventListener('change',syncMotion);
  document.addEventListener('visibilitychange',syncMotion);
  hero.addEventListener('pointermove',event => {
    if (event.pointerType === 'touch' || !canMove() || stage.hidden) return;
    lastPoint = {x:(event.clientX / innerWidth - .5) * 2,y:(event.clientY / innerHeight - .5) * 2};
    if (!frame) frame = requestAnimationFrame(() => {frame = 0;stage.style.setProperty('--look-x',lastPoint.x.toFixed(3));stage.style.setProperty('--look-y',lastPoint.y.toFixed(3));});
  });
  hero.addEventListener('pointerleave',() => {stage.style.setProperty('--look-x','0');stage.style.setProperty('--look-y','0');});
  portraitView.addEventListener('change',() => {if (desired) show(desired,{hold:!!selected,keepWeather:true});});
  addEventListener('scroll',() => {if ((desired || visible) && !JourneyScenery.heroActive()) clear(true);},{passive:true});
  addEventListener('pagehide',() => {stopped = true;clear(true);syncMotion();});
  addEventListener('pageshow',() => {stopped = false;syncMotion();});
  window.JourneyLocations = {clear:() => clear(true),get active(){return visible;}};
})();
