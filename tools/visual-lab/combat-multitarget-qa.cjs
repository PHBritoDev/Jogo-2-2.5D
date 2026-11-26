'use strict';
// A2: QA WebGL do rito real Eclipse das Lâminas, com dois alvos secundários e um controle fora da onda.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dir = path.resolve(process.env.VISUAL_OUTPUT || 'visual-lab-results', 'combat-multitarget');
const base = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4176';

async function advanceCombat(page, { seconds, sideImpacts = null, complete = false }) {
  const fps = 30;
  return page.evaluate(({ seconds, sideImpacts, complete, fps }) => {
    const D = window.SevenSinsDebug3D;
    const maxFrames = Math.ceil(seconds * fps);
    let state = D.riteState(), framesAdvanced = 0;
    for (; framesAdvanced < maxFrames; framesAdvanced++) {
      D.combatStep(1 / fps, { fps, draw: true });
      state = D.riteState();
      const count = (state.events || []).filter(e => e.type === 'impact' && e.secondary).length;
      if (sideImpacts !== null && count >= sideImpacts) { framesAdvanced++; break; }
      if (complete && !state.active && (state.projectiles || []).length === 0) { framesAdvanced++; break; }
    }
    return {
      waves: state.waves, projectiles: state.projectiles, events: state.events, vfx: state.vfx,
      framesAdvanced, simulatedSeconds: framesAdvanced / fps
    };
  }, { seconds, sideImpacts, complete, fps });
}

