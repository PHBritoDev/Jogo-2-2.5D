/**
 * Mod 320 — invariantes da Extinção Orbital (briefing §8.6): dano SÓ por contato (corpo do meteoro com teste contínuo;
 * explosão por domo que cresce), no máximo 1 acerto de cada por alvo, morte pendente do chefe e vitória condicional,
 * determinismo com FPS baixo/salto de quadro/PULAR, e as regras de controle (só a ultimate do herói bloqueada).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Enemy1Squad } from '../enemy1-squad3d.js';
import { VZ, ORBITAL, orbitalSpell, orbitalPath, orbitalMeteorAt, segSegDist, orbitalBlastR } from '../vhazrael3d.js';

const hero = (o = {}) => ({ id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, iframes: false, air: 0, ...o });
function world({ hp = Infinity } = {}) {
  const log = [], dmg = [], heroes = {};
  const sq = new Enemy1Squad({ seed: 5, blocked: () => false, event: (type, d) => log.push({ type, ...d }),
    damageTarget: (id, n, info) => { const h = heroes[id]; if (h && h.blockNext) { dmg.push({ id, n: Math.round(n * .3), ...info, blocked: true }); return 'blocked'; } dmg.push({ id, n, ...info }); if (h) { h.hp -= n; if (h.hp <= 0) h.alive = false; } return 'hit'; } });
  return { sq, log, dmg, heroes, add(h) { h.hp = h.hp ?? hp; heroes[h.id] = h; return h; } };
}
function start(W, h, { bossZ = 12 } = {}) {
  W.sq.setTargets([h]); const a = W.sq.spawn([{ x: 0, z: bossZ, yaw: Math.PI, kind: 'vhazrael' }])[0];
  a.alert = a.decideT = 1e9; a.used = new Set(['throne', 'thorns', 'bombard']); a.act = null; a.cds.orbital = 0; W.sq.startCast(a, h, 'orbital'); return a;
}
const run = (sq, secs, dt = 1 / 60, each) => { for (let t = 0; t < secs - 1e-9; t += dt) { sq.update(dt); if (each) each(t); } };
/** roda até a fase pedida (com a trajetória já travada) */
function until(sq, phase, dt = 1 / 60) { for (let i = 0; i < 60 / dt; i++) { const s = orbitalSpell(sq); if (s && s.phase === phase) return s; sq.update(dt); } throw new Error('fase ' + phase + ' não chegou'); }
const T = VZ.boss.orbital;

test('constantes e trajetória: alvo travado, raio físico e explosão finitos; caminho idêntico para lógica e desenho', () => {
  assert.equal(T, ORBITAL); assert.ok(T.meteorR > 2 && T.meteorR < 12 && T.blastR > T.meteorR && T.blastH < T.blastR);
  const W = world(), h = W.add(hero()); start(W, h); const s = until(W.sq, 'entry');
  assert.ok(s.path && Math.abs(s.path.ix - h.x) < 1e-9 && Math.abs(s.path.iz - h.z) < 1e-9, 'epicentro = posição do herói no travamento');
  const P = { ...s.path }; h.x = 30; until(W.sq, 'fall'); run(W.sq, 1); assert.deepEqual({ ...s.path }, P, 'epicentro ESTÁVEL: não persegue o herói');
  const vfx = fs.readFileSync(new URL('../vhazrael-extinction3d.js', import.meta.url), 'utf8');
  assert.ok(vfx.includes("from './vhazrael-orbital-path.js'") && vfx.includes('orbitalMeteorAt(s,') && vfx.includes('orbitalBlastR(T0, it)'), 'o desenho usa a MESMA trajetória e o MESMO raio de explosão');
});

test('meteoro passa longe → zero dano', () => {
  const W = world(), h = W.add(hero()); start(W, h); until(W.sq, 'fall'); h.x = 60; h.z = -40; run(W.sq, T.fall + T.impact + 1);
  assert.equal(W.dmg.length, 0);
});

