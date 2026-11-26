import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyUndergrowthCameraFade, planTropical, TROPICAL_SPECIES_HEIGHTS, UNDERGROWTH_CAMERA_FADE_METERS, vineGeometry } from '../eldoria-undergrowth.js';

const trees = Array.from({ length: 20 }, (_, i) => ({ x: i * 4, z: 0, h: 12 }));
const world = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

function tropicalGlbHeights() {
  const bytes = readFileSync(new URL('../EldoriaArvoresTropicais.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  return Object.fromEntries(gltf.nodes
    .filter(node => node.extras?.especie && node.extras.lod === 0)
    .map(node => [node.extras.especie, node.extras.height]));
}

function vineGeometryYBounds() {
  class Geometry {
    constructor() { this.attributes = {}; }
    setAttribute(name, attribute) { this.attributes[name] = attribute; }
    computeVertexNormals() {}
    computeBoundingSphere() {}
  }
  class Attribute {
    constructor(values, itemSize) { this.array = Float32Array.from(values); this.itemSize = itemSize; }
  }
  const geometry = vineGeometry({ BufferGeometry: Geometry, Float32BufferAttribute: Attribute });
  const positions = geometry.attributes.position.array;
  let min = Infinity, max = -Infinity;
  for (let i = 1; i < positions.length; i += 3) {
    min = Math.min(min, positions[i]);
    max = Math.max(max, positions[i]);
  }
  return { min, max };
}

function vineFootprintFree(isFree, x, z) {
  const radius = .4, gridSteps = 4;
  for (let ix = -gridSteps; ix <= gridSteps; ix++) {
    for (let iz = -gridSteps; iz <= gridSteps; iz++) {
      const dx = ix * radius / gridSteps, dz = iz * radius / gridSteps;
      if (dx * dx + dz * dz > radius * radius + 1e-9) continue;
      if (!isFree(x + dx, z + dz)) return false;
    }
  }
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI * 2 / 16;
    if (!isFree(x + Math.cos(a) * radius, z + Math.sin(a) * radius)) return false;
  }
  return true;
}

test('cipós tropicais respeitam o corredor livre, assim como as folhas', () => {
  const isFree = (x, z) => Math.abs(z) > 2.2;
  const plan = planTropical({ trees, zone: null, isFree, seed: 2926 });
  const unobstructed = planTropical({ trees, zone: null, isFree: () => true, seed: 2926 });

  assert.ok(plan.leaves.length > 0, 'folhas continuam presentes fora da trilha');
  assert.ok(plan.vines.length > 0, 'cipós continuam presentes nas laterais');
  assert.equal(unobstructed.vines.length, 40, 'o filtro não altera a densidade quando todo o terreno está livre');
  assert.ok(plan.vines.length < unobstructed.vines.length, 'cipós dentro do corredor são removidos');
  assert.ok(plan.leaves.every(p => isFree(p.x, p.z)), 'folhas respeitam a máscara');
  assert.ok(plan.vines.every(p => vineFootprintFree(isFree, p.x, p.z)), 'a malha completa e sua oscilação ficam fora do corredor');
});

test('cipó é rejeitado quando a máscara bloqueia um bolsão dentro do envelope', () => {
  const singleTree = [{ x: 0, z: 0, h: 12 }];
  const baseline = planTropical({ trees: singleTree, zone: null, isFree: () => true, seed: 2926 });
  const target = baseline.vines[0];
  // O bloqueio fica a 0,2 m na direção longitudinal da malha, fora do centro e do anel de 0,4 m.
  const blockedX = target.x + Math.cos(target.rot) * .2;
  const blockedZ = target.z - Math.sin(target.rot) * .2;
  const isFree = (x, z) => Math.hypot(x - blockedX, z - blockedZ) > .025;

  assert.ok(isFree(target.x, target.z), 'o pivô continua livre');
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI * 2 / 16;
    assert.ok(isFree(target.x + Math.cos(a) * .4, target.z + Math.sin(a) * .4), 'o perímetro continua livre');
  }
  assert.equal(isFree(blockedX, blockedZ), false, 'o bolsão interno está bloqueado');

  const filtered = planTropical({ trees: singleTree, zone: null, isFree, seed: 2926 });
  assert.ok(!filtered.vines.some(v => v.x === target.x && v.z === target.z), 'o cipó que cobre o bolsão é removido');
});

