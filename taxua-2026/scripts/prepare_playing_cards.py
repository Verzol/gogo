"""Prepare all 52 reviewed Sunburst card fronts without changing generated masters."""
from pathlib import Path
import hashlib
import json
import math

import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFont
from prepare_game_artwork import cutout

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw/playing_cards'
OUTPUT = ROOT / 'figures/decor/painted/games/deck'
MANIFEST = ROOT / 'data/sources/playing-cards.json'
SUITS = ['spades', 'hearts', 'clubs', 'diamonds']
RANKS = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def count_pips(piece, suit):
    # Inspect only the central field, excluding both rank/suit index corners.
    w, h = piece.size
    rgb = np.array(piece.crop((round(w * .22), round(h * .12), round(w * .78), round(h * .88))))[:, :, :3].astype(float)
    if suit in ['hearts', 'diamonds']:
        ink = (rgb[:, :, 0] > rgb[:, :, 1] * 1.3) & (rgb[:, :, 0] > rgb[:, :, 2] * 1.2) & (rgb[:, :, 1] < 145)
    else:
        ink = rgb.max(axis=2) < 160
    labels, _ = ndimage.label(ink)
    # Tiny fragments at the crop edges belong to corner indices/texture.
    sizes = np.bincount(labels.ravel())[1:]
    return int((sizes >= w * h * .002).sum())


def build_preview(assets):
    preview = Image.new('RGB', (1856, 936), '#28565a')
    draw = ImageDraw.Draw(preview)
    try:
        font = ImageFont.truetype('DejaVuSans.ttf', 18)
    except OSError:
        font = ImageFont.load_default()
    for row, suit in enumerate(SUITS):
        draw.text((24, 16 + row * 228), suit.upper(), font=font, fill='#fff1d5')
        for column, rank in enumerate(RANKS):
            card = Image.open(ROOT / assets[f'{suit}_{rank}']['path']).convert('RGBA')
            card.thumbnail((128, 180), Image.Resampling.LANCZOS)
            preview.paste(card, (24 + column * 140, 44 + row * 228), card)
    preview_path = ROOT / 'docs/research/playing_cards_preview.webp'
    preview.save(preview_path, 'WEBP', quality=92, method=6)
    return preview_path.relative_to(ROOT).as_posix()


