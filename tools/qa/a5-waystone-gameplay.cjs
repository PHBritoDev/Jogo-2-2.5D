'use strict';
/* QA A5 — progressão real dos três abrigos de Eldória.
 * A missão é pré-semeada como ativa para isolar a correção técnica sem canonizar givers provisórios.
 * Caminhada usa CDP touch no #stick de produção; viewQA alinha yaw e fixa pitch/distância de observação sem mover o jogador.
 * Registro usa #talk-button real; sem walkMove, teleport ou sprint helper entre abrigos.
 * Não valida oferta/entrega do NPC nem certifica Android físico.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { isRuntimeAssetUrl, hasCompletedTouchLifecycle, waypointStepBudget } = require('./a5-waystone-qa-utils.cjs');

const OUT = path.resolve(process.env.VISUAL_OUTPUT || 'visual-lab-results/a5-waystones');
const BASE = (process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const SIDE_KEY = 'seven-sins-3d-side';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function createProgressWatch(initialDistance, { threshold = 0.04, now = Date.now() } = {}) {
  let bestDistance = Number.isFinite(initialDistance) ? initialDistance : Infinity;
  let lastProgressAt = Number.isFinite(now) ? now : Date.now();
  return {
    sample(distance, timestamp = Date.now()) {
      const at = Number.isFinite(timestamp) ? timestamp : lastProgressAt;
      const progressed = Number.isFinite(distance) &&
        (bestDistance === Infinity || bestDistance - distance >= threshold);
      if (progressed) {
        bestDistance = distance;
        lastProgressAt = at;
      }
      return { progressed, bestDistance, stalledMs: Math.max(0, at - lastProgressAt) };
    }
  };
}

// Regressão local: progresso subamostrado acumula; só o tempo sem avanço real conta como parada.
{
  const watch = createProgressWatch(1, { threshold: 0.05, now: 1000 });
  assert.equal(watch.sample(0.98, 1250).progressed, false);
  assert.equal(watch.sample(0.96, 1500).progressed, false);
  const advanced = watch.sample(0.94, 1750);
  assert.equal(advanced.progressed, true);
  assert.equal(advanced.stalledMs, 0);
  assert.equal(watch.sample(0.94, 9750).stalledMs, 8000);
}
let shelterGeometry = null, stepUpLimit = null;

const report = {
  status: 'incomplete',
  scenario: 'Eldoria waystone quest progress + map save/reload',
  method: 'real CDP touch on the shipped #stick; frame-synchronized movement; A* smoothing mirrors the production X-then-Z collision order; real talk-button registration; no teleport between shelters',
  platform: 'Chromium SwiftShader · 852×393 · simulated touch on the production joystick, not Android hardware certification',
  movementControl: 'CDP touchStart/touchMove on #stick; two rendered RAF frames per sample; A* checks X then Z at 0.12m intervals using runtime collision queries; real #talk-button tap; no walkMove/teleport/sprint helper',
  narrativeScope: 'main quest HUD/prompt and the first two lines of Téo’s real dialogue validated through #talk-button; the scene stops before the 5-coin action; sidequest offer/turn-in and Mara/Nara giver mapping remain excluded pending canon review in issue 671',
  commit: process.env.A5_QA_COMMIT || process.env.GITHUB_SHA || 'local',
  workflowCommit: process.env.GITHUB_SHA || 'local',
  startedAt: new Date().toISOString(),
  legs: [],
  walks: [],
  registrations: [],
  interactionChecks: [],
  mainQuestPrompt: null,
  screenshots: [],
  errors: [],
  consoleErrors: [],
  httpErrors: [],
  input: { joystickPointerTypes: [], joystickPointerMoves: [], joystickLifecycle: [], interactionPointerTypes: [] },
  routes: [],
  approaches: [],
  worldReadiness: []
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
async function controlState() {
  return page.evaluate(() => ({
    state: window.SevenSinsDebug3D.state(),
    story: window.SevenSinsDebug3D.storyState(),
    rite: window.SevenSinsDebug3D.riteState(),
    regression: window.SevenSinsDebug3D.regressionState()
  }));
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
async function waitForGameFrames(count = 2, timeoutMs = 6000) {
  const completed = await page.evaluate(({ count, timeoutMs }) => new Promise(resolve => {
    let frames = 0, settled = false;
    const timer = setTimeout(() => { settled = true; resolve(false); }, timeoutMs);
    const next = () => {
      if (settled) return;
      frames++;
      if (frames >= count) {
        settled = true;
        clearTimeout(timer);
        resolve(true);
      } else requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  }), { count, timeoutMs });
  assert.equal(completed, true, 'renderer não completou ' + count + ' frames em ' + timeoutMs + 'ms');
}
async function waitRuntime() {
  await page.waitForFunction(() =>
    !!window.SevenSinsDebug3D?.riteState?.().ready &&
    typeof window.SevenSinsDebug3D?.sideQuestQA === 'function' &&
    typeof window.SevenSinsDebug3D?.viewQA === 'function',
    null, { timeout: 240000 }
  );
  await page.waitForFunction(() => {
    const loading = document.getElementById('loading');
    return !loading || loading.classList.contains('hidden') || getComputedStyle(loading).display === 'none';
  }, null, { timeout: 240000 });
  await waitForGameFrames(2, 12000);
}
async function waitForWorldCollisionReady(phase) {
  // O pilar central da PassarelaSuspensaEldoria só recebia collider no callback do GLB.
  // O overlay de loading pode fechar antes desse callback; não planejar rota antes do collider existir.
  await page.waitForFunction(() => {
    const dressing = window.EldoriaCityDressingQA;
    return dressing?.walkable === true &&
      Array.isArray(dressing.pylon) && dressing.pylon.length === 2 &&
      dressing.pylon.every(Number.isFinite);
  }, null, { timeout: 120000 });
  const readiness = await page.evaluate(() => {
    const dressing = window.EldoriaCityDressingQA;
    const blocker = window.SevenSinsDebug3D.whyBlocked(dressing.pylon[0], dressing.pylon[1]);
    return { ...dressing, pylonBlocker: blocker };
  });
  assert.equal(readiness.pylonBlocker.walk, 'pilar da passarela',
    'marcador do GLB apareceu sem o collider do pilar estar registrado: ' + JSON.stringify(readiness));
  report.worldReadiness.push({ phase, ...readiness });
}
async function beginJoystick() {
  const box = await page.locator('#stick').boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, 'joystick #stick não está visível');
  const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
  const hit = await page.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest('#stick'), [x, y]);
  assert.ok(hit, 'ponto de toque não pertence ao joystick #stick');
  await page.evaluate(() => {
    window.__a5JoystickPointerType = null;
    window.__a5JoystickPointerMoves = [];
    window.__a5JoystickLifecycle = [];
    window.__a5EndingJoystick = false;
    const stick = document.getElementById('stick');
    if (!window.__a5JoystickLifecycleInstalled) {
      const record = e => window.__a5JoystickLifecycle.push({
        type: e.type, pointerType: e.pointerType, pointerId: e.pointerId,
        ending: !!window.__a5EndingJoystick, at: +performance.now().toFixed(1)
      });
      stick.addEventListener('pointerdown', e => { window.__a5JoystickPointerType = e.pointerType; record(e); });
      stick.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') window.__a5JoystickPointerMoves.push({ x: e.clientX, y: e.clientY });
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(type, record);
      window.__a5JoystickLifecycleInstalled = true;
    }
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await page.waitForFunction(() => window.__a5JoystickPointerType === 'touch', null, { timeout: 5000 });
  report.input.joystickPointerTypes.push(await page.evaluate(() => window.__a5JoystickPointerType));
  await wait(80);
  const forwardY = Math.round(y - box.height * 0.32);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: forwardY, id: 1 }] });
  await page.waitForFunction(() => (window.__a5JoystickPointerMoves || []).length > 0, null, { timeout: 5000 });
  const movement = await page.evaluate(() => ({
    count: window.__a5JoystickPointerMoves.length,
    last: window.__a5JoystickPointerMoves.at(-1),
    transform: document.getElementById('knob')?.style.transform || ''
  }));
  assert.match(movement.transform, /translate\([^,]+,\s*-\d/, 'toque não deslocou o knob do joystick para frente: ' + movement.transform);
  report.input.joystickPointerMoves.push(movement);
  return { x, y, forwardY };
}
async function endJoystick() {
  if (!cdp || !page) return;
  try {
    await page.evaluate(() => { window.__a5EndingJoystick = true; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await wait(60);
    const lifecycle = await page.evaluate(() => ({
      events: (window.__a5JoystickLifecycle || []).slice(),
      knob: document.getElementById('knob')?.style.transform || ''
    }));
    report.input.joystickLifecycle.push(lifecycle);
    await page.evaluate(() => { window.__a5EndingJoystick = false; });
  } catch (_) {}
}
async function aimJoystick(dx, dz, offset) {
  const yaw = Math.atan2(-dx, -dz) + offset;
  await page.evaluate(value => window.SevenSinsDebug3D.viewQA(false, value, 0.12), yaw);
  return yaw;
}
async function findWalkPath(start, target, stone) {
  return page.evaluate(({ start, target, stone }) => {
    const api = window.SevenSinsDebug3D;
    const step = 0.65, pad = 8;
    const minX = Math.floor((Math.min(start.x, target.x) - pad) / step) * step;
    const maxX = Math.ceil((Math.max(start.x, target.x) + pad) / step) * step;
    const minZ = Math.floor((Math.min(start.z, target.z) - pad) / step) * step;
    const maxZ = Math.ceil((Math.max(start.z, target.z) + pad) / step) * step;
    const cols = Math.max(2, Math.ceil((maxX - minX) / step));
    const rows = Math.max(2, Math.ceil((maxZ - minZ) / step));
    const catalog = api.navCatalog((start.x + target.x) * .5, (start.z + target.z) * .5,
      Math.hypot(target.x - start.x, target.z - start.z) + 18);
    const cache = new Map();
    let sampled = 0;
    const blocked = (x, z) => {
      const key = Math.round(x * 20) + ':' + Math.round(z * 20);
      if (cache.has(key)) return cache.get(key);
      const why = api.whyBlocked(x, z);
      const rock = (catalog.rocks || []).some(r => r.h > .55 && Math.hypot(x - r.x, z - r.z) < r.r + .42);
      const market = (catalog.market || []).some(m => m.h > .68 &&
        Math.abs(x - m.x) < m.hx + .42 && Math.abs(z - m.z) < m.hz + .42);
      const value = !!(why.blockedAt || why.player || why.walk || why.tree || why.market || why.npc ||
        why.water > .08 || rock || market);
      cache.set(key, value);
      sampled++;
      return value;
    };
    const point = (ix, iz) => ({ x: minX + (ix + .5) * step, z: minZ + (iz + .5) * step });
    const cell = (x, z) => ({
      ix: Math.max(0, Math.min(cols - 1, Math.round((x - minX) / step - .5))),
      iz: Math.max(0, Math.min(rows - 1, Math.round((z - minZ) / step - .5)))
    });
    const startCell = cell(start.x, start.z);
    const startIndex = startCell.iz * cols + startCell.ix;
    const goalRadius = Math.max(.12, 1.30 - Math.hypot(target.x - stone.x, target.z - stone.z));
    const center = cell(target.x, target.z);
    const goals = [];
    for (let iz = Math.max(0, center.iz - 2); iz <= Math.min(rows - 1, center.iz + 2); iz++) {
      for (let ix = Math.max(0, center.ix - 2); ix <= Math.min(cols - 1, center.ix + 2); ix++) {
        const p = point(ix, iz), d = Math.hypot(p.x - target.x, p.z - target.z);
        if (d <= goalRadius && Math.hypot(p.x - stone.x, p.z - stone.z) <= 1.30 && !blocked(p.x, p.z)) {
          goals.push({ ix, iz, p, d });
        }
      }
    }
    goals.sort((a, b) => a.d - b.d);
    if (!goals.length) return { ok: false, reason: 'nenhuma célula livre dentro do raio de registro', sampled, goalRadius, catalog: { rocks: catalog.rocks?.length || 0, market: catalog.market?.length || 0, trees: catalog.trees || 0 } };
    const goal = goals[0], goalIndex = goal.iz * cols + goal.ix;
    const total = cols * rows;
    const scores = new Float64Array(total); scores.fill(Infinity);
    const came = new Int32Array(total); came.fill(-1);
    const closed = new Uint8Array(total);
    const heuristic = (ix, iz) => Math.hypot(goal.ix - ix, goal.iz - iz) * step;
    const open = [{ index: startIndex, f: heuristic(startCell.ix, startCell.iz) }];
    scores[startIndex] = 0;
    let explored = 0, found = false;
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    while (open.length && explored < total * 2) {
      let best = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
      const current = open.splice(best, 1)[0], ci = current.index;
      if (closed[ci]) continue;
      if (ci === goalIndex) { found = true; break; }
      closed[ci] = 1; explored++;
      const cx = ci % cols, cz = Math.floor(ci / cols);
      for (const [dx, dz] of dirs) {
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= cols || nz >= rows) continue;
        const ni = nz * cols + nx;
        if (closed[ni]) continue;
        const next = point(nx, nz);
        if (ni !== startIndex && blocked(next.x, next.z)) continue;
        const previous = ci === startIndex ? start : point(cx, cz);
        if (!window.__a5AxisSeparatedSegmentClear(previous, next, blocked, .12)) continue;
        if (dx && dz) {
          const sideA = point(cx + dx, cz), sideB = point(cx, cz + dz);
          if (blocked(sideA.x, sideA.z) || blocked(sideB.x, sideB.z)) continue;
        }
        const tentative = scores[ci] + step * (dx && dz ? Math.SQRT2 : 1);
        if (tentative >= scores[ni]) continue;
        came[ni] = ci; scores[ni] = tentative;
        open.push({ index: ni, f: tentative + heuristic(nx, nz) });
      }
    }
    if (!found) return { ok: false, reason: 'A* não encontrou caminho livre', explored, sampled, catalog: { rocks: catalog.rocks?.length || 0, market: catalog.market?.length || 0, trees: catalog.trees || 0 } };
    const nodes = [];
    let cursor = goalIndex, guard = 0;
    while (cursor !== startIndex && cursor >= 0 && guard++ < total) {
      nodes.push(point(cursor % cols, Math.floor(cursor / cols)));
      cursor = came[cursor];
    }
    if (cursor !== startIndex) return { ok: false, reason: 'cadeia de caminho incompleta', explored, sampled };
    nodes.reverse();
    const raw = [{ x: start.x, z: start.z }, ...nodes];
    if (!window.__a5AxisSeparatedPathClear(raw, blocked, .12)) {
      return { ok: false, reason: 'segmento adjacente do caminho bruto não é caminhável no eixo X→Z', explored, sampled };
    }
    // O controlador de produção testa X e depois Z; uma reta só é válida se ambos os passos forem livres.
    const clearLine = (a, b) => window.__a5AxisSeparatedSegmentClear(a, b, blocked, .12);
    const points = [];
    let at = 0;
    while (at < raw.length - 1) {
      let far = at + 1;
      for (let i = raw.length - 1; i > at + 1; i--) {
        if (clearLine(raw[at], raw[i])) { far = i; break; }
      }
      points.push(raw[far]); at = far;
    }
    return {
      ok: true, points, rawPoints: raw.length, explored, sampled, step,
      goal: goal.p, goalDistance: +goal.d.toFixed(3), goalRadius: +goalRadius.toFixed(3),
      catalog: { rocks: catalog.rocks?.length || 0, market: catalog.market?.length || 0, trees: catalog.trees || 0 }
    };
  }, { start, target, stone });
}
async function inspectShelterApproaches(stone) {
  const result = await page.evaluate(({ x, z, radius, stepUp, centerY }) => {
    const api = window.SevenSinsDebug3D;
    const surfaces = api.navCatalog(x, z, 7).surfaces;
    const deck = surfaces.find(s => s.n === 'abrigo-degrau1' && Math.hypot(s.x - x, s.z - z) < .05);
    if (!deck) return { error: 'superfície abrigo-degrau1 não encontrada', surfaces };
    const sides = window.__a5RankShelterApproaches({
      center: { x, z }, radius, deckY: deck.y, stepUp, walkLimit: -5.5,
      sample: ({ x: sx, z: sz }) => {
        const cell = api.heightGrid(sx, sx, sz, sz, 1)?.[0]?.[0];
        return cell ? { height: cell[0], edge: cell[1], water: !!cell[2] } : { height: NaN, edge: NaN, water: true };
      }
    });
    return { deckY: deck.y, centerY, centerDeckDelta: +(centerY - deck.y).toFixed(3), sides };
  }, { x: stone.x, z: stone.z, radius: shelterGeometry.r1, stepUp: stepUpLimit, centerY: stone.centerY });
  assert.ok(!result.error, stone.id + ': ' + (result.error || 'geometria indisponível'));
  assert.ok(Math.abs(result.centerDeckDelta - shelterGeometry.step) < .03,
    stone.id + ': cota do anel diverge do contrato SHELTER.step: ' + JSON.stringify(result));
  assert.equal(result.sides.length, 8, stone.id + ': auditoria não cobriu oito lados');
  report.approaches.push({
    id: stone.id, radius: shelterGeometry.r1, stepUp: stepUpLimit, deckY: +result.deckY.toFixed(3),
    centerY: +result.centerY.toFixed(3),
    sides: result.sides.map(side => ({
      index: side.index, angle: side.angle, staging: side.staging, entry: side.entry,
      groundY: side.groundY, maxApproachGroundY: side.maxApproachGroundY, rise: side.rise, ok: side.ok, reason: side.reason, samples: side.samples
    }))
  });
  return result.sides;
}
async function walkTo(stone, label) {
  const start = await playerState();
  const originDistance = Math.hypot(stone.x - start.x, stone.z - start.z);
  const sides = await inspectShelterApproaches(stone);
  const candidates = sides.filter(side => side.ok).sort((a, b) => {
    const targetFor = side => ({ x: stone.x + Math.cos(side.angle) * .9, z: stone.z + Math.sin(side.angle) * .9 });
    const ta = targetFor(a), tb = targetFor(b);
    return a.rise - b.rise || Math.hypot(ta.x - start.x, ta.z - start.z) - Math.hypot(tb.x - start.x, tb.z - start.z);
  });
  const rejected = [];
  let selected = null;
  for (const side of candidates) {
    const target = { x: stone.x + Math.cos(side.angle) * .9, z: stone.z + Math.sin(side.angle) * .9 };
    const plan = await findWalkPath(start, target, stone);
    if (plan.ok) { selected = { target, plan, side }; break; }
    rejected.push({ side: side.index, target, reason: plan.reason, explored: plan.explored, sampled: plan.sampled });
  }
  if (!selected) {
    const summary = sides.map(side => ({ side: side.index, rise: side.rise, ok: side.ok, reason: side.reason }));
    throw new Error(label + ': nenhum dos oito lados oferece subida dentro de STEP_UP=' + stepUpLimit +
      ' ou rota livre; lados=' + JSON.stringify(summary) + '; rotas=' + JSON.stringify(rejected));
  }
  report.routes.push({
    label, target: selected.target, approachSide: selected.side.index,
    approachRise: selected.side.rise, approachGroundY: selected.side.groundY,
    points: selected.plan.points, rawPoints: selected.plan.rawPoints,
    explored: selected.plan.explored, sampled: selected.plan.sampled,
    goalDistance: selected.plan.goalDistance, catalog: selected.plan.catalog
  });
  let travelled = 0, totalSteps = 0, joystickStarted = false;
  try {
    joystickStarted = true;
    await beginJoystick();
    for (let waypointIndex = 0; waypointIndex < selected.plan.points.length; waypointIndex++) {
      const waypoint = selected.plan.points[waypointIndex];
      const waypointStart = await playerState();
      const initialDistance = Math.hypot(waypoint.x - waypointStart.x, waypoint.z - waypointStart.z);
      const maxSteps = waypointStepBudget(initialDistance);
      assert.ok(maxSteps > 0, label + ': distância inicial inválida no waypoint ' + waypointIndex);
      const progressWatch = createProgressWatch(initialDistance, { threshold: 0.04, now: Date.now() });
      let reached = false;
      for (let step = 0; step < maxSteps; step++) {
        const p = await playerState();
        const distance = Math.hypot(waypoint.x - p.x, waypoint.z - p.z);
        if (distance <= .38) { reached = true; break; }
        await aimJoystick(waypoint.x - p.x, waypoint.z - p.z, 0);
        const frameWaitStarted = Date.now();
        await waitForGameFrames(2, 6000);
        const frameWaitMs = Date.now() - frameWaitStarted;
        const after = await playerState();
        const nextDistance = Math.hypot(waypoint.x - after.x, waypoint.z - after.z);
        const delta = Math.hypot(after.x - p.x, after.z - p.z);
        travelled += delta; totalSteps++;
        const progress = progressWatch.sample(nextDistance, Date.now());
        report.legs.push({
          label, waypoint: waypointIndex, step: totalSteps, budget: maxSteps,
          distance: +distance.toFixed(2), nextDistance: +nextDistance.toFixed(2),
          delta: +delta.toFixed(2), x: +after.x.toFixed(2), z: +after.z.toFixed(2),
          progressed: progress.progressed, bestDistance: +progress.bestDistance.toFixed(2),
          stalledMs: progress.stalledMs, frameWaitMs,
          control: 'touch #stick'
        });
        if (progress.stalledMs >= 9000) {
          await shot(label + '-stalled');
          const diagnostics = await page.evaluate(({ x, z, dx, dz }) => {
            const api = window.SevenSinsDebug3D;
            const length = Math.hypot(dx, dz) || 1, ux = dx / length, uz = dz / length;
            const distances = [.06, .12, .18, .24, .36, .5, .75, 1, 1.5, 2];
            return {
              current: api.whyBlocked(x, z),
              axisSweep: distances.map(d => ({
                d, xFirst: api.whyBlocked(x + ux * d, z),
                zAfterX: api.whyBlocked(x + ux * d, z + uz * d),
                zOnly: api.whyBlocked(x, z + uz * d)
              })),
              joystick: {
                knob: document.getElementById('knob')?.style.transform || '',
                events: (window.__a5JoystickLifecycle || []).slice(-12)
              }
            };
          }, { x: after.x, z: after.z, dx: waypoint.x - after.x, dz: waypoint.z - after.z });
          const controls = await controlState();
          throw new Error(label + ': sem progresso acumulado por ' + (progress.stalledMs / 1000).toFixed(1) +
            's no waypoint ' + waypointIndex + '; distância=' + nextDistance.toFixed(2) +
            '; diagnóstico do passo X→Z=' + JSON.stringify({ diagnostics, controls }));
        }
      }
      const afterWaypoint = await playerState();
      const remaining = Math.hypot(waypoint.x - afterWaypoint.x, waypoint.z - afterWaypoint.z);
      assert.ok(reached || remaining <= .75, label + ': não alcançou waypoint ' + waypointIndex + '; distância=' + remaining.toFixed(2) + '; orçamento=' + maxSteps);
    }
    const p = await playerState(), support = await walkState();
    const nearStone = Math.hypot(stone.x - p.x, stone.z - p.z);
    assert.ok(nearStone <= 1.35, label + ': personagem fora do raio do abrigo (' + nearStone.toFixed(2) + 'm)');
    assert.ok(support.grounded, label + ': personagem não está apoiado no chão');
    assert.ok(['abrigo-degrau1', 'abrigo-degrau2'].includes(support.surface),
      label + ': chegou ao raio XZ, mas continua em ' + (support.surface || 'terreno') +
      '; y=' + p.y.toFixed(3) + '; piso=' + support.surfaceY + '; terreno=' + support.terrain);
    assert.ok(p.y > stone.centerY - .25,
      label + ': pés abaixo do gate de registro; y=' + p.y.toFixed(3) + '; mínimo=' + (stone.centerY - .25).toFixed(3));
    const netDistance = Math.hypot(p.x - start.x, p.z - start.z);
    assert.ok(originDistance <= 1.5 || netDistance >= originDistance - 1.5,
      label + ': deslocamento líquido insuficiente para comprovar joystick (' + netDistance.toFixed(2) + 'm de ' + originDistance.toFixed(2) + 'm)');
    const result = {
      label, from: { x: start.x, z: start.z }, to: { x: p.x, y: p.y, z: p.z },
      playerY: +p.y.toFixed(3), stoneCenterY: +stone.centerY.toFixed(3),
      verticalDelta: +(p.y - stone.centerY).toFixed(3), grounded: !!support.grounded,
      surface: support.surface, surfaceY: support.surfaceY, terrain: support.terrain,
      approachSide: selected.side.index, approachRise: selected.side.rise,
      originDistance: +originDistance.toFixed(2), finalDistance: +nearStone.toFixed(2), netDistance: +netDistance.toFixed(2),
      travelled: +travelled.toFixed(2), steps: totalSteps,
      routePoints: selected.plan.points.length, rawPoints: selected.plan.rawPoints, control: 'touch #stick'
    };
    report.walks.push(result);
    return result;
  } finally {
    if (joystickStarted) await endJoystick();
  }
}
async function registerStone(stone, expectedProgress, mapKey) {
  const p = await playerState(), support = await walkState();
  const d = Math.hypot(stone.x - p.x, stone.z - p.z);
  assert.ok(d <= 1.35, stone.id + ': personagem fora do raio de registro (' + d.toFixed(2) + 'm)');
  assert.ok(support.grounded, stone.id + ': personagem não está apoiado no chão para interagir');
  assert.ok(['abrigo-degrau1', 'abrigo-degrau2'].includes(support.surface),
    stone.id + ': interação fora da superfície do abrigo (' + (support.surface || 'terreno') + ')');
  assert.ok(p.y > stone.centerY - .25,
    stone.id + ': pés abaixo do gate nearestWaystone; y=' + p.y.toFixed(3) + '; mínimo=' + (stone.centerY - .25).toFixed(3));
  const buttonBefore = await page.evaluate(() => {
    const b = document.getElementById('talk-button');
    return { exists: !!b, hidden: !!b?.classList.contains('hidden'), text: b?.textContent?.trim() || '' };
  });
  report.interactionChecks.push({
    id: stone.id, x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3),
    centerY: +stone.centerY.toFixed(3), verticalDelta: +(p.y - stone.centerY).toFixed(3),
    distance: +d.toFixed(3), grounded: !!support.grounded,
    surface: support.surface, surfaceY: support.surfaceY, terrain: support.terrain, buttonBefore
  });
  await shot(stone.id + '-approach');
  await page.waitForFunction(() => {
    const b = document.getElementById('talk-button');
    return b && !b.classList.contains('hidden') && b.textContent.includes('REGISTRAR ESTE ABRIGO');
  }, null, { timeout: 30000 });
  const buttonReady = await page.evaluate(() => {
    const b = document.getElementById('talk-button');
    return { exists: !!b, hidden: !!b?.classList.contains('hidden'), text: b?.textContent?.trim() || '' };
  });
  report.interactionChecks.push({ id: stone.id, phase: 'ready', button: buttonReady });
  await page.evaluate(() => {
    window.__a5InteractionPointerType = null;
    document.getElementById('talk-button').addEventListener('pointerdown', e => {
      window.__a5InteractionPointerType = e.pointerType;
    }, { once: true });
  });
  await page.locator('#talk-button').tap();
  await page.waitForFunction(() => window.__a5InteractionPointerType === 'touch', null, { timeout: 5000 });
  report.input.interactionPointerTypes.push(await page.evaluate(() => window.__a5InteractionPointerType));
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
// Navegação/reload recria o contexto da página; os helpers QA em window precisam ser reinstalados.
async function exposePathfinder() {
  const ready = await page.evaluate(async () => {
    const pathfinder = await import('/tools/qa/a5-waystone-pathfinding.mjs');
    window.__a5AxisSeparatedSegmentClear = pathfinder.isAxisSeparatedSegmentClear;
    window.__a5AxisSeparatedPathClear = pathfinder.isAxisSeparatedPathClear;
    window.__a5RankShelterApproaches = pathfinder.rankShelterApproaches;
    return typeof window.__a5AxisSeparatedSegmentClear === 'function' &&
      typeof window.__a5AxisSeparatedPathClear === 'function' &&
      typeof window.__a5RankShelterApproaches === 'function';
  });
  assert.equal(ready, true, 'módulo de colisão eixo a eixo não carregou no Chromium');
}

(async () => {
  try {
    fs.mkdirSync(OUT, { recursive: true });
    const { SIDE_QUESTS, SIDE_QUEST_WAYSTONES } = await import('../../sidequests3d.js');
    const { MAP_STORE_KEY } = await import('../../map3d.js');
    const { SHELTER } = await import('../../eldoria-shelter3d.js');
    const { STEP_UP } = await import('../../eldoria-walkable.js');
    assert.ok(Number.isFinite(SHELTER.r1) && Number.isFinite(STEP_UP), 'geometria/STEP_UP de produção indisponível');
    shelterGeometry = SHELTER;
    stepUpLimit = STEP_UP;
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
    await waitForWorldCollisionReady('initial');
    await exposePathfinder();
    await wait(2200);
    await page.evaluate(() => { window.SevenSinsDebug3D.realtime(); window.SevenSinsDebug3D.act1(1, 1); });
    await wait(900);
    let initial = await qa();
    assert.equal(initial.questStep, 1, 'campanha não ficou no passo inicial seguro');
    assert.equal(initial.side.abrigos.state, 'active', 'fixture da missão não foi carregado');
    assert.equal(initial.side.abrigos.progress, 0);
    assert.equal(initial.registeredWaystones.length, 0);
    const initialControl = await controlState();
    assert.equal(initialControl.story.sub, 1, 'fixture deve começar após a chegada à vila, sem a cinemática de chegada');
    assert.equal(initialControl.story.scene, null, 'cena de história bloqueia a caminhada');
    assert.equal(initialControl.regression.busy, false, 'controle do protagonista ainda está bloqueado pela história');
    const expectedObjective = 'Pergunte a Téo sobre o Pecado da Ganância';
    const expectedTalkLabel = 'PERGUNTAR · TÉO';
    assert.equal(initialControl.state.objective, expectedObjective, 'HUD do Ato I não mostra o objetivo corrigido de Téo');
    assert.equal(initialControl.story.label, expectedTalkLabel, 'estado narrativo não aponta para a interação principal com Téo');
    const talkButton = page.locator('#talk-button');
    assert.equal(await talkButton.isVisible(), true, 'botão principal de interação não está visível');
    const talkButtonText = (await talkButton.innerText()).replace(/\s+/g, ' ').trim();
    assert.match(talkButtonText, /PERGUNTAR\s*·\s*TÉO/i, 'texto visível do botão não corresponde ao vendedor da cena principal');
    report.mainQuestPrompt = { objective: initialControl.state.objective, label: initialControl.story.label, buttonVisible: true, buttonText: talkButtonText, dialogueOpened: initialControl.state.dialogueOpen };
    report.initial = { questStep: initial.questStep, side: initial.side.abrigos, coins: initial.coins, xp: initial.xp, control: initialControl };
    await shot('00-initial-active');

    // Validar a interação narrativa real antes da caminhada: parar na primeira fala de Téo,
    // antes da ação entregar-ouro, para não consumir moedas nem avançar a campanha.
    await talkButton.tap();
    await page.waitForFunction(() => {
      const panel = document.getElementById('dialog-panel');
      const text = document.getElementById('dialog-text')?.textContent?.trim();
      return panel && !panel.classList.contains('hidden') &&
        text === 'Com licença. O senhor já ouviu algum rumor sobre o Pecado da Ganância?';
    }, null, { timeout: 15000 });
    const heroOpening = (await page.locator('#dialog-text').innerText()).trim();
    assert.equal(heroOpening, 'Com licença. O senhor já ouviu algum rumor sobre o Pecado da Ganância?',
      'o botão PERGUNTAR · TÉO não abriu a primeira fala da cena principal');
    await page.locator('#dialog-continue').tap();
    await page.waitForFunction(() => {
      const panel = document.getElementById('dialog-panel');
      const who = document.getElementById('dialog-who')?.textContent?.trim();
      const text = document.getElementById('dialog-text')?.textContent?.trim();
      return panel && !panel.classList.contains('hidden') &&
        who === 'Téo · Provisões' &&
        text === 'Rumor não enche barriga, forasteiro. Se não vai comprar nada, vaza.';
    }, null, { timeout: 15000 });
    const teoOpening = await page.evaluate(() => ({
      who: document.getElementById('dialog-who')?.textContent?.trim() || '',
      text: document.getElementById('dialog-text')?.textContent?.trim() || ''
    }));
    assert.equal(teoOpening.who, 'Téo · Provisões', 'a primeira resposta não identifica Téo · Provisões');
    assert.equal(teoOpening.text, 'Rumor não enche barriga, forasteiro. Se não vai comprar nada, vaza.');
    report.mainQuestPrompt = {
      ...report.mainQuestPrompt,
      dialogueOpened: true,
      heroOpening,
      dialogueSpeaker: teoOpening.who,
      dialogueLine: teoOpening.text,
      dialogueScope: 'first exchange only; stopped before entregar-ouro'
    };
    await shot('00-vendor-dialogue-teo');

    // A conversa foi interrompida antes de qualquer transação. Recarregar restaura o fixture
    // da caminhada sem cobrar moedas, mudar o passo ou deixar a cutscene bloqueando o controle.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitRuntime();
    await exposePathfinder();
    await waitForWorldCollisionReady('after-vendor-dialogue-reload');
    await wait(1800);
    await page.evaluate(() => { window.SevenSinsDebug3D.realtime(); window.SevenSinsDebug3D.act1(1, 1); });
    await wait(700);
    const afterVendorReload = await qa();
    const afterVendorControl = await controlState();
    assert.equal(afterVendorControl.story.sub, 1, 'reload após diálogo não restaurou a etapa da vila');
    assert.equal(afterVendorControl.story.scene, null, 'reload após diálogo deixou cena ativa');
    assert.equal(afterVendorControl.regression.busy, false, 'reload após diálogo deixou o controle bloqueado');
    assert.equal(afterVendorReload.side.abrigos.progress, 0, 'diálogo alterou indevidamente o progresso dos abrigos');
    assert.equal(afterVendorReload.coins, initial.coins, 'diálogo cobrou moedas antes da ação entregar-ouro');
    assert.equal(afterVendorReload.xp, initial.xp, 'diálogo alterou XP antes da ação entregar-ouro');

    await page.waitForFunction(ids => {
      const current = window.SevenSinsDebug3D.sideQuestQA().waystones.filter(w => ids.includes(w.id));
      return current.length === 3 && current.every(w => Number.isFinite(w.centerY));
    }, SIDE_QUEST_WAYSTONES, { timeout: 30000 });
    initial = await qa();
    let stones = initial.waystones.filter(w => SIDE_QUEST_WAYSTONES.includes(w.id));
    assert.equal(stones.length, 3, 'runtime não expôs os três abrigos de Eldória');
    assert.ok(stones.every(w => Number.isFinite(w.centerY)), 'altura visual dos três abrigos ainda não está disponível');
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
    await exposePathfinder();
    await waitForWorldCollisionReady('after-two-waystones-reload');
    await wait(1800);
    await page.evaluate(() => { window.SevenSinsDebug3D.realtime(); window.SevenSinsDebug3D.act1(1, 1); });
    await wait(700);
    const afterReload = await qa();
    const reloadControl = await controlState();
    assert.equal(reloadControl.story.sub, 1, 'reload não restaurou a etapa de vila sem cinemática');
    assert.equal(reloadControl.regression.busy, false, 'reload deixou o movimento bloqueado');
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
    await waitForWorldCollisionReady('after-final-reload');
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

    assert.equal(report.screenshots.length, 12, 'capturas de estado incompletas');
    assert.equal(report.input.joystickPointerTypes.length, 3, 'três percursos precisam usar pointerType touch');
    assert.ok(report.input.joystickPointerTypes.every(type => type === 'touch'), 'joystick não recebeu toque real');
    assert.equal(report.input.joystickPointerMoves.length, 3, 'três percursos precisam mover o knob pelo pointermove touch');
    assert.ok(report.input.joystickPointerMoves.every(move => move.count > 0), 'joystick não recebeu pointermove touch');
    assert.equal(report.input.joystickLifecycle.length, 3, 'três ciclos de joystick precisam ter diagnóstico de captura');
    assert.ok(report.input.joystickLifecycle.every(s => s.events.some(e => e.type === 'pointerdown' && e.pointerType === 'touch')), 'um percurso não começou com pointerdown touch');
    assert.ok(report.input.joystickLifecycle.every(s => hasCompletedTouchLifecycle(s.events)), 'cada toque do joystick precisa terminar com pointerup/pointercancel touch do mesmo pointerId após touchEnd');
    assert.equal(report.input.interactionPointerTypes.length, 3, 'três registros precisam usar pointerType touch');
    assert.ok(report.input.interactionPointerTypes.every(type => type === 'touch'), 'botão de registro não recebeu toque real');
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
