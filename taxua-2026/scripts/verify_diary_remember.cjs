/* Known-device login with deterministic local accounts. No real account writes. */
const assert = require('node:assert/strict'), fs = require('node:fs');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const { model, mock, session, authenticate } = require('./verify_diary.cjs');
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const key = 'taxua-diary-session-v1', password = 'browser-fixture-password';
const output = process.env.DIARY_REMEMBER_REVIEW_DIR || '/tmp/taxua-diary-remember-review';
const report = { checkedAt: new Date().toISOString(), transport: 'Mocked local accounts; no real crew writes', checks: [], errors: [] };
fs.mkdirSync(output, { recursive: true });
const check = (name, value) => { assert(value, name); report.checks.push(name); };
const stored = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
const owner = p => p.evaluate(() => TaxuaDiaryApi.memberId());
const read = p => p.evaluate(() => TaxuaDiaryApi.read().then(v => v.member_id).catch(e => e.code));
const callLogin = (p, member = 'san') => p.evaluate(({ member, password }) => TaxuaDiaryApi.login(member, password, false), { member, password });
async function runBrowser(type, label) {
  const b = await type.launch();
  const contexts = [];
  const fresh = async (m = model(), options = {}) => {
    const c = await b.newContext({ reducedMotion: 'reduce', ...options }); contexts.push(c);
    m.claims.san = password; m.claims.mi = password; m.refreshable = true;
    await mock(c, m);
    c.on('page', p => p.on('pageerror', e => report.errors.push(label + ': ' + e.message)));
    return { c, m };
  };
  const page = async c => { const p = await c.newPage(); await p.goto(url + '#crewDiary'); return p; };
  const waitOwner = (p, id) => p.waitForFunction(id => TaxuaDiaryApi.memberId() === id, id);
  const expire = p => p.evaluate(k => {
    const value = JSON.parse(localStorage.getItem(k)); value.expires_at = 1;
    localStorage.setItem(k, JSON.stringify(value));
  }, key);
  const test = (name, value) => check(label + ' ' + name, value);
  try {
    const { c, m } = await fresh(); const p = await page(c);
    await authenticate(p);
    const saved = await stored(p);
    test('login persists only credentials/member/expiry, never password', Object.keys(saved).sort().join() === 'access_token,expires_at,member_id,refresh_token' && !JSON.stringify(saved).includes(password));
    test('legacy tab credentials are removed', await p.evaluate(k => !sessionStorage.getItem(k), key));
    test('login explains remembered device', (await p.locator('#diaryRememberNote').textContent()).includes('nhớ cậu'));
    await p.reload(); await p.locator('#diaryOpen').click(); await p.locator('#diaryReader').waitFor({ state: 'visible' });
    test('reload opens remembered owner without password', await p.locator('#diaryPageLabel').textContent() === 'Trang của san' && !await p.locator('#diaryAuth').isVisible());
    const q = await page(c); await q.locator('#diaryOpen').click(); await q.locator('#diaryReader').waitFor({ state: 'visible' });
    test('new tab shares remembered login', await owner(q) === 'san' && await q.locator('#diaryReader').isVisible());
    const restored = await fresh(m, { storageState: await c.storageState() });
    const rp = await page(restored.c); await rp.locator('#diaryOpen').click(); await rp.locator('#diaryReader').waitFor({ state: 'visible' });
    test('browser storage restored after restart opens without password', await owner(rp) === 'san' && await rp.locator('#diaryReader').isVisible());
    await restored.c.close();
    const stranger = await fresh(m); const sp = await page(stranger.c); await sp.locator('#diaryOpen').click(); await sp.locator('#diaryAuth').waitFor({ state: 'visible' });
    test('fresh device still needs password', await sp.locator('#diaryAuth').isVisible() && !await owner(sp));
    await stranger.c.close();

    await p.locator('[data-edit="writing"]').click();
    await p.locator('#diaryEditBody').fill('Những dòng đang viết · chỉ trong trang này');
    // Do not allow autosave to mask a draft being destroyed by a token refresh.
    await expire(q);
    const before = m.requests.filter(a => a === 'refresh').length;
    const results = await Promise.all([read(p), read(q)]);
    test('two tabs silently renew one expired access token', results.every(v => v === 'san'));
    if (await p.evaluate(() => Boolean(navigator.locks))) test('cross-tab lock rotates refresh token once', m.requests.filter(a => a === 'refresh').length === before + 1);
    test('rotation persists new pair across tabs', (await stored(p)).refresh_token !== saved.refresh_token && await owner(q) === 'san');
    test('same-person rotation leaves editor and current writing intact', await p.locator('#diaryEditor').isVisible() && await p.locator('#diaryEditBody').inputValue() === 'Những dòng đang viết · chỉ trong trang này');
    test('persistent storage has no private writing', !JSON.stringify((await c.storageState()).origins.flatMap(o => o.localStorage)).includes('Những dòng đang viết'));
    await q.evaluate(() => TaxuaDiaryApi.logout()); await waitOwner(p, null);
    test('logout clears every tab and open editor', !await p.locator('#diaryEditor').isVisible() && await p.locator('#diaryPages').evaluate(e => !e.childElementCount) && !await stored(p));

    await callLogin(p); await waitOwner(q, 'san'); await p.locator('#diaryOpen').click();
    await p.locator('[data-edit="writing"]').click();
    await callLogin(q, 'mi'); await waitOwner(p, 'mi');
    test('account switch clears previous person private UI', !await p.locator('#diaryEditor').isVisible() && await p.locator('#diaryPages').evaluate(e => !e.childElementCount));
    test('new account remains usable after tab switch', await read(p) === 'mi');

    await expire(p);
    await c.route('**/taxua-diary/refresh', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"NETWORK_ERROR"}' }));
    test('temporary refresh outage does not forget device', await read(p) === 'NETWORK_ERROR' && await owner(p) === 'mi' && Boolean(await stored(p)));
    await p.reload(); await p.locator('#diaryOpen').click();
    await p.waitForFunction(() => !document.getElementById('diaryOpen').hasAttribute('aria-busy'));
    test('reopening during outage retains login without password prompt', !await p.locator('#diaryAuth').isVisible() && await owner(p) === 'mi' && Boolean(await stored(p)));
    await c.unroute('**/taxua-diary/refresh');
    test('retry after outage renews without password', await read(p) === 'mi');
    await expire(p); m.expire = true;
    test('revoked refresh forgets device', await read(p) === 'SESSION_EXPIRED' && !await owner(p) && !await stored(p));
    await p.locator('#diaryOpen').click(); await p.locator('#diaryAuth').waitFor({ state: 'visible' });
    test('revoked device is asked to log in', await p.locator('#diaryAuth').isVisible());

    // Each race uses an isolated context so unrelated storage events cannot hide it.
    for (const action of ['logout', 'switch']) {
      const race = await fresh(); const a = await page(race.c); await callLogin(a); await expire(a);
      let entered; const started = new Promise(resolve => { entered = resolve; });
      let release; const held = new Promise(resolve => { release = resolve; });
      await race.c.route('**/taxua-diary/refresh', async r => {
        const old = r.request().postDataJSON().refresh_token, member = race.m.sessions.get(old);
        const value = session(race.m, member); entered(); await held;
        await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) }).catch(() => {});
      });
      const pending = read(a); await started;
      if (action === 'logout') await a.evaluate(() => TaxuaDiaryApi.logout().catch(() => {}));
      else await callLogin(a, 'mi');
      release(); await pending;
      test('pending refresh cannot undo ' + action, await owner(a) === (action === 'logout' ? null : 'mi') && (await stored(a))?.member_id === (action === 'logout' ? undefined : 'mi'));
      await race.c.close();
    }

    // Older browsers lack Web Locks. A delayed rejection must respect a newer
    // token pair already saved by another tab rather than erasing it.
    const unlocked = await fresh();
    await unlocked.c.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined }));
    const u = await page(unlocked.c); await callLogin(u); await expire(u);
    const v = await page(unlocked.c);
    let unlockFailure, refreshStarted;
    const failedRefreshStarted = new Promise(resolve => { refreshStarted = resolve; });
    const delayedFailure = new Promise(resolve => { unlockFailure = resolve; });
    await u.route('**/taxua-diary/refresh', async r => {
      refreshStarted(); await delayedFailure;
      await r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"SESSION_EXPIRED"}' });
    });
    const olderRead = read(u); await failedRefreshStarted;
    test('browser without Web Locks silently refreshes', await read(v) === 'san');
    unlockFailure();
    test('stale rejection cannot erase another tab newer credentials', await olderRead === 'san' && await owner(u) === 'san' && Boolean(await stored(u)));
    await unlocked.c.close();

    const slow = await fresh(); const sl = await page(slow.c); await callLogin(sl);
    let releaseLogout, logoutEntered;
    const waitingLogout = new Promise(resolve => { logoutEntered = resolve; });
    const holdLogout = new Promise(resolve => { releaseLogout = resolve; });
    await slow.c.route('**/taxua-diary/logout', async r => { logoutEntered(); await holdLogout; await r.abort().catch(() => {}); });
    const logout = sl.evaluate(() => TaxuaDiaryApi.logout().then(() => 'ok').catch(e => e.code));
    await waitingLogout;
    test('logout forgets immediately before network finishes', !await owner(sl) && !await stored(sl));
    releaseLogout(); await logout;
    test('failed server logout never restores credentials', !await owner(sl) && !await stored(sl));
    await slow.c.close();

    const legacy = await fresh(); const ls = session(legacy.m, 'san');
    await legacy.c.addInitScript(({ key, value, origin }) => {
      if (location.origin === origin && !sessionStorage.getItem('seeded')) { sessionStorage.setItem(key, JSON.stringify(value)); sessionStorage.setItem('seeded', 'yes'); }
    }, { key, value: ls, origin: new URL(url).origin });
    const lp = await page(legacy.c);
    test('existing tab login migrates to persistent storage', await owner(lp) === 'san' && (await stored(lp)).access_token === ls.access_token && await lp.evaluate(k => !sessionStorage.getItem(k), key));
    await legacy.c.close();

    const quota = await fresh(); const qp = await page(quota.c); await callLogin(qp);
    const blockPersistentWrites = () => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, value) {
        if (this === localStorage) throw new DOMException('fixture quota', 'QuotaExceededError');
        return original.call(this, k, value);
      };
    };
    await quota.c.addInitScript(blockPersistentWrites); await qp.evaluate(blockPersistentWrites);
    await callLogin(qp, 'mi');
    test('quota fallback removes obsolete account before using tab storage', !await stored(qp) && await qp.evaluate(k => JSON.parse(sessionStorage.getItem(k)).member_id, key) === 'mi');
    await qp.reload();
    test('quota fallback reload restores latest person', await owner(qp) === 'mi' && await qp.evaluate(() => TaxuaDiaryApi.storageMode()) === 'tab');
    await quota.c.close();

    for (const mode of ['tab', 'memory']) {
      const fallback = await fresh();
      await fallback.c.addInitScript(mode => {
        Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage denied'); } });
        if (mode === 'memory') Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('storage denied'); } });
      }, mode);
      const fp = await page(fallback.c); await authenticate(fp);
      test(mode + ' fallback signs in without persistent storage', await owner(fp) === 'san' && await fp.evaluate(() => TaxuaDiaryApi.storageMode()) === mode);
      if (mode === 'tab') {
        await fp.reload(); test('tab fallback survives reload', await owner(fp) === 'san');
      }
      await fp.evaluate(() => TaxuaDiaryApi.logout());
      test(mode + ' fallback forgets on logout', !await owner(fp));
      await fallback.c.close();
    }
    for (const width of [1440, 390, 320]) {
      const visual = await fresh(model(), { viewport: { width, height: 1000 } }); const vp = await page(visual.c);
      await vp.locator('#diaryOpen').click(); await vp.locator('#diaryAuth').waitFor({ state: 'visible' });
      test(width + ' login and persistence hint fit dialog', await vp.locator('#diaryAuth').evaluate(el => el.scrollWidth <= el.clientWidth + 1) && await vp.locator('#diaryRememberNote').isVisible());
      await vp.locator('#diaryAuth').screenshot({ path: output + '/' + label + '-' + width + '-login.png' });
      await visual.c.close();
    }
  } finally { await Promise.all(contexts.map(c => c.close().catch(() => {}))); await b.close(); }
}
(async () => {
  await runBrowser(chromium, 'chromium');
  if (process.env.DIARY_WEBKIT === '1') await runBrowser(webkit, 'webkit');
  check('no uncaught browser errors', report.errors.length === 0);
  fs.writeFileSync(output + '/report.json', JSON.stringify(report, null, 2));
  console.log(report.checks.length + ' remembered-login checks passed; ' + output);
})().catch(e => { fs.writeFileSync(output + '/failure.json', JSON.stringify({ ...report, failure: e.stack }, null, 2)); console.error(e); process.exitCode = 1; });
