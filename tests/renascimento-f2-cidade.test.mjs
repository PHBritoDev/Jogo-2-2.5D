// Renascimento de Eldória — Fase 2: chegada e praça (desenho puro + caminhável + contrato de integração).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PLAZA, PLAZA_OPENINGS, ENTRY_STREET, ABRIGO_VILA, TERRACE, insidePlaza, plazaPolar, openingAt, terraceParts, plazaProps, registerTerraceWalk } from '../eldoria-city-plaza.js';
import { ELDORIA_HOUSES, ELDORIA_SMITHY } from '../eldoria-city-layout.js';
import { ELDORIA_CENTER } from '../act1-world-layout.js';
import { ELDORIA_MARKET, ELDORIA_DRY_FOUNTAIN } from '../eldoria-live-village3d.js';
import { createWalkables, STEP_UP } from '../eldoria-walkable.js';

const world = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const C = ELDORIA_CENTER, abs = (o) => ({ x: C.x + o.x, z: C.z + o.z });

test('praça: abraça poço, fonte seca, bancas e a chegada da Rua da Entrada; casas ficam fora', () => {
  assert.ok(insidePlaza(C.x - 1.4, C.z - .6), 'poço dentro');
  const F = abs(ELDORIA_DRY_FOUNTAIN); assert.ok(insidePlaza(F.x, F.z), 'fonte seca dentro');
  const inside = ELDORIA_MARKET.filter(([x, z]) => insidePlaza(C.x + x, C.z + z)).length; assert.ok(inside >= 1, 'ao menos uma banca na praça');
  for (const h of [...ELDORIA_HOUSES, ELDORIA_SMITHY]) { const p = abs(h); assert.ok(!insidePlaza(p.x, p.z, h.size * .45), `casa ${h.id} fora do calçamento`); }
  const end = ENTRY_STREET.points[ENTRY_STREET.points.length - 1], prev = ENTRY_STREET.points[ENTRY_STREET.points.length - 2];
  // onde a rua cruza a borda, o meio-fio está aberto
  let cross = null; for (let t = 0; t <= 1; t += .01) { const x = prev[0] + (end[0] - prev[0]) * t, z = prev[1] + (end[1] - prev[1]) * t; if (insidePlaza(x, z)) { cross = plazaPolar(x, z); break; } }
  assert.ok(cross && openingAt(cross.theta)?.id === 'entrada', 'meio-fio aberto onde a rua chega');
  assert.ok(PLAZA_OPENINGS.length >= 4);
});

test('Rua da Entrada não invade a base nem os pilares do Abrigo da Vila', () => {
  const P = ENTRY_STREET.points; let min = 1e9;
  for (let i = 0; i < P.length - 1; i++) for (let t = 0; t <= 1; t += .02) { const x = P[i][0] + (P[i + 1][0] - P[i][0]) * t, z = P[i][1] + (P[i + 1][1] - P[i][1]) * t; min = Math.min(min, Math.hypot(x - ABRIGO_VILA.x, z - ABRIGO_VILA.z)); }
  assert.ok(min - ENTRY_STREET.width / 2 > ABRIGO_VILA.r, `borda da rua a ${(min - ENTRY_STREET.width / 2).toFixed(2)} m do centro (base ${ABRIGO_VILA.r} m)`);
});

test('adro: fora das casas, do passeio da moradora e das bancas; escadas confortáveis', () => {
  const T = TERRACE;
  for (const h of ELDORIA_HOUSES) { const p = abs(h), r = h.size * .45; assert.ok(Math.abs(p.x - T.x) > T.hx + r || Math.abs(p.z - T.z) > T.hz + r + 1.8, `adro longe da casa ${h.id}`); }
  for (const [x, z] of ELDORIA_MARKET) assert.ok(Math.hypot(C.x + x - T.x, C.z + z - T.z) > T.hx + 2);
  // passeio (elipse 1,3 × 0,7) da moradora que anda em torno de (−8,2; −50,8)
  assert.ok(-8.2 - 1.3 >= T.x + T.hx + .25, 'passeio fora do pódio');
  const { front, back } = terraceParts(T);
  for (const st of [front, back]) { const run = Math.hypot(st.b[0] - st.a[0], st.b[1] - st.a[1]); assert.ok(T.y / run < .4, 'inclinação de escada confortável'); assert.ok(T.y / st.steps <= .16, 'espelho ≤ 16 cm'); }
  assert.ok(T.y > STEP_UP, 'pódio mais alto que um passo: não se sobe pela lateral');
});

