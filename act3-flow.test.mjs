import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from './act3-flow.js';
import { SNOW_CITY, inSnowCity, INN, innWalkable, ICE_CAVE, iceCaveWalkable, DISTORTED, distortedWalkable, invertAxes, climate, COAT, COLD } from './snow3d.js';
const { ACT3N, act3Presentation, buyCoat, afterZarkhael } = A;
const SCENES = ['coatOfferScene', 'coatAcceptScene', 'coatRefuseScene', 'coatNoMoneyScene', 'snowArrivalScene', 'fisherScene', 'villagerScene', 'innScene', 'bedScene', 'cellarScene', 'cellarDefeatScene', 'raidScene',
  'guillotineScene', 'caveArrivalScene', 'caveEndScene', 'distortedScene', 'distortedDefeatScene', 'zarkhaelIntroScene', 'zarkhaelDefeatScene', 'angelQuestionScene', 'angelTruthScene'];
const all = () => SCENES.flatMap(n => A[n]());
const text = () => all().filter(s => s.type === 'say').map(s => s.text).join(' \n ') + ' \n ' + A.COLD_LINE;

test('cada passo e sub-etapa do Ato III tem objetivo', () => {
  for (let s = ACT3N.road; s <= ACT3N.boss; s++) assert.ok(act3Presentation(s), 'passo ' + s);
  for (let k = 0; k <= 4; k++) assert.ok(act3Presentation(ACT3N.city, k).objective.length > 8);
  for (let k = 0; k <= 3; k++) assert.ok(act3Presentation(ACT3N.trap, k).objective.length > 5);
  for (let k = 0; k <= 3; k++) assert.ok(act3Presentation(ACT3N.cave, k).objective.length > 5);
  assert.match(act3Presentation(ACT3N.boss).title, /ZAR'KHAEL/);
  assert.equal(act3Presentation(20), null);
  assert.ok(A.isAct3Step(15) && A.isAct3Step(19) && !A.isAct3Step(14) && !A.isAct3Step(21));
});

test('falas essenciais do roteiro estão presentes, sem nome fixo', () => {
  const t = text();
  for (const re of [/sem nenhum casaco/, /morreu de frio mesmo estando bem vestida/, /Fez a escolha certa/, /área de equipamentos/, /pode custar a sua vida/, /muito frio/, /voltar para comprar o casaco/,
    /homem com asas/, /esse frio está te fazendo delirar/, /Você é novo por aqui/, /Pelas suas vestes/, /o mundo não está em caos/, /a nossa cidade não foi afetada/, /Logo vai anoitecer/, /coisas muito esquisitas acontecem/,
    /escondendo alguma coisa/, /hospedagem está de graça/, /cheirando mal/, /preciso descansar/, /Eu não estava na cama/, /soltar a minha filha/, /Quem você pensa que é para me dar ordens/, /bom demais para ser verdade/,
    /Valério e VORGAZHEK/, /Cadê o Anjo-Guia/, /neste porão/, /previu a sua chegada/, /Experimentos\?/, /transformar novas pessoas num novo Bispo/, /exterminar todos vocês/, /Não faça issoooo/,
    /O que vocês estão fazendo com esta cidade/, /não é digno de saber/, /O que aconteceu/, /Morra\./, /Nãooooo/, /Pensei que tinha morrido/, /Esqueceu quem eu sou/, /Me siga/,
    /Chegamos/, /fingi a minha própria morte/, /segui VÉRAXION/, /muito arriscado/, /Bispo mais difícil de encontrar/, /não tem nada nesta caverna/, /Olhe para trás/, /nós não viemos por aí/, /dimensão distorcida/,
    /Adeus/, /percepção parece distorcida/, /comer os seus ossos/, /fantoches por ZAR'KHAEL/, /Se ama a sua vida, então fuja/, /salvar este planeta/, /Você falou demais/, /próprios aliados/, /demônios de baixo nível/,
    /perdendo só para dois/, /mosca no meu caminho/, /Quem é você/, /últimas palavras/, /aberração divina/, /desafiar a Ganância/, /Sou \{nome\}, um dos anjos de Deus/, /sete mundos/, /não seja completamente um anjo/,
    /Como assim\?/, /não temos tempo a perder/, /mais baixos da hierarquia/, /demônio imundo/, /Não minta para mim/, /cinco por cento/, /já foi humano/, /nascemos em espírito/, /simples humano derrotar os Bispos/,
    /O que a Ganância está fazendo aqui/, /Corra/, /Anjoooooooo/, /Se quiser ele de volta, venha até mim/])
    assert.match(t, re);
  assert.doesNotMatch(t, /Paulo/);
});

test('os números de inimigos do roteiro (3 no porão, 4 na cidade, guardião + 2) estão nos dados', () => {
  assert.equal(INN.cellarFoes.length, ACT3N.cellarFoes);
  assert.equal(SNOW_CITY.raid.length, ACT3N.raidFoes);
  assert.equal(DISTORTED.foes.length, ACT3N.dimFoes);
});

test('o casaco: compra só com moedas e uma vez; efeitos e frio', () => {
  assert.deepEqual(buyCoat(10, false, COAT.price), { ok: false, coins: 10, owned: false, reason: 'coins' });
  assert.deepEqual(buyCoat(40, false, COAT.price), { ok: true, coins: 40 - COAT.price, owned: true });
  assert.equal(buyCoat(40, true, COAT.price).ok, false);
  assert.deepEqual(climate(true, false), { cold: true, speed: COLD.speed, mana: COLD.mana, dps: COLD.dps });
  assert.equal(climate(true, true).cold, false);
  assert.equal(climate(true, true).mana, COAT.mana);
  assert.equal(climate(false, false).cold, false, 'o frio só vale dentro da cidade');
  assert.ok(inSnowCity(SNOW_CITY.plaza.x, SNOW_CITY.plaza.z));
  assert.ok(!inSnowCity(SNOW_CITY.seller.x, SNOW_CITY.seller.z), 'o vendedor fica na estrada, fora do frio');
});

test('recompensa de ZAR\'KHAEL só uma vez', () => {
  assert.equal(afterZarkhael({}).coinsGained, ACT3N.reward);
  assert.equal(afterZarkhael({ claimed: true }).coinsGained, 0);
  assert.equal(afterZarkhael({ bishopsDefeated: 1 }).bishopsDefeated, 3);
});

test('áreas internas: estalagem, caverna e dimensão distorcida têm chão onde importa', () => {
  for (const p of [INN.spawn.hall, INN.spawn.room, INN.spawn.cellar, INN.keeperCellar, ...INN.cellarFoes]) assert.ok(innWalkable(p.x, p.z), JSON.stringify(p));
  assert.ok(!innWalkable(INN.counter.x, INN.counter.z), 'o balcão bloqueia');
  assert.ok(!innWalkable(INN.bed.x, INN.bed.z), 'a cama bloqueia');
  assert.ok(!innWalkable(0, -10), 'entre os cômodos não há chão');
  for (const p of [ICE_CAVE.spawn, ICE_CAVE.portal, ICE_CAVE.end, ...ICE_CAVE.path]) assert.ok(iceCaveWalkable(p.x, p.z), JSON.stringify(p));
  assert.ok(!iceCaveWalkable(20, 0));
  for (const p of [DISTORTED.spawn, DISTORTED.miniboss, DISTORTED.portal, ...DISTORTED.foes]) assert.ok(distortedWalkable(p.x, p.z));
  assert.deepEqual(invertAxes(1, -1, true), { x: -1, z: 1 });
  assert.deepEqual(invertAxes(1, -1, false), { x: 1, z: -1 });
});
