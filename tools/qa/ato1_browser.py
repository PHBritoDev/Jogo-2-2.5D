import asyncio,json,os
from pathlib import Path
OUT=Path(os.environ.get("QA_OUTPUT","/tmp/ato1-216"));OUT.mkdir(parents=True,exist_ok=True)
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy=({'server':os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY'),'bypass':'127.0.0.1,localhost'} if os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY') else None),args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  page=await b.new_page(viewport={'width':640,'height':360},ignore_https_errors=True)
  page.on('response',lambda r:print('HTTP',r.status,r.url,flush=True) if r.status>=400 else None)
  page.on('console',lambda m:print(m.type,m.text[:500],flush=True) if m.type=='error' else None)
  page.on('pageerror',lambda e:print('ERROR',str(e),flush=True))
  await page.goto(os.environ.get('GAME_URL','http://127.0.0.1:8766/mundo-3d-prototype.html?debug3d=1'))
  try: await page.wait_for_function('window.SevenSinsDebug3D',timeout=120000)
  except: print(await page.locator('#status').inner_text(),flush=True);raise
  await page.wait_for_timeout(12000)
  print(await page.evaluate('SevenSinsDebug3D.cineState()'),flush=True)
  await page.evaluate('SevenSinsDebug3D.act1(4,3);SevenSinsDebug3D.speed(8);SevenSinsDebug3D.teleport(-800,-3)')
  for i in range(260):
   await page.wait_for_timeout(500)
   st=await page.evaluate('SevenSinsDebug3D.storyState()')
   if i%10==0: print(st,flush=True)
   if st['waitingTap']: await page.locator('#cine-continue').click(timeout=60000)
   if st['q']==5: break
  await page.screenshot(path=str(OUT/'horde216.png'))
  await page.evaluate('SevenSinsDebug3D.teleport(-760,-73)')
  for i in range(80):
   await page.wait_for_timeout(500)
   st=await page.evaluate('SevenSinsDebug3D.storyState()')
   if st['waitingTap']: await page.locator('#cine-continue').click(timeout=60000)
   if st['enemy']: break
  print('GUARDIAN',st,flush=True)
  await page.screenshot(path=str(OUT/'guardian216.png'))
  assert st['enemy'] and st['enemy']['profile']=='warden',st
  assert st['enemy']['hp']==300,st
  await page.evaluate("SevenSinsDebug3D.killBoss();SevenSinsDebug3D.fx('circle')")
  for i in range(160):
   await page.wait_for_timeout(500)
   st=await page.evaluate('SevenSinsDebug3D.storyState()')
   if st['waitingTap']:await page.locator('#cine-continue').click(timeout=60000)
   if st['q']==6:break
  assert st['q']==6,st
  print('VICTORY',st,flush=True)
  await page.evaluate('SevenSinsDebug3D.act1(1,1);SevenSinsDebug3D.speed(1)')
  await page.wait_for_timeout(1500)
  await page.locator('#talk-button').click(timeout=60000)
  await page.wait_for_function('SevenSinsDebug3D.cineState().waitingTap')
  before=await page.evaluate('SevenSinsDebug3D.cineState().index')
  await page.mouse.click(300,50)
  await page.wait_for_timeout(500)
  assert await page.evaluate('SevenSinsDebug3D.cineState().index')==before
  state=await page.evaluate('SevenSinsDebug3D.regressionState()')
  assert state['speed']==0,state
  print('DIALOGUE',state,flush=True)
  await page.screenshot(path=str(OUT/'dialogue216.png'))
  await page.locator('#cine-skip').click(timeout=60000);await page.locator('#cine-skip').click(timeout=60000)
  await page.evaluate('SevenSinsDebug3D.act1(1,1);SevenSinsDebug3D.teleport(40,14);SevenSinsDebug3D.sprint(true)')
  await page.keyboard.down('w')
  await page.wait_for_function("SevenSinsDebug3D.regressionState().clip==='Running'",timeout=30000)
  await page.screenshot(path=str(OUT/'run216.png'))
  print('RUN',await page.evaluate('SevenSinsDebug3D.regressionState()'),flush=True)
  await page.keyboard.up('w');await page.evaluate('SevenSinsDebug3D.sprint(false)')
  await page.evaluate('SevenSinsDebug3D.act3(18,2);SevenSinsDebug3D.speed(8)')
  for i in range(160):
   await page.wait_for_timeout(500)
   st=await page.evaluate('SevenSinsDebug3D.storyState()')
   if st['waitingTap']:await page.locator('#cine-continue').click(timeout=60000)
   if st['enemy']:break
  assert st['pack']['profile']=='demon3' and st['pack']['n']==2,st
  print('ACT3_PRESERVED',st,flush=True)
  await page.evaluate('SevenSinsDebug3D.cine("despertar");SevenSinsDebug3D.speed(8)')
  await page.wait_for_timeout(1000)
  assert await page.locator('#cine-skip').is_hidden()
  await page.evaluate('SevenSinsDebug3D.skipStory()')
  assert (await page.evaluate('SevenSinsDebug3D.cineState()'))['scene']=='despertar'
  print('AWAKENING_SKIP_BLOCKED',flush=True)
  await b.close()
asyncio.run(main())
