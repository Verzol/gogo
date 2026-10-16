# Map artwork prompts

[Documentation index](../../README.md) · [Map design plan](../../map-plan.md#artwork-brief) · [Existing UI prompts](../ui_artwork/README.md)

All eleven assets are now imported. Prompts 04–11 document the eight newly supplied location stickers. Copy one complete prompt block per generation. Each prompt is self-contained, begins with “Generate” and needs no image attachments.

| Prompt | Output filename | Canvas |
| --- | --- | --- |
| [01 Homestay landmark](01_home_base.md) | `map_home_base.png` | 1:1 · 1024 × 1024 |
| [02 Waterfall landmark](02_waterfall.md) | `map_waterfall.png` | 2:3 · 1024 × 1536 |
| [03 Paper frame, imported](03_paper_frame.md) | `map_paper_frame.png` | 3:2 · 1536 × 1024 |
| [04 Vị Nhà · home-style lunch](04_vi_nha.md) | `map_vi_nha.png` | 1:1 · 1024 × 1024 |
| [05 Bếp Củi · cooking hearth](05_bep_cui.md) | `map_bep_cui.png` | 1:1 · 1024 × 1024 |
| [06 Ameii Hill · grassy cabin retreat](06_ameii_hill.md) | `map_ameii_hill.png` | 1:1 · 1024 × 1024 |
| [07 A Phủ · timber dining house](07_a_phu.md) | `map_a_phu.png` | 1:1 · 1024 × 1024 |
| [08 Thảo nguyên · rolling grass hills](08_thao_nguyen.md) | `map_thao_nguyen.png` | 1:1 · 1024 × 1024 |
| [09 Lán Cô Đơn · open timber shelter](09_lan_co_don.md) | `map_lan_co_don.png` | 1:1 · 1024 × 1024 |
| [10 Đồi Mây · grilled-food platter](10_doi_may.md) | `map_doi_may.png` | 1:1 · 1024 × 1024 |
| [11 Trung tâm Tà Xùa · small town cluster](11_trung_tam.md) | `map_trung_tam.png` | 1:1 · 1024 × 1024 |

The prompts describe the subject, composition, palette and watercolor treatment in words. The landmarks are stylized illustrations rather than exact venue reconstructions. Meal stops use distinct food/cooking symbols; buildings use the existing place-guide descriptions without claiming architectural accuracy. Trung tâm Tà Xùa remains an approximate area even after its sticker is generated. A single palette is sufficient; separate night variants are unnecessary for the proposed contained map.

Use the generator's highest supported native resolution at the listed ratio, without upscaling. Export PNG with genuine alpha transparency. Inspect on both light and dark backgrounds for white rectangles, false checkerboards, clipped edges and stray pixels. Check that each landmark remains recognizable around 48–64px tall. The frame should have an empty transparent center and is only for the map's outer edge.

Save original outputs under `figures/raw/map_artwork/` with the filenames above. If saving generated downloads in `figures/raw/` first, keep their original bytes and filenames so they can be organized during import. Optimized runtime derivatives will belong under `figures/decor/painted/`; all eleven outputs now have optimized WebP derivatives and recorded source hashes. Run `scripts/prepare_map_artwork.py` to reproduce them; it refuses to replace an existing master.

## Reuse these assets

No new café cup, ridge, tree, rock, bus, map-pin shell, route line or button artwork is needed:

- [Café](../../../figures/decor/painted/cloud_coffee_sticker.png) and [bus](../../../figures/decor/painted/bus_sticker.png).
- [Ridge](../../../figures/decor/dino_ridge_day.png), [lone tree](../../../figures/decor/lone_tree_day.png) and [dolphin rock](../../../figures/decor/dolphin_rock_day.png).
- Place names, visit numbers, selection rings, route connections and controls will be rendered in code. The geographic basemap comes from the selected map provider.
