import asyncio,os
from pathlib import Path
OUT=Path(os.environ.get("QA_OUTPUT","/tmp/skill221"));OUT.mkdir(parents=True,exist_ok=True)
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy={'server':os.environ.get('HTTPS_PROXY','http://proxy:8080'),'bypass':'127.0.0.1,localhost'},args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  page=await b.new_page(viewport={'width':1100,'height':720},ignore_https_errors=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto(os.environ.get('GAME_URL','http://127.0.0.1:8767/skill1-preview.html'));await page.wait_for_function('window.preview',timeout=90000)
  await page.evaluate('preview.freeze();preview.start();preview.step(.4)')
  await page.screenshot(path=str(OUT/'study-formation.png'))
  print('BUDGET',await page.evaluate('preview.info()'),flush=True)
  await page.evaluate('preview.fire();for(let i=0;i<13;i++)preview.step(.04)')
  await page.screenshot(path=str(OUT/'study-trail.png'))
  await page.evaluate('preview.step(.12)')
  await page.screenshot(path=str(OUT/'study-impact.png'))
  before=await page.evaluate('preview.info().geo')
  await page.evaluate('for(let n=0;n<20;n++){preview.start();preview.step(.3);preview.fire();for(let i=0;i<20;i++)preview.step(.04);}')
  assert await page.evaluate('preview.info().geo')==before
  print('POOL: 20 recasts, geometry count stable',before,flush=True)
  assert not errors,errors;print('STUDY PASS',flush=True);await b.close()
asyncio.run(main())
