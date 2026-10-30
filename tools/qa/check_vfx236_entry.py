"""Touch entry + save isolation, then final dragon material/camera frames using production renderer."""
import argparse,json,time,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8786');ap.add_argument('--out',default='work/vfx236-entry');args=ap.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':844,'height':390},has_touch=True,is_mobile=True);errors=[];bad=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' and any(x in m.text for x in ['Shader','GL_INVALID','WebGL']) else None);p.on('response',lambda r:bad.append([r.url,r.status]) if r.status>=400 and r.url.startswith(args.url) else None)
 p.add_init_script("try{if(window===top&&!localStorage.getItem('qa236seeded')){localStorage.setItem('qa236seeded','1');localStorage.setItem('sevenSins3DCampaignV6','{\"qa\":236}');localStorage.setItem('seven-sins-hearts','7');}}catch(e){}")
 start=time.time();p.goto(args.url+'/?vfxLab236=1&resetGalaxy1=1&v=236',wait_until='domcontentloaded');p.wait_for_selector('iframe');f=p.frames[1];f.wait_for_function("window.SwordRiteAnimationReport?.length===5&&document.querySelector('#quest-title').textContent.includes('MOD 236')",timeout=180000)
 report={'publicEntrySeconds':time.time()-start};assert f.locator('#marker').inner_text()=='236';assert f.evaluate('typeof window.SevenSinsDebug3D')=='undefined';f.select_option('#lab-quality','low');f.locator('#camera-toggle-3d').tap();f.locator('#magic2').tap();f.wait_for_function("document.querySelector('#magic2').classList.contains('skill-cooling')",timeout=30000);p.screenshot(path=str(out/'touch-portals.png'))
 p.set_viewport_size({'width':390,'height':844});f.locator('#lab-reset').tap();p.screenshot(path=str(out/'portrait.png'));report['save']=p.evaluate("()=>({campaign:localStorage.getItem('sevenSins3DCampaignV6'),hearts:localStorage.getItem('seven-sins-hearts')})");assert report['save']=={'campaign':'{"qa":236}','hearts':'7'},report['save'];print('PUBLIC TOUCH PASS',report,flush=True)
 p.set_viewport_size({'width':844,'height':390});p.goto(args.url+'/mundo-3d-prototype.html?vfxLab236=1&debug3d=1',wait_until='domcontentloaded');p.wait_for_function('window.SevenSinsDebug3D?.riteState().ready',timeout=180000);p.evaluate('async()=>{await SevenSinsDebug3D.riteQA();}')
 report['dragon']=[]
 for quality,fp in [('low',False),('low',True),('high',False)]:
  p.evaluate("({quality,fp})=>{document.querySelector('#lab-reset').click();const q=document.querySelector('#lab-quality');q.value=quality;q.dispatchEvent(new Event('change'));SevenSinsDebug3D.viewQA(fp,0,.22);SevenSinsDebug3D.cast('skill_judgment_dragon');}",{'quality':quality,'fp':fp});last=0
  for t in [3.9,5.1,8,12]:
   data=p.evaluate("delta=>{const d=SevenSinsDebug3D;for(let i=0;i<Math.round(delta*60);i++)d.extraFrame(1/60,false);d.extraFrame(0);return{...d.vfxState(),state:d.extraState(),grip:d.gripQA()};}",t-last);last=t
   if t!=12:p.screenshot(path=str(out/(quality+('-fp-' if fp else '-tp-')+str(t)+'.png')))
   report['dragon'].append({'quality':quality,'fp':fp,'t':t,**data});assert data['grip']['error']<1e-5
  assert data['dragonViewWeight']<.01 and data['camera']['distance']==(.72 if fp else 6) and data['state']['hp']==9934,data
 assert not errors and not bad,(errors,bad);report['errors']=errors;report['failedResponses']=bad;report['environment']='Chromium SwiftShader; touch/mobile viewports, no physical Android';(out/'results.json').write_text(json.dumps(report,indent=2));print('PASS ENTRY AND FINAL DRAGON',flush=True);b.close()