/** posiciona o herói sob a trajetória (fora da explosão) com altura tal que a folga ao corpo seja `gap` */
function underPath(s, h, gap) {
  const P = s.path, back = T.blastR + 9, hl = Math.hypot(P.dx, P.dz), d0 = back / hl; // ponto da trajetória cuja projeção horizontal fica a `back` m do epicentro
  const C = orbitalMeteorAt(s, d0, {}); h.x = C.x; h.z = C.z;
  // folga mínima = distância do eixo da trajetória à cápsula − r; resolve a altura numericamente
  const A = orbitalMeteorAt(s, T.approach, {}), B = orbitalMeteorAt(s, 0, {}); let lo = 0, hi = C.y; // monótono entre o chão e o eixo
  const clearance = air => segSegDist(A, B, { x: h.x, y: air + h.radius, z: h.z }, { x: h.x, y: air + h.height - h.radius, z: h.z }) - h.radius - T.meteorR;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (clearance(m) < gap) hi = m; else lo = m; } // clearance cresce quando a cápsula desce (ela fica abaixo do caminho)
  h.air = (lo + hi) / 2; return clearance(h.air);
}

test('meteoro RASPA a cápsula (folga −2 cm) → dano de contato; passa a +30 cm → zero; explosão não alcança', () => {
  for (const [gap, want] of [[-.02, 1], [.3, 0]]) {
    const W = world(), h = W.add(hero()); start(W, h); const s = until(W.sq, 'fall'); const c = underPath(s, h, gap);
    assert.ok(Math.abs(c - gap) < .01, 'folga calibrada ' + c);
    run(W.sq, T.fall + T.impact + .5, 1 / 60, () => { h.air = h.air; });
    assert.equal(W.dmg.filter(d => d.kind === 'orbitalMeteor').length, want, 'folga ' + gap);
    assert.equal(W.dmg.filter(d => d.kind === 'orbitalBlast').length, 0, 'longe do epicentro: sem explosão');
  }
});

test('contato contínuo (swept): com quadros enormes (5 FPS) o meteoro rápido não atravessa o herói', () => {
  const W = world(), h = W.add(hero()); start(W, h); const s = until(W.sq, 'fall', 1 / 5); underPath(s, h, -.05);
  run(W.sq, T.fall + .6, 1 / 5); assert.equal(W.dmg.filter(d => d.kind === 'orbitalMeteor').length, 1);
});

test('explosão TANGENCIA (borda a −5 cm) → 1 acerto; a +20 cm → zero; nunca mais de 1', () => {
  for (const [gap, want] of [[-.05, 1], [.2, 0]]) {
    const W = world(), h = W.add(hero()); start(W, h); const s = until(W.sq, 'fall');
    // lateral à trajetória (fora do corpo do meteoro), na borda do domo no chão
    const P = s.path, l = Math.hypot(P.dx, P.dz), sx = -P.dz / l, sz = P.dx / l, r = T.blastR + h.radius + gap; h.x = P.ix + sx * r; h.z = P.iz + sz * r;
    run(W.sq, T.fall + T.impact + 1);
    assert.equal(W.dmg.filter(d => d.kind === 'orbitalBlast').length, want, 'gap ' + gap); assert.equal(W.dmg.filter(d => d.kind === 'orbitalMeteor').length, 0);
  }
});

