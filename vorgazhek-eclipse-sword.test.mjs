import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createEclipseSword, moonPlacement, eclipseArms, ECLIPSE } from './vorgazhek-eclipse-sword3d.js';
import { KITS, kitFor, pickMove, powerStats } from './powers3d.js';
import { ultimateFor } from './ultimates3d.js';

const ground = (x, z) => -2000 + .1 * Math.sin(x * .3);
const BOSS = { x: 800, y: ground(800, 0), z: 0 };
/** Roda a habilidade inteira; move(hero, t) muda o herói. */
function run(move = () => {}, o = {}) {
  const es = createEclipseSword({ ground, ...o }).start(), hero = { x: 800, z: 14, vx: 0, vz: 0, iframes: false }, log = { ev: [], phases: [], aimAt: null, moonFirst: es.st.moon, frozen: true };
  let t = 0, last = '', dirAt = null;
  for (let i = 0; i < 60 * 15 && !es.done; i++) { t = i / 60; move(hero, t); hero.y = ground(hero.x, hero.z);
    const s0 = es.st.slash ? [es.st.slash.dx, es.st.slash.dy, es.st.slash.dz] : null;
    for (const e of es.step(1 / 60, hero, { from: { x: 800, y: BOSS.y + 4.2, z: .6 }, boss: BOSS })) { e.t = es.st.t; log.ev.push(e); }
    const s1 = es.st.slash; if (s0 && s1 && (s1.dx !== s0[0] || s1.dy !== s0[1] || s1.dz !== s0[2])) log.frozen = false;
    if (es.st.phase !== last) { log.phases.push([es.st.phase, +es.st.t.toFixed(2)]); last = es.st.phase; } }
  log.es = es; return log;
}
const at = (L, type) => L.ev.find(e => e.type === type);

test('Mod 261 — etapas e tempos: lua no 1º quadro, carga de 3,2 s em 4 estágios, golpe ≤ 2 s, colapso de 2,4 s', () => {
  const L = run();
  assert.equal(L.moonFirst, 1, 'o eclipse existe desde o primeiro quadro'); assert.equal(L.ev[0].type, 'start');
  assert.deepEqual(L.ev.filter(e => e.type === 'stage').map(e => e.n), [2, 3, 4]);
  const stg = L.ev.filter(e => e.type === 'stage').map(e => e.t); assert.ok(Math.abs(stg[0] - .6) < .03 && Math.abs(stg[1] - 1.5) < .03 && Math.abs(stg[2] - 2.5) < .03);
  const sw = at(L, 'swing'), rel = at(L, 'release'), imp = at(L, 'impact'), end = at(L, 'end');
  assert.ok(Math.abs(sw.t - 3.2) < .03, 'carga de 3,2 s'); assert.ok(rel.t > 3.2 && rel.t < 3.7, 'antecipação curta');
  assert.ok(imp.t - 3.2 <= ECLIPSE.releaseMax + .02, 'disparo e voo cabem na janela de 2 s');
  const impPh = L.phases.find(p => p[0] === 'impact'), fade = L.phases.find(p => p[0] === 'fade'); assert.ok(Math.abs(fade[1] - impPh[1] - 2.4) < .03, 'colapso dura 2,4 s');
  assert.ok(end && L.es.done && L.es.st.moon === 0 && L.es.st.aura === 0, 'tudo se desfaz no fim');
});

