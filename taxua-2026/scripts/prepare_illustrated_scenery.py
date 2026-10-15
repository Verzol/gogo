"""Organize supplied originals and reproducibly extract painted scenery.

Run from any directory with Python, Pillow and NumPy. Never upscale sources.
Source filenames and hashes are retained in the generated import manifest.
"""
from pathlib import Path
import hashlib
import json
import shutil

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw'
ORIGINALS = RAW / 'illustrated_scenery'
SCENERY = ROOT / 'figures/scenery/painted'
DECOR = ROOT / 'figures/decor/painted'
SOURCES = {
  'concept_sunrise': 'Misty Mountain Dawn in Watercolor.png',
  'concept_night': 'Moonlit Mountain Valley Retreat.png',
  'concept_daylight': 'Panoramic Mountain Valley with Lake and Tree.png',
  'concept_afternoon': 'Golden Valley at Sunset.png',
  'ridge_far': 'Translucent Watercolor Mountain Panorama.png',
  'ridge_mid': 'Panoramic Watercolor Mountain Range.png',
  'ridge_near': 'Painterly Teal Mountain Range on Transparent Background.png',
  'ridge_serrated': 'Watercolor Mountain Range Cutout.png',
  'meadow_left': 'Watercolor Hillside Ridge Cutout.png',
  'meadow_right': 'Watercolor Mountain Ridge Landscape.png',
  'cloud_sheet': 'Three Watercolor Clouds PNG Set.png',
  'celestial_sheet': 'Watercolor Celestial Sticker Set.png',
  'environment_sheet': 'Watercolor Landscape Cutout Collection.png',
  'travel_sticker_sheet': 'Watercolor Travel Sticker Collection.png',
  'cloud_hero_left': 'Watercolor Cumulus Cloud Cluster.png',
  'cloud_hero_right': 'Watercolor Cloud Cluster PNG.png',
  'cloud_sea_far': 'Dreamy Watercolor Cloud Bank.png',
  'cloud_transition_near': 'Panoramic Watercolor Cloud Bank.png',
  'cloud_overcast': 'Watercolor Storm Cloud Cutout.png',
}
# Measured against the supplied sheets, not the prompt's ideal grid. Bus crosses
# the nominal half-column boundary; hut/rock edges also need distinct crops.
CROPS = {
  'cloud_sheet': {
    'cloud_valley_ribbon': (0, 0, 1536, 432),
    'cloud_sky_puff': (0, 432, 1536, 794),
    'cloud_distant_wisp': (0, 794, 1536, 1024),
  },
  'environment_sheet': {
    'winding_road': (0, 0, 520, 520),
    'lake': (520, 0, 1030, 520),
    'solitary_tree': (1030, 0, 1536, 520),
    'hillside_hut': (0, 550, 535, 1024),
    'rock_outcrop': (535, 550, 1030, 1024),
  },
  'travel_sticker_sheet': {
    'bus_sticker': (0, 0, 655, 590),
    'headlamp_sticker': (655, 0, 1254, 590),
    'cloud_coffee_sticker': (0, 590, 655, 1254),
    'backpack_sticker': (655, 590, 1254, 1254),
  },
  'celestial_sheet': {
    'sun_disc': (0, 0, 627, 627),
    'sun_rays': (627, 0, 1254, 627),
    'moon': (0, 627, 627, 1254),
    'star_motif': (627, 627, 1254, 1254),
  },
}


def clean(image):
  data = np.array(image.convert('RGBA'))
  data[data[:, :, 3] < 3, 3] = 0
  return Image.fromarray(data)


def trimmed(image, margin=8):
  image = clean(image)
  box = image.getchannel('A').getbbox()
  if box is None:
    raise ValueError('Empty supplied asset')
  box = (max(0, box[0] - margin), max(0, box[1] - margin),
         min(image.width, box[2] + margin), min(image.height, box[3] + margin))
  return image.crop(box)


def cool_variant(image, low, high):
  data = np.array(image).astype(float)
  light = (data[:, :, :3] @ np.array([.2126, .7152, .0722])) / 255
  # Preserve painted texture and light/dark planes while giving night layers a
  # coherent palette. Alpha is copied exactly; no runtime grayscale filters.
  color = np.array(low)[None, None, :] + light[:, :, None] * (np.array(high) - np.array(low))
  data[:, :, :3] = color
  return Image.fromarray(np.clip(data, 0, 255).astype('uint8'))


