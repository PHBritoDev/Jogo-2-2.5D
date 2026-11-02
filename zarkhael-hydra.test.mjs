import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHydraJudgment, hydraPose, HYDRA } from './zarkhael-hydra3d.js';
import { chooseZarkhaelMove, rangeScore } from './zarkhael-brain3d.js';
import { KITS, kitFor, pickMove } from './powers3d.js';

const ground = x => -2000 + .05 * Math.sin(x * .2), ARENA = { x: 0, z: 0, r: 30 };
function run(move = () => {}, o = {}) {
  const h = createHydraJudgment({ ground, ...o }).start({ x: 0, z: -6 }, { x: 0, z: 8 }, ARENA), hero = { x: 0, z: 8, vx: 0, vz: 0, iframes: false }, L = { ev: [], ks: [[], [], []], seal: [], heads: [] };
  for (let i = 0; i < 60 * 20 && !h.done; i++) { move(hero, h.st.t); hero.y = ground(hero.x);
    for (const e of h.step(1 / 60, hero)) { e.t = h.st.t; L.ev.push(e); }
    h.st.orbs.forEach(o2 => L.ks[o2.i].push([h.st.t, o2.state, o2.k])); L.seal.push([h.st.t, h.circleK()]); L.heads.push([h.st.t, h.poses.map(p => p.head[1] - h.st.C.y)]); }
  L.h = h; return L;
}
const at = (L, type, f = () => true) => L.ev.find(e => e.type === type && f(e));

test('Hidra — o selo se forma devagar em camadas (aro → disco → olho → coroa → crescentes), nunca num quadro só', () => {
  const L = run(); const k = t => L.seal.find(s => s[0] >= t)[1];
  const a = k(.3), b = k(1.2), c = k(2.4); assert.ok(a.rim > 0 && a.rim < 1 && a.crown === 0, 'começa pelo aro'); assert.ok(b.disc > .3 && b.crown < .7, 'disco vem antes da coroa'); assert.ok(c.rim === 1 && c.crown === 1 && c.cres === 1, 'pronto em 2,4 s');
  let jumps = 0; for (let i = 1; i < L.seal.length; i++) for (const key of ['rim', 'disc', 'eye', 'crown', 'cres']) if (L.seal[i][1][key] - L.seal[i - 1][1][key] > .1) jumps++; assert.equal(jumps, 0, 'sem saltos');
  assert.ok(HYDRA.circleR >= 8, 'selo grande');
});

test('Hidra — emerge devagar do selo (abaixo do chão antes), cabeças se erguem uma a uma e ficam diferentes', () => {
  const L = run(); const hh = t => L.heads.find(s => s[0] >= t)[1];
  assert.ok(hh(1.2).every(y => y < -3), 'enterrada antes de emergir'); const mid = hh(3.2); assert.ok(mid[0] > mid[2], 'a primeira cabeça sobe antes da terceira');
  const full = hh(5); assert.ok(full.every(y => y > 4.5) && new Set(full.map(y => y.toFixed(1))).size === 3, 'três alturas distintas, todas no alto');
  // pescoço em S: os pontos de controle não ficam numa reta
  const st = L.h.st, ps = hydraPose({ ...st, t: 5, fired: [-1, -1, -1], dissolve: 0 }, 1, {}); const c = ps.ctrl, dev = Math.max(...c.slice(1, 5).map((p, k) => { const u = (k + 1) / 5, lx = c[0][0] + (c[5][0] - c[0][0]) * u, lz = c[0][2] + (c[5][2] - c[0][2]) * u; return Math.hypot(p[0] - lx, p[2] - lz); })); assert.ok(dev > .4, 'curva viva: ' + dev.toFixed(2));
  assert.ok(at(L, 'roar', e => e.i === 0).t < at(L, 'roar', e => e.i === 2).t);
});

