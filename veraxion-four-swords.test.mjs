import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createFourSwords, pickTargets, segSegDist, VX } from './veraxion-four-swords3d.js';
import { buildSwordData, swordGLB, SWORD_DIMS } from './veraxion-sword-model3d.js';
import { kitFor, KITS } from './powers3d.js';

const GY = -1000, ground = x => GY + .03 * Math.sin(x * .2), BOSS = { x: 1600, y: GY, z: -4, yaw: 0, h: 2.6 }, ARENA = { x: 1600, z: 0, r: 30 };
function run(move = () => {}, o = {}) {
  const s = createFourSwords({ ground, ...o }).start(BOSS, ARENA), hero = { x: 1600, z: 8, y: GY, vx: 0, vz: 0, iframes: false, alive: true, ...(o.hero || {}) }, fps = o.fps || 60, L = { ev: [], aura: [], holds: [] };
  for (let i = 0; i < fps * 14 && !s.done; i++) { move(hero, s.st.t, s); hero.y = ground(hero.x);
    for (const e of s.step(1 / fps, { hero })) { e.t = s.st.t; L.ev.push(e); } L.aura.push([s.st.t, s.st.aura]); L.holds.push([s.st.t, s.holdBoss]); }
  L.s = s; return L;
}
const all = (L, t) => L.ev.filter(e => e.type === t), at = (L, t, f = () => true) => L.ev.find(e => e.type === t && f(e));

test('Quatro Sentenças — ordem: aura antes das mãos, quatro espadas surgem, trava, release_all4 no MESMO instante, cravam, sugam e explodem', () => {
  const L = run(); const aura = at(L, 'aura'), raise = at(L, 'raise'), man = all(L, 'manifest'), lock = at(L, 'lock'), rel = all(L, 'release'), all4 = all(L, 'release_all4');
  assert.ok(aura.t < raise.t, 'aura primeiro'); assert.ok(raise.t < man[0].t, 'mãos antes das espadas'); assert.equal(man.length, 4); assert.deepEqual(man.map(e => e.i), [0, 1, 2, 3]);
  assert.ok(lock.t < all4[0].t && lock.targets.length === 4, 'quatro destinos travados antes do lançamento');
  assert.equal(all4.length, 1, 'uma única salva'); assert.equal(rel.length, 4); assert.ok(rel.every(e => e.t === rel[0].t && e.t === all4[0].t), 'as quatro partem no mesmo timestamp');
  assert.deepEqual(all4[0].ids, ['veraxion-sentenca-0', 'veraxion-sentenca-1', 'veraxion-sentenca-2', 'veraxion-sentenca-3'], 'ids determinísticos');
  const stuck = all(L, 'stuck'), imp = all(L, 'implode'), ex = all(L, 'explode'); assert.equal(stuck.length, 4); assert.equal(ex.length, 4, 'exatamente quatro explosões');
  for (const e of ex) { const s0 = stuck.find(s => s.i === e.i), i0 = imp.find(s => s.i === e.i); assert.ok(i0.t <= s0.t + 1e-9 && e.t - s0.t >= VX.implode - 1e-6 && e.t - s0.t < VX.implode + .05, 'sucção visível ANTES da explosão (' + (e.t - s0.t).toFixed(2) + ' s)'); }
  for (const s of stuck) { const fl = s.t - all4[0].t; assert.ok(fl > .3 && fl < 1.3, 'voo ' + fl.toFixed(2)); }
  assert.ok(at(L, 'dissipate').t >= Math.max(...ex.map(e => e.t)) - 1e-9 && at(L, 'end'), 'dissipa e termina'); const total = at(L, 'end').t; assert.ok(total > 4 && total < 6.5, 'duração ' + total.toFixed(2));
  // aura cresce suave (sem salto) e chega a ~1,35 no lançamento
  let jump = 0; for (let i = 1; i < L.aura.length; i++) jump = Math.max(jump, Math.abs(L.aura[i][1] - L.aura[i - 1][1])); assert.ok(jump < .06, 'sem salto de aura'); assert.ok(Math.max(...L.aura.map(a => a[1])) <= 1.36 && Math.max(...L.aura.map(a => a[1])) > 1.25);
});

