// Mod 376 — o menu ORIGINAL das galáxias (arte aprovada de 17/11) volta a ser a tela dos planetas; nada de tela preta
// no boot; a abertura cinematográfica só existe depois de ENTRAR.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MENU_ART, menuArtURL, loadMenuArt } from '../galaxies3d.js';

const rd = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const gx = rd('galaxies3d.js'), css = rd('galaxies-infernal-reference.css'), world = rd('mundo-3d-prototype.js'), html = rd('mundo-3d-prototype.html'), index = rd('index.html'), art = rd('galaxies-cinematic-art.js');

test('a arte original aprovada existe e é a que o menu carrega (mesmos arquivos do CSS e da cena WebGL)', () => {
  assert.deepEqual(MENU_ART, ['environment.webp', 'worlds-hero.webp']);
  for (const f of MENU_ART) { const u = new URL(menuArtURL(f)); assert.ok(fs.existsSync(u), f + ' existe'); assert.ok(fs.statSync(u).size > 300000, f + ' é a arte real'); }
  assert.match(css, /url\("assets\/ui\/menu\/cinematic\/environment\.webp"\)/); assert.match(art, /'\.\/assets\/ui\/menu\/cinematic\/environment\.webp','\.\/assets\/ui\/menu\/cinematic\/worlds-hero\.webp'/);
});

test('loadMenuArt: uma nova tentativa por arquivo; a reserva só entra em falha real', async () => {
  const calls = {}; const flaky = src => { calls[src] = (calls[src] || 0) + 1; return calls[src] === 1 ? Promise.reject(new Error('rede')) : Promise.resolve(src); };
  const ok = await loadMenuArt(flaky); assert.equal(ok.length, 2); for (const n of Object.values(calls)) assert.equal(n, 2, 'tentou de novo uma vez');
  let n = 0; await assert.rejects(loadMenuArt(() => { n++; return Promise.reject(new Error('404')); })); assert.equal(n, 4, 'duas tentativas por arquivo e então desiste');
});

test('a tela nasce invisível e só aparece com a arte original decodificada (sem o SVG procedural como placeholder)', () => {
  assert.match(gx, /class: 'gx-art-pending'/); assert.match(css, /#galaxy-screen\.gx-art-pending\{opacity:0!important;pointer-events:none\}/);
  assert.match(css, /#galaxy-screen\.gx-art-pending \.gx-backdrop>svg\{visibility:hidden\}/);
  assert.match(gx, /root\.classList\.add\('gx-cinematic-ready'\); reveal\(\); root\.dataset\.gxMenuArt = 'original'/);
  assert.match(gx, /root\.dataset\.gxMenuArt = 'reserve'/, 'reserva marcada só no erro'); assert.match(gx, /return \{ root, close, ready \};/);
  assert.match(art, /load\(href\)\.catch\(\(\)=>load\(href\)\)/, 'a cena WebGL também tenta de novo antes da reserva geométrica');
});

test('fluxo: a etapa planets começa só quando o menu original está pronto; o boot fica visível até lá', () => {
  assert.match(world, /const gx=openGalaxyScreen\(\);Promise\.resolve\(gx&&gx\.ready\)\.then\(toPlanets,toPlanets\);/);
  assert.match(world, /return showGalaxyScreen\(/); assert.match(world, /setProgress\(window\.__sinsFlow\.progress,'ABRINDO AS GALÁXIAS'\)/);
  // a abertura nunca é iniciada no boot: só game-flow.enter (planets → cinematic) cria o player
  assert.ok(!/startLoadingCinematic/.test(world)); assert.ok(!/startLoadingCinematic\(/.test(html.replace(/loadCinematic:\(\)=>import\([^)]*\)/, '')));
  assert.match(rd('game-flow.js'), /enter\(cont, extra\) \{\s*if \(!active \|\| this\.step !== 'planets'\)/);
});

test('boot visível: título, arte pré-carregada por trás e aviso à casca; nada de tela preta', () => {
  assert.match(html, /<link rel="preload" as="image" type="image\/webp" href="\.\/assets\/ui\/menu\/cinematic\/environment\.webp" fetchpriority="high">/);
  assert.match(html, /<link rel="preload" as="image" type="image\/webp" href="\.\/assets\/ui\/menu\/cinematic\/worlds-hero\.webp" fetchpriority="high">/);
  assert.match(html, /<div class="pl-boot-title" aria-hidden="true"><span>A BATALHA CONTRA OS<\/span><b><i>7<\/i> PECADOS CAPITAIS<\/b><\/div>/);
  assert.match(html, /#loading\{background:#07040a url\("assets\/ui\/menu\/cinematic\/environment\.webp"\)/);
  assert.match(html, /parent\.postMessage\(\{type:"SEVEN_SINS_BOOT_PAINTED"\},location\.origin\)/);
});

test('index.html: casca visível desde o primeiro byte; TESTAR só em contexto de QA/admin', () => {
  assert.match(index, /<div id="shell-boot" role="status"/); assert.match(index, /SEVEN_SINS_BOOT_PAINTED/); assert.match(index, /frame\.addEventListener\('load',shellOff\)/);
  assert.match(index, /#lab-test-entry\{display:none\}#lab-test-entry\.qa\{display:block\}/);
  assert.match(index, /var qa=navigator\.webdriver\|\|qaKeys\.some/); assert.match(index, /if\(qa\)document\.querySelector\('#lab-test-entry'\)\.classList\.add\('qa'\)/);
  assert.match(index, /<a id="lab-test-entry" href="\.\/laboratorio-inimigos\.html"/, 'o atalho continua existindo para os QAs');
});
