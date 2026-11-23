import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DIMENSIONS, arenaSpots } from '../dimensions3d.js';
import { getZarkhaelLighting } from '../zarkhael-dimension3d.js';

test('Zar’khael keeps the black corridor and concentrates the existing fill on both combatants', () => {
  const env = getZarkhaelLighting();
  assert.equal(env.bg, 0x010102);
  assert.equal(env.fog, 0x010102);
  assert.deepEqual(env.hemi, [0xb7b1af, 0x110608, .48]);
  assert.deepEqual(env.sun, [0xffe8dc, 1.0]);
  assert.deepEqual(env.light, [0xdfe6f2, 4.2, 48, [0, 8, 4]]);
  assert.equal(env.exposure, .85);

  const center = DIMENSIONS.bishop3.center;
  const spots = arenaSpots('bishop3');
  const [lx, ly, lz] = env.light[3];
  const distanceTo = (spot, y = 1.7) =>
    Math.hypot(spot.x - center.x - lx, y - ly, spot.z - center.z - lz);
  assert.ok(distanceTo(spots.player) < env.light[2], 'player spawn must be inside the local fill');
  assert.ok(distanceTo(spots.boss) < env.light[2], 'boss spawn must be inside the local fill');
  assert.ok(Math.hypot(lx, 3.5 - ly, -210 - lz) > env.light[2],
    'distant corridor must remain outside the local fill');
});

test('the fill reuses the arena’s existing light rig and adds no scene lights or render passes', () => {
  const source = readFileSync(new URL('../zarkhael-dimension3d.js', import.meta.url), 'utf8');
  const arenas = readFileSync(new URL('../dimension-arenas3d.js', import.meta.url), 'utf8');
  assert.match(source, /return getZarkhaelLighting\(\);/);
  assert.doesNotMatch(source, /new\s+(?:THREE|T)\.(?:PointLight|SpotLight|DirectionalLight|HemisphereLight)\b/);
  assert.doesNotMatch(source, /WebGLRenderTarget|EffectComposer|ShadowMap/);
  assert.match(arenas, /mushrooms\s*:\s*buildMushroomDimension/);
});
