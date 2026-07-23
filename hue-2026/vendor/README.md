# Vetted browser assets

- `lucide-1.23.0.min.js` is the UMD bundle from `lucide@1.23.0`.
  SHA-256: `55f43fd2b5553fdb2c1cb5a5940444f55c94a2fec8a72d678bd4a69350f72cd1`.
- `fonts/` contains the exact Google Fonts assets that were previously loaded
  at runtime. They are served from the site's own origin now.

Do not replace either file with a floating CDN URL. Update the version and hash
together in a reviewed dependency update.
