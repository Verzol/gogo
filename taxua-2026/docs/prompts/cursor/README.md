# Painted cloud cursors

[Documentation index](../../README.md) · [Cursor behavior](../../controls.md#painted-cloud-cursors)

The [exact two-shape prompt](01_cloud_cursors.md) produced the arrow and pointing-hand master through **9Router**, model `cx/gpt-image-2.5-sunburst`, high quality, requested transparent 1536×1024 PNG. References were the supplied day cloud and painted coffee-cloud sticker. Original response, generation time, model, prompt path and reference hashes are preserved in `figures/raw/cursor/`; no runtime generation is used.

Run from `taxua-2026/`:

```sh
python3 scripts/prepare_cursor_artwork.py --preview /tmp/taxua-cursor-palettes.png
```

The helper verifies the master hash, extracts the largest alpha object in each half, removes low-opacity external glow/specks, trims and downsamples without upscaling. Each 32×32 PNG fits its silhouette within 28px and adds a 1px ivory keyline. Eight pigment maps preserve the watercolor texture and distinguish sky, night, predawn, dawn, morning, noon, afternoon and evening. The runtime folder is `figures/decor/painted/cursor/`; all sixteen PNGs total 30,222 bytes.

`data/sources/cursor-artwork.json` records the original generation, crop regions, palettes, measured hotspots, dimensions, bytes and SHA-256 hashes. The arrow hotspot is **3,2** and the hand fingertip is **10,2**, measured on solid painted alpha rather than the outer keyline. Keep these coordinates synchronized with `cursor.css` if the geometry changes. The supplied reference artwork and generated master remain untouched.

The optional contact sheet shows actual 32px artwork and 3× detail on light and dark surfaces. Browser screenshots omit OS cursors; the focused browser helper adds explicitly temporary artwork overlays to its hero screenshots. These previews show the PNGs and size, not a capture of the OS pointer. Check actual OS cursor appearance manually when reviewing on a physical device.
