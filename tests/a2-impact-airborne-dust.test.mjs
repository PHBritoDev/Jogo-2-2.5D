import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../vfx-impact3d.js', import.meta.url), 'utf8');

test('impact dust is ground-gated, while airborne embers remain independent', () => {
  const groundGate = source.indexOf('const nearGround = Number.isFinite(gy)');
  const craterGate = source.indexOf('if (nearGround)', groundGate);
  const embers = source.indexOf('embers.add(', craterGate);
  const dustGate = source.indexOf('if (nearGround) for (let i', embers);
  const dust = source.indexOf('dust.add(', dustGate);
  assert.ok(groundGate > -1 && craterGate > groundGate);
  assert.ok(embers > craterGate && dustGate > embers && dust > dustGate);
  assert.match(source.slice(dustGate, dust), /nearGround/);
  assert.match(source.slice(groundGate, craterGate), /Number\.isFinite\(gy\)/);
});
