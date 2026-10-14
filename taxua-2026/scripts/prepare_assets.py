"""Reproduce optimized assets: python3 scripts/prepare_assets.py /tmp/taxua-assets.
Requires Pillow. The cache contains import-results.json and original downloads.
Raw Drive URLs are temporary, never part of the site or committed documentation.
"""
import hashlib
import json
from pathlib import Path
import sys
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
cache = Path(sys.argv[1])
imports = json.loads((cache / 'import-results.json').read_text())
manifest = json.loads((ROOT / 'data/sources/selected-place-photos.json').read_text(encoding='utf-8-sig'))
metadata = {a['assetId']: a for a in manifest['assets']}
backgrounds = json.loads((ROOT / 'data/sources/backgrounds.json').read_text())['values'][1:]
for row in backgrounds:
    metadata[row[0]] = dict(assetId=row[0], label=row[1], credit=row[4], rightsStatus=row[5], sourceUrl=row[6], originalImageUrl=row[7], isIllustrative=False, captionVi='')
assets = {}
records = []
for item in imports:
    key = item['id']
    original = Path(item['path'])
    im = ImageOps.exif_transpose(Image.open(original)).convert('RGB')
    folder = 'backgrounds' if key.startswith('B') else 'places'
    destination = ROOT / 'figures' / folder
    destination.mkdir(exist_ok=True)
    variants = []
    for width in [640, 1280, 1920] if folder == 'backgrounds' else [480, 960, 1440]:
        out = im.copy()
        out.thumbnail((min(width, im.width), 10000), Image.Resampling.LANCZOS)
        # Avoid duplicate upscaled variants for small originals.
        if any(v['width'] == out.width for v in variants):
            continue
        name = f'{key.lower()}_{out.width}.webp'
        target = destination / name
        out.save(target, 'WEBP', quality=79 if folder == 'backgrounds' else 82, method=6)
        variants.append(dict(src=f'figures/{folder}/{name}', width=out.width, height=out.height, bytes=target.stat().st_size))
    a = metadata[key]
    assets[key] = dict(a, variants=variants, src=variants[-1]['src'], width=im.width, height=im.height, crop='50% 50%')
    records.append(dict(assetId=key, originalFilename=original.name, sha256=hashlib.sha256(original.read_bytes()).hexdigest(), method=item['method'], fallbackReason=item.get('reason'), sourceUrl=a['sourceUrl'], originalImageUrl=a['originalImageUrl'], credit=a['credit'], rightsStatus=a['rightsStatus'], variants=variants))
# Full-frame crops preserve venue signage, watermarks, and supplied compositions.
for key in ['P01', 'P12', 'P13', 'P14', 'P16', 'P17', 'P18']:
    assets[key]['fullFrame'] = True
assets['P12']['crop'] = '50% 60%'
assets['P13']['crop'] = '85% 70%'
assets['P14']['crop'] = '50% 55%'
runtimeKeys = ['assetId','label','credit','rightsStatus','isIllustrative','captionVi','variants','src','width','height','crop','fullFrame']
config = dict(assets={key:{k:v for k,v in a.items() if k in runtimeKeys} for key,a in assets.items()}, stops={s['stopId']: s for s in manifest['stops']})
(ROOT / 'assets.js').write_text('// Imported from the live Drive catalog on 2026-10-14. Classic script; no runtime fetch.\nconst TRIP_ASSETS = ' + json.dumps(config,ensure_ascii=False,separators=(',',':')) + ';\n')
(ROOT / 'data/sources/asset-import.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
# Development contact sheet; not a runtime asset.
from PIL import ImageDraw
sheet = Image.new('RGB', (1200, ((len(imports)+3)//4)*220), '#eef1f2')
draw = ImageDraw.Draw(sheet)
for n,item in enumerate(imports):
    im = ImageOps.exif_transpose(Image.open(item['path'])).convert('RGB')
    im.thumbnail((282,180))
    x=(n%4)*300+9; y=(n//4)*220
    sheet.paste(im,(x,y+25));draw.text((x,y+5),item['id'],fill='#193244')
sheet.save(cache/'contact-sheet.jpg')
print(f'Prepared {len(assets)} assets, {sum(len(a["variants"]) for a in assets.values())} variants; all originals downloaded.' )
