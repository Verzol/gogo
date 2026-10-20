# Một bó hoa trên mây

[Documentation index](README.md) · [Group features](group.md) · [Playful objects](playful.md) · [Location scenes](location-scenes.md)

A keepsake for Vietnamese Women's Day, 20 October 2026. Explicit recipients are **mi, thảo and linh**, confirmed by the trip owner. No gender is inferred from names or portraits. The bouquet remains available during the trip; there is no clock-based activation or midnight expiry.

## Behavior

The opening and crew each have a painted bouquet. Mouse hover or keyboard focus previews the floral mountain scene. Clicking, tapping, Space or Enter holds it. Activating the held control again, clicking anywhere outside the bouquet and flower buttons, or pressing Escape restores the clouds and hides the greeting. No separate reset button is shown. Outside clicks also cancel pending artwork loads. The greeting is live HTML using the existing Patrick Hand and Be Vietnam Pro fonts.

The opening reserves the greeting's actual wrapped height while keeping inactive text invisible. Loading feedback sits outside normal flow. Previewing, holding or dismissing the bouquet therefore keeps the hero, weather and countdown positions stable on desktop and phones, including when the optional location explorer is disabled.

Three flower sprigs sit beside the existing scarf portraits. Hovering a portrait or its flower reveals a personal greeting. Separate native flower buttons provide touch and keyboard access. The original name links still open the same person's private diary; portraits, member IDs/order, games and diary authentication are unchanged. The crew invitation reserves its greeting space so showing a message does not move a hovered portrait.

Each recipient also has her own painting: mi has a rose-pink cosmos meadow in transparent watercolor, thảo has a golden daisy hillside with matte gouache accents, and linh has a cool lilac bellflower valley with fine botanical contours. Names retain dark jade ink with a small light text shadow over detailed flowers. Both general bouquet controls keep the original shared scenery. Recipient mappings live in `TRIP_DATA.womensDay.landscapes`. This is a targeted extension of the native watercolor aesthetic, preserving its typography and layout (design variance 7, motion intensity 4, visual density 4); existing fades communicate scene changes.

An unheld preview clears after leaving its interactive region. A held choice survives pointer movement; temporarily previewing another flower returns to the held choice on exit. Navigation, open dialogs/phone menus, leaving the opening or crew portrait area, pagehide and print clear the floral scene and pending requests. Weather pointer hover preserves an active celebration; deliberate weather selection or keyboard focus takes ownership. A location preview takes ownership as soon as requested, including before artwork finishes loading. Newer intent invalidates older floral decode results.

The scene contains only the selected wide or portrait painting and at most ten temporary petals (six on phones). Petals acknowledge a deliberate activation and disappear after a brief flutter; no animation loops are added. Motion pause, reduced motion and hidden tabs cancel decoration immediately. The static greeting remains usable. Landscapes load only after intent; a cache of four recent decoded recipient/orientation variants avoids eagerly fetching the other paintings. Rotation chooses artwork by screen shape, including portrait tablets and landscape phones. A later recipient choice invalidates an earlier decode, and leaving a temporary preview restores the held recipient's painting.

Failed landscape loading restores the original scenery and presents the greeting plus a retry message. Failed small flower images leave their named controls available. The optional controller uses classic JavaScript, local images and native input; no framework, runtime generation endpoint, new library, sound, storage, or backend is required. Direct-file use and missing GSAP retain the interaction. Print excludes festive controls and scenery.

## Owners

| File | Responsibility |
| --- | --- |
| `data.js:TRIP_DATA.womensDay` | Explicit recipient IDs and Vietnamese copy |
| `main.js:renderCrew` | Stable `data-member-id` attributes on existing portraits |
| `womens-day.js` / `.css` | Optional invitations, flower controls, scene ownership, decoded-image cache and bounded effects |
| `index.html` | Optional stylesheet/script, after the location controller |
| `location-scenes.js` | `journey:location-preview` before a location request takes the background |
| `weather.js` | Ignore pointer-only forecast previews while the floral scene is visible |
| `playful.js` | Suspend hidden sun/cloud targets while floral art covers them |

