/** MOD 292 — Eldória reconstruída: plano urbano orgânico, ponte como entrada obrigatória, árvores autorais e
 *  superfícies caminháveis. Testes sem WebGL (geometria/dados); o render real fica nas capturas do jogo. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { ELDORIA_CENTER, RIVER_POINTS, RIVER, BRIDGE, bridgeDeck, CART_ROUTE, ELDORIA_DROP, TEREN_ROAD } from './act1-world-layout.js';
import { ELDORIA_HOUSES, ELDORIA_SMITHY, ELDORIA_STREETS, ELDORIA_MAIN_TREE, ELDORIA_SIDE_TREE, ANCESTRAL_ROOT_SPREAD, yawFacing, doorDirection, doorstep, doorPaths, housePlots } from './eldoria-city-layout.js';
import { eldoriaSpecs, planOverlaps, footprintRadius } from './eldoria-live-village3d.js';

const src = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
const grab = name => JSON.parse(src.match(new RegExp('const ' + name + '=(\\[\\[[^;]*?\\]\\])[;.]'))[1].replace(/([[,])(-?)\./g, '$1$20.'));
const mainTrail = grab('mainTrail'), villageTrail = grab('villageTrail'), altarStart = JSON.parse(src.match(/altarTrail=(\[\[[^;]*?\]\])\.concat/)[1].replace(/([[,])(-?)\./g, '$1$20.')), districtStart = JSON.parse(src.match(/const districtTrail=(\[\[[^;]*?\]\])\.concat/)[1].replace(/([[,])(-?)\./g, '$1$20.'));
const segDist = (x, z, pts) => { let b = Infinity; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], c = pts[i], dx = c[0] - a[0], dz = c[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0; b = Math.min(b, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return b; };
const C = ELDORIA_CENTER, W = h => ({ x: C.x + h.x, z: C.z + h.z });
const shopTrail = [[-12.2, -44.5], [-18, -45.6], [-24, -45.2], [-27.4, -45]];
const STREETS = [{ n: 'principal', p: mainTrail, w: 5.2 }, { n: 'vila', p: villageTrail, w: 4 }, { n: 'loja', p: shopTrail, w: 3.4 }, { n: 'distrito', p: districtStart, w: 3.6 }, { n: 'altar', p: altarStart, w: 3.4 }, ...Object.entries(ELDORIA_STREETS).map(([n, p]) => ({ n, p, w: 3 }))];
const all = [...ELDORIA_HOUSES, ELDORIA_SMITHY];

test('rio ao sul da cidade e ponte como entrada obrigatória para quem vem da floresta', () => {
  // toda a cidade (casas, praça) fica ao norte do rio; a estrada de Teren e o desembarque ficam ao sul
  const riverZ = x => { for (let i = 1; i < RIVER_POINTS.length; i++) { const [ax, az] = RIVER_POINTS[i - 1], [bx, bz] = RIVER_POINTS[i]; if ((x - ax) * (x - bx) <= 0) return az + (bz - az) * (x - ax) / (bx - ax); } return null; };
  for (const h of all) { const w = W(h); assert.ok(w.z < riverZ(w.x) - 6, h.id + ' precisa ficar ao norte do rio'); }
  assert.ok(C.z < riverZ(C.x) - 20, 'praça ao norte do rio');
  for (const [x, z] of TEREN_ROAD) assert.ok(z > riverZ(Math.max(-87, Math.min(87, x))) + 5, 'estrada de Teren ao sul do rio');
  assert.ok(ELDORIA_DROP.z > riverZ(ELDORIA_DROP.x) + BRIDGE.halfLength - 1, 'a carroça para antes da ponte (o jogador atravessa a pé)');
  assert.ok(CART_ROUTE.every(([x, z]) => z > riverZ(Math.max(-87, Math.min(87, x)))), 'a carroça não cruza o rio');
  // a única travessia da rua principal é a ponte: o ponto em que a rua cruza o rio está no tabuleiro
  let crossings = 0, prev = null;
  for (let i = 1; i < mainTrail.length; i++) { const [ax, az] = mainTrail[i - 1], [bx, bz] = mainTrail[i]; for (let k = 0; k <= 40; k++) { const t = k / 40, x = ax + (bx - ax) * t, z = az + (bz - az) * t, r = riverZ(x); if (r === null) continue; const side = Math.sign(z - r); if (!side) continue; if (prev !== null && side !== prev) { crossings++; const d = bridgeDeck(x, z); assert.ok(d && !d.edge, 'cruzamento fora da ponte em ' + x.toFixed(1) + ',' + z.toFixed(1)); } prev = side; } }
  assert.equal(crossings, 1, 'a rua principal cruza o rio uma vez, pela ponte');
  assert.ok(segDist(BRIDGE.x, BRIDGE.z, RIVER_POINTS) < .3, 'ponte sobre o leito');
  // ponte perpendicular ao rio (±15°)
  const i = RIVER_POINTS.findIndex(([x]) => x < BRIDGE.x), [ax, az] = RIVER_POINTS[i - 1], [bx, bz] = RIVER_POINTS[i], rl = Math.hypot(bx - ax, bz - az);
  assert.ok(Math.abs(((bx - ax) * BRIDGE.axisX + (bz - az) * BRIDGE.axisZ) / rl) < Math.sin(15 * Math.PI / 180));
  // nenhuma outra trilha da cidade cruza o rio (não há saída "pela ponte" para a mata)
  for (const s of STREETS.filter(s => s.n !== 'principal')) for (const [x, z] of s.p) assert.ok(z < riverZ(x) - 3, s.n + ' cruza o rio');
});

test('casas em bairros, com função, porta voltada para a rua e acesso livre', () => {
  assert.equal(new Set(all.map(h => h.id)).size, all.length);
  for (const h of all) {
    assert.ok(h.funcao && h.bairro, h.id + ' sem função/bairro');
    const w = W(h), r = h.size * .42;
    for (const s of STREETS) assert.ok(segDist(w.x, w.z, s.p) > r + s.w / 2 + .3, `${h.id} invade a rua ${s.n} (${segDist(w.x, w.z, s.p).toFixed(2)})`);
    assert.ok(segDist(w.x, w.z, RIVER_POINTS) > r + RIVER.width / 2 + 3, h.id + ' na margem do rio');
    for (const t of [ELDORIA_MAIN_TREE, ELDORIA_SIDE_TREE]) assert.ok(Math.hypot(w.x - C.x - t.x, w.z - C.z - t.z) > t.size * ANCESTRAL_ROOT_SPREAD * .9, h.id + ' sobre as raízes de ' + t.file);
    for (const o of all) if (o !== h) assert.ok(Math.hypot(h.x - o.x, h.z - o.z) > r + o.size * .42 + .6, h.id + ' colada em ' + o.id);
    // a porta aponta para o ponto de rua escolhido e esse ponto está numa rua
    const yaw = yawFacing(h.file, h.faceTo[0] - h.x, h.faceTo[1] - h.z), [dx, dz] = doorDirection(h.file, yaw), L = Math.hypot(h.faceTo[0] - h.x, h.faceTo[1] - h.z);
    assert.ok(Math.abs(dx - (h.faceTo[0] - h.x) / L) < 1e-9 && Math.abs(dz - (h.faceTo[1] - h.z) / L) < 1e-9);
    const fx = C.x + h.faceTo[0], fz = C.z + h.faceTo[1];
    assert.ok(Math.min(...STREETS.map(s => segDist(fx, fz, s.p) - s.w / 2)) < 1.2 || Math.hypot(h.faceTo[0], h.faceTo[1]) < 1, h.id + ' porta não dá para rua nem praça');
    // o caminho da soleira até a rua não atravessa outra casa
    const d = doorstep(h);
    for (const o of all) if (o !== h) { const ow = W(o); assert.ok(segDist(ow.x, ow.z, [[d.x, d.z], [fx, fz]]) > o.size * .42, h.id + ' acesso atravessa ' + o.id); }
  }
  assert.equal(housePlots().length, ELDORIA_HOUSES.length);
  assert.equal(doorPaths().length, all.length);
  assert.deepEqual(planOverlaps(), []);
});

test('núcleo urbano sem árvores pequenas; colossal ao fundo da praça e lateral com casa da árvore', () => {
  const trees = eldoriaSpecs().filter(s => s.kind === 'tree');
  assert.equal(trees.length, 2, 'só as duas árvores ancestrais no núcleo');
  assert.ok(trees.every(t => t.file === 'ArvoreAncestralEldoria.glb'));
  // a colossal fica no eixo de quem atravessa a ponte (à frente, ao norte, atrás da praça)
  const m = W(ELDORIA_MAIN_TREE); assert.ok(m.z < C.z - 18 && Math.abs(m.x - BRIDGE.x) < 18);
  const ang = Math.atan2(m.x - BRIDGE.x, -(m.z - BRIDGE.z)) * 180 / Math.PI; assert.ok(Math.abs(ang) < 30, 'colossal visível de frente ao sair da ponte (' + ang.toFixed(0) + '°)');
  assert.ok(segDist(m.x, m.z, mainTrail) > 10, 'raízes da colossal fora da rua principal');
  const s = W(ELDORIA_SIDE_TREE); assert.ok(segDist(s.x, s.z, mainTrail) > 9);
});

test('superfícies caminháveis: sobe/desce escada, para, pula, cai pela borda e passa por baixo do deque', async () => {
  const { createWalkables, stepVertical, STEP_UP } = await import('./eldoria-walkable.js');
  const w = createWalkables(), ground = () => 0;
  w.addSpan([0, 0], [-4, 0], 1.5, 0, 3, 'lance', true);          // lance: sobe 3 m em 4 m
  w.addSpan([-4, 0], [-5.6, 0], 1.5, 3, 3, 'patamar');
  w.addRect(4, 6, 3, 3, 6, 'deque');
  w.addWall([1, 9], [7, 9], 6, 7.05, 'guarda-corpo');
  const sim = (path, st = { y: 0, vy: 0, grounded: true }) => { for (const [x, z] of path) stepVertical(st, 1 / 30, { terrain: ground(x, z), support: y => w.supportAt(x, z, y) }); return st; };
  // subir o lance a 4,3 m/s (30 quadros/s) chega ao patamar
  const up = []; for (let x = .6; x >= -5; x -= 4.3 / 30) up.push([x, 0]);
  let st = sim(up); assert.ok(Math.abs(st.y - 3) < 1e-6 && st.grounded, 'chegou ao patamar: ' + st.y);
  // parado no patamar continua lá
  st = sim(Array(30).fill([-5, 0]), st); assert.equal(st.y, 3);
  // descer
  st = sim(up.slice().reverse(), st); assert.ok(st.y < .01 && st.grounded);
  // por baixo do deque (6 m): continua no chão
  st = sim([[3, 6], [4, 6], [5, 6]], { y: 0, vy: 0, grounded: true }); assert.equal(st.y, 0);
  // no deque: pulo volta ao deque
  st = { y: 6, vy: 5.2, grounded: false }; for (let i = 0; i < 60; i++) stepVertical(st, 1 / 30, { terrain: 0, support: y => w.supportAt(4, 6, y) }); assert.ok(st.grounded && st.y === 6, 'pousou no deque');
  // saiu pela borda: cai até o chão (não teleporta)
  st = { y: 6, vy: 0, grounded: true }; const tr = []; for (let i = 0; i < 60; i++) { stepVertical(st, 1 / 30, { terrain: 0, support: y => w.supportAt(7.5, 6, y) }); tr.push(st.y); }
  assert.ok(tr[1] > 5 && tr.at(-1) === 0, 'queda contínua: ' + tr.slice(0, 3).map(v => v.toFixed(2)));
  // guarda-corpo bloqueia no deque mas não no chão; lateral baixa da escada bloqueia, alta deixa passar por baixo
  assert.ok(w.blocked(4, 9, 6, ground)); assert.ok(!w.blocked(4, 9, 0, ground));
  assert.ok(w.blocked(-1, 0, 0, ground), 'lateral baixa do lance'); assert.ok(!w.blocked(-3.9, 0, 0, ground), 'altura livre sob o topo do lance');
  assert.ok(STEP_UP > 4.3 / 30 * .75 * 2.5, 'degrau aceita o passo do SwiftShader acelerado');
});

test('estruturas das árvores: escada nasce no chão, anéis acima do tronco medido, passarela livre da rua', async () => {
  const { treeStructurePlan } = await import('./eldoria-city-layout.js');
  const P = treeStructurePlan();
  assert.equal(P.stair.length, 3); assert.equal(P.stair[0].a[2], 0); assert.equal(P.stair.at(-1).b[2], P.deck);
  for (const s of P.stair.filter(s => s.kind === 'flight')) { const run = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]), rise = Math.abs(s.b[2] - s.a[2]); assert.ok(rise / run < .95, 'lance íngreme demais'); }
  assert.ok(P.ringM.r0 >= ELDORIA_MAIN_TREE.size * .16 && P.ringS.r0 >= ELDORIA_SIDE_TREE.size * .16, 'anel por fora do tronco (r90 medido 0,14 H)');
  const mid = [(P.walkway.a[0] + P.walkway.b[0]) / 2, (P.walkway.a[1] + P.walkway.b[1]) / 2];
  assert.ok(segDist(mid[0], mid[1], mainTrail) > 4.2, 'pilar central fora da rua principal');
  // a escada não invade rua nenhuma
  for (const s of P.stair) for (const p of [s.a, s.b]) for (const st of STREETS.filter(st => st.n !== 'leste')) assert.ok(segDist(p[0], p[1], st.p) > st.w / 2 + .6, 'escada sobre a rua ' + st.n);
  // a rua leste é o acesso: termina no pé da escada
  const foot = P.stair[0].a, end = ELDORIA_STREETS.leste.at(-1); assert.ok(Math.hypot(foot[0] - end[0], foot[1] - end[1]) < 2.5, 'rua leste chega ao pé da escada');
});
