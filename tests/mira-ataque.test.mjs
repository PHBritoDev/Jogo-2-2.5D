// Missão 19/11 — direção do golpe independente do analógico (bug: inimigo à frente + analógico levemente para trás/lado
// → o herói golpeava para trás e perdia o alvo). Cenários do briefing: 1 alvo, vários alvos, alvo atrás, sem linha de
// visão, fora do alcance, inimigo cruzando o centro e alvo em movimento.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chooseAttackTarget, attackStrafe, ATTACK_AIM, ATTACK_STRAFE } from '../prota-combat3d.js';

const from = { x: 0, y: 1, z: 0 };
const foe = (id, x, z, extra = {}) => ({ id, x, y: 1.15, z, alive: true, radius: .55, height: 2.3, ...extra });
const stickTo = (yaw, mag) => ({ x: Math.sin(yaw) * mag, z: Math.cos(yaw) * mag, mag });
const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

test('1 alvo à frente: analógico leve OU firme para trás/lado nunca troca o alvo nem vira o golpe', () => {
  const boss = foe('b', 0, 2.4);
  for (const s of [null, stickTo(Math.PI, .45), stickTo(Math.PI * .75, .5), stickTo(Math.PI / 2, .9), stickTo(Math.PI, 1)]) {
    const r = chooseAttackTarget(from, { heroYaw: 0, camYaw: 0, stick: s, cands: [boss] });
    assert.equal(r.target, boss, 'analógico ' + JSON.stringify(s));
  }
  const noise = chooseAttackTarget(from, { heroYaw: 0, stick: { x: .1, z: -.2, mag: .22 }, cands: [boss] });
  assert.equal(noise.input, false, 'ruído abaixo da zona morta não conta como entrada');
});

test('vários alvos: troca só com analógico FIRME apontando outro; o alvo atual tem histerese', () => {
  const a = foe('a', 0, 2.5), b = foe('b', 3, 2.5);
  assert.equal(chooseAttackTarget(from, { heroYaw: 0, cands: [a, b], currentId: 'a' }).target, a);
  assert.equal(chooseAttackTarget(from, { heroYaw: 0, cands: [a, b], currentId: 'a', stick: stickTo(Math.atan2(3, 2.5), .5) }).target, a, 'toque leve não troca');
  const r = chooseAttackTarget(from, { heroYaw: 0, cands: [a, b], currentId: 'a', stick: stickTo(Math.atan2(3, 2.5), .9) });
  assert.equal(r.target, b); assert.equal(r.why, 'flick');
  assert.equal(chooseAttackTarget(from, { heroYaw: 0, cands: [a, foe('c', .4, 2.2)], currentId: 'a' }).target, a, 'alvo um pouco mais perto não rouba o atual');
  assert.equal(chooseAttackTarget(from, { heroYaw: 0, cands: [a, b], lockedId: 'b', stick: stickTo(0, 1) }).target, b, 'mira travada sempre vence');
});

test('alvo atrás, sem linha de visão e fora do alcance', () => {
  const back = foe('t', 0, -2.2);
  assert.equal(chooseAttackTarget(from, { heroYaw: 0, cands: [back] }).target, back, 'inimigo colado às costas ainda é o alvo (o herói gira até ele)');
  assert.equal(chooseAttackTarget(from, { heroYaw: 0, cands: [foe('w', 0, 3)], blocked: () => true }).target, null, 'parede no meio: golpe livre');
  const far = chooseAttackTarget(from, { heroYaw: 0, cands: [foe('f', 0, 12)], stick: stickTo(0, .8) });
  assert.equal(far.target, null); assert.equal(far.why, 'free');
  const mid = chooseAttackTarget(from, { heroYaw: 0, cands: [foe('m', 6, 0)], stick: stickTo(Math.PI, .9) });
  assert.equal(mid.target, null, 'fora do raio de assistência, analógico firme para o lado oposto = golpe livre (escolha deliberada)');
  assert.ok(chooseAttackTarget(from, { heroYaw: 0, cands: [foe('h', 0, 2.5, { y: 6 })] }).target === null, 'outro piso');
});

test('inimigo cruzando o centro e alvo em movimento: o mesmo alvo permanece em todos os quadros', () => {
  for (let k = 0; k <= 20; k++) { const x = -2 + k * .2, t = foe('b', x, .9 - Math.abs(x) * .1);
    assert.equal(chooseAttackTarget(from, { heroYaw: 0, stick: stickTo(Math.PI, .5), cands: [t, foe('o', 5, 5)], currentId: 'b' }).target.id, 'b'); }
  for (let k = 0; k < 30; k++) { const t = foe('b', Math.sin(k * .3) * 2.5, Math.cos(k * .3) * 2.5);
    assert.equal(chooseAttackTarget(from, { heroYaw: k * .3, cands: [t], currentId: 'b', stick: stickTo(k, .6) }).target.id, 'b'); }
});

test('translação durante o golpe: lateral orbita, recuo firme recua sem avanço automático, para o alvo mantém o golpe', () => {
  const to = { x: 0, z: 2.4 };
  const side = attackStrafe(stickTo(Math.PI / 2, 1), to, 'windup');
  assert.ok(Math.abs(side.vx) > 2 && Math.abs(side.vz) < .01 && side.warpK === 1, 'lateral pura');
  const back = attackStrafe(stickTo(Math.PI, 1), to, 'windup');
  assert.ok(back.vz < -2 && back.warpK === 0, 'recuo firme');
  const light = attackStrafe(stickTo(Math.PI, .45), to, 'windup');
  assert.ok(light.warpK === 1 && Math.abs(light.vz) < 1, 'toque leve: o golpe ainda chega');
  assert.deepEqual(attackStrafe(stickTo(0, 1), to), { vx: 0, vz: 0, warpK: 1 });
  assert.ok(Math.abs(attackStrafe(stickTo(Math.PI / 2, 1), to, 'active').vx) < ATTACK_STRAFE.lateral * .5, 'na janela ativa o passo diminui');
  assert.ok(ATTACK_AIM.dead >= .3 && ATTACK_AIM.flick > ATTACK_AIM.dead);
});

test('integração: o jogo usa a escolha nova, o passo do analógico no golpe e solta a mira travada sem linha de visão', () => {
  assert.ok(/const sf=attackStrafe\(protaStick\(\),\{x:target\.x-player\.position\.x,z:target\.z-player\.position\.z\}/.test(m));
  assert.ok(/lockLosT>\.8/.test(m) && /cameraYaw\+=Math\.max\(-4\*dt,Math\.min\(4\*dt,/.test(m));
});