test('Quatro Sentenças — destinos únicos, separados, dentro da arena, em volta do herói; espadas com 1,5–2 alturas do bispo', () => {
  for (let seed = .05; seed < 1; seed += .09) { const tg = pickTargets({ x: 1600, z: 8 }, BOSS, ARENA, seed);
    assert.equal(tg.length, 4); for (let i = 0; i < 4; i++) { assert.ok(Math.hypot(tg[i].x - ARENA.x, tg[i].z - ARENA.z) <= ARENA.r - VX.edge + 1e-6, 'dentro da arena'); for (let j = i + 1; j < 4; j++) assert.ok(Math.hypot(tg[i].x - tg[j].x, tg[i].z - tg[j].z) >= VX.minSep * .92, 'centros separados'); }
    assert.ok(Math.hypot(tg[0].x - 1600, tg[0].z - 8) < 1, 'um destino perto do herói'); assert.ok(tg.slice(1).every(p => Math.hypot(p.x - 1600, p.z - 8) < 9), 'os outros em volta'); }
  // herói perto da borda: continua dentro
  const edge = pickTargets({ x: 1600 + 26, z: 0 }, BOSS, ARENA, .3); for (const p of edge) assert.ok(Math.hypot(p.x - ARENA.x, p.z - ARENA.z) <= ARENA.r - VX.edge + 1e-6);
  const L = run(); assert.ok(L.s.st.L / BOSS.h >= 1.5 && L.s.st.L / BOSS.h <= 2, 'comprimento ' + (L.s.st.L / BOSS.h).toFixed(2) + '× a altura do bispo');
  const ex = all(L, 'explode'); for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) assert.ok(Math.hypot(ex[i].x - ex[j].x, ex[i].z - ex[j].z) > 3, 'quatro locais diferentes');
});

test('Quatro Sentenças — dano: espada e explosão separados, uma vez cada, AoE sem contato, i-frames/dash, fora do raio nada, nunca knockback', () => {
  const still = run(); const sh = all(still, 'sword_hit'), bh = all(still, 'blast_hit'); assert.ok(sh.length >= 1 && sh.length <= 2, 'parado: a espada do destino perto acerta (' + sh.length + ')'); assert.ok(bh.length >= 1 && bh.length <= 2);
  assert.ok(new Set(sh.map(e => e.i)).size === sh.length && new Set(bh.map(e => e.i)).size === bh.length, 'sem hit múltiplo'); assert.ok(sh.reduce((a, e) => a + e.dmg, 0) + bh.reduce((a, e) => a + e.dmg, 0) < 60, 'soma equilibrada');
  for (const e of still.ev) for (const k of ['push', 'impulse', 'knockback', 'vx', 'vy', 'vz']) assert.ok(!(k in e), 'nenhum evento carrega empurrão: ' + e.type);
  // esquiva: corre para longe depois do lançamento → espada erra; ainda pode levar AoE se ficar no raio
  const tg = run().s.st.targets, cx = (tg[1].x + tg[2].x + tg[3].x) / 3, cz = (tg[1].z + tg[2].z + tg[3].z) / 3, dl = Math.hypot(1600 - cx, 8 - cz), ux = (1600 - cx) / dl, uz = (8 - cz) / dl;
  const away = run((h, t) => { if (t > 2.6) { h.vx = 9 * ux; h.vz = 9 * uz; h.x += h.vx / 60; h.z += h.vz / 60; } }); assert.equal(all(away, 'sword_hit').length, 0, 'correndo para fora do triângulo, a espada erra');
  // AoE sem contato: o herói fica parado num dos destinos laterais, nunca tocado pela lâmina
  const s0 = run(); const side = s0.s.st.targets[1]; const aoe = run((h, t) => { if (t > 2.56 && t < 2.6) { h.x = side.x + 1.5; h.z = side.z; } });
  assert.ok(all(aoe, 'blast_hit').length >= 1, 'explosão perto sem a espada tocar');
  // dash / i-frames durante todo o voo e explosões: nada de dano
  const dash = run((h, t) => { h.iframes = t > 2.5; }); assert.equal(all(dash, 'sword_hit').length + all(dash, 'blast_hit').length, 0); assert.ok(all(dash, 'blast_dodge').length >= 1);
  // longe de tudo: nenhum dano
  const far = run((h, t) => { if (t > 2.56) { h.x = 1600 - 25; h.z = 0; } }); assert.equal(all(far, 'sword_hit').length + all(far, 'blast_hit').length, 0);
});