`#womensDayStage` is a sibling of `#sceneLayers` and `#locationStage`, inside decorative scenery and below page content. Story/navigation snapshots cannot clone it. It does not write story opacity, period/chapter state, scroll position, forecast values or real trip dates. Navigation ink temporarily follows the light floral painting via scoped CSS and returns to original scene tokens on dismissal.

## Artwork and reproduction

Twelve masters were generated with **9Router `cx/gpt-image-2.5-sunburst`**: the original shared wide/portrait paintings and sticker sheet, three initial square personal landscapes, and six native wide/portrait replacements. The first six used written prompts only; each replacement uses its recipient's generated square painting as an image reference. No portraits or photos were sent. Exact requests, references, model, actual dimensions and hashes are beside the untouched PNGs in `figures/raw/womens_day/`. The [job list](prompts/womens_day/jobs.json) contains complete prompts and options. Lettering is not baked into the paintings.

The shared wide painting returned at 1672×941; the portrait at 1024×1536; the transparent six-cell flower sheet at 1536×1024. The preparation helper verifies master/prompt/reference hashes, keeps the largest connected painted subject in each cell, removes disconnected alpha dust, and downsamples cutouts without enlargement. Original runtime WebPs use quality 90; the six current personal landscapes use pixel-exact lossless WebP. Source/crop/derivative hashes, encoding and dimensions are in [the artwork manifest](../data/sources/womens-day-artwork.json). Generation never overwrites raw masters.

The three initial personal masters each returned at 1254×1254. Their 1254×836 wide and 836×1254 portrait crops remain archived, but recipient mappings now select `landscape_{mi,thao,linh}_native`. Each has a separately generated **1672×941 wide** and **1024×1536 portrait** painting. The full native image is preserved without cropping, resizing or compression loss, giving each orientation about 50% more pixels than its previous crop. Sunburst returned these sizes despite requests for 3840×2160 and 2048×3072; the trip owner chose to retain Sunburst at its best observed native resolution. These are not 4K assets, and large or high-DPI displays can still stretch them.

The six current personal derivatives total **12,385,684 bytes**, with a largest file of **2,201,898 bytes**. This is a deliberate transfer-size tradeoff for lossless detail. Only the chosen recipient/orientation loads after intent; the initial cloud page does not fetch them. The manifest retains all 20 runtime derivatives, totaling **14,886,168 bytes**, including archived crops. Preparation preserves existing derivatives when their recorded source, crop, dimensions, encoding policy and content hash still match, avoiding unrelated re-encoding across Pillow versions.

```sh
# Uses NINEROUTER_URL and optional NINEROUTER_KEY only for missing masters.
python3 -B scripts/prepare_womens_day_art.py --generate
# Reproduce derivatives with Pillow, NumPy and SciPy, without network.
python3 -B scripts/prepare_womens_day_art.py
python3 -B scripts/verify_womens_day_art.py
node scripts/verify_womens_day.cjs
```

## Verification

Run `node scripts/verify_womens_day_layout.cjs` for the opening layout regression, including with the location explorer disabled. It checks stable hero, weather and countdown geometry during delayed artwork loading, activation, dismissal and hover at six viewport sizes plus 200% text. The fix passed 43 checks with no uncaught browser errors; desktop and phone screenshots were inspected in `/tmp/taxua-womens-day-layout/`.

The focused helper checks actual hover, keyboard and phone taps; personal recipients; original diary links; initial lazy loading; forecast/location ownership; slow-image cancellation; fixed portrait geometry; desktop, phone, portrait tablet and landscape art; motion pause/reduced motion; scrolling out; print; failed art/retry; direct-file use and missing GSAP. Evidence defaults to `/tmp/taxua-womens-day-review/`; `TRIP_REVIEW_DIR` overrides it. Forecasts are fixtures; no payment or private-diary writes occur. Related regressions are location scenes, weather, playful objects, mobile UI and motion. Chromium emulation does not establish physical-device, Safari or Firefox behavior.

