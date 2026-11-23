'use strict';
// A2: two-target WebGL smoke, independent of the legacy single-target combat315 suite.
// This checks that two actors exist and records their HP/visuals; it does NOT
// claim to validate SwordRites energy-side events without a dedicated debug hook.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dir = path.resolve(process.env.VISUAL_OUTPUT || 'visual-lab-results', 'combat-multitarget');
const base = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4176';
fs.mkdirSync(dir, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: [
    '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage', '--ignore-gpu-blocklist'
  ] });
  let context;
  const report = { ok: false, errors: [], steps: {}, limitations: [
    'Smoke visual de dois atores; não comprova eventos energy-side sem instrumentação do runtime.',
    'SwiftShader não mede FPS de aparelho Android.'
  ] };
  try {
    context = await browser.newContext({
      viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true,
      recordVideo: { dir: path.join(dir, 'video'), size: { width: 844, height: 390 } }
    });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && /WebGL|shader|TypeError|ReferenceError|INVALID/i.test(m.text())) report.errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) report.errors.push(`HTTP ${r.status()} ${r.url()}`); });
    await page.goto(base + '/mundo-3d-prototype.html?testeEnemy1=1&debug3d=1&fullCombatQA=1',
      { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready,
      null, { timeout: 300000 });
    await page.evaluate(() => {
      const D = SevenSinsDebug3D;
      D.setHour?.(10);
      D.squadLab('2');
      D.squadPause(true);
    });
    await page.waitForFunction(() => SevenSinsDebug3D.squadState().on &&
      SevenSinsDebug3D.combat315().enemies.length >= 2, null, { timeout: 120000 });
    report.steps.before = await page.evaluate(() => {
      const D = SevenSinsDebug3D;
      D.combatStep(.25, { fps: 30, draw: true });
      const enemies = D.combat315().enemies;
      return { count: enemies.length, ids: enemies.map(e => e.id),
        actors: D.squadState().snap.actors.map(a => ({ id: a.id, hp: a.hp, x: a.x, z: a.z })) };
    });
    assert.ok(report.steps.before.count >= 2, 'dois inimigos precisam estar no runtime');
    assert.ok(new Set(report.steps.before.ids).size >= 2, 'IDs distintos');
    // Frame both actual enemies rather than trusting the default spawn camera.
    report.steps.camera = await page.evaluate(() => {
      const D = SevenSinsDebug3D;
      const actors = D.squadState().snap.actors.filter(a => Number.isFinite(a.x) && Number.isFinite(a.z));
      const x = actors.reduce((n, a) => n + a.x, 0) / actors.length;
      const z = actors.reduce((n, a) => n + a.z, 0) / actors.length;
      const heroY = D.heroState().p[1];
      D.fly([x + 6, heroY + 3.4, z + 5], [x, heroY + 1, z]);
      D.render();
      return { x, z, actors: actors.length };
    });
    await page.screenshot({ path: path.join(dir, '01-dois-alvos.png'), timeout: 120000 });
    report.steps.after = await page.evaluate(() => {
      const D = SevenSinsDebug3D;
      D.combatStep(.6, { fps: 30, draw: true });
      return { enemies: D.combat315().enemies.map(e => ({ id: e.id, hp: e.hp })) };
    });
    assert.deepEqual(report.steps.after.enemies.map(e => e.id).sort(),
      [...report.steps.before.ids].sort(), 'IDs devem persistir entre capturas');
    assert.ok(report.steps.after.enemies.every(e => Number.isFinite(e.hp)), 'HP dos inimigos deve ser finito');
    await page.evaluate(() => { SevenSinsDebug3D.render(); });
    await page.screenshot({ path: path.join(dir, '02-dois-alvos.png'), timeout: 120000 });
    await page.evaluate(() => SevenSinsDebug3D.fly(null));
    assert.deepEqual(report.errors, [], 'nenhuma exceção de página');
    report.ok = true;
  } finally {
    fs.writeFileSync(path.join(dir, 'resultado.json'), JSON.stringify(report, null, 2) + '\n');
    await context?.close();
    await browser.close();
  }
  console.log(JSON.stringify({ ok: report.ok, steps: report.steps }));
})().catch(e => { console.error(e); process.exitCode = 1; });
