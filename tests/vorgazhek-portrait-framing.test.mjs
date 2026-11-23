import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const world = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../hud3d.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../mundo-3d-prototype.html', import.meta.url), 'utf8');
const qa = fs.readFileSync(new URL('../tools/visual-lab/a1-vorgazhek-portrait-qa.cjs', import.meta.url), 'utf8');

test('enquadramento retrato é exclusivo da luta ativa de VORGAZHEK e não altera paisagem', () => {
  assert.match(world, /function portraitBishop2Profile\(foeOn,sep\)/);
  assert.match(world, /dimKey!=='bishop2'/);
  assert.match(world, /camera\.aspect>=\.78/);
  assert.match(world, /focusBlend:\.48/);
  assert.match(world, /minDistance:Math\.min\(11\.5,Math\.max\(9\.4/);
  assert.match(world, /sep<12\|\|!!portrait/);
  assert.match(world, /Math\.max\(baseWant,portrait\.minDistance\)/);
  assert.match(world, /const idleMs=portrait\?portrait\.idleMs:1200/);
});

test('entrada reinicia o foco antigo e saída remove o escopo visual da dimensão', () => {
  assert.match(world, /document\.body\.classList\.toggle\('bishop2-battle',key==='bishop2'\)/);
  assert.match(world, /if\(abyssEntry\|\|key==='bishop2'\)\{camFocusReady=false;lastLookInputAt=0;\}/);
  assert.match(world, /document\.body\.classList\.remove\('bishop2-battle'\)/);
});

test('HUD retrato coloca a barra do Bispo no topo, mantém controles nos cantos e libera o centro', () => {
  assert.match(css, /@media \(orientation:portrait\) and \(max-width:600px\)/);
  assert.match(css, /body\.bishop2-battle #enemy-hud\.boss\{[^}]*top:calc\(68px \+ var\(--safe-t\)\)!important;[^}]*bottom:auto!important;/);
  assert.match(css, /body\.bishop2-battle #quest-box[^}]*display:none!important/);
  assert.match(css, /body\.bishop2-battle #actions\{--ctrl-scale:\.88/);
  assert.match(css, /body\.bishop2-battle #stick\{left:calc\(10px \+ var\(--safe-l\)\)/);
  assert.match(css, /body\.bishop2-battle #graphics-toggle-3d/);
});

test('QA compara base e HEAD no fluxo normal, incluindo rotação real de viewport sem forçar câmera', () => {
  assert.match(qa, /VISUAL_BASELINE_URL/);
  assert.match(qa, /setViewportSize\(\{width:393,height:852\}\)/);
  assert.doesNotMatch(qa, /SevenSinsDebug3D\.view\(/);
  assert.match(qa, /03-head-retrato-rotacao/);
  assert.match(qa, /05-head-retrato-inicial/);
});

test('CSS recebe chave própria de cache; build-info e loader ficam reservados à integração', () => {
  assert.match(html, /hud3d\.css\?v=mod356-vorgazhek-portrait/);
  assert.match(world, /function portraitBishop2Profile/);
});
