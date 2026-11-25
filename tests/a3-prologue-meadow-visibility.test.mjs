import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BROKEN_WHEEL, FALL_SPOT, PROLOGUE_MEADOW, TEREN_ROAD, TEREN_STOP } from '../act1-world-layout.js';
import { planMeadow } from '../eldoria-prologue-meadow.js';

const options = {
  meadow: PROLOGUE_MEADOW,
  road: TEREN_ROAD,
  fall: FALL_SPOT,
  wheel: BROKEN_WHEEL,
  stop: TEREN_STOP,
  isFree: () => true,
  seed: 2911
};

function distanceToRoad(x, z) {
  let best = Infinity;
  for (let i = 1; i < TEREN_ROAD.length; i++) {
    const a = TEREN_ROAD[i - 1], b = TEREN_ROAD[i], dx = b[0] - a[0], dz = b[1] - a[1];
    const len2 = dx * dx + dz * dz;
    const t = len2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len2)) : 0;
    best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return best;
}

function maxBladeHeight(tuft, index) {
  // A geometria tem lâminas de até 0,77 m; a escala vertical também varia por instância.
  return .77 * tuft.s * (.8 + (index % 5) * .1) * tuft.heightScale;
}

test('capim no corredor visual da estrada fica abaixo da silhueta do protagonista', () => {
  const plan = planMeadow(options);
  const shoulder = plan.tufts.map((tuft, index) => ({
    tuft,
    distance: distanceToRoad(tuft.x, tuft.z),
    height: maxBladeHeight(tuft, index)
  })).filter(item => item.distance < 6);

  assert.ok(shoulder.length > 0, 'há amostras no ombro da estrada/câmera');
  assert.ok(shoulder.every(item => item.tuft.heightScale < 1), 'o ombro recebe altura reduzida');
  assert.ok(shoulder.every(item => item.height <= 1.05), 'capim a até 6 m da rota não passa de 1,05 m');
});

test('manchas distantes preservam capim alto e o plano continua determinístico', () => {
  const first = planMeadow(options), second = planMeadow(options);
  assert.deepEqual(first, second, 'mesma seed produz o mesmo prado');
  const distant = first.tufts.map((tuft, index) => ({
    tuft,
    distance: distanceToRoad(tuft.x, tuft.z),
    height: maxBladeHeight(tuft, index)
  })).filter(item => item.distance >= 10);

  assert.ok(distant.length > 0, 'o campo ainda tem manchas fora do corredor');
  assert.ok(distant.every(item => item.tuft.heightScale === 1), 'capim distante mantém a altura original');
  assert.ok(distant.some(item => item.height > 1.2), 'o campo continua tendo capim alto');
});

test('a queda em FALL_SPOT mantém vegetação legível em baixo e alto sem esvaziar o prado', () => {
  for (const lowSpec of [false, true]) {
    const plan = planMeadow({ ...options, lowSpec });
    const nearby = plan.tufts.map((tuft, index) => ({
      tuft,
      distance: Math.hypot(tuft.x - FALL_SPOT.x, tuft.z - FALL_SPOT.z),
      height: maxBladeHeight(tuft, index)
    })).filter(item => item.distance <= 8);

    assert.ok(nearby.length >= (lowSpec ? 35 : 70), lowSpec ? 'low preserva densidade próxima ao spawn' : 'high preserva densidade próxima ao spawn');
    assert.ok(nearby.every(item => item.tuft.heightScale < 1), 'vegetação no entorno inicial recebe altura reduzida');
    assert.ok(nearby.every(item => item.height <= 1.05), 'vegetação no entorno inicial não ultrapassa 1,05 m');
    assert.ok(nearby.some(item => item.height > .55), 'o prado mantém variação e não vira gramado raspado');
  }
});

test('o fator de altura é aplicado só ao eixo vertical do InstancedMesh real', () => {
  const source = readFileSync(new URL('../eldoria-prologue-meadow.js', import.meta.url), 'utf8');
  const world = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

  assert.match(source, /const heightScale = t\.heightScale \?\? 1/);
  assert.match(source, /dummy\.scale\.set\(t\.s, t\.s \* \(\.8 \+ \(i % 5\) \* \.1\) \* heightScale, t\.s\)/);
  assert.match(world, /const prologueMeadow=buildPrologueMeadow\(THREE,\{[\s\S]{0,500}?road:TEREN_ROAD/);
});

test('harness A/B falha fechado em console, módulos candidatos, oclusão e deriva de câmera', () => {
  const harness = readFileSync(new URL('../tools/visual-lab/a3-meadow-visibility-qa.cjs', import.meta.url), 'utf8');
  assert.match(harness, /candidate\\.moduleHits\\[file\\]/, 'a candidata precisa carregar os dois módulos alterados');
  assert.match(harness, /session\\.errors\\.console\\.length/, 'erros de console precisam reprovar a sessão');
  assert.match(harness, /heroPositionDelta/, 'o par compara a posição 3D completa do protagonista');
  assert.match(harness, /if \\(cam > \\.25\\)/, 'a câmera precisa coincidir nas duas cenas');
  assert.match(harness, /cameraClear\\(/, 'o protagonista precisa estar enquadrado e sem oclusão');
});
