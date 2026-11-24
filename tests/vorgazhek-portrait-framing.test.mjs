import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { computePortraitCameraFit } from '../portrait-camera-fit.js';

const world = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../hud3d.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../mundo-3d-prototype.html', import.meta.url), 'utf8');
const qa = fs.readFileSync(new URL('../tools/visual-lab/a1-vorgazhek-portrait-qa.cjs', import.meta.url), 'utf8');
const squadRuntime = fs.readFileSync(new URL('../enemy1-squad-runtime3d.js', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('../mod181-loader.js', import.meta.url), 'utf8');

test('enquadramento retrato é exclusivo da luta ativa de VORGAZHEK e não altera paisagem', () => {
  assert.match(world, /function portraitBishop2Profile\(foeOn,sep\)/);
  assert.match(world, /dimKey!=='bishop2'/);
  assert.match(world, /camera\.aspect>=\.78\|\|sep>28/);
  assert.match(world, /focusBlend:fit\.focusBlend/);
  assert.match(world, /const fit=computePortraitCameraFit\(sep,camera\.aspect,camera\.fov\)/);
  assert.match(world, /minDistance:fit\.minDistance/);
  assert.match(world, /sep<12\|\|!!portrait/);
  assert.match(world, /baseWant\+\(fittedWant-baseWant\)\*\(portrait\.release\?\?1\)/);
  assert.match(world, /const idleMs=portrait\?portrait\.idleMs:1200/);
  assert.match(world, /release:fit\.release,idleMs:fit\.idleMs,deadZone:fit\.deadZone,parallaxBias:fit\.parallaxBias,turnRate:fit\.turnRate/);
  assert.match(world, /actorScreen\(\)\{[\s\S]*?camera\.updateMatrixWorld\(true\)/);
});

test('fit mantém 15 m e libera o foco progressivamente entre 22 e 28 m', () => {
  const at21m = computePortraitCameraFit(21, 320 / 852, 56);
  const at22m = computePortraitCameraFit(22, 320 / 852, 56);
  const at25m = computePortraitCameraFit(25, 320 / 852, 56);
  const at28m = computePortraitCameraFit(28, 320 / 852, 56);
  assert.equal(at21m.minDistance, 15);
  assert.equal(at22m.release, 1);
  assert.equal(at25m.release, .5);
  assert.equal(at28m.release, 0);
  assert.equal(at28m.parallaxBias, 0);
  assert.ok(at22m.focusBlend > at25m.focusBlend && at25m.focusBlend > at28m.focusBlend);
  assert.ok(at22m.shoulder < at25m.shoulder && at25m.shoulder < at28m.shoulder);
  assert.match(world, /camera\.aspect>=\.78\|\|sep>28/);
  assert.match(world, /baseWant\+\(fittedWant-baseWant\)\*\(portrait\.release\?\?1\)/);
});

test('entrada reinicia o foco antigo e saída remove o escopo visual da dimensão', () => {
  assert.match(world, /document\.body\.classList\.toggle\('bishop2-battle',key==='bishop2'\)/);
  assert.match(world, /if\(abyssEntry\|\|key==='bishop2'\)\{camFocusReady=false;lastLookInputAt=0;if\(key==='bishop2'\)portraitZoomOverride=false;\}/);
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
  assert.match(html, /hud3d\.css\?v=a1-vorgazhek-portrait-compact-controls/);
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
  const pollBodies = [...block.matchAll(/await page\.waitForFunction\(\(\) => \{([\s\S]*?)\}, null,/g)].map(match => match[1]);
  assert.equal(pollBodies.length, 2, 'dois estados observados sem side effects');
  assert.ok(pollBodies.every(body => !body.includes('.vsGo(')), 'polling permanece somente leitura');
});


test('controles do retrato compacto afastam escudo, corrida e mira do joystick', () => {
  assert.match(css, /body\.bishop2-battle #actions #shield\{right:calc\(var\(--u\)\*3\.8\)!important\}/);
  assert.match(css, /body\.bishop2-battle #stick\{width:calc\(var\(--u\)\*2\.15\)!important;height:calc\(var\(--u\)\*2\.15\)!important\}/);
  assert.match(css, /body\.bishop2-battle #actions #run\{right:calc\(var\(--u\)\*3\.9\)!important\}/);
  assert.match(css, /body\.bishop2-battle #actions #aim\{right:calc\(var\(--u\)\*2\.8\)!important\}/);
  assert.match(qa, /actionButtons: Array\.from\(document\.querySelectorAll\('#actions button'\)\)/);
  assert.match(qa, /!overlaps\(visibleButtons\.shield, h\.stick\)/);
  assert.match(qa, /!overlaps\(visibleButtons\.run, h\.stick\)/);
  assert.match(qa, /state\.hud\.stick\.width <= 92/);
});


test('QA projeta o corpo visível do alvo da esquadra, não o proxy invisível', () => {
  assert.match(world, /const focusActor=newHero&&squadOn&&squadFocus\?\.alive\?squadFocus:null/);
  assert.match(world, /const focusBody=focusActor\?squadRT\?\.body\?\.\(focusActor\.id\):null/);
  assert.match(world, /target=focusBody\?\.holder\|\|enemy/);
  assert.match(world, /source:focusBody\?'squad-body':'enemy-proxy'/);
  assert.match(world, /visibleMeshes>0/);
  assert.match(world, /visibleMeshes,meshCount/);
  assert.match(squadRuntime, /body\(id\) \{ return bodies\.get\(id\) \|\| null; \}/);
  assert.match(qa, /state\.actors\?\.enemy\?\.source, 'squad-body'/);
  assert.match(qa, /state\.actors\?\.enemy\?\.visible, true/);
  assert.match(qa, /state\.actors\?\.enemy\?\.visibleMeshes > 0/);
  assert.match(qa, /state\.actors\?\.player\?\.center\?\.onScreen/);
  assert.match(qa, /state\.actors\.player\.head\.onScreen && state\.actors\.enemy\.head\.onScreen/);
  assert.match(qa, /Math\.abs\(state\.actors\.player\.center\.x - state\.actors\.enemy\.center\.x\) >= \.22/);
});

test('zoom manual por pinça e roda suspende a recentralização automática', () => {
  assert.ok(world.includes("const next=THREE.MathUtils.clamp(cameraDistance+(lastPinchDistance-d)*.025,.72,15);if(next!==cameraDistance){cameraDistance=next;if(newHero&&dimBattle?.active&&combatStepNow()&&dimKey==='bishop2'&&camera.aspect<.78)portraitZoomOverride=true;}lastLookInputAt=performance.now();syncCameraToggle3D();"), 'pinça registra zoom e override manual de distância');
  assert.ok(world.includes("lookArea.addEventListener('wheel',e=>{const next=THREE.MathUtils.clamp(cameraDistance+e.deltaY*.008,.72,15);if(next!==cameraDistance){cameraDistance=next;if(newHero&&dimBattle?.active&&combatStepNow()&&dimKey==='bishop2'&&camera.aspect<.78)portraitZoomOverride=true;}lastLookInputAt=performance.now();syncCameraToggle3D();"), 'roda do mouse registra zoom e override manual de distância');
});

test('QA exercita pinça touch, roda do mouse e retorno de perspectiva', () => {
  assert.match(qa, /fire\('pointerdown', 101/);
  assert.match(qa, /fire\('pointermove', 102/);
  assert.match(qa, /page\.mouse\.wheel\(0, -600\)/);
  assert.match(qa, /afterPinch\.requestedDistance/);
  assert.match(qa, /afterWheel\.requestedDistance/);
});

test('zoom manual no retrato preserva a distância escolhida pelo jogador', () => {
  assert.equal((world.match(/portraitZoomOverride=true/g) || []).length, 2, 'pinça e roda ativam o override no retrato VORGAZHEK');
  assert.match(world, /portraitZoomOverride\?cameraDistance:baseWant\+\(fittedWant-baseWant\)\*\(portrait\.release\?\?1\)/);
  assert.match(world, /manualZoomOverride:portraitZoomOverride/);
  assert.match(world, /if\(key==='bishop2'\)portraitZoomOverride=false/);
});


test('fit geométrico do retrato mantém o ator próximo dentro da margem e os dois separados', () => {
  for (const aspect of [320 / 852, 393 / 852]) {
    for (const fov of [56, 63]) {
      let lastDistance = 0, lastBias = .38;
      for (const sep of [2.4, 3.5, 8, 12, 21, 22]) {
        const fit = computePortraitCameraFit(sep, aspect, fov);
        const half = sep * .5, tanHalfHorizontal = Math.tan(fov * Math.PI / 360) * aspect;
        const nearDepth = fit.minDistance - half * Math.cos(fit.parallaxBias);
        const farDepth = fit.minDistance + half * Math.cos(fit.parallaxBias);
        const lateral = half * Math.sin(fit.parallaxBias);
        const nearNdc = lateral / (nearDepth * tanHalfHorizontal);
        const farNdc = lateral / (farDepth * tanHalfHorizontal);
        assert.ok(nearNdc <= .721, aspect + ' / ' + fov + '° / ' + sep + 'm: ator próximo dentro da margem');
        assert.ok(nearNdc + farNdc >= .22, aspect + ' / ' + fov + '° / ' + sep + 'm: separação horizontal legível');
        assert.ok(fit.minDistance >= lastDistance && fit.minDistance <= 15, 'distância monotônica e limitada');
        assert.ok(fit.parallaxBias <= lastBias + 1e-6, 'paralaxe diminui quando a separação aumenta');
        lastDistance = fit.minDistance; lastBias = fit.parallaxBias;
      }
    }
  }
});

test('probe do alvo exige malha realmente visível e helper compatível com loader de blob', () => {
  assert.match(world, /from '\.\/portrait-camera-fit\.js'/);
  assert.ok(loader.includes('[a-z0-9-]+\\.js'), 'loader reescreve imports locais .js para URLs absolutas');
  assert.match(world, /visibleMeshes>0/);
  assert.match(world, /visibleMeshes,meshCount/);
  assert.match(qa, /state\.actors\?\.enemy\?\.visibleMeshes > 0/);
});

test('alternar perspectiva limpa o override de zoom manual do duelo em retrato', () => {
  const toggleStart = world.indexOf("if(cameraToggle3D)bindInstantTap(cameraToggle3D");
  const toggleEnd = world.indexOf("const lookPointers", toggleStart);
  assert.ok(toggleStart >= 0 && toggleEnd > toggleStart, 'handler da alternância de perspectiva delimitado');
  const toggle = world.slice(toggleStart, toggleEnd);
  assert.ok(toggle.includes("cameraDistance=cameraDistance<1.05?8.5:.72;"));
  assert.ok(toggle.includes("portraitZoomOverride=false;"), 'perspectiva descarta override antigo');
  const zoomQaStart = qa.indexOf('async function assertManualZoom');
  const zoomQaEnd = qa.indexOf('async function runFreshPortrait', zoomQaStart);
  const zoomQa = qa.slice(zoomQaStart, zoomQaEnd);
  assert.ok(zoomQa.includes("page.locator('#camera-toggle-3d').click()"), 'QA alterna primeira e terceira pessoa');
  assert.ok(zoomQa.includes("afterReturn.manualZoomOverride, false"), 'QA verifica limpeza do override');
  assert.ok(zoomQa.includes("afterReturn.distance >= 10.2"), 'QA verifica retorno do fit adaptativo');
});