test('sem área livre, nenhum cipó ou folha é planejado', () => {
  const plan = planTropical({ trees, zone: null, isFree: () => false, seed: 2926 });
  assert.equal(plan.leaves.length, 0);
  assert.equal(plan.vines.length, 0);
});

test('o cinturão real conecta buildTropical à máscara de trilhas e clareiras', () => {
  assert.match(world, /import \{buildUndergrowth,buildTropical\} from '\.\/eldoria-undergrowth\.js'/);
  assert.match(world, /const beltTropical=buildTropical\(THREE,\{[\s\S]{0,900}?isFree:\(x,z\)=>beltFree\(x,z,-1\.5\)\}\);/);
});

test('filtrar cipós não desloca o RNG das folhas nem das árvores seguintes', () => {
  const pair = [{ x: 0, z: 0, h: 12 }, { x: 100, z: 0, h: 12 }];
  const unobstructed = planTropical({ trees: pair, zone: null, isFree: () => true, seed: 2926 });
  const filtered = planTropical({
    trees: pair,
    zone: null,
    isFree: (x, z) => Math.hypot(x, z) >= 2.2,
    seed: 2926
  });

  assert.deepEqual(filtered.leaves, unobstructed.leaves, 'folhas e sequência das árvores seguintes permanecem idênticas');
  assert.deepEqual(
    filtered.vines,
    unobstructed.vines.filter(v => vineFootprintFree((x, z) => Math.hypot(x, z) >= 2.2, v.x, v.z)),
    'somente os cipós dentro da máscara são removidos; os seguintes conservam os mesmos dados'
  );
  assert.ok(filtered.vines.length < unobstructed.vines.length, 'o caso determinístico realmente filtra um cipó');
});

test('árvores do plano tropical sem h explícito geram cipós finitos e respeitam a escala', () => {
  // Forma real de planTropicalBelt: sp/s existem; h não é emitido pelo planejador.
  const forestTrees = [
    { sp: 'sumauma', x: 0, z: 0, s: 1.1 },
    { sp: 'figueira', x: 12, z: 0, s: .9 },
    { sp: 'copaLarga', x: 24, z: 0, s: 1 },
    { sp: 'palmeira', x: 36, z: 0, s: 1 },
    { sp: 'embauba', x: 48, z: 0, s: 1 }
  ];
  const plan = planTropical({ trees: forestTrees, zone: null, isFree: () => true, seed: 2926 });
  assert.ok(plan.vines.length > 0, 'a mata mantém cipós nas árvores');
  assert.ok(plan.vines.every(v => Number.isFinite(v.top) && Number.isFinite(v.len) && v.top > 0 && v.len > 0),
    'nenhum cipó pode receber posição/comprimento NaN');

  const tall = planTropical({ trees: [{ sp: 'sumauma', x: 0, z: 0, s: 1 }], zone: null, isFree: () => true, seed: 2926 });
  const regular = planTropical({ trees: [{ sp: 'figueira', x: 0, z: 0, s: 1 }], zone: null, isFree: () => true, seed: 2926 });
  const explicit = planTropical({ trees: [{ sp: 'sumauma', x: 0, z: 0, s: 1, h: 10 }], zone: null, isFree: () => true, seed: 2926 });
  assert.deepEqual(
    TROPICAL_SPECIES_HEIGHTS,
    tropicalGlbHeights(),
    'as alturas fallback precisam acompanhar extras.height do GLB real'
  );
  for (const [sp, baseHeight] of Object.entries(TROPICAL_SPECIES_HEIGHTS)) {
    const scale = 1.1;
    const sample = planTropical({
      trees: [{ sp, x: 0, z: 0, s: scale }],
      zone: null,
      isFree: () => true,
      seed: 2926
    });
    assert.ok(sample.vines.length > 0, sp + ' precisa manter cipós');
    for (const vine of sample.vines) {
      assert.ok(vine.top >= baseHeight * scale * .62 - 1e-9 && vine.top <= baseHeight * scale * .82 + 1e-9,
        sp + ' top usa extras.height × escala');
      assert.ok(vine.len >= baseHeight * scale * .35 - 1e-9 && vine.len <= baseHeight * scale * .70 + 1e-9,
        sp + ' len usa extras.height × escala');
    }
  }
  assert.ok(explicit.vines[0].len < tall.vines[0].len, 'h explícito do cinturão continua tendo precedência');
});
 
