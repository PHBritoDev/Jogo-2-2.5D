import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWalkables } from '../eldoria-walkable.js';
import { chooseShelterCameraShoulder } from '../follow-camera-clearance3d.js';

const target = { x: 7.0639, y: 1.15, z: -78.7448 };
const yaw = -0.2629, pitch = 0.12, distance = 6;
const offset = {
  x: Math.sin(yaw) * distance * Math.cos(pitch),
  y: distance * Math.sin(pitch),
  z: Math.cos(yaw) * distance * Math.cos(pitch),
};
const pillar = { x: 6.3395, z: -76.0544, radius: 0.42, yb: -1, yt: 3.15 };
function realWalkableBlocker(name = 'abrigo-pilar') {
  const walk = createWalkables();
  walk.addPillar(pillar.x, pillar.z, pillar.radius, pillar.yb, pillar.yt, name);
  return (x, y, z) => walk.blocked(x, z, y - 0.9, () => 0);
}

test('contorna o collider circular real do abrigo e recupera o braço de 6 m', () => {
  const result = chooseShelterCameraShoulder({ target, offset, blockedAt: realWalkableBlocker() });
  assert.equal(result.direct.blocker.name, 'abrigo-pilar');
  assert.ok(Math.abs(result.angle) === 0.24);
  assert.equal(result.chosen.blocker, null);
  assert.ok(result.chosen.clearance - result.direct.clearance > 3);
});

test('não tenta contornar árvore ou outro sólido', () => {
  const result = chooseShelterCameraShoulder({
    target, offset, blockedAt: realWalkableBlocker('tronco'),
  });
  assert.equal(result.angle, 0);
  assert.equal(result.direct.blocker.name, 'tronco');
});

test('não altera a câmera quando o raio está livre', () => {
  const result = chooseShelterCameraShoulder({ target, offset, blockedAt: () => null });
  assert.equal(result.angle, 0);
  assert.equal(result.chosen.clearance, distance);
});

test('não troca de lado quando a folga dos dois desvios é equivalente', () => {
  const result = chooseShelterCameraShoulder({ target, offset, blockedAt: realWalkableBlocker(), previous: -0.24 });
  assert.equal(result.angle, -0.24);
});

test('exige ganho mínimo de folga antes de deslocar a câmera', () => {
  const result = chooseShelterCameraShoulder({ target, offset, blockedAt: realWalkableBlocker(), minGain: 4 });
  assert.equal(result.angle, 0);
});

test('rejeita coordenadas não finitas', () => {
  assert.throws(() => chooseShelterCameraShoulder({ target: { ...target, x: NaN }, offset, blockedAt: realWalkableBlocker() }), TypeError);
});

test('desvio fica isolado no braço da câmera e não muda o referencial do joystick', () => {
  const world = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(world.includes("import {chooseShelterCameraShoulder} from './follow-camera-clearance3d.js';"));
  assert.ok(world.includes('shelterCameraYawOffset=0'));
  assert.ok(world.includes('const orbitYaw=cameraYaw+shelterCameraYawOffset+'));
  assert.ok(world.includes('eldoriaWalk.blocked(x,z,y-.9,groundHeightAt)'));
  assert.ok(!world.includes('cameraYaw=baseYaw+shelterCameraYawOffset'));
  const movementStart = world.indexOf('function updatePlayerMovement(dt,now){');
  const movementEnd = world.indexOf('function protaLocomotion', movementStart);
  assert.ok(movementStart >= 0 && movementEnd > movementStart);
  const movement = world.slice(movementStart, movementEnd);
  assert.ok(movement.includes('let worldX=axisX*Math.cos(cameraYaw)+axisZ*Math.sin(cameraYaw);'));
  assert.ok(movement.includes('let worldZ=-axisX*Math.sin(cameraYaw)+axisZ*Math.cos(cameraYaw);'));
  assert.ok(!movement.includes('shelterCameraYawOffset'));
});
