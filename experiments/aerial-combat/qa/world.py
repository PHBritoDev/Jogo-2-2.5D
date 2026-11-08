"""Run the real main-world entry, both protagonist rigs, using existing QA controls."""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
 out=Path('aerial-results/world');out.mkdir(parents=True,exist_ok=True);report={'rigs':{},'errors':[],'missing':[]}
 async with async_playwright() as pw:
  opts={'headless':True,'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
  if Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
  if os.environ.get('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY'],'bypass':'localhost,127.0.0.1'}
  browser=await pw.chromium.launch(**opts)
  for kind in ['novo','antigo']:
   page=await browser.new_page(viewport={'width':800,'height':450},ignore_https_errors=True,has_touch=True);page.set_default_timeout(180000)
   page.on('pageerror',lambda e:report['errors'].append(str(e)))
   page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' and any(t in m.text for t in ['WebGL','INVALID_OPERATION','OUT_OF_MEMORY']) else None)
   page.on('response',lambda r:report['missing'].append(r.url) if r.status==404 else None)
   # Pause the RAF scheduler, not the renderer: manual existing debug steps render the actual world.
   await page.add_init_script("const qaRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.name==='animate'){window.qaWorldFrame=cb;return 1;}return qaRAF(cb)};localStorage.setItem('seven-sins-3d-graphics','low');localStorage.setItem('aerial-save-sentinel','unchanged')")
   await page.goto(os.environ.get('VISUAL_BASE_URL','http://127.0.0.1:4181')+'/mundo-3d-prototype.html?debug3d&todasHabilidades&prota='+kind,wait_until='domcontentloaded')
   await page.wait_for_function('window.SevenSinsDebug3D?.riteState().ready');js=page.evaluate
   async def capture(name):
    await js('(()=>{const p=SevenSinsDebug3D.riteState().hero;SevenSinsDebug3D.fly([p[0]+3.5,p[1]+2.4,p[2]+4.5],[p[0],p[1]+1,p[2]]);SevenSinsDebug3D.combatStep(0);})()')
    await page.screenshot(path=str(out/name))
   await js('SevenSinsDebug3D.siegeQA();SevenSinsDebug3D.motionQA({x:40,z:21,enemyDistance:3});SevenSinsDebug3D.motionStep(.1,{x:0,z:0});')
   r={'model':await js('window.WorldProtagonistReport||{file:"Protagonista.glb"}'),'initial':await js('SevenSinsDebug3D.riteState()')}
   await capture(f'{kind}-world.png')
   r['run']=await js('SevenSinsDebug3D.motionStep(.45,{sprint:true})');r['gripRun']=await js('SevenSinsDebug3D.gripQA()')
   await capture(f'{kind}-run.png')
   r['jump']=await js("SevenSinsDebug3D.combatAction('jump');SevenSinsDebug3D.combatStep(.25)")
   await capture(f'{kind}-jump.png');await js('SevenSinsDebug3D.combatStep(1.2,{draw:false})')
   r['dash']=await js("SevenSinsDebug3D.combatAction('dash');SevenSinsDebug3D.combatStep(.08)")
   await js('SevenSinsDebug3D.combatStep(.6,{draw:false})')
   r['cuts']=[]
   for i in range(5):
    await js('SevenSinsDebug3D.siegeQA();SevenSinsDebug3D.motionQA({x:40,z:21,enemyDistance:1.35});')
    await js(f"SevenSinsDebug3D.combatMoveQA('prota','ground',{i})")
    r['cuts'].append(await js('SevenSinsDebug3D.combatStep(.46)'))
    if kind=='novo':await capture(f'{kind}-cut-{i}.png')
    await js('SevenSinsDebug3D.combatStep(1,{draw:false})')
   r['gripAttack']=await js('SevenSinsDebug3D.gripQA()')
   # The pre-existing Skills 1–3 keep their original controllers, costs and VFX.
   r['skills']={}
   for action,setup,state,step in [('magic','siegeQA','siegeState',None),('magic2','starfallQA','starfallState','starfallFrame'),('magic3','phoenixQA','phoenixState','phoenixFrame')]:
    await js(f"SevenSinsDebug3D.{setup}();SevenSinsDebug3D.combatAction('{action}')")
    if step:await js(f'SevenSinsDebug3D.{step}(.3)')
    r['skills'][action]=await js(f'SevenSinsDebug3D.{state}()')
    await js(f'for(let i=0;i<80;i++)SevenSinsDebug3D.{step or "siegeFrame"}(.2)')
   # First person and special sword poses exercise new sockets and retargeted ritos.
   await js("SevenSinsDebug3D.riteCancel('qa');SevenSinsDebug3D.motionQA({x:40,z:21,enemyDistance:0});SevenSinsDebug3D.viewQA(true)")
   r['firstPerson']=await js('SevenSinsDebug3D.gripQA()');await page.screenshot(path=str(out/f'{kind}-first-person.png'));await js('SevenSinsDebug3D.viewQA(false);SevenSinsDebug3D.fly([44,3,25],[40,1,21])')
   if kind=='novo':
    for name in ['Rite_Judgment','Rite_Eclipse']:
     await js(f'SevenSinsDebug3D.ritePose("{name}",.5)');await capture(name+'.png')
   r['saveUnchanged']=await js("localStorage.getItem('aerial-save-sentinel')==='unchanged' && localStorage.getItem('sevenSins3DCampaignV6')===null")
   r['checks']={'ready':r['initial']['ready'],'run':r['run']['motion']['sprint'],'jump':not r['jump']['hero']['motion']['grounded'],'handSocket':r['gripRun']['error']<.001 and r['gripAttack']['error']<.001,'fiveNativeMoves':all(c['hero']['active'] is not None for c in r['cuts']),'physicalDamage':all(c['hero']['hp']<300 for c in r['cuts']),'skills123':all(v['active'] for v in r['skills'].values()),'firstPerson':r['firstPerson']['view']['triangles']>0,'save':r['saveUnchanged']}
   report['rigs'][kind]=r;print(kind,r['checks'],flush=True);await page.close()
  await browser.close()
 report['status']='passed' if not report['errors'] and all(all(r['checks'].values()) for r in report['rigs'].values()) else 'requires-fixes'
 (out/'report.json').write_text(json.dumps(report,indent=2));print(report['status'],report['errors'],flush=True)
 if report['status']!='passed':raise RuntimeError('World integration checks failed')

asyncio.run(main())
