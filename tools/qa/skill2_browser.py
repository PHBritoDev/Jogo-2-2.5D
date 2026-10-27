import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
out=Path('docs/evidencias/mod224')
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy={'server':os.environ.get('HTTPS_PROXY','http://proxy:8080'),'bypass':'127.0.0.1,localhost'},args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  page=await b.new_page(viewport={'width':900,'height':600});page.set_default_timeout(120000);errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:print('console',m.text[:300],flush=True) if m.type=='error' else None)
  await page.goto('http://127.0.0.1:8767/mundo-3d-prototype.html?debug3d=1')
  await page.wait_for_function('window.SevenSinsDebug3D');await page.wait_for_timeout(4000)
  await page.evaluate('SevenSinsDebug3D.starfallQA()')
  await page.wait_for_timeout(1500)
  print('SETUP ready',flush=True)
  before=await page.evaluate('SevenSinsDebug3D.starfallState()')
  await page.locator('#magic2').dispatch_event('pointerdown',{'pointerId':1,'pointerType':'touch','button':0});await page.locator('#magic2').dispatch_event('click')
  st=await page.evaluate('SevenSinsDebug3D.starfallState()');assert st['active'];assert st['mana']==before['mana']-32,st
  mana=st['mana'];await page.evaluate("SevenSinsDebug3D.cast('magic2');SevenSinsDebug3D.cast('magic3');SevenSinsDebug3D.cast('ultimate')");assert (await page.evaluate('SevenSinsDebug3D.starfallState()'))['mana']==mana
  for dt,name in [(.4,'game-cast'),(.85,'game-ascent'),(.6,'game-circle'),(1.1,'game-rain'),(1,'game-impact'),(6.25,'game-clean')]:
   st=await page.evaluate('(dt)=>SevenSinsDebug3D.starfallFrame(dt)',dt)
   await page.screenshot(path=str(out/(name+'.png')));print(name,{k:v for k,v in st.items() if k!='stars'},flush=True)
  assert not st['active'];assert 0<st['hp']<300,st
  assert st['cooldown']>before['cooldown']
  assert not await page.locator('#magic3').is_visible()
  assert not await page.locator('#ultimate').is_visible()
  # Keep controls and the normal camera live while the rain runs.
  await page.evaluate("SevenSinsDebug3D.starfallQA();SevenSinsDebug3D.fly(null);SevenSinsDebug3D.cast('magic2');SevenSinsDebug3D.starfallFrame(.8);SevenSinsDebug3D.god();SevenSinsDebug3D.speed(1)")
  pos=await page.evaluate('SevenSinsDebug3D.state()')
  await page.keyboard.down('d');await page.wait_for_timeout(2000);await page.keyboard.up('d')
  moved=await page.evaluate('SevenSinsDebug3D.state()');assert abs(moved['x']-pos['x'])+abs(moved['z']-pos['z'])>.01
  await page.screenshot(path=str(out/'game-controls.png'))
  # A scene/context change invalidates live projectiles immediately.
  await page.evaluate('SevenSinsDebug3D.starfallQA();SevenSinsDebug3D.starfallFrame(.02)')
  assert not (await page.evaluate('SevenSinsDebug3D.starfallState()'))['active']
  await page.evaluate("SevenSinsDebug3D.cast('magic2');SevenSinsDebug3D.killBoss();SevenSinsDebug3D.starfallFrame(3);SevenSinsDebug3D.starfallFrame(.02)")
  assert not (await page.evaluate('SevenSinsDebug3D.starfallState()'))['active']
  print('PASS: movement during rain, live camera, encounter replacement and lethal impact cleanup',flush=True)
  assert not errors,errors
  print('PASS: mobile touch+click charges once; retired skills blocked; real encounter damage; cooldown; cleanup; no page errors',flush=True)
  await b.close()
asyncio.run(main())
