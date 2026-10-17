"""Prepare the Sunburst pig, aligned foreground occluder and minted gold coin."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verified_source(record):
    source = ROOT / record['source']
    assert record['model'] == 'cx/gpt-image-2.5-sunburst'
    assert sha(source) == record['sourceSha256'], 'Generated master changed'
    if record.get('promptSha256'):
        assert sha(ROOT / record['prompt']) == record['promptSha256'], 'Prompt changed'
    for ref in record['referenceImages']:
        assert sha(ROOT / ref['path']) == ref['sha256'], 'Reference changed'
    return source


def main():
    record = json.loads((ROOT / 'figures/raw/playful/generation.json').read_text())
    source = verified_source(record)
    image = Image.open(source).convert('RGBA')
    pixels = np.array(image)
    pixels[pixels[:, :, 3] < 8] = 0
    image = Image.fromarray(pixels)
    bounds = image.getchannel('A').point(lambda a: 255 if a >= 24 else 0).getbbox()
    assert bounds
    crop = image.crop(bounds)
    ratio = min(472 / crop.width, 472 / crop.height, 1)
    size = tuple(round(side * ratio) for side in crop.size)
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    offset = ((512 - size[0]) // 2, (512 - size[1]) // 2)
    canvas = Image.new('RGBA', (512, 512))
    canvas.alpha_composite(crop, offset)
    # Measured center of the dark slit in the returned 1254px painting.
    slot = ((730 - bounds[0]) * ratio + offset[0],
            (288 - bounds[1]) * ratio + offset[1])
    foreground = np.array(canvas)
    y, x = np.indices((512, 512))
    # The same source pixels conceal the entering coin below the slit. Feather
    # only one derivative pixel; there is no independent/repainted second pig.
    coverage = np.clip(y - slot[1] - .21 * (x - slot[0]) + .5, 0, 1)
    foreground[:, :, 3] = np.round(foreground[:, :, 3] * coverage).astype('uint8')
    folder = ROOT / 'figures/decor/painted/playful'
    folder.mkdir(parents=True, exist_ok=True)
    outputs = []
    coin_record = json.loads((ROOT / 'figures/raw/playful/coin_generation.json').read_text())
    coin_source = verified_source(coin_record)
    coin_pixels = np.array(Image.open(coin_source).convert('RGBA'))
    coin_pixels[coin_pixels[:, :, 3] < 8] = 0
    coin_image = Image.fromarray(coin_pixels)
    coin_bounds = coin_image.getchannel('A').point(lambda a: 255 if a >= 24 else 0).getbbox()
    assert coin_bounds, 'Coin has no visible artwork'
    coin_crop = coin_image.crop(coin_bounds)
    coin_ratio = min(116 / coin_crop.width, 116 / coin_crop.height, 1)
    coin_size = tuple(round(side * coin_ratio) for side in coin_crop.size)
    coin_crop = coin_crop.resize(coin_size, Image.Resampling.LANCZOS)
    coin = Image.new('RGBA', (128, 128))
    coin.alpha_composite(coin_crop, ((128 - coin_size[0]) // 2, (128 - coin_size[1]) // 2))
    for name, artwork in [('pig_body', canvas), ('pig_front', Image.fromarray(foreground)), ('toy_coin', coin)]:
        output = folder / (name + '.webp')
        artwork.save(output, 'WEBP', quality=93, method=6)
        outputs.append({'src': str(output.relative_to(ROOT)), 'size': list(artwork.size),
                        'bytes': output.stat().st_size, 'sha256': sha(output)})
    manifest = {**record, 'processing': 'Clear alpha below 8, trim at alpha 24; fit within 472px on matching 512px canvases without upscaling or recoloring. Foreground is an alpha mask of the same normalized pig below the measured slot line.',
                'trim': list(bounds), 'paintedSize': list(size),
                'slotSource': [730, 288], 'slot': [round(v, 3) for v in slot],
                'slotPercent': [round(v / 512 * 100, 3) for v in slot],
                'slotSlope': .21, 'outputs': outputs,
                'coinArtwork': {**coin_record,
                                'processing': 'Clear alpha below 8, trim at alpha 24; fit within 116px on a centered 128px transparent canvas without upscaling or recoloring.',
                                'trim': list(coin_bounds), 'paintedSize': list(coin_size)}}
    (ROOT / 'data/sources/playful-artwork.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'slotPercent': manifest['slotPercent'], 'outputs': outputs}))


if __name__ == '__main__':
    main()
