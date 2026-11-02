import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCosmicUlt, shakeAt, smoothNoise, swordTipY, COSMIC_ULT } from './vorgazhek-ultimate3d.js';
import { COSMIC_SWORD } from './vorgazhek-cosmic-sword3d.js';
import { KITS, kitFor, pickMove, powerStats } from './powers3d.js';
import { ultimateFor, ultimateDue } from './ultimates3d.js';

const ground = (x, z) => -2000 + .05 * Math.sin(x * .2);
const ARENA = { x: 800, z: 0, r: 30 };
function run(move = () => {}, o = {}) {
  const u = createCosmicUlt({ ground, ...o }).start({ x: 800, z: 6 }, { x: 800, z: -7 }, ARENA), hero = { x: 800, z: 6, y: 0, iframes: false }, log = { ev: [], lock: [], tips: [], white: [], trauma: [] };
  for (let i = 0; i < 60 * 20 && !u.done; i++) { const t = u.st.rt; move(hero, u, t); hero.y = ground(hero.x, hero.z);
    for (const e of u.step(1 / 60, hero)) { e.rt = u.st.rt; e.pi = u.st.pi; log.ev.push(e); }
    log.lock.push([u.st.rt, u.lockPlayer]); if (u.st.pi === 2) log.tips.push([u.st.pt, u.st.tipY]); log.white.push([u.st.rt, u.st.white, u.st.pi]); log.trauma.push([u.st.rt, u.st.trauma, u.st.pi]); }
  log.u = u; return log;
}
const find = (L, t, f = () => true) => L.ev.find(e => e.type === t && f(e));

test('Mod 262 — 4 fases em ordem (3,3 + 4,4 + 4,0 + 3,2 ≈ 14,9 s) num relógio real; nada fica para trás', () => {
  const L = run(); const ph = L.ev.filter(e => e.type === 'phase').map(e => [e.name, +e.rt.toFixed(2)]);
  assert.deepEqual(ph.map(p => p[0]), ['boss_aura', 'circle_build', 'sword_emerge_and_fall', 'impact_and_return']);
  assert.ok(Math.abs(ph[1][1] - 3.3) < .08 && Math.abs(ph[2][1] - 7.7) < .08 && Math.abs(ph[3][1] - 11.7) < .08, JSON.stringify(ph));
  const end = find(L, 'end'); assert.ok(end && Math.abs(end.rt - 14.9) < .25, 'fim ≈ 14,9 s (+ congelamento curto): ' + end.rt);
  const s = L.u.st; assert.ok(s.done && !L.u.lockPlayer && s.white === 0 && s.fovAdd === 0 && s.trauma === 0, 'sem estado residual');
});

test('Mod 262 — três círculos horizontais empilhados, 1 : 0,5 : 0,25, C1 = metade do diâmetro da arena, construídos até 4,4 s', () => {
  const L = run(), c = L.u.st.circles; assert.equal(c.length, 3);
  assert.equal(c[0].r * 2, ARENA.r); assert.equal(c[1].r / c[0].r, .5); assert.equal(c[2].r / c[0].r, .25);
  assert.ok(c[0].y < c[1].y && c[1].y < c[2].y, 'C1 mais baixo, C3 mais alto'); for (const x of c) assert.ok(x.h >= 14 && x.h <= 31);
  const done = L.ev.filter(e => e.type === 'circle'); assert.equal(done.length, 3); assert.ok(done.every(e => e.rt - 3.3 <= 4.4 + .05), 'todos prontos dentro da fase 2');
  assert.ok(done[0].r === 15 && done[2].r === 3.75, 'C1 começa e termina antes, depois C2 e C3 (sobrepostos no tempo)');
});

