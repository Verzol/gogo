// Layered watercolor stage. Shared cutouts decode once; skies and stars scale
// to any viewport without enlarging a flattened concept image.
const JourneyScenery = (() => {
  const folder = './figures/scenery/painted/';
  const presets = {
    sunrise:{terrain:'',near:'ridge_near',sun:true,cloud:true},
    night:{terrain:'_night',near:'ridge_near',moon:true,stars:true},
    bluehour:{terrain:'_bluehour',near:'ridge_near',moon:true,stars:true,cloud:true},
    daylight:{terrain:'',near:'ridge_serrated',sun:true,cloud:true,detail:'rock_outcrop'},
    jade:{terrain:'',near:'meadow_left',sun:true,cloud:true,detail:'solitary_tree',lake:true},
    afternoon:{terrain:'',near:'meadow_right',sun:true,rays:false,cloud:true,detail:'hillside_hut'}
  };
  const loads = new Map();
  const panelLoads = new Map();
  const panels = new Map();
  function cutout(name,role,extra = '') {
    return `<img class="painted-piece ${role}" data-src="${folder}${name}.webp" alt="" decoding="async" ${extra}>`;
  }
  function stars() {
    let seed = 2026;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    let dots = '';
    for (let i = 0; i < 95; i++) {
      const x = random() * 1600, y = random() * 500;
      // Keep a quiet reading area; all stars stay above the mountain horizon.
      const opacity = (x > 340 && x < 1080 ? .24 : .6) * (.4 + random() * .6);
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(.5 + random() * 1.3).toFixed(1)}" opacity="${opacity.toFixed(2)}"/>`;
    }
    return `<svg class="painted-stars" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" fill="#ffedcb">${dots}</svg>`;
  }
  function init() {
    const stage = document.getElementById('sceneLayers');
    Object.entries(presets).forEach(([id,p]) => {
      const panel = document.createElement('div');
      panel.className = 'scene-panel scene-' + id;
      panel.dataset.background = id;
      panel.style.opacity = id === 'sunrise' ? 1 : 0;
      panel.innerHTML = `<div class="painted-sky"></div>${p.stars ? stars() : ''}
        ${p.sun ? `<div class="painted-sun">${p.rays !== false ? cutout('sun_rays','sun-rays') : ''}${cutout('sun_disc','sun-disc')}</div>` : ''}
        ${p.moon ? cutout('moon','painted-moon') : ''}
        ${p.cloud ? cutout('cloud_sky_puff','sky-cloud') + cutout('cloud_distant_wisp','high-wisp') : ''}
        <div class="painted-terrain">
          <div class="ridge-band ridge-far">${cutout('ridge_far' + p.terrain,'ridge-image')}<div class="ridge-fill"></div></div>
          ${p.cloud ? cutout('cloud_valley_ribbon','valley-cloud') : ''}
          <div class="ridge-band ridge-mid">${cutout('ridge_mid' + p.terrain,'ridge-image')}<div class="ridge-fill"></div></div>
          <div class="ridge-band ridge-near">${cutout(p.near + p.terrain,'ridge-image')}<div class="ridge-fill"></div></div>
          ${p.lake ? cutout('lake','valley-lake') : ''}
          ${p.detail ? cutout(p.detail,'landscape-detail detail-' + p.detail) : ''}
        </div>`;
      stage.appendChild(panel);
      panels.set(id,panel);
    });
  }
  function load(id) {
    const panel = panels.get(id);
    if (!panel) return Promise.resolve(false);
    if (panel.dataset.ready) return Promise.resolve(true);
    if (panelLoads.has(id)) return panelLoads.get(id);
    const decoded = Promise.all([...panel.querySelectorAll('img')].map(img => {
      const src = img.dataset.src;
      // Each instance still needs its own decoded pixels before it can paint.
      if (!loads.has(src)) {
        const resource = new Image();
        resource.src = src;
        loads.set(src,resource.decode().then(() => true,() => false));
      }
      return loads.get(src).then(ok => {
        if (!ok) { img.hidden = true; return; }
        if (!img.getAttribute('src')) img.src = src;
        return img.decode().catch(() => { img.hidden = true; });
      });
    })).then(() => {
      // The vector sky always works, even if an optional cutout fails to load.
      panel.dataset.ready = 'true';
      return true;
    });
    panelLoads.set(id,decoded);
    return decoded;
  }
  function drift(y) {
    const offset = Math.sin(y / (Math.max(1,innerHeight) * 5)) * 14;
    panels.forEach(panel => {
      if (Number(panel.style.opacity) > 0) panel.style.setProperty('--scenery-drift',offset.toFixed(2) + 'px');
    });
  }
  return {init,load,drift,isReady:id => !!panels.get(id)?.dataset.ready};
})();
