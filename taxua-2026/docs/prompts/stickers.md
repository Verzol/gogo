# Paired watercolor sticker prompt

[Documentation index](../README.md) · [Runtime identity/artwork rules](../identity.md)

Small pencil-and-watercolor scrapbook accents: mountain travel, loose outlines, mist/indigo/dawn palette and a white die-cut edge. These are decorative stickers, not full-screen scenery; use the [illustrated prompts](illustrated_scenery/README.md) for large artwork.

## Generation prompt

```
Hand-drawn pencil-and-watercolor sticker illustration, single centered subject,
loose sketchy ink outlines with a slightly imperfect hand-drawn line quality
(not a clean vector trace), soft watercolor-pencil shading and light
cross-hatching for texture. Muted, misty natural palette: misty blue-gray,
deep indigo blue, warm sunrise peach-orange, soft peach-blossom pink,
muted tea green, tiny accents of brocade red, near-black ink outlines —
like a mountain trekking journal sketch, not flat digital vector color.
Transparent background, soft edge halo like a die-cut sticker peeled off a
scrapbook page. Generous even margin, nothing cropped by the edges.
No text, no letters, no watermark.

Subject: [subject line from the list below]
```

Negative prompt: `flat vector, clean digital linework, gradient mesh, 3D render, photorealistic photo, neon, glossy, hard drop shadow, cluttered background, multiple unrelated objects, text, lettering, watermark`

Day palette: blue-gray clouds, natural greens, peach blossoms and warm sunrise. For a night version, use indigo skies, moonlight and deeper blue clouds; food/tea/flowers keep natural colors. Preserve the same subject, white border and apparent size. No runtime recoloring.

## Existing inventory

| Subject filename prefix | Illustration |
|---|---|
| `cloud_1` | Tall cloud puff |
| `cloud_2` | Wide cloud puff |
| `dino_ridge` | Dinosaur-spine ridge and the small dinosaur |
| `dolphin_rock` | Rocky outcrop and dolphin |
| `lone_tree` | Solitary tree above clouds |
| `peach_branch` | Peach blossoms |
| `shan_tea` | Shan Tuyết tea leaves and hot tea |
| `tao_meo` | Crabapples and a jar of wine |
| `pork_skewer` | Grilled pork skewers |
| `black_chicken` | H'Mông black chicken |
| `mountain_sky` | Sunrise by day; moonlit mountains by night |

Each subject has `<subject>_day.png`, `_night.png` and matching WebPs in `figures/decor/`. PNGs are master cutouts; normalized WebPs are runtime assets. `mountain_sky` depicts sunrise by day and moonlit mountains by night. Logo/favicon are shared.

Source sheets in `figures/raw/`:

- `Watercolor Adventure Sticker Collection.png` (day; original cutout pixels retained).
- `Watercolor Adventure Sticker Collection Night.png` (night; alpha/white outlines retained).

## Extract / replace

From `taxua-2026/` (Pillow, NumPy and SciPy required):

```sh
python3 scripts/extract_night_stickers.py
```

The helper uses subject centers measured on the supplied 1536×1024 night sheet; update them before processing another layout. It removes neighboring fragments, writes night PNGs with 5px padding and rebuilds both WebPs on matched canvases with equal apparent bounding-box area. Day PNGs remain intact.

Check alpha on light/dark fills, preserve white borders/fine edges and review at display size. Avoid stretching or indiscriminate white-background removal. Keep lowercase underscore names and map new subjects in the runtime helpers as needed. Day/night is fixed to each schedule period through `data-sticker-phase`; other accents may follow the active chapter. There is no page theme switch.
