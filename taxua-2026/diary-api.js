/* Optional private diary transport. The server owns every permission decision. */
(() => {
  'use strict';
  const endpoint = window.TAXUA_DIARY_CONFIG?.endpoint;
  const key = 'taxua-diary-session-v1';
  let session = null, refreshing = null, generation = 0;
  let storage = null, storageMode = 'memory';
  const requests = new Set(), pictures = new Map(), pendingPictures = new Map();
  class ApiError extends Error {
    constructor(code, status = 0) { super(code); this.code = code; this.status = status; }
  }
  function parse(value) {
    try {
      const saved = JSON.parse(value);
      if (typeof saved?.access_token === 'string' && saved.access_token &&
          typeof saved.refresh_token === 'string' && saved.refresh_token &&
          typeof saved.member_id === 'string' && saved.member_id && Number.isFinite(saved.expires_at)) {
        return { member_id: saved.member_id, access_token: saved.access_token,
          refresh_token: saved.refresh_token, expires_at: saved.expires_at };
      }
    } catch (_) { /* Ignore an invalid saved record. */ }
    return null;
  }
  function remove(store) { try { window[store].removeItem(key); } catch (_) { /* Optional storage. */ } }
  function persist(value) {
    const serialized = JSON.stringify(value);
    try {
      localStorage.setItem(key, serialized); storage = localStorage; storageMode = 'local';
      remove('sessionStorage'); return;
    } catch (_) {
      // Never leave an older person's credentials ahead of the tab fallback.
      remove('localStorage');
    }
    try { sessionStorage.setItem(key, serialized); storageMode = 'tab'; }
    catch (_) { storageMode = 'memory'; }
    storage = null;
  }
  try {
    storage = localStorage; session = parse(storage.getItem(key));
    storage.setItem(key + '-probe', '1'); storage.removeItem(key + '-probe'); storageMode = 'local';
  } catch (_) { storage = null; /* Try the legacy tab session next. */ }
  if (!session) {
    try { session = parse(sessionStorage.getItem(key)); } catch (_) { /* Memory fallback. */ }
    if (session) persist(session);
  } else remove('sessionStorage');
  function reset(reason) {
    generation++;
    refreshing = null;
    requests.forEach(controller => controller.abort());
    requests.clear();
    pictures.forEach(value => URL.revokeObjectURL(value));
    pictures.clear(); pendingPictures.clear(); session = null;
    window.dispatchEvent(new CustomEvent('taxua-diary-session', { detail: { reason } }));
  }
  function clear(reason = 'logout') {
    remove('localStorage'); remove('sessionStorage'); reset(reason);
  }
  // Token rotation for the same person must not interrupt an open draft.
  function synchronize() {
    if (!storage) return;
    let saved;
    try { saved = parse(storage.getItem(key)); } catch (_) { return; }
    if (saved?.member_id !== session?.member_id) reset(saved ? 'switch' : 'logout');
    session = saved;
  }
  window.addEventListener('storage', event => {
    if (storage && event.storageArea === storage && (event.key === key || event.key === null)) {
      remove('sessionStorage'); synchronize();
    }
  });
  window.addEventListener('pageshow', synchronize);
  window.addEventListener('focus', synchronize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) synchronize(); });
  function remember(value) {
    reset('switch'); session = parse(JSON.stringify(value)); persist(session);
  }
  async function raw(path, { method = 'GET', body, token, binary = false, timeout = 30000 } = {}) {
    if (!endpoint || location.protocol === 'file:') throw new ApiError('CONNECTION_REQUIRED');
    const controller = new AbortController(); requests.add(controller);
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(endpoint + '/' + path, {
        method, body: body === undefined ? undefined : binary ? body : JSON.stringify(body),
        headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(body === undefined ? {} : { 'Content-Type': binary ? 'image/jpeg' : 'application/json' }) },
        cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(error.error || 'REQUEST_FAILED', response.status);
      }
      return binary && method === 'GET' ? response.blob() : response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(controller.signal.aborted ? 'REQUEST_INTERRUPTED' : 'NETWORK_ERROR');
    } finally { clearTimeout(timer); requests.delete(controller); }
  }
  async function refresh(failedToken) {
    if (!session) throw new ApiError('SESSION_EXPIRED', 401);
    if (!refreshing) {
      const epoch = generation;
      const renew = async () => {
        synchronize();
        if (epoch !== generation || !session) throw new ApiError('REQUEST_INTERRUPTED');
        // Another tab may have renewed while this tab waited for the lock.
        if (session.expires_at * 1000 >= Date.now() + 60000 &&
            (!failedToken || failedToken !== session.access_token)) return session;
        const snapshot = session;
        try {
          const value = await raw('refresh', { method: 'POST', body: { refresh_token: snapshot.refresh_token } });
          synchronize();
          if (epoch !== generation || !session) throw new ApiError('REQUEST_INTERRUPTED');
          if (session.refresh_token !== snapshot.refresh_token) return session;
          const next = parse(JSON.stringify(value));
          if (!next || next.member_id !== snapshot.member_id) throw new ApiError('INVALID_SESSION');
          session = next; persist(next); return next;
        } catch (error) {
          synchronize();
          if (epoch !== generation) throw new ApiError('REQUEST_INTERRUPTED');
          if (error.status === 401) {
            // A stale failure must never log out a newer login/rotation.
            if (session && session.refresh_token !== snapshot.refresh_token) return session;
            clear('expired');
          }
          throw error;
        }
      };
      const pending = (navigator.locks && storageMode === 'local'
        ? navigator.locks.request(key + '-refresh', renew) : renew())
        .finally(() => { if (refreshing === pending) refreshing = null; });
      refreshing = pending;
    }
    return refreshing;
  }
  async function request(path, options = {}) {
    synchronize();
    if (!session) throw new ApiError('SESSION_EXPIRED', 401);
    if (session.expires_at * 1000 < Date.now() + 60000) await refresh();
    const epoch = generation, token = session.access_token;
    try {
      const result = await raw(path, { ...options, token });
      if (epoch !== generation) throw new ApiError('REQUEST_INTERRUPTED');
      return result;
    } catch (error) {
      if (error.status !== 401 || epoch !== generation) throw error;
      await refresh(token);
      const retryEpoch = generation, retryToken = session.access_token;
      try {
        const result = await raw(path, { ...options, token: retryToken });
        if (retryEpoch !== generation) throw new ApiError('REQUEST_INTERRUPTED');
        return result;
      } catch (retryError) {
        synchronize();
        if (retryError.status === 401 && retryEpoch === generation && session?.access_token === retryToken) clear('expired');
        throw retryError;
      }
    }
  }
  async function login(memberId, password, claim) {
    synchronize();
    const oldToken = session?.access_token, epoch = generation;
    const value = await raw(claim ? 'claim' : 'login', { method: 'POST', body: { member_id: memberId, password } });
    if (epoch !== generation) throw new ApiError('REQUEST_INTERRUPTED');
    remember(value);
    if (oldToken) raw('logout', { method: 'POST', token: oldToken }).catch(() => {});
    return value;
  }
  function cachedPhoto(id, size = 'thumb') {
    synchronize();
    return session ? pictures.get(id + ':' + size) || null : null;
  }
  async function photo(id, size = 'thumb', { reload = false } = {}) {
    synchronize();
    if (!session) throw new ApiError('SESSION_EXPIRED', 401);
    const cacheKey = id + ':' + size, epoch = generation;
    if (reload && pictures.has(cacheKey)) {
      URL.revokeObjectURL(pictures.get(cacheKey)); pictures.delete(cacheKey);
    }
    if (pictures.has(cacheKey)) return pictures.get(cacheKey);
    if (!pendingPictures.has(cacheKey)) {
      const pending = request('media/' + encodeURIComponent(id) + '?size=' + size, { binary: true })
        .then(blob => {
          if (epoch !== generation) throw new ApiError('REQUEST_INTERRUPTED');
          const value = URL.createObjectURL(blob); pictures.set(cacheKey, value); return value;
        }).finally(() => { if (pendingPictures.get(cacheKey) === pending) pendingPictures.delete(cacheKey); });
      pendingPictures.set(cacheKey, pending);
    }
    return pendingPictures.get(cacheKey);
  }
  window.TaxuaDiaryApi = Object.freeze({
    configured: Boolean(endpoint && location.protocol !== 'file:'),
    memberId: () => session?.member_id || null,
    hasSession: () => Boolean(session),
    storageMode: () => storageMode,
    status: () => raw('status'), login,
    read: () => request('read'), draft: () => request('draft'),
    saveDraft: body => request('save-draft', { method: 'POST', body }),
    publish: body => request('publish', { method: 'POST', body }),
    reservePhoto: () => request('reserve-photo', { method: 'POST', body: {} }),
    upload: (id, blob) => request('upload?id=' + encodeURIComponent(id), { method: 'POST', body: blob, binary: true, timeout: 60000 }),
    removePhoto: id => request('remove-photo', { method: 'POST', body: { id } }), photo, cachedPhoto,
    logout: async () => {
      synchronize();
      const previous = session;
      clear(); // Forget this device now, even if revocation is slow/offline.
      if (!previous) return;
      try { await raw('logout', { method: 'POST', token: previous.access_token }); }
      catch (error) {
        if (error.status !== 401) throw error;
        // Renew only to revoke; never restore the remembered login.
        const renewed = await raw('refresh', { method: 'POST', body: { refresh_token: previous.refresh_token } });
        await raw('logout', { method: 'POST', token: renewed.access_token });
      }
    },
    clear: () => clear()
  });
})();