test('Mod 261 — corte: mira travada no lançamento, acerta parado, desvia correndo de lado e com dash; um acerto só', () => {
  const still = run(); assert.equal(still.ev.filter(e => e.type === 'hit').length, 1); assert.equal(at(still, 'impact').kind, 'hero'); assert.ok(still.frozen);
  const hit = at(still, 'impact'); assert.ok(Math.hypot(hit.x - 800, hit.z - 14) < .01 && hit.y > ground(800, 14), 'impacto no herói, no ponto de contato');
  // correndo de lado depois do lançamento: o corte segue reto e bate no chão no ponto projetado
  const side = run((h, t) => { if (t > 3.62) { h.vx = 9; h.x += 9 / 60; } }); assert.equal(side.ev.filter(e => e.type === 'hit').length, 0);
  const g = at(side, 'impact'); assert.equal(g.kind, 'ground'); assert.ok(Math.abs(g.y - ground(g.x, g.z)) < .05); const rel = at(side, 'release');
  assert.ok(Math.hypot(g.x - rel.target.x, g.z - rel.target.z) < 1.2, 'impacto no ponto mirado no lançamento, não no herói'); assert.ok(side.frozen);
  // dash (i-frames) atravessa sem dano; o impacto ainda acontece no chão
  const dash = run((h, t) => { h.iframes = t > 3.5 && t < 4.3; }); assert.equal(dash.ev.filter(e => e.type === 'hit').length, 0); assert.equal(at(dash, 'impact').kind, 'ground');
  // antecipação limitada: correndo antes do lançamento, a mira vai no máximo 2,5 m à frente
  const runL = run((h, t) => { h.vx = 6; h.x = 795 + 6 * t * .3; }); const r2 = at(runL, 'release'), heroX = 795 + 6 * r2.t * .3; assert.ok(r2.target.x - heroX <= ECLIPSE.leadCap + .05 && r2.target.x - heroX >= 0);
});

test('Mod 261 — sem túnel: corte rápido com passo grande ainda pega o herói; parede interrompe no ponto real', () => {
  const es = createEclipseSword({ ground, T: { speed: 140 } }).start(), hero = { x: 800, z: 14, vx: 0, vz: 0, y: ground(800, 14) }; let hits = 0;
  while (!es.done) for (const e of es.step(1 / 15, hero, { from: { x: 800, y: BOSS.y + 4, z: 0 }, boss: BOSS })) if (e.type === 'hit') hits++;
  assert.equal(hits, 1);
  const w = run(() => {}, { blocked: (x, z) => z > 7 }); const imp = at(w, 'impact'); assert.equal(imp.kind, 'wall'); assert.ok(imp.z <= 7.1 && imp.z > 5, 'para na parede'); assert.equal(w.ev.filter(e => e.type === 'hit').length, 0);
});

test('Mod 261 — interrupção (morte, saída, reset): some rápido, sem dano nem corte', () => {
  for (const cut of [1, 3.5, 3.65]) { const es = createEclipseSword({ ground }).start(), hero = { x: 800, z: 14, vx: 0, vz: 0 }; let t = 0;
    while (t < cut) { es.step(1 / 60, hero, { from: { x: 800, y: BOSS.y + 4, z: 0 }, boss: BOSS }); t += 1 / 60; }
    es.abort(); const ev = []; for (let i = 0; i < 60 && !es.done; i++) ev.push(...es.step(1 / 60, hero, { boss: BOSS }));
    assert.ok(es.done && !es.st.slash && !ev.some(e => e.type === 'hit' || e.type === 'impact' || e.type === 'release')); assert.equal(es.st.moon, 0); }
});

test('Mod 261 — eclipse composto atrás/acima do bispo, do lado da espada, acima do chão e nunca atrás do fundo', () => {
  for (const [cam, boss] of [[{ x: 800, y: -1997.5, z: 14 }, BOSS], [{ x: 790, y: -1997, z: -6 }, { x: 806, y: -2000, z: 3 }], [{ x: 812, y: -1999.2, z: 0 }, { x: 800, y: -2000, z: 0 }]]) {
    for (const side of [1, -1]) { const m = moonPlacement(cam, boss, { side, ground: boss.y });
      const toB = Math.atan2(boss.x - cam.x, boss.z - cam.z), toM = Math.atan2(m.x - cam.x, m.z - cam.z), dyaw = Math.atan2(Math.sin(toM - toB), Math.cos(toM - toB));
      assert.ok(Math.abs(dyaw) > .08 && Math.abs(dyaw) < .3 && Math.sign(dyaw) === -side, 'ligeiramente para o lado da espada');
      const hb = Math.hypot(boss.x - cam.x, boss.z - cam.z), hm = Math.hypot(m.x - cam.x, m.z - cam.z), eB = Math.atan2(boss.y + 4.6 - cam.y, hb), eM = Math.atan2(m.y - cam.y, hm);
      assert.ok(eM > eB && eM - eB < .4, 'logo acima da ponta da espada'); assert.ok(hm > hb + 3, 'atrás do bispo'); assert.ok(m.dist <= ECLIPSE.moonDist, 'antes das construções do fundo');
      assert.ok(m.y - m.r > boss.y + 2, 'nunca atravessa o chão'); assert.ok(Math.abs(Math.atan(m.r / m.dist) - ECLIPSE.moonAng) < 1e-6, 'tamanho angular fixo'); } }
});

