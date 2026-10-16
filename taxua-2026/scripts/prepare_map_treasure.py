"""Preserve supplied atlas artwork and prepare small, deterministic WebPs.

Run with Python + Pillow. Existing masters are never replaced.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
  'map_treasure_parchment': ('Warm Aged Parchment Texture.png', (768, 768)),
  'map_treasure_scroll': ('Watercolor Treasure Map Scroll.png', (640, 360)),
  'map_treasure_compass': ('Vintage Watercolor Compass Pendant.png', (192, 240)),
  'map_treasure_cartouche': ('Watercolor Cloud Swirl Frame.png', (960, 240)),
  'map_treasure_day_swipe': ('Golden Ochre Watercolor Brushstroke.png', (480, 140)),
  'map_treasure_field_kit': ('Watercolor Hiking Journal Sticker Set.png', (480, 360)),
}


def digest(path):
  return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
  raw = ROOT / 'figures/raw'
  masters = raw / 'map_treasure'
  output = ROOT / 'figures/decor/painted'
  # Validate the whole batch before moving a supplied file.
  originals = {}
  for name, (filename, _) in SOURCES.items():
    upload, master = raw / filename, masters / (name + '.png')
    if upload.is_symlink() or master.is_symlink():
      raise ValueError(f'Expected regular artwork files: {name}')
    if upload.exists() and master.exists():
      raise FileExistsError(f'Refusing to replace master: {master}')
    source = upload if upload.exists() else master
    with Image.open(source) as original:
      alpha = original.convert('RGBA').getchannel('A')
      if name != 'map_treasure_parchment' and alpha.getextrema()[0] != 0:
        raise ValueError(f'Expected transparent artwork: {source}')
    originals[name] = digest(source)
  masters.mkdir(parents=True, exist_ok=True)
  output.mkdir(parents=True, exist_ok=True)
  manifest = {
    'processing': 'Originals preserved byte-for-byte. Transparent art trimmed at '
      'alpha >= 24 with 8px padding; alpha below 8 cleared. Parchment trimmed '
      '5% per edge to omit its darker perimeter. Downscale only; no recoloring.',
    'sources': {}, 'assets': {},
  }
  for name, (filename, target_size) in SOURCES.items():
    upload, master = raw / filename, masters / (name + '.png')
    if upload.exists():
      upload.rename(master)
    assert digest(master) == originals[name], f'Original bytes changed: {name}'
    with Image.open(master) as original:
      image = original.convert('RGBA')
    size = list(image.size)
    if name == 'map_treasure_parchment':
      inset = round(min(size) * .05)
      box = (inset, inset, size[0]-inset, size[1]-inset)
      image = image.convert('RGB')
    else:
      alpha = image.getchannel('A')
      box = alpha.point(lambda value: 255 if value >= 24 else 0).getbbox()
      if not box:
        raise ValueError(f'Empty artwork: {master}')
      box = (max(0, box[0]-8), max(0, box[1]-8),
             min(size[0], box[2]+8), min(size[1], box[3]+8))
      image.putalpha(alpha.point(lambda value: value if value >= 8 else 0))
    image = image.crop(box)
    image.thumbnail(target_size, Image.Resampling.LANCZOS)
    target = output / (name + '.webp')
    image.save(target, 'WEBP', quality=88, method=6)
    manifest['sources'][name] = {
      'uploadFilename': filename, 'path': str(master.relative_to(ROOT)),
      'sha256': originals[name], 'size': size,
      'rights': 'User-generated artwork supplied for this project',
      'description': 'Decorative atlas UI artwork, not geographic data',
    }
    manifest['assets'][name] = {
      'source': name, 'trim': list(box), 'size': list(image.size),
      'src': str(target.relative_to(ROOT)), 'bytes': target.stat().st_size,
      'sha256': digest(target),
    }
  (ROOT / 'data/sources/map-treasure-artwork.json').write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
  total = sum(asset['bytes'] for asset in manifest['assets'].values())
  print(f'Prepared {len(SOURCES)} atlas assets ({total:,} bytes); originals unchanged')


if __name__ == '__main__':
  main()
