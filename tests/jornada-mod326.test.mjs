/**
 * Mod 326 — fluidos de jogo, fendas do terreno, aurora zenital e travadas: regras e causas raiz travadas por teste.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as J from '../jornada3d.js';
import { createRippleSim, createLava, lavaChannelPath, poolGeometry, riverGeometry, curtainGeometry } from '../fluidos3d.js';

// three.js real (o CI instala three@0.160.0 e aponta FLUID_THREE_DIR, como no combat315)
let THREE = null;
for (const dir of [process.env.FLUID_THREE_DIR, process.env.COMBAT_THREE_DIR, new URL('../node_modules/three', import.meta.url).pathname]) {
  if (!dir) continue; try { THREE = await import(dir.replace(/\/$/, '') + '/build/three.module.js'); break; } catch { /* próximo */ }
}
const needs3 = { skip: !THREE && !process.env.CI && 'three.js indisponível (defina FLUID_THREE_DIR)' };

const w = fs.readFileSync(new URL('../jornada-world3d.js', import.meta.url), 'utf8');
const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const sky = fs.readFileSync(new URL('../ceu-atmosfera3d.js', import.meta.url), 'utf8');
const fr = fs.readFileSync(new URL('../frontier3d.js', import.meta.url), 'utf8');
const up = g => { const p = g.attributes.position.array, ix = g.index.array; let upN = 0, dn = 0; for (let t = 0; t < ix.length; t += 3) { const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3, ux = p[b] - p[a], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vz = p[c + 2] - p[a + 2], ny = uz * vx - ux * vz; if (ny > 1e-9) upN++; else if (ny < -1e-9) dn++; } return { upN, dn }; };

test('ondulações: pé empurra, a onda se propaga e se amortece (simulação, não textura parada)', needs3, () => {
  assert.ok(THREE, 'CI precisa de three.js');
  const s = createRippleSim(THREE); s.follow(0, 0); s.disturb(0, 0, -.06, .6);
  for (let i = 0; i < 6; i++) s.step(1 / 30);
  const ring = Math.abs(s.peakAt(1.5, 0)) + Math.abs(s.peakAt(-1.5, 0)) + Math.abs(s.peakAt(0, 1.5)); assert.ok(ring > 1e-4, 'a perturbação chegou a 1,5 m');
  for (let i = 0; i < 200; i++) s.step(1 / 30);
  assert.ok(Math.abs(s.peakAt(0, 0)) < .01, 'amortece');
  const before = s.texU.value.version; s.disturb(0, 0, -.05); s.step(1 / 30); assert.ok(s.texU.value.version > before, 'sobe para a GPU');
});

test('água e lava: malhas voltadas para cima (antes a face era descartada e a água sumia), poço sem disco, rio com profundidade real', needs3, () => {
  assert.ok(THREE, 'CI precisa de three.js');
  const height = (x, z) => -Math.hypot(x, z) * .05;
  const pool = poolGeometry(THREE, { x: 0, z: 0, r: 8, level: -.1, height }); const pu = up(pool); assert.ok(pu.upN > 0 && pu.dn === 0, 'poço');
  const d = pool.attributes.aDepth.array; assert.ok(Math.min(...d) < 0 && Math.max(...d) > 0, 'borda seca some (aDepth negativo) — sem contorno de disco');
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(20, 0, 5), new THREE.Vector3(40, 0, 0)]);
  const rv = riverGeometry(THREE, curve, { height: () => 0, level: () => .5, N: 20 }); const ru = up(rv); assert.ok(ru.upN > 0 && ru.dn === 0, 'rio');
  assert.ok(rv.attributes.aFlow.count === rv.attributes.position.count, 'rio tem campo de fluxo');
  const hill = riverGeometry(THREE, curve, { height: () => 0, level: u => .5 + u * 20, N: 20 }), hp = hill.attributes.position.array; let mx = -1e9; for (let i = 1; i < hp.length; i += 3) mx = Math.max(mx, hp[i]); assert.ok(mx <= .5 + 1e-6, 'a água não sobe o morro');
  const lava = createLava(THREE, { height: () => 0, time: { value: 0 }, pools: [{ x: 0, z: 0, r: 3, seed: 1 }], channels: [lavaChannelPath(() => 0, 20, 0, { steps: 10 })] });
  for (const o of lava.group.children) if (o.isMesh && o.name !== 'jornada-borda-lava') { const u = up(o.geometry); assert.ok(u.upN > 0 && u.dn === 0, o.name); }
});

test('lava: o dano segue o contorno VISÍVEL (irregular), canais descem o relevo e evitam o que for proibido', needs3, () => {
  assert.ok(THREE, 'CI precisa de three.js');
  const lava = createLava(THREE, { height: () => 0, time: { value: 0 }, pools: [{ x: 0, z: 0, r: 4, seed: 2.3 }] });
  const mesh = lava.group.children.find(o => o.name === 'jornada-poca-lava'), p = mesh.geometry.attributes.position.array, rim = [];
  for (let i = p.length - 3 * 44; i < p.length; i += 3) rim.push(Math.hypot(p[i], p[i + 2]));
  assert.ok(Math.max(...rim) - Math.min(...rim) > .8, 'contorno irregular (não é círculo)');
  for (let i = p.length - 3 * 44; i < p.length; i += 3) { const x = p[i], z = p[i + 2], r = Math.hypot(x, z); assert.equal(lava.heatAt(x * .93, z * .93), 1, 'dentro'); assert.equal(lava.heatAt(x * (r + .4) / r, z * (r + .4) / r), 0, '40 cm fora'); }
  const slope = (x, z) => -x * .2; const ch = lavaChannelPath(slope, 0, 0, { steps: 20, seed: .4 }); assert.ok(ch.pts.at(-1)[0] > 4, 'desce o declive');
  const stop = lavaChannelPath(slope, 0, 0, { steps: 20, avoid: x => x > 5 }); assert.ok(stop.pts.every(q => q[0] <= 5), 'para antes da rua/cidade');
});

