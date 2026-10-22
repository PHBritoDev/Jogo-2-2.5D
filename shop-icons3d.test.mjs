import test from 'node:test';
import assert from 'node:assert/strict';
import { iconSvg, ICON_NAMES } from './shop-icons3d.js';

test('cada ícone gera um SVG válido com ids únicos', () => {
  const ids = new Set();
  for (const name of ICON_NAMES) {
    const svg = iconSvg(name);
    assert.match(svg, /^<svg[^>]+viewBox="0 0 96 96"/);
    assert.ok(svg.endsWith('</svg>'));
    for (const m of svg.matchAll(/id="([^"]+)"/g)) { assert.ok(!ids.has(m[1]), 'id repetido ' + m[1]); ids.add(m[1]); }
  }
});

test('a Loja tem arte para todas as Palavras, ultimates e espadas', () => {
  for (const n of ['magic', 'magic2', 'magic3', 'ultimate', 'magic_plus', 'magic2_plus', 'sword_prota', 'sword_aurora', 'sword_vigilia']) assert.ok(ICON_NAMES.includes(n), n);
});
