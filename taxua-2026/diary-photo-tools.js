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
    const id = { crop: 'camera', swap: 'arrow-right', left: 'arrow-left', right: 'arrow-right', reset: 'refresh-cw' }[name] || name;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#trip-${id}"></use></svg>`;
  }
  // Six columns and at most eight rows. Sizes snap to safe rectangles;
  // an impossible imported composition falls back to the balanced defaults.
  function layout(photos, defaults = false) {
    const count = photos.length;
    if (!count) return { rows: 0, boxes: [], fallback: false };
    const automatic = i => count === 1 ? [6, 4] : count === 2 ? [6, 2] : count === 3 && i === 0 ? [6, 2] : count <= 6 ? [3, 2] : [2, 2];
    const boxes = [], shapes = photos.map((photo, i) => (!defaults && { small: [2, 2], medium: [3, 2], large: [4, 4] }[photo.size]) || automatic(i));
    // Every height is two rows. Search a tiny 6x4 occupancy mask so moving a
    // large photo later cannot silently flatten a composition that still fits.
    const failed = new Set();
    function pack(i, occupied) {
      if (i === count) return true;
      const key = i + ':' + occupied; if (failed.has(key)) return false;
      const [w, h] = shapes[i];
      for (let y = 0; y <= 4 - h / 2; y++) for (let x = 0; x <= 6 - w; x++) {
        let mask = 0;
        for (let r = y; r < y + h / 2; r++) mask |= ((1 << w) - 1) << (r * 6 + x);
        if (occupied & mask) continue;
        boxes[i] = { x, y: y * 2, w, h };
        if (pack(i + 1, occupied | mask)) return true;
      }
      failed.add(key); return false;
    }
    if (shapes.reduce((area, [w, h]) => area + w * h, 0) > 48 || !pack(0, 0)) return defaults ? null : { ...layout(photos, true), fallback: true };
    const rows = Math.max(4, ...boxes.map(b => b.y + b.h));
    // Center an incomplete final row when no taller frame occupies its space.
    const lastY = Math.max(...boxes.map(b => b.y)), last = boxes.filter(b => b.y === lastY);
    const rest = boxes.filter(b => b.y !== lastY), width = last.reduce((n, b) => n + b.w, 0);
    if (width < 6 && last.every(b => b.h === last[0].h) && !rest.some(b => b.y + b.h > lastY)) {
      let x = Math.floor((6 - width) / 2); last.forEach(b => { b.x = x; x += b.w; });
    }
    return { rows, boxes, fallback: false };
  }
  function gridAttributes(photos) {
    const plan = layout(photos);
    return photos.length ? `data-layout="packed" style="--photo-rows:${plan.rows}"` : '';
  }
  function editor(options) {
    const $ = id => document.getElementById(id), preview = $('diaryPhotoPreview'), tools = $('diaryCropTools');
    const panel = $('diaryPhotoEditor'), workspace = preview.parentElement, note = $('diaryPhotoFields');
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motionPaused === 'true';
    let selected = null, swapping = false, working = null, gesture = null, suppressClick = false, removed = null;
    let dragDepth = 0, cropPlacement = null;
    const photos = () => options.getDraft()?.photos || [];
    const selectedPhoto = () => photos().find(p => p.id === selected);
    const announce = text => { $('diaryPhotoHint').textContent = text; };
    const frame = id => [...preview.querySelectorAll('[data-frame-photo]')].find(el => el.dataset.framePhoto === id);
    const focusSelected = () => frame(selected)?.querySelector('[data-select-photo]').focus({ preventScroll: true });
    const button = (attrs, label, glyph) => {
      const short = label.startsWith('Hủy') ? 'Hủy' : ({ left: 'Trước', right: 'Sau', swap: 'Đổi chỗ', maximize: 'Cỡ ảnh', crop: 'Căn ảnh', 'notebook-pen': 'Ghi chú', x: 'Cất ảnh', reset: 'Đặt lại' }[glyph] || '');
      return `<button type="button" ${attrs} aria-label="${label}" title="${label}">${icon(glyph)}<span class="diary-frame-tool-label">${short}</span></button>`;
    };
    function tab(name) {
      if (name === 'writing') finishCrop(true);
      resetGesture(); note.hidden = true;
      $('diaryEditor').dataset.activeTab = name;
      $('diaryWritingEditor').hidden = name !== 'writing'; panel.hidden = name !== 'photos';
      document.querySelectorAll('[data-editor-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.editorTab === name)));
      requestAnimationFrame(() => {
        scalePreview(); preview.querySelectorAll('img[data-crop-x]').forEach(observe);
        const title = $('diaryEditTitle'); title.style.height = 'auto'; title.style.height = title.scrollHeight + 'px';
      });
    }
    function render() {
      resetGesture(); swapping = false; working = null; cropPlacement = null; note.hidden = true; note.replaceChildren();
      if (removed && (photos().some(p => p.id === removed.photo.id) || !options.getDraft()?.library.some(p => p.id === removed.photo.id))) removed = null;
      if (!photos().some(p => p.id === selected)) selected = photos()[0]?.id || null;
      const photoPage = document.querySelector('#diaryPages .diary-page-photos');
      const source = photoPage?.clientWidth ? photoPage : [...document.querySelectorAll('#diaryPages .diary-page')].find(p => p.clientWidth > 0);
      const width = source?.clientWidth || 460, height = source?.clientHeight || 690;
      preview.innerHTML = `<section class="diary-page diary-page-photos"><header class="diary-page-head"><span>Những tấm ảnh mang về</span><button type="button" class="diary-add-photos" data-add-photos>${icon('plus')}<span>Thêm ảnh</span></button></header><div class="diary-photo-grid"></div><footer class="diary-page-tail"><span>${photos().length} / 9 tấm ảnh</span><span>Bản nháp riêng</span></footer></section>`;
      const page = preview.firstElementChild;
      preview.style.setProperty('--preview-ratio', `${width} / ${height}`);
      page.style.width = width + 'px'; page.style.height = height + 'px';
      if (photoPage) {
        const style = getComputedStyle(photoPage);
        page.style.padding = style.padding; page.style.fontSize = style.fontSize; page.style.fontFamily = style.fontFamily;
        page.style.lineHeight = parseFloat(style.lineHeight) / parseFloat(style.fontSize);
        const head = page.querySelector('header'), headHeight = photoPage.querySelector('header').offsetHeight || 45;
        head.style.minHeight = headHeight + 'px'; head.style.height = headHeight + 'px';
      }
      page.style.setProperty('--diary-page-art', "url('./figures/decor/painted/diary/soft_paper_right.webp')");
      const grid = page.querySelector('.diary-photo-grid'); grid.dataset.photoCount = photos().length;
      const plan = layout(photos()); if (photos().length) { grid.dataset.layout = 'packed'; grid.style.setProperty('--photo-rows', plan.rows); }
      if (photos().length) grid.innerHTML = photos().map((p, i) => options.photoMarkup(p, i, options.owner(), photos().length, true, plan.boxes[i])).join('');
      else grid.innerHTML = `<button type="button" class="diary-drop-invitation" data-add-photos>${icon('plus')}<span>Dán tấm ảnh đầu tiên</span><small>Chọn ảnh hoặc thả ảnh vào trang</small><small>JPEG, PNG, WebP, HEIC · tối đa 20 MB / ảnh</small></button>`;
      scalePreview(); updateSelection();
      options.hydrate(preview).then(() => { if (options.getDraft()) refresh(); });
    }
    function scalePreview() {
      const page = preview.firstElementChild;
      if (page && preview.clientWidth) {
        const scale = preview.clientWidth / parseFloat(page.style.width);
        page.style.transform = `scale(${scale})`; preview.style.setProperty('--preview-scale', scale || 1);
      }
      positionTools();
    }
    const previewObserver = window.ResizeObserver ? new ResizeObserver(scalePreview) : null;
    previewObserver?.observe(preview);
    function positionTools() {
      const el = frame(selected); if (!el || tools.hidden || !preview.clientWidth) return;
      const r = el.getBoundingClientRect(), w = workspace.getBoundingClientRect(), paper = preview.getBoundingClientRect();
      const left = clamp(r.left + r.width / 2 - w.left - tools.offsetWidth / 2, paper.left - w.left + 4, paper.right - w.left - tools.offsetWidth - 4);
      const dialog = $('diaryEditor').getBoundingClientRect(), footer = $('diaryEditor').querySelector('.diary-editor-footer');
      const headerBottom = preview.querySelector('header').getBoundingClientRect().bottom;
      const visibleTop = Math.max(headerBottom + 8, dialog.top + 8), visibleBottom = Math.min(paper.bottom, dialog.bottom - 12, footer.getBoundingClientRect().top - 12);
      note.style.maxHeight = Math.max(120, visibleBottom - visibleTop - tools.offsetHeight - 14) + 'px';
      const height = tools.offsetHeight + (note.hidden ? 0 : note.offsetHeight + 6);
      const top = r.top - visibleTop > height + 12 ? r.top - w.top - height - 6 : r.bottom - w.top + 6;
      tools.style.left = left + 'px'; tools.style.top = clamp(top, visibleTop - w.top + 4, Math.max(visibleTop - w.top + 4, visibleBottom - w.top - height - 4)) + 'px';
      note.style.left = clamp(left, paper.left - w.left + 4, paper.right - w.left - note.offsetWidth - 4) + 'px';
      note.style.top = parseFloat(tools.style.top) + tools.offsetHeight + 6 + 'px';
    }
    $('diaryEditor').addEventListener('scroll', positionTools, { passive: true });
    function refresh() { updateSelection(false); }
    function updateSelection(resetNote = true) {
      if (resetNote) note.hidden = true;
      $('diaryFiles').disabled = Boolean(working) || options.locked();
      preview.dataset.cropping = String(Boolean(working)); preview.dataset.swapping = String(swapping);
      preview.querySelectorAll('[data-add-photos]').forEach(b => {
        b.disabled = Boolean(working) || options.locked() || photos().length >= 9;
        b.title = photos().length >= 9 ? 'Trang đã có đủ 9 ảnh.' : 'Chọn ảnh từ thiết bị';
      });
      preview.querySelectorAll('[data-frame-photo]').forEach(el => {
        const active = el.dataset.framePhoto === selected, imageBox = el.querySelector('[data-select-photo]');
        el.dataset.selected = String(active); imageBox.setAttribute('aria-pressed', String(active));
        imageBox.setAttribute('aria-describedby', 'diaryPhotoHint');
        imageBox.toggleAttribute('data-crop-pan', Boolean(working) && active);
        el.querySelector('[data-caption]').disabled = Boolean(working) || options.locked();
      });
      if (working) return;
      const i = photos().findIndex(p => p.id === selected), img = frame(selected)?.querySelector('img');
      // Leave every destination frame reachable while choosing a swap target.
      tools.hidden = i < 0 || swapping;
      tools.setAttribute('role', 'group'); tools.setAttribute('aria-label', `Công cụ ảnh ${i + 1}`);
      tools.innerHTML = i < 0 ? '' : `<span class="diary-tool-position">${i + 1}/${photos().length}</span>` +
        button(`data-arrange="swap" aria-pressed="${swapping}"${photos().length < 2 ? ' disabled' : ''}`, swapping ? 'Hủy đổi chỗ' : 'Đổi chỗ: chọn khung đích', 'swap') +
        button('data-arrange="size" aria-expanded="false"', 'Cỡ ảnh', 'maximize') +
        button(`data-arrange="crop"${!img?.naturalWidth || img.hidden ? ' disabled' : ''}`, 'Căn ảnh trong khung', 'crop') +
        button('data-photo-note aria-expanded="false"', 'Ghi chú và mô tả ảnh', 'notebook-pen') +
        button(`data-detach-photo="${selected}"`, 'Cất ảnh khỏi trang', 'x');
      tools.querySelectorAll('button').forEach(b => { b.disabled ||= options.locked(); });
      $('diaryPhotoUndo').hidden = !removed;
      $('diaryPhotoUndo').querySelector('button').disabled = options.locked() || photos().length >= 9;
      positionTools();
      announce(swapping ? 'Chọn khung muốn đổi chỗ. Escape để hủy.' : i < 0 ? '' : 'Chọn ảnh rồi kéo để đổi chỗ.');
    }
    function capture() {
      return new Map([...preview.querySelectorAll('[data-frame-photo]')].map(el => [el.dataset.framePhoto, { rect: el.getBoundingClientRect(), img: el.querySelector('img') }]));
    }
    function renderMoved(before) {
      options.changed(); options.renderFields();
      const scale = +getComputedStyle(preview).getPropertyValue('--preview-scale') || 1;
      preview.querySelectorAll('[data-frame-photo]').forEach(el => {
        const old = before.get(el.dataset.framePhoto), next = el.getBoundingClientRect(); if (!old) return;
        const img = el.querySelector('img');
        if (old.img?.naturalWidth && !old.img.hidden) { img.src = old.img.src; img.hidden = false; img.parentElement.querySelector('.diary-image-fallback').hidden = true; observe(img); }
        if (reduced() || !el.animate) return;
        const base = getComputedStyle(el).transform, r = old.rect;
        const dx = (r.left - next.left) / scale, dy = (r.top - next.top) / scale;
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(r.width - next.width) + Math.abs(r.height - next.height) > 1) el.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(${r.width / next.width}, ${r.height / next.height}) ${base}` },
          { transform: base }
        ], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
      focusSelected();
    }
    function swap(target) {
      if (options.locked() || working) return;
      const a = photos().findIndex(p => p.id === selected), b = photos().findIndex(p => p.id === target);
      if (a < 0 || b < 0 || a === b) { swapping = false; updateSelection(); return; }
      const before = capture(); [photos()[a], photos()[b]] = [photos()[b], photos()[a]];
      renderMoved(before); announce(`Đã chuyển ảnh đến vị trí ${b + 1}.`);
    }
    function updateCaption(photo, source) {
      const input = frame(photo.id)?.querySelector('[data-caption]');
      if (input && input !== source) input.value = photo.caption || '';
      const other = note.querySelector('[data-caption]'); if (other && other !== source) other.value = photo.caption || '';
      const imageBox = frame(photo.id)?.querySelector('[data-select-photo]');
      if (imageBox) { imageBox.setAttribute('aria-label', 'Chọn ảnh: ' + (photo.alt || options.owner())); imageBox.querySelector('img').alt = photo.alt || options.owner(); }
    }
    function renderNote() {
      const p = selectedPhoto(); if (!p) return;
      note.hidden = !note.hidden;
      tools.querySelector('[data-photo-note]').setAttribute('aria-expanded', String(!note.hidden));
      if (note.hidden) return;
      note.innerHTML = `<label class="diary-field"><span>Chú thích trên trang</span><textarea data-caption="${p.id}" maxlength="160" rows="2">${options.escape(p.caption || '')}</textarea></label><label class="diary-field"><span>Mô tả cho người đọc màn hình</span><textarea data-alt="${p.id}" maxlength="160" rows="2">${options.escape(p.alt || '')}</textarea></label><button type="button" class="diary-secondary" data-close-note>Xong</button>`;
      positionTools(); note.querySelector('textarea').focus({ preventScroll: true });
    }
    function liftCropFrame() {
      const el = frame(selected), page = preview.firstElementChild;
      const old = el.getBoundingClientRect(), width = el.clientWidth, height = el.clientHeight;
      const placeholder = document.createElement('div');
      placeholder.className = el.className; placeholder.style.visibility = 'hidden'; placeholder.setAttribute('aria-hidden', 'true');
      el.before(placeholder); cropPlacement = { placeholder, style: el.getAttribute('style') };
      const style = getComputedStyle(page), top = page.querySelector('header').offsetTop + page.querySelector('header').offsetHeight + 24;
      const availableWidth = page.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const factor = Math.min(availableWidth / width, Math.max(height, page.clientHeight - top - 180) / height);
      page.append(el);
      Object.assign(el.style, { position: 'absolute', left: (page.clientWidth - width * factor) / 2 + 'px', top: top + 'px',
        width: width * factor + 'px', height: height * factor + 'px', margin: '0', transform: 'none' });
      paintWorking();
      if (!reduced()) {
        const next = el.getBoundingClientRect(), scale = +getComputedStyle(preview).getPropertyValue('--preview-scale') || 1;
        el.animate([{ transform: `translate(${(old.left - next.left) / scale}px, ${(old.top - next.top) / scale}px) scale(${old.width / next.width}, ${old.height / next.height})` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    }
    function landCropFrame() {
      const el = frame(selected); if (!el || !cropPlacement) return;
      const old = el.getBoundingClientRect(); cropPlacement.placeholder.replaceWith(el);
      if (cropPlacement.style) el.setAttribute('style', cropPlacement.style); else el.removeAttribute('style');
      cropPlacement = null;
      if (!reduced()) {
        const next = el.getBoundingClientRect(), scale = +getComputedStyle(preview).getPropertyValue('--preview-scale') || 1;
        el.animate([{ transform: `translate(${(old.left - next.left) / scale}px, ${(old.top - next.top) / scale}px) scale(${old.width / next.width}, ${old.height / next.height})` }, { transform: getComputedStyle(el).transform }], { duration: 220, easing: 'ease-out' });
      }
    }
    function renderSizes() {
      const p = selectedPhoto(); if (!p || working) return;
      note.hidden = false; note.dataset.mode = 'size';
      const i = photos().findIndex(photo => photo.id === selected);
      note.innerHTML = `<h4>Cỡ ảnh</h4><p>Chọn cỡ vừa trang. Các ảnh còn lại tự xếp gọn.</p><div class="diary-size-options">${[['auto','Tự động'],['small','Nhỏ'],['medium','Vừa'],['large','Lớn']].map(([size,label]) => {
        const candidate = photos().map(photo => ({ ...photo }));
        if (size === 'auto') delete candidate[i].size; else candidate[i].size = size;
        const fits = !layout(candidate).fallback;
        return `<button type="button" data-photo-size="${size}" aria-pressed="${(p.size || 'auto') === size}"${fits ? '' : ' disabled'} title="${fits ? label : 'Cỡ này không còn đủ chỗ trên trang'}">${label}</button>`;
      }).join('')}</div><p class="diary-size-help">Cỡ bị mờ không vừa trang hiện tại.</p><div class="diary-size-position">${button(`data-move-photo="${selected}" data-direction="-1"${i === 0 ? ' disabled' : ''}`, 'Đưa ảnh về trước', 'left')}${button(`data-move-photo="${selected}" data-direction="1"${i === photos().length - 1 ? ' disabled' : ''}`, 'Đưa ảnh ra sau', 'right')}<button type="button" class="diary-primary" data-close-note>Xong</button></div>`;
      tools.querySelector('[data-arrange="size"]').setAttribute('aria-expanded', 'true');
      positionTools(); note.querySelector('[data-photo-size]:not(:disabled)').focus({ preventScroll: true });
    }
    function renderCrop() {
      const el = frame(selected), img = el?.querySelector('img');
      if (!img || img.hidden || !img.naturalWidth) { announce('Đợi ảnh mở xong rồi chỉnh khung nhé.'); return; }
      swapping = false; working = cropValue(selectedPhoto().crop); updateSelection(); note.hidden = true;
      liftCropFrame(); tools.classList.add('diary-crop-live');
      tools.innerHTML = `<label class="diary-zoom"><span>Thu phóng <output id="diaryZoomValue">${working.zoom.toFixed(2)}×</output></span><input id="diaryCropZoom" type="range" min="1" max="3" step="0.01" value="${working.zoom}" aria-label="Thu phóng ảnh"></label><div class="diary-crop-actions">${button('data-crop-action="reset"', 'Đặt lại khung', 'reset')}${button('data-crop-action="cancel"', 'Hủy chỉnh khung', 'x')}<button type="button" data-crop-action="done">${icon('check')} Xong</button></div>`;
      positionTools(); paintWorking();
      announce('Kéo ảnh ngay trong khung hoặc dùng phím mũi tên. Chọn Xong để giữ khung này.');
      el.querySelector('[data-select-photo]').focus({ preventScroll: true });
    }
    function paintWorking() {
      if (!working) return;
      const img = frame(selected)?.querySelector('img'); if (img) paint(img, working);
      if ($('diaryCropZoom')) $('diaryCropZoom').value = working.zoom;
      if ($('diaryZoomValue')) $('diaryZoomValue').textContent = working.zoom.toFixed(2) + '×';
    }
    function finishCrop(accept) {
      if (!working) return false;
      resetGesture(); const next = { ...working }, p = selectedPhoto(); working = null; landCropFrame();
      if (accept && p && JSON.stringify(cropValue(p.crop)) !== JSON.stringify(next)) { p.crop = next; options.changed(); }
      if (p) paint(frame(selected).querySelector('img'), cropValue(p.crop));
      tools.classList.remove('diary-crop-live'); updateSelection(); focusSelected(); return true;
    }
    function pan(dx, dy, basis) {
      const img = basis || frame(selected)?.querySelector('img'); if (!working || !img) return;
      const g = geometry(img, working); if (!g) return;
      const ratio = img.parentElement.getBoundingClientRect().width / g.w;
      working.x = clamp(g.x - dx / ratio / g.width, g.w / (2 * g.width), 1 - g.w / (2 * g.width));
      working.y = clamp(g.y - dy / ratio / g.height, g.h / (2 * g.height), 1 - g.h / (2 * g.height)); paintWorking();
    }
    function resetGesture(animateBack = false) {
      const old = gesture; gesture = null;
      if (old?.handle.hasPointerCapture?.(old.id)) old.handle.releasePointerCapture(old.id);
      if (old?.kind === 'swap') {
        const el = frame(selected), from = el?.style.transform;
        if (el) { el.style.transform = ''; if (animateBack && old.moved && !reduced()) el.animate([{ transform: from }, { transform: old.base }], { duration: 220, easing: 'ease-out' }); }
      }
      preview.querySelectorAll('[data-drag-source],[data-drop-target]').forEach(el => { delete el.dataset.dragSource; delete el.dataset.dropTarget; });
      workspace.classList.remove('diary-dragging');
    }
    function cancelAction() {
      if (gesture) { if (gesture.kind === 'pan') { working = gesture.before; paintWorking(); } resetGesture(true); return true; }
      if (working) return finishCrop(false);
      if (!note.hidden) { note.hidden = true; tools.querySelectorAll('[aria-expanded]').forEach(b => b.setAttribute('aria-expanded', 'false')); positionTools(); focusSelected(); return true; }
      if (swapping) { swapping = false; updateSelection(); return true; }
      return false;
    }
    function clear() {
      resetGesture(); selected = null; working = null; swapping = false; removed = null; dragDepth = 0; cropPlacement = null;
      panel.removeAttribute('aria-busy');
      preview.replaceChildren(); tools.replaceChildren(); tools.hidden = true; tools.classList.remove('diary-crop-live'); note.replaceChildren(); note.hidden = true;
      $('diaryPhotoUndo').hidden = true; $('diaryPhotoHint').textContent = ''; $('diaryFiles').disabled = options.locked();
      workspace.classList.remove('diary-file-over'); workspace.querySelector('.diary-upload-curtain').hidden = true;
      for (const target of targets) if (!target.isConnected) { observer?.unobserve(target); targets.delete(target); }
    }
    document.querySelectorAll('[data-editor-tab]').forEach(b => b.addEventListener('click', () => tab(b.dataset.editorTab)));
    panel.addEventListener('click', event => {
      const b = event.target.closest('button'); if (!b || options.locked() || suppressClick) return;
      if (b.hasAttribute('data-add-photos')) { if (!working && photos().length < 9) {
          if ((options.getDraft()?.library.length || 0) >= 9) {
            $('diaryRecoveredDrawer').open = true;
            announce('Đã tải đủ 9 ảnh. Lưu vào sổ, rồi xóa hẳn ảnh đã cất để thêm ảnh mới.');
          } else $('diaryFiles').click();
        } }
      else if (b.dataset.selectPhoto) {
        if (working) return;
        if (swapping) swap(b.dataset.selectPhoto); else { selected = b.dataset.selectPhoto; updateSelection(); }
      } else if (b.dataset.arrange === 'swap') { swapping = !swapping; updateSelection(); }
      else if (b.dataset.arrange === 'crop') renderCrop();
      else if (b.dataset.arrange === 'size') renderSizes();
      else if (b.dataset.photoSize) {
        const p = selectedPhoto(), before = capture();
        const candidate = photos().map(photo => ({ ...photo })), i = photos().findIndex(photo => photo.id === selected);
        if (b.dataset.photoSize === 'auto') delete candidate[i].size; else candidate[i].size = b.dataset.photoSize;
        if (layout(candidate).fallback) return;
        if (b.dataset.photoSize === 'auto') delete p.size; else p.size = b.dataset.photoSize;
        renderMoved(before); renderSizes(); announce('Đã đổi cỡ ảnh và xếp lại trang.');
      }
      else if (b.dataset.cropAction === 'reset') { working = cropValue(); paintWorking(); }
      else if (b.dataset.cropAction) finishCrop(b.dataset.cropAction === 'done');
      else if (b.hasAttribute('data-photo-note')) renderNote();
      else if (b.hasAttribute('data-close-note')) { note.hidden = true; focusSelected(); }
      else if (b.dataset.movePhoto) {
        const i = photos().findIndex(p => p.id === selected), target = photos()[i + Number(b.dataset.direction)];
        if (target) { const direction = b.dataset.direction; swap(target.id); renderSizes(); note.querySelector(`[data-direction="${direction}"]`)?.focus({ preventScroll: true }); }
      } else if (b.dataset.detachPhoto) {
        const i = photos().findIndex(p => p.id === b.dataset.detachPhoto); if (i < 0) return;
        removed = { photo: { ...photos()[i] }, index: i }; photos().splice(i, 1);
        options.changed(); options.renderFields(); $('diaryPhotoUndo').querySelector('button').focus({ preventScroll: true });
      } else if (b.hasAttribute('data-undo-photo') && removed && photos().length < 9) {
        photos().splice(Math.min(removed.index, photos().length), 0, removed.photo); selected = removed.photo.id; removed = null;
        options.changed(); options.renderFields(); focusSelected();
      }
    });
    panel.addEventListener('focusin', event => {
      const id = event.target.dataset.caption;
      if (id && selected !== id && !working) { selected = id; updateSelection(); }
    });
    tools.addEventListener('input', event => { if (event.target.id === 'diaryCropZoom' && working) { working.zoom = +event.target.value; paintWorking(); } });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape' && cancelAction()) { event.preventDefault(); event.stopPropagation(); return; }
      if (event.key === 'Enter' && event.target.matches('input')) {
        event.preventDefault();
        if (working && event.target.id === 'diaryCropZoom') finishCrop(true); else focusSelected();
        return;
      }
      if (!event.target.closest('[data-select-photo]')) return;
      const delta = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[event.key];
      if (working && delta) { event.preventDefault(); pan(...delta); }
      else if (event.altKey && delta && !options.locked()) {
        event.preventDefault(); selected = event.target.closest('[data-frame-photo]').dataset.framePhoto;
        const i = photos().findIndex(p => p.id === selected), target = photos()[i + (delta[0] + delta[1] > 0 ? 1 : -1)];
        if (target) swap(target.id);
      }
    });
    panel.addEventListener('pointerdown', event => {
      if (event.button !== 0 || options.locked() || gesture || swapping) return;
      const imageBox = event.target.closest('[data-select-photo]');
      if (!imageBox || !working && event.pointerType === 'touch' && imageBox.closest('[data-frame-photo]').dataset.selected !== 'true') return;
      event.preventDefault();
      if (!working) { selected = imageBox.closest('[data-frame-photo]').dataset.framePhoto; updateSelection(); }
      else if (!imageBox?.hasAttribute('data-crop-pan')) return;
      const handle = imageBox, el = frame(selected); handle.focus({ preventScroll: true });
      // Freeze destinations before lifting. Hit testing stays stable while the object follows the pointer.
      gesture = { id: event.pointerId, handle, kind: working ? 'pan' : 'swap', x: event.clientX, y: event.clientY,
        startX: event.clientX, startY: event.clientY, moved: false, base: getComputedStyle(el).transform,
        slots: [...preview.querySelectorAll('[data-frame-photo]')].map(f => ({ id: f.dataset.framePhoto, rect: f.getBoundingClientRect() })),
        before: working ? { ...working } : null };
      handle.setPointerCapture(event.pointerId);
    });
    panel.addEventListener('pointermove', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const g = gesture, dx = event.clientX - g.x, dy = event.clientY - g.y;
      g.moved ||= Math.abs(event.clientX - g.startX) + Math.abs(event.clientY - g.startY) > 5;
      if (g.kind === 'pan') pan(dx, dy, g.handle.querySelector('img'));
      else if (g.moved) {
        const el = frame(selected), scale = +getComputedStyle(preview).getPropertyValue('--preview-scale') || 1;
        el.dataset.dragSource = 'true'; workspace.classList.add('diary-dragging'); note.hidden = true;
        el.style.transform = `translate(${(event.clientX - g.startX) / scale}px, ${(event.clientY - g.startY) / scale}px) ${g.base}`;
        preview.querySelectorAll('[data-drop-target]').forEach(f => delete f.dataset.dropTarget);
        const target = g.slots.find(s => s.id !== selected && event.clientX >= s.rect.left && event.clientX <= s.rect.right && event.clientY >= s.rect.top && event.clientY <= s.rect.bottom);
        if (target) frame(target.id).dataset.dropTarget = 'true';
      }
      g.x = event.clientX; g.y = event.clientY;
    });
    function release(event, cancel = false) {
      if (!gesture || gesture.id !== event.pointerId) return;
      const g = gesture, destination = preview.querySelector('[data-drop-target]')?.dataset.framePhoto;
      const before = g.kind === 'swap' && g.moved && destination ? capture() : null;
      if (cancel && g.kind === 'pan') { working = g.before; paintWorking(); }
      resetGesture(cancel || !destination);
      suppressClick = g.moved; setTimeout(() => { suppressClick = false; }, 0);
      if (!cancel && g.kind === 'swap' && g.moved && destination) {
        const a = photos().findIndex(p => p.id === selected), b = photos().findIndex(p => p.id === destination);
        [photos()[a], photos()[b]] = [photos()[b], photos()[a]]; renderMoved(before); announce(`Đã chuyển ảnh đến vị trí ${b + 1}.`);
      }
    }
    panel.addEventListener('pointerup', event => release(event));
    panel.addEventListener('pointercancel', event => release(event, true));
    panel.addEventListener('lostpointercapture', event => release(event, true));
    // Native file drag is separate from frame rearranging and never navigates the browser away.
    const isFiles = event => [...(event.dataTransfer?.types || [])].includes('Files');
    for (const type of ['dragover', 'drop']) $('diaryEditor').addEventListener(type, event => { if (isFiles(event)) event.preventDefault(); });
    panel.addEventListener('dragenter', event => { if (isFiles(event)) { event.preventDefault(); dragDepth++; workspace.classList.add('diary-file-over'); workspace.querySelector('.diary-upload-curtain').hidden = false; } });
    panel.addEventListener('dragover', event => { if (isFiles(event)) { event.preventDefault(); event.dataTransfer.dropEffect = options.locked() || photos().length >= 9 ? 'none' : 'copy'; } });
    panel.addEventListener('dragleave', event => { if (isFiles(event) && --dragDepth <= 0) { dragDepth = 0; workspace.classList.remove('diary-file-over'); workspace.querySelector('.diary-upload-curtain').hidden = true; } });
    panel.addEventListener('drop', event => {
      if (!isFiles(event)) return; event.preventDefault(); dragDepth = 0; workspace.classList.remove('diary-file-over'); workspace.querySelector('.diary-upload-curtain').hidden = true;
      if (!options.locked()) options.upload([...event.dataTransfer.files]);
    });
    window.addEventListener('resize', () => {
      const wasCropping = Boolean(working); if (wasCropping) finishCrop(false); else resetGesture();
      if (options.getDraft()) render();
      if (wasCropping) announce('Kích thước trang đã đổi. Chọn Chỉnh khung để tiếp tục.');
    });
    return { render, tab, clear, refresh, finishCrop, cancelAction, updateCaption, cropping: () => Boolean(working) };
  }
  window.TaxuaDiaryPhotos = { attributes, observe, icon, editor, layout, gridAttributes };
})();
