import asyncio,os,json
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy={'server':os.environ.get('HTTPS_PROXY','http://proxy:8080'),'bypass':'localhost,127.0.0.1'},args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=await b.new_page(viewport={'width':844,'height':480},ignore_https_errors=True);errors=[];out=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  for skill,age in [('x',1.1),('portals',4),('dragon',6.9),('dragon',9.3)]:
   await page.goto('http://127.0.0.1:8775/skills-mod233-preview.html?skill='+skill);await page.wait_for_function('window.preview');await page.evaluate('preview.freeze()')
   for quality in [0,1,2]:
    r=await page.evaluate('''({age,quality})=>{preview.quality(quality);preview.start();for(let i=0;i<Math.round(age*60);i++)preview.step(1/60,false);preview.step(0);return preview.info();}''',{'age':age,'quality':quality});out.append({'skill':skill,'age':age,'quality':quality,**r})
  assert not errors,errors;Path('docs/evidencias/mod235/active-counts.json').write_text(json.dumps(out,indent=2));print('PASS: active scene draw counts recorded; no page errors');await b.close()
asyncio.run(main())
