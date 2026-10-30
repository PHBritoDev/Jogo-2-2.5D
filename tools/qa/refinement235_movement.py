"""Final regenerated GLB + moving combat regression in Chromium SwiftShader (not Android)."""
import asyncio,os,json
from pathlib import Path
from playwright.async_api import async_playwright
out=Path('docs/evidencias/mod235')
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy={'server':os.environ.get('HTTPS_PROXY','http://proxy:8080'),'bypass':'localhost,127.0.0.1'},args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=await b.new_page(viewport={'width':844,'height':480},ignore_https_errors=True,has_touch=True);page.set_default_timeout(180000);errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://127.0.0.1:8775/mundo-3d-prototype.html?debug3d=1&testeQuantum233=1&v=235',wait_until='domcontentloaded')
  await page.wait_for_function('window.HeroRun235Ready && window.SevenSinsDebug3D?.riteState().ready && SevenSinsDebug3D.riteState().sword==="quantum"')
  assert '235' in await page.locator('#quest-title').inner_text()
  report={}
  report['movingAttack']=await page.evaluate('''async()=>{const d=SevenSinsDebug3D,r=[],lane=d.motionLane();for(const fp of [false,true])for(const sword of ['prota','aurora','quantum']){await d.riteQA();d.motionQA({...lane,enemyDistance:0,fp,sword});d.viewQA(fp);const start=d.riteState().hero,end=d.motionStep(.6,{sprint:true,attack:true});r.push({fp,sword,distance:Math.hypot(end.hero[0]-start[0],end.hero[2]-start[2]),height:end.height,grip:d.gripQA()});}return r;}''')
  # Quantum's existing low attack bends the torso: bounds vary with pose, not rig scale.
  assert all(r['distance']>1 and 1.2<r['height']<2.4 and r['grip']['error']<.0001 for r in report['movingAttack']),report
  print('MOVING ATTACK',len(report['movingAttack']),flush=True)
  report['grips']=await page.evaluate('''async()=>{const d=SevenSinsDebug3D,r=[];await d.riteQA();d.motionQA({x:40,z:17,enemyDistance:0,sword:'quantum'});for(const t of [0,.17,.34,.51,.68]){const pose=d.motionPose(t);r.push({...d.gripQA(),height:pose.height});}return r;}''')
  assert all(r['error']<.0001 and r['angle']<.0001 and 1.7<r['height']<2.4 for r in report['grips'])
  for phase,view,cam in [(.17,'side','[44,2,18]'),(.51,'front','[40,2,12]')]:
   await page.evaluate(f'()=>{{const d=SevenSinsDebug3D;d.fly({cam},[40,1,17]);d.motionPose({phase});}}');await page.screenshot(path=str(out/f'game-run-{view}.png'))
  report['finalX']=await page.evaluate('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.extraQA();d.motionQA({x:40,z:17,enemyDistance:9,sword:'quantum'});const before=d.extraState();d.cast('skill_x_rupture');d.extraFrame(5);return{before,after:d.extraState()};}''')
  assert report['finalX']['before']['hp']-report['finalX']['after']['hp']==38,report['finalX']
  assert not errors,errors;report['errors']=errors
  (out/'movement.json').write_text(json.dumps(report,indent=2));print('PASS: final native run, moving attack, sword socket and lateral X scenery sweep',flush=True);await b.close()
asyncio.run(main())