test('Quatro Sentenças — 10 FPS e 60 FPS dão o mesmo resultado (destinos, acertos, ordem)', () => {
  const a = run(() => {}, { fps: 60 }), b = run(() => {}, { fps: 10 });
  assert.deepEqual(a.s.st.targets.map(p => [p.x.toFixed(3), p.z.toFixed(3)]), b.s.st.targets.map(p => [p.x.toFixed(3), p.z.toFixed(3)]));
  const sig = L => ['sword_hit', 'blast_hit', 'explode'].map(t => all(L, t).map(e => e.i).sort().join(',')).join('|'); assert.equal(sig(a), sig(b));
  for (const e of all(a, 'stuck')) { const f = all(b, 'stuck').find(x => x.i === e.i); assert.ok(Math.hypot(e.x - f.x, e.z - f.z) < .35, 'mesmo ponto de cravada'); }
  // colisão varrida: lâmina rápida contra cápsula fina não atravessa
  assert.ok(segSegDist([0, 2, -1], [0, 2, 1], [0, 0, 0], [0, 3, 0]) < 1e-9); assert.ok(Math.abs(segSegDist([1, 0, 0], [1, 1, 0], [0, 0, 0], [0, 1, 0]) - 1) < 1e-9);
});

test('Quatro Sentenças — o bispo fica preso só no cast; interrupção limpa sem dano; nada genérico no slot', () => {
  const L = run(); const rel = at(L, 'release_all4').t; assert.ok(L.holds.filter(h => h[0] < rel).every(h => h[1]), 'conjurando'); assert.ok(L.holds.filter(h => h[0] > rel + VX.holdAfter + .02).every(h => !h[1]), 'solto depois');
  for (const cut of [1.2, 2.3, 2.8, 3.3]) { const s = createFourSwords({ ground }).start(BOSS, ARENA), hero = { x: 1600, z: 8, y: GY, alive: true }; const ev = [];
    for (let i = 0; i < 60 * 12 && !s.done; i++) { if (Math.abs(s.st.t - cut) < 1 / 120) s.abort(); for (const e of s.step(1 / 60, { hero })) { e.t = s.st.t; ev.push(e); } }
    assert.ok(s.done, 'termina depois de abortar em ' + cut); assert.ok(!ev.some(e => e.t > cut + .02 && (e.type === 'sword_hit' || e.type === 'blast_hit' || e.type === 'release_all4')), 'sem dano depois de abortar'); assert.ok(!s.holdBoss); }
  const k = kitFor('veraxion'); assert.equal(k.skills[0].type, 'veraxion_four_swords'); assert.equal(k.skills[0].name, 'QUATRO SENTENÇAS DO ABISMO'); assert.equal(k, kitFor('fallen4'));
  assert.ok(!Object.values(KITS).some(x => x.skills.some(s => s.type === 'abyss')), 'tipo genérico "abyss" removido');
  assert.deepEqual(k.skills.slice(1).map(s => s.type), ['veraxion_four_blue_tornadoes']); assert.equal(k.ult, null); assert.equal(k.sword, null);
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(!/BOSS_POWERS\.fallen4\s*=|\bveraxion:\{cd:8\.5/.test(src), 'disparo periódico genérico do Fogo Abissal excluído');
  assert.ok(!/case 'abyss'/.test(src) && !/function abyssFlame/.test(src), 'Fogo Abissal antigo excluído');
  assert.ok(src.includes("if(m.type==='veraxion_four_swords'){startVeraxionSwords(m);return;}") && src.includes('updateVeraxionSwords(dt);') && src.includes('stopVeraxionSwords();'), 'integração e limpeza');
});

test('Espada autoral — GLB válido, proporções da referência, um único asset compartilhado', () => {
  const d = buildSwordData(); const n = d.positions.length / 3; assert.ok(n > 1500 && d.indices.length / 3 < 9000, 'detalhe de mobile: ' + d.indices.length / 3 + ' triângulos');
  let mnY = 1e9, mxY = -1e9, mxX = 0; for (let i = 0; i < n; i++) { mnY = Math.min(mnY, d.positions[i * 3 + 1]); mxY = Math.max(mxY, d.positions[i * 3 + 1]); mxX = Math.max(mxX, Math.abs(d.positions[i * 3])); }
  assert.ok(Math.abs(mxY - mnY - 1) < .02, 'comprimento 1'); assert.ok(mxX > .1 && mxX < .14, 'guarda larga (' + mxX.toFixed(3) + ')'); assert.ok(Math.abs(mnY - SWORD_DIMS.tip) < .01, 'ponta extrema');
  const glb = swordGLB(d), disk = fs.readFileSync(new URL('./EspadaVeraxion.glb', import.meta.url)); assert.equal(new DataView(glb.buffer).getUint32(0, true), 0x46546C67); assert.equal(Buffer.compare(Buffer.from(glb), disk), 0, 'GLB no disco = geometria do gerador');
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8'); assert.equal((src.match(/'\.\/EspadaVeraxion\.glb/g) || []).length, 1, 'um único carregamento, em cache');
});
