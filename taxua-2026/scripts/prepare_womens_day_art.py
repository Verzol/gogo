"""Preserve Sunburst masters (--generate), then prepare local festive WebPs.
Run from taxua-2026; requires Pillow. Credentials are never saved.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import io
import json
import os
from pathlib import Path
import urllib.request

from PIL import Image
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
JOBS = ROOT / 'docs/prompts/womens_day/jobs.json'
RAW = ROOT / 'figures/raw/womens_day'
OUT = ROOT / 'figures/decor/painted/womens_day'


def digest(raw):
  return hashlib.sha256(raw).hexdigest()


def generate(job):
  target = RAW / (job['name'] + '.png')
  if target.exists():
    print('Preserved existing master:', job['name'], flush=True)
    return
  body = {'model': 'cx/gpt-image-2.5-sunburst', 'prompt': job['prompt'],
          'size': job['size'], 'quality': 'high', 'output_format': 'png'}
  if job.get('transparent'):
    body['background'] = 'transparent'
  headers = {'Content-Type': 'application/json'}
  if os.getenv('NINEROUTER_KEY'):
    headers['Authorization'] = 'Bearer ' + os.environ['NINEROUTER_KEY']
  request = urllib.request.Request(
    os.environ['NINEROUTER_URL'].rstrip('/') + '/v1/images/generations?response_format=binary',
    data=json.dumps(body).encode(), headers=headers)
  with urllib.request.urlopen(request, timeout=420) as response:
    raw = response.read()
  image = Image.open(io.BytesIO(raw))
  image.load()
  assert image.format == 'PNG', 'Expected preserved PNG master'
  record = {'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'model': body['model'], 'request': body, 'references': [],
            'output': str(target.relative_to(ROOT)), 'dimensions': list(image.size),
            'sha256': digest(raw), 'bytes': len(raw), 'mode': image.mode}
  with target.open('xb') as file:
    file.write(raw)
  target.with_suffix('.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
  print('Generated:', job['name'], image.size, image.mode, flush=True)


def prepare():
  OUT.mkdir(parents=True, exist_ok=True)
  outputs = []
  for job in json.loads(JOBS.read_text()):
    source = RAW / (job['name'] + '.png')
    record = json.loads(source.with_suffix('.json').read_text())
    assert digest(source.read_bytes()) == record['sha256'], 'Master changed'
    assert record['request']['prompt'] == job['prompt'], 'Prompt changed'
    assert record['model'] == 'cx/gpt-image-2.5-sunburst' and record['references'] == []
    image = Image.open(source).convert('RGBA')
    if job['name'] != 'flowers_sheet':
      pieces = [(job['name'], image, None)]
    else:
      assert image.getchannel('A').getextrema()[0] == 0, 'Sheet needs true alpha'
      names = ['bouquet', 'flower_mi', 'flower_thao', 'flower_linh', 'petal_1', 'petal_2']
      pieces = []
      for index, name in enumerate(names):
        col, row = index % 3, index // 3
        box = (round(col * image.width / 3), round(row * image.height / 2),
               round((col + 1) * image.width / 3), round((row + 1) * image.height / 2))
        piece = image.crop(box)
        # Remove disconnected generation dust outside the complete painted subject.
        pixels = np.array(piece)
        labels, count = ndimage.label(pixels[:, :, 3] > 20)
        assert count, name + ' is empty'
        sizes = np.bincount(labels.ravel());sizes[0] = 0
        keep = ndimage.binary_dilation(labels == sizes.argmax(), iterations=3)
        pixels[~keep] = 0
        piece = Image.fromarray(pixels)
        alpha = piece.getchannel('A')
        bounds = alpha.point(lambda value: 255 if value > 20 else 0).getbbox()
        assert bounds, name + ' is empty'
        piece = piece.crop(bounds)
        limit = 256 if index == 0 else 64 if index > 3 else 160
        piece.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        padded = Image.new('RGBA', (piece.width + 16, piece.height + 16))
        padded.paste(piece, (8, 8))
        pieces.append((name, padded, list(box)))
    for name, piece, box in pieces:
      target = OUT / (name + '.webp')
      if name.startswith('landscape'):
        piece = piece.convert('RGB')
      piece.save(target, 'WEBP', quality=90, method=6, exact=True)
      outputs.append({'path': str(target.relative_to(ROOT)), 'source': str(source.relative_to(ROOT)),
                      'sourceSha256': record['sha256'], 'crop': box, 'dimensions': list(piece.size),
                      'sha256': digest(target.read_bytes()), 'bytes': target.stat().st_size})
  manifest = {'model': 'cx/gpt-image-2.5-sunburst', 'purpose': 'Illustrative 20 October trip keepsake',
              'jobs': str(JOBS.relative_to(ROOT)), 'outputs': outputs}
  (ROOT / 'data/sources/womens-day-artwork.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
  print('Prepared', len(outputs), 'WebPs;', sum(item['bytes'] for item in outputs), 'bytes')


if __name__ == '__main__':
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument('--generate', action='store_true')
  options = parser.parse_args()
  if options.generate:
    RAW.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
      list(pool.map(generate, json.loads(JOBS.read_text())))
  prepare()
