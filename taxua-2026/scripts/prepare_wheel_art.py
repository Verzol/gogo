"""Extract the user-supplied wheel sheet without altering or upscaling it."""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw/illustrated_scenery/wheel_component_sheet.png'
UPLOAD = ROOT / 'figures/raw/Watercolor Landscape Asset Sheet.png'
OUTPUT = ROOT / 'figures/decor/painted'
CROPS = {
    'wheel_rim': (0, 0, 720, 680),
    'wheel_pointer': (760, 100, 1200, 650),
    'wheel_hub': (40, 680, 650, 1254),
}


def main():
    if UPLOAD.exists():
        if RAW.exists():
            raise FileExistsError(f'Preserve both originals; already exists: {RAW}')
        RAW.parent.mkdir(parents=True, exist_ok=True)
        UPLOAD.rename(RAW)
    sheet = Image.open(RAW).convert('RGBA')
    records = []
    for name, box in CROPS.items():
        pixels = np.array(sheet.crop(box))
        labels, _ = ndimage.label(pixels[:, :, 3] > 8)
        sizes = np.bincount(labels.ravel())
        sizes[0] = 0
        # Discard detached alpha flecks, retaining the complete painted object.
        pixels[labels != sizes.argmax(), 3] = 0
        cutout = Image.fromarray(pixels)
        bounds = cutout.getbbox()
        cutout = cutout.crop(bounds)
        width, height = cutout.size
        canvas_size = (max(width, height) + 16,) * 2 if name != 'wheel_pointer' else (width + 16, height + 16)
        canvas = Image.new('RGBA', canvas_size)
        canvas.alpha_composite(cutout, ((canvas.width - width) // 2, (canvas.height - height) // 2))
        OUTPUT.mkdir(parents=True, exist_ok=True)
        canvas.save(OUTPUT / f'{name}.png', optimize=True)
        canvas.save(OUTPUT / f'{name}.webp', quality=90, method=6)
        records.append({'name': name, 'crop': box, 'trim': bounds, 'width': canvas.width,
                        'height': canvas.height, 'src': f'figures/decor/painted/{name}.webp'})
    manifest = {'source': str(RAW.relative_to(ROOT)),
                'originalFilename': UPLOAD.name,
                'sha256': hashlib.sha256(RAW.read_bytes()).hexdigest(),
                'sourceSize': list(sheet.size),
                'credit': 'User-supplied generated artwork for this project.',
                'processing': 'Measured crops; largest connected alpha component; centered transparent padding; no upscaling.',
                'components': records}
    (ROOT / 'data/sources/wheel-art.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(records, indent=2))


if __name__ == '__main__':
    main()
