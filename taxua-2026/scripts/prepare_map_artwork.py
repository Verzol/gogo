"""Preserve supplied map artwork and produce downscaled transparent WebPs.

Run with Python + Pillow. Existing masters are never replaced.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw'
MASTERS = RAW / 'map_artwork'
SOURCES = {
  'map_home_base': 'Watercolor Cabin Sticker Illustration.png',
  'map_waterfall': 'Watercolor Waterfall Sticker Cutout.png',
  'map_paper_frame': 'Watercolor Paper Frame on Transparency.png',
  'map_vi_nha': 'Vietnamese Meal on a Woven Tray.png',
  'map_bep_cui': 'Rustic Steaming Pot over Wood Fire.png',
  'map_ameii_hill': 'Watercolor Cottage Hill Sticker.png',
  'map_a_phu': 'Watercolor Stilted Mountain Lodge Sticker.png',
  'map_thao_nguyen': 'Watercolor Hillside Path Sticker.png',
  'map_lan_co_don': 'Rustic Watercolor Shelter Sticker.png',
  'map_doi_may': 'Watercolor Vietnamese Grilled Feast.png',
  'map_trung_tam': 'Rustic Mountain Village Market Sticker.png',
}


def main():
  MASTERS.mkdir(parents=True, exist_ok=True)
  manifest = {'processing': 'Alpha below 8 cleared; trim using alpha >= 24 with 8px margin; '
              'downscale only; no recoloring. Frame retains its transparent opening.',
              'sources': {}, 'assets': {}}
  for name, filename in SOURCES.items():
    upload = RAW / filename
    master = MASTERS / (name + '.png')
    if upload.exists() or upload.is_symlink():
      if upload.is_symlink() or master.exists() or master.is_symlink():
        raise FileExistsError(f'Refusing to replace master: {master}')
      upload.rename(master)
    if master.is_symlink():
      raise ValueError(f'Expected regular master: {master}')
    with Image.open(master) as original:
      image = original.convert('RGBA')
    size = list(image.size)
    alpha = image.getchannel('A')
    box = alpha.point(lambda value: 255 if value >= 24 else 0).getbbox()
    if not box:
      raise ValueError(f'Empty artwork: {master}')
    box = (max(0, box[0]-8), max(0, box[1]-8),
           min(image.width, box[2]+8), min(image.height, box[3]+8))
    image.putalpha(alpha.point(lambda value: value if value >= 8 else 0))
    image = image.crop(box)
    image.thumbnail((960, 640) if name == 'map_paper_frame' else (480, 480), Image.Resampling.LANCZOS)
    target = ROOT / 'figures/decor/painted' / (name + '.webp')
    image.save(target, 'WEBP', quality=88, method=6)
    manifest['sources'][name] = {
      'uploadFilename': filename, 'path': str(master.relative_to(ROOT)),
      'sha256': hashlib.sha256(master.read_bytes()).hexdigest(), 'size': size,
      'rights': 'User-generated artwork supplied for this project',
      'description': 'Stylized illustration, not a documentary venue reconstruction',
    }
    manifest['assets'][name] = {
      'source': name, 'trim': list(box), 'size': list(image.size),
      'src': str(target.relative_to(ROOT)), 'bytes': target.stat().st_size,
      'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    }
  (ROOT / 'data/sources/map-artwork.json').write_text(json.dumps(manifest, indent=2) + '\n')
  print(f'Prepared {len(SOURCES)} map assets; originals preserved byte-for-byte')


if __name__ == '__main__':
  main()
