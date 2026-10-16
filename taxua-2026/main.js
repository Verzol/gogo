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
      if (initialized && !reduceMotion.matches && document.documentElement.dataset.motionPaused !== 'true' && number.animate) {
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
function photo(id, stopId, extraLabel, sizes, moment) {
  const a = TRIP_ASSETS.assets[id];
  const stop = TRIP_ASSETS.stops[stopId];
  const caption = a.captionVi || (stop && stop.isIllustrative ? stop.captionVi : '');
  const alt = caption || (stop ? stop.altVi : a.label.replace(/[—–]/g, '-'));
  const canTurn = moment && !['rest','stay'].includes(moment.kind);
  const day = moment && TRIP_DATA.days.find(day => day.blocks.some(block => block.id === moment.id));
  const name = (extraLabel || stop?.name || moment?.activity || alt).replace(/[—–]/g, '-');
  const backId = canTurn ? 'photo-back-' + moment.id + '-' + id : '';
  const image = `<img class="photo${a.fullFrame ? ' photo--full' : ''}" src="./${esc(a.src)}"
      srcset="${a.variants.map(v => './' + esc(v.src) + ' ' + v.width + 'w').join(', ')}"
      sizes="${esc(sizes || '(max-width: 767px) calc(100vw - 56px), (max-width: 1200px) 80vw, 1088px')}"
      width="${a.width}" height="${a.height}" style="object-position:${esc(a.crop)};--photo-ratio:${a.width} / ${a.height}"
      alt="${esc(alt)}" loading="lazy" decoding="async">`;
  return `<figure class="photo-frame" data-asset-id="${esc(id)}">
    ${canTurn ? `<button class="photo-object" type="button" data-photo-object data-photo-turn aria-pressed="false" aria-controls="${esc(backId)}" aria-label="Xem mặt sau ảnh: ${esc(name)}. ${esc(alt)}">
      <span class="photo-front">${image}</span>
      <span class="photo-back" id="${esc(backId)}" aria-hidden="true" inert>
        <span class="photo-back-heading">${icon('camera')}<span>${esc(name)}</span></span>
        <span class="photo-date">Trong lịch trình <time datetime="${esc(day.dateISO)}">${esc(day.date)}/2026</time>${moment.time == null ? '' : ' lúc ' + esc(moment.time)}</span>
        ${moment.storyCue ? `<span class="photo-inscription">${esc(moment.storyCue)}</span>` : ''}
        <span class="photo-credit"><span>Nguồn ảnh</span>${esc(a.credit)}</span>
      </span>
    </button>` : image}
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
    `<p class="place-source"><a href="${esc(guide.source.url)}" target="_blank" rel="noopener noreferrer" aria-label="Đọc thêm · ${esc(guide.source.label)}: ${esc(guide.name)} (tab mới)">Đọc thêm · ${esc(guide.source.label)} ${icon('move-up-right')}</a></p>`;
}
function renderPhotoDeck(block) {
  const ids = block.photoIds || [];
  if (!ids.length) return '';
  const sizes = block.kind === 'rest' ? '(max-width:767px) 70vw, 190px' : '(max-width:767px) 85vw, (max-width:1200px) 45vw, 540px';
  return `<div class="postcard${ids.length > 1 ? ' photo-deck' : ''}"${ids.length > 1 ? ' data-photo-deck' : ''}>
    ${ids.map((id,index) => `<div class="deck-slide"${index ? ' hidden' : ''}>${photo(id,block.stopId,null,sizes,block)}</div>`).join('')}
    ${ids.length > 1 ? `<div class="deck-previews" role="group" aria-label="Chọn góc ảnh: ${esc(block.activity)}">${ids.map((id,index) => {
      const a = TRIP_ASSETS.assets[id];
      return `<button type="button" class="deck-preview" data-photo-select="${index}" aria-label="Góc ${index + 1}: ${esc(a.captionVi || a.label)}" aria-pressed="${index === 0}"${index === 0 ? ' hidden' : ''}><span class="deck-preview-print"><img src="./${esc(a.variants[0].src)}" width="${a.width}" height="${a.height}" alt="" loading="lazy" decoding="async"></span></button>`;
    }).join('')}</div><div class="deck-controls"><span class="deck-count" aria-live="polite" aria-atomic="true">Góc 1 / ${ids.length}</span><button type="button" data-photo-step="-1" aria-label="Ảnh trước: ${esc(block.activity)}">${icon('arrow-left')}</button><button type="button" data-photo-step="1" aria-label="Ảnh tiếp: ${esc(block.activity)}">${icon('arrow-right')}</button></div>` : ''}
  </div>`;
}
function renderEvent(block, dayIndex) {
  const ids = block.photoIds || [];
  let inner = renderPhotoDeck(block) + renderEventBody(block);
  if (block.kind === 'stay') {
    const roomNames = { P16: 'Mùa Trứ Homestay', P17: 'Căn Best view 2', P18: 'Căn Best view 4' };
    inner = renderEventBody(block) + `<div class="stay-photos">${ids.map(id => photo(id, block.stopId, roomNames[id], '(max-width:767px) 80vw, 420px',block)).join('')}</div>`;
  }
  if (block.kind === 'note') inner = renderEventBody(block) + (block.sticker ? `<span class="sticker schedule-icon" aria-hidden="true">${icon(phaseIcon(block.phase))}</span>` : '');
  if (block.kind === 'transit') inner = `<div class="transit-heading"><img class="travel-art" src="./figures/decor/painted/bus_sticker.webp" width="110" height="82" alt="" loading="lazy"><span>gogo / Tà Xùa</span>${icon('ticket')}</div>` + renderEventBody(block);
  if (block.kind === 'cluster') {
    inner = `<div class="cluster-intro">${renderEventBody(block)}</div><div class="cluster-grid">${block.places.map((place,index) => `<article class="cluster-card" id="place-${esc(place.stopId)}" data-stop-id="${esc(place.stopId)}"><div class="postcard">${photo(place.photoIds[0],place.stopId,null,'(max-width:767px) 80vw, (max-width:1200px) 45vw, 500px',block)}</div><div class="event-body event-body--place"><p class="place-number">${String(index + 1).padStart(2,'0')} / dừng chân</p><h4>${esc(place.name)}</h4>${renderPlaceGuide(TRIP_DATA.placeGuides[place.stopId])}${place.stopId === 'mom_ca_heo' ? `<p class="warning">${icon('flag')}Giữ khoảng cách với mép đá; chọn chỗ đứng vững.</p>` : ''}</div></article>`).join('')}</div>`;
  }
  return `<article class="event event--${esc(block.kind)}" id="${esc(block.id)}" data-source-row="${block.sourceRow}" data-visual="${ids.length || block.places ? 'photo' : block.sticker ? 'sticker' : 'text'}" data-phase="${esc(block.phase)}" data-scenery-chapter="${esc(block.sceneryChapter)}"${block.phaseEnd ? ` data-phase-end="${esc(block.phaseEnd)}" data-scenery-chapter-end="${esc(block.sceneryChapterEnd)}"` : ''} data-day="day-${dayIndex}"${block.stopId ? ` data-stop-id="${block.stopId}"` : ''}${block.backdrop ? ` data-backdrop="${block.backdrop}"` : ''}><div class="event-inner">${inner}</div></article>`;
}
function renderDays() {
  const days = TRIP_DATA.days;
  document.getElementById('dayOverview').innerHTML = `<h2 id="overviewTitle">Chuyến đi, từng ngày</h2>${days.map(day => `<details class="day-overview"><summary><time datetime="${esc(day.dateISO)}">${esc(day.date)}</time><span>${esc(day.label)}</span></summary><p>${esc(day.summary)}</p><ol>${day.blocks.map(block => `<li><a href="#${esc(block.id)}"><span>${esc(block.time == null ? block.period : block.time)}</span>${esc(block.storyTitle || block.activity)}</a></li>`).join('')}</ol></details>`).join('')}`;
  document.querySelectorAll('.day-overview').forEach(detail => detail.addEventListener('toggle',() => window.JourneyMotion?.refresh()));
  document.getElementById('trailStops').innerHTML = days.map((day,index) => `<section data-trail-day="day-${index}"${index ? ' hidden' : ''} aria-labelledby="trail-day-${index}"><div class="trail-heading"><img src="./figures/${index < 2 ? 'decor' : 'scenery'}/painted/${['bus_sticker','cloud_coffee_sticker','solitary_tree','lake'][index]}.webp" width="68" height="68" alt=""><div><h2 id="trail-day-${index}">${esc(day.date)} · ${esc(day.label)}</h2><p>${day.blocks.length} chặng trong lịch trình</p></div></div><ol>${day.blocks.map(block => `<li><a href="#${esc(block.id)}" data-trail-stop="${esc(block.id)}"><span class="trail-time">${esc(block.time == null ? block.period : block.time)}${block.time == null ? '<small>Chưa chốt giờ</small>' : ''}</span><span>${esc(block.storyTitle || block.activity)}${block.optional ? '<small>Tùy chọn</small>' : ''}</span></a></li>`).join('')}</ol></section>`).join('');
  document.getElementById('daysList').innerHTML = days.map((day,index) => `${index > 0 ? `<header class="day-heading" id="day-${index}" data-phase="predawn" data-scenery-chapter="${esc(day.sceneryChapter)}" data-day="day-${index}"><div class="day-date"><strong>${esc(day.label)}</strong><time datetime="${esc(day.dateISO)}">${esc(day.weekday)}, ${esc(day.date)}/2026</time></div><h2>${esc(day.title)}</h2><p>${esc(day.summary)}</p><a class="reading-copy" href="./itinerary.html#schedule-${index}">Xem giờ giấc & ghi chú ↗</a>${stickerImage(index === 1 ? 'shan_tea' : index === 2 ? 'dino_ridge' : 'mountain_sky','sticker','morning')}</header>` : ''}${day.blocks.map(block => renderEvent(block,index)).join('')}`).join('');
}
function renderCrew() {
  const members = TRIP_DATA.members;
  const crewOrder = TRIP_DATA.crewOrder || [];
  const crewMembers = crewOrder.map(name => members.find(member => member.name === name)).filter(Boolean)
    .concat(members.filter(member => !crewOrder.includes(member.name)));
  document.getElementById('crewCount').textContent = '(' + members.length + ' mống)';
  document.getElementById('footerCount').textContent = 'Tà Xùa 2026 · Ấn bản nội bộ cho ' + members.length + ' đồng bọn';
  document.getElementById('heroMemberCount').textContent = members.length;
  document.getElementById('heroMemberLabel').textContent = TRIP_DATA.hero.memberLabel;
  document.getElementById('heroSky').textContent = TRIP_DATA.hero.title;
  document.getElementById('heroScrollLabel').textContent = TRIP_DATA.hero.scrollAction;
  document.getElementById('heroScrollNote').textContent = TRIP_DATA.hero.scrollNote;
  document.getElementById('heroDate').textContent = '22-25/10/2026 · Tà Xùa, Sơn La';
  document.getElementById('heroSub').textContent = TRIP_DATA.subtitle;
  document.getElementById('crewGrid').innerHTML = crewMembers.map(member => `<article class="member"><div class="avatar${member.image ? ' has-portrait' : ''}" aria-hidden="true"><span>${esc(member.name.charAt(0).toUpperCase())}</span>${member.image ? `<img src="./${esc(member.image)}" alt="" loading="lazy" decoding="async" width="128" height="128">` : ''}</div><h3>${esc(member.name)}</h3></article>`).join('');
  document.querySelectorAll('.avatar img').forEach(img => img.addEventListener('error',() => { img.parentElement.classList.remove('has-portrait');img.remove(); }));
}
function createWheelWinnerSticker(member) {
  if (!member.image) return null;
  const image = document.createElement('img');
  image.className = 'wheel-winner-sticker';
  image.alt = '';
  image.setAttribute('aria-hidden','true');
  image.width = 128;
  image.height = 128;
  image.decoding = 'async';
  image.addEventListener('error',() => {
    image.parentElement?.classList.remove('has-portrait');
    image.remove();
  },{once:true});
  image.src = './' + member.image;
  return image;
}
function createWheelCelebration(root,dial,result,name,copy,reduced) {
  // Outside sceneLayers: navigation snapshots never clone a celebration.
  const layer = document.createElement('div');
  layer.className = 'wheel-celebration';
  layer.setAttribute('aria-hidden','true');
  layer.hidden = true;
  document.getElementById('scenery')?.append(layer);
  const banner = document.createElement('div');
  banner.className = 'wheel-winner-banner';
  banner.setAttribute('aria-hidden','true');
  banner.hidden = true;
  document.body.append(banner);
  let animations = [];
  let cleanup;
  const smallScreen = matchMedia('(max-width: 767px)');
  const motionAllowed = () => !reduced.matches && document.documentElement.dataset.motionPaused !== 'true';
  const inView = element => {
    const box = element.getBoundingClientRect();
    return box.bottom > 145 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
  };
  function clear() {
    clearTimeout(cleanup);
    animations.forEach(animation => animation.cancel());
    animations = [];
    layer.replaceChildren();
    layer.hidden = true;
    banner.hidden = true;
    banner.replaceChildren();
    banner.classList.remove('has-portrait');
    result.classList.remove('is-celebrating');
  }
  function animate(element,frames,options) {
    if (element.animate) animations.push(element.animate(frames,{fill:'both',...options}));
  }
  function play(winner) {
    clear();
    if (document.hidden || !inView(root)) return;
    const mobile = smallScreen.matches;
    const nameBox = name.getBoundingClientRect();
    const navBottom = document.querySelector('.nav').getBoundingClientRect().bottom;
    let opacity = 1;
    for (let element = name; element && element !== root.parentElement; element = element.parentElement) opacity *= Number(getComputedStyle(element).opacity);
    if (mobile && (nameBox.top < navBottom + 8 || nameBox.bottom > innerHeight || opacity < .8)) {
      banner.innerHTML = `<span>${esc(copy.celebration)}</span><strong>${esc(winner.name)}!</strong>`;
      const sticker = createWheelWinnerSticker(winner);
      if (sticker) {
        banner.prepend(sticker);
        banner.classList.add('has-portrait');
      }
      banner.hidden = false;
    }
    // The nearby phone announcement also works without decorative motion.
    cleanup = setTimeout(clear,3600);
    if (!motionAllowed() || !layer.animate) return;
    const box = (inView(dial) ? dial : result).getBoundingClientRect();
    const x = Math.max(30,Math.min(innerWidth - 30,box.left + box.width / 2));
    const y = Math.max(190,Math.min(innerHeight - 90,box.top + box.height * .4));
    layer.style.setProperty('--celebration-x',x + 'px');
    layer.style.setProperty('--celebration-y',y + 'px');
    layer.hidden = false;
    result.classList.add('is-celebrating');
    const glow = document.createElement('div');
    glow.className = 'wheel-celebration-glow';
    layer.append(glow);
    animate(glow,[{opacity:0,transform:'translate(-50%,-50%) scale(.55)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.25},{opacity:0,transform:'translate(-50%,-50%) scale(1.2)'}],{duration:3100,easing:'ease-out'});
    const palette = ['#f3e5c7','#eea15a','#e8b299','#a9c4b1','#ffda9d'];
    const count = mobile ? 18 : 32;
    const spread = Math.min(760,innerWidth * .65);
    for (let index = 0; index < count; index++) {
      const piece = document.createElement('i');
      piece.className = 'wheel-confetti' + (index % 5 === 0 ? ' wheel-confetti--star' : index % 3 === 0 ? ' wheel-confetti--ribbon' : '');
      piece.style.backgroundColor = palette[index % palette.length];
      layer.append(piece);
      const direction = index / (count - 1) * 2 - 1;
      const travel = direction * spread * (.65 + Math.random() * .35);
      const lift = 100 + Math.random() * 180;
      const fall = 80 + Math.random() * 210;
      const turn = (index % 2 ? 1 : -1) * (120 + Math.random() * 250);
      animate(piece,[{opacity:0,transform:'translate(-50%,-50%) scale(.3) rotate(0deg)'},{opacity:.95,transform:`translate(${travel * .48}px,${-lift}px) scale(1) rotate(${turn * .4}deg)`,offset:.28},{opacity:.8,transform:`translate(${travel * .85}px,${-lift * .15}px) scale(1) rotate(${turn * .8}deg)`,offset:.63},{opacity:0,transform:`translate(${travel}px,${fall}px) scale(.75) rotate(${turn}deg)`}],{duration:2450 + Math.random() * 550,delay:Math.random() * 150,easing:'linear'});
    }
    for (let index = 0; index < (mobile ? 2 : 3); index++) {
      const cloud = document.createElement('img');
      cloud.className = 'wheel-celebration-cloud';
      cloud.src = './figures/scenery/painted/cloud_sky_puff.webp';
      cloud.alt = '';
      cloud.addEventListener('error',() => {cloud.hidden = true;},{once:true});
      layer.append(cloud);
      const direction = index % 2 ? 1 : -1;
      const distance = (mobile ? 105 : 180) + index * 55;
      animate(cloud,[{opacity:0,transform:`translate(${direction * 45 - 65}px,-20px) scale(.65)`},{opacity:.75,transform:`translate(${direction * distance - 65}px,-100px) scale(1)`,offset:.35},{opacity:0,transform:`translate(${direction * (distance + 65) - 65}px,-160px) scale(1.12)`}],{duration:2800,delay:index * 80,easing:'ease-out'});
    }
    animate(name,[{opacity:.4,transform:'translateY(8px) rotate(-4deg)'},{opacity:1,transform:'translateY(0) rotate(-2deg)'}],{duration:450,easing:'ease-out'});
    const sticker = result.querySelector('.wheel-winner-sticker');
    if (sticker) animate(sticker,[{opacity:0,transform:'translateY(8px) rotate(-5deg) scale(.9)'},{opacity:1,transform:'translateY(0) rotate(0) scale(1)'}],{duration:450,easing:'ease-out'});
    if (mobile) animate(banner,[{opacity:0,transform:'translateY(10px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)',offset:.12},{opacity:1,transform:'translateY(0) scale(1)',offset:.85},{opacity:0,transform:'translateY(-5px) scale(1)'}],{duration:3400,easing:'ease-out'});
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) clear();
  }).observe(root);
  document.addEventListener('visibilitychange',() => { if (document.hidden) clear(); });
  addEventListener('pagehide',clear);
  addEventListener('resize',clear);
  return {play,clear};
}
function initCloudWheel() {
  const root = document.getElementById('cloudWheel');
  const copy = TRIP_DATA.wheel;
  const members = TRIP_DATA.members;
  if (!root || !copy || !members.length) return;
  const colors = ['#e8bf8f','#a9c4b1','#eacbb0','#a8c5cd','#c8d0a5','#b6c8bc','#e3d3ae'];
  const segment = 360 / members.length;
  const point = (angle,radius) => {
    const radians = (angle - 90) * Math.PI / 180;
    return [200 + Math.cos(radians) * radius,200 + Math.sin(radians) * radius];
  };
  const sectors = members.map((member,index) => {
    const start = point(index * segment - segment / 2,145);
    const end = point(index * segment + segment / 2,145);
    const path = members.length === 1 ? '<circle cx="200" cy="200" r="145"/>' : `<path d="M200 200L${start.join(' ')}A145 145 0 ${segment > 180 ? 1 : 0} 1 ${end.join(' ')}Z"/>`;
    return `<g class="wheel-sector" data-wheel-index="${index}" fill="${colors[index % colors.length]}">${path}</g>`;
  }).join('');
  root.innerHTML = `
    <div class="wheel-heading"><p class="wheel-eyebrow">${esc(copy.eyebrow)}</p><h3 id="wheelTitle">${esc(copy.title)}</h3><p>${esc(copy.intro)}</p></div>
    <div class="wheel-composition">
      <details class="wheel-settings" open><summary>Cho ai vào vòng? <span id="wheelSelection"></span></summary>
        <fieldset class="wheel-participants"><legend>${esc(copy.participants)}</legend><div class="wheel-choices">${members.map((member,index) => `<label><input type="checkbox" data-wheel-person="${index}" checked><span>${esc(member.name)}</span></label>`).join('')}</div></fieldset>
        <div class="wheel-options"><label class="wheel-repeat"><input type="checkbox" id="wheelNoRepeat"><span>${esc(copy.noRepeat)}</span></label><button class="wheel-reset" type="button">${esc(copy.reset)} <span aria-hidden="true">↺</span></button></div>
        <p class="wheel-fairness">${esc(copy.fairness)}</p>
      </details>
      <div class="wheel-stage">
        <span class="wheel-scribble" aria-hidden="true">để mây chọn giùm</span>
        <div class="wheel-dial" id="wheelDial">
          <div class="wheel-rotor-clip" aria-hidden="true"><div class="wheel-rotor">
            <svg class="wheel-sectors" viewBox="0 0 400 400">${sectors}</svg>
            <img class="wheel-rim" src="./figures/decor/painted/wheel_rim.webp" width="652" height="652" alt="" loading="lazy" decoding="async">
            ${members.map((member,index) => {
              const [x,y] = point(index * segment,99);
              return `<span class="wheel-member" data-wheel-index="${index}" style="left:${x / 4}%;top:${y / 4}%"><span class="wheel-member-inner"><span class="wheel-initial${member.image ? ' has-portrait' : ''}">${esc(member.name.charAt(0).toUpperCase())}${member.image ? `<img src="./${esc(member.image)}" alt="" loading="lazy" decoding="async" width="44" height="44">` : ''}</span><span class="wheel-name">${esc(member.name)}</span></span></span>`;
            }).join('')}
          </div></div>
          <span class="wheel-pointer" aria-hidden="true"><img src="./figures/decor/painted/wheel_pointer.webp" width="349" height="467" alt="" loading="lazy"></span>
          <button class="wheel-spin" type="button" aria-describedby="wheelAvailability"><img src="./figures/decor/painted/wheel_hub.webp" width="539" height="539" alt="" aria-hidden="true" loading="lazy"><span>${esc(copy.spin)}</span></button>
        </div>
      </div>
      <div class="wheel-notes">
        <div class="wheel-result" aria-live="polite" aria-atomic="true"><img class="wheel-result-cloud" src="./figures/scenery/painted/cloud_sky_puff.webp" width="498" height="298" alt="" aria-hidden="true" loading="lazy"><p class="wheel-result-kicker">${esc(copy.waiting)}</p><div class="wheel-result-person"><p class="wheel-result-name">?</p></div><p class="wheel-result-note">${esc(copy.waitingNote)}</p></div>
        <p class="wheel-availability" id="wheelAvailability" aria-live="polite"></p>
      </div>
    </div>`;
  const rotor = root.querySelector('.wheel-rotor');
  const dial = root.querySelector('.wheel-dial');
  const spin = root.querySelector('.wheel-spin');
  const spinText = spin.querySelector('span');
  const reset = root.querySelector('.wheel-reset');
  const noRepeat = root.querySelector('#wheelNoRepeat');
  const participants = root.querySelector('.wheel-participants');
  const settings = root.querySelector('.wheel-settings');
  const compact = matchMedia('(max-width:767px), (max-height:520px) and (orientation:landscape)');
  const syncSettings = () => { settings.open = !compact.matches; };
  compact.addEventListener('change',syncSettings);
  settings.addEventListener('toggle',() => window.JourneyMotion?.refresh());
  syncSettings();
  const choices = Array.from(root.querySelectorAll('[data-wheel-person]'));
  const result = root.querySelector('.wheel-result');
  const kicker = root.querySelector('.wheel-result-kicker');
  const name = root.querySelector('.wheel-result-name');
  const person = root.querySelector('.wheel-result-person');
  const note = root.querySelector('.wheel-result-note');
  const availability = root.querySelector('.wheel-availability');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const celebration = createWheelCelebration(root,dial,result,name,copy,reduced);
  const used = new Set();
  let rotation = 0;
  let spinning = false;
  let pending = null;
  let timeout;
  let lastWinner = null;
  const randomIndex = count => {
    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      const limit = Math.floor(2 ** 32 / count) * count;
      do { crypto.getRandomValues(values); } while (values[0] >= limit);
      return values[0] % count;
    }
    return Math.floor(Math.random() * count);
  };
  const eligible = () => choices.map((choice,index) => choice.checked && (!noRepeat.checked || !used.has(index)) ? index : -1).filter(index => index >= 0);
  function update() {
    const remaining = eligible();
    const selected = choices.filter(choice => choice.checked).length;
    root.querySelector('#wheelSelection').textContent = selected + ' đồng bọn';
    // Keep keyboard focus on the action during a spin; click handling enforces
    // aria-disabled without a native disabled toggle dropping focus to <body>.
    spin.setAttribute('aria-disabled',String(spinning || !remaining.length));
    reset.disabled = spinning;
    participants.disabled = spinning;
    noRepeat.disabled = spinning;
    spinText.textContent = spinning ? copy.spinning : lastWinner === null ? copy.spin : copy.again;
    availability.textContent = noRepeat.checked ? `${remaining.length} / ${selected} đồng bọn còn trong lượt` : `${remaining.length} đồng bọn trong vòng quay`;
    root.querySelectorAll('[data-wheel-index]').forEach(el => {
      const index = Number(el.dataset.wheelIndex);
      el.classList.toggle('is-excluded',!remaining.includes(index));
      el.classList.toggle('is-winner',!spinning && index === lastWinner);
    });
    choices.forEach((choice,index) => choice.closest('label').classList.toggle('was-picked',noRepeat.checked && used.has(index)));
    root.classList.toggle('is-spinning',spinning);
    root.classList.toggle('is-complete',!remaining.length && !!selected);
    if (!spinning && !remaining.length) {
      kicker.textContent = selected ? copy.complete : copy.empty;
      note.textContent = selected ? copy.completeNote : copy.emptyNote;
    } else if (!spinning && lastWinner === null) {
      kicker.textContent = copy.waiting;
      note.textContent = copy.waitingNote;
    } else if (!spinning) {
      kicker.textContent = copy.winner;
      note.textContent = copy.winnerNote;
    }
  }
  function finishSpin() {
    if (!spinning) return;
    clearTimeout(timeout);
    spinning = false;
    lastWinner = pending;
    used.add(lastWinner);
    root.dataset.winnerIndex = lastWinner;
    root.dataset.winner = members[lastWinner].name;
    result.classList.add('has-winner');
    name.textContent = members[lastWinner].name;
    const sticker = createWheelWinnerSticker(members[lastWinner]);
    if (sticker) person.prepend(sticker);
    update();
    // Keep the final result announcement even when this pick exhausts the round.
    kicker.textContent = copy.winner;
    note.textContent = eligible().length ? copy.winnerNote : copy.completeNote;
    celebration.play(members[lastWinner]);
  }
  spin.addEventListener('click',() => {
    const pool = eligible();
    if (spinning || !pool.length) return;
    celebration.clear();
    pending = pool[randomIndex(pool.length)];
    const offset = (randomIndex(1001) / 1000 - .5) * segment * .5;
    const target = ((-pending * segment - offset) % 360 + 360) % 360;
    rotation += (5 + randomIndex(3)) * 360 + (target - rotation % 360 + 360) % 360;
    spinning = true;
    delete root.dataset.winner;
    delete root.dataset.winnerIndex;
    result.classList.remove('has-winner');
    person.querySelector('.wheel-winner-sticker')?.remove();
    kicker.textContent = copy.spinning;
    name.textContent = '…';
    note.textContent = 'Mây đang tìm một đồng bọn.';
    const instant = reduced.matches || document.documentElement.dataset.motionPaused === 'true';
    dial.classList.toggle('is-instant',instant);
    update();
    dial.style.setProperty('--wheel-turn',rotation + 'deg');
    root.dataset.rotation = rotation;
    if (instant) finishSpin();
    else timeout = setTimeout(finishSpin,4900);
  });
  rotor.addEventListener('transitionend',event => {
    if (event.target === rotor && event.propertyName === 'transform') finishSpin();
  });
  const stopMotion = () => {
    if (reduced.matches || document.documentElement.dataset.motionPaused === 'true') celebration.clear();
    if (spinning && (reduced.matches || document.documentElement.dataset.motionPaused === 'true')) {
      dial.classList.add('is-instant');
      finishSpin();
    }
  };
  reduced.addEventListener('change',stopMotion);
  new MutationObserver(stopMotion).observe(document.documentElement,{attributes:true,attributeFilter:['data-motion-paused']});
  reset.addEventListener('click',() => {
    if (spinning) return;
    celebration.clear();
    used.clear(); lastWinner = null;
    delete root.dataset.winner; delete root.dataset.winnerIndex;
    result.classList.remove('has-winner'); name.textContent = '?';
    person.querySelector('.wheel-winner-sticker')?.remove();
    update();
  });
  noRepeat.addEventListener('change',() => { used.clear(); update(); });
  participants.addEventListener('change',update);
  root.querySelectorAll('.wheel-initial img').forEach(img => img.addEventListener('error',() => { img.parentElement.classList.remove('has-portrait');img.remove(); }));
  root.querySelectorAll('.wheel-rim,.wheel-pointer img,.wheel-spin > img').forEach(img => img.addEventListener('error',() => {img.hidden = true;}));
  update();
  root.hidden = false;
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
  const objects = ['ui_coat','ui_boots','headlamp_sticker','ui_poncho','ui_power_bank','ui_medicine','ui_cash'];
  list.innerHTML = p.items.map((item,index) => `<li><label><input type="checkbox" value="${index}"${checked.includes(index) ? ' checked' : ''}><span class="packing-item"><img class="packing-object" src="./figures/decor/painted/${objects[index]}.webp" width="140" height="140" alt="" loading="lazy" decoding="async"><span>${esc(item.text)}${item.why ? `<small>${esc(item.why)}</small>` : ''}</span></span></label></li>`).join('');
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
  document.getElementById('tripFacts').innerHTML = `<dl class="trip-facts"><div><dt>Hai đêm ở</dt><dd>${esc(t.stay)}</dd></div><div><dt>Đêm 22/10, Hà Nội</dt><dd>Tập trung và lên xe lúc 21:30 tại Tập đoàn Viettel, xuất phát 22:00.</dd></div><div><dt>Trưa 25/10, Tà Xùa</dt><dd>Xe về xuất phát 12:30, chưa chốt giờ đến Hà Nội.</dd></div><div><dt>Chuyển phòng</dt><dd>12:00 ngày 24/10, nhớ chuyển hành lý sang phòng mới.</dd></div></dl><div class="practical-costs">${t.costs.map(item => `<p>${esc(item.label)}<strong>${money(item.value)}</strong>${esc(item.scope)}, dự kiến</p>`).join('')}</div><p class="cost-note">${esc(t.costNote)}</p><p class="cost-note"><a href="${esc(t.sourceUrl)}" target="_blank" rel="noopener noreferrer">Xem lịch nhóm gốc ↗</a></p>`;
}
function setPhotoSide(figure,back) {
  const object = figure.querySelector('[data-photo-object]');
  if (!object) return;
  const name = object.querySelector('.photo-back-heading span').textContent;
  object.classList.toggle('is-turned',back);
  object.querySelector('.photo-front').setAttribute('aria-hidden',String(back));
  const reverse = object.querySelector('.photo-back');
  reverse.inert = !back;
  reverse.setAttribute('aria-hidden',String(!back));
  object.setAttribute('aria-pressed',String(back));
  object.setAttribute('aria-label',back
    ? reverse.textContent.trim().replace(/\s+/g,' ') + '. Xem ảnh.'
    : 'Xem mặt sau ảnh: ' + name + '. ' + object.querySelector('img').alt);
}
function initScrapbook() {
  document.querySelectorAll('[data-photo-turn]').forEach(button => {
    button.addEventListener('click',() => {
      setPhotoSide(button.closest('figure'),button.getAttribute('aria-pressed') !== 'true');
    });
    // The whole photograph is the button. Arrow keys also let keyboard readers
    // scroll a long reverse without exposing another visible control.
    button.addEventListener('keydown',event => {
      if (button.getAttribute('aria-pressed') !== 'true') return;
      const reverse = button.querySelector('.photo-back');
      const offsets = {ArrowDown:40,ArrowUp:-40,PageDown:reverse.clientHeight * .8,PageUp:-reverse.clientHeight * .8};
      if (event.key in offsets) {
        event.preventDefault();
        reverse.scrollBy(0,offsets[event.key]);
      }
    });
  });
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
    const select = (next,direction = next > index ? 1 : -1) => {
      const previous = index;
      index = (next + slides.length) % slides.length;
      if (index === previous) return;
      setPhotoSide(slides[index].querySelector('figure'),false);
      deck.querySelectorAll('[data-photo-select]').forEach(button => {
        const selected = Number(button.dataset.photoSelect) === index;
        // The exposed print always previews another real photograph.
        button.hidden = selected;
        button.setAttribute('aria-pressed',String(selected));
      });
      if (window.JourneyMotion?.deck) window.JourneyMotion.deck(deck,slides,previous,index,direction);
      else slides.forEach((slide,i) => { slide.hidden = i !== index; });
      deck.querySelector('.deck-count').textContent = 'Góc ' + (index + 1) + ' / ' + slides.length;
      window.JourneyMotion?.refresh();
    };
    deck.querySelectorAll('[data-photo-step]').forEach(button => button.addEventListener('click',() => select(index + Number(button.dataset.photoStep))));
    deck.querySelectorAll('[data-photo-select]').forEach(button => button.addEventListener('click',() => {
      select(Number(button.dataset.photoSelect));
      // The selected print now occupies the foreground; keep keyboard focus useful.
      slides[index].querySelector('[data-photo-object]')?.focus({preventScroll:true});
    }));
  });
}
function initNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const mobile = matchMedia('(max-width:1023px)');
  const chapter = document.querySelector('.chapter-nav');
  const chapterToggle = document.getElementById('chapterToggle');
  const trailPanel = document.getElementById('trailPanel');
  const itinerary = document.getElementById('itinerary');
  let navOffset = 110;
  const landscape = matchMedia('(max-height:520px) and (orientation:landscape)');
  const closeDates = () => {
    chapter.dataset.open = 'false';
    chapterToggle.setAttribute('aria-expanded','false');
    trailPanel.hidden = true;
  };
  chapterToggle.addEventListener('click',() => {
    const open = chapter.dataset.open !== 'true';
    chapter.dataset.open = String(open);
    chapterToggle.setAttribute('aria-expanded',String(open));
    trailPanel.hidden = !open;
  });
  chapter.querySelectorAll('[data-chapter]').forEach(link => link.addEventListener('click',() => {
    setTrailDay(link.dataset.chapter);
    chapter.dataset.open = 'true';
    chapterToggle.setAttribute('aria-expanded','true');
    trailPanel.hidden = false;
  }));
  chapter.querySelectorAll('[data-trail-stop]').forEach(link => link.addEventListener('click',closeDates));
  document.getElementById('trailClose').addEventListener('click',() => { closeDates(); chapterToggle.focus(); });
  landscape.addEventListener('change',closeDates);
  const syncCompact = () => {
    document.documentElement.dataset.navCompact = String(scrollY > 24 || parseFloat(getComputedStyle(document.documentElement).fontSize) > 20);
    const box = itinerary.getBoundingClientRect();
    const active = box.top <= navOffset + 1 && box.bottom > navOffset + 1;
    document.documentElement.dataset.itineraryActive = String(active);
    chapter.inert = !active;
    if (!active) closeDates();
  };
  const measureNavigation = () => {
    syncCompact();
    const phone = innerWidth < 768 || landscape.matches;
    const dateHeight = phone ? chapter.offsetHeight : 0;
    navOffset = phone ? document.querySelector('.nav').offsetHeight + dateHeight + 24 : 110;
    document.documentElement.style.setProperty('--nav-offset',navOffset + 'px');
  };
  let navFrame = 0;
  addEventListener('scroll',() => {
    if (!navFrame) navFrame = requestAnimationFrame(() => { navFrame = 0; syncCompact(); });
  },{passive:true});
  addEventListener('resize',measureNavigation);
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(measureNavigation);
    observer.observe(document.querySelector('.nav'));
    observer.observe(chapter);
  }
  measureNavigation();
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
    if (event.key === 'Escape' && chapter.dataset.open === 'true') { closeDates(); chapterToggle.focus(); }
  });
  document.addEventListener('click',event => {
    if (links.classList.contains('open') && !event.target.closest('.nav')) setOpen(false);
    if (chapter.dataset.open === 'true' && !chapter.contains(event.target)) closeDates();
  });
  setOpen(false);
}
function setTrailDay(dayId) {
  if (!dayId || dayId === 'support') return;
  document.querySelectorAll('[data-trail-day]').forEach(section => {
    section.hidden = section.dataset.trailDay !== dayId;
  });
  const day = TRIP_DATA.days[Number(dayId.replace('day-',''))];
  if (day) document.getElementById('trailToggleLabel').textContent = day.date + ' · Điểm dừng';
}
const JourneyUI = (() => {
  let fallbackRunning = false;
  let frame = 0;
  let lastKey = '';
  let sceneRequest = 0;
  const sections = () => Array.from(document.querySelectorAll('.hero, .day-heading, .event, #fund, #crew'));
  function sceneFor(element, phaseOverride) {
    const phase = phaseOverride || element.dataset.phase || 'opening';
    const chapter = phaseOverride && phaseOverride === element.dataset.phaseEnd ? element.dataset.sceneryChapterEnd : element.dataset.sceneryChapter;
    let background = element.dataset.backdrop || JOURNEY_CHAPTERS[chapter] || JOURNEY_SCENES[phase].background;
    // Within a night chapter, lighting follows the actual stop: breakfast is
    // daylight, while a predawn lookout still carries the last few stars.
    if (['night','bluehour'].includes(background) && ['predawn','dawn','morning'].includes(phase)) {
      background = phase === 'predawn' ? 'bluehour' : 'jade';
    }
    return {...JOURNEY_SCENES[phase],phase,background};
  }
  function setChapter(element, phaseOverride) {
    setTrailDay(element.dataset.day);
    document.querySelectorAll('[data-trail-stop]').forEach(link => {
      if (link.dataset.trailStop === element.id) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
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

    // Schedule artwork belongs to its own period, independently of scrolling.
    document.querySelectorAll('img[data-sticker]:not([data-sticker-phase])').forEach(img => {
      const next = './' + stickerPath(img.dataset.sticker,scene.phase);
      if (window.JourneyMotion?.sticker) window.JourneyMotion.sticker(img,next);
      else if (img.getAttribute('src') !== next) img.src = next;
    });
  }
  function setSceneryTone(id) { document.documentElement.dataset.navTone = id === 'sunrise' ? 'dark' : 'light'; }
  function loadBackground(id) { return JourneyScenery.load(id); }
  function applyScene(element,phaseOverride) {
    const scene = sceneFor(element,phaseOverride);
    const request = ++sceneRequest;
    const show = () => {
      if (request !== sceneRequest) return;
      document.querySelectorAll('.scene-panel').forEach(img => { img.style.opacity = img.dataset.background === scene.background ? 1 : 0; });
    };
    const decoded = loadBackground(scene.background);
    if (JourneyScenery.isReady(scene.background)) show();
    else decoded.then(ok => { if (ok) show(); });
    setChapter(element,phaseOverride);
    setSceneryTone(scene.background);
  }
  function syncFallback() {
    frame = 0;
    if (!fallbackRunning) return;
    const all = sections();
    const cursor = scrollY + innerHeight * .46;
    let index = 0;
    all.forEach((el,i) => { if (el.getBoundingClientRect().top + scrollY <= cursor) index = i; });
    if (scrollY < JourneyScenery.openingBounds().clear) index = 0;
    const element = all[index];
    const next = all[index + 1];
    const start = element.getBoundingClientRect().top + scrollY;
    const end = next ? next.getBoundingClientRect().top + scrollY : document.documentElement.scrollHeight;
    const phase = element.dataset.phaseEnd && cursor >= start + (end - start) * .75 ? element.dataset.phaseEnd : element.dataset.phase;
    const key = element.id + ':' + phase;
    if (key !== lastKey) { lastKey = key; applyScene(element,phase); }
    document.querySelector('.chapter-progress').style.setProperty('--progress',scrollY / Math.max(1,document.documentElement.scrollHeight - innerHeight));
    JourneyScenery.drift(scrollY);
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
    JourneyScenery.init();
    applyScene(document.getElementById('top'));
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
  return {sceneFor,setChapter,setSceneryTone,loadBackground,applyScene,startFallback,stopFallback,initBackgrounds};
})();
function boot() {
  renderDays(); renderFund(); renderCrew(); renderPacking(); renderSupportingContent();
  initArrivalCountdown(); initCloudWheel();
  initScrapbook(); initNav();
  JourneyUI.initBackgrounds(); JourneyUI.startFallback();
}
boot();
