"""Prepare a cloud-free 32px native diary pencil from its untouched master.

Requires Pillow, NumPy and SciPy. Optional --preview /tmp/diary-pencil.png.
"""
from pathlib import Path
import argparse
import hashlib
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw/cursor/pencil'


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(preview=None):
    record = json.loads((RAW / 'generation.json').read_text())
    source = ROOT / record['path']
    assert sha256(source) == record['sha256'], 'Generated master changed'
    pixels = np.array(Image.open(source).convert('RGBA'))
    assert pixels[:, :, 3].min() == 0, 'Master needs genuine transparency'
    labels, _ = ndimage.label(pixels[:, :, 3] >= 32)
    counts = np.bincount(labels.ravel())
    counts[0] = 0
    keep = ndimage.binary_dilation(labels == counts.argmax(), iterations=2)
    pixels[~keep, 3] = 0
    pixels[pixels[:, :, 3] == 0, :3] = 0
    cutout = Image.fromarray(pixels)
    bounds = cutout.getbbox()
    cutout = cutout.crop(bounds)
    scale = min(28 / cutout.width, 28 / cutout.height, 1)
    cutout = cutout.resize(tuple(round(v * scale) for v in cutout.size), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (32, 32))
    canvas.alpha_composite(cutout, (2, 2))
    # The graphite point is the lower-left endpoint, excluding the alpha fringe.
    alpha = np.array(canvas)[:, :, 3]
    ys, xs = np.where(alpha >= 160)
    endpoint = np.argmin(xs - ys)
    hotspot = [int(xs[endpoint]), int(ys[endpoint])]
    keyline = Image.new('RGBA', canvas.size, '#fff4df')
    keyline.putalpha(canvas.getchannel('A').filter(ImageFilter.MaxFilter(3)).point(lambda v: round(v * .85)))
    keyline.alpha_composite(canvas)
    target = ROOT / 'figures/decor/painted/cursor/diary_pencil.png'
    keyline.save(target, optimize=True)
    manifest = {'title': 'Wooden diary pencil cursor without cloud decoration',
        'generation': record,
        'processing': 'Keep largest alpha component at >=32 with 2px feather margin, trim, downsample to fit 28px at (2,2) on 32px transparent canvas, preserve original ochre/indigo pigment, add 1px ivory keyline. Lower-left graphite hotspot measured at alpha >=160.',
        'alphaBoundsInSource': list(bounds),
        'asset': {'path': target.relative_to(ROOT).as_posix(), 'sha256': sha256(target),
            'bytes': target.stat().st_size, 'size': [32, 32], 'hotspot': hotspot}}
    (ROOT / 'data/sources/diary-pencil-artwork.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if preview:
        sheet = Image.new('RGB', (600, 210), '#f3ead4')
        draw = ImageDraw.Draw(sheet)
        draw.text((15, 14), 'Diary pencil: 32px actual size and 4x detail', fill='#173e46')
        for col, background in enumerate(('#f3ead4', '#183b46', '#7b9c9c')):
            x = col * 200
            draw.rectangle((x, 40, x + 199, 209), fill=background)
            sheet.paste(keyline, (x + 12, 100), keyline)
            enlarged = keyline.resize((128, 128), Image.Resampling.NEAREST)
            sheet.paste(enlarged, (x + 65, 60), enlarged)
        sheet.save(preview)
    print(json.dumps(manifest['asset'], indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview', type=Path)
    prepare(parser.parse_args().preview)
