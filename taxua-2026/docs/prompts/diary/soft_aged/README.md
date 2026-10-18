# Gently aged diary paper

The user requested regenerating the overly distressed paper with slightly
lighter color and gentler age. Three fresh masters were generated through
9Router using `cx/gpt-image-2.5-sunburst`; no private content was supplied.

| Master | Exact prompt | Material |
| --- | --- | --- |
| [Left leaf](../../../../figures/raw/diary/soft_aged/paper_left.png) | [Prompt](paper_left.md) | Soft outside-left rubbing, fine fibers and a subtle right binding crease |
| [Right leaf](../../../../figures/raw/diary/soft_aged/paper_right.png) | [Prompt](paper_right.md) | Matching stock, distinct fibers and a tiny top-right crease |
| [Inner cover](../../../../figures/raw/diary/soft_aged/endpaper.png) | [Prompt](endpaper.md) | Slightly deeper oatmeal lining, softly worn edges |

The materials are intact paper, with no torn chunks, peeling layers, foxing,
large stains or water rings. Each request is stored beside its original master
as `<name>_request.json`. Originals are 1024×1536; runtime WebPs are 800×1200,
opaque, without upscaling. Processing matches the leaf center medians to
RGB 229/210/178 and the lining to 214/189/149, preserving generated grain and
edge wear. The three new paper WebPs total 292,278 bytes. Existing warmed print
borders and tape are retained.

```sh
python3 scripts/prepare_diary_soft_paper.py
```

The preparation helper is offline and requires Pillow and NumPy. The
[manifest](../../../../data/sources/diary-soft-paper.json) records source,
request and derivative hashes. Earlier raw generations remain intact.
Semantic pages, frozen turning faces, dialogs and the opening-cover lining
use the current materials, with matching light-parchment fallback colors.