test('Mod 261 — pose: espada erguida na carga, recuo na antecipação e golpe para a frente', () => {
  const es = createEclipseSword({ ground }).start(), h = { x: 800, z: 14, vx: 0, vz: 0 }; const seq = [];
  for (let i = 0; i < 60 * 4.4; i++) { es.step(1 / 60, h, { boss: BOSS }); const p = eclipseArms(es.st); if (p) seq.push([es.st.phase, es.st.pt, p]); }
  const ch = seq.find(s => s[0] === 'charge' && s[1] > 1)[2]; assert.ok(ch.rla[1] > .9 && ch.w === 1, 'braço da espada para cima');
  const back = seq.find(s => s[0] === 'release' && s[1] > .25 && s[1] < .3)[2]; assert.ok(back.rla[0] < 0, 'recua antes do corte');
  const down = seq.find(s => s[0] === 'release' && s[1] > .6)[2]; assert.ok(down.rla[0] > .8 && down.rla[1] < 0, 'golpe para a frente e para baixo');
});

test('Mod 261 — kit: slot da espada ativo com tipo próprio e alcance; s2/ultimate seguem reservados; nada antigo voltou', () => {
  const k = kitFor('vorgazhek'); assert.equal(k, kitFor('fallen2')); assert.equal(k.sword.type, 'vorgazhek_eclipse_sword'); assert.equal(k.sword.name, 'ECLIPSE DA DÍVIDA');
  assert.ok(!k.sword.disabled && k.skills[1].disabled && k.ult.disabled); assert.equal(ultimateFor('vorgazhek'), null);
  assert.equal(k.skills[0].type, 'tornadoes'); assert.equal(k.skills[2].type, 'portal_swords');
  assert.ok(k.sword.cd >= 16 && k.sword.cd <= 22, 'recarga própria');
  for (const d of [5, 10, 18, 25]) assert.equal(pickMove('vorgazhek', {}, d, '').id, 'sw', 'selecionável à distância ' + d);
  assert.notEqual(pickMove('vorgazhek', {}, 2, '')?.id, 'sw'); assert.notEqual(pickMove('vorgazhek', { sw: 5 }, 10, '')?.id, 'sw');
  assert.ok(powerStats('vorgazhek', k.sword).dmg > 0);
  for (const p of ['vhazrael', 'zarkhael', 'greed3', 'fallen1']) assert.equal(pickMove(p, {}, 4, '').id, 'sw', 'golpe de perto dos outros perfis intacto: ' + p);
  for (const old of ['Golpe da Forja', 'FORNALHA', "'forge'", 'Lâminas de Metal']) assert.ok(!JSON.stringify(KITS.vorgazhek).includes(old));
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(src.includes("if(m.type==='vorgazhek_eclipse_sword'){startEclipseSword(m);return;}") && src.includes('updateEclipseSword(dt);') && src.includes('stopEclipseSword();stopPortalSwords();stopTornadoRitual();useRig'), 'ligado ao motor real e limpo ao sair');
  assert.ok(src.includes('if(eclipseSword||portalSwords||tornadoRitual)return;') && src.includes('if(portalSwords||tornadoRitual||eclipseSword)return;') && src.includes('if(tornadoRitual||portalSwords||eclipseSword)return;if(!tornadoVfx)'), 'não empilha com tornados nem portais');
  assert.ok(src.includes("'./EspadaBispo2.glb?v=mod261'") && fs.existsSync(new URL('./EspadaBispo2.glb', import.meta.url)), 'usa a EspadaBispo2.glb real');
  assert.ok(fs.readFileSync(new URL('./dimension-arenas3d.js', import.meta.url), 'utf8').includes("moon.name = 'VorgazhekMoonAmbient'"), 'a lua antiga é escondida e devolvida, não apagada');
  const lab = fs.readFileSync(new URL('./laboratorio-inimigos.html', import.meta.url), 'utf8'); assert.ok(lab.includes('testSwordEclipse=1'));
});
