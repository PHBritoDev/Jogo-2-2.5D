import asyncio,os,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path(__file__).resolve().parents[1]/'docs/evidencias/mod244'
OUT.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path=os.environ.get('COMBAT_CHROMIUM','/usr/bin/chromium'),headless=True,proxy={'server':os.environ['HTTPS_PROXY'],'bypass':'localhost,127.0.0.1'} if os.environ.get('HTTPS_PROXY') else None,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=await b.new_page(viewport={'width':960,'height':540},ignore_https_errors=True,is_mobile=True,has_touch=True);page.set_default_timeout(90000)
  errors=[];page.on('response',lambda r:errors.append('HTTP '+str(r.status)+' '+r.url) if r.status>=400 and 'favicon.ico' not in r.url else None);page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text[:700]) if m.type=='error' and '404' not in m.text else None)
  await page.goto(os.environ.get('COMBAT_QA_URL','http://127.0.0.1:8124/mundo-3d-prototype.html?debug3d=1&treinoCombate244=1'),wait_until='domcontentloaded');await page.wait_for_function('window.HeroRun235Ready && window.SevenSinsDebug3D?.riteState().ready');await page.evaluate('SevenSinsDebug3D.riteQA()');await page.wait_for_function('SevenSinsDebug3D.combatReport().ready');print('READY',flush=True)
  before=await page.evaluate('JSON.stringify(Object.entries(window.localStorage).sort())');await page.evaluate('window.requestAnimationFrame=()=>0');print('LANE',await page.evaluate('window.qaLane=SevenSinsDebug3D.motionLane()'),flush=True);await page.evaluate('window.qaMotion=(o)=>SevenSinsDebug3D.motionQA({...window.qaLane,...o})');await page.evaluate('window.qaMotion({enemyDistance:1.5})');out={'mod':await page.locator('#marker').inner_text(),'upstreamBase':'ffd28b75631be48abb9521ef6cb5acaeeb2f822a','errors':errors,'environment':'Chromium headless / SwiftShader, viewport mobile 960x540; no Android device','moves':[],'controls':[],'bosses':[]}
  for sword in ['prota','aurora','vigilia','quantum','celeste']:
   for step in range(5):
    result=await page.evaluate('''({s,step})=>{const d=SevenSinsDebug3D;window.qaMotion({enemyDistance:1.5,sword:s});const hp=d.riteState().hp;d.combatMoveQA(s,'ground',step);d.combatStep(.38);const pose=d.riteState();d.combatStep(.9);return{s,step,damage:hp-d.riteState().hp,height:pose.height,clip:pose.clip,finished:!d.riteState().active,blade:pose.blade};}''',{'s':sword,'step':step});out['moves'].append(result)
   print('MOVES',sword,out['moves'][-5:],flush=True)
  # Actual controller routing, real jump gravity/landing and dash movement.
  for mode in ['run','dash','air','plunge']:
   r=await page.evaluate('''(mode)=>{const d=SevenSinsDebug3D;window.qaMotion({enemyDistance:4,sword:'prota'});if(mode==='run')d.motionStep(.4,{sprint:true});if(mode==='dash')d.combatAction('dash');if(mode==='air'||mode==='plunge'){d.combatAction('jump');d.combatStep(mode==='air'?.1:.4);}d.combatAction('attack');const start=d.riteState();d.combatStep(1.3);return{mode,start,end:d.riteState()};}''',mode);out['controls'].append(r);print('CONTROL',mode,r['start']['active'],r['end']['motion'],flush=True)
  # Independent camera modes and correct original special-resource budgets.
  out['fp']=await page.evaluate('''()=>{const d=SevenSinsDebug3D;window.qaMotion({enemyDistance:1.5,fp:true,sword:'vigilia'});d.combatAction('attack');d.combatStep(.3);return d.riteState();}''');await page.screenshot(path=str(OUT/'first-person.png'))
  out['specials']=[]
  for sword in ['prota','aurora']:
   r=await page.evaluate('''(s)=>{const d=SevenSinsDebug3D;window.qaMotion({enemyDistance:3,sword:s});const before=d.riteState();d.riteCast();d.combatStep(3);return{s,before:{mana:before.mana,hp:before.hp},after:d.riteState()};}''',sword);out['specials'].append(r)
  # Actual touchscreen buttons (mobile emulation, not an Android device).
  out['touch']=[]
  for action in ['attack','jump','dash']:
   await page.evaluate('window.qaMotion({enemyDistance:3,sword:"prota"})')
   await page.tap('#'+action)
   if action=='jump':await page.evaluate('SevenSinsDebug3D.combatStep(.10)');await page.tap('#attack')
   if action=='dash':await page.tap('#attack')
   r=await page.evaluate('SevenSinsDebug3D.riteState()');out['touch'].append({'button':action,'active':r['active'],'grounded':r['motion']['grounded']});await page.evaluate('SevenSinsDebug3D.combatStep(1.4)')
  out['pool']=await page.evaluate('''()=>{const d=SevenSinsDebug3D;window.qaMotion({enemyDistance:0,sword:'prota'});const before=d.combatReport().geometry;for(let i=0;i<30;i++){d.combatMoveQA('prota');d.combatStep(1,{fps:30,draw:false});}return{before,after:d.combatReport().geometry,vfx:d.riteState().vfx};}''')
  # Native mini-boss traces and distinct production clips. Manually step after asynchronous loading.
  for kind in ['warden','e2boss']:
   await page.evaluate('window.qaMotion({enemyDistance:0})');await page.evaluate('(k)=>SevenSinsDebug3D.combatBoss(k)',kind)
   if kind=='warden':await page.wait_for_function('window.Enemy1AnimationReport')
   await page.evaluate('SevenSinsDebug3D.combatStep(.05)');print('BOSS READY',kind,await page.evaluate('SevenSinsDebug3D.squadState().on'),flush=True)
   trace=await page.evaluate('SevenSinsDebug3D.bossTraces()');assert trace,kind
   logs=[]
   for move in trace:
    # Reset both actor and hero between moves, prevent AI choosing unrequested followups.
    r=await page.evaluate('''({id})=>{const d=SevenSinsDebug3D;window.qaMotion({enemyDistance:0});const [x,y,z]=d.riteState().hero;d.squadPose(d.squadState().focus,x,z-2,0);d.combatStep(.02);const started=d.bossAttack(id);d.combatStep(.30);const report=d.combatReport();d.combatStep(3.1);return{started,report,state:d.squadState()};}''',move);logs.append(r)
   out['bosses'].append({'kind':kind,'traces':trace,'moves':logs});print('BOSS TESTED',kind,flush=True)
  out['saveUnchanged']=before==await page.evaluate('JSON.stringify(Object.entries(window.localStorage).sort())');out['errors']=errors;out['report']=await page.evaluate('SevenSinsDebug3D.combatReport()');print('ERRORS',errors,flush=True)
  assert not errors,errors
  assert all(x['damage']>0 and x['finished'] for x in out['moves']),out['moves']
  assert all(x['start']['active']['mode']==x['mode'] and x['end']['motion']['grounded'] and not x['end']['active'] for x in out['controls'])
  assert [x['active']['mode'] for x in out['touch']]==['ground','air','dash'],out['touch']
  assert [(x['before']['mana']-x['after']['mana'],x['before']['hp']-x['after']['hp']) for x in out['specials']]==[(28,76),(38,117)]
  assert out['pool']['before']==out['pool']['after'],out['pool']
  assert out['saveUnchanged']
  out['assertionsPassed']=True
  for boss in out['bosses']:
   for move in boss['moves']:
    move['report']={k:v for k,v in move['report'].items() if k!='clips'}
  (OUT/'browser-tests.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
  print('ASSERTIONS PASS',flush=True)
  await b.close()
asyncio.run(main())
