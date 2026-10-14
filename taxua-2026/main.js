// Content and useful controls render before (and independently of) GSAP.
// Classic script so both file:// and HTTP work without a runtime build.
function esc(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function money(value) { return new Intl.NumberFormat('vi-VN').format(value) + ' ₫'; }
function initArrivalCountdown() {
  const container = document.getElementById('arrivalCountdown');
  const copy = TRIP_DATA.countdown;
  const day = TRIP_DATA.days.find(day => day.blocks.some(block => block.id === 'arrival'));
  const arrival = day?.blocks.find(block => block.id === 'arrival');
  // Use the actual arrival event, never departure or the editorial scenery phase.
  // The offset keeps this Vietnam appointment identical in every visitor timezone.
  if (!container || !copy || !/^\d{4}-\d{2}-\d{2}$/.test(day?.dateISO) || !/^\d{2}:\d{2}$/.test(arrival?.time)) return;
  const arrivalISO = day.dateISO + 'T' + arrival.time + ':00+07:00';
  const target = Date.parse(arrivalISO);
  if (!Number.isFinite(target)) return;
  const [year,month,date] = day.dateISO.split('-');
  const dateLabel = date + '/' + month + '/' + year;
  container.innerHTML = `<p class="countdown-title" id="countdownTitle">${esc(copy.title)}</p>
    <div class="countdown-clock" role="timer" aria-live="off" aria-atomic="true" aria-labelledby="countdownTitle">
      <span class="sr-only" id="countdownSummary"></span>
      <div class="countdown-units" aria-hidden="true">${copy.units.map((label,index) => `<div class="countdown-unit${index === 0 ? ' countdown-unit--days' : ''}"><span class="countdown-number">00</span><span class="countdown-label">${esc(label)}</span></div>`).join('')}</div>
    </div>
    <p class="countdown-arrival">${esc(copy.arrivalNote)} <time datetime="${esc(arrivalISO)}">${esc(arrival.time)}, ${esc(dateLabel)}</time><span>${esc(copy.timezoneLabel)}</span></p>`;
  const numbers = Array.from(container.querySelectorAll('.countdown-number'));
  const title = container.querySelector('.countdown-title');
  const summary = container.querySelector('#countdownSummary');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let tick;
  let initialized = false;
  const update = () => {
    clearTimeout(tick);
    const seconds = Math.max(0,Math.ceil((target - Date.now()) / 1000));
    const values = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
    numbers.forEach((number,index) => {
      const value = String(values[index]).padStart(2,'0');
      if (number.textContent === value) return;
      number.textContent = value;
      if (initialized && !reduceMotion.matches && number.animate) {
        number.getAnimations().forEach(animation => animation.cancel());
        number.animate([{opacity:.55,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}], {
          duration:320,easing:'cubic-bezier(.2,.7,.2,1)'
        });
      }
    });
    const titleText = seconds ? copy.title : copy.arrived;
    if (title.textContent !== titleText) title.textContent = titleText;
    summary.textContent = seconds ? copy.title + ' ' + values.map((value,index) => value + ' ' + copy.units[index]).join(', ') : copy.arrived;
    container.classList.toggle('is-arrived',seconds === 0);
    initialized = true;
    container.hidden = false;
    // Recompute from the clock rather than decrementing: sleeping tabs cannot drift.
    if (seconds && !document.hidden) tick = setTimeout(update,1000 - Date.now() % 1000 + 8);
  };
  document.addEventListener('visibilitychange',() => { if (document.hidden) clearTimeout(tick); else update(); });
  addEventListener('pagehide',() => clearTimeout(tick));
  addEventListener('pageshow',update);
  reduceMotion.addEventListener('change',() => {
    if (reduceMotion.matches) numbers.forEach(number => number.getAnimations?.().forEach(animation => animation.cancel()));
  });
  update();
}
function stickerPath(name, theme = document.getElementById('scenery')?.dataset.phase) {
  return 'figures/decor/' + name + (['night','predawn','evening'].includes(theme) ? '_night.webp' : '_day.webp');
}
function stickerImage(name, className = 'sticker', phase) {
  return `<img class="${esc(className)}" data-sticker="${esc(name)}"${phase ? ` data-sticker-phase="${esc(phase)}"` : ''} src="./${stickerPath(name,phase)}" width="110" height="110" alt="" aria-hidden="true" loading="lazy" decoding="async">`;
}
function phaseIcon(phase) {
  return {night:'moon-star',predawn:'sunrise',dawn:'sunrise',morning:'sun',noon:'sun',afternoon:'sun',evening:'sunset'}[phase] || 'clock-3';
}
function photo(id, stopId, extraLabel, sizes) {
  const a = TRIP_ASSETS.assets[id];
  const stop = TRIP_ASSETS.stops[stopId];
  const caption = a.captionVi || (stop && stop.isIllustrative ? stop.captionVi : '');
  const alt = caption || (stop ? stop.altVi : a.label.replace(/[—–]/g, '-'));
  return `<figure class="photo-frame" data-asset-id="${esc(id)}">
    <img class="photo${a.fullFrame ? ' photo--full' : ''}" src="./${esc(a.src)}"
      srcset="${a.variants.map(v => './' + esc(v.src) + ' ' + v.width + 'w').join(', ')}"
      sizes="${esc(sizes || '(max-width: 767px) calc(100vw - 56px), (max-width: 1200px) 80vw, 1088px')}"
      width="${a.width}" height="${a.height}" style="object-position:${esc(a.crop)};--photo-ratio:${a.width} / ${a.height}"
      alt="${esc(alt)}" loading="lazy" decoding="async">
    ${caption ? `<figcaption class="image-note">${esc(caption)}</figcaption>` : (extraLabel ? `<figcaption class="extra-label">${esc(extraLabel)}</figcaption>` : '')}
  </figure>`;
}
function icon(name, className = '') {
  return `<svg class="lucide lucide-${esc(name)} ${esc(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#trip-${esc(name)}"></use></svg>`;
}
function renderFund() {
  const f = TRIP_DATA.fund;
  const titleWords = f.title.split(' ');
  document.getElementById('fundContent').innerHTML = `
    <div class="fund-copy">
      <p class="fund-eyebrow">${esc(f.eyebrow)}</p>
      <h2 id="fundTitle">${esc(titleWords.slice(0,-2).join(' '))} <span class="fund-place">${esc(titleWords.slice(-2).join(' '))}</span></h2>
      <p class="fund-intro">${esc(f.intro)}</p>
      <p class="fund-reminder">${esc(f.contributionIntro)} <strong>${money(f.amountPerPerson)}</strong> ${esc(f.contributionOutro)} ${esc(f.reminder)}</p>
    </div>
    <div class="fund-pocket">
      <div class="fund-illustration" aria-hidden="true">
        <span class="fund-coin fund-coin--one">₫</span><span class="fund-coin fund-coin--two">₫</span>
        ${icon('piggy-bank','fund-pig')}
        <span class="fund-pig-note">${esc(f.pigNote)}</span>
      </div>
      <div class="fund-tally"><p class="fund-amount"><strong>${new Intl.NumberFormat('vi-VN').format(f.amountPerPerson)}</strong><span>₫ / ${esc(f.amountLabel)}</span></p></div>
      <div class="fund-arrow" aria-hidden="true"><svg viewBox="0 0 150 95" fill="none"><path d="M140 8C141 75 72 91 15 55m0 0 9 23m-9-23 26-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </div>
    <div class="fund-action">
      <a class="fund-link" href="${esc(f.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(f.action)} — ${esc(f.actionHint)} (tab mới)">${esc(f.action)} ${icon('move-up-right')}</a>
      <p class="fund-link-hint">${esc(f.actionHint)} <span aria-hidden="true">↗</span></p>
      <p class="fund-scribble">${esc(f.scribble)}</p>
    </div>`;
}
function renderEventBody(block) {
  const guide = block.showPlaceGuide !== false && TRIP_DATA.placeGuides[block.stopId];
  const note = block.storyNote === undefined ? block.note : block.storyNote;
  return `<div class="event-body${guide ? ' event-body--place' : ''}">
    <div class="event-meta"><span class="time-stamp">${icon(phaseIcon(block.phase))}${block.time != null ? `<time>${esc(block.time)}</time>` : `<span>${esc(block.period)}<small>Chưa chốt giờ</small></span>`}</span>${block.optional ? '<span class="optional">Tùy chọn</span>' : ''}</div>
    <h3>${esc(block.storyTitle || block.activity)}</h3>
    ${block.storyCue ? `<p class="story-cue">${esc(block.storyCue)}</p>` : ''}
    ${guide ? renderPlaceGuide(guide) : (!block.storyCue ? `<p class="event-description">${esc(block.description)}</p>` : '')}
    ${block.nearby ? `<div class="nearby">${block.nearby.map(name => `<span>${esc(name)}</span>`).join('')}</div>` : ''}
    ${block.annotation ? `<p class="annotation">${icon('move-up-right')}${esc(block.annotation)}</p>` : ''}
    ${block.warning ? `<p class="warning">${icon('flag')}${esc(block.warning)}${block.id === 'stars' ? ' Gợi ý 18:30-20:30 trùng bữa tối 19:15.' : ''}</p>` : ''}
    ${Number.isFinite(block.cost) ? `<p class="cost">${icon('coins')}Dự kiến ${money(block.cost)}/người${block.cost === 0 ? ' theo lịch nhóm' : ''}</p>` : ''}
    ${note ? `<div class="event-notebook"><button class="note-toggle" type="button" data-note-toggle aria-expanded="false" aria-controls="note-${esc(block.id)}">${icon('notebook-pen')}<span>Ghi chú</span>${icon('plus','note-sign')}</button><div class="note-sheet" id="note-${esc(block.id)}" hidden><p>${esc(note)}</p></div></div>` : ''}
  </div>`;
}
function renderPlaceGuide(guide) {
  return guide.paragraphs.map(text => `<p class="event-description place-description">${esc(text)}</p>`).join('') +
    `<p class="place-source"><a href="${esc(guide.source.url)}" target="_blank" rel="noopener noreferrer" aria-label="Đọc thêm về ${esc(guide.name)} tại ${esc(guide.source.label)} (tab mới)">Đọc thêm · ${esc(guide.source.label)} ${icon('move-up-right')}</a></p>`;
}
function renderPhotoDeck(block) {
  const ids = block.photoIds || [];
  if (!ids.length) return '';
  const sizes = block.kind === 'rest' ? '(max-width:767px) 70vw, 190px' : '(max-width:767px) 85vw, (max-width:1200px) 45vw, 540px';
  return `<div class="postcard${ids.length > 1 ? ' photo-deck' : ''}"${ids.length > 1 ? ' data-photo-deck' : ''}>
    ${ids.map((id,index) => `<div class="deck-slide"${index ? ' hidden' : ''}>${photo(id,block.stopId,null,sizes)}</div>`).join('')}
    ${ids.length > 1 ? `<div class="deck-controls"><span class="deck-count" aria-live="polite" aria-atomic="true">Góc 1 / ${ids.length}</span><button type="button" data-photo-step="-1" aria-label="Ảnh trước: ${esc(block.activity)}">${icon('arrow-left')}</button><button type="button" data-photo-step="1" aria-label="Ảnh tiếp: ${esc(block.activity)}">${icon('arrow-right')}</button></div>` : ''}
  </div>`;
}
function renderEvent(block, dayIndex) {
  const ids = block.photoIds || [];
  let inner = renderPhotoDeck(block) + renderEventBody(block);
  if (block.kind === 'stay') {
    const roomNames = { P16: 'Mùa Trứ Homestay', P17: 'Căn Best view 2', P18: 'Căn Best view 4' };
    inner = renderEventBody(block) + `<div class="stay-photos">${ids.map(id => photo(id, block.stopId, roomNames[id], '(max-width:767px) 80vw, 420px')).join('')}</div>`;
  }
  if (block.kind === 'note') inner = renderEventBody(block) + (block.sticker ? `<span class="sticker schedule-icon" aria-hidden="true">${icon(phaseIcon(block.phase))}</span>` : '');
  if (block.kind === 'transit') inner = `<div class="transit-heading">${icon('bus','transit-icon')}<span>gogo / Tà Xùa</span>${icon('ticket')}</div>` + renderEventBody(block);
  if (block.kind === 'cluster') {
    inner = `<div class="cluster-intro">${renderEventBody(block)}</div><div class="cluster-grid">${block.places.map((place,index) => `<article class="cluster-card" id="place-${esc(place.stopId)}" data-stop-id="${esc(place.stopId)}"><div class="postcard">${photo(place.photoIds[0],place.stopId,null,'(max-width:767px) 80vw, (max-width:1200px) 45vw, 500px')}</div><div class="event-body event-body--place"><p class="place-number">${String(index + 1).padStart(2,'0')} / dừng chân</p><h4>${esc(place.name)}</h4>${renderPlaceGuide(TRIP_DATA.placeGuides[place.stopId])}${place.stopId === 'mom_ca_heo' ? `<p class="warning">${icon('flag')}Giữ khoảng cách với mép đá; chọn chỗ đứng vững.</p>` : ''}</div></article>`).join('')}</div>`;
  }
  return `<article class="event event--${esc(block.kind)}" id="${esc(block.id)}" data-source-row="${block.sourceRow}" data-visual="${ids.length || block.places ? 'photo' : block.sticker ? 'sticker' : 'text'}" data-phase="${esc(block.phase)}" data-scenery-chapter="${esc(block.sceneryChapter)}"${block.phaseEnd ? ` data-phase-end="${esc(block.phaseEnd)}" data-scenery-chapter-end="${esc(block.sceneryChapterEnd)}"` : ''} data-day="day-${dayIndex}"${block.stopId ? ` data-stop-id="${block.stopId}"` : ''}${block.backdrop ? ` data-backdrop="${block.backdrop}"` : ''}><div class="event-inner">${inner}</div></article>`;
}
function renderDays() {
  const days = TRIP_DATA.days;
  document.getElementById('daysList').innerHTML = days.map((day,index) => `${index > 0 ? `<header class="day-heading" id="day-${index}" data-phase="predawn" data-scenery-chapter="${esc(day.sceneryChapter)}" data-day="day-${index}"><div class="day-date"><strong>${esc(day.label)}</strong><time datetime="${esc(day.dateISO)}">${esc(day.weekday)}, ${esc(day.date)}/2026</time></div><h2>${esc(day.title)}</h2><p>${esc(day.summary)}</p><a class="reading-copy" href="./itinerary.html#schedule-${index}">Xem giờ giấc & ghi chú ↗</a>${stickerImage(index === 1 ? 'shan_tea' : index === 2 ? 'dino_ridge' : 'mountain_sky','sticker','morning')}</header>` : ''}${day.blocks.map(block => renderEvent(block,index)).join('')}`).join('');
}
function renderCrew() {
  const members = TRIP_DATA.members;
  document.getElementById('crewCount').textContent = '(' + members.length + ' mống)';
  document.getElementById('footerCount').textContent = 'Tà Xùa 2026 · Ấn bản nội bộ cho ' + members.length + ' đồng bọn';
  const count = members.length === 7 ? 'Bảy đứa' : members.length + ' đứa';
  if (members.length !== 7) document.getElementById('heroTitle').innerHTML = esc(count) + ',<br><em>một biển mây.</em>';
  document.getElementById('heroDate').textContent = '22-25/10/2026 · Tà Xùa, Sơn La';
  document.getElementById('heroSub').textContent = TRIP_DATA.subtitle;
  document.getElementById('crewGrid').innerHTML = members.map(member => `<article class="member"><div class="avatar"><span>${esc(member.name.charAt(0).toUpperCase())}</span>${member.image ? `<img src="./${esc(member.image)}" alt="${esc(member.name)}" loading="lazy" width="52" height="52">` : ''}</div><div><h3>${esc(member.name)}</h3><p>${esc(member.role)}</p></div></article>`).join('');
  document.querySelectorAll('.avatar img').forEach(img => img.addEventListener('error',() => img.remove()));
}
function renderPacking() {
  const p = TRIP_DATA.packingList;
  const key = 'taxua-2026-packing';
  let checked = [];
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved)) checked = saved.filter(n => Number.isInteger(n) && n >= 0 && n < p.items.length);
  } catch (_) {}
  document.getElementById('packingTitle').textContent = p.title;
  document.getElementById('packingNote').textContent = p.note;
  const list = document.getElementById('packingList');
  list.innerHTML = p.items.map((item,index) => `<li><label><input type="checkbox" value="${index}"${checked.includes(index) ? ' checked' : ''}><span>${esc(item.text)}${item.why ? `<small>${esc(item.why)}</small>` : ''}</span></label></li>`).join('');
  const update = () => {
    const chosen = Array.from(list.querySelectorAll('input:checked')).map(input => Number(input.value));
    document.getElementById('packingStatus').textContent = 'Đã chuẩn bị ' + chosen.length + '/' + p.items.length + ' món';
    try { localStorage.setItem(key,JSON.stringify(chosen)); } catch (_) {}
  };
  list.addEventListener('change',event => {
    update();
    window.JourneyMotion?.packing?.(event.target.closest('label'));
  });
  update();
}
function renderSupportingContent() {
  const targets = ['dinosaur-ridge','place-mom_ca_heo','place-cay_co_don','khe-cai'];
  document.getElementById('destinationsGrid').innerHTML = TRIP_DATA.destinations.map((place,index) => `<a href="#${targets[index]}">${stickerImage(place.image.match(/decor\/(.+)_day/)[1],'destination-sticker')}<div><h3>${esc(place.name)}</h3><p>${esc(place.desc)}</p></div></a>`).join('');
  document.getElementById('foodGrid').innerHTML = TRIP_DATA.food.map(item => `<article class="dish">${stickerImage(item.image.match(/decor\/(.+)_day/)[1],'food-sticker')}<div><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p></div></article>`).join('');
  const t = TRIP_DATA.itinerary;
  document.getElementById('tripFacts').innerHTML = `<dl class="trip-facts"><div><dt>Hai đêm ở</dt><dd>${esc(t.stay)}</dd></div><div><dt>Đêm 22/10, Hà Nội</dt><dd>Đón 21:30 tại Tập đoàn Viettel, đi 22:00. Xác nhận điểm đón cụ thể với nhà xe.</dd></div><div><dt>Trưa 25/10, Tà Xùa</dt><dd>Xe về xuất phát 12:30, chưa chốt giờ đến Hà Nội.</dd></div><div><dt>Chuyển phòng</dt><dd>12:00 ngày 24/10, nhớ chuyển hành lý sang phòng mới.</dd></div></dl><div class="practical-costs">${t.costs.map(item => `<p>${esc(item.label)}<strong>${money(item.value)}</strong>${esc(item.scope)}, dự kiến</p>`).join('')}</div><p class="cost-note">${esc(t.costNote)}</p><p class="cost-note"><a href="${esc(t.sourceUrl)}" target="_blank" rel="noopener noreferrer">Xem lịch nhóm gốc ↗</a></p>`;
}
function initScrapbook() {
  document.querySelectorAll('[data-note-toggle]').forEach(button => button.addEventListener('click',() => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded',String(open));
    const sheet = document.getElementById(button.getAttribute('aria-controls'));
    if (window.JourneyMotion?.note) window.JourneyMotion.note(sheet,open);
    else sheet.hidden = !open;
  }));
  document.querySelectorAll('[data-photo-deck]').forEach(deck => {
    const slides = Array.from(deck.querySelectorAll('.deck-slide'));
    let index = 0;
    deck.querySelectorAll('[data-photo-step]').forEach(button => button.addEventListener('click',() => {
      const previous = index;
      const direction = Number(button.dataset.photoStep);
      index = (index + direction + slides.length) % slides.length;
      if (window.JourneyMotion?.deck) window.JourneyMotion.deck(deck,slides,previous,index,direction);
      else slides.forEach((slide,i) => { slide.hidden = i !== index; });
      deck.querySelector('.deck-count').textContent = 'Góc ' + (index + 1) + ' / ' + slides.length;
      window.JourneyMotion?.refresh();
    }));
  });
}
function initNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const mobile = matchMedia('(max-width:1023px)');
  const setOpen = open => {
    const changed = links.classList.contains('open') !== open;
    links.classList.toggle('open',open);
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open ? 'Đóng menu' : 'Mở menu');
    links.inert = mobile.matches && !open;
    if (changed && mobile.matches) window.JourneyMotion?.menu?.(links,open);
    if (!mobile.matches) links.classList.remove('closing');
  };
  toggle.addEventListener('click',() => setOpen(!links.classList.contains('open')));
  links.querySelectorAll('a').forEach(link => link.addEventListener('click',() => setOpen(false)));
  mobile.addEventListener('change',() => setOpen(false));
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape' && links.classList.contains('open')) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click',event => {
    if (links.classList.contains('open') && !event.target.closest('.nav')) setOpen(false);
  });
  setOpen(false);
}
const JourneyUI = (() => {
  let fallbackRunning = false;
  let frame = 0;
  let lastKey = '';
  let sceneRequest = 0;
  const backgrounds = new Map();
  const sections = () => Array.from(document.querySelectorAll('.hero, .day-heading, .event, #fund, #crew'));
  function sceneFor(element, phaseOverride) {
    const phase = phaseOverride || element.dataset.phase || 'opening';
    const chapter = phaseOverride && phaseOverride === element.dataset.phaseEnd ? element.dataset.sceneryChapterEnd : element.dataset.sceneryChapter;
    return {...JOURNEY_SCENES[phase],phase,background:element.dataset.backdrop || JOURNEY_CHAPTERS[chapter] || JOURNEY_SCENES[phase].background};
  }
  function setChapter(element, phaseOverride) {
    document.querySelectorAll('[data-chapter]').forEach(link => {
      if (link.dataset.chapter === element.dataset.day) link.setAttribute('aria-current','true');
      else link.removeAttribute('aria-current');
    });
    const scene = sceneFor(element,phaseOverride);
    const weather = document.getElementById('chapterWeather');
    if (weather.textContent !== scene.label) {
      weather.textContent = scene.label;
      window.JourneyMotion?.label?.(weather);
    }
    document.getElementById('scenery').dataset.phase = scene.phase;
    document.documentElement.dataset.scene = scene.phase;
    document.documentElement.dataset.navTone = ['B02','B03'].includes(scene.background) ? 'light' : 'dark';
    // Schedule artwork belongs to its own period, independently of scrolling.
    document.querySelectorAll('img[data-sticker]:not([data-sticker-phase])').forEach(img => {
      const next = './' + stickerPath(img.dataset.sticker,scene.phase);
      if (window.JourneyMotion?.sticker) window.JourneyMotion.sticker(img,next);
      else if (img.getAttribute('src') !== next) img.src = next;
    });
  }
  function loadBackground(id) {
    const img = document.querySelector('[data-background="' + id + '"]');
    if (img && !img.getAttribute('src')) img.src = img.dataset.src;
    if (!img) return Promise.resolve(false);
    const src = img.currentSrc || img.src;
    if (!backgrounds.has(src)) backgrounds.set(src,img.decode().then(() => true,() => false));
    return backgrounds.get(src);
  }
  function applyScene(element,phaseOverride) {
    const scene = sceneFor(element,phaseOverride);
    const request = ++sceneRequest;
    const incoming = document.querySelector('[data-background="' + scene.background + '"]');
    const show = () => {
      if (request !== sceneRequest) return;
      document.querySelectorAll('.scene-photo').forEach(img => { img.style.opacity = img.dataset.background === scene.background ? 1 : 0; });
    };
    const decoded = loadBackground(scene.background);
    if (incoming?.complete && incoming.naturalWidth) show();
    else decoded.then(ok => { if (ok) show(); });
    setChapter(element,phaseOverride);
  }
  function syncFallback() {
    frame = 0;
    if (!fallbackRunning) return;
    const all = sections();
    const cursor = scrollY + innerHeight * .46;
    let index = 0;
    all.forEach((el,i) => { if (el.getBoundingClientRect().top + scrollY <= cursor) index = i; });
    const element = all[index];
    const next = all[index + 1];
    const start = element.getBoundingClientRect().top + scrollY;
    const end = next ? next.getBoundingClientRect().top + scrollY : document.documentElement.scrollHeight;
    const phase = element.dataset.phaseEnd && cursor >= start + (end - start) * .75 ? element.dataset.phaseEnd : element.dataset.phase;
    const key = element.id + ':' + phase;
    if (key !== lastKey) { lastKey = key; applyScene(element,phase); }
    document.querySelector('.chapter-progress').style.setProperty('--progress',scrollY / Math.max(1,document.documentElement.scrollHeight - innerHeight));
  }
  function queueFallback() { if (!frame) frame = requestAnimationFrame(syncFallback); }
  function startFallback() {
    stopFallback();
    fallbackRunning = true; lastKey = '';
    addEventListener('scroll',queueFallback,{passive:true});
    addEventListener('resize',queueFallback);
    syncFallback();
  }
  function stopFallback() {
    sceneRequest++;
    fallbackRunning = false;
    removeEventListener('scroll',queueFallback); removeEventListener('resize',queueFallback);
    if (frame) cancelAnimationFrame(frame); frame = 0;
  }
  function initBackgrounds() {
    document.getElementById('scenePhotos').insertAdjacentHTML('beforeend',['B02','B03','B04','B05'].map(id => {
      const a = TRIP_ASSETS.assets[id];
      const coverWidth = Math.max(innerWidth,innerHeight * a.width / a.height) * Math.min(devicePixelRatio || 1,1.5);
      const variant = a.variants.find(v => v.width >= coverWidth) || a.variants[a.variants.length - 1];
      return `<img class="scene-photo" data-background="${id}" data-src="./${variant.src}" width="${variant.width}" height="${variant.height}" alt="" decoding="async">`;
    }).join(''));
    applyScene(document.getElementById('top'));
    // A phone-loaded portrait sky must also stay sharp after a desktop resize.
    let resizeTimer;
    addEventListener('resize',() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        document.querySelectorAll('.scene-photo:not([data-background="B01"])').forEach(img => {
          const a = TRIP_ASSETS.assets[img.dataset.background];
          const coverWidth = Math.max(innerWidth,innerHeight * a.width / a.height) * Math.min(devicePixelRatio || 1,1.5);
          const variant = a.variants.find(v => v.width >= coverWidth) || a.variants[a.variants.length - 1];
          if (variant.width <= Number(img.getAttribute('width'))) return;
          img.dataset.src = './' + variant.src;
          img.setAttribute('width',variant.width); img.setAttribute('height',variant.height);
          if (img.getAttribute('src')) img.src = img.dataset.src;
        });
      },100);
    });
    if ('IntersectionObserver' in window) {
      const nearby = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadBackground(sceneFor(entry.target).background);
          if (entry.target.dataset.phaseEnd) loadBackground(sceneFor(entry.target,entry.target.dataset.phaseEnd).background);
        }
      }),{rootMargin:'100% 0px',threshold:0});
      sections().forEach(el => nearby.observe(el));
    }
  }
  return {sceneFor,setChapter,loadBackground,applyScene,startFallback,stopFallback,initBackgrounds};
})();
function boot() {
  renderDays(); renderFund(); renderCrew(); renderPacking(); renderSupportingContent();
  initArrivalCountdown();
  initScrapbook(); initNav();
  JourneyUI.initBackgrounds(); JourneyUI.startFallback();
}
boot();
