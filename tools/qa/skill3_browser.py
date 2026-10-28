import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
out=Path('docs/evidencias/mod226')
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy={'server':os.environ.get('HTTPS_PROXY','http://proxy:8080'),'bypass':'127.0.0.1,localhost'},args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  page=await b.new_page(viewport={'width':900,'height':600},ignore_https_errors=True);page.set_default_timeout(120000);errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:errors.append(m.text) if m.type=='error' and '404' not in m.text else None)
  await page.goto('http://127.0.0.1:8768/skill3-preview.html');await page.wait_for_function('window.preview');await page.evaluate('preview.freeze();preview.start()')
  last=0
  for t,name in [(.5,'cast'),(1.4,'form'),(1.9,'flight'),(2.6,'orbit'),(3.1,'dive'),(3.6,'burn'),(9,'clean')]:
   await page.evaluate('(dt)=>{for(let i=0;i<Math.ceil(dt/.02);i++)preview.step(dt/Math.ceil(dt/.02))}',t-last);last=t
   await page.screenshot(path=str(out/(name+'.png')));print(name,await page.evaluate('preview.state()'),await page.evaluate('preview.info()'),flush=True)
  baseline=await page.evaluate('preview.info().geo')
  for quality in [True,False]:
   await page.evaluate('(q)=>{preview.low(q);for(let n=0;n<5;n++){preview.start();preview.step(12)}}',quality)
  assert await page.evaluate('preview.info().geo')==baseline
  print('POOL: 10 recasts, low/high stable geometry',baseline,flush=True)
  assert not errors,errors
  await page.goto('http://127.0.0.1:8768/mundo-3d-prototype.html?debug3d=1');await page.wait_for_function('window.SevenSinsDebug3D');await page.wait_for_timeout(4000)
  await page.evaluate('SevenSinsDebug3D.phoenixQA()');await page.wait_for_timeout(1000)
  await page.locator('#magic3').dispatch_event('pointerdown',{'pointerId':1,'pointerType':'touch','button':0});await page.locator('#magic3').dispatch_event('click')
  st=await page.evaluate('SevenSinsDebug3D.phoenixState()');assert st['active'] and st['mana']==55,st
  for dt in [1.4,.7,1,1,5.5]:
   st=await page.evaluate('(dt)=>SevenSinsDebug3D.phoenixFrame(dt)',dt);print('GAME',st,flush=True)
   if st['phase'] in ['form','orbit']:await page.screenshot(path=str(out/('game-'+st['phase']+'.png')))
  assert not st['active'];assert st['hp']==223,st
  assert not errors,errors
  print('PASS: real game input charges45 once, full sequence causes77 damage, cleanup; no page errors',flush=True)
  await b.close()
asyncio.run(main())
