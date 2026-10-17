/* Optional page-edge scrollbar. The document remains the native scroller. */
(() => {
  'use strict';
  const root = document.documentElement;
  const main = document.querySelector('main');
  if (!main || !window.ResizeObserver || !window.PointerEvent ||
      getComputedStyle(root).getPropertyValue('--cloud-scrollbar-ready').trim() !== '1') return;

  const desktop = matchMedia('(min-width:1100px) and (min-height:521px) and (pointer:fine) and (hover:hover)');
  const colors = matchMedia('(forced-colors:active)');
  const print = matchMedia('print');
  let teardown = null;
  let failed = false;

  function mount() {
    const rail = document.createElement('div');
    rail.className = 'cloud-scrollbar';
    const cloudImages = ['day','night','predawn','dawn','morning','noon','afternoon','evening'].map(phase =>
      `<img class="cloud-scrollbar-${phase}" src="./figures/decor/painted/scrollbar_cloud_${phase}.webp?v=scenic-clouds" alt="" draggable="false" width="42" height="34">`).join('');
    rail.innerHTML = '<span class="cloud-scrollbar-fill" aria-hidden="true"></span>' +
      '<div class="cloud-scrollbar-thumb" role="scrollbar" tabindex="0" aria-label="Vị trí trong nhật ký" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' + cloudImages +
      '<span class="cloud-scrollbar-hint" aria-hidden="true">Kéo để lướt nhật ký</span></div>';
    const thumb = rail.querySelector('[role="scrollbar"]');
    const originalId = main.id;
    if (!main.id) main.id = 'journalContent';
    thumb.setAttribute('aria-controls',main.id);
    let frame = 0;
    let disposed = false;
    let drag = null;
    let thumbFocused = false;
    let bounds = {top:0,height:0,thumb:60,travel:0,max:0};

    function endDrag() {
      const pointer = drag?.id;
      drag = null;
      root.classList.remove('cloud-scrollbar-dragging');
      delete rail.dataset.dragging;
      if (pointer != null && thumb.hasPointerCapture(pointer)) thumb.releasePointerCapture(pointer);
    }
    function restoreFocus(force = false) {
      if (!force && document.activeElement !== thumb) return;
      const previous = main.getAttribute('tabindex');
      main.setAttribute('tabindex','-1');
      main.focus({preventScroll:true});
      // Removing tabindex immediately also removes focus in Chromium.
      main.addEventListener('blur',() => {
        if (previous == null) main.removeAttribute('tabindex');
        else main.setAttribute('tabindex',previous);
      },{once:true});
    }
    function dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      endDrag();
      restoreFocus(thumbFocused);
      observer.disconnect();
      modalObserver.disconnect();
      removeEventListener('scroll',schedule);
      removeEventListener('resize',schedule);
      removeEventListener('blur',endDrag);
      document.removeEventListener('visibilitychange',visibility);
      document.removeEventListener('load',schedule,true);
      document.removeEventListener('toggle',schedule,true);
      window.visualViewport?.removeEventListener('resize',schedule);
      root.classList.remove('cloud-scrollbar-active');
      rail.remove();
      if (!originalId) main.removeAttribute('id');
    }
    function render() {
      frame = 0;
      if (disposed) return;
      try {
        const locked = root.classList.contains('atlas-open') || !!document.querySelector('dialog[open]');
        const max = Math.max(0,root.scrollHeight - root.clientHeight);
        const active = max > 0 && !locked;
        if (!active) { endDrag();restoreFocus(); }
        rail.hidden = !active;
        root.classList.toggle('cloud-scrollbar-active',active);
        if (!active) return;
        const rect = rail.getBoundingClientRect();
        const height = Math.min(rect.height,Math.max(60,rect.height * root.clientHeight / root.scrollHeight));
        bounds = {top:rect.top,height:rect.height,thumb:height,travel:Math.max(0,rect.height-height),max};
        const progress = Math.max(0,Math.min(1,scrollY / max));
        const y = progress * bounds.travel;
        rail.style.setProperty('--thumb-height',height + 'px');
        rail.style.setProperty('--thumb-y',y + 'px');
        rail.style.setProperty('--thread-progress',String((y + height / 2) / rect.height));
        thumb.setAttribute('aria-valuenow',String(Math.round(progress * 100)));
      } catch (_) {
        failed = true;
        dispose();
        teardown = null;
      }
    }
    function schedule() { if (!disposed && !frame) frame = requestAnimationFrame(render); }
    function moveTo(y) { window.scrollTo({top:Math.max(0,Math.min(bounds.max,y)),behavior:'instant'});schedule(); }
    function pageStep() { return Math.max(40,root.clientHeight - (parseFloat(getComputedStyle(root).scrollPaddingTop) || 0)); }
    function pointerDown(event) {
      if (event.button !== 0 || event.pointerType === 'touch' || rail.hidden || drag) return;
      // Let the original pointerdown bubble to motion.js before moving the
      // document: it cancels a competing enhanced anchor journey there.
      const onThumb = thumb.contains(event.target);
      if (onThumb) {
        event.preventDefault();
        thumb.focus({preventScroll:true});
        const rect = thumb.getBoundingClientRect();
        drag = {id:event.pointerId,offset:event.clientY - rect.top};
        thumb.setPointerCapture(event.pointerId);
        root.classList.add('cloud-scrollbar-dragging');
        rail.dataset.dragging = 'true';
      } else {
        event.preventDefault();
        thumb.focus({preventScroll:true});
        const direction = event.clientY < thumb.getBoundingClientRect().top ? -1 : 1;
        requestAnimationFrame(() => { if (!disposed && !rail.hidden) moveTo(scrollY + direction * pageStep()); });
      }
    }
    function pointerMove(event) {
      if (!drag || drag.id !== event.pointerId || !bounds.travel) return;
      moveTo((event.clientY - bounds.top - drag.offset) / bounds.travel * bounds.max);
    }
    function keyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || rail.hidden) return;
      const positions = {ArrowDown:scrollY+40,ArrowUp:scrollY-40,PageDown:scrollY+pageStep(),PageUp:scrollY-pageStep(),Home:0,End:bounds.max};
      if (!(event.key in positions)) return;
      event.preventDefault();
      // The same event reaches motion.js's existing navigation interrupter.
      requestAnimationFrame(() => { if (!disposed && !rail.hidden) moveTo(positions[event.key]); });
    }
    function visibility() { if (document.hidden) endDrag(); }
    const observer = new ResizeObserver(schedule);
    const modalObserver = new MutationObserver(schedule);
    try {
      rail.addEventListener('pointerdown',pointerDown);
      thumb.addEventListener('pointermove',pointerMove);
      thumb.addEventListener('pointerup',endDrag);
      thumb.addEventListener('pointercancel',endDrag);
      thumb.addEventListener('lostpointercapture',endDrag);
      thumb.addEventListener('keydown',keyDown);
      thumb.addEventListener('focus',() => { thumbFocused = true; });
      thumb.addEventListener('blur',event => {
        // A media-query display change may blur before its change listener
        // runs. Keep keyboard reading order when the control disappears.
        if (event.relatedTarget) { thumbFocused = false;return; }
        requestAnimationFrame(() => {
          if (!disposed && desktop.matches && !colors.matches && !print.matches) thumbFocused = false;
        });
      });
      rail.querySelectorAll('img').forEach(img => img.addEventListener('error',() => { img.hidden = true; }));
      document.body.appendChild(rail);
      addEventListener('scroll',schedule,{passive:true});
      addEventListener('resize',schedule,{passive:true});
      addEventListener('blur',endDrag);
      document.addEventListener('visibilitychange',visibility);
      document.addEventListener('load',schedule,true);
      document.addEventListener('toggle',schedule,true);
      window.visualViewport?.addEventListener('resize',schedule,{passive:true});
      observer.observe(document.body);
      observer.observe(main);
      observer.observe(rail);
      modalObserver.observe(root,{attributes:true,attributeFilter:['class']});
      document.querySelectorAll('dialog').forEach(dialog => modalObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
      document.fonts?.ready.then(schedule);
      render();
      return disposed ? null : dispose;
    } catch (_) { failed = true;dispose();return null; }
  }
  function update() {
    const eligible = desktop.matches && !colors.matches && !print.matches;
    if (!eligible && teardown) { teardown();teardown = null; }
    else if (eligible && !teardown && !failed) teardown = mount();
  }
  desktop.addEventListener('change',update);
  colors.addEventListener('change',update);
  print.addEventListener('change',update);
  update();
})();
