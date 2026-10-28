"""Synthetic color charts only; no trip photos. Requires Pillow + pillow-heif.

Run in a temporary venv to regenerate scripts/fixtures/diary_heic/.
Fixtures exercise resizing, missing MIME types, portrait orientation and the
primary image in a collection. Decoded JPEGs must not retain the EXIF Artist.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import pillow_heif

pillow_heif.register_heif_opener()
output = Path(__file__).parent / 'fixtures' / 'diary_heic'
output.mkdir(parents=True, exist_ok=True)
image = Image.new('RGB', (2400, 1600))
draw = ImageDraw.Draw(image)
for box, color in [((0, 0, 1199, 799), 'red'), ((1200, 0, 2399, 799), 'green'),
                   ((0, 800, 1199, 1599), 'blue'), ((1200, 800, 2399, 1599), 'yellow')]:
    draw.rectangle(box, fill=color)
exif = Image.Exif()
exif[315] = 'heic-upload-fixture'
image.save(output / 'landscape.heic', quality=85, exif=exif)
image.resize((96, 64)).save(output / 'small.heic', quality=90)
image.rotate(90, expand=True).resize((64, 96)).save(output / 'portrait.heic', quality=90)
image.resize((96, 64)).save(output / 'collection.heif', save_all=True,
                          append_images=[Image.new('RGB', (64, 96), 'magenta')],
                          primary_index=1, quality=90)