fs.mkdirSync(dir, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: [
    '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage', '--ignore-gpu-blocklist'
  ] });
  let context;
  const report = { ok: false, scenario: 'Eclipse das Lâminas / quatro ondas / dois secundários + foco separado + controle fora da faixa', errors: [],
    steps: {}, limitations: ['SwiftShader valida este renderer, não FPS de Android físico.',
      'A câmera e o cenário são de laboratório; revisar vídeo e PNGs antes de aprovar o acabamento visual.'] };
  try {
    context = await browser.newContext({
      viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true,
      recordVideo: { dir: path.join(dir, 'video'), size: { width: 844, height: 390 } }
    });
    const threeRoot = path.resolve(path.dirname(require.resolve('three')), '..');
    await context.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', route => {
      const relative = new URL(route.request().url()).pathname.split('/three@0.160.0/')[1];
      return route.fulfill({ path: path.join(threeRoot, relative), contentType: 'text/javascript' });
    });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && /WebGL|shader|TypeError|ReferenceError|INVALID/i.test(m.text())) report.errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) report.errors.push(`HTTP ${r.status()} ${r.url()}`); });
    await page.goto(base + '/mundo-3d-prototype.html?testeEnemy1=1&debug3d=1&fullCombatQA=1&todasHabilidades=1',
      { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready,
      null, { timeout: 300000 });
    await page.evaluate(() => {
      const D = window.SevenSinsDebug3D;
      D.setHour?.(10);
      D.squadLab('4');
      D.squadPause(true);
    });
    await page.waitForFunction(() => {
      const s = window.SevenSinsDebug3D?.squadState?.();
      return s?.on && (s.snap?.actors?.length || 0) >= 4;
    }, null, { timeout: 180000 });
    report.steps.before = await page.evaluate(() => {
      const D = window.SevenSinsDebug3D;
      const state = D.squadState();
      const actors = state.snap.actors;
      const primaryId = state.focus;
      const sides = actors.filter(a => a.id !== primaryId);
      if (!primaryId || sides.length < 3) throw new Error('Esquadra não forneceu foco + três secundários.');
      // Use o relógio manual antes de posicionar a esquadra. Uma captura de tela
      // pode levar mais tempo que a vida dos cortes entre dois combatStep().
      D.motionQA({ x: -5, z: 16, enemyDistance: 2.1, sword: 'aurora' });
      D.teleport(-5, 16, 0);
      D.squadPose(primaryId, -5, 13.9, 0, true);
      // A terceira onda sai da ponta inclinada da lâmina, à direita do herói.
      // Estes dois corpos ficam dentro das quatro trajetórias, separados por 1,50 m.
      D.squadPose(sides[0].id, -4.65, 12, 0, true);
      D.squadPose(sides[1].id, -3.15, 12, 0, true);
      D.squadPose(sides[2].id, -8.8, 12, 0, true);
      D.combatStep(.1, { fps: 30, draw: true });
      const synced = D.squadState();
      if (synced.focus !== primaryId) throw new Error('Foco do combate mudou durante a preparação.');
      D.riteEquip('aurora');
      D.fly([-5, 3.8, 19.5], [-4.6, 1, 12.8]);
      D.render();
      for (const el of document.querySelectorAll('#enemy1-lab,#vfx-lab')) el.style.display = 'none';
      const current = synced.snap.actors;
      const pick = id => current.find(a => a.id === id);
      return {
        primaryId, sideIds: [sides[0].id, sides[1].id], controlId: sides[2].id,
        actors: [primaryId, sides[0].id, sides[1].id, sides[2].id].map(id => pick(id)),
        target: D.riteState().target, sword: D.riteState().sword, mana: D.riteState().mana,
        focus: synced.focus, actorCount: current.length
      };
    });
    assert.equal(report.steps.before.sword, 'aurora', 'Lâmina da Aurora precisa estar equipada');
    assert.equal(report.steps.before.focus, report.steps.before.primaryId);
    assert.ok(report.steps.before.actors.every(a => a && Number.isFinite(a.hp)));
    const initialById = new Map(report.steps.before.actors.map(a => [a.id, a]));
    assert.ok(Math.abs(initialById.get(report.steps.before.sideIds[0]).x -
      initialById.get(report.steps.before.sideIds[1]).x)  >= 1.45,
      'os dois secundários precisam ficar visualmente separados e dentro da faixa comum das quatro ondas');
    assert.ok(Math.hypot(report.steps.before.target[0] - (-5), report.steps.before.target[2] - 13.7) < .5,
      'ponte de alvo precisa acompanhar o foco reposicionado');
    await page.screenshot({ path: path.join(dir, '01-antes-do-rito.png'), timeout: 120000 });

    report.steps.cast = await page.evaluate(() => {
      const D = window.SevenSinsDebug3D;
      const state = D.riteCast();
      return { active: state.active, mana: state.mana, sword: state.sword, camera: state.camera };
    });
    assert.equal(report.steps.cast.active?.kind, 'aurora', 'Eclipse das Lâminas precisa iniciar no jogo real');
    await advanceCombat(page, { seconds: .25 });
    await page.screenshot({ path: path.join(dir, '02-conjuracao.png'), timeout: 120000 });

    // Step at the actual 30 FPS cadence: a 0.40 s lump ages short-lived impact cuts before they can be inspected.
    report.steps.firstImpact = await advanceCombat(page, { seconds: 1.0, sideImpacts: 2 });
    const firstSide = report.steps.firstImpact.events.filter(e => e.type === 'impact' && e.secondary);
    assert.equal(firstSide.length, 2, 'primeira onda precisa gerar dois impactos secundários');
    assert.deepEqual(firstSide.map(e => e.targetId).sort(), [...report.steps.before.sideIds].sort());
    assert.equal(new Set(firstSide.map(e => e.waveSerial)).size, 1,
      'os dois alvos precisam ser tocados pela mesma primeira onda');
    assert.ok(report.steps.firstImpact.vfx.cuts >= 5, 'os dois impactos laterais precisam manter cortes visíveis no frame de contato');
    await page.screenshot({ path: path.join(dir, '03-impactos-primeira-onda.png'), timeout: 120000 });

    report.steps.mid = await advanceCombat(page, { seconds: 1.2, sideImpacts: 4 });
    assert.ok(report.steps.mid.projectiles.length > 0, 'ondas precisam existir em voo');
    assert.ok(report.steps.mid.projectiles.some(w => w.direction.z < -.9), 'ondas devem viajar à frente do protagonista');
    assert.equal(report.steps.mid.events.filter(e => e.type === 'impact' && e.secondary).length, 4,
      'a segunda onda precisa repetir os dois impactos individuais');
    await page.screenshot({ path: path.join(dir, '04-impactos-segunda-onda.png'), timeout: 120000 });

    report.steps.late = await advanceCombat(page, { seconds: 2.0, sideImpacts: 8 });
    assert.equal(report.steps.late.events.filter(e => e.type === 'impact' && e.secondary).length, 8,
      'as quatro ondas precisam atingir os dois secundários');
    await page.screenshot({ path: path.join(dir, '05-impactos-ultimas-ondas.png'), timeout: 120000 });

    report.steps.after = await page.evaluate(async () => {
      const D = window.SevenSinsDebug3D;
      const fps = 30, maxFrames = Math.ceil(4.5 * fps);
      let r = D.riteState(), framesAdvanced = 0;
      for (; framesAdvanced < maxFrames; framesAdvanced++) {
        D.combatStep(1 / fps, { fps, draw: true });
        r = D.riteState();
        if (!r.active && (r.projectiles || []).length === 0) { framesAdvanced++; break; }
      }
      const s = D.squadState();
      return { actors: s.snap.actors, events: r.events, projectiles: r.projectiles,
        active: r.active, sword: r.sword, vfx: r.vfx, framesAdvanced,
        simulatedSeconds: framesAdvanced / fps };
    });
    const before = new Map(report.steps.before.actors.map(a => [a.id, a]));
    const after = new Map(report.steps.after.actors.map(a => [a.id, a]));
    const trackedIds = [report.steps.before.primaryId, ...report.steps.before.sideIds];
    const impactEvents = report.steps.after.events.filter(e => e.type === 'impact' && e.position);
    report.steps.after.impactEventsByTargetId = Object.fromEntries(trackedIds.map(id => [id, impactEvents.filter(e => e.targetId === id).map(e => ({ waveSerial: e.waveSerial, at: e.at, by: e.by, secondary: e.secondary, position: e.position }))]));
    report.steps.after.secondaryImpactsById = Object.fromEntries(trackedIds.map(id => [id, impactEvents.filter(e => e.targetId === id && e.secondary).length]));
    const belongsTo = (e, a) => Math.abs(e.position.x - a.x) < .12 &&
      Math.abs(e.position.z - a.z) < .8;
    report.steps.after.mappedImpactsById = Object.fromEntries(trackedIds.map(id => {
      const a = before.get(id);
      return [id, impactEvents.filter(e => belongsTo(e, a)).length];
    }));
    report.steps.after.impactTimesById = Object.fromEntries(trackedIds.map(id => {
      const a = before.get(id);
      return [id, impactEvents.filter(e => belongsTo(e, a)).map(e => e.at)];
    }));
    report.steps.after.impactPositionsById = Object.fromEntries(trackedIds.map(id => {
      const a = before.get(id);
      return [id, impactEvents.filter(e => belongsTo(e, a)).map(e => e.position)];
    }));
    report.steps.after.hpDeltaById = Object.fromEntries([...before.keys()].map(id =>
      [id, before.get(id).hp - after.get(id).hp]));
    report.steps.after.controlImpacts = impactEvents.filter(e => {
      const a = before.get(report.steps.before.controlId);
      return Math.abs(e.position.x - a.x) < .2 && Math.abs(e.position.z - a.z) < .8;
    }).length;
    for (const id of trackedIds) {
      assert.ok(after.get(id)?.hp < before.get(id).hp, `HP de ${id} precisa cair pela onda real`);
      assert.equal(report.steps.after.mappedImpactsById[id], 4,
        `as quatro ondas precisam emitir exatamente um impacto separado em ${id}`);
      assert.equal(new Set(report.steps.after.impactTimesById[id]).size, 4,
        `cada impacto de ${id} precisa vir de uma onda/instante distinto`);
      const direct = impactEvents.filter(e => e.targetId === id);
      assert.equal(direct.length, 4, `os quatro eventos precisam identificar diretamente ${id}`);
      assert.equal(new Set(direct.map(e => e.waveSerial)).size, 4,
        `cada evento de ${id} precisa pertencer a uma onda distinta`);
      assert.ok(direct.every(e => e.by === 'energy'), `impactos de ${id} precisam vir da energia real`);
      assert.ok(direct.every(e => e.secondary === (id !== report.steps.before.primaryId)),
        `marca secundária de ${id} precisa corresponder ao papel no combate`);
      assert.equal(report.steps.after.secondaryImpactsById[id], id === report.steps.before.primaryId ? 0 : 4);
    }
    assert.equal(after.get(report.steps.before.controlId)?.hp, before.get(report.steps.before.controlId).hp,
      'alvo fora da largura da onda deve permanecer sem dano');
    assert.equal(report.steps.after.controlImpacts, 0, 'alvo fora da onda não pode receber impacto visual');
    assert.equal(impactEvents.filter(e => e.targetId === report.steps.before.controlId).length, 0,
      'controle fora da onda não pode receber evento de impacto por ID');
    assert.equal(report.steps.after.projectiles.length, 0, 'as quatro ondas precisam dissipar antes do fim do QA');
    assert.equal(report.steps.after.active, null, 'o rito precisa liberar a ação ao terminar');
    assert.deepEqual(report.errors, [], 'sem exceções WebGL/JS ou respostas HTTP falhas');
    await page.screenshot({ path: path.join(dir, '06-dissipacao.png'), timeout: 120000 });
    // Reproduz também o golpe físico real: dois secundários precisam receber VFX em pontos próprios da lâmina.
    report.steps.physicalBefore = await page.evaluate(() => {
      const D = window.SevenSinsDebug3D;
      const state = D.squadState(), primaryId = state.focus;
      const sides = state.snap.actors.filter(a => a.id !== primaryId);
      if (!primaryId || sides.length < 3) throw new Error('Esquadra física não forneceu foco + três secundários.');
      D.teleport(-5, 16, Math.PI);
      // Measured contact on the real first combo sweep is near (-4.82, 1.07, 14.84).
      // Put both secondary capsules on that same swept arc, separated by 1 m; keep focus ahead
      // so the actors do not overlap and the test proves two genuine side contacts.
      // Keep e3 inside the pickSquadFocus 0.9 hysteresis: z=13.7 lets e1 steal focus.
      D.squadPose(primaryId, -5, 13.9, 0, true);
      D.squadPose(sides[0].id, -5.32, 14.84, 0, true);
      D.squadPose(sides[1].id, -4.32, 14.84, 0, true);
      D.squadPose(sides[2].id, -8.8, 14.9, 0, true);
      D.squadPause(true);
      D.riteEquip('aurora');
      D.view(.7, .16, 6);
      D.combatStep(.1, { fps: 30, draw: true });
      const synced = D.squadState();
      if (synced.focus !== primaryId) throw new Error(`Foco físico mudou para ${synced.focus}; esperado ${primaryId}`);
      D.fly([-5, 4.6, 18], [-5, 1, 14.6]);
      D.render();
      const actors = D.squadState().snap.actors, pick = id => actors.find(a => a.id === id);
      return { primaryId, sideIds: [sides[0].id, sides[1].id], controlId: sides[2].id,
        actors: [primaryId, sides[0].id, sides[1].id, sides[2].id].map(pick),
        focusAfterSetup: synced.focus, eventCount: (D.riteState().events || []).length };
    });
    report.steps.physicalImpact = await page.evaluate(eventStart => {
      const D = window.SevenSinsDebug3D;
      D.combatAction('attack');
      D.combatStep(.3, { fps: 60, draw: true });
      const r = D.riteState(), squad = D.squadState();
      return { events: (r.events || []).slice(eventStart).filter(e => e.type === 'impact')
          .map(e => ({ targetId: e.targetId, by: e.by, secondary: e.secondary, position: e.position })),
        actors: squad.snap.actors, vfx: r.vfx, active: r.active };
    }, report.steps.physicalBefore.eventCount);
    const physicalBefore = new Map(report.steps.physicalBefore.actors.map(a => [a.id, a]));
    const physicalAfter = new Map(report.steps.physicalImpact.actors.map(a => [a.id, a]));
    const physicalSidePositions = report.steps.physicalBefore.sideIds.map(id => physicalBefore.get(id));
    assert.ok(Math.hypot(physicalSidePositions[0].x - physicalSidePositions[1].x, physicalSidePositions[0].z - physicalSidePositions[1].z) >= .95,
      'os secundários físicos precisam permanecer separados, sem cápsulas sobrepostas');
    assert.ok(physicalSidePositions.every(a => Math.hypot(a.x - physicalBefore.get(report.steps.physicalBefore.primaryId).x, a.z - physicalBefore.get(report.steps.physicalBefore.primaryId).z) >= .9),
      'secundários físicos não podem sobrepor o foco');
    const physicalSideEvents = report.steps.physicalImpact.events.filter(e => e.by === 'blade' && e.secondary);
    assert.equal(physicalSideEvents.length, 2, 'golpe físico real precisa atingir os dois secundários');
    assert.deepEqual(physicalSideEvents.map(e => e.targetId).sort(), [...report.steps.physicalBefore.sideIds].sort());
    assert.ok(physicalSideEvents.every(e => e.position && Number.isFinite(e.position.x)), 'cada VFX físico precisa ter posição');
    // Cápsulas adjacentes podem ter pontos de superfície próximos; atribua cada contato à cápsula correta,
    // em vez de exigir uma distância arbitrária apenas no eixo X.
    for (const e of physicalSideEvents) {
      const actor = physicalBefore.get(e.targetId);
      const otherId = report.steps.physicalBefore.sideIds.find(id => id !== e.targetId);
      const other = physicalBefore.get(otherId);
      const surfaceOffset = Math.hypot(e.position.x - actor.x, e.position.z - actor.z);
      const otherOffset = Math.hypot(e.position.x - other.x, e.position.z - other.z);
      assert.ok(surfaceOffset <= .55,
        `VFX físico de ${e.targetId} precisa permanecer na superfície da própria cápsula`);
      assert.ok(surfaceOffset + .08 < otherOffset && otherOffset > .55,
        `VFX de ${e.targetId} precisa ficar mais próximo da própria cápsula que da outra`);
    }
    const impactPointDistance = Math.hypot(
      physicalSideEvents[0].position.x - physicalSideEvents[1].position.x,
      physicalSideEvents[0].position.y - physicalSideEvents[1].position.y,
      physicalSideEvents[0].position.z - physicalSideEvents[1].position.z
    );
    assert.ok(impactPointDistance > .15, 'os dois impactos físicos precisam ter pontos de contato distintos');
    assert.ok(report.steps.physicalImpact.vfx.cuts >= 4,
      'os dois impactos físicos secundários precisam deixar os dois cortes visíveis por contato');
    for (const id of report.steps.physicalBefore.sideIds)
      assert.ok(physicalAfter.get(id).hp < physicalBefore.get(id).hp, `golpe físico precisa reduzir HP de ${id}`);
    assert.equal(physicalAfter.get(report.steps.physicalBefore.controlId).hp,
      physicalBefore.get(report.steps.physicalBefore.controlId).hp, 'controle fora do arco não pode receber dano');
    await page.screenshot({ path: path.join(dir, '07-golpe-fisico-multialvo.png'), timeout: 120000 });
    report.steps.physicalAfter = await page.evaluate(() => {
      const D = window.SevenSinsDebug3D;
      D.combatStep(.7, { fps: 60, draw: true });
      const r = D.riteState();
      return { active: r.active, projectiles: r.projectiles, vfx: r.vfx };
    });
    assert.equal(report.steps.physicalAfter.active, null, 'golpe físico precisa terminar sem travar o rito');
    assert.equal(report.steps.physicalAfter.vfx.cuts, 0, 'cortes físicos precisam dissipar');
    assert.equal(report.steps.physicalAfter.vfx.particles, 0, 'partículas físicas precisam dissipar');
    await page.screenshot({ path: path.join(dir, '08-golpe-fisico-dissipacao.png'), timeout: 120000 });
    await page.evaluate(() => { SevenSinsDebug3D.fly(null); });
    report.ok = true;
  } finally {
    fs.writeFileSync(path.join(dir, 'resultado.json'), JSON.stringify(report, null, 2) + '\n');
    await context?.close();
    await browser.close();
  }
  console.log(JSON.stringify({ ok: report.ok, steps: report.steps }));
})().catch(e => { console.error(e); process.exitCode = 1; });
