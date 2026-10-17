# Generated diary materials · revision 2

[Redesign](../../../diary-redesign.md) · [Runtime materials](../../../diary.md#book-materials-and-motion)

Model: **`cx/gpt-image-2.5-sunburst`**, through the user's 9Router service.
Nine masters were generated using the earlier decorative cover as a style
reference. No traveler photos or private writing were sent to generation.
Each linked file contains the exact generation brief. The cover, cloth tabs
and prints deliberately contain no readable labels; labels remain live HTML.

| Prompt | Output purpose |
| --- | --- |
| [Front cover](front_cover.md) | Worn indigo linen, blank title area |
| [Back cover](back_cover.md) | Matching back-cover textile |
| [Endpapers](endpapers.md) | Two inside-cover skins |
| [Paper folios](paper_folios.md) | Three matched left/right aged-paper pairs |
| [Binding](binding.md) | Spine seam and page-edge stack |
| [Bookmarks](bookmarks.md) | Seven cloth ribbons |
| [Photo frames](photo_frames.md) | Landscape, portrait and square print borders |
| [Attachments](attachments.md) | Tape and photo corners |
| [Keepsakes](keepsakes.md) | Small fern, cloud and flowers |

Preserved originals and per-request metadata are in
`figures/raw/diary/revision_2/` from the site root. The
[material manifest](../../../../data/sources/diary-materials.json) records
source/derivative hashes, crops, alpha trimming, dimensions and photo openings.
Run `python3 scripts/prepare_diary_artwork.py` from the site root to reproduce
29 transparent WebPs plus `diary-materials.css`. It uses Pillow/NumPy and makes
no network calls. Check the originals' hashes before regenerating and inspect
the alpha edges against both pale paper and the mountain scenery afterward.

Bookmark derivatives retain the original ribbon resolution (201–204px wide),
without upscaling. Runtime tabs crop their length at natural proportions so
the fabric weave and stitching do not stretch when a tab is selected.
The crop follows the connected central cloth with a small antialias margin;
faint pieces of neighboring ribbons cannot shift the visible cloth off-center.
