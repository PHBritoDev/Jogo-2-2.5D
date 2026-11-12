// Mod 316 — Eldória: luz nostálgica, águas, cachoeira, floresta/caverna expandidas e as correções Codex P1–P5.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as L from '../ascension-layout.js';
import { TOD_KEYS, sampleTimeOfDay, applyRegionGrade, createRegionProbe, sunDirection, createLightState } from '../eldoria-nostalgic-light.js';
import { createLightBudget } from '../light-budget3d.js';
import { WATERFALL } from '../eldoria-waterfall3d.js';
import { FOREST_TRAILS, FOREST_CLEARINGS, RIVER_POINTS, RIVER } from '../act1-world-layout.js';
import { BIRDS } from '../eldoria-birds3d.js';

const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const world = read('mundo-3d-prototype.js');
const lum = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
const warmth = c => c[0] - c[2];

// ---------------------------------------------------------------- P1: tochas só GLB
test('P1: nenhuma tocha procedural — só TochaMedievalTripo.glb, sem fallback genérico', () => {
  assert.equal(fs.existsSync(new URL('../eldoria-torch-fire3d.js', import.meta.url)), false, 'módulo de fogo procedural antigo removido');
  const torches = read('eldoria-torches3d.js');
  assert.match(torches, /TochaMedievalTripo\.glb/);
  assert.doesNotMatch(torches, /CylinderGeometry|LatheGeometry|ConeGeometry|SphereGeometry|TorusGeometry/, 'haste/bacia/chama de primitiva proibidas');
  assert.match(torches, /castShadow = false/, 'luz da tocha nunca projeta sombra');
  assert.match(torches, /res\(null\)/, 'falha do GLB não cria tocha substituta');
  for (const f of ['mundo-3d-prototype.js', 'eldoria-city-dressing.js', 'ascension-cave3d.js']) {
    const src = read(f);
    assert.doesNotMatch(src, /eldoria-torch-fire3d|createVillageTorchFire|BRAZIER_SPOTS|updateBraziers/, f + ': resquício de tocha/braseiro procedural');
  }
  assert.doesNotMatch(read('eldoria-city-dressing.js'), /eldoria-lanterns|eldoria-fences-lamps|for \(const l of lamps\)/, 'postes/lanternas por código removidos');
  // toda tocha posicionada passa por placeTorches com motivo documentado
  const calls = [...world.matchAll(/placeTorches\(/g)].length + [...read('ascension-cave3d.js').matchAll(/placeTorches\(/g)].length;
  assert.ok(calls >= 4 && calls <= 6, 'poucas chamadas de tochas, todas pelo módulo único: ' + calls);
  assert.match(world, /RITUAL_TORCH_SITES/);
});

// ---------------------------------------------------------------- P2/P3: câmera
test('P2: causa raiz da câmera da caverna — piso real da zona, braço de mola contínuo', () => {
  const keep = world.slice(world.indexOf('function keepCameraAboveTerrain()'), world.indexOf('function keepCameraAboveTerrain()') + 900);
  assert.match(keep, /voidMode&&voidSpec\.solid&&voidSpec\.floor/, 'zonas com volume usam o piso delas, não o terreno externo');
  assert.match(world, /function caveArmLimit\(target,off,limit\)/);
  assert.match(world, /for\(let k=0;k<6;k\+\+\)\{const m=\(lo\+hi\)\/2/, 'bissecção: sem degraus de distância');
  assert.match(world, /caveArmLen\+=\(want-caveArmLen\)\*\(1-Math\.exp\(-\(want<caveArmLen\?20:3\.2\)\*dt\)\)/, 'encolhe rápido, volta devagar (sem alternar a cada quadro)');
});
test('P3: 1ª pessoa sem mudar escala/velocidade — olhos medidos, FOV natural, sem multiplicador da caverna', () => {
  assert.doesNotMatch(world, /cameraDistance<1\.05\?1\.85:1/, 'velocidade falsa ×1,85 removida');
  assert.match(world, /const FP_FOV=60;/);
  assert.doesNotMatch(world, /fp\?72:56/, 'FOV 72 (grande-angular) causava sensação de herói maior e lento');
  assert.match(world, /function fpEyeHeight\(\)\{if\(!fpEyeH&&model\)\{let head=null/, "olhos no osso da cabeça do modelo");
  assert.match(world, /fpEyeHeight\(\):1\.15/);
});

// ---------------------------------------------------------------- P4: travadas
test('P4: PointLight nova vai para a camada oculta NO add (sem recompilar todos os materiais)', () => {
  class Obj { constructor() { this.children = []; this.parent = null; this.userData = {}; this.isObject3D = true; this.layers = { mask: 1, set(n) { this.mask = (1 << n) >>> 0; } }; }
    add(...os) { for (const o of os) { o.parent = this; this.children.push(o); } return this; } traverse(f) { f(this); for (const c of this.children) c.traverse(f); } }
  class PL extends Obj { constructor() { super(); this.isPointLight = true; this.intensity = 1; this.castShadow = false; } }
  const T = { Object3D: Obj, PointLight: PL, Vector3: class { } };
  const scene = new Obj(), other = new Obj(); const lb = createLightBudget(T, scene, { slots: 2 });
  const torch = new Obj(), l = new PL(); torch.add(l);
  assert.equal(l.layers.mask, 1, 'fora da cena: intocada');
  scene.add(torch); assert.equal(l.layers.mask, (1 << 31) >>> 0, 'ao entrar na cena já sai da camada do shader');
  const late = new PL(); torch.add(late); assert.equal(late.layers.mask, (1 << 31) >>> 0, 'add tardio também');
  const portrait = new PL(); other.add(portrait); assert.equal(portrait.layers.mask, 1, 'cena auxiliar (retrato) mantém suas luzes');
  assert.equal(lb.stats().sources, 2);
  assert.match(world, /function adoptTorchSet\(ts\)\{torchSets\.push\(ts\);if\(ts\.holders\.length&&renderer\.compileAsync\)/, 'tochas pré-compiladas ao chegar');
});

// ---------------------------------------------------------------- P5: Anjo-Guia
test('P5: Anjo-Guia usa AnjoGuiador-otimizado.glb; Anjo-rig.glb mantido só pelos dependentes', () => {
  assert.ok(fs.existsSync(new URL('../AnjoGuiador-otimizado.glb', import.meta.url)));
  assert.match(world, /new GLTFLoader\(\)\.load\('\.\/AnjoGuiador-otimizado\.glb\?v=mod316-anjo'/);
  assert.match(world, /subclip\(st,'Idle'/, 'repouso derivado do trecho em pé (sem Idle no GLB)');
  assert.match(world, /RIG_DEFS\.anjo=\{file:'\.\/Anjo-rig\.glb/, 'aliados/anjos do Ato III ainda dependem do rig antigo');
  assert.ok(fs.existsSync(new URL('../Anjo-rig.glb', import.meta.url)));
});

// ---------------------------------------------------------------- luz nostálgica
test('Luz: paleta por hora contínua, sol alto ao meio-dia, hora dourada quente, noite legível', () => {
  for (let i = 1; i < TOD_KEYS.length; i++) assert.ok(TOD_KEYS[i].h > TOD_KEYS[i - 1].h);
  const noon = sampleTimeOfDay(12.5, createLightState()), gold = sampleTimeOfDay(17.3, createLightState()), morn = sampleTimeOfDay(8.6, createLightState()), night = sampleTimeOfDay(23, createLightState());
  assert.ok(noon.elev > morn.elev && morn.elev > gold.elev, 'sol sobe e desce');
  assert.ok(warmth(gold.sun) > warmth(noon.sun) + .2, 'hora dourada mais quente que o meio-dia');
  assert.ok(warmth(noon.fill) < 0, 'preenchimento frio (céu)');
  assert.ok(warmth(night.sun) < 0 && night.exposure >= 1.05 && night.hemiInt > 1, 'luar azul e legível');
  assert.ok(lum(noon.skyH) > lum(night.skyH) * 3);
  // sem saltos: 0,05 h de diferença nunca muda a luz do sol bruscamente
  let prev = sampleTimeOfDay(0, createLightState()).sunInt;
  for (let h = .05; h < 24; h += .05) { const s = sampleTimeOfDay(h, createLightState()).sunInt; assert.ok(Math.abs(s - prev) < .08, 'salto de luz às ' + h.toFixed(2)); prev = s; }
  const d = sunDirection(6, 0); assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-9);
  assert.ok(sunDirection(-20, 0)[1] > 0, 'luz nunca vem de baixo do horizonte');
  assert.doesNotMatch(read('eldoria-nostalgic-light.js'), /UnrealBloom|EffectComposer|toneMapping\s*=/, 'sem bloom/pós-processo/troca de tonemapping (sem recompilar)');
});
test('Luz: região altera névoa/intensidades suavemente; sonda de densidade sem alocação por consulta', () => {
  const base = sampleTimeOfDay(10, createLightState()), forest = applyRegionGrade(sampleTimeOfDay(10, createLightState()), { forest: 1 }, 0);
  assert.ok(forest.fogNear < base.fogNear && forest.fogFar < base.fogFar, 'mata fechada: névoa mais próxima');
  assert.ok(forest.sunInt < base.sunInt, 'copas filtram o sol');
  const trees = []; for (let i = 0; i < 400; i++) trees.push({ x: -40 + (i % 20) * 2, z: -120 + Math.floor(i / 20) * 2 }); // 40×40 m de mata cerrada
  const probe = createRegionProbe({ trees, village: { x: -12, z: -44, r: 22 }, pond: { x: -27, z: -88, r: 11.5 }, serraZ: -190 });
  const a = probe(-30, -112); assert.ok(a.forest > .6, 'dentro da mata: ' + a.forest); const r1 = a;
  const b = probe(-12, -44); assert.ok(b.village > .9 && b.forest < .1, 'na vila'); assert.equal(b, r1, 'mesmo objeto (sem alocação)');
  assert.match(world, /applyRegionGrade\(L,regionWeights,p\)/);
});

// ---------------------------------------------------------------- águas e cachoeira
test('Água: reflexo do céu da hora, cor do sol, ondulações em pool fixo e água branca', () => {
  const w = read('eldoria-water.js');
  assert.match(w, /uniform vec4 uRipples\[\$\{WATER_MAX_RIPPLES\}\]/);
  assert.match(w, /rippleNext = \(rippleNext \+ 1\) % WATER_MAX_RIPPLES/, 'pool circular');
  assert.match(w, /uSkyZen/); assert.match(w, /uSunCol/); assert.match(w, /uWhite/);
  assert.doesNotMatch(w, /WebGLRenderTarget|Reflector|CubeCamera/, 'sem SSR/espelho planar/render target');
  assert.match(world, /addRipple\(P\.x,P\.z,t,1\.4\)/, 'aterrissagem na água');
});
test('Cachoeira: desce da crista leste e entra no leito do rio, na direção da correnteza', () => {
  const P = WATERFALL.points; assert.ok(P[0][0] > P[P.length - 1][0], 'nasce a leste, desce para oeste (rio corre para oeste)');
  const end = P[P.length - 1]; let best = 1e9; for (const q of RIVER_POINTS) best = Math.min(best, Math.hypot(end[0] - q[0], end[1] - q[1]));
  // a fita do rio é uma Catmull-Rom entre (88,-9) e (74,-8.5): a foz da cascata fica dentro da largura
  const t = (88 - end[0]) / 14, cz = -9 + .5 * t; assert.ok(Math.abs(end[1] - cz) < RIVER.width, 'encontra o rio dentro do leito');
  assert.ok(best < 12);
  assert.match(world, /fallsDistance:eldoriaFalls\.distanceTo\(x,z\)/, 'som posicional');
  assert.match(read('audio3d.js'), /layers\.falls\.g\.gain\.setTargetAtTime\(\.3 \* falls/);
});

// ---------------------------------------------------------------- floresta e caverna expandidas
test('Floresta: trilhas com laço, mirante, clareiras (calma, mistério, reservadas) e pássaros raros', () => {
  const ids = FOREST_TRAILS.map(t => t.id); for (const id of ['samambaias', 'circulo', 'mirante', 'borda']) assert.ok(ids.includes(id));
  const loop = FOREST_TRAILS.find(t => t.id === 'samambaias').points; assert.ok(Math.hypot(loop[0][0] - loop.at(-1)[0], loop[0][1] - loop.at(-1)[1]) < 9, 'laço volta à trilha da serra');
  const kinds = new Set(FOREST_CLEARINGS.map(c => c.kind)); for (const k of ['clareira', 'calma', 'misterio', 'mirante', 'reservado']) assert.ok(kinds.has(k), k);
  assert.match(world, /\.\.\.FOREST_TRAILS\.map\(t=>\(\{points:t\.points,width:t\.width/);
  assert.ok(BIRDS.FLOCKS * BIRDS.PER_FLOCK <= 14 && BIRDS.minGap >= 30, 'bandos pequenos e raros');
});
test('Caverna: duas câmaras grandes novas alcançáveis a pé (cristal+água e prisão), sem tocar no portal', () => {
  const ids = L.CAVE.chambers.map(c => c.id); assert.ok(ids.includes('cristal') && ids.includes('prisao'));
  assert.equal(L.CAVE.corridors.some(c => c.sealed), false, 'ramificações abertas');
  // BFS pelo caveWalk a partir da entrada
  const step = 1, seen = new Set(), q = [[L.CAVE.spawn.x, L.CAVE.spawn.z]], key = (x, z) => Math.round(x) + ',' + Math.round(z);
  seen.add(key(...q[0]));
  while (q.length) { const [x, z] = q.shift(); for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) { const nx = x + dx, nz = z + dz, k = key(nx, nz); if (seen.has(k) || nx < -82 || nx > 76 || nz < -160 || nz > 12) continue; if (!L.caveWalk(nx, nz)) continue; seen.add(k); q.push([nx, nz]); } }
  for (const [x, z, what] of [[58, -34, 'prisão'], [-50, -108, 'salão de cristal'], [-4, -128, 'portal']]) assert.ok(seen.has(key(x, z)), what + ' alcançável');
  assert.ok(L.CAVE.pools.some(p => Math.hypot(p.x + 58, p.z + 106) < 8), 'poça-espelho no salão de cristal');
  assert.equal(L.CAVE.cages.length, 3);
  for (const k of L.CAVE.corridors) assert.ok(k.r >= 2.6, 'passagem aceita corpo/câmera: ' + k.id);
});
