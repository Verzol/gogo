"""Prepare native 32px PNG cursors from the untouched Sunburst sheet.

Requires Pillow, NumPy and SciPy, as does the existing scrollbar pipeline.
Run from any directory. Contact sheet is optional: --preview /tmp/cursors.png.
"""
from pathlib import Path
import argparse
import hashlib
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw/cursor'
OUTPUT = ROOT / 'figures/decor/painted/cursor'
PALETTES = {
    'day': ('#224f55', '#e3c8b1', '#fff3da'),
    'night': ('#354d7e', '#97add2', '#e7eafa'),
    'predawn': ('#555280', '#b8aed9', '#f0eafa'),
    'dawn': ('#6a6560', '#e5c78d', '#fff0cc'),
    'morning': ('#356d61', '#a6cbb1', '#f2f5cf'),
    'noon': ('#43849a', '#b9e0e5', '#f8ffff'),
    'afternoon': ('#935865', '#e9b18a', '#fff2cd'),
    'evening': ('#6c557e', '#c4a0b7', '#fbe0d5'),
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(preview=None):
    record = json.loads((RAW / 'generation.json').read_text())
    source = ROOT / record['path']
    assert sha256(source) == record['sha256'], 'Generated master changed'
    image = Image.open(source).convert('RGBA')
    assert image.getextrema()[3][0] == 0, 'Master needs genuine transparency'
    OUTPUT.mkdir(parents=True, exist_ok=True)
    assets, crops = {}, {}
    for index, shape in enumerate(('arrow', 'hand')):
        region = (index * image.width // 2, 0, (index + 1) * image.width // 2, image.height)
        pixels = np.array(image.crop(region))
        labels, _ = ndimage.label(pixels[:, :, 3] >= 16)
        counts = np.bincount(labels.ravel())
        counts[0] = 0
        # Keep feathered pigment touching the main object, discard stray specks.
        main = ndimage.binary_dilation(labels == counts.argmax(), iterations=3)
        pixels[~main, 3] = 0
        pixels[pixels[:, :, 3] == 0, :3] = 0
        cutout = Image.fromarray(pixels)
        bounds = cutout.getbbox()
        assert bounds is not None
        cutout = cutout.crop(bounds)
        scale = min(28 / cutout.width, 28 / cutout.height, 1)
        cutout = cutout.resize(tuple(round(v * scale) for v in cutout.size), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (32, 32))
        canvas.alpha_composite(cutout, (2, 2))
        # Measure the solid painted tip, rather than an antialiasing fringe.
        alpha = np.array(canvas)[:, :, 3]
        ys, xs = np.where(alpha >= 160)
        if shape == 'arrow':
            tip = np.argmin(xs + ys)
            hotspot = [int(xs[tip]), int(ys[tip])]
        else:
            top = ys.min()
            hotspot = [int(round(np.median(xs[ys <= top + 1]))), int(top)]
        crops[shape] = {'sheetRegion': list(region), 'alphaBoundsInRegion': list(bounds), 'hotspot': hotspot}
        pigment = np.array(canvas).astype(float)
        luminance = pigment[:, :, :3] @ np.array([.2126, .7152, .0722]) / 255
        for phase, palette in PALETTES.items():
            tinted = pigment.copy()
            stops = np.array([tuple(bytes.fromhex(color[1:])) for color in palette])
            for channel in range(3):
                # Preserve a firm ink edge after reduction to native cursor size.
                mapped = np.interp(luminance, [0, .42, .80, 1], stops[[0, 0, 1, 2], channel])
                tinted[:, :, channel] = mapped * .9 + pigment[:, :, channel] * .1
            painted = Image.fromarray(np.clip(tinted, 0, 255).astype('uint8'))
            # One restrained ivory keyline keeps the jade tip visible on dark photos.
            edge = painted.getchannel('A').filter(ImageFilter.MaxFilter(3)).point(lambda value: round(value * .85))
            result = Image.new('RGBA', (32, 32), '#fff4df')
            result.putalpha(edge)
            result.alpha_composite(painted)
            target = OUTPUT / f'{shape}_{phase}.png'
            result.save(target, optimize=True)
            assets[f'{shape}_{phase}'] = {'path': target.relative_to(ROOT).as_posix(),
                'sha256': sha256(target), 'bytes': target.stat().st_size,
                'size': [32, 32], 'hotspot': hotspot, 'pigmentPalette': palette}
    manifest = {'title': 'Watercolor cloud cursors', 'generation': record,
        'processing': 'Split sheet, keep main alpha component with 3px feather margin, trim, downsample to fit 28px within 32px canvas at (2,2). Map luminance at 0/.42/.80/1 through shadow/shadow/midtone/highlight with 10% original color, retain alpha, add 1px ivory keyline. Solid painted tip hotspots measured at alpha >=160. Native PNG cursors; no runtime processing.',
        'crops': crops, 'assets': assets}
    (ROOT / 'data/sources/cursor-artwork.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if preview:
        sheet = Image.new('RGB', (720, 8 * 102 + 42), '#f3ead4')
        draw = ImageDraw.Draw(sheet)
        draw.text((14, 14), 'Cloud cursors: actual size + 3x detail on light and dark', fill='#173e46')
        for row, phase in enumerate(PALETTES):
            y = 42 + row * 102
            draw.text((14, y + 40), phase, fill='#173e46')
            for col, shape in enumerate(('arrow', 'hand')):
                art = Image.open(OUTPUT / f'{shape}_{phase}.png')
                for dark in range(2):
                    x = 100 + col * 300 + dark * 145
                    draw.rectangle((x, y, x + 140, y + 97), fill='#183b46' if dark else '#e6e4d2')
                    sheet.paste(art, (x + 5, y + 32), art)
                    large = art.resize((96, 96), Image.Resampling.NEAREST)
                    sheet.paste(large, (x + 43, y), large)
        sheet.save(preview)
    print(json.dumps({'assets': len(assets), 'runtimeBytes': sum(a['bytes'] for a in assets.values()), 'crops': crops}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview', type=Path)
    prepare(parser.parse_args().preview)
