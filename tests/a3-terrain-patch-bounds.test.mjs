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

// Exterior patches must not propagate a corrupt terrain sampler into WebGL.
// An invalid height in an interior cell or along a skirt is equally unsafe.
for (const height of [() => NaN, () => Infinity, (x, z) => x > 2 && z > 2 ? -Infinity : 0]) {
  test('non-finite exterior terrain heights fail before GPU buffer creation', () => {
    assert.throws(() => buildTerrainPatch({ height }, {
      x0: 0, x1: 10, z0: 0, z1: 10, cell: 2.5,
    }), /non-finite terrain height/);
  });
}


test('finite Float64 heights that overflow GPU Float32 positions are rejected', () => {
  assert.throws(() => buildTerrainPatch({ height: () => 1e100 }, {
    x0: 0, x1: 10, z0: 0, z1: 10, cell: 2.5,
  }), /exterior position exceeds Float32 range/);
});

test('finite Float64 world coordinates that overflow GPU Float32 positions are rejected', () => {
  assert.throws(() => buildTerrainPatch(terrain, {
    x0: 1e100, x1: 1e100 + 1e90, z0: 0, z1: 10, cell: 1e90,
  }), /exterior position exceeds Float32 range/);
});

test('large but representable exterior coordinates remain valid', () => {
  const patch = buildTerrainPatch({ height: () => 1000 }, {
    x0: 100000, x1: 100010, z0: -100000, z1: -99990, cell: 2.5,
  });
  assert.ok([...patch.positions].every(Number.isFinite));
});

test('tiny but finite exterior cells do not collapse into GPU zero-area triangles', () => {
  assert.throws(() => buildTerrainPatch({ height: () => 0 }, {
    x0: 100000, x1: 100000.001, z0: 0, z1: 10, cell: 2.5,
  }), /cells collapse in Float32/);
});

test('adjacent large-world coordinates remain strictly ordered in Float32', () => {
  const patch = buildTerrainPatch({ height: () => 0 }, {
    x0: 100000, x1: 100010, z0: -100000, z1: -99990, cell: 2.5,
  });
  const { positions, nx, nz } = patch;
  for (let j = 0; j < nz; j++) {
    for (let i = 1; i < nx; i++) {
      assert.ok(positions[3 * (j * nx + i)] > positions[3 * (j * nx + i - 1)]);
    }
  }
  for (let j = 1; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      assert.ok(positions[3 * (j * nx + i) + 2] > positions[3 * ((j - 1) * nx + i) + 2]);
    }
  }
});

test('exterior skirt rejects Float32 underflow while the surface remains valid', () => {
  const opts = { x0: 0, x1: 10, z0: 0, z1: 10, cell: 2.5 };
  // Both the height and the skirt are individually finite and representable,
  // but their subtraction is not. Only the surface is safe for WebGL.
  const terrainNearFloatLimit = { height: () => -3e38 };
  assert.doesNotThrow(() => buildTerrainPatch(terrainNearFloatLimit, { ...opts, skirt: 0 }));
  assert.throws(() => buildTerrainPatch(terrainNearFloatLimit, { ...opts, skirt: 3e38 }),
    /exterior skirt exceeds Float32 range/);
  assert.doesNotThrow(() => buildTerrainPatch(terrainNearFloatLimit, { ...opts, skirt: 3e38, skirtEdges: [] }));
});


test('positive exterior skirt must remain below its surface in GPU Float32', () => {
  const opts = { x0: 0, x1: 10, z0: 0, z1: 10, cell: 2.5 };
  // Float64 subtraction succeeds, but a 1 cm skirt at 100 million units
  // rounds to the same Float32 Y coordinate as the surface.
  const elevated = { height: () => 1e8 };
  assert.throws(() => buildTerrainPatch(elevated, { ...opts, skirt: 0.01 }),
    /exterior skirt collapses in Float32/);
  assert.doesNotThrow(() => buildTerrainPatch(elevated, { ...opts, skirt: 16 }));
  assert.doesNotThrow(() => buildTerrainPatch(elevated, { ...opts, skirt: 0 }));
  assert.doesNotThrow(() => buildTerrainPatch(elevated, { ...opts, skirt: 0.01, skirtEdges: [] }));
});

test('non-divisible exterior strips never stretch cells beyond requested resolution', () => {
  const options = { x0: -10, x1: 11, z0: -40, z1: -19, cell: 2.5, skirt: 0 };
  const patch = buildTerrainPatch(terrain, options);
  // 21 / 2.5 = 8.4: floor/round would produce eight 2.625-unit
  // segments. Nine segments preserve both the maximum spacing and bounds.
  assert.equal(patch.nx, 10);
  assert.equal(patch.nz, 10);
  for (let j = 0; j < patch.nz; j++) {
    for (let i = 1; i < patch.nx; i++) {
      const a = patch.positions[3 * (j * patch.nx + i - 1)];
      const b = patch.positions[3 * (j * patch.nx + i)];
      assert.ok(b - a > 0 && b - a <= options.cell + 1e-5);
    }
  }
  for (let j = 1; j < patch.nz; j++) {
    for (let i = 0; i < patch.nx; i++) {
      const a = patch.positions[3 * ((j - 1) * patch.nx + i) + 2];
      const b = patch.positions[3 * (j * patch.nx + i) + 2];
      assert.ok(b - a > 0 && b - a <= options.cell + 1e-5);
    }
  }
});

test('adjacent exterior strips preserve a shared world-space seam', () => {
  const a = buildTerrainPatch(terrain, { x0: -10, x1: 11, z0: -40, z1: -19, cell: 2.5, skirt: 0 });
  const b = buildTerrainPatch(terrain, { x0: 11, x1: 32, z0: -40, z1: -19, cell: 2.5, skirt: 0 });
  assert.equal(a.nz, b.nz);
  for (let j = 0; j < a.nz; j++) {
    const ai = 3 * (j * a.nx + a.nx - 1);
    const bi = 3 * j * b.nx;
    assert.deepEqual([...a.positions.slice(ai, ai + 3)], [...b.positions.slice(bi, bi + 3)]);
  }
});
