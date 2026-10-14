# Illustrated scenery prompts

Generate large scenes and terrain layers individually. Smaller objects remain grouped. Copy the text block from the file you want to generate.

| Prompt | Canvas | Priority |
| --- | --- | --- |
| [01 Sunrise scene](./01_scene_sunrise.md) | 4096 × 2304, one landscape | Concept reference |
| [02 Night scene](./02_scene_night.md) | 4096 × 2304, one landscape | Concept reference |
| [03 Daylight scene](./03_scene_daylight.md) | 4096 × 2304, one landscape | Concept reference |
| [04 Afternoon scene](./04_scene_afternoon.md) | 4096 × 2304, one landscape | Concept reference |
| [05 Far ridge](./05_ridge_far.md) | 3840 × 1280, one layer | Core |
| [06 Middle ridge](./06_ridge_mid.md) | 3840 × 1280, one layer | Core |
| [07 Near ridge](./07_ridge_near.md) | 3840 × 1280, one layer | Core |
| [08 Serrated ridge](./08_ridge_serrated.md) | 3840 × 1280, one layer | Core |
| [09 Left meadow](./09_meadow_left.md) | 3840 × 1280, one layer | Core |
| [10 Right meadow](./10_meadow_right.md) | 3840 × 1280, one layer | Core |
| [11 Clouds](./11_cloud_sheet.md) | 3840 × 2560, three full-width rows | Core |
| [12 Celestial](./12_celestial_sheet.md) | 3072 × 3072, four components | Optional |
| [13 Environment](./13_environment_sheet.md) | 3072 × 2048, five details | Core |
| [14 Stickers](./14_travel_sticker_sheet.md) | 3072 × 3072, four stickers | Optional |

Fourteen prompts provide four full-resolution landscape references and twenty-two components. Eight core prompts provide fourteen components.

Clouds stay in full-width rows to preserve their horizontal resolution. Celestial objects, environmental details, and stickers are small accents that can share a canvas. Request the highest native resolution at the specified aspect ratio; keep the original output rather than upscaling it to the stated dimensions.

Optional style references: [gogo logo](../../figures/raw/gogo_mountain_sunrise.png), [day mountain artwork](../../figures/decor/mountain_sky_day.webp), [night mountain artwork](../../figures/decor/mountain_sky_night.webp).

## Sheet separation map

| Sheet | Positions and extracted filenames |
| --- | --- |
| Clouds | Top: `cloud_valley_ribbon.png`; middle: `cloud_sky_puff.png`; bottom: `cloud_distant_wisp.png` |
| Celestial | Top left: `sun_disc.png`; top right: `sun_rays.png`; bottom left: `moon.png`; bottom right: `star_motif.png` |
| Environment | Top left: `winding_road.png`; top middle: `lake.png`; top right: `solitary_tree.png`; bottom left: `hillside_hut.png`; bottom middle: `rock_outcrop.png`; bottom right: empty |
| Stickers | Top left: `bus_sticker.png`; top right: `headlamp_sticker.png`; bottom left: `cloud_coffee_sticker.png`; bottom right: `backpack_sticker.png` |

Individual scene and terrain files need no sheet extraction. Scenes are opaque; terrain has transparent space above its crest and painted coverage to its side/bottom edges. Cloud and object sheets have transparent padding and gutters.

Save originals in `taxua-2026/figures/raw/illustrated_scenery/`. Crop sheets by cell before trimming alpha. Keep identical square crops for the sun disc and rays so their centers align. Check alpha over light and dark fills and preserve branches, cloud tips, and steam.

