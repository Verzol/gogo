// Tà Xùa x gogo — render nội dung từ TRIP_DATA + tương tác (nav mobile, scroll reveal, nav active).
// Script thường (không import/export) để mở index.html trực tiếp qua file:// vẫn chạy.
// TRIP_DATA là biến global do data.js khai báo, nên data.js phải load trước.

function boot() {
  initTheme();
  renderHero();
  renderCrew();
  renderPacking();
  renderDays();
  renderDestinations();
  renderFood();
  initNav();
  initReveal();
  initActiveSection();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Nội dung trong data.js là text thuần — escape trước khi ghép vào innerHTML.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stickerPath(name, theme = document.documentElement.dataset.theme) {
  return 'figures/decor/' + name + (theme === 'dark' ? '_night.webp' : '_day.webp');
}

// data.js keeps a readable daytime PNG path; render the matching theme's WebP.
function imagePath(path) {
  return String(path).replace(/^figures\/decor\/([\w]+)_(?:day|night)\.(?:png|webp)$/, (_, name) =>
    stickerPath(name));
}

function stickerImage(path, attributes) {
  const match = String(path).match(/^figures\/decor\/([\w]+)_(?:day|night)\.(?:png|webp)$/);
  const key = match ? ` data-sticker="${esc(match[1])}"` : '';
  return `<img${key} src="./${esc(imagePath(path))}" ${attributes} />`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function renderHero() {
  const d = TRIP_DATA;
  document.getElementById('heroTitle').textContent = d.tripName;
  document.getElementById('heroSub').textContent = d.subtitle;
  document.getElementById('heroDate').textContent = d.dateRange;
  document.getElementById('heroMeta').textContent = d.intro;
}

function renderCrew() {
  const members = TRIP_DATA.members;
  document.getElementById('crewCount').textContent = `(${members.length} mống)`;
  document.getElementById('crewGrid').innerHTML = members.map((m, i) => `
    <article class="member">
      <div class="avatar">
        ${m.image ? `<img src="./${esc(m.image)}" alt="" onerror="this.remove()" />` : ''}
        <span>${esc(m.name.charAt(0).toUpperCase())}</span>
      </div>
      <span class="num">${pad2(i + 1)}</span>
      <div class="name">${esc(m.name)}</div>
      <div class="role">${esc(m.role)}</div>
    </article>`).join('');
}

function renderPacking() {
  const p = TRIP_DATA.packingList;
  document.getElementById('packingTitle').textContent = p.title;
  document.getElementById('packingNote').textContent = p.note;
  document.getElementById('packingList').innerHTML = p.items.map((it) => `
    <li><span class="box"></span><span>${esc(it.text)}${it.why ? ` <span class="why">: ${esc(it.why)}</span>` : ''}</span></li>`).join('');
}

function mapLink(query, label) {
  return `<a class="map-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer" aria-label="Mở bản đồ: ${esc(label)} (tab mới)">Mở bản đồ <span aria-hidden="true">↗</span></a>`;
}

function renderScheduleBlock(block) {
  const hasCost = Number.isFinite(block.cost);
  const cost = hasCost ? new Intl.NumberFormat('vi-VN').format(block.cost) + ' ₫/người' : '';
  return `
    <li class="schedule-stop" data-source-row="${esc(block.sourceRow)}">
      <div class="schedule-time${block.time ? '' : ' schedule-time--pending'}">${esc(block.time || 'Chưa chốt giờ')}</div>
      <div class="schedule-content">
        <div class="schedule-title-row">
          <h5>${esc(block.activity)}</h5>
          ${block.optional ? '<span class="optional-label">Tùy chọn</span>' : ''}
        </div>
        ${block.location ? `<div class="schedule-location"><span>${esc(block.location)}</span>${mapLink(block.mapQuery || block.location, block.location)}</div>` : ''}
        ${block.warning ? `<p class="schedule-warning">${esc(block.warning)}</p>` : ''}
        ${block.note || hasCost ? `<details class="schedule-details">
          <summary>Chi tiết</summary>
          <div class="schedule-details-body">
            ${block.note ? `<p>${esc(block.note)}</p>` : ''}
            ${hasCost ? `<p class="schedule-cost"><span>Chi phí dự kiến</span><strong>${esc(cost)}</strong></p>` : ''}
          </div>
        </details>` : ''}
      </div>
    </li>`;
}

function renderDays() {
  const container = document.getElementById('daysList');
  const days = TRIP_DATA.days || [];
  const trip = TRIP_DATA.itinerary;
  document.getElementById('itineraryDates').innerHTML = `${esc(trip.dateLabel)} <span>${esc(trip.duration)}</span>`;
  if (!days.length) {
    container.innerHTML = '<p class="schedule-empty">Lịch trình đang được cập nhật. Ghé lại để xem kế hoạch của nhóm nhé.</p>';
    return;
  }
  // Mở ngày đầu ở Tà Xùa; đêm khởi hành vẫn là một tab riêng.
  const initialDay = days.length > 1 ? 1 : 0;
  container.innerHTML = `
    <div class="day-tabs" role="tablist" aria-label="Chọn ngày trong lịch trình">
      ${days.map((day, index) => `<button class="day-tab" type="button" role="tab" id="day-tab-${index}" aria-controls="day-panel-${index}" aria-selected="${index === initialDay}" tabindex="${index === initialDay ? '0' : '-1'}" data-day="${index}">
        <span class="day-tab-label">${esc(day.label)}</span><span class="day-tab-date">${esc(day.date)}</span><span class="day-tab-weekday">${esc(day.weekday)}</span>
      </button>`).join('')}
    </div>
    <div class="itinerary-layout">
      <aside class="trip-base" aria-label="Thông tin chuyến đi">
        ${stickerImage('figures/decor/cloud_2_day.png', 'width="140" height="100" alt="" aria-hidden="true" loading="lazy" decoding="async"')}
        <h3>Hai đêm trên núi</h3>
        <p class="trip-base-note">Một chỗ nghỉ, những cung đường đầy mây.</p>
        <dl class="trip-facts">
          <div><dt>Ở đâu?</dt><dd>${esc(trip.stay)}</dd></div>
          <div><dt>${esc(trip.outbound.label)}</dt><dd>${esc(trip.outbound.detail)}</dd></div>
          <div><dt>${esc(trip.inbound.label)}</dt><dd>${esc(trip.inbound.detail)}</dd></div>
        </dl>
        ${mapLink(trip.stayQuery, trip.stay)}
        <p class="trip-cost-note">${esc(trip.costNote)}</p>
        <a class="sheet-link" href="${esc(trip.sourceUrl)}" target="_blank" rel="noopener noreferrer">Xem sheet gốc <span aria-hidden="true">↗</span></a>
      </aside>
      <div class="day-panels">
        ${days.map((day, index) => {
          const groups = [];
          day.blocks.forEach(block => {
            let group = groups[groups.length - 1];
            if (!group || group.period !== block.period) {
              group = { period: block.period, blocks: [] };
              groups.push(group);
            }
            group.blocks.push(block);
          });
          return `<article class="day-panel" role="tabpanel" id="day-panel-${index}" aria-labelledby="day-tab-${index}" tabindex="0" ${index === initialDay ? '' : 'hidden'}>
            <header class="schedule-head">
              <div><p class="schedule-date"><time datetime="${esc(day.dateISO)}">${esc(day.weekday)}, ${esc(day.date)}/2026</time></p>
              <h3>${esc(day.title)}</h3><p class="schedule-intro">${esc(day.summary)}</p></div>
              ${stickerImage(day.image, 'width="120" height="120" alt="" aria-hidden="true" loading="lazy" decoding="async"')}
            </header>
            ${groups.map(group => `<section class="schedule-period" aria-label="${esc(group.period)}">
              <h4>${esc(group.period)}</h4><ol class="schedule-stops">${group.blocks.map(renderScheduleBlock).join('')}</ol>
            </section>`).join('')}
            <footer class="schedule-end">${index === days.length - 1 ? 'Hẹn chuyến sau, gogo!' : 'Còn một ngày mới trên núi.'}</footer>
          </article>`;
        }).join('')}
      </div>
    </div>`;

  const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
  const panels = Array.from(container.querySelectorAll('[role="tabpanel"]'));
  const selectDay = (index, focus) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) {
      tabs[index].focus({ preventScroll: true });
      tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectDay(index, false));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectDay(next, true);
    });
  });
}

