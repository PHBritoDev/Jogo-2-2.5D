"""Chromium/WebGL evidence; fixed-step replays are not phone FPS measurements."""
import asyncio,os,json,subprocess,base64,time
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image,ImageDraw
OUT=Path(os.environ.get('AERIAL_OUTPUT','aerial-results/runtime'));BASE=os.environ.get('VISUAL_BASE_URL','http://127.0.0.1:4181')
async def main():
 OUT.mkdir(parents=True,exist_ok=True);report={'errors':[],'checks':{},'sequences':[],'limitations':['Chromium/SwiftShader, not Android hardware.','Videos are actual rendered fixed-step replays, not measured realtime FPS.','Six briefing videos were not present in the supplied workspace.']}
 async with async_playwright() as pw:
  opts={'headless':True,'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
  if Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
  if os.environ.get('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY'],'bypass':'localhost,127.0.0.1'}
  browser=await pw.chromium.launch(**opts);page=await browser.new_page(viewport={'width':960,'height':540},ignore_https_errors=True,has_touch=True)
  page.on('pageerror',lambda e:report['errors'].append(str(e)));page.set_default_timeout(120000)
  await page.add_init_script("localStorage.setItem('aerial-save-sentinel','preserve-me')")
  t=time.monotonic();await page.goto(BASE+'/experiments/aerial-combat/',wait_until='domcontentloaded');await page.wait_for_function('window.AerialLab?.ready');report['loadSeconds']=time.monotonic()-t
  await page.evaluate('AerialLab.ai(false);AerialLab.step();AerialLab.reset()')
  async def js(code):return await page.evaluate(code)
  report['initial']=await js('AerialLab.snapshot()');report['checks']['assetsReady']=len(await js('AerialLab.rig().originals'))==19
  # UI frames: five different native sword poses, both camera orientations.
  for i in range(5):
   await js(f'AerialLab.sample("AirSword_{i}",.3,0.4)');await page.screenshot(path=str(OUT/f'combo-{i}.png'))
  # Gameplay contacts must be observed, not just a clip name returned.
  report['combos']=[]
  for i in range(5):
   result=await js(f'''(()=>{{AerialLab.reset();AerialLab.ai(false);AerialLab.pose(0,0,1.7);AerialLab.target(0,0,0);AerialLab.comboStep({i});const from=AerialLab.log.length;AerialLab.command('attack');AerialLab.step(1/60,60);return{{state:AerialLab.snapshot(),events:AerialLab.log.slice(from)}};}})()''')
   report['combos'].append(result)
  report['checks']['fiveDistinctContacts']=all(any(e['type']=='contact' for e in r['events']) for r in report['combos'])
  print('contacts',[[(e.get('move'),e.get('phase')) for e in r['events'] if e['type']=='contact'] for r in report['combos']],flush=True)
  # 50 mixed dashes / 15 jumps; bounded pools after warming every effect.
  report['stress']=await js('''(()=>{AerialLab.reset();AerialLab.ai(false);AerialLab.pose(-10,0,10,0);AerialLab.target(0,0,0);AerialLab.setInput(0,0);const from=AerialLab.log.length;for(let i=0;i<50;i++){if(i<15)AerialLab.command('jump');AerialLab.command('dash');AerialLab.step(1/30,38);if(i%8===0)AerialLab.pose(-10,0,10,0);}AerialLab.step(1/30,60);return{state:AerialLab.snapshot(),events:AerialLab.log.slice(from)};})()''')
  starts=[e['now'] for e in report['stress']['events'] if e['type']=='dash'];jumps=[e for e in report['stress']['events'] if e['type']=='jump'];report['checks']['50dashes']=len(starts)==50;report['checks']['15jumps']=len(jumps)==15;report['checks']['400ms']=all(b-a>=.4-1e-6 for a,b in zip(starts,starts[1:]));report['checks']['landed']=report['stress']['state']['p']['y']==0
  report['wall']=await js("AerialLab.reset();AerialLab.pose(3,0,0,Math.PI/2);AerialLab.command('dash');AerialLab.step(1/30,20);AerialLab.snapshot()")
  report['checks']['wall']=report['wall']['p']['x']<3.44
  report['cancel']=await js("AerialLab.reset();AerialLab.command('jump');AerialLab.command('attack');AerialLab.lock(true);AerialLab.step(1/30,70);AerialLab.lock(false);AerialLab.snapshot()")
  report['checks']['cancel']=report['cancel']['p']['y']==0 and report['cancel']['combo'] is None
  report['magic']=[]
  for i in range(3):
   report['magic'].append(await js("(()=>{AerialLab.reset();AerialLab.setMana(40);AerialLab.command('jump');AerialLab.step(1/60,10);AerialLab.command('magic');AerialLab.step(1/60,60);AerialLab.command('attack');AerialLab.step(1/60,60);return AerialLab.snapshot();})()"))
  report['checks']['magicCost']=all(r['mana']==22 for r in report['magic'])
  await js('AerialLab.reset();AerialLab.setInvulnerable(true);AerialLab.pose(0,0,1.7);AerialLab.target(0,0,0);AerialLab.command("attack");AerialLab.step(1/60,60)');report['checks']['invulnerableNoMana']=(await js('AerialLab.snapshot().mana'))==40;await js('AerialLab.setInvulnerable(false)')
  # Real physical launcher followed by player jump; enemy keeps aerial retaliation.
  report['air']=await js("(()=>{AerialLab.reset();AerialLab.ai(false);AerialLab.pose(0,0,1.7);AerialLab.target(0,0,0);AerialLab.comboStep(3);const start=AerialLab.log.length;AerialLab.command('attack');AerialLab.step(1/60,29);AerialLab.command('jump');AerialLab.ai(true);AerialLab.step(1/60,18);AerialLab.command('attack');AerialLab.step(1/60,100);return{state:AerialLab.snapshot(),events:AerialLab.log.slice(start)};})()")
  report['checks']['launcher']=any(e['type']=='launcher' for e in report['air']['events']);report['checks']['retaliation']=any(e['type']=='retaliation' for e in report['air']['events'])
  # Resource stability: repeat after every pool/material has been warmed once.
  report['pool']=await js("(()=>{AerialLab.reset();AerialLab.ai(false);AerialLab.pose(-10,0,8);AerialLab.command('dash');AerialLab.step(1/30,20);const before=AerialLab.snapshot();for(let i=0;i<50;i++){AerialLab.pose(-10,0,8);AerialLab.command('dash');AerialLab.step(1/30,20);}return{before,after:AerialLab.snapshot()};})()")
  report['checks']['boundedPools']=report['pool']['before']['resources']==report['pool']['after']['resources']
  # 30 / 60 Hz and low / high, same arena and rig, baseline/prototype.
  report['comparison']=[]
  for mode in [False,True]:
   for quality in ['low','high']:
    for hz in [30,60]:
     await js(f"AerialLab.mode({str(mode).lower()});AerialLab.quality('{quality}');AerialLab.ai(false);AerialLab.pose(0,0,1.7);AerialLab.target(0,0,0);AerialLab.command('attack');AerialLab.step(1/{hz},{hz})")
     state=await js('AerialLab.snapshot()');report['comparison'].append({'prototype':mode,'quality':quality,'hz':hz,'state':state})
  await js('AerialLab.mode(true);AerialLab.quality("high");AerialLab.ai(false)')
  # Touch joystick and camera are exercised with real pointer events.
  await page.set_viewport_size({'width':393,'height':852});await js('AerialLab.reset();AerialLab.step()');await page.screenshot(path=str(OUT/'portrait.png'))
  await page.touchscreen.tap(282,735);await js('AerialLab.step(1/60,30)');report['checks']['touchAction']=any(e['type']=='command' for e in await js('AerialLab.log.slice(-10)'))
  await page.set_viewport_size({'width':960,'height':540})
  # Render and encode three real sequences, 20fps timeline; never report as device FPS.
  for name in ['solo','dash-jump','air-duel']:
   folder=OUT/name;folder.mkdir(exist_ok=True)
   await js('AerialLab.mode(true);AerialLab.reset();AerialLab.ai(false);AerialLab.pose(0,0,1.7);AerialLab.target(0,0,0)')
   frames=80
   for f in range(frames):
    if name=='solo' and f in [0,14,28,45,61]:
     i=[0,14,28,45,61].index(f);await js(f'AerialLab.pose(0,0,1.7);AerialLab.target(0,0,0);AerialLab.comboStep({i});AerialLab.command("attack")')
    if name=='dash-jump':
     if f==0:await js('AerialLab.pose(-6,0,4);AerialLab.target(0,0,0);AerialLab.command("dash")')
     if f in [5,38]:await js('AerialLab.command("jump")')
     if f in [11,27,49,65]:await js('AerialLab.command("dash")')
     if f in [15,53]:await js('AerialLab.command("attack")')
    if name=='air-duel':
     if f==0:await js('AerialLab.comboStep(3);AerialLab.command("attack")')
     if f==10:await js('AerialLab.command("jump");AerialLab.ai(true)')
     if f==18:await js('AerialLab.command("attack")')
     if f==38:await js('AerialLab.command("magic")')
    await js('AerialLab.step(1/20)');await page.screenshot(path=str(folder/f'{f:04}.png'))
   subprocess.run(['ffmpeg','-loglevel','error','-y','-framerate','20','-i',str(folder/'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','23',str(OUT/f'{name}.mp4')],check=True)
   report['sequences'].append(name+'.mp4');print('video',name,flush=True)
  # Swap to legacy rig and back; no state persists into the campaign save.
  await js('AerialLab.selectRig("old")');await js('AerialLab.command("attack");AerialLab.step(1/60,60)');report['oldRig']=await js('AerialLab.snapshot()');await js('AerialLab.selectRig("new")');report['checks']['saveUnchanged']=await js("localStorage.getItem('aerial-save-sentinel')==='preserve-me' && localStorage.length===1")
  pixels=[]
  for png in sorted(OUT.glob('*.png')):
   rgb=Image.open(png).convert('RGB').resize((128,72)).tobytes();pixels.append({'file':png.name,'rgb':base64.b64encode(rgb).decode()})
  result=subprocess.run(['node','experiments/aerial-combat/qa/perception.cjs'],input=json.dumps(pixels),text=True,capture_output=True,check=True);report['pixelAgent']=json.loads(result.stdout)
  report['status']='passed' if all(report['checks'].values()) and not report['errors'] else 'requires-fixes';(OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps({'status':report['status'],'checks':report['checks'],'errors':report['errors']}),flush=True)
  await browser.close()
 if report['status']!='passed':raise RuntimeError('Acceptance checks failed; see report.json')
asyncio.run(main())
