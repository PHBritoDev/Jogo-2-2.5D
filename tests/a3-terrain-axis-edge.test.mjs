import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAxis, buildTerrainArrays } from '../world3d-terrain.js';
import { JOURNEY_HOLES, inJourney } from '../jornada3d.js';
import { ROAD_TERRAIN_PATCH } from '../act1-world-layout.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { TERRAIN_EDGE_SHOTS, TERRAIN_EDGE_WALK_LINES, TERRAIN_EDGE_WALK_INPUT, terrainEdgeWalkCameraYaw } = require('../tools/visual-lab/a3-terrain-edge-plan.cjs');

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

for (const { fineHalf, fineCell, outerSteps, growth } of [
  { fineHalf: 206, fineCell: 2.5, outerSteps: 8, growth: 1.075 },
  { fineHalf: 166, fineCell: 2.5, outerSteps: 8, growth: 1.075 },
  { fineHalf: 125, fineCell: 2, outerSteps: 8, growth: 1 },
  { fineHalf: 124, fineCell: 2, outerSteps: 8, growth: 1.075 },
]) {
  test(`exterior joins actual fine-grid edge ${fineHalf}/${fineCell}`, () => {
    const axis = buildAxis(fineHalf, fineCell, outerSteps, growth);
    const steps = Math.round(fineHalf / fineCell);
    const edge = steps * fineCell;
    const leftEdge = outerSteps;
    const rightEdge = outerSteps + 2 * steps;
    close(axis[leftEdge], -edge);
    close(axis[rightEdge], edge);
    close(axis[leftEdge] - axis[leftEdge - 1], fineCell);
    close(axis[rightEdge + 1] - axis[rightEdge], fineCell);
    for (let i = 1; i < axis.length; i++) assert.ok(axis[i] > axis[i - 1]);
  });
}

test('legacy mobile preset stretched the first exterior cell to 3.5 m; fixed grid restores 2.5 m', () => {
  for (const fineHalf of [206, 166]) {
    const fineSteps = Math.round(fineHalf / 2.5);
    const actualFineEdge = fineSteps * 2.5;
    const legacyFirstOuter = fineHalf + 2.5;
    close(legacyFirstOuter - actualFineEdge, 3.5);
    const axis = buildAxis(fineHalf, 2.5, 4, 1.095);
    const lastFine = axis[4 + 2 * fineSteps];
    const firstOuter = axis[4 + 2 * fineSteps + 1];
    close(firstOuter - lastFine, 2.5);
  }
});

test('fractional Eldoria X/Z terrain has connected triangles and uniform first outer cell', () => {
  const terrain = { height: () => 0 };
  const { ax, az, positions, indices, nx, nz } = buildTerrainArrays(terrain, {
    fineHalf: 206, fineHalfZ: 166, fineCell: 2.5, outerSteps: 4, growth: 1.075,
  });
  assert.equal(positions.length, nx * nz * 3);
  assert.equal(indices.length, (nx - 1) * (nz - 1) * 6);
  for (const axis of [ax, az]) {
    for (let i = 1; i < axis.length; i++) assert.ok(axis[i] > axis[i - 1]);
  }
  for (const index of indices) assert.ok(index >= 0 && index < nx * nz);
  assert.ok(positions.every(Number.isFinite));
});

test('mobile Eldoria mesh keeps nonzero triangles across all four fine-to-outer seams', () => {
  const fineCell = 2.5;
  const outerSteps = 32;
  const { ax, az, positions, indices, nx, nz } = buildTerrainArrays(
    { height: () => 0 },
    { cx: -2, cz: -126, fineHalf: 206, fineHalfZ: 166, fineCell, outerSteps, growth: 1.095 },
  );
  const seamX = [outerSteps, outerSteps + 2 * Math.round(206 / fineCell)];
  const seamZ = [outerSteps, outerSteps + 2 * Math.round(166 / fineCell)];
  for (const [axis, seams] of [[ax, seamX], [az, seamZ]]) {
    for (const seam of seams) {
      close(axis[seam] - axis[seam - 1], fineCell);
      close(axis[seam + 1] - axis[seam], fineCell);
    }
  }
  // A connected index buffer alone does not rule out collapsed (zero-area) faces.
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const twiceArea = Math.abs(
      (positions[b] - positions[a]) * (positions[c + 2] - positions[a + 2]) -
      (positions[c] - positions[a]) * (positions[b + 2] - positions[a + 2])
    );
    assert.ok(twiceArea > 1e-8, `collapsed terrain triangle ${i / 3}`);
  }
  assert.equal(ax.length, nx);
  assert.equal(az.length, nz);
});