test('Hidra — base dos três pescoços encosta no corpo apoiado sobre o selo sem mover as cabeças', () => {
  const h = createHydraJudgment({ground:()=>12}).start({x:0,z:-6},{x:0,z:8},ARENA);
  h.st.t=5;
  for (let i=0;i<3;i++) {
    const p=hydraPose(h.st,i,{});
    assert.ok(Math.abs(p.ctrl[0][1]-(h.st.C.y+1.6-HYDRA.rootGrounding))<1e-6,
      'raiz do pescoço une-se ao topo do corpo abaixado, sem espaço visível');
    assert.ok(p.head[1]>h.st.C.y+4.5, 'cabeças permanecem na altura original');
  }
  assert.ok(HYDRA.rootGrounding>0&&HYDRA.rootGrounding<1, 'abatimento suave, não afunda a Hidra');
  const src=fs.readFileSync(new URL('./zarkhael-hydra3d.js',import.meta.url),'utf8');
  assert.ok(src.includes('(2.4 - T2.rootGrounding) * em0'), 'corpo visual usa o mesmo deslocamento da raiz');
});

test('Hidra — cada cabeça constrói a sua esfera devagar; disparo 1 → 2 → 3 em sequência, cada uma depois de pronta', () => {
  const L = run(); for (let i = 0; i < 3; i++) { const bs = L.ks[i].filter(x => x[1] === 'build'); assert.ok(bs.length / 60 > 1.6, 'construção lenta (' + (bs.length / 60).toFixed(2) + ' s)'); for (let j = 1; j < bs.length; j++) assert.ok(bs[j][2] >= bs[j - 1][2]); }
  const f = [0, 1, 2].map(i => at(L, 'fire', e => e.i === i)), r = [0, 1, 2].map(i => at(L, 'orb_ready', e => e.i === i));
  assert.ok(f.every(Boolean) && L.ev.filter(e => e.type === 'fire').length === 3, 'exatamente 3 disparos'); assert.ok(f[0].t < f[1].t && f[1].t < f[2].t && f[1].t - f[0].t >= .45 && f[2].t - f[1].t >= .45, 'em sequência, intervalo intencional');
  for (let i = 0; i < 3; i++) assert.ok(f[i].t > r[i].t, 'só dispara a esfera pronta');
  const ps = createHydraJudgment({ ground }).start({ x: 0, z: -6 }, { x: 0, z: 8 }, ARENA); ps.st.t = 7.5; ps.st.fired = [7.3, -1, -1]; const a = hydraPose(ps.st, 0, {}), b = hydraPose({ ...ps.st, fired: [-1, -1, -1] }, 0, {}); assert.ok(Math.hypot(a.head[0] - b.head[0], a.head[2] - b.head[2]) > .3, 'recuo da cabeça ao disparar');
});

test('Hidra — impacto no ponto real, dano uma vez por esfera, esquiva correndo/dash, mira travada', () => {
  const still = run(); const imp = still.ev.filter(e => e.type === 'impact'); assert.equal(imp.length, 3); assert.equal(still.ev.filter(e => e.type === 'hit').length, 3);
  for (const e of imp) assert.ok(Math.abs(e.y - ground(e.x)) < 1e-6, 'explode no chão real');
  const dodge = run((h, t) => { if (t > 7.15) { h.vx = 8; h.x += 8 / 60; } }); assert.ok(dodge.ev.filter(e => e.type === 'hit').length <= 1, 'correndo de lado escapa de quase todas: ' + dodge.ev.filter(e => e.type === 'hit').length);
  const dash = run((h, t) => { h.iframes = t > 7.1; }); assert.equal(dash.ev.filter(e => e.type === 'hit').length, 0, 'i-frames');
  const L = run((h, t) => { if (t > 7.25) h.x = 12; }); const f0 = at(L, 'fire', e => e.i === 0), i0 = at(L, 'impact', e => e.i === 0); assert.ok(Math.hypot(i0.x - f0.target[0], i0.z - f0.target[2]) < 1.2, 'não persegue depois de lançar');
  const tr = still.h.st; assert.ok(tr.hits === 3);
});

