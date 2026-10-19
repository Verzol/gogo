/* Optional tactile watercolor objects. All content and navigation remain native. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const printing = matchMedia('print');
  const surface = document.createElement('div');
  const effects = document.createElement('div');
  const feedback = document.createElement('p');
  surface.className = 'play-surface';
  surface.id = 'playSurface';
  effects.className = 'play-effects';
  effects.id = 'playEffects';
  effects.setAttribute('aria-hidden','true');
  feedback.className = 'sr-only';
  feedback.setAttribute('role','status');
  feedback.setAttribute('aria-live','polite');
  document.body.append(surface,effects,feedback);
  const animations = new Map();
  const timers = new Set();
  const particles = new Set();
  const flights = new Set();
  const targets = new Set();
  const pig = document.querySelector('.fund-pig');
  const pigArt = document.querySelector('.fund-pig-art');
  const coin = document.querySelector('.fund-toy-coin');
  const illustration = document.querySelector('.fund-illustration');
  const cup = document.querySelector('.playful-cup');
  let drag = null;
  let updateTimer = 0;
  let frame = 0;
  let lastScroll = scrollY;
  let lastWorld = root.dataset.sceneryWorld;
  let stopped = false;
  let lastCoinSource = -1;
  let lastToss = -1;
  let lastPigReaction = -1;
  const randomBetween = (min,max) => min + Math.random() * (max - min);
  const nextChoice = (count,last) => last < 0 ? Math.floor(Math.random() * count) : (last + 1 + Math.floor(Math.random() * (count - 1))) % count;
  const allowed = () => !reduced.matches && !printing.matches && root.dataset.motionPaused !== 'true' && !document.hidden;
  const later = (fn,ms) => {
    const id = setTimeout(() => { timers.delete(id);fn(); },ms);
    timers.add(id);
    return id;
  };
  function say(text) { feedback.textContent = '';later(() => { feedback.textContent = text; },35); }
  function animate(node,frames,options,done) {
    if (!allowed() || !node.animate) { done?.();return null; }
    const animation = node.animate(frames,{duration:650,easing:'ease-out',...options});
    animations.set(animation,node);
    queue();
    animation.finished.then(() => {
      animations.delete(animation);
      animation.cancel();
      done?.();
    },() => { animations.delete(animation); });
    return animation;
  }
  function stopNode(node) {
    animations.forEach((owner,animation) => {
      if (owner === node) { animation.cancel();animations.delete(animation); }
    });
  }
  function removeParticle(node) { node.remove();particles.delete(node); }
  function particle(kind,x,y,dx,dy,delay = 0) {
    if (particles.size >= 12) return;
    const node = document.createElement(kind === 'heart' ? 'span' : 'img');
    node.className = 'play-particle play-particle--' + kind;
    if (kind === 'heart') node.textContent = '♡';
    else {
      node.src = './figures/scenery/painted/' + (kind === 'cloud' ? 'cloud_sky_puff' : 'star_motif') + '.webp';
      node.alt = '';
      node.addEventListener('error',() => removeParticle(node),{once:true});
    }
    node.style.left = (x - (kind === 'cloud' ? 32 : 12)) + 'px';
    node.style.top = (y - 12) + 'px';
    effects.append(node);particles.add(node);
    if (!allowed()) {
      later(() => removeParticle(node),950);
      return;
    }
    animate(node,[{opacity:0,transform:'translate(0,0) scale(.5)'},
      {opacity:1,transform:`translate(${dx * .35}px,${dy * .3}px) scale(1)`,offset:.3},
      {opacity:0,transform:`translate(${dx}px,${dy}px) scale(.65)`}],
    {duration:1050,delay},() => removeParticle(node));
  }
  function bounce(node,kind) {
    stopNode(node);
    const moon = kind === 'moon';
    animate(node,[{scale:'1',rotate:'0deg'},
      {scale:moon ? '1' : '.88 1.1',rotate:moon ? '-12deg' : '-4deg',offset:.22},
      {scale:moon ? '1' : '1.07 .95',rotate:moon ? '8deg' : '3deg',offset:.52},
      {scale:'1',rotate:'0deg'}],{duration:moon ? 1000 : 700});
  }
  function markTarget(node) {
    if (!node) return;
    node.dataset.playfulTarget = '';
    targets.add(node);
  }
  function home(node,instant = false) {
    if (!node) return;
    node.classList.remove('is-play-return');
    if (!instant && allowed()) node.classList.add('is-play-return');
    node.style.removeProperty('--play-x');
    node.style.removeProperty('--play-y');
    node.classList.remove('is-play-dragging');
    if (!instant) later(() => node.classList.remove('is-play-return'),580);
  }
  function hold(node,value) { if (node?.matches('.sky-cloud,.opening-cloud img')) JourneyScenery.holdCloud?.(node,value); }
  function releaseCapture(button,id) { if (button?.hasPointerCapture?.(id)) button.releasePointerCapture(id); }
  function cancelDrag(instant = true) {
    if (!drag) return;
    const state = drag;drag = null;
    state.button.dataset.suppressClick = String(performance.now() + 300);
    state.button.classList.remove('is-play-dragging');
    if (state.kind === 'coin') {
      coin.style.removeProperty('translate');
      illustration.classList.remove('is-coin-dragging','is-drop-ready');
    } else {
      home(state.source,instant);
      if (document.activeElement !== state.button) hold(state.source,false);
    }
    releaseCapture(state.button,state.id);
  }
  function finishFeed() {
    flights.forEach(node => { stopNode(node);node.remove(); });
    flights.clear();
    illustration?.classList.remove('is-feeding');
  }
  function reset() {
    cancelDrag();finishFeed();
    animations.forEach((_,animation) => animation.cancel());animations.clear();
    timers.forEach(clearTimeout);timers.clear();
    particles.forEach(node => node.remove());particles.clear();
    targets.forEach(node => { home(node,true);hold(node,false); });
    if (coin) coin.style.removeProperty('translate');
    if (cup) cup.style.removeProperty('rotate');
  }
  function pigPoint(clientX,clientY) {
    const box = pig.getBoundingClientRect();
    const matrix = new DOMMatrix(getComputedStyle(pig).transform).inverse();
    const point = matrix.transformPoint({x:clientX - box.left - box.width / 2,y:clientY - box.top - box.height / 2});
    return {x:point.x + pig.offsetWidth / 2,y:point.y + pig.offsetHeight / 2};
  }
  function slot() { return {x:pig.offsetWidth * .56991,y:pig.offsetHeight * .21702}; }
  function nearSlot(x,y) {
    const point = pigPoint(x,y),target = slot();
    return Math.hypot(point.x - target.x,point.y - target.y) < Math.max(35,pig.offsetWidth * .22);
  }
  function moveLooseCoin() {
    if (drag?.kind === 'coin') return;
    const anchors = [[.02,.12],[.99,.15],[.45,-.05],[.02,.6],[.99,.62],[.78,-.04]];
    lastCoinSource = nextChoice(anchors.length,lastCoinSource);
    const [x,y] = anchors[lastCoinSource];
    coin.style.left = Math.max(0,Math.min(illustration.clientWidth - coin.offsetWidth,pig.offsetLeft + pig.offsetWidth * x - 24 + randomBetween(-7,7))) + 'px';
    coin.style.top = Math.max(-24,Math.min(illustration.clientHeight - 65,pig.offsetTop + pig.offsetHeight * y - 24 + randomBetween(-6,6))) + 'px';
    coin.style.setProperty('--coin-tilt',randomBetween(-32,32) + 'deg');
    const image = coin.querySelector('img');
    stopNode(image);
    animate(image,[{scale:'.65',opacity:.4},{scale:'1',opacity:1}],{duration:180});
  }
  function coinToss(from,half,dropped) {
    const w = pig.offsetWidth,h = pig.offsetHeight,to = slot();
    const kinds = ['lob','swoop','spiral','flutter'];
    if (!dropped) lastToss = nextChoice(kinds.length,lastToss);
    const kind = dropped ? 'drop' : kinds[lastToss];
    const side = from.x < to.x ? -1 : 1;
    const end = {x:to.x,y:to.y - (dropped ? 25 : randomBetween(30,43))};
    const lift = dropped ? randomBetween(14,27) : h * randomBetween(.35,.65);
    const c1 = {x:from.x + side * w * (kind === 'swoop' ? .22 : .08),y:from.y - lift};
    const c2 = {x:end.x + (kind === 'swoop' ? -side : side) * w * randomBetween(.16,.35),y:end.y - lift};
    const direction = Math.random() < .5 ? -1 : 1;
    const turns = dropped ? 1 : Math.floor(randomBetween(1,4));
    const angle = 12 + direction * turns * 360;
    const initialAngle = randomBetween(-50,50);
    const frames = [];
    const pose = (x,y,rotation,face,offset,layer = 3) => ({
      transform:`translate(${x - half}px,${y - half}px) rotate(${rotation}deg) scaleX(${face})`,
      offset,zIndex:layer
    });
    // Sample a curved flight in front of the painting, then align every toss
    // with the same slit before moving it behind the painted foreground.
    for (let i = 0;i <= 12;i++) {
      const t = i / 12,u = 1 - t;
      let x = u ** 3 * from.x + 3 * u ** 2 * t * c1.x + 3 * u * t ** 2 * c2.x + t ** 3 * end.x;
      let y = u ** 3 * from.y + 3 * u ** 2 * t * c1.y + 3 * u * t ** 2 * c2.y + t ** 3 * end.y;
      if (kind === 'spiral') {
        x += Math.sin(t * Math.PI * 2) * Math.sin(t * Math.PI) * w * .24;
        y += Math.cos(t * Math.PI * 2) * Math.sin(t * Math.PI) * h * .15;
      } else if (kind === 'flutter') {
        x += Math.sin(t * Math.PI * 4) * Math.sin(t * Math.PI) * w * .12;
        y += Math.sin(t * Math.PI * 3) * Math.sin(t * Math.PI) * h * .09;
      }
      x = Math.max(-w * .17,Math.min(w * 1.17,x));
      const face = .22 + .78 * Math.abs(Math.cos(t * Math.PI * turns * 2));
      frames.push(pose(x,y,initialAngle + (angle - initialAngle) * t,face,t * .72));
    }
    frames.push(pose(to.x,to.y - half * .8,angle,.28,.82));
    frames.push(pose(to.x,to.y - half * .65,angle,.25,.84,1));
    frames.push(pose(to.x,to.y + half,angle,.2,1,1));
    return {kind,frames,duration:dropped ? randomBetween(450,620) : randomBetween(840,1240)};
  }
  function pigReaction() {
    const kinds = ['hop','wiggle','squish','nod','shimmy'];
    lastPigReaction = nextChoice(kinds.length,lastPigReaction);
    const kind = kinds[lastPigReaction],side = Math.random() < .5 ? -1 : 1;
    const strength = randomBetween(.8,1.15);
    const neutral = {translate:'0px 0px',scale:'1',rotate:'0deg'};
    const pose = (x,y,rotation,sx = 1,sy = 1) => ({translate:`${x * strength}px ${y * strength}px`,rotate:rotation * side * strength + 'deg',scale:`${sx} ${sy}`});
    const reactions = {
      hop:[pose(0,-15,-4,1.02,.98),pose(0,2,3,1.07,.94)],
      wiggle:[pose(-4,-2,-8),pose(4,-3,8),pose(-2,0,-4)],
      squish:[pose(0,3,0,1.13,.87),pose(0,-6,-2,.95,1.08)],
      nod:[pose(0,0,9,1.03,.96),pose(0,-4,-5,.98,1.03)],
      shimmy:[pose(-7,-4,-4),pose(7,-4,5),pose(-3,-1,-2)]
    };
    const current = getComputedStyle(pigArt);
    const start = {translate:current.translate,rotate:current.rotate,scale:current.scale};
    stopNode(pigArt);
    pigArt.dataset.reaction = kind;
    animate(pigArt,[start,...reactions[kind],neutral],{duration:randomBetween(520,820),easing:'cubic-bezier(.2,.8,.3,1)'});
    const box = pig.getBoundingClientRect();
    const count = kind === 'hop' || kind === 'shimmy' ? 3 : 1;
    for (let i = 0;i < count;i++) {
      particle(kind === 'wiggle' || kind === 'nod' ? 'star' : 'heart',box.left + box.width * (.35 + i * .15),box.top + box.height * .12,(i - (count - 1) / 2) * 30 + side * 10,randomBetween(-65,-40),i * 60);
    }
  }
  function feedPig(start) {
    say('Heo nhận được một xu vui!');
    const box = pig.getBoundingClientRect();
    if (!allowed() || !pigArt.animate) {
      particle('heart',box.left + box.width * .7,box.top + box.height * .12,0,0);
      return;
    }
    if (!start) moveLooseCoin();
    const origin = start || (() => { const b = coin.getBoundingClientRect();return {x:b.left + b.width / 2,y:b.top + b.height / 2}; })();
    const from = pigPoint(origin.x,origin.y);
    if (start) moveLooseCoin();
    const node = document.createElement('span');
    node.className = 'fund-coin-flight';
    node.innerHTML = '<img src="./figures/decor/painted/playful/toy_coin.webp" width="128" height="128" alt="">';
    pigArt.append(node);
    flights.add(node);
    illustration.classList.add('is-feeding');
    const toss = coinToss(from,node.offsetWidth / 2,!!start);
    node.dataset.toss = toss.kind;
    animate(node,toss.frames,{duration:toss.duration,easing:'linear'},() => {
      if (!flights.delete(node)) return;
      node.remove();
      illustration.classList.toggle('is-feeding',flights.size > 0);
      pigReaction();
    });
  }
  function react(source,kind,point) {
    const box = source.getBoundingClientRect();
    const x = point?.x ?? box.left + box.width / 2;
    const y = point?.y ?? box.top + box.height / 2;
    bounce(source,kind);
    say({sun:'Một chút nắng ấm!',moon:'Chúc một đêm đầy sao.',cloud:'Mây lại trôi rồi!'}[kind]);
    if (kind === 'cloud') {
      [-1,1].forEach((direction,index) => particle('cloud',x,y,direction * 55,-32,index * 60));
    } else {
      const count = allowed() ? 3 : 1;
      for (let i = 0;i < count;i++) particle('star',x,y,(i - 1) * 37,-35 - (i % 2) * 28,i * 90);
      if (kind === 'sun' && allowed()) {
        const rays = source.querySelector('.sun-rays');
        if (rays) { stopNode(rays);animate(rays,[{rotate:'0deg'},{rotate:'24deg',offset:.55},{rotate:'0deg'}],{duration:900}); }
      }
    }
  }
  function coffee() {
    const box = cup.getBoundingClientRect();
    bounce(cup.querySelector('img'),'cup');
    say('Cà phê ấm giữa biển mây.');
    if (!allowed()) { particle('heart',box.left + box.width / 2,box.top,0,0);return; }
    const node = document.createElement('span');
    node.className = 'play-steam';
    node.innerHTML = '<svg viewBox="0 0 42 80" fill="none" aria-hidden="true"><path d="M20 72C2 49 37 45 24 28C7 8 3 29 20 34C39 19 40 2 27 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';
    node.style.left = box.left + box.width * .4 - 21 + 'px';node.style.top = box.top - 45 + 'px';
    if (particles.size >= 12) return;
    effects.append(node);particles.add(node);
    animate(node,[{opacity:0,transform:'translateY(12px) scale(.7)'},{opacity:.9,transform:'translateY(-5px) scale(1)',offset:.35},{opacity:0,transform:'translateY(-45px) scale(1.1)'}],{duration:1400},() => removeParticle(node));
  }
  function connectDrag(button,getSource,getKind) {
    button.addEventListener('pointerdown',event => {
      if (event.button !== 0 || !event.isPrimary || !allowed() || drag) return;
      const kind = getKind();
      if (kind === 'moon' || button.getAttribute('aria-disabled') === 'true') return;
      const source = getSource();
      if (!source) return;
      if (kind !== 'coin') { stopNode(source);home(source,true);hold(source,true); }
      drag = {id:event.pointerId,button,source,kind,x:event.clientX,y:event.clientY,box:button.getBoundingClientRect(),moved:false,touch:event.pointerType === 'touch'};
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove',event => {
      if (!drag || drag.button !== button || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x,dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx,dy) < 7) return;
      if (drag.touch && drag.kind !== 'coin' && Math.abs(dy) > Math.abs(dx) * 1.2) { cancelDrag();return; }
      drag.moved = true;button.classList.add('is-play-dragging');
      if (drag.kind === 'coin') {
        coin.style.translate = Math.max(8 - drag.box.left,Math.min(innerWidth - 8 - drag.box.right,dx)) + 'px ' + Math.max(8 - drag.box.top,Math.min(innerHeight - 8 - drag.box.bottom,dy)) + 'px';
        illustration.classList.add('is-coin-dragging');
        illustration.classList.toggle('is-drop-ready',nearSlot(event.clientX,event.clientY));
      } else {
        drag.source.classList.add('is-play-dragging');
        drag.source.style.setProperty('--play-x',Math.max(-65,Math.min(65,dx * .7)) + 'px');
        drag.source.style.setProperty('--play-y',(drag.touch ? 0 : Math.max(-38,Math.min(38,dy * .6))) + 'px');
      }
    });
    button.addEventListener('pointerup',event => {
      if (!drag || drag.button !== button || drag.id !== event.pointerId) return;
      const state = drag;drag = null;
      button.classList.remove('is-play-dragging');
      if (state.kind === 'coin') {
        const accepted = state.moved && nearSlot(event.clientX,event.clientY);
        const from = coin.style.translate;
        coin.style.removeProperty('translate');illustration.classList.remove('is-coin-dragging','is-drop-ready');
        if (accepted) feedPig({x:event.clientX,y:event.clientY});
        else if (state.moved) animate(coin,[{translate:from},{translate:'0px 0px'}],{duration:400});
      } else {
        home(state.source);
        if (document.activeElement !== button) hold(state.source,false);
      }
      if (state.moved) button.dataset.suppressClick = String(performance.now() + 300);
      releaseCapture(button,state.id);queue();
    });
    ['pointercancel','lostpointercapture'].forEach(type => button.addEventListener(type,() => { if (drag?.button === button) cancelDrag(); }));
  }
  const suppressed = button => performance.now() < Number(button.dataset.suppressClick || 0);
  if (pig && coin) {
    pig.disabled = false;coin.disabled = false;illustration.classList.add('is-play-ready');
    pig.addEventListener('click',() => feedPig());
    coin.addEventListener('click',() => { if (!suppressed(coin) && coin.getAttribute('aria-disabled') !== 'true') feedPig(); });
    connectDrag(coin,() => coin,() => 'coin');
    coin.querySelector('img').addEventListener('error',event => { event.target.hidden = true;coin.classList.add('is-fallback'); });
  }
  if (cup) { cup.disabled = false;cup.addEventListener('click',coffee); }
  const blockers = 'a,button,input,textarea,select,summary,[contenteditable="true"],.nav,.chapter-nav,.hero-actions,.hero-summary,.postcard,.stay-photos,.member,.crew-diary,.trip-games,.cloud-wheel,.fund-pocket,.fund-action,.packing-heading,.checklist,.destination-index,.food-grid,.practical,.footer';
  function clearPoint(x,y) {
    const checked = new Set();
    return document.elementsFromPoint(x,y).every(node => {
      if (surface.contains(node) || effects.contains(node)) return true;
      if (node.closest(blockers)) return false;
      const text = node.closest('h1,h2,h3,h4,p,time,label,li,.hero-date,.time-stamp');
      if (!text || checked.has(text)) return true;
      checked.add(text);
      // Block the ink, including each wrapped line, rather than the full-width
      // heading box. The opening sun sits beside the phone's short first line.
      const walker = document.createTreeWalker(text,NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const range = document.createRange();range.selectNodeContents(walker.currentNode);
        if ([...range.getClientRects()].some(r => x > r.left - 5 && x < r.right + 5 && y > r.top - 5 && y < r.bottom + 5)) return false;
      }
      return true;
    });
  }
  function clearBox(box) {
    return [[.5,.5],[.18,.2],[.82,.2],[.18,.8],[.82,.8]].every(([x,y]) => clearPoint(box.x + box.w * x,box.y + box.h * y));
  }
  function fit(x,y,w,h) {
    if (x + w < 12 || x > innerWidth - 12 || y + h < 85 || y > innerHeight - 20) return null;
    const b = {x:Math.max(8,Math.min(innerWidth - w - 8,x)),y:Math.max(85,Math.min(innerHeight - h - 12,y)),w,h};
    return clearBox(b) ? b : null;
  }
  function makeHotspot() {
    const button = document.createElement('button');
    button.type = 'button';button.className = 'play-hotspot';button.hidden = true;
    surface.append(button);
    const item = {button,source:null,kind:''};
    button.addEventListener('click',() => {
      if (item.source && !suppressed(button)) { const b = button.getBoundingClientRect();react(item.source,item.kind,{x:b.left + b.width / 2,y:b.top + b.height / 2}); }
    });
    button.addEventListener('focus',() => hold(item.source,true));
    button.addEventListener('blur',() => { if (drag?.button !== button) hold(item.source,false); });
    connectDrag(button,() => item.source,() => item.kind);
    return item;
  }
  const celestial = makeHotspot(),cloud = makeHotspot();
  function hide(item) {
    if (drag?.button === item.button) cancelDrag();
    hold(item.source,false);item.button.hidden = true;item.source = null;
  }
  function show(item,source,kind,box) {
    if (item.source !== source) hold(item.source,false);
    item.source = source;item.kind = kind;markTarget(source);
    const names = {sun:['Chạm hoặc kéo mặt trời','Chọc nắng một chút'],moon:['Chạm trăng, gọi sao','Gọi một trời sao'],cloud:['Chạm hoặc kéo mây','Kéo mây một chút']};
    // Vietnamese names stay live text, independent of the decorative paintings.
    item.button.setAttribute('aria-label',names[kind][0]);
    item.button.dataset.hint = names[kind][1];item.button.dataset.kind = kind;
    Object.assign(item.button.style,{left:box.x + 'px',top:box.y + 'px',width:box.w + 'px',height:box.h + 'px'});
    item.button.hidden = false;
    if (document.activeElement === item.button) hold(source,true);
  }
  function update() {
    frame = 0;clearTimeout(updateTimer);
    if (stopped || document.hidden || printing.matches) { hide(celestial);hide(cloud);return; }
    const opening = document.getElementById('openingWorld');
    targets.forEach(node => { if (!node.isConnected) targets.delete(node); });
    const openingActive = opening && !opening.hidden && Number(getComputedStyle(opening).opacity) > .98;
    const world = root.dataset.sceneryWorld;
    const panel = document.querySelector('.scene-' + world);
    const modal = document.querySelector('dialog[open]') || document.getElementById('navToggle')?.getAttribute('aria-expanded') === 'true';
    const navigating = document.querySelector('.navigation-scene,.scene-catchup');
    const blocked = modal || navigating || !!root.dataset.locationScene;
    // The dominant world remains playable through a physical scroll dissolve.
    // Only one pair of controls exists; a world change cancels a held gesture.
    const settled = panel && Number(panel.style.opacity) > .5;
    if (blocked || (!openingActive && (!settled || (opening && !opening.hidden)))) {
      hide(celestial);hide(cloud);
    } else {
      if (drag?.button !== celestial.button) {
        const source = openingActive ? opening.querySelector('.opening-sun') : panel.querySelector('.painted-sun,.painted-moon');
        const kind = source?.classList.contains('painted-moon') ? 'moon' : 'sun';
        const rect = source?.getBoundingClientRect();
        const image = source?.matches('img') ? source : source?.querySelector('.sun-disc');
        const visible = source && image?.naturalWidth && !image.hidden && getComputedStyle(source).visibility !== 'hidden' && rect.width > 0;
        // The sun disc occupies 34% of its transparent canvas; rays are not a hit target.
        const size = rect ? Math.max(44,rect.width * (kind === 'sun' ? .36 : .96)) : 44;
        const box = visible && fit(rect.left + (rect.width - size) / 2,rect.top + (rect.height - size) / 2,size,size);
        if (box) show(celestial,source,kind,box);else hide(celestial);
      }
      if (drag?.button !== cloud.button) {
        const candidates = openingActive ? opening.querySelectorAll('.opening-cloud--left img,.opening-cloud--right img,.opening-cloud--high img,.opening-cloud--far img') : panel.querySelectorAll('.sky-cloud');
        let choice = null;
        const ordered = document.activeElement === cloud.button && cloud.source ? [cloud.source] : [...candidates];
        for (const source of ordered) {
          if (source.hidden || !source.naturalWidth || getComputedStyle(source).display === 'none') continue;
          const r = source.getBoundingClientRect();
          if (r.width < 44 || r.right < 30 || r.left > innerWidth - 30 || r.bottom < 95) continue;
          for (const fraction of [.5,.3,.7]) {
            const w = Math.min(100,Math.max(52,r.width * .23)),h = Math.min(58,Math.max(44,r.height * .5));
            const x = r.left + r.width * fraction - w / 2,y = r.top + r.height * .55 - h / 2;
            if (x < 8 || x + w > innerWidth - 8 || y < 85 || y + h > innerHeight - 12) continue;
            const box = fit(x,y,w,h);
            if (box) { choice = {source,box};break; }
          }
          if (choice) break;
        }
        if (choice) show(cloud,choice.source,'cloud',choice.box);else hide(cloud);
      }
    }
    // Only moving clouds need tracking. Static/reduced-motion pages have no loop.
    if (allowed() && !modal && !root.dataset.locationScene && (openingActive || cloud.source || animations.size || !settled || navigating)) updateTimer = setTimeout(queue,120);
  }
  function queue() { if (!frame && !stopped) frame = requestAnimationFrame(update); }
  addEventListener('scroll',() => {
    if (Math.abs(scrollY - lastScroll) > 2) { cancelDrag();lastScroll = scrollY; }
    queue();
  },{passive:true});
  addEventListener('resize',() => { reset();queue(); },{capture:true});
  document.addEventListener('load',event => { if (event.target.closest?.('#scenery')) queue(); },true);
  document.addEventListener('keydown',event => { if (event.key === 'Escape') reset(); });
  document.addEventListener('journey:play-reset',() => { reset();hide(celestial);hide(cloud);queue(); });
  document.addEventListener('journey:opening-exit',() => { reset();queue(); });
  document.addEventListener('visibilitychange',() => { reset();queue(); });
  new MutationObserver(() => {
    if (root.dataset.sceneryWorld !== lastWorld) { lastWorld = root.dataset.sceneryWorld;reset(); }
    if (!allowed()) reset();
    queue();
  }).observe(root,{attributes:true,attributeFilter:['data-motion-paused','data-scenery-world','data-location-scene']});
  reduced.addEventListener('change',() => { reset();queue(); });
  printing.addEventListener('change',() => { reset();queue(); });
  const overlayChanges = new MutationObserver(() => { reset();queue(); });
  overlayChanges.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  const openingWorld = document.getElementById('openingWorld');
  // Paused/reduced pages have no tracking loop, but forecast previews still
  // change which paintings are visible and must refresh their hit regions.
  if (openingWorld) overlayChanges.observe(openingWorld,{attributes:true,attributeFilter:['data-weather']});
  const navToggle = document.getElementById('navToggle');
  if (navToggle) overlayChanges.observe(navToggle,{attributes:true,attributeFilter:['aria-expanded']});
  addEventListener('pagehide',() => { stopped = true;reset();clearTimeout(updateTimer);cancelAnimationFrame(frame);frame = 0; });
  addEventListener('pageshow',() => { stopped = false;queue(); });
  document.fonts?.ready.then(queue);
  window.JourneyPlay = {reset,refresh:queue};
  queue();
})();
