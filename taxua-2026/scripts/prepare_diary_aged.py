"""Prepare aged Sunburst diary materials without modifying any source artwork.

Offline, deterministic. Requires Pillow and NumPy. Exact requests/prompts live
in figures/raw/diary/aged/ and docs/prompts/diary/aged/.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw/diary/aged'
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
    # The paper is a physical opaque surface; one provider master includes an
    # alpha channel even across its center. Retain its RGB fibers, not opacity.
    image = Image.open(source).convert('RGB')
    image.thumbnail((800, 1200), Image.Resampling.LANCZOS)
    pixels = np.array(image, dtype=np.float32)
    h, w = pixels.shape[:2]
    center = pixels[int(h*.1):int(h*.9), int(w*.1):int(w*.9)]
    median = np.median(center.reshape(-1, 3), axis=0)
    tone = [199, 170, 126] if name == 'endpaper' else [217, 191, 151]
    # Harmonize stock only; all generated tears, fibers and mottling survive.
    pixels += np.array(tone) - median
    if name != 'endpaper':
        x = np.linspace(0, 1, w)
        distance = 1 - x if name == 'paper_left' else x
        shade = (.05 * np.exp(-distance * 65))[None, :, None]
        pixels = pixels * (1 - shade) + np.array([91, 68, 43]) * shade
    request = RAW / (name + '_request.json')
    save(Image.fromarray(pixels.clip(0, 255).astype('uint8')),
         'aged_' + name, source,
         'Opaque RGB; bound to 800x1200 without upscaling; harmonize center median '
         f'to {tone}; retain generated wear; paper receives 5% narrow spine shading.',
         request=str(request.relative_to(ROOT)), request_sha256=digest(request),
         prompt=f'docs/prompts/diary/aged/{name}.md')

for shape in ['landscape', 'portrait', 'square']:
    source = OUT / ('quiet_frame_' + shape + '.webp')
    image = Image.open(source).convert('RGBA')
    pixels = np.array(image, dtype=np.float32)
    # Warm the existing generated print stock; preserve every opening/alpha.
    pixels[:, :, :3] *= np.array([.96, .92, .84])
    save(Image.fromarray(pixels.clip(0, 255).astype('uint8')),
         'aged_frame_' + shape, source,
         'Multiply RGB by [0.96,0.92,0.84]; preserve dimensions and alpha exactly.')

manifest = {
    'model': 'cx/gpt-image-2.5-sunburst',
    'provider': '9Router /v1/images/generations',
    'pipeline': 'scripts/prepare_diary_aged.py',
    'private_content_supplied': False,
    'assets': records,
}
(ROOT / 'data/sources/diary-aged.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'{len(records)} aged diary materials, {sum(r["bytes"] for r in records):,} bytes')