test('Mod 262 — espada gigante: ponta primeiro pelo C1, desce devagar e acelera, crava no ponto FIXO do chão', () => {
  const L = run((h, u) => { if (u.st.pi === 2 && !u.lockPlayer) h.x += .02; }), st = L.u.st, c1y = st.circles[0].y;
  assert.ok(Math.abs(L.tips[0][1] - c1y) < .2, 'começa no plano do C1'); for (let i = 1; i < L.tips.length; i++) assert.ok(L.tips[i][1] <= L.tips[i - 1][1] + 1e-9, 'só desce');
  const v1 = (L.tips[60][1] - L.tips[90][1]), v2 = (L.tips[200][1] - L.tips[230][1]); assert.ok(v2 > v1 * 2.2, 'acelera no fim');
  assert.ok(swordTipY(1, c1y, st.P.y) < st.P.y, 'a ponta crava no chão');
  const total = COSMIC_SWORD.blade + COSMIC_SWORD.guardY + .05 + COSMIC_SWORD.grip + COSMIC_SWORD.pommel; assert.ok(total * COSMIC_ULT.swordScale < st.circles[0].h + COSMIC_ULT.embed, 'a espada inteira atravessa o C1 até o impacto (guarda e cabo também)');
  const imp = find(L, 'impact'); assert.equal(imp.x, st.P.x); assert.equal(imp.z, st.P.z); assert.ok(Math.abs(imp.y - ground(imp.x, imp.z)) < 1e-9, 'impacto no chão do ponto fixo, mesmo com o herói andando');
  // ponto fixo é o herói no início, mas dentro da arena
  const edge = createCosmicUlt({ ground }).start({ x: 829, z: 0 }, { x: 800, z: 0 }, ARENA); assert.ok(Math.hypot(edge.st.P.x - 800, edge.st.P.z) <= ARENA.r - COSMIC_ULT.edge + 1e-9);
});

test('Mod 262 — justiça: controle volta antes do impacto; parado leva dano, correndo ou com dash escapa; um acerto só', () => {
  const still = run(); const rel = find(still, 'release'); assert.ok(rel && rel.pi === 2 && Math.abs(rel.rt - (7.7 + COSMIC_ULT.release)) < .05);
  const lockedUntil = still.lock.filter(l => l[1]).pop()[0]; assert.ok(lockedUntil < 7.7 + COSMIC_ULT.release + .05 && 11.7 - lockedUntil > 2.5, 'janela jogável de ~2,7 s antes do contato');
  assert.equal(still.ev.filter(e => e.type === 'hit').length, 1); assert.ok(find(still, 'impact').hit);
  const runAway = run((h, u) => { if (!u.lockPlayer && u.st.pi === 2) h.x = Math.min(h.x + 6 / 60, 815); }); assert.equal(runAway.ev.filter(e => e.type === 'hit').length, 0); assert.equal(find(runAway, 'impact').hit, false);
  const dash = run((h, u) => { h.iframes = u.st.pi === 2 && u.st.pt > 3.8; }); assert.equal(dash.ev.filter(e => e.type === 'hit').length, 0, 'i-frames no contato ignoram o dano');
  assert.ok(powerStats('vorgazhek', KITS.vorgazhek.ult).dmg < 40, 'não mata por roteiro (dano finito, com multiplicador de chefe)');
});

test('Mod 262 (refino) — congelamento curto no relógio REAL; a explosão nasce em estágios depois do toque; tremor decai', () => {
  const L = run(); const imp = find(L, 'impact'), after = L.ev.filter(e => e.rt > imp.rt), det = find(L, 'detonate'), rings = L.ev.filter(e => e.type === 'ring');
  assert.ok(det && Math.abs(det.rt - imp.rt - COSMIC_ULT.stages.form) < .15, 'detonação depois de contato → compressão → formação (' + (det.rt - imp.rt).toFixed(2) + ' s)');
  assert.ok(rings.length === 3 && rings[0].rt >= det.rt - 1e-9 && rings[1].rt > rings[0].rt + .1 && rings[2].rt > rings[1].rt + .1, 'anéis 1 → 2 → 3 só na detonação, com atrasos distintos');
  const wind = find(L, 'wind'), white = find(L, 'white'); assert.ok(wind.rt > det.rt && white.rt - det.rt > 1.1, 'vento depois do estouro; o branco não engole a formação');
  assert.ok(after.length > 2 && find(L, 'end'), 'não fica preso no quadro do impacto');
  const tr = L.trauma; const before = Math.max(...tr.filter(x => x[2] < 3).map(x => x[1])), peak = Math.max(...tr.filter(x => x[2] === 3).map(x => x[1]));
  assert.ok(before <= .3 && peak >= .8, 'microtremor antes, tremor forte no contato e na detonação'); const late = tr.find(x => x[0] > det.rt + 1.3); assert.ok(late[1] < .05, 'decai em ~1,2 s');
  // ruído suave: vizinhos próximos, nunca saltos aleatórios por quadro
  let maxJump = 0; for (let t = 0; t < 2; t += 1 / 60) maxJump = Math.max(maxJump, Math.abs(shakeAt(1, t + 1 / 60, 99).x - shakeAt(1, t, 99).x)); assert.ok(maxJump < .16, 'tremor contínuo: ' + maxJump.toFixed(3));
  assert.equal(shakeAt(0, 1.3, 99).x, 0); const k0 = shakeAt(1, 0, 0), k1 = shakeAt(1, 0, .4); assert.ok(k0.back > .5 && Math.abs(k1.back) < .02, 'tranco direcional curto');
  assert.ok(Math.abs(smoothNoise(3.5, 1)) <= 1);
});