test('escapar: correr para fora, saltar acima do domo na borda, ou dash atravessando só a frente sem ficar dentro', () => {
  { const W = world(), h = W.add(hero()); start(W, h); until(W.sq, 'fall'); run(W.sq, 2.5); h.x = T.blastR + 4; run(W.sq, T.fall + T.impact); assert.equal(W.dmg.length, 0, 'correu'); }
  { const W = world(), h = W.add(hero()); start(W, h); const s = until(W.sq, 'fall'); const P = s.path, l = Math.hypot(P.dx, P.dz), r = T.blastR - .8; h.x = P.ix - P.dz / l * r; h.z = P.iz + P.dx / l * r;
    const domeTop = T.blastH * Math.sqrt(1 - ((r - h.radius) / T.blastR) ** 2); until(W.sq, 'impact'); h.air = domeTop + .3; run(W.sq, T.blastGrow + .2); h.air = 0; run(W.sq, 2);
    assert.equal(W.dmg.length, 0, 'saltou acima do domo na borda'); }
  { const W = world(), h = W.add(hero()); start(W, h); until(W.sq, 'fall'); h.x = T.blastR + 3; until(W.sq, 'impact'); h.iframes = true; run(W.sq, .3); h.iframes = false; run(W.sq, 2);
    assert.equal(W.dmg.length, 0, 'fora do alcance, i-frames irrelevantes'); }
  { const W = world(), h = W.add(hero()); start(W, h); until(W.sq, 'fall'); h.x = 8; until(W.sq, 'impact'); h.iframes = true; run(W.sq, .2); h.iframes = false; run(W.sq, 2);
    assert.equal(W.dmg.filter(d => d.kind === 'orbitalBlast').length, 1, 'dash não é imunidade universal: dentro da zona ativa depois dos i-frames, leva'); }
});

test('defender: o golpe chega como acerto bloqueado (redução do escudo), uma vez cada', () => {
  const W = world(), h = W.add(hero({ blockNext: true })); start(W, h); run(W.sq, 25);
  assert.deepEqual(W.dmg.map(d => [d.kind, !!d.blocked]), [['orbitalMeteor', true], ['orbitalBlast', true]]);
  assert.ok(W.dmg.every(d => d.n < (d.kind === 'orbitalMeteor' ? T.meteorDmg : T.blastDmg)));
});

test('chefe chega a 0 durante a queda e o herói SOBREVIVE → morte pendente → vitória UMA vez, só depois do resultado', () => {
  const W = world({ hp: 1e6 }), h = W.add(hero()); const a = start(W, h); until(W.sq, 'fall'); h.x = 40;
  assert.ok(W.sq.damageActor(a, 1e6, { kind: 'melee' }) > 0); assert.ok(a.pendingDeath && a.alive && a.hp === 0, 'presente, barra em 0');
  assert.equal(W.sq.damageActor(a, 50, { kind: 'melee' }), 0, 'não recebe mais dano/cura');
  let deathAt = -1, resultAt = -1; const before = W.log.length;
  run(W.sq, T.fall + T.impact + T.after + 1, 1 / 60, () => { W.log.forEach((e, i) => { if (e.type === 'death' && deathAt < 0) deathAt = i; if (e.type === 'orbitalResult' && resultAt < 0) resultAt = i; }); });
  assert.equal(W.log.filter(e => e.type === 'death').length, 1, 'vitória única'); assert.ok(resultAt >= 0 && deathAt > resultAt, 'morte só DEPOIS do resultado');
  assert.ok(!a.alive && !a.pendingDeath); assert.ok(!W.log.slice(before).some(e => e.type === 'cast' || e.type === 'windup'), 'nenhum ataque novo durante a pendência');
});

test('chefe chega a 0 durante a queda e o herói MORRE no impacto → derrota, sem morte do chefe nem recompensa', () => {
  const W = world({ hp: 100 }), h = W.add(hero()); const a = start(W, h); until(W.sq, 'fall');
  W.sq.damageActor(a, 1e6, { kind: 'melee' }); assert.ok(a.pendingDeath);
  run(W.sq, T.fall + T.impact + T.after + 1);
  assert.ok(!h.alive, 'herói caiu'); assert.equal(W.log.filter(e => e.type === 'death').length, 0, 'sem vitória'); assert.equal(W.log.filter(e => e.type === 'deathPendingDefeat').length, 1);
  assert.ok(a.alive && !a.pendingDeath && a.hp >= 1, 'estado pendente limpo para o recomeço');
});

