"""Organize supplied UI masters and prepare measured, downscaled WebP cutouts.

Run with Python + Pillow + NumPy. Originals are moved byte-for-byte, never
overwritten. Terrain recolors follow prepare_illustrated_scenery.py.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw'
ORIGINALS = RAW / 'ui_artwork'
SOURCES = {
  'packing_sheet': 'Watercolor Outdoor Adventure Sticker Sheet.png',
  'trail_sign': 'Rustic Blank Watercolor Arrow Sign.png',
  'quiet_terrain_wide': 'Layered Teal Watercolor Mountain Ridge.png',
  'quiet_terrain_portrait': 'Watercolor Mountain Valley Cutout.png',
}
# Measured transparent gutters in this specific upload.
CROPS = {
  'ui_coat': (0, 0, 530, 537),
  'ui_boots': (530, 0, 1024, 537),
  'ui_poncho': (0, 537, 530, 1040),
  'ui_power_bank': (530, 537, 1024, 1040),
  'ui_medicine': (0, 1040, 530, 1536),
  'ui_cash': (530, 1040, 1024, 1536),
}


def main():
  ORIGINALS.mkdir(parents=True, exist_ok=True)
  manifest = {'processing': 'Measured crops, alpha trim with 8px margin for objects; '
              'terrain retains full canvas. Downscale only. Night/bluehour are '
              'derived palette variants, not additional supplied paintings.',
              'sources': {}, 'assets': {}}

  def write(image, name, folder, source, crop=None, palette=None):
    original_size = image.size
    trim = None
    if folder == 'decor':
      trim = image.getchannel('A').point(lambda a: a if a >= 3 else 0).getbbox()
      if not trim:
        raise ValueError(f'Empty cutout: {name}')
      trim = (max(0, trim[0]-8), max(0, trim[1]-8),
              min(image.width, trim[2]+8), min(image.height, trim[3]+8))
      image = image.crop(trim)
    image.thumbnail((480, 480) if folder == 'decor' else (1920, 1536), Image.Resampling.LANCZOS)
    path = ROOT / f'figures/{folder}/painted/{name}.webp'
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, 'WEBP', quality=88, method=6)
    manifest['assets'][name] = {'source': source, 'crop': crop, 'trim': trim,
                              'inputSize': list(original_size), 'size': list(image.size),
                              'palette': palette, 'src': str(path.relative_to(ROOT)),
                              'bytes': path.stat().st_size}

  for name, filename in SOURCES.items():
    upload = RAW / filename
    destination = ORIGINALS / (name + '.png')
    if upload.exists() or upload.is_symlink():
      if upload.is_symlink() or destination.exists() or destination.is_symlink():
        raise FileExistsError(f'Refusing to replace a master: {destination}')
      upload.rename(destination)
    if destination.is_symlink():
      raise ValueError(f'Expected a regular master: {destination}')
    with Image.open(destination) as master:
      image = master.convert('RGBA')
    manifest['sources'][name] = {
      'uploadFilename': filename, 'path': str(destination.relative_to(ROOT)),
      'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
      'size': list(image.size), 'rights': 'User-generated artwork supplied for this project',
    }
    if name == 'packing_sheet':
      for asset, box in CROPS.items():
        write(image.crop(box), asset, 'decor', name, list(box))
    elif name == 'trail_sign':
      write(image, 'ui_trail_sign', 'decor', name)
    else:
      write(image, 'ui_' + name, 'scenery', name)
      for suffix, low, high in [('_night', [12, 29, 43], [77, 102, 116]),
                                ('_bluehour', [27, 49, 68], [128, 151, 167])]:
        pixels = np.array(image)
        light = (pixels[:, :, :3] @ np.array([.2126, .7152, .0722])) / 255
        pixels[:, :, :3] = np.clip(np.array(low) + light[:, :, None] * (np.array(high)-np.array(low)), 0, 255)
        write(Image.fromarray(pixels), 'ui_' + name + suffix, 'scenery', name,
              palette={'low': low, 'high': high})
  (ROOT / 'data/sources/ui-artwork.json').write_text(json.dumps(manifest, indent=2) + '\n')
  print(f"Prepared {len(manifest['assets'])} assets from {len(SOURCES)} preserved masters")


if __name__ == '__main__':
  main()
