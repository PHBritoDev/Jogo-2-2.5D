import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from './act5-flow.js';
import { SWORDS, SHOP_ITEMS } from './progression3d.js';
import { COLOSSEUM, colosseumColliders, inArena, COLOSSEUM_REGION } from './coliseum3d.js';
const { ACT5N, ROUNDS, roundForSub, subForRound, act5Presentation, bestSword } = A;
const all = () => ['journeyScene', 'arrivalScene', 'finalScene'].flatMap(n => A[n]()).concat([1, 2, 3, 4, 5, 6, 7, 8].flatMap(n => A.roundIntroScene(n).concat(A.roundOutroScene(n))));
const text = () => all().filter(s => s.type === 'say').map(s => s.text).join(' \n ');

test('oito rounds na ordem do roteiro; o último com as quatro elites e a aliada', () => {
  assert.equal(ROUNDS.length, 8);
  assert.deepEqual(ROUNDS.slice(0, 7).map(r => r.foes[0].rig), ['enemy1', 'enemy2', 'enemy3', 'enemy1', 'enemy2', 'enemy3', 'enemy4']);
  assert.equal(ROUNDS[7].foes.length, 4); assert.ok(ROUNDS[7].ally);
  for (let n = 1; n <= 8; n++) { assert.equal(roundForSub(subForRound(n)).n, n); assert.match(act5Presentation(subForRound(n)).title, new RegExp('ROUND ' + n)); }
  assert.ok(act5Presentation(0) && act5Presentation(1));
  for (const r of ROUNDS) for (const f of r.foes) assert.ok(f.hp >= 200);
});

test('falas essenciais do roteiro estão presentes, sem nome fixo', () => {
  const t = text();
  for (const re of [/Que lugar é este/, /próximo Bispo/, /demônios de baixo escalão/, /recompensa deste ano/, /relíquia perdida/, /Espada Celestial que caiu do céu/, /desintegrado na hora/, /usando a espada para te atrair/,
    /torcendo por você no palco/, /se sentar com eles/, /me transformar em um demônio/, /me tornar um Bispo/, /por vontade própria/, /em troca da alma/, /o quanto as suas almas valem/, /te esperando no inferno/,
    /mais do que todos/, /desesperados para me matar/, /cargo de Bispo era para ser meu/, /humano orgulhoso/, /insetos falando em me derrotar/, /ainda não quero morrer/, /aceite as consequências/,
    /Não ouse me comparar/, /destino trágico/, /Ele trapaceou/, /Apenas desapareça/, /agradeço por estar vivo/, /mesma conversa/, /Eu fui manipulado/, /Apenas pereça/, /centenas de almas/, /essa sua confiança/,
    /seu subordinado/, /pediram misericórdia/, /uma mosca ou um dragão/, /demônio inteligente/, /Me mate logo/, /único golpe/, /Quatro contra um/, /trapaça para ter vencido os nossos irmãos/, /matado o meu irmão/,
    /banquete com a sua carne/, /quatro Elites ao mesmo tempo/, /juntar os quatro/, /me juntar a essa batalha/, /O que você está fazendo aqui/, /apenas humanos/, /se segurou de propósito/, /te testando/,
    /está tudo desmoronando/, /O que faremos agora/, /salvar o seu amigo/, /estátua gigante em um deserto/, /Não podemos perder muito tempo/])
    assert.match(t, re);
  assert.doesNotMatch(t, /Paulo/);
});

test('inventário: "equipar melhor" escolhe a espada de maior dano que o jogador tem', () => {
  assert.equal(bestSword(SWORDS, new Set()), 'prota');
  assert.equal(bestSword(SWORDS, new Set(['aurora'])), 'aurora');
  assert.equal(bestSword(SWORDS, new Set(['aurora', 'vigilia', 'celeste'])), 'celeste');
  const c = SHOP_ITEMS.find(i => i.id === 'celeste');
  assert.ok(c && c.step === ACT5N.next, 'a Espada Celestial só aparece na loja depois do coliseu');
});

test('coliseu: arena livre, muro com colisão e portão aberto a oeste', () => {
  const col = colosseumColliders(), hit = p => col.some(o => Math.hypot(o.x - p.x, o.z - p.z) < o.r);
  for (const p of [COLOSSEUM.spawn, COLOSSEUM.foe, COLOSSEUM.gateInner, COLOSSEUM.gate, ...COLOSSEUM.waiting]) assert.ok(!hit(p), JSON.stringify(p));
  assert.ok(hit({ x: COLOSSEUM.center.x + 17, z: COLOSSEUM.center.z }), 'o muro do pódio a leste bloqueia');
  assert.ok(inArena(COLOSSEUM.foe.x, COLOSSEUM.foe.z) && !inArena(COLOSSEUM.gate.x, COLOSSEUM.gate.z));
  assert.ok(Math.abs(COLOSSEUM.center.x - COLOSSEUM_REGION.cx) < 1);
});
