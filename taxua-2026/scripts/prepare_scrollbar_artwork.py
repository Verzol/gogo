"""Prepare cloud-only handles from the existing paired watercolor stickers.

Requires Pillow, NumPy and SciPy. Run from any directory.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw/scrollbar'
OUTPUT = ROOT / 'figures/decor/painted'
SOURCES = {phase: ROOT / f'figures/decor/cloud_1_{phase}.png'
           for phase in ('day', 'night')}
# Each three-stop pigment palette maps shadows, midtones and highlights.
# New scrollbar derivatives only; the supplied cloud masters stay unchanged.
PALETTES = {
    'predawn': ('night', ('#445f90', '#a2acd5', '#e3e4fa')),
    'dawn': ('day', ('#4c8e8a', '#dfc9ab', '#fff0cc')),
    'morning': ('day', ('#356d61', '#a6cbb1', '#f2f5cf')),
    'noon': ('day', ('#43849a', '#b9e0e5', '#f8ffff')),
    'afternoon': ('day', ('#935865', '#e9b18a', '#fff2cd')),
    'evening': ('night', ('#6c557e', '#c4a0b7', '#fbe0d5')),
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare():
    record = json.loads((RAW / 'generation.json').read_text())
    assert sha256(ROOT / record['path']) == record['sha256'], 'Archived generated master has changed'
    assets = {}
    sources = {}
    for phase in ('day', 'night', *PALETTES):
        base, palette = PALETTES.get(phase, (phase, None))
        source = SOURCES[base]
        image = Image.open(source).convert('RGBA')
        sources[phase] = {'path': source.relative_to(ROOT).as_posix(),
                          'sha256': sha256(source), 'size': list(image.size)}
        pixels = np.array(image)
        labels, _ = ndimage.label(pixels[:, :, 3] >= 8)
        sizes = np.bincount(labels.ravel())
        sizes[0] = 0
        pixels[labels != sizes.argmax(), 3] = 0
        pixels[pixels[:, :, 3] == 0, :3] = 0
        cutout = Image.fromarray(pixels)
        bounds = cutout.getbbox()
        cutout = cutout.crop(bounds)
        scale = min(1, 144 / cutout.width, 112 / cutout.height)
        size = tuple(round(value * scale) for value in cutout.size)
        cutout = cutout.resize(size, Image.Resampling.LANCZOS)
        if palette:
            pigment = np.array(cutout).astype(float)
            luminance = pigment[:, :, :3] @ np.array([.2126, .7152, .0722]) / 255
            stops = np.array([tuple(bytes.fromhex(color[1:])) for color in palette])
            for channel in range(3):
                toned = np.interp(luminance, [0, .58, 1], stops[:, channel])
                pigment[:, :, channel] = pigment[:, :, channel] * .15 + toned * .85
            cutout = Image.fromarray(np.clip(pigment, 0, 255).astype('uint8'))
        canvas = Image.new('RGBA', (160, 128))
        canvas.alpha_composite(cutout, ((160-size[0])//2, (128-size[1])//2))
        target = OUTPUT / f'scrollbar_cloud_{phase}.webp'
        canvas.save(target, 'WEBP', quality=92, method=6)
        assets[phase] = {'path': target.relative_to(ROOT).as_posix(),
                         'sha256': sha256(target), 'bytes': target.stat().st_size,
                         'alphaBoundsInSource': list(bounds),
                         'sourcePhase': base, 'pigmentPalette': palette,
                         'size': list(canvas.size), 'paintedSize': list(size)}
    manifest = {'title': 'Sợi mây watercolor scrollbar handles',
                'credit': 'Reuses the project supplied paired watercolor cloud stickers; see docs/identity.md and docs/prompts/stickers.md.',
                'sources': sources,
                'archivedGeneration': record,
                'processing': 'Largest alpha component at alpha >= 8; downsample without upscaling; transparent 160x128 canvas; WebP quality 92. Day/night retain original pigment. Six additional scrollbar-only palettes map luminance to three pigment stops with 15% original color retained; alpha and texture preserved. Supplied paired sticker sources and archived ribbon sheet unchanged.',
                'assets': assets}
    (ROOT / 'data/sources/scrollbar-artwork.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'Prepared {len(assets)} cloud palettes: {sum(a["bytes"] for a in assets.values())} runtime bytes')


if __name__ == '__main__':
    prepare()
