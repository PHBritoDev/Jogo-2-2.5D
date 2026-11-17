/**
 * Mod 323 — revisão artística e física da jornada: vulcão sem costuras nem degraus (cume truncado, cratera, sopé
 * caminhável até o portal e bloqueio natural), poço da cachoeira, Cinzária com feitio e função variados, céu com
 * aurora suspensa (sem cilindro em volta do mapa) e integração (NPCs Meshy, câmera fora das casas, pedras como domos).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as J from '../jornada3d.js';
import { goldenFactor, auroraLevel } from '../ceu-atmosfera3d.js';

const V = J.VOLCANO2;
test('vulcão: superfície contínua (sem costura angular nem degraus), cratera funda e cume truncado', () => {
  for (const r of [50, 80, 120, 160, 200]) { let prev = null, mx = 0; for (let a = -Math.PI; a <= Math.PI + .006; a += .005) { const h = J.volcanoHeight(V.x + Math.cos(a) * r, V.z + Math.sin(a) * r); if (prev !== null) mx = Math.max(mx, Math.abs(h - prev)); prev = h; } assert.ok(mx < 1.6, 'salto angular em r=' + r + ': ' + mx.toFixed(2)); }
  for (const a of [0, 1, 2, 3, 4, 5]) { let prev = null, mx = 0; for (let r = 5; r < V.r * 1.15; r += .5) { const h = J.volcanoHeight(V.x + Math.cos(a) * r, V.z + Math.sin(a) * r); if (prev !== null) mx = Math.max(mx, Math.abs(h - prev)); prev = h; } assert.ok(mx < 2.2, 'salto radial em a=' + a + ': ' + mx.toFixed(2)); }
  const rims = []; for (let a = 0; a < 6.28; a += .2) rims.push(J.volcanoHeight(V.x + Math.cos(a) * V.crater, V.z + Math.sin(a) * V.crater));
  assert.ok(Math.max(...rims) - Math.min(...rims) > 15, 'borda assimétrica (um lado rebaixado)');
  assert.ok(J.craterFloor().y < Math.min(...rims) - 25, 'fundo da cratera bem abaixo da borda');
  assert.ok(J.volcanoHeight(V.x + V.r * 1.15, V.z) === 0, 'o cone termina no chão (sem borda flutuando)');
});

test('sopé: do centro de Cinzária à boca da caverna (Mod 327: pela trilha em volta do cone) sobe suave, os dois guardas ficam em chão firme e o cone acima é bloqueado', () => {
  const path = [[J.CITY2.x, J.CITY2.z], ...J.TRAIL2.slice(0, -1), [J.GATE2.x, J.GATE2.z]]; let prev = null, mx = 0;
  for (let i = 0; i < path.length - 1; i++) { const [ax, az] = path[i], [bx, bz] = path[i + 1], L = Math.hypot(bx - ax, bz - az); for (let s = 0; s <= L; s += 1) { const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L, y = J.journeyHeight(x, z); if (prev !== null) mx = Math.max(mx, Math.abs(y - prev)); prev = y; assert.ok(!J.journeyBlocked(x, z, y), 'caminho bloqueado em ' + x.toFixed(0) + ',' + z.toFixed(0)); } }
  assert.ok(mx < .6, 'rampa do sopé: ' + mx.toFixed(2) + ' m por metro');
  assert.ok(J.journeyHeight(J.GATE2.x, J.GATE2.z) - J.CITY2.y < 8, 'portal no avental baixo do cone');
  for (const g of J.GUARDS2) assert.ok(!J.journeyBlocked(g.x, g.z, 99));
  assert.ok(J.journeyBlocked(V.x + V.block - 2, V.z, 99) && J.journeyBlocked(V.x, V.z, 999), 'não se escala o cone');
});

test('cachoeira: cai num poço raso (0,7 m, caminhável) que alimenta o rio; nada de água sumindo no chão', () => {
  const P = J.FALL_POOL; assert.ok(Math.abs(J.riverDepth(P.x, P.z) - .7) < .01); assert.ok(!J.journeyBlocked(P.x, P.z, 5));
  assert.ok(Math.hypot(J.RIVER2[0][0] - P.x, J.RIVER2[0][1] - P.z) < P.r, 'o rio nasce no poço');
  assert.ok(J.journeyHeight(J.WATERFALL.x, J.WATERFALL.zTop) - J.journeyHeight(P.x, P.z) > 25, 'queda alta na serra');
  for (const F of J.ABYSS_FALLS) assert.ok(Math.abs(F.z - J.BRIDGE.z) > 40, 'quedas do abismo longe da ponte');
});

test('Cinzária: feitio e função variados (estalagem, ferraria, armazém, casas de pedra), telhados e alturas diferentes', () => {
  const L = J.cinzariaLayout(), st = L.map((h, i) => J.cinzariaStyle(h, i)), lm = J.cinzariaLandmarks(L);
  assert.ok(new Set(st.map(s => s.kind)).size >= 3, 'tipos: ' + [...new Set(st.map(s => s.kind))]);
  assert.ok(new Set(st.map(s => s.roof)).size >= 4, 'cores de telhado');
  assert.ok(new Set(L.map(h => h[4])).size >= 3, 'casas de 1, 2 e 3 pavimentos');
  assert.ok(lm.inn >= 0 && lm.smith >= 0 && lm.inn !== lm.smith, 'estalagem e ferraria');
  assert.ok(new Set(L.map(h => (h[2] * 10 | 0) + 'x' + (h[3] * 10 | 0))).size > L.length * .8, 'medidas não clonadas');
});

test('céu: aurora só de noite e de céu aberto, entrando aos poucos; hora dourada só com o sol baixo', () => {
  assert.equal(auroraLevel(0, 1), 0); assert.equal(auroraLevel(.5, 1), 0); assert.ok(auroraLevel(1, 1) > .99); assert.equal(auroraLevel(1, 0), 0);
  assert.ok(auroraLevel(.7, 1) > 0 && auroraLevel(.7, 1) < auroraLevel(.85, 1), 'transição suave');
  assert.equal(goldenFactor(50), 0); assert.ok(goldenFactor(3) > .9); assert.equal(goldenFactor(-20), 0);
});

test('integração: aurora sem cilindro, moradores Meshy, câmera fora das casas, pedras como domos, céu ligado ao relógio', () => {
  const w = fs.readFileSync(new URL('../jornada-world3d.js', import.meta.url), 'utf8'), m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8'), sky = fs.readFileSync(new URL('../ceu-atmosfera3d.js', import.meta.url), 'utf8');
  assert.ok(!/CylinderGeometry\(560/.test(w) && !/aurora/i.test(w.replace(/get aurora\(\) \{ return null; \}/, '').replace(/aurora: auroraUniforms|auroraUniforms|patchAuroraGround|aurora-luz3d|a aurora ilumina/g, '')), 'sem anel de aurora no mundo da jornada (Mod 327: só a LUZ da aurora-luz3d no relevo/água)');
  assert.ok(/uAurDir/.test(sky) && /for \(int i = 0; i < 2; i\+\+\)/.test(sky), 'aurora em arcos no céu (Mod 325: dois arcos, presentes em quase todos os rumos)');
  const folk = m.slice(m.indexOf('async function spawnCityFolk'), m.indexOf('function updateCityFolk'));
  assert.ok(/npcFactory\.create/.test(folk) && !/npcBase|makeTownsfolk/.test(folk), 'moradores de Cinzária com os NPCs Meshy');
  assert.ok(/createVillagerDriver\(THREE,c,brain/.test(folk), 'vida dos moradores (andar, parar, olhar)');
  assert.ok(m.includes('(journeyWorld&&journeyWorld.camBlocked(sx,sy,sz))'), 'braço da câmera não entra nos prédios');
  assert.ok(m.includes('for(const r of journeyWorld.rockColliders)rockObstacles.push(r);'), 'pedras da jornada com colisão em domo');
  assert.ok(m.includes('skyAtmo.update(dt,{camera,sunDir:SUN_DIRECTION'), 'atmosfera do céu acompanha a hora');
  assert.ok(/if\(camera\.far!==wantFar\)\{camera\.far=wantFar;camera\.updateProjectionMatrix\(\);\}/.test(m), 'vista longa na jornada');
  assert.ok(/t\.veg = \{ G, GC, g, F, FC, f \}/.test(w) && /GA\.set\(v\.G\.subarray/.test(w), 'capim calculado por bloco (repovoar só copia)');
});

test('revisão: cidade destruída não reaparece pelo LOD; bloco em construção não volta à fila (sem malha órfã)', () => {
  const w = fs.readFileSync(new URL('../jornada-world3d.js', import.meta.url), 'utf8');
  assert.ok(/city\.visible = dC < 460 && !cityGone/.test(w) && /setCityGone\(v\) \{ cityGone = !!v; if \(cityGone\) city\.visible = false; \}/.test(w));
  assert.ok(/filter\(k => !near\.has\(k\) && !\(job && job\.kind === 'near' && job\.k === k\)\)/.test(w) && /filter\(k => !far\.has\(k\) && !\(job && job\.kind === 'far' && job\.k === k\)\)/.test(w));
  assert.ok(/if \(\(kind === 'far' \? far : near\)\.has\(k\)\) continue;/.test(w), 'bloco já existente não é reconstruído');
});
