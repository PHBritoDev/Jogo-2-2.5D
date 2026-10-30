"""Real game, controlled simulation time. Chromium software WebGL, not Android hardware."""
import asyncio,os,json
from pathlib import Path
from playwright.async_api import async_playwright
out=Path('docs/evidencias/mod235');out.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy={'server':os.environ.get('HTTPS_PROXY','http://proxy:8080'),'bypass':'localhost,127.0.0.1'},args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=await b.new_page(viewport={'width':844,'height':480},ignore_https_errors=True,has_touch=True);page.set_default_timeout(180000);errs=[];report={}
  page.on('pageerror',lambda e:errs.append(str(e)))
  page.on('console',lambda m:errs.append(m.text[:800]) if m.type=='error' and '404' not in m.text else None)
  await page.goto('http://127.0.0.1:8775/mundo-3d-prototype.html?debug3d=1&testeQuantum233=1&v=235',wait_until='domcontentloaded')
  await page.wait_for_function('window.HeroRun235Ready && window.SevenSinsDebug3D?.riteState().ready && SevenSinsDebug3D.riteState().sword==="quantum"')
  assert await page.locator('#marker').inner_text()=='235'
  report['skills']=[]
  for i,kind in enumerate(['skill_x_rupture','skill_twin_portals','skill_judgment_dragon']):
   st=await page.evaluate('''async({i,kind})=>{const d=SevenSinsDebug3D;await d.riteQA();d.extraQA();d.motionQA({x:40,z:17,enemyDistance:9,sword:'quantum'});d.equipSlotQA(i,kind);d.fly([50,7,25],[40,3,10]);d.slotPress(['magic','magic2','magic3'][i]);return d.extraState();}''',{'i':i,'kind':kind})
   assert st['skills'][kind]['active'],st
   # Pose and grip, before the effects leave the protagonist.
   await page.evaluate('SevenSinsDebug3D.extraFrame(.55)');grip=await page.evaluate('SevenSinsDebug3D.gripQA()');assert grip['error']<.0001 and grip['angle']<.0001,grip
   if i==2:await page.screenshot(path=str(out/'game-dragon-cast.png'))
   times=[1.05] if i==0 else [4,8.4] if i==1 else [3.7,5.1,7.7,9.3];last=.55
   for t in times:
    await page.evaluate('''({dt,dragon})=>{const d=SevenSinsDebug3D;if(dragon)d.fly([67,24,46],[40,11,8]);for(let i=0;i<Math.round(dt*60);i++)d.extraFrame(1/60,false);d.extraFrame(0);}''',{'dt':t-last,'dragon':i==2});last=t
    await page.screenshot(path=str(out/f'game-{i+1}-{t}.png'))
   result=await page.evaluate('(dt)=>{const d=SevenSinsDebug3D;d.extraFrame(dt);return d.extraState()}',14-last)
   assert not result['skills'][kind]['active'],result
   damage=st['hp']-result['hp'];assert 0<damage<=[38,58,66][i],(kind,damage,result)
   report['skills'].append({'kind':kind,'damage':damage,'manaSpent':999-st['mana'],'gripError':grip['error']});print('SKILL',report['skills'][-1],flush=True)
  report['grips']=await page.evaluate('''async()=>{const d=SevenSinsDebug3D,r=[];await d.riteQA();for(const sword of ['prota','aurora','quantum']){d.motionQA({x:40,z:17,enemyDistance:9,sword});for(const phase of [0,.17,.34,.51]){d.motionPose(phase);const g=d.gripQA();r.push({sword,phase,error:g.error,angle:g.angle,hand:g.hand});}}return r;}''')
  assert max(x['error'] for x in report['grips'])<.0001
  assert max(x['angle'] for x in report['grips'])<.0001
  await page.evaluate('SevenSinsDebug3D.motionQA({x:40,z:17,enemyDistance:9,sword:"quantum"});SevenSinsDebug3D.fly([44,2,18],[40,1,17]);SevenSinsDebug3D.motionPose(.17)');await page.screenshot(path=str(out/'game-run-side.png'))
  await page.evaluate('SevenSinsDebug3D.fly([40,2,12],[40,1,17]);SevenSinsDebug3D.motionPose(.51)');await page.screenshot(path=str(out/'game-run-front.png'))
  report['firstPerson']=await page.evaluate('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.extraQA();d.motionQA({x:40,z:17,enemyDistance:9,fp:true,sword:'quantum'});d.viewQA(true);d.cast('skill_judgment_dragon');d.extraFrame(.65);return {grip:d.gripQA(),state:d.riteState()};}''')
  assert report['firstPerson']['state']['viewmodel']['visible'];await page.screenshot(path=str(out/'game-fp-cast.png'))
  await page.locator('#pause-button').click();before=await page.evaluate('SevenSinsDebug3D.extraState()');await page.evaluate('SevenSinsDebug3D.extraFrame(3)');assert (await page.evaluate('SevenSinsDebug3D.extraState()'))['skills']==before['skills'];await page.locator('#pause-resume').click()
  await page.evaluate('document.querySelector("#scene").dispatchEvent(new Event("webglcontextlost"))');assert all(not x['active'] for x in (await page.evaluate('SevenSinsDebug3D.extraState()'))['skills'].values())
  report['errors']=errs;assert not errs,errs
  (out/'browser.json').write_text(json.dumps(report,indent=2));print('PASS: all skills, actual GLB run, three weapons, hand/socket, first person, pause and synthetic context loss',flush=True);await b.close()
asyncio.run(main())
