/* Sổ mây: semantic paired spreads, a decorative turn, and server-confirmed edits. */
(() => {
  'use strict';
  const root = document.getElementById('crewDiary'), api = window.TaxuaDiaryApi;
  if (!root || !api || typeof TRIP_DATA === 'undefined') return;
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const members = (TRIP_DATA.crewOrder || []).map(name => TRIP_DATA.members.find(m => m.name === name)).filter(Boolean);
  TRIP_DATA.members.forEach(m => { if (!members.includes(m)) members.push(m); });
  const small = matchMedia('(max-width: 850px)'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const photoLimit = 9;
  const ribbonColors = {mi:'#987078', san:'#486279', thao:'#9c7555', quanlele:'#6c795f', gtm:'#667c79', truong:'#7b6c85', tamle:'#79566f', linh:'#9b6375'};
  const state = { index: 0, entries: [], open: false, turning: false, busy: false, status: [], authMember: null,
    authPurpose: 'read', authBusy: false, draft: null, dirty: false, change: 0, savePromise: null,
    closePromise: null, saveTimer: null, uploading: false, publishing: false, conflict: false, editorOpening: false, editorEpoch: 0, recovery: null, readEpoch: 0, photoId: null };
  let transition = null, motionHandle = null, motionEpoch = 0;
  let pageGesture = null, suppressPageClickUntil = 0;
  const photoLoads = new WeakMap();
  const motion = window.TaxuaDiaryMotion;
  const photoTools = window.TaxuaDiaryPhotos;
  let photoEditor;
  function lockBook() {
    $('diaryBook').setAttribute('aria-busy', String(state.turning));
    $('diaryPages').inert = state.turning;
    root.querySelectorAll('#diaryBookmarks button, [data-diary-side]').forEach(button => { button.disabled = state.turning; });
    root.querySelectorAll('[data-diary-edge]').forEach(button => {
      const next = state.index + Number(button.dataset.diaryEdge);
      button.disabled = state.turning || !state.open || next < 0 || next >= members.length;
    });
  }
  function settleMotion(commit = true) {
    resetPageGesture();
    const pending = transition;
    if (!pending) return;
    transition = null; motionEpoch++;
    const handle = motionHandle; motionHandle = null; handle?.cancel();
    delete $('diaryStage').dataset.preparing;
    state.turning = false; lockBook();
    if (commit) pending.commit();
    else pending.cancel?.();
  }
  function beginMotion(commit, cancel) {
    const epoch = ++motionEpoch;
    transition = { commit, cancel }; state.turning = true; lockBook();
    return epoch;
  }
  const singleLayout = () => small.matches || parseFloat(getComputedStyle(root).fontSize) > 20;
  const motionAllowed = () => Boolean(motion && Element.prototype.animate && getComputedStyle(root).getPropertyValue('--diary-motion-ready').trim() === '1') && !reduced.matches && document.documentElement.dataset.motionPaused !== 'true' && !document.hidden;
  const refreshLayout = () => requestAnimationFrame(() => window.JourneyMotion?.refresh());
  const current = () => members[state.index];
  const entry = () => state.entries.find(e => e.member_id === current().id);
  const photoIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#trip-camera"></use></svg>';
  const errorText = error => ({
    CONNECTION_REQUIRED: 'Mở trang qua HTTP hoặc HTTPS để kết nối sổ riêng nhé.',
    NETWORK_ERROR: 'Chưa kết nối được với sổ. Kiểm tra mạng rồi thử lại nhé.',
    REQUEST_INTERRUPTED: 'Kết nối bị ngắt. Thử lại để kiểm tra bản đã lưu.',
    LOGIN_FAILED: 'Mật khẩu chưa đúng. Thử lại nhé.', INVALID_PASSWORD: 'Mật khẩu không được để trống.',
    ALREADY_CLAIMED: 'Tên này đã có mật khẩu. Hãy đăng nhập bằng mật khẩu đã đặt.',
    CLAIM_BUSY: 'Tên này đang được đặt mật khẩu. Đợi một chút rồi thử lại.',
    CLAIM_EXPIRED: 'Lượt đặt mật khẩu đã hết hạn. Thử đăng nhập trước khi tạo lại nhé.',
    RATE_LIMITED: 'Đã thử nhiều lần. Hãy đợi 15 phút rồi quay lại.',
    SESSION_EXPIRED: 'Phiên đọc đã kết thúc. Nhập lại mật khẩu để mở sổ.',
    DRAFT_CONFLICT: 'Bản nháp đã thay đổi ở nơi khác. Thay đổi ở đây vẫn còn; chép lại hoặc tải bản mới trước khi tiếp tục.',
    ENTRY_CONFLICT: 'Trang trong sổ đã có bản mới. Thay đổi ở đây vẫn còn; tải bản nháp mới để đối chiếu.',
    PHOTO_LIMIT: 'Mỗi người giữ tối đa 9 ảnh và 30 MiB trong sổ. Sổ đang đủ ảnh hoặc dung lượng. Bỏ ảnh khỏi trang, lưu vào sổ rồi xóa ảnh chưa dùng để thêm ảnh mới.',
    INVALID_IMAGE: 'Ảnh chưa đọc được. Chọn ảnh JPEG, PNG hoặc WebP khác nhé.',
    IMAGE_DIMENSIONS: 'Ảnh quá lớn để dán vào sổ. Thử chọn lại ảnh khác.',
    REQUEST_TOO_LARGE: 'Tệp ảnh quá lớn. Chọn ảnh nhỏ hơn nhé.',
    IMAGE_PROCESSOR_UNAVAILABLE: 'Chưa chuẩn bị được ảnh. Thử tải lại sau một chút.',
    UPLOAD_EXPIRED: 'Lượt tải ảnh đã hết hạn. Chọn lại ảnh để thử lại.',
    PHOTO_IN_USE: 'Ảnh vẫn nằm trong trang hoặc bản nháp đã lưu.',
    FORBIDDEN: 'Tài khoản này không có quyền sửa trang đó.',
    ACCOUNT_CREATE_FAILED: 'Chưa tạo được mật khẩu. Thử lại sau một chút.',
    UPLOAD_FAILED: 'Ảnh chưa tải xong. Kiểm tra mạng rồi thử lại nhé.'
  }[error?.code || error?.message] || 'Chưa hoàn tất được. Thử lại sau một chút nhé.');
  function message(text = '', error = false, target = $('diaryStatus')) {
    target.textContent = text; target.dataset.error = String(error);
    if (target.id === 'diaryStatus') target.hidden = !text;
  }
  function photoMarkup(photo, index, owner, count, editing = false, box) {
    const label = photo.alt || `Ảnh chuyến đi của ${owner}`;
    const wide = count <= 2 || ([3, 5, 7].includes(count) && index === 0);
    const frame = `diary-print diary-frame-${count === 1 ? 'portrait' : wide || count <= 6 ? 'landscape' : 'square'}`;
    const image = `<button type="button" class="diary-photo-button" ${editing ? 'data-select-photo' : 'data-view-photo'}="${escape(photo.id)}" aria-label="${editing ? 'Chọn' : 'Mở'} ảnh ${index + 1}: ${escape(label)}"><img data-private-photo="${escape(photo.id)}" ${photoTools?.attributes(photo.crop) || ''} alt="${escape(label)}" draggable="false" hidden><span class="diary-image-fallback" aria-hidden="true">Đang mở ảnh…</span></button>`;
    const caption = editing ? `<figcaption><input class="diary-inline-caption" data-caption="${escape(photo.id)}" aria-label="Chú thích ảnh ${index + 1}" value="${escape(photo.caption)}" maxlength="160" placeholder="Ghi chú…" autocomplete="off"></figcaption>` : `<figcaption>${escape(photo.caption || '\u00a0')}</figcaption>`;
    return `<figure class="${frame}"${box ? ` style="grid-area:${box.y + 1} / ${box.x + 1} / span ${box.h} / span ${box.w}"` : ''}${editing ? ` data-frame-photo="${escape(photo.id)}" data-photo-row="${escape(photo.id)}"` : ''}>${image}${caption}</figure>`;
  }
  function hydrate(container) {
    return Promise.allSettled([...container.querySelectorAll('img[data-private-photo]')].map(img => {
      if (img.dataset.requested) return photoLoads.get(img);
      img.dataset.requested = 'true';
      const loading = api.photo(img.dataset.privatePhoto, img.dataset.size || 'thumb').then(async src => {
        if (!img.isConnected || !api.hasSession()) return;
        img.src = src;
        const fallback = img.parentElement.querySelector('.diary-image-fallback');
        img.addEventListener('error', () => { img.hidden = true; if (fallback) { fallback.hidden = false; fallback.textContent = 'Chưa mở được ảnh'; } }, { once: true });
        await img.decode?.();
        if (!img.isConnected || !api.hasSession()) return;
        img.hidden = false; if (fallback) fallback.hidden = true;
        photoTools?.observe(img);
      }).catch(() => {
        if (!img.isConnected) return;
        const fallback = img.parentElement.querySelector('.diary-image-fallback');
        if (fallback) fallback.textContent = 'Chưa mở được ảnh';
      });
      photoLoads.set(img, loading); return loading;
    }));
  }
  function createSpread(index) {
    const person = members[index], saved = state.entries.find(e => e.member_id === person.id);
    const pages = document.createElement('div'); pages.className = 'diary-pages';
    if (!saved) return pages;
    const photos = saved.photos || [], plan = photoTools?.layout(photos);
    const canEdit = api.hasSession() && api.memberId() === person.id;
    const stamp = saved.updated_at ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(saved.updated_at)) : 'Một góc để nhớ';
    pages.innerHTML = `
      <section class="diary-page diary-page-writing" aria-label="Lời viết của ${escape(person.name)}">
        <header class="diary-page-head"><span>Vài dòng để nhớ</span>${canEdit ? `<button type="button" class="diary-edit" data-edit="writing" aria-label="Sửa lời viết của ${escape(person.name)}">Viết vài dòng ↗</button>` : ''}</header>
        <div class="diary-author"><img src="./${escape(person.image)}" alt="" width="72" height="78"><div><h3>${escape(person.name)}</h3><small>Tà Xùa · tháng mười, 2026</small></div></div>
        ${saved.title ? `<h4 class="diary-entry-title">${escape(saved.title)}</h4>` : ''}
        ${saved.body ? `<div class="diary-writing" role="region" tabindex="0" aria-label="Bài viết của ${escape(person.name)}"><p>${escape(saved.body)}</p></div>` : '<div class="diary-empty-writing" aria-hidden="true"><div class="diary-blank-lines"></div></div>'}
        <footer class="diary-page-tail"><span>${escape(stamp)}</span>${saved.body ? '<button type="button" class="diary-text-button" data-full-writing>Đọc trọn bài ↗</button>' : ''}<span aria-hidden="true">${String(index * 2 + 1).padStart(2, '0')}</span></footer>
      </section>
      <section class="diary-page diary-page-photos" aria-label="Ảnh của ${escape(person.name)}">
        <header class="diary-page-head"><span>Những tấm ảnh mang về</span>${canEdit ? `<button type="button" class="diary-edit" data-edit="photos" aria-label="Sửa ảnh của ${escape(person.name)}">Dán thêm ảnh ↗</button>` : ''}</header>
        <div class="diary-photo-grid" data-photo-count="${photos.length}" ${photoTools?.gridAttributes(photos) || ''}>${photos.length ? photos.map((p, i) => photoMarkup(p, i, person.name, photos.length, false, plan?.boxes[i])).join('') : [0, 1, 2].map(i => `<figure class="diary-print diary-frame-${i === 0 ? 'landscape' : i === 1 ? 'portrait' : 'square'}" aria-hidden="true"><div class="diary-empty-photo">${photoIcon}</div><figcaption>&nbsp;</figcaption></figure>`).join('')}</div>
        <footer class="diary-page-tail"><span>${photos.length ? photos.length + ' tấm ảnh' : ''}</span><span aria-hidden="true">${String(index * 2 + 2).padStart(2, '0')}</span></footer>
      </section>`;
    [...pages.children].forEach((page, i) => {
      page.dataset.owner = person.id;
      page.style.setProperty('--diary-page-art', `url('./figures/decor/painted/diary/soft_paper_${i ? 'right' : 'left'}.webp')`);
    });
    return pages;
  }
  function renderSpread(prepared) {
    const person = current();
    $('diaryPages').replaceChildren(...(prepared || createSpread(state.index)).children);
    $('diaryPageLabel').textContent = 'Trang của ' + person.name;
    $('diaryBookmarks').querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === state.index)));
    if (singleLayout()) {
      const bookmark = $('diaryBookmarks').children[state.index];
      $('diaryBookmarks').scrollLeft = bookmark.offsetLeft - $('diaryBookmarks').clientWidth / 2 + bookmark.offsetWidth / 2;
    }
    applySide(); hydrate($('diaryPages'));
    lockBook();
  }
  function applySide() {
    const side = $('diaryBook').dataset.side;
    root.classList.toggle('diary-large-text', !small.matches && singleLayout());
    $('diaryPages').querySelectorAll('.diary-page').forEach(page => {
      const hidden = singleLayout() && (page.classList.contains('diary-page-photos') ? side !== 'photos' : side !== 'writing');
      page.inert = hidden || state.turning;
      if (hidden) page.setAttribute('aria-hidden', 'true'); else page.removeAttribute('aria-hidden');
    });
    root.querySelectorAll('[data-diary-side]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.diarySide === side)));
  }
  async function prepareSpread(prepared) {
    await Promise.race([Promise.allSettled([hydrate(prepared), motion.ready($('diaryPages')), motion.ready(prepared)]), new Promise(resolve => setTimeout(resolve, 1600))]);
  }
  async function goTo(index, animate = true, gesture = null) {
    if (!state.open || state.turning || index < 0 || index >= members.length || index === state.index) return;
    const backward = index < state.index;
    const prepared = createSpread(index);
    const commit = () => { state.index = index; renderSpread(prepared); prepared.remove(); refreshLayout(); };
    if (!animate || !motionAllowed()) { commit(); return; }
    // Prepare a hidden, inert spread without replacing the semantic reader.
    // Those same nodes become the reader on landing, so decoded photos and
    // the page's layout never disappear for a second render at the endpoint.
    prepared.classList.add('diary-turn-preview'); prepared.inert = true; prepared.setAttribute('aria-hidden', 'true');
    const pages = $('diaryPages');
    Object.assign(prepared.style, { left: pages.offsetLeft + 'px', top: pages.offsetTop + 'px', width: pages.offsetWidth + 'px' });
    const epoch = beginMotion(commit, () => prepared.remove());
    $('diaryBook').append(prepared);
    await prepareSpread(prepared);
    if (epoch !== motionEpoch || !state.open || !api.hasSession()) return;
    const page = singleLayout() ? [...$('diaryPages').children].find(el => getComputedStyle(el).display !== 'none') : $('diaryPages').children[backward ? 0 : 1];
    const incomingPage = singleLayout() ? [...prepared.children].find(el => getComputedStyle(el).display !== 'none') : prepared.children[backward ? 1 : 0];
    const underPage = singleLayout() ? incomingPage : prepared.children[backward ? 0 : 1];
    motionHandle = motion.turn({ book: $('diaryBook'), page, incomingPage, underPage, backward, single: singleLayout(), interactive: Boolean(gesture), complete: () => settleMotion(), rollback: () => settleMotion(false) });
    if (gesture) {
      motionHandle.seek(gesture.progress);
      if (gesture.released) motionHandle.release(gesture.accepted);
    }
  }
  function resetPageGesture() {
    const gesture = pageGesture; pageGesture = null;
    delete $('diaryBook').dataset.dragging;
    if (!gesture) return;
    gesture.released = true; gesture.accepted = false;
    if ($('diaryBook').hasPointerCapture?.(gesture.id)) $('diaryBook').releasePointerCapture(gesture.id);
  }
  function movePageGesture(event) {
    const gesture = pageGesture;
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.started) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { resetPageGesture(); return; }
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
      const direction = dx < 0 ? 1 : -1;
      if (gesture.edge && direction !== gesture.edge) { resetPageGesture(); suppressPageClickUntil = performance.now() + 350; return; }
      const index = state.index + direction;
      if (index < 0 || index >= members.length) { resetPageGesture(); return; }
      gesture.direction = direction; gesture.index = index; gesture.started = true;
      gesture.animated = motionAllowed();
      $('diaryBook').setPointerCapture?.(gesture.id);
      $('diaryBook').dataset.dragging = 'true';
      $('diaryBook').focus({ preventScroll: true });
      if (gesture.animated) goTo(index, true, gesture);
    }
    event.preventDefault();
    const now = performance.now(), distance = gesture.direction * (gesture.x - event.clientX);
    gesture.velocity = gesture.direction * (gesture.lastX - event.clientX) / Math.max(1, now - gesture.lastAt);
    gesture.lastX = event.clientX; gesture.lastAt = now;
    gesture.distance = distance; gesture.progress = Math.max(0, Math.min(1, distance / gesture.width));
    if (gesture.animated) motionHandle?.seek(gesture.progress);
  }
  function endPageGesture(event, cancelled = false) {
    const gesture = pageGesture;
    if (!gesture || event && event.pointerId !== gesture.id) return;
    resetPageGesture();
    if (!gesture.started) return;
    suppressPageClickUntil = performance.now() + 350;
    const flick = performance.now() - gesture.lastAt < 140 && gesture.velocity > .45 && gesture.distance > 32;
    gesture.accepted = !cancelled && (gesture.progress >= .24 || flick);
    if (!gesture.animated) { if (gesture.accepted) goTo(gesture.index, false); return; }
    if (motionHandle) motionHandle.release(gesture.accepted);
    else if (!gesture.accepted) settleMotion(false);
  }
  $('diaryBook').addEventListener('pointerdown', event => {
    if (!state.open || state.turning || state.busy || pageGesture || !event.isPrimary || event.button !== 0) return;
    const edge = event.target.closest('[data-diary-edge]');
    if (edge?.disabled) return;
    if (!edge && event.target.closest('button,a,input,textarea,select,[contenteditable="true"],.diary-print')) return;
    if (!edge && event.pointerType === 'mouse' && event.target.closest('.diary-writing,.diary-entry-title,.diary-author')) return;
    if (window.getSelection()?.isCollapsed === false) return;
    const paper = [...$('diaryPages').children].find(page => getComputedStyle(page).display !== 'none');
    pageGesture = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastAt: performance.now(),
      edge: Number(edge?.dataset.diaryEdge || 0), width: paper.getBoundingClientRect().width, progress: 0, distance: 0, velocity: 0, started: false, released: false };
  });
  window.addEventListener('pointermove', movePageGesture, { passive: false });
  window.addEventListener('pointerup', endPageGesture);
  window.addEventListener('pointercancel', event => endPageGesture(event, true));
  $('diaryBook').addEventListener('lostpointercapture', event => {
    // Touch begins with implicit capture on its original child. Transferring
    // it to the book releases that child; only losing the book ends a drag.
    if (event.target === $('diaryBook')) endPageGesture(event, true);
  });
  $('diaryBook').addEventListener('click', event => {
    if (event.detail && performance.now() < suppressPageClickUntil) { suppressPageClickUntil = 0; event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  $('diaryBook').addEventListener('dragstart', event => { if (!event.target.closest('.diary-writing')) event.preventDefault(); });
  root.querySelectorAll('[data-diary-edge]').forEach(button => button.addEventListener('click', () => goTo(state.index + Number(button.dataset.diaryEdge))));
  async function openReader(animate = true) {
    settleMotion();
    const alreadyOpen = state.open;
    state.open = true;
    const finish = () => {
      $('diaryClosed').hidden = true; $('diaryReader').hidden = false;
      $('diaryReader').inert = false; renderSpread(); refreshLayout();
    };
    if (alreadyOpen || !animate || !motionAllowed()) { finish(); message(); return; }
    $('diaryStage').dataset.preparing = 'opening';
    $('diaryReader').hidden = false; renderSpread();
    const epoch = beginMotion(finish, () => { $('diaryClosed').hidden = false; $('diaryReader').hidden = true; });
    await prepareSpread($('diaryPages'));
    if (epoch !== motionEpoch || !api.hasSession()) return;
    motionHandle = motion.cover({ stage: $('diaryStage'), closed: $('diaryClosed'), reader: $('diaryReader'), cover: $('diaryOpen'), book: $('diaryBook'), opening: true, single: singleLayout(), complete: () => settleMotion() });
    message();
  }
  async function closeReader() {
    if (!state.open) return;
    settleMotion();
    const finish = () => {
      state.open = false; $('diaryReader').hidden = true; $('diaryClosed').hidden = false;
      refreshLayout(); $('diaryOpen').focus({ preventScroll: true });
    };
    if (!motionAllowed()) { finish(); return; }
    beginMotion(finish);
    motionHandle = motion.cover({ stage: $('diaryStage'), closed: $('diaryClosed'), reader: $('diaryReader'), cover: $('diaryOpen'), book: $('diaryBook'), opening: false, single: singleLayout(), complete: () => settleMotion() });
  }
  async function readEntries() {
    const epoch = ++state.readEpoch;
    const data = await api.read();
    if (epoch !== state.readEpoch || !api.hasSession()) return false;
    state.entries = data.entries;
    if (state.open && !state.turning) renderSpread();
    return true;
  }
  async function openDiary(memberId) {
    if (state.busy || state.turning) return;
    if (memberId) { const index = members.findIndex(m => m.id === memberId); if (index >= 0) state.index = index; }
    if (!api.configured) { message(errorText({ code: 'CONNECTION_REQUIRED' }), true); return; }
    if (!api.hasSession()) { await showAuth(memberId || api.memberId() || current().id, 'read'); return; }
    state.busy = true; $('diaryOpen').setAttribute('aria-busy', 'true'); message('Đang mở những trang sổ…');
    try { if (await readEntries()) await openReader(); }
    catch (error) { message(errorText(error), true); if (error.status === 401) await showAuth(current().id, 'read'); }
    finally { state.busy = false; $('diaryOpen').removeAttribute('aria-busy'); }
  }

  // Static forms have one owner each. None lives in the book animation DOM.
  document.body.insertAdjacentHTML('beforeend', `
    <dialog class="diary-dialog diary-auth" id="diaryAuth" aria-labelledby="diaryAuthTitle">
      <button type="button" class="diary-dialog-close" data-close-auth aria-label="Đóng đăng nhập">×</button>
      <form id="diaryAuthForm">
        <p class="diary-eyebrow">Sổ riêng của cả hội</p><h3 id="diaryAuthTitle">Cậu là ai nhỉ?</h3>
        <p id="diaryAuthIntro">Chọn tên của cậu để mở sổ nhé.</p>
        <fieldset class="diary-auth-members"><legend>Tên trong hội mình</legend>${members.map(m => `<label class="diary-member-choice"><input type="radio" name="diaryMember" value="${escape(m.id)}" required><img src="./${escape(m.image)}" alt="" width="48" height="52"><span>${escape(m.name)}</span></label>`).join('')}</fieldset>
        <p id="diaryAuthMode" class="diary-auth-note"></p>
        <label class="diary-field"><span id="diaryPasswordLabel">Mật khẩu</span><input id="diaryPassword" type="password" autocomplete="current-password" required aria-describedby="diaryAuthMode"></label>
        <label class="diary-field" id="diaryConfirmField" hidden><span>Viết lại mật khẩu</span><input id="diaryPasswordConfirm" type="password" autocomplete="new-password"></label>
        <label class="diary-password-toggle"><input type="checkbox" id="diaryShowPassword"> Hiện mật khẩu</label>
        <p id="diaryFirstClaimNote" class="diary-auth-note" hidden>Ai đặt mật khẩu đầu tiên sẽ giữ tên này. Chọn đúng tên của cậu nhé.</p>
        <button type="submit" class="diary-primary" id="diaryAuthSubmit">Mở sổ</button>
        <button type="button" class="diary-secondary" id="diaryAuthRetry" hidden>Thử kết nối lại</button>
        <p class="diary-form-status" id="diaryAuthStatus" role="alert"></p>
        <details class="diary-auth-help"><summary>Quên mật khẩu?</summary><p>Nhắn người giữ sổ để đặt lại mật khẩu. Trang và ảnh của cậu vẫn được giữ nguyên.</p></details>
      </form>
    </dialog>
    <dialog class="diary-dialog diary-editor" id="diaryEditor" aria-labelledby="diaryEditorTitle">
      <button type="button" class="diary-dialog-close" data-close-editor aria-label="Đóng trang chỉnh sửa">×</button>
      <p class="diary-eyebrow">Một trang của riêng cậu</p><h3 id="diaryEditorTitle">Viết vào sổ</h3>
      <p class="diary-editor-copy">Bản nháp chỉ mình cậu thấy. Chọn “Lưu vào sổ” khi muốn cả hội cùng đọc.</p>
      <div class="diary-conflict-tools" id="diaryRecovery" hidden><button type="button" class="diary-secondary" id="diaryRestoreWriting">Khôi phục thay đổi chưa lưu</button></div>
      <form id="diaryEditorForm">
        <nav class="diary-editor-tabs" aria-label="Nội dung chỉnh sửa"><button type="button" data-editor-tab="writing" aria-pressed="true" aria-controls="diaryWritingEditor">Lời viết</button><button type="button" data-editor-tab="photos" aria-pressed="false" aria-controls="diaryPhotoEditor">Ảnh mang về</button></nav>
        <div class="diary-editor-grid">
          <div id="diaryWritingEditor" class="crew-diary diary-writing-surface">
            <section class="diary-page diary-page-writing diary-writing-leaf">
              <header class="diary-page-head"><span>Vài dòng để nhớ</span><span>Bản nháp riêng</span></header>
              <div class="diary-author" id="diaryWritingAuthor"></div>
              <label class="diary-paper-title"><span class="diary-sr-only">Tên cho trang này</span><textarea id="diaryEditTitle" maxlength="100" rows="1" placeholder="Tên cho trang này…" autocomplete="off"></textarea></label>
              <label class="diary-paper-body"><span class="diary-sr-only">Vài dòng để nhớ</span><textarea id="diaryEditBody" class="diary-writing" maxlength="8000" rows="1" placeholder="Viết ở đây…"></textarea></label>
              <footer class="diary-page-tail"><span id="diaryTextCount"></span><span aria-hidden="true">01</span></footer>
            </section>
          </div>
          <div id="diaryPhotoEditor" hidden>
            <div class="diary-photo-workspace">
              <div class="diary-photo-preview crew-diary" id="diaryPhotoPreview" aria-label="Trang ảnh đang chỉnh sửa"></div>
              <div id="diaryCropTools" class="diary-frame-tools" hidden></div>
              <div id="diaryPhotoFields" class="diary-photo-note" hidden></div>
              <div class="diary-upload-curtain" hidden><span>Thả ảnh vào trang sổ</span></div>
            </div>
            <input hidden type="file" id="diaryFiles" accept="image/jpeg,image/png,image/webp" multiple tabindex="-1" aria-label="Chọn ảnh để dán vào trang">
            <p id="diaryPhotoHint" class="diary-photo-hint" role="status" aria-live="polite"></p>
            <p class="diary-form-status" id="diaryUploadStatus" role="status"></p>
            <div class="diary-photo-undo" id="diaryPhotoUndo" hidden><span>Đã cất ảnh.</span><button type="button" class="diary-secondary" data-undo-photo>Hoàn tác</button></div>
            <details class="diary-recovered" id="diaryRecoveredDrawer" hidden><summary>Ảnh đã cất <span id="diaryRecoveredCount"></span></summary><div id="diaryRecoveredPhotos"></div></details>
          </div>
        </div>
        <div class="diary-save-issue" id="diaryConflict" hidden><p id="diarySaveIssueText"></p><div class="diary-issue-actions"><button type="button" class="diary-primary" id="diaryRetrySave">Lưu lại</button><button type="button" class="diary-primary" id="diaryReloadDraft">Tải bản mới</button><button type="button" class="diary-secondary" id="diaryKeepWritingClose" title="Giữ thay đổi trong thẻ này rồi đóng">Giữ và đóng</button><button type="button" class="diary-secondary" id="diaryCopyWriting">Chép lời viết</button></div></div>
        <div class="diary-editor-footer"><p class="diary-form-status" id="diarySaveStatus" role="status"></p><small id="diaryDraftStamp" hidden>Bản nháp riêng · tự lưu khi cậu viết</small><div><button type="button" class="diary-secondary" data-close-editor>Đóng</button><button type="button" class="diary-secondary" id="diarySaveDraft">Lưu nháp</button><button type="submit" class="diary-primary" id="diaryPublish">Lưu vào sổ ↗</button></div></div>
      </form>
    </dialog>
    <dialog class="diary-dialog diary-sheet" id="diarySheet" aria-labelledby="diarySheetTitle"><button type="button" class="diary-dialog-close" data-close-sheet aria-label="Đóng trang đọc">×</button><p class="diary-eyebrow" id="diarySheetEyebrow"></p><h3 id="diarySheetTitle"></h3><div id="diarySheetContent"></div></dialog>`);

  function updateAuthMode() {
    const member = members.find(m => m.id === state.authMember);
    const slot = state.status.find(m => m.id === state.authMember);
    const claim = Boolean(slot && !slot.claimed && !slot.busy);
    $('diaryAuthMode').textContent = !slot ? 'Đang kiểm tra tên trong sổ…' : slot.busy ? 'Tên này đang được đặt mật khẩu. Thử lại sau một chút.' : claim ? `Chưa có mật khẩu cho ${member.name}. Đặt mật khẩu để giữ trang này.` : `Nhập mật khẩu của ${member.name}.`;
    $('diaryPasswordLabel').textContent = claim ? 'Đặt mật khẩu' : 'Mật khẩu';
    $('diaryPassword').autocomplete = claim ? 'new-password' : 'current-password';
    $('diaryConfirmField').hidden = !claim; $('diaryPasswordConfirm').required = claim;
    $('diaryFirstClaimNote').hidden = !claim;
    $('diaryAuthSubmit').disabled = !slot || Boolean(slot.busy) || state.authBusy;
    $('diaryAuthSubmit').textContent = state.authBusy ? 'Đang mở sổ…' : claim ? 'Đặt mật khẩu & mở sổ' : state.authPurpose === 'edit' ? 'Mở trang để sửa' : 'Mở sổ';
    $('diaryAuthForm').setAttribute('aria-busy', String(state.authBusy));
    [$('diaryPassword'), $('diaryPasswordConfirm'), $('diaryShowPassword')].forEach(input => { input.disabled = state.authBusy; });
    $('diaryAuth').querySelector('[data-close-auth]').disabled = state.authBusy;
    $('diaryAuth').querySelectorAll('[name="diaryMember"]').forEach(input => {
      input.disabled = state.authBusy || (state.authPurpose === 'edit' && input.value !== state.authMember);
    });
  }
  async function loadAuthStatus() {
    state.status = []; updateAuthMode(); $('diaryAuthRetry').hidden = true;
    try { state.status = await api.status(); if ($('diaryAuth').open) { updateAuthMode(); message('', false, $('diaryAuthStatus')); } }
    catch (error) { message(errorText(error), true, $('diaryAuthStatus')); $('diaryAuthRetry').hidden = false; }
  }
  async function showAuth(memberId, purpose) {
    settleMotion(); state.authMember = memberId; state.authPurpose = purpose; state.authBusy = false;
    $('diaryAuthForm').reset(); $('diaryPassword').type = 'password'; $('diaryPasswordConfirm').type = 'password';
    $('diaryAuthTitle').textContent = purpose === 'edit' ? 'Mở trang của ' + members.find(m => m.id === memberId).name : 'Cậu là ai nhỉ?';
    $('diaryAuthIntro').textContent = purpose === 'edit' ? 'Nhập mật khẩu của người viết để sửa trang này.' : 'Chọn tên của cậu để mở sổ nhé.';
    $('diaryAuth').querySelectorAll('[name="diaryMember"]').forEach(input => {
      input.checked = input.value === memberId;
      input.disabled = purpose === 'edit' && input.value !== memberId;
    });
    if (!$('diaryAuth').open) $('diaryAuth').showModal();
    await loadAuthStatus();
    if ($('diaryAuth').open && small.matches) $('diaryAuthTitle').focus?.({ preventScroll: true });
  }
  $('diaryAuthForm').addEventListener('change', event => {
    if (event.target.name === 'diaryMember') { state.authMember = event.target.value; updateAuthMode(); message('', false, $('diaryAuthStatus')); }
  });
  $('diaryShowPassword').addEventListener('change', event => {
    [$('diaryPassword'), $('diaryPasswordConfirm')].forEach(input => { input.type = event.target.checked ? 'text' : 'password'; });
  });
  $('diaryAuthRetry').addEventListener('click', loadAuthStatus);
  $('diaryAuthForm').addEventListener('submit', async event => {
    event.preventDefault(); if (state.authBusy) return;
    const slot = state.status.find(m => m.id === state.authMember);
    if (!slot || slot.busy) return;
    const claim = !slot.claimed, password = $('diaryPassword').value;
    if (!password.length) { message('Mật khẩu không được để trống.', true, $('diaryAuthStatus')); $('diaryPassword').focus(); return; }
    if (claim && password !== $('diaryPasswordConfirm').value) { message('Hai lần viết mật khẩu chưa giống nhau.', true, $('diaryAuthStatus')); $('diaryPasswordConfirm').focus(); return; }
    const memberId = state.authMember, purpose = state.authPurpose;
    state.authBusy = true; updateAuthMode(); message('Đang mở sổ…', false, $('diaryAuthStatus'));
    try {
      await api.login(memberId, password, claim);
      if (!await readEntries()) return;
      state.index = members.findIndex(m => m.id === memberId);
      $('diaryAuth').close(); await openReader(purpose !== 'edit');
      if (purpose === 'edit') await openEditor();
    } catch (error) {
      if (error.code === 'ALREADY_CLAIMED' || error.code === 'CLAIM_BUSY') {
        try { state.status = await api.status(); } catch (_) { /* Keep the original error. */ }
      }
      message(errorText(error), true, $('diaryAuth').open ? $('diaryAuthStatus') : $('diaryStatus'));
    } finally {
      state.authBusy = false; $('diaryPassword').value = ''; $('diaryPasswordConfirm').value = ''; updateAuthMode();
    }
  });
  const closeAuth = () => { if (!state.authBusy) $('diaryAuth').close(); };
  $('diaryAuth').querySelector('[data-close-auth]').addEventListener('click', closeAuth);
  $('diaryAuth').addEventListener('cancel', event => { if (state.authBusy) event.preventDefault(); });

  photoEditor = photoTools?.editor({
    getDraft: () => state.draft, locked: () => state.uploading || state.publishing,
    changed: editorChanged, renderFields: renderPhotoFields, hydrate, photoMarkup,
    owner: () => current().name, escape, upload: uploadFiles
  });
  function editorSnapshot() {
    return { title: $('diaryEditTitle').value, body: $('diaryEditBody').value,
      photos: state.draft?.photos.map(p => ({ ...p, ...(p.crop ? { crop: { ...p.crop } } : {}) })) || [] };
  }
  function editorChanged() {
    if (!state.draft) return;
    // Adding/restoring a photo can outgrow a previously valid composition.
    // Reduce the most recent custom frames by one step until every photo fits.
    let resized = false;
    for (const size of ['large', 'medium']) {
      for (const photo of [...state.draft.photos].reverse()) {
        if (!photoTools?.layout(state.draft.photos).fallback) break;
        if (photo.size !== size) continue;
        photo.size = size === 'large' ? 'medium' : 'small'; resized = true;
      }
    }
    if (resized) message('Đã thu gọn vài khung để mọi ảnh vừa trang.', false, $('diaryUploadStatus'));
    state.dirty = true; state.change++;
    $('diaryTextCount').textContent = [...$('diaryEditBody').value].length + ' / 8.000 ký tự';
    $('diaryDraftStamp').textContent = 'Có thay đổi chưa lưu';
    if (state.conflict) message('Có bản nháp mới. Thay đổi ở đây vẫn được giữ.', true, $('diarySaveStatus'));
    else message('Đang chờ tự lưu…', false, $('diarySaveStatus'));
    clearTimeout(state.saveTimer);
    if (!state.conflict) state.saveTimer = setTimeout(() => flushDraft().catch(() => {}), 950);
  }
  function renderPhotoFields() {
    const photos = state.draft?.photos || [], library = state.draft?.library || [];
    const recovered = library.filter(p => !photos.some(attached => attached.id === p.id));
    $('diaryRecoveredDrawer').hidden = !recovered.length;
    $('diaryRecoveredCount').textContent = `(${recovered.length})`;
    $('diaryRecoveredPhotos').innerHTML = recovered.length ? '<p>Đặt lại vào trang, hoặc xóa hẳn ảnh chưa dùng.</p>' + recovered.map((p, index) => `<div class="diary-recovered-item"><img data-private-photo="${escape(p.id)}" alt="Ảnh đã tải ${index + 1}" hidden><button type="button" class="diary-secondary" data-attach-photo="${escape(p.id)}">Đặt lại</button><button type="button" class="diary-secondary diary-danger" data-delete-photo="${escape(p.id)}">Xóa hẳn</button></div>`).join('') : '';
    photoEditor?.render();
    hydrate($('diaryPhotoEditor'));
  }
  function displayDraft(draft) {
    photoEditor?.clear();
    state.draft = draft; state.dirty = false; state.conflict = false; state.change = 0;
    $('diaryEditTitle').value = draft.title; $('diaryEditBody').value = draft.body;
    $('diaryWritingAuthor').innerHTML = `<img src="./${escape(current().image)}" alt="" width="72" height="78"><div><h3>${escape(current().name)}</h3><small>Tà Xùa · tháng mười, 2026</small></div>`;
    layoutWriting();
    sizeWritingTitle();
    $('diaryTextCount').textContent = [...draft.body].length + ' / 8.000 ký tự';
    $('diaryConflict').hidden = true; $('diaryPublish').disabled = false; renderPhotoFields();
    message('Bản nháp đã được lưu riêng.', false, $('diarySaveStatus'));
  }
  async function openEditor(tab = 'writing') {
    if (state.publishing) { message('Đang lưu vào sổ…'); return; }
    const owner = api.memberId();
    if (!owner || current().id !== owner || state.editorOpening || $('diaryEditor').open) return;
    state.editorOpening = true;
    message('Đang mở bản nháp riêng…');
    try {
      if (state.closePromise) await state.closePromise;
      const draft = await api.draft();
      if (!api.hasSession() || owner !== api.memberId() || current().id !== owner || !state.open) return;
      if (draft.member_id !== owner) { await showAuth(owner, 'edit'); return; }
      state.editorEpoch++; displayDraft(draft);
      $('diaryEditorTitle').textContent = 'Trang của ' + current().name;
      $('diaryRecovery').hidden = state.recovery?.memberId !== owner;
      $('diaryFiles').value = ''; message('', false, $('diaryUploadStatus')); message();
      $('diaryEditor').showModal(); photoEditor?.tab(tab);
      (tab === 'photos' ? $('diaryPhotoPreview').querySelector('[data-add-photos]') : $('diaryEditTitle')).focus({ preventScroll: true });
    } catch (error) {
      message(errorText(error), true);
      if (error.status === 401) await showAuth(owner, 'edit');
    } finally { state.editorOpening = false; }
  }
  async function flushDraft() {
    clearTimeout(state.saveTimer);
    if (state.savePromise) await state.savePromise;
    if (!state.draft || !state.dirty) return;
    if (state.conflict) throw new Error('DRAFT_CONFLICT');
    const epoch = state.editorEpoch, version = state.change, snapshot = editorSnapshot();
    message('Đang lưu bản nháp…', false, $('diarySaveStatus'));
    state.savePromise = api.saveDraft({ ...snapshot, revision: state.draft.revision }).then(saved => {
      if (epoch !== state.editorEpoch) return saved;
      state.draft.revision = saved.revision; state.draft.base_revision = saved.base_revision;
      state.draft.title = snapshot.title; state.draft.body = snapshot.body;
      if (version === state.change) state.dirty = false;
      message(state.dirty ? 'Còn thay đổi đang chờ lưu…' : 'Bản nháp đã được lưu riêng.', false, $('diarySaveStatus'));
      $('diaryDraftStamp').textContent = 'Bản nháp đã lưu';
      $('diaryConflict').hidden = true;
      return saved;
    }).catch(error => {
      if (epoch === state.editorEpoch) {
        state.conflict = ['DRAFT_CONFLICT', 'ENTRY_CONFLICT'].includes(error.code);
        showSaveIssue(error); $('diaryPublish').disabled = state.conflict;
      }
      throw error;
    }).finally(() => { state.savePromise = null; });
    await state.savePromise;
    if (state.dirty && !state.conflict && epoch === state.editorEpoch) return flushDraft();
  }
  function keepRecovery() {
    if (!state.draft) return null;
    const recovery = { ...editorSnapshot(), memberId: api.memberId() };
    state.recovery = recovery; return recovery;
  }
  function showSaveIssue(error) {
    const first = $('diaryConflict').hidden;
    $('diaryConflict').hidden = false;
    $('diarySaveIssueText').textContent = state.conflict ? 'Có bản nháp mới ở nơi khác. Thay đổi của cậu vẫn được giữ ở đây.' : 'Chưa lưu được. Cậu có thể thử lại hoặc đóng và giữ thay đổi trong thẻ này.';
    $('diaryReloadDraft').hidden = !state.conflict; $('diaryRetrySave').hidden = state.conflict;
    message('Chưa lưu được.', true, $('diarySaveStatus'));
    if (first && $('diaryEditor').open) requestAnimationFrame(() => {
      if (!$('diaryEditor').open || $('diaryConflict').hidden) return;
      $('diaryConflict').style.scrollMarginBottom = '16px';
      $('diaryConflict').scrollIntoView({ block: 'end', behavior: 'instant' });
    });
  }
  function closeEditor() {
    if (!$('diaryEditor').open) return;
    if (state.publishing) { $('diaryEditor').close(); message('Đang lưu vào sổ…'); return; }
    photoEditor?.finishCrop(true);
    const pending = state.savePromise, draft = state.draft, dirty = state.dirty, conflict = state.conflict;
    const recovery = dirty ? keepRecovery() : null;
    clearTimeout(state.saveTimer); state.editorEpoch++; state.dirty = false; state.draft = null; state.uploading = false;
    $('diaryEditor').close(); photoEditor?.clear();
    if (!dirty) return;
    message('Đã giữ thay đổi trong thẻ này. Đang thử lưu bản nháp…');
    const save = (async () => {
      try {
        if (conflict) throw new Error('DRAFT_CONFLICT');
        const previous = pending ? await pending : null;
        await api.saveDraft({ title: recovery.title, body: recovery.body, photos: recovery.photos, revision: previous?.revision ?? draft.revision });
        if (state.recovery === recovery) { state.recovery = null; message('Bản nháp đã lưu.'); }
      } catch (_) {
        if (state.recovery === recovery) message('Thay đổi đang được giữ trong thẻ này. Mở lại trang để khôi phục; đừng tải lại trang vội nhé.');
      }
    })();
    state.closePromise = save;
    save.finally(() => { if (state.closePromise === save) state.closePromise = null; });
  }
  $('diaryEditor').querySelectorAll('[data-close-editor]').forEach(button => button.addEventListener('click', closeEditor));
  $('diaryEditor').addEventListener('cancel', event => { event.preventDefault(); if (photoEditor?.cancelAction()) return; closeEditor(); });
  let backdropStart = false;
  const outsideEditor = event => {
    const r = $('diaryEditor').getBoundingClientRect();
    return event.target === $('diaryEditor') && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom);
  };
  $('diaryEditor').addEventListener('pointerdown', event => { backdropStart = outsideEditor(event); });
  $('diaryEditor').addEventListener('click', event => { if (backdropStart && outsideEditor(event)) closeEditor(); backdropStart = false; });
  function layoutWriting() {
    const source = document.querySelector('#diaryPages .diary-page-writing');
    const other = document.querySelector('#diaryPages .diary-page-photos');
    $('diaryWritingEditor').style.setProperty('--writing-width', (source?.clientWidth || other?.clientWidth || 460) + 'px');
    $('diaryEditor').classList.toggle('diary-editor-large-text', parseFloat(getComputedStyle(root).fontSize) > 20);
    sizeWritingTitle();
  }
  function sizeWritingTitle() {
    const title = $('diaryEditTitle'); title.style.height = 'auto';
    title.style.height = Math.max(parseFloat(getComputedStyle(title).lineHeight) || 36, title.scrollHeight) + 'px';
  }
  $('diaryEditTitle').addEventListener('input', () => { sizeWritingTitle(); editorChanged(); }); $('diaryEditBody').addEventListener('input', editorChanged);
  $('diarySaveDraft').addEventListener('click', () => { photoEditor?.finishCrop(true); flushDraft().catch(() => {}); });
  function lockEditor(locked) {
    state.publishing = locked;
    $('diaryEditor').querySelectorAll('input,textarea,button').forEach(control => { control.disabled = locked && !control.hasAttribute('data-close-editor'); });
    if (!locked) { renderPhotoFields(); $('diaryPublish').disabled = state.conflict; }
  }
  $('diaryEditorForm').addEventListener('submit', async event => {
    event.preventDefault(); if (state.uploading || state.publishing || state.conflict || !state.draft) return;
    photoEditor?.finishCrop(true);
    lockEditor(true);
    let published = false;
    try {
      await flushDraft();
      const saved = await api.publish({ revision: state.draft.revision, base_revision: state.draft.base_revision });
      published = true; state.draft = saved; state.dirty = false;
      await readEntries(); renderSpread();
      message('Đã lưu vào sổ.', false, $('diarySaveStatus'));
      $('diaryDraftStamp').textContent = 'Đã lưu vào sổ · bản nháp cũng được giữ';
    } catch (error) {
      state.conflict = ['DRAFT_CONFLICT', 'ENTRY_CONFLICT'].includes(error.code);
      showSaveIssue(error);
    } finally {
      lockEditor(false);
      if (!$('diaryEditor').open) {
        if (!published && state.dirty) keepRecovery();
        state.draft = null; photoEditor?.clear();
        message(published ? 'Đã lưu vào sổ.' : 'Chưa lưu vào sổ. Mở lại trang để giữ và kiểm tra bản nháp.');
      }
    }
  });
  $('diaryRetrySave').addEventListener('click', () => flushDraft().catch(() => {}));
  $('diaryCopyWriting').addEventListener('click', async () => {
    const text = $('diaryEditTitle').value + '\n\n' + $('diaryEditBody').value;
    try { await navigator.clipboard.writeText(text); message('Đã chép lời viết.', false, $('diarySaveStatus')); }
    catch (_) { $('diaryEditBody').focus(); $('diaryEditBody').select(); message('Đã chọn lời viết. Dùng thao tác sao chép của thiết bị nhé.', false, $('diarySaveStatus')); }
  });
  $('diaryKeepWritingClose').addEventListener('click', () => {
    photoEditor?.finishCrop(true);
    clearTimeout(state.saveTimer);
    state.recovery = { ...editorSnapshot(), memberId: api.memberId() };
    state.editorEpoch++; state.dirty = false; state.draft = null;
    $('diaryEditor').close(); photoEditor?.clear();
    message('Thay đổi chưa lưu đang được giữ trong thẻ này. Mở lại trang để khôi phục; đừng tải lại trang vội nhé.');
  });
  $('diaryReloadDraft').addEventListener('click', async () => {
    try { if (state.dirty) keepRecovery(); displayDraft(await api.draft()); $('diaryRecovery').hidden = state.recovery?.memberId !== api.memberId(); } catch (error) { message(errorText(error), true, $('diarySaveStatus')); }
  });
  $('diaryRestoreWriting').addEventListener('click', () => {
    if (state.recovery?.memberId !== api.memberId()) return;
    $('diaryEditTitle').value = state.recovery.title; $('diaryEditBody').value = state.recovery.body; sizeWritingTitle();
    state.draft.photos = state.recovery.photos.map(p => ({ ...p, ...(p.crop ? { crop: { ...p.crop } } : {}) }));
    state.recovery = null; $('diaryRecovery').hidden = true; renderPhotoFields(); editorChanged();
  });
  $('diaryPhotoEditor').addEventListener('input', event => {
    const id = event.target.dataset.caption || event.target.dataset.alt;
    const photo = state.draft?.photos.find(p => p.id === id);
    if (photo && !state.uploading && !state.publishing) { photo[event.target.dataset.caption ? 'caption' : 'alt'] = event.target.value; photoEditor?.updateCaption(photo, event.target); editorChanged(); }
  });
  $('diaryPhotoEditor').addEventListener('click', async event => {
    const button = event.target.closest('button'); if (!button || !state.draft || state.uploading || state.publishing) return;
    if (photoEditor?.cropping()) return;
    const photos = state.draft.photos;
    if (button.dataset.attachPhoto) {
      if (photos.length >= photoLimit) return;
      photos.push({ id: button.dataset.attachPhoto, caption: '', alt: 'Ảnh chuyến đi của ' + current().name }); editorChanged(); renderPhotoFields();
    } else if (button.dataset.deletePhoto) {
      button.disabled = true;
      try {
        await flushDraft(); await api.removePhoto(button.dataset.deletePhoto);
        state.draft.library = state.draft.library.filter(p => p.id !== button.dataset.deletePhoto); renderPhotoFields();
      } catch (error) { message(errorText(error), true, $('diaryUploadStatus')); button.disabled = false; }
    }
  });
  async function normalize(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('INVALID_IMAGE');
    if (file.size > 20 * 1024 * 1024) throw new Error('REQUEST_TOO_LARGE');
    let image, temporary;
    try {
      if (window.createImageBitmap) image = await createImageBitmap(file, { imageOrientation: 'from-image' });
      else {
        temporary = URL.createObjectURL(file); image = new Image(); image.src = temporary; await image.decode();
      }
      const width = image.width, height = image.height;
      if (!width || !height || width * height > 50000000) throw new Error('IMAGE_DIMENSIONS');
      const ratio = Math.min(1, 1600 / Math.max(width, height));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
      const context = canvas.getContext('2d'); context.fillStyle = '#fffaf0'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .86));
      if (blob?.size > 2097152) blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .72));
      canvas.width = 1; canvas.height = 1;
      if (!blob || blob.size > 2097152) throw new Error('REQUEST_TOO_LARGE');
      return blob;
    } catch (error) {
      if (['REQUEST_TOO_LARGE', 'IMAGE_DIMENSIONS'].includes(error.message)) throw error;
      throw new Error('INVALID_IMAGE');
    } finally { image?.close?.(); if (temporary) URL.revokeObjectURL(temporary); }
  }
  $('diaryFiles').addEventListener('change', event => uploadFiles([...event.target.files]));
  async function uploadFiles(files) {
    if (!state.draft || state.uploading || state.publishing || !files.length) return;
    photoEditor?.finishCrop(true);
    const epoch = state.editorEpoch;
    state.uploading = true; $('diaryFiles').disabled = true; $('diaryPublish').disabled = true;
    photoEditor?.refresh();
    $('diaryPhotoEditor').setAttribute('aria-busy', 'true');
    let failed = 0;
    for (const [index, file] of files.entries()) {
      if (epoch !== state.editorEpoch) break;
      let reservation;
      try {
        if (state.draft.photos.length >= photoLimit) throw new Error('PHOTO_LIMIT');
        message(`Đang chuẩn bị ảnh ${index + 1}/${files.length}…`, false, $('diaryUploadStatus'));
        const blob = await normalize(file);
        if (epoch !== state.editorEpoch) break;
        reservation = await api.reservePhoto();
        message(`Đang dán ảnh ${index + 1}/${files.length}…`, false, $('diaryUploadStatus'));
        const saved = await api.upload(reservation.id, blob);
        if (epoch !== state.editorEpoch || !state.draft) break;
        state.draft.library.push(saved); state.draft.photos.push({ id: saved.id, caption: '', alt: 'Ảnh chuyến đi của ' + current().name });
        editorChanged(); renderPhotoFields(); await flushDraft();
      } catch (error) {
        if (epoch !== state.editorEpoch) break;
        failed++; message(errorText(error), true, $('diaryUploadStatus'));
        if (reservation) {
          // A timeout may have completed on the server. Reloading the draft's
          // library can recover it; never delete an uncertain successful upload.
          try {
            const saved = await api.draft();
            if (epoch === state.editorEpoch && state.draft) { state.draft.library = saved.library; renderPhotoFields(); }
          } catch (_) { /* The pending words remain in the editor. */ }
        }
      }
    }
    if (epoch !== state.editorEpoch) return;
    state.uploading = false; $('diaryFiles').disabled = false; $('diaryFiles').value = ''; $('diaryPublish').disabled = state.conflict;
    $('diaryPhotoEditor').removeAttribute('aria-busy'); photoEditor?.refresh();
    if (!failed && epoch === state.editorEpoch) message('Ảnh đã ở trong bản nháp. Lưu vào sổ khi cậu sẵn sàng.', false, $('diaryUploadStatus'));
  }

  function showSheet(kind, photoId) {
    const saved = entry(); if (!saved || !api.hasSession()) return;
    const person = current(), sheet = $('diarySheet');
    $('diarySheetEyebrow').textContent = 'Trang của ' + person.name;
    sheet.classList.toggle('diary-photo-viewer', kind === 'photo');
    state.photoId = null;
    if (kind === 'writing') {
      $('diarySheetTitle').textContent = saved.title || 'Vài dòng để nhớ';
      $('diarySheetContent').innerHTML = '<div class="diary-full-writing">' + escape(saved.body) + '</div>';
    } else if (kind === 'photo') {
      const index = saved.photos.findIndex(p => p.id === photoId), photo = saved.photos[index];
      if (!photo) return;
      state.photoId = photo.id;
      $('diarySheetTitle').textContent = 'Ảnh mang về';
      const arrow = direction => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="${direction < 0 ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'}"/></svg>`;
      $('diarySheetContent').innerHTML = `<nav class="diary-photo-nav" aria-label="Chuyển ảnh"><button type="button" data-diary-photo-step="-1" aria-label="Ảnh trước" title="Ảnh trước"${index === 0 ? ' disabled' : ''}>${arrow(-1)}</button><span role="status" aria-live="polite" aria-atomic="true">Ảnh ${index + 1} / ${saved.photos.length}</span><button type="button" data-diary-photo-step="1" aria-label="Ảnh tiếp" title="Ảnh tiếp"${index === saved.photos.length - 1 ? ' disabled' : ''}>${arrow(1)}</button></nav><figure class="diary-photo-detail"><div class="diary-photo-detail-image"><img class="diary-full-photo" data-private-photo="${escape(photo.id)}" data-size="full" alt="${escape(photo.alt || 'Ảnh của ' + person.name)}" hidden><p class="diary-image-fallback">Đang mở ảnh…</p></div>${photo.caption ? `<figcaption>${escape(photo.caption)}</figcaption>` : ''}</figure>`;
    } else return;
    if (!sheet.open) sheet.showModal();
    hydrate(sheet); sheet.scrollTop = 0;
  }
  function stepPhoto(direction, moveFocus = false) {
    const photos = entry()?.photos || [], index = photos.findIndex(photo => photo.id === state.photoId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= photos.length) return;
    showSheet('photo', photos[next].id);
    if (moveFocus) {
      const button = $('diarySheetContent').querySelector(`[data-diary-photo-step="${direction}"]:not(:disabled)`)
        || $('diarySheetContent').querySelector('[data-diary-photo-step]:not(:disabled)');
      (button || $('diarySheet').querySelector('[data-close-sheet]')).focus({ preventScroll: true });
    }
  }
  const closeSheet = () => $('diarySheet').close();
  $('diarySheet').querySelector('[data-close-sheet]').addEventListener('click', closeSheet);
  $('diarySheet').addEventListener('close', () => { state.photoId = null; $('diarySheetContent').replaceChildren(); });
  $('diarySheetContent').addEventListener('click', event => {
    const button = event.target.closest('[data-diary-photo-step]');
    if (button && !button.disabled) stepPhoto(Number(button.dataset.diaryPhotoStep), true);
  });
  $('diarySheet').addEventListener('keydown', event => {
    if (!state.photoId || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); stepPhoto(event.key === 'ArrowLeft' ? -1 : 1, true);
    }
  });
  $('diaryPages').addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || state.turning) return;
    if (button.dataset.edit) {
      if (api.hasSession() && api.memberId() === current().id) openEditor(button.dataset.edit);
    } else if (button.hasAttribute('data-full-writing')) showSheet('writing');
    else if (button.dataset.viewPhoto) showSheet('photo', button.dataset.viewPhoto);
  });
  $('diaryBookmarks').innerHTML = members.map((m, i) => `<button type="button" class="diary-bookmark" data-bookmark="${i}" style="--ribbon:${ribbonColors[m.id] || '#6b7e79'};--ribbon-art:url('./figures/decor/painted/diary/bookmark_${m.id}.webp')" aria-label="Trang của ${escape(m.name)}" title="${escape(m.name)}" aria-pressed="${i === state.index}"><img class="diary-bookmark-portrait" src="./${escape(m.image)}" alt="" width="64" height="64" draggable="false"><span class="diary-bookmark-fallback" hidden aria-hidden="true">${escape(m.name)}</span></button>`).join('');
  $('diaryBookmarks').querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.hidden = true; img.nextElementSibling.hidden = false; }));
  $('diaryBookmarks').addEventListener('click', event => { const button = event.target.closest('[data-bookmark]'); if (button) goTo(Number(button.dataset.bookmark)); });
  root.querySelectorAll('[data-diary-side]').forEach(button => button.addEventListener('click', () => {
    if (state.turning) return;
    $('diaryBook').dataset.side = button.dataset.diarySide; applySide(); refreshLayout();
  }));
  $('diaryOpen').addEventListener('click', () => openDiary()); $('diaryClose').addEventListener('click', closeReader);
  $('diaryRefresh').addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try { await readEntries(); message(); }
    catch (error) { message(errorText(error), true); }
    finally { $('diaryRefresh').disabled = false; }
  });
  $('diaryLogout').addEventListener('click', async () => {
    try { await api.logout(); message('Đã đóng phiên đọc và cất sổ.'); }
    catch (_) { message('Đã cất sổ trên thiết bị này. Chưa xác nhận được đăng xuất với máy chủ.', true); }
    $('diaryOpen').focus({ preventScroll: true });
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && pageGesture) { event.preventDefault(); endPageGesture(null, true); return; }
    if (!state.open || event.target.matches('input,textarea,select') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); goTo(state.index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  // Native links keep the site's existing anchor travel and scroll controller.
  document.querySelectorAll('#crewGrid .member h3').forEach(heading => {
    const person = members.find(m => m.name === heading.textContent);
    if (!person) return;
    heading.innerHTML = `<a class="diary-crew-link" href="#crewDiary" data-diary-member="${escape(person.id)}" aria-label="Mở trang nhật ký của ${escape(person.name)}">${escape(person.name)}</a>`;
    heading.firstElementChild.addEventListener('click', () => openDiary(person.id));
  });
  function clearPrivate(reason) {
    settleMotion(false); clearTimeout(state.saveTimer); state.readEpoch++; state.editorEpoch++;
    if (reason === 'expired') photoEditor?.finishCrop(true);
    if (reason === 'expired' && state.draft && state.dirty) state.recovery = { ...editorSnapshot(), memberId: api.memberId() || current().id };
    else if (reason === 'logout') state.recovery = null;
    photoEditor?.clear();
    state.entries = []; state.draft = null; state.dirty = false; state.open = false; state.photoId = null;
    $('diaryPages').replaceChildren(); $('diarySheetContent').replaceChildren();
    $('diaryEditTitle').value = ''; $('diaryEditBody').value = ''; $('diaryPhotoFields').replaceChildren(); $('diaryRecoveredPhotos').replaceChildren();
    $('diaryReader').hidden = true; $('diaryClosed').hidden = false;
    ['diaryEditor', 'diarySheet'].forEach(id => { if ($(id).open) $(id).close(); });
    if (reason === 'expired') message(errorText({ code: 'SESSION_EXPIRED' }), true);
    refreshLayout();
  }
  window.addEventListener('taxua-diary-session', event => clearPrivate(event.detail.reason));
  window.addEventListener('resize', () => { settleMotion(); applySide(); if (state.draft) layoutWriting(); });
  let textResizeFrame = 0;
  if (window.ResizeObserver) new ResizeObserver(() => {
    if (textResizeFrame) return;
    // Apply layout changes in the next frame, outside ResizeObserver delivery.
    // WebKit otherwise reports a loop when a larger font changes paper height.
    textResizeFrame = requestAnimationFrame(() => {
      textResizeFrame = 0;
      if (state.draft) layoutWriting();
      const large = !small.matches && singleLayout();
      if (large !== root.classList.contains('diary-large-text')) { settleMotion(); applySide(); refreshLayout(); }
    });
  }).observe(root);
  reduced.addEventListener('change', () => settleMotion());
  new MutationObserver(() => { if (document.documentElement.dataset.motionPaused === 'true') settleMotion(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion-paused'] });
  document.addEventListener('visibilitychange', () => { if (document.hidden) settleMotion(); else if (state.open && api.hasSession()) readEntries().catch(error => message(errorText(error), true)); });
  window.addEventListener('pagehide', () => { settleMotion(); clearTimeout(state.saveTimer); });
  window.addEventListener('pageshow', event => { if (event.persisted && api.hasSession()) readEntries().catch(error => message(errorText(error), true)); });
  window.addEventListener('beforeunload', event => { if (state.dirty || state.uploading || state.recovery) { event.preventDefault(); event.returnValue = ''; } });
  setInterval(() => { if (state.open && api.hasSession() && !document.hidden && !state.busy) readEntries().catch(error => message(errorText(error), true)); }, 60000);
  // A stored session never reveals data before the server confirms it again.
  if (!api.configured) message('Sổ riêng cần kết nối mạng qua HTTP hoặc HTTPS. Lịch trình vẫn đọc được như thường.');
})();
