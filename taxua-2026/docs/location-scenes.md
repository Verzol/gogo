# Six painted places in the opening

[Documentation index](README.md) · [Artwork gallery](location-scenes-gallery.md) · [Approved design brief](location-scenes-plan.md)

The opening starts with the existing cloud world. Six painted location stickers preview Sống Lưng Khủng Long, Cây Cô Đơn, Mỏm Cá Heo, Thảo nguyên Tà Xùa, Thác Chua Tỳ and Thào Coffee. Tree, dolphin rock, meadow, waterfall and café are original prompt-only illustrations: no photographs or generated images were supplied to their generation requests. Sống Lưng retains the previously approved artwork and its original reference provenance. All scenery is illustrative, rather than a documentary view or a representation of the selected forecast.

## Inputs and behavior

Hover a sticker for 160ms or focus it with the keyboard to preview its landscape. The whole chooser, caption and story link form one region: moving from a sticker to its link keeps the preview available. Leaving this region restores the clouds after a 120ms grace period unless a location is held. Clicking, tapping, Enter or Space holds a location; activating the held sticker again clears it. “Về biển mây” and Escape also clear it. The separate story link navigates to the corresponding existing itinerary event or place guide.

Desktop uses a six-sticker row below the title and weather. Phones use three columns and two rows between the story actions and forecast. Each scene has a deliberately recomposed portrait painting. Artwork selection follows viewport aspect ratio: square/portrait screens use portrait art; landscape screens use wide art. This includes portrait tablets above 767px and landscape phones below 768px. Width breakpoints still control the chooser layout independently. Each slot stores its own crop alignment, so outgoing and incoming paintings retain their framing during a rotation. Natural scrolling continues and the hero can grow on short screens or with enlarged text.

Each incoming composition decodes its actual image elements before a 750ms dissolve. Two recent compositions are retained and reused without cloning or decoding again; repeated pending requests share the same work. This also prevents an unpainted first frame when reduced motion skips the fade. The main painting stays stationary to avoid fractional-pixel resampling softness. Pointer movement shifts only mist and foreground layers by at most approximately 6 and 10px. Grass, outer foliage, drifting mist, lake glints, a pair of distant birds, isolated coffee steam, and masked waterfall water/spray give the places different motion. Terrain, the tree trunk, rocks and café architecture remain part of the rigid painting. The waterfall mask is extracted from the painting itself, so flow stays on the authored cascade. Coffee steam and waterfall spray are positioned from authored source coordinates using the same cover geometry as their paintings. Resizing recomputes their anchors; waterfall flow keeps exactly the same pixel dimensions as its painting.

The existing motion control and reduced-motion preference disable the dissolve and parallax, and stop ambient effects. Hidden tabs pause effects. Navigation, an open dialog/menu, Escape, physical hero exit and pagehide remove the location composition. Printing excludes the chooser and decorative scenery.

## Code ownership

The optional [20/10 keepsake](womens-day.md) shares the opening background. `journey:location-preview` fires before a new location request, invalidating both visible and pending floral scenes. Selecting the bouquet clears held/pending locations through the existing controller API.

| Owner | Responsibility |
| --- | --- |
| `location-data.js` | Six stable IDs, Vietnamese labels, brief captions, effects and existing story targets. No canonical trip-data edits. |
| `location-scenes.js` / `.css` | Optional native-button chooser, selected/preview/request state, decoded composition cache, two live scene slots, image composition and bounded motion. |
| `scenery.js` | `setLocationPreview()` suspends covered opening cloud tracks; opening geometry includes the chooser. Location art is a sibling of `#sceneLayers`, so story snapshots cannot clone it. |
| `weather.js` | Exposes `JourneyWeather.clearPreview()`. A new date preview dispatches `journey:weather-preview`; location selection clears date preview. Actual forecast values and fetch/cache rules remain owned by weather. |
| `motion.js` | Clears locations before navigation/story snapshots; a late initial background settling in the opening does not discard a visitor's selection. |
| `playful.js` | Suppresses the original opening sun/cloud targets while covered by a location. |