function renderDestinations() {
  document.getElementById('destinationsGrid').innerHTML = TRIP_DATA.destinations.map((p, i) => `
    <article class="place">
      <div class="place-img">${p.image ? stickerImage(p.image, `alt="${esc(p.name)}" loading="lazy" decoding="async"`) : ''}</div>
      <div class="place-body">
        <span class="co">Điểm ${pad2(i + 1)}</span>
        <h3 class="display">${esc(p.name)}</h3>
        <p>${esc(p.desc)}</p>
      </div>
    </article>`).join('');
}

function renderFood() {
  const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];
  document.getElementById('foodGrid').innerHTML = TRIP_DATA.food.map((f, i) => `
    <article class="dish">
      <div class="dish-img">${f.image ? stickerImage(f.image, `alt="${esc(f.name)}" loading="lazy" decoding="async"`) : ''}</div>
      <span class="idx">Món ${roman[i] || i + 1}.</span>
      <h3 class="display">${esc(f.name)}</h3>
      <p>${esc(f.desc)}</p>
    </article>`).join('');
}

function initNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;
  const mobile = matchMedia('(max-width: 1023px)');
  const setOpen = (open) => {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    links.inert = mobile.matches && !open;
  };
  setOpen(false);
  mobile.addEventListener('change', () => setOpen(false));
  toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
  links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && links.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });
}

