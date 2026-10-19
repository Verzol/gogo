"""Generate review mockups via the explicitly requested 9Router Sunburst model.
References must already exist under figures/raw/ui_concepts/references/.
Existing outputs are protected: choose a different output folder for another run.
"""
import base64
import concurrent.futures
import datetime
import hashlib
import io
import json
import os
from pathlib import Path
import urllib.request
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'figures/raw/ui_concepts'
MODEL = 'cx/gpt-image-2.5-sunburst'
JOBS = [
  ('01_ban_dan_ky_niem', ['site_hero.png', 'postcard_studio.png']),
  ('02_ven_may', ['site_hero.png', 'cloud_reveal.png', '../../../places/p01_960.webp']),
  ('03_cham_ho_rung_cay', ['site_hero.png', 'lake_tree.png']),
]

def generate(job):
  name, references = job
  output = DEST / (name + '.png')
  if output.exists():
    raise FileExistsError(f'Preserving existing concept: {output}')
  prompt_path = ROOT / 'docs/prompts/ui_concepts' / (name + '.txt')
  prompt = prompt_path.read_text().strip()
  images, records = [], []
  for ref in references:
    source = (DEST / 'references' / ref).resolve()
    raw = source.read_bytes()
    with Image.open(io.BytesIO(raw)) as image:
      image = image.convert('RGB')
      image.thumbnail((1440, 1000))
      encoded = io.BytesIO()
      image.save(encoded, 'JPEG', quality=88)
    images.append('data:image/jpeg;base64,' + base64.b64encode(encoded.getvalue()).decode())
    records.append({'path':str(source.relative_to(ROOT)), 'sha256':hashlib.sha256(raw).hexdigest()})
  body = {'model':MODEL, 'prompt':prompt, 'size':'1536x1024', 'quality':'high', 'output_format':'png', 'images':images}
  headers = {'Content-Type':'application/json'}
  if os.getenv('NINEROUTER_KEY'):
    headers['Authorization'] = 'Bearer ' + os.environ['NINEROUTER_KEY']
  request = urllib.request.Request(os.environ['NINEROUTER_URL'].rstrip('/') + '/v1/images/generations?response_format=binary', data=json.dumps(body).encode(), headers=headers)
  with urllib.request.urlopen(request, timeout=360) as response:
    raw = response.read()
  with Image.open(io.BytesIO(raw)) as image:
    image.load()
    dimensions = list(image.size)
    if image.format != 'PNG':
      raise ValueError('Expected PNG response')
  output.write_bytes(raw)
  record = {'model':MODEL, 'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'purpose':'Review-only UI concept; generated interpretation, not a runtime screenshot or documentary photo', 'promptPath':str(prompt_path.relative_to(ROOT)), 'promptSha256':hashlib.sha256(prompt_path.read_bytes()).hexdigest(), 'prompt':prompt, 'references':records, 'request':{k:v for k,v in body.items() if k != 'images'}, 'referenceEncoding':'JPEG quality 88, contained within 1440x1000, no upscaling', 'output':str(output.relative_to(ROOT)), 'dimensions':dimensions, 'sha256':hashlib.sha256(raw).hexdigest(), 'bytes':len(raw)}
  output.with_suffix('.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
  print(name, dimensions, len(raw), flush=True)

if __name__ == '__main__':
  # Independent generation requests write distinct output and provenance files.
  with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(generate, JOBS))
