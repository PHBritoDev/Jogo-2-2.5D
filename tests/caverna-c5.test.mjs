// Caverna de Eldória — C5: Galeria Alta, laço, desvios com recompensa, saída alternativa (puro + contrato).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAVE, SERRA_CLEFT, caveField, caveWalk, caveFloor, caveLedgeEdge, frontierBlocked, frontierSigned } from '../ascension-layout.js';
import { CAVE_MOODS } from '../ascension-cave-light.js';

const world = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const cave3d = fs.readFileSync(new URL('../ascension-cave3d.js', import.meta.url), 'utf8');
const S = .75, X0 = -82, Z0 = -160, NX = Math.ceil(158 / S) + 1, NZ = Math.ceil(176 / S) + 1;
const W = new Uint8Array(NX * NZ), F = new Float32Array(NX * NZ);
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = X0 + i * S, z = Z0 + j * S, k = i + j * NX; W[k] = caveWalk(x, z) ? 1 : 0; if (W[k]) F[k] = caveFloor(x, z); }
const cellOf = (x, z) => Math.round((x - X0) / S) + Math.round((z - Z0) / S) * NX;
/** Busca no grafo de células caminháveis; vizinhos só se o desnível couber num passo (STEP_UP 0,55). */
function reach(from, block = () => false) {
  const seen = new Uint8Array(NX * NZ), q = [cellOf(from[0], from[1])]; seen[q[0]] = 1;
  while (q.length) { const k = q.pop(), i = k % NX, j = (k / NX) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj, n = ii + jj * NX; if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ || seen[n] || !W[n]) continue;
      if (Math.abs(F[n] - F[k]) > .55 || block(X0 + ii * S, Z0 + jj * S)) continue; seen[n] = 1; q.push(n); } }
  return (x, z) => seen[cellOf(x, z)] === 1;
}
const all = reach([CAVE.spawn.x, CAVE.spawn.z]);
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };

test('a pé, sem degrau maior que um passo: galeria, mirante, nicho, saída da serra, cristal e portal', () => {
  const G = CAVE.chambers.find(c => c.id === 'galeria');
  for (const [n, x, z] of [['galeria', G.x, G.z], ...CAVE.relics.map(r => [r.id, r.x, r.z]), ['saida', CAVE.serraExit.b[0], CAVE.serraExit.b[1]], ['cristal', -52, -110], ['portal', CAVE.portal.x, CAVE.portal.z + 5]])
    assert.ok(all(x, z), `${n} alcançável`);
  assert.ok(caveFloor(G.x, G.z) - caveFloor(0, -46) > 5.5, 'Galeria Alta ~6 m acima do salão');
});

test('laço: do salão ao portal também sem passar pela passagem norte (salão → rampa → galeria → cristal → eco → portal)', () => {
  const norte = CAVE.corridors.find(k => k.id === 'norte');
  const noNorte = reach([0, -46], (x, z) => segD(x, z, norte.a, norte.b) < norte.r + 1.5);
  assert.ok(noNorte(CAVE.portal.x, CAVE.portal.z + 5), 'portal alcançado pelo laço');
  assert.ok(all(0, -90), 'passagem norte continua aberta');
});

test('mirante: patamar ~5 m acima do salão, borda íngreme não caminhável, nenhum vizinho caminhável com desnível de queda', () => {
  const R = CAVE.relics.find(r => r.id === 'mirante');
  assert.ok(caveFloor(R.x, R.z) - caveFloor(-12, -70) > 4, 'acima do piso do salão');
  let edges = 0; for (let z = -96; z <= -70; z += .5) for (let x = -30; x <= -16; x += .5) if (caveLedgeEdge(x, z)) edges++;
  assert.ok(edges > 40, 'faixa de borda existe');
  // em toda a caverna: duas células caminháveis vizinhas nunca têm um desnível de queda (sem "parede invisível" nem pulo de 4 m)
  let worst = 0; for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const k = i + j * NX; if (!W[k]) continue; for (const n of [k + 1, k + NX]) if (W[n]) worst = Math.max(worst, Math.abs(F[n] - F[k])); }
  assert.ok(worst < 1.2, `maior desnível entre vizinhos caminháveis: ${worst.toFixed(2)} m`);
});

test('pontos antigos continuam onde estavam (spawn, ponte, gruta, prisão, eco, portal)', () => {
  for (const [x, z] of [[0, 2], [0, -60], [-34, -61], [52, -34], [34, -100], [-4, -136]]) assert.ok(caveWalk(x, z), `${x},${z}`);
  for (const id of ['salao', 'gruta', 'portal', 'eco', 'prisao', 'cristal']) assert.ok(CAVE.chambers.some(c => c.id === id));
  for (const c of CAVE.chambers) assert.ok(CAVE_MOODS[c.id], `humor de ${c.id}`);
});

test('fenda da serra no mundo: na linha da muralha, chegada fora da rocha e livre', () => {
  assert.ok(Math.abs(frontierSigned(SERRA_CLEFT.x, SERRA_CLEFT.z)) < 1.2);
  const A = SERRA_CLEFT.arrive; assert.ok(!frontierBlocked(A.x, A.z) && frontierSigned(A.x, A.z) > 4);
  assert.ok(Math.hypot(SERRA_CLEFT.x + 72.6, SERRA_CLEFT.z + 236) > 25, 'longe da boca');
});

test('C5: contrato de integração (relíquias com estado por aparelho, saída e reentrada pela fenda, transição curta)', () => {
  assert.match(world, /const CAVE_RELIC_STORE='seven-sins-3d-caverna-reliquia-'/);
  assert.match(world, /checkCaveRelics\(Z,lx,lz,now\)/); assert.match(world, /gainXp\(XP_REWARDS\.ruin\);coins\+=r\.coins/);
  assert.match(world, /Z\.serraExit&&Math\.hypot\(lx-Z\.serraExit\.b\[0\],lz-Z\.serraExit\.b\[1\]\)<1\.6\)ascTravel\(\(\)=>\{ascLeaveToWorld\(SERRA_CLEFT\.arrive\)/);
  assert.match(world, /Math\.hypot\(P\.x-SERRA_CLEFT\.x,P\.z-SERRA_CLEFT\.z\)<SERRA_CLEFT\.enterR\+\.55/);
  assert.match(world, /\{hold:60,fast:true\}/); assert.match(world, /buildSerraCleft\(THREE,\{ground:groundHeightAt/);
  assert.match(world, /\{x:SERRA_CLEFT\.x\+6\.5,z:SERRA_CLEFT\.z-1,r:7\.5\}/, 'clareira diante da fenda');
  assert.match(cave3d, /relics, serraExit: CAVE\.serraExit/); assert.match(cave3d, /caverna-labio-mirante/);
});
