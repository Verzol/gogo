# Local browser libraries

- GSAP / ScrollTrigger 3.15.0: optional native-scroll scenery enhancement. Version metadata is in `version.json`; license in `GSAP-STANDARD-LICENSE.txt`.
- Lucide 1.23.0: the UMD bundle reused from `../hue-2026/vendor/lucide-1.23.0.min.js`. ISC license in `LUCIDE-LICENSE.txt`.
  SHA-256: `55f43fd2b5553fdb2c1cb5a5940444f55c94a2fec8a72d678bd4a69350f72cd1`.

GSAP and ScrollTrigger load locally under HTTP and file://. Lucide is an asset-preparation source only: `node scripts/prepare_icons.cjs` serializes the 22 used official icon nodes into same-document SVG symbols in `index.html`. The website does not request the 402 KiB Lucide bundle. There is no package installation, runtime build or CDN requirement.
