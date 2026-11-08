import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUILD, MOD, DESCRIPTION, syncBuildMarker } from './build-info.js';
const read = path => readFileSync(new URL('./' + path, import.meta.url), 'utf8');
test('build é centralizada e descritiva', () => {
  assert.equal(typeof MOD, 'number');
  assert.ok(Number.isInteger(MOD) && MOD > 0);
  assert.match(BUILD, /^mod\d+-[a-z0-9-]+$/);
  assert.match(DESCRIPTION, /Eldória|Dimensão/);
});
test('entradas usam build-info em vez de strings de versão duplicadas', () => {
  for (const path of ['index.html','mundo-3d-prototype.html','mod181-loader.js','laboratorio-inimigos.html','mundo-3d-prototype.js']) {
    const text=read(path);
    assert.match(text, /build-info\.js/);
    assert.doesNotMatch(text, /(?:build|refresh)=29\d|const BUILD = 'mod29\d|mod181-loader\.js\?v=mod29\d/);
  }
});
test('marcador funciona sem navegador', () => {
  const state={textContent:'',attributes:{},title:'',setAttribute(k,v){this.attributes[k]=v;}};
  syncBuildMarker(state);
  assert.equal(state.textContent, String(MOD));
  assert.equal(state.attributes['aria-label'], 'Modificação '+MOD);
});
