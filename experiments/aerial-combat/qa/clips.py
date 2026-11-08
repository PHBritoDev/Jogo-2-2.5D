"""Inspect actual GLB clips, not gameplay. Requires Playwright, Pillow, Chromium.
Run from repository root with a local HTTP server (default localhost:4173).
Evidence is static samples of native animations; not an Android FPS benchmark.
"""
import asyncio,json,os,subprocess,base64
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image,ImageDraw
OUT=Path(os.environ.get('AERIAL_CLIP_OUTPUT','aerial-results/clips'))
URL=os.environ.get('VISUAL_BASE_URL','http://127.0.0.1:4173')
async def main():
 OUT.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as p:
  opts=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
  if os.environ.get('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY'],'bypass':'localhost,127.0.0.1'}
  b=await p.chromium.launch(**opts)
  page=await b.new_page(viewport={'width':960,'height':600},ignore_https_errors=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_default_timeout(120000)
  await page.goto(URL+'/experiments/aerial-combat/qa/clips.html',wait_until='domcontentloaded')
  await page.wait_for_function('window.AerialModelPreview?.ready')
  report=await page.evaluate('({file:AerialModelPreview.file,clips:AerialModelPreview.clips,raw:AerialModelPreview.raw,scale:AerialModelPreview.scale,loadMs:AerialModelPreview.loadMs,renderer:AerialModelPreview.renderer})')
  report['clone']=await page.evaluate('AerialModelPreview.cloneCheck()');report['samples']=[]
  for i,c in enumerate(report['clips']):
   frames=[]
   for j,f in enumerate([0,.25,.5,.75,.999]):
    d=await page.evaluate('([n,t])=>AerialModelPreview.pose(n,t,.4)',[c['name'],c['duration']*f]);report['samples'].append(d)
    path=OUT/f'clip-{i:02}-{j}.png';await page.screenshot(path=str(path));frames.append(path)
   strip=Image.new('RGB',(1600,200),'#202020');draw=ImageDraw.Draw(strip)
   for j,png in enumerate(frames):
    im=Image.open(png).convert('RGB');im.thumbnail((320,200));strip.paste(im,(j*320,0))
   strip.save(OUT/f'clip-{i:02}-strip.jpg',quality=90)
   print(c['name'],flush=True)
  for angle,name in [(0,'front'),(1.5708,'side'),(3.14159,'back')]:
   await page.evaluate('a=>AerialModelPreview.pose("_01a1b3e4_6f0c_705b_82f5_e9447d85cbef",0,a)',angle)
   await page.screenshot(path=str(OUT/f'{name}.png'))
  pixels=[]
  for png in sorted(OUT.glob('*.png')):
   rgb=Image.open(png).convert('RGB').resize((128,72)).tobytes()
   pixels.append({'file':png.name,'rgb':base64.b64encode(rgb).decode()})
  perception=subprocess.run(['node','experiments/aerial-combat/qa/perception.cjs'],input=json.dumps(pixels),text=True,capture_output=True,check=True)
  report['pixelAgent']=json.loads(perception.stdout)
  report['errors']=errors;report['limitation']='Native GLB preview, not integrated game or Android performance.'
  (OUT/'report.json').write_text(json.dumps(report,indent=2))
  await b.close()
 if errors:raise RuntimeError(errors)
asyncio.run(main())
