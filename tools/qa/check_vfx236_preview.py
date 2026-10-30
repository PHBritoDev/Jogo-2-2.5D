"""Actual WebGL VFX checks. Run against a static server; SwiftShader is NOT Android hardware."""
import argparse,json,time,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8786');ap.add_argument('--out',default='work/vfx236-preview');args=ap.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1000,'height':650});errors=[];p.route('**/favicon.ico',lambda r:r.fulfill(status=204));p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);report={}
 for kind,times in [('portals',[.3,1.4,2.5,3.6,4.3]),('dragon',[3.8,4.8,5.3,8,9.3]),('x',[.6,1,1.5])]:
  p.goto(args.url+'/skills-mod233-preview.html?skill='+kind,wait_until='domcontentloaded',timeout=120000);p.wait_for_function('window.preview',timeout=120000);p.evaluate('()=>{preview.freeze();preview.start();}');last=0;report[kind]={'frames':[]}
  for t in times:
   data=p.evaluate('dt=>{for(let i=0;i<Math.round(dt*60);i++)preview.step(1/60,false);preview.step(0);return{...preview.state(),...preview.info()};}',t-last);last=t
   p.screenshot(path=str(out/(kind+'-'+str(t)+'.png')));report[kind]['frames'].append({'t':t,**data})
   if kind=='dragon' and t in [5.3,8]:
    p.evaluate("()=>{const h=preview.skills.dragon.head;preview.cam([h.x+15,h.y+5,h.z+9],[h.x,h.y,h.z]);preview.step(0);}");p.screenshot(path=str(out/(kind+'-detail-'+str(t)+'.png')))
    p.evaluate('()=>preview.cam([33,24,-24],[0,13,8])')
  # Warm all phases before checking repeated use. Drawing every phase compiles every material.
  data=p.evaluate('''()=>{const sim=()=>{preview.start();for(let i=0;i<720;i++){preview.step(1/60,false);if(i%30===0)preview.step(0);}preview.step(0);};sim();const before=preview.info();const t=performance.now();for(let cast=0;cast<20;cast++)sim();const elapsed=performance.now()-t,after=preview.info();return{before,after,elapsedMs:elapsed};}''')
  assert data['before']['geo']==data['after']['geo'] and data['before']['programs']==data['after']['programs'],data;report[kind]['reuse']=data
  report[kind]['quality']=[]
  for q in [0,1,2]:
   r=p.evaluate('''q=>{preview.quality(q);preview.start();for(let i=0;i<({x:60,portals:150,dragon:270}[new URLSearchParams(location.search).get('skill')]);i++)preview.step(1/60,false);preview.step(0);return preview.info();}''',q);report[kind]['quality'].append({'q':q,**r})
  report[kind]['dispose']=p.evaluate('''()=>{for(const v of Object.values(preview.vfx))v.dispose();preview.renderer.render(preview.scene,preview.camera);return preview.info();}''');assert report[kind]['dispose']['geo']<=4,report[kind]['dispose']
  assert not errors,errors;print(kind,report[kind],flush=True)
 report['errors']=errors;report['environment']='Chromium WebGL / SwiftShader, deterministic simulated time, not a physical Android';(out/'results.json').write_text(json.dumps(report,indent=2));b.close()
