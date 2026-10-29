"""Browser regression: python tools/qa/check_sword_rites_browser.py --url http://127.0.0.1:8765
Requires Playwright + Chromium. No Android device results are inferred from this run.
"""
import argparse,json,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8765');parser.add_argument('--out',default='work/sword-browser');args=parser.parse_args()
outdir=Path(args.out);outdir.mkdir(parents=True,exist_ok=True)
pw=sync_playwright().start()
browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
context=browser.new_context(viewport={'width':1000,'height':650},device_scale_factor=1)
page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
page.goto(args.url.rstrip('/')+'/mundo-3d-prototype.html?debug3d=1&todasHabilidades=1&v=231',wait_until='domcontentloaded')
page.wait_for_function('window.SevenSinsDebug3D && SevenSinsDebug3D.riteState().ready',timeout=120000)
page.select_option('#graphics-profile-3d','low',force=True)
def call(js,shot=None,**extra):
 if 'viewport' in extra:page.set_viewport_size(extra['viewport'])
 if extra.get('wait'):page.wait_for_timeout(extra['wait'])
 result=page.evaluate(js)
 if shot:page.screenshot(path=str(outdir/shot))
 assert not errors,errors
 return result
report={}
report['fps']=call('''async()=>{const d=SevenSinsDebug3D,out=[];for(const fps of [30,60,120]){await d.riteQA();d.riteEquip('prota');d.nearBoss();d.face();d.riteAttack();let basic=d.riteSim(.75,fps);await d.riteQA();d.riteCast();let judgment=d.riteSim(1.5,fps);await d.riteQA();d.riteEquip('aurora');d.riteCast();let eclipse=d.riteSim(3.5,fps);out.push({fps,basic:10000-basic.hp,judgment:10000-judgment.hp,eclipse:10000-eclipse.hp,after:judgment.hero,mana:[judgment.mana,eclipse.mana]});}return out;}''')
print('FPS',report['fps'],flush=True)
for row in report['fps']:
 assert row['basic']==25,row
 assert row['judgment']==76,row
 assert row['eclipse']==117,row
# Three distinct authored poses and camera-relative blade trail.
for i,(clip,t) in enumerate([('Rite_Crescent',.32),('Rite_Reverse',.30),('Rite_Ascendant',.37)]):
 report[clip]=call(f'''async()=>{{const d=SevenSinsDebug3D;await d.riteQA();d.riteEquip('prota');d.fly([43,2.4,17],[40,1.05,17]);d.ritePose('{clip}',{t});return d.riteState();}}''',f'combo-{i+1}.png')
report['eclipse']=call('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.riteEquip('aurora');d.fly([46,3.8,21],[40,1.2,13]);d.riteCast();return d.riteSim(1.84);}''','eclipse.png')
report['judgment']=call('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.riteEquip('prota');d.fly([44,3.3,19],[40,1,14]);d.riteCast();return d.riteSim(.95);}''','judgment.png')
report['boss']=call('''async()=>{const d=SevenSinsDebug3D;await d.riteQA(true);d.riteEquip('prota');d.fly([46,4,20],[40,1.5,14]);d.riteCast();return d.riteSim(.95);}''','judgment-boss.png')
assert report['boss']['hero'][2]<14,report['boss']
# Real rendered resources after 55 complete uses; shader programs already warmed.
report['resources']=call('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.riteEquip('aurora');d.riteCast();d.riteSim(4,30);const before=d.rinfo();for(let i=0;i<55;i++){await d.riteQA();d.riteEquip('aurora');d.riteCast();d.riteSim(4,30);}return{before,after:d.rinfo(),vfx:d.riteState().vfx};}''')
print('Resources',report['resources'],flush=True)
assert report['resources']['before']['geo']==report['resources']['after']['geo'],report['resources']
assert report['resources']['after']['tex']==report['resources']['before']['tex'],report['resources']
# Inspect actual control bounds in both mobile orientations.
for label,w,h in [('mobile-landscape',844,390),('mobile-portrait',390,844)]:
 report[label]=call('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.riteEquip('aurora');return [...document.querySelectorAll('#actions button')].filter(b=>getComputedStyle(b).display!=='none').map(b=>{const r=b.getBoundingClientRect();return{id:b.id,x:r.x,y:r.y,w:r.width,h:r.height};});}''',label+'.png',viewport={'width':w,'height':h})
 rects=report[label]
 for r in rects:assert r['x']>=0 and r['y']>=0 and r['x']+r['w']<=w+1 and r['y']+r['h']<=h+1,(label,r)
 s=next(r for r in rects if r['id']=='sword-skill')
 for r in rects:
  if r is s:continue
  assert not(s['x']<r['x']+r['w'] and s['x']+s['w']>r['x'] and s['y']<r['y']+r['h'] and s['y']+s['h']>r['y']),(label,s,r)
open(outdir/'browser-results.json','w').write(json.dumps(report,indent=2))
print('BROWSER CHECKS PASSED',flush=True)

browser.close();pw.stop()
