import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { lightningBolt, groundNormal, smooth, easeOut } from './celestial-fxkit3d.js';
import { CelestialStarfall, STARFALL } from './celestial-starfall3d.js';
const src = f => readFileSync(new URL('./' + f, import.meta.url), 'utf8');
test('MOD 229: raio ramificado é determinístico e cabe no buffer fixo', () => {
  const a = Array(40).fill(null), b = Array(40).fill(null);
  const n1 = lightningBolt(7, 0, 50, 0, 10, 0, 5, a), n2 = lightningBolt(7, 0, 50, 0, 10, 0, 5, b);
  assert.equal(n1, n2); assert.deepEqual(a.slice(0, n1), b.slice(0, n2)); assert(n1 <= 40 && n1 > 3);
  assert.deepEqual(a[n1 - 1] && a[0].slice(0, 3), [0, 50, 0]);
});
test('MOD 229: normal do terreno assenta decalques em encostas', () => {
  const flat = groundNormal(() => 2, 0, 0); assert(Math.abs(flat[1] - 1) < 1e-9);
  const slope = groundNormal((x) => x * .5, 0, 0); assert(slope[0] < 0 && slope[1] < 1 && Math.abs(Math.hypot(...slope) - 1) < 1e-9);
  assert.equal(smooth(-1), 0); assert.equal(smooth(2), 1); assert.equal(easeOut(1), 1);
});
test('MOD 229: Skill 2 — estrelas pesadas pontuam cada salva sem mudar o dano (60 acertos)', () => {
  const hits = []; const s = new CelestialStarfall({ hit: () => hits.push(1) }); const t = { id: 1, alive: true, x: 0, y: 1.15, z: 0 };
  s.start({ x: 0, y: 1.7, z: 0 }, t); for (let i = 0; i < 1300; i++) s.update(1 / 120, t);
  assert.equal(s.stars.filter(x => x.heavy).length, 9); assert.equal(hits.length, 60); assert.equal(STARFALL.count, 90);
});
test('Ultimate carrega o par Meshy com a malha indexada e a textura autoral',()=>{
 const file=readFileSync(new URL('./AsasAnjo_leve.glb',import.meta.url));
 const gltf=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)));
 const prim=gltf.meshes[0].primitives[0];
 assert.equal(gltf.accessors[prim.indices].count,609993);
 assert(gltf.accessors[prim.attributes.TEXCOORD_0]);
 assert(gltf.images.length>0);
});
test('MOD 229: Skill 3 — lease do alvo capturado sempre devolve o inimigo ao chão', () => {
  const m = src('mundo-3d-prototype.js');
  assert(/function releasePhoenixHold\(\)\{[^}]*terrainHeightAt/.test(m));
  assert(/finally\{applyPhoenixHold\(\);\}/.test(m), 'aplica/solta o lease mesmo com exceção');
  assert(/if\(phoenixHold\)\{enemyKnockback=0;/.test(m), 'IA pausada enquanto preso');
});
