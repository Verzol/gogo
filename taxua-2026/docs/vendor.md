# Local browser libraries

[Documentation index](README.md) · [Identity and icons](identity.md)

- GSAP / ScrollTrigger 3.15.0: optional native-scroll scenery enhancement. Version metadata is in [vendor/version.json](../vendor/version.json); license in [GSAP Standard License](../vendor/GSAP-STANDARD-LICENSE.txt).
- Lucide 1.23.0: the UMD bundle reused from the sibling Hue site, retained at `vendor/lucide-1.23.0.min.js`. ISC license in [Lucide ISC license](../vendor/LUCIDE-LICENSE.txt).
  SHA-256: `55f43fd2b5553fdb2c1cb5a5940444f55c94a2fec8a72d678bd4a69350f72cd1`.
- Leaflet 1.9.4: official distribution under `vendor/leaflet/`, loaded on demand by the optional atlas. [BSD license](../vendor/leaflet/LICENSE.txt) and [version/source/checksums](../vendor/leaflet/version.json). Online raster tiles are a separate optional service; see [Maps](maps.md).

GSAP and ScrollTrigger load locally under HTTP and file://. Lucide is an asset-preparation source only: `node scripts/prepare_icons.cjs` (run from `taxua-2026/`) serializes the 56 used official icon nodes into same-document SVG symbols in `index.html`. The website does not request the 402 KiB Lucide bundle. There is no package installation, runtime build or CDN library requirement. Direct-file map use keeps the local place-list fallback rather than fetching web tiles.
