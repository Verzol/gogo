import { normalizePhoto } from '../backend/supabase/functions/taxua-diary/framing.ts';
const base = { id: 'fixture', caption: 'Mây trên núi', alt: 'Phong cảnh' };
function check(value: boolean, label: string) { if (!value) throw new Error(label); }
Deno.test('legacy photos and bounded crop metadata survive normalization', () => {
  check(JSON.stringify(normalizePhoto(base)) === JSON.stringify(base), 'Legacy photo changed');
  for (const crop of [{ x: 0, y: 1, zoom: 1 }, { x: 1, y: 0, zoom: 3 }, { x: .23, y: .79, zoom: 1.87 }]) {
    check(JSON.stringify(normalizePhoto({ ...base, crop })?.crop) === JSON.stringify(crop), 'Crop changed');
  }
  check(!('member_id' in normalizePhoto({ ...base, member_id: 'another-person' })!), 'Untrusted owner retained');
});
Deno.test('malformed and unbounded crops are rejected rather than silently removed', () => {
  for (const crop of [null, [], 'center', {}, { x: .5, y: .5 }, { x: -.01, y: .5, zoom: 1 },
    { x: .5, y: 1.01, zoom: 1 }, { x: .5, y: .5, zoom: .99 }, { x: .5, y: .5, zoom: 3.01 },
    { x: '0.5', y: .5, zoom: 1 }, { x: true, y: .5, zoom: 1 }, { x: .5, y: .5, zoom: NaN },
    { x: Infinity, y: .5, zoom: 1 }, { x: .5, y: .5, zoom: 1, owner: 'another-person' }]) {
    check(normalizePhoto({ ...base, crop }) === null, `Accepted malformed crop: ${JSON.stringify(crop)}`);
  }
  for (const p of [null, [], 'photo', { ...base, id: 9 }, { ...base, alt: null }]) check(normalizePhoto(p) === null, 'Accepted malformed photo');
});

Deno.test('bounded photo sizes survive normalization and reject other values', () => {
  for (const size of ['small', 'medium', 'large']) check(normalizePhoto({ ...base, size })?.size === size, 'Size changed');
  for (const size of [null, 0, true, {}, [], 'auto', 'huge', 'SMALL', 'small; color:red']) check(normalizePhoto({ ...base, size }) === null, 'Unbounded size accepted');
});