def write(image, name, folder, records, source, crop=None):
  folder.mkdir(parents=True, exist_ok=True)
  png = folder / (name + '.png')
  webp = folder / (name + '.webp')
  image.save(png)
  image.save(webp, 'WEBP', quality=88, method=6)
  records[name] = {
    'source': source, 'crop': crop,
    'width': image.width, 'height': image.height,
    'png': str(png.relative_to(ROOT)),
    'src': str(webp.relative_to(ROOT)), 'bytes': webp.stat().st_size,
  }


def main():
  ORIGINALS.mkdir(parents=True, exist_ok=True)
  manifest = {'sources': {}, 'assets': {}}
  for name, upload in SOURCES.items():
    destination = ORIGINALS / (name + '.png')
    original = RAW / upload
    if original.exists() or original.is_symlink():
      if destination.exists() or destination.is_symlink():
        raise FileExistsError(destination)
      if original.is_symlink():
        raise ValueError(f'Expected a regular upload: {original}')
      shutil.move(original, destination)
    with Image.open(destination) as source:
      image = source.convert('RGBA')
    manifest['sources'][name] = {
      'uploadFilename': upload,
      'path': str(destination.relative_to(ROOT)),
      'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
      'width': image.width, 'height': image.height,
      'rights': 'User-generated artwork supplied for this project',
    }
    if name.startswith('cloud_') and name != 'cloud_sheet':
      # Preserve the supplied canvas and alpha; scale pixels down only.
      for suffix, width in [('', 1440 if 'sea_' in name or 'transition_' in name else 1152),
                            ('_phone', 780 if 'sea_' in name or 'transition_' in name else 640)]:
        piece = clean(image)
        piece.thumbnail((width, width), Image.Resampling.LANCZOS)
        write(piece, name + suffix, SCENERY, manifest['assets'], name)
      continue
    if name.startswith('concept_'):
      # Reference compositions are retained at their native size and are not
      # loaded as live full-screen backgrounds.
      continue
    if name in CROPS:
      for asset, crop in CROPS[name].items():
        piece = trimmed(image.crop(crop))
        if asset in ['sun_disc', 'sun_rays']:
          # The generated ray ring's empty center is smaller than requested.
          # Center both pieces on a common canvas and fit the disc to the hole.
          side = 184 if asset == 'sun_disc' else 460
          piece.thumbnail((side, side), Image.Resampling.LANCZOS)
          canvas = Image.new('RGBA', (512, 512))
          canvas.alpha_composite(piece, ((512 - piece.width) // 2, (512 - piece.height) // 2))
          piece = canvas
        folder = DECOR if name == 'travel_sticker_sheet' else SCENERY
        write(piece, asset, folder, manifest['assets'], name, crop)
    else:
      piece = trimmed(image, margin=0)
      write(piece, name, SCENERY, manifest['assets'], name)
      for suffix, low, high in [
        ('night', [16, 29, 53], [59, 99, 113]),
        ('bluehour', [29, 56, 81], [113, 150, 166]),
      ]:
        write(cool_variant(piece, low, high), name + '_' + suffix,
              SCENERY, manifest['assets'], name)
  # Generated locally; never enlarge the supplied painting to invent detail.
  rng = np.random.default_rng(2026)
  grain = np.zeros((256, 256, 4), dtype=np.uint8)
  grain[:, :, :3] = rng.integers(0, 256, (256, 256, 1), dtype=np.uint8)
  grain[:, :, 3] = 255
  grain_path = SCENERY / 'paper_grain.png'
  Image.fromarray(grain).save(grain_path)
  manifest['generated'] = {'paper_grain': {
    'path': str(grain_path.relative_to(ROOT)), 'width': 256, 'height': 256,
    'seed': 2026, 'sha256': hashlib.sha256(grain_path.read_bytes()).hexdigest(),
  }}
  manifest['authored'] = {}
  for name, width, height in [('weather_rain', 200, 80), ('weather_snow', 280, 180)]:
    tile = SCENERY / (name + '.svg')
    manifest['authored'][name] = {
      'path': str(tile.relative_to(ROOT)), 'width': width, 'height': height,
      'sha256': hashlib.sha256(tile.read_bytes()).hexdigest(),
      'source': 'Locally authored vector precipitation tile; no external image source',
    }
  (ROOT / 'data/sources/illustrated-scenery.json').write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
  print(f"Organized {len(manifest['sources'])} originals; prepared {len(manifest['assets'])} web assets.")


if __name__ == '__main__':
  main()
