# AI Sticker Generation Prompts

Prompt suite for image generation models (Midjourney, Flux, Ideogram, DALL·E, Firefly, etc.) to generate stickers matching the style of existing SVGs in `src/components/HinhSticker.astro`.

---

## Before Starting: Three Critical Factors for Success

**1. Do not force models to write Vietnamese text.** No image model accurately renders Vietnamese diacritics — "ĐÀ LẠT" will become "ĐÀ LAT", "ĐÁ LÁT", or garbled characters. For the three stickers with text (`tem-thu`, `ban-do`, `dau-moc-ga`), **keep the SVG version**, or generate the illustration only and overlay text later. The prompts below explicitly forbid text.

**2. No image model produces true transparent backgrounds.** Always request an **absolute flat white background** and remove the background afterward (see the final section). Do not request a pine green background — sticker borders will bleed green, leaving halos after background removal.

**3. Lock color palette with exact hex codes.** Without strict color locking, models will introduce extra colors, creating visual misalignment when pasted on the page. Every prompt reinforces all 6 hex codes.

---

## Color Palette — Copy-paste into every prompt

| Role             | Hex         | Matching Token     |
| ---------------- | ----------- | ------------------ |
| Cream Paper      | `#F4EFDD`   | `--paper`          |
| Deep Pine Green  | `#17342C`   | `--forest`         |
| Sage Green       | `#7FA88B`   | `--sage`           |
| Brass Gold       | `#D5A24A`   | `--brass`          |
| Terracotta Red   | `#E07A56`   | `--terracotta`     |
| Near-Black       | `#0B1A16`   | `--charcoal`       |

---

## Common Style Block

Prepend this block to the **start** of every prompt, then append the specific sticker description.

```
Flat vector sticker illustration, 2D, front-facing, no perspective.
Bold simple geometric shapes with crisp clean edges. Influenced by 1930s
French-Indochinese art deco travel posters: symmetrical, confident, minimal.
Completely flat color fills — absolutely no gradients, no shading, no
highlights, no texture, no grain, no drop shadow, no glow, no 3D.

Strict six-color palette, use these and nothing else:
cream #F4EFDD, deep pine green #17342C, sage green #7FA88B,
brass gold #D5A24A, terracotta red #E07A56, near-black green #0B1A16.

Single centered object, generous even margin on all four sides, nothing
touching or cropped by the edges. Square 1:1 composition.
Pure flat pure-white #FFFFFF background, no shadow cast on the background.
No text, no letters, no numbers, no signature, no watermark.
```

## Negative Prompt

```
photorealistic, photograph, 3d render, gradient, glow, bloom, soft shading,
ambient occlusion, drop shadow, paper texture, grain, noise, watercolor,
pencil sketch, rough hand-drawn wobble, cluttered background, scenery,
multiple objects, collage, cropped, text, lettering, numbers, typography,
watermark, signature, neon, pastel, muted beige, brown, purple, blue
```

## Recommended Generation Settings

- Resolution: **1024×1024**, **1:1** ratio
- Midjourney: append `--style raw --stylize 100 --ar 1:1` (low stylize restricts model from adding unrequested colors)
- Flux / Ideogram: leave at default, these models adhere to prompts better
- Generate **4 variations per image** and select — usable yield is typically ~1 in 4

---

# Nine Existing Stickers

Append each block below after the common style block.

### 1. `tem-thu` — Postage Stamp

> ⚠️ Contains text in SVG. Recommended to keep SVG version, or generate without text and overlay text later.

```
Subject: a vintage postage stamp standing upright, portrait orientation.
Cream #F4EFDD stamp body with classic scalloped perforated edges all around.
A thin near-black #0B1A16 hairline frame inset inside the stamp. Inside the
frame, a simple two-peak mountain range in sage green #7FA88B against the
cream, with a small solid brass gold #D5A24A circular sun in the upper right.
Leave the lower fifth of the stamp as empty cream space. The perforated
notches must be clean semicircles, evenly spaced.
```

