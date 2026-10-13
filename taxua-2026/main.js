// Tà Xùa x gogo — render nội dung từ TRIP_DATA + tương tác (nav mobile, scroll reveal, nav active).
// Script thường (không import/export) để mở index.html trực tiếp qua file:// vẫn chạy.
// TRIP_DATA là biến global do data.js khai báo, nên data.js phải load trước.

function boot() {
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

function pad2(n) {
  return String(n).padStart(2, '0');
}

function renderHero() {
  const d = TRIP_DATA;
  document.getElementById('heroTitle').textContent = d.tripName;
  document.getElementById('heroSub').textContent = d.subtitle;
  document.getElementById('heroDate').textContent = d.dateRange;
  document.getElementById('heroMeta').textContent = d.intro;
  document.getElementById('heroMasthead').innerHTML = (d.masthead || [])
    .map((m) => `<span>${esc(m)}</span>`)
    .join('<span class="dot">·</span>');
}

function renderCrew() {
  const members = TRIP_DATA.members;
  document.getElementById('crewCount').textContent = `(${members.length} mống)`;
  document.getElementById('crewGrid').innerHTML = members.map((m, i) => `
    <article class="member">
      <div class="avatar">
        <img src="./figures/people/${i + 1}.png" alt="" onerror="this.remove()" />
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
    <li><span class="box"></span><span>${esc(it.text)}${it.why ? ` <span class="why">— ${esc(it.why)}</span>` : ''}</span></li>`).join('');
}

function renderDays() {
  document.getElementById('daysList').innerHTML = TRIP_DATA.days.map((day) => `
    <article class="day">
      <header class="day-head">
        <span class="day-label">${esc(day.label)}</span>
        <h3 class="display">${esc(day.title)}</h3>
      </header>
      <ol class="trail">
        ${day.blocks.map((b) => `
          <li>
            <span class="time">${esc(b.time)}</span>
            <span class="what">${esc(b.activity)}${b.note ? `<span class="note">${esc(b.note)}</span>` : ''}</span>
          </li>`).join('')}
      </ol>
    </article>`).join('');
}

function renderDestinations() {
  document.getElementById('destinationsGrid').innerHTML = TRIP_DATA.destinations.map((p, i) => `
    <article class="place">
      <div class="place-img">${p.image ? `<img src="./${esc(p.image)}" alt="${esc(p.name)}" />` : ''}</div>
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
      <div class="dish-img">${f.image ? `<img src="./${esc(f.image)}" alt="${esc(f.name)}" />` : ''}</div>
      <span class="idx">Món ${roman[i] || i + 1}.</span>
      <h3 class="display">${esc(f.name)}</h3>
      <p>${esc(f.desc)}</p>
    </article>`).join('');
}

function initNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;
  const setOpen = (open) => {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
  links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
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
