# Diary book redesign · 17 October 2026

[Diary guide](diary.md) · [Original plan](diary-plan.md) · [Review evidence](diary-review.md) · [Artwork prompts](prompts/diary/revision_2/README.md)

This records the approved redesign of the first diary implementation. The
original account, private-draft, publication and server-ownership contract stays
in [operations](diary-backend.md). The redesign concerns the physical book,
material artwork, handwriting and the complete reader/editor experience.

## Accepted design

1. Keep one book object through opening and closing. Measure the real closed
   cover and final paper; move/scale that object while its front cover rotates
   around the binding. Keep geometry continuous at both endpoints, reserve
   stage height during measurement, and fade the nearby margin note.
2. Bend a moving leaf in 16 strips (ten for one visible phone leaf), with
   separate front/reverse faces, per-face shading and a cast shadow. The front
   keeps the outgoing page; the reverse contains the incoming landing page,
   with its companion underneath the lifting front. Reveal the destination
   through the turn without mirrored/repeated outgoing content or an endpoint
   content swap. Update the semantic selection, bookmark and page announcement together
   after completion.
3. Replace procedural placeholder surfaces with generated indigo linen, aged
   ivory paper, binding/page edges, seven fabric bookmarks, photograph frames,
   tape/corners and a few keepsakes. Put live text and actual uploaded photos
   over the materials; retain the existing mountain-watercolor surroundings.
4. Use locally hosted Mali for prose/captions, Dancing Script for names and
   titles, and Be Vietnam Pro for controls. Preserve Vietnamese, decomposed
   accents, shaping tables and font licenses.
5. Keep normal phone leaves a stable readable size, with writing/photo switches
   and complete reading/album sheets. Enlarged text uses natural height. Test
   long titles, 8,000-character writing, twelve photos, long captions, failure
   recovery, editing, publication, session rejection and missing enhancements.
6. Verify opening/turn frames at 0/25/50/75/99 percent and after landing in
   Chromium/WebKit. Inspect real-time and slowed recordings. Real upload and
   permission testing must use isolated backend resources, with all QA users
   and media removed afterward.
7. Use the existing crew stickers on cloth bookmarks, with accessible names
   and contained text fallbacks. Allow paper-edge taps and controlled horizontal
   drags; return short/cancelled drags to the original spread. Preserve vertical
   scrolling, text selection and photo/edit controls. Keep blank paper and
   photo frames free of empty-state invitation copy.

## Material production

Nine `cx/gpt-image-2.5-sunburst` master generations produce 29 runtime layers.

| Master | Derived layers |
| --- | --- |
| Front cover / back cover | 2 worn indigo cloth covers |
| Endpapers | 2 inside-cover skins |
| Paper folios | 6 left/right paper skins, three pairs |
| Binding | Binding strip and page-edge stack |
| Bookmarks | 7 cloth ribbons with crew portrait stickers and accessible HTML names |
| Photo frames | Landscape, portrait and square; measured transparent openings |
| Attachments | Ochre/linen tape and tan/cream corners |
| Keepsakes | Fern, cloud scrap and flowers |

Original PNGs and per-generation metadata stay in
`figures/raw/diary/revision_2/`. The 29 WebPs total 2,289,164 bytes after
retaining the ribbon masters' native resolution for sharper bookmark tabs.
`prepare_diary_artwork.py` records chroma-key/crop/trim/hash data and emits
`diary-materials.css` from each frame's measured transparent opening. Runtime
never performs image generation or reads the raw masters. Private crew media
was never used as generation input.

## Runtime boundary

- `diary.js` owns selection, authentication UI, semantic reading and editing.
  It prepares a hidden, inert destination spread before starting, and holds the
  outgoing semantic selection during motion. The prepared nodes become the
  reader on landing, preserving decoded photos. A cancel on expiry/logout
  removes staging and never commits an incoming selection.
- `diary-motion.js` owns decorative geometry only. Its copies are inert,
  aria-hidden and free of duplicate IDs. Editor forms are never cloned.
- `diary-motion.css` supplies generated material skins, diary-only handwriting,
  layered 3D rules and responsive polish. Grouping opacity/filter effects stay
  off the 3D ancestors. The stationary reading pages form a separate paint
  context, so their footers cannot bleed through the turning sheet.
- The motion helper checks outgoing fronts and incoming reverses separately,
  samples both directions before landing, and inspects screenshot pixels from
  asymmetric red-left/blue-right photos. Repeating the outgoing page on the
  reverse fails even when DOM snapshots and transforms appear valid.
- The enhancement prepares local textures/fonts and target thumbnails with a
  bounded wait. Missing artwork/engine/CSS and reduced-motion modes retain
  authenticated semantic reading and whole-person navigation.
- Resize, motion pause, hidden tabs and pagehide settle the active action once.
  Server session rejection removes private pages and decorative copies.

No library, framework, build step, sound, auto-advance or scroll controller was
added. The existing Supabase diary function and real crew registry were not
changed for this redesign. Tests use browser-only fixtures or a separate,
temporary QA schema/function/bucket in the existing project. See the review
for exact results and cleanup evidence.
