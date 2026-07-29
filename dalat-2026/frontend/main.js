// Đà Lạt x gogo — interactivity (mobile nav, scroll reveal, interactive map).
// Plain classic script (no ES imports) so the page also works when index.html
// is opened directly via file://. Leaflet is loaded from a CDN <script> tag,
// exposing the global `L`.

// Real Đà Lạt coordinates for each spot (approximate).
var PLACES = [
  { name: 'Hồ Tuyền Lâm', desc: 'Lạnh teo, nhưng đẹp.',                 lat: 11.8930, lng: 108.4290 },
  { name: 'Langbiang',    desc: 'Có xe Jeep đi dốc dựng đứng.',          lat: 12.0494, lng: 108.4442 },
  { name: 'Chợ Âm Phủ',   desc: 'Ăn khuya sập nguồn.',                   lat: 11.9421, lng: 108.4370 },
  { name: 'Vườn Dâu',     desc: 'Không ngọt lắm nhưng lên hình đẹp.',    lat: 11.9560, lng: 108.4520 },
];

function boot() {
  initNav();
  initReveal();
  initMap();
  initActiveSection();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

function initNav() {
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (!toggle || !links) return;
  var setOpen = function (open) {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', function () { setOpen(!links.classList.contains('open')); });
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });
}

function initReveal() {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-revealed'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(function (el) { io.observe(el); });
}

function initActiveSection() {
  var links = document.querySelectorAll('.nav-links a[href^="#"]');
  if (!links.length || !('IntersectionObserver' in window)) return;
  var linkFor = {};
  links.forEach(function (a) { linkFor[a.getAttribute('href').slice(1)] = a; });
  var sections = Object.keys(linkFor).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var link = linkFor[entry.target.id];
      if (!link) return;
      link.classList.toggle('is-active', entry.isIntersecting);
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(function (el) { io.observe(el); });
}

function initMap() {
  var el = document.getElementById('dalat-map');
  if (!el || typeof L === 'undefined') return; // Leaflet not loaded (e.g. offline) — skip gracefully.

  var map = L.map(el, {
    scrollWheelZoom: false,   // don't hijack page scroll; use +/- or drag
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);

  var makeIcon = function () {
    return L.divIcon({
      className: 'map-pin-wrap',
      html: '<div class="map-pin"><span class="map-pin__ring"></span><span class="map-pin__dot"></span></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      tooltipAnchor: [0, -10],
    });
  };

  var markers = PLACES.map(function (p) {
    var m = L.marker([p.lat, p.lng], { icon: makeIcon(), riseOnHover: true }).addTo(map);
    m.bindTooltip(
      '<span class="t-name">' + p.name + '</span><span class="t-desc">' + p.desc + '</span>',
      { className: 'dalat-tip', direction: 'top', opacity: 1 }
    );
    return m;
  });

  var group = L.featureGroup(markers);
  var fit = function () { map.fitBounds(group.getBounds(), { padding: [55, 55], maxZoom: 13 }); };
  fit();
  // Recompute once tiles/layout settle (panel starts with a reveal transform).
  setTimeout(function () { map.invalidateSize(); fit(); }, 300);

  // Link the place cards to their pins.
  document.querySelectorAll('.place[data-idx]').forEach(function (card) {
    var idx = Number(card.dataset.idx);
    var marker = markers[idx];
    if (!marker) return;
    var setActive = function (on) {
      var icon = marker.getElement();
      if (icon) icon.classList.toggle('is-active', on);
      if (on) marker.openTooltip(); else marker.closeTooltip();
    };
    card.addEventListener('mouseenter', function () { setActive(true); });
    card.addEventListener('mouseleave', function () { setActive(false); });
    card.addEventListener('click', function () {
      map.setView([PLACES[idx].lat, PLACES[idx].lng], 14, { animate: true });
      marker.openTooltip();
    });
  });
}
