// Browser fixtures for shield impacts, death, warm re-entry and the landing tell.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const output = 'docs/qa/vhazrael-duelo';
const host = process.env.VZ_HOST || 'http://localhost:4219';

async function enter(page) {
  await page.waitForFunction(() => {
    const api = window.SevenSinsDebug3D;
    if (api?.dimState().vs) api.vsGo();
    return api?.dimState().battle?.active && api.vzStats()?.alive;
  }, null, {timeout: 180000});
}
async function frame(page, name) {
  const encoded = await page.locator('#scene').evaluate(canvas => {
    SevenSinsDebug3D.combatStep(0, {draw:true});
    return canvas.toDataURL('image/jpeg', .87).split(',')[1];
  });
  fs.writeFileSync(output+'/'+name+'.jpg', Buffer.from(encoded, 'base64'));
}
async function touchDuel(page) {
  const apiState=()=>page.evaluate(()=>SevenSinsDebug3D.heroState());
  await page.evaluate(()=>{
    const api=SevenSinsDebug3D,b=api.vzBladeClearance().boss;
    api.squadCam(null);
    api.teleport(b[0]+Math.sin(b[3])*2,b[2]+Math.cos(b[3])*2,b[3]+Math.PI);
  });
  const start=await apiState();
  const cdp=await page.context().newCDPSession(page);
  const stick=await page.locator('#stick').boundingBox();
  const x=Math.round(stick.x+stick.width/2),y=Math.round(stick.y+stick.height/2);
  try {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+stick.width*.36,y}]});
    await page.evaluate(()=>SevenSinsDebug3D.combatStep(.32,{fps:60}));
  } finally {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await cdp.detach();
  }
  const moved=await apiState();
  assert.ok(Math.hypot(moved.p[0]-start.p[0],moved.p[2]-start.p[2])>.05,'joystick');
  await page.locator('#attack').tap();
  await page.evaluate(()=>SevenSinsDebug3D.combatStep(.12,{fps:60}));
  const attacking=await apiState();
  await page.evaluate(()=>SevenSinsDebug3D.combatStep(1.25,{fps:60}));
  await page.locator('#dash').tap();
  const dodging=await apiState();
  assert.ok(dodging.dash>0,'dash por toque');
  await page.evaluate(()=>SevenSinsDebug3D.combatStep(.75,{fps:60}));
  return {start,moved,attacking,dodging};
}
async function run() {
  const browser = await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:852,height:393}, hasTouch:true});
    await page.addInitScript(() => localStorage.setItem('seven-sins-3d-graphics','medium'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(host+'/mundo-3d-prototype.html?testeDimensao=bishop1&debug3d=1', {waitUntil:'domcontentloaded'});
    const rounds = [];
    for (let round = 0; round < 3; round++) {
      await enter(page);
      const result = await page.evaluate(() => {
        const api = SevenSinsDebug3D;
        api.freeze(true);
        const id = api.combat315().enemies.find(enemy => enemy.shield).id;
        const b = api.vzBladeClearance().boss;
        api.teleport(b[0]+Math.sin(b[3])*3,b[2]+Math.cos(b[3])*3,b[3]+Math.PI);
        api.squadCam([3,1.8,4,0,1.2,0]);
        api.squadShield(id);
        api.combatStep(.12,{fps:60});
        const weakDamage = api.squadHit(id,10);
        api.combatStep(.05,{fps:60});
        const state = api.combat315();
        const report = api.combatReport();
        return {id,weakDamage,state:state.enemies.find(e=>e.id===id).shield,vfx:state.shieldVfx,
          geometry:report.geometry,programs:report.programs,drawCalls:report.draw.calls};
      });
      assert.equal(result.state,'active');
      assert.ok(result.vfx.visible>0 && result.weakDamage>0 && result.weakDamage<10);
      if (!round) await frame(page,'escudo-impacto');
      result.heavy = await page.evaluate(id => {
        const api=SevenSinsDebug3D;
        const damage=api.squadHit(id,50);
        return {damage,state:api.combat315().enemies.find(e=>e.id===id).shield};
      }, result.id);
      assert.equal(result.heavy.state,'cooldown');
      if (!round && !process.env.VZ_LIFECYCLE_ONLY) {
        await page.evaluate(() => {
          SevenSinsDebug3D.squadCam([6,3.4,9,0,3,0]);
          SevenSinsDebug3D.squadLeap();
        });
        result.leap=[];
        const temp = fs.mkdtempSync(path.join(os.tmpdir(),'vhazrael-leap-'));
        try {
          for (let index=0;index<36;index++) {
            const sample=await page.evaluate(() => {
              const api=SevenSinsDebug3D;
              api.combatStep(1/12,{fps:60});
              const v=api.vzStats();
              const image=document.querySelector('#scene').toDataURL('image/jpeg',.88).split(',')[1];
              return {image,state:{act:v?.act,air:v?.air,boss:api.vzBladeClearance()?.boss}};
            });
            result.leap.push(sample.state);
            const image=Buffer.from(sample.image,'base64');
            fs.writeFileSync(path.join(temp,String(index).padStart(2,'0')+'.jpg'),image);
            if ([2,9,14,18,21,23].includes(index)) fs.writeFileSync(output+'/salto-'+index+'.jpg',image);
          }
          assert.ok(Math.max(...result.leap.map(s=>s.air))>5);
          fs.writeFileSync(output+'/salto.json',JSON.stringify(result.leap));
          execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','12','-i',
            path.join(temp,'%02d.jpg'),'-c:v','libvpx-vp9','-pix_fmt','yuv420p','-threads','2',output+'/salto.webm']);
        } finally {
          fs.rmSync(temp,{recursive:true,force:true});
        }
      }
      if(round===2)result.touch=await touchDuel(page);
      await page.evaluate(() => {SevenSinsDebug3D.freeze(false);SevenSinsDebug3D.killPlayer();});
      await page.waitForFunction(() => !SevenSinsDebug3D.dimState().battle, null, {timeout:30000});
      result.afterDeath=await page.evaluate(() => {
        const api=SevenSinsDebug3D, c=api.combat315();
        return {hp:api.dimState().hp,enemies:c.enemies.length,vfx:c.shieldVfx};
      });
      assert.equal(result.afterDeath.enemies,0);
      assert.equal(result.afterDeath.vfx.visible,0);
      delete result.leap;
      rounds.push(result);
      if (!round) {
        await page.getByRole('button',{name:/TESTE DAS DIMENSÕES/}).click();
        await page.getByRole('button',{name:/Dimensão I — VHAZRAEL/}).click();
      }
      if (round===1) await page.reload({waitUntil:'domcontentloaded',timeout:180000});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(output+'/retorno.json', JSON.stringify({quality:'medium',rounds,errors},null,2));
  } finally {
    await browser.close();
  }
}
run().catch(error => {console.error(error);process.exitCode=1;});