The controller never writes itinerary content, story opacity, scroll position, `data-scenery-world` or forecast values. Weather-card pointer hover is ignored while a location painting is active. A deliberate weather-card click/tap or keyboard activation can still take ownership of the opening. Old decode results cannot replace newer intent. At most two full scene slots are live, with a two-entry least-recently-used decoded composition cache. Cancelling a pending hover restores an already-visible held scene without rebuilding or fading it again. This bounds retained controller references; it is not a measurement of browser image-cache memory.

No heavy location image is preloaded. Six small stickers load initially; landscape and effect images load after intent. Missing scene art restores readable clouds, announces failure on deliberate selection, and allows retry. Missing optional controller leaves the ordinary trip. All assets are local, with no runtime image API, new framework or library.

## Preserved artwork and reproducibility

Sunburst model: **`cx/gpt-image-2.5-sunburst`**, through the 9Router image-generation endpoint. New masters are under `figures/raw/location_scenes/text_only/`: wide and portrait paintings, foregrounds and stickers for five locations, plus shared bird, glint, mist and spray plates. Every new generation request contains only a text prompt and model/options; `references` is empty and no `images` payload is sent. The complete reproducible job list is [text_only_jobs.json](prompts/location_scenes/text_only_jobs.json). No real photo or earlier generated painting is used even for the stickers or effect plates.

The four existing Sống Lưng sources (selected candidate B, portrait, foreground, sticker) are preserved. Older photo-referenced masters for the other locations remain archival under their original folders, but preparation no longer selects them. Adjacent JSON records preserve prompts, requested and returned dimensions, model, source/output hashes and creation times. Credentials and encoded image payloads are excluded.

Wide prompts request a 16:9 composition with landmarks inside the central safe area, allowing 16:10 and near-square crops. Portrait prompts explicitly recompose the scene for 2:3 with landmarks toward the lower right; source-specific crop alignment keeps those landmarks in tall phone views. The renderer fills the viewport using `cover`; some secondary scenery is necessarily cropped at extreme ratios. Desktop and phone paintings are independent interpretations of the same written landmark, rather than identical views.

The generator can return dimensions different from the requested size. Runtime paintings retain the actual returned pixels without downsampling or artificial upscaling and use lossless WebP. Browser scaling on high-density or very large displays still depends on the returned resolution; lossless encoding cannot invent additional detail. Foregrounds/effects retain true alpha and are sized for their rendered role. The original cloud ribbon remains exclusive to Sống Lưng; the other scenes use the new prompt-only mist plate.

```sh
python3 -B scripts/prepare_location_scenes.py
node scripts/verify_location_scenes.cjs
node scripts/verify_location_responsive.cjs
```

The preparation helper verifies source, prompt and reference hashes and checks true alpha on cutouts. It preserves each full landscape and portrait painting at its source dimensions and encodes these base backgrounds as pixel-exact lossless WebP. New cutouts and effects are also lossless, trimmed and downsampled without enlargement (foregrounds within 1440×1440, stickers within 352×352). The two retained ridge cutouts keep their original q90 encoding and sizes. All outputs are written as WebP derivatives with `data/sources/location-scenes.json`. `--partial` is for an incomplete art-production session; final preparation must run without it. Waterfall flow masks retain source coordinates and a recorded luminance/polygon recipe.

For future generation, use `python3 -B scripts/generate_location_art.py /path/to/jobs.json` with `NINEROUTER_URL` and optional `NINEROUTER_KEY`. A job contains `name` (for example `text_only/tree/portrait`), `prompt`, `refs: []`, `size`, and optionally `transparent`. The helper still supports archived reference-based jobs, but the current prompt-only job list must keep every reference list empty. Existing outputs are preserved. Reuse the per-master metadata for exact original prompts and references. The model may return a different resolution than requested; metadata and derivatives record the actual size.

## Verification

The focused browser helper exercises real hover, keyboard and touch inputs, asynchronous switching, weather ownership, anchors, menu cleanup, pause/reduced motion, portrait swaps, responsive geometry, enlarged text, missing resources/GSAP, direct-file use, print and actual rendered Vietnamese font families. It uses deterministic public weather fixtures and makes no private diary or payment writes. Evidence defaults to `/tmp/taxua-location-review/`, outside the checkout.

