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
