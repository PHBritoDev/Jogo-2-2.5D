import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../audio3d.js',import.meta.url),'utf8');
test('silent mode must skip scheduling exploration pads and allow immediate resume',()=>{
  const start=src.indexOf('tick(dt, night) {');
  const end=src.indexOf('function env(',start);
  assert.ok(start>=0 && end>start);
  const tick=src.slice(start,end);
  assert.match(tick,/if \(mode === 'silent'\)\s*\{\s*\/\/[^\n]*\n\s*chordAt = t;/);
  assert.match(tick,/else if \(t >= chordAt\)/);
  assert.match(tick,/pad\(night > \.5/);
  assert.match(tick,/if \(mode === 'combat' && t >= beatAt\)/);
});
