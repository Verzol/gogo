# Click-to-flip photographs

[Documentation index](README.md) · [Story content](story.md) · [Motion](motion.md)

## Design and behavior

Main story photographs secretly turn over when clicked or tapped. They have no visible turn label, icon, hint or extra action row. Clicking the back restores the photograph. The front preserves its original crop, frame and sizing; the reverse uses restrained cream paper, dark ink and existing grain. This retains the watercolor journal direction established with the design-taste-frontend skill in preserve mode (8/6/4).

The reverse shows the real place name, explicitly scheduled date/time, existing story cue and asset credit. These dates describe the itinerary, never a claimed capture date or visit record. No invented messages or memories are added. Illustrative captions remain below the photograph on both sides and are outside its clickable area. The small arrival photograph and homestay room collage retain their original presentation. Deck navigation starts the incoming photograph on its front; temporary transition clones omit IDs.

The three two-photo decks also expose a small part of the other real print. Its separate native button selects that image and transfers focus to the full-size photograph. The previous/next buttons remain. Selecting an image never flips it, and no visible flip instructions were added. See [Illustrated journal controls](ui-artwork.md).

Place guides are restored to their original expanded presentation, with all 18 guides and sources present once. Ribbon bookmarks and their controls, opening card, event handlers and storage integration have been removed. The former bookmark key is no longer read or written; packing and demo storage remain independent.

## Accessibility and fallbacks

The photograph is a native button, with a nonvisible accessible name and pressed state. Space/Enter turn either face without moving keyboard focus. The name includes the image description on the front and the complete visible text when reversed, followed by the return action. The inactive reverse is inert and hidden from assistive technology. Arrow Up/Down and Page Up/Down scroll a long back while it is open. A focus outline appears for keyboard navigation; there is no hover tooltip.

Reduced motion and the existing decorative-motion pause disable turning transitions. There are no extra scroll listeners, automatic turns or runtime dependencies. Print shows photograph fronts and all expanded guides, with no turn control. Classic scripts retain direct-file and missing-GSAP fallbacks. Native anchors, the standalone reading copy, canonical data and assets stay intact.

## Owners and validation

- `main.js`: photograph markup, `setPhotoSide`, `initScrapbook`.
- `style.css`: paper tokens, rotating faces, phone/reduced-motion/print variants.
- `motion.js`: independent outer reveals and ID-free deck transition clones.
- `scripts/verify_journal_objects.cjs`: focused interaction and rollback verification. See [verification commands](verification.md).

The focused helper checks desktop/phone layouts, actual image clicks and reverse-text clicks, touch taps, keyboard turning, fast repeated toggles, deck navigation, captions, source fidelity, removed UI, enlarged text with scrolling, print and optional-dependency fallbacks. Evidence defaults to `/tmp/taxua-photo-review/`, outside the checkout. Browser evidence does not establish physical-device or cross-browser behavior.

## Earlier photo-only verification · 16 October 2026

515 browser assertions passed: revised photo interactions 50, existing story 56, mobile UI 108 and full journey 301. Desktop, 390px and 320px screenshots were reviewed, including both faces and an enlarged-text reverse. Targeted axe checks on the photo button's front and back at desktop/phone widths found no button-name, visible-label-name or hidden-focus violations. These targeted results do not establish whole-site WCAG conformance.

Focused screenshots, PDF and JSON reports are in `/tmp/taxua-photo-review/`. Existing-suite evidence is under `/tmp/taxua-photo-regression/`. JavaScript syntax, local links in the five changed guides and `git diff --check` passed. Canonical trip data, generated asset metadata and the standalone itinerary remain unchanged. Earlier folded-guide/bookmark verification numbers and Lighthouse reports describe the superseded implementation and are not current-revision results.
