import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBlackMoonFlames, createFlameHazards, BF } from './zarkhael-blackflame3d.js';
import { chooseZarkhaelMove } from './zarkhael-brain3d.js';
import { kitFor, powerStats } from './powers3d.js';

const ground = x => -2000 + .05 * Math.sin(x * .3), FROM = { x: 0, y: -1998.1, z: -5.2 };
function run(move = () => {}, o = {}) {
  const hz = createFlameHazards({ ground }), s = createBlackMoonFlames({ hazards: hz, ground, ...o }).start(), hero = { x: 0, z: 9, vx: 0, vz: 0, iframes: false, alive: true }, L = { ev: [], burns: [], ticks: 0, dmg: 0 };
  for (let i = 0; i < 60 * 30 && (!s.done || hz.active); i++) { const t = s.st.t; move(hero, t, s); hero.y = ground(hero.x);
    const ev = [...s.step(1 / 60, { from: FROM, hero }), ...hz.step(1 / 60, hero)]; for (const e of ev) { e.t = s.st.t; L.ev.push(e); if (e.type === 'tick') { L.ticks++; L.dmg += e.dmg; } if (e.type === 'hit') L.dmg += e.dmg; }
    L.burns.push(hz.st.burn ? hz.st.burn.tier : null); }
  L.s = s; L.hz = hz; return L;
}
const at = (L, t, f = () => true) => L.ev.find(e => e.type === t && f(e)), all = (L, t) => L.ev.filter(e => e.type === t);

test('Chamas Negras — exatamente 10 chamas em sequência (0,85 s) com antecipação, depois a colossal carregada e lançada', () => {
  const L = run(() => {}); const fires = all(L, 'fire'); assert.equal(BF.shots, 10); assert.equal(fires.length, 10); assert.deepEqual(fires.map(f => f.i), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let i = 1; i < 10; i++) { const g = fires[i].t - fires[i - 1].t; assert.ok(g > .75 && g < 1.0, 'intervalo ' + g.toFixed(2)); }
  for (let i = 0; i < 10; i++) assert.ok(at(L, 'windup', e => e.i === i).t < fires[i].t, 'antecipação antes de cada disparo');
  const fc = at(L, 'final_charge'), ff = at(L, 'final_fire'); assert.ok(fc.t > fires[9].t && ff.t - fc.t > 2.2, 'carga final por etapas'); assert.equal(all(L, 'final_fire').length, 1);
  assert.ok(L.s.st.fired === 10 && all(L, 'impact').length === 11, '10 + 1 projéteis reais'); assert.equal(at(L, 'impact', e => e.big).i, 10);
  assert.ok(Math.abs(BF.smallScale - 1.05) < 1e-9 && Math.abs(BF.bigScale / 1.05 - 3) < 1e-9, 'cada menor tem o tamanho da antiga colossal; a colossal é 3× maior');
  assert.ok(BF.bigR > BF.smallR * 2 && BF.smallR >= .8, 'colisão acompanha o tamanho');
});

test('Skill 2 — Lua removida de verdade, sem mesh, shader, câmera ou eventos; o 10+1 continua', () => {
  const L = run(); assert.equal(all(L, 'fire').length, 10); assert.equal(all(L, 'final_fire').length, 1);
  assert.equal(all(L, 'moon').length + all(L, 'moon_fade').length, 0, 'nenhum evento da lua');
  assert.ok(!('moon' in L.s.st) && !('moonGone' in L.s.st), 'estado de lua removido');
  const vfx = fs.readFileSync(new URL('./zarkhael-blackflame3d.js', import.meta.url), 'utf8');
  assert.ok(!/\bMOON_F\b|\bMOON_V\b|moonG|moonU|moonPlaced|moonPos/.test(vfx), 'shader, mesh e rastreamento da lua foram excluídos');
  const main = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(!main.includes('bfVfx.moonPos') && !main.includes("e.type==='moon_fade'"), 'câmera e áudio especiais da lua removidos');
});

