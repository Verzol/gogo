# Vetted browser assets

- `lucide-1.23.0.min.js` is the UMD bundle from `lucide@1.23.0`.
  SHA-256: `55f43fd2b5553fdb2c1cb5a5940444f55c94a2fec8a72d678bd4a69350f72cd1`.
- `supabase-2.110.8.js` is the UMD bundle from
  `@supabase/supabase-js@2.110.8`, used only for read-only Realtime channels.
  SHA-256: `913f94db33b394a97d34c058347009053ac2d9534459c0990eb08594a108d2ee`.
- `fonts/` contains the exact Google Fonts assets that were previously loaded
  at runtime. They are served from the site's own origin now.

Do not replace these files with a floating CDN URL. Update the version and hash
together in a reviewed dependency update.
