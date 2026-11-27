/** P0 carregamento (missão combate cinematográfico + carregamento): grafo baixado com tentativas limitadas antes do import. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { importSpecs, resolveSpec, fetchText, warmModuleGraph, describeFailure, WARM_LIMITS } from '../module-warm.js';

const MAP = { three: 'https://cdn/three.module.js', 'three/addons/': 'https://cdn/jsm/' };
const res = (body, status = 200) => ({ ok: status < 400, status, text: async () => body });
const noWait = { wait: async () => {} };

test('especificadores: from, export from, side-effect e import() literal', () => {
  const s = importSpecs("import\"./e.js\";import * as T from 'three';\nimport { a } from \"./a.js?v=1\";\nexport * from './b.js';\nimport './c.js';\nconst m = await import('./d.js');\nconst x = 'from nada';");
  assert.deepEqual(s.sort(), ['./a.js?v=1', './b.js', './c.js', './d.js', './e.js', 'three'], 'inclusive no código minificado da release');
});
test('resolução igual à do navegador (relativo ao pai, import map exato e por prefixo)', () => {
  assert.equal(resolveSpec('./x.js', 'https://h/g/mundo.js?v=9', MAP), 'https://h/g/x.js');
  assert.equal(resolveSpec('three', 'https://h/g/a.js', MAP), MAP.three);
  assert.equal(resolveSpec('three/addons/loaders/GLTFLoader.js', 'https://h/g/a.js', MAP), 'https://cdn/jsm/loaders/GLTFLoader.js');
  assert.equal(resolveSpec('desconhecido', 'https://h/g/a.js', MAP), null);
});
test('falha transitória é repetida (sem cache na repetição); 404 não; limite de tentativas', async () => {
  let n = 0; const opts = [];
  const t = await fetchText('https://h/a.js', { ...noWait, fetchFn: async (u, o) => { opts.push(o); if (n++ === 0) throw new TypeError('Failed to fetch'); return res('ok'); } });
  assert.equal(t, 'ok'); assert.deepEqual(opts[1], { cache: 'reload' });
  let m = 0; await assert.rejects(fetchText('https://h/b.js', { ...noWait, fetchFn: async () => { m++; return res('', 404); } }), /b\.js \(HTTP 404\)/); assert.equal(m, 1);
  let k = 0; await assert.rejects(fetchText('https://h/c.js', { ...noWait, fetchFn: async () => { k++; throw new TypeError('net'); } }), /c\.js/); assert.equal(k, WARM_LIMITS.tries);
});
test('grafo: cada módulo baixado uma vez, filhos e netos, concorrência limitada, falha nomeada com o arquivo real', async () => {
  const files = { 'https://h/g/a.js': "import './b.js'; import * as T from 'three';", 'https://h/g/b.js': "export * from './c.js';", 'https://h/g/c.js': "import './a.js';", 'https://cdn/three.module.js': 'export const X=1;' };
  let live = 0, peak = 0; const count = {};
  const fetchFn = async (u) => { live++; peak = Math.max(peak, live); await new Promise(r => setTimeout(r, 2)); live--; count[u] = (count[u] || 0) + 1; return u.includes('c.js') ? res('', 404) : res(files[u] ?? ''); };
  const w = await warmModuleGraph("import './a.js?v=1'; import './a.js';", 'https://h/g/mundo.js?v=1', { importMap: MAP, fetchFn, concurrency: 2, ...noWait });
  assert.equal(w.modules, 5); assert.ok(peak <= 2); assert.ok(Object.values(count).every(c => c === 1));
  assert.deepEqual(w.failures.map(f => f.url), ['https://h/g/c.js']);
  assert.match(describeFailure(new Error('Failed to fetch dynamically imported module: blob:x'), w.failures), /\/g\/c\.js \(HTTP 404\)/);
});
test('loader: aquece o grafo antes do import do blob e mostra o arquivo real + Tentar de novo', () => {
  const l = fs.readFileSync(new URL('../mod181-loader.js', import.meta.url), 'utf8');
  assert.ok(l.indexOf('await warmModuleGraph(') > 0 && l.indexOf('await warmModuleGraph(') < l.indexOf('await import(URL.createObjectURL(blob))'));
  assert.ok(/describeFailure\(err, failures\)/.test(l) && /getElementById\('load-retry'\)/.test(l) && /location\.reload\(\)/.test(l));
  assert.ok(!/setInterval|while \(true\)/.test(l), 'sem retry infinito');
});

test('pré-carga segue a versão nas arenas, na alvenaria e no Vale do Despertar', () => {
  const sources = {
    'dimension-arenas3d.js': ['volcano-cave-scene.js', 'vorgazhek-abyss-dimension3d.js'],
    'eldoria-waterfall3d.js': ['eldoria-water.js'],
    'eldoria-valley-ruin3d.js': ['eldoria-valley-landscape.js'],
    'volcano-cave-scene.js': ['volcano-cave-grove.js', 'volcano-cave-masonry.js'],
    'volcano-cave-grove.js': ['volcano-cave-masonry.js'],
    'mod181-loader.js': ['module-warm.js']
  };
  for (const [name, dependencies] of Object.entries(sources)) {
    const code = fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
    for (const suffix of ['', '?v=anterior', '?v=atual']) {
      const specs = importSpecs(code, suffix);
      for (const file of dependencies) {
        assert.ok(specs.includes('./' + file + suffix), name + ' → ' + file + suffix);
        if (suffix) assert.ok(!specs.includes('./' + file), 'evitar uma segunda cópia sem versão');
      }
    }
  }
});