test('a menor coordenada renderizada de cada cipó mantém 20 cm de folga do terreno', () => {
  const species = ['sumauma', 'figueira', 'copaLarga', 'palmeira', 'embauba'];
  const forestTrees = Array.from({ length: 20 }, (_, i) => ({
    sp: species[i % species.length],
    x: i * 12,
    z: 0,
    s: .75 + (i % 9) * .05
  }));
  const plan = planTropical({
    trees: forestTrees,
    zone: null,
    isFree: () => true,
    seed: 4242
  });
  const bounds = vineGeometryYBounds();

  assert.ok(plan.vines.length > 0, 'o cinturão continua produzindo cipós');
  assert.ok(Number.isFinite(bounds.min) && Math.abs(bounds.max - 1) < 1e-6,
    'os limites usados pelo posicionamento correspondem à geometria real');
  assert.ok(
    plan.vines.every(v => v.top - v.len + bounds.min * v.len >= .2 - 1e-6),
    'incluindo folíolos abaixo da origem, nenhuma parte renderizada fica a menos de 20 cm do terreno'
  );
});

test('sub-bosque faz fade pontilhado até 3,2 m sem alpha blending nem perda de instâncias', () => {
  const calls = [];
  const material = {
    userData: {},
    onBeforeCompile(shader) { calls.push('wind'); shader.fragmentShader += '\n// vento preservado'; },
    customProgramCacheKey() { return 'mod291-fern-wind'; }
  };
  applyUndergrowthCameraFade(material);
  const shader = { fragmentShader: '#include <clipping_planes_fragment>\nvoid main() {}' };
  material.onBeforeCompile(shader, {});
  assert.equal(UNDERGROWTH_CAMERA_FADE_METERS, 3.2);
  assert.deepEqual(calls, ['wind'], 'o shader de vento anterior continua encadeado');
  assert.match(shader.fragmentShader, /a3UnderFade=clamp\(\(length\(vViewPosition\)-0\.6\)\/3\.20/);
  assert.match(shader.fragmentShader, /if\(a3UnderFade<0\.999&&a3UnderDither>a3UnderFade\)discard/);
  assert.match(shader.fragmentShader, /vento preservado/);
  assert.match(material.customProgramCacheKey(), /mod291-fern-wind\|a3-undergrowth-near-fade-3\.20/);
  const key = material.customProgramCacheKey();
  applyUndergrowthCameraFade(material);
  assert.equal(material.customProgramCacheKey(), key, 'aplicar duas vezes não duplica o shader');
  assert.equal(material.needsUpdate, true);
});

test('fernMat e bushMat recebem o fade ambiental e o A/B inclui a pose inicial da mata', () => {
  const source = readFileSync(new URL('../eldoria-undergrowth.js', import.meta.url), 'utf8');
  const harness = readFileSync(new URL('../tools/visual-lab/a3-meadow-visibility-qa.cjs', import.meta.url), 'utf8');
  assert.match(source, /applyUndergrowthCameraFade\(fernMat\)/);
  assert.match(source, /applyUndergrowthCameraFade\(bushMat\)/);
  assert.match(harness, /id: "mata-entrada-inicial", x: -14, z: -82, yaw: 0, pitch: \.12, distance: 6/);
  assert.match(source, /const ferns = new THREE\.InstancedMesh/);
  assert.match(source, /const bushes = new THREE\.InstancedMesh/);
});
