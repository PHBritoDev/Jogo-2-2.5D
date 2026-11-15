import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTerrainPatch } from '../world3d-terrain.js';

const terrain = { height: (x, z) => x * 0.01 + z * 0.02 };

for (const [x0, x1, z0, z1, cell] of [
  [-10, 11, -40, -19, 2.5], // non-divisible span
  [-10, 10, -40, -20, 2.5], // existing divisible behavior
  [0, 0.8, 0, 0.7, 2.5], // smaller than cell
]) {
  test(`patch edges stay exact for ${x1 - x0} x ${z1 - z0} span`, () => {
    const patch = buildTerrainPatch(terrain, { x0, x1, z0, z1, cell });
    const { positions: p, nx, nz, indices } = patch;
    assert.ok(nx >= 2 && nz >= 2);
    const vertex = (i, j) => [p[(j * nx + i) * 3], p[(j * nx + i) * 3 + 2]];
    const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
    near(vertex(0, 0)[0], x0); near(vertex(0, 0)[1], z0);
    near(vertex(nx - 1, 0)[0], x1); near(vertex(0, nz - 1)[1], z1);
    near(vertex(nx - 1, nz - 1)[0], x1); near(vertex(nx - 1, nz - 1)[1], z1);
    assert.ok([...indices].every(index => index < p.length / 3));
  });
}
