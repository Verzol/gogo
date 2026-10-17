/* Decorative book geometry only. Authorization and semantic content live in diary.js. */
(() => {
  'use strict';
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => value * value * (3 - 2 * value);
  const material = name => `./figures/decor/painted/diary/${name}.webp`;
  let materialsReady;

  function copy(element, width, height) {
    const clone = element.cloneNode(true);
    [clone, ...clone.querySelectorAll('*')].forEach(node => {
      node.removeAttribute('id'); node.removeAttribute('autofocus');
      if (node.matches('button,a,input,textarea,select,[tabindex]')) node.tabIndex = -1;
    });
    clone.inert = true; clone.setAttribute('aria-hidden', 'true');
    if (width) clone.style.width = width + 'px';
    if (height) { clone.style.height = height + 'px'; clone.style.minHeight = '0'; }
    const originalScrollers = element.querySelectorAll('.diary-writing');
    clone.querySelectorAll('.diary-writing').forEach((node, i) => { node.dataset.frozenScroll = originalScrollers[i]?.scrollTop || 0; });
    return clone;
  }
  function restoreScroll(element) {
    element.querySelectorAll('[data-frozen-scroll]').forEach(node => { node.scrollTop = Number(node.dataset.frozenScroll); });
  }
  function timeline(element, duration, paint, complete, dispose, { interactive = false, rollback = () => {} } = {}) {
    let ended = false, frame = 0;
    // A constant non-grouping property provides a seekable WAAPI clock. All
    // curved geometry is sampled from its time; no filter/opacity flattens 3D.
    const animation = element.animate([{ outlineOffset: '0px' }, { outlineOffset: '0px' }], { duration, fill: 'both' });
    if (interactive) { animation.pause(); animation.currentTime = 0; }
    function tick() {
      if (ended) return;
      const progress = clamp(Number(animation.currentTime || 0) / duration);
      element.dataset.progress = progress.toFixed(4); paint(progress);
      frame = requestAnimationFrame(tick);
    }
    function end(commit, notify = true) {
      if (ended) return; ended = true; cancelAnimationFrame(frame);
      if (commit) paint(1);
      animation.cancel(); dispose(); element.remove();
      if (commit) complete();
      else if (notify) rollback();
    }
    paint(0); frame = requestAnimationFrame(tick);
    animation.finished.then(() => end(animation.playbackRate > 0)).catch(() => {});
    return {
      finish: () => end(true), cancel: () => end(false, false),
      seek(progress) {
        if (ended) return;
        animation.pause(); animation.currentTime = clamp(progress) * duration;
        element.dataset.progress = clamp(progress).toFixed(4); paint(clamp(progress));
      },
      release(commit) {
        if (ended) return;
        if (!commit && Number(animation.currentTime) < 1) { end(false); return; }
        animation.playbackRate = commit ? 1.25 : -1.5; animation.play();
      }
    };
  }

  function turn({ book, page, incomingPage, underPage, backward, single, interactive, complete, rollback }) {
    const bookRect = book.getBoundingClientRect(), rect = page.getBoundingClientRect();
    const width = rect.width, height = rect.height, count = single ? 10 : 16;
    const leaf = document.createElement('div');
    leaf.className = 'diary-turn-leaf' + (backward ? ' is-backward' : '');
    leaf.inert = true; leaf.setAttribute('aria-hidden', 'true');
    leaf.dataset.owner = page.dataset.owner;
    leaf.dataset.destination = incomingPage.dataset.owner;
    Object.assign(leaf.style, { left: rect.left - bookRect.left + 'px', top: rect.top - bookRect.top + 'px', width: width + 'px', height: height + 'px' });
    // A physical leaf has different content on each side. Its reverse is the
    // incoming spread's landing page; the other incoming page is underneath
    // the outgoing front, revealed as soon as that front lifts away.
    const underlay = copy(underPage, width, height); underlay.classList.add('diary-turn-underlay');
    Object.assign(underlay.style, { left: leaf.style.left, top: leaf.style.top });
    const shadow = document.createElement('div'); shadow.className = 'diary-cast-shadow';
    shadow.setAttribute('aria-hidden', 'true');
    Object.assign(shadow.style, { top: leaf.style.top, height: height + 'px' });
    const strips = [], step = width / count;
    for (let i = 0; i < count; i++) {
      const strip = document.createElement('div'); strip.className = 'diary-sheet-strip';
      strip.style.width = step + .65 + 'px'; strip.style.height = height + 'px';
      strip.style.transformOrigin = backward ? 'right center' : 'left center';
      const front = document.createElement('div'), back = document.createElement('div');
      front.className = 'diary-strip-face diary-strip-front'; back.className = 'diary-strip-face diary-strip-back';
      for (const [face, source, offset] of [[front, page, backward ? width - (i + 1) * step : i * step], [back, incomingPage, backward ? i * step : width - (i + 1) * step]]) {
        const content = copy(source, width, height); content.style.position = 'absolute'; content.style.left = -offset + 'px'; content.style.top = '0';
        face.append(content);
        const shade = document.createElement('span'); shade.className = 'diary-strip-shade'; face.append(shade);
      }
      strip.append(front, back); leaf.append(strip); strips.push(strip);
    }
    book.append(underlay, shadow, leaf); restoreScroll(leaf); restoreScroll(underlay);
    book.dataset.turning = 'true';
    return timeline(leaf, single ? 780 : 1080, progress => {
      const t = ease(progress), curl = Math.sin(Math.PI * t) * .63;
      let x = backward ? width : 0, z = 0;
      const direction = backward ? 1 : -1;
      strips.forEach((strip, i) => {
        const u = (i + .5) / count;
        const angle = direction * (Math.PI * t + curl * Math.sin((u - .25) * 1.8));
        strip.style.transform = `translate3d(${backward ? x - step : x}px,${-Math.sin(Math.PI * t) * Math.sin(Math.PI * u) * 6}px,${z}px) rotateY(${angle}rad)`;
        const shade = Math.min(.19, Math.abs(Math.sin(angle)) * .15 + Math.abs(Math.cos(u * 3) * curl) * .04);
        strip.querySelectorAll('.diary-strip-shade').forEach(node => { node.style.opacity = shade; });
        x += (backward ? -1 : 1) * step * Math.cos(angle);
        z += step * Math.sin(Math.abs(angle));
      });
      const strength = Math.sin(Math.PI * t);
      shadow.style.opacity = strength * .3;
      shadow.style.width = width * (.12 + strength * .6) + 'px';
      shadow.style.left = backward ? rect.right - bookRect.left + 'px' : rect.left - bookRect.left - width * (.12 + strength * .6) + 'px';
    }, complete, () => { underlay.remove(); shadow.remove(); delete book.dataset.turning; }, { interactive, rollback });
  }

  function measureClosed(stage, closed, cover) {
    const wasHidden = closed.hidden;
    stage.classList.add('diary-measuring'); closed.hidden = false;
    const rect = cover.getBoundingClientRect(), width = cover.offsetWidth, height = cover.offsetHeight, blockHeight = closed.offsetHeight;
    const note = closed.querySelector('.diary-margin-note'), noteRect = note?.getBoundingClientRect();
    const noteClone = note ? copy(note, noteRect.width, noteRect.height) : null;
    closed.hidden = wasHidden; stage.classList.remove('diary-measuring');
    return { rect, width, height, blockHeight, noteRect, noteClone };
  }

  function coverMotion({ stage, closed, reader, cover, book, opening, single, complete }) {
    // Reserve the visible surface before temporarily measuring hidden states.
    // Otherwise scroll anchoring can move the viewport when the closed book
    // leaves normal flow, invalidating the measured cover origin.
    stage.style.minHeight = stage.offsetHeight + 'px';
    const source = measureClosed(stage, closed, cover);
    const stageRect = stage.getBoundingClientRect();
    const wasHidden = reader.hidden;
    closed.hidden = true;
    delete stage.dataset.preparing;
    reader.hidden = false;
    const pages = book.querySelector('.diary-pages'), paper = pages.getBoundingClientRect();
    const pageWidth = single ? paper.width : paper.width / 2;
    const width = pageWidth * 2, height = paper.height;
    const left = single ? paper.left - pageWidth : paper.left;
    const centerX = left + width * .75, centerY = paper.top + height / 2;
    const dx = source.rect.left + source.rect.width / 2 - centerX;
    const dy = source.rect.top + source.rect.height / 2 - centerY;
    const sx = source.width / pageWidth, sy = source.height / height;
    const angle = parseFloat(getComputedStyle(closed.querySelector('.diary-cover-rest')).getPropertyValue('--cover-angle')) || -4;
    stage.style.minHeight = Math.max(source.blockHeight, reader.scrollHeight) + 'px';
    stage.dataset.motion = opening ? 'opening' : 'closing';
    reader.inert = true; closed.hidden = true;
    const flight = document.createElement('div'); flight.className = 'diary-cover-flight';
    flight.inert = true; flight.setAttribute('aria-hidden', 'true');
    Object.assign(flight.style, { left: left - stageRect.left + 'px', top: paper.top - stageRect.top + 'px', width: width + 'px', height: height + 'px' });
    const base = document.createElement('div'); base.className = 'diary-flight-base';
    const rightPaper = document.createElement('div'); rightPaper.className = 'diary-flight-reading';
    const writing = document.createElement('div'); writing.className = 'diary-flight-writing';
    if (single) {
      const active = [...pages.children].find(el => getComputedStyle(el).display !== 'none');
      rightPaper.append(copy(active, pageWidth, height));
    } else {
      writing.append(copy(pages.children[0], pageWidth, height));
      rightPaper.append(copy(pages.children[1], pageWidth, height));
    }
    base.append(rightPaper);
    const hinge = document.createElement('div'); hinge.className = 'diary-cover-hinge';
    const front = copy(cover, pageWidth, height); front.classList.add('diary-cover-front'); front.removeAttribute('aria-haspopup');
    // The cover is a frozen material too: preserve its original type size at
    // the initial scale rather than relaying out the title during opening.
    const originals = [cover, ...cover.querySelectorAll('*')];
    [front, ...front.querySelectorAll('*')].forEach((node, i) => {
      if (originals[i]) node.style.fontSize = parseFloat(getComputedStyle(originals[i]).fontSize) / sx + 'px';
    });
    const inside = document.createElement('div'); inside.className = 'diary-cover-inside';
    // The left leaf belongs to the hinged cover, not an expanding flat base.
    // Keeping it on that reverse face prevents paper escaping left of the
    // spine before the cover has crossed it. Its text stays upright as well.
    if (!single) inside.append(writing);
    hinge.append(front, inside); flight.append(base, hinge); stage.append(flight); restoreScroll(flight);
    const note = source.noteClone;
    if (note) {
      note.classList.add('diary-motion-note');
      Object.assign(note.style, { left: source.noteRect.left - stageRect.left + 'px', top: source.noteRect.top - stageRect.top + 'px' });
      stage.append(note);
    }
    return timeline(flight, opening ? single ? 1050 : 1360 : single ? 900 : 1180, progress => {
      const p = opening ? progress : 1 - progress, travel = ease(p);
      if (note) note.style.opacity = 1 - ease(clamp(p * 3));
      flight.style.transform = `translate3d(${dx * (1 - travel)}px,${dy * (1 - travel) - Math.sin(Math.PI * p) * 10}px,0) rotateZ(${angle * (1 - travel)}deg) scale(${sx + (1 - sx) * travel},${sy + (1 - sy) * travel})`;
      hinge.style.transform = `rotateY(${-180 * ease(p)}deg)`;
      // WebKit can composite a nested reverse face even with backface culling.
      // Cull each already-built face explicitly at the edge-on hinge angle;
      // no face changes its artwork or content during the rotation.
      front.style.visibility = p < .5 ? 'visible' : 'hidden';
      inside.style.visibility = p < .5 ? 'hidden' : 'visible';
      rightPaper.style.opacity = clamp((p - .05) / .65);
      writing.style.opacity = ease(clamp((p - .7) / .3));
      flight.style.setProperty('--cover-shadow', Math.sin(Math.PI * p) * .25);
    }, complete, () => {
      note?.remove();
      reader.hidden = wasHidden; reader.inert = false;
      delete stage.dataset.motion; stage.style.minHeight = '';
    });
  }

  async function ready(container) {
    // Bound preparation. Failed artwork or images keep their normal fallback;
    // a turn never mutates its frozen snapshot when a late image arrives.
    if (!materialsReady) {
      const names = ['front_cover', 'back_cover', 'inside_left', 'inside_right', 'binding', 'page_edges', 'tape_ochre', 'tape_linen', 'corners_tan', 'corners_cream', 'fern', 'clouds', 'flowers', 'frame_landscape', 'frame_portrait', 'frame_square',
        ...['mi', 'san', 'thao', 'quanlele', 'gtm', 'truong', 'linh'].map(id => 'bookmark_' + id),
        ...[1, 2, 3].flatMap(i => ['paper_left_' + i, 'paper_right_' + i])];
      materialsReady = Promise.allSettled(names.map(name => { const img = new Image(); img.src = material(name); return img.decode(); }));
    }
    await Promise.race([
      Promise.allSettled([materialsReady, document.fonts?.ready, ...[...container.querySelectorAll('img:not([hidden])')].map(img => img.decode?.())]),
      new Promise(resolve => setTimeout(resolve, 1600))
    ]);
  }
  window.TaxuaDiaryMotion = Object.freeze({ turn, cover: coverMotion, ready });
})();
