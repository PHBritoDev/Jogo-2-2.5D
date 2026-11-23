'use strict';
// A2: QA WebGL do rito real Eclipse das Lâminas, com dois alvos secundários e um controle fora da onda.
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
  const report = { ok: false, scenario: 'Eclipse das Lâminas / quatro ondas / dois secundários', errors: [],
    steps: {}, limitations: ['SwiftShader valida este renderer, não FPS de Android físico.',
      'A câmera e o cenário são de laboratório; revisar vídeo e PNGs antes de aprovar o acabamento visual.'] };
  try {
    context = await browser.newContext({
      viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true,
      recordVideo: { dir: path.join(dir, 'video'), size: { width: 844, height: 390 } }
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
      D.teleport(-5, 16, 0);
      D.squadPose(primaryId, -5, 12.2, 0, true);
      D.squadPose(sides[0].id, -5.35, 12, 0, true);
      D.squadPose(sides[1].id, -4.65, 12, 0, true);
      D.squadPose(sides[2].id, -11, 12, 0, true);
      D.combatStep(.1, { fps: 30, draw: true });
      const synced = D.squadState();
      if (synced.focus !== primaryId) throw new Error('Foco do combate mudou durante a preparação.');
      D.riteEquip('aurora');
      D.fly([0, 4.5, 22], [-5, 1, 14]);
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
    assert.ok(Math.hypot(report.steps.before.target[0] - (-5), report.steps.before.target[2] - 12.2) < .5,
      'ponte de alvo precisa acompanhar o foco reposicionado');
    await page.screenshot({ path: path.join(dir, '01-antes-do-rito.png'), timeout: 120000 });

    report.steps.cast = await page.evaluate(() => {
      const D = window.SevenSinsDebug3D;
      const state = D.riteCast();
      return { active: state.active, mana: state.mana, sword: state.sword, camera: state.camera };
    });
    assert.equal(report.steps.cast.active?.kind, 'aurora', 'Eclipse das Lâminas precisa iniciar no jogo real');
    await page.evaluate(() => { SevenSinsDebug3D.combatStep(.25, { fps: 30, draw: true }); });
    await page.screenshot({ path: path.join(dir, '02-conjuracao.png'), timeout: 120000 });

    report.steps.mid = await page.evaluate(() => {
      const D = window.SevenSinsDebug3D;
      D.combatStep(.75, { fps: 30, draw: true });
      const r = D.riteState();
      return { waves: r.waves, projectiles: r.projectiles, events: r.events };
    });
    assert.ok(report.steps.mid.projectiles.length > 0, 'ondas precisam existir em voo');
    assert.ok(report.steps.mid.projectiles.some(w => w.direction.z < -.9), 'ondas devem viajar à frente do protagonista');
    await page.screenshot({ path: path.join(dir, '03-primeiro-impacto.png'), timeout: 120000 });

    report.steps.late = await page.evaluate(() => {
      const D = window.SevenSinsDebug3D;
      D.combatStep(.8, { fps: 30, draw: true });
      const r = D.riteState();
      return { waves: r.waves, projectiles: r.projectiles, events: r.events };
    });
    await page.screenshot({ path: path.join(dir, '04-ondas-multialvo.png'), timeout: 120000 });

    report.steps.after = await page.evaluate(() => {
      const D = window.SevenSinsDebug3D;
      D.combatStep(.75, { fps: 30, draw: true });
      const s = D.squadState();
      const r = D.riteState();
      return { actors: s.snap.actors, events: r.events, projectiles: r.projectiles,
        active: r.active, sword: r.sword };
    });
    const before = new Map(report.steps.before.actors.map(a => [a.id, a]));
    const after = new Map(report.steps.after.actors.map(a => [a.id, a]));
    const impactEvents = report.steps.after.events.filter(e => e.type === 'impact' && e.position);
    report.steps.after.mappedImpacts = Object.fromEntries(report.steps.before.sideIds.map(id => {
      const a = before.get(id);
      return [id, impactEvents.filter(e => Math.abs(e.position.x - a.x) < .12 &&
        Math.abs(e.position.z - a.z) < .8).length];
    }));
    report.steps.after.controlImpacts = impactEvents.filter(e => {
      const a = before.get(report.steps.before.controlId);
      return Math.abs(e.position.x - a.x) < .2 && Math.abs(e.position.z - a.z) < .8;
    }).length;
    for (const id of report.steps.before.sideIds) {
      assert.ok(after.get(id)?.hp < before.get(id).hp, `HP de ${id} precisa cair pela onda real`);
      assert.ok(report.steps.after.mappedImpacts[id] > 0, `impacto visual de ${id} precisa ter posição própria`);
    }
    assert.equal(after.get(report.steps.before.controlId)?.hp, before.get(report.steps.before.controlId).hp,
      'alvo fora da largura da onda deve permanecer sem dano');
    assert.equal(report.steps.after.controlImpacts, 0, 'alvo fora da onda não pode receber impacto visual');
    assert.deepEqual(report.errors, [], 'sem exceções WebGL/JS ou respostas HTTP falhas');
    await page.screenshot({ path: path.join(dir, '05-dissipacao.png'), timeout: 120000 });
    await page.evaluate(() => { SevenSinsDebug3D.fly(null); });
    report.ok = true;
  } finally {
    fs.writeFileSync(path.join(dir, 'resultado.json'), JSON.stringify(report, null, 2) + '\n');
    await context?.close();
    await browser.close();
  }
  console.log(JSON.stringify({ ok: report.ok, steps: report.steps }));
})().catch(e => { console.error(e); process.exitCode = 1; });
