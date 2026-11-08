/** MOD 291 — Eldória: geografia do prólogo, estrada de Teren, água corrente, ponte, cidade aterrada/LOD, sub-bosque e cristais. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createTerrain, PLAY_AREA, buildTerrainArrays, buildTerrainPatch } from './world3d-terrain.js';
import { PROLOGUE_MEADOW, FALL_SPOT, ROAD_JUNCTION, TEREN_ROAD, CART_ROUTE, TEREN_STOP, BANDIT_AMBUSH, ROAD_BANDITS, ROAD_TERRAIN_PATCH, ELDORIA_CENTER, RIVER_POINTS, RIVER, BRIDGE, bridgeDeck, insideMeadow, polylineLength, pointAlong, nearestAlong } from './act1-world-layout.js';
import { ROAD, RIDE, initialRoadStage, roadPresentation, terenMeetScene, rideDozeScene, ambushScene, hungerScene, choiceScene, dawnRideScene, dawnHourAt } from './prologue-road-flow.js';
import { planMeadow } from './eldoria-prologue-meadow.js';
import { riverRibbon } from './eldoria-water.js';
import { planBridge, planRiverRocks } from './eldoria-river-props.js';
import { eldoriaSpecs, planOverlaps, footprintRadius, footprintSamples } from './eldoria-live-village3d.js';
import { planUndergrowth } from './eldoria-undergrowth.js';
import { crystalPrismData, crystalProfile } from './eldoria-crystal-geometry.js';

const src = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('./mundo-3d-prototype.html', import.meta.url), 'utf8');
const mainTrail = JSON.parse(src.match(/const mainTrail=(\[\[[^;]*\]\]);/)[1].replace(/([[,])(-?)\./g, "$1$20."));
const segDist = (x, z, pts) => { let b = Infinity; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], c = pts[i], dx = c[0] - a[0], dz = c[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0; b = Math.min(b, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return b; };
const terrain = createTerrain({ extraAreas: [PROLOGUE_MEADOW], passes: [{ points: TEREN_ROAD, r: 8.5 }], paths: [{ points: TEREN_ROAD, r: 4, fade: 5 }, { points: RIVER_POINTS, r: RIVER.width + 2.2, fade: 5 }], channels: [{ points: RIVER_POINTS, width: RIVER.width, depth: RIVER.depth, level: RIVER.level }] });

test('queda no prado aberto, longe da cidade e sem linha de visão para ela', () => {
  const d = Math.hypot(FALL_SPOT.x - ELDORIA_CENTER.x, FALL_SPOT.z - ELDORIA_CENTER.z);
  assert.ok(d > 200, 'spawn a ' + d.toFixed(1) + ' m da cidade');
  assert.ok(insideMeadow(FALL_SPOT.x, FALL_SPOT.z), 'a queda é dentro do prado');
  assert.ok(terrain.walkable(FALL_SPOT.x, FALL_SPOT.z) && terrain.walkable(ROAD_JUNCTION.x, ROAD_JUNCTION.z));
  // Uma serra entre o prado e a cidade: em algum ponto da reta o relevo passa da linha dos olhos.
  const eye = terrain.height(FALL_SPOT.x, FALL_SPOT.z) + 1.7, target = 6; let blocked = false;
  for (let k = .05; k < .95; k += .01) { const x = FALL_SPOT.x + (ELDORIA_CENTER.x - FALL_SPOT.x) * k, z = FALL_SPOT.z + (ELDORIA_CENTER.z - FALL_SPOT.z) * k; if (terrain.height(x, z) > eye + (target - eye) * k + 1) { blocked = true; break; } }
  assert.ok(blocked, 'a cidade não pode aparecer do ponto da queda');
  // A estrada é caminhável de ponta a ponta (garganta entre os maciços).
  const L = polylineLength(TEREN_ROAD); for (let s = 0; s <= L; s += 3) { const p = pointAlong(TEREN_ROAD, s); assert.ok(terrain.walkable(p.x, p.z), 'estrada bloqueada em ' + s.toFixed(0)); }
  assert.equal(PLAY_AREA.cz + PLAY_AREA.hz < ROAD_TERRAIN_PATCH.z0 + 1, true);
});

test('anel artificial em volta do spawn antigo saiu; prado sem mata colada e com rochedos/flores', () => {
  assert.doesNotMatch(src, /Math\.hypot\(x,z-4\)<30/);
  assert.match(src, /if\(insideMeadow\(x,z,8\)\)\{if\(insideMeadow\(x,z,-6\)\)return false;/);
  const plan = planMeadow({ meadow: PROLOGUE_MEADOW, road: TEREN_ROAD, fall: FALL_SPOT, wheel: { x: 62, z: 128 }, stop: TEREN_STOP });
  assert.ok(plan.boulders.filter(b => b.r > 2.3).length >= 5, 'rochedos grandes');
  assert.ok(plan.flowers.length > 800 && plan.flowers.some(f => f.yellow) && plan.flowers.some(f => !f.yellow));
  for (const b of plan.boulders) assert.ok(segDist(b.x, b.z, TEREN_ROAD) > b.r + 1.5, 'rochedo na estrada');
  assert.ok(plan.debris.some(d => d.kind === 'wheel'), 'roda quebrada (marcas de saque)');
});

test('retalho do terreno compartilha a borda com a grade fina (sem fresta) para as duas resoluções', () => {
  for (const cell of [2, 2.5]) {
    const z0 = -126 + Math.round(166 / cell) * cell, main = buildTerrainArrays(terrain, { cx: -2, cz: -126, fineHalf: 206, fineHalfZ: 166, fineCell: cell, outerSteps: 6, growth: 1.09, holes: [{ ...ROAD_TERRAIN_PATCH, z0 }] });
    assert.ok(main.az.some(z => Math.abs(z - z0) < 1e-6), 'linha fina em z0');
    for (const x of [ROAD_TERRAIN_PATCH.x0, ROAD_TERRAIN_PATCH.x1]) assert.ok(main.ax.some(v => Math.abs(v - x) < 1e-6), 'coluna alinhada em x=' + x);
    const patch = buildTerrainPatch(terrain, { ...ROAD_TERRAIN_PATCH, z0, cell });
    assert.ok(Number.isInteger((ROAD_TERRAIN_PATCH.z1 - z0) / cell) && patch.indices.length % 3 === 0);
  }
});

test('Missão P1: Teren, lona, carroça, cochilo, 4 bandidos humanos, escolha sem punição, amanhecer e chegada', () => {
  assert.equal(initialRoadStage(0, '3'), ROAD.meet, 'jogo novo começa no prado');
  assert.equal(initialRoadStage(1, null), ROAD.done, 'save antigo não repete o prólogo');
  assert.equal(initialRoadStage(1, '2'), 2); assert.equal(initialRoadStage(2, '0'), ROAD.done); assert.equal(initialRoadStage(1, '1', 1), ROAD.done);
  assert.ok(RIDE.start < RIDE.dozeAt && RIDE.dozeAt < RIDE.ambush && RIDE.ambush < RIDE.revealAt && RIDE.revealAt < RIDE.end && RIDE.end <= RIDE.total + .01);
  assert.ok(RIDE.end - RIDE.start > 180, 'viagem real de carroça, não teleporte');
  // Mod 292: a carroça para no largo diante da PONTE de entrada (a cidade agora fica do outro lado do rio)
  assert.ok(Math.hypot(CART_ROUTE.at(-1)[0] - BRIDGE.x, CART_ROUTE.at(-1)[1] - (BRIDGE.z - BRIDGE.axisZ * BRIDGE.halfLength)) < 6, 'desce diante da ponte de entrada de Eldória');
  const texts = s => s.filter(x => x.type === 'say').map(x => x.text).join(' | ');
  assert.match(texts(terenMeetScene()), /Vocês vieram daquela trilha\?/); assert.match(texts(terenMeetScene()), /Vou até Eldória/);
  assert.match(texts(ambushScene()), /Acorde/); assert.match(texts(ambushScene()), /Não vamos pedir duas vezes/);
  assert.match(texts(hungerScene()), /Não comemos há dois dias/); assert.ok(hungerScene().some(s => s.type === 'ask' && s.id === 'bandidos-escolha'));
  for (const help of [true, false]) { const t = texts(choiceScene(help)); assert.match(t, /chegamos ao amanhecer/); assert.doesNotMatch(t, /mat(ar|o)\b/i); }
  assert.match(texts(dawnRideScene()), /Eldória\. Já foi um lugar bonito de viver\./);
  assert.ok(rideDozeScene().some(s => s.id === 'dormir') && rideDozeScene().some(s => s.type === 'wait'), 'o sono escurece antes de acordar');
  assert.equal(ROAD_BANDITS.length, 4); for (const b of ROAD_BANDITS) assert.ok(Math.hypot(b.x - BANDIT_AMBUSH.x, b.z - BANDIT_AMBUSH.z) < 8);
  for (let k = 0; k < 1; k += .1) assert.ok(dawnHourAt(k + .1) >= dawnHourAt(k)); assert.ok(dawnHourAt(0) < 3 && dawnHourAt(1) > 6.5);
  assert.equal(roadPresentation(ROAD.done), null); assert.match(roadPresentation(ROAD.meet).objective, /estrada/);
  // Integração: bandido = morador humano com golpes emprestados do mesmo esqueleto; sem magia; checkpoint na estrada.
  assert.match(src, /RIG_DEFS\.bandit=\{file:'\.\/Npc-lod2\.glb\?v=mod202',extra:'\.\/Anjo-rig\.glb\?v=mod215-anjo'/);
  assert.match(src, /checkpointZ=profile==='bandit1'\?spot\.z\+4:/);
  assert.match(src, /if\(roadInteract\(\)\)return;if\(act1Interact\(\)\)return;/);
  assert.match(src, /if\(act1Sub===0&&roadStage<ROAD\.done\)\{updateRoadQuest\(px,pz,near,mark\);return;\}/);
  assert.match(src, /road\(stage=0\)\{/, 'atalho de QA da estrada');
});

test('rio com correnteza: fita ao longo da curva, flow/espuma/Fresnel no shader; ponte transitável sobre a água', () => {
  const r = riverRibbon(RIVER_POINTS, { width: RIVER.width });
  assert.ok(r.length > 100); const u = []; for (let i = 0; i < r.uvs.length; i += 4) u.push(r.uvs[i]);
  for (let i = 1; i < u.length; i++) assert.ok(u[i] >= u[i - 1], 'u cresce ao longo da corrente');
  assert.ok([...r.uvs].filter((_, i) => i % 2).every(v => v === -1 || v === 1));
  const water = readFileSync(new URL('./eldoria-water.js', import.meta.url), 'utf8');
  assert.match(water, /uTime \* speed/); assert.match(water, /float fres =/); assert.match(water, /float foam =/); assert.match(water, /uniform vec4 uRocks/); assert.match(water, /#include <fog_fragment>/);
  // A água bloqueia no meio do rio, mas a ponte passa por cima (tabuleiro em arco, parapeitos bloqueiam).
  assert.ok(terrain.waterDepth(BRIDGE.x, BRIDGE.z) >= .38, 'rio fundo sob a ponte');
  const mid = bridgeDeck(BRIDGE.x, BRIDGE.z); assert.ok(mid && mid.y > .9 && !mid.edge);
  const end = bridgeDeck(BRIDGE.x + BRIDGE.axisX * 6, BRIDGE.z + BRIDGE.axisZ * 6); assert.ok(end && end.y < .3);
  assert.ok(segDist(BRIDGE.x, BRIDGE.z, mainTrail) < 1, 'ponte na trilha principal');
  assert.match(src, /\{const bd=bridgeDeck\(x,z\);if\(bd\)return bd\.edge;\}/);
  assert.ok(planBridge(BRIDGE).length > 40);
  const rocks = planRiverRocks(r.centerline, { width: RIVER.width, avoid: [{ x: BRIDGE.x, z: BRIDGE.z, r: 7 }] });
  assert.ok(rocks.length >= 6); for (const k of rocks) assert.ok(Math.hypot(k.x - BRIDGE.x, k.z - BRIDGE.z) > 7);
  assert.match(src, /buildLakeMesh\(THREE,\{x:FOREST_POND\.x/); assert.match(src, /mesh\.name='forest-pond';mesh\.visible=false;/);
});

test('cidade: nenhuma pegada sobreposta, casas fora da trilha e do rio, aterramento pelo chão mais baixo, LOD real', () => {
  assert.deepEqual(planOverlaps(), []);
  // Loja Central (CasaEldoria01.glb no lugar do prédio antigo): pegada ~4 m em volta de (−33,9; −45) sem casas coladas.
  for (const s of eldoriaSpecs()) assert.ok(Math.hypot(ELDORIA_CENTER.x + s.x + 33.9, ELDORIA_CENTER.z + s.z + 45) > 4.2 + footprintRadius(s), s.file + ' colada na Loja');
  for (const s of eldoriaSpecs()) {
    const x = ELDORIA_CENTER.x + s.x, z = ELDORIA_CENTER.z + s.z;
    if (s.kind === 'house' || s.kind === 'prop') assert.ok(segDist(x, z, mainTrail) > footprintRadius(s) + 2, s.file + ' em cima da trilha principal');
    assert.ok(segDist(x, z, RIVER_POINTS) > footprintRadius(s) + RIVER.width, s.file + ' dentro do rio');
  }
  assert.equal(footprintSamples(0, 0, 2, 1, .4).length, 9);
  const lib = readFileSync(new URL('./eldoria-live-village3d.js', import.meta.url), 'utf8');
  assert.match(lib, /const y = spec\.kind === 'tree' \? lo - spec\.size \* ANCESTRAL_ROOT_SINK : lo - \.03;/); // Mod 292: afundamento medido no perfil das raízes
  assert.match(lib, /new THREE\.LOD\(\)/);
  // Mod 292: os LOD1 do Mod 291 borravam a UV (costuras soldadas) e foram apagados; a cidade usa o LOD0 (cor certa)
  // e o mecanismo de LOD só aceita um arquivo que passe na prova de UV por vértice E por triângulo.
  assert.ok(!existsSync(new URL('./ArvoreFloresta01-lod1.glb', import.meta.url)), 'LOD1 borrado da mata não pode voltar');
  assert.match(lib, /triângulos com UV esticada/);

  assert.match(src, /mergeGroupMeshes\(villageCast\)/, 'moradores procedurais agrupados por material');
  assert.match(src, /trails-merged-mod291/);
  assert.match(src, /villageGroup\.visible=!south;prologueMeadow\.group\.visible=south;/, 'streaming por zona');
});

test('sub-bosque respeita trilhas/água e cristais são prismas facetados (não cones)', () => {
  const trees = [{ x: 0, z: 0, s: 1, collide: true }, { x: 10, z: 0, s: 1.2, collide: true }, { x: 30, z: 0, s: 1, collide: false }];
  const plan = planUndergrowth({ trees, banks: [{ x: 50, z: 5 }], isFree: (x) => x < 40 });
  assert.ok(plan.ferns.length > 3 && plan.ferns.every(f => f.x < 40));
  const d = crystalPrismData(), prof = crystalProfile(d.positions);
  assert.equal(prof.levels, 3, 'base, anel do topo e ponta'); assert.equal(prof.minY, -.5); assert.equal(prof.maxY, .5);
  let ringR = 0; for (let i = 0; i < d.positions.length; i += 3) { const y = d.positions[i + 1]; if (y > 0 && y < .49) ringR = Math.max(ringR, Math.hypot(d.positions[i], d.positions[i + 2])); }
  assert.ok(ringR > .6, 'corpo prismático largo até perto da ponta (cone teria raio ~0)');
  assert.equal(prof.triangles, 24, '6 faces de prisma ×2 + 6 da ponta + 6 da base');
  for (const f of ['eldoria-crystal-cavern.js', 'eldoria-cave-tunnel.js']) { const s = readFileSync(new URL('./' + f, import.meta.url), 'utf8'); assert.doesNotMatch(s, /CylinderGeometry\(0,1,1|CylinderGeometry\(\.04,1,1/); assert.match(s, /crystalPrismGeometry/); }
  assert.match(readFileSync(new URL('./dimension-arenas3d.js', import.meta.url), 'utf8'), /crystalClusterGeometry\(THREE/);
});

// O marcador é global: avança também quando a alteração não é de Eldória.
test('marcador e versão são derivados da metadata central', () => {
  assert.match(html, /id="marker" aria-label="Modificação"/);
  assert.match(html, /build-info\\.js/);
  assert.match(readFileSync(new URL('./mod181-loader.js', import.meta.url), 'utf8'), /build-info\\.js/);
});

test('marco 2: mata fechada usa o GLB do criador, respeita trilha/água e não forma fileiras', async () => {
  const { planMatureForest } = await import('./eldoria-mature-forest.js');
  const lake = { x: -27, z: -88, r: 11.5 }, zone = { x0: -70, x1: 40, z0: -148, z1: -80 };
  const isFree = (x, z) => Math.hypot(x - lake.x, z - lake.z) > lake.r + 3 && Math.abs(x) > 3; // trilha falsa em x=0
  const plan = planMatureForest({ lake, zone, isFree });
  assert.ok(plan.length >= 110, 'mata densa: ' + plan.length);
  for (const t of plan) assert.ok(isFree(t.x, t.z) && t.h >= 11 && t.h <= 22);
  for (let i = 0; i < plan.length; i++) for (let j = i + 1; j < plan.length; j++) assert.ok(Math.hypot(plan[i].x - plan[j].x, plan[i].z - plan[j].z) > 4, 'troncos colados');
  assert.ok(plan.filter(t => Math.hypot(t.x - lake.x, t.z - lake.z) < lake.r + 20).length >= 20, 'anel de árvores emoldura o lago');
  const xs = new Set(plan.map(t => Math.round(t.x / 4))); assert.ok(xs.size > 20, 'distribuição não alinhada em colunas');
  const lib = readFileSync(new URL('./eldoria-mature-forest.js', import.meta.url), 'utf8');
  assert.match(lib, /'\.\/ArvoreFloresta01\.glb'/); assert.doesNotMatch(lib, /'\.\/ArvoreFloresta01-lod1\.glb'/); // Mod 292: LOD1 borrado removido
  assert.match(src, /mountMatureForest\(THREE,GLTFLoader,\{/);
  assert.match(src, /wobble:\.6\}/, 'margem do lago orgânica');
  assert.match(readFileSync(new URL('./eldoria-water.js', import.meta.url), 'utf8'), /uFoamEnd - 14\.0/, 'sem espuma de rio dentro do lago');
});

test('LOD1: nenhum arquivo com UV borrada; a mata usa a malha completa; a ferramenta só grava LOD com UV íntegra', () => {
  // Mod 292: o LOD1 que existir é RE-ASSADO (textura própria por projeção do modelo completo) — nunca o antigo borrado
  for (const f of ['CasaEldoria01', 'CasaEldoria02', 'ArvoreAncestralEldoria', 'RochedoMusgoEldoria', 'PocoEldoria', 'BarracaFrutasEldoria', 'FerreiroEldoria', 'Carroça', 'ArvoreFloresta01']) {
    const p = new URL('./' + f + '-lod1.glb', import.meta.url); if (!existsSync(p)) continue;
    const b = readFileSync(p), j = JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString());
    assert.ok((j.images || []).length === 1 && j.materials.every(m => m.pbrMetallicRoughness.baseColorTexture), f + ' LOD1 com textura própria');
    assert.ok(j.nodes.some(n => /projeção/.test(n.extras?.metodo || '')), f + ' LOD1 assado por projeção');
    const tri = j.meshes.flatMap(m => m.primitives).reduce((s, pr) => s + j.accessors[pr.indices].count / 3, 0), src = j.nodes.find(n => n.extras?.triangulosLOD0).extras.triangulosLOD0;
    assert.ok(tri < src * .25, f + ' LOD1 ≥75 % mais leve'); assert.ok(statSync(p).size < 450 * 1024);
  }
  const lib = readFileSync(new URL('./eldoria-mature-forest.js', import.meta.url), 'utf8');
  assert.match(lib, /res\(build\(full, null\)\)/, 'faixa média usa a malha completa');
  const tool = readFileSync(new URL('./tools/eldoria/build-lod-glbs.mjs', import.meta.url), 'utf8');
  assert.match(tool, /prune\(\{ keepAttributes: true \}\)/); assert.match(tool, /worst < \.02 && saving >= \.35/); assert.doesNotMatch(tool, /wpos\.push/, 'sem solda por posição');
});

test('marco 2d: faixa distante usa impostor renderizado do GLB do criador (não primitivas), sem sobrepor o LOD médio', () => {
  const lib = readFileSync(new URL('./eldoria-mature-forest.js', import.meta.url), 'utf8');
  assert.match(lib, /export function renderImpostor\(THREE, renderer, geo, material/);
  assert.match(lib, /renderer\.setRenderTarget\(rt\); renderer\.render\(sc, cam\);/, 'viewport do alvo reaplicado por vista');
  assert.match(lib, /alphaTest: \.45/);
  assert.equal((lib.match(/registerCull\(far,/g) || []).length, 1, 'copa distante registrada no corte uma vez só');
  assert.match(src, /mountMatureForest\(THREE,GLTFLoader,\{scene,renderer,/);
});

test('marco 3: cidade bonita — deques/escadas nas ancestrais, passarela do criador, jardins, cercas claras, lampiões', async () => {
  const { planTreeDeck, planGardens } = await import('./eldoria-city-dressing.js');
  const { ELDORIA_PLOTS } = await import('./eldoria-live-village3d.js');
  const d = planTreeDeck({ x: 0, z: 0, trunk: 3, height: 7 });
  assert.ok(d.parts.length > 60 && d.deckY === 7 && d.ring > 3);
  assert.ok(d.parts.some(p => p.y < 1) && d.parts.some(p => p.y > 7), 'escada do chão ao deque');
  const g = planGardens({ center: ELDORIA_CENTER, plots: ELDORIA_PLOTS, isFree: () => true });
  assert.ok(g.flowers.length > 150 && g.hedges.length >= 10 && g.fences.length >= 30);
  const lib = readFileSync(new URL('./eldoria-city-dressing.js', import.meta.url), 'utf8');
  assert.match(lib, /'\.\/PassarelaSuspensaEldoria\.glb'/);
  assert.doesNotMatch(lib, /Ruina\w*\.glb|Destrocos|Escombro/, 'nada de ruínas: a pobreza fica nas pessoas e na comida');
  assert.match(src, /act1Props\.dressing=mountCityDressing\(THREE,GLTFLoader,\{/);
});