### Native-resolution replacement verification, 20 October 2026

The updated interaction helper passed **128 checks**, including native decoded dimensions and the absence of CSS filters or transforms on the paintings. The opening layout helper passed **43 checks**: **171 browser checks** total, with no uncaught browser errors. All three personal desktop and phone scenes were visually inspected. Evidence: `/tmp/taxua-womens-day-native/` and `/tmp/taxua-womens-day-native-layout/`.

The image verifier checked all six native replacements for full-source dimensions, pixel-exact PNG/WebP equality, orientation, minimum returned resolution, model, prompts and source/reference/runtime hashes. All 14 previous WebPs remain byte-for-byte unchanged. Actual decoded sizes and display scaling were measured for all three recipients at 1440×900 DPR 1, 1920×1080 DPR 2 and 390×844 DPR 3: nine scene/viewport combinations, recorded in `/tmp/taxua-womens-day-native/resolution.json`. The standalone itinerary remains unchanged after export. No new Lighthouse run was performed for this replacement.

### Initial personal landscape verification, 20 October 2026 (historical)

The updated interaction helper passed **113 checks**, including each portrait's unique decoded painting, wide/portrait selection, lazy recipient loading, rapid switches with delayed images, and restoration of a held recipient after another preview. The opening layout helper passed **43 checks**. Both reported no uncaught browser errors. Screenshots for all three desktop scenes and phone crops were inspected; light and dark browser preferences retained readable scenes without horizontal overflow. Evidence: `/tmp/taxua-personal-womens-day/` and `/tmp/taxua-personal-womens-day-layout/`.

All three new masters and all 14 runtime images passed dimension/content-hash verification. The eight original derivatives are unchanged byte for byte. The six new responsive crops total **1,772,312 bytes**, loaded only after recipient intent; total festive runtime artwork is **2,500,484 bytes**. The standalone itinerary remains unchanged after export.

A local desktop Lighthouse run of the initial page scored **79 performance / 100 accessibility**, LCP 2.82s and CLS 0.0795, without run warnings or a runtime error. This measures the initial cloud page; none of the personal landscapes are eagerly requested. It is not a selected-scene or physical-device performance result. Report: `/tmp/taxua-personal-womens-day-lighthouse.json`.

### Initial shared-scene verification, 20 October 2026

The final focused run passed **87 checks**. Related location (95), weather (106), playful-object (127), mobile UI (108), and motion (85) checks also passed: **608 browser checks** in total. Desktop, 390/320px phones, portrait tablet and short landscape screenshots were inspected. No uncaught browser errors were reported by the focused or error-tracking regression helpers. Weather evidence is copied to `/tmp/taxua-womensday-weather/`; motion evidence is in `/tmp/taxua-womensday-motion/`; other helpers use their documented temporary folders. Generated review files were kept outside the delivered changes.

Eight scoped axe audits of the visible hero/crew controls and greetings, across desktop/phone and light/dark browser preferences, reported zero violations. Image-background contrast remains marked for manual review by axe; screenshots were inspected separately. Actual rendered Vietnamese glyphs used Patrick Hand for the personal heading and Be Vietnam Pro for its body text, verified through Chromium's platform-font API. Dialog/menu dismissal and 200% text at 320px were also checked. Audit/font evidence: `/tmp/taxua-womensday-accessibility.json`.

A desktop Lighthouse lab run of the initial cloud page scored **87 performance / 100 accessibility**, with FCP 0.6s, LCP 1.1s, CLS 0.088 and no run warnings/runtime error. This is a local initial-page measurement, not a physical-device or selected-scene performance claim. Report: `/tmp/taxua-womensday-lighthouse.json`.

All eight derivatives reproduced byte for byte from their verified masters. Runtime artwork totals **728,172 bytes**; the two landscapes account for 635,982 bytes and load only after intent. Original trip data outside the festive configuration, scarf portraits and generated standalone itinerary are unchanged. JavaScript syntax, whitespace and 123 local links in affected documentation were checked.
