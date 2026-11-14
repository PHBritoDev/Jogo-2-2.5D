// Renascimento de Eldória — Fase 2: rio, margens e Vau das Pedras (forma pura + contrato de integração).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRiverQuery, shapeBankHeight, planRiverBanks, fordAlong, wrapTerrainForBanks, FORD, FORD_TRAIL, RIVER_BANK } from '../eldoria-river-banks.js';
import { RIVER_POINTS, RIVER, BRIDGE, FOREST_TRAILS } from '../act1-world-layout.js';
const PLAYER_WADE_MAX = 1.25; // mundo-3d-prototype.js (contrato water-wade)

const world = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const water = fs.readFileSync(new URL('../eldoria-water.js', import.meta.url), 'utf8');
const river = createRiverQuery(RIVER_POINTS, { width: RIVER.width * .98, level: RIVER.level });
const fordS = fordAlong(river), opts = { fordS, bridge: BRIDGE };
// leito sintético com o mesmo corte do canal do terreno (smoothstep(width, width*.45, d)) sobre um gramado levemente ondulado
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const h0 = (x, z) => { const q = river.nearest(x, z), d = q ? q.d : 99; return .15 + Math.sin(x * .13) * .35 + Math.cos(z * .21) * .2 - RIVER.depth * smooth(RIVER.width, RIVER.width * .45, d); };
const samples = []; for (let x = -80; x <= 80; x += 1.3) for (let z = -32; z <= 8; z += .9) samples.push([x, z]);

test('rio: margens nunca criam água nova e o leito só sobe no vau', () => {
  let lowered = 0;
  for (const [x, z] of samples) {
    const a = h0(x, z), b = shapeBankHeight(a, x, z, river, opts);
    if (a > RIVER.level) assert.ok(b > RIVER.level, `barranco seco continua seco em ${x},${z}`);
    if (a <= RIVER.level) assert.ok(b >= a - 1e-9, `abaixo da água só sobe (vau) em ${x},${z}`);
    if (b < a - .05) lowered++;
  }
  assert.ok(lowered > 400, `o barranco virou rampa de verdade (${lowered} pontos rebaixados)`);
});

test('rio: ponte e cabeceiras intocadas; cabeceira (cachoeira) e foz sem mudança', () => {
  for (const [x, z] of samples) {
    const a = h0(x, z);
    if (Math.hypot(x - BRIDGE.x, z - BRIDGE.z) < RIVER_BANK.bridgeKeep) assert.equal(shapeBankHeight(a, x, z, river, opts), a);
  }
  const head = river.centerline[3], foot = river.centerline[river.centerline.length - 3];
  for (const p of [head, foot]) assert.equal(shapeBankHeight(h0(p.x, p.z + 3), p.x, p.z + 3, river, opts), h0(p.x, p.z + 3));
});

test('vau: lâmina rasa (atravessável a pé) no Vau das Pedras e funda fora dele', () => {
  const q = river.nearest(FORD.x, FORD.z); assert.ok(q && q.d < 1.5, 'vau sobre o rio');
  assert.ok(Math.hypot(FORD.x - BRIDGE.x, FORD.z - BRIDGE.z) > 15, 'vau longe da ponte');
  const t = river.tangents[q.i], c = river.centerline[q.i];
  for (let k = -2.4; k <= 2.4; k += .3) {
    const x = c.x - t.z * k, z = c.z + t.x * k, depth = RIVER.level - shapeBankHeight(h0(x, z), x, z, river, opts);
    assert.ok(depth < PLAYER_WADE_MAX - .5, `travessia rasa (${depth.toFixed(2)} m) em ${k.toFixed(1)}`);
  }
  // 30 m rio abaixo o canal continua fundo (a ponte segue sendo a passagem principal)
  const far = river.centerline.find((p, i) => Math.abs(river.lengths[i] - (fordS + 30)) < 1);
  assert.ok(RIVER.level - shapeBankHeight(h0(far.x, far.z), far.x, far.z, river, opts) > 1, 'fora do vau continua fundo');
});

test('rio: pedras-degrau em passada, peças longe da ponte, determinístico', () => {
  const a = planRiverBanks(river, opts), b = planRiverBanks(river, opts);
  assert.deepEqual(a, b);
  assert.equal(a.steps.length, 6);
  for (let i = 1; i < a.steps.length; i++) { const d = Math.hypot(a.steps[i].x - a.steps[i - 1].x, a.steps[i].z - a.steps[i - 1].z); assert.ok(d > .85 && d < 1.3, `passada ${d.toFixed(2)} m`); }
  assert.ok(a.stones.length > 20 && a.reeds.length > 15, `margem povoada (${a.stones.length} pedras, ${a.reeds.length} juncos)`);
  for (const p of [...a.stones, ...a.reeds, ...a.boulders]) {
    assert.ok(Math.hypot(p.x - BRIDGE.x, p.z - BRIDGE.z) > RIVER_BANK.bridgeKeep, 'nada no vão da ponte');
    const q = river.nearest(p.x, p.z); assert.ok(q.d > 1.8 && q.d < 5, 'peças na faixa da margem');
  }
  const low = planRiverBanks(river, { ...opts, lowSpec: true });
  assert.ok(low.stones.length + low.reeds.length < a.stones.length + a.reeds.length, 'mobile com menos peças');
});

test('rio: wrapTerrainForBanks mantém waterDepth coerente com a altura nova', () => {
  const t = { height: h0, waterDepth: (x, z) => { const q = river.nearest(x, z); return q && q.d < RIVER.width * 1.2 ? RIVER.level - h0(x, z) : -99; } };
  wrapTerrainForBanks(t, river, opts);
  for (const [x, z] of samples.filter((p, i) => i % 7 === 0)) { const w = t.waterDepth(x, z); if (w > -98) assert.ok(Math.abs(w - (RIVER.level - t.height(x, z))) < 1e-9); }
  assert.ok(t.waterDepth(FORD.x, FORD.z) < .6);
});

test('rio: contrato de integração, trilha do vau e rollback ?rio=0', () => {
  assert.match(world, /RIVER_BANKS_ON=new URLSearchParams\(location\.search\)\.get\('rio'\)!=='0'/);
  assert.match(world, /if\(RIVER_BANKS_ON\)wrapTerrainForBanks\(terrain3D,riverQuery,riverBankOpts\);/);
  assert.ok(world.indexOf('wrapTerrainForBanks(terrain3D') < world.indexOf('const terrainMesh='), 'relevo das margens antes da malha do terreno');
  assert.match(world, /paintRiverBanks\(geo,riverQuery,riverBankOpts\)/);
  assert.match(world, /buildRiverBanks\(THREE,\{plan:riverBankPlan/);
  assert.match(world, /concat\(riverBoulderParts\)/, 'blocos grandes no mesmo InstancedMesh dos afloramentos');
  assert.match(world, /eldoriaRiver\.material\.setFord\(/);
  const riverLine = world.split('\n').find(l => l.startsWith('const eldoriaRiver=buildRiverMesh('));
  assert.ok(riverLine && /scene\.add\(eldoriaRiver\.mesh\)/.test(riverLine.split('//')[0]), 'a fita d\'água do rio continua na cena (fora de comentário)');
  assert.match(water, /uniform vec4 uFord;/);
  assert.ok(FOREST_TRAILS.some(t => t.id === FORD_TRAIL.id), 'Caminho do Vau registrado nas trilhas');
});
