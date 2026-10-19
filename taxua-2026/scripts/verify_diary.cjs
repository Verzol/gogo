/* Browser interaction/visual regression with a deterministic transport fixture.
 * Server authorization is tested separately by verify_diary_backend.cjs.
 */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || '../../hue-2026/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-diary-browser-review';
const url = process.env.TRIP_PREVIEW_URL || 'http://127.0.0.1:8000/taxua-2026/';
const names = ['mi', 'san', 'thảo', 'quanlele', 'gtm', 'trường', 'linh'];
const ids = ['mi', 'san', 'thao', 'quanlele', 'gtm', 'truong', 'linh'];
const report = { checkedAt: new Date().toISOString(), transport: 'mocked; backend permissions tested separately', checks: [], errors: [], screenshots: [] };
fs.mkdirSync(output, { recursive: true });
const check = (label, value) => { assert(value, label); report.checks.push(label); };
const wait = p => p.waitForTimeout(1100);
const password = 'browser-fixture-password';
function model() {
  return { claims: {}, sessions: new Map(), failSave: false, expire: false, uploads: 0, requests: [],
    entries: ids.map((id, i) => ({ member_id: id, name: names[i], position: i + 1, title: '', body: '', photos: [], revision: 0, updated_at: null })), drafts: {}, libraries: {}, photos: {} };
}
function session(m, member) {
  const token = 'fixture-' + member + '-' + Math.random(); m.sessions.set(token, member);
  return { member_id: member, access_token: token, refresh_token: token, expires_at: Math.floor(Date.now() / 1000) + 3600 };
}
async function mock(context, m) {
  await context.addInitScript(() => {
    const fetchRequest = window.fetch;
    window.__diaryUploadChecks = [];
    window.fetch = async (url, options) => {
      if (String(url).includes('/taxua-diary/upload?') && options?.body instanceof Blob) {
        const bytes = new Uint8Array(await options.body.arrayBuffer());
        window.__diaryUploadChecks.push(bytes[0] === 255 && bytes[1] === 216 && bytes.length <= 2097152);
      }
      return fetchRequest(url, options);
    };
  });
  await context.route('**/functions/v1/taxua-diary/**', async route => {
    const request = route.request(), parsed = new URL(request.url()), action = parsed.pathname.split('/taxua-diary/')[1];
    m.requests.push(action);
    const send = (data, status = 200) => route.fulfill({ status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(data) });
    if (request.method() === 'OPTIONS') return send({});
    if (action === 'status') return send(ids.map((id, i) => ({ id, name: names[i], claimed: Boolean(m.claims[id]), busy: false })));
    const body = request.headers()['content-type']?.includes('application/json') ? request.postDataJSON() : {};
    if (action === 'claim' || action === 'login') {
      if (typeof body.password !== 'string' || !body.password.length) return send({ error: 'INVALID_PASSWORD' }, 400);
      if (action === 'claim') { if (m.claims[body.member_id]) return send({ error: 'ALREADY_CLAIMED' }, 409); m.claims[body.member_id] = body.password; }
      if (m.claims[body.member_id] !== body.password) return send({ error: 'LOGIN_FAILED' }, 401);
      m.expire = false; return send(session(m, body.member_id));
    }
    const token = request.headers().authorization?.slice(7), member = m.sessions.get(token);
    if (action === 'refresh') {
      const owner = m.sessions.get(body.refresh_token);
      if (!m.refreshable || !owner || m.expire) return send({ error: 'SESSION_EXPIRED' }, 401);
      m.sessions.delete(body.refresh_token);
      return send(session(m, owner));
    }
    if (!member || m.expire) return send({ error: 'SESSION_EXPIRED' }, 401);
    const saved = m.entries.find(e => e.member_id === member);
    if (action === 'read') return send({ member_id: member, entries: m.entries });
    if (action === 'logout') { m.sessions.delete(token); return send({ ok: true }); }
    const draft = m.drafts[member] ||= { ...structuredClone(saved), base_revision: saved.revision, revision: 0, library: [] };
    draft.library = m.libraries[member] ||= [];
    if (action === 'draft') {
      if (m.rejectDraftOnce) { m.rejectDraftOnce = false; return send({ error: 'SESSION_EXPIRED' }, 401); }
      return send(draft);
    }
    if (action === 'save-draft') {
      if (m.failSave) return send({ error: 'REQUEST_FAILED' }, 503);
      if (body.revision !== draft.revision) return send({ error: 'DRAFT_CONFLICT' }, 409);
      Object.assign(draft, body, { revision: draft.revision + 1 }); return send(draft);
    }
    if (action === 'publish') {
      if (body.revision !== draft.revision || body.base_revision !== saved.revision) return send({ error: 'ENTRY_CONFLICT' }, 409);
      Object.assign(saved, { title: draft.title, body: draft.body, photos: structuredClone(draft.photos), revision: saved.revision + 1, updated_at: new Date().toISOString() });
      draft.base_revision = saved.revision; draft.revision++; return send(draft);
    }
    if (action === 'reserve-photo') {
      const id = require('node:crypto').randomUUID(); m.photos[id] = { id, member_id: member }; return send(m.photos[id]);
    }
    if (action === 'upload') {
      // WebKit does not expose intercepted Blob bytes through postDataBuffer.
      // The fetch-boundary check above inspects the actual Blob in both engines.
      const bytes = request.postDataBuffer(); if (bytes) assert(bytes[0] === 255 && bytes[1] === 216 && bytes.length <= 2097152, 'Browser normalizes upload to bounded JPEG');
      const photo = m.photos[parsed.searchParams.get('id')]; Object.assign(photo, { state: 'ready', width: 640, height: 360 });
      m.libraries[member].push(photo); m.uploads++; return send(photo);
    }
    if (action.startsWith('media/')) return route.fulfill({ status: 200, contentType: 'image/webp', body: fs.readFileSync(path.join(root, 'figures/places/p13_1440.webp')) });
    if (action === 'remove-photo') { m.libraries[member] = m.libraries[member].filter(p => p.id !== body.id); return send({ ok: true }); }
    return send({ error: 'INVALID_ACTION' }, 400);
  });
}
async function authenticate(p, member = 'san', edit = false) {
  if (edit) {
    await p.locator('[data-edit="writing"]').click();
    await p.waitForFunction(() => document.getElementById('diaryAuth').open || document.getElementById('diaryEditor').open);
    if (await p.locator('#diaryEditor').isVisible()) return;
  } else await p.locator('#diaryOpen').click();
  await p.locator(`[name="diaryMember"][value="${member}"]`).check();
  await p.locator('#diaryAuthSubmit').waitFor({ state: 'visible' });
  await p.waitForFunction(() => !document.getElementById('diaryAuthSubmit').disabled);
  await p.locator('#diaryPassword').fill(password);
  if (await p.locator('#diaryConfirmField').isVisible()) await p.locator('#diaryPasswordConfirm').fill(password);
  await p.locator('#diaryAuthSubmit').click();
  await p.locator(edit ? '#diaryEditor' : '#diaryReader').waitFor({ state: 'visible' });
}
async function screenshot(p, selector, file) {
  await p.locator(selector).screenshot({ path: path.join(output, file) }); report.screenshots.push(file);
}
async function browserChecks(type, label) {
  const browser = await type.launch(label === 'webkit' && process.env.DIARY_WEBKIT_EXECUTABLE ? { executablePath: process.env.DIARY_WEBKIT_EXECUTABLE } : {});
  try {
    for (const [name, value] of Object.entries({ single: 'a', vietnamese: 'ơ', whitespace: ' ', long: 'mây🌤'.repeat(100) })) {
      const pc = await browser.newContext({ reducedMotion: 'reduce' }), pm = model();
      await mock(pc, pm); const pp = await pc.newPage();
      pp.on('pageerror', error => report.errors.push(label + ' password: ' + error.message));
      await pp.goto(url + '#crewDiary'); await pp.locator('#diaryOpen').click();
      await pp.locator('[name="diaryMember"][value="san"]').check();
      await pp.waitForFunction(() => !document.getElementById('diaryAuthSubmit').disabled);
      if (name === 'single') {
        check(label + ' password has no minimum, maximum or pattern rule', await pp.locator('#diaryPassword').evaluate(el => el.required && !el.hasAttribute('minlength') && !el.hasAttribute('maxlength') && !el.hasAttribute('pattern')));
        await pp.locator('#diaryAuthSubmit').click();
        check(label + ' empty password cannot claim a page', await pp.locator('#diaryPassword').evaluate(el => el.validity.valueMissing) && !pm.claims.san);
        await pp.evaluate(() => document.getElementById('diaryAuthForm').dispatchEvent(new Event('submit', { cancelable: true })));
        check(label + ' submit handler also rejects empty password', (await pp.locator('#diaryAuthStatus').innerText()).includes('không được để trống') && !pm.claims.san);
        await pp.locator('#diaryPassword').fill(value); await pp.locator('#diaryPasswordConfirm').fill('different');
        await pp.locator('#diaryAuthSubmit').click();
        check(label + ' confirmation still catches a typo', (await pp.locator('#diaryAuthStatus').innerText()).includes('chưa giống nhau') && !pm.claims.san);
      }
      await pp.locator('#diaryPassword').fill(value); await pp.locator('#diaryPasswordConfirm').fill(value);
      await pp.locator('#diaryAuthSubmit').click(); await pp.locator('#diaryReader').waitFor({ state: 'visible' });
      check(label + ' first claim preserves exact ' + name + ' password', pm.claims.san === value);
      await pp.locator('#diaryLogout').click(); await pp.locator('#diaryOpen').click();
      await pp.locator('[name="diaryMember"][value="san"]').check();
      await pp.waitForFunction(() => !document.getElementById('diaryAuthSubmit').disabled);
      await pp.locator('#diaryPassword').fill(value + 'x'); await pp.locator('#diaryAuthSubmit').click();
      await pp.waitForFunction(() => document.getElementById('diaryAuthStatus').textContent.includes('chưa đúng'));
      check(label + ' wrong ' + name + ' password remains denied', !await pp.locator('#diaryReader').isVisible());
      await pp.locator('#diaryPassword').fill(value); await pp.locator('#diaryAuthSubmit').click();
      await pp.locator('#diaryReader').waitFor({ state: 'visible' });
      check(label + ' subsequent login accepts ' + name + ' password', await pp.evaluate(() => window.TaxuaDiaryApi.hasSession()));
      await pc.close();
    }
    const m = model(), context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await mock(context, m); const p = await context.newPage(); p.on('pageerror', error => report.errors.push(label + ': ' + error.message));
    await p.goto(url + '#crewDiary'); await p.evaluate(() => document.fonts.ready);
    check(label + ' private writing absent before login', await p.locator('#diaryPages').evaluate(el => el.childElementCount === 0));
    check(label + ' seven immutable roster IDs', await p.evaluate(() => TRIP_DATA.members.length === 7 && new Set(TRIP_DATA.members.map(m => m.id)).size === 7));
    check(label + ' crew links select the diary', await p.locator('#crewGrid [data-diary-member]').count() === 7);
    await screenshot(p, '#crewDiary', label + '-closed.png');
    await authenticate(p);
    check(label + ' first claim opens correct owner', await p.locator('#diaryPageLabel').innerText() === 'Trang của san' && m.claims.san === password);
    check(label + ' passwords cleared after login', await p.locator('#diaryPassword').inputValue() === '' && await p.locator('#diaryPasswordConfirm').inputValue() === '');
    const logins = () => m.requests.filter(action => ['claim', 'login'].includes(action)).length;
    const initialLogins = logins();
    for (const side of ['writing', 'photos']) {
      await p.locator(`[data-edit="${side}"]`).click(); await p.locator('#diaryEditor').waitFor({ state: 'visible' });
      check(label + ' own ' + side + ' editor reuses the reading session', !await p.locator('#diaryAuth').isVisible() && logins() === initialLogins && await p.locator('#diaryEditorTitle').innerText() === 'Trang của san');
      await p.locator('[data-close-editor]').click();
    }
    m.refreshable = true; m.rejectDraftOnce = true;
    const refreshes = m.requests.filter(action => action === 'refresh').length;
    await p.locator('[data-edit="writing"]').click(); await p.locator('#diaryEditor').waitFor({ state: 'visible' });
    check(label + ' a refreshable editor session renews without another password', !await p.locator('#diaryAuth').isVisible() && logins() === initialLogins && m.requests.filter(action => action === 'refresh').length === refreshes + 1);
    await p.locator('[data-close-editor]').click(); m.refreshable = false;
    await p.reload(); await p.locator('#diaryOpen').click(); await p.locator('#diaryReader').waitFor({ state: 'visible' });
    await p.locator('[data-bookmark="1"]').click();
    await p.locator('[data-edit="writing"]').click(); await p.locator('#diaryEditor').waitFor({ state: 'visible' });
    check(label + ' restored tab session edits own page without login', !await p.locator('#diaryAuth').isVisible() && logins() === initialLogins);
    await p.locator('[data-close-editor]').click();
    await p.locator('[data-bookmark="0"]').click();
    check(label + ' other people have no writing or photo edit controls', await p.locator('#diaryPages [data-edit]').count() === 0);
    await p.locator('.diary-page-head').first().evaluate(el => el.insertAdjacentHTML('beforeend', '<button type="button" data-edit="writing">Injected edit</button>'));
    await p.locator('[data-edit="writing"]').click();
    check(label + ' injected foreign edit button cannot open an editor or switch accounts', !await p.locator('#diaryEditor').isVisible() && !await p.locator('#diaryAuth').isVisible() && await p.evaluate(() => window.TaxuaDiaryApi.memberId()) === 'san');
    await p.locator('[data-bookmark="1"]').click();
    m.expire = true;
    await p.locator('[data-edit="writing"]').click(); await p.locator('#diaryAuth').waitFor({ state: 'visible' });
    check(label + ' revoked editor session clears private content and requests owner login', !await p.locator('#diaryEditor').isVisible() && await p.locator('#diaryPages').evaluate(el => el.childElementCount === 0) && await p.locator('[name="diaryMember"][value="san"]').isChecked());
    m.expire = false;
    await p.locator('#diaryPassword').fill(password); await p.locator('#diaryAuthSubmit').click();
    await p.locator('#diaryEditor').waitFor({ state: 'visible' });
    check(label + ' reauthentication resumes the requested editor', await p.locator('#diaryEditorTitle').innerText() === 'Trang của san');
    await p.locator('[data-close-editor]').click();
    // The editable session label alone must never select somebody else's draft.
    await p.evaluate(() => {
      const saved = JSON.parse(sessionStorage.getItem('taxua-diary-session-v1'));
      saved.member_id = 'mi'; sessionStorage.setItem('taxua-diary-session-v1', JSON.stringify(saved));
    });
    await p.reload(); await p.locator('#diaryOpen').click(); await p.locator('#diaryReader').waitFor({ state: 'visible' });
    await p.locator('[data-edit="writing"]').click(); await p.locator('#diaryAuth').waitFor({ state: 'visible' });
    check(label + ' forged session owner cannot open a mismatched server draft', !await p.locator('#diaryEditor').isVisible() && await p.locator('[name="diaryMember"][value="mi"]').isChecked());
    await p.locator('[data-close-auth]').click();
    await p.evaluate(() => window.TaxuaDiaryApi.clear()); await authenticate(p, 'san');
    for (let i = 0; i < ids.length; i++) {
      await p.locator(`[data-bookmark="${i}"]`).click();
      check(label + ' paired spread ' + ids[i], await p.locator('.diary-page-writing').getAttribute('aria-label') === 'Lời viết của ' + names[i] && await p.locator('.diary-page-photos').getAttribute('aria-label') === 'Ảnh của ' + names[i]);
    }
    check(label + ' last boundary is disabled', await p.locator('[data-diary-edge="1"]').isDisabled());
    await p.locator('[data-bookmark="0"]').click();
    check(label + ' first boundary is disabled', await p.locator('[data-diary-edge="-1"]').isDisabled());
    await p.locator('[data-diary-edge="1"]').focus(); await p.keyboard.press('ArrowRight');
    check(label + ' keyboard changes whole person', await p.locator('#diaryPageLabel').innerText() === 'Trang của san');
    await authenticate(p, 'san', true);
    const writing = 'Đây là dữ liệu kiểm thử, không phải hồi ức của chuyến đi.\n\nDấu tiếng Việt: mây, núi, thảo, trường.';
    await p.locator('#diaryEditTitle').fill('<img src=x onerror=window.diaryXss=1>'); await p.locator('#diaryEditBody').fill(writing);
    await wait(p);
    check(label + ' autosave remains private draft', m.drafts.san.body === writing && !m.entries[1].body);
    await p.locator('[data-close-editor]').click();
    check(label + ' saved draft is absent from book until publication', await p.locator('.diary-empty-writing').isVisible());
    await authenticate(p, 'san', true);
    check(label + ' editor restores server draft', await p.locator('#diaryEditBody').inputValue() === writing);
    await p.locator('[data-editor-tab="photos"]').click();
    await p.locator('#diaryFiles').setInputFiles([path.join(root, 'figures/places/p13_1440.webp'), path.join(root, 'figures/places/p13_1440.webp')]);
    await p.waitForFunction(() => document.querySelectorAll('[data-photo-row]').length === 2 && !document.getElementById('diaryFiles').disabled);
    check(label + ' actual file input normalizes both uploads', m.uploads === 2 && m.drafts.san.photos.length === 2 && await p.evaluate(() => window.__diaryUploadChecks.length === 2 && window.__diaryUploadChecks.every(Boolean)));
    const firstId = m.drafts.san.photos[0].id;
    await p.locator('[data-caption]').first().fill('Ảnh kiểm thử · sẽ được xóa');
    await p.locator('[data-move-photo][data-direction="1"]').first().click(); await wait(p);
    check(label + ' photo caption follows keyboard-capable reorder', m.drafts.san.photos[1].id === firstId && m.drafts.san.photos[1].caption.includes('kiểm thử'));
    await p.locator('#diaryPublish').click(); await p.waitForFunction(() => document.getElementById('diarySaveStatus').textContent.includes('Đã lưu vào sổ'));
    check(label + ' explicit save publishes complete writing and photos', m.entries[1].body === writing && m.entries[1].photos.length === 2);
    await p.locator('[data-close-editor]').click();
    check(label + ' hostile text is rendered as text', await p.locator('.diary-entry-title').innerText() === '<img src=x onerror=window.diaryXss=1>' && !await p.evaluate(() => window.diaryXss));
    await p.waitForFunction(() => document.querySelectorAll('#diaryPages img[data-private-photo]:not([hidden])').length === 2);
    await screenshot(p, '#diaryReader', label + '-open-desktop.png');
    check(label + ' photo-page footer fits', await p.locator('.diary-page-photos').evaluate(el => el.scrollHeight <= el.clientHeight + 1));
    await p.locator('[data-full-writing]').click();
    check(label + ' complete reading sheet has full prose', await p.locator('.diary-full-writing').innerText() === writing);
    await p.locator('[data-close-sheet]').click();
    check(label + ' all uploaded photos are on the page without an album button', await p.locator('#diaryPages [data-view-photo]').count() === 2 && await p.locator('[data-album]').count() === 0);
    await p.locator('#diaryPages [data-view-photo]').first().click();
    check(label + ' full photograph opens separately', await p.locator('.diary-full-photo').count() === 1);
    await p.locator('[data-close-sheet]').click();
    for (const [width, height] of [[820, 1024], [390, 844], [320, 780], [740, 390]]) {
      await p.setViewportSize({ width, height }); await p.locator('[data-diary-side="writing"]').click();
      check(label + ' readable single page at ' + width, await p.locator('.diary-page-writing').isVisible() && !await p.locator('.diary-page-photos').isVisible());
      check(label + ' no horizontal overflow at ' + width, await p.evaluate(() => document.documentElement.scrollWidth === innerWidth));
      await p.locator('[data-diary-side="photos"]').click();
      check(label + ' photo switch preserves person at ' + width, await p.locator('.diary-page-photos').isVisible() && await p.locator('#diaryPageLabel').innerText() === 'Trang của san');
      await screenshot(p, '#diaryReader', label + '-photos-' + width + '.png');
    }
    await p.setViewportSize({ width: 390, height: 844 }); await p.locator('[data-diary-side="writing"]').click(); await authenticate(p, 'san', true);
    await screenshot(p, '#diaryEditor', label + '-editor-phone.png');
    m.failSave = true; await p.locator('#diaryEditBody').fill('Lời viết chưa có mạng.'); await wait(p);
    check(label + ' failed save preserves words and offers recovery', await p.locator('#diaryEditBody').inputValue() === 'Lời viết chưa có mạng.' && await p.locator('#diaryKeepWritingClose').isVisible());
    await p.locator('#diaryKeepWritingClose').click(); m.failSave = false;
    await authenticate(p, 'san', true); await p.locator('#diaryRestoreWriting').click(); await wait(p);
    check(label + ' memory recovery restores unsaved writing', m.drafts.san.body === 'Lời viết chưa có mạng.');
    m.drafts.san.revision++; await p.locator('#diaryEditBody').fill('Xung đột nhưng còn lời viết.'); await wait(p);
    check(label + ' revision conflict preserves local text', await p.locator('#diaryConflict').isVisible() && await p.locator('#diaryPublish').isDisabled() && await p.locator('#diaryEditBody').inputValue() === 'Xung đột nhưng còn lời viết.');
    await p.locator('#diaryReloadDraft').click(); await p.waitForFunction(() => !document.getElementById('diaryPublish').disabled); check(label + ' explicit reload resolves conflict', !await p.locator('#diaryPublish').isDisabled());
    await p.locator('#diaryEditBody').fill('Còn trong bộ nhớ khi phiên hết hạn.'); m.expire = true;
    await p.evaluate(() => window.TaxuaDiaryApi.read().catch(() => {}));
    check(label + ' session expiry removes protected DOM', await p.locator('#diaryPages').evaluate(el => el.childElementCount === 0) && !await p.locator('#diaryEditor').isVisible() && await p.locator('#diaryEditBody').inputValue() === '');
    m.expire = false; await authenticate(p); await authenticate(p, 'san', true);
    check(label + ' owner can recover unsynced text after reauthentication', await p.locator('#diaryRestoreWriting').isVisible());
    await p.locator('#diaryRestoreWriting').click(); await wait(p); await p.locator('[data-close-editor]').click();
    await p.setViewportSize({ width: 1440, height: 1000 }); await p.emulateMedia({ reducedMotion: 'no-preference' });
    await p.evaluate(() => document.documentElement.style.fontSize = '32px');
    await p.waitForFunction(() => document.getElementById('crewDiary').classList.contains('diary-large-text'));
    check(label + ' double-size text uses natural single-page reading', await p.locator('.diary-page-writing').isVisible() && !await p.locator('.diary-page-photos').isVisible() && await p.locator('.diary-writing').evaluate(el => getComputedStyle(el).overflowY === 'visible'));
    await p.evaluate(() => document.documentElement.style.fontSize = '');
    await p.waitForFunction(() => !document.getElementById('crewDiary').classList.contains('diary-large-text'));
    await p.locator('[data-diary-edge="1"]').click(); await p.waitForFunction(() => document.querySelector('.diary-turn-leaf'));
    check(label + ' decorative turn is inert and hidden from accessibility tree', await p.locator('.diary-turn-leaf').evaluate(el => el.inert && el.getAttribute('aria-hidden') === 'true'));
    check(label + ' turn visibly rotates in 3D', await p.locator('.diary-turn-leaf').evaluate(async el => {
      const animation = el.getAnimations()[0]; animation.pause(); animation.currentTime = 380;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const transform = getComputedStyle(el.querySelector('.diary-sheet-strip')).transform; animation.play(); return transform.startsWith('matrix3d(');
    }));
    await p.locator('[data-diary-edge="1"]').evaluate(el => { el.click(); el.click(); }); await p.waitForTimeout(1250);
    check(label + ' rapid input cannot skip person during turn', await p.locator('#diaryPageLabel').innerText() === 'Trang của thảo');
    await p.locator('[data-diary-edge="1"]').click(); await p.evaluate(() => document.documentElement.dataset.motionPaused = 'true');
    check(label + ' motion pause settles turn immediately', await p.locator('.diary-turn-leaf').count() === 0);
    await p.emulateMedia({ media: 'print' }); check(label + ' private diary excluded from printing', !await p.locator('#crewDiary').isVisible()); await p.emulateMedia({ media: 'screen' });
    await p.locator('#diaryLogout').click();
    check(label + ' logout clears private DOM and tab credentials', await p.locator('#diaryPages').evaluate(el => el.childElementCount === 0) && await p.evaluate(() => !sessionStorage.getItem('taxua-diary-session-v1')));
    await context.close();
    const fallback = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const fm = model(); fm.claims.san = password; await mock(fallback, fm);
    await fallback.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('storage disabled by test'); } });
      Element.prototype.animate = undefined;
      window.ResizeObserver = undefined;
    });
    await fallback.route('**/vendor/gsap.min.js', route => route.abort());
    await fallback.route('**/diary_cover.webp', route => route.abort());
    const fp = await fallback.newPage(); fp.on('pageerror', error => report.errors.push(label + ' fallback: ' + error.message)); await fp.goto(url + '#crewDiary'); await authenticate(fp);
    check(label + ' reader works without storage, GSAP, cover art or Web Animations', await fp.locator('#diaryReader').isVisible() && await fp.evaluate(() => window.TaxuaDiaryApi.hasSession()));
    await fp.locator('[data-diary-edge="1"]').click(); check(label + ' fallback navigation keeps whole person', await fp.locator('#diaryPageLabel').innerText() === 'Trang của thảo');
    await fallback.close();
    const filePage = await browser.newPage(); await filePage.goto('file://' + path.join(root, 'index.html'));
    check(label + ' direct-file preview keeps public trip and clear diary fallback', await filePage.locator('#daysList > article').count() > 0 && await filePage.evaluate(() => !window.TaxuaDiaryApi.configured) && (await filePage.locator('#diaryStatus').innerText()).includes('HTTP'));
    await filePage.close();
  } finally { await browser.close(); }
}
async function run() {
  await browserChecks(chromium, 'chromium');
  if (process.env.DIARY_WEBKIT === '1') await browserChecks(webkit, 'webkit');
  check('No uncaught browser errors', report.errors.length === 0);
  fs.rmSync(path.join(output, 'failure.json'), { force: true });
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log(report.checks.length + ' diary browser checks passed. Evidence: ' + output);
}
module.exports = { model, mock, session, authenticate };
if (require.main === module) run().catch(error => { fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ ...report, failure: error.message }, null, 2)); console.error(error.message); process.exitCode = 1; });
