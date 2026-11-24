'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isRuntimeAssetUrl } = require('./a5-waystone-qa-utils.cjs');

test('detecta módulos e modelos mesmo com query string ou fragmento', () => {
  for (const url of [
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js?cache=1',
    'https://phbritodev.github.io/Jogo-2-2.5D/Prota_otimizado_2K.glb',
    'https://example.test/models/enemy.glb#preview'
  ]) assert.equal(isRuntimeAssetUrl(url), true, url);
});

test('não classifica imagens, estilos, mapas ou extensões apenas parecidas como runtime JS/GLB', () => {
  for (const url of [
    'https://example.test/forest.png',
    'https://example.test/hud.css',
    'https://example.test/module.js.map',
    'https://example.test/model.glb.txt',
    'https://example.test/model.png?redirect=other.js',
    'not a URL'
  ]) assert.equal(isRuntimeAssetUrl(url), false, url);
});

test('trata entradas ausentes ou não textuais como inválidas', () => {
  for (const value of [undefined, null, 42, {}, '']) assert.equal(isRuntimeAssetUrl(value), false);
});
