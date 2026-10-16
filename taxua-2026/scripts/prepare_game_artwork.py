"""Prepare the reviewed 9Router game sheets; never modify generated masters.

Requires Pillow, NumPy and SciPy. Run from any working directory.
Only generated derivatives, their manifest and the contact sheet are rewritten.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw/random_games'
OUTPUT = ROOT / 'figures/decor/painted/games'
GENERATION = RAW / 'generation.json'
MANIFEST = ROOT / 'data/sources/game-artwork.json'
PREVIEW = ROOT / 'docs/research/games_artwork_preview.webp'

# Measured against the actual generated sheets, not the requested grid positions.
# Each tuple: source, crop, transparent canvas, exact painted size (or None), align.
ASSETS = {
    'coin_sun': ('coin_sheet', (0, 0, 768, 800), (512, 512), (480, 480), 'center'),
    'coin_cloud': ('coin_sheet', (768, 0, 1536, 800), (512, 512), (480, 480), 'center'),
    'coin_edge': ('coin_sheet', (350, 800, 1180, 1000), (704, 136), None, 'center'),
    'dice_one': ('dice_sheet', (0, 100, 350, 470), (256, 256), (224, 224), 'center'),
    'dice_two': ('dice_sheet', (350, 100, 690, 470), (256, 256), (224, 224), 'center'),
    'dice_three': ('dice_sheet', (690, 100, 1024, 470), (256, 256), (224, 224), 'center'),
    'dice_four': ('dice_sheet', (0, 470, 350, 825), (256, 256), (224, 224), 'center'),
    'dice_five': ('dice_sheet', (350, 470, 690, 825), (256, 256), (224, 224), 'center'),
    'dice_six': ('dice_sheet', (690, 470, 1024, 825), (256, 256), (224, 224), 'center'),
    'dice_tray': ('dice_sheet', (0, 825, 1024, 1536), (768, 480), None, 'center'),
    'card_back': ('cards_sheet', (0, 70, 490, 950), (416, 640), (384, 608), 'center'),
    'card_front_scenic': ('cards_sheet', (490, 70, 945, 950), (416, 640), (384, 608), 'center'),
    'card_deck': ('cards_sheet', (945, 70, 1536, 970), (512, 704), None, 'center'),
    'card_front': ('card_front_sheet', (0, 0, 1024, 1536), (416, 640), (384, 608), 'center'),
    'stick_long': ('sticks_sheet', (200, 60, 400, 1040), (128, 800), (72, 752), 'top'),
    'stick_short': ('sticks_sheet', (600, 60, 800, 1040), (128, 800), (72, 635), 'top'),
    'stick_sleeve': ('sticks_sheet', (0, 1040, 1024, 1536), (704, 352), None, 'center'),
    'bag_closed': ('bag_sheet', (0, 0, 768, 568), (576, 512), None, 'center'),
    'bag_open': ('bag_sheet', (768, 0, 1536, 568), (576, 512), None, 'center'),
    'ball_cream': ('bag_sheet', (0, 550, 540, 1024), (256, 256), (224, 224), 'center'),
    'ball_jade': ('bag_sheet', (540, 550, 1000, 1024), (256, 256), (224, 224), 'center'),
    'ball_peach': ('bag_sheet', (1000, 550, 1536, 1024), (256, 256), (224, 224), 'center'),
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path):
    return path.relative_to(ROOT).as_posix()


def cutout(image, crop):
    pixels = np.array(image.crop(crop).convert('RGBA'))
    labels, count = ndimage.label(pixels[:, :, 3] >= 8)
    if not count:
        raise ValueError(f'Empty crop: {crop}')
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    # Adjacent objects overlap some rows. Keep only this crop's main object,
    # preserving its internal transparency and the ropes attached to each bag.
    pixels[labels != sizes.argmax(), 3] = 0
    pixels[pixels[:, :, 3] == 0, :3] = 0
    cleaned = Image.fromarray(pixels)
    bounds = cleaned.getbbox()
    return cleaned.crop(bounds), bounds


def prepare(image, crop, canvas_size, painted_size, align):
    piece, bounds = cutout(image, crop)
    original_size = piece.size
    if painted_size is None:
        scale = min(1, (canvas_size[0] - 32) / piece.width,
                    (canvas_size[1] - 32) / piece.height)
        painted_size = tuple(max(1, round(value * scale)) for value in piece.size)
    if any(new > old for new, old in zip(painted_size, original_size)):
        raise ValueError(f'Upscaling refused: {original_size} -> {painted_size}')
    piece = piece.resize(painted_size, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', canvas_size)
    x = (canvas.width - piece.width) // 2
    y = 16 if align == 'top' else (canvas.height - piece.height) // 2
    canvas.alpha_composite(piece, (x, y))
    return canvas, bounds, original_size, [x, y, x + piece.width, y + piece.height]


def font(size):
    try:
        return ImageFont.truetype('DejaVuSans.ttf', size)
    except OSError:
        return ImageFont.load_default(size=size)


def build_preview(assets):
    width, columns, cell_width, cell_height = 1500, 5, 300, 290
    rows = (len(assets) + columns - 1) // columns
    canvas = Image.new('RGB', (width, 140 + rows * cell_height + 40), '#173e48')
    draw = ImageDraw.Draw(canvas)
    draw.text((36, 23), 'Ta Xua / watercolor random games', font=font(34), fill='#f3e5c7')
    draw.text((38, 77), '9Router artwork / transparent cutouts / no game implementation',
              font=font(18), fill='#e8b299')
    for index, (name, record) in enumerate(assets.items()):
        x, y = (index % columns) * cell_width, 140 + (index // columns) * cell_height
        draw.rounded_rectangle((x + 14, y + 8, x + cell_width - 14, y + cell_height - 12),
                               radius=12, fill='#24545d')
        image = Image.open(ROOT / record['src']).convert('RGBA')
        image.thumbnail((cell_width - 65, cell_height - 85), Image.Resampling.LANCZOS)
        canvas.paste(image, (x + (cell_width - image.width) // 2,
                            y + 24 + (cell_height - 90 - image.height) // 2), image)
        draw.text((x + 24, y + cell_height - 59), name.replace('_', ' '),
                  font=font(15), fill='#fff6dc')
        label = f"{record['size'][0]} x {record['size'][1]} / {round(record['bytes'] / 1024)} KB"
        draw.text((x + 24, y + cell_height - 35), label, font=font(14), fill='#c3d6d2')
    canvas.save(PREVIEW, 'WEBP', quality=92, method=6)


def main():
    generation = json.loads(GENERATION.read_text())
    sources, images = {}, {}
    for name, record in generation['sheets'].items():
        path = RAW / f'{name}.png'
        if sha256(path) != record['sha256']:
            raise ValueError(f'Original hash changed: {path}')
        image = Image.open(path)
        if image.mode != 'RGBA' or image.getchannel('A').getextrema()[0] != 0:
            raise ValueError(f'Original lacks genuine alpha transparency: {path}')
        images[name] = image.convert('RGBA')
        sources[name] = dict(record, path=relative(path), size=list(image.size))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    assets = {}
    for name, (source, crop, size, painted_size, align) in ASSETS.items():
        canvas, trim, native_size, painted_bounds = prepare(
            images[source], crop, size, painted_size, align)
        path = OUTPUT / f'{name}.webp'
        canvas.save(path, 'WEBP', quality=92, method=6, exact=True)
        assets[name] = {
            'source': source, 'crop': list(crop), 'trim': list(trim),
            'nativePaintedSize': list(native_size), 'paintedBounds': painted_bounds,
            'size': list(size), 'alignment': align, 'src': relative(path),
            'bytes': path.stat().st_size, 'sha256': sha256(path),
        }
    manifest = {
        'title': 'Ta Xua random-game watercolor components',
        'status': 'Generated artwork for the random-game collection.',
        'generator': '9Router /v1/images/generations',
        'generationRecord': relative(GENERATION),
        'credit': 'AI-generated with 9Router for this project using its existing artwork as references.',
        'processing': 'Preserve all masters byte-for-byte. Measured crops; retain largest connected '
                      'alpha component at alpha >= 8; transparent padding; WebP quality 92. '
                      'No recoloring or upscaling. Normalize paired coin faces, dice faces, cards '
                      'and lottery tokens to matching painted dimensions by downsampling. '
                      'Both sticks share a 128x800 canvas, 72px painted width and 16px top anchor.',
        'sources': sources, 'assets': assets,
        'runtimeBytes': sum(record['bytes'] for record in assets.values()),
        'preview': relative(PREVIEW),
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    build_preview(assets)
    print(json.dumps({'sources': len(sources), 'assets': len(assets),
                      'runtimeBytes': manifest['runtimeBytes'], 'preview': relative(PREVIEW)}, indent=2))


if __name__ == '__main__':
    main()
