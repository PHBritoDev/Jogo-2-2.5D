"""Rendered simulation at 10 Hz; this is a pacing/visual clip, not a measured GPU frame rate."""
import asyncio,os,json,subprocess,tempfile
from pathlib import Path
from playwright.async_api import async_playwright
out=Path('docs/evidencias/mod235');frames=Path(tempfile.mkdtemp(prefix='mod235-film-'))
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy={'server':os.environ.get('HTTPS_PROXY','http://proxy:8080'),'bypass':'localhost,127.0.0.1'},args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=await b.new_page(viewport={'width':844,'height':480},ignore_https_errors=True);page.set_default_timeout(120000);errors=[];report=[];frame=0
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text[:800]) if m.type=='error' and '404' not in m.text else None)
  for kind,length in [('x',3),('portals',10),('dragon',11)]:
   await page.goto('http://127.0.0.1:8775/skills-mod233-preview.html?skill='+kind);await page.wait_for_function('window.preview');await page.evaluate('preview.freeze();preview.start()')
   for j in range(length*10):
    await page.evaluate('preview.step(.1)');await page.screenshot(path=str(frames/f'{frame:04}.jpg'),type='jpeg',quality=72);frame+=1
   # Warm every phase including all 3 quality uniforms before comparing repeated complete casts.
   warm='''()=>{for(let q=0;q<3;q++){preview.quality(q);preview.start();for(let i=0;i<140;i++)preview.step(.1,false);preview.step(0);}return preview.info();}'''
   before=await page.evaluate(warm)
   after=await page.evaluate('''()=>{for(let n=0;n<6;n++)for(let q=0;q<3;q++){preview.quality(q);preview.start();for(let i=0;i<140;i++)preview.step(.1,false);preview.step(0);}return preview.info();}''')
   assert before['geo']==after['geo'] and before['programs']==after['programs'],(before,after)
   report.append({'kind':kind,'before':before,'after':after,'recasts':18});print(report[-1],flush=True)
  assert not errors,errors;(out/'preview-pools.json').write_text(json.dumps(report,indent=2));await b.close()
 subprocess.run(['ffmpeg','-v','error','-y','-framerate','10','-i',str(frames/'%04d.jpg'),'-c:v','libx264','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'skills-235.mp4')],check=True)
 print('PASS: preview video and pools; no console or shader errors',flush=True)
asyncio.run(main())
