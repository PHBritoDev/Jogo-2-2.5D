"""Actual game integration/visual QA (Chromium; no physical Android claims).
Start a static server at repo root, then run with --url and --out.
"""
import argparse,json,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8767');ap.add_argument('--out',default='work/mod232-browser');args=ap.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 ctx=browser.new_context(viewport={'width':1000,'height':650},has_touch=True)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' and any(k in m.text for k in ['Shader','GL_INVALID','WebGL']) else None)
 page.goto(args.url.rstrip('/')+'/mundo-3d-prototype.html?debug3d=1&todasHabilidades=1&v=232',wait_until='domcontentloaded');page.wait_for_function('window.SevenSinsDebug3D?.riteState().ready',timeout=120000)
 def call(js,shot=None):
  r=page.evaluate(js)
  if shot:page.screenshot(path=str(out/(shot+'.png')))
  assert not errors,errors
  return r
 def profile(v):call("v=>{const e=document.querySelector('#graphics-profile-3d');e.value=v;e.dispatchEvent(new Event('change'));}".replace('v=>','()=>').replace('e.value=v','e.value='+json.dumps(v)))
 profile('low');report={}
 report['sprint']=call('''async()=>{const d=SevenSinsDebug3D,out=[],lane=d.motionLane();for(const dist of [0,14]){await d.riteQA();d.motionQA({...lane,enemyDistance:dist,enemySide:4});const start=d.riteState().hero,s=d.motionStep(5,{sprint:true});out.push({engaged:dist>0,start,end:s.hero,distance:Math.hypot(s.hero[0]-start[0],s.hero[2]-start[2])});}return out;}''')
 assert abs(report['sprint'][0]['distance']-report['sprint'][1]['distance'])<.001,report['sprint'];print('SPRINT',report['sprint'],flush=True)
 report['movement']=call('''async()=>{const d=SevenSinsDebug3D,out=[];for(const fp of [false,true])for(const sword of ['prota','aurora'])for(const [x,z]of [[0,-1],[0,1],[-1,0],[1,0],[.707,-.707]]){await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:0,fp,sword});d.viewQA(fp);const start=d.riteState().hero;const a=d.motionStep(.4,{x,z,sprint:true,attack:true});d.riteAttack();d.motionStep(.65,{x,z,sprint:true});d.riteAttack();const b=d.motionStep(.7,{x,z,sprint:true});out.push({fp,sword,x,z,first:Math.hypot(a.hero[0]-start[0],a.hero[2]-start[2]),distance:Math.hypot(b.hero[0]-start[0],b.hero[2]-start[2]),clip:b.clip,height:b.height});}return out;}''')
 assert all(r['first']>1 and r['distance']>4 and r['clip']=='Rite_Ascendant_Upper' and 1.5<r['height']<2.3 for r in report['movement']),report['movement'];print('MOVING COMBOS',len(report['movement']),flush=True)
 report['range']=call('''async()=>{const d=SevenSinsDebug3D,out=[];for(const fp of [false,true])for(const range of [5,10,15,122]){await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:range,fp,sword:'aurora'});d.viewQA(fp);d.riteCast();const early=d.riteSim(.43),end=d.riteSim(3.8);out.push({fp,range,early:10000-early.hp,damage:10000-end.hp,mana:end.mana,waves:end.waves,events:end.events.filter(e=>e.type==='wave').length});}return out;}''')
 for r in report['range']:assert r['early']==0 and r['damage']==(0 if r['range']==122 else 117) and r['waves']==0 and r['events']==4,r
 print('ECLIPSE RANGES',report['range'],flush=True)
 report['judgment']=call('''async()=>{const d=SevenSinsDebug3D,out=[];for(const fp of [false,true])for(const fps of [30,60,120]){await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:4,fp,sword:'prota'});d.viewQA(fp);const original=d.riteState().camera;d.riteCast();const mid=d.riteSim(.85,fps),end=d.riteSim(1.25,fps);out.push({fp,fps,midCinematic:mid.cinematic,damage:10000-end.hp,mana:end.mana,hero:end.hero,target:end.target,cuts:end.events.filter(e=>e.type==='judgment').length,restored:!end.cinematic&&JSON.stringify(end.camera)===JSON.stringify(original)});}return out;}''')
 for r in report['judgment']:assert r['damage']==76 and r['cuts']==16 and r['hero'][2]<r['target'][2] and r['restored'] and r['midCinematic']==r['fp'],r
 print('JUDGMENT',report['judgment'],flush=True)
 # Actual frames, not a static drawing: same first wave in three moments.
 report['waveFrames']={}
 for view,cam in [('side','[60,4,8]'),('top','[-5,25,8.01]')]:
  # Side camera relative to the same unobstructed lane.
  if view=='side':cam='[15,4,8]'
  call(f"async()=>{{const d=SevenSinsDebug3D;await d.riteQA();d.motionQA({{x:-5,z:16,enemyDistance:15,sword:'aurora'}});d.viewQA(false);d.fly({cam},[-5,1,8]);d.riteCast();}}")
  frames=[]
  for dt,label in [(.46,'a'),(.20,'b'),(.20,'c')]:frames.append(call(f'()=>SevenSinsDebug3D.riteSim({dt})','wave-'+view+'-'+label))
  wave=[next(w for w in s['projectiles'] if w['n']==0) for s in frames];assert max(w['p']['y'] for w in wave)-min(w['p']['y'] for w in wave)<1e-6;assert wave[0]['p']['z']>wave[1]['p']['z']>wave[2]['p']['z'];report['waveFrames'][view]=wave
 for fp in [False,True]:
  for sword in ['prota','aurora']:
   label=('fp-' if fp else 'tp-')+sword
   call(f"async()=>{{const d=SevenSinsDebug3D;await d.riteQA();d.motionQA({{x:-5,z:16,enemyDistance:4,sword:'{sword}',fp:{str(fp).lower()}}});d.viewQA({str(fp).lower()});if(!{str(fp).lower()})d.fly([-1,2.4,19],[-5,1.1,16]);return d.riteState();}}",label+'-idle')
   call('()=>{const d=SevenSinsDebug3D;d.riteAttack();return d.riteSim(.32);}',label+'-swing')
   call('()=>{const d=SevenSinsDebug3D;d.riteCancel("qa");d.riteCast();return d.riteSim(.85);}',label+'-skill')
 # Portrait/mobile bounds; repeated view changes and extreme look.
 report['viewSwitch']=call('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:0,sword:'aurora'});const out=[];for(let i=0;i<12;i++){const fp=i%2===0;out.push(d.viewQA(fp,i*Math.PI/2,i%3===0?.95:-.8).viewmodel);}return out;}''')
 assert all(x and x['triangles']>300 and x['triangles']<3000 for x in report['viewSwitch']),report['viewSwitch']
 report['mobile']={}
 for label,w,h in [('small',844,390),('portrait',390,844),('wide',2340,1080)]:
  page.set_viewport_size({'width':w,'height':h});call("async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.viewQA(true);}")
  rects=call("()=>[...document.querySelectorAll('#actions button')].filter(b=>getComputedStyle(b).display!=='none').map(b=>{const r=b.getBoundingClientRect();return{id:b.id,x:r.x,y:r.y,w:r.width,h:r.height};})",'mobile-'+label)
  s=next(r for r in rects if r['id']=='sword-skill');assert s['x']>=0 and s['y']>=0 and s['x']+s['w']<=w+1 and s['y']+s['h']<=h+1
  for r in rects:
   if r is not s:assert not(s['x']<r['x']+r['w'] and s['x']+s['w']>r['x'] and s['y']<r['y']+r['h'] and s['y']+s['h']>r['y']),(label,r)
  report['mobile'][label]=s
 page.set_viewport_size({'width':1000,'height':650})
 # Warm every view/material before comparing resource counts, then >3 simulated minutes.
 report['resources']=call('''async()=>{const d=SevenSinsDebug3D;for(let i=0;i<4;i++){await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:4,sword:i%2?'aurora':'prota',fp:i>1});d.viewQA(i>1);d.riteCast();d.riteSim(4,30);}const before=d.rinfo();for(let i=0;i<55;i++){await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:4,sword:i%2?'aurora':'prota',fp:i%3===0});d.viewQA(i%3===0);d.riteCast();d.riteSim(4,30);}return{before,after:d.rinfo(),vfx:d.riteState().vfx};}''')
 assert all(report['resources']['before'][k]==report['resources']['after'][k] for k in ['geo','tex','prog']),report['resources'];assert report['resources']['vfx']['cuts']==0
 print('RESOURCES',report['resources'],flush=True)
 report['profiles']={}
 for level in ['low','high','max']:
  profile(level);report['profiles'][level]=call("async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:10,sword:'aurora'});d.viewQA(true);d.riteFrame(0);const baseline=d.state().calls;d.riteCast();d.riteSim(1.8,30);const active=d.state().calls;const end=d.riteSim(2.2,30);return{baseline,active,damage:10000-end.hp,resources:d.rinfo()};}")
  assert report['profiles'][level]['damage']==117,report['profiles'][level]
 profile('low')
 report['storage']=call("()=>({campaign:window.localStorage.getItem('sevenSins3DCampaignV6'),hearts:window.localStorage.getItem('seven-sins-hearts')})");assert report['storage']['campaign'] is None
 report['errors']=errors;report['environment']='Chromium SwiftShader; simulated timing, no physical Android';(out/'results.json').write_text(json.dumps(report,indent=2));print('MOD232 BROWSER PASSED',flush=True);browser.close()
