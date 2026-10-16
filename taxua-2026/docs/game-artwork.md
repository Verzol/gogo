# Random-game artwork

[Documentation index](README.md) · [Visual identity](identity.md) · [Exact prompts](prompts/random_games/README.md)

Prepared on 16 October 2026 for coin flipping, dice rolling, standard playing-card draws, drawing sticks and a lottery bag. These are chance-based objects with no challenge or activity text. The existing wheel is retained. The website now integrates these objects in [Túi may mắn](games.md), alongside the original member wheel.

![All prepared game components](research/games_artwork_preview.webp)

## Art direction

Match the existing wheel rim and painted coffee sticker: watercolor/gouache pigment, deep-teal pencil outlines, cream cloud curls, layered jade mountains and restrained sunrise peach/orange. The accepted coin sheet supplies an additional collection reference. All six returned PNGs have genuine alpha transparency. Existing project assets used as references remain unchanged.

Generation used the user's requested 9Router workflow, model `cx/gpt-image-2.5`, high quality, `background: transparent`, PNG output. Five component sheets are complemented by a separate blank playing-card front. The original scenic card front is retained as an optional decorative alternate.

## File ownership

| Path | Purpose |
| --- | --- |
| `figures/raw/random_games/*.png` | Six complete generated masters, preserved byte-for-byte |
| `figures/raw/random_games/generation.json` | Request metadata, reference hashes, timestamps and original hashes |
| `figures/decor/painted/games/*.webp` | 22 prepared transparent cutouts |
| `data/sources/game-artwork.json` | Generated provenance, measured crops, painted bounds, sizes and output hashes |
| `scripts/prepare_game_artwork.py` | Reproducible extraction and optimization |
| `docs/prompts/random_games/` | Six exact prompts and their index |
| `docs/research/games_artwork_preview.webp` | Generated review contact sheet, not a runtime asset |

## Component inventory

| Game | Files under `figures/decor/painted/games/` |
| --- | --- |
| Coin | `coin_sun.webp`, `coin_cloud.webp`, `coin_edge.webp` |
| Dice | `dice_one.webp` through `dice_six.webp`, `dice_tray.webp` |
| Cards | `card_back.webp`, `card_front.webp`, `card_front_scenic.webp`, `card_deck.webp` |
| Drawing sticks | `stick_long.webp`, `stick_short.webp`, `stick_sleeve.webp` |
| Lottery bag | `bag_closed.webp`, `bag_open.webp`, `ball_cream.webp`, `ball_jade.webp`, `ball_peach.webp` |

## Integration notes

- Paired coin faces share 512x512 canvases with 480x480 painted faces. Dice and lottery tokens share 256x256 canvases with 224x224 painted faces. Thin coin edge artwork is a separate component.
- Card back, blank front and scenic alternate share 416x640 canvases and 384x608 painted dimensions. Use `card_front.webp` for playing-card ranks/suits and unrestricted pip layouts. The scenic alternate intentionally has artwork along the bottom.
- Keep ranks, suit symbols, drawn numbers and names as live interface content. None are baked into the blank cards or lottery tokens. Standard dice pips are painted and have been visually checked for counts one through six.
- The long/short sticks share a 128x800 canvas, 72px painted width and 16px top anchor. The short stick's bottom has additional transparency. Align their full canvases and conceal lower ends behind the opaque sleeve; independently trimming them would lose the length relationship.
- Bags have separate closed/open artwork on equal canvases. Keep cords and openings visible. Store the game state separately from these decorative images.
- Preserve image aspect ratios. The manifest's `paintedBounds` describes where each object sits inside its transparent canvas. Images used beside an equivalent text label should be decorative.
- The picker loads small illustrations lazily; game panels request their artwork when first opened. The contact sheet and original PNG sheets are review/preparation material.

## Reproduce and verify

Use Python with Pillow, NumPy and SciPy installed, then run from `taxua-2026/`:

```sh
python scripts/prepare_game_artwork.py
```

The helper verifies all six original hashes before processing. It uses measured crops, keeps the largest connected alpha component at alpha >= 8, trims transparent margins, adds transparent padding and exports WebP at quality 92. Coin faces, dice faces, card rectangles and lottery tokens receive small geometry normalization while downsampling so paired objects align. There is no upscaling or recoloring. The original files and exact generation record are never rewritten.

Re-running regenerates the cutouts, manifest and contact sheet. Encoded bytes can depend on Pillow/libwebp versions. For runtime checks of actual card labels, motion fallbacks and keyboard equivalents, see [Games](games.md) and [Verification](verification.md).

## Original preparation verification

All six masters match the returned generated PNGs byte-for-byte, and every existing reference-image hash is unchanged. All 22 WebPs passed dimension, transparent-margin, hash and no-upscaling checks; regenerating them reproduced identical bytes in the preparation environment. Combined WebP size is 1,231,974 bytes. The preparation script parses, 63 local documentation links resolve, and the whitespace check passed. The complete contact sheet and small-size samples on light/dark backgrounds were visually reviewed. That initial asset-only phase left production HTML, CSS, JavaScript and trip content unchanged. The subsequent game integration is documented separately in [Games](games.md).