test('Chamas Negras — mira travada, colisão varrida, acerto direto x chão; durações exatas', () => {
  const still = run(() => {}); const h0 = at(still, 'impact', e => e.i === 0); assert.equal(h0.kind, 'hero'); assert.equal(at(still, 'burn', e => e.from === 'hit').res, 'start');
  // correndo para o lado: as chamas caem no chão e viram manchas de 4 s
  const dodge = run((h, t) => { if (t > 1.7) { h.vx = 8 * (Math.floor(t / 2.2) % 2 ? -1 : 1); h.x += h.vx / 60; if (Math.abs(h.x) > 14) h.x = Math.sign(h.x) * 14; } });
  const fields = all(dodge, 'field'); assert.ok(fields.length >= 3, 'manchas no chão: ' + fields.length); for (const f of fields) assert.ok(Math.abs(f.y - ground(f.x)) < 1e-9, 'apoiada no chão real');
  // durações: mancha pequena 4,0 s; grande 7,0 s
  const hz = createFlameHazards({ ground }); const a = hz.addField(0, 0, false), b = hz.addField(20, 0, true); assert.equal(a.dur, 4.0); assert.equal(b.dur, 7.0); assert.equal(BF.burnSmallHit, 3.4); assert.equal(BF.burnSmallField, 4.0); assert.equal(BF.burnBig, 6.0);
  let t = 0; const far = { x: 100, z: 100, alive: true }; while (hz.st.fields.length && t < 10) { hz.step(1 / 60, far); t += 1 / 60; } assert.ok(Math.abs(t - (7.0 + .6)) < .05, 'grande dura 7 s + dissolução');
  // trajetória travada: o alvo não muda depois do disparo
  const L = run((h, t) => { if (t > 1.95) h.x = 6; }); const f0 = at(L, 'fire', e => e.i === 0), i0 = at(L, 'impact', e => e.i === 0); assert.ok(Math.hypot(i0.x - f0.target[0], i0.z - f0.target[2]) < .6 || i0.kind === 'hero');
});

test('Queimadura — uma só instância: recontato renova, a forte substitui a fraca, nunca soma ticks', () => {
  const hz = createFlameHazards({ ground }); assert.equal(hz.burn('weak', 3.4), 'start'); assert.equal(hz.burn('weak', 2), 'keep'); assert.equal(hz.burn('weak', 4), 'refresh'); assert.equal(hz.st.burn.left, 4);
  assert.equal(hz.burn('strong', 6), 'upgrade'); assert.equal(hz.st.burn.tier, 'strong'); assert.equal(hz.burn('weak', 4), 'keep'); assert.equal(hz.st.burn.tier, 'strong');
  // duas manchas sob o herói: um tick por intervalo, não dois
  const h2 = createFlameHazards({ ground }); h2.addField(0, 0, false); h2.addField(.3, 0, false); const hero = { x: 0, z: 0, alive: true }; let ticks = 0; for (let i = 0; i < 60 * 3; i++) ticks += h2.step(1 / 60, hero).filter(e => e.type === 'tick').length;
  assert.ok(Math.abs(ticks - Math.floor(3 / BF.tick)) <= 1, 'ticks consolidados: ' + ticks);
  // tocar a borda já queima; longe não
  const h3 = createFlameHazards({ ground }); const f = h3.addField(0, 0, true); h3.step(1 / 60, { x: f.r + BF.heroR - .05, z: 0, alive: true }); assert.equal(h3.st.burn.tier, 'strong'); assert.ok(Math.abs(h3.st.burn.left - 6) < .05);
  const h4 = createFlameHazards({ ground }); h4.addField(0, 0, false); h4.step(1 / 60, { x: 3, z: 0, alive: true }); assert.equal(h4.st.burn, null);
  // queimadura termina sozinha e limpa
  const h5 = createFlameHazards({ ground }); h5.burn('weak', 3.4); let t = 0; while (h5.st.burn && t < 5) { h5.step(1 / 60, { x: 50, z: 50, alive: true }); t += 1 / 60; } assert.ok(Math.abs(t - 3.4) < .05); h5.addField(0, 0, true); h5.clear(); assert.ok(!h5.active);
});