test('Hidra — some em pó depois da 3ª; interrupção limpa; o bispo só fica preso no ritual inicial', () => {
  const L = run(); const f3 = at(L, 'fire', e => e.i === 2), dis = at(L, 'dissolve'), end = at(L, 'end'); assert.ok(dis.t > f3.t && end.t > dis.t + 1, 'dissolve depois do último disparo, sem sumiço abrupto');
  const h = createHydraJudgment({ ground }).start({ x: 0, z: -6 }, { x: 0, z: 8 }, ARENA); assert.ok(h.holdBoss); for (let i = 0; i < 60 * 5; i++) h.step(1 / 60, { x: 0, z: 8 }); assert.ok(!h.holdBoss, 'depois de emergir o bispo volta a agir');
  h.abort(); const ev = []; for (let i = 0; i < 60 * 2 && !h.done; i++) ev.push(...h.step(1 / 60, { x: 0, z: 8 })); assert.ok(h.done && !ev.some(e => e.type === 'fire' || e.type === 'hit'));
});

test('IA do Bispo 3 — utilidade por distância, sem spam, espera o dash, pune quem cola, abre distância antes do ritual', () => {
  const k = kitFor('zarkhael'); assert.deepEqual(k.skills.map(s=>s.type), ['hydra_judgment']); assert.equal(k.sword, null); assert.equal(k.ult, null); assert.equal(k, kitFor('fallen3'));
  const seq = s => { let x = s; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; };
  const pick = (ctx, s = 3) => chooseZarkhaelMove(k, { cds: {}, last: '', hpFrac: 1, heroHpFrac: 1, ...ctx }, seq(s));
  assert.equal(pick({ dist: 14 }).move.type, 'hydra_judgment', 'à distância média, o ritual');
  assert.equal(pick({ dist: 2.5 }).move, null, 'colado, sem magia genérica: usa apenas combate físico');
  assert.ok(pick({ dist: 14, heroDashing: true }).scores.find(x => x[0].type === 'hydra_judgment')[1] < pick({ dist: 14 }).scores.find(x => x[0].type === 'hydra_judgment')[1], 'espera o dash do herói');
  assert.notEqual(pick({ dist: 14, cds: { s1: 9 } }).move?.type, 'hydra_judgment', 'respeita a recarga');
  let same = 0; for (let s = 1; s < 40; s++) if (pick({ dist: 9, last: 's3' }, s).move.id === 's3') same++; assert.ok(same < 8, 'não repete o mesmo golpe: ' + same);
  assert.equal(pick({ dist: 4, cds: { s1: 1 } }).intent, 'kite'); assert.equal(pick({ dist: 12, cds: { s1: 1 } }).intent, null);
  assert.equal(rangeScore('hydra_judgment', 3), 0); assert.equal(rangeScore('hydra_judgment', 14), 1);
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(src.includes("case 'hydra_judgment':startHydra(m);break;") && src.includes('updateHydra(dt);') && src.includes('stopHydra();clearHazards();') && src.includes('undoHydraShake();undoCosmicShake();updatePlayerCamera(dt);'), 'integração real e limpeza');
  assert.ok(src.includes('isZarkhaelProfile(prof)?chooseZarkhaelMove('), 'Bispo 3 usa a IA por utilidade');
  assert.ok(!/function spawnEnemyProjectile|function updateEnemyProjectiles/.test(src), 'Mod 264 preservada');
  assert.ok(!/BOSS_POWERS\.fallen3=|BOSS_POWERS\.zarkhael/.test(src), 'poder genérico antigo de pilares do Bispo 3 excluído (Mod 267)');
  for (const p of ['vhazrael', 'vorgazhek', 'greed1']) assert.ok(pickMove(p, {}, 4, '') !== undefined, 'outros perfis intactos'); assert.equal(KITS.vorgazhek.skills[0].type, 'tornadoes');
});
