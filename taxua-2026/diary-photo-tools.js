/* Photo order and non-destructive framing. Shared by preview and reader. */
(() => {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function cropValue(value) {
    return { x: Number.isFinite(value?.x) ? clamp(value.x, 0, 1) : .5,
      y: Number.isFinite(value?.y) ? clamp(value.y, 0, 1) : .5,
      zoom: Number.isFinite(value?.zoom) ? clamp(value.zoom, 1, 3) : 1 };
  }
  function attributes(value) {
    const c = cropValue(value);
    return `data-crop-x="${c.x}" data-crop-y="${c.y}" data-crop-zoom="${c.zoom}"`;
  }
  function geometry(img, crop) {
    const box = img.parentElement, w = box.clientWidth, h = box.clientHeight;
    if (!w || !h || !img.naturalWidth || !img.naturalHeight) return null;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * crop.zoom;
    const width = img.naturalWidth * scale, height = img.naturalHeight * scale;
    const x = clamp(crop.x, w / (2 * width), 1 - w / (2 * width));
    const y = clamp(crop.y, h / (2 * height), 1 - h / (2 * height));
    return { w, h, width, height, x, y };
  }
  function paint(img, value) {
    const c = cropValue(value || { x: +img.dataset.cropX, y: +img.dataset.cropY, zoom: +img.dataset.cropZoom });
    const g = geometry(img, c); if (!g) return;
    // Percentages survive cloning onto the book's animated faces.
    Object.assign(img.style, { width: `${100 * g.width / g.w}%`, height: `${100 * g.height / g.h}%`,
      transform: `translate(${100 * (g.w / 2 / g.width - g.x)}%, ${100 * (g.h / 2 / g.height - g.y)}%)` });
    Object.assign(img.dataset, { cropX: c.x, cropY: c.y, cropZoom: c.zoom });
  }
  const observed = new WeakSet(), targets = new Set();
  const observer = window.ResizeObserver ? new ResizeObserver(entries => {
    for (const target of targets) if (!target.isConnected) { observer.unobserve(target); targets.delete(target); }
    entries.forEach(({ target }) => target.querySelectorAll('img[data-crop-x]').forEach(img => paint(img)));
  }) : null;
  function observe(img) {
    if (!img.hasAttribute('data-crop-x')) return;
    paint(img);
    if (observed.has(img)) return;
    observed.add(img); const target = img.parentElement;
    targets.add(target); observer?.observe(target);
  }
  function icon(name) {
    const id = { grip: 'menu', crop: 'camera', swap: 'arrow-right', left: 'arrow-left', right: 'arrow-right', reset: 'refresh-cw' }[name] || name;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#trip-${id}"></use></svg>`;
  }
  function editor(options) {
    const $ = id => document.getElementById(id), preview = $('diaryPhotoPreview'), tools = $('diaryCropTools');
    let selected = null, swapping = false, working = null, gesture = null, suppressClick = false;
    const photos = () => options.getDraft()?.photos || [];
    const selectedPhoto = () => photos().find(p => p.id === selected);
    const announce = text => { $('diaryPhotoHint').textContent = text; };
    const frame = id => [...preview.querySelectorAll('[data-frame-photo]')].find(el => el.dataset.framePhoto === id);
    const focusSelected = () => frame(selected)?.querySelector('[data-select-photo]').focus({ preventScroll: true });
    function tab(name) {
      if (name === 'writing') finishCrop(true);
      $('diaryEditor').dataset.activeTab = name;
      $('diaryWritingEditor').hidden = name !== 'writing'; $('diaryPhotoEditor').hidden = name !== 'photos';
      document.querySelectorAll('[data-editor-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.editorTab === name)));
      requestAnimationFrame(() => { scalePreview(); preview.querySelectorAll('img[data-crop-x]').forEach(observe); });
    }
    function render() {
      resetGesture(); swapping = false; working = null; tools.hidden = true; tools.replaceChildren();
      if (!photos().some(p => p.id === selected)) selected = photos()[0]?.id || null;
      const photoPage = document.querySelector('#diaryPages .diary-page-photos');
      const source = photoPage?.clientWidth ? photoPage : [...document.querySelectorAll('#diaryPages .diary-page')].find(p => p.clientWidth > 0);
      preview.innerHTML = '<section class="diary-page diary-page-photos"><header class="diary-page-head"><span>Những tấm ảnh mang về</span><span>Bản nháp</span></header><div class="diary-photo-grid"></div><footer class="diary-page-tail"><span></span><span aria-hidden="true">02</span></footer></section>';
      const page = preview.firstElementChild;
      // Mirror the actual reader dimensions, capped to the editor's available width.
      const width = source?.clientWidth || 460, height = source?.clientHeight || 690;
      preview.style.setProperty('--preview-ratio', `${width} / ${height}`);
      preview.style.setProperty('--preview-aspect', width / height);
      page.style.width = width + 'px'; page.style.height = height + 'px';
      if (photoPage) {
        const style = getComputedStyle(photoPage);
        page.style.padding = style.padding; page.style.fontSize = style.fontSize; page.style.fontFamily = style.fontFamily;
        page.style.lineHeight = parseFloat(style.lineHeight) / parseFloat(style.fontSize);
        page.querySelector('header').style.minHeight = (photoPage.querySelector('header').offsetHeight || 45) + 'px';
      }
      scalePreview();
      page.style.setProperty('--diary-page-art', "url('./figures/decor/painted/diary/soft_paper_right.webp')");
      const grid = page.querySelector('.diary-photo-grid'); grid.dataset.photoCount = photos().length;
      if (photos().length) grid.innerHTML = photos().map((p, i) => options.photoMarkup(p, i, options.owner(), photos().length, true)).join('');
      else grid.innerHTML = document.querySelector('#diaryPages .diary-photo-grid[data-photo-count="0"]')?.innerHTML || '';
      page.querySelector('footer span').textContent = photos().length ? `${photos().length} tấm ảnh` : '';
      updateSelection();
      options.hydrate(preview).then(() => {
        const button = tools.querySelector('[data-arrange="crop"]'), img = frame(selected)?.querySelector('img');
        if (button) button.disabled = options.locked() || !img || img.hidden || !img.naturalWidth;
      });
    }
    function scalePreview() {
      const page = preview.firstElementChild;
      if (page) {
        const scale = preview.clientWidth / parseFloat(page.style.width);
        page.style.transform = `scale(${scale})`; preview.style.setProperty('--preview-scale', scale || 1);
      }
    }
    const previewObserver = window.ResizeObserver ? new ResizeObserver(scalePreview) : null;
    previewObserver?.observe(preview);
    function updateSelection() {
      $('diaryFiles').disabled = Boolean(working) || options.locked();
      document.querySelectorAll('[data-photo-row] .diary-photo-actions').forEach(el => { el.hidden = Boolean(working); });
      preview.dataset.cropping = String(Boolean(working)); preview.dataset.swapping = String(swapping);
      preview.querySelectorAll('[data-frame-photo]').forEach(el => {
        const active = el.dataset.framePhoto === selected;
        el.dataset.selected = String(active);
        el.querySelector('[data-select-photo]').setAttribute('aria-pressed', String(active));
        el.querySelector('[data-grip-photo]').disabled = Boolean(working) || options.locked();
      });
      document.querySelectorAll('[data-photo-row]').forEach(el => { el.hidden = el.dataset.photoRow !== selected; });
      if (!working) {
        const i = photos().findIndex(p => p.id === selected);
        tools.hidden = i < 0;
        tools.innerHTML = i < 0 ? '' : `<h4>Ảnh ở vị trí ${i + 1}</h4><div class="diary-arrange-actions"><button type="button" class="diary-secondary" data-arrange="swap" aria-pressed="${swapping}"${photos().length < 2 ? ' disabled' : ''}>${icon('swap')} ${swapping ? 'Hủy đổi chỗ' : 'Đổi vị trí'}</button><button type="button" class="diary-secondary" data-arrange="crop"${!frame(selected)?.querySelector('img')?.naturalWidth || frame(selected)?.querySelector('img')?.hidden ? ' disabled' : ''}>${icon('crop')} Chỉnh khung</button></div>`;
        announce(swapping ? 'Chọn khung muốn đổi chỗ. Nhấn Escape để hủy.' : i < 0 ? '' : 'Chọn ảnh hoặc kéo tay cầm để đổi vị trí.');
      }
    }
    function swap(target) {
      if (options.locked() || working) return;
      const a = photos().findIndex(p => p.id === selected), b = photos().findIndex(p => p.id === target);
      if (a < 0 || b < 0 || a === b) { swapping = false; updateSelection(); return; }
      [photos()[a], photos()[b]] = [photos()[b], photos()[a]];
      options.changed(); options.renderFields(); focusSelected(); announce(`Đã chuyển ảnh đến vị trí ${b + 1}.`);
    }
    function updateCaption(photo) {
      const el = frame(photo.id); if (el) el.querySelector('figcaption').textContent = photo.caption || '\u00a0';
    }
    function renderCrop() {
      const el = frame(selected), img = el?.querySelector('img'); if (!img || img.hidden || !img.naturalWidth) { announce('Đợi ảnh mở xong rồi chỉnh khung nhé.'); return; }
      swapping = false; working = cropValue(selectedPhoto().crop); updateSelection();
      // Copy the selected material, keeping its aperture aspect ratio in the larger view.
      const clone = el.cloneNode(true); clone.removeAttribute('data-frame-photo'); clone.removeAttribute('data-selected');
      clone.querySelector('[data-grip-photo]').remove(); clone.querySelector('figcaption').textContent = '';
      const imageBox = clone.querySelector('button'); imageBox.removeAttribute('data-select-photo'); imageBox.removeAttribute('aria-pressed');
      imageBox.dataset.cropPan = ''; imageBox.setAttribute('aria-label', 'Di chuyển ảnh trong khung bằng phím mũi tên hoặc kéo ảnh');
      const liveBox = img.parentElement;
      tools.hidden = false;
      tools.innerHTML = `<h4>Chỉnh khung ảnh</h4><div class="diary-crop-enlarged"></div><label class="diary-field diary-zoom"><span>Thu phóng <output id="diaryZoomValue">${working.zoom.toFixed(2)}×</output></span><input id="diaryCropZoom" type="range" min="1" max="3" step="0.01" value="${working.zoom}" aria-label="Thu phóng ảnh"></label><div class="diary-pan-controls" aria-label="Di chuyển ảnh"><button type="button" data-pan="left" aria-label="Dịch ảnh sang trái">${icon('left')}</button><button type="button" data-pan="right" aria-label="Dịch ảnh sang phải">${icon('right')}</button><button type="button" data-pan="up" aria-label="Dịch ảnh lên">${icon('left')}</button><button type="button" data-pan="down" aria-label="Dịch ảnh xuống">${icon('right')}</button></div><div class="diary-crop-actions"><button type="button" class="diary-secondary" data-crop-action="reset">Đặt lại</button><button type="button" class="diary-secondary" data-crop-action="cancel">Hủy</button><button type="button" class="diary-primary" data-crop-action="done">Xong</button></div>`;
      const apertureRatio = liveBox.clientWidth / liveBox.clientHeight;
      const large = tools.querySelector('.diary-crop-enlarged');
      const ratio = apertureRatio * parseFloat(getComputedStyle(el).getPropertyValue('--photo-height')) / parseFloat(getComputedStyle(el).getPropertyValue('--photo-width'));
      large.style.aspectRatio = ratio; large.style.maxWidth = (320 * ratio) + 'px';
      large.append(clone); observe(clone.querySelector('img')); paintWorking();
      announce('Kéo ảnh trong khung để chọn vùng muốn giữ.'); imageBox.focus({ preventScroll: true });
    }
    function paintWorking() {
      if (!working) return;
      const imgs = [frame(selected)?.querySelector('img'), tools.querySelector('img')].filter(Boolean);
      imgs.forEach(img => paint(img, working));
      const zoom = $('diaryCropZoom'); if (zoom) zoom.value = working.zoom;
      if ($('diaryZoomValue')) $('diaryZoomValue').textContent = working.zoom.toFixed(2) + '×';
    }
    function finishCrop(accept) {
      if (!working) return false;
      resetGesture();
      const next = { ...working }, p = selectedPhoto(); working = null;
      if (accept && p && JSON.stringify(cropValue(p.crop)) !== JSON.stringify(next)) { p.crop = next; options.changed(); }
      options.renderFields(); focusSelected(); return true;
    }
    function pan(dx, dy, basis) {
      const img = basis || tools.querySelector('img'); if (!working || !img) return;
      const g = geometry(img, working); if (!g) return;
      const ratio = img.parentElement.getBoundingClientRect().width / g.w;
      working.x = clamp(g.x - dx / ratio / g.width, g.w / (2 * g.width), 1 - g.w / (2 * g.width));
      working.y = clamp(g.y - dy / ratio / g.height, g.h / (2 * g.height), 1 - g.h / (2 * g.height));
      paintWorking();
    }
    function resetGesture() {
      const old = gesture; gesture = null;
      if (old?.handle.hasPointerCapture?.(old.id)) old.handle.releasePointerCapture(old.id);
      preview.querySelectorAll('[data-drag-source],[data-drop-target]').forEach(el => { delete el.dataset.dragSource; delete el.dataset.dropTarget; });
    }
    function cancelAction() {
      if (gesture) { if (gesture.kind === 'pan') { working = gesture.before; paintWorking(); } resetGesture(); return true; }
      if (working) return finishCrop(false);
      if (swapping) { swapping = false; updateSelection(); return true; }
      return false;
    }
    function clear() {
      resetGesture(); selected = null; working = null; swapping = false;
      preview.replaceChildren(); tools.replaceChildren(); tools.hidden = true; $('diaryPhotoHint').textContent = ''; $('diaryFiles').disabled = options.locked();
      // Drop detached private DOM references retained by ResizeObserver.
      for (const target of targets) if (!target.isConnected) { observer?.unobserve(target); targets.delete(target); }
    }
    document.querySelectorAll('[data-editor-tab]').forEach(b => b.addEventListener('click', () => tab(b.dataset.editorTab)));
    $('diaryPhotoEditor').addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button || options.locked() || suppressClick) return;
      if (button.dataset.selectPhoto) {
        if (working) return;
        if (swapping) swap(button.dataset.selectPhoto);
        else { selected = button.dataset.selectPhoto; updateSelection(); }
      } else if (button.dataset.arrange === 'swap') { swapping = !swapping; updateSelection(); }
      else if (button.dataset.arrange === 'crop') renderCrop();
      else if (button.dataset.cropAction === 'reset') { working = cropValue(); paintWorking(); }
      else if (button.dataset.cropAction) finishCrop(button.dataset.cropAction === 'done');
      else if (button.dataset.pan) {
        const [x, y] = { left: [-12, 0], right: [12, 0], up: [0, -12], down: [0, 12] }[button.dataset.pan]; pan(x, y);
      }
    });
    tools.addEventListener('input', event => { if (event.target.id === 'diaryCropZoom' && working) { working.zoom = +event.target.value; paintWorking(); } });
    $('diaryPhotoEditor').addEventListener('keydown', event => {
      if (event.key === 'Escape' && cancelAction()) { event.preventDefault(); event.stopPropagation(); }
      if (!working || !event.target.closest('[data-crop-pan],[data-select-photo]')) return;
      const delta = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[event.key];
      if (delta) { event.preventDefault(); pan(...delta); }
    });
    $('diaryPhotoEditor').addEventListener('pointerdown', event => {
      if (event.button !== 0 || options.locked() || gesture) return;
      const grip = event.target.closest('[data-grip-photo]');
      const imageBox = working && event.target.closest('[data-crop-pan],[data-select-photo]');
      if (!grip && !imageBox) return;
      if (grip && working) return;
      event.preventDefault();
      if (grip) { selected = grip.dataset.gripPhoto; updateSelection(); }
      const handle = grip || imageBox;
      gesture = { id: event.pointerId, handle, kind: grip ? 'swap' : 'pan', x: event.clientX, y: event.clientY, moved: false, before: working ? { ...working } : null };
      handle.setPointerCapture(event.pointerId);
    });
    $('diaryPhotoEditor').addEventListener('pointermove', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      gesture.moved ||= Math.abs(dx) + Math.abs(dy) > 5;
      if (gesture.kind === 'pan') pan(dx, dy, gesture.handle.querySelector('img'));
      else if (gesture.moved) {
        frame(selected).dataset.dragSource = 'true';
        preview.querySelectorAll('[data-drop-target]').forEach(el => delete el.dataset.dropTarget);
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-frame-photo]');
        if (target && preview.contains(target) && target.dataset.framePhoto !== selected) target.dataset.dropTarget = 'true';
      }
      gesture.x = event.clientX; gesture.y = event.clientY;
    });
    function release(event, cancel = false) {
      if (!gesture || gesture.id !== event.pointerId) return;
      const g = gesture, destination = preview.querySelector('[data-drop-target]')?.dataset.framePhoto;
      if (cancel && g.kind === 'pan') { working = g.before; paintWorking(); }
      resetGesture();
      suppressClick = g.moved; setTimeout(() => { suppressClick = false; }, 0);
      if (!cancel && g.kind === 'swap' && g.moved && destination) swap(destination);
    }
    $('diaryPhotoEditor').addEventListener('pointerup', event => release(event));
    $('diaryPhotoEditor').addEventListener('pointercancel', event => release(event, true));
    $('diaryPhotoEditor').addEventListener('lostpointercapture', event => release(event, true));
    window.addEventListener('resize', () => {
      const wasCropping = Boolean(working);
      if (wasCropping) finishCrop(false); else resetGesture();
      if (options.getDraft()) render();
      if (wasCropping) announce('Kích thước trang đã đổi. Chọn Chỉnh khung để tiếp tục.');
    });
    return { render, tab, clear, finishCrop, cancelAction, updateCaption, cropping: () => Boolean(working) };
  }
  window.TaxuaDiaryPhotos = { attributes, observe, icon, editor };
})();
