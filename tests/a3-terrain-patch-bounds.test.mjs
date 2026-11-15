import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTerrainPatch } from '../world3d-terrain.js';

// Deterministic non-flat exterior. The mesh, its skirt and collider height
// must all use the same terrain sampler, including fractional edge cells.
const terrain = { height: (x, z) => x * 0.01 + z * 0.02 };
const near = (a, b, tolerance = 1e-5) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);

for (const [x0, x1, z0, z1, cell] of [
  [-10, 11, -40, -19, 2.5], // non-divisible span
  [-10, 10, -40, -20, 2.5], // existing divisible behavior
  [0, 0.8, 0, 0.7, 2.5], // smaller than cell
  [-124, 124, -230, -126, 2.5], // long exterior strip
]) {
  test(`exterior patch has continuous cells and exact bounds: ${x1 - x0} x ${z1 - z0}`, () => {
    const skirt = 4;
    const patch = buildTerrainPatch(terrain, { x0, x1, z0, z1, cell, skirt });
    const { positions: p, nx, nz, indices } = patch;
    assert.ok(nx >= 2 && nz >= 2);
    const point = (i, j) => {
      const k = 3 * (j * nx + i);
      return [p[k], p[k + 1], p[k + 2]];
    };
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const [x, y, z] = point(i, j);
        near(x, x0 + (x1 - x0) * i / (nx - 1));
        near(z, z0 + (z1 - z0) * j / (nz - 1));
        near(y, terrain.height(x, z));
        if (i > 0) assert.ok(x > point(i - 1, j)[0], 'inverted/zero-width cell');
        if (j > 0) assert.ok(z > point(i, j - 1)[2], 'inverted/zero-depth cell');
      }
    }
    near(point(0, 0)[0], x0);
    near(point(0, 0)[2], z0);
    near(point(nx - 1, nz - 1)[0], x1);
    near(point(nx - 1, nz - 1)[2], z1);
    assert.ok([...indices].every(index => index < p.length / 3));

    // Default skirts on x0, x1 and z1: exactly three boundary strips,
    // attached to their elevated counterparts without shifting the seam.
    const boundaryIds = [
      Array.from({ length: nz }, (_, j) => j * nx),
      Array.from({ length: nz }, (_, j) => (nz - 1 - j) * nx + nx - 1),
      Array.from({ length: nx }, (_, i) => (nz - 1) * nx + i),
    ];
    let skirtIndex = nx * nz;
    for (const ids of boundaryIds) {
      for (const id of ids) {
        near(p[3 * skirtIndex], p[3 * id]);
        near(p[3 * skirtIndex + 1], p[3 * id + 1] - skirt);
        near(p[3 * skirtIndex + 2], p[3 * id + 2]);
        skirtIndex++;
      }
    }
    assert.equal(p.length / 3, skirtIndex);
    assert.equal(indices.length, 6 * (nx - 1) * (nz - 1) +
      12 * ((nz - 1) * 2 + nx - 1));
  });
}

// Fail fast instead of generating zero-area triangles or NaN vertices that
// can poison render buffers or allocate an unbounded grid on malformed data.
for (const options of [
  { x0: 1, x1: 1, z0: 0, z1: 10 },
  { x0: 2, x1: 1, z0: 0, z1: 10 },
  { x0: 0, x1: 10, z0: 3, z1: 3 },
  { x0: 0, x1: 10, z0: 5, z1: 2 },
  { x0: 0, x1: 10, z0: 0, z1: 10, cell: 0 },
  { x0: 0, x1: 10, z0: 0, z1: 10, cell: -2 },
  { x0: 0, x1: 10, z0: 0, z1: 10, skirt: -1 },
  { x0: NaN, x1: 10, z0: 0, z1: 10 },
  { x0: 0, x1: Infinity, z0: 0, z1: 10 },
]) {
  test(`invalid exterior bounds rejected: ${JSON.stringify(options)}`, () => {
    assert.throws(() => buildTerrainPatch(terrain, options), RangeError);
  });
}

// A positive but absurdly small cell is technically finite, yet would freeze
// low-memory mobile browsers while building the arrays. Reject before alloc.
for (const options of [
  { x0: 0, x1: 1000, z0: 0, z1: 1000, cell: 0.1 },
  { x0: 0, x1: 100, z0: 0, z1: 100, cell: Number.MIN_VALUE },
]) {
  test('exterior vertex budget rejects pathological resolution without allocation', () => {
    assert.throws(() => buildTerrainPatch(terrain, options), RangeError);
  });
}

// Reject malformed or duplicate skirt definitions before creating buffers.
for (const skirtEdges of [['x0', 'x0'], ['unknown'], [null], 'x0', null]) {
  test('invalid skirt edge definition rejected', () => {
    assert.throws(() => buildTerrainPatch(terrain, {
      x0: 0, x1: 10, z0: 0, z1: 10, skirtEdges,
    }), RangeError);
  });
}

test('all four boundary skirts have expected geometry', () => {
  const patch = buildTerrainPatch(terrain, {
    x0: 0, x1: 10, z0: 0, z1: 10, cell: 2.5,
    skirtEdges: ['x0', 'x1', 'z0', 'z1'],
  });
  assert.equal(patch.positions.length / 3, 25 + 20);
  assert.equal(patch.indices.length, 6 * 16 + 12 * 16);
});

test('zero-depth skirts do not generate degenerate exterior walls', () => {
  const opts = { x0: -10, x1: 11, z0: -40, z1: -19, cell: 2.5 };
  const withSkirt = buildTerrainPatch(terrain, { ...opts, skirt: 4 });
  const noSkirt = buildTerrainPatch(terrain, { ...opts, skirt: 0 });
  const noEdges = buildTerrainPatch(terrain, { ...opts, skirt: 4, skirtEdges: [] });
  const surfaceVertices = noSkirt.nx * noSkirt.nz;
  const surfaceIndices = 6 * (noSkirt.nx - 1) * (noSkirt.nz - 1);
  assert.equal(noSkirt.positions.length / 3, surfaceVertices);
  assert.equal(noSkirt.indices.length, surfaceIndices);
  assert.equal(noEdges.positions.length, noSkirt.positions.length);
  assert.equal(noEdges.indices.length, noSkirt.indices.length);
  assert.ok(withSkirt.positions.length > noSkirt.positions.length);
  assert.ok(withSkirt.indices.length > noSkirt.indices.length);
  assert.deepEqual([...noSkirt.positions], [...noEdges.positions]);
  assert.deepEqual([...noSkirt.indices], [...noEdges.indices]);
});
