"""Generate preserved Sunburst masters from a JSON job list.
Usage: python3 -B scripts/generate_location_art.py /path/to/jobs.json
Uses NINEROUTER_URL and optional NINEROUTER_KEY; never stores credentials.
Existing masters are preserved. See docs/location-scenes.md for the job format.
"""
import os,json,base64,urllib.request,hashlib,datetime,io,sys,concurrent.futures
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def generate(job):
 name=job['name'];out=ROOT/'figures/raw/location_scenes'/f'{name}.png';out.parent.mkdir(parents=True,exist_ok=True)
 if out.exists(): return print('EXISTS',name,flush=True)
 refs=[];images=[]
 for path in job.get('refs',[]):
  p=ROOT/path;raw=p.read_bytes();im=Image.open(io.BytesIO(raw)).convert('RGB');im.thumbnail((1440,1100));b=io.BytesIO();im.save(b,'JPEG',quality=88)
  images.append('data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode());refs.append({'path':path,'sha256':hashlib.sha256(raw).hexdigest()})
 body={'model':'cx/gpt-image-2.5-sunburst','prompt':job['prompt'],'size':job.get('size','1536x1024'),'quality':'high','output_format':'png'}
 if images:body['images']=images
 if job.get('transparent'):body['background']='transparent'
 prompt=ROOT/'docs/prompts/location_scenes'/f'{name.replace("/","_")}.txt';prompt.parent.mkdir(parents=True,exist_ok=True);prompt.write_text(job['prompt']+'\n')
 h={'Content-Type':'application/json'}
 if os.getenv('NINEROUTER_KEY'):h['Authorization']='Bearer '+os.environ['NINEROUTER_KEY']
 req=urllib.request.Request(os.environ['NINEROUTER_URL'].rstrip('/')+'/v1/images/generations?response_format=binary',data=json.dumps(body).encode(),headers=h)
 with urllib.request.urlopen(req,timeout=420) as r:raw=r.read()
 im=Image.open(io.BytesIO(raw));im.load();assert im.format=='PNG';out.write_bytes(raw)
 rec={'model':body['model'],'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'purpose':job.get('purpose','Generated illustrative location scene, not documentary photography'),'prompt':job['prompt'],'promptPath':str(prompt.relative_to(ROOT)),'promptSha256':hashlib.sha256(prompt.read_bytes()).hexdigest(),'references':refs,'referenceEncoding':'JPEG quality 88 contained within 1440x1100, no upscaling' if refs else None,'request':{k:v for k,v in body.items() if k!='images'},'output':str(out.relative_to(ROOT)),'dimensions':list(im.size),'mode':im.mode,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
 out.with_suffix('.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2)+'\n');print('DONE',name,list(im.size),im.mode,flush=True)
if __name__=='__main__':
 jobs=json.loads(Path(sys.argv[1]).read_text())
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  results=list(pool.map(generate,jobs))
