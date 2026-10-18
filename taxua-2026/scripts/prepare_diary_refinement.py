"""Quiet paper and print materials. Offline; keeps all source art unchanged.

Requires Pillow and NumPy. Run after prepare_diary_artwork.py if rebuilding
from the preserved Sunburst masters. Photo openings retain their coordinates.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'figures/decor/painted/diary'
MASTER = ROOT / 'figures/raw/diary/refinement/paper.png'
assets = []


def save(image, name, source, processing):
    target = OUT / (name + '.webp')
    image.save(target, 'WEBP', quality=84, method=6)
    assets.append({
        'source': str(source.relative_to(ROOT)),
        'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'processing': processing,
        'derivative': str(target.relative_to(ROOT)),
        'size': list(image.size),
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'bytes': target.stat().st_size,
    })


paper = Image.open(MASTER).convert('RGB')
paper.thumbnail((800, 1200), Image.Resampling.LANCZOS)
for side in ['left', 'right']:
    image = paper if side == 'left' else ImageOps.mirror(paper)
    pixels = np.array(image, dtype=np.float32)
    x = np.linspace(0, 1, image.width)
    distance = 1 - x if side == 'left' else x
    shade = (.10 * np.exp(-distance * 45))[None, :, None]
    pixels = pixels * (1 - shade) + np.array([86, 94, 75]) * shade
    save(Image.fromarray(pixels.clip(0, 255).astype('uint8')),
         'paper_quiet_' + side, MASTER,
         'Bound to 800x1200 without upscaling; right is mirrored; subtle inner-spine shading.')

for name in ['frame_landscape', 'frame_portrait', 'frame_square', 'tape_ochre', 'tape_linen']:
    source = OUT / (name + '.webp')
    original = Image.open(source).convert('RGBA')
    rgb = ImageEnhance.Color(original.convert('RGB')).enhance(.35)
    rgb = Image.blend(rgb, Image.new('RGB', rgb.size, (247, 243, 228)), .48 if name.startswith('frame') else .18)
    rgb.putalpha(original.getchannel('A'))
    save(rgb, 'quiet_' + name, source,
         'Reduce saturation to 35%; blend ivory into RGB; preserve dimensions and alpha exactly.')

manifest = {
    'model': 'cx/gpt-image-2.5-sunburst',
    'prompt': 'docs/prompts/diary/refinement/paper.md',
    'pipeline': 'scripts/prepare_diary_refinement.py',
    'assets': assets,
}
(ROOT / 'data/sources/diary-refinement.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'{len(assets)} diary materials, {sum(asset["bytes"] for asset in assets):,} bytes')
