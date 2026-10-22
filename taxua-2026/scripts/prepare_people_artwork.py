"""Preserve supplied portraits and prepare complete, transparent scarf stickers.

Run with Python + Pillow. Member mapping is explicit; masters are never replaced.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MEMBERS = {'san': 'san', 'thao': 'thảo', 'mi': 'mi', 'linh': 'linh',
           'quanlele': 'quanlele', 'gtm': 'gtm', 'truong': 'trường', 'tamle': 'tamle'}


def main():
  raw = ROOT / 'figures/raw'
  masters = raw / 'people'
  output = ROOT / 'figures/people'
  # Validate all input destinations before moving any uploads.
  for slug in MEMBERS:
    upload, master = raw / (slug + '.png'), masters / (slug + '.png')
    if slug == 'tamle' and (upload.exists() or upload.is_symlink()):
      raise ValueError('Never import tamle\'s identity photo; use figures/raw/people/tamle.png')
    if upload.is_symlink() or master.is_symlink():
      raise ValueError(f'Expected regular portrait files: {slug}')
    if upload.exists() and master.exists():
      raise FileExistsError(f'Refusing to replace master: {master}')
    if not upload.exists() and not master.exists():
      raise FileNotFoundError(f'Missing portrait: {slug}')
  masters.mkdir(parents=True, exist_ok=True)
  output.mkdir(parents=True, exist_ok=True)
  manifest = {'processing': 'Alpha below 8 cleared; trim at alpha >= 24 with 8px margin; '
              'downscale into a 512px transparent canvas with 20px padding; '
              'no upscaling, recoloring or face retouching.', 'portraits': {}}
  for slug, member in MEMBERS.items():
    upload, master = raw / (slug + '.png'), masters / (slug + '.png')
    if upload.exists():
      upload.rename(master)
    with Image.open(master) as original:
      image = original.convert('RGBA')
    source_size = list(image.size)
    alpha = image.getchannel('A')
    if slug == 'tamle':
      # Remove isolated generated paint specks, keeping the complete central cutout.
      mask = alpha.point(lambda value: 255 if value >= 24 else 0)
      center = (image.width // 2, image.height // 2)
      if mask.getpixel(center) != 255:
        raise ValueError('Expected the portrait at the canvas center')
      ImageDraw.floodfill(mask, center, 128)
      mask = mask.point(lambda value: 255 if value == 128 else 0).filter(ImageFilter.MaxFilter(5))
      alpha = ImageChops.multiply(alpha, mask)
    box = alpha.point(lambda value: 255 if value >= 24 else 0).getbbox()
    if not box or alpha.getextrema()[0] != 0:
      raise ValueError(f'Expected nonempty transparent portrait: {master}')
    box = (max(0, box[0]-8), max(0, box[1]-8),
           min(image.width, box[2]+8), min(image.height, box[3]+8))
    image.putalpha(alpha.point(lambda value: value if value >= 8 else 0))
    image = image.crop(box)
    image.thumbnail((472, 472), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (512, 512))
    offset = ((512-image.width)//2, (512-image.height)//2)
    canvas.alpha_composite(image, offset)
    target = output / (slug + '_scarf.webp')
    canvas.save(target, 'WEBP', quality=88, method=6)
    manifest['portraits'][slug] = {
      'member': member, 'uploadFilename': master.name,
      'source': str(master.relative_to(ROOT)), 'sourceSize': source_size,
      'sourceSha256': hashlib.sha256(master.read_bytes()).hexdigest(),
      'rights': 'User-generated portrait supplied for this project',
      'trim': list(box), 'paintedSize': list(image.size), 'offset': list(offset),
      'src': str(target.relative_to(ROOT)), 'size': [512, 512],
      'bytes': target.stat().st_size,
      'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    }
    if slug == 'tamle':
      manifest['portraits'][slug]['rights'] = 'Generated with 9Router Sunburst from a user-authorized identity photo'
      manifest['portraits'][slug]['generation'] = 'data/sources/tamle-generation.json'
      manifest['portraits'][slug]['cleanup'] = 'Retain central connected cutout at alpha >= 24 plus 2px antialias margin; discard isolated generated paint specks.'
  (ROOT / 'data/sources/people-artwork.json').write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
  print(f'Prepared {len(MEMBERS)} portraits; originals preserved byte-for-byte')


if __name__ == '__main__':
  main()
