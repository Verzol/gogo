# Random-game artwork prompts

[Documentation index](../../README.md) · [Artwork guide](../../game-artwork.md) · [Contact sheet](../../research/games_artwork_preview.webp)

Exact prompts used with 9Router's `cx/gpt-image-2.5`, high quality, PNG output and transparent background. The wheel rim and coffee sticker are the original style references. Later requests also reference the accepted coin sheet; the blank card request additionally references the card sheet. Per-request timestamps, requested dimensions, reference hashes and returned master hashes are preserved in [generation.json](../../../figures/raw/random_games/generation.json).

| Prompt | Generated components |
| --- | --- |
| [Coin](01_coin.md) | Sun face, cloud face and edge |
| [Dice](02_dice.md) | Six correctly counted faces and empty cloth tray |
| [Playing cards](03_cards.md) | Mountain back, scenic front and deck stack |
| [Drawing sticks](04_sticks.md) | Long stick, short stick and opaque sleeve |
| [Lottery bag](05_bag.md) | Closed/open bag and three blank colored tokens |
| [Blank card front](06_blank_card.md) | Fully blank face for functional ranks and suits |

All outputs were visually reviewed against the existing watercolor wheel. Crop coordinates follow the actual returned images, which differ from the requested component positions. Generated originals are preserved byte-for-byte; never replace them when regenerating derivatives.

These prompts document the original artwork phase. The subsequent runtime integration and game rules are described in [Games](../../games.md).

## Complete illustrated playing-card deck

The later [court reference](07_card_courts.md) and all eight full-face deck sheets use **`cx/gpt-image-2.5-sunburst`**, high quality with transparent PNG output. The court sheet is a shared style reference; the runtime deck contains a distinct generated front for every one of the 52 rank/suit combinations, including aces and number cards. Exact requests:

| Suit | A–8 | 9–K |
| --- | --- | --- |
| Spades | [Sheet 1](deck/spades_1.md) | [Sheet 2](deck/spades_2.md) |
| Hearts | [Sheet 1](deck/hearts_1.md) | [Sheet 2](deck/hearts_2.md) |
| Clubs | [Sheet 1](deck/clubs_1.md) | [Sheet 2](deck/clubs_2.md) |
| Diamonds | [Sheet 1](deck/diamonds_1.md) | [Sheet 2](deck/diamonds_2.md) |

Original sheets and per-request metadata are in `figures/raw/playing_cards/`; the shared reference is in `figures/raw/card_courts/`. See [the artwork guide](../../game-artwork.md) for preparation, file ownership and verification.

The [individual eight of diamonds](deck/diamonds_eight.md) corrects a nine-pip miscount in the original diamonds sheet. Both originals are preserved; the preparation manifest selects the corrected image. The preparation script also checks the central pip counts of all 40 ace/number faces.
