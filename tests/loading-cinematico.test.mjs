// Mod 375 — abertura cinematográfica: fluxo em etapas (boot → planetas → abertura → mundo), prontidão real do mundo,
// marcha refinada (olhos, armas, ritmo) e o Campo da Última Guerra. Contratos de código + comportamento do fluxo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGameFlow, STEPS } from '../game-flow.js';

const rd = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const html = rd('mundo-3d-prototype.html'), loader = rd('mod181-loader.js'), cine = rd('loading-cinematic3d.js'), kit = rd('loading-kit3d.js'), battle = rd('loading-battle3d.js'), fx = rd('loading-fx3d.js'), world = rd('mundo-3d-prototype.js'), flowSrc = rd('game-flow.js');
const glb = f => { const b = fs.readFileSync(new URL('../' + f, import.meta.url)); const n = b.readUInt32LE(12); return { size: b.length, json: JSON.parse(b.subarray(20, 20 + n).toString('utf8')) }; };
const bootMarkup = html.slice(html.indexOf('<div id="loading"'), html.indexOf('<div id="cine"'));
const cineMarkup = html.slice(html.indexOf('<div id="cine"'), html.indexOf('<script type="importmap">'));

/* DOM mínimo para exercitar o fluxo real (sem navegador) */
function fakeDoc() {
  const els = {}; const el = id => els[id] || (els[id] = { id, hidden: id === 'cine' || id === 'cine-enter', dataset: { state: 'idle' }, style: {}, textContent: '', attrs: {}, classes: new Set(),
    classList: { add(c) { els[id].classes.add(c); }, contains(c) { return els[id].classes.has(c); }, remove(c) { els[id].classes.delete(c); } },
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, focus() {} });
  return { els, getElementById: el };
}
const ev = (type, key) => ({ type, key, preventDefault() {} });

test('etapas explícitas: boot → planets → cinematic → world (inserir login no futuro = nova etapa antes dos planetas)', () => {
  assert.deepEqual([...STEPS], ['boot', 'planets', 'cinematic', 'world']);
  assert.ok(!/setTimeout|setInterval/.test(flowSrc), 'o fluxo não adivinha tempo');
});

