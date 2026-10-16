"""Prepare the generated torn atlas sheet; preserve its original PNG.

Run with Python + Pillow. The nine-slice border is styled in trip-map.css.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
NAME = 'map_treasure_torn_paper'


def digest(path):
  return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
  master = ROOT / 'figures/raw/map_treasure' / (NAME + '.png')
  target = ROOT / 'figures/decor/painted' / (NAME + '.webp')
  manifest_path = ROOT / 'data/sources/map-torn-paper-artwork.json'
  if master.is_symlink() or target.is_symlink() or manifest_path.is_symlink():
    raise ValueError('Expected regular artwork and manifest files')
  source_hash = digest(master)
  with Image.open(master) as original:
    image = original.convert('RGBA')
  size = list(image.size)
  alpha = image.getchannel('A')
  if alpha.getextrema()[0] != 0:
    raise ValueError('The torn sheet must have a transparent exterior')
  bounds = alpha.point(lambda value: 255 if value >= 24 else 0).getbbox()
  if not bounds:
    raise ValueError('The torn sheet is empty')
  box = (max(0, bounds[0]-2), max(0, bounds[1]-2),
         min(size[0], bounds[2]+2), min(size[1], bounds[3]+2))
  image.putalpha(alpha.point(lambda value: value if value >= 8 else 0))
  image = image.crop(box)
  image.thumbnail((1200, 900), Image.Resampling.LANCZOS)
  image.save(target, 'WEBP', quality=88, method=6)
  manifest = {
    'processing': 'Generated PNG preserved byte-for-byte. Clear alpha below 8; '
      'trim at alpha >= 24 with 2px padding; downscale only to fit 1200x900. '
      'No recoloring. CSS uses a 12% filled nine-slice border to preserve tears '
      'at responsive sizes; transparent areas reveal the dialog backdrop.',
    'generator': '9Router /v1/images/generations',
    'model': 'cx/gpt-image-2',
    'prompt': 'docs/prompts/map_treasure/07_torn_parchment.md',
    'referenceImages': [],
    'sources': {NAME: {
      'path': str(master.relative_to(ROOT)), 'sha256': source_hash,
      'size': size, 'rights': 'AI-generated at the user request for this project',
      'description': 'Blank torn parchment UI sheet, not geographic data',
    }},
    'assets': {NAME: {
      'source': NAME, 'trim': list(box), 'size': list(image.size),
      'src': str(target.relative_to(ROOT)), 'bytes': target.stat().st_size,
      'sha256': digest(target),
    }},
  }
  assert digest(master) == source_hash, 'Original bytes changed'
  manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
  print(f'Prepared torn atlas sheet ({target.stat().st_size:,} bytes); original unchanged')


if __name__ == '__main__':
  main()
