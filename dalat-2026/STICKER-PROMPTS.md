# Sticker Style Guide & Generation Prompts

This documents the **actual current visual style** of the stickers in `frontend/figures/`, for generating more of them later (e.g. the planned per-member stickers — no concept decided yet as of writing).

The site's stickers are **hand-drawn watercolor-pencil sketch illustrations** — soft ink outlines with loose pencil/watercolor shading, a slightly imperfect hand-drawn line quality, muted natural tones. This replaced an earlier flat-vector "art deco" concept that was never built into the current site — do not use that old style as reference.

---

## Reference look

Looking at the existing assets (`branch.png`, `stamp.png`, `polaroid.png`, `firecamp.png`, etc.):

- **Line work**: loose, slightly wobbly ink outlines — like a travel journal sketch, not a clean vector trace. Some hairline cross-hatching for shading/texture (visible on the campfire logs, mountain shadows).
- **Coloring**: watercolor-pencil style — soft, slightly uneven fills within the ink outlines, not flat solid vector fills. Muted, desaturated tones.
- **Palette** (matches the page's CSS tokens in `style.css`, but rendered as natural pencil/watercolor tones, not flat digital color):
  - Sage/olive green (foliage, pine needles) — near `--forest #46592f` but lighter/muted
  - Rust/terracotta brown-red (mountain shading, warm accents) — near `--clay #a3311f` but earthier
  - Warm cream/khaki paper tone (stamp/polaroid backgrounds) — near `--cream #f8f6ea`
  - Brass/mustard gold (small accents — a sun, a moon, campfire flame) — near `--brass #8a6a35`
  - Dusty blue-gray (sky/background washes in the stamp and polaroid illustrations)
  - Near-black ink (`--ink #2a2620`) for outlines and fine detail
- **Background**: transparent PNG, subject silhouetted with a soft light halo/edge (not a hard vector cutout) so it reads as a "pasted sticker" against the page.
- **Composition**: single centered subject, generous margin, square-ish or naturally-proportioned canvas — no forced 1:1 crop where it looks awkward (e.g. the horizontal firecamp, the portrait ticket).

## Prompt template for new stickers

```
Hand-drawn pencil-and-watercolor sticker illustration, single centered subject,
loose sketchy ink outlines with a slightly imperfect hand-drawn line quality
(not a clean vector trace), soft watercolor-pencil shading and light
cross-hatching for texture and shadow. Muted, desaturated natural palette:
sage/olive green, rust terracotta brown-red, warm cream/khaki, brass/mustard
gold accents, dusty blue-gray, near-black ink outlines — like a travel
journal sketch, not flat digital vector color.
Transparent background, soft edge halo like a die-cut sticker peeled off a
scrapbook page. Generous even margin, nothing cropped by the edges.
No text, no letters, no watermark.

Subject: [describe the specific object/scene here]
```

Negative prompt: `flat vector, clean digital linework, gradient mesh, 3D render, photorealistic photo, neon, glossy, hard drop shadow, cluttered background, multiple unrelated objects, text, lettering, watermark`

## Post-processing

1. **Background removal** if the generator doesn't give a transparent PNG natively:
   ```bash
   magick generated.png -fuzz 8% -transparent white -trim +repage generated.png
   ```
2. **Resize** — stickers display at roughly 50–200px on the page (see the `.s-*` width `clamp()` values in `style.css`); export at 2–3x the largest display size for retina sharpness, e.g. 500–600px on the long edge.
3. **Save to** `frontend/figures/<name>.png`.
4. **Use in `index.html`**: `<img class="sticker s-<name>" src="./figures/<name>.png" alt="" />`, then add a matching `.s-<name>{width:...;top/bottom:...;left/right:...;--rot:Ndeg;}` rule in `style.css` (see the "floating stickers" block). Read the sticker-stacking rule in `GEMINI.md` §4 before placing it — it must render behind text, not on top.
5. **Verify at display size**: shrink it to its actual on-page width and confirm the subject still reads clearly — fine linework can disappear at 50–80px.

---

## Current asset inventory (`frontend/figures/`)

| File | Used as |
|---|---|
| `branch.png` | Pine branch sticker — hero, packing, food |
| `church.png` | Rooster Church sticker — itinerary |
| `coffee.png` | Coffee sticker — food dish photo + sticker, crew, itinerary |
| `dalat-landscape.png` | Hero background mountain silhouette (multiply-blended) |
| `dalat-pattern.png` | Repeating pine-forest line-art background texture (whole page) |
| `firecamp.png` | Campfire — food dish photo + footer flame + stickers |
| `gondola.png` | Cable car sticker — hero |
| `jeep.png` | Jeep sticker — destinations, itinerary |
| `logo.png` | Nav bar / favicon logo |
| `map.png` | Decorative map corner graphic — destinations map panel |
| `pine-cone.png` | Pine cone sticker — packing, crew, itinerary, food, memories |
| `polaroid.png` | Polaroid sticker — crew, destinations |
| `scarf.png` | Scarf sticker — packing |
| `stamp-1.png` | Stamp graphic inside the memories-section seal |
| `stamp.png` | Stamp graphic inside the hero seal |
| `strawberry.png` | Strawberry sticker — food dish photo + sticker |
| `sunflower.png` | Sunflower sticker — hero, crew, packing, destinations, food |
| `torn-ticket.png` | Torn ticket sticker — hero, crew, packing, itinerary, destinations, memories |

Nearly every asset already appears in 2+ sections at different sizes/rotations — reuse before generating something new.