test('a abertura NÃO roda no boot: o HTML só cria o fluxo; a cena é importada pela etapa cinematic', () => {
  assert.ok(!/import\('\.\/loading-cinematic3d\.js[^)]*\)\.then/.test(html), 'nenhum start direto da abertura no boot');
  assert.match(html, /import\('\.\/game-flow\.js\?v='\+encodeURIComponent\(meta\.BUILD\)\)/);
  assert.match(html, /loadCinematic:\(\)=>import\('\.\/loading-cinematic3d\.js\?v='\+encodeURIComponent\(meta\.BUILD\)\)/);
  const i = html.indexOf("import('./game-flow.js"), j = html.indexOf("await import('./mod181-loader.js"); assert.ok(i > 0 && j > i, 'o fluxo nasce antes do loader');
  assert.match(html.slice(i, j), /catch\(e\)\{console\.warn\('\[fluxo\]/, 'sem o fluxo, o carregamento clássico continua');
  assert.match(world, /window\.__sinsFlow\.planets\(\)/, 'o mundo avisa quando a tela dos planetas/portão está montada');
});

test('boot discreto e #cine com HUD próprio, convite oculto até o READY', () => {
  for (const id of ['loading-state', 'loading-progress', 'loading-progress-fill', 'loading-percent', 'loading-progress-label', 'loading-error', 'load-retry', 'loading-copy', 'loading-version']) assert.match(bootMarkup, new RegExp('id="' + id + '"'), id);
  assert.ok(!/meta\.DESCRIPTION/.test(html)); assert.ok(!bootMarkup.includes('cine-enter'));
  for (const id of ['cine-runner-lane', 'cine-progress', 'cine-progress-fill', 'cine-percent', 'cine-state', 'cine-version']) assert.match(cineMarkup, new RegExp('id="' + id + '"'), id);
  assert.match(cineMarkup, /<div id="cine" hidden/); assert.match(cineMarkup, /id="cine-enter"[^>]*hidden>TOQUE NA TELA PARA ENTRAR/);
  assert.match(html, /#cine\.cine-leaving\{opacity:0;visibility:hidden/);
});

test('fluxo (comportamento): toque antes do READY não entra; o gesto que abriu a etapa não entra; READY + toque entra UMA vez', () => {
  const doc = fakeDoc(); let loads = 0, starts = 0, cont = 0;
  const flow = createGameFlow({ doc, params: new URLSearchParams(''), webdriver: false, loadCinematic: () => { loads++; return Promise.resolve({ startLoadingCinematic: () => { starts++; return {}; } }); } });
  assert.equal(flow.active, true); assert.equal(flow.step, 'boot');
  assert.equal(flow.enter(() => cont++), false); assert.equal(cont, 1, 'antes dos planetas, a continuação original roda direto'); cont = 0;
  assert.equal(flow.planets(), true); assert.equal(flow.step, 'planets'); assert.ok(doc.els.loading.classes.has('boot-done')); assert.equal(loads, 1, 'pré-carrega a abertura nos planetas');
  flow.setProgress(40, 'X'); flow.setProgress(20); assert.equal(flow.progress, 40, 'progresso nunca regride');
  assert.equal(flow.enter(() => cont++), true); assert.equal(flow.step, 'cinematic'); assert.equal(doc.els.cine.hidden, false);
  assert.equal(flow.go(ev('pointerup')), false, 'pointerup do mesmo gesto (sem arm) não entra'); assert.equal(flow.go(ev('keydown', 'Enter')), false, 'antes do READY nada entra');
  flow.worldReady(); assert.equal(doc.els.cine.dataset.state, 'ready'); assert.equal(doc.els['cine-enter'].hidden, false); assert.equal(flow.progress, 100);
  assert.equal(flow.go(ev('keydown', 'a')), false, 'tecla qualquer não entra');
  assert.equal(flow.go(ev('pointerup')), false, 'sem pointerdown na abertura pronta');
  flow.arm(ev('pointerdown')); assert.equal(flow.go(ev('pointerup')), true); assert.equal(cont, 1); assert.equal(flow.step, 'world'); assert.ok(doc.els.cine.classes.has('cine-leaving'));
  assert.equal(flow.go(ev('keydown', 'Enter')), false); assert.equal(cont, 1, 'entrada única');
});

test('fluxo: prontidão extra (céu do prólogo) também precisa resolver; automação entra sozinha só sem ?loadinggate', async () => {
  const doc = fakeDoc(); let res, cont = 0; const extra = new Promise(r => (res = r));
  const f = createGameFlow({ doc, params: new URLSearchParams('loadingcine=1'), webdriver: true }); f.planets(); f.enter(() => cont++, extra); f.worldReady();
  assert.notEqual(doc.els.cine.dataset.state, 'ready', 'espera o extra'); res(); await extra; await null; assert.equal(cont, 1, 'automação: auto-entrada após READY real');
  const g = createGameFlow({ doc: fakeDoc(), params: new URLSearchParams(''), webdriver: true }); assert.equal(g.active, false, 'automação sem ?loadingcine mantém o fluxo clássico');
  const h = createGameFlow({ doc: fakeDoc(), params: new URLSearchParams('loadingcine=1&loadinggate=1'), webdriver: true }); h.planets(); let c2 = 0; h.enter(() => c2++); h.worldReady(); assert.equal(c2, 0, '?loadinggate: só entra com toque');
});

test('prontidão real do mundo: texturas enviadas em fatias, shaders compilados e aquecimento fatiado ANTES do READY', () => {
  assert.match(world, /player\.userData\.ready=true;finishWorldPrep\(\);/);
  const f = world.slice(world.indexOf('function finishWorldPrep(){'), world.indexOf('function precompileWorld(){'));
  assert.match(f, /renderer\.initTexture\(list\[i\]\)/); assert.match(f, /performance\.now\(\)-s<8/, 'fatias de ~8 ms');
  assert.match(f, /worldTextures\(\)\.filter\(t=>t\.version>0&&pending\(t\)\)/, 'texturas que chegam durante o envio entram na fila');
  assert.match(f, /precompileWorld\(\)/); assert.match(f, /Promise\.resolve\(warmJourneyPrograms\(\)\)\.then/); assert.match(f, /flow\.worldReady\(\)/);
  const w = world.slice(world.indexOf('function warmJourneyPrograms(){'), world.indexOf('function save3DProgress(){'));
  assert.match(w, /renderer\.setScissor\(0,0,1,1\)/); assert.match(w, /chunks\.push\(new Set\(list\.slice\(i,i\+CH\)\)\)/, 'aquecimento por grupos'); assert.match(w, /yieldNext\(next\)/, 'cede a vez entre fatias');
  assert.match(loader, /if \(window\.__sinsFlow\) window\.__sinsFlow\.setProgress\(percent, stateLabel\);/);
  assert.match(loader, /Math\.min\(90, Math\.round\(count \/ maximum \* 90\)\)/, 'módulos valem até 90%');
});

test('a cena só LÊ o progresso e sai só quando o jogador entrou; descarte completo', () => {
  assert.ok(!/setAttribute\('aria-valuenow'|progress-fill|setProgress\(/.test(cine), 'a cena nunca escreve progresso');
  assert.match(cine, /host\.classList\.contains\('cine-leaving'\) \|\| host\.hidden/);
  for (const k of ['cancelAnimationFrame(raf)', 'ro.disconnect()', 'mo.disconnect()', 'uncacheRoot', 'renderer.dispose()', 'forceContextLoss', 'canvas.remove()', 'battle.dispose()']) assert.ok(cine.includes(k), k);
  assert.match(cine, /document\.hidden/); assert.match(battle, /dispose\(\) \{ try \{ judge\.dispose\(\); \}/);
});

test('rostos: SÓ olhos, poucas assinaturas distintas e assimétricas; nenhuma boca, dente, lábio ou sangue', () => {
  for (const src of [cine, kit, battle, fx]) {
    assert.ok(!/GRIN_F|grinM|uStreak|function bleed|dropMat|splatMat|headPiece|decapit|perfuracao/.test(src), 'sistemas de sorriso/sangue/vinhetas antigas removidos');
  }
  const E = kit.slice(kit.indexOf('export const EYES'), kit.indexOf('};', kit.indexOf('export const EYES')));
  const row = id => E.split('\n').find(l => l.trim().startsWith(id + ':')) || '';
  assert.equal((row('ganancia').match(/shape: 0/g) || []).length, 2, 'Ganância: duas fendas curtas');
  assert.match(row('ganancia'), /dy: \.0016.*dy: -\.0008/, 'fendas assimétricas');
  assert.equal((row('bispo1').match(/shape:/g) || []).length, 1, 'VHAZRAEL: um único olho'); assert.match(row('bispo1'), /shape: 2/);
  assert.match(row('bispo3'), /shape: 1.*pulse: 1.*shape: 1.*pulse: 1/, "ZAR'KHAEL: núcleos pequenos com pulso sutil");
  assert.match(row('bispo2'), /shape: 3/); assert.match(row('bispo4'), /\[\]/, 'VÉRAXION: olhos escuros');
  assert.match(kit, /halo=exp\(-max\(d,0\.\)\*9\.\)\*\.22/, 'halo curto (sem feixe/LED)');
  assert.ok(!/spikyOrb/.test(cine), 'sem o orbe do VÉRAXION');
});

test('armas: poses de carregar distintas por IK de dois ossos (arrasto, nuca, ombro com lâmina para baixo, machado pesado)', () => {
  const src = cine.slice(cine.indexOf('export const CAST'), cine.indexOf('];', cine.indexOf('export const CAST')));
  const row = id => src.split('\n').find(l => l.includes(`id: '${id}'`)) || '';
  assert.match(row('ganancia'), /weapons: \[\['greedA', 'yoke'\], \['greedB', 'drag'\]\]/);
  assert.match(row('bispo1'), /weapons: \[\['throne', 'bone'\]\]/); assert.match(row('bispo2'), /weapons: \[\['axe', 'port'\]\]/);
  assert.match(row('bispo3'), /weapons: \[\['scythe', 'shoulder'\]\]/); assert.match(row('bispo4'), /weapons: \[\]/);
  assert.match(kit, /export function twoBoneIK\(/); assert.match(cine, /if \(tipY\(w, cG, cQ, yG\) > \.012\) lo = th; else hi = th;/, 'ponta rente ao chão por bisseção');
  assert.match(cine, /scrape\.add\(w\.tipWorld/, 'contato com o chão sincronizado (sulco + centelhas)');
  assert.match(cine, /cB\.set\(0, -1, 0\)\.addScaledVector\(B\.Rt, \.85\)/, "ZAR'KHAEL: lâmina para baixo");
  assert.match(kit, /LaminaEnergia\|Nucleo\|Halo/, 'FX do machado ocultos na silhueta'); assert.match(kit, /ext = bb\.max\.y - bb\.min\.y/, 'escala pela extensão do cabo');
});

test('marcha lenta e pesada: chão, cenários e passada pelo mesmo fator (sem moonwalk); formação mais espaçada', () => {
  assert.match(cine, /export const MARCH_SPEED = \.72/);
  assert.match(cine, /a\.walk\.timeScale = clamp\(MARCH_SPEED \/ Math\.max\(\.2, a\.natural\), \.3, 1\.5\) \* state\.vk/);
  assert.match(kit, /export function strideSpeed\(/, 'clipes "no lugar": velocidade do pé apoiado'); assert.match(cine, /walk\.userData\.natural \* a\.unit/, 'convertida para metros pela escala do modelo');
  assert.match(cine, /state\.V = MARCH_SPEED \* state\.vk; state\.scroll \+= state\.V \* dt/); assert.match(cine, /travel = \(state\.scroll - S\.s0\)/, 'cenários integrados ao chão');
  const xs = [...cine.matchAll(/id: '(\w+)'.*?x: (-?[\d.]+), z: (-?[\d.]+)/g)].map(m => [m[1], +m[2], +m[3]]);
  const g = xs.find(r => r[0] === 'ganancia'); assert.deepEqual(g.slice(1), [0, 0], 'Ganância no centro');
  for (const [id, x] of xs) if (id !== 'ganancia') assert.ok(Math.abs(x) >= 1.9, id + ' afastado');
});

test('ameaça implícita: a formação para, o instante fica oculto (fumaça/contraluz) e o vulto cai inteiro', () => {
  assert.match(cine, /export const VIGNETTE = \{ id: 'ameaca-implicita', who: 'ganancia'/);
  assert.match(cine, /function marchFactor\(mt\)/); assert.match(cine, /play\(n, 'Arise'/); assert.match(cine, /play\(n, 'falling_down'/);
  assert.match(cine, /curtains\.forEach/); assert.match(cine, /flare\.visible = fl > \.01/);
});

test('Campo da Última Guerra: ≥ 35 s, três solos de Bispos + Ganância + final com os quatro; VFX ORIGINAIS reaproveitados', () => {
  const len = +battle.match(/export const BATTLE_LEN = (\d+)/)[1]; assert.ok(len >= 35 && len <= 60, 'duração ' + len);
  const ids = [...battle.matchAll(/\{ id: '(\w+)', from: ([\d.]+), to: ([\w.]+) \}/g)].map(m => m[1]);
  assert.deepEqual(ids, ['revelacao', 'vhazrael', 'vorgazhek', 'zarkhael', 'ganancia', 'final'], 'só B1–B3 lutam sozinhos; B4 só no grupo final');
  for (const f of ['vhazrael-judgment-vfx3d.js', 'vorgazhek-ultimate3d.js', 'vorgazhek-cosmic-sword3d.js', 'zarkhael-six-seals-ultimate3d.js', 'zarkhael-six-seals-vfx3d.js', 'greed-ultimate-corona3d.js']) assert.ok(battle.includes(`imp('./${f}')`), f);
  assert.match(battle, /makeJudgmentSeal\(/); assert.match(battle, /createCosmicUlt\(\{ U: COSMIC_U/); assert.match(battle, /createZarkhaelSixSeals\(\{ U: SEALS_U \}\)/); assert.match(battle, /createCorona\(T, field/);
  assert.match(battle, /whiteAt: 99/, 'sem branco de tela cheia'); assert.match(battle, /slow = \.2/, 'câmera lenta de um tempo só');
  assert.match(battle, /export const TITLE = 'A Batalha Contra\\nos 7 Pecados Capitais'/); assert.match(fx, /export function createTitle/);
  assert.match(cine, /import\('\.\/loading-battle3d\.js' \+ VQ\)/, 'batalha carregada depois do elenco');
});

test('NPCs: pool fixo ≤ 10, variações e no máximo 3 famílias de aura; derrota por dissolve (sem sangue nem desmembramento)', () => {
  assert.match(battle, /export const NPC_BUDGET = 10/); assert.equal((battle.match(/const AURAS = \[([^\]]+)\]/)[1].split(',')).length, 3);
  assert.match(battle, /\{ npc: true, dissolve: true, src: first\.gltf, clone: true, mill: false \}/, 'clones da mesma silhueta');
  assert.match(kit, /if\(dn3<th\) discard;/, 'o corpo se desfaz em brasas pela borda'); assert.match(battle, /play\(n\.a, 'falling_down'/);
  assert.match(battle, /npcsActive: B\.active/, 'telemetria de NPCs ativos');
});

test('explosões em camadas e pools fixos (núcleo curto, massas turbulentas, filamentos, fumaça, brasas; flash reduzível)', () => {
  for (const k of ['CORE_F', 'FIRE_F', 'RAY_F', 'SMOKE_F', 'uFlashMax', 'InstancedMesh']) assert.ok(fx.includes(k), k);
  assert.match(fx, /reduceFlash \? \.45 : 1/); assert.match(cine, /createExplosions\(T, scene, \{ pool: low \? 4 : 6, low, reduceFlash: reduced/);
});

test('silhuetas derivadas dos GLBs reais: sem textura, com os clipes usados; fase II com asas; orçamento total', () => {
  const need = { 'ganancia-silhueta.glb': ['Walking', 'Idle_14', 'Triple_Combo_Attack', 'Weapon_Combo'], 'ganancia2-silhueta.glb': ['Arise'], 'bispo1-silhueta.glb': ['Walking', 'Axe_Spin_Attack', 'mage_soell_cast_7'],
    'bispo2-silhueta.glb': ['Walking', 'Double_Blade_Spin', 'Attack'], 'bispo3-silhueta.glb': ['Walking', 'Weapon_Combo', 'Skill_03'], 'bispo4-silhueta.glb': ['Walking', 'Idle_14'], 'npc-adulto-silhueta.glb': ['Walking', 'falling_down', 'Running', 'Alert', 'Regular_Jump', 'Arise'] };
  let total = 0;
  for (const [f, clips] of Object.entries(need)) { const { size, json } = glb('assets/loading/' + f); total += size;
    assert.equal((json.images || []).length, 0, f + ' sem imagens'); assert.equal((json.skins || []).length, 1, f + ' com esqueleto');
    const names = (json.animations || []).map(a => a.name); for (const c of clips) assert.ok(names.includes(c), f + ' tem ' + c); }
  assert.ok(total < 6 * 1024 * 1024, 'elenco + fase II + NPC abaixo de 6 MB');
  assert.ok(!/(NewGanancia1|NewGanancia2|VHAZRAEL|NewBispo[234]|NewBispo2_Otimizado)\.glb/.test(cine + battle), 'não baixa os GLBs completos');
  assert.ok(!/(import\(|from )[^;\n]*(greed-runtime3d|mundo-3d-prototype|enemy1-squad-runtime3d)/.test(cine + battle), 'não importa o runtime do jogo');
});

test('lua: reaproveita o Lua.glb do mundo (mesma URL, sem segundo sistema de céu)', () => {
  assert.match(cine, /'\.\/Lua\.glb\?v=mod181-moon'/); assert.match(world, /'\.\/Lua\.glb\?v=mod181-moon'/);
});
