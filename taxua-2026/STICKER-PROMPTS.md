# Sticker Style Guide & Generation Prompts — Tà Xùa

Concept: **"Nhật ký săn mây"** (cloud-hunting field journal) — a 5 a.m. trek on the dinosaur-spine ridge above a sea of clouds, with peach blossoms, Shan Tuyết tea and H'Mông brocade motifs.

Stickers use the **same hand-drawn watercolor-pencil style as `../dalat-2026/STICKER-PROMPTS.md`**, so the gogo sites read as one series. Only the palette changes: Đà Lạt was avocado/clay, Tà Xùa is mist/indigo/dawn.

Clouds and the ridge-line divider are **not** stickers — they are drawn as inline SVG/CSS (lighter, crisp at any size, animatable, and work over `file://`).

---

## Palette (matches `style.css` `:root`)

Render as natural pencil/watercolor tones, not flat digital color:

- Misty blue-gray (sky washes, distant mountains) — near `--mist #e8edf2` / `--slate #5d6878`
- Deep indigo, H'Mông-dye blue (outlines of fabric, night sky, shadows) — near `--indigo #26365e`
- Warm sunrise peach-orange (sun, glow on cloud tops) — near `--dawn #f3b48a`
- Soft peach-blossom pink (flowers, cheeks of cute characters) — near `--peach #e58ea3`
- Muted tea green (tea leaves, grass on the ridge) — near `--tea #5f7a48`
- Brocade red, used sparingly (embroidery thread, tiny accents) — near `--thread #b8352a`
- Near-black ink outlines — near `--ink #1f2430`

## Base prompt

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

## Sticker list

The 10 priority stickers are done: cut from `figures/raw/Watercolor Adventure Sticker Collection.png` into `figures/decor/` (`cloud-1`, `cloud-2`, `dino-ridge`, `dolphin-rock`, `lone-tree`, `peach-branch`, `shan-tea`, `tao-meo`, `pork-skewer`, `black-chicken`, `sunrise`). They are ~250–530px on the long edge, below the 500–600px target, so regenerate at higher resolution if they look soft on retina.

### Priority

| File | Subject line |
|---|---|
| `cloud-1.png`, `cloud-2.png` | a fluffy cumulus cloud puff with a faint peach sunrise glow on its top edge (vary the shape per file) |
| `dino-ridge.png` | a narrow grassy mountain ridge shaped like a dinosaur's spine, with a small cute cartoon dinosaur peeking its head over the ridge, clouds below |
| `dolphin-rock.png` | a rocky outcrop jutting out over a sea of clouds, shaped like a dolphin's snout, with a tiny playful dolphin leaping beside it |
| `lone-tree.png` | a single solitary pine tree on a bare hilltop, mist around its base |
| `peach-branch.png` | a short branch of pink peach blossoms with a few buds and small leaves |
| `shan-tea.png` | a sprig of Shan Tuyết tea with silvery-white downy buds, next to a small clay cup of hot tea with curling steam |
| `tao-meo.png` | a small cluster of wild Vietnamese mountain crabapples (táo mèo), yellow-green with red blush, beside a glass jar of crabapple wine |
| `pork-skewer.png` | grilled mountain pork skewers on a bamboo stick over glowing charcoal |
| `black-chicken.png` | a cute round H'Mông black chicken with dark feathers and a red comb |
| `sunrise.png` | a sun rising behind layered mountain ridges, rays fanning out |

### Optional

| File | Subject line |
|---|---|
| `hmong-bag.png` | a small H'Mông brocade shoulder bag with indigo fabric and red-and-white geometric embroidery |
| `headlamp.png` | a trekking headlamp switched on, a small beam of light |
| `boots.png` | a pair of worn hiking boots with muddy soles |
| `puffer.png` | a puffy winter jacket with a knitted scarf draped over it |
| `motorbike.png` | a small motorbike on a winding mountain pass road |
| `cloud-coffee.png` | a cup of coffee on a wooden railing with a sea of clouds behind it |
| `mustard-flower.png` | a sprig of white mustard flowers (hoa cải trắng) |

Seasonal: peach blossoms start late Oct–Nov and peak Dec–Jan; white mustard flowers are Nov–Dec. Pick flower stickers to match the trip dates.

## Post-processing

1. **Background removal** if the generator doesn't give a transparent PNG:
   ```bash
   magick generated.png -fuzz 8% -transparent white -trim +repage generated.png
   ```
2. **Resize** to 500–600px on the long edge (2–3x the largest on-page size, for retina).
3. **Save to** `figures/decor/<name>.png` (food stickers can go in `figures/food/`).
4. **Verify at display size** — shrink to its actual on-page width and check it still reads.
