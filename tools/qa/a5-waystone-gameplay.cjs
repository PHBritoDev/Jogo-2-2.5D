'use strict';
/* QA A5 — progressão real dos três abrigos de Eldória.
 * A missão é pré-semeada como ativa para isolar a correção técnica sem canonizar givers provisórios.
 * Caminhada usa CDP touch no #stick de produção; o harness orienta apenas o yaw da câmera.
 * Registro usa #talk-button real; sem walkMove, teleport ou sprint helper entre abrigos.
 * Não valida oferta/entrega do NPC nem certifica Android físico.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { isRuntimeAssetUrl } = require('./a5-waystone-qa-utils.cjs');

const OUT = path.resolve(process.env.VISUAL_OUTPUT || 'visual-lab-results/a5-waystones');
const BASE = (process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const SIDE_KEY = 'seven-sins-3d-side';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = {
  status: 'incomplete',
  scenario: 'Eldoria waystone quest progress + map save/reload',
  method: 'real CDP touch input on the shipped #stick joystick; QA camera yaw is aligned to each route; real talk-button registration; no shelter-to-shelter teleport',
  platform: 'Chromium SwiftShader · 852×393 · simulated touch on the production joystick, not Android hardware certification',
  movementControl: 'CDP touchStart/touchMove/touchEnd on #stick; viewQA changes camera yaw only; no walkMove/teleport/sprint helper',
  narrativeScope: 'giver offer/turn-in intentionally excluded; Mara/Nara ↔ active vendor shortName mapping awaits canon review in issue 671',
  commit: process.env.GITHUB_SHA || 'local',
  startedAt: new Date().toISOString(),
  legs: [],
  walks: [],
  registrations: [],
  screenshots: [],
  errors: [],
  consoleErrors: [],
  httpErrors: []
};

let browser = null, context = null, page = null, video = null, cdp = null, fatal = null;

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
    typeof window.SevenSinsDebug3D?.viewQA === 'function',
    null, { timeout: 240000 }
  );
}
async function beginJoystick() {
  const box = await page.locator('#stick').boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, 'joystick #stick não está visível');
  const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
  const hit = await page.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest('#stick'), [x, y]);
  assert.ok(hit, 'ponto de toque não pertence ao joystick #stick');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await wait(80);
  const forwardY = Math.round(y - box.height * 0.32);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: forwardY, id: 1 }] });
  return { x, y, forwardY };
}
async function endJoystick() {
  if (!cdp) return;
  try { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); } catch (_) {}
}
async function aimJoystick(dx, dz, offset) {
  const yaw = Math.atan2(-dx, -dz) + offset;
  await page.evaluate(value => window.SevenSinsDebug3D.viewQA(false, value, 0.12), yaw);
  return yaw;
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
  let stalled = 0, travelled = 0, cameraOffset = 0;
  await beginJoystick();
  try {
    // Calibra a relação câmera/joystick com quatro direções cardeais.
    // Todos os deslocamentos são produzidos pelo controle #stick real, não por walkMove.
    let best = null;
    for (const offset of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
      const before = await playerState();
      const dx = target.x - before.x, dz = target.z - before.z;
      await aimJoystick(dx, dz, offset);
      await wait(280);
      const after = await playerState();
      const remaining = Math.hypot(target.x - after.x, target.z - after.z);
      const delta = Math.hypot(after.x - before.x, after.z - before.z);
      travelled += delta;
      report.legs.push({ label, phase: 'camera-calibration', offset: +offset.toFixed(3), remaining: +remaining.toFixed(2), moved: +delta.toFixed(2) });
      if (!best || remaining < best.remaining) best = { offset, remaining };
    }
    cameraOffset = best.offset;
    for (let step = 0; step < 280; step++) {
      const p = await playerState();
      const d = Math.hypot(target.x - p.x, target.z - p.z);
      const support = await walkState();
      const nearStone = Math.hypot(stone.x - p.x, stone.z - p.z);
      if (nearStone <= 1.15 && p.y > stone.centerY - 0.25 && support.grounded) {
        const netDistance = Math.hypot(p.x - start.x, p.z - start.z);
        assert.ok(originDistance <= 1.5 || netDistance >= originDistance - 1.5,
          label + ': deslocamento líquido insuficiente para comprovar joystick (' + netDistance.toFixed(2) + 'm de ' + originDistance.toFixed(2) + 'm)');
        const result = {
          label, from, to: { x: p.x, y: p.y, z: p.z },
          originDistance: +originDistance.toFixed(2), finalDistance: +nearStone.toFixed(2),
          netDistance: +netDistance.toFixed(2), travelled: +travelled.toFixed(2),
          surface: support.surface, steps: step,
          cameraOffset: +cameraOffset.toFixed(3), control: 'touch #stick'
        };
        report.walks.push(result);
        return result;
      }
      const dx = target.x - p.x, dz = target.z - p.z;
      await aimJoystick(dx, dz, cameraOffset);
      await wait(280);
      const after = await playerState();
      const nextDistance = Math.hypot(target.x - after.x, target.z - after.z);
      const delta = Math.hypot(after.x - p.x, after.z - p.z);
      travelled += delta;
      report.legs.push({
        label, step, distance: +d.toFixed(2), nextDistance: +nextDistance.toFixed(2),
        delta: +delta.toFixed(2), x: +after.x.toFixed(2), z: +after.z.toFixed(2),
        cameraOffset: +cameraOffset.toFixed(3), control: 'touch #stick'
      });
      if (nextDistance < d - 0.05) stalled = 0;
      else stalled++;
      if (stalled === 4) {
        let alternate = { offset: cameraOffset, remaining: nextDistance };
        for (const offset of [cameraOffset - 0.45, cameraOffset + 0.45, cameraOffset - 0.9, cameraOffset + 0.9]) {
          const before = await playerState();
          const toTarget = Math.hypot(target.x - before.x, target.z - before.z);
          await aimJoystick(target.x - before.x, target.z - before.z, offset);
          await wait(220);
          const afterAlt = await playerState();
          const remaining = Math.hypot(target.x - afterAlt.x, target.z - afterAlt.z);
          travelled += Math.hypot(afterAlt.x - before.x, afterAlt.z - before.z);
          report.legs.push({ label, phase: 'obstacle-steer', offset: +offset.toFixed(3), remaining: +remaining.toFixed(2), prior: +toTarget.toFixed(2) });
          if (remaining < alternate.remaining) alternate = { offset, remaining };
        }
        cameraOffset = alternate.offset;
        stalled = alternate.remaining < d - 0.05 ? 0 : 5;
      }
      if (stalled >= 10) {
        const reason = await page.evaluate(({ x, z }) => window.SevenSinsDebug3D.whyBlocked(x, z), { x: stone.x, z: stone.z });
        throw new Error(label + ': joystick sem progresso; distância=' + nextDistance.toFixed(2) + '; diagnóstico=' + JSON.stringify(reason));
      }
    }
    throw new Error(label + ': limite de passos excedido; joystick não alcançou o abrigo');
  } finally {
    await endJoystick();
  }
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
    cdp = await context.newCDPSession(page);
    page.setDefaultTimeout(30000);
    video = page.video();
    page.on('pageerror', e => report.errors.push(String(e.message || e).slice(0, 700)));
    page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 700)); });
    page.on('response', r => {
      if (r.status() >= 400 && isRuntimeAssetUrl(r.url())) report.httpErrors.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 220));
    });
    page.on('requestfailed', r => {
      if (isRuntimeAssetUrl(r.url())) report.httpErrors.push('FAILED ' + r.url().slice(0, 220) + ' ' + (r.failure()?.errorText || ''));
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

    assert.equal(report.screenshots.length, 11, 'capturas de estado incompletas');
    const criticalConsole = report.consoleErrors.filter(e => !/KHR_parallel|PropertyBinding/i.test(e));
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
        if (!fs.existsSync(p)) throw new Error('arquivo WebM não foi finalizado');
        const bytes = fs.statSync(p).size;
        if (bytes < 1024) throw new Error('arquivo WebM vazio/inválido: ' + bytes + ' bytes');
        fs.copyFileSync(p, path.join(OUT, 'a5-waystones-gameplay.webm'));
        report.video = { file: 'a5-waystones-gameplay.webm', bytes };
      } else throw new Error('Playwright não criou gravação WebM');
    } catch (e) {
      report.errors.push('video: ' + String(e.message || e));
      report.status = 'failed';
      process.exitCode = 1;
    }
    if (cdp) { try { await cdp.detach(); } catch (_) {} }
    try { if (browser) await browser.close(); } catch (_) {}
    report.finishedAt = new Date().toISOString();
    report.filteredConsoleErrors = report.consoleErrors.filter(e => !/KHR_parallel|PropertyBinding/i.test(e));
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