Run results and transfer sizes are recorded below. Chromium emulation does not establish physical-phone frame rate, memory use, battery use, Safari or Firefox behavior.


## Prompt-only refresh · 19 October 2026

The five locations other than Sống Lưng now use new text-only Sunburst artwork. The preparation audit verifies 24 new prompt-only masters, 30 runtime derivatives, and pixel-exact native output for all 12 base paintings. Source and output hashes confirm the Sống Lưng masters and derivatives remain unchanged. The [previous artwork verification](research/location-scenes-previous-verification.md) remains historical evidence.


Current results: **92 focused interaction checks** and **60 scene/viewport combinations** passed in Chromium. The screen-shape helper captures all six scenes at 1920×1080, 1440×900, 1280×1024, 820×1180, 390×844, 320×740, 740×390, 2560×1080, 2560×720 and 768×768. It verifies actual variant selection, decoded images, viewport coverage, positioned steam/spray, no horizontal overflow and no uncaught browser errors. Desktop, phone and ultrawide screenshots were inspected. The tree retains a higher ultrawide crop to preserve its crown; extreme ratios still crop secondary scenery.

Review exposed an initial-paint problem when cloning cached images: intrinsic dimensions could be available while the actual clone was not ready to paint. That initial fix decoded the clones before displaying them, including reduced-motion selection. The later loading optimization instead caches and reuses the actual decoded image elements, eliminating those clones. Steam/spray positioning also waits for valid intrinsic dimensions. A subsequent full interaction attempt timed out during local navigation; after restoring the preview server with redirected request logs, the final run passed all 92 checks. Asset preparation preserves transparent RGB with lossless `exact` encoding; waterfall masks explicitly discard only fully invisible RGB to avoid transmitting another full painting inside the effect. Preparation was verified with Pillow 12.2.0; encoder/resampler versions can change derivative bytes, so preserve existing approved exports when exact byte identity matters.

All **24 prompt-only master records** passed image/prompt hashes, dimensions and empty-reference checks. All **30 derivative hashes and dimensions** passed, and all **12 base backgrounds** were compared pixel-for-pixel with their PNG sources. The four Sống Lưng runtime exports retain their original hashes. New transparent assets were inspected on a contrasting background. Earlier photo-referenced artwork is preserved for history.

The 12 base paintings occupy **28,348,490 bytes (27.0 MiB)**; all 30 derivatives occupy **33,579,892 bytes (32.0 MiB)**. The six initial stickers total **706,090 bytes (690 KiB)**. Scene paintings remain lazy; selecting one scene does not fetch the other five. Approximate selected-scene transfer including its mist/effects, excluding initial stickers:

| Scene | Wide | Portrait |
| --- | ---: | ---: |
| Sống Lưng | 2.00 MiB | 2.06 MiB |
| Cây Cô Đơn | 2.78 MiB | 2.82 MiB |
| Mỏm Cá Heo | 3.22 MiB | 3.44 MiB |
| Thảo nguyên | 3.36 MiB | 3.67 MiB |
| Thác Chua Tỳ | 3.70 MiB | 3.81 MiB |
| Thào Coffee | 2.93 MiB | 3.09 MiB |

New wide paintings returned at **1672×941**, and new portrait paintings at **1024×1536**, despite larger requested sizes. These native dimensions are retained. Phone/tablet framing is art-directed, but very large/high-density screens still scale the supplied pixels. Evidence: `/tmp/taxua-prompt-only-review/`, `/tmp/taxua-location-responsive/` and `/tmp/taxua-prompt-only-assets.json`. No physical-device, Safari/Firefox, FPS, memory or battery profiling is claimed.


A final local **desktop Lighthouse** run on the initial cloud page scored **56 performance / 100 accessibility** (FCP 1.5s, LCP 2.1s, CLS 0.076, total blocking time 450ms), with no runtime error or audit warnings. This is an initial-page lab measurement, not a selected-scene or physical-device performance result. Report: `/tmp/taxua-prompt-only-lighthouse.json`. The existing whole-page scripting and rendering cost remains; the artwork refresh does not claim a general performance improvement.
