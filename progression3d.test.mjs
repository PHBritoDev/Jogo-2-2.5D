import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, levelFromXp, levelProgress, statsForLevel, SHOP_ITEMS, shopStatus, buyItem, ACHIEVEMENTS, achievementState, BESTIARY, bestiaryEntry, XP_REWARDS } from './progression3d.js';

const item = id => SHOP_ITEMS.find(i => i.id === id);

test('níveis sobem com XP e param no máximo', () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(LEVELS[1]), 2);
  assert.equal(levelFromXp(LEVELS[1] - 1), 1);
  assert.equal(levelFromXp(1e9), LEVELS.length);
  assert.equal(levelProgress(1e9).max, true);
  assert.ok(statsForLevel(3).maxHP > statsForLevel(1).maxHP);
});

test('o Ato I rende XP suficiente para as Palavras antes de VHAZRAEL', () => {
  const beforeVhazrael = XP_REWARDS.captor * 10 + XP_REWARDS.demon2 * 3 + XP_REWARDS.warden; // Mod 204: 3+2+5 Seguidores, 3 Demônios e o Guardião
  assert.ok(levelFromXp(beforeVhazrael) >= item('magic2').level, 'Skill 2 precisa ser alcançável antes do Bispo');
});

test('ouro sozinho não compra: etapa e nível vêm antes', () => {
  const rich = { coins: 9999, level: 10, owned: new Set() };
  assert.equal(shopStatus(item('magic'), { ...rich, questStep: 2 }).state, 'locked');
  assert.match(shopStatus(item('magic'), { ...rich, questStep: 2 }).reason, /crianças/);
  assert.equal(shopStatus(item('magic'), { ...rich, questStep: 4, level: 1 }).state, 'level');
  assert.equal(shopStatus(item('magic'), { questStep: 4, level: 2, coins: 5 }).state, 'gold');
  assert.equal(shopStatus(item('magic'), { questStep: 4, level: 2, coins: 20 }).state, 'buyable');
  assert.equal(shopStatus(item('ultimate'), { ...rich, questStep: 8 }).state, 'locked', 'ultimate não aparece comprável no Ato I');
  const bought = buyItem(item('magic'), { questStep: 4, level: 2, coins: 25, owned: new Set() });
  assert.equal(bought.ok, true); assert.equal(bought.coins, 5);
  assert.equal(shopStatus(item('magic'), { questStep: 4, level: 2, coins: 25, owned: new Set(['magic']) }).state, 'owned');
});

test('conquistas mostram progresso e não pagam duas vezes', () => {
  const explorer = ACHIEVEMENTS.find(a => a.id === 'explorador');
  assert.deepEqual(achievementState(explorer, { places: 3 }), { value: 3, done: false, claimed: false });
  assert.equal(achievementState(explorer, { places: 9 }).value, explorer.goal);
  assert.equal(achievementState(explorer, { places: 9 }, new Set(['explorador'])).claimed, true);
});

test('catálogo esconde inimigos não derrotados', () => {
  const e = bestiaryEntry(BESTIARY[0]);
  assert.equal(e.known, false); assert.equal(e.name, '???'); assert.ok(!('lore' in e) || !/garras/.test(e.lore));
  assert.equal(bestiaryEntry(BESTIARY[0], new Set(['captor'])).name, 'Seguidor da Ganância');
});

test('Palavras do Ato III exigem a versão anterior e o Ato III', () => {
  const up = SHOP_ITEMS.find(i => i.id === 'magic_plus');
  assert.equal(shopStatus(up, { questStep: 16, level: 9, coins: 999, owned: new Set() }).state, 'locked');
  assert.equal(shopStatus(up, { questStep: 12, level: 9, coins: 999, owned: new Set(['magic']) }).state, 'locked');
  assert.equal(shopStatus(up, { questStep: 16, level: 9, coins: 999, owned: new Set(['magic']) }).state, 'buyable');
});

test('MOD 211 — Espada do Círculo: aprimoramento do Sol da Justiça no Ato IV', () => {
  const up = SHOP_ITEMS.find(i => i.id === 'magic3_plus');
  assert.ok(up); assert.equal(up.requires, 'magic3'); assert.equal(up.kind, 'upgrade'); assert.equal(up.step, 21);
});