test('Mod 262 — branco nasce no auge e some; FOV punch volta; câmera cinematográfica nas fases 1, 2, início da 3 e explosão', () => {
  const L = run(); const w = L.white.filter(x => x[1] > 0); assert.ok(w.length, 'há branco'); const full = L.white.filter(x => x[1] >= .999);
  assert.ok(full.length && full.length / 60 < .3, 'pico curto (' + (full.length / 60).toFixed(2) + ' s)'); assert.equal(L.white[L.white.length - 1][1], 0, 'termina sem tela branca');
  const u = createCosmicUlt({ ground }).start({ x: 800, z: 6 }, { x: 800, z: -7 }, ARENA), H = { x: 800, z: 6, y: 0 }, ctx = { boss: { x: 800, y: -2000, z: -7, yaw: 0 }, hero: { x: 800, y: -2000, z: 6 } }, ws = [];
  for (let i = 0; i < 60 * 16 && !u.done; i++) { u.step(1 / 60, H); const c = u.camera(ctx); ws.push([u.st.pi, u.st.pt, c.w, c.pos[1], c.look]); }
  assert.ok(ws.filter(x => x[0] === 0 && x[1] > .4).every(x => x[2] > .99), 'fase 1 em plano'); assert.ok(ws.filter(x => x[0] === 1).every(x => x[2] === 1), 'fase 2 em plano');
  assert.ok(ws.filter(x => x[0] === 2 && x[1] > 1.9).every(x => x[2] < .01), 'na esquiva a câmera é a do jogo'); const p4 = ws.filter(x => x[0] === 3); assert.ok(p4.filter(x => x[1] > .3 && x[1] < 2.4).every(x => x[2] > .99) && p4.filter(x => x[1] > 2.5).every(x => x[2] === 0), 'fase 4: plano de fora da explosão, volta à câmera do jogo sob o branco');
  const p1 = ws.filter(x => x[0] === 0 && x[1] > .4); assert.ok(p1.every(x => x[3] < -2000 + 1.2), 'fase 1: câmera baixa'); const p2 = ws.filter(x => x[0] === 1 && x[1] > 2); assert.ok(p2.every(x => x[4][1] > -2000 + 8), 'fase 2: olhando para os selos');
});

test('Mod 262 — interrupção restaura tudo, kit só com poderes autorais, integração real', () => {
  const u = createCosmicUlt({ ground }).start({ x: 800, z: 6 }, { x: 800, z: -7 }, ARENA); for (let i = 0; i < 60 * 5; i++) u.step(1 / 60, { x: 800, z: 6 }); u.abort();
  assert.ok(u.done && !u.lockPlayer && u.st.white === 0 && u.st.trauma === 0 && u.st.fovAdd === 0); assert.equal(u.step(1 / 60, { x: 800, z: 6 }).length, 0);
  const k = kitFor('vorgazhek'); assert.equal(k, kitFor('fallen2')); assert.equal(k.ult.type, 'vorgazhek_cosmic_judgment'); assert.equal(ultimateFor('fallen2').kind, 'vorgazhek_cosmic_judgment');
  assert.deepEqual(k.skills.map(s => s.type), ['tornadoes', 'reserved', 'portal_swords']); assert.ok(k.skills[1].disabled); assert.equal(k.sword.type, 'vorgazhek_eclipse_sword');
  assert.ok(ultimateDue('vorgazhek', .5, 0) === 0 && ultimateDue('vorgazhek', .2, 1) === 1 && ultimateDue('vorgazhek', .2, 2) === -1, 'dois limiares de chefe, uma vez cada');
  for (const old of ['forge', 'FORNALHA', 'Golpe da Forja', 'Lâminas de Metal']) assert.ok(!JSON.stringify(KITS.vorgazhek).includes(old));
  const seen = new Set(); for (const d of [2, 5, 10, 20]) for (const cds of [{}, { sw: 9 }, { sw: 9, s1: 9 }, { sw: 9, s3: 9 }]) { const m = pickMove('vorgazhek', cds, d, ''); if (m) seen.add(m.type); } assert.deepEqual([...seen].sort(), ['portal_swords', 'tornadoes', 'vorgazhek_eclipse_sword']);
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(src.includes("if(isVorgazhekProfile(encounterProfile)){if(kind==='vorgazhek_cosmic_judgment')startCosmicUlt();return;}") && src.includes("if(isVorgazhekProfile(encounterProfile)){if(uk==='vorgazhek_cosmic_judgment')startCosmicUlt();return;}"), 'ultimate real, sem forge/genérico (guarda da Mod 263)');
  assert.ok(src.includes("bossUlt.kind==='cosmic'?tickCosmicUlt:") && src.includes("function endBossUlt(){if(bossUlt.kind==='cosmic')stopCosmicUlt();") && src.includes('clearHazards();stopCosmicUlt();stopEclipseSword();'), 'limpa no fim, na interrupção e ao sair da dimensão');
  assert.ok(src.includes('undoCosmicShake();updatePlayerCamera(dt);'), 'tremor aditivo desfeito antes da câmera do próximo quadro');
  assert.ok(src.includes('||cineActive||cosmicLock()){axisX=0;') && src.includes('if(cosmicLock())return;'), 'trava só enquanto a cena pede');
  assert.ok(src.includes("if(tornadoRitual||portalSwords||eclipseSword)return; // MOD 262"), 'não sobrepõe as outras habilidades');
  assert.ok(src.includes("if(name==='bishop2')attachCosmicSword(model);") && !src.includes("'./EspadaBispo2.glb"), 'espada cósmica permanente; a antiga não aparece');
  const lab = fs.readFileSync(new URL('./laboratorio-inimigos.html', import.meta.url), 'utf8'); assert.ok(lab.includes('testUltBispo2=1'));
});

