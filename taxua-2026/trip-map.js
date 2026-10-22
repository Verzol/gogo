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
  let exploring = false;
  let panelMode = '';
  let zoomControl;
  let nativeFullscreen = false;
  let nativeRequest = false;
  let fullscreenVersion = 0;
  let fullscreenExitAt = -Infinity;
  let panelOpener;
  let resizeFrame = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate = () => !reduced.matches && document.documentElement.dataset.motionPaused !== 'true';
  const filtered = () => visits.filter(visit => (activeDay === 'all' ? visit.day > 0 : visit.day === activeDay) && (includeOptional || !visit.optional));
  const unique = list => [...new Set(list.map(visit => visit.placeId))];
  const timeLabel = visit => visit.time == null ? visit.period + ' · chưa chốt giờ' : visit.time;
  const selected = () => visits.find(visit => visit.key === selectedKey);
  const treasureArt = (name, width, height, className = '') => `<img class="${className}" src="./figures/decor/painted/map_treasure_${name}.webp" width="${width}" height="${height}" alt="" decoding="async" draggable="false">`;
  function prepareDecoration(root) {
    root.querySelectorAll('img[alt=""]').forEach(image => {
      const hide = () => { image.hidden = true; };
      image.addEventListener('error',hide,{once:true});
      if (image.complete && !image.naturalWidth) hide();
    });
  }

  const invitation = document.createElement('div');
  invitation.className = 'map-invitation';
  invitation.innerHTML = `<button type="button" class="map-invitation-button" data-map-overview aria-haspopup="dialog" aria-controls="tripAtlas">
    <span class="map-invitation-art" aria-hidden="true">${treasureArt('scroll',640,294)}</span>
    <span class="map-invitation-copy"><strong>Bản đồ</strong><span>Những nơi mình ghé</span></span>${icon('arrow-right')}
  </button>`;
  const heroActions = document.querySelector('.hero-actions');
  heroActions.classList.add('has-map-entry');
  heroActions.append(invitation);
  prepareDecoration(invitation);

  const dialog = document.createElement('dialog');
  dialog.id = 'tripAtlas';
  dialog.className = 'trip-atlas';
  dialog.setAttribute('aria-labelledby','atlasTitle');
  const dateArt = ['decor/dino_ridge_day.webp',places.hanoi_pickup.art,places.thao_coffee.art,places.thao_nguyen_ta_xua.art,places.trung_tam_ta_xua.art];
  dialog.innerHTML = `<div class="atlas-shell"><header class="atlas-header"><div class="atlas-heading"><div class="atlas-title-plate"><h2 id="atlasTitle">Bản đồ trên mây</h2></div><p class="atlas-eyebrow">gogo · 22–25 tháng 10</p></div><div class="atlas-header-actions"><button type="button" class="atlas-fullscreen" aria-label="Toàn màn hình" aria-pressed="false">${icon('maximize')}<span class="atlas-fullscreen-label">Toàn màn hình</span></button><button type="button" class="atlas-close" aria-label="Đóng bản đồ">${icon('x')}</button></div></header>
    <div class="atlas-toolbar"><div class="atlas-dates" role="group" aria-label="Chọn ngày trên bản đồ">${['all',0,1,2,3].map((index,i) => `<button type="button" data-map-day="${index}" aria-pressed="${index === 'all'}"><img src="./figures/${esc(dateArt[i])}" width="54" height="40" alt="" decoding="async" draggable="false"><span>${index === 'all' ? 'Cả chuyến' : index ? esc(TRIP_DATA.days[index].date) : 'Đêm đi'}${index === 0 ? '<small>22/10</small>' : ''}</span></button>`).join('')}</div>
    <div class="atlas-options"><label><input type="checkbox" id="atlasOptional" checked> Cả điểm tùy chọn</label><button type="button" class="atlas-reset"><span class="atlas-compass" aria-hidden="true">${treasureArt('compass',192,239)}${icon('scan')}</span><span>Xem trọn ngày</span></button></div></div>
    <div class="atlas-body"><div class="atlas-geography"><div class="atlas-map-wrap" id="atlasMapMount"></div><div class="atlas-map-caption"><span class="atlas-legend-pin" aria-hidden="true"></span><span id="atlasMapCaption">Điểm ghé trong nhật ký</span><span class="atlas-route-key" hidden>··· thứ tự ghé, không phải đường đi</span></div></div>
    <aside class="atlas-sidebar" id="atlasSidePanel" aria-label="Điểm ghé và lịch trình"><div class="atlas-panel-heading"><button type="button" class="atlas-panel-back" aria-label="Về danh sách">${icon('arrow-left')}</button><h3 tabindex="-1">Điểm ghé</h3><button type="button" class="atlas-panel-close" aria-label="Thu gọn điểm ghé">${icon('chevron-down')}</button></div><div class="atlas-panel-tools"></div><label class="atlas-search-label">Tìm điểm ghé<input class="atlas-search" type="search" placeholder="Tên trong chuyến đi…" autocomplete="off"></label><p class="atlas-search-status" role="status" hidden></p><button type="button" class="atlas-sheet-toggle" aria-expanded="false">${icon('chevron-up')}<span>Xem thêm chi tiết</span></button><div id="atlasDetail"></div><section class="atlas-stop-index" aria-labelledby="atlasListTitle"><div class="atlas-list-heading"><h3 id="atlasListTitle">Những nơi mình ghé</h3><span id="atlasListCount"></span></div><ol id="atlasStops"></ol></section></aside></div><button type="button" class="atlas-locations" aria-expanded="false" aria-controls="atlasSidePanel">${icon('list')}<span>Điểm ghé</span><span class="atlas-location-count"></span></button><div class="atlas-map-tools"></div><section class="atlas-peek" aria-label="Điểm đang chọn" hidden></section></div>`;
  document.body.append(dialog);
  prepareDecoration(dialog);
  const shell = dialog.querySelector('.atlas-shell');
  const sidebar = dialog.querySelector('.atlas-sidebar');
  const fullscreenButton = dialog.querySelector('.atlas-fullscreen');
  const locationButton = dialog.querySelector('.atlas-locations');
  const peek = dialog.querySelector('.atlas-peek');
  const search = dialog.querySelector('.atlas-search');
  const options = dialog.querySelector('.atlas-options');
  const resetButton = dialog.querySelector('.atlas-reset');
  resetButton.setAttribute('aria-label','Xem trọn ngày');
  resetButton.title = 'Xem trọn ngày';
  // Large text can leave too little room for two independently sized panes.
  // Give the map and notes one scrolling surface in that case.
  const updateAtlasLayout = () => {
    if (!dialog.open) return;
    if (exploring) { measureExploration();resizeMap();return; }
    const available = dialog.clientHeight - dialog.querySelector('.atlas-header').offsetHeight - dialog.querySelector('.atlas-toolbar').offsetHeight;
    const flow = innerWidth < 768 && available < 390;
    if (dialog.classList.contains('atlas-flow') !== flow) {
      dialog.classList.toggle('atlas-flow',flow);
      requestAnimationFrame(() => map?.invalidateSize({pan:false}));
    }
  };
  if (typeof ResizeObserver !== 'undefined') {
    const atlasLayoutObserver = new ResizeObserver(updateAtlasLayout);
    atlasLayoutObserver.observe(dialog.querySelector('.atlas-header'));
    atlasLayoutObserver.observe(dialog.querySelector('.atlas-toolbar'));
    atlasLayoutObserver.observe(shell);
    atlasLayoutObserver.observe(peek);
  }
  addEventListener('resize',updateAtlasLayout);
  const detail = dialog.querySelector('#atlasDetail');
  const list = dialog.querySelector('#atlasStops');
  const surface = document.createElement('div');
  surface.className = 'trip-map-surface';
  surface.innerHTML = `<div class="trip-map-canvas" role="region" aria-label="Bản đồ các điểm ghé Tà Xùa"></div><div class="trip-map-status" role="status" hidden></div><button class="trip-map-retry" type="button" hidden>Thử tải lại</button>`;
  const canvas = surface.querySelector('.trip-map-canvas');
  const status = surface.querySelector('.trip-map-status');
  const retry = surface.querySelector('.trip-map-retry');

  function measureExploration() {
    if (!exploring || !dialog.open) return;
    const height = document.fullscreenElement === shell ? innerHeight : (window.visualViewport?.height || innerHeight);
    shell.style.setProperty('--explore-height',height + 'px');
    const root = shell.getBoundingClientRect();
    const header = dialog.querySelector('.atlas-header').getBoundingClientRect();
    const title = dialog.querySelector('.atlas-title-plate').getBoundingClientRect();
    const dates = dialog.querySelector('.atlas-dates').getBoundingClientRect();
    const actions = dialog.querySelector('.atlas-header-actions').getBoundingClientRect();
    const centeredLeft = (root.width-dates.width)/2+root.left;
    const shortLandscape = matchMedia('(max-height:550px) and (orientation:landscape)').matches;
    const crowded = shortLandscape ? title.right-root.left > 198 : centeredLeft < title.right+16 || centeredLeft+dates.width > actions.left-16;
    dialog.classList.toggle('atlas-tools-below',crowded);
    shell.style.setProperty('--explore-title-end',Math.ceil(header.bottom-root.top) + 'px');
    const toolbar = dialog.querySelector('.atlas-toolbar').getBoundingClientRect();
    shell.style.setProperty('--explore-top',Math.ceil(Math.max(header.bottom,toolbar.bottom)-root.top+12) + 'px');
    shell.style.setProperty('--explore-peek-height',peek.hidden || panelMode ? '0px' : Math.ceil(peek.getBoundingClientRect().height) + 'px');
  }
  function resizeMap() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (!map || !dialog.open || mode !== 'atlas') return;
      const size = map.getSize();
      if (size.x === canvas.clientWidth && size.y === canvas.clientHeight) return;
      const center = map.getCenter(), zoom = map.getZoom();
      map.invalidateSize({pan:false});
      map.setView(center,Math.max(zoom,map.getMinZoom()),{animate:false});
      paintMap();
    });
  }
  function mapPadding() {
    const box = canvas.getBoundingClientRect();
    const root = shell.getBoundingClientRect();
    const padding = {left:56,right:80,top:56,bottom:52};
    if (!exploring) return padding;
    // Include the sticker and its label, not just the coordinate beneath it.
    padding.top = parseFloat(shell.style.getPropertyValue('--explore-top')) + 100 || 180;
    if (!peek.hidden && !panelMode) {
      if (matchMedia('(max-height:550px) and (orientation:landscape)').matches) padding.left = Math.max(peek.getBoundingClientRect().right,locationButton.getBoundingClientRect().right)-box.left+48;
      else {
        padding.bottom += peek.getBoundingClientRect().height + 18;
        if (innerWidth < 768) padding.bottom += locationButton.getBoundingClientRect().height + 16;
      }
    }
    if (panelMode) {
      const panel = sidebar.getBoundingClientRect();
      if (matchMedia('(max-width:767px) and (min-height:551px)').matches) padding.bottom = Math.max(padding.bottom,root.bottom-panel.top+12);
      else padding.left = Math.max(padding.left,panel.right-box.left+48);
    }
    // Retain a useful camera region when text or the software keyboard grows.
    const horizontal = Math.min(1,Math.max(0,box.width-100)/(padding.left+padding.right));
    const vertical = Math.min(1,Math.max(0,box.height-12)/(padding.top+padding.bottom));
    padding.left *= horizontal;padding.right *= horizontal;
    padding.top *= vertical;padding.bottom *= vertical;
    return padding;
  }
  function filterLocations() {
    const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLocaleLowerCase('vi');
    const query = normalize(search.value.trim());
    let count = 0;
    list.querySelectorAll('li').forEach(row => {
      row.hidden = exploring && !!query && !normalize(row.querySelector('strong').textContent).includes(query);
      if (!row.hidden) count++;
    });
    sidebar.classList.toggle('atlas-searching',exploring && !!query);
    const result = dialog.querySelector('.atlas-search-status');
    result.hidden = !exploring || !query;
    result.textContent = count ? count + ' chặng phù hợp' : 'Không có điểm nào phù hợp.';
  }
  function setPanel(next, restoreFocus = false) {
    if (next === 'detail' && !selected()) next = 'list';
    if (next && !panelMode) panelOpener = document.activeElement;
    panelMode = exploring ? next : '';
    dialog.dataset.panel = panelMode;
    sidebar.inert = exploring && !panelMode;
    locationButton.setAttribute('aria-expanded',String(!!panelMode));
    dialog.querySelector('.atlas-panel-heading h3').textContent = panelMode === 'detail' ? 'Chuyện ở điểm hẹn' : 'Điểm ghé';
    measureExploration();
    if (restoreFocus) {
      const target = panelOpener?.isConnected && panelOpener.getClientRects().length ? panelOpener : locationButton;
      target.focus({preventScroll:true});
    }
  }
  function openPanel(next) {
    setPanel(next);
    sidebar.scrollTop = 0;
    dialog.querySelector('.atlas-panel-heading h3').focus({preventScroll:true});
    const place = places[selected()?.placeId];
    if (map && hasPoint(place)) {
      const padding = mapPadding();
      map.panInside([place.lat,place.lng],{paddingTopLeft:[padding.left,padding.top],paddingBottomRight:[padding.right,padding.bottom],animate:canAnimate()});
    }
  }
  function renderPeek() {
    const visit = selected();
    peek.hidden = !visit;
    dialog.classList.toggle('has-map-selection',!!visit);
    if (!visit) { measureExploration();return; }
    const place = places[visit.placeId], shown = filtered();
    const index = shown.findIndex(item => item.key === visit.key);
    const focusedStep = peek.contains(document.activeElement) ? document.activeElement.dataset.peekStep : null;
    peek.innerHTML = `<button type="button" class="atlas-peek-detail" aria-controls="atlasSidePanel" aria-label="Chi tiết: ${esc(place.name)}"><img src="${esc(art(place))}" width="54" height="50" alt=""><span><strong>${esc(place.name)}</strong><small>${esc(visit.date)} · ${esc(timeLabel(visit))}</small><span>Chi tiết ${icon('chevron-up')}</span></span></button><div class="atlas-peek-steps"><button type="button" data-peek-step="-1" aria-label="Chặng trước"${index <= 0 ? ' disabled' : ''}>${icon('arrow-left')}</button><span>${index+1} / ${shown.length} chặng</span><button type="button" data-peek-step="1" aria-label="Chặng tiếp"${index >= shown.length-1 ? ' disabled' : ''}>${icon('arrow-right')}</button></div>`;
    prepareDecoration(peek);
    peek.querySelector('.atlas-peek-detail').addEventListener('click',() => openPanel('detail'));
    peek.querySelectorAll('[data-peek-step]').forEach(button => button.addEventListener('click',() => {
      const next = shown[index + Number(button.dataset.peekStep)];
      if (next) selectVisit(next);
    }));
    if (focusedStep) (peek.querySelector(`[data-peek-step="${focusedStep}"]:not(:disabled)`) || peek.querySelector('[data-peek-step]:not(:disabled)'))?.focus({preventScroll:true});
    measureExploration();
  }
  function setExploration(enabled, requestNative = false) {
    const version = ++fullscreenVersion;
    exploring = enabled;
    dialog.classList.toggle('is-exploring',enabled);
    fullscreenButton.setAttribute('aria-pressed',String(enabled));
    fullscreenButton.setAttribute('aria-label',enabled ? 'Về khung bản đồ' : 'Toàn màn hình');
    fullscreenButton.title = enabled ? 'Về khung bản đồ' : 'Toàn màn hình';
    fullscreenButton.innerHTML = icon(enabled ? 'minimize' : 'maximize') + '<span class="atlas-fullscreen-label">' + (enabled ? 'Về khung bản đồ' : 'Toàn màn hình') + '</span>';
    if (enabled) {
      dialog.classList.remove('atlas-flow');
      dialog.querySelector('.atlas-panel-tools').append(options);
      dialog.querySelector('.atlas-map-tools').append(resetButton);
    } else {
      options.append(resetButton);
      dialog.querySelector('.atlas-toolbar').append(options);
    }
    setPanel('');
    filterLocations();
    zoomControl?.setPosition(enabled ? 'topright' : 'topleft');
    updateAtlasLayout();resizeMap();
    if (!enabled && document.fullscreenElement === shell) document.exitFullscreen?.().catch(() => {});
    if (enabled && !map) setPanel('list');
    if (enabled && requestNative && !nativeRequest && shell.requestFullscreen && document.fullscreenEnabled !== false) {
      nativeRequest = version;
      // A request can finish after close/reopen or a rapid restore click.
      (async () => { await shell.requestFullscreen();
        if (!dialog.open || !exploring || version !== fullscreenVersion) {
          if (document.fullscreenElement === shell) document.exitFullscreen().catch(() => {});
        }
      })().catch(() => {}).finally(() => { nativeRequest = false; });
    }
  }
  fullscreenButton.addEventListener('click',() => setExploration(!exploring,true));
  locationButton.addEventListener('click',() => panelMode ? setPanel('',true) : openPanel('list'));
  dialog.querySelector('.atlas-panel-close').addEventListener('click',() => setPanel('',true));
  dialog.querySelector('.atlas-panel-back').addEventListener('click',() => openPanel('list'));
  search.addEventListener('input',filterLocations);
  document.addEventListener('fullscreenchange',() => {
    if (document.fullscreenElement === shell) {
      if (!dialog.open || !exploring || (nativeRequest && nativeRequest !== fullscreenVersion)) {
        document.exitFullscreen().catch(() => {});
        return;
      }
      nativeFullscreen = true;
    }
    else if (nativeFullscreen) {
      nativeFullscreen = false;fullscreenExitAt = performance.now();
      if (exploring) { setExploration(false);fullscreenButton.focus({preventScroll:true}); }
    }
    if (dialog.open) { measureExploration();resizeMap(); }
  });
  window.visualViewport?.addEventListener('resize',() => { measureExploration();resizeMap(); });

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
      script.fetchPriority = 'high';
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
    map = null;tiles = null;zoomControl = null;markers.clear();
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
      zoomControl = L.control.zoom({position:exploring ? 'topright' : 'topleft',zoomInTitle:'Phóng to',zoomOutTitle:'Thu nhỏ'}).addTo(map);
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
      // Request tiles only after the opening day/selection has its final camera.
      tiles.addTo(map);
      requestAnimationFrame(() => { if (map && request === generation) map.invalidateSize({pan:false}); });
    } catch (_) {
      if (request === generation) {
        setStatus('Chưa mở được bản đồ. Ảnh và lịch trình vẫn ở đây nhé.',true);
        if (exploring) setPanel('list');
      }
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
      marker.on('click',event => {
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
              button.addEventListener('click',event => {
                const visit = all.find(item => item.placeId === key);
                if (mode === 'preview') openAtlas(visit.day,visit);
                else {
                  if (exploring && event.detail !== 0) setPanel('');
                  selectVisit(visit,exploring,event.detail === 0);
                  if (!exploring) detail.querySelector('.atlas-read')?.focus({preventScroll:true});
                }
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
        else {
          if (exploring && !event.exploreKeyboard) setPanel('');
          selectVisit(visit,exploring,!!event.exploreKeyboard);
        }
      });
      // DivIcon markers expose button semantics; activate both keyboard keys
      // explicitly rather than relying on browser-synthesized click events.
      L.DomEvent.on(marker.getElement(),'keydown',event => {
        if (event.key === 'Enter' || event.key === ' ') {
          L.DomEvent.stop(event);marker.fire('click',{exploreKeyboard:true});
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
    if (exploring) {
      const padding = mapPadding();
      map.fitBounds(points,{paddingTopLeft:[padding.left,padding.top],paddingBottomRight:[padding.right,padding.bottom],maxZoom:points.length === 1 ? 13 : 14,animate:animate && canAnimate(),duration:.4});
    } else if (points.length === 1) map.setView(points[0],13,{animate:animate && canAnimate()});
    else map.fitBounds(points,{padding:[55,65],maxZoom:14,animate:animate && canAnimate(),duration:.4});
  }
  function focusPlace(id, animate = true) {
    const place = places[id];
    if (!map || !hasPoint(place)) return;
    const options = {animate:animate && canAnimate(),duration:.35};
    if (place.precision === 'area' && !exploring) { map.setView([place.lat,place.lng],12,options);return; }
    let zoom = Math.max(mode === 'preview' ? 14 : 12,map.getZoom());
    const neighbors = unique(filtered()).filter(key => key !== id && hasPoint(places[key]) && places[key].precision !== 'area');
    while (zoom < 19 && neighbors.some(key => map.project([place.lat,place.lng],zoom).distanceTo(map.project([places[key].lat,places[key].lng],zoom)) < 82)) zoom++;
    if (exploring) {
      if (place.precision === 'area') zoom = 12;
      const padding = mapPadding();
      const point = [place.lat,place.lng];
      // Explicit selections recenter even at the current zoom. panInside only
      // revealed an offscreen point, leaving nearby selections at the old edge.
      const offset = L.point((padding.right-padding.left)/2,(padding.bottom-padding.top)/2);
      map.setView(map.unproject(map.project(point,zoom).add(offset),zoom),zoom,options);
    } else if (mode === 'preview' || zoom !== map.getZoom() || !map.getBounds().pad(-.2).contains([place.lat,place.lng])) map.setView([place.lat,place.lng],zoom,options);
    updateMarkerLabels();
  }
  function renderList() {
    const all = filtered();
    dialog.querySelector('.atlas-location-count').textContent = unique(all).length;
    dialog.querySelectorAll('[data-map-day]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mapDay === String(activeDay))));
    dialog.querySelector('#atlasListTitle').textContent = activeDay === 'all' ? 'Những nơi mình ghé' : (activeDay === 0 ? 'Hẹn nhau ở Hà Nội' : TRIP_DATA.days[activeDay].title);
    dialog.querySelector('#atlasListCount').textContent = unique(all).length + ' điểm';
    const points = unique(all).filter(id => hasPoint(places[id]) && places[id].precision !== 'area').length;
    const areas = unique(all).filter(id => hasPoint(places[id]) && places[id].precision === 'area').length;
    dialog.querySelector('#atlasMapCaption').textContent = activeDay === 0 ? 'Điểm hẹn · 68 Mạc Thái Tông, Hà Nội' : points + ' ghim' + (areas ? ' · ' + areas + ' khu vực tham khảo' : '') + ' · ' + unique(all).length + ' điểm trong lịch';
    list.innerHTML = all.map((visit,index) => {
      const place = places[visit.placeId];
      const previous = all[index - 1];
      const connected = previous && previous.day === visit.day && !previous.optional && !visit.optional && !previous.unordered && !visit.unordered;
      return `<li class="${connected ? 'atlas-stop-connected' : ''}${visit.optional ? ' atlas-stop-optional' : ''}"><button type="button" data-map-visit="${esc(visit.key)}" aria-pressed="${visit.key === selectedKey}"><span class="atlas-stop-symbol" aria-hidden="true"><img src="${esc(art(place))}" width="44" height="42" alt="" loading="lazy" decoding="async"><span class="atlas-stop-count">${visit.unordered ? icon('camera') : String(index + 1).padStart(2,'0')}</span></span><span><strong>${esc(place.name)}</strong><small>${activeDay === 'all' ? esc(visit.date) + ' · ' : ''}${esc(timeLabel(visit))}${visit.optional ? ' · tùy chọn' : ''}${visit.unordered ? ' · chưa chốt thứ tự' : ''}</small>${!hasPoint(place) ? '<small class="atlas-unresolved">Vị trí đang xác nhận</small>' : ''}</span>${icon('chevron-right')}</button></li>`;
    }).join('');
    prepareDecoration(list);
    filterLocations();
    list.querySelectorAll('[data-map-visit]').forEach(button => button.addEventListener('click',event => selectVisit(visits.find(visit => visit.key === button.dataset.mapVisit),true,event.detail === 0)));
  }
  function renderDetail() {
    const visit = selected();
    renderPeek();
    if (!visit) {
      detail.innerHTML = `<div class="atlas-welcome"><div class="atlas-welcome-art" aria-hidden="true">${treasureArt('field_kit',480,355)}</div><h3>Một chuyến đi,<br> nhiều điểm hẹn.</h3><p>Chọn một điểm trên bản đồ hoặc trong danh sách để xem ảnh và lịch ghé.</p><button type="button" class="atlas-explore">Đi từng chặng ${icon('arrow-right')}</button></div>`;
      prepareDecoration(detail);
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
    detail.innerHTML = `<article class="atlas-place${asset ? '' : ' atlas-place-transfer'}"><figure class="atlas-photo">${asset ? `<img src="./${esc(asset.variants.find(variant => variant.width >= 480)?.src || asset.src)}" width="${asset.width}" height="${asset.height}" alt="${esc(stop.altVi)}" decoding="async">${asset.captionVi || stop.isIllustrative ? `<figcaption>${esc(asset.captionVi || stop.captionVi)}</figcaption>` : ''}` : `<img class="atlas-transfer-art" src="./figures/decor/painted/bus_sticker.webp" width="120" height="90" alt="">`}</figure>
      <div class="atlas-place-copy"><p class="atlas-place-time">${esc(visit.date)} · ${esc(timeLabel(visit))}${visit.optional ? ' · tùy chọn' : ''}</p><h3>${esc(place.name)}</h3>
      ${place.category === 'stay' ? '<p class="atlas-home-note">' + icon('house') + ' Nhà chung của cả hội</p>' : ''}
      ${samePlace.length > 1 ? `<label class="atlas-visit-label">Lần ghé<select id="atlasVisit">${samePlace.map(item => `<option value="${esc(item.key)}"${item.key === visit.key ? ' selected' : ''}>${esc(item.date + ' · ' + timeLabel(item) + ' · ' + (item.block.storyTitle || item.block.activity))}</option>`).join('')}</select></label>` : ''}
      <p>${esc(guide?.paragraphs[0] || visit.block.description)}</p>
      ${visit.unordered ? '<p class="atlas-group-note">Cùng buổi chiều với Cây Cô Đơn, Lán Cô Đơn và Mỏm Cá Heo. Chưa chốt giờ và thứ tự riêng.</p>' : ''}
      ${warning ? `<p class="atlas-warning">${icon('flag')}${esc(warning)}</p>` : ''}
      <p class="atlas-location-note">${icon('map-pin')}${esc(hasPoint(place) ? place.note : 'Vị trí đang xác nhận. Chưa đặt ghim để tránh nhầm điểm.')}</p>
      <a class="atlas-read" href="#${esc(visit.anchor)}">Đọc đoạn này ${icon('arrow-right')}</a>
      ${asset || place.sourceUrls?.length ? `<details class="atlas-credit"><summary>${asset ? 'Nguồn ảnh & vị trí' : 'Nguồn vị trí'}</summary>${asset ? `<p>${esc(asset.credit)}</p>` : ''}${place.sourceUrls?.map((url,i) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Nguồn vị trí ${i + 1} ↗</a>`).join('') || ''}</details>` : ''}
      <div class="atlas-stepping"><button type="button" data-map-step="-1"${index <= 0 ? ' disabled' : ''}>${icon('arrow-left')} Trước</button><span>${index + 1} / ${shown.length}</span><button type="button" data-map-step="1"${index === shown.length - 1 ? ' disabled' : ''}>Tiếp ${icon('arrow-right')}</button></div></div></article>`;
    prepareDecoration(detail);
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
  function selectVisit(visit, move = true, showDetails = false) {
    if (!visit) return;
    const focused = document.activeElement;
    const focusedVisit = focused?.dataset.mapVisit;
    const focusedStep = focused?.dataset.mapStep;
    const visitSelect = focused?.id === 'atlasVisit';
    const focusedMarker = focused?.classList.contains('atlas-marker-host');
    selectedKey = visit.key;
    renderList();renderDetail();paintMap();
    if (exploring) {
      if (showDetails) setPanel('detail');
      else if (focusedVisit || focusedMarker || focused?.closest('.atlas-overlap-choices')) setPanel('');
    }
    if (move) focusPlace(visit.placeId);
    if (dialog.open) dialog.querySelector('.atlas-sidebar').scrollTop = 0;
    if ((focusedVisit && !exploring) || (exploring && showDetails)) {
      const heading = detail.querySelector('h3');
      heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:exploring});
    }
    else if (exploring && focusedVisit) peek.querySelector('.atlas-peek-detail')?.focus({preventScroll:true});
    if (visitSelect) detail.querySelector('#atlasVisit')?.focus({preventScroll:true});
    if (focusedMarker && !(exploring && showDetails)) markers.get(visit.placeId)?.getElement()?.focus({preventScroll:true});
    if (focusedStep) {
      const button = detail.querySelector(`[data-map-step="${focusedStep}"]:not(:disabled)`) || detail.querySelector('[data-map-step]:not(:disabled)');
      button?.focus({preventScroll:true});
    }
  }
  function changeDay(day) {
    search.value = '';
    if (exploring) setPanel('');
    activeDay = day;
    selectedKey = day === 0 ? 'departure:hanoi_pickup' : '';
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
    activeDay = day;selectedKey = visit?.key || (day === 0 ? 'departure:hanoi_pickup' : '');
    if (visit?.optional) { includeOptional = true;dialog.querySelector('#atlasOptional').checked = true; }
    document.querySelector('.chapter-nav').dataset.open = 'false';
    document.getElementById('trailPanel').hidden = true;
    document.getElementById('chapterToggle').setAttribute('aria-expanded','false');
    search.value = '';
    setExploration(false);
    dialog.classList.remove('is-expanded');
    dialog.querySelector('.atlas-sheet-toggle').setAttribute('aria-expanded','false');
    dialog.querySelector('.atlas-sheet-toggle span').textContent = 'Xem thêm chi tiết';
    renderList();renderDetail();
    mode = 'atlas';
    dialog.showModal();
    updateAtlasLayout();
    document.documentElement.classList.add('atlas-open');
    dialog.querySelector('.atlas-close').focus({preventScroll:true});
    mountMap(dialog.querySelector('#atlasMapMount'));
  }
  let restoreOnClose = true;
  function closeAtlas(restore = true) {
    restoreOnClose = restore;
    setExploration(false);
    if (dialog.open) dialog.close();
  }
  dialog.addEventListener('close',() => {
    setExploration(false);
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
  function dismissAtlas() {
    // Escape is browser-owned during native fullscreen. Do not also close the
    // modal if the browser emits cancel while exiting the fullscreen shell.
    if (nativeFullscreen || nativeRequest || performance.now()-fullscreenExitAt < 250) return;
    if (exploring && panelMode) setPanel('',true);
    else if (exploring) { setExploration(false);fullscreenButton.focus({preventScroll:true}); }
    else closeAtlas();
  }
  dialog.addEventListener('keydown',event => {
    if (event.key !== 'Escape' || event.defaultPrevented || nativeFullscreen || nativeRequest || canvas.querySelector('.leaflet-popup')) return;
    // Handle before the browser's dialog close watcher: moving focused map
    // controls during cancel can otherwise also close the modal in Chromium.
    event.preventDefault();event.stopPropagation();dismissAtlas();
  });
  dialog.addEventListener('cancel',event => {
    event.preventDefault();event.stopPropagation();dismissAtlas();
  });
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
  // Warm only our local script near a map entry; web tiles still wait for opening.
  const mapTriggers = document.querySelectorAll('[data-map-overview],.trail-map-action,.place-map-action');
  let libraryWarmup;
  let warmupObserver;
  function warmMapLibrary() {
    if (libraryWarmup || window.L) { warmupObserver?.disconnect();return; }
    if (location.protocol === 'file:' || navigator.connection?.saveData) return;
    libraryWarmup = document.createElement('link');
    libraryWarmup.rel = 'preload';libraryWarmup.as = 'script';
    libraryWarmup.href = './vendor/leaflet/leaflet.js';
    libraryWarmup.fetchPriority = 'low';
    document.head.append(libraryWarmup);
    warmupObserver?.disconnect();
  }
  mapTriggers.forEach(button => {
    ['pointerenter','focus','pointerdown'].forEach(type => button.addEventListener(type,warmMapLibrary,{once:true,passive:true}));
  });
  if (typeof IntersectionObserver !== 'undefined' && location.protocol !== 'file:' && !navigator.connection?.saveData) {
    warmupObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) warmMapLibrary();
    },{rootMargin:'320px'});
    mapTriggers.forEach(button => warmupObserver.observe(button));
  }
  document.addEventListener('keydown',event => { if (event.key === 'Escape' && preview && !dialog.open) closePreview(true); });
  addEventListener('beforeprint',() => { closeAtlas();closePreview(); });
  matchMedia('print').addEventListener('change',event => { if (event.matches) { closeAtlas();closePreview(); } });
  addEventListener('pagehide',() => { closeAtlas(false);closePreview(); });
  window.TripMap = {open:openAtlas,close:closeAtlas};
})();
