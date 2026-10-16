// Optional geographic reading of the journal. No runtime geocoding or saved visits.
(() => {
  if (typeof TRIP_MAP_DATA === 'undefined') return;
  const places = TRIP_MAP_DATA.places;
  const visits = [];
  TRIP_DATA.days.forEach((day, dayIndex) => day.blocks.forEach(block => {
    const members = block.places || (block.stopId ? [{stopId:block.stopId}] : []);
    members.forEach(place => visits.push({
      key:block.id + ':' + place.stopId, placeId:place.stopId, day:dayIndex,
      date:day.date, time:block.time, period:block.period, optional:!!block.optional,
      anchor:block.places ? 'place-' + place.stopId : block.id, block,
      unordered:!!block.places
    }));
  }));
  const departure = TRIP_DATA.days[0].blocks[0];
  visits.unshift({key:'departure:hanoi_pickup', placeId:'hanoi_pickup', day:0,
    date:'22/10', time:departure.time, period:departure.period, optional:false,
    anchor:'departure', block:departure});
  const hasPoint = place => Number.isFinite(place?.lat) && Number.isFinite(place?.lng);
  const art = place => './figures/' + (place.art || 'decor/painted/map_home_base.webp');
  const categoryIcons = {stay:'house',cafe:'coffee',meal:'soup',waterfall:'waves',landmark:'map-pin',area:'mountain',transfer:'bus'};
  let activeDay = 'all';
  let includeOptional = true;
  let selectedKey = '';
  let opener;
  let menuOpener;
  let map;
  let tiles;
  let markerLayer;
  let routeLayer;
  let markers = new Map();
  let markerFocusId = '';
  let tileTimer;
  let library;
  let generation = 0;
  let preview;
  let previewButton;
  let mode = '';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate = () => !reduced.matches && document.documentElement.dataset.motionPaused !== 'true';
  const filtered = () => visits.filter(visit => (activeDay === 'all' ? visit.day > 0 : visit.day === activeDay) && (includeOptional || !visit.optional));
  const unique = list => [...new Set(list.map(visit => visit.placeId))];
  const timeLabel = visit => visit.time == null ? visit.period + ' · chưa chốt giờ' : visit.time;
  const selected = () => visits.find(visit => visit.key === selectedKey);

  const invitation = document.createElement('div');
  invitation.className = 'map-invitation wrap';
  invitation.innerHTML = `<button type="button" class="map-invitation-button" data-map-overview aria-haspopup="dialog" aria-controls="tripAtlas">
    <span class="map-invitation-art" aria-hidden="true"><img src="./figures/decor/painted/map_home_base.webp" width="96" height="66" alt=""><span></span><img src="./figures/decor/painted/map_waterfall.webp" width="40" height="60" alt=""></span>
    <span class="map-invitation-copy"><strong>Bản đồ trên mây</strong><span>Nhìn cả chuyến đi, rồi chọn một điểm ghé.</span></span>${icon('arrow-right')}
  </button>`;
  document.getElementById('dayOverview').before(invitation);

  const dialog = document.createElement('dialog');
  dialog.id = 'tripAtlas';
  dialog.className = 'trip-atlas';
  dialog.setAttribute('aria-labelledby','atlasTitle');
  dialog.innerHTML = `<header class="atlas-header"><div><p class="atlas-eyebrow">gogo · 22–25 tháng 10</p><h2 id="atlasTitle">Bản đồ trên mây</h2></div><button type="button" class="atlas-close" aria-label="Đóng bản đồ">${icon('x')}</button></header>
    <div class="atlas-toolbar"><div class="atlas-dates" role="group" aria-label="Chọn ngày trên bản đồ"><button type="button" data-map-day="all" aria-pressed="true">Cả chuyến</button>${[1,2,3,0].map(index => `<button type="button" data-map-day="${index}" aria-pressed="false">${index ? esc(TRIP_DATA.days[index].date) : 'Đêm đi'}</button>`).join('')}</div>
    <div class="atlas-options"><label><input type="checkbox" id="atlasOptional" checked> Cả điểm tùy chọn</label><button type="button" class="atlas-reset">${icon('scan')}<span>Xem trọn ngày</span></button></div></div>
    <div class="atlas-body"><div class="atlas-geography"><div class="atlas-map-wrap" id="atlasMapMount"></div><div class="atlas-map-caption"><span class="atlas-legend-pin" aria-hidden="true"></span><span id="atlasMapCaption">Điểm ghé trong nhật ký</span><span class="atlas-route-key" hidden>··· thứ tự ghé, không phải đường đi</span></div></div>
    <aside class="atlas-sidebar" aria-label="Điểm ghé và lịch trình"><button type="button" class="atlas-sheet-toggle" aria-expanded="false">${icon('chevron-up')}<span>Xem thêm chi tiết</span></button><div id="atlasDetail"></div><section class="atlas-stop-index" aria-labelledby="atlasListTitle"><div class="atlas-list-heading"><h3 id="atlasListTitle">Những nơi mình ghé</h3><span id="atlasListCount"></span></div><ol id="atlasStops"></ol></section></aside></div>`;
  document.body.append(dialog);
  const detail = dialog.querySelector('#atlasDetail');
  const list = dialog.querySelector('#atlasStops');
  const surface = document.createElement('div');
  surface.className = 'trip-map-surface';
  surface.innerHTML = `<div class="trip-map-canvas" role="region" aria-label="Bản đồ các điểm ghé Tà Xùa"></div><div class="trip-map-status" role="status" hidden></div><button class="trip-map-retry" type="button" hidden>Thử tải lại</button>`;
  const canvas = surface.querySelector('.trip-map-canvas');
  const status = surface.querySelector('.trip-map-status');
  const retry = surface.querySelector('.trip-map-retry');

  function setStatus(message, allowRetry = false) {
    status.textContent = message;
    status.hidden = !message;
    retry.hidden = !allowRetry;
  }
  function loadLibrary() {
    if (window.L) return Promise.resolve(window.L);
    if (library) return library;
    library = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(fail,12000);
      function fail() {
        clearTimeout(timeout);script.remove();library = null;
        reject(new Error('Map library unavailable'));
      }
      script.src = './vendor/leaflet/leaflet.js';
      script.onload = () => { clearTimeout(timeout); window.L ? resolve(window.L) : fail(); };
      script.onerror = fail;
      document.head.append(script);
    });
    return library;
  }
  function destroyMap() {
    generation++;
    clearTimeout(tileTimer);
    if (map) map.remove();
    map = null;tiles = null;markers.clear();
    canvas.replaceChildren();surface.remove();
  }
  async function mountMap(mount) {
    destroyMap();
    const request = generation;
    mount.append(surface);
    if (location.protocol === 'file:') {
      setStatus('Bản đồ trực tuyến có trên bản web. Bạn vẫn có thể xem ảnh và các điểm ghé bên cạnh.');
      return;
    }
    setStatus('Đang mở một góc Tà Xùa…');
    try {
      const L = await loadLibrary();
      if (request !== generation || !surface.isConnected) return;
      const navigationBounds = L.latLngBounds(TRIP_MAP_DATA.navigationBounds);
      map = L.map(canvas,{scrollWheelZoom:true,zoomControl:false,attributionControl:true,
        maxBounds:navigationBounds,maxBoundsViscosity:1,
        zoomAnimation:canAnimate(),fadeAnimation:canAnimate(),markerZoomAnimation:canAnimate()});
      const constrainZoom = () => map.setMinZoom(Math.min(19,map.getBoundsZoom(navigationBounds,true)));
      constrainZoom();
      map.on('resize',constrainZoom);
      map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
      map.setView(TRIP_MAP_DATA.center,12);
      L.control.zoom({position:'topleft',zoomInTitle:'Phóng to',zoomOutTitle:'Thu nhỏ'}).addTo(map);
      L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
      tiles = L.tileLayer(TRIP_MAP_DATA.tileUrl,{maxZoom:19,keepBuffer:1,updateWhenIdle:true,
        attribution:TRIP_MAP_DATA.tileAttribution});
      const failedTiles = new Set();
      const tileStatus = () => {
        if (failedTiles.size) setStatus('Chưa tải được đủ nền bản đồ. Các điểm và lịch trình vẫn xem được.',true);
        else if (canvas.querySelector('.leaflet-tile-loaded')) setStatus('');
      };
      tiles.on('loading',() => {
        clearTimeout(tileTimer);
        tileTimer = setTimeout(() => {
          if (map && tiles?.isLoading()) setStatus('Nền bản đồ đang tải chậm. Bạn vẫn có thể chọn điểm trong lịch trình.',true);
        },12000);
      });
      tiles.on('load',() => {
        clearTimeout(tileTimer);tileStatus();
      });
      tiles.on('tileload',event => { failedTiles.delete(event.tile.src);tileStatus(); });
      tiles.on('tileerror',event => { failedTiles.add(event.tile.src);tileStatus(); });
      tiles.on('tileunload',event => { failedTiles.delete(event.tile.src);tileStatus(); });
      tiles.addTo(map);
      markerLayer = L.layerGroup().addTo(map);
      routeLayer = L.layerGroup().addTo(map);
      map.on('zoomend',() => {
        paintMap();
        if (markerFocusId) {
          markers.get(markerFocusId)?.getElement()?.focus({preventScroll:true});
          markerFocusId = '';
        }
      });
      map.on('moveend',updateMarkerLabels);
      paintMap();
      const visit = selected();
      fitMap(false);
      if (hasPoint(places[visit?.placeId])) focusPlace(visit.placeId,false);
      requestAnimationFrame(() => { if (map && request === generation) map.invalidateSize({pan:false}); });
    } catch (_) {
      if (request === generation) setStatus('Chưa mở được bản đồ. Ảnh và lịch trình vẫn ở đây nhé.',true);
    }
  }
  function markerHtml(place, number, active, optional) {
    return `<span class="atlas-marker${active ? ' is-selected' : ''}${optional ? ' is-optional' : ''}">${place.art ? `<img src="${esc(art(place))}" alt="" draggable="false">` : icon(categoryIcons[place.category] || 'map-pin')}<span class="atlas-marker-number">${esc(number)}</span><span class="atlas-marker-dot"></span></span>`;
  }
  function paintMap() {
    if (!map) return;
    const activeMarker = document.activeElement;
    const focusId = [...markers].find(([,marker]) => marker.getElement() === activeMarker)?.[0];
    markerLayer.clearLayers();routeLayer.clearLayers();markers.clear();
    const all = filtered();
    const ids = unique(all).filter(id => hasPoint(places[id]) && (places[id].precision !== 'area' || selected()?.placeId === id));
    // Group by actual screen distance, including transitive neighbors. The
    // representative is an aggregate; individual coordinates stay unchanged.
    const groups = [];
    ids.forEach(id => {
      const point = map.project([places[id].lat,places[id].lng]);
      const touching = groups.filter(group => group.some(other => point.distanceTo(map.project([places[other].lat,places[other].lng])) < 72));
      if (!touching.length) groups.push([id]);
      else {
        const merged = [id,...touching.flat()];
        touching.forEach(group => groups.splice(groups.indexOf(group),1));
        groups.push(merged);
      }
    });
    groups.forEach(group => {
      const id = group.includes(selected()?.placeId) ? selected().placeId : group.find(key => places[key].category === 'stay') || group[0];
      const place = places[id], clustered = group.length > 1;
      const placeVisits = all.filter(visit => visit.placeId === id);
      const position = all.findIndex(visit => visit.placeId === id) + 1;
      const label = activeDay === 'all' || placeVisits[0].unordered ? '' : position;
      const active = selected()?.placeId === id;
      const title = clustered ? group.length + ' điểm gần nhau: ' + group.map(key => places[key].name).join(', ') : place.name;
      const center = clustered && !active ? [group.reduce((sum,key) => sum + places[key].lat,0)/group.length,group.reduce((sum,key) => sum + places[key].lng,0)/group.length] : [place.lat,place.lng];
      const html = clustered ? `<span class="atlas-cluster${active ? ' is-selected' : ''}">${place.art ? `<img src="${esc(art(place))}" alt="" draggable="false">` : icon('map-pin')}<span>${group.length}</span></span>` : markerHtml(place,label,active,placeVisits.every(visit => visit.optional));
      const marker = L.marker(center,{
        title,alt:title,keyboard:true,riseOnHover:true,zIndexOffset:active ? 1000 : 0,
        icon:L.divIcon({className:'atlas-marker-host' + (clustered ? ' atlas-cluster-host' : '') + (place.precision === 'area' ? ' atlas-area-marker' : ''),html,iconSize:[56,62],iconAnchor:[28,56]})
      }).addTo(markerLayer);
      marker.bindTooltip(esc(clustered ? group.length + ' điểm gần nhau' : place.name),{direction:'top',offset:[0,-48],className:'atlas-place-label'});
      marker.on('click',() => {
        if (clustered) {
          if (map.getZoom() < 19) {
            markerFocusId = marker.getElement() === document.activeElement ? id : '';
            const bounds = L.latLngBounds(group.map(key => [places[key].lat,places[key].lng]));
            const zoom = Math.min(19,Math.max(map.getZoom()+1,map.getBoundsZoom(bounds,false,[100,100])));
            map.setView(bounds.getCenter(),zoom,{animate:canAnimate(),duration:.35});
          } else {
            const choices = document.createElement('div');
            choices.className = 'atlas-overlap-choices';
            choices.setAttribute('aria-label','Chọn điểm gần nhau');
            group.forEach(key => {
              const button = document.createElement('button');
              button.type = 'button';button.textContent = places[key].name;
              button.addEventListener('click',() => {
                const visit = all.find(item => item.placeId === key);
                if (mode === 'preview') openAtlas(visit.day,visit);
                else { selectVisit(visit,false);detail.querySelector('.atlas-read')?.focus({preventScroll:true}); }
              });
              choices.append(button);
            });
            marker.bindPopup(choices).openPopup();
            choices.querySelector('button').focus({preventScroll:true});
          }
          return;
        }
        const visit = placeVisits.find(item => item.key === selectedKey) || placeVisits[0];
        if (mode === 'preview') openAtlas(visit.day,visit);
        else selectVisit(visit,false);
      });
      // DivIcon markers expose button semantics; activate both keyboard keys
      // explicitly rather than relying on browser-synthesized click events.
      L.DomEvent.on(marker.getElement(),'keydown',event => {
        if (event.key === 'Enter' || event.key === ' ') {
          L.DomEvent.stop(event);marker.fire('click');
        }
      });
      group.forEach(key => markers.set(key,marker));
    });
    // Never bridge an unresolved visit or impose an order on the afternoon group.
    let segments = 0;
    if (activeDay !== 'all' && mode !== 'preview') {
      for (let index = 1; index < all.length; index++) {
        const a = all[index - 1], b = all[index];
        const pa = places[a.placeId], pb = places[b.placeId];
        if (a.optional || b.optional || a.unordered || b.unordered || a.placeId === b.placeId || pa.status !== 'verified' || pb.status !== 'verified' || !hasPoint(pa) || !hasPoint(pb)) continue;
        L.polyline([[pa.lat,pa.lng],[pb.lat,pb.lng]],{color:'#946234',weight:2,opacity:.7,dashArray:'4 8',interactive:false}).addTo(routeLayer);
        segments++;
      }
    }
    dialog.querySelector('.atlas-route-key').hidden = !segments;
    updateMarkerLabels();
    if (focusId) markers.get(focusId)?.getElement()?.focus({preventScroll:true});
  }
  function updateMarkerLabels() {
    if (!map) return;
    const open = [];
    const entries = [...markers].sort(([a],[b]) => Number(b === selected()?.placeId) - Number(a === selected()?.placeId));
    const seen = new Set();
    entries.forEach(([id,marker]) => {
      if (seen.has(marker)) return;
      seen.add(marker);
      const point = map.latLngToContainerPoint(marker.getLatLng());
      const isolated = open.every(other => Math.abs(point.x-other.x) > 140 || Math.abs(point.y-other.y) > 72);
      if (selected()?.placeId === id || isolated) {
        const tooltip = marker.getTooltip();
        const direction = point.x < 135 && point.y < 180 ? 'right' : point.y < 85 ? 'bottom' : 'top';
        tooltip.options.direction = direction;
        tooltip.options.offset = L.point(direction === 'right' ? 26 : 0,direction === 'top' ? -48 : direction === 'bottom' ? 8 : -24);
        marker.openTooltip();tooltip.update();open.push(point);
      }
      else marker.closeTooltip();
    });
  }
  function fitMap(animate = true) {
    if (!map) return;
    const points = unique(filtered()).map(id => places[id]).filter(hasPoint).map(place => [place.lat,place.lng]);
    if (!points.length) {
      map.setView(TRIP_MAP_DATA.center,12,{animate:animate && canAnimate()});return;
    }
    if (points.length === 1) map.setView(points[0],13,{animate:animate && canAnimate()});
    else map.fitBounds(points,{padding:[55,65],maxZoom:14,animate:animate && canAnimate(),duration:.4});
  }
  function focusPlace(id, animate = true) {
    const place = places[id];
    if (!map || !hasPoint(place)) return;
    const options = {animate:animate && canAnimate(),duration:.35};
    if (place.precision === 'area') { map.setView([place.lat,place.lng],12,options);return; }
    let zoom = Math.max(mode === 'preview' ? 14 : 12,map.getZoom());
    const neighbors = unique(filtered()).filter(key => key !== id && hasPoint(places[key]) && places[key].precision !== 'area');
    while (zoom < 19 && neighbors.some(key => map.project([place.lat,place.lng],zoom).distanceTo(map.project([places[key].lat,places[key].lng],zoom)) < 82)) zoom++;
    if (mode === 'preview' || zoom !== map.getZoom() || !map.getBounds().pad(-.2).contains([place.lat,place.lng])) map.setView([place.lat,place.lng],zoom,options);
    updateMarkerLabels();
  }
  function renderList() {
    const all = filtered();
    dialog.querySelectorAll('[data-map-day]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mapDay === String(activeDay))));
    dialog.querySelector('#atlasListTitle').textContent = activeDay === 'all' ? 'Những nơi mình ghé' : (activeDay === 0 ? 'Hẹn nhau ở Hà Nội' : TRIP_DATA.days[activeDay].title);
    dialog.querySelector('#atlasListCount').textContent = unique(all).length + ' điểm';
    const points = unique(all).filter(id => hasPoint(places[id]) && places[id].precision !== 'area').length;
    const areas = unique(all).filter(id => hasPoint(places[id]) && places[id].precision === 'area').length;
    dialog.querySelector('#atlasMapCaption').textContent = activeDay === 0 ? 'Bản đồ Tà Xùa · điểm hẹn Hà Nội ở danh sách' : points + ' ghim' + (areas ? ' · ' + areas + ' khu vực tham khảo' : '') + ' · ' + unique(all).length + ' điểm trong lịch';
    list.innerHTML = all.map((visit,index) => {
      const place = places[visit.placeId];
      return `<li><button type="button" data-map-visit="${esc(visit.key)}" aria-pressed="${visit.key === selectedKey}"><span class="atlas-stop-symbol" aria-hidden="true">${visit.unordered ? icon('camera') : activeDay === 'all' ? icon(categoryIcons[place.category] || 'map-pin') : String(index + 1).padStart(2,'0')}</span><span><strong>${esc(place.name)}</strong><small>${activeDay === 'all' ? esc(visit.date) + ' · ' : ''}${esc(timeLabel(visit))}${visit.optional ? ' · tùy chọn' : ''}${visit.unordered ? ' · chưa chốt thứ tự' : ''}</small>${!hasPoint(place) ? '<small class="atlas-unresolved">Vị trí đang xác nhận</small>' : ''}</span>${icon('chevron-right')}</button></li>`;
    }).join('');
    list.querySelectorAll('[data-map-visit]').forEach(button => button.addEventListener('click',() => selectVisit(visits.find(visit => visit.key === button.dataset.mapVisit))));
  }
  function renderDetail() {
    const visit = selected();
    if (!visit) {
      detail.innerHTML = `<div class="atlas-welcome"><div class="atlas-welcome-art" aria-hidden="true"><img src="./figures/decor/painted/map_home_base.webp" width="140" height="96" alt=""><img src="./figures/decor/painted/map_waterfall.webp" width="55" height="81" alt=""></div><h3>Một chuyến đi, nhiều điểm hẹn.</h3><p>Chọn một điểm trên bản đồ hoặc trong danh sách để xem ảnh và lịch ghé.</p><button type="button" class="atlas-explore">Đi từng chặng ${icon('arrow-right')}</button></div>`;
      detail.querySelector('.atlas-explore').addEventListener('click',() => {
        if (activeDay === 'all') changeDay(1);
        selectVisit(filtered()[0]);
      });
      return;
    }
    const place = places[visit.placeId];
    const stop = TRIP_ASSETS.stops[visit.placeId];
    const asset = stop && TRIP_ASSETS.assets[stop.primaryAssetId];
    const guide = TRIP_DATA.placeGuides[visit.placeId];
    const samePlace = filtered().filter(item => item.placeId === visit.placeId);
    const shown = filtered();
    const index = shown.findIndex(item => item.key === visit.key);
    const warning = visit.block.warning || (visit.placeId === 'mom_ca_heo' ? 'Giữ khoảng cách với mép đá; chọn chỗ đứng vững.' : '');
    detail.innerHTML = `<article class="atlas-place"><figure class="atlas-photo">${asset ? `<img src="./${esc(asset.variants.find(variant => variant.width >= 480)?.src || asset.src)}" width="${asset.width}" height="${asset.height}" alt="${esc(stop.altVi)}" decoding="async">${asset.captionVi || stop.isIllustrative ? `<figcaption>${esc(asset.captionVi || stop.captionVi)}</figcaption>` : ''}` : `<img class="atlas-transfer-art" src="./figures/decor/painted/bus_sticker.webp" width="120" height="90" alt="">`}</figure>
      <div class="atlas-place-copy"><p class="atlas-place-time">${esc(visit.date)} · ${esc(timeLabel(visit))}${visit.optional ? ' · tùy chọn' : ''}</p><h3>${esc(place.name)}</h3>
      ${place.category === 'stay' ? '<p class="atlas-home-note">' + icon('house') + ' Nhà chung của cả hội</p>' : ''}
      ${samePlace.length > 1 ? `<label class="atlas-visit-label">Lần ghé<select id="atlasVisit">${samePlace.map(item => `<option value="${esc(item.key)}"${item.key === visit.key ? ' selected' : ''}>${esc(item.date + ' · ' + timeLabel(item) + ' · ' + (item.block.storyTitle || item.block.activity))}</option>`).join('')}</select></label>` : ''}
      <p>${esc(guide?.paragraphs[0] || visit.block.description)}</p>
      ${visit.unordered ? '<p class="atlas-group-note">Cùng buổi chiều với Cây Cô Đơn, Lán Cô Đơn và Mỏm Cá Heo. Chưa chốt giờ và thứ tự riêng.</p>' : ''}
      ${warning ? `<p class="atlas-warning">${icon('flag')}${esc(warning)}</p>` : ''}
      <p class="atlas-location-note">${icon('map-pin')}${esc(hasPoint(place) ? place.note : 'Vị trí đang xác nhận. Chưa đặt ghim để tránh nhầm điểm.')}</p>
      <a class="atlas-read" href="#${esc(visit.anchor)}">Đọc đoạn này ${icon('arrow-right')}</a>
      ${asset ? `<details class="atlas-credit"><summary>Nguồn ảnh & vị trí</summary><p>${esc(asset.credit)}</p>${place.sourceUrls?.map((url,i) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Nguồn vị trí ${i + 1} ↗</a>`).join('') || ''}</details>` : ''}
      <div class="atlas-stepping"><button type="button" data-map-step="-1"${index <= 0 ? ' disabled' : ''}>${icon('arrow-left')} Trước</button><span>${index + 1} / ${shown.length}</span><button type="button" data-map-step="1"${index === shown.length - 1 ? ' disabled' : ''}>Tiếp ${icon('arrow-right')}</button></div></div></article>`;
    detail.querySelector('#atlasVisit')?.addEventListener('change',event => selectVisit(visits.find(item => item.key === event.target.value)));
    detail.querySelectorAll('[data-map-step]').forEach(button => button.addEventListener('click',() => {
      const next = shown[index + Number(button.dataset.mapStep)];
      if (next) selectVisit(next);
    }));
    detail.querySelector('.atlas-read').addEventListener('click',() => {
      const target = document.getElementById(visit.anchor);
      closeAtlas(false);
      requestAnimationFrame(() => { if (target) { target.setAttribute('tabindex','-1');target.focus({preventScroll:true}); } });
    });
  }
  function selectVisit(visit, move = true) {
    if (!visit) return;
    const focused = document.activeElement;
    const focusedVisit = focused?.dataset.mapVisit;
    const focusedStep = focused?.dataset.mapStep;
    const visitSelect = focused?.id === 'atlasVisit';
    const focusedMarker = focused?.classList.contains('atlas-marker-host');
    selectedKey = visit.key;
    renderList();renderDetail();paintMap();
    if (move) focusPlace(visit.placeId);
    if (dialog.open) dialog.querySelector('.atlas-sidebar').scrollTop = 0;
    if (focusedVisit) {
      const heading = detail.querySelector('h3');
      heading?.setAttribute('tabindex','-1');heading?.focus();
    }
    if (visitSelect) detail.querySelector('#atlasVisit')?.focus({preventScroll:true});
    if (focusedMarker) markers.get(visit.placeId)?.getElement()?.focus({preventScroll:true});
    if (focusedStep) {
      const button = detail.querySelector(`[data-map-step="${focusedStep}"]:not(:disabled)`) || detail.querySelector('[data-map-step]:not(:disabled)');
      button?.focus({preventScroll:true});
    }
  }
  function changeDay(day) {
    activeDay = day;
    selectedKey = '';
    renderList();renderDetail();paintMap();fitMap();
  }
  function closePreview(restoreFocus = false) {
    if (!preview) return;
    destroyMap();preview.remove();preview = null;
    previewButton?.setAttribute('aria-expanded','false');
    if (restoreFocus) previewButton?.focus({preventScroll:true});
    previewButton = null;
    window.JourneyMotion?.refresh();
  }
  function openAtlas(day = 'all', visit) {
    opener = document.activeElement;
    menuOpener = opener?.closest('[data-trail-day]') ? Number(opener.closest('[data-trail-day]').dataset.trailDay.replace('day-','')) : null;
    closePreview();
    activeDay = day;selectedKey = visit?.key || '';
    if (visit?.optional) { includeOptional = true;dialog.querySelector('#atlasOptional').checked = true; }
    document.querySelector('.chapter-nav').dataset.open = 'false';
    document.getElementById('trailPanel').hidden = true;
    document.getElementById('chapterToggle').setAttribute('aria-expanded','false');
    dialog.classList.remove('is-expanded');
    dialog.querySelector('.atlas-sheet-toggle').setAttribute('aria-expanded','false');
    dialog.querySelector('.atlas-sheet-toggle span').textContent = 'Xem thêm chi tiết';
    renderList();renderDetail();
    mode = 'atlas';
    dialog.showModal();
    document.documentElement.classList.add('atlas-open');
    dialog.querySelector('.atlas-close').focus({preventScroll:true});
    mountMap(dialog.querySelector('#atlasMapMount'));
  }
  let restoreOnClose = true;
  function closeAtlas(restore = true) {
    restoreOnClose = restore;
    if (dialog.open) dialog.close();
  }
  dialog.addEventListener('close',() => {
    destroyMap();mode = '';
    document.documentElement.classList.remove('atlas-open');
    if (restoreOnClose && menuOpener != null && document.documentElement.dataset.itineraryActive === 'true') {
      setTrailDay('day-' + menuOpener);
      document.querySelector('.chapter-nav').dataset.open = 'true';
      document.getElementById('trailPanel').hidden = false;
      document.getElementById('chapterToggle').setAttribute('aria-expanded','true');
    }
    if (restoreOnClose && opener?.isConnected) opener.focus({preventScroll:true});
    restoreOnClose = true;
  });
  dialog.addEventListener('cancel',event => { event.preventDefault();event.stopPropagation();closeAtlas(); });
  dialog.querySelector('.atlas-close').addEventListener('click',() => closeAtlas());
  dialog.addEventListener('click',event => { if (event.target === dialog) { const b = dialog.getBoundingClientRect();if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) closeAtlas(); } });
  dialog.querySelectorAll('[data-map-day]').forEach(button => button.addEventListener('click',() => changeDay(button.dataset.mapDay === 'all' ? 'all' : Number(button.dataset.mapDay))));
  dialog.querySelector('#atlasOptional').addEventListener('change',event => {
    includeOptional = event.target.checked;
    if (!filtered().some(visit => visit.key === selectedKey)) selectedKey = '';
    renderList();renderDetail();paintMap();fitMap();
  });
  dialog.querySelector('.atlas-reset').addEventListener('click',() => fitMap());
  dialog.querySelector('.atlas-sheet-toggle').addEventListener('click',event => {
    const button = event.currentTarget;
    const expanded = dialog.classList.toggle('is-expanded');
    button.setAttribute('aria-expanded',String(expanded));
    button.querySelector('span').textContent = expanded ? 'Xem rộng bản đồ' : 'Xem thêm chi tiết';
    requestAnimationFrame(() => map?.invalidateSize({pan:false}));
  });
  retry.addEventListener('click',() => {
    if (tiles) { setStatus('Đang thử tải lại nền bản đồ…');tiles.redraw(); }
    else if (surface.parentElement) mountMap(surface.parentElement);
  });
  invitation.querySelector('button').addEventListener('click',() => openAtlas());
  document.querySelectorAll('[data-trail-day]').forEach((section,index) => {
    const button = document.createElement('button');
    button.type = 'button';button.className = 'trail-map-action';
    button.innerHTML = icon('map') + ' Xem ngày này trên bản đồ';
    button.addEventListener('click',() => openAtlas(index));
    section.querySelector('.trail-heading').after(button);
  });
  visits.forEach(visit => {
    const root = document.getElementById(visit.anchor);
    const body = root?.querySelector('.event-body');
    if (!body) return;
    const button = document.createElement('button');
    button.type = 'button';button.className = 'place-map-action';
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls','map-preview-' + visit.anchor);
    button.setAttribute('aria-label','Xem vị trí: ' + places[visit.placeId].name);
    button.innerHTML = icon('map-pin') + '<span>Chỗ này ở đâu?</span>';
    body.append(button);
    button.addEventListener('click',() => {
      if (previewButton === button) { closePreview(true);return; }
      closePreview();
      activeDay = visit.day;selectedKey = visit.key;mode = 'preview';
      includeOptional = true;dialog.querySelector('#atlasOptional').checked = true;
      const place = places[visit.placeId];
      preview = document.createElement('section');preview.id = 'map-preview-' + visit.anchor;preview.className = 'place-map-preview';
      preview.setAttribute('aria-label','Vị trí ' + place.name);
      preview.innerHTML = `<div class="place-map-preview-heading"><strong>${esc(place.name)}</strong><button type="button" class="preview-close" aria-label="Đóng bản đồ nhỏ">${icon('x')}</button></div><div class="place-map-preview-mount"></div><p>${esc(hasPoint(place) ? place.note : 'Vị trí đang xác nhận; bản đồ hiển thị các điểm đã có tọa độ trong ngày.')}</p><button type="button" class="preview-atlas">Xem trong cả chuyến ${icon('arrow-right')}</button>`;
      button.after(preview);previewButton = button;
      button.setAttribute('aria-expanded','true');
      preview.querySelector('.preview-close').addEventListener('click',() => closePreview(true));
      preview.querySelector('.preview-atlas').addEventListener('click',() => { opener = button;openAtlas(visit.day,visit);opener = button; });
      mountMap(preview.querySelector('.place-map-preview-mount'));
      window.JourneyMotion?.refresh();
    });
  });
  document.addEventListener('keydown',event => { if (event.key === 'Escape' && preview && !dialog.open) closePreview(true); });
  addEventListener('beforeprint',() => { closeAtlas();closePreview(); });
  matchMedia('print').addEventListener('change',event => { if (event.matches) { closeAtlas();closePreview(); } });
  addEventListener('pagehide',() => { closeAtlas(false);closePreview(); });
  window.TripMap = {open:openAtlas,close:closeAtlas};
})();
