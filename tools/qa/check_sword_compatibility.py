"""Browser regression with Chromium/SwiftShader; no physical-device FPS claim."""
import argparse,shutil
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8767');ap.add_argument('--out',default='work/compatibility');args=ap.parse_args();output=Path(args.out);output.mkdir(parents=True,exist_ok=True)
from playwright.sync_api import sync_playwright
import json
pw=sync_playwright().start();browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
page=browser.new_page(viewport={'width':1000,'height':650});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
page.goto(args.url.rstrip('/')+'/mundo-3d-prototype.html?debug3d=1&todasHabilidades=1&v=234',wait_until='domcontentloaded');page.wait_for_function('window.SevenSinsDebug3D?.riteState().ready',timeout=120000)
out={}
def call(js):
 r=page.evaluate(js);assert not errors,errors;return r
out['inputs']=call('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.riteEquip('prota');document.querySelector('#attack').dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true,pointerId:2}));let attack=d.riteState().active;d.riteSim(.4);document.querySelector('#defend').dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true,pointerId:3}));let defense=d.riteState().active;document.querySelector('#defend').dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',bubbles:true,pointerId:3}));await d.riteQA();window.dispatchEvent(new KeyboardEvent('keydown',{key:'r',code:'KeyR'}));let special=d.riteState();document.querySelector('#pause-button').click();let paused=d.riteState();document.querySelector('#pause-resume').click();await d.riteQA();d.riteEquip('aurora');document.querySelector('#sword-skill').dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true,pointerId:4}));let touch=d.riteState();d.riteEquip('vigilia');let hidden=document.querySelector('#sword-skill').hidden;d.riteFrame(.01);hidden=document.querySelector('#sword-skill').hidden;return{attack,defense,special:special.active,paused:paused.active,touch:touch.active,otherSwordHidden:hidden};}''')
assert out['inputs']['attack']['kind']=='basic'
assert out['inputs']['defense'] is None
assert out['inputs']['special']['kind']=='prota'
assert out['inputs']['paused'] is None
assert out['inputs']['touch']['kind']=='aurora'
assert out['inputs']['otherSwordHidden']
out['magic']=call('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.riteEquip('prota');d.viewQA(true);d.skills();d.cast('magic');const siege=d.siegeState();for(let i=0;i<5;i++){d.siegeAttack();d.siegeFrame(.7);}d.siegeFrame(1);d.cast('magic2');const stars=d.starfallFrame(.25);d.starfallFrame(15);d.skills();d.cast('magic3');const phoenix=d.phoenixFrame(.25);d.phoenixFrame(24);d.skills();d.cast('ultimate');const white=d.whiteFrame(.25);d.whiteCancel();return{siege:{active:siege.active,remaining:siege.remaining},stars:{active:stars.active,phase:stars.phase},phoenix:{active:phoenix.active,phase:phoenix.phase},white:{active:white.active,locked:white.locked},restored:!d.whiteState().locked};}''')
print(out,flush=True)
assert all(out['magic'][k]['active'] for k in ['siege','stars','phoenix','white'])
assert out['magic']['restored']

out['controls']=call("""async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:0,fp:true});d.viewQA(true);window.dispatchEvent(new KeyboardEvent('keydown',{key:'Shift',code:'ShiftLeft'}));const shift=d.riteState();window.dispatchEvent(new KeyboardEvent('keyup',{key:'Shift',code:'ShiftLeft'}));d.riteAttack();window.dispatchEvent(new KeyboardEvent('keydown',{key:'f',code:'KeyF'}));const dash=d.riteState();await d.riteQA();d.riteAttack();window.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space'}));const jump=d.riteState();await d.riteQA();d.riteAttack();d.killPlayer();const death=d.riteState();await d.riteQA();d.viewQA(true);d.skills();d.cast('ultimate');d.whiteFrame(.2);const hidden=d.riteState().viewmodel.visible;d.whiteCancel();const restored=d.riteState().viewmodel.visible;return{shift:shift.motion,dash:dash.active,dashTime:dash.motion.dash,jump:jump.active,air:!jump.motion.grounded,death:death.active,hidden,restored,save:window.localStorage.getItem('sevenSins3DCampaignV6')};}""")
assert out['controls']['shift']['sprint'] and out['controls']['shift']['dash']==0
assert out['controls']['dash'] is None and out['controls']['dashTime']>0
assert out['controls']['jump'] is None and out['controls']['air']
assert out['controls']['death'] is None and not out['controls']['hidden'] and out['controls']['restored']
assert out['controls']['save'] is None
out['errors']=errors
open(output/'results.json','w').write(json.dumps(out,indent=2));print('COMPATIBILITY PASSED',out['controls'],flush=True);browser.close();pw.stop()
