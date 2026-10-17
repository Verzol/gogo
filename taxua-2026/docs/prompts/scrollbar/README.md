# Sợi mây artwork

[Documentation index](../../README.md) · [Scrollbar plan](../../scrollbar-plan.md)

The [two-cloud prompt](01_cloud_thumbs.md) is the exact brief for `cx/gpt-image-2.5-sunburst` through 9Router. Request high quality, 1536×1024, transparent PNG. References are the local hero cloud, wheel rim and coffee sticker.

Keep the returned master and generation metadata in `figures/raw/scrollbar/`. The preparation helper preserves that master, measures the two cutouts and produces matching transparent WebPs. Source hashes, crops and runtime dimensions belong in `data/sources/scrollbar-artwork.json`. Labels, thread, focus ring and geometry remain live HTML/CSS.

The later cloud-only revision reuses the existing `cloud_1_day.png` / `cloud_1_night.png` stickers instead of the ribbon sheet. The preparation helper now trims those clouds into transparent 160×128 WebPs. The Sunburst sheet/request above is retained unchanged as the original design record; current source hashes are in `data/sources/scrollbar-artwork.json`.

The current revision restores the solid/dotted track while keeping the cloud-only silhouette. It expands the two supplied base clouds into eight local variants for sky, night, predawn, dawn, morning, noon, afternoon and evening. Six scrollbar-only pigment maps preserve texture and alpha; source masters remain unchanged. The helper and manifest record every source, palette and derivative hash. No additional image generation was required.
