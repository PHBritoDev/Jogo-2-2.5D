/**
 * Mod 321 — Jornada Eldória → Cinzária: percurso contínuo e caminhável, ponte do abismo com queda real, cidade sem
 * casas no caminho, dois guardas no sopé, pontos de TP seguros, migração de saves (Ato II e mapa).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as J from '../jornada3d.js';
import { ACT2, migrateAct2Step, DISTRICT_SPOTS, act2Presentation } from '../act2-flow.js';
import { MAP_POIS, WAYSTONES, createMapState, migrateLegacyFog, serializeMapState, isRevealed, FOG_CELLS, LEGACY_MAP_BOUNDS } from '../map3d.js';

const along = (pts, step = 2) => { const out = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az); for (let s = 0; s < L; s += step) out.push([ax + (bx - ax) * s / L, az + (bz - az) * s / L]); } out.push(pts[pts.length - 1]); return out; };
const houseAt = (x, z, pad = 0) => J.cinzariaLayout().find(([hx, hz, w, d, , ry]) => { const dx = x - hx, dz = z - hz, c = Math.cos(ry), s = Math.sin(ry), lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < w / 2 + pad && Math.abs(lz) < d / 2 + pad; });

test('percurso contínuo de ~1,3 km: caminhável do início ao portão, sem degraus nem casas no caminho', () => {
  assert.ok(J.ROUTE_LENGTH > 1200, 'jornada longa: ' + J.ROUTE_LENGTH.toFixed(0) + ' m');
  let prev = null, maxStep = 0;
  for (const [x, z] of along(J.ROUTE)) {
    assert.ok(J.inJourney(x, z) || x >= -112.5, 'fora da região em ' + x.toFixed(1));
    const deck = J.bridgeDeck(x, z), y = deck ? deck.y : J.journeyHeight(x, z);
    if (x < -113) assert.ok(!J.journeyBlocked(x, z, y), 'bloqueado em ' + x.toFixed(1) + ',' + z.toFixed(1));
    assert.ok(!houseAt(x, z, .6), 'casa no caminho em ' + x.toFixed(1) + ',' + z.toFixed(1));
    if (prev !== null && x < -113) maxStep = Math.max(maxStep, Math.abs(y - prev));
    prev = y;
  }
  assert.ok(maxStep < 1.2, 'degrau máximo a cada 2 m: ' + maxStep.toFixed(2));
});

test('ponte do abismo: tabuleiro firme de ponta a ponta, corrimão bloqueia quem anda, quem pula o corrimão cai num abismo sem fundo', () => {
  const B = J.BRIDGE;
  for (let x = B.x0 - .2; x > B.x1 + .2; x -= 1) { const d = J.bridgeDeck(x, B.z); assert.ok(d && !d.edge && d.y > B.y - B.sag - .01, 'tabuleiro em ' + x); }
  assert.ok(J.journeyBlocked(-860, B.z + B.half + .3, B.y - 1), 'corrimão segura quem anda no tabuleiro');
  assert.ok(!J.journeyBlocked(-860, B.z + B.half + .3, B.y + 1.2), 'pular por cima do corrimão é possível');
  assert.ok(J.inAbyss(-860, B.z + 6) && J.journeyHeight(-860, B.z + 6) < -250, 'abaixo só o abismo (sem fundo visível sob a névoa)');
  assert.ok(J.journeyHeight(B.x0 + 1, B.z) > B.y - 1 && J.journeyHeight(B.x1 - 1, B.z) > B.y - 1, 'extremos firmes ligados à rocha');
  const rim = J.journeyHeight(J.VOLCANO2.x + J.VOLCANO2.crater, J.VOLCANO2.z); assert.ok(rim > 150, 'vulcão monumental (cone com cratera): ' + rim.toFixed(0));
  assert.ok(J.journeyHeight(J.VOLCANO2.x, J.VOLCANO2.z) < rim - 30, 'cratera legível');
});

test('Cinzária: bairros com casas, rua principal e radiais livres, praça térrea, rotas dos moradores fora das casas', () => {
  const L = J.cinzariaLayout(); assert.ok(L.length >= 34, 'casas: ' + L.length);
  assert.deepEqual([...new Set(L.map(h => h[6]))].sort(), ['alto', 'mercado', 'oficinas', 'praca']);
  for (const r of J.CITY_ROUTES2) for (const p of r) assert.ok(!houseAt(p[0], p[1], .4), 'rota dentro de casa: ' + p);
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > (Math.min(a[2], a[3]) + Math.min(b[2], b[3])) / 2, 'casas sobrepostas'); }
  for (const [x, z] of J.CITY_PROPS.stalls) assert.ok(!houseAt(x, z, 1), 'banca dentro de casa');
});

test('dois guardas no sopé; pontos de TP e checkpoints em chão firme, fora de casas e do abismo', () => {
  assert.equal(J.GUARDS2.length, 2); assert.deepEqual(DISTRICT_SPOTS.volcanoGuards, J.GUARDS2.map(p => ({ ...p })));
  for (const p of [...Object.values(J.SAFE_SPOTS).filter(s => s.x < -112), ...J.CHECKPOINTS, ...J.GUARDS2, { x: J.GATE2.x + 4, z: J.GATE2.z }]) {
    assert.ok(!J.inAbyss(p.x, p.z) && !J.journeyBlocked(p.x, p.z, 99) && !houseAt(p.x, p.z, .8), 'ponto inseguro ' + p.x + ',' + p.z);
  }
});

test('migração: saves no passo 10 (beco/desconhecido antigos) seguem para a entrada do vulcão; textos sem cenário antigo', () => {
  assert.deepEqual(migrateAct2Step(ACT2.city, 1), { step: ACT2.gate, sub: 0, migrated: true });
  assert.deepEqual(migrateAct2Step(ACT2.volcano, 2), { step: ACT2.volcano, sub: 2, migrated: false });
  for (const st of [9, 10, 11]) assert.ok(!/Garganta, a oeste, até|Desconhecido|beco/i.test(act2Presentation(st, 0).objective));
});

test('mapa: POIs da jornada, abrigos novos, alias do Distrito e névoa antiga convertida', () => {
  for (const id of ['vale', 'cachoeira', 'ponte-abismo', 'cinzas', 'cinzaria', 'vulcao']) assert.ok(MAP_POIS.some(p => p.id === id), id);
  assert.ok(!MAP_POIS.some(p => ['distrito', 'mina', 'canal'].includes(p.id)));
  for (const id of ['abrigo-vale', 'abrigo-serra', 'abrigo-cinzaria']) { const w = WAYSTONES.find(x => x.id === id); assert.ok(w && !J.journeyBlocked(w.x, w.z, 99) && !houseAt(w.x, w.z, .8), id); }
  assert.ok(createMapState({ pois: ['distrito', 'mina'] }).pois.has('cinzaria'));
  const legacyCells = new Uint8Array(LEGACY_MAP_BOUNDS.cells ** 2), cs = LEGACY_MAP_BOUNDS.size / LEGACY_MAP_BOUNDS.cells; const k = Math.floor((-44.5 - LEGACY_MAP_BOUNDS.z0) / cs) * LEGACY_MAP_BOUNDS.cells + Math.floor((-12.2 - LEGACY_MAP_BOUNDS.x0) / cs); legacyCells[k] = 1;
  const bytes = new Uint8Array(Math.ceil(legacyCells.length / 8)); for (let i = 0; i < legacyCells.length; i++) if (legacyCells[i]) bytes[i >> 3] |= 1 << (i & 7);
  const migrated = createMapState(migrateLegacyFog({ cells: Buffer.from(bytes).toString('base64'), pois: ['vila'], waystones: [] }));
  assert.equal(migrated.cells.length, FOG_CELLS * FOG_CELLS); assert.ok(isRevealed(migrated, -12.2, -44.5), 'a vila vista continua vista'); assert.ok(migrated.pois.has('vila'));
  assert.ok(!isRevealed(migrated, -800, -50));
});

test('módulo visual da jornada carrega (sintaxe de módulo ES válida)', async () => { const m = await import('../jornada-world3d.js'); assert.equal(typeof m.createJourneyWorld, 'function'); });

test('integração no mundo: relevo/limites/água da jornada, recorte da malha antiga, colisão, queda e painel ADM restrito a ?adm=1', () => {
  const src = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(src.includes('holes:[terrainPatchRect,...JOURNEY_HOLES]'));
  assert.ok(src.includes('terrain3D.height=(x,z)=>{if(!inJourney(x,z))return h0(x,z);'));
  assert.ok(src.includes('if(journeyBlocked(x,z,player.position.y)||journeyWorld&&journeyWorld.solidAt(x,z,player.position.y))return true;'));
  assert.ok(/journeyFall\.on&&playerHP>0&&P\.y<JBRIDGE\.y-38\)\{playerHP=0;playerRespawnAt=/.test(src), 'queda no abismo mata e volta ao checkpoint');
  assert.ok(src.includes("get('adm')==='1'") && src.includes("'TP Cidade 1 — Eldória'") && /tpCity\(n\)\{return journeyTeleport\(n===1\|\|n==='eldoria'\?'eldoria':'cinzaria'\)/.test(src), 'painel ADM com TP (Mod 322 trocou o 2º botão pelo início do Vale; Cinzária segue pelo debug)');
  assert.ok(/function journeyTeleport\(key\)\{[\s\S]{0,400}journeyWorld\.prefetch\(S\.x,S\.z\)/.test(src), 'carrega o terreno antes de posicionar');
  assert.ok(!/cityLayout\(\)|DISTRICT_CANAL|inAlley/.test(src), 'cidade antiga removida do mundo');
});
