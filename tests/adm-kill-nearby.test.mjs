import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../mundo-3d-prototype.html', import.meta.url), 'utf8');
const world = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

test('ADM kill only appears behind the explicit adm=1 gate', () => {
  assert.match(html, /get\('adm'\)!=='1'\)return/);
  assert.match(html, /id='adm-kill-nearby'/);
  assert.match(html, /api\.killNearby\(12\)/);
});

test('ADM kill uses a radius rather than killing distant enemies', () => {
  assert.match(world, /killNearby\(radius=12\)/);
  assert.match(world, /Math\.min\(24,Math\.max\(1,Number\(radius\)\|\|12\)\)/);
  assert.match(world, /Math\.hypot\(actor\.x-px,actor\.z-pz\)>\(range\+/);
  assert.match(world, /Math\.hypot\(enemy\.position\.x-px,enemy\.position\.z-pz\)<=range/);
});

test('ADM kill routes through existing death handlers to preserve phase transitions', () => {
  assert.match(world, /squad\.damageActor\(actor\.id,amount,/);
  assert.match(world, /hurtEnemy\(Math\.max\(100000,enemyHP\+1\),true,false,true\)/);
  assert.match(world, /function greedPhaseEvent\(/);
});
