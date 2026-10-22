import { createClient } from '@supabase/supabase-js';
import { processImage } from './images.ts';
import { normalizePhoto } from './framing.ts';
import { passwordForAuth, passwordFormat, validPassword } from './passwords.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, serviceKey, options);
const bucket = 'taxua-diary-photos';
const ids = new Set(['mi', 'san', 'thao', 'quanlele', 'gtm', 'truong', 'tamle', 'linh']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Actor = { uid: string; sid: string; token: string };

class DiaryError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function fail(code: string, status = 400): never { throw new DiaryError(code, status); }
async function rpc(action: string, payload: Record<string, unknown> = {}, actor?: Actor) {
  const { data, error } = await admin.rpc('taxua_diary_gateway', {
    p_action: action, p_payload: payload, p_actor: actor?.uid || null, p_session: actor?.sid || null
  });
  if (error) {
    const code = error.message;
    const status = code === 'SESSION_EXPIRED' ? 401 : code === 'FORBIDDEN' ? 403 :
      code.endsWith('CONFLICT') || ['ALREADY_CLAIMED', 'CLAIM_BUSY', 'CLAIM_EXPIRED'].includes(code) ? 409 : 400;
    if (/^[A-Z_]+$/.test(code)) fail(code, status);
    fail('REQUEST_FAILED', 500);
  }
  return data;
}
async function authenticate(req: Request): Promise<Actor> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /i, '');
  if (!token || token.length > 8192) fail('SESSION_EXPIRED', 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) fail('SESSION_EXPIRED', 401);
  let payload;
  try { payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
  catch { fail('SESSION_EXPIRED', 401); }
  if (!uuid.test(payload.session_id || '')) fail('SESSION_EXPIRED', 401);
  const actor = { uid: data.user.id, sid: payload.session_id, token };
  await rpc('me', {}, actor);
  return actor;
}
async function limited(key: string, limit: number) {
  const result = await rpc('rate', { key, limit });
  if (!result.allowed) fail('RATE_LIMITED', 429);
}
async function fingerprint(req: Request) {
  const ip = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown';
  const bytes = new TextEncoder().encode(serviceKey + ':' + ip);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).slice(0, 16).map(v => v.toString(16).padStart(2, '0')).join('');
}
async function readBytes(req: Request, max: number) {
  if (Number(req.headers.get('content-length')) > max) fail('REQUEST_TOO_LARGE', 413);
  const reader = req.body?.getReader();
  if (!reader) fail('INVALID_INPUT');
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max) { await reader.cancel(); fail('REQUEST_TOO_LARGE', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
async function jsonBody(req: Request) {
  try {
    const body = JSON.parse(new TextDecoder().decode(await readBytes(req, 65536)));
    if (!body || Array.isArray(body) || typeof body !== 'object') fail('INVALID_INPUT');
    return body;
  } catch (error) { if (error instanceof DiaryError) throw error; fail('INVALID_INPUT'); }
}
function credentials(body: Record<string, unknown>) {
  if (!ids.has(String(body.member_id))) fail('INVALID_MEMBER');
  if (!validPassword(body.password)) fail('INVALID_PASSWORD');
  return { member: String(body.member_id), password: body.password };
}
async function login(member: string, password: string) {
  const info = await rpc('login_alias', { member_id: member });
  const uid = info.alias.split('@')[0];
  if (!uuid.test(uid)) fail('LOGIN_FAILED', 401);
  const { data: account, error: accountError } = await admin.auth.admin.getUserById(uid);
  if (accountError || !account.user || account.user.email !== info.alias) fail('LOGIN_FAILED', 401);
  const credential = await passwordForAuth(password, info.alias, account.user.app_metadata.diary_password_format);
  const auth = createClient(url, publicKey, options);
  const { data, error } = await auth.auth.signInWithPassword({ email: info.alias, password: credential });
  if (error || !data.session) fail('LOGIN_FAILED', 401);
  return { member_id: member, access_token: data.session.access_token,
    refresh_token: data.session.refresh_token, expires_at: data.session.expires_at };
}
const paths = (member: string, id: string) => [`${member}/${id}.jpg`, `${member}/${id}_thumb.jpg`];

Deno.serve(async req => {
  const origin = req.headers.get('origin');
  const allowed = Deno.env.get('DIARY_ALLOWED_ORIGINS')?.split(',').map(v => v.trim());
  // Bearer authentication is the security boundary. No cookie credentials.
  const goodOrigin = !origin || (origin !== 'null' && (allowed ? allowed.includes(origin) :
    /^https:\/\//.test(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)));
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  if (origin && goodOrigin) headers['Access-Control-Allow-Origin'] = origin;
  const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
  try {
    if (!goodOrigin) fail('ORIGIN_NOT_ALLOWED', 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const requestUrl = new URL(req.url);
    const route = requestUrl.pathname.split('/taxua-diary')[1]?.replace(/^\//, '') || '';
    if (route === 'status' && req.method === 'GET') return respond(await rpc('status'));
    if (['login', 'claim', 'refresh'].includes(route) && req.method === 'POST') {
      await limited('ip:' + await fingerprint(req), 120);
      const body = await jsonBody(req);
      if (route === 'refresh') {
        if (typeof body.refresh_token !== 'string' || body.refresh_token.length > 2048) fail('SESSION_EXPIRED', 401);
        const auth = createClient(url, publicKey, options);
        const { data, error } = await auth.auth.refreshSession({ refresh_token: body.refresh_token });
        if (error || !data.session) fail('SESSION_EXPIRED', 401);
        const actor = await authenticate(new Request(req.url, { headers: { authorization: 'Bearer ' + data.session.access_token } }));
        const me = await rpc('me', {}, actor);
        return respond({ ...me, access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at });
      }
      const { member, password } = credentials(body);
      await limited('account:' + member, 12);
      if (route === 'login') return respond(await login(member, password));
      const reservation = await rpc('reserve_claim', { member_id: member });
      let finished = false;
      try {
        const { error } = await admin.auth.admin.createUser({ id: reservation.uid,
          email: reservation.alias, password: await passwordForAuth(password, reservation.alias, passwordFormat), email_confirm: true,
          app_metadata: { application: 'taxua-diary', diary_password_format: passwordFormat } });
        if (error) fail('ACCOUNT_CREATE_FAILED', 503);
        await rpc('finish_claim', { member_id: member, nonce: reservation.nonce });
        finished = true;
      } catch (error) {
        if (!finished) {
          // The FK prevents deleting an account if finish committed but its response was lost.
          await admin.auth.admin.deleteUser(reservation.uid);
          await rpc('abort_claim', { member_id: member, nonce: reservation.nonce });
        }
        throw error;
      }
      return respond(await login(member, password));
    }
    const actor = await authenticate(req);
    if (req.method === 'GET' && route === 'read') return respond(await rpc('read', {}, actor));
    if (req.method === 'GET' && route === 'draft') {
      const obsolete = await rpc('cleanup', {}, actor);
      for (const photo of obsolete) {
        const { error } = await admin.storage.from(bucket).remove(paths(photo.member_id, photo.id));
        if (!error) await rpc('purge_photo', { id: photo.id }, actor);
      }
      return respond(await rpc('draft', {}, actor));
    }
    if (req.method === 'GET' && route.startsWith('media/')) {
      const id = route.slice(6);
      if (!uuid.test(id)) fail('PHOTO_NOT_FOUND', 404);
      const photo = await rpc('media', { id }, actor);
      const file = paths(photo.member_id, id)[requestUrl.searchParams.get('size') === 'thumb' ? 1 : 0];
      const { data, error } = await admin.storage.from(bucket).download(file);
      if (error || !data) fail('PHOTO_NOT_FOUND', 404);
      return new Response(data, { headers: { ...headers, 'Content-Type': 'image/jpeg', 'Content-Disposition': 'inline; filename="trip-photo.jpg"' } });
    }
    if (req.method !== 'POST') fail('INVALID_ACTION', 404);
    if (route === 'upload') {
      await limited('upload:' + actor.uid, 36);
      const id = requestUrl.searchParams.get('id') || '';
      if (!uuid.test(id)) fail('INVALID_PHOTO');
      const ticket = await rpc('photo_ticket', { id }, actor);
      const names = paths(ticket.member_id, id);
      try {
        if (req.headers.get('content-type')?.split(';')[0] !== 'image/jpeg') fail('INVALID_IMAGE');
        const bytes = await readBytes(req, 2097152);
        const result = await processImage(bytes);
        if (result.full.length + result.thumb.length > 4194304) fail('REQUEST_TOO_LARGE', 413);
        for (const [index, data] of [result.full, result.thumb].entries()) {
          const { error } = await admin.storage.from(bucket).upload(names[index], data, {
            contentType: 'image/jpeg', cacheControl: '0', upsert: false
          });
          if (error) fail('UPLOAD_FAILED', 503);
        }
        return respond(await rpc('finish_photo', { id, bytes: result.full.length + result.thumb.length,
          width: result.width, height: result.height }, actor));
      } catch (error) {
        // Only this reservation's unique paths can be touched. No arbitrary path input.
        // A lost finalization response must not delete an already-ready photo.
        try {
          const state = await rpc('photo_state', { id }, actor);
          if (state.state !== 'ready') {
            await rpc('cancel_photo', { id, failed: true }, actor);
            const { error: removalError } = await admin.storage.from(bucket).remove(names);
            if (!removalError) await rpc('purge_photo', { id }, actor);
          }
        } catch { /* Leave an uncertain reservation for the authenticated cleanup. */ }
        throw error;
      }
    }
    const body = route === 'logout' ? {} : await jsonBody(req);
    if (route === 'logout') {
      const { error } = await admin.auth.admin.signOut(actor.token, 'local');
      if (error) fail('LOGOUT_FAILED', 503);
      return respond({ ok: true });
    }
    if (route === 'save-draft') {
      if (!Number.isInteger(body.revision) || typeof body.title !== 'string' || typeof body.body !== 'string' ||
        !Array.isArray(body.photos)) fail('INVALID_INPUT');
      const photos = body.photos.map((value: unknown) => {
        const photo = normalizePhoto(value);
        if (!photo || !uuid.test(photo.id)) fail('INVALID_PHOTO');
        return photo;
      });
      return respond(await rpc('save_draft', { revision: body.revision, title: body.title, body: body.body, photos }, actor));
    }
    if (route === 'publish') {
      if (!Number.isInteger(body.revision) || !Number.isInteger(body.base_revision)) fail('INVALID_INPUT');
      return respond(await rpc('publish', { revision: body.revision, base_revision: body.base_revision }, actor));
    }
    if (route === 'reserve-photo') return respond(await rpc('reserve_photo', {}, actor));
    if (route === 'remove-photo') {
      if (!uuid.test(String(body.id))) fail('INVALID_PHOTO');
      const photo = await rpc('cancel_photo', { id: body.id }, actor);
      const { error } = await admin.storage.from(bucket).remove(paths(photo.member_id, photo.id));
      if (error) fail('UPLOAD_FAILED', 503);
      await rpc('purge_photo', { id: photo.id }, actor);
      return respond({ ok: true });
    }
    fail('INVALID_ACTION', 404);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (error instanceof DiaryError) return respond({ error: code }, error.status);
    if (['INVALID_IMAGE','IMAGE_DIMENSIONS'].includes(code)) return respond({ error: code }, 400);
    if (code === 'IMAGE_PROCESSOR_UNAVAILABLE') return respond({ error: code }, 503);
    console.error('taxua-diary: request failed'); // Never log passwords, JWTs or private content.
    return respond({ error: 'REQUEST_FAILED' }, 500);
  }
});
