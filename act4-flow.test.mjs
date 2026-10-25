import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from './act4-flow.js';
import { TOWER, TOWER_HALL, towerWalkable, floorTint } from './tower3d.js';
const { ACT4N, FLOORS, act4Presentation, floorFoes, nextFloor, scrollMultiplier, afterVeraxion } = A;
const SCENES = ['banditScene4', 'rivalReturnScene', 'towerViewScene', 'restScene', 'leaderDefeatScene', 'veraxionIntroScene', 'veraxionDefeatScene', 'towerFallScene', 'rivalRevealScene'];
const all = () => SCENES.flatMap(n => A[n]()).concat([1, 2, 3, 4, 5, 6, 7].flatMap(n => A.floorIntroScene(n).concat(A.floorClearScene(n))));
const text = () => all().filter(s => s.type === 'say').map(s => s.text).join(' \n ');

test('cada passo e piso do Ato IV tem objetivo', () => {
  for (let s = ACT4N.road; s <= ACT4N.after; s++) assert.ok(act4Presentation(s), 'passo ' + s);
  for (let f = 1; f <= 7; f++) assert.match(act4Presentation(ACT4N.tower, f).title, new RegExp(f + 'º PISO'));
  assert.ok(A.isAct4Step(21) && A.isAct4Step(24) && !A.isAct4Step(20) && !A.isAct4Step(25));
});

test('os números do roteiro: 1, 2, 3 e 4 guardiões; descanso no 5º; mini-chefe no 6º; líder + 2 no 7º', () => {
  assert.deepEqual([1, 2, 3, 4].map(n => floorFoes(n).length), [1, 2, 3, 4]);
  assert.equal(floorFoes(5).length, 0); assert.ok(FLOORS[5].rest);
  assert.deepEqual(floorFoes(6).map(f => f.kind), ['miniboss']);
  assert.deepEqual(floorFoes(7).map(f => f.kind), ['enemy4', 'enemy4', 'leader']);
  assert.equal(nextFloor(3), 4); assert.equal(nextFloor(7), 7);
  assert.ok(TOWER_HALL.foes.length >= 4);
});

test('falas essenciais do roteiro estão presentes, sem nome fixo', () => {
  const t = text();
  for (const re of [/Fiquei sabendo das suas conquistas/, /Você de novo/, /Você quer saber onde o Quarto Bispo está/, /Me siga/, /aquela torre gigante/, /precisa subir a torre/, /quanto mais você sobe/, /Leve isto aqui/,
    /prometo que vou derrotá-lo/, /Estarei torcendo por você/, /Você será o meu oponente/, /brincando comigo/, /o Anjo está em perigo/, /Daqui você não vai passar/, /Tenha piedadeee/, /O que é isso/,
    /até onde a sua determinação/, /cada vez mais difícil/, /meros vermes/, /vários dias sem dormir/, /sala de descanso/, /Agora que eu descansei/, /comer a sua carne e beber o seu sangue/, /Salve-nos/,
    /agem como se fossem humanos/, /nem o meu subordinado mais forte/, /o nosso fim/, /na verdade, eram humanos/, /milhões e milhões de almas/, /não vejo muitos humanos/, /entre no portal e venha me enfrentar/,
    /finalmente, vamos acabar com isso/, /pode vencer um deus/, /derrotado por um humano/, /não sou completamente humano/, /planeta Terra/, /meteoro/, /minha mãe foi assassinada/, /pagaram para sair da cadeia/,
    /justiça comprada pelo dinheiro/, /quero a sua alma/, /Abra mão da sua humanidade/, /primeiro Bispo a ser criado/, /não mereço viver/, /três transformações/, /Venha derrotar a Ganância comigo/, /Adeus/,
    /lutando contra humanos/, /destruí-la por completo/, /saiu vitorioso de novo/, /quinto Bispo/, /Essa era eu/, /ainda não é a hora/, /continente inteiro/, /Fugir\?/, /lugar perfeito para te deixar preparado/])
    assert.match(t, re);
  assert.doesNotMatch(t, /Paulo/);
});

test('pergaminho (+20%) e recompensa única de VÉRAXION', () => {
  assert.equal(scrollMultiplier(false), 1); assert.equal(scrollMultiplier(true), 1.2);
  assert.equal(afterVeraxion({}).coinsGained, ACT4N.reward); assert.equal(afterVeraxion({ claimed: true }).xpGained, 0);
  assert.equal(afterVeraxion({ bishopsDefeated: 2 }).bishopsDefeated, 4);
});

test('torre: salão com chão onde importa e cores por piso', () => {
  for (const p of [TOWER_HALL.spawn, TOWER_HALL.center, TOWER_HALL.boss, TOWER_HALL.restSpot, ...TOWER_HALL.foes]) assert.ok(towerWalkable(p.x, p.z));
  assert.ok(!towerWalkable(20, 0));
  assert.notDeepEqual(floorTint(1), floorTint(7));
  assert.ok(Math.hypot(TOWER.door.x - TOWER.base.x, TOWER.door.z - TOWER.base.z) > TOWER.radius - .5, 'a porta fica fora do bloqueio da torre');
});
