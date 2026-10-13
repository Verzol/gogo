# Sticker Style Guide & Generation Prompts — Tà Xùa

Concept: **"Nhật ký săn mây"** (cloud-hunting field journal) — a 5 a.m. trek on the dinosaur-spine ridge above a sea of clouds, with peach blossoms, Shan Tuyết tea and H'Mông brocade motifs.

Stickers use the **same hand-drawn watercolor-pencil style as `../dalat-2026/STICKER-PROMPTS.md`**, so the gogo sites read as one series. Only the palette changes: Đà Lạt was avocado/clay, Tà Xùa is mist/indigo/dawn.

The large cloud-sea edge and ridge-line divider use SVG/CSS. The small decorative cloud puffs are image stickers, with day/night variants like the other subjects.

---

## Day and night palette

The day sheet uses pale blue-gray clouds, natural greens, peach blossoms and warm sunrise light. The supplied night sheet keeps the watercolor texture and white die-cut borders, with indigo skies, moonlight and deeper blue clouds. Food, tea and flowers retain their natural colors.

The page themes are defined in `style.css`: the day surface is `#eef3f6` with accent `#284f67`; the night surface is `#101e2c` with accent `#b1d7e9`. Do not recolor the night stickers with CSS: their night palette is already painted into the supplied artwork.

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

There are **11 pairs** of stickers. Each subject has four files in `figures/decor/`: `<subject>_day.png`, `<subject>_day.webp`, `<subject>_night.png`, `<subject>_night.webp`. PNG is the transparent source cutout; the website uses the normalized WebP pair.

- Day source: `figures/raw/Watercolor Adventure Sticker Collection.png`. Existing cutouts were renamed, preserving their pixels.
- Night source: `figures/raw/Watercolor Adventure Sticker Collection Night.png`. All 11 subjects were extracted separately, preserving the white outlines and alpha edges.
- `logo.png`, `logo.webp` and `favicon.png` are shared and do not change with the theme.

### Paired inventory

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

`mountain_sky` replaces the old `sunrise` filename so the name fits both modes. The previous hyphenated names are now underscore-separated. `data.js` points to the renamed daytime PNG; `imagePath()` and `stickerImage()` select the corresponding WebP for the active theme. Static decorations are marked with `data-sticker` and swap with the same theme handler.

### Re-extract the night sheet

Run from the repository root:

```bash
python3 taxua-2026/scripts/extract_night_stickers.py
```

The utility requires Pillow, NumPy and SciPy. It identifies the 11 opaque subjects, assigns soft alpha edges to the nearest subject, removes neighboring fragments and writes night PNG cutouts with a 5px transparent margin. Original day PNGs remain unchanged. It then regenerates both WebPs per subject: the night artwork is uniformly scaled to match the day's opaque bounding-box area, and both are centered on an identical canvas with enough room for their full outlines. This keeps apparent size and layout stable across themes without stretching the drawings. Their original proportions differ slightly, so individual widths/heights may still vary (up to 4.4%; bounding-box area differs by less than 0.4%). Subject centers are specific to the supplied 1536x1024 sheet; review them before using a different sheet.

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
3. **Save to** `figures/decor/<name>_day.png` or `<name>_night.png`, plus a matching WebP copy (food stickers can go in `figures/food/`).
4. **Verify at display size** — shrink to its actual on-page width and check it still reads.
