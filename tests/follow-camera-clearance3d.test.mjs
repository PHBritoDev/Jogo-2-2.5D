import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWalkables } from '../eldoria-walkable.js';
import { SHELTER } from '../eldoria-shelter3d.js';
import { chooseShelterCameraShoulder } from '../follow-camera-clearance3d.js';

const target = { x: 7.0639, y: 1.15, z: -78.7448 };
const yaw = -0.2629, pitch = 0.12, distance = 6;
const offset = {
  x: Math.sin(yaw) * distance * Math.cos(pitch),
  y: distance * Math.sin(pitch),
  z: Math.cos(yaw) * distance * Math.cos(pitch),
};
function pointAt(angle, t) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const ox = offset.x * c + offset.z * s;
  const oz = -offset.x * s + offset.z * c;
  return { x: target.x + ox * t, y: target.y + offset.y * t, z: target.z + oz * t };
}
function hash(i, seed) {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function realShelterWalkables() {
  const walk = createWalkables(), seed = 2, shelterYaw = 0.7, x = 6.5, z = -79, y = 0.888;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2 + (hash(seed, k) - 0.5) * 0.12 + shelterYaw;
    const broken = k === seed % 4;
    const h = broken ? SHELTER.pillarH * 0.46 : SHELTER.pillarH * (0.92 + hash(seed, k + 9) * 0.1);
    walk.addPillar(
      x + Math.sin(a) * SHELTER.pillarR,
      z + Math.cos(a) * SHELTER.pillarR,
      0.42, y - 1, y + h + 0.4, 'abrigo-pilar'
    );
  }
  return walk;
}
const walkBlocker = walk => (x, y, z) => walk.blocked(x, z, y - 0.9, () => 0);

test('contorna um dos quatro colliders reais do abrigo e recupera o braço de 6 m', () => {
  const result = chooseShelterCameraShoulder({ target, offset, blockedAt: walkBlocker(realShelterWalkables()) });
  assert.equal(result.direct.triggerBlocker.name, 'abrigo-pilar');
  assert.equal(result.angle, 0.24);
  assert.equal(result.chosen.blocker, null);
  assert.equal(result.chosen.clearance, distance);
  assert.ok(result.chosen.clearance >= result.requiredClearance);
});

test('não desvia por árvore quando nenhum pilar está no braço direto', () => {
  const tree = pointAt(0, 0.2);
  const blockedAt = (x, y, z) => Math.hypot(x - tree.x, z - tree.z) < 0.16 ? { name: 'tree' } : null;
  const result = chooseShelterCameraShoulder({ target, offset, blockedAt });
  assert.equal(result.angle, 0);
  assert.equal(result.direct.blocker.name, 'tree');
  assert.equal(result.direct.triggerBlocker, null);
});

test('detecta pilar atrás de uma árvore e escolhe um corredor que libera ambos', () => {
  const walk = realShelterWalkables(), tree = pointAt(0, 0.18);
  const blockedAt = (x, y, z) => {
    if (Math.hypot(x - tree.x, z - tree.z) < 0.16) return { name: 'tree' };
    return walk.blocked(x, z, y - 0.9, () => 0);
  };
  const result = chooseShelterCameraShoulder({ target, offset, blockedAt });
  assert.equal(result.direct.blocker.name, 'tree');
  assert.equal(result.direct.triggerBlocker.name, 'abrigo-pilar');
  assert.equal(result.angle, 0.24);
  assert.equal(result.chosen.blocker, null);
});

test('procura ângulo maior quando os dois desvios curtos continuam obstruídos', () => {
  const walk = realShelterWalkables();
  const shortSideTrees = [pointAt(0.24, 0.55), pointAt(-0.24, 0.55)];
  const blockedAt = (x, y, z) => {
    const tree = shortSideTrees.find(p => Math.hypot(x - p.x, z - p.z) < 0.17);
    if (tree) return { name: 'tree' };
    return walk.blocked(x, z, y - 0.9, () => 0);
  };
  const result = chooseShelterCameraShoulder({ target, offset, blockedAt });
  assert.equal(result.direct.triggerBlocker.name, 'abrigo-pilar');
  assert.ok(Math.abs(result.angle) >= 0.42);
  assert.equal(result.chosen.blocker, null);
});

test('rejeita desvio que melhora a folga mas ainda deixa o braço curto', () => {
  const walk = realShelterWalkables();
  const blockedAt = (x, y, z) => {
    const wall = walk.blocked(x, z, y - 0.9, () => 0);
    if (wall) return wall;
    if (Math.hypot(x - target.x, z - target.z) > 3.1) return { name: 'tree' };
    return null;
  };
  const result = chooseShelterCameraShoulder({ target, offset, blockedAt });
  assert.equal(result.angle, 0);
  assert.ok(result.chosen.clearance < result.requiredClearance);
});

test('não altera a câmera quando o braço direto está livre', () => {
  const result = chooseShelterCameraShoulder({ target, offset, blockedAt: () => null });
  assert.equal(result.angle, 0);
  assert.equal(result.chosen.clearance, distance);
  assert.equal(result.triggered, false);
});

test('mantém o lado anterior quando ambos têm folga equivalente', () => {
  const result = chooseShelterCameraShoulder({
    target, offset, blockedAt: walkBlocker(realShelterWalkables()), previous: -0.24
  });
  assert.equal(result.angle, -0.24);
});

test('exige ganho mínimo de folga antes de deslocar a câmera', () => {
  const result = chooseShelterCameraShoulder({
    target, offset, blockedAt: walkBlocker(realShelterWalkables()), minGain: 4
  });
  assert.equal(result.angle, 0);
});

test('rejeita coordenadas não finitas', () => {
  assert.throws(() => chooseShelterCameraShoulder({
    target: { ...target, x: NaN }, offset, blockedAt: walkBlocker(realShelterWalkables())
  }), TypeError);
});

test('desvio permanece no braço da câmera e não altera o referencial do joystick', () => {
  const world = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(world.includes("import {chooseShelterCameraShoulder} from './follow-camera-clearance3d.js';"));
  assert.ok(world.includes('shelterCameraYawOffset=0'));
  assert.ok(world.includes('const orbitYaw=cameraYaw+shelterCameraYawOffset+'));
  assert.ok(world.includes('const nearbyTrees=treeObstacles.filter'));
  assert.ok(world.includes('rocksBlock(rockObstacles,x,z,y-.25,terrainHeightAt)'));
  assert.ok(world.includes('samples:24,minClearance:Math.max(3.2,camDistUse*.65)'));
  assert.ok(world.includes('shelterCameraState(){return a1ShelterCameraDiagnostics;}'));
  assert.ok(!world.includes('cameraYaw=baseYaw+shelterCameraYawOffset'));
  const movementStart = world.indexOf('function updatePlayerMovement(dt,now){');
  const movementEnd = world.indexOf('function protaLocomotion', movementStart);
  assert.ok(movementStart >= 0 && movementEnd > movementStart);
  const movement = world.slice(movementStart, movementEnd);
  assert.ok(movement.includes('let worldX=axisX*Math.cos(cameraYaw)+axisZ*Math.sin(cameraYaw);'));
  assert.ok(movement.includes('let worldZ=-axisX*Math.sin(cameraYaw)+axisZ*Math.cos(cameraYaw);'));
  assert.ok(!movement.includes('shelterCameraYawOffset'));
});
