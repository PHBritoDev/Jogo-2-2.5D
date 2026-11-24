'use strict';
/* QA A5 — progressão real dos três abrigos de Eldória.
 * A missão é pré-semeada como ativa para isolar a correção técnica sem canonizar givers provisórios.
 * Caminhada usa walkMove do QA, que atravessa updatePlayerMovement/colisão/terreno; registro usa #talk-button real.
 * Não valida oferta/entrega do NPC nem joystick Android.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const OUT = path.resolve(process.env.VISUAL_OUTPUT || 'visual-lab-results/a5-waystones');
const BASE = (process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const SIDE_KEY = 'seven-sins-3d-side';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = {
  status: 'incomplete',
  scenario: 'Eldoria waystone quest progress + map save/reload',
  method: 'guided QA walk through production movement/collision loop; real talk-button registration; no shelter-to-shelter teleport',
  platform: 'Chromium SwiftShader · 852×393 · not Android hardware or joystick certification',
  narrativeScope: 'giver offer/turn-in intentionally excluded; Mara/Nara ↔ active vendor shortName mapping awaits canon review in issue 671',
  commit: process.env.GITHUB_SHA || 'local',
  startedAt: new Date().toISOString(),
  legs: [],
  registrations: [],
  screenshots: [],
  errors: [],
  consoleErrors: [],
  httpErrors: []
};

let browser = null, context = null, page = null, video = null, fatal = null;

function shot(name) {
  return page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 120000 })
    .then(() => report.screenshots.push(name + '.png'));
}
async function qa() {
  return page.evaluate(() => window.SevenSinsDebug3D.sideQuestQA());
}
async function playerState() {
  return page.evaluate(() => window.SevenSinsDebug3D.state());
}
async function walkState() {
  return page.evaluate(() => window.SevenSinsDebug3D.walkState());
}
async function mapSave(mapKey) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), mapKey);
}
async function installThreeRoutes(ctx) {
  const threeRoot = path.resolve(path.dirname(require.resolve('three')), '..');
  await ctx.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\//, async route => {
    const pathname = new URL(route.request().url()).pathname;
    const relative = pathname.split('/three@0.160.0/')[1];
    const file = path.join(threeRoot, relative || '');
    if (relative && fs.existsSync(file)) await route.fulfill({ path: file, contentType: 'text/javascript' });
    else await route.continue();
  });
}
async function waitRuntime() {
  await page.waitForFunction(() =>
    !!window.SevenSinsDebug3D?.riteState?.().ready &&
    typeof window.SevenSinsDebug3D?.sideQuestQA === 'function' &&
    typeof window.SevenSinsDebug3D?.walkMove === 'function',
    null, { timeout: 240000 }
  );
}
async function walkTo(stone, label) {
  const start = await playerState();
  const originDistance = Math.hypot(stone.x - start.x, stone.z - start.z);
  const from = { x: start.x, z: start.z };
  const routeDx = stone.x - start.x, routeDz = stone.z - start.z;
  const routeLen = Math.hypot(routeDx, routeDz) || 1;
  const target = {
    x: stone.x - routeDx / routeLen * 0.45,
    z: stone.z - routeDz / routeLen * 0.45
  };
  let stalled = 0;
  await page.evaluate(() => window.SevenSinsDebug3D.sprint(true));
  for (let step = 0; step < 280; step++) {
    const p = await playerState();
    const d = Math.hypot(target.x - p.x, target.z - p.z);
    const support = await walkState();
    const nearStone = Math.hypot(stone.x - p.x, stone.z - p.z);
    if (nearStone <= 1.15 && p.y > stone.centerY - 0.25 && support.grounded) {
      await page.evaluate(() => window.SevenSinsDebug3D.sprint(false));
      const result = { label, from, to: { x: p.x, y: p.y, z: p.z }, originDistance: +originDistance.toFixed(2), finalDistance: +nearStone.toFixed(2), surface: support.surface, steps: step };
      report.legs.push(result);
      return result;
    }
    const len = Math.hypot(target.x - p.x, target.z - p.z) || 1;
    const ux = (target.x - p.x) / len, uz = (target.z - p.z) / len;
    const offsets = [0, 0.38, -0.38, 0.76, -0.76, 1.14, -1.14, 1.52, -1.52];
    const candidates = await page.evaluate(({ x, z, ux, uz, offsets }) => offsets.map(angle => {
      const dx = ux * Math.cos(angle) - uz * Math.sin(angle);
      const dz = ux * Math.sin(angle) + uz * Math.cos(angle);
      const px = x + dx * 2.25, pz = z + dz * 2.25;
      return { dx, dz, blocked: window.SevenSinsDebug3D.collisionAt(px, pz), px, pz, angle };
    }), { x: p.x, z: p.z, ux, uz, offsets });
    let best = null;
    for (const c of candidates) {
      const remaining = Math.hypot(target.x - c.px, target.z - c.pz);
      const score = remaining + (c.blocked ? 4.5 : 0) + Math.abs(c.angle) * 0.08;
      if (!best || score < best.score) best = { ...c, score };
    }
    const seconds = Math.max(0.12, Math.min(0.38, (len - 0.55) / 7.2));
    await page.evaluate(({ dx, dz, seconds }) => window.SevenSinsDebug3D.walkMove(dx, dz, seconds), {
      dx: best.dx, dz: best.dz, seconds
    });
    await page.waitForFunction(() => !window.SevenSinsDebug3D.walkBusy(), null, { timeout: 2500 });
    await wait(90);
    const after = await playerState();
    const nextDistance = Math.hypot(target.x - after.x, target.z - after.z);
    report.legs.push({
      label, step, distance: +d.toFixed(2), nextDistance: +nextDistance.toFixed(2),
      x: +after.x.toFixed(2), z: +after.z.toFixed(2), steering: +best.angle.toFixed(2), probeBlocked: best.blocked
    });
    if (nextDistance < d - 0.08) stalled = 0;
    else stalled++;
    if (stalled >= 10) {
      const reason = await page.evaluate(({ x, z }) => window.SevenSinsDebug3D.whyBlocked(x, z), { x: stone.x, z: stone.z });
      throw new Error(label + ': caminhada sem progresso; distância=' + nextDistance.toFixed(2) + '; diagnóstico=' + JSON.stringify(reason));
    }
  }
  await page.evaluate(() => window.SevenSinsDebug3D.sprint(false));
  throw new Error(label + ': limite de passos excedido; não alcançou o abrigo');
}
async function registerStone(stone, expectedProgress, mapKey) {
  const p = await playerState();
  const d = Math.hypot(stone.x - p.x, stone.z - p.z);
  assert.ok(d <= 1.35, stone.id + ': personagem fora do raio de registro (' + d.toFixed(2) + 'm)');
  assert.ok(p.y > stone.centerY - 0.25, stone.id + ': personagem abaixo do centro da plataforma');
  await page.waitForFunction(() => {
    const b = document.getElementById('talk-button');
    return b && !b.classList.contains('hidden') && b.textContent.includes('REGISTRAR ESTE ABRIGO');
  }, null, { timeout: 30000 });
  await shot(stone.id + '-before-register');
  await page.locator('#talk-button').click();
  await page.waitForFunction(({ id, expected, key }) => {
    const map = JSON.parse(localStorage.getItem(key) || '{}');
    const q = window.SevenSinsDebug3D.sideQuestQA();
    return Array.isArray(map.waystones) && map.waystones.includes(id) &&
      q.side.abrigos.progress === expected && q.side.abrigos.state === (expected === 3 ? 'ready' : 'active');
  }, { id: stone.id, expected: expectedProgress, key: mapKey }, { timeout: 30000 });
  const after = await qa();
  assert.ok(after.registeredWaystones.includes(stone.id), stone.id + ': Set de runtime não contém o abrigo');
  assert.equal(after.side.abrigos.progress, expectedProgress);
  report.registrations.push({ id: stone.id, progress: after.side.abrigos.progress, state: after.side.abrigos.state });
  await shot(stone.id + '-registered');
}
(async () => {
  try {
    fs.mkdirSync(OUT, { recursive: true });
    const { SIDE_QUESTS, SIDE_QUEST_WAYSTONES } = await import('../../sidequests3d.js');
    const { MAP_STORE_KEY } = await import('../../map3d.js');
    const quest = SIDE_QUESTS.find(q => q.id === 'abrigos');
    assert.ok(quest && quest.goal.count === 3);
    assert.deepEqual(SIDE_QUEST_WAYSTONES, ['abrigo-vila', 'abrigo-mata', 'abrigo-caverna']);

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    context = await browser.newContext({
      viewport: { width: 852, height: 393 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      recordVideo: { dir: OUT, size: { width: 852, height: 393 } }
    });
    await installThreeRoutes(context);
    await context.addInitScript(({ sideKey, mapKey }) => {
      try {
        if (!sessionStorage.getItem('__a5_waystones_seeded')) {
          localStorage.setItem(sideKey, JSON.stringify({ abrigos: { state: 'active', progress: 0 } }));
          localStorage.setItem(mapKey, JSON.stringify({ waystones: [] }));
          sessionStorage.setItem('__a5_waystones_seeded', '1');
        }
      } catch (_) {}
    }, { sideKey: SIDE_KEY, mapKey: MAP_STORE_KEY });
    page = await context.newPage();
    page.setDefaultTimeout(30000);
    video = page.video();
    page.on('pageerror', e => report.errors.push(String(e.message || e).slice(0, 700)));
    page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 700)); });
    page.on('response', r => {
      if (r.status() >= 400 && /\.(?:glb|js)(?:\?|$)/i.test(r.url())) report.httpErrors.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 220));
    });

    await page.goto(BASE + '/mundo-3d-prototype.html?debug3d=1&a5waystones=1', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitRuntime();
    await wait(2200);
    await page.evaluate(() => { window.SevenSinsDebug3D.realtime(); window.SevenSinsDebug3D.act1(1, 0); });
    await wait(900);
    let initial = await qa();
    assert.equal(initial.questStep, 1, 'campanha não ficou no passo inicial seguro');
    assert.equal(initial.side.abrigos.state, 'active', 'fixture da missão não foi carregado');
    assert.equal(initial.side.abrigos.progress, 0);
    assert.equal(initial.registeredWaystones.length, 0);
    report.initial = { questStep: initial.questStep, side: initial.side.abrigos, coins: initial.coins, xp: initial.xp };
    await shot('00-initial-active');

    let stones = initial.waystones.filter(w => SIDE_QUEST_WAYSTONES.includes(w.id));
    assert.equal(stones.length, 3, 'runtime não expôs os três abrigos de Eldória');
    stones.sort((a, b) => SIDE_QUEST_WAYSTONES.indexOf(a.id) - SIDE_QUEST_WAYSTONES.indexOf(b.id));

    for (let i = 0; i < 2; i++) {
      const stone = stones[i];
      await walkTo(stone, 'walk-to-' + stone.id);
      await registerStone(stone, i + 1, MAP_STORE_KEY);
    }
    const beforeReload = await qa();
    assert.equal(beforeReload.side.abrigos.progress, 2);
    assert.equal(beforeReload.side.abrigos.state, 'active');
    await shot('02-two-waystones-before-reload');

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitRuntime();
    await wait(1800);
    await page.evaluate(() => { window.SevenSinsDebug3D.realtime(); window.SevenSinsDebug3D.act1(1, 0); });
    await wait(700);
    const afterReload = await qa();
    assert.equal(afterReload.side.abrigos.progress, 2, 'progresso dos dois abrigos não foi reconstruído após reload');
    assert.equal(afterReload.side.abrigos.state, 'active');
    for (const id of SIDE_QUEST_WAYSTONES.slice(0, 2)) assert.ok(afterReload.registeredWaystones.includes(id), 'abrigo perdido no reload: ' + id);
    assert.equal(afterReload.coins, beforeReload.coins, 'moedas mudaram durante reload');
    assert.equal(afterReload.xp, beforeReload.xp, 'XP mudou durante reload');
    await shot('03-two-waystones-after-reload');

    const lastStone = stones[2];
    await walkTo(lastStone, 'walk-to-' + lastStone.id);
    await registerStone(lastStone, 3, MAP_STORE_KEY);
    const completed = await qa();
    assert.equal(completed.side.abrigos.state, 'ready');
    assert.equal(completed.side.abrigos.progress, 3);
    assert.deepEqual(completed.registeredWaystones.filter(id => SIDE_QUEST_WAYSTONES.includes(id)).sort(),
      [...SIDE_QUEST_WAYSTONES].sort());
    await shot('04-three-waystones-ready');

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitRuntime();
    await wait(1800);
    const final = await qa();
    assert.equal(final.side.abrigos.state, 'ready', 'estado ready não sobreviveu ao reload final');
    assert.equal(final.side.abrigos.progress, 3);
    assert.deepEqual(final.registeredWaystones.filter(id => SIDE_QUEST_WAYSTONES.includes(id)).sort(),
      [...SIDE_QUEST_WAYSTONES].sort());
    assert.equal(final.coins, completed.coins, 'moedas alteradas sem entrega');
    assert.equal(final.xp, completed.xp, 'XP alterado sem entrega');
    report.final = { side: final.side.abrigos, registeredWaystones: final.registeredWaystones, coins: final.coins, xp: final.xp };
    await shot('05-ready-after-final-reload');

    const criticalConsole = report.consoleErrors.filter(e => !/WebGL|KHR_parallel|PropertyBinding|Shader Error/i.test(e));
    assert.equal(report.errors.length, 0, 'erros JavaScript: ' + report.errors.join(' | '));
    assert.equal(report.httpErrors.length, 0, 'falhas de asset JS/GLB: ' + report.httpErrors.join(' | '));
    assert.equal(criticalConsole.length, 0, 'erros de console: ' + criticalConsole.join(' | '));
    report.status = 'passed';
  } catch (e) {
    fatal = e;
    report.status = 'failed';
    report.errors.push(String(e.stack || e).slice(0, 3500));
    process.exitCode = 1;
  } finally {
    try { if (context) await context.close(); } catch (_) {}
    try {
      if (video) {
        const p = await video.path();
        if (fs.existsSync(p)) fs.copyFileSync(p, path.join(OUT, 'a5-waystones-gameplay.webm'));
      }
    } catch (e) { report.errors.push('video: ' + String(e.message || e)); }
    try { if (browser) await browser.close(); } catch (_) {}
    report.finishedAt = new Date().toISOString();
    report.filteredConsoleErrors = report.consoleErrors.filter(e => !/WebGL|KHR_parallel|PropertyBinding|Shader Error/i.test(e));
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.log('A5_WAYSTONES_QA ' + JSON.stringify({
      status: report.status,
      commit: report.commit,
      initial: report.initial,
      registrations: report.registrations,
      legs: report.legs.length,
      screenshots: report.screenshots.length,
      errors: report.errors.slice(0, 4),
      consoleErrors: report.filteredConsoleErrors.slice(0, 4),
      httpErrors: report.httpErrors.slice(0, 4)
    }));
    if (fatal) process.exitCode = 1;
  }
})();
