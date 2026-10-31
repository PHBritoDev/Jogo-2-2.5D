import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DestructionSphere, CelestialExplosion, SPHERE, CELESTIAL } from './sakuga-skills3d.js';

const tgt = (o = {}) => ({ id: 1, alive: true, x: 0, y: 0, z: 12, radius: .6, height: 1.9, ...o });
const run = (s, secs, t, dt = 1 / 60) => { for (let i = 0; i < Math.round(secs / dt); i++) s.update(dt, t); };

test('Esfera: ergue a mão, concentra, voa de verdade e acerta uma vez; cúpula só perto do contato', () => {
  const hits = [], ev = [], s = new DestructionSphere({ hit: (d, id, k) => hits.push(k), event: e => ev.push(e) }); const t = tgt();
  s.start({ x: 0, y: 0, z: 0 }, t, 0); run(s, SPHERE.raise + SPHERE.charge - .05, t); assert.equal(hits.length, 0); assert.ok(['raise', 'charge'].includes(s.phase));
  run(s, .1, t); assert.equal(s.phase, 'fly'); assert.ok(Math.hypot(s.p.x - t.x, s.p.z - t.z) > 8, 'nasce na mão, longe do alvo');
  run(s, 3, t); assert.deepEqual(hits, ['sphere', 'dome']); assert.ok(ev.includes('impact')); assert.equal(s.active, false);
});

test('Esfera: parede/chão param o voo sem dano; alvo morto ou contexto inválido cancela sem dano', () => {
  const hits = [], wall = new DestructionSphere({ hit: () => hits.push(1), blocked: p => p.z > 5 && p.z < 6 }); wall.start({ x: 0, y: 0, z: 0 }, tgt(), 0); run(wall, 3, tgt());
  assert.equal(hits.length, 0); assert.equal(wall.why, 'wall');
  const c = new DestructionSphere({ hit: () => hits.push(1) }); c.start({ x: 0, y: 0, z: 0 }, tgt(), 0); c.update(1 / 60, tgt(), { valid: false }); assert.equal(c.active, false); assert.equal(hits.length, 0);
});

test('Explosão Celestial: círculos seguem só no começo e travam; pilar no núcleo; onda baixa saltável; um dano por fase', () => {
  const mk = () => { const hits = []; return { hits, s: new CelestialExplosion({ hit: (d, id, k) => hits.push(k) }) }; };
  { const { s, hits } = mk(), t = tgt(); s.start({ x: 0, y: 0, z: 0 }, t, 0); run(s, CELESTIAL.charge + CELESTIAL.follow + .1, t); const lock = { ...s.at }; t.x = 10; run(s, .2, t); assert.deepEqual({ x: s.at.x, z: s.at.z }, { x: lock.x, z: lock.z }, 'travou');
    run(s, 3, t); assert.equal(hits.length, 0, 'saiu do raio a tempo'); }
  { const { s, hits } = mk(), t = tgt(); s.start({ x: 0, y: 0, z: 0 }, t, 0); run(s, 4, t); assert.deepEqual(hits, ['pillar', 'wave']); }
  { const { s, hits } = mk(), t = tgt(); s.start({ x: 0, y: 0, z: 0 }, t, 0); run(s, CELESTIAL.charge + CELESTIAL.circles + .02, t); t.x = 4.5; t.y = 1.2; run(s, 3, t); assert.deepEqual(hits, [], 'fora do núcleo e no ar sobre a onda'); }
});

test('20 lançamentos seguidos de cada poder não acumulam estado', () => {
  for (const C of [DestructionSphere, CelestialExplosion]) { let n = 0; const s = new C({ hit: () => n++ }); for (let i = 0; i < 20; i++) { assert.ok(s.start({ x: 0, y: 0, z: 0 }, tgt(), 0)); run(s, 5, tgt()); assert.equal(s.active, false); }
    assert.ok(n >= 20 && n <= 40); }
});

test('Integração atrás da flag ?vfxSakuga=1: jogo padrão inalterado, mesmos ids/saves dos slots, hitstop só em acerto', () => {
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.match(src, /const SAKUGA=new URLSearchParams\(location\.search\)\.has\('vfxSakuga'\)/);
  assert.match(src, /if\(SAKUGA\)\{\n EXTRA_RUN\.skill_twin_portals=new DestructionSphere/);
  assert.match(src, /EXTRA_RUN\.skill_judgment_dragon=new CelestialExplosion/);
  assert.match(src, /const EXTRA_RUN=\{skill_x_rupture:xRupture,skill_twin_portals:twinPortals,skill_judgment_dragon:judgmentDragon\};/, 'padrão continua com Portais e Dragão');
  assert.match(src, /xVFX=SAKUGA\?createSakugaXVFX\(THREE,scene,g\):createXRuptureVFX\(THREE,scene,g\)/);
  assert.match(src, /function sakugaHit\(ms,shake\)\{const n=performance\.now\(\);if\(n<sakugaHitCd\)return;/);
});
