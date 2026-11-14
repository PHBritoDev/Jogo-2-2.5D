// Renascimento de Eldória — Fase 2: fachadas e sinais de vida (plano puro + contrato de integração).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FACADE_AUDIT, planFacadeDetails, besideDoor, doorFront, routeAt, PORTER_ROUTE, TAX_GUARD } from '../eldoria-city-facades.js';
import { ELDORIA_HOUSES, ELDORIA_DOOR_LOCAL } from '../eldoria-city-layout.js';
import { ENTRY_STREET, plazaProps } from '../eldoria-city-plaza.js';

const world = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const npcs = fs.readFileSync(new URL('../eldoria-meshy-npcs.js', import.meta.url), 'utf8');
const glbClips = f => { const b = fs.readFileSync(new URL('../' + f, import.meta.url)), len = b.readUInt32LE(12); return (JSON.parse(b.slice(20, 20 + len).toString()).animations || []).map(a => a.name); };

test('auditoria: porta de cada GLB na mesma face que o layout usa', () => {
  const face = ([x, z]) => x < 0 ? '-x' : x > 0 ? '+x' : z > 0 ? '+z' : '-z';
  for (const f of ['CasaEldoria01.glb', 'CasaEldoria02.glb', 'FerreiroEldoria.glb']) assert.equal(FACADE_AUDIT[f].door.face, face(ELDORIA_DOOR_LOCAL[f]), f);
  assert.ok(fs.readFileSync(new URL('../tools/visual-lab/facade-audit.html', import.meta.url), 'utf8').includes('FACADE_AUDIT'), 'ferramenta de auditoria versionada');
});

test('fachadas: nada no vão nem na frente das portas; nada na Rua da Entrada', () => {
  const plan = planFacadeDetails(), byId = Object.fromEntries(ELDORIA_HOUSES.map(h => [h.id, h]));
  for (const p of plan.filter(p => p.kind !== 'clothesline')) {
    const h = byId[p.house], A = FACADE_AUDIT[h.file].door;
    for (let out = .2; out <= 1.6; out += .2) { const d = doorFront(h, out); assert.ok(Math.hypot(p.x - d.x, p.z - d.z) > A.half * h.size + .45, `${p.kind} de ${p.house} livre da passagem da porta`); }
  }
  for (const p of plan.filter(p => p.kind === 'trough')) { const h = byId[p.house], left = besideDoor(h, -1, .3), right = besideDoor(h, 1, .3);
    assert.ok(Math.min(Math.hypot(p.x - left.x, p.z - left.z), Math.hypot(p.x - right.x, p.z - right.z)) < .6, 'jardineira encostada ao lado da porta'); }
  const P = ENTRY_STREET.points, dist = (x, z) => Math.min(...P.slice(1).map((q, i) => { const p = P[i], dx = q[0] - p[0], dz = q[1] - p[1], t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - p[0] - dx * t, z - p[1] - dz * t); }));
  for (const p of plan) { const pts = p.kind === 'clothesline' ? [[p.ax, p.az], [p.bx, p.bz]] : [[p.x, p.z]]; for (const [x, z] of pts) assert.ok(dist(x, z) > 2.5, `${p.kind} fora da rua`); }
  assert.deepEqual(planFacadeDetails(), plan, 'determinístico');
});

test('ações de NPC: só clipes que existem no rig; carregador vai cheio e volta vazio', () => {
  const man = glbClips('NPC_Masculino_Animado_Otimizado_1K.glb'), woman = glbClips('MulherNpc-otimizado.glb');
  assert.ok(man.includes('Walking') && man.includes('Alert'), 'Walking e Alert existem no homem');
  assert.ok(![...man, ...woman].some(n => /sweep|broom|carry|varr/i.test(n)), 'não há clipe de varrer/carregar (bloqueio documentado)');
  const go = routeAt(PORTER_ROUTE, 3), back = routeAt(PORTER_ROUTE, 30), end = PORTER_ROUTE[PORTER_ROUTE.length - 1];
  assert.equal(go.loaded, true); assert.equal(back.loaded, false);
  const table = plazaProps().find(p => p.kind === 'rationTable'); assert.ok(Math.hypot(end[0] - table.x, end[1] - table.z) < 2, 'termina na mesa de ração');
  const board = plazaProps().find(p => p.kind === 'board'); assert.ok(Math.hypot(TAX_GUARD.x - board.x, TAX_GUARD.z - board.z) < 2, 'guarda ao lado do edital');
  for (let t = 0; t < 60; t += .5) { const r = routeAt(PORTER_ROUTE, t); assert.ok(Number.isFinite(r.x) && Number.isFinite(r.z)); assert.ok(Math.hypot(r.x - board.x, r.z - board.z) > .9, 'rota não atravessa o quadro'); }
  assert.match(npcs, /clipRe/); assert.match(world, /clipRe:\/\^alert\$\/i/);
});

test('fachadas: contrato de integração e rollback ?fachadas=0', () => {
  assert.match(world, /const FACADES_ON=new URLSearchParams\(location\.search\)\.get\('fachadas'\)!=='0';/);
  assert.match(world, /buildCityFacades\(THREE,\{scene:villageGroup,ground:groundHeightAt,obstacles:marketObstacles/);
  assert.match(world, /if\(cityFacades\)torchSets\.push\(cityFacades\)/);
  assert.match(world, /if\(FACADES_ON\)Promise\.all\(\[/);
  assert.match(world, /para e dá passagem ao herói/, 'carregador para quando o herói está à frente (não trava a rua)');
});
