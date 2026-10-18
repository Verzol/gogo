"""Prepare gently aged Sunburst diary paper without modifying any source artwork.

Offline, deterministic. Requires Pillow and NumPy. Exact requests/prompts live
in figures/raw/diary/soft_aged/ and docs/prompts/diary/soft_aged/.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw/diary/soft_aged'
OUT = ROOT / 'figures/decor/painted/diary'
records = []


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(image, name, source, processing, **metadata):
    target = OUT / (name + '.webp')
    image.save(target, 'WEBP', quality=84, method=6)
    records.append({
        'source': str(source.relative_to(ROOT)),
        'source_sha256': digest(source),
        'processing': processing,
        'derivative': str(target.relative_to(ROOT)),
        'size': list(image.size),
        'sha256': digest(target),
        'bytes': target.stat().st_size,
        **metadata,
    })


for name in ['paper_left', 'paper_right', 'endpaper']:
    source = RAW / (name + '.png')
    # Paper is an opaque surface. Ignore any provider alpha while retaining
    # its RGB fibers; original masters remain untouched.
    image = Image.open(source).convert('RGB')
    image.thumbnail((800, 1200), Image.Resampling.LANCZOS)
    pixels = np.array(image, dtype=np.float32)
    h, w = pixels.shape[:2]
    center = pixels[int(h*.1):int(h*.9), int(w*.1):int(w*.9)]
    median = np.median(center.reshape(-1, 3), axis=0)
    tone = [214, 189, 149] if name == 'endpaper' else [229, 210, 178]
    # Harmonize stock only; the generated fibers and gentle edge wear survive.
    pixels += np.array(tone) - median
    if name != 'endpaper':
        x = np.linspace(0, 1, w)
        distance = 1 - x if name == 'paper_left' else x
        shade = (.05 * np.exp(-distance * 65))[None, :, None]
        pixels = pixels * (1 - shade) + np.array([91, 68, 43]) * shade
    request = RAW / (name + '_request.json')
    save(Image.fromarray(pixels.clip(0, 255).astype('uint8')),
         'soft_' + name, source,
         'Opaque RGB; bound to 800x1200 without upscaling; harmonize center median '
         f'to {tone}; retain generated wear; paper receives 5% narrow spine shading.',
         request=str(request.relative_to(ROOT)), request_sha256=digest(request),
         prompt=f'docs/prompts/diary/soft_aged/{name}.md')

manifest = {
    'model': 'cx/gpt-image-2.5-sunburst',
    'provider': '9Router /v1/images/generations',
    'pipeline': 'scripts/prepare_diary_soft_paper.py',
    'private_content_supplied': False,
    'assets': records,
}
(ROOT / 'data/sources/diary-soft-paper.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'{len(records)} gently aged paper materials, {sum(r["bytes"] for r in records):,} bytes')