def main():
    pieces, sources = {}, {}
    for suit in SUITS:
        for batch in [1, 2]:
            key = f'{suit}_{batch}'
            record = json.loads((RAW / f'{key}.json').read_text())
            source = ROOT / record['path']
            if record['model'] != 'cx/gpt-image-2.5-sunburst':
                raise ValueError(f'Wrong generator model: {key}')
            if digest(source) != record['sha256']:
                raise ValueError(f'Master hash changed: {key}')
            for ref in record['referenceImages']:
                if digest(ROOT / ref['path']) != ref['sha256']:
                    raise ValueError(f'Reference hash changed: {ref["path"]}')
            image = Image.open(source).convert('RGBA')
            if image.size != (1536, 1024):
                raise ValueError(f'Re-measure this sheet size: {key} {image.size}')
            sources[key] = record
            # Measure the actual opaque paper rectangles; the generator's gutters
            # can drift a few pixels across the requested slot boundaries.
            labels, _ = ndimage.label(np.array(image)[:, :, 3] >= 8)
            rectangles = []
            for region in ndimage.find_objects(labels):
                if region is None:
                    continue
                rows, columns = region
                if 200 <= columns.stop - columns.start <= 480 and 300 <= rows.stop - rows.start <= 600:
                    rectangles.append((columns.start, rows.start, columns.stop, rows.stop))
            rectangles.sort(key=lambda box: (int((box[1] + box[3]) / 2) // 512, (box[0] + box[2]) / 2))
            if len(rectangles) != len(record['ranks']):
                raise ValueError(f'Expected {len(record["ranks"])} separated cards, got {len(rectangles)}: {key}')
            for rank, bounds in zip(record['ranks'], rectangles):
                if bounds[0] == 0 or bounds[1] == 0 or bounds[2] == image.width or bounds[3] == image.height:
                    raise ValueError(f'Card clipped by sheet edge: {suit}_{rank}')
                crop = (max(0, bounds[0] - 8), max(0, bounds[1] - 8),
                        min(image.width, bounds[2] + 8), min(image.height, bounds[3] + 8))
                piece, alpha_bounds = cutout(image, crop)
                pieces[f'{suit}_{rank}'] = (piece, {'source': key, 'crop': crop, 'cropAlphaBounds': alpha_bounds, 'sourcePieceSize': piece.size})
    # The reviewed sheet had one incorrect eight; retain the original and use
    # the separately generated, verified replacement for that exact card only.
    correction = json.loads((RAW / 'diamonds_eight.json').read_text())
    source = ROOT / correction['path']
    if correction['model'] != 'cx/gpt-image-2.5-sunburst' or digest(source) != correction['sha256']:
        raise ValueError('Correction source/model changed')
    for ref in correction['referenceImages']:
        if digest(ROOT / ref['path']) != ref['sha256']:
            raise ValueError('Correction reference changed')
    image = Image.open(source).convert('RGBA')
    piece, bounds = cutout(image, (0, 0, image.width, image.height))
    sources['diamonds_eight_correction'] = correction
    pieces['diamonds_eight'] = (piece, {'source': 'diamonds_eight_correction', 'crop': (0, 0, image.width, image.height),
                                      'cropAlphaBounds': bounds, 'sourcePieceSize': piece.size})
    for name, (piece, record) in pieces.items():
        suit, rank = name.split('_')
        if RANKS.index(rank) < 10:
            count = count_pips(piece, suit)
            if count != RANKS.index(rank) + 1:
                raise ValueError(f'Incorrect central pip count for {name}: {count}')
            record['verifiedCentralPips'] = count
    if set(pieces) != {suit + '_' + rank for suit in SUITS for rank in RANKS}:
        raise ValueError('Deck must contain exactly 52 unique rank/suit faces')
    # Identical printed dimensions across every face, with no source upscaling.
    width = min(304, min(min(piece.width, math.floor(piece.height * 5 / 7)) for piece, _ in pieces.values()))
    painted = (width, math.floor(width * 7 / 5))
    assets = {}
    OUTPUT.mkdir(exist_ok=True)
    for name, (piece, record) in pieces.items():
        piece = piece.resize(painted, Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (320, 448))
        x, y = (canvas.width - piece.width) // 2, (canvas.height - piece.height) // 2
        canvas.alpha_composite(piece, (x, y))
        target = OUTPUT / f'{name}.webp'
        canvas.save(target, 'WEBP', quality=92, method=6)
        assets[name] = {**record, 'path': target.relative_to(ROOT).as_posix(), 'canvas': canvas.size,
                        'paintedBounds': [x, y, x + piece.width, y + piece.height],
                        'bytes': target.stat().st_size, 'sha256': digest(target)}
    manifest = {'title': 'Complete 52-card Sunburst watercolor deck',
                'generator': '9Router /v1/images/generations', 'model': 'cx/gpt-image-2.5-sunburst',
                'processing': 'Preserve original PNGs and reference hashes. Measured paper rectangles in row-major order, largest connected alpha component at alpha >= 8. '
                              'Normalize printed card geometry to a shared 5:7 size without upscaling, center on 320x448 transparent canvases. '
                              'WebP quality 92. No recoloring. Source paper, ranks, pips and courts are generated images.',
                'credit': 'AI-generated with 9Router GPT Image 2.5 Sunburst for this project.',
                'sources': sources, 'assets': assets, 'runtimeBytes': sum(a['bytes'] for a in assets.values())}
    manifest['preview'] = build_preview(assets)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'assets': len(assets), 'paintedSize': painted, 'runtimeBytes': manifest['runtimeBytes']}))


if __name__ == '__main__':
    main()
