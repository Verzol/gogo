# Aged diary materials

Three new masters generated through 9Router with `cx/gpt-image-2.5-sunburst`.
Only descriptive material prompts were supplied; no private media or writing.

| Master | Exact prompt | Purpose |
| --- | --- | --- |
| [Left paper](../../../../figures/raw/diary/aged/paper_left.png) | [Left-leaf prompt](paper_left.md) | Frayed outer-left edge, short tears, upper-left tide mark and right binding crease |
| [Right paper](../../../../figures/raw/diary/aged/paper_right.png) | [Right-leaf prompt](paper_right.md) | Distinct outer-right wear, lower-right crease and left binding fibers |
| [Inner lining](../../../../figures/raw/diary/aged/endpaper.png) | [Inner-cover prompt](endpaper.md) | Deeper tan laid stock on the reverse of the opening cover |

Each exact request is stored beside its master as `<name>_request.json`.
All are portrait 1024×1536 PNGs. The left master includes an alpha channel;
processing uses its RGB texture as an opaque paper surface. Source files stay
unchanged. The pipeline bounds paper to 800×1200, matches left/right center
medians to RGB 217/191/151, matches the inner lining to 199/170/126 and adds a
narrow spine shadow. This reduces the provider's orange bias while preserving
its grain, foxing, creases and small edge tears. No mirrored text or frame art
is generated into the materials.

Three additional derivatives warm the existing generated print borders without
changing any alpha, dimensions or photo opening. Six WebPs total 545,710 bytes.
The original and preceding quiet treatments remain available as source history.

Rebuild after the original and quiet preparation helpers:

```sh
python3 scripts/prepare_diary_aged.py
```

The helper is offline and requires Pillow and NumPy. The
[manifest](../../../../data/sources/diary-aged.json) records source/request/output
hashes and processing. Runtime uses the same left/right images on semantic
pages and frozen turning faces, plus the new lining for the opening hinge.