test('adro: caminhável sobe pela escadaria, desce pela escada norte, não se entra pela lateral nem se cai pelo parapeito', () => {
  const w = createWalkables(), T = TERRACE; registerTerraceWalk(w, 0);
  // na escadaria: apoio subindo de 0 a 0,6
  const f = terraceParts(T).front; let y = 0;
  for (let t = 0; t <= 1.0001; t += .1) { const x = f.a[0] + (f.b[0] - f.a[0]) * t, z = f.a[1] + (f.b[1] - f.a[1]) * t, s = w.supportAt(x, z, y); assert.ok(s, 'degrau sob o pé'); assert.ok(s.y >= y - 1e-9); y = s.y; assert.equal(w.blocked(x, z, y), null, 'escadaria livre'); }
  assert.ok(Math.abs(y - T.y) < 1e-6, 'chega ao piso do adro');
  assert.equal(w.supportAt(T.x, T.z, T.y).y, T.y);
  // lateral do pódio, com os pés no chão: bloqueia
  assert.ok(w.blocked(T.x - T.hx, T.z, 0), 'pódio bloqueia pela lateral'); assert.ok(w.blocked(T.x + T.hx, T.z + 1, 0));
  // no alto, o parapeito segura
  assert.ok(w.blocked(T.x - T.hx, T.z, T.y), 'parapeito no alto');
  // no chão, longe do adro: nada muda
  assert.equal(w.blocked(T.x, T.z + T.hz + 4, 0), null); assert.equal(w.supportAt(T.x + 8, T.z, 0), null);
});

test('carência pelos recursos: peças compostas à mão, determinísticas e fora das ruas', () => {
  const a = plazaProps(), b = plazaProps(); assert.deepEqual(a, b);
  const kinds = new Set(a.map(p => p.kind)); for (const k of ['bucket', 'rationTable', 'sack', 'crate', 'board', 'planter', 'lamp', 'bench']) assert.ok(kinds.has(k), k);
  assert.ok(a.filter(p => p.kind === 'bucket').length >= 4, 'fila de baldes vazios');
  assert.ok(a.filter(p => p.kind === 'sack').length <= 2, 'pouca ração');
  const P = ENTRY_STREET.points;
  const distSeg = (x, z) => Math.min(...P.slice(1).map((q, i) => { const p = P[i], dx = q[0] - p[0], dz = q[1] - p[1], t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - p[0] - dx * t, z - p[1] - dz * t); }));
  for (const p of a.filter(p => p.kind !== 'lamp')) assert.ok(distSeg(p.x, p.z) > ENTRY_STREET.width / 2 + .3, `${p.kind} fora da Rua da Entrada`);
});

test('praça: contrato de integração e rollback ?praca=0', () => {
  assert.match(world, /const PLAZA_ON=new URLSearchParams\(location\.search\)\.get\('praca'\)!=='0';/);
  assert.match(world, /buildCityPlaza\(THREE,\{scene:villageGroup,ground:groundHeightAt,walk:eldoriaWalk,obstacles:marketObstacles/);
  assert.match(world, /if\(cityPlaza\)torchSets\.push\(cityPlaza\)/);
  assert.match(world, /balde-vazio-moradora/);
  assert.ok(world.indexOf('const eldoriaWalk=createWalkables()') < world.indexOf('buildCityPlaza(THREE'), 'caminhável existe antes da praça');
  assert.ok(PLAZA.rx > 8 && PLAZA.rz > 7);
});
