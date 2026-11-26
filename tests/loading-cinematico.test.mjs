// Mod 374 — abertura cinematográfica do carregamento: contrato da tela, do loader e do elenco de silhuetas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rd = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const html = rd('mundo-3d-prototype.html'), loader = rd('mod181-loader.js'), cine = rd('loading-cinematic3d.js');
const glb = f => { const b = fs.readFileSync(new URL('../' + f, import.meta.url)); const n = b.readUInt32LE(12); return { size: b.length, json: JSON.parse(b.subarray(20, 20 + n).toString('utf8')) }; };
const loadingMarkup = html.slice(html.indexOf('<div id="loading"'), html.indexOf('<script type="importmap">'));

test('tela de carregamento: sem changelog/DESCRIPTION, versão discreta, progresso fino e cartão só no erro', () => {
  assert.ok(!/meta\.DESCRIPTION/.test(html), 'a DESCRIPTION da build não aparece no carregamento');
  for (const t of ['pl-world-art', 'pl-kicker', 'pl-title', 'A travessia entre mundos', 'esta versão', 'novidades']) assert.ok(!loadingMarkup.includes(t), 'sem texto promocional: ' + t);
  assert.match(loadingMarkup, /id="loading-version"/); assert.match(html, /ver\.textContent='MOD '\+meta\.MOD/);
  for (const id of ['loading-state', 'loading-progress', 'loading-progress-fill', 'loading-percent', 'loading-progress-label', 'loading-error', 'load-retry', 'loading-copy']) assert.match(loadingMarkup, new RegExp('id="' + id + '"'), 'id do loader preservado: ' + id);
  assert.match(html, /#loading\[data-state="error"\] \.pl-card\{display:block\}/);
  assert.match(html, /#loading \.pl-version\{[^}]*opacity:\.3/, 'versão em baixa opacidade');
});

test('abertura corre em paralelo: import sem await antes do loader; o loader continua aguardado', () => {
  const i = html.indexOf("import('./loading-cinematic3d.js"), j = html.indexOf("await import('./mod181-loader.js");
  assert.ok(i > 0 && j > i, 'abertura disparada antes do loader');
  assert.ok(!/await import\('\.\/loading-cinematic3d/.test(html), 'a abertura nunca bloqueia o carregamento');
  assert.match(html.slice(i, j), /\.catch\(/, 'falha da abertura não derruba o loader');
});

test('progresso só do loader real (sem timer/animação enganosa) e saída só quando o mundo esconde #loading', () => {
  assert.ok(!/setInterval|setTimeout/.test(loader), 'loader sem relógio fictício');
  assert.match(loader, /onProgress: \(d, t\) => \{\s*setLoadingProgress\(d, t/);
  assert.ok(!/setAttribute\('aria-valuenow'|loading-progress-fill|setLoadingProgress|loading-percent/.test(cine), 'a cena só LÊ o progresso, nunca escreve');
  assert.match(cine, /MutationObserver/);
  assert.match(rd('mundo-3d-prototype.js'), /player\.userData\.ready=true;loading\.classList\.add\('hidden'\)/, 'o mundo esconde o loading só quando pronto');
});

test('desmontagem completa: loop, observadores, mixers, geometrias/materiais e contexto WebGL', () => {
  for (const k of ['cancelAnimationFrame(raf)', 'ro.disconnect()', 'mo.disconnect()', 'uncacheRoot', 'renderer.dispose()', 'forceContextLoss', 'canvas.remove()']) assert.ok(cine.includes(k), k);
  assert.match(cine, /document\.hidden/, 'pausa com a aba oculta');
});

test('elenco: cinco antagonistas corretos, armas certas (Ganância 2 foices, Bispos 1–3 armados, Bispo 4 de mãos vazias)', async () => {
  const src = cine.slice(cine.indexOf('export const CAST'), cine.indexOf('];', cine.indexOf('export const CAST')));
  const row = id => src.split('\n').find(l => l.includes(`id: '${id}'`)) || '';
  assert.match(row('ganancia'), /ganancia-silhueta\.glb.*weapons: \['greedA', 'greedB'\]/);
  assert.match(row('bispo1'), /bispo1-silhueta\.glb.*weapons: \['throne'\]/);
  assert.match(row('bispo2'), /bispo2-silhueta\.glb.*weapons: \['axe'\]/);
  assert.match(row('bispo3'), /bispo3-silhueta\.glb.*weapons: \['scythe'\]/);
  assert.match(row('bispo4'), /bispo4-silhueta\.glb.*weapons: \[\]/);
  for (const [id, eyes] of [['ganancia', 'vortex'], ['bispo1', 'xx'], ['bispo2', '\\+\\+'], ['bispo3', 'x\\+'], ['bispo4', 'orb']]) assert.match(row(id), new RegExp(`eyes: '${eyes}'`));
  assert.match(cine, /buildCosmicScythe\(T\)/); assert.match(cine, /buildBloodScythe\(T\)/); assert.match(cine, /buildExecutionerScythe\(T\)/); assert.match(cine, /buildAbyssAxe\(T\)/); assert.match(cine, /buildThroneBlade\(T\)/);
});

test('silhuetas derivadas dos GLBs reais: sem textura, com os clipes usados; NPC adulto (não a criança)', () => {
  const need = { 'ganancia-silhueta.glb': ['Walking', 'Left_Slash'], 'bispo1-silhueta.glb': ['Walking'], 'bispo2-silhueta.glb': ['Walking'], 'bispo3-silhueta.glb': ['Walking'], 'bispo4-silhueta.glb': ['Walking', 'Charged_Upward_Slash'], 'npc-adulto-silhueta.glb': ['Walking', 'falling_down'] };
  let total = 0;
  for (const [f, clips] of Object.entries(need)) { const { size, json } = glb('assets/loading/' + f); total += size;
    assert.equal((json.images || []).length, 0, f + ' sem imagens'); assert.equal((json.textures || []).length, 0, f + ' sem texturas'); assert.equal((json.skins || []).length, 1, f + ' com esqueleto');
    const names = (json.animations || []).map(a => a.name); for (const c of clips) assert.ok(names.includes(c), f + ' tem ' + c); }
  assert.ok(total < 7 * 1024 * 1024, 'elenco inteiro abaixo de 7 MB (era ~75 MB nos GLBs completos)');
  assert.ok(!/crianca|Crianca|MeninaNpc/.test(cine), 'nenhuma criança como vítima');
  assert.match(rd('tools/loading-cinematic/derive-silhouettes.mjs'), /NPC_Masculino_Animado_Otimizado_1K\.glb/);
});

test('modelos do gameplay intocados: a cena só usa clones e materiais próprios', () => {
  assert.ok(!/(import\(|from )[^;\n]*(greed-runtime3d|mundo-3d-prototype|enemy1-squad-runtime3d)/.test(cine), 'não importa o runtime de combate');
  assert.ok(!/(NewGanancia1|VHAZRAEL|NewBispo[234]|NewBispo2_Otimizado)\.glb/.test(cine), 'não baixa os GLBs completos');
  assert.match(cine, /o\.material = mat/); assert.match(cine, /function silhouetteMaterial/);
});

test('vinhetas e atos: uma vez por ciclo, sem atravessar a troca de ato, NPC do lado de fora da marcha', async () => {
  const m = cine.match(/export const CYCLE = (\d+)/); const CYCLE = +m[1]; assert.equal(CYCLE, 36);
  const v = [...cine.matchAll(/\{ id: '(perfuracao|decapitacao)', who: '(\w+)', at: ([\d.]+), clip: '(\w+)', from: ([\d.]+), to: ([\d.]+), contact: ([\d.]+)/g)];
  assert.equal(v.length, 2); assert.deepEqual(v.map(x => x[2]), ['bispo4', 'ganancia']);
  for (const x of v) { const at = +x[3], end = at + (+x[6] - +x[5]) + 1.5; assert.ok(Math.floor((at - 2.6) / 12) === Math.floor(end / 12), x[1] + ' dentro de um único ato'); assert.ok(+x[7] > +x[5] && +x[7] < +x[6]); }
});

test('portão READY: entrada só por toque/clique depois da prontidão real, uma única vez; erro sem convite', () => {
  const g = html.slice(html.indexOf('// Entrada por toque (Mod 374)'), html.indexOf('// Abertura cinematográfica: corre em paralelo'));
  assert.match(g, /new MutationObserver\(\(\)=>\{if\(loading\.classList\.contains\('hidden'\)\)ready\(\);\}\)/, 'READY nasce de #loading.hidden (mundo pronto)');
  assert.match(g, /if\(gate\.ready\|\|loading\.dataset\.state==='error'\)return/, 'erro nunca vira READY');
  assert.match(g, /if\(!gate\.ready\|\|gate\.entered\)return;/, 'sem entrada antes do READY e sem duplo disparo');
  assert.match(g, /gate\.entered=true;/); assert.match(g, /loading\.classList\.add\('lc-entered'\)/);
  assert.match(g, /navigator\.webdriver&&!new URLSearchParams\(location\.search\)\.has\('loadinggate'\)/, 'auto-entrada só para automação');
  assert.match(html, /#loading\.hidden\{display:block!important\}/, 'pronto ≠ fechado: a tela continua até o toque');
  assert.match(html, /#loading\.hidden\.lc-entered\{opacity:0;visibility:hidden/);
  assert.match(html, /id="loading-enter"[^>]*hidden>TOQUE NA TELA PARA ENTRAR/);
  assert.match(cine, /classList\.contains\('lc-entered'\)/, 'a cena só se desmonta depois da entrada');
});

test('barra honesta: módulos valem até 90%, nunca regride; 100% só no READY; miniatura segue o mesmo progresso', () => {
  assert.match(loader, /shownPercent = Math\.max\(shownPercent,/); assert.match(loader, /Math\.min\(90, Math\.round\(count \/ maximum \* 90\)\)/);
  assert.match(cine, /loading\.dataset\.state === 'ready' \? 100 : \+\(prog && prog\.getAttribute\('aria-valuenow'\)\)/);
  assert.match(cine, /runP = Math\.min\(target,/, 'a miniatura nunca passa do progresso real');
  const { json } = glb('assets/loading/protagonista-mini.glb'); assert.ok(json.animations.some(a => a.name === 'Running'));
});