test('lava no jogo: dano por tick no caminho de dano real + queimadura com duração, selo e brasa; sem lava sólida', () => {
  assert.ok(/const LAVA_RULES=\{contact:38,contactEvery:600,burnTick:7,burnEvery:500,burnFor:5000\}/.test(m));
  assert.ok(/damagePlayerFromEnemyAttack\(LAVA_RULES\.contact,\{kind:'lava'\}\)/.test(m), 'i-frames, escudo, defesa e morte do jogo');
  assert.ok(/journeyWorld\.lavaHeat\(P\.x,P\.z\)>0/.test(m) && /lavaHeat\(x, z\) \{ return lavaSys\.heatAt\(x, z\); \}/.test(w));
  assert.ok(/if\(playerHP<=0\|\|cineActive\|\|voidMode\)\{lavaBurn\.until=0/.test(m), 'morte/retorno apagam a queimadura');
  assert.ok(!/addSolid\(\{ x: P\.x, z: P\.z, r: P\.r \* 1\.05 \}\)/.test(w), 'a lava não é mais parede invisível');
  assert.ok(!/BoxGeometry\(1, \.05, 1\), fissureGlow/.test(w), 'sem faixas retas aditivas fingindo magma');
  const html = fs.readFileSync(new URL('../mundo-3d-prototype.html', import.meta.url), 'utf8'); assert.ok(html.includes('id="burn-chip"') && html.includes('id="burn-veil"'));
});

test('cachoeira: termina abaixo do poço, sem véus soltos em leque; quedas do abismo com o mesmo material dinâmico', needs3, () => {
  assert.ok(THREE, 'CI precisa de three.js');
  assert.ok(/path\[N\]\.y = lvl0 - \.9/.test(w), 'a lâmina entra na água (sem ponta seca/triangular)');
  assert.ok(/u => W\.w \* \(\.95 \+ \.3 \* u/.test(w), 'largura quase constante (antes abria em leque)');
  assert.ok((w.match(/createFallMaterial\(T, \{/g) || []).length >= 2 && !/curtainMat\(/.test(w));
  const { g } = curtainGeometry(THREE, [{ x: 0, y: 10, z: 0 }, { x: 0, y: 0, z: 1 }], [1, 0], () => 4, 1); assert.ok(g.attributes.aL && g.index.count > 0);
});

test('fendas: maciços antigos fora do vale; borda sul fundida em encosta; bloco fino costurado à grade grossa', () => {
  assert.ok(/keepSpot:\(x,z,r\)=>!\(x<-100&&journeyBoundary\(x,z\)<r\)/.test(m) && /keepSpot\(spots\[i\]\.x, spots\[i\]\.z, spots\[i\]\.s \* \.75\)/.test(fr));
  assert.ok(J.inJourney(-200, -200) && !J.inJourney(-130, -200) && !J.inJourney(-200, -260), 'pé da serra sul agora é da jornada');
  assert.ok(J.JOURNEY_HOLES.some(h => h.x0 === -240 && h.x1 === -150 && h.z0 === -240 && h.z1 === -175), 'malha antiga recorta o mesmo trecho');
  assert.ok(/rd\(-150,-118,-175\),rd\(-240,-150,-240\)/.test(m) && /journeyBoundary\(x,z\)\+2\)\/14/.test(m), 'fusão só fora da área jogável');
  assert.ok(/if \(cell < FAR_CELL\) \{ \/\/ Mod 326: borda do bloco fino costurada/.test(w), 'sem T-junction fino/grosso');
  assert.ok(/sl \* 1\.6/.test(w), 'faixa leste afunda em encosta');
  assert.ok(/const built=oldTerrainGrid=buildTerrainArrays\(terrain3D/.test(m) && /const o=hOld\(x,z\);return o\+\(j-o\)\*k;/.test(m) && /\(-118-x\)\/32/.test(m), 'borda da jornada casa com a superfície DESENHADA da malha antiga (células grossas da serra norte)');
  assert.ok(/for \(let z = -178; z <= 90; z \+= 2\)/.test(w), 'faixa leste só no vale');
});

test('aurora zenital + travadas: coroa acima do herói; shaders aquecidos na tela antes do percurso', () => {
  assert.ok(/coroa ZENITAL/.test(sky) && /vec2 q = d\.xz \/ d\.y/.test(sky));
  assert.ok(/function warmJourneyPrograms\(\)/.test(m) && /renderer\.setScissor\(0,0,1,1\)/.test(m), 'desenho 1 px na própria tela (mesma variante de shader)');
  assert.ok(/setTimeout\(warmJourneyPrograms,600\)/.test(m));
});
