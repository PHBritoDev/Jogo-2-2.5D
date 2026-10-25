import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from './act6-flow.js';
import { DESERT, DESERT_REGION, inDesert, fragmentsHeld } from './desert3d.js';
const { ACT6N, REMATCH, GREED_FORMS, act6Presentation, isAct6Step, nextRematch, greedReward } = A;
const all = () => ['desertArrivalScene', 'statueScene', 'closedPortalScene', 'mysteryPortalScene', 'returnStatueScene', 'greedIntroScene', 'greedPhase2Scene', 'greedPhase3Scene', 'greedFallScene', 'epilogueScene']
  .flatMap(n => A[n]()).concat(REMATCH.flatMap(r => A.rematchIntroScene(r.key).concat(A.rematchOutroScene(r.key))));
const text = () => all().filter(s => s.type === 'say').map(s => s.text).join(' \n ');

test('etapas 27–30, revanche na ordem dos Bispos e três formas da Ganância', () => {
  assert.deepEqual([ACT6N.desert, ACT6N.rematch, ACT6N.greed, ACT6N.done], [27, 28, 29, 30]);
  assert.ok(isAct6Step(27) && isAct6Step(29) && !isAct6Step(26) && !isAct6Step(30));
  assert.deepEqual(REMATCH.map(r => r.key), ['bishop1', 'bishop2', 'bishop3', 'bishop4']);
  for (let i = 0; i < 4; i++) assert.equal(nextRematch(i).key, REMATCH[i].key);
  assert.equal(nextRematch(4), null);
  assert.deepEqual(GREED_FORMS.map(f => f.rig), ['greed1', 'greed2', 'greed3']);
  assert.ok(GREED_FORMS[2].hp > GREED_FORMS[1].hp && GREED_FORMS[1].hp > GREED_FORMS[0].hp);
  for (let s = 0; s <= 3; s++) assert.ok(act6Presentation(27, s).objective);
  for (let s = 0; s <= 4; s++) assert.match(act6Presentation(28, s).title, new RegExp('\\(' + s + '/4\\)'));
  assert.ok(act6Presentation(29, 0) && act6Presentation(29, 1));
  assert.deepEqual(greedReward(false), { coins: ACT6N.reward, xp: ACT6N.xp });
  assert.deepEqual(greedReward(true), { coins: 0, xp: 0 });
});

test('fragmentos: quatro na estátua, zero depois do caos, um por Bispo na revanche', () => {
  assert.equal(fragmentsHeld(26, 0), 4);
  assert.equal(fragmentsHeld(27, 1), 4); assert.equal(fragmentsHeld(27, 2), 0);
  for (let s = 0; s <= 4; s++) assert.equal(fragmentsHeld(28, s), s);
  assert.equal(fragmentsHeld(29, 0), 4); assert.equal(fragmentsHeld(30, 0), 0);
  for (const k of ['statue', 'offer', 'mystery', 'angels']) assert.ok(inDesert(DESERT[k].x, DESERT[k].z), k);
  assert.ok(!inDesert(DESERT_REGION.cx + DESERT_REGION.hx + 1, DESERT_REGION.cz));
});

test('falas essenciais do roteiro estão presentes, sem nome fixo', () => {
  const t = text();
  for (const re of [/A estátua gigante que eu vi/, /quatro encaixes/, /prove-me que é digno/, /Eu os revivi/, /Um portal no meio do deserto/, /mais uma chance da Ganância/, /brincar com as almas dos mortos/,
    /Salve as nossas almas/, /me sinto mais forte/, /nunca vou te vencer/, /vitória é garantida/, /Pegue o meu fragmento espacial/, /não posso deixar você passar/, /humanos imundos/,
    /Cadê os meus companheiros/, /vença-me primeiro/, /batalha de verdade começa/, /segunda pessoa que me obriga/, /Não desista/, /lutar até o fim/, /Como vocês escaparam da cela/,
    /anjos de baixo escalão/, /um simples Bispo que eu descartei/, /graças a vocês/, /e os outros seis/, /Pecado da Inveja/, /Existem outros Pecados/, /Temos que fugir/, /roubar a sua alma/, /Desapareça/,
    /Espero vocês no meu mundo/, /Existem sete mundos/, /anjos enviados por Deus/, /eu me chamo Sandra/, /você era mulher/, /posso ir com vocês/, /posso fazer várias estratégias/, /Então vamos/])
    assert.match(t, re);
  assert.doesNotMatch(t, /Paulo/);
});

test('cada cena só usa passos conhecidos do diretor', () => {
  for (const s of all()) assert.ok(['say', 'shot', 'do', 'ask', 'wait'].includes(s.type), JSON.stringify(s));
  const ids = all().filter(s => s.type === 'do').map(s => s.id);
  for (const id of ['fragmentos', 'caos', 'puxar-misteriosa', 'puxar-heroi', 'transformar', 'aliados-chegam', 'roubar-alma', 'sandra-revela', 'portal-anjos', 'entrar-portal'])
    assert.ok(ids.includes(id) || all().some(s => (s.with || []).some(w => w.id === id)), id);
});
