import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const start = source.indexOf('function updateIlyanEscort(dt){');
const end = source.indexOf('function syncIlyanPlacement()', start);
assert.ok(start >= 0 && end > start, 'escort function must exist');
const escortSource = source.slice(start, end);

function stepEscort({ playerZ, walkable = true, startZ = -37, walkableFn = null }) {
  const holder = { visible: true, position: { x: 40, z: startZ, set(x, y, z) { this.x = x; this.z = z; } }, rotation: {} };
  const action = { paused: true };
  const context = {
    ilyanNpc: { holder, action, mixer: { update() {} } },
    inSewer: true, questStep: 5, act1Lock: false, cineActive: false, portalPull: false,
    player: { position: { x: 40, z: playerZ } },
    DIMENSIONS: { esgoto: { center: { x: 0, z: 0 } } },
    SEWER: { emptyPath: { from: { x: 40 } } }, voidSpec: { y: 0 },
    sewerWalkable: (x, z) => walkableFn ? walkableFn(x, z) : walkable
  };
  new Function(...Object.keys(context), escortSource + '; updateIlyanEscort(0.05);')(...Object.values(context));
  return { holder, action };
}

test('Ilyan continua seguindo mesmo se o jogador ultrapassa 85 unidades', () => {
  const { holder, action } = stepEscort({ playerZ: -130 });
  assert.ok(holder.position.z < -37, 'NPC must advance toward distant player');
  assert.equal(action.paused, false);
});

test('Ilyan não atravessa paredes quando o próximo ponto é bloqueado', () => {
  const { holder, action } = stepEscort({ playerZ: -130, walkable: false });
  assert.equal(holder.position.z, -37);
  assert.equal(action.paused, true);
});

test('Ilyan respeita distância de acompanhamento sem avançar sobre o jogador', () => {
  const { holder, action } = stepEscort({ playerZ: -38 });
  assert.equal(holder.position.z, -37);
  assert.equal(action.paused, true);
});

test('Ilyan desvia lateralmente quando a rota direta está bloqueada', () => {
  const { holder, action } = stepEscort({
    playerZ: -130,
    walkableFn: (x, z) => x > 40.02 && z < -37
  });
  assert.ok(holder.position.x > 40.02, 'NPC should choose a collision-safe lateral detour');
  assert.ok(holder.position.z < -37, 'NPC should keep advancing toward the corridor');
  assert.equal(action.paused, false);
});

test('Ilyan permanece parado se nenhuma direção caminhável existir', () => {
  const { holder, action } = stepEscort({ playerZ: -130, walkableFn: () => false });
  assert.equal(holder.position.z, -37);
  assert.equal(holder.position.x, 40);
  assert.equal(action.paused, true);
});
