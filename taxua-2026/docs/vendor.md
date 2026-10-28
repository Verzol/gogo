# Local browser libraries

[Documentation index](README.md) · [Identity and icons](identity.md)

- GSAP / ScrollTrigger 3.15.0: optional native-scroll scenery enhancement. Version metadata is in [vendor/version.json](../vendor/version.json); license in [GSAP Standard License](../vendor/GSAP-STANDARD-LICENSE.txt).
- Lucide 1.23.0: the UMD bundle reused from the sibling Hue site, retained at `vendor/lucide-1.23.0.min.js`. ISC license in [Lucide ISC license](../vendor/LUCIDE-LICENSE.txt).
  SHA-256: `55f43fd2b5553fdb2c1cb5a5940444f55c94a2fec8a72d678bd4a69350f72cd1`.
- Leaflet 1.9.4: official distribution under `vendor/leaflet/`, loaded on demand by the optional atlas. [BSD license](../vendor/leaflet/LICENSE.txt) and [version/source/checksums](../vendor/leaflet/version.json). Online raster tiles are a separate optional service; see [Maps](maps.md).

GSAP and ScrollTrigger load locally under HTTP and file://. Lucide is an asset-preparation source only: `node scripts/prepare_icons.cjs` (run from `taxua-2026/`) serializes the 56 used official icon nodes into same-document SVG symbols in `index.html`. The website does not request the 402 KiB Lucide bundle. There is no package installation, runtime build or CDN library requirement. Direct-file map use keeps the local place-list fallback rather than fetching web tiles.

## Optional HEIC decoder

The diary uses **libheif 1.23.7**, compiled with **libde265 1.0.16**, from
**heic-to 1.6.7** (commit `78345a3fcdb4a1d70d513fce2646aeff0127f7ba`).
The CSP build at `vendor/heif/libheif.js` is loaded only inside
`diary-heic-worker.js`, after native browser decoding fails for a HEIC/HEIF file.
It is not part of the initial page download and contacts no conversion service.
The decoder is 3.4 MB uncompressed; it uses compiled JavaScript, with no WASM
sidecar, runtime npm dependency or `unsafe-eval` requirement. Each conversion
worker is terminated after completion, failure, timeout or editor/session exit.

The only upstream adaptation is removing the final `export default buildLibheif`
so the existing classic-script site can load it with `importScripts`; an
attribution header marks this change. Generated codec code is unchanged.
[Version, provenance and SHA-256 hashes](../vendor/heif/version.json) identify the
exact original/adapted files. Sources: [pinned upstream and build references](sources.md#heic-upload-decoder).

The decoder and its use are covered by **LGPL-3.0-or-later**. Keep the
[LGPL](../vendor/heif/LGPL-3.0.txt), [GPL](../vendor/heif/GPL-3.0.txt),
[libheif notice](../vendor/heif/LIBHEIF-COPYING.txt) and
[libde265 notice](../vendor/heif/LIBDE265-COPYING.txt) beside it. Corresponding
library sources and build scripts are distributed in
[libheif source](../vendor/heif/source/libheif-1.23.7.tar.gz) and
[libde265 source](../vendor/heif/source/libde265-1.0.16.tar.gz).
The application/worker sources remain separate and unbundled; compatible
replacement decoder builds can use the same `buildLibheif` API. Modification
and reverse engineering of the library for debugging are not restricted.

To rebuild a compatible decoder, follow the pinned upstream instructions with
Emscripten and the libheif archive's `build-emscripten.sh`:

```sh
LIBDE265_VERSION=1.0.16 USE_UNSAFE_EVAL=0 USE_WASM=0 ../build-emscripten.sh ..
```

Use the matching libde265 release when building (a source checkout may first
need its autotools bootstrap). Replace only the generated library's final ESM
export with a classic global binding, preserve notices and update the checksums.
The codec toolchain is not needed to run or serve this static site.
