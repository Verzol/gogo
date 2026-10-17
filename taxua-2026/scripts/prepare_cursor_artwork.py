"""Prepare the complete native watercolor cursor set from preserved Sunburst sheets.

Requires Pillow, NumPy and SciPy. Optional --preview /tmp/cursor-states.png.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw/cursor/revision_2'
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
# shape -> CSS variable suffix and native fallback. Only genuine interaction
# states consume these variables; artwork never introduces a new action.
VARIANTS = {
    'arrow': ('arrow', 'auto'), 'hand': ('pointer', 'pointer'),
    'grab': ('grab', 'grab'), 'grabbing': ('grabbing', 'grabbing'),
    'text': ('text', 'text'), 'wait': ('wait', 'wait'),
    'unavailable': ('not-allowed', 'not-allowed'), 'move': ('move', 'move'),
    'resize_horizontal': ('ew-resize', 'ew-resize'),
    'resize_vertical': ('ns-resize', 'ns-resize'),
    'resize_nwse': ('nwse-resize', 'nwse-resize'),
    'resize_nesw': ('nesw-resize', 'nesw-resize'),
    'zoom_in': ('zoom-in', 'zoom-in'), 'zoom_out': ('zoom-out', 'zoom-out'),
    'progress': ('progress', 'progress'),
}
SHEETS = [
    ('', 2, 1, ['arrow', 'hand']),
    ('interaction', 3, 2, ['grab', 'grabbing', 'text', 'wait', 'unavailable', 'move']),
    ('resize_zoom', 3, 2, ['resize_horizontal', 'resize_vertical', 'resize_nwse', 'resize_nesw', 'zoom_in', 'zoom_out']),
]
MEDIA = '@media screen and (pointer:fine) and (hover:hover) and (forced-colors:none)'
SELECTORS = {
    'day': ':root', 'night': ':root[data-scenery-world="night"]',
    'predawn': ':root[data-scenery-world="bluehour"]',
    'morning': ':root[data-scenery-world="jade"]',
    'dawn': ':root[data-scenery-world="jade"][data-scene="dawn"]',
    'noon': ':root[data-scenery-world="daylight"]',
    'afternoon': ':root[data-scenery-world="afternoon"]',
    'evening': ':root[data-scenery-world="afternoon"][data-scene="evening"]',
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def extract(image, region, shape):
    pixels = np.array(image.crop(region))
    labels, _ = ndimage.label(pixels[:, :, 3] >= 32)
    counts = np.bincount(labels.ravel())
    counts[0] = 0
    assert len(counts) > 1, f'Missing cursor in {shape} cell'
    main = labels == counts.argmax()
    if shape.startswith('zoom_'):
        # Plus/minus is intentionally detached inside the transparent lens.
        ys, xs = np.where(main)
        interior = np.zeros(main.shape, dtype=bool)
        interior[ys.min():ys.max()+1, xs.min():xs.max()+1] = True
        main |= (labels > 0) & interior
    keep = ndimage.binary_dilation(main, iterations=3)
    pixels[~keep, 3] = 0
    pixels[pixels[:, :, 3] == 0, :3] = 0
    cutout = Image.fromarray(pixels)
    bounds = cutout.getbbox()
    cutout = cutout.crop(bounds)
    scale = min(28 / cutout.width, 28 / cutout.height, 1)
    cutout = cutout.resize(tuple(round(v * scale) for v in cutout.size), Image.Resampling.LANCZOS)
    origin = (2, 2) if shape == 'arrow' else tuple((32-v)//2 for v in cutout.size)
    canvas = Image.new('RGBA', (32, 32))
    canvas.alpha_composite(cutout, origin)
    ys, xs = np.where(np.array(canvas)[:, :, 3] >= 160)
    if shape == 'arrow':
        tip = np.argmin(xs + ys)
        hotspot = [int(xs[tip]), int(ys[tip])]
    elif shape == 'hand':
        top = ys.min()
        hotspot = [int(round(np.median(xs[ys <= top + 1]))), int(top)]
    elif shape.startswith('zoom_'):
        # The lens is in the upper-left part; its handle extends lower right.
        hotspot = [int(round(origin[i] + cutout.size[i] * .36)) for i in range(2)]
    else:
        hotspot = [16, 16]
    return canvas, {'sheetRegion': list(region), 'alphaBoundsInRegion': list(bounds), 'hotspot': hotspot}


def prepare(preview=None):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    bases, crops, records = {}, {}, []
    for folder, columns, rows, shapes in SHEETS:
        record = json.loads((RAW / folder / 'generation.json').read_text())
        source = ROOT / record['path']
        assert sha256(source) == record['sha256'], f'Master changed: {source}'
        image = Image.open(source).convert('RGBA')
        assert image.getextrema()[3][0] == 0, 'Master needs genuine transparency'
        records.append(record)
        for index, shape in enumerate(shapes):
            col, row = index % columns, index // columns
            region = (col*image.width//columns, row*image.height//rows,
                      (col+1)*image.width//columns, (row+1)*image.height//rows)
            bases[shape], crops[shape] = extract(image, region, shape)
            crops[shape]['source'] = record['path']
    # A progress pointer uses the same real arrow and hourglass, in a compact
    # conventional busy-pointer composition. No new generated master needed.
    progress = Image.new('RGBA', (32, 32))
    progress.alpha_composite(bases['arrow'].resize((24, 24), Image.Resampling.LANCZOS), (1, 1))
    progress.alpha_composite(bases['wait'].resize((15, 15), Image.Resampling.LANCZOS), (17, 17))
    bases['progress'] = progress
    crops['progress'] = {'composedFrom': ['arrow', 'wait'],
        'hotspot': [1+round(v*.75) for v in crops['arrow']['hotspot']]}
    assets = {}
    for shape, (prop, fallback) in VARIANTS.items():
        pigment = np.array(bases[shape]).astype(float)
        luminance = pigment[:, :, :3] @ np.array([.2126, .7152, .0722]) / 255
        for phase, palette in PALETTES.items():
            tinted = pigment.copy()
            stops = np.array([tuple(bytes.fromhex(color[1:])) for color in palette])
            for channel in range(3):
                mapped = np.interp(luminance, [0, .42, .80, 1], stops[[0, 0, 1, 2], channel])
                tinted[:, :, channel] = mapped*.9 + pigment[:, :, channel]*.1
            painted = Image.fromarray(np.clip(tinted, 0, 255).astype('uint8'))
            edge = painted.getchannel('A').filter(ImageFilter.MaxFilter(3)).point(lambda v: round(v*.85))
            result = Image.new('RGBA', (32, 32), '#fff4df')
            result.putalpha(edge)
            result.alpha_composite(painted)
            target = OUTPUT / f'{shape}_{phase}.png'
            result.save(target, optimize=True)
            assets[f'{shape}_{phase}'] = {'path': target.relative_to(ROOT).as_posix(),
                'sha256': sha256(target), 'bytes': target.stat().st_size, 'size': [32, 32],
                'hotspot': crops[shape]['hotspot'], 'pigmentPalette': palette,
                'cssVariable': '--cursor-'+prop, 'fallback': fallback}
    css = ['/* Generated by scripts/prepare_cursor_artwork.py; edit its source palettes. */', MEDIA+' {']
    for phase, selector in SELECTORS.items():
        css.append('  '+selector+' {')
        for shape, (prop, fallback) in VARIANTS.items():
            asset = assets[f'{shape}_{phase}']
            x, y = asset['hotspot']
            css.append(f"    --cursor-{prop}: url('./{asset['path']}?v=complete-2026') {x} {y}, {fallback};")
        css.append('  }')
    css.append('}')
    styles = ROOT / 'cursor-palettes.css'
    styles.write_text('\n'.join(css)+'\n')
    manifest = {'title': 'Complete watercolor cursors without cloud decoration',
        'generation': records[0], 'generations': records,
        'processing': 'Extract largest alpha component at >=32 with 3px feather margin per cell, trim, downsample to fit 28px in centered transparent 32px canvas (arrow anchored 2,2). Map luminance at 0/.42/.80/1 to shadow/shadow/midtone/highlight with 10% original pigment. Add 1px ivory keyline. Arrow/finger hotspots use solid alpha; other states use center, zoom uses lens center. Progress composes arrow and hourglass. No runtime processing.',
        'archivedOriginalManifest': 'figures/raw/cursor/original_manifest.json',
        'paletteStyles': {'path': styles.relative_to(ROOT).as_posix(), 'sha256': sha256(styles)},
        'crops': crops, 'assets': assets}
    (ROOT / 'data/sources/cursor-artwork.json').write_text(json.dumps(manifest, indent=2)+'\n')
    if preview:
        width, height = 240, 165
        sheet = Image.new('RGB', (4*width, math.ceil(len(VARIANTS)/4)*height+35), '#f3ead4')
        draw = ImageDraw.Draw(sheet)
        draw.text((12, 12), 'Watercolor cursors: actual 32px on light/dark + 3x detail', fill='#173e46')
        for index, shape in enumerate(VARIANTS):
            x, y = index%4*width, 35+index//4*height
            draw.text((x+10, y+8), shape, fill='#173e46')
            art = Image.open(OUTPUT / f'{shape}_day.png')
            draw.rectangle((x+7, y+39, x+57, y+89), fill='#e6e4d2')
            draw.rectangle((x+7, y+99, x+57, y+149), fill='#183b46')
            sheet.paste(art, (x+16,y+48), art)
            sheet.paste(art, (x+16,y+108), art)
            large = art.resize((96,96), Image.Resampling.NEAREST)
            sheet.paste(large, (x+83,y+41), large)
        sheet.save(preview)
        # All eight palettes at actual size, including every interaction state.
        chart = Image.new('RGB', (100+len(VARIANTS)*62, 35+len(PALETTES)*62), '#183b46')
        draw = ImageDraw.Draw(chart)
        for row, phase in enumerate(PALETTES):
            draw.text((10,45+row*62),phase,fill='#fff4df')
            for col, shape in enumerate(VARIANTS):
                art = Image.open(OUTPUT / f'{shape}_{phase}.png')
                chart.paste(art,(110+col*62,40+row*62),art)
        chart.save(preview.with_stem(preview.stem+'_palettes'))
    print(json.dumps({'assets':len(assets), 'runtimeBytes':sum(a['bytes'] for a in assets.values()),
        'hotspots':{shape:crop['hotspot'] for shape,crop in crops.items()}}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview', type=Path)
    prepare(parser.parse_args().preview)
