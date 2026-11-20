// Serve the repository locally, then run with Playwright on NODE_PATH.
// Three.js can be supplied offline via THREE_ROOT. Captures are real game canvas frames.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function run() {
  const out = process.env.OUT || 'juizo-frames';
  fs.mkdirSync(out, {recursive: true});
  const browser = await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:640,height:360},isMobile:true,hasTouch:true});
    page.setDefaultTimeout(240000);
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    if (process.env.THREE_ROOT) await page.route('https://cdn.jsdelivr.net/npm/three@*/**', route => {
      const file = new URL(route.request().url()).pathname.split(/three@[^/]+\//)[1];
      return route.fulfill({path:path.join(process.env.THREE_ROOT,file),contentType:'application/javascript'});
    });
    const url = new URL('mundo-3d-prototype.html', process.env.GAME_URL || 'http://localhost:8000');
    url.search = '?debug3d=1&todasHabilidades=1';
    await page.goto(url.toString(), {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => window.SevenSinsDebug3D && document.querySelector('#loading').classList.contains('hidden'));
    await page.evaluate(() => {
      const d = SevenSinsDebug3D;
      d.whiteQA(); d.placeAt(40,d.groundAt(40,21),21,0); d.packQA('bishop2','vorgazhek',1,10000);
    });
    await page.waitForFunction(() => {
      const s = SevenSinsDebug3D.whiteState(); return s.hp===10000 && s.vfx?.lodReady;
    });
    await page.evaluate(() => { SevenSinsDebug3D.enemyAt(40,null,14); SevenSinsDebug3D.skills(); });
    await page.locator('#ultimate').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',bubbles:true});
    const frames = [];
    for (let i=0;i<=170;i++) {
      const {state,jpg} = await page.evaluate(i => {
        const state=SevenSinsDebug3D.whiteFrame(i ? .1 : 0);
        return {state,jpg:document.querySelector('#scene').toDataURL('image/jpeg',.85)};
      },i);
      fs.writeFileSync(path.join(out,String(i).padStart(3,'0')+'.jpg'),Buffer.from(jpg.split(',')[1],'base64'));
      frames.push(state);
    }
    assert(frames.some(s=>s.vfx?.attached && s.vfx.visible && s.vfx.asset==='AsasAnjo_leve.glb'));
    for (const s of frames.filter(s=>s.time>3 && s.time<11)) assert.deepEqual(s.hand,s.vfx.orb);
    assert.equal(new Set(frames.map(s=>s.hp)).size,3);
    const end=frames.at(-1);
    assert(!end.locked); assert.deepEqual(end.camera,frames[0].savedCamera);
    await page.setViewportSize({width:900,height:540});
    const dodge=await page.evaluate(()=>{
      const d=SevenSinsDebug3D; d.skills(); d.cast('ultimate'); d.whiteFrame(11.03);
      d.enemyAt(55,null,14); const impact=d.whiteFrame(4); const end=d.whiteFrame(2);
      return {contact:impact.contact,hp:end.hp,locked:end.locked};
    });
    assert(dodge.contact && !dodge.contact.actor); assert.equal(dodge.hp,end.hp); assert(!dodge.locked);
    assert.deepEqual(errors,[]); fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({frames,dodge}));
  } finally { await browser.close(); }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
