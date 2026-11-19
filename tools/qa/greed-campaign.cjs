// Run with Playwright installed and the repository served at GAME_URL.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

async function testGreed() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 740, height: 416 }, isMobile: true, hasTouch: true });
    const exceptions = [];
    page.on('pageerror', e => exceptions.push(e.message));
    // An offline checkout can supply the same Three.js distribution as the import map.
    if (process.env.THREE_ROOT) {
      await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', route => {
        const file = new URL(route.request().url()).pathname.split('/three@0.160.0/')[1];
        return route.fulfill({ path: path.join(process.env.THREE_ROOT, file), contentType: 'application/javascript' });
      });
    }
    const url = new URL('mundo-3d-prototype.html', process.env.GAME_URL || 'http://localhost:8000/');
    url.searchParams.set('debug3d', '1');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    const wait = (predicate, arg) => page.waitForFunction(predicate, arg, { timeout: 150000 });
    await wait(() => window.SevenSinsDebug3D && document.querySelector('#loading')?.classList.contains('hidden'));
    await page.evaluate(() => {
      const game = SevenSinsDebug3D;
      game.act6(28, 4);
      game.teleport(152, -144.5, Math.PI);
      game.interact();
    });
    await wait(() => SevenSinsDebug3D.cineState().scene === 'estatua-2');
    await page.evaluate(() => SevenSinsDebug3D.skipStory());
    await wait(() => SevenSinsDebug3D.dimState().vs && !document.querySelector('#vs-go').disabled);
    await page.evaluate(() => SevenSinsDebug3D.vsGo());
    await wait(() => SevenSinsDebug3D.cineState().scene === 'ganancia');
    await page.evaluate(() => SevenSinsDebug3D.skipStory());

    const health = [540, 640, 900];
    for (const [index, max] of health.entries()) {
      await wait(n => SevenSinsDebug3D.dimState().emax === n, max);
      const form = await page.evaluate(() => {
        const { profile, visible, ehp, battle } = SevenSinsDebug3D.dimState();
        return { profile, visible, ehp, dimension: battle?.key };
      });
      assert.deepEqual(form, { profile: 'greed' + (index + 1), visible: true, ehp: max, dimension: 'greed' });
      console.log(form);
      await page.evaluate(() => SevenSinsDebug3D.hurtBoss(9999));
      await wait(() => SevenSinsDebug3D.cineState().active);
      if (index + 1 < health.length) {
        await wait(n => SevenSinsDebug3D.dimState().emax === n, health[index + 1]);
      }
      await page.evaluate(() => SevenSinsDebug3D.skipStory());
    }
    await wait(() => !SevenSinsDebug3D.dimState().battle);
    assert.deepEqual(exceptions, []);
  } finally {
    await browser.close();
  }
}

testGreed().catch(error => { console.error(error); process.exitCode = 1; });
