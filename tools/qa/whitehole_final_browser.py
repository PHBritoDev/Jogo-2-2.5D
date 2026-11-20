"""Final pass: accretion disc, audio controls during pause and lethal-hit handoff."""
import asyncio,os,json
from pathlib import Path
from playwright.async_api import async_playwright
out=Path(os.getenv('WHITEHOLE_QA_OUT','docs/evidencias/ultimate-acrecao'))
async def main():
 out.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy={'server':os.environ.get('HTTPS_PROXY','http://proxy:8080'),'bypass':'127.0.0.1,localhost'},args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  page=await b.new_page(viewport={'width':800,'height':500},ignore_https_errors=True);page.set_default_timeout(120000);errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://127.0.0.1:8769/whitehole-preview.html');await page.wait_for_function('window.preview');await page.evaluate('preview.freeze();preview.start();preview.step(10.5)');await page.screenshot(path=str(out/'crown.png'));print('Final corona',await page.evaluate('preview.info()'),flush=True)
  await page.goto('http://127.0.0.1:8769/mundo-3d-prototype.html?debug3d=1&todasHabilidades=1');await page.wait_for_function('window.SevenSinsDebug3D && SevenSinsDebug3D.cineState().actions.includes("idle")')
  await page.evaluate('SevenSinsDebug3D.whiteQA()');await page.wait_for_timeout(600)
  # Leave a camera pointer held, then cast: the cinematic must clear that stale gesture.
  await page.mouse.move(400,210);await page.mouse.down()
  await page.evaluate('SevenSinsDebug3D.cast("ultimate");SevenSinsDebug3D.whiteFrame(9.9)')
  await page.screenshot(path=str(out/'colossal.png'));await page.mouse.up()
  await page.keyboard.press('p');t=(await page.evaluate('SevenSinsDebug3D.whiteState()'))['time']
  assert (await page.evaluate('SevenSinsDebug3D.whiteFrame(5)'))['time']==t
  await page.locator('#graphics-toggle-3d').click();await page.locator('#graphics-panel-3d').wait_for(state='visible');await page.locator('#vol-muted').check()
  assert await page.evaluate('JSON.parse(localStorage.getItem("seven-sins-3d-audio")).muted')
  await page.locator('#vol-muted').uncheck();await page.locator('#graphics-panel-3d .panel-close').click();await page.locator('#pause-resume').click()
  state=await page.evaluate('SevenSinsDebug3D.whiteFrame(7.1)');assert not state['locked'] and state['hp']==140,state
  yaw=state['yaw'];await page.mouse.move(470,220);await page.mouse.up()
  assert (await page.evaluate('SevenSinsDebug3D.whiteState()'))['yaw']==yaw
  # Recast against the SAME 140-HP encounter, no QA reset. Its death resolves after return.
  await page.evaluate('SevenSinsDebug3D.skills();SevenSinsDebug3D.cast("ultimate");SevenSinsDebug3D.whiteFrame(13)')
  impact=await page.evaluate('SevenSinsDebug3D.whiteState()');assert impact['hp']==0 and impact['locked'],impact
  result=await page.evaluate('SevenSinsDebug3D.whiteFrame(4)');assert not result['locked'],result
  assert not (await page.evaluate('SevenSinsDebug3D.state()'))['enemy']['alive']
  await page.evaluate("""() => {
    const game = SevenSinsDebug3D;
    game.whiteQA();
    game.packQA('enemy1', 'captor', 3, 450);
  }""")
  await page.wait_for_function("SevenSinsDebug3D.squadState().snap?.actors.length === 3")
  damage = await page.evaluate("""() => {
    const game = SevenSinsDebug3D;
    const squad = game.squadState();
    const focus = squad.snap.actors.find(a => a.id === squad.focus);
    const [near, far] = squad.snap.actors.filter(a => a.id !== focus.id);
    game.squadPose(near.id, focus.x + 2, focus.z, 0);
    game.squadPose(far.id, focus.x + 15, focus.z, 0);
    game.placeAt(focus.x, game.groundAt(focus.x, focus.z + 3), focus.z + 3, Math.PI);
    game.skills();
    const hp = () => Object.fromEntries(game.squadState().snap.actors.map(a => [a.id, a.hp]));
    const before = hp();
    document.querySelector('#ultimate').dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerId: 4, pointerType: 'touch'
    }));
    game.whiteFrame(13.25);
    const impact = hp();
    game.whiteFrame(3.75);
    const end = hp();
    return [focus, near, far].map(a => [before[a.id] - impact[a.id], impact[a.id] - end[a.id]]);
  }""")
  assert damage == [[160, 0], [153, 0], [0, 0]], damage
  assert not errors,errors
  print('PASS: pause key, audio controls, stale camera gesture cleared, 160 damage, lethal encounter handed back after restoration; no page errors',flush=True)
  await b.close()
asyncio.run(main())
