// Supabase still hashes/verifies this credential with bcrypt. The server-side
// conversion accepts any non-empty diary password without bcrypt truncation or
// changing the shared project's password policy. Never send it to the browser.
export const passwordFormat = 'sha256-v1';

export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export async function passwordForAuth(password: string, alias: string, format: unknown): Promise<string> {
  if (!validPassword(password)) throw new Error('INVALID_PASSWORD');
  // Unmarked accounts predate this format; retain their exact credentials.
  if (format === undefined) return password;
  if (format !== passwordFormat) throw new Error('UNKNOWN_PASSWORD_FORMAT');
  const input = JSON.stringify(['taxua-diary-password-v1', alias, password]);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)));
  // 68 ASCII bytes, with each supported character class for shared Auth rules.
  return 'Aa1!' + Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}
