import asyncio,os,json
from pathlib import Path
from playwright.async_api import async_playwright
out=Path('docs/evidencias/mod228');out.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy={'server':os.environ.get('HTTPS_PROXY','http://proxy:8080'),'bypass':'127.0.0.1,localhost'},args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  page=await b.new_page(viewport={'width':800,'height':500},ignore_https_errors=True);page.set_default_timeout(120000);errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:errors.append(m.text) if m.type=='error' and '404' not in m.text else None)
  await page.goto('http://127.0.0.1:8769/whitehole-preview.html');await page.wait_for_function('window.preview');await page.evaluate('preview.freeze();preview.start();preview.step(10.5)');await page.screenshot(path=str(out/'crown.png'));print('VFX',await page.evaluate('preview.info()'),flush=True)
  await page.evaluate('preview.start();preview.step(3.5);preview.step(7);preview.step(2.8);preview.step(4)')
  baseline=await page.evaluate('preview.info().geo')
  await page.evaluate('for(let q=0;q<3;q++){preview.quality(q);for(let i=0;i<4;i++){preview.start();preview.step(3.5);preview.step(7);preview.step(2.8);preview.step(4);}}')
  assert await page.evaluate('preview.info().geo')==baseline
  await page.goto('http://127.0.0.1:8769/mundo-3d-prototype.html?debug3d=1&todasHabilidades=1');await page.wait_for_function('window.SevenSinsDebug3D && SevenSinsDebug3D.cineState().actions.includes("idle")');await page.wait_for_timeout(1000)
  before=await page.evaluate('SevenSinsDebug3D.whiteQA()');await page.wait_for_timeout(1000)
  await page.locator('#ultimate').dispatch_event('pointerdown',{'pointerId':1,'pointerType':'touch','button':0})
  st=await page.evaluate('SevenSinsDebug3D.whiteState()');assert st['locked'] and st['mana']==20,st
  saved=st['savedModelPos'];savedCamera=st['savedCamera']
  # Real capture gate: motion/camera/attacks cannot leak through while presentation owns control.
  await page.keyboard.press('j');await page.keyboard.press('w');await page.mouse.move(300,220);await page.mouse.wheel(0,100)
  last=0
  for t,name in [(2,'ascent'),(4,'sword'),(5.5,'rift'),(9.9,'colossal'),(10.6,'silence'),(12,'launch'),(13.5,'white'),(16,'landing'),(17.1,'restored')]:
   st=await page.evaluate('(dt)=>SevenSinsDebug3D.whiteFrame(dt)',t-last);last=t
   assert st['pos']==before['pos'],st
   await page.screenshot(path=str(out/(name+'.png')));print(name,st,flush=True)
   if name=='ascent':
    await page.locator('#pause-button').click();assert (await page.evaluate('SevenSinsDebug3D.whiteFrame(5)'))['time']==2
    await page.locator('#pause-resume').click()
  assert not st['locked'] and st['hp']==140 and st['mana']==20,st
  assert st['camera']==savedCamera,(st['camera'],savedCamera)
  assert max(abs(a-b) for a,b in zip(st['modelPos'],saved))<.0001,(st,saved);assert st['yaw']==before['yaw'];assert st['distance']==before['distance']
  assert not await page.locator('#attack').is_disabled()
  await page.evaluate('SevenSinsDebug3D.whiteQA();SevenSinsDebug3D.view(1.2,.22,.7)');await page.wait_for_timeout(600)
  await page.evaluate('SevenSinsDebug3D.cast("ultimate");SevenSinsDebug3D.whiteFrame(17)')
  fp=await page.evaluate('SevenSinsDebug3D.whiteState()');assert fp['distance']==.7 and fp['yaw']==1.2 and not fp['locked'],fp
  await page.evaluate('SevenSinsDebug3D.whiteQA();SevenSinsDebug3D.cast("ultimate");SevenSinsDebug3D.act1(1,1);SevenSinsDebug3D.whiteFrame(.02)')
  assert not (await page.evaluate('SevenSinsDebug3D.whiteState()'))['locked']
  print('PASS: pause/resume, first-person settings and scene-change cleanup',flush=True)
  # Cancellation and WebGL loss restore the same lease without charging damage.
  await page.evaluate('SevenSinsDebug3D.whiteQA();SevenSinsDebug3D.skills();SevenSinsDebug3D.cast("ultimate");SevenSinsDebug3D.whiteFrame(7);document.querySelector("#scene").dispatchEvent(new Event("webglcontextlost"))')
  assert not (await page.evaluate('SevenSinsDebug3D.whiteState()'))['locked']
  assert not errors,errors
  print('PASS: timeline, fixed physics, one80mana/160damage, input lock, exact return, context-loss cleanup; stable VFX pool across qualities',flush=True)
  await b.close()
asyncio.run(main())
