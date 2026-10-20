# Một bó hoa trên mây

[Documentation index](README.md) · [Group features](group.md) · [Playful objects](playful.md) · [Location scenes](location-scenes.md)

A keepsake for Vietnamese Women's Day, 20 October 2026. Explicit recipients are **mi, thảo and linh**, confirmed by the trip owner. No gender is inferred from names or portraits. The bouquet remains available during the trip; there is no clock-based activation or midnight expiry.

## Behavior

The opening and crew each have a painted bouquet. Mouse hover or keyboard focus previews the floral mountain scene. Clicking, tapping, Space or Enter holds it. Activating the held control again, Escape, or “Về biển mây” clears it. Reset returns focus to the originating control without immediately reopening it. The greeting is live HTML using the existing Patrick Hand and Be Vietnam Pro fonts.

Three flower sprigs sit beside the existing scarf portraits. Hovering a portrait or its flower reveals a personal greeting. Separate native flower buttons provide touch and keyboard access. The original name links still open the same person's private diary; portraits, member IDs/order, games and diary authentication are unchanged. The crew invitation reserves its greeting space so showing a message does not move a hovered portrait.

An unheld preview clears after leaving its interactive region. A held choice survives pointer movement; temporarily previewing another flower returns to the held choice on exit. Navigation, open dialogs/phone menus, leaving the opening or crew portrait area, pagehide and print clear the floral scene and pending requests. Weather pointer hover preserves an active celebration; deliberate weather selection or keyboard focus takes ownership. A location preview takes ownership as soon as requested, including before artwork finishes loading. Newer intent invalidates older floral decode results.

The scene contains only the selected wide or portrait painting and at most ten temporary petals (six on phones). Petals acknowledge a deliberate activation and disappear after a brief flutter; no animation loops are added. Motion pause, reduced motion and hidden tabs cancel decoration immediately. The static greeting remains usable. Landscapes load only after intent and decoded images are reused, with a two-orientation cache. Rotation chooses artwork by screen shape, including portrait tablets and landscape phones.

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

Three masters were generated with **9Router `cx/gpt-image-2.5-sunburst`**, from written prompts only. No portraits or photos were sent. Exact requests, model, actual dimensions and hashes are beside the untouched PNGs in `figures/raw/womens_day/`. The [job list](prompts/womens_day/jobs.json) contains complete prompts and options. Lettering is not baked into the paintings.

The wide painting returned at 1672×941; the portrait at 1024×1536; the transparent six-cell flower sheet at 1536×1024. The preparation helper verifies master/prompt hashes, keeps the largest connected painted subject in each cell, removes disconnected alpha dust, and downsamples cutouts without enlargement. Landscape dimensions remain native; runtime WebPs use quality 90. Source/crop/derivative hashes and dimensions are in [the artwork manifest](../data/sources/womens-day-artwork.json). Generation never overwrites raw masters.

```sh
# Uses NINEROUTER_URL and optional NINEROUTER_KEY only for missing masters.
python3 -B scripts/prepare_womens_day_art.py --generate
# Reproduce derivatives with Pillow, NumPy and SciPy, without network.
python3 -B scripts/prepare_womens_day_art.py
node scripts/verify_womens_day.cjs
```

## Verification

The focused helper checks actual hover, keyboard and phone taps; personal recipients; original diary links; initial lazy loading; forecast/location ownership; slow-image cancellation; fixed portrait geometry; desktop, phone, portrait tablet and landscape art; motion pause/reduced motion; scrolling out; print; failed art/retry; direct-file use and missing GSAP. Evidence defaults to `/tmp/taxua-womens-day-review/`; `TRIP_REVIEW_DIR` overrides it. Forecasts are fixtures; no payment or private-diary writes occur. Related regressions are location scenes, weather, playful objects, mobile UI and motion. Chromium emulation does not establish physical-device, Safari or Firefox behavior.

### Verified 20 October 2026

The final focused run passed **87 checks**. Related location (95), weather (106), playful-object (127), mobile UI (108), and motion (85) checks also passed: **608 browser checks** in total. Desktop, 390/320px phones, portrait tablet and short landscape screenshots were inspected. No uncaught browser errors were reported by the focused or error-tracking regression helpers. Weather evidence is copied to `/tmp/taxua-womensday-weather/`; motion evidence is in `/tmp/taxua-womensday-motion/`; other helpers use their documented temporary folders. Generated review files were kept outside the delivered changes.

Eight scoped axe audits of the visible hero/crew controls and greetings, across desktop/phone and light/dark browser preferences, reported zero violations. Image-background contrast remains marked for manual review by axe; screenshots were inspected separately. Actual rendered Vietnamese glyphs used Patrick Hand for the personal heading and Be Vietnam Pro for its body text, verified through Chromium's platform-font API. Dialog/menu dismissal and 200% text at 320px were also checked. Audit/font evidence: `/tmp/taxua-womensday-accessibility.json`.

A desktop Lighthouse lab run of the initial cloud page scored **87 performance / 100 accessibility**, with FCP 0.6s, LCP 1.1s, CLS 0.088 and no run warnings/runtime error. This is a local initial-page measurement, not a physical-device or selected-scene performance claim. Report: `/tmp/taxua-womensday-lighthouse.json`.

All eight derivatives reproduced byte for byte from their verified masters. Runtime artwork totals **728,172 bytes**; the two landscapes account for 635,982 bytes and load only after intent. Original trip data outside the festive configuration, scarf portraits and generated standalone itinerary are unchanged. JavaScript syntax, whitespace and 123 local links in affected documentation were checked.
