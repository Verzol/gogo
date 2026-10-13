"""Split the night sheet and normalize day/night WebP pairs for equal visual size.

One-off asset utility, not a website/build dependency. Requires Pillow, NumPy,
and SciPy. Run from any directory: python3 scripts/extract_night_stickers.py
"""
from pathlib import Path
from math import ceil, sqrt

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'figures/raw/Watercolor Adventure Sticker Collection Night.png'
OUTPUT = ROOT / 'figures/decor'
MARGIN = 5
# Centers identify subjects independently of connected-component numbering.
CENTERS = {
    'cloud_1': (190, 210),
    'cloud_2': (580, 220),
    'dino_ridge': (970, 240),
    'dolphin_rock': (1350, 240),
    'lone_tree': (210, 550),
    'peach_branch': (560, 550),
    'shan_tea': (920, 550),
    'tao_meo': (1360, 560),
    'pork_skewer': (330, 850),
    'black_chicken': (700, 850),
    'mountain_sky': (1160, 850),
}


def visible_size(image):
    """Measure solid artwork, rather than its transparent canvas or faint halo."""
    alpha = np.array(image)[:, :, 3]
    ys, xs = np.where(alpha > 128)
    if not len(xs):
        raise ValueError('Sticker has no opaque artwork')
    return int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)


def save_webp_pair(name, night):
    day = Image.open(OUTPUT / f'{name}_day.png').convert('RGBA')
    day_size, night_size = visible_size(day), visible_size(night)
    day_art, night_art = day.crop(day.getbbox()), night.crop(night.getbbox())
    # Equal bounding-box area balances width and height differences between the
    # two drawings. A uniform scale preserves the night illustration's proportions.
    scale = sqrt((day_size[0] * day_size[1]) / (night_size[0] * night_size[1]))
    night_art = night_art.resize(
        (round(night_art.width * scale), round(night_art.height * scale)),
        Image.Resampling.LANCZOS)
    # Both WebPs share one canvas and aspect ratio, so width-limited decorations,
    # height-limited cards and object-fit thumbnails all keep the same sizing.
    # Expand only enough to retain both complete outlines and a small safe margin.
    frame_scale = max(
        (max(day_art.width, night_art.width) + 2 * MARGIN) / day.width,
        (max(day_art.height, night_art.height) + 2 * MARGIN) / day.height)
    canvas_size = (ceil(day.width * frame_scale), ceil(day.height * frame_scale))
    for mode, art in [('day', day_art), ('night', night_art)]:
        frame = Image.new('RGBA', canvas_size)
        frame.paste(art, ((frame.width - art.width) // 2, (frame.height - art.height) // 2))
        frame.save(OUTPUT / f'{name}_{mode}.webp', quality=86, method=6)
    return canvas_size


def main():
    pixels = np.array(Image.open(SOURCE).convert('RGBA'))
    alpha = pixels[:, :, 3]
    labels, _ = ndimage.label(alpha > 128)
    distance, nearest = ndimage.distance_transform_edt(
        labels == 0, return_indices=True)
    nearest_labels = labels[tuple(nearest)]
    selected = set()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, (x, y) in CENTERS.items():
        component = int(labels[y, x])
        if not component or component in selected:
            raise ValueError(f'Invalid or duplicate subject center: {name}')
        selected.add(component)
        # Retain anti-aliased alpha around this subject only. A rectangular crop
        # alone would pick up fragments of adjacent stickers in this tight sheet.
        mask = (nearest_labels == component) & (distance <= 4) & (alpha > 8)
        ys, xs = np.where(mask)
        box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        left, top, right, bottom = box
        cut = pixels[top:bottom, left:right].copy()
        cut[~mask[top:bottom, left:right]] = 0
        sticker = Image.fromarray(cut)
        padded = Image.new('RGBA', (sticker.width + 2 * MARGIN, sticker.height + 2 * MARGIN))
        padded.paste(sticker, (MARGIN, MARGIN))
        base = OUTPUT / f'{name}_night'
        padded.save(base.with_suffix('.png'), optimize=True)
        canvas_size = save_webp_pair(name, padded)
        print(f'{name}: PNG {padded.size}, paired WebP {canvas_size}, source bounds {box}')


if __name__ == '__main__':
    main()
