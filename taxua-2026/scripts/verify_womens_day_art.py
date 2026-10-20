"""Verify native Sunburst replacements retain every source pixel in the browser asset."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'data/sources/womens-day-artwork.json').read_text())
outputs = {item['path']: item for item in manifest['outputs']}
jobs = [job for job in json.loads((ROOT / 'docs/prompts/womens_day/jobs.json').read_text()) if job.get('lossless')]
assert len(jobs) == 6, 'Need an independent wide and portrait painting for each recipient'

for job in jobs:
  source = ROOT / 'figures/raw/womens_day' / (job['name'] + '.png')
  target = ROOT / 'figures/decor/painted/womens_day' / (job['name'] + '.webp')
  record = json.loads(source.with_suffix('.json').read_text())
  output = outputs[str(target.relative_to(ROOT))]
  original, derivative = Image.open(source).convert('RGB'), Image.open(target).convert('RGB')
  assert original.size == derivative.size, 'Must use the complete native image, without resizing or cropping'
  assert list(original.size) == record['dimensions'] == output['dimensions']
  assert all(actual >= minimum for actual, minimum in zip(original.size, job['minimumSize']))
  ratio = 16 / 9 if job['name'].endswith('_wide') else 2 / 3
  assert abs(original.width / original.height - ratio) < .02, 'Wrong aspect ratio'
  assert np.array_equal(np.asarray(original), np.asarray(derivative)), 'Runtime encoding lost source pixels'
  assert output['encoding'] == 'lossless' and output['crop'] is None
  assert hashlib.sha256(source.read_bytes()).hexdigest() == record['sha256'] == output['sourceSha256']
  assert hashlib.sha256(target.read_bytes()).hexdigest() == output['sha256']
  assert record['model'] == 'cx/gpt-image-2.5-sunburst'
  assert record['request']['prompt'] == job['prompt']
  reference = ROOT / job['reference']
  assert record['references'] == [{'path': job['reference'], 'sha256': hashlib.sha256(reference.read_bytes()).hexdigest()}]
  print('PASS', job['name'], original.size, 'pixel-exact lossless WebP')

print('PASS all six native Sunburst backgrounds; no cropping, resizing or compression loss')