test('chefe NÃO chega a 0 → luta continua; chefe zerado DEPOIS da resolução → morte normal', () => {
  { const W = world({ hp: 1e6 }), h = W.add(hero()); const a = start(W, h); run(W.sq, 25); assert.ok(a.alive && !a.pendingDeath); assert.equal(W.log.filter(e => e.type === 'death').length, 0); }
  { const W = world({ hp: 1e6 }), h = W.add(hero()); const a = start(W, h); until(W.sq, 'after'); run(W.sq, .1); W.sq.damageActor(a, 1e6, { kind: 'melee' });
    assert.ok(!a.alive && !a.pendingDeath); assert.equal(W.log.filter(e => e.type === 'death').length, 1); }
});

test('mesmo quadro: chefe zerado no tick do impacto, FPS baixo e PULAR — sem dano nem vitória duplicados', () => {
  for (const dt of [1 / 120, 1 / 30, 1 / 8]) {
    const W = world({ hp: 1e6 }), h = W.add(hero()); const a = start(W, h); run(W.sq, .4, dt); const s = orbitalSpell(W.sq); s.phase = 'fall'; s.t = 0; // PULAR
    for (let i = 0; i < 400 && orbitalSpell(W.sq)?.phase !== 'impact'; i++) W.sq.update(dt); W.sq.damageActor(a, 1e6, { kind: 'melee' }); // zera no mesmo tick do impacto
    run(W.sq, 6, dt);
    assert.equal(W.dmg.filter(d => d.kind === 'orbitalMeteor').length, 1, 'dt ' + dt); assert.equal(W.dmg.filter(d => d.kind === 'orbitalBlast').length, 1, 'dt ' + dt);
    assert.equal(W.log.filter(e => e.type === 'death').length, 1, 'vitória única dt ' + dt); assert.equal(W.log.filter(e => e.type === 'orbitalResult').length, 1);
  }
});

test('o meteoro NÃO é cancelado por !owner.alive; limpeza do ator remove sem dano', () => {
  { const W = world({ hp: 1e6 }), h = W.add(hero()); const a = start(W, h); until(W.sq, 'fall'); a.alive = false; run(W.sq, T.fall + T.impact + .5); assert.equal(W.dmg.length, 2, 'o meteoro chamado cai mesmo assim'); }
  { const W = world({ hp: 1e6 }), h = W.add(hero()); const a = start(W, h); until(W.sq, 'fall'); W.sq.actors.splice(W.sq.actors.indexOf(a), 1); run(W.sq, 6); assert.equal(W.dmg.length, 0); assert.ok(!orbitalSpell(W.sq)); }
});

test('mundo: na queda só a ultimate do herói fica bloqueada (sem gastar nada); tomadas travadas com PULAR; HP 0 pendente zera no reinício', () => {
  const src = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(src.includes("if(kind==='ultimate'&&vzUltBlocked()){vzUltDenied();return;}"), 'ultimate recusada ANTES de gastar mana/recarga');
  const i = src.indexOf("if(kind==='ultimate'&&vzUltBlocked())"), j = src.indexOf('playerMana-=SKILLS[kind].mana', i); assert.ok(i > 0 && j > i, 'bloqueio vem antes do custo');
  assert.ok(src.includes("function vzUltBlocked(){const o=vzOrbitState();return !!o&&o.phase!=='after';}"));
  assert.ok(src.includes("lock=!!o&&/^(awaken|orbit|entry)$/.test(o.phase)"), 'travado só nas tomadas');
  assert.ok(!src.includes("body.vz-choice #actions>button"), 'nenhuma ação escondida na queda');
  assert.ok(src.includes('a.pendingDeath=false;'), 'derrota limpa a morte pendente');
  assert.ok(!/info\.kind==='orbital'\)\{playerInvulnerableUntil=0/.test(src), 'i-frames/dash do herói valem contra o meteoro');
});
