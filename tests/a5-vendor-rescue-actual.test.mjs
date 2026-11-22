import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const world = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

test('historia do vendedor, câmera e saco de moedas apontam para Téo, não Lia', () => {
  assert.match(world, /\{name:'Téo · Provisões'/);
  assert.match(world, /if\(key==='vendor'\)return vendorRoots\[1\]/);
  assert.match(world, /const v=vendorRoots\[1\],to=v\?v\.position\.clone\(\):P\.clone\(\)/);
  assert.match(world, /villageVendors\[1\].*'PERGUNTAR · TÉO'/s);
});

test('abrir a jaula não concede automaticamente resgate de crianças', () => {
  const begin = world.indexOf('function openCage(){'), end = world.indexOf('function childrenCleared()', begin);
  assert.ok(begin >= 0 && end > begin, 'função de abertura da jaula existe');
  const body = world.slice(begin, end);
  assert.match(body, /childrenFreed=true/);
  assert.doesNotMatch(body, /bumpStat\(['"]rescues['"]\)/);
  assert.match(body, /save3DProgress\(\)/);
});
