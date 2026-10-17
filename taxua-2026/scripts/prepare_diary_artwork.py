"""Derive the diary's transparent material layers from preserved Sunburst masters.

No API calls. Requires Pillow and numpy; run from any directory after generating
the nine masters documented in docs/prompts/diary/revision_2/.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'figures/raw/diary/revision_2'
OUT = ROOT / 'figures/decor/painted/diary'
OUT.mkdir(parents=True, exist_ok=True)


def key_green(image):
    data = np.array(image.convert('RGBA'), dtype=np.float32)
    red, green, blue = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    strength = np.clip((green - np.maximum(red, blue) - 32) / 110, 0, 1)
    strength[green < 150] = 0
    data[:, :, 3] *= 1 - strength
    result = Image.fromarray(data.astype('uint8'), 'RGBA')
    # Remove a single chroma-fringed edge pixel; never modify the raw master.
    result.putalpha(result.getchannel('A').filter(ImageFilter.MinFilter(3)))
    return result


def hole_bounds(image):
    """Find the connected transparent opening containing the frame's center."""
    alpha = np.array(image.getchannel('A'))
    h, w = alpha.shape
    start = (w // 2, h // 2)
    assert alpha[start[1], start[0]] < 20, 'Photo opening must be transparent'
    stack, seen = [start], {start}
    while stack:
        x, y = stack.pop()
        for nx, ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and alpha[ny,nx] < 30:
                seen.add((nx,ny)); stack.append((nx,ny))
    xs, ys = zip(*seen)
    bounds = [min(xs), min(ys), max(xs)+1, max(ys)+1]
    assert bounds[0] > 0 and bounds[1] > 0 and bounds[2] < w and bounds[3] < h, 'Opening cannot join exterior'
    return bounds


def cloth_bounds(image):
    """Trim to the central ribbon, excluding fragments of adjacent atlas cells."""
    occupied = np.array(image.getchannel('A')) > 32
    h, w = occupied.shape
    start = (w // 2, h // 2)
    assert occupied[start[1], start[0]], 'Ribbon center must contain cloth'
    stack = [start]
    occupied[start[1], start[0]] = False
    left = right = start[0]
    top = bottom = start[1]
    while stack:
        x, y = stack.pop()
        left, right = min(left, x), max(right, x)
        top, bottom = min(top, y), max(bottom, y)
        for nx, ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if 0 <= nx < w and 0 <= ny < h and occupied[ny,nx]:
                occupied[ny,nx] = False
                stack.append((nx,ny))
    # Retain a small antialiased margin around the complete connected artwork.
    return (max(0,left-2), max(0,top-2), min(w,right+3), min(h,bottom+3))


def main():
    records = []
    for metadata in sorted(RAW.glob('*.json')):
        source = json.loads(metadata.read_text())
        master = ROOT / source['master']
        assert hashlib.sha256(master.read_bytes()).hexdigest() == source['master_sha256']
        image = key_green(Image.open(master))
        columns, rows = source['grid']
        # The three frame proportions differ, so the generated atlas uses
        # unequal columns. Detect its actual green gutters before cropping.
        frame_columns = []
        if metadata.stem == 'photo_frames':
            occupied = (np.array(image.getchannel('A')) > 200).sum(axis=0) > 8
            starts = np.flatnonzero(occupied & ~np.r_[False, occupied[:-1]])
            ends = np.flatnonzero(occupied & ~np.r_[occupied[1:], False]) + 1
            for left, right in zip(starts, ends):
                if frame_columns and left - frame_columns[-1][1] < 14:
                    frame_columns[-1][1] = int(right)
                else:
                    frame_columns.append([int(left), int(right)])
            frame_columns = sorted(sorted(frame_columns, key=lambda item: item[1]-item[0], reverse=True)[:3])
            assert len(frame_columns) == 3
        for index, name in enumerate(source['pieces']):
            col, row = index % columns, index // columns
            crop = (round(col*image.width/columns), round(row*image.height/rows), round((col+1)*image.width/columns), round((row+1)*image.height/rows))
            if frame_columns:
                left, right = frame_columns[index]
                crop = (max(0,left-3),0,min(image.width,right+3),image.height)
            piece = image.crop(crop)
            bbox = cloth_bounds(piece) if name.startswith('bookmark') else piece.getchannel('A').getbbox()
            assert bbox, name + ' is empty'
            piece = piece.crop(bbox)
            limit = (768,1024)
            # Keep native cloth detail for high-density tabs. The browser crops
            # their length at natural proportions; it never squashes the weave.
            if name.startswith('bookmark'): limit = (240,1024)
            elif name.startswith('frame'): limit = (700,700)
            elif name in ['binding','page_edges']: limit = (96,900)
            elif name.startswith(('tape','corners')): limit = (260,150)
            elif name in ['fern','clouds','flowers']: limit = (210,180)
            piece.thumbnail(limit, Image.Resampling.LANCZOS)
            target = OUT / (name + '.webp')
            piece.save(target, quality=90, method=6)
            record = {'name':name,'master':source['master'],'master_sha256':source['master_sha256'],'prompt':source['prompt'],'crop':list(crop),'trim':list(bbox),'derivative':str(target.relative_to(ROOT)),'size':list(piece.size),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
            if name.startswith('frame_'):
                record['photo_opening'] = hole_bounds(piece)
            records.append(record)
    assert len(records) == 29
    manifest = {'model':'cx/gpt-image-2.5-sunburst','reference':'figures/raw/diary/diary_cover.png','pipeline':'scripts/prepare_diary_artwork.py','processing':'Chroma-key green removal, one-pixel edge cleanup, grid crop and alpha trim (central connected cloth for bookmarks), bounded WebP derivative; original masters unchanged.','assets':records}
    (ROOT/'data/sources/diary-materials.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    css=['/* Generated material mapping; run scripts/prepare_diary_artwork.py. */']
    for record in records:
        name = record['name']
        if name.startswith('frame_'):
            x,y,r,b=record['photo_opening'];w,h=record['size']
            css.append('.diary-frame-'+name[6:]+' { --frame-art:url(\'./'+record['derivative']+'\'); --photo-left:'+str(round(x/w*100,3))+'%; --photo-top:'+str(round(y/h*100,3))+'%; --photo-width:'+str(round((r-x)/w*100,3))+'%; --photo-height:'+str(round((b-y)/h*100,3))+'%; --caption-top:'+str(round(b/h*100+1,3))+'%; }')
    (ROOT/'diary-materials.css').write_text('\n'.join(css)+'\n')
    print(f'{len(records)} transparent layers derived; {sum((ROOT/r["derivative"]).stat().st_size for r in records):,} bytes total.')


if __name__ == '__main__':
    main()
