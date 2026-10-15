# Illustrated scenery

[Documentation index](README.md) · [Motion](motion.md) · [Artwork sources](sources.md)

## Owners and composition

| File | Responsibility |
| --- | --- |
| `scene-config.js` | `JOURNEY_SCENES` period labels and `JOURNEY_CHAPTERS` chapter-to-world mapping |
| `scenery.js` | `JourneyScenery`: six panel presets, CSS skies, seeded SVG stars, painted layers, decode cache and scroll drift |
| `scenery.css` | Sky palettes, layer framing, opening contrast and phone/wide/landscape adjustments |
| `main.js` | Shared `JourneyUI.sceneFor()` resolver, phase/sticker/contrast updates and native fallback |
| `motion.js` | Enhanced blending; use the same resolver as the fallback |

Live worlds: **sunrise, night, bluehour, daylight, jade, afternoon**. Four full landscape paintings are palette/composition references, not wallpapers. Live panels combine scalable skies, transparent ridges, small clouds, celestial pieces and environment cutouts.

## Story mapping

| Chapter | World |
| --- | --- |
| `road` | night |
| `first-morning` | jade |
| `first-afternoon` | afternoon |
| `second-night` | night |
| `ridge-day` | daylight |
| `second-afternoon` | afternoon |
| `last-night` | night |
| `last-morning` | jade |

- Event `sceneryChapter` holds scenery across related stops; `phase` still supplies the current period label and appropriate stickers/icons.
- `sceneFor()` brightens night/bluehour chapters to bluehour at predawn and jade at dawn/morning. Breakfast must not stay starry.
- `phaseEnd` / `sceneryChapterEnd` develop Khe Cải from predawn to dawn within the existing event.
- Hero begins in sunrise. Crew and fund hold morning/jade; later supporting sections retain that scene.
- `JourneyUI.setChapter()` updates labels, active date and unfixed stickers; `setSceneryTone()` handles navigation contrast separately.

## Visual constraints

- Rich watercolor color, open reading space and transparent surfaces. No photographic backgrounds, broad white overlay, backdrop blur or persistent bottom cloud bank.
- Clouds are local accents between bands; stars stay above the horizon with a quieter reading area. Terrain fills the viewport edges without crowding text.
- **Afternoon uses `rays:false`: sun disc only, no aura/ray ring.** Other sunny presets may use the supplied rays.
- Keep the lowered opening horizon, capped wide-screen terrain and wider cropped phone stage. Review short landscape screens as well as portrait phones.
- Cutouts decode before transitions; shared resources are cached, each panel instance is decoded, and failed optional pieces hide while the CSS sky remains usable.

## Artwork pipeline

- Originals: `figures/raw/illustrated_scenery/` (19 files, including the five opening/weather clouds). Hashes, upload names, native dimensions, measured crops and outputs: `data/sources/illustrated-scenery.json`.
- Derivatives: `figures/scenery/painted/` and `figures/decor/painted/`; PNG preserves alpha, WebP serves the page. Terrain includes night/bluehour variants; paper grain is locally seeded.
- Prompts and sheet map: [Illustrated prompts and sheet map](prompts/illustrated_scenery/README.md). Large scenes/terrain have separate prompts; small related objects share sheets.
- Run `python3 scripts/prepare_illustrated_scenery.py` from `taxua-2026/` (Pillow + NumPy). It can organize new named uploads from `figures/raw/`; existing canonical originals are not overwritten.
- Crops are measured for the supplied sheets, not ideal prompt quadrants; review `CROPS` for replacements. Preserve fine alpha edges, never upscale, and keep sun disc/rays centered together.
- Archived `figures/backgrounds/` B01–B05 and `figures/scenery/c*` assets are not live scenery; retain provenance without restoring them.

Validate with `verify_illustrated_scenery.cjs`, then motion/reveal checks for framing or chapter changes. See [verification](verification.md).

## Cloud opening and weather

The opening has a separate painted cloud composition and measured terrain depth wrappers. Weather accents never write base-panel opacity. Ambient movement uses independent transforms and runs only on visible story panels; navigation snapshots freeze their computed pose and weather blend. The opening clears during descent. See [Sky and weather](weather.md) for assets, dates, input and cache behavior.
