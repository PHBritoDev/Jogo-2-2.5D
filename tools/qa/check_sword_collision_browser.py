"""Browser regression with Chromium/SwiftShader; no physical-device FPS claim."""
import argparse,shutil
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8767');ap.add_argument('--out',default='work/collisions');args=ap.parse_args();output=Path(args.out);output.mkdir(parents=True,exist_ok=True)
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=output
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1000,'height':650});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(args.url.rstrip('/')+'/mundo-3d-prototype.html?debug3d=1&todasHabilidades=1',wait_until='domcontentloaded');p.wait_for_function('window.SevenSinsDebug3D?.riteState().ready',timeout=120000)
 report={}
 report['boss']=p.evaluate('''async()=>{const d=SevenSinsDebug3D;await d.riteQA(true);d.riteEquip('prota');d.viewQA(false);const before=d.riteState();d.riteCast();const after=d.riteSim(2.1,30);return{before,after,safe:!d.collisionAt(after.hero[0],after.hero[2])};}''');r=report['boss'];assert r['after']['hero'][2]<r['before']['target'][2] and r['safe'] and r['after']['hp']==9924,r
 p.screenshot(path=str(out/'boss-passage.png'))
 report['aim']=p.evaluate('''async()=>{const d=SevenSinsDebug3D,out=[];for(const fp of [false,true])for(const yaw of [Math.PI,-Math.PI/2,Math.PI/2]){await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:5,sword:'aurora',fp});d.viewQA(fp,yaw,0);d.riteCast();const start=d.riteSim(.5),end=d.riteSim(4);out.push({fp,yaw,direction:start.projectiles[0]?.direction,hp:end.hp});}return out;}''')
 assert all(x['hp']==10000 and x['direction']['y']==0 for x in report['aim']),report['aim']
 report['blocked']=p.evaluate('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();for(let x=-25;x<70;x+=1)for(let z=25;z>-25;z-=1){if(!d.collisionAt(x,z)&&d.collisionAt(x,z-2)&&!d.collisionAt(x,z-4)){d.motionQA({x,z,enemyDistance:4,sword:'prota'});const before=d.riteState();d.riteCast();const after=d.riteSim(2.1);if(!after.events.length&&after.mana===100)return{before:before.hero,after:after.hero,mana:after.mana,status:document.querySelector('#status').textContent};}}throw Error('No blocked corridor located');}''')
 assert report['blocked']['before']==report['blocked']['after'] and report['blocked']['mana']==100
 report['walk']=p.evaluate('''async()=>{const d=SevenSinsDebug3D,out=[];for(const fp of [false,true])for(const sword of ['prota','aurora']){await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:0,fp,sword});d.viewQA(fp);const before=d.riteState();d.riteAttack();const after=d.motionStep(.4,{sprint:false});out.push({fp,sword,distance:before.hero[2]-after.hero[2],clip:after.clip});}return out;}''');assert all(x['distance']>1 and x['clip'].endswith('_Upper') for x in report['walk'])
 # An actual key press reaches the production movement loop (not the scripted joystick helper).
 report['wasd']=p.evaluate('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:0});d.viewQA(false);window.dispatchEvent(new KeyboardEvent('keydown',{key:'w',code:'KeyW'}));d.riteAttack();const a=d.riteState(),s=d.motionStep(.4,{x:0,z:0,sprint:false});window.dispatchEvent(new KeyboardEvent('keyup',{key:'w',code:'KeyW'}));return a.hero[2]-s.hero[2];}''');assert report['wasd']>1
 assert not errors,errors;report['errors']=errors;(out/'results.json').write_text(json.dumps(report,indent=2));print('EDGE CASES PASSED',flush=True);b.close()
