import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const start = source.indexOf('function updateIlyanEscort(dt){');
const end = source.indexOf('function syncIlyanPlacement()', start);
assert.ok(start >= 0 && end > start, 'escort function must exist');
const escortSource = source.slice(start, end);

function stepEscort({ playerZ, walkable = true, startZ = -37, walkableFn = null, ticks = 1 }) {
  const holder = { visible: true, position: { x: 40, z: startZ, set(x, y, z) { this.x = x; this.z = z; } }, rotation: {} };
  const action = { paused: true };
  const context = {
    ilyanNpc: { holder, action, mixer: { update() {} } },
    inSewer: true, questStep: 5, act1Lock: false, cineActive: false, portalPull: false,
    player: { position: { x: 40, z: playerZ } },
    DIMENSIONS: { esgoto: { center: { x: 0, z: 0 } } },
    SEWER: { emptyPath: { from: { x: 40 } } }, voidSpec: { y: 0 },
    sewerWalkable: (x, z) => walkableFn ? walkableFn(x, z) : walkable,
    ticks
  };
  new Function(...Object.keys(context), escortSource + '; for(let i=0;i<ticks;i++)updateIlyanEscort(0.05);')(...Object.values(context));
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

// Reproduz cinco segundos de acompanhamento, não apenas um único frame.
test('Ilyan mantém progresso ao longo de 100 frames com desvio lateral', () => {
  const { holder, action } = stepEscort({
    playerZ: -130,
    ticks: 100,
    walkableFn: (x, z) => x > 40.02 && z < -37
  });
  assert.ok(holder.position.z < -48, 'NPC deve avançar pelo corredor sem congelar após o desvio');
  assert.ok(holder.position.x > 40.02, 'NPC deve permanecer no lado caminhável');
  assert.equal(action.paused, false);
});

test('Ilyan atravessa o corredor REAL do esgoto até o checkpoint do portal, sem teleporte', async () => {
  const { SEWER, sewerWalkable } = await import('../sewer3d.js');
  const playerZ = SEWER.checkpoints.portal.z;
  const startZ = SEWER.checkpoints.path.z - 1.5;
  assert.ok(sewerWalkable(SEWER.emptyPath.from.x, startZ), 'ponto inicial deve ser caminhável');
  const { holder, action } = stepEscort({
    playerZ,
    startZ,
    ticks: 240,
    walkableFn: (x, z) => sewerWalkable(x, z, { portalOpen: false })
  });
  assert.ok(holder.position.z < playerZ + 2.6, 'Ilyan deve chegar perto do jogador após 12 segundos');
  assert.ok(holder.position.z > playerZ, 'Ilyan não deve atravessar o jogador');
  assert.ok(sewerWalkable(holder.position.x, holder.position.z, { portalOpen: false }), 'destino deve permanecer no chão real');
  assert.equal(action.paused, true, 'animação deve parar quando alcança o jogador');
});
