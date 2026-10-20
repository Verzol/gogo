/* Optional 20/10 keepsake. Owns only its scene, flower controls and short effects.
   Layer: inside scenery, after the location stage; never part of story snapshots. */
(() => {
  'use strict';
  if (typeof TRIP_DATA === 'undefined' || !TRIP_DATA.womensDay || typeof JourneyScenery === 'undefined') return;
  const root = document.documentElement,copy = TRIP_DATA.womensDay;
  const hero = document.getElementById('top'),crew = document.getElementById('crewGrid');
  if (!hero || !crew) return;
  const base = './figures/decor/painted/womens_day/';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const portrait = matchMedia('(max-aspect-ratio: 1/1)');
  const stage = document.createElement('div');
  stage.id = 'womensDayStage';stage.className = 'wd-stage';stage.hidden = true;
  stage.setAttribute('aria-hidden','true');document.getElementById('scenery').append(stage);
  const petals = document.createElement('div');petals.className = 'wd-petals';stage.append(petals);
  const contexts = [],triggers = [],cache = new Map(),flights = new Set();
  let active = null,pending = null,held = null,epoch = 0,intent = 0,leave = 0;
  let fade = null;
  const canMove = () => !reduced.matches && root.dataset.motionPaused !== 'true' && !document.hidden;
  const blocked = () => !!document.querySelector('dialog[open],.navigation-scene') || document.getElementById('navToggle')?.getAttribute('aria-expanded') === 'true';
  const inView = context => {
    if (context.kind === 'hero') return JourneyScenery.heroActive();
    const top = context.container.getBoundingClientRect(),grid = crew.getBoundingClientRect();
    return top.top < innerHeight && grid.bottom > 110;
  };
  function image(name,width,height) {
    const img = new Image(width,height);img.src = base + name + '.webp';img.alt = '';
    img.decoding = 'async';img.draggable = false;
    img.addEventListener('error',() => {img.hidden = true;});return img;
  }
  function invitation(kind,parent,before) {
    const container = document.createElement('section');container.className = 'wd-invite wd-invite--' + kind;
    container.setAttribute('aria-label','Một bó hoa trên mây, ' + copy.dateLabel);
    const button = document.createElement('button');button.type = 'button';button.className = 'wd-bouquet';
    button.setAttribute('aria-label',copy.invitation + ', ' + copy.dateLabel);
    button.append(image('bouquet',88,88));
    const label = document.createElement('span');
    const date = document.createElement('small');date.textContent = copy.dateLabel;
    const line = document.createElement('span');line.textContent = copy.invitation;
    label.append(date,line);button.append(label);
    const message = document.createElement('div');message.className = 'wd-message';message.hidden = true;
    const title = document.createElement('h2'),text = document.createElement('p');message.append(title,text);
    const status = document.createElement('p');status.className = 'wd-status';status.setAttribute('role','status');
    container.append(button,message,status);parent.insertBefore(container,before || null);
    const context = {kind,container,button,message,title,text,status};contexts.push(context);
    wire(button,context,'');
    container.addEventListener('pointerleave',deferLeave);
    container.addEventListener('focusout',deferLeave);
    container.addEventListener('pointerenter',() => clearTimeout(leave));
    return context;
  }
  const opening = invitation('hero',hero.querySelector('.hero-copy'));
  const garden = invitation('crew',crew.parentElement,crew);
  for (const id of copy.recipients) {
    const member = TRIP_DATA.members.find(person => person.id === id);
    const article = crew.querySelector('[data-member-id="' + id + '"]');
    if (!member || !article) continue;
    article.classList.add('wd-member');
    const button = document.createElement('button');button.type = 'button';button.className = 'wd-flower';
    button.dataset.recipient = id;
    button.setAttribute('aria-label',copy.personal.replace('{name}',member.name));
    const sprig = image('flower_' + id,64,80);
    const fallback = document.createElement('span');fallback.className = 'wd-flower-fallback';fallback.textContent = copy.dateLabel;fallback.hidden = true;
    sprig.addEventListener('error',() => {fallback.hidden = false;});
    button.append(sprig,fallback);
    article.append(button);
    wire(button,garden,id);
    // A portrait hover is also a discovery; its adjacent native flower button
    // provides the equivalent action to touch and keyboard users.
    article.querySelector('.avatar').addEventListener('pointerenter',event => {
      if (event.pointerType !== 'touch') preview(button,garden,id);
    });
    article.addEventListener('pointerleave',deferLeave);
    article.addEventListener('focusout',deferLeave);
  }
  function wire(button,context,id) {
    const item = {button,context,id};triggers.push(item);
    button.setAttribute('aria-pressed','false');button.setAttribute('aria-controls','womensDayStage');
    button.addEventListener('pointerenter',event => {if (event.pointerType !== 'touch') preview(button,context,id);});
    button.addEventListener('focus',() => {if (button.matches(':focus-visible')) preview(button,context,id);});
    button.addEventListener('pointerleave',deferLeave);
    button.addEventListener('blur',deferLeave);
    button.addEventListener('click',() => {
      clearTimeout(intent);clearTimeout(leave);
      if (held?.button === button) {clear();return;}
      held = item;show(item,true);
    });
  }
  function preview(button,context,id) {
    clearTimeout(intent);clearTimeout(leave);
    intent = setTimeout(() => show({button,context,id}),140);
  }
  function deferLeave() {
    clearTimeout(intent);clearTimeout(leave);
    leave = setTimeout(() => {
      const focused = triggers.find(item => item.button === document.activeElement && item.button.matches(':focus-visible'));
      if (focused) {show(focused);return;}
      if (held) {if ((pending || active)?.button !== held.button) show(held);return;}
      const context = (active || pending)?.context;
      if (context?.container.matches(':hover') || document.querySelector('.wd-member:hover')) return;
      clear();
    },140);
  }
  function syncControls() {
    triggers.forEach(item => {
      item.button.setAttribute('aria-pressed',String(held?.button === item.button));
      item.button.dataset.preview = String(active?.button === item.button);
      item.button.setAttribute('aria-busy',String(pending?.button === item.button));
    });
    contexts.forEach(context => {
      const visible = active?.context === context;
      context.message.hidden = !visible;
      context.container.dataset.active = String(visible);
      if (!pending || pending.context !== context) context.status.textContent = '';
    });
  }
  function load(orientation) {
    if (cache.has(orientation)) return cache.get(orientation);
    const promise = new Promise((resolve,reject) => {
      const img = new Image();img.className = 'wd-landscape';img.alt = '';img.decoding = 'async';
      img.onload = () => img.decode().then(() => resolve(img),reject);img.onerror = reject;
      img.src = base + 'landscape_' + orientation + '.webp';
    });
    cache.set(orientation,promise);promise.catch(() => cache.delete(orientation));return promise;
  }
  function cancelEffects() {
    flights.forEach(animation => animation.cancel());flights.clear();petals.replaceChildren();
    fade?.cancel();fade = null;
  }
  function flutter() {
    if (!canMove() || !stage.animate) return;
    // One small burst; new activations replace it, so effects stay bounded.
    flights.forEach(animation => animation.cancel());flights.clear();petals.replaceChildren();
    for (let index = 0;index < (innerWidth < 768 ? 6 : 10);index++) {
      const petal = image('petal_' + (index % 2 + 1),28,32);
      petal.className = 'wd-petal';petal.style.left = (8 + Math.random() * 84) + '%';
      petal.style.top = (12 + Math.random() * 20) + '%';petals.append(petal);
      const animation = petal.animate([
        {transform:'translate(0,-18px) rotate(-20deg)',opacity:0},
        {opacity:.85,offset:.15},
        {transform:'translate(' + (Math.random() * 90 - 45) + 'px,170px) rotate(' + (70 + Math.random() * 150) + 'deg)',opacity:0}
      ],{duration:1800 + Math.random() * 500,delay:index * 65,easing:'ease-out'});
      flights.add(animation);animation.finished.catch(() => {}).then(() => {flights.delete(animation);petal.remove();});
    }
  }
  async function show(item,celebrate = false) {
    clearTimeout(intent);clearTimeout(leave);
    if (blocked() || !inView(item.context)) {clear();return;}
    // Clear competing pending decodes as well as already-visible previews.
    window.JourneyLocations?.clear();window.JourneyWeather?.clearPreview();
    const orientation = portrait.matches ? 'portrait' : 'wide';
    const ticket = ++epoch;pending = item;syncControls();
    if (celebrate) item.context.status.textContent = copy.loading;
    try {
      const img = await load(orientation);
      if (ticket !== epoch || blocked() || !inView(item.context)) return;
      const changed = active?.button !== item.button || stage.dataset.orientation !== orientation;
      cancelEffects();stage.querySelector('.wd-landscape')?.remove();stage.prepend(img);
      stage.dataset.orientation = orientation;stage.hidden = false;
      root.dataset.womensDay = item.context.kind;
      JourneyScenery.setLocationPreview(true);
      document.dispatchEvent(new Event('journey:play-reset'));
      active = item;pending = null;
      const member = TRIP_DATA.members.find(person => person.id === item.id);
      item.context.title.textContent = member ? copy.personal.replace('{name}',member.name) : copy.title;
      item.context.text.textContent = member ? copy.personalMessage.replace('{name}',member.name) : copy.message;
      syncControls();
      if (changed && canMove() && stage.animate) {
        fade = stage.animate([{opacity:0},{opacity:1}],{duration:650,easing:'ease-out'});
      }
      if (celebrate) {item.context.status.textContent = item.context.title.textContent + ' ' + item.context.text.textContent;flutter();}
    } catch (_) {
      if (ticket !== epoch) return;
      clear();item.context.title.textContent = copy.title;item.context.text.textContent = copy.message;
      item.context.message.hidden = false;item.context.status.textContent = copy.error;
    }
  }
  function clear() {
    ++epoch;clearTimeout(intent);clearTimeout(leave);cancelEffects();
    active = pending = held = null;stage.hidden = true;stage.querySelector('.wd-landscape')?.remove();
    delete root.dataset.womensDay;
    if (!root.dataset.locationScene) JourneyScenery.setLocationPreview(false);
    syncControls();
  }
  document.addEventListener('keydown',event => {if (event.key === 'Escape') clear();});
  document.addEventListener('journey:location-preview',clear);
  document.addEventListener('journey:weather-preview',clear);
  document.addEventListener('journey:opening-exit',() => {if ((active || pending)?.context === opening) clear();});
  document.addEventListener('click',event => {if (!event.target.closest('.wd-bouquet,.wd-flower')) clear();},true);
  const observer = new MutationObserver(() => {if (blocked()) clear();});
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  const nav = document.getElementById('navToggle');
  if (nav) observer.observe(nav,{attributes:true,attributeFilter:['aria-expanded']});
  const visibility = new IntersectionObserver(() => {
    const context = (active || pending)?.context;
    if (context && !inView(context)) clear();
  });
  [hero,garden.container,crew].forEach(node => visibility.observe(node));
  function syncMotion() {
    if (!canMove()) cancelEffects();
  }
  new MutationObserver(syncMotion).observe(root,{attributes:true,attributeFilter:['data-motion-paused']});
  reduced.addEventListener('change',syncMotion);
  portrait.addEventListener('change',() => {if (active || pending) show(active || pending);});
  document.addEventListener('visibilitychange',syncMotion);
  addEventListener('pagehide',clear);
  matchMedia('print').addEventListener('change',event => {if (event.matches) clear();});
  window.JourneyWomensDay = {clear,get active(){return active ? active.id || active.context.kind : '';}};
})();