test('Colossal — acerto direto dá dano grande e aura de 6 s; no chão vira incêndio de 7 s; dash evita', () => {
  const hit = run(() => {}); const big = at(hit, 'impact', e => e.big); assert.equal(big.kind, 'hero'); assert.ok(at(hit, 'hit', e => e.big).dmg > at(hit, 'hit', e => !e.big).dmg * 3);
  const dash = run((h, t, s) => { h.iframes = s.st.phase === 'final'; }); assert.equal(at(dash, 'impact', e => e.big).kind, 'ground', 'i-frames: cai no chão'); assert.ok(at(dash, 'field', e => e.big), 'vira o incêndio gigante');
  assert.ok(hit.dmg < 100, 'parado o tempo todo não morre de uma vez (' + hit.dmg + ')');
});

test('Interrupção, IA e integração — some limpo, IA usa a Skill 2 à distância e alterna com a Hidra; nada genérico voltou', () => {
  const hz = createFlameHazards({ ground }), s = createBlackMoonFlames({ hazards: hz, ground }).start(); for (let i = 0; i < 60 * 3; i++) s.step(1 / 60, { from: FROM, hero: { x: 0, z: 9 } }); s.abort(); const ev = []; for (let i = 0; i < 60 * 3 && !s.done; i++) ev.push(...s.step(1 / 60, { from: FROM, hero: { x: 0, z: 9 } }));
  assert.ok(s.done && !ev.some(e => e.type === 'fire' || e.type === 'final_fire')); assert.ok(!s.holdBoss);
  const k = kitFor('zarkhael'); assert.deepEqual(k.skills.map(x => x.type), ['hydra_judgment', 'zarkhael_black_moon_flames']); assert.equal(k, kitFor('fallen3')); assert.equal(k.sword, null); assert.equal(k.ult, null);
  assert.ok(powerStats('zarkhael', k.skills[1]).dmg > 0 && k.skills[1].cd >= 25);
  const seq = s0 => { let x = s0; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; }; let moonPicks = 0;
  for (let i = 1; i < 30; i++) if (chooseZarkhaelMove(k, { dist: 15, cds: {}, last: 's1', hpFrac: 1, heroHpFrac: 1 }, seq(i)).move.id === 's2') moonPicks++; assert.ok(moonPicks > 15, 'depois da Hidra, prefere a Lua: ' + moonPicks);
  assert.equal(chooseZarkhaelMove(k, { dist: 3, cds: {}, last: '', hpFrac: 1, heroHpFrac: 1 }).move, null, 'colado: nenhuma magia genérica');
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(src.includes("case 'zarkhael_black_moon_flames':startMoonFlames(m);break;") && src.includes('updateMoonFlames(dt);') && src.includes('stopMoonFlames();stopHydra();clearHazards();') && src.includes('undoBfShake();undoHydraShake();undoCosmicShake();updatePlayerCamera(dt);'), 'integração e limpeza');
  assert.ok(src.includes('if(moonFlames||hydraSkill)return;'), 'nunca junto com a Hidra');
  const vfx = fs.readFileSync(new URL('./zarkhael-blackflame3d.js', import.meta.url), 'utf8'); assert.ok(!/\bMOON_F\b|\bMOON_V\b|moonG|moonU|moonPlaced|moonPos/.test(vfx), 'nenhum shader/mesh de lua em Skill 2');
  assert.ok(BF.shots===10 && BF.bigScale>BF.smallScale*2.9, 'dez chamas e uma colossal, sem Lua');
  assert.ok(!/function spawnEnemyProjectile|function updateEnemyProjectiles|BOSS_POWERS\.zarkhael/.test(src), 'Mods 264/267 preservadas');
  const lab = fs.readFileSync(new URL('./laboratorio-inimigos.html', import.meta.url), 'utf8'); assert.ok(lab.includes('testLuaNegra=1') && lab.includes('testHidra=1'));
});
