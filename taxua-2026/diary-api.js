/* Optional private diary transport. The server owns every permission decision. */
(() => {
  'use strict';
  const endpoint = window.TAXUA_DIARY_CONFIG?.endpoint;
  const key = 'taxua-diary-session-v1';
  let session = null, refreshing = null, generation = 0;
  const requests = new Set(), pictures = new Map(), pendingPictures = new Map();
  class ApiError extends Error {
    constructor(code, status = 0) { super(code); this.code = code; this.status = status; }
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (saved?.access_token && saved?.refresh_token && saved?.member_id) session = saved;
  } catch (_) { /* Session remains memory-only when storage is unavailable. */ }
  function clear(reason = 'logout') {
    generation++;
    requests.forEach(controller => controller.abort());
    requests.clear();
    pictures.forEach(value => URL.revokeObjectURL(value));
    pictures.clear(); pendingPictures.clear(); session = null;
    try { sessionStorage.removeItem(key); } catch (_) { /* Optional storage. */ }
    window.dispatchEvent(new CustomEvent('taxua-diary-session', { detail: { reason } }));
  }
  function remember(value) {
    clear('switch'); session = value;
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Memory-only. */ }
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
  async function refresh() {
    if (!session) throw new ApiError('SESSION_EXPIRED', 401);
    if (!refreshing) {
      const snapshot = session, epoch = generation;
      refreshing = raw('refresh', { method: 'POST', body: { refresh_token: snapshot.refresh_token } })
        .then(value => {
          if (epoch !== generation) throw new ApiError('REQUEST_INTERRUPTED');
          session = value;
          try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Optional. */ }
          return value;
        }).catch(error => {
          if (error.status === 401 && epoch === generation) clear('expired');
          throw error;
        }).finally(() => { refreshing = null; });
    }
    return refreshing;
  }
  async function request(path, options = {}) {
    if (!session) throw new ApiError('SESSION_EXPIRED', 401);
    if (session.expires_at * 1000 < Date.now() + 60000) await refresh();
    const epoch = generation;
    try {
      const result = await raw(path, { ...options, token: session.access_token });
      if (epoch !== generation) throw new ApiError('REQUEST_INTERRUPTED');
      return result;
    } catch (error) {
      if (error.status !== 401 || epoch !== generation) throw error;
      await refresh();
      const retryEpoch = generation;
      try {
        const result = await raw(path, { ...options, token: session.access_token });
        if (retryEpoch !== generation) throw new ApiError('REQUEST_INTERRUPTED');
        return result;
      }
      catch (retryError) { if (retryError.status === 401) clear('expired'); throw retryError; }
    }
  }
  async function login(memberId, password, claim) {
    const oldToken = session?.access_token;
    const value = await raw(claim ? 'claim' : 'login', { method: 'POST', body: { member_id: memberId, password } });
    remember(value);
    if (oldToken) raw('logout', { method: 'POST', token: oldToken }).catch(() => {});
    return value;
  }
  async function photo(id, size = 'thumb') {
    const cacheKey = id + ':' + size, epoch = generation;
    if (pictures.has(cacheKey)) return pictures.get(cacheKey);
    if (!pendingPictures.has(cacheKey)) {
      pendingPictures.set(cacheKey, request('media/' + encodeURIComponent(id) + '?size=' + size, { binary: true })
        .then(blob => {
          if (epoch !== generation) throw new ApiError('REQUEST_INTERRUPTED');
          const value = URL.createObjectURL(blob); pictures.set(cacheKey, value); return value;
        }).finally(() => pendingPictures.delete(cacheKey)));
    }
    return pendingPictures.get(cacheKey);
  }
  window.TaxuaDiaryApi = Object.freeze({
    configured: Boolean(endpoint && location.protocol !== 'file:'),
    memberId: () => session?.member_id || null,
    hasSession: () => Boolean(session),
    status: () => raw('status'), login,
    read: () => request('read'), draft: () => request('draft'),
    saveDraft: body => request('save-draft', { method: 'POST', body }),
    publish: body => request('publish', { method: 'POST', body }),
    reservePhoto: () => request('reserve-photo', { method: 'POST', body: {} }),
    upload: (id, blob) => request('upload?id=' + encodeURIComponent(id), { method: 'POST', body: blob, binary: true, timeout: 60000 }),
    removePhoto: id => request('remove-photo', { method: 'POST', body: { id } }), photo,
    logout: async () => { try { if (session) await request('logout', { method: 'POST' }); } finally { clear(); } },
    clear: () => clear()
  });
})();
