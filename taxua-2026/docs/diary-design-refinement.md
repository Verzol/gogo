# Diary visual refinement, 18 October 2026

[Diary](diary.md) · [Original design](diary-redesign.md) · [Verification](verification.md)

## Design read and audit

A preservation redesign for seven friends: a Vietnamese watercolor travel
scrapbook, with a tangible indigo cloth book and personal handwritten pages.
Native HTML/CSS and the existing independent book-motion engine remain the
foundation. No framework, design-system dependency, icon family or font service
was introduced.

The starting design used indigo linen, warm mottled paper, sepia ink,
Mali/Dancing Script and Be Vietnam Pro, irregular print frames and seven colorful
portrait ribbons. Its main weaknesses were noisy paper/print borders, light
headings over bright scenery, a large repeated introduction above the open
reader, separated tool rows and weak placeholder/focus contrast.

Keep the crew anchor/order, original cover and portraits, private accounts,
owner-only edit controls, nine-photo cap, all count layouts, popup navigation,
page gestures, real hinged opening and outgoing/incoming leaf geometry. Keep
existing public metadata, navigation, consent text and unrelated sections.

Dials: **DESIGN_VARIANCE 7 / MOTION_INTENSITY 6 / VISUAL_DENSITY 4**.
The closed composition centers one book; open pages use disciplined alignment.
Existing motivated opening/turn motion supplies the motion level. There are no
extra parallax, tilt, floating loops or scroll effects.

## Initial refinement composition and materials

- The closed view contains one centered indigo book. The duplicated paper
  invitation was removed after visual feedback. Loading and error messages
  appear as small text over the scenery, without an opaque panel.
- The open book has a compact title and icon tools. On phones its face selector
  shares the toolbar row. Portrait ribbons meet the book directly in both
  layouts, including when hovered or selected.
- A new Sunburst master supplies calmer ivory paper. Five lighter print/tape
  derivatives retain the original art, transparency, dimensions and photo
  opening coordinates. One-photo pages use a portrait print frame.
- Dark forest ink replaces the muddy sepia treatment. Vietnamese handwriting,
  page geometry and content sizes remain readable; helper text and placeholders
  are darker and focus outlines on paper use forest ink.
- Login/editor/popup surfaces use the same paper and field/button treatment.
  The print viewer gets a quiet mat, with complete captions below the image.
  Draft, publication, upload and account behavior is unchanged.

The warm paper is justified by the actual vintage-book brief, not a generic
site palette. It remains a light physical object in the existing watercolor
world under both browser color schemes. Forest is the functional accent; the
previously approved member ribbon colors remain identifying artwork.
Paper/print corners are 3px, fields and text buttons 4px, and icon tools round.
Stacking roles remain paper 0, binding 2 and edge controls 3; existing motion
layers are 5/10/11/12. No new stacking context or filtering was added to the
3D ancestors.

[Exact generation prompt](prompts/diary/refinement/paper.md),
[source and derivative manifest](../data/sources/diary-refinement.json),
[offline preparation](../scripts/prepare_diary_refinement.py).
One new master, seven runtime derivatives, **164,672 bytes** combined. Originals
are preserved; the image service received no private crew content.
The materials they replace totalled 288,796 bytes; motion prepares the new
derivatives instead of downloading both treatments.

## Gentler paper regeneration

The previous treatment was too distressed. Three fresh Sunburst generations
now provide lighter oatmeal parchment, fine fibers, gently rubbed edges and
tiny corner creases, with no large tears, peeling layers, foxing or water marks.
The center tone is RGB 229/210/178 (previously 217/191/151); the new lining is
214/189/149. Generated masters and earlier variants are preserved separately.
This supersedes the heavily aged material described below. Warmed print frames,
fonts and motion geometry remain unchanged. Semantic pages, frozen turn faces,
opening lining and dialogs share current textures and matching fallback colors.

[Prompts and rebuild guide](prompts/diary/soft_aged/README.md) ·
[Source/derivative manifest](../data/sources/diary-soft-paper.json).
The three optimized paper assets total 292,278 bytes. Material contrast sampled
with the same content-inset/first-percentile method improved to at least 7.16:1
for body ink, 6.54:1 for helpers, 6.49:1 for actions and 6.67:1 for error text.

Fresh verification passed **101 Chromium motion checks**, including cover
opening/closing, escaped-paper probes, upright incoming content and phone
turns. Desktop/tablet/phone reader, photo and editor screenshots were inspected
at 1440/820/390/320px. Paper source/request/output hashes match; script syntax,
whitespace and local documentation links were checked. Evidence is in
`/tmp/taxua-diary-soft/`. Browser-local fixtures were used; no live writes.

An initial pixel comparison again sampled moving scenery. The helper now pauses
running WAAPI animations outside the diary only while capturing its before/after
pair, then restores them in `finally`. Book clocks, samples and thresholds are
unchanged. The complete motion suite passed after this fixture correction;
there was no product geometry change.

## Aged-paper follow-up

The user requested darker, older paper after the pale-ivory refinement. Three
new `cx/gpt-image-2.5-sunburst` masters through 9Router now supply distinct left
and right leaves and a deeper tan inner-cover lining. Generated wear includes
fine edge tears, frayed fibers, foxing, tide marks and softened creases, with
strong marks kept near the margins. An offline color match reduces orange bias
and aligns the left/right stock without removing generated texture. Three warmed
print-frame derivatives keep all photo openings and alpha intact. Current
materials supersede the ivory paper described above; original files remain.