### 2. `dau-moc-ga` — Station Rubber Stamp

> ⚠️ Contains text in SVG. Recommended to keep SVG version.

```
Subject: a circular rubber postmark stamp, outline only, no fill.
Two concentric circles drawn in terracotta red #E07A56: a thick outer ring
and a thinner inner ring. In the exact center, a small three-peak zigzag
mountain silhouette drawn as a single thick terracotta red polyline with
sharp mitered corners. The interior of the circle is empty white. Slightly
imperfect ink weight like a real rubber stamp, but still clean vector shapes.
```

### 3. `ve-xe-do` — Torn Ticket

```
Subject: a horizontal paper ticket stub, torn in half.
Cream #F4EFDD ticket body, landscape orientation. The right edge is a clean
zigzag saw-tooth tear line running top to bottom. Near the top, a solid
terracotta red #E07A56 horizontal band spanning most of the width. Below it,
two short rounded near-black #0B1A16 bars at 45 percent opacity suggesting
printed lines of text, the second bar shorter than the first. Lower third of
the ticket left empty.
```

### 4. `ve-cap-treo` — Cable Car Gondola

```
Subject: a single cable car gondola cabin hanging from a taut cable.
A thin sage green #7FA88B cable crosses the upper area diagonally from lower
left to upper right. A short vertical brass gold #D5A24A hanger arm connects
the cable down to the cabin. The cabin is a cream #F4EFDD rounded rectangle
with two square near-black #0B1A16 windows side by side, and a solid
terracotta red #E07A56 horizontal stripe across its lower portion. Cabin
centered, cable extending to both edges of the frame.
```

### 5. `anh-polaroid` — Instant Photo

```
Subject: an instant photo print, portrait orientation.
Cream #F4EFDD frame with a thin border on three sides and a much thicker
blank margin at the bottom. The photo window is deep pine green #17342C
containing a simple mountain range silhouette in sage green #7FA88B and a
small solid brass gold #D5A24A circle as a moon in the upper left. In the
thick bottom margin, one short rounded near-black bar at 40 percent opacity
suggesting a handwritten caption.
```

### 6. `ban-do` — Mountain Summit Map

> ⚠️ SVG version contains text. This prompt generates without text.

```
Subject: a small folded map card, landscape orientation.
Cream #F4EFDD rectangular paper. Across it, three flowing sage green #7FA88B
contour lines running left to right, evenly spaced, curving up toward a peak
in the upper middle. At that peak, a small solid terracotta red #E07A56
triangle marking a summit. Thin uniform line weight throughout. Lower third
of the card left as empty cream space.
```

### 7. `la-thong` — Pine Needle Sprig

```
Subject: a single pine needle sprig, vertical.
One slightly curved central stem in sage green #7FA88B running bottom to top.
Five evenly spaced pairs of thin straight needles branching upward and
outward from the stem in a symmetrical V pattern, the lower pairs longer than
the upper ones. Rounded line caps, uniform stroke weight, no filled areas.
Entirely sage green, nothing else.
```

### 8. `qua-thong` — Pine Cone

```
Subject: a single pine cone, vertical, seen from the side.
A broad rounded teardrop body — wide through the middle, tapering to a point
at the bottom — filled solid brass gold #D5A24A. Do not make it narrow or
leaf-shaped; it must read clearly as a pine cone, wider than it is elegant.
Four horizontal rows of scalloped near-black #0B1A16 line work across the
body suggesting overlapping scales, each row narrower than the one above.
A short sage green #7FA88B stem at the very top.
```

### 9. `hoa-da-quy` — Wild Sunflower

