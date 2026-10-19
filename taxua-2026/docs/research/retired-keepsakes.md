# Retired playful keepsakes

**Removed on 19 October 2026 at the user’s request.** This is an archived implementation record, not current feature documentation. The postcard studio, cloud reveal and companion lake/tree reactions have been rolled back. Retained artwork and generation records are historical sources only.


[Documentation index](../README.md) · [Painted objects](../playful.md)

Two optional buttons beside **Check-in trên mây** open native modal dialogs. `keepsakes.js` and `keepsakes.css` own these additions; the trip content, section order, chance games and private diary remain independent.

## Bàn dán kỷ niệm

Compose a postcard with up to 18 stickers chosen from the existing cloud, fund pig, Shan tea, mountain and seven scarf portraits. Tap a sticker to select it; drag locally to place it, or use the native horizontal/vertical/size/rotation sliders. The sliders provide both keyboard and single-pointer alternatives to dragging. Escape during a gesture restores its starting position; otherwise Escape closes the dialog. Closing returns focus to the opener. The local reset clears only this postcard.

The caption accepts 64 characters. Drafts use `taxua-2026-postcard-v1` in local storage, with validated bounded values on restoration. Nothing is sent to the diary, other travelers or an external service. Denied storage reports a message while editing/export remain available. PNG export captures the current composition into a 1200 × 800 canvas, waits for local images/fonts, and reports failures without discarding the draft. PNG downloads are user-triggered and include only the generated backdrop, selected public artwork, caption and trip signature.

The blank mountain paper was generated with the requested **9Router `cx/gpt-image-2.5-sunburst`**. [Exact prompt](../prompts/keepsakes/postcard.md), [preserved master](../../figures/raw/keepsakes/postcard.png), and [request/hash provenance](../../figures/raw/keepsakes/generation.json) are retained. The runtime derivative is `figures/decor/painted/playful/postcard.webp`, downsampled to 1200 × 800, without upscaling. Existing stickers and the actual logo are preserved.

## Vén mây ngắm núi

A small destination-photo vignette reuses the original P01 ridge photograph and its catalog credit, with two existing painted clouds. The native slider directly parts the clouds; the button toggles completely open/closed, including on touch screens. The link leads to the existing ridge story. This is a visual discovery, never a visit record, current weather report or newly generated destination photograph. No automatic motion or persistent reveal state is added.

## Fallbacks and checks

Both entry buttons stay hidden without the optional script/native dialog support. Public content remains readable. The workspace works over HTTP and direct-file use; optional storage failures do not prevent editing. Print hides it. Native modal semantics contain keyboard focus; illustrations have separate text controls. Interactions add no ambient motion, and the cloud slider follows the user's input directly under reduced motion or decorative pause.

Run `node scripts/verify_keepsakes.cjs` against the repository-root preview on port 8000. Reports, exported PNGs and desktop/390px/320px screenshots default to `/tmp/taxua-keepsakes-review/`, or `TRIP_REVIEW_DIR`. The helper covers real pointer drags, Escape cancellation, keyboard positioning, image decoding, PNG download dimensions, local draft restoration, removal, focus return, cloud reveal, credit, print and denied storage over `file://`. It makes no backend writes.

## Verification · 19 October 2026

Passed **62 keepsake/scenery checks**, **127 existing playful-object checks**, and **108 mobile UI checks** in Chromium (297 total). The new checks exercise actual desktop/touch lake activation, keyboard tree sway, pause/static feedback and Escape cleanup, in addition to the workspace coverage above. Reviewed desktop, 390px and 320px workspace screenshots, exported PNGs, cloud-reveal states and phone lake reactions. JavaScript syntax, changed documentation links, artwork hashes and `git diff --check` passed. Evidence is under `/tmp/taxua-keepsakes-review/`, `/tmp/taxua-playful-review/`, and `/tmp/taxua-mobile-ui-review/`. These focused checks do not establish full-suite, physical-device, Safari or Firefox coverage.
