import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerrain } from './world3d-terrain.js';
import * as A from './act2-flow.js';
const { ACT2, DISTRICT, DISTRICT_PASS, PASS_RADIUS, DISTRICT_SPOTS, act2Presentation, afterVorgazhek, bossPhase } = A;
const SCENES = ['cityArrivalScene', 'banditScene', 'rivalScene', 'rivalDefeatScene', 'gateScene', 'gateDefeatScene', 'labScene', 'keyScene', 'goldScene', 'hallScene', 'hallDefeatScene', 'throneScene', 'minibossDefeatScene', 'vorgazhekIntroScene', 'vorgazhekDefeatScene', 'afterVorgazhekScene'];
const all = () => SCENES.flatMap(n => A[n]());
const text = () => all().filter(s => s.type === 'say').map(s => s.text).join(' \n ');

test('cada passo e sub-etapa do Ato II tem objetivo', () => {
  for (let s = ACT2.start; s <= ACT2.done; s++) assert.ok(act2Presentation(s), 'passo ' + s);
  for (let k = 0; k <= 4; k++) assert.ok(act2Presentation(ACT2.volcano, k).objective.length > 8);
  assert.match(act2Presentation(ACT2.boss).title, /VORGAZHEK/);
  assert.match(act2Presentation(ACT2.done).objective, /cidade de neve/);
});

test('falas essenciais do roteiro estão presentes, sem nome fixo', () => {
  const t = text();
  for (const re of [/Uma cidade em um vulcão/, /erupção a qualquer momento/, /tirar esse povo daqui/, /sendo seguido/, /regras desta cidade/, /lutando entre si/, /levou todo o dinheiro/, /saco de moedas e sumam/,
    /Eu sei onde ele está/, /se eu ganhar, quero a sua espada/i, /vulcão falso/, /dois demônios de guarda/, /me dizer o seu nome/, /Não se esqueça: sou \{nome\}/, /pode ser uma armadilha/, /Mesmo que seja, eu preciso ir/,
    /brincar um pouco com você/, /enviado de Deus/, /mero humano/, /VHAZRAEL foi derrotado/, /piedade dessas pobres almas/, /Purificação\./, /cadê os corpos/, /predestinadas a morrer/, /Matem ele/,
    /chave deve abrir/, /ouro estava escondido/, /devolver esse ouro/, /Peguem ele/, /Arcanjo de alto nível/, /recém-nomeado/, /honrado de morrer/, /obstáculo/, /Sinta o desespero/,
    /Cada dimensão foi criada pelos próprios Bispos/, /rebaixado de classe/, /Te aguardo no inferno/, /Não terei piedade/, /entrou em erupção/, /com os seus próprios olhos/, /terá que me derrotar/,
    /segunda fase/, /ZAR'KHAEL/, /trágico destino/, /fugir a tempo/, /o que é aquilo no céu/, /VÉRAXION/, /Fogo do abismo/, /Fujaaaa/, /Saia daquiii/, /Cadê o Anjo/, /cidade de neve/])
    assert.match(t, re);
  assert.doesNotMatch(JSON.stringify(all()), /Paulo/);
});

test('ordem do roteiro nas cenas', () => {
  const ids = s => s.flatMap(x => [x.id, ...(x.with || []).map(w => w.id)]).filter(Boolean);
  const l = ids(A.labScene()); assert.ok(l.indexOf('circulo-magico') < l.indexOf('purificar') && l.indexOf('purificar') < l.indexOf('surgir-tres'));
  const v = ids(A.afterVorgazhekScene());
  for (const [a, b] of [['ato-3', 'sombra-no-ceu'], ['sombra-no-ceu', 'feitico'], ['feitico', 'buraco-negro'], ['buraco-negro', 'explosao'], ['explosao', 'acordar'], ['abismo', 'bilhete']]) assert.ok(v.indexOf(a) < v.indexOf(b), a + ' < ' + b);
  const i = ids(A.vorgazhekIntroScene()); assert.ok(i.indexOf('visao-inicio') < i.indexOf('visao-fim'));
});

test('contagens de inimigos do roteiro', () => {
  assert.equal(ACT2.gateEnemies, 2); assert.equal(ACT2.labEnemies, 3); assert.equal(ACT2.deepEnemies, 5);
  assert.equal(DISTRICT_SPOTS.volcanoGuards.length, 2);
});

test('vitória paga uma vez; fúria na metade da vida', () => {
  assert.equal(afterVorgazhek({}).coinsGained, ACT2.reward);
  assert.equal(afterVorgazhek({ vorgazhekRewardClaimed: true }).coinsGained, 0);
  assert.equal(afterVorgazhek({ bishopsDefeated: 1 }).bishopsDefeated, 2);
  assert.equal(bossPhase(ACT2.bossHp * .4, ACT2.bossHp), 2);
});

test('Mod 321 — a nova Cinzária, a garganta e a entrada do vulcão são alcançáveis a pé pela jornada', async () => {
  const J = await import('./jornada3d.js');
  for (const p of [DISTRICT_SPOTS.gate, DISTRICT_SPOTS.plaza, DISTRICT_SPOTS.volcanoGate, ...DISTRICT_SPOTS.volcanoGuards, DISTRICT_SPOTS.note]) assert.ok(J.inJourney(p.x, p.z) && !J.journeyBlocked(p.x, p.z, 99), 'inalcançável: ' + p.x + ',' + p.z);
  const t = createTerrain({ passes: [{ points: DISTRICT_PASS, r: PASS_RADIUS }] });
  for (const [x, z] of DISTRICT_PASS) assert.ok(t.walkable(x, z), 'garganta bloqueada em ' + x + ',' + z);
  assert.equal(DISTRICT_SPOTS.volcanoGuards.length, 2, 'exatamente dois guardas');
});