```
Subject: a single wild sunflower blossom seen straight from the front.
Ten identical elongated brass gold #D5A24A petals radiating symmetrically
from the center with small even gaps between them, each petal rounded at the
tip. A solid near-black green #0B1A16 circular center disc, plain and flat
with no seed texture and no inner ring. Perfectly symmetrical, no stem,
no leaves.
```

---

# Six Expansion Stickers

Extracted from the itinerary, available if you wish to add more.

### `xe-jeep` — Lang Biang Jeep

```
Subject: a small vintage open-top jeep seen from the side.
Cream #F4EFDD body with a flat hood and an open cabin, two near-black
#0B1A16 wheels, a terracotta red #E07A56 stripe along the lower body, and a
brass gold #D5A24A round headlight at the front. Simple boxy silhouette,
no driver, no background scenery.
```

### `ca-phe-phin` — Phin Filter Coffee

```
Subject: a Vietnamese phin coffee filter sitting on top of a glass.
A cream #F4EFDD cylindrical metal filter with a small domed lid on top,
resting on the rim of a short glass. The glass is outlined in sage green
#7FA88B and filled in the lower half with brass gold #D5A24A representing
condensed milk, with a near-black #0B1A16 band above it for the coffee.
Symmetrical, seen straight from the side.
```

### `dau-tay` — Strawberry

```
Subject: a single strawberry, seen from the front.
Solid terracotta red #E07A56 heart-shaped berry body with a small cluster of
sage green #7FA88B pointed leaves at the top. A few tiny brass gold #D5A24A
seed dots scattered evenly across the berry. Flat, symmetrical, no stem
beyond the leaves.
```

### `lua-trai` — Campfire

```
Subject: a campfire seen from the side.
Three cream #F4EFDD logs stacked in a crossed pile at the bottom. Above them,
a flame made of two nested flat shapes: a larger outer flame in terracotta
red #E07A56 and a smaller inner flame in brass gold #D5A24A. Simple pointed
flame silhouette, no sparks, no smoke.
```

### `khan-len` — Scarf

```
Subject: a knitted scarf lying in a loose curve.
A wide band of sage green #7FA88B that loops once and drapes, with short
fringe tassels in cream #F4EFDD at both ends. Two thin terracotta red
#E07A56 stripes running across the band near each end. Soft rounded corners,
completely flat fills.
```

### `nha-tho-con-ga` — Nicholas Cathedral (Rooster Church)

```
Subject: a simple church facade with a tall bell tower.
Cream #F4EFDD building silhouette, symmetrical, with a narrow tall spire in
the center topped by a small brass gold #D5A24A rooster weathervane. Three
arched near-black #0B1A16 windows across the facade and a terracotta red
#E07A56 roof line. Front elevation view, no perspective, no surroundings.
```

---

# Post-Processing Generated Images

**1. Background Removal.** Generated image comes on white background; convert to transparent PNG:

```bash
# ImageMagick
magick tem-thu.png -fuzz 8% -transparent white -trim +repage tem-thu.png
```

Or use Photopea / remove.bg if ImageMagick is not installed. `-trim` crops surrounding white margins so stickers align accurately.

**2. Resizing.** Display size on sticker page is ~90–110px. Exporting **320px** provides retina display sharpness while remaining lightweight:

```bash
magick tem-thu.png -resize 320x320 tem-thu.png
```

**3. Move to** `public/stickers/tem-thu.png`

**4. Usage in pages** — replace `hinh` with `src`:

```astro
<Sticker src="/stickers/tem-thu.png" x={104} y={14} w={7} xoay={6} />
```

Coordinates and usage remain unchanged; see `src/components/Sticker.astro`.

**5. Verify two practical criteria** before finalizing:

- Scaled down to ~100px, is the subject still identifiable? Fine details will disappear.
- On narrow viewports, stickers sit **under text at 50% opacity** — test whether text remains legible. Shapes with solid color blocks are more likely to create visual distraction.

If an image fails either condition, retain the SVG version — SVG is always sharp and strictly color-accurate via `tokens.css`.
