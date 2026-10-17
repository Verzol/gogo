// Exercise the real Edge handler and Supabase client with a local Auth/RPC
// transport fixture. No network, hosted accounts or diary content are touched.
import { passwordForAuth, passwordFormat } from '../backend/supabase/functions/taxua-diary/passwords.ts';

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const alias = '11111111-1111-4111-8111-111111111111@taxua-diary.invalid';
const uid = alias.split('@')[0];
type Account = { id: string; email: string; app_metadata: Record<string, unknown>; password: string };
let account: Account | undefined;
let claimed = false, authAttempts = 0;
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json' }
});
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const req = new Request(input, init), url = new URL(req.url);
  check(url.origin === 'http://127.0.0.1:54321', 'Unexpected external request');
  const body = req.method === 'POST' ? await req.json() : {};
  if (url.pathname === '/rest/v1/rpc/taxua_diary_gateway') {
    if (body.p_action === 'rate') return reply({ allowed: true });
    if (body.p_action === 'reserve_claim') {
      if (claimed) return reply({ message: 'ALREADY_CLAIMED' }, 400);
      return reply({ uid, alias, nonce: crypto.randomUUID() });
    }
    if (body.p_action === 'finish_claim') { claimed = true; return reply({ id: 'san' }); }
    if (body.p_action === 'login_alias') return account ? reply({ alias }) : reply({ message: 'LOGIN_FAILED' }, 400);
  }
  if (url.pathname === '/auth/v1/admin/users' && req.method === 'POST') {
    // Model the actual provider's independent length and byte limits.
    if (body.password.length < 6 || new TextEncoder().encode(body.password).length > 72) {
      return reply({ msg: 'Invalid provider password' }, 422);
    }
    account = body;
    return reply(account);
  }
  if (url.pathname === '/auth/v1/admin/users/' + uid && req.method === 'GET') return reply(account);
  if (url.pathname === '/auth/v1/token') {
    authAttempts++;
    if (!account || body.email !== alias || body.password !== account.password) {
      return reply({ error_code: 'invalid_credentials', msg: 'Invalid credentials' }, 400);
    }
    const { password: _secret, ...user } = account;
    return reply({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_in: 3600,
      token_type: 'bearer', user });
  }
  throw new Error('Unexpected fixture request: ' + url.pathname);
};
Deno.env.set('SUPABASE_URL', 'http://127.0.0.1:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'fixture-service');
Deno.env.set('SUPABASE_ANON_KEY', 'fixture-public');
Deno.env.delete('DIARY_ALLOWED_ORIGINS');
let handle: (request: Request) => Promise<Response>;
const runtime = Deno as unknown as { serve: (handler: typeof handle) => unknown };
const originalServe = runtime.serve;
runtime.serve = handler => { handle = handler; return {}; };
await import('../backend/supabase/functions/taxua-diary/index.ts');
runtime.serve = originalServe;
function request(action: string, password: unknown, member = 'san') {
  return handle(new Request('http://127.0.0.1/taxua-diary/' + action, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ member_id: member, password })
  }));
}

for (const [name, password] of Object.entries({ single: 'a', vietnamese: 'ơ', whitespace: ' ', long: 'mây🌤'.repeat(200) })) {
  Deno.test('claim and subsequent login accept ' + name + ' password', async () => {
    account = undefined; claimed = false;
    let response = await request('claim', password);
    check(response.status === 200, 'First claim rejected');
    check((await response.json()).member_id === 'san', 'Incorrect owner');
    check(account!.app_metadata.diary_password_format === passwordFormat, 'Missing server-controlled format');
    check(account!.password !== password && account!.password.length === 68, 'Invalid provider credential');
    response = await request('login', password);
    check(response.status === 200, 'Repeated login rejected'); await response.body?.cancel();
    response = await request('login', password + 'x');
    check(response.status === 401 && (await response.json()).error === 'LOGIN_FAILED', 'Wrong password accepted');
    // Sending the provider credential to the diary must not bypass conversion.
    response = await request('login', account!.password);
    check(response.status === 401, 'Provider credential accepted as diary password'); await response.body?.cancel();
    response = await request('claim', password);
    check(response.status === 409, 'Claim overwrote an existing owner'); await response.body?.cancel();
  });
}
Deno.test('empty and non-string passwords are rejected before account creation or login', async () => {
  for (const action of ['claim', 'login']) for (const password of ['', null, undefined, 1, [], {}]) {
    account = undefined; claimed = false; authAttempts = 0;
    const response = await request(action, password);
    check(response.status === 400 && (await response.json()).error === 'INVALID_PASSWORD', 'Invalid password accepted');
    check(!account && !claimed && !authAttempts, 'Invalid input reached Auth');
  }
});
Deno.test('legacy accounts retain their unchanged password', async () => {
  const password = 'original-password';
  account = { id: uid, email: alias, app_metadata: { application: 'taxua-diary' }, password }; claimed = true;
  let response = await request('login', password);
  check(response.status === 200, 'Existing password stopped working'); await response.body?.cancel();
  response = await request('login', await passwordForAuth(password, alias, passwordFormat));
  check(response.status === 401, 'Legacy login unexpectedly uses conversion'); await response.body?.cancel();
  check(account.password === password && !account.app_metadata.diary_password_format, 'Legacy account changed');
});
Deno.test('full password and alias are significant without trimming or Unicode normalization', async () => {
  const encode = (p: string, a = alias) => passwordForAuth(p, a, passwordFormat);
  const long = 'a'.repeat(100);
  check(await encode(long + 'x') !== await encode(long + 'y'), 'Long passwords are truncated');
  check(await encode(' a ') !== await encode('a'), 'Password trimmed');
  check(await encode('ơ') !== await encode('o\u031b'), 'Unicode normalized');
  check(await encode('a') !== await encode('a', 'different@taxua-diary.invalid'), 'Alias omitted');
  check(await encode('\ud800') !== await encode('\ud801'), 'Distinct inputs collapsed');
});
Deno.test('unknown account and unauthenticated reads stay denied', async () => {
  let response = await request('claim', 'a', 'intruder');
  check(response.status === 400 && (await response.json()).error === 'INVALID_MEMBER', 'Unknown member accepted');
  response = await handle(new Request('http://127.0.0.1/taxua-diary/read'));
  check(response.status === 401, 'Private read accepted without session'); await response.body?.cancel();
});
Deno.test('unknown credential format fails closed without a raw-password fallback', async () => {
  account = { id: uid, email: alias, app_metadata: { diary_password_format: 'unknown' }, password: 'a' };
  authAttempts = 0;
  const response = await request('login', 'a');
  check(response.status === 500 && authAttempts === 0, 'Unknown format fell back to raw login'); await response.body?.cancel();
});

// Keep the override scoped to this standalone verification process.
globalThis.addEventListener('unload', () => { globalThis.fetch = originalFetch; });
