// One motion owner: native manual scrolling, scenic crossfades, real anchors,
// and short scrapbook gestures. Optional under HTTP and direct-file use.
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  let media;
  let refreshTimer;
  const refresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(),120);
  };
  const api = window.JourneyMotion = {refresh};
  try {
    gsap.registerPlugin(ScrollTrigger);
    media = gsap.matchMedia();
    media.add({desktop:'(min-width:768px)',phone:'(max-width:767px)',motion:'(prefers-reduced-motion:no-preference)'},context => {
      if (!context.conditions.motion) return;
      JourneyUI.stopFallback();
      const sections = Array.from(document.querySelectorAll('.hero, .day-heading, .event, #fund, #crew'));
      const panels = Array.from(document.querySelectorAll('.scene-panel'));
      const progress = document.querySelector('.chapter-progress');
      const ready = new Set();
      const pending = new Set();
      const unavailable = new Set();
      const gestures = new Set();
      const folds = new Set();
      const decks = new Map();
      const stickers = new Map();
      const arrivals = new Map();
      const proxy = {y:scrollY};
      let points = [];
      let changes = [];
      let lastActive = '';
      let navigation = null;
      let waitingBackground = '';
      let catchup = null;
      let alive = true;
      let trigger;
      const distance = () => Math.max(1,document.documentElement.scrollHeight - innerHeight);
      const clamp = gsap.utils.clamp(0,1);
      const ease = value => value * value * (3 - 2 * value);
      function animate(target,vars) {
        let tween;
        const complete = vars.onComplete;
        tween = gsap.to(target,{...vars,onInterrupt:() => gestures.delete(tween),onComplete:() => {
          gestures.delete(tween);
          complete?.();
        }});
        gestures.add(tween);
        return tween;
      }
      function prepare(id) {
        if (ready.has(id) || pending.has(id) || unavailable.has(id)) return;
        pending.add(id);
        JourneyUI.loadBackground(id).then(ok => {
          pending.delete(id);
          if (!alive) return;
          if (ok) ready.add(id);
          else unavailable.add(id);
          if (navigation) {
            if (!ok && navigation.arrived) finishNavigation();
            else navigation.blend();
          }
          else {
            if (!ok && waitingBackground === id) {
              waitingBackground = '';
              finishCatchup();
            }
            if (ok && waitingBackground === id) {
              const snapshot = catchup?.snapshot && Number(catchup.snapshot.style.opacity || 1) === 1 ? catchup.snapshot : sceneSnapshot('scene-catchup');
              finishCatchup();
              document.getElementById('sceneLayers').appendChild(snapshot);
              const state = catchup = {snapshot};
              state.tween = animate(snapshot,{opacity:0,duration:.6,ease:'power2.inOut',onComplete:() => {
                snapshot.remove();
                if (catchup === state) catchup = null;
              }});
            }
            renderAt(proxy.y);
          }
        });
      }
      function sceneSnapshot(className) {
        const sceneLayers = document.getElementById('sceneLayers');
        const cover = sceneLayers.querySelector(':scope > .scene-catchup');
        // Repeated flings before a fade begins can reuse the opaque frozen
        // composition, instead of nesting another copy on every scroll event.
        const snapshot = (cover && Number(cover.style.opacity || 1) > .995 ? cover : sceneLayers).cloneNode(true);
        snapshot.removeAttribute('id');
        snapshot.className = className;
        snapshot.style.opacity = 1;
        snapshot.querySelectorAll('.scene-catchup,.navigation-scene').forEach(layer => {layer.className = 'frozen-scene';});
        snapshot.querySelectorAll('.scene-panel').forEach(photo => {
          const original = panels.find(item => item.dataset.background === photo.dataset.background);
          photo.style.setProperty('--scenery-drift',original.style.getPropertyValue('--scenery-drift'));
          photo.classList.replace('scene-panel','navigation-panel');
          photo.removeAttribute('data-background');
        });
        // Freeze the actual ambient pose, not a restarted CSS animation.
        const originals = (cover && Number(cover.style.opacity || 1) > .995 ? cover : sceneLayers).querySelectorAll('.ambient,.sky-cloud,.high-wisp');
        snapshot.querySelectorAll('.ambient,.sky-cloud,.high-wisp').forEach((piece,index) => {
          const style = getComputedStyle(originals[index]);
          piece.style.animation = 'none';
          piece.style.transform = style.transform;
          piece.style.translate = style.translate;
        });
        const fading = '.weather-sky,.weather-cold,.opening-overcast';
        const liveFades = (cover && Number(cover.style.opacity || 1) > .995 ? cover : sceneLayers).querySelectorAll(fading);
        snapshot.querySelectorAll(fading).forEach((piece,index) => {
          piece.style.opacity = getComputedStyle(liveFades[index]).opacity;
          piece.style.transition = 'none';
        });
        snapshot.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        return snapshot;
      }
      function finishCatchup() {
        if (!catchup) return;
        catchup.tween?.kill();
        catchup.snapshot.remove();
        catchup = null;
      }
      function paint(from,to,amount) {
        JourneyUI.setSceneryTone(amount > .5 ? to : from);
        // The outgoing world stays opaque beneath the incoming one.
        panels.forEach(photo => {
          const id = photo.dataset.background;
          const opacity = id === to ? (from === to ? 1 : amount) : id === from ? 1 : 0;
          const z = id === to ? 1 : 0;
          if (photo.style.opacity !== String(opacity)) photo.style.opacity = opacity;
          if (photo.style.zIndex !== String(z)) photo.style.zIndex = z;
        });
      }
      function build() {
        const starts = sections.map(el => ({el,position:Math.max(0,el.getBoundingClientRect().top + scrollY - innerHeight * .46)}));
        points = [];
        starts.forEach((point,index) => {
          points.push({...point,phase:point.el.dataset.phase});
          if (point.el.dataset.phaseEnd && starts[index + 1]) {
            const span = starts[index + 1].position - point.position;
            points.push({el:point.el,phase:point.el.dataset.phaseEnd,position:point.position + span * .75});
          }
        });
        changes = [];
        points.forEach(point => {
          const scene = JourneyUI.sceneFor(point.el,point.phase);
          const previous = changes.at(-1);
          if (previous?.scene.background === scene.background) return;
          const next = {point,scene,start:0,end:0};
          if (previous) {
            const gap = point.position - previous.point.position;
            const after = Math.min(innerHeight * .18,gap * .1);
            next.end = point.position + after;
            next.start = Math.max(previous.end,point.position - Math.min(innerHeight * 1.05,gap * .42));
          }
          if (previous?.scene.background === 'sunrise') {
            // Let the dark opening copy leave the sky before night arrives.
            // Later scenes retain the established broad chapter boundaries.
            next.start = Math.max(previous.end,JourneyScenery.openingBounds().clear);
            next.end = next.start + innerHeight * .65;
          }
          changes.push(next);
        });
      }
      function chapterAt(y) {
        let current = points[0];
        for (const point of points) { if (point.position > y + 1) break; current = point; }
        return current;
      }
      function syncChapter(point) {
        const key = point.el.id + ':' + point.phase;
        if (key === lastActive) return;
        lastActive = key;
        JourneyUI.setChapter(point.el,point.phase);
      }
      function renderAt(y) {
        if (!alive || navigation) return;
        syncChapter(chapterAt(y));
        let index = 0;
        for (let i = 1; i < changes.length; i++) {
          if (y < changes[i].start) break;
          index = i;
        }
        const change = changes[index];
        const incoming = change.scene.background;
        const amount = index === 0 || y >= change.end ? 1 : ease(clamp((y - change.start) / Math.max(1,change.end - change.start)));
        if (!ready.has(incoming)) {
          if (unavailable.has(incoming)) {
            waitingBackground = '';
            finishCatchup();
            return;
          }
          waitingBackground = incoming;
          prepare(incoming);
          return;
        }
        waitingBackground = '';
        let outgoing = amount === 1 ? incoming : changes[index - 1].scene.background;
        // Nearby loading may have decoded the other half of this blend before
        // motion requested it. A cold landing needs both worlds, not the hero.
        if (JourneyScenery.isReady(outgoing)) ready.add(outgoing);
        if (!ready.has(outgoing) && !unavailable.has(outgoing)) {
          waitingBackground = outgoing;
          prepare(outgoing);
          return;
        }
        if (!ready.has(outgoing)) {
          // Fast manual travel can skip unloaded earlier scenes. Use the
          // currently visible world rather than replaying those scenes.
          const opaque = panels.filter(photo => Number(photo.style.opacity) === 1).sort((a,b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
          outgoing = opaque?.dataset.background || incoming;
        }
        paint(outgoing,incoming,amount);
        JourneyScenery.drift(y);
      }
      build();
      panels.filter(photo => JourneyScenery.isReady(photo.dataset.background)).forEach(photo => ready.add(photo.dataset.background));
      const scrollAnimation = gsap.fromTo(proxy,{y:0},{y:distance,duration:1,ease:'none',paused:true,
        onUpdate:() => {
          progress.style.setProperty('--progress',clamp(proxy.y / distance()));
          renderAt(proxy.y);
        }
      });
      trigger = ScrollTrigger.create({start:0,end:distance,animation:scrollAnimation,scrub:.55,invalidateOnRefresh:true});
      const rebuild = () => { build(); lastActive = ''; };
      ScrollTrigger.addEventListener('refreshInit',rebuild);
      renderAt(scrollY);

      // A fling or scrollbar jump should dissolve to where the visitor lands,
      // without the scenery scrub racing through all the crossed chapters.
      function catchFastScroll() {
        if (!alive || navigation || Math.abs(scrollY - proxy.y) < innerHeight * 1.8) return;
        const snapshot = sceneSnapshot('scene-catchup');
        finishCatchup();
        document.getElementById('sceneLayers').appendChild(snapshot);
        const state = catchup = {snapshot};
        trigger.update();
        trigger.getTween()?.progress(1);
        proxy.y = scrollY;
        renderAt(scrollY);
        // If decode is still pending, prepare() keeps this opaque snapshot
        // until the landing artwork is ready, then starts its dissolve.
        if (!waitingBackground && catchup === state) state.tween = animate(snapshot,{opacity:0,duration:.85,ease:'power2.inOut',onComplete:() => {
          snapshot.remove();
          if (catchup === state) catchup = null;
        }});
      }
      addEventListener('scroll',catchFastScroll,{passive:true});

      // Stable layout coordinates never include the transform being animated.
      // Proxy timelines own reveal progress; gesture tweens own separate CSS
      // properties, so a deck click or sticker swap cannot kill a reveal.
      const readingGroups = new Map();
      let focusFrame = 0;
      function layoutTop(el) {
        let top = 0;
        for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
        return top;
      }
      function layoutLeft(el) {
        let left = 0;
        for (let node = el; node; node = node.offsetParent) left += node.offsetLeft;
        return left;
      }
      function measureReveal(state) {
        const {el,photo} = state;
        const left = layoutLeft(el);
        const side = left + el.offsetWidth / 2 < innerWidth / 2 ? -1 : 1;
        // Reserve space for the original scrapbook tilt, reveal rotation and
        // stacked-photo edges. Hidden, translated cards still affect overflow.
        const reserve = Math.ceil(el.offsetHeight * .06) + 16;
        const available = Math.max(0,(side < 0 ? left : innerWidth - left - el.offsetWidth) - reserve);
        state.x = photo && context.conditions.desktop ? side * Math.min(90,available) : 0;
        state.rotation = photo ? -side * (context.conditions.desktop ? 1.6 : .8) : 0;
      }
      function applyReveal(state) {
        const focused = document.activeElement;
        const keyboardFocus = focused?.matches(':focus-visible') && (state.el === focused || state.el.contains(focused));
        const p = keyboardFocus ? 1 : state.progress;
        const visible = ease(clamp((p - .04) / .9));
        const travel = 1 - ease(clamp(p));
        state.visible = visible;
        state.el.style.setProperty('--reveal-opacity',visible * state.baseOpacity);
        state.el.style.setProperty('--reveal-x',state.x * travel + 'px');
        state.el.style.setProperty('--reveal-y',state.y * travel + 'px');
        state.el.style.setProperty('--reveal-rotation',state.rotation * travel + 'deg');
        state.el.classList.toggle('scroll-reveal-hidden',visible < .005);
        if (state.readingOwner) {
          const visibility = Math.max(...Array.from(readingGroups.get(state.readingOwner),item => item.visible || 0));
          state.readingOwner.style.setProperty('--reading-opacity',visibility);
        }
      }
      function reveal(targets,{kind = 'text',stagger = false,topFor} = {}) {
        const list = Array.from(targets).filter(Boolean);
        list.forEach((el,index) => {
          if (arrivals.has(el)) return;
          const photo = kind === 'photo';
          const state = {el,photo,progress:0,visible:0,
            baseOpacity:Number(getComputedStyle(el).opacity),
            y:context.conditions.desktop ? (photo ? 24 : kind === 'ticket' ? 64 : 44) : (photo ? 34 : 26)
          };
          measureReveal(state);
          const readingOwner = el.closest('.event-body, .section-heading, .packing-heading, .practical, .footer, .fund-copy');
          if (readingOwner && readingOwner !== el) {
            state.readingOwner = readingOwner;
            if (!readingGroups.has(readingOwner)) readingGroups.set(readingOwner,new Set());
            readingGroups.get(readingOwner).add(state);
          }
          el.classList.add('scroll-reveal');
          arrivals.set(el,state);
          applyReveal(state);
          const top = () => topFor ? topFor(el) : layoutTop(el);
          const delay = () => stagger ? innerHeight * Math.min(.055,index * .018) : 0;
          // Reading copy settles before it enters the main reading lane;
          // photographs retain the longer, reversible entrance.
          const end = () => Math.min(distance(),top() - innerHeight * (kind === 'text' ? .76 : .54) + delay());
          const start = () => Math.min(top() - innerHeight * .96 + delay(),end() - 1);
          state.tween = gsap.fromTo(state,{progress:0},{progress:1,duration:1,ease:'none',paused:true,onUpdate:() => applyReveal(state)});
          state.trigger = ScrollTrigger.create({trigger:el,start,end,animation:state.tween,scrub:.18,
            onRefresh:() => {measureReveal(state);applyReveal(state);}
          });
          // Render the correct state synchronously, including deep links and
          // components already within the reading zone at page initialization.
          state.tween.progress(state.trigger.progress);
        });
      }
      const textTargets = body => body.querySelectorAll(':scope > .event-meta, :scope > h3, :scope > h4, :scope > p, :scope > .nearby');
      document.querySelectorAll('.event').forEach(event => {
        if (event.classList.contains('event--transit')) reveal(event.querySelectorAll('.event-inner'),{kind:'ticket'});
        else {
          event.querySelectorAll('.event-body').forEach(body => reveal(textTargets(body)));
          reveal(event.querySelectorAll('.postcard, .stay-photos > figure'),{kind:'photo',stagger:true});
          reveal(event.querySelectorAll('.event-inner > .sticker'));
        }
      });
      document.querySelectorAll('.event-notebook').forEach(notebook => {
        const button = notebook.querySelector('.note-toggle');
        const sheet = notebook.querySelector('.note-sheet');
        const margin = parseFloat(getComputedStyle(sheet).marginTop) || 0;
        if (!notebook.closest('.event--transit')) reveal([button]);
        // Fold height and its reveal use independent properties. The canonical
        // top stays stable while the note is hidden or its margin unfolds.
        reveal([sheet],{topFor:() => layoutTop(button) + button.offsetHeight + margin});
      });
      document.querySelectorAll('.day-heading, .section-heading, .packing-heading').forEach(el => reveal(el.children));
      document.querySelectorAll('#crewGrid, .checklist, .destination-index, #foodGrid, .trip-facts, .practical-costs').forEach(group => {
        reveal(group.querySelectorAll('.member, li, a, .dish, :scope > div, :scope > p'),{stagger:true});
      });
      reveal(document.querySelectorAll('.practical > h2, .practical > .cost-note, #tripFacts > .cost-note'));
      reveal(document.querySelector('.footer').children);
      reveal(document.querySelector('.fund-copy').children);
      reveal(document.querySelectorAll('.fund-illustration, .fund-tally, .fund-action, .fund-arrow'),{stagger:true});
      reveal(document.querySelectorAll('.wheel-heading, .wheel-settings, .wheel-stage, .wheel-notes'),{stagger:true});
      // The opening hero is immediately readable; all later reading groups
      // enter and retreat at their own physical position, on every visit.
      const revealFocused = () => {
        if (focusFrame) cancelAnimationFrame(focusFrame);
        focusFrame = requestAnimationFrame(() => {
          focusFrame = 0;
          if (alive) arrivals.forEach(applyReveal);
        });
      };
      document.addEventListener('focusin',revealFocused);
      document.addEventListener('focusout',revealFocused);

      function resetFold(sheet) {
        gsap.killTweensOf(sheet);
        gsap.set(sheet,{clearProps:'height,paddingTop,paddingBottom,marginTop,--fold-opacity,overflow'});
      }
      api.note = (sheet,open) => {
        const wasHidden = sheet.hidden;
        const current = Object.fromEntries(['height','paddingTop','paddingBottom','marginTop'].map(key => [key,getComputedStyle(sheet)[key]]));
        current['--fold-opacity'] = sheet.style.getPropertyValue('--fold-opacity') || 1;
        resetFold(sheet);
        sheet.hidden = false;
        sheet.inert = !open;
        const natural = Object.fromEntries(['height','paddingTop','paddingBottom','marginTop'].map(key => [key,getComputedStyle(sheet)[key]]));
        gsap.set(sheet,wasHidden ? {height:0,paddingTop:0,paddingBottom:0,marginTop:0,'--fold-opacity':0} : current);
        gsap.set(sheet,{overflow:'hidden'});
        folds.add(sheet);
        animate(sheet,{...(open ? {...natural,'--fold-opacity':1} : {height:0,paddingTop:0,paddingBottom:0,marginTop:0,'--fold-opacity':0}),
          duration:.32,ease:'power2.inOut',onComplete:() => {
            sheet.hidden = !open;
            resetFold(sheet);
            folds.delete(sheet);
            refresh();
          }
        });
      };
      function resetDeck(deck) {
        const state = decks.get(deck);
        if (!state) return;
        state.cancelled = true;
        gsap.killTweensOf([deck,...state.slides,state.ghost]);
        state.ghost.remove();
        gsap.set([deck,...state.slides],{clearProps:'height,transform,opacity'});
        decks.delete(deck);
      }
      api.deck = (deck,slides,previous,index,direction) => {
        resetDeck(deck);
        const height = deck.getBoundingClientRect().height;
        const ghost = slides[previous].cloneNode(true);
        ghost.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        ghost.removeAttribute('hidden');
        ghost.className = 'deck-ghost';
        ghost.setAttribute('aria-hidden','true');
        ghost.inert = true;
        slides.forEach((slide,i) => { slide.hidden = i !== index; });
        const naturalHeight = deck.getBoundingClientRect().height;
        deck.appendChild(ghost);
        const state = {slides,ghost,cancelled:false};
        decks.set(deck,state);
        gsap.set(deck,{height});
        gsap.set(slides[index],{opacity:0,x:direction * 22,y:8});
        const image = slides[index].querySelector('img');
        image.decode().catch(() => {}).then(() => {
          if (!alive || state.cancelled) return;
          animate(ghost,{opacity:0,x:-direction * 24,y:-6,rotation:-direction * 2,duration:.3,ease:'power2.inOut'});
          animate(slides[index],{opacity:1,x:0,y:0,duration:.36,ease:'power2.out'});
          animate(deck,{height:naturalHeight,duration:.36,ease:'power2.inOut',onComplete:() => {resetDeck(deck);refresh();}});
        });
      };
      api.menu = (links,open) => {
        gsap.killTweensOf([links,...links.children]);
        if (open) {
          links.classList.remove('closing');
          gsap.set(links,{opacity:0,y:-9,scale:.97,transformOrigin:'top right'});
          gsap.set(links.children,{opacity:0,y:-5});
          animate(links,{opacity:1,y:0,scale:1,duration:.25,ease:'power2.out',clearProps:'transform,opacity,transformOrigin'});
          animate(links.children,{opacity:1,y:0,duration:.22,stagger:.035,ease:'power2.out',clearProps:'transform,opacity'});
        } else {
          links.classList.add('closing');
          animate(links,{opacity:0,y:-7,duration:.18,ease:'power2.in',onComplete:() => {
            links.classList.remove('closing');
            gsap.set([links,...links.children],{clearProps:'transform,opacity,transformOrigin'});
          }});
        }
      };
      api.label = el => {
        gsap.killTweensOf(el);
        gsap.set(el,{opacity:.4,y:3});
        animate(el,{opacity:1,y:0,duration:.28,ease:'power2.out',clearProps:'transform,opacity'});
      };
      api.packing = label => {
        if (!label) return;
        gsap.killTweensOf(label);
        gsap.set(label,{x:0});
        animate(label,{x:3,duration:.12,repeat:1,yoyo:true,ease:'power1.inOut',clearProps:'transform'});
        const stamp = document.getElementById('packingStatus');
        gsap.killTweensOf(stamp);
        gsap.set(stamp,{scale:1.025});
        animate(stamp,{scale:1,duration:.3,ease:'power2.out',clearProps:'transform'});
      };
      api.sticker = (img,src) => {
        // Decode the replacement before a small ink-like fade, retaining the
        // old artwork if a download fails or the user reverses direction.
        const old = stickers.get(img);
        if (old?.src === src) return;
        old?.tween?.kill();
        const state = {src,opacity:parseFloat(img.style.getPropertyValue('--gesture-opacity')) || 1};
        stickers.set(img,state);
        if (img.getAttribute('src') === src) {
          img.style.removeProperty('--gesture-opacity');
          return;
        }
        const paintSticker = () => {
          if (alive && stickers.get(img) === state) img.style.setProperty('--gesture-opacity',state.opacity);
        };
        const restoreSticker = () => {
          state.tween = animate(state,{opacity:1,duration:.2,onUpdate:paintSticker,onComplete:() => {
            if (stickers.get(img) === state) img.style.removeProperty('--gesture-opacity');
          }});
        };
        const incoming = new Image();
        incoming.src = src;
        incoming.decode().then(() => {
          if (!alive || stickers.get(img) !== state) return;
          state.tween = animate(state,{opacity:.45,duration:.12,onUpdate:paintSticker,onComplete:() => {
            if (stickers.get(img) !== state) return;
            img.src = src;
            restoreSticker();
          }});
        }).catch(() => {if (alive && stickers.get(img) === state) restoreSticker();});
      };

      function anchorY(target) {
        const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        // One offset only: scroll-padding and event scroll-margin otherwise add.
        return Math.max(0,Math.min(distance(),target.getBoundingClientRect().top + scrollY - offset));
      }
      function finishNavigation(focus = true) {
        const state = navigation;
        if (!state) return;
        navigation = null;
        state.tween?.kill();
        state.fade?.kill();
        state.snapshot.remove();
        paint(state.fallbackBackground,state.fallbackBackground,1);
        trigger.update();
        trigger.getTween()?.progress(1);
        proxy.y = scrollY;
        lastActive = '';
        renderAt(scrollY);
        if (focus) {
          const hadTabindex = state.target.hasAttribute('tabindex');
          if (!hadTabindex) state.target.setAttribute('tabindex','-1');
          state.target.focus({preventScroll:true});
          if (!hadTabindex) state.target.addEventListener('blur',() => state.target.removeAttribute('tabindex'),{once:true});
        }
      }
      function navigate(target,hash,historyMode = 'push') {
        const snapshot = sceneSnapshot('navigation-scene');
        document.dispatchEvent(new Event('journey:opening-exit'));
        const fallbackBackground = navigation?.fallbackBackground || panels.filter(photo => Number(photo.style.opacity) === 1).sort((a,b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0]?.dataset.background || 'sunrise';
        finishCatchup();
        finishNavigation(false);
        waitingBackground = '';
        build();
        const y = anchorY(target);
        const point = chapterAt(y);
        const scene = JourneyUI.sceneFor(point.el,point.phase);
        // Preserve the current composite while the target image loads, then
        // dissolve just once, regardless of the number of crossed chapters.
        const targetPhoto = panels.find(photo => photo.dataset.background === scene.background);
        const state = {target,y,snapshot,fallbackBackground,amount:0,started:false,arrived:false,blend:() => {
          if (!alive || navigation !== state || !ready.has(scene.background)) return;
          if (state.started) return;
          state.started = true;
          state.fade = gsap.to(state,{amount:1,duration:.75,ease:'power2.inOut',onUpdate:() => {
            targetPhoto.style.opacity = state.amount;
            JourneyUI.setSceneryTone(state.amount > .5 ? scene.background : fallbackBackground);
          },onComplete:() => { if (state.arrived) finishNavigation(); }});
        }};
        navigation = state;
        panels.forEach(photo => { photo.style.opacity = 0; photo.style.zIndex = photo === targetPhoto ? 2 : 0; });
        document.getElementById('sceneLayers').appendChild(snapshot);
        prepare(scene.background);
        state.blend();
        const start = scrollY;
        const duration = gsap.utils.clamp(.65,1.1,.65 + Math.abs(y - start) / (innerHeight * 18));
        const travel = {y:start};
        if (historyMode === 'push' && location.hash !== hash) history.pushState(null,'',hash);
        state.tween = gsap.to(travel,{y,duration,ease:'power2.inOut',onUpdate:() => {
          // Recompute only at layout refresh, not on every animation frame.
          scrollTo(0,travel.y);
          state.blend();
        },onComplete:() => {
          scrollTo(0,state.y);
          state.arrived = true;
          if (state.amount >= 1 || unavailable.has(scene.background)) finishNavigation();
        }});
      }
      function clickAnchor(event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href^="#"]');
        if (!link || link.classList.contains('skip-link')) return;
        let target;
        try { target = document.getElementById(decodeURIComponent(link.hash.slice(1))); } catch (_) { return; }
        if (!target) return;
        event.preventDefault();
        // Game activation can queue a layout refresh during click capture.
        // Finish that work before travel: a late refresh cancels navigation.
        clearTimeout(refreshTimer);
        ScrollTrigger.refresh();
        navigate(target,link.hash);
      }
      function interrupt(event) {
        if (event.type === 'keydown' && !['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ','Escape','Tab'].includes(event.key)) return;
        finishNavigation(false);
      }
      const historyChange = () => {
        let target;
        try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))) || document.getElementById('top'); } catch (_) { return; }
        // Browser history controls its own scroll restoration. Synchronize
        // scenery/entrances without starting a competing scroll animation.
        finishNavigation(false);
        requestAnimationFrame(() => { if (alive) { trigger.update(); trigger.getTween()?.progress(1); renderAt(scrollY); } });
      };
      const afterRefresh = () => {
        if (navigation) finishNavigation(false);
        proxy.y = scrollY;
        renderAt(scrollY);
      };
      document.addEventListener('click',clickAnchor);
      addEventListener('wheel',interrupt,{passive:true});
      addEventListener('touchstart',interrupt,{passive:true});
      addEventListener('pointerdown',interrupt,{passive:true});
      addEventListener('keydown',interrupt);
      addEventListener('popstate',historyChange);
      addEventListener('hashchange',historyChange);
      ScrollTrigger.addEventListener('refresh',afterRefresh);
      return () => {
        removeEventListener('scroll',catchFastScroll);
        finishNavigation(false);
        alive = false;
        finishCatchup();
        gestures.forEach(tween => tween.kill());
        folds.forEach(sheet => { sheet.hidden = sheet.inert; resetFold(sheet); });
        decks.forEach((_,deck) => resetDeck(deck));
        stickers.forEach((_,img) => img.style.removeProperty('--gesture-opacity'));
        const links = document.getElementById('navLinks');
        links.classList.remove('closing');
        gsap.set([links,...links.children],{clearProps:'transform,opacity,transformOrigin'});
        if (focusFrame) cancelAnimationFrame(focusFrame);
        arrivals.forEach(state => {
          state.el.classList.remove('scroll-reveal','scroll-reveal-hidden');
          ['--reveal-opacity','--reveal-x','--reveal-y','--reveal-rotation'].forEach(key => state.el.style.removeProperty(key));
        });
        readingGroups.forEach((_,el) => el.style.removeProperty('--reading-opacity'));
        document.removeEventListener('focusin',revealFocused);
        document.removeEventListener('focusout',revealFocused);
        document.removeEventListener('click',clickAnchor);
        removeEventListener('wheel',interrupt); removeEventListener('touchstart',interrupt);
        removeEventListener('pointerdown',interrupt); removeEventListener('keydown',interrupt);
        removeEventListener('popstate',historyChange); removeEventListener('hashchange',historyChange);
        ScrollTrigger.removeEventListener('refreshInit',rebuild);
        ScrollTrigger.removeEventListener('refresh',afterRefresh);
        ['note','deck','menu','label','packing','sticker'].forEach(key => delete api[key]);
        panels.forEach(photo => photo.style.removeProperty('z-index'));
        JourneyUI.startFallback();
      };
    });
    if (document.fonts) document.fonts.ready.then(refresh);
    JourneyUI.loadBackground('sunrise').then(refresh);
    addEventListener('pageshow',refresh);
    addEventListener('pagehide',() => clearTimeout(refreshTimer));
    api.dispose = () => { clearTimeout(refreshTimer); media.revert(); JourneyUI.startFallback(); };
  } catch (error) {
    if (media) media.revert();
    JourneyUI.startFallback();
    console.warn('Motion enhancement unavailable; content remains usable.',error);
  }
})();
