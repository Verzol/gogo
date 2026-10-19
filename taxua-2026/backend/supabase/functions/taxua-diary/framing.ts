// Allow only bounded display metadata. The gateway separately verifies ownership.
export type PhotoCrop = { x: number; y: number; zoom: number };
type Photo = { id: string; caption: string; alt: string; crop?: PhotoCrop };
export function normalizePhoto(value: unknown): Photo | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  if (typeof p.id !== 'string' || typeof p.caption !== 'string' || typeof p.alt !== 'string') return null;
  const photo: Photo = { id: p.id, caption: p.caption, alt: p.alt };
  if (Object.hasOwn(p, 'crop')) {
    if (!p.crop || typeof p.crop !== 'object' || Array.isArray(p.crop)) return null;
    const c = p.crop as Record<string, unknown>;
    if (Object.keys(c).length !== 3 || typeof c.x !== 'number' || !Number.isFinite(c.x) || c.x < 0 || c.x > 1 ||
      typeof c.y !== 'number' || !Number.isFinite(c.y) || c.y < 0 || c.y > 1 ||
      typeof c.zoom !== 'number' || !Number.isFinite(c.zoom) || c.zoom < 1 || c.zoom > 3) return null;
    photo.crop = { x: c.x, y: c.y, zoom: c.zoom };
  }
  return photo;
}