// Follow the system until the visitor chooses a mode. Keep the whole page in sync.
function initTheme() {
  const root = document.documentElement;
  const options = Array.from(document.querySelectorAll('[data-theme-choice]'));
  const system = matchMedia('(prefers-color-scheme: dark)');
  const storageKey = 'taxua-2026-theme';
  let manual = false;
  try { manual = ['light', 'dark'].includes(localStorage.getItem(storageKey)); } catch (_) {}
  const applyTheme = theme => {
    root.dataset.theme = theme;
    // Change artwork in place so the selected day and expanded details survive.
    document.querySelectorAll('img[data-sticker]').forEach(image => {
      const source = './' + stickerPath(image.dataset.sticker, theme);
      if (image.getAttribute('src') !== source) image.setAttribute('src', source);
    });
    options.forEach(option => option.setAttribute('aria-pressed', String(option.dataset.themeChoice === theme)));
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#101e2c' : '#eef3f6';
  };
  applyTheme(root.dataset.theme);
  options.forEach(option => option.addEventListener('click', () => {
    manual = true;
    const theme = option.dataset.themeChoice;
    applyTheme(theme);
    try { localStorage.setItem(storageKey, theme); } catch (_) {}
  }));
  system.addEventListener('change', event => {
    if (!manual) applyTheme(event.matches ? 'dark' : 'light');
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    manual = event.newValue === 'light' || event.newValue === 'dark';
    applyTheme(manual ? event.newValue : (system.matches ? 'dark' : 'light'));
  });
}

// Hiện dần từng khối khi cuộn tới. Không có IntersectionObserver thì hiện hết luôn.
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach((el) => io.observe(el));
}

// Đánh dấu link nav của section đang xem.
function initActiveSection() {
  const links = Array.from(document.querySelectorAll('.nav-links a'));
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (!('IntersectionObserver' in window) || !sections.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
}
