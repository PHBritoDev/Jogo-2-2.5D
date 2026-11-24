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
  assert.match(world, /deadZone:\.05,parallaxBias:\.22,turnRate:3\.2/);
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
  assert.match(css, /--hpw:clamp\(112px,28\.8vw,130px\)/);
  assert.doesNotMatch(css, /body\.bishop2-battle #camera-toggle-3d/);
  assert.doesNotMatch(css, /body\.bishop2-battle #graphics-toggle-3d/);
  assert.doesNotMatch(css, /body\.bishop2-battle #daynight-toggle-3d/);
  assert.match(css, /@media \(orientation:portrait\) and \(max-width:388px\)/);
  assert.match(css, /body\.bishop2-battle #inventory-btn/);
  assert.match(css, /body\.bishop2-battle #map-toggle-3d/);
});

test('QA compara base e HEAD no fluxo normal, incluindo rotação real de viewport sem forçar câmera', () => {
  assert.match(qa, /VISUAL_BASELINE_URL/);
  assert.match(qa, /async function openBattle\(browser, url, stage, viewport\)/);
  assert.match(qa, /await browser\.newContext/);
  assert.doesNotMatch(qa, /chromium\.newContext/);
  assert.match(qa, /setViewportSize\(\{\s*width:\s*393,\s*height:\s*852\s*\}\)/);
  assert.doesNotMatch(qa, /SevenSinsDebug3D\.view\(/);
  assert.match(qa, /runLandscapeThenPortrait\(browser,\s*headUrl,\s*'03-head',\s*true\)/);
  assert.match(qa, /runFreshPortrait\(browser,\s*headUrl,\s*'05-head'\)/);
});

test('CSS recebe chave própria de cache; build-info e loader ficam reservados à integração', () => {
  assert.match(html, /hud3d\.css\?v=mod356-vorgazhek-portrait/);
  assert.match(world, /function portraitBishop2Profile/);
});
test('QA inicia a apresentação uma vez e mantém a espera da batalha somente leitura', () => {
  const start = qa.indexOf('async function openBattle');
  const end = qa.indexOf('async function inspect', start);
  assert.ok(start >= 0 && end > start, 'openBattle delimitado');
  const block = qa.slice(start, end);
  const calls = block.match(/\.vsGo\(/g) || [];
  assert.equal(calls.length, 1, 'vsGo chamado exatamente uma vez fora do polling');
  assert.match(block, /await page\.evaluate\(\(\) => window\.SevenSinsDebug3D\.vsGo\(\)\)/);
  assert.match(block, /querySelector\('#vs-go'\)/);
  const pollBodies = [...block.matchAll(/await page\\.waitForFunction\\(\\(\\) => \\{([\\s\\S]*?)\\}, null,/g)].map(match => match[1]);
  assert.equal(pollBodies.length, 2, 'dois estados observados sem side effects');
  assert.ok(pollBodies.every(body => !body.includes('.vsGo(')), 'polling permanece somente leitura');
});
