from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time,argparse,shutil
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8786');ap.add_argument('--out',default='work/vfx236-main');args=ap.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':844,'height':390},has_touch=True,is_mobile=True);errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.on('console',lambda m:errs.append(m.text) if m.type=='error' and any(x in m.text for x in ['Shader','GL_INVALID','WebGL']) else None)
 start=time.time();p.goto(args.url+'/mundo-3d-prototype.html?vfxLab236=1&debug3d=1',wait_until='domcontentloaded');p.wait_for_function("window.SevenSinsDebug3D?.riteState().ready && document.querySelector('#quest-title').textContent.includes('MOD 236')",timeout=180000)
 report={'loadSeconds':time.time()-start,'scenes':[]};print('READY',report['loadSeconds'],errs,flush=True)
 p.evaluate("async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:12});document.querySelector('#lab-quality').value='low';document.querySelector('#lab-quality').dispatchEvent(new Event('change'));}")
 for fp in [False,True]:
  for kind,times in [('skill_x_rupture',[.75,1.3,2]),('skill_twin_portals',[.3,1.5,2.5,4.2,6]),('skill_judgment_dragon',[3.9,5.1,8,9.3,12])]:
   p.evaluate("({fp,kind})=>{const d=SevenSinsDebug3D;document.querySelector('#lab-reset').click();d.viewQA(fp,0,.22);d.extraFrame(1,false);d.cast(kind);}",{'fp':fp,'kind':kind});last=0
   for t in times:
    data=p.evaluate("delta=>{const d=SevenSinsDebug3D;for(let i=0;i<Math.round(delta*60);i++)d.extraFrame(1/60,false);d.extraFrame(0);return{...d.extraState(),visual:d.vfxState(),grip:d.gripQA(),resources:d.rinfo()};}",t-last);last=t
    name=('fp-' if fp else 'tp-')+kind+'-'+str(t);p.screenshot(path=str(out/(name+'.png')));report['scenes'].append({'name':name,**data});print(name,data['skills'][kind],data['hp'],data['visual']['camera'],flush=True);assert not errs,errs
   if kind=='skill_judgment_dragon':assert data['visual']['dragonViewWeight']<.01
   assert data['grip']['error']<1e-5,data['grip']
   assert data['hp']==10000-{'skill_x_rupture':38,'skill_twin_portals':58,'skill_judgment_dragon':66}[kind],(kind,data['hp'])
 report['scenarios']=[]
 for mode in ['moving','ground','wall']:
  for kind in ['skill_x_rupture','skill_twin_portals','skill_judgment_dragon']:
   data=p.evaluate("({mode,kind})=>{const d=SevenSinsDebug3D,e=document.querySelector('#lab-scenario');e.value=mode;e.dispatchEvent(new Event('change'));d.viewQA(false,0,.22);d.cast(kind);for(let i=0;i<750;i++)d.extraFrame(1/60,false);d.extraFrame(0);return{...d.extraState(),visual:d.vfxState()};}",{'mode':mode,'kind':kind});report['scenarios'].append({'mode':mode,'kind':kind,**data});assert not data['skills'][kind]['active'];assert data['hp']==10000 if mode=='ground' or (mode=='wall' and kind!='skill_judgment_dragon') else data['hp']<=10000
   print('SCENARIO',mode,kind,data['hp'],flush=True)
 report['profiles']=[]
 for quality in ['low','high','max']:
  for kind in ['skill_x_rupture','skill_twin_portals','skill_judgment_dragon']:
   data=p.evaluate("({quality,kind})=>{const d=SevenSinsDebug3D,q=document.querySelector('#lab-quality'),e=document.querySelector('#lab-scenario');e.value='still';e.dispatchEvent(new Event('change'));q.value=quality;q.dispatchEvent(new Event('change'));d.cast(kind);const count=kind==='skill_judgment_dragon'?300:90;for(let i=0;i<count;i++)d.extraFrame(1/60,false);d.extraFrame(0);const active=d.state(),gpu=d.rinfo();for(let i=count;i<750;i++)d.extraFrame(1/60,false);return{gpu,calls:active.calls,hp:d.extraState().hp};}",{'quality':quality,'kind':kind});report['profiles'].append({'quality':quality,'kind':kind,**data});assert data['hp']==10000-{'skill_x_rupture':38,'skill_twin_portals':58,'skill_judgment_dragon':66}[kind]
 p.evaluate("()=>{const q=document.querySelector('#lab-quality');q.value='low';q.dispatchEvent(new Event('change'));}")
 report['swords']=p.evaluate("async()=>{const d=SevenSinsDebug3D,out=[];for(const fp of [false,true])for(const sword of ['prota','aurora']){await d.riteQA();d.motionQA({x:40,z:30,enemyDistance:4,fp,sword});d.viewQA(fp);d.riteAttack();d.riteSim(.5);const grip=d.gripQA();d.riteSim(.4);d.riteAttack();d.riteSim(.5);d.riteSim(.4);d.riteAttack();const end=d.riteSim(.8);out.push({fp,sword,grip,height:end.height});}return out;}");assert all(x['grip']['error']<1e-5 and 1.5<x['height']<2.3 for x in report['swords']),report['swords']
 p.set_viewport_size({'width':390,'height':844});p.evaluate("async()=>{await SevenSinsDebug3D.riteQA();document.querySelector('#lab-reset').click();SevenSinsDebug3D.viewQA(true);SevenSinsDebug3D.extraFrame(1);}");p.screenshot(path=str(out/'portrait.png'));report['portrait']=p.evaluate("()=>{const r=document.querySelector('#vfx-lab').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}");r=report['portrait'];assert r['x']>=0 and r['y']>=0 and r['x']+r['w']<=390 and r['y']+r['h']<=844
 report['storage']=p.evaluate("()=>({campaign:window.localStorage.getItem('sevenSins3DCampaignV6'),errors:[]})");assert report['storage']['campaign'] is None
 assert not errs,errs;report['environment']='Chromium SwiftShader, mobile viewport and touch, no physical Android';report['errors']=errs;(out/'results.json').write_text(json.dumps(report,indent=2));print('PASS MAIN',flush=True);b.close()
