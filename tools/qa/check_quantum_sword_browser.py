"""Browser regression with Chromium/SwiftShader; no physical-device FPS claim."""
import argparse,shutil
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8767');ap.add_argument('--out',default='work/quantum');args=ap.parse_args();output=Path(args.out);output.mkdir(parents=True,exist_ok=True)
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=output
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 p=b.new_page(viewport={'width':844,'height':390},has_touch=True);errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
 p.goto(args.url.rstrip('/')+'/mundo-3d-prototype.html?debug3d=1&testeQuantum233=1&v=234',wait_until='domcontentloaded')
 p.wait_for_function("window.SevenSinsDebug3D?.riteState().ready&&SevenSinsDebug3D.riteState().sword==='quantum'",timeout=180000)
 report={'initial':p.evaluate('SevenSinsDebug3D.extraState()')}
 assert report['initial']['loadout']==['skill_x_rupture','skill_twin_portals','skill_judgment_dragon']
 assert p.locator('#marker').inner_text()=='234'
 report['quantum']=p.evaluate('''async()=>{const d=SevenSinsDebug3D;await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:4,fp:true,sword:'quantum'});d.viewQA(true);d.extraFrame(.1);return d.riteState();}''')
 p.screenshot(path=str(out/'quantum-fp.png'));assert report['quantum']['viewmodel']['visible']
 p.evaluate('()=>{const d=SevenSinsDebug3D;d.riteAttack();d.motionStep(.2);d.extraFrame(.2);}')
 p.screenshot(path=str(out/'quantum-fp-attack.png'))
 report['skills']=p.evaluate('''async()=>{const d=SevenSinsDebug3D,out=[];for(const [i,id]of ['skill_x_rupture','skill_twin_portals','skill_judgment_dragon'].entries()){await d.riteQA();d.motionQA({x:-5,z:16,enemyDistance:6,sword:'quantum'});d.extraQA();d.equipSlotQA(i,id);d.slotPress(['magic','magic2','magic3'][i]);const first=d.extraState();for(let k=0;k<360;k++)d.extraFrame(1/30);out.push({id,first,end:d.extraState()});}return out;}''')
 for r in report['skills']:
  assert r['first']['skills'][r['id']]['active'],r
  assert not r['end']['skills'][r['id']]['active'],r
 # Switching between every inventory sword still mounts a held model.
 report['equipment']=p.evaluate('''async()=>{const d=SevenSinsDebug3D,out=[];await d.riteQA();d.viewQA(true);for(const id of ['prota','aurora','vigilia','celeste','quantum']){d.riteEquip(id);d.riteSim(.1);d.extraFrame(.1);const s=d.riteState();out.push({sword:s.sword,visible:s.viewmodel.visible,triangles:s.viewmodel.triangles});}return out;}''')
 assert all(x['visible'] for x in report['equipment'])
 assert p.evaluate("window.localStorage.getItem('sevenSins3DCampaignV6')") is None
 assert not errs,errs
 report['errors']=errs;(out/'results.json').write_text(json.dumps(report,indent=2));print('MOD233 COMPATIBILITY PASSED',flush=True)
 b.close()
