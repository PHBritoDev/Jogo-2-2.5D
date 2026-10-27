import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
out=Path('docs/evidencias/mod224');out.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy={'server':os.environ.get('HTTPS_PROXY','http://proxy:8080'),'bypass':'127.0.0.1,localhost'},args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  page=await b.new_page(viewport={'width':1100,'height':720});errors=[]
  page.set_default_timeout(120000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:errors.append(m.text) if m.type=='error' and '404' not in m.text else None)
  await page.goto('http://127.0.0.1:8767/skill2-preview.html');await page.wait_for_function('window.preview',timeout=90000)
  await page.evaluate('preview.freeze();preview.start()')
  last=0
  for time,name in [(.4,'cast'),(1.25,'ascent'),(1.85,'circle'),(2.95,'rain'),(3.95,'impact'),(9.7,'fade'),(10.2,'clean')]:
   await page.evaluate('(dt)=>preview.step(dt)',time-last);last=time
   await page.screenshot(path=str(out/(name+'.png')))
   print(name,await page.evaluate('preview.info()'),flush=True)
  before=await page.evaluate('preview.info()')
  await page.evaluate('for(let n=0;n<8;n++){preview.start();for(let i=0;i<51;i++)preview.step(.2)}')
  assert await page.evaluate('preview.info().geo')==before['geo']
  await page.set_viewport_size({'width':390,'height':844});await page.evaluate('preview.low(true);preview.start();preview.step(2.95)');await page.screenshot(path=str(out/'mobile.png'))
  assert not errors,errors
  print('PASS: stages, 8 recasts stable geometry, mobile low profile, no JS or shader errors',flush=True)
  await b.close()
asyncio.run(main())