The animated leaf copies exactly the same aged material as its semantic page.
Its two faces remain separate and upright. The opening reverse uses the new
lining, with tan backing colors replacing white/ivory flashes if an image fails.
No geometry, account, upload or publication behavior changed. Helper, action
and error colors were darkened to suit the aged stock. See the
[prompts/rebuild guide](prompts/diary/aged/README.md) and
[manifest](../data/sources/diary-aged.json).

Current verification passed **195 Chromium checks**: motion 101, layout and
fallbacks 45, design/accessibility 49. The design audit covers light/dark browser
preferences at 1440/390/320px; screenshot review also includes 820px. No uncaught
browser errors or scoped axe WCAG A/AA violations occurred. Paper-background
contrast was sampled separately because axe cannot fully assess image textures:
using first-percentile luminance within the content inset, minimum body contrast
was 5.10:1, helper 4.66:1, action 4.62:1 and error 4.76:1. These are sampled material
checks, not a pixel-by-pixel guarantee over every stain. The darker inner-cover
lining carries no settled text. Source/output hashes match, and all three print
frames retain their source dimensions and alpha exactly.

One initial motion run failed the before/after pixel comparison left of the
spine at opening 45%; the isolated rerun passed all 101 checks without a geometry
change. At that review the comparison could include live WAAPI cloud movement: the
helper paused GSAP, while surrounding clouds had an independent clock. Both runs had no
uncaught browser errors. Opening/turning frames and desktop/phone reader/editor
screenshots were visually inspected. Evidence is in `/tmp/taxua-diary-aged/`.
Only browser-local fixture accounts and public sample photos were used; no live
crew data, backend changes or production writes. No new Lighthouse, WebKit or
physical-device results are claimed for this material update.

## Single-cover correction

After visual feedback, the separate invitation note and its responsive styles
were removed. The closed view centers the original book at desktop, tablet and
phone widths; a hidden heading preserves the article name. Loading and error
messages have no background or padding and use small ivory text with a dark
text shadow over the scenery. Authentication and status announcements remain.

Fresh verification for this correction passed **101 Chromium motion checks**
and **45 focused composition/status checks**, using browser-local fixtures.
The focused checks cover 1440/820/390/320px, one centered cover, the accessible
article name, delayed loading, visible connection errors, transparent status
styling and return to the closed cover. No uncaught browser errors occurred.
Desktop and phone screenshots were inspected. Evidence is in
`/tmp/taxua-diary-single-cover/`; no live accounts or production writes were used.
The broader results below belong to the preceding redesign review.

## Pre-flight and evidence

The five existing Chromium helpers passed **474 checks**: reader/editor 80,
photo layouts 200, long-content/fallbacks 45, navigation/bookmarks 48 and motion
101. They exercise every count 0-9 at 1440/820/390/320px, all-photo targets,
owner edits, uploads/publication, complete captions, keyboard arrows, drag/swipe,
Vietnamese shaping, enlarged text, missing resources and session cleanup.
Painted-pixel checks verify cover faces, absence of escaped paper, upright
incoming photographs and atomic landing. An earlier two-object composition caused the mobile
cover to close below the viewport; this was fixed before the original review. No crew accounts or live writes were used.

A separate **49-check** design/accessibility audit inspected closed, login,
reader, photo popup and editor surfaces at 1440/390/320px with both light and
dark browser preferences. Axe reported no WCAG A/AA violations. Image-backed
contrast checks require manual verification: actual paper luminance was sampled
at its first percentile. The resulting contrast ratios were 7.23:1 for body
ink, 4.95:1 for helper text, 4.64:1 for placeholders and 5.79:1 for forest accent;
primary buttons measured 7.69:1 and toolbar icons 10.09:1. Disabled controls are
excluded. Native keyboard focus and one-line authentication actions were checked.
The focusable writing area now has an explicit named region role.

Desktop/phone closed, populated reading, photo and editor screenshots were
visually inspected. No new visible em/en dashes, decorative eyebrows, generated
labels, duplicate actions, made-up statistics or empty invitation text were
added. No original crew writing or photo captions were changed. The image
fallback/error copy stays live and empty pages keep quiet frames/ruled paper.
Reduced motion, the pause control, missing motion resources and enlarged-text
fallbacks retain semantic navigation. This change makes no WebKit, physical
phone, INP or production-performance claim.

Whole-page Lighthouse 13.5 was run separately from the interaction helpers,
using a read-only `HEAD` snapshot for comparison. Accessibility stayed 97 and
best practices 96 in both versions. Desktop performance was 23 before and 21
after (LCP 10.7/11.6s; CLS .179 in both). Mobile performance varied: baseline
44-48 and final current 44 (LCP 12.8s; CLS .006). Earlier current runs reported
CLS 1.006; trace inspection also found the full-main startup displacement with
`had_recent_input=true`, excluded from the final score. The deep-anchor startup
is timing-sensitive, so these numbers do not establish stable CWV or a speed
improvement. Both versions miss the overall loading targets. Whole-site hero,
weather/scenery loading and startup/scroll restoration need separate profiling;
no unrelated page behavior was changed to improve this task's score.

Evidence is in `/tmp/taxua-diary-design/`, including `audit.json` and the
five helpers' reports. The temporary capture/gallery uses only public sample
place images and mocked private transport.