test('A3 visual sweep targets the four exact mobile terrain seams', () => {
  assert.deepEqual(
    TERRAIN_EDGE_SHOTS.map(s => [s.axis, s.x, s.z, s.fineEdge, s.firstOuter, s.legacyFirstOuter, s.fineCell, s.edgeSpan]),
    [
      ['x', 204.25, -126, 203, 205.5, 206.5, 2.5, 1.5],
      ['x', -208.25, -260, -207, -209.5, -210.5, 2.5, 1.5],
      ['z', -100, 40.25, 39, 41.5, 42.5, 2.5, 1.5],
      ['z', 100, -292.25, -291, -293.5, -294.5, 2.5, 1.5],
    ],
  );
  const roadPatch = {
    ...ROAD_TERRAIN_PATCH,
    z0: -126 + Math.round(166 / 2.5) * 2.5,
  };
  const inside = (r, x, z) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;
  for (const shot of TERRAIN_EDGE_SHOTS) {
    assert.equal(Math.abs(shot.firstOuter - shot.fineEdge), shot.fineCell);
    assert.equal(Math.abs(shot.legacyFirstOuter - shot.fineEdge), 3.5, 'main baseline keeps the original 3.5 m first exterior cell');
    assert.equal(shot.edgeSpan, 1.5, 'visual guide must sample both ends of a 3 m seam segment');
    close(shot.axis === 'x' ? shot.x : shot.z, (shot.fineEdge + shot.firstOuter) / 2);
    assert.equal(shot.cameraOffset.length, 3);
    assert.ok(shot.cameraOffset[1] >= 8 && shot.cameraOffset[1] <= 10, 'camera must clear the surface without becoming top-down');
    const horizontalOffset = Math.hypot(shot.cameraOffset[0], shot.cameraOffset[2]);
    assert.ok(horizontalOffset >= 10 && horizontalOffset <= 13, 'camera must include more terrain context while remaining near the seam');
    assert.ok(Math.abs(horizontalOffset - shot.cameraOffset[1]) <= 4, 'camera must keep an oblique view rather than a top-down or grazing angle');
    if (shot.axis === 'x') assert.equal(shot.cameraOffset[2], 0);
    else assert.equal(shot.cameraOffset[0], 0);
    assert.equal(shot.targetOffset.length, 3);
    assert.ok([...shot.cameraOffset, ...shot.targetOffset].every(Number.isFinite));
    assert.ok(!JOURNEY_HOLES.some(h => inside(h, shot.x, shot.z)), `${shot.name} falls inside an intentional journey cutout`);
    assert.ok(!inJourney(shot.x, shot.z), `${shot.name} depends on streamed journey terrain rather than the static edge mesh`);
    assert.ok(!inside(roadPatch, shot.x, shot.z), `${shot.name} falls inside the separate road patch`);
    const towardCenter = shot.axis === 'x'
      ? shot.cameraOffset[0] * (-2 - shot.x)
      : shot.cameraOffset[2] * (-126 - shot.z);
    assert.ok(towardCenter > 0, `${shot.name} camera must face the seam from the interior side`);
  }
});


test('A3 walk scan crosses each fine-grid boundary in both directions', () => {
  assert.deepEqual(
    TERRAIN_EDGE_WALK_LINES.map(line => [line.name, line.axis, line.boundary, line.interiorSign]),
    [
      ['x-leste', 'x', 203, -1],
      ['x-oeste', 'x', -207, 1],
      ['z-norte', 'z', 39, -1],
      ['z-sul', 'z', -291, 1],
    ],
  );
  for (const line of TERRAIN_EDGE_WALK_LINES) {
    assert.equal(line.walkDepth, 6);
    assert.equal(line.probeOffset, 1);
    assert.equal(line.seconds, 5);
    assert.ok(line.step > 0 && line.step <= 8);
    assert.ok(line.min < line.max);
    const low = line.axis === 'x' ? -291 : -207;
    const high = line.axis === 'x' ? 39 : 203;
    assert.ok(line.min >= low + 8 && line.max <= high - 8, line.name + ' scan must stay inside the orthogonal fine-grid span');
    for (const along of [line.min, (line.min + line.max) / 2, line.max]) {
      const point = offset => line.axis === 'x'
        ? [line.boundary + line.interiorSign * offset, along]
        : [along, line.boundary + line.interiorSign * offset];
      const insideStart = point(line.walkDepth);
      const insideProbe = point(line.probeOffset);
      const outsideProbe = point(-line.probeOffset);
      const outsideEnd = point(-line.walkDepth);
      assert.equal(Math.hypot(outsideEnd[0] - insideStart[0], outsideEnd[1] - insideStart[1]), 12);
      assert.equal(Math.hypot(outsideProbe[0] - insideProbe[0], outsideProbe[1] - insideProbe[1]), 2);
      for (const [x, z] of [insideStart, insideProbe, outsideProbe, outsideEnd]) {
        assert.ok(Number.isFinite(x) && Number.isFinite(z));
      }
    }
  }
});


test('A3 live walk replay faces the world path and uses forward input', () => {
  assert.deepEqual(TERRAIN_EDGE_WALK_INPUT, {x:0,z:-1});
  // The production stick maps (0,-1) to (-sin(yaw),-cos(yaw)).
  for (const end of [[1,0],[-1,0],[0,1],[0,-1],[3,-4],[-2,5]]) {
    const yaw = terrainEdgeWalkCameraYaw([0,0],end);
    const length = Math.hypot(...end);
    assert.ok(Math.abs(-Math.sin(yaw)-end[0]/length)<1e-8);
    assert.ok(Math.abs(-Math.cos(yaw)-end[1]/length)<1e-8);
  }
});
