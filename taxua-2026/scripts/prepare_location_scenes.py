"""Verify preserved Sunburst masters and prepare local scenery derivatives."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter,ImageChops
ROOT=Path(__file__).resolve().parents[1]
NAMES=['ridge','tree','dolphin','meadow','waterfall','coffee']
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--partial',action='store_true');args=parser.parse_args();records=[]
 for name in NAMES:
  for role,size,folder in [('wide',None,'figures/scenery/locations'),('portrait',None,'figures/scenery/locations'),('foreground',(720,720),'figures/scenery/locations'),('sticker',(176,176),'figures/decor/painted/location_stickers')]:
   source=ROOT/'figures/raw/location_scenes'/('ridge' if name=='ridge' else 'text_only/'+name)/('candidate_b.png' if name=='ridge' and role=='wide' else role+'.png')
   if not source.exists():
    if args.partial:continue
    raise FileNotFoundError(source)
   record=json.loads(source.with_suffix('.json').read_text());assert record['model']=='cx/gpt-image-2.5-sunburst';assert digest(source)==record['sha256']
   assert digest(ROOT/record['promptPath'])==record['promptSha256']
   if name!='ridge':assert not record['references'],f'Prompt-only source has references: {source}'
   for ref in record['references']:assert digest(ROOT/ref['path'])==ref['sha256']
   im=Image.open(source);im.load();trim=None
   if role in ['foreground','sticker']:
    assert im.mode=='RGBA',source
    alpha=im.getchannel('A');assert alpha.getextrema()[0]==0 and alpha.getextrema()[1]>200,source
    trim=alpha.getbbox();im=im.crop(trim)
   if size:im.thumbnail(size if name=='ridge' else (1440,1440) if role=='foreground' else (352,352),Image.Resampling.LANCZOS)
   output=ROOT/folder/(name+'.webp' if role=='sticker' else name+'_'+role+'.webp');output.parent.mkdir(parents=True,exist_ok=True)
   if role in ['wide','portrait'] or name!='ridge':
    im.save(output,'WEBP',lossless=True,exact=True,method=6)
    decoded=Image.open(output);decoded.load();difference=ImageChops.difference(im.convert('RGBA'),decoded.convert('RGBA'))
    if decoded.size!=im.size or any(channel.getbbox() for channel in difference.split()):raise ValueError(f'Lossless background mismatch: {output}')
    encoding='webp-lossless'
   else:
    im.save(output,'WEBP',quality=90,method=6);encoding='webp-q90'
   records.append({'location':name,'role':role,'source':str(source.relative_to(ROOT)),'sourceSha256':digest(source),'trim':trim,'output':str(output.relative_to(ROOT)),'dimensions':list(im.size),'encoding':encoding,'sha256':digest(output),'bytes':output.stat().st_size})
 for name,sourceName,size in [('birds','text_only/effects/birds',(160,100)),('water_glints','text_only/effects/water_glints',(640,220)),('spray','text_only/effects/spray',(640,240)),('mist','text_only/effects/mist',(1200,600))]:
  source=ROOT/'figures/raw/location_scenes'/f'{sourceName}.png'
  if not source.exists():
   if args.partial:continue
   raise FileNotFoundError(source)
  record=json.loads(source.with_suffix('.json').read_text())
  assert digest(source)==record['sha256'] and digest(ROOT/record['promptPath'])==record['promptSha256']
  assert not record['references'],f'Prompt-only effect has references: {source}'
  im=Image.open(source);assert im.mode=='RGBA';alpha=im.getchannel('A');assert alpha.getextrema()[0]==0
  trim=alpha.getbbox();im=im.crop(trim);im.thumbnail(size,Image.Resampling.LANCZOS)
  output=ROOT/'figures/scenery/locations'/f'{name}.webp';im.save(output,'WEBP',lossless=True,exact=True,method=6)
  records.append({'location':'shared' if name!='spray' else 'waterfall','role':name,'source':str(source.relative_to(ROOT)),'sourceSha256':digest(source),'trim':trim,'output':str(output.relative_to(ROOT)),'dimensions':list(im.size),'encoding':'webp-lossless','sha256':digest(output),'bytes':output.stat().st_size})
 # Extract only authored white water; the landmark/background remains rigid.
 for role,points in [
  ('wide',[(.738,.321),(.767,.328),(.749,.419),(.721,.466),(.749,.49),(.72,.564),(.71,.625),(.69,.722),(.708,.767),(.63,.79),(.612,.764),(.646,.706),(.652,.65),(.671,.595),(.689,.55),(.69,.513),(.667,.489),(.689,.444),(.71,.401),(.724,.36)]),
  ('portrait',[(.73,.396),(.767,.404),(.745,.444),(.713,.471),(.759,.477),(.717,.512),(.675,.54),(.662,.588),(.684,.607),(.689,.665),(.659,.737),(.705,.817),(.53,.827),(.51,.793),(.55,.722),(.565,.681),(.562,.632),(.528,.609),(.551,.576),(.594,.551),(.602,.519),(.638,.505),(.665,.487),(.65,.467),(.688,.444),(.692,.419)])
 ]:
  source=ROOT/'figures/raw/location_scenes/text_only/waterfall'/(role+'.png')
  if not source.exists():
   if args.partial:continue
   raise FileNotFoundError(source)
  im=Image.open(source).convert('RGBA');mask=Image.new('L',im.size);ImageDraw.Draw(mask).polygon([(int(x*im.width),int(y*im.height)) for x,y in points],fill=255)
  light=im.convert('L').point(lambda v:max(0,min(150,(v-175)*2)))
  im.putalpha(ImageChops.multiply(mask.filter(ImageFilter.GaussianBlur(3)),light))
  # Do not transmit a second full painting as invisible RGB outside the flow mask.
  im.paste((0,0,0,0),(0,0),im.getchannel('A').point(lambda value:255 if value==0 else 0))
  # Preserve exact base geometry so the moving water aligns at every aspect ratio.
  output=ROOT/'figures/scenery/locations'/f'waterfall_flow_{role}.webp';im.save(output,'WEBP',lossless=True,exact=True,method=6)
  records.append({'location':'waterfall','role':'flow-'+role,'source':str(source.relative_to(ROOT)),'sourceSha256':digest(source),'process':'Luminance-selected water inside authored normalized polygon; feather 3px; alpha capped 150; zero RGB only where alpha is zero','polygon':points,'output':str(output.relative_to(ROOT)),'dimensions':list(im.size),'encoding':'webp-lossless','sha256':digest(output),'bytes':output.stat().st_size})
 manifest=ROOT/'data/sources/location-scenes.json';manifest.write_text(json.dumps({'model':'cx/gpt-image-2.5-sunburst','illustrative':True,'outputs':records},ensure_ascii=False,indent=2)+'\n')
 print(f'{len(records)} verified derivatives; {sum(r["bytes"] for r in records):,} bytes')
if __name__=='__main__':main()