test('Mod 265 (refino) — presença rubra por espaço negativo, sem criaturas; chamas negras presas à espada; explosão em estágios', () => {
  const ult = fs.readFileSync(new URL('./vorgazhek-ultimate3d.js', import.meta.url), 'utf8'), sw = fs.readFileSync(new URL('./vorgazhek-cosmic-sword3d.js', import.meta.url), 'utf8');
  for (const bad of ['function creature', 'STROKE_F', 'teeth', 'EYE_F', 'mouths']) assert.ok(!ult.includes(bad), 'sem bicho/espinho/dentes modelados: ' + bad);
  assert.ok(ult.includes('const PRES_F') && /slash\(wp,/.test(ult) && ult.includes('eyeRev') && ult.includes('grinRev'), 'rasgos e fenda revelados pela própria energia');
  assert.ok(sw.includes('const FLAME_V') && sw.includes("flames.name = 'ChamasNegras'") && sw.includes('if(vWy>clipY) discard;'), 'chamas negras na mesma espada, recortadas também na gigante');
  assert.ok(ult.includes('giant.userData.flameScale.value = .6'), 'gigante com chamas proporcionais');
  const S = COSMIC_ULT.stages; assert.ok(S.contact < S.compress && S.compress < S.form && S.form < S.deton && S.deton < COSMIC_ULT.whiteAt, 'contato → compressão → formação → detonação → cauda');
  assert.ok(COSMIC_ULT.rings.every(r => r >= S.form) && COSMIC_ULT.whiteAt + COSMIC_ULT.whiteIn + COSMIC_ULT.whiteHold + COSMIC_ULT.whiteOut <= 3.2 + 1e-9, 'anéis só depois da formação; tudo dentro dos 3,2 s');
  const u = createCosmicUlt({ ground }).start({ x: 800, z: 6 }, { x: 800, z: -7 }, ARENA), seen = new Set(); let maxFlashContact = 0;
  while (!u.done) { u.step(1 / 60, { x: 800, z: 6 }); if (u.st.pi === 3) { seen.add(u.st.stage); if (u.st.pt < S.contact) maxFlashContact = Math.max(maxFlashContact, u.st.flash); } }
  assert.deepEqual([...seen].filter(Boolean), ['contact', 'compress', 'form', 'deton', 'tail']); assert.ok(maxFlashContact <= .31, 'no toque o clarão é pequeno');
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8'); assert.ok(src.includes("ev.type==='detonate'") && src.includes("ev.type==='wind'") && !/setTimeout\(\(\)=>\{worldAudio\.abyss3&&worldAudio\.abyss3\('storm',\.9\);\},260\)/.test(src), 'som de detonação e vento no relógio da ultimate, sem timer solto');
});
