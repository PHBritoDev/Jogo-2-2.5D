import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path(os.environ.get('QA_OUTPUT','/tmp/skill221'));OUT.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy={'server':os.environ.get('HTTPS_PROXY','http://proxy:8080'),'bypass':'127.0.0.1,localhost'},args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  page=await b.new_page(viewport={'width':800,'height':450},ignore_https_errors=True)
  page.set_default_timeout(120000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:print('console',m.text[:300],flush=True) if m.type=='error' else None)
  await page.goto(os.environ.get('GAME_URL','http://127.0.0.1:8767/mundo-3d-prototype.html?debug3d=1'))
  await page.wait_for_function('window.SevenSinsDebug3D',timeout=120000)
  await page.wait_for_timeout(3000)
  print('SETUP',await page.evaluate('SevenSinsDebug3D.siegeQA()'),flush=True)
  await page.wait_for_timeout(1500)
  await page.evaluate("SevenSinsDebug3D.cast('magic')")
  print('START',await page.evaluate('SevenSinsDebug3D.siegeState()'),flush=True)
  await page.evaluate('SevenSinsDebug3D.siegeFrame(.35)')
  await page.screenshot(path=str(OUT/'formation.png'))
  assert await page.locator('.siege-hud strong').inner_text()=='5/5'
  for i in range(5):
   await page.locator('#attack').dispatch_event('pointerdown',{'pointerId':1,'pointerType':'touch','button':0})
   await page.locator('#attack').dispatch_event('click')
   st=await page.evaluate('SevenSinsDebug3D.siegeState()');assert st['remaining']==4-i,st
   print('HUD',await page.locator('.siege-hud strong').inner_text(),flush=True)
   await page.evaluate('for(let i=0;i<12;i++)SevenSinsDebug3D.siegeFrame(.04)')
   if i==0: await page.screenshot(path=str(OUT/'trail.png'))
   if i==4: await page.screenshot(path=str(OUT/'zero.png'))
   await page.evaluate('for(let i=0;i<4;i++)SevenSinsDebug3D.siegeFrame(.04)')
   if i==0: await page.screenshot(path=str(OUT/'impact.png'))
   await page.evaluate('for(let i=0;i<10;i++)SevenSinsDebug3D.siegeFrame(.04)')
  st=await page.evaluate('SevenSinsDebug3D.siegeState()');print('END',st,flush=True)
  assert not st['active'];assert st['hp']==230,st
  assert not await page.locator('#attack').evaluate("e=>e.classList.contains('celestial-siege')")
  assert not errors,errors
  print('PASS: five touches + synthetic clicks => five unique impacts, damage70, HUD5..0 and restored; no page errors',flush=True)
  await b.close()
asyncio.run(main())
