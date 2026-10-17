/* Destructive ONLY to designated, disposable fixture accounts. See docs/diary-backend.md.
 * Tokens/passwords stay in a mode-0600 state file outside the checkout, never in reports.
 * This does not claim production names or clean up Auth users automatically.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const stateFile = process.env.DIARY_TEST_STATE;
if (!stateFile) throw new Error('Set DIARY_TEST_STATE to an external disposable-account file.');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const base = process.env.DIARY_TEST_ENDPOINT || 'https://oikouihzuxxbsgygwmwj.supabase.co/functions/v1/taxua-diary';
const project = new URL(base).origin;
const publicKey = process.env.DIARY_PUBLIC_KEY || 'sb_publishable_x_a22IaUP8wC7pzkTsjeJw_mow5X369';
const fixture = process.env.DIARY_TEST_IMAGE;
const output = process.env.TRIP_REVIEW_DIR || '/tmp/taxua-diary-backend-review';
const report = { checkedAt: new Date().toISOString(), checks: [], media: {} };
const marker = 'disposable-diary-fixture-' + Date.now();
fs.mkdirSync(output, { recursive: true });
const check = (name, value) => { assert(value, name); report.checks.push(name); };
async function call(route, body, account = state.san, binary = false) {
  const r = await fetch(base + '/' + route, { method: body === undefined ? 'GET' : 'POST',
    headers: { ...(account ? { Authorization: 'Bearer ' + account.access_token } : {}),
      ...(body === undefined ? {} : { 'Content-Type': binary ? 'image/jpeg' : 'application/json' }) },
    body: body === undefined ? undefined : binary ? body : JSON.stringify(body) });
  const data = r.headers.get('content-type')?.includes('image/') ? Buffer.from(await r.arrayBuffer()) : await r.json();
  return { status: r.status, data, headers: r.headers };
}
async function direct(resource, token, body, headers = {}) {
  const r = await fetch(project + resource, { method: body === undefined ? 'GET' : 'POST',
    headers: { apikey: publicKey, ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, text: await r.text() };
}
(async () => {
  check('Anonymous reader denied', (await call('read', undefined, null)).status === 401);
  check('Anonymous draft denied', (await call('draft', undefined, null)).status === 401);
  check('Forged bearer token denied', (await call('read', undefined, { access_token: 'forged-token' })).status === 401);
  const parts = state.san.access_token.split('.'), payload = JSON.parse(Buffer.from(parts[1], 'base64url'));
  payload.role = 'service_role'; payload.user_metadata = { member_id: 'mi' };
  parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
  check('Changing JWT claims cannot forge authority', (await call('read', undefined, { access_token: parts.join('.') })).status === 401);
  const nullOrigin = await fetch(base + '/status', { headers: { Origin: 'null' } });
  check('Direct-file null origin is rejected', nullOrigin.status === 403);
  check('Unknown crew slot cannot be claimed', (await call('claim', { member_id: 'pig', password: 'unknown-fixture-password' }, null)).status === 400);
  check('Claimed password cannot be replaced', (await call('claim', { member_id: 'san', password: 'other-fixture-password' }, null)).status === 409);
  check('Wrong password denied', (await call('login', { member_id: 'san', password: 'incorrect-fixture-password' }, null)).status === 401);
  const read = await call('read');
  check('Authenticated read returns seven whole spreads', read.status === 200 && read.data.entries.length === 7);
  check('No Auth alias or draft leaks in shared read', !JSON.stringify(read.data).includes('@taxua-diary') && read.data.entries.every(e => !('draft' in e) && !('user_id' in e)));
  let a = (await call('draft')).data;
  check('Fixture A starts with its own draft', a.member_id === 'san');
  const b = (await call('draft?member_id=san', undefined, state.mi)).data;
  check('Selected member cannot change draft ownership', b.member_id === 'mi');
  const saved = await call('save-draft', { revision: a.revision, member_id: 'mi', user_id: 'forged', title: marker, body: 'Private fixture text.', photos: [] });
  check('Draft saved only as verified owner', saved.status === 200 && saved.data.member_id === 'san'); a = saved.data;
  const privateRead = await call('read', undefined, state.mi);
  check('Another member cannot see unpublished writing', !JSON.stringify(privateRead.data).includes(marker));
  const conflict = await call('save-draft', { revision: a.revision - 1, title: 'stale', body: 'stale', photos: [] });
  check('Stale draft write rejected', conflict.status === 409 && conflict.data.error === 'DRAFT_CONFLICT');
  check('Conflict preserves saved draft', (await call('draft')).data.title === marker);
  check('Browser cannot invoke privileged gateway', (await direct('/rest/v1/rpc/taxua_diary_gateway', state.san.access_token, { p_action: 'status' })).status >= 400);
  check('Anonymous cannot invoke privileged gateway', (await direct('/rest/v1/rpc/taxua_diary_gateway', null, { p_action: 'status' })).status >= 400);
  check('Private schema is not exposed', (await direct('/rest/v1/entries?select=*', state.san.access_token, undefined, { 'Accept-Profile': 'taxua_diary' })).status >= 400);
  let photo;
  if (fixture) {
    const reservation = await call('reserve-photo', {}); check('Owner can reserve photo', reservation.status === 200); photo = reservation.data;
    const bytes = fs.readFileSync(fixture), start = Date.now();
    const upload = await call('upload?id=' + photo.id, bytes, state.san, true);
    check('Real server decoding/re-encoding succeeds', upload.status === 200 && upload.data.state === 'ready');
    report.media.uploadWallMs = Date.now() - start; report.media.width = upload.data.width; report.media.height = upload.data.height;
    const own = await call('media/' + photo.id);
    check('Owner can read unpublished photo with no cache', own.status === 200 && own.headers.get('cache-control').includes('no-store'));
    fs.writeFileSync(path.join(output, 'processed-fixture.jpg'), own.data);
    check('EXIF fixture marker stripped', !own.data.includes(Buffer.from('diary-security-fixture')) && !own.data.includes(Buffer.from('must-be-stripped')));
    check('Another member cannot read unpublished photo', (await call('media/' + photo.id, undefined, state.mi)).status >= 400);
    const invalid = await call('save-draft', { revision: b.revision, title: '', body: '', photos: [{ id: photo.id, caption: '', alt: '' }] }, state.mi);
    check('Another owner cannot attach this photo', invalid.status === 400 && invalid.data.error === 'INVALID_PHOTO');
    check('Another owner cannot remove this photo', (await call('remove-photo', { id: photo.id }, state.mi)).status === 403);
    const object = '/storage/v1/object/authenticated/taxua-diary-photos/san/' + photo.id + '.jpg';
    check('Direct Storage bypass denied even with owner JWT', (await direct(object, state.san.access_token)).status >= 400);
    check('No public photo URL', (await direct(object.replace('/authenticated/', '/public/'), null)).status >= 400);
    const overwrite = await fetch(project + '/storage/v1/object/taxua-diary-photos/san/' + photo.id + '.jpg', {
      method: 'POST', headers: { apikey: publicKey, Authorization: 'Bearer ' + state.mi.access_token,
        'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes });
    check('Cross-account direct Storage overwrite denied', overwrite.status >= 400);
    a = (await call('save-draft', { revision: a.revision, title: marker, body: 'Private fixture text.', photos: [{ id: photo.id, caption: 'Fixture only', alt: 'Disposable test photograph' }] })).data;
  }
  const published = await call('publish', { revision: a.revision, base_revision: a.base_revision });
  check('Explicit publication succeeds', published.status === 200); a = published.data;
  const shared = await call('read', undefined, state.mi);
  check('Crew can read saved writing', shared.data.entries.find(e => e.member_id === 'san').title === marker);
  if (photo) check('Published photo readable by crew', (await call('media/' + photo.id, undefined, state.mi)).status === 200);
  if (photo) {
    a = (await call('save-draft', { revision: a.revision, title: marker, body: 'Private fixture text.', photos: [{ id: photo.id, caption: 'unpublished-caption-fixture', alt: 'private description' }] })).data;
    const current = await call('read', undefined, state.mi);
    check('Draft caption changes do not leak through published image metadata', !JSON.stringify(current.data).includes('unpublished-caption-fixture'));
  }
  const stale = await call('publish', { revision: a.revision, base_revision: a.base_revision - 1 });
  check('Stale publication rejected', stale.status === 409 && stale.data.error === 'ENTRY_CONFLICT');
  if (photo) {
    a = (await call('save-draft', { revision: a.revision, title: marker, body: 'Private fixture text.', photos: [] })).data;
    a = (await call('publish', { revision: a.revision, base_revision: a.base_revision })).data;
    check('Unpublished photo stops being served to crew', (await call('media/' + photo.id, undefined, state.mi)).status >= 400);
    const corrupt = (await call('reserve-photo', {})).data;
    const bad = await call('upload?id=' + corrupt.id, Buffer.from('<svg>not a JPEG</svg>'), state.san, true);
    check('Spoofed JPEG bytes rejected', bad.status === 400 && bad.data.error === 'INVALID_IMAGE');
    const bomb = (await call('reserve-photo', {})).data;
    const giant = Buffer.from([255,216,255,192,0,17,8,255,255,255,255,3,1,17,0,2,17,0,3,17,0,255,217]);
    const oversized = await call('upload?id=' + bomb.id, giant, state.san, true);
    check('Oversized dimensions rejected before decode', oversized.status === 400 && oversized.data.error === 'IMAGE_DIMENSIONS');
    const malformed = (await call('reserve-photo', {})).data;
    const tiny = Buffer.from([255,216,255,192,0,17,8,0,16,0,16,3,1,17,0,2,17,0,3,17,0,255,217]);
    const corruptDecoded = await call('upload?id=' + malformed.id, tiny, state.san, true);
    check('Plausible JPEG header still requires valid decoded bytes', corruptDecoded.status === 400 && corruptDecoded.data.error === 'INVALID_IMAGE');
  }
  const reservations = await Promise.all(Array.from({ length: 14 }, () => call('reserve-photo', {})));
  const admitted = reservations.filter(r => r.status === 200);
  check('Concurrent reservations enforce the twelve-photo quota', admitted.length <= 12 && reservations.some(r => r.data.error === 'PHOTO_LIMIT'));
  for (const result of admitted) await call('remove-photo', { id: result.data.id });
  const old = state.mi;
  check('Logout succeeds', (await call('logout', {}, old)).status === 200);
  check('Logged-out JWT immediately denied', (await call('read', undefined, old)).status === 401);
  check('Logged-out refresh token denied', (await call('refresh', { refresh_token: old.refresh_token }, null)).status === 401);
  const newLogin = await call('login', { member_id: 'mi', password: state.password }, null);
  check('Existing password still logs in', newLogin.status === 200); state.mi = newLogin.data;
  fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`${report.checks.length} backend checks passed. Evidence: ${output}`);
})().catch(error => { fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ checks: report.checks, error: error.message }, null, 2)); console.error(error.message); process.exitCode = 1; });
