// Optional, daily Open-Meteo enhancement. The story works without this script.
(() => {
  const config = TRIP_DATA.weather;
  const root = document.getElementById('tripWeather');
  if (!config || !root) return;
  const fields = ['weather_code','temperature_2m_min','temperature_2m_max','apparent_temperature_min','precipitation_probability_max','precipitation_sum','snowfall_sum','wind_speed_10m_max','wind_gusts_10m_max'];
  const arrivalDay = TRIP_DATA.days.findIndex(day => day.blocks.some(block => block.id === 'arrival'));
  if (arrivalDay < 0) return;
  const dates = [...new Set(TRIP_DATA.days.slice(arrivalDay).map(day => day.dateISO))];
  const cacheKey = 'taxua-weather-v1:' + JSON.stringify([config.latitude,config.longitude,config.timezone,fields,dates]);
  const hour = 60 * 60 * 1000;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let saved = null;
  let days = new Map();
  let fetching = false;
  let failed = false;
  let requestNumber = 0;
  let controller;
  let held = '';
  let hovered = '';
  let focused = '';
  let preview = '';
  let previewSignature = '';
  let cooldownUntil = 0;
  let pauseChoice = false;
  let midnightTimer;
  const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
  const display = value => finite(value) === null ? '—' : String(Math.round(value));
  const shortDate = date => date.slice(8,10) + '/' + date.slice(5,7);
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#trip-${name}"></use></svg>`;
  function today() {
    const parts = new Intl.DateTimeFormat('en-CA',{timeZone:config.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    return ['year','month','day'].map(type => parts.find(part => part.type === type).value).join('-');
  }
  function addDays(date,amount) { return new Date(Date.parse(date + 'T00:00:00Z') + amount * 86400000).toISOString().slice(0,10); }
  function eligible(date) { const now = today(); return date >= now && date <= addDays(now,15); }
  function normalize(payload) {
    const daily = payload?.daily;
    if (!daily || !Array.isArray(daily.time) || !['weather_code','temperature_2m_min','temperature_2m_max'].every(field => Array.isArray(daily[field]))) throw new Error('Invalid forecast');
    if (fields.some(field => daily[field] !== undefined && (!Array.isArray(daily[field]) || daily[field].length !== daily.time.length))) throw new Error('Invalid daily arrays');
    if (new Set(daily.time).size !== daily.time.length || !daily.time.every(date => /^\d{4}-\d{2}-\d{2}$/.test(date))) throw new Error('Invalid dates');
    return new Map(daily.time.filter(date => dates.includes(date)).map(date => {
      const i = daily.time.indexOf(date);
      const day = Object.fromEntries(fields.map(field => [field,finite(daily[field]?.[i])]));
      if (day.temperature_2m_min !== null && day.temperature_2m_max !== null && day.temperature_2m_min > day.temperature_2m_max) {
        day.temperature_2m_min = day.temperature_2m_max = null;
      }
      if (day.precipitation_probability_max < 0 || day.precipitation_probability_max > 100) day.precipitation_probability_max = null;
      return [date,{...day,date}];
    }));
  }
  function condition(day) {
    const code = day.weather_code;
    let label = 'Chưa rõ trạng thái', glyph = 'cloud', kind = 'cloudy', precipitation = '', intensity = .75, rainType = '';
    if ([0,1].includes(code)) { label = code === 0 ? 'Trời quang' : 'Ít mây'; glyph = 'sun'; kind = 'clear'; }
    else if (code === 2) { label = 'Mây rải rác'; glyph = 'cloud-sun'; }
    else if (code === 3) label = 'Nhiều mây';
    else if ([45,48].includes(code)) { label = code === 48 ? 'Sương mù đóng băng' : 'Sương mù'; glyph = 'cloud-fog'; kind = 'fog'; }
    else if ([51,53,55,56,57].includes(code)) {
      label = [56,57].includes(code) ? 'Mưa phùn đóng băng' : 'Mưa phùn'; glyph = 'cloud-drizzle'; kind = 'rain'; precipitation = 'rain'; rainType = 'drizzle'; intensity = [55,57].includes(code) ? .85 : code === 53 ? .75 : .65;
    }
    else if ([61,63,65,66,67,80,81,82].includes(code)) {
      label = [66,67].includes(code) ? 'Mưa đóng băng' : [80,81,82].includes(code) ? 'Mưa rào' : 'Có mưa'; glyph = 'cloud-rain'; kind = 'rain'; precipitation = 'rain';
      rainType = [65,67,82].includes(code) ? 'heavy' : [63,81].includes(code) ? 'moderate' : 'light'; intensity = rainType === 'heavy' ? 1 : rainType === 'moderate' ? .9 : .75;
    }
    else if ([71,73,75,77,85,86].includes(code) || (code === null && day.snowfall_sum > 0)) { label = 'Tuyết rơi'; glyph = 'cloud-snow'; kind = 'snow'; precipitation = 'snow'; intensity = [75,86].includes(code) ? .95 : [71,77].includes(code) ? .5 : .7; }
    else if ([95,96,99].includes(code)) { label = [96,99].includes(code) ? 'Dông, có thể mưa đá' : 'Mưa dông'; glyph = 'cloud-lightning'; kind = 'storm'; precipitation = 'rain'; rainType = 'storm'; intensity = 1; }
    const apparent = day.apparent_temperature_min ?? day.temperature_2m_min;
    const wind = Math.max(0,day.wind_speed_10m_max || 0);
    const gust = Math.max(wind,day.wind_gusts_10m_max || 0);
    // Daily maxima set a steady illustrative flow; gust excess adds strength
    // without pretending to provide a live, minute-by-minute wind reading.
    return {label,glyph,kind,precipitation,rainType,intensity,cold:apparent === null ? 0 : Math.min(.6,Math.max(0,(14 - apparent) / 20)),windFactor:Math.min(3.8,1 + wind / 18 + (gust - wind) / 80),windSlant:Math.min(24,wind * .45 + (gust - wind) * .12)};
  }
  const usable = day => !!day && (day.weather_code !== null || day.temperature_2m_min !== null || day.temperature_2m_max !== null || day.snowfall_sum > 0);
  const available = date => eligible(date) && usable(days.get(date));
  function dateStatus(date) {
    if (date < today()) return config.past;
    if (!eligible(date)) return config.future;
    if (fetching && !days.has(date)) return config.loading;
    return failed ? config.unavailable : config.missing;
  }
  root.innerHTML = `<div class="weather-heading"><div><p class="weather-eyebrow">${esc(config.region)}</p><h2 id="weatherTitle">${esc(config.title)}</h2></div><button type="button" class="weather-motion" id="weatherMotion" aria-pressed="false"></button></div>
    <div class="weather-days" role="group" aria-label="Thời tiết những ngày ở Tà Xùa">${dates.map(date => `<button class="weather-day" type="button" data-date="${date}" aria-pressed="false" aria-disabled="true"><time datetime="${date}">${shortDate(date)}</time><span class="weather-icon">${icon('cloud')}</span><span class="weather-range">— / —°</span><span class="weather-condition">${esc(config.loading)}</span><span class="weather-probability"></span></button>`).join('')}</div>
    <div class="weather-context"><p class="weather-detail" id="weatherDetail" role="status" aria-live="polite"></p><p id="weatherFreshness"></p></div>
    <div class="weather-footer"><div class="weather-controls"><button type="button" id="weatherReset" hidden>${esc(config.reset)}</button><button type="button" class="weather-retry" id="weatherRetry" hidden>${esc(config.retry)}</button></div></div>`;
  root.hidden = false;
  const buttons = [...root.querySelectorAll('.weather-day')];
  const resetButton = document.getElementById('weatherReset');
  const retryButton = document.getElementById('weatherRetry');
  const motionButton = document.getElementById('weatherMotion');
  function freshness() {
    return saved && Date.now() - saved.fetchedAt >= hour ? 'Dự báo đã lưu' : '';
  }
  function updateDetail() {
    const day = days.get(preview);
    const detail = document.getElementById('weatherDetail');
    if (day && preview) {
      const wind = day.wind_speed_10m_max === null ? '' : ` · Gió ${display(day.wind_speed_10m_max)} km/h`;
      const gust = day.wind_gusts_10m_max === null ? '' : `${wind ? ', g' : ' · G'}iật ${display(day.wind_gusts_10m_max)} km/h`;
      detail.textContent = `${shortDate(preview)}${wind}${gust}`;
    } else detail.textContent = fetching ? config.loading : failed ? config.unavailable : dates.some(available) ? '' : dates.every(date => date < today()) ? config.past : dates.some(eligible) ? config.missing : config.future;
    document.getElementById('weatherFreshness').textContent = freshness();
  }
  function render() {
    buttons.forEach(button => {
      const date = button.dataset.date;
      const day = days.get(date);
      const enabled = available(date);
      button.setAttribute('aria-disabled',String(!enabled));
      button.querySelector('.weather-icon').innerHTML = icon(enabled ? condition(day).glyph : 'cloud');
      button.querySelector('.weather-range').textContent = enabled ? `${display(day.temperature_2m_min)} / ${display(day.temperature_2m_max)}°` : '— / —°';
      button.querySelector('.weather-condition').textContent = enabled ? condition(day).label : failed && eligible(date) ? 'Chưa có dự báo' : dateStatus(date);
      button.querySelector('.weather-probability').textContent = enabled && day.precipitation_probability_max !== null ? `Giáng thủy ${display(day.precipitation_probability_max)}%` : '';
      button.setAttribute('aria-label',`${shortDate(date)}: ${enabled ? `${condition(day).label}, thấp ${display(day.temperature_2m_min)}, cao ${display(day.temperature_2m_max)} độ C` : dateStatus(date)}`);
    });
    retryButton.hidden = !failed || !dates.some(eligible);
    retryButton.disabled = fetching || Date.now() < cooldownUntil;
    if (preview && !available(preview)) clearPreview();
    updateDetail();
  }
  function syncPreview() {
    const candidate = hovered || focused || held;
    const next = JourneyScenery.heroActive() && available(candidate) ? candidate : '';
    const signature = next ? JSON.stringify(condition(days.get(next))) : '';
    if (next !== preview || signature !== previewSignature) {
      preview = next;
      previewSignature = signature;
      JourneyScenery.previewWeather(next ? condition(days.get(next)) : null);
    }
    buttons.forEach(button => {
      button.setAttribute('aria-pressed',String(button.dataset.date === held));
      button.dataset.preview = String(button.dataset.date === preview);
    });
    resetButton.hidden = !held;
    updateDetail();
  }
  function clearPreview() { held = hovered = focused = ''; syncPreview(); }
  buttons.forEach(button => {
    const date = button.dataset.date;
    button.addEventListener('pointerenter',event => { if (event.pointerType !== 'touch' && available(date)) { hovered = date; syncPreview(); } });
    button.addEventListener('pointerleave',() => { if (hovered === date) { hovered = ''; syncPreview(); } });
    button.addEventListener('focus',() => { if (button.matches(':focus-visible') && available(date)) { focused = date; syncPreview(); } });
    button.addEventListener('blur',() => { focused = ''; syncPreview(); });
    button.addEventListener('click',() => {
      if (!available(date)) return;
      held = held === date ? '' : date;
      // A tap/Enter toggles the held state. Hover resumes on pointer movement.
      hovered = focused = '';
      syncPreview();
    });
  });
  resetButton.addEventListener('click',clearPreview);
  document.addEventListener('keydown',event => { if (event.key === 'Escape') clearPreview(); });
  document.addEventListener('journey:opening-exit',clearPreview);
  function updateMotion() {
    const paused = reduced.matches || pauseChoice;
    document.documentElement.dataset.motionPaused = String(paused);
    motionButton.setAttribute('aria-pressed',String(paused));
    motionButton.disabled = reduced.matches;
    const label = reduced.matches ? 'Chuyển động đã tắt theo cài đặt thiết bị.' : paused ? config.resume : config.pause;
    motionButton.innerHTML = icon(paused ? 'play' : 'pause') + `<span class="sr-only">${esc(label)}</span>`;
    motionButton.setAttribute('aria-label',label);
    motionButton.title = label;
  }
  try { pauseChoice = localStorage.getItem('taxua-motion-paused') === 'true'; } catch (_) { /* Memory-only preference. */ }
  motionButton.addEventListener('click',() => {
    pauseChoice = !pauseChoice;
    try { localStorage.setItem('taxua-motion-paused',String(pauseChoice)); } catch (_) { /* Optional storage. */ }
    updateMotion();
  });
  reduced.addEventListener('change',updateMotion);
  updateMotion();
  function readCache() {
    try {
      const value = JSON.parse(localStorage.getItem(cacheKey));
      if (!value || finite(value.fetchedAt) === null || value.fetchedAt > Date.now() + 300000 || Date.now() - value.fetchedAt > 24 * hour) return;
      days = normalize(value.payload);
      saved = value;
    } catch (_) { /* Corrupt or denied storage must not block the journal. */ }
  }
  async function refresh() {
    if (fetching) return;
    const active = dates.filter(eligible);
    if (saved && Date.now() - saved.fetchedAt > 24 * hour) { saved = null; days.clear(); clearPreview(); }
    if (!active.length || (saved && Date.now() - saved.fetchedAt < hour)) { render(); return; }
    fetching = true; failed = false; render();
    const number = ++requestNumber;
    controller?.abort();
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),8000);
    try {
      const params = new URLSearchParams({latitude:config.latitude,longitude:config.longitude,timezone:config.timezone,temperature_unit:'celsius',wind_speed_unit:'kmh',daily:fields.join(','),start_date:active[0],end_date:active.at(-1)});
      const response = await fetch('https://api.open-meteo.com/v1/forecast?' + params,{signal:controller.signal});
      if (!response.ok) throw new Error('Forecast HTTP ' + response.status);
      const payload = await response.json();
      const normalized = normalize(payload);
      if (number !== requestNumber) return;
      days = normalized;
      saved = {fetchedAt:Date.now(),payload};
      try { localStorage.setItem(cacheKey,JSON.stringify(saved)); } catch (_) { /* In-memory cache remains active. */ }
    } catch (_) {
      if (number === requestNumber) failed = true;
    } finally {
      clearTimeout(timeout);
      if (number === requestNumber) { fetching = false; render(); syncPreview(); }
    }
  }
  retryButton.addEventListener('click',() => {
    if (Date.now() < cooldownUntil || fetching) return;
    cooldownUntil = Date.now() + 15000;
    retryButton.disabled = true;
    refresh();
    setTimeout(() => { retryButton.disabled = fetching; },15000);
  });
  function scheduleMidnight() {
    clearTimeout(midnightTimer);
    if (dates.at(-1) < today()) return;
    const midnight = Date.parse(addDays(today(),1) + 'T00:00:00+07:00');
    midnightTimer = setTimeout(() => {
      clearPreview();
      if (!document.hidden) refresh();
      scheduleMidnight();
    },Math.max(1,midnight - Date.now() + 50));
  }
  document.addEventListener('visibilitychange',() => { if (!document.hidden) { refresh(); scheduleMidnight(); } });
  addEventListener('pagehide',() => clearTimeout(midnightTimer));
  addEventListener('pageshow',() => { refresh(); scheduleMidnight(); });
  readCache();
  refresh();
  scheduleMidnight();
})();
