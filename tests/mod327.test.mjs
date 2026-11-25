/**
 * Mod 327 — revisão jogável: água presa ao relevo, dash (pose + física), entrada vulcânica, fauna e mortes.
 * Testes com dados REAIS (GLB do herói, relevo da jornada, colisão do controlador) e não só regex do código.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as J from '../jornada3d.js';
import { poolGeometry, riverGeometry } from '../fluidos3d.js';
import { PROTA_DASH, PROTA_JUMP, protaSegments, dashSettle } from '../prota-combat3d.js';
import { moveWithCollision } from '../experiments/aerial-combat/controller.js';

let THREE = null;
for (const dir of [process.env.FLUID_THREE_DIR, process.env.COMBAT_THREE_DIR, new URL('../node_modules/three', import.meta.url).pathname]) {
  if (!dir) continue; try { THREE = await import(dir.replace(/\/$/, '') + '/build/three.module.js'); break; } catch { /* próximo */ }
}
const needs3 = { skip: !THREE && !process.env.CI && 'three.js indisponível (defina FLUID_THREE_DIR)' };
const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const w = fs.readFileSync(new URL('../jornada-world3d.js', import.meta.url), 'utf8');

/* ---------- P0: água suspensa no Vale ---------- */
test('água do Vale: poço e rio seguem o relevo com profundidade real — nenhuma borda pendurada no ar', needs3, () => {
  assert.ok(THREE, 'CI precisa de three.js');
  const h = (x, z) => J.journeyHeight(x, z) ?? 0, F = J.FALL_POOL;
  const lvl = h(F.x, F.z) + .7;
  const old = poolGeometry(THREE, { x: F.x, z: F.z, r: F.r + 3.5, level: lvl, height: h, rings: 14, segs: 56 });
  const neu = poolGeometry(THREE, { x: F.x, z: F.z, r: F.r + 3.5, level: lvl, height: h, rings: 14, segs: 56, maxDepth: J.riverDepth });
  const hang = g => { const d = g.attributes.aDepth.array; let mx = 0; for (let i = 14 * 56; i < 15 * 56; i++) mx = Math.max(mx, d[i]); return mx; };
  assert.ok(hang(old) > .8, 'reprodução: sem maxDepth a lâmina plana fica ~1 m acima do chão na saída do poço');
  const d = neu.attributes.aDepth.array; let over = 0;
  for (let i = 14 * 56; i < 15 * 56; i++) { const x = neu.attributes.position.array[i * 3], z = neu.attributes.position.array[i * 3 + 2]; if (d[i] > .05 && J.riverDepth(x, z) < .3) over++; }
  assert.equal(over, 0, 'anel externo encosta no chão (exceto onde o rio continua)');
  for (let i = 0; i < d.length; i++) assert.ok(d[i] <= .7 + 1e-6, 'profundidade nunca passa da física (riverDepth .7)');
  const curve = new THREE.CatmullRomCurve3(J.RIVER2.map(p => new THREE.Vector3(p[0], 0, p[1])));
  const rg = riverGeometry(THREE, curve, { height: h, level: u => h(curve.getPoint(u).x, curve.getPoint(u).z) + .55, halfW: 6.2, cross: 8, N: 120, maxDepth: J.riverDepth });
  const rd = rg.attributes.aDepth.array; for (let i = 0; i <= 120; i++) for (const k of [0, 8]) assert.ok(rd[i * 9 + k] <= 1e-6, 'bordas do rio no chão');
  assert.ok(/maxDepth: riverDepth \}\)/.test(w) && /maxDepth: riverDepth,/.test(w), 'o jogo passa a profundidade física às duas malhas');
});

/* ---------- P1: dash — pose ---------- */
function glbClipYaw(file, clipName, bone = 'Hips') {
  const b = fs.readFileSync(file), len = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + len).toString()), bin = 20 + len + 8;
  const acc = i => { const a = j.accessors[i], bv = j.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type], o = bin + (bv.byteOffset || 0) + (a.byteOffset || 0); return new Float32Array(b.buffer.slice(b.byteOffset + o, b.byteOffset + o + a.count * n * 4)); };
  const an = j.animations.find(a => a.name === clipName); assert.ok(an, clipName);
  const ch = an.channels.find(c => j.nodes[c.target.node].name === bone && c.target.path === 'rotation'), s = an.samplers[ch.sampler], t = acc(s.input), v = acc(s.output);
  return { t, yaw: Array.from(t, (_, k) => { const [x, y, z, ww] = v.subarray(k * 4, k * 4 + 4); return Math.atan2(2 * (ww * y + x * z), 1 - 2 * (y * y + x * x)) * 180 / Math.PI; }) };
}
const span = (r, a, b) => r.yaw.filter((_, k) => r.t[k] >= a - 1e-4 && r.t[k] <= b + 1e-4);
const heroGlb = new URL('../Prota_otimizado_2K.glb', import.meta.url);

test('dash: o herói reaparece de frente — quadril do clipe de chegada a ±25° da corrida (antes começava no meio do giro)', { skip: !fs.existsSync(heroGlb) && 'GLB do herói ausente' }, () => {
  const run = glbClipYaw(heroGlb, 'Running'), runYaw = run.yaw.reduce((a, b) => a + b, 0) / run.yaw.length;
  const oldArr = span(glbClipYaw(heroGlb, 'Quick_Step_and_Spin_Dodge'), .82, 1.16);
  assert.ok(Math.max(...oldArr.map(y => Math.abs(y - runYaw))) > 60, 'reprodução: a cauda do giro chega a >60° da frente (contorção vista no vídeo 4)');
  const seg = protaSegments().find(s => s.id === 'Prota302_arrive'); assert.equal(seg.clip, PROTA_DASH.arrive.clip);
  const arr = span(glbClipYaw(heroGlb, seg.clip), seg.start, seg.end); assert.ok(arr.length >= 6);
  for (const y of arr) assert.ok(Math.abs(y - runYaw) < 25, `quadril ${y.toFixed(0)}° vs corrida ${runYaw.toFixed(0)}°`);
  assert.ok(seg.end - seg.start <= .3 && seg.end <= .87, 'trecho curto dentro do clipe');
  assert.ok(seg.clip === PROTA_JUMP.clip && seg.start >= PROTA_JUMP.land, 'é o amortecimento do pouso do próprio salto do herói (mesmo esqueleto, sem retarget)');
});

/* ---------- P1: dash — física ---------- */
const STEP = 1 / 30, dashDist = PROTA_DASH.distance;
function simDash(start, dir, blocked, fps = 30) {
  const p = { ...start, y: 0 }, trail = [p.x, p.z]; let rem = PROTA_DASH.travel; const dt = 1 / fps;
  while (rem > 0) {
    const d = Math.min(dt, rem), u = 1 - rem / PROTA_DASH.travel, sp = dashDist / PROTA_DASH.travel * (1.55 - 1.1 * u);
    const bx = p.x, bz = p.z, nx = p.x + dir.x * sp * d, nz = p.z + dir.z * sp * d; moveWithCollision(p, nx - p.x, nz - p.z, blocked);
    trail.push(p.x, p.z); if (Math.hypot(p.x - bx, p.z - bz) < Math.hypot(nx - bx, nz - bz) * .35) rem = d; rem = Math.max(0, rem - dt);
  }
  return { p, trail };
}
test('dash: varredura em substeps — parede fina, guarda-corpo diagonal e canto nunca são atravessados (qualquer FPS)', () => {
  const thin = (x) => x > 2 && x < 2.06;                       // parede de 6 cm
  const rail = (x, z) => Math.abs((x - z) / Math.SQRT2) < .05 && x > -10 && x < 10; // guarda-corpo diagonal de 10 cm
  for (const fps of [15, 30, 60, 120]) {
    const a = simDash({ x: 0, z: 0 }, { x: 1, z: 0 }, (x) => thin(x), fps); assert.ok(a.p.x < 2, `parede fina @${fps}fps`);
    const b = simDash({ x: 3, z: 0 }, { x: -.7071, z: .7071 }, rail, fps); assert.ok(b.p.x - b.p.z > 0, `guarda-corpo @${fps}fps`);
    for (let i = 0; i < a.trail.length; i += 2) assert.ok(a.trail[i] < 2, 'nenhum ponto do trajeto além da parede');
  }
  const free = simDash({ x: 0, z: 0 }, { x: 0, z: 1 }, () => false); assert.ok(Math.abs(free.p.z - dashDist) < .7, `distância livre ≈ ${dashDist} m (${free.p.z.toFixed(2)})`);
});
test('dash: fim no último ponto válido — sai do corpo sem cruzar parede, senão recua pelo trajeto (não às cegas)', () => {
  const wall = (x, z) => z > 1.9 && z < 2.1 && x > -3;          // parede à frente
  const body = (x, z) => Math.hypot(x - 0, z - 1.6) < .5;       // corpo encostado na parede
  const p = { x: 0, z: 1.6 };
  dashSettle(p, { x: 0, z: 1 }, [0, -2, 0, -.5, 0, .8, 0, 1.6], { x: 0, z: -2 }, (x, z) => body(x, z) || wall(x, z), wall);
  assert.ok(!body(p.x, p.z) && !wall(p.x, p.z) && p.z < 1.9, 'parou no trajeto antes do corpo, do lado de cá da parede');
  const side = (x) => x < -.3;                                  // parede lateral: o recuo cego em linha reta entrava nela
  const q = { x: .2, z: 0 }; dashSettle(q, { x: .8, z: .6 }, [1.2, -3, .9, -2, .5, -1, .2, 0], { x: 1.2, z: -3 }, (x, z) => side(x) || Math.hypot(x - .2, z) < .6, side);
  assert.ok(q.x > -.3 && Math.hypot(q.x - .2, q.z) >= .6, 'recuou para um ponto validado do trajeto');
});
test('dash no jogo: trajeto registrado, fim usa dashSettle; morte/cena/portal/teletransporte reaparecem sem pose nem impulso', () => {
  assert.ok(/prota302\.dashTrail\.push\(player\.position\.x,player\.position\.z\)/.test(m));
  assert.ok(/dashSettle\(player\.position,dir,tr,prota302\.dashFrom,playerBlockedAt,dashBlockedAt\)/.test(m));
  assert.ok(/quiet=playerHP<=0\|\|cineActive\|\|!!portalPull\|\|moved/.test(m) && /if\(!quiet&&dashRemaining<=0&&!rites\.busy\)/.test(m));
  assert.ok(/actions\.Prota302_arrive&&!rites\.busy&&grounded/.test(m), 'no ar não toca pose de pouso');
  assert.ok(/if\(prota302\.hidden&&!\(dashRemaining>0\)\)protaDashEnd\(\)/.test(m), 'qualquer interrupção devolve a visibilidade');
});

/* ---------- P0/P1: entrada vulcânica escondida + fonte da praça ---------- */
import { DISTRICT_SPOTS, act2Presentation } from '../act2-flow.js';
const V = J.VOLCANO2;
test('boca da caverna: flanco sul, voltada para longe da cidade, fonte única de coordenadas e trilha a pé desde Cinzária', () => {
  const G = J.GATE2, M = J.CAVE2.mouth, out = [Math.cos(J.CAVE2.a), Math.sin(J.CAVE2.a)];
  assert.ok(Math.hypot(G.x - J.CITY2.x, G.z - J.CITY2.z) > 300 && Math.hypot(G.x - 1327 * -1, G.z + 66) > 150, 'longe da praça e da antiga entrada frontal');
  const toCity = [J.CITY2.x - M.x, J.CITY2.z - M.z], l = Math.hypot(...toCity); assert.ok((out[0] * toCity[0] + out[1] * toCity[1]) / l < 0, 'a abertura olha para longe da cidade (não se vê da estrada)');
  assert.ok(G.x < V.x && G.z < V.z - 150, 'flanco sul, já atrás do centro do cone');
  assert.ok(!J.ROUTE.some(p => Math.hypot(p[0] - G.x, p[1] - G.z) < 200), 'a estrada principal não leva à boca');
  assert.ok(Math.hypot(J.TRAIL2[0][0] - J.CITY2.x, J.TRAIL2[0][1] - J.CITY2.z) < J.CITY2.r, 'a trilha começa dentro da cidade');
  assert.deepEqual(DISTRICT_SPOTS.volcanoGate, { x: G.x, z: G.z }); assert.deepEqual(DISTRICT_SPOTS.volcanoExit, { x: G.out.x, z: G.out.z });
  assert.deepEqual(DISTRICT_SPOTS.volcanoGuards, J.GUARDS2.map(p => ({ x: p.x, z: p.z })));
  for (const p of [G, G.out, ...J.GUARDS2, J.CAVE2.futureGuard]) assert.ok(J.inJourney(p.x, p.z) && !J.journeyBlocked(p.x, p.z, 99), 'chão firme em ' + p.x + ',' + p.z);
  assert.ok(Math.hypot(G.out.x - G.x, G.out.z - G.z) > 4.5, 'a saída do interior fica fora do alcance do botão (não reentra sem querer)');
  assert.ok(/reservado/.test(J.CAVE2.futureGuard.note) && !/futureGuard/.test(m), 'guarda futuro só como ponto reservado (sem NPC inventado)');
});
test('boca da caverna: chão recortado na mesma altura da física, fundo escuro não caminhável, ENTRAR alcançável do lábio', () => {
  const c = Math.cos(J.CAVE2.a), s = Math.sin(J.CAVE2.a), M = J.CAVE2.mouth, at = (lz, lx = 0) => ({ x: M.x + c * lz - s * lx, z: M.z + s * lz + c * lx });
  const lip = at(0), deep = at(-6), inside = at(-3);
  assert.ok(J.journeyHeight(inside.x, inside.z) <= J.journeyHeight(lip.x, lip.z) + .01, 'garganta desce para dentro (sem rampa subindo a encosta)');
  assert.ok(!J.journeyBlocked(inside.x, inside.z, 99) && J.journeyBlocked(deep.x, deep.z, 99), 'entra 3–4 m e para no escuro');
  for (const lz of [2, 0, -3.5]) { const p = at(lz); assert.ok(Math.hypot(p.x - J.GATE2.x, p.z - J.GATE2.z) <= 4.5, 'botão aparece em lz=' + lz); }
  assert.ok(J.volcanoHeight(at(-3, 7).x, at(-3, 7).z) > 0 && J.journeyHeight(at(-3, 7).x, at(-3, 7).z) > J.journeyHeight(inside.x, inside.z) + 1, 'a encosta continua dos lados (recorte local)');
});
test('entrada no jogo: sem portal antigo nem gatilho duplo; saída/abortos/QA usam a saída nova; textos guiam pela trilha', () => {
  assert.ok(!/jornada-entrada-vulcao/.test(w) && !/new T\.PlaneGeometry\(5\.6, 7\.2\)/.test(w), 'pilares + plano negro removidos');
  assert.ok(/jornada-boca-caverna-vulcao/.test(w) && /jornada-garganta-caverna/.test(w) && /jornada-pegadas-cinza/.test(w));
  assert.ok(!/volcanoGate;player\.position\.set\(g\.x\+4/.test(m) && !/g\.x\+4,terrainHeightAt\(g\.x\+4/.test(m), 'nada volta para o portal antigo');
  assert.ok(/const p=to\|\|DISTRICT_SPOTS\.volcanoExit;/.test(m) && /onAbort:\(\)=>\{const g=DISTRICT_SPOTS\.volcanoExit;/.test(m));
  assert.equal((m.match(/return 'ENTRAR NO VULCÃO'/g) || []).length, 1, 'um só gatilho');
  assert.ok(/pegadas na cinza/.test(act2Presentation(10).objective) && /flanco sul/.test(act2Presentation(11).objective));
  assert.equal(J.JOURNEY_POIS.find(p => p.id === 'vulcao').x, J.GATE2.x, 'mapa aponta a boca nova (mesmo id: descobertas antigas valem)');
});
test('praça de Cinzária: chafariz inequívoco (torno com bacia, taça e pináculo + bicas), sem aro de "portal"', () => {
  const i = w.indexOf('fonte inequívoca'), blk = w.slice(i, w.indexOf('const cloth', i));
  assert.ok(i > 0 && /LatheGeometry/.test(blk) && /cinzaria-fonte-bicas/.test(blk) && !/TorusGeometry/.test(blk), 'sem toro/anel');
  assert.ok(/addSolid\(\{ x: P\.fountain\.x, z: P\.fountain\.z, r: R \+ \.35, city: 1/.test(blk), 'colisão mantida');
});

/* ---------- P1/P2: fauna preservada no Ato 1 ---------- */
import { FAUNA, FAUNA_CELL, cellCandidate, habitatOk, drinkingBank, budget, insectLevel } from '../fauna3d.js';
const fctx = (biome, extra = {}) => ({ biome: () => biome, water: () => -1, road: () => false, lava: () => 0, blocked: () => false, ...extra });
test('fauna: cinco espécies com modelos presentes na main', () => {
  assert.deepEqual(Object.keys(FAUNA).sort(), ['coelho','dourado','grilo','lava','montanha']);
  assert.deepEqual(Object.values(FAUNA).map(s => s.file).sort(), ['Coelhinho.glb','Grilo.glb','PassaroLava.glb','PassaroMontanha.glb','Passaro_Vale_Dourado.glb']);
  for (const { file } of Object.values(FAUNA)) assert.ok(fs.existsSync(new URL('../' + file, import.meta.url)), file);
  const src = fs.readFileSync(new URL('../fauna3d.js', import.meta.url), 'utf8');
  for (const old of ['Coelho.glb','Passaro_Rapina_Montanhas.glb']) assert.ok(!src.includes(old), old + ' removido');
  assert.ok(/index !== baseIdx\) return Promise\.resolve\(null\)/.test(src) && /resizeWidth: size/.test(src));
});
test('fauna: os ombros animados pertencem à skin dos GLBs atuais', () => {
  for (const species of Object.values(FAUNA).filter(s => s.wings)) {
    const glb = fs.readFileSync(new URL('../' + species.file, import.meta.url));
    const json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
    const joints = json.skins[0].joints.map(i => json.nodes[i].name);
    for (const shoulder of species.wings) assert.ok(joints.includes(shoulder), species.file + ' ' + shoulder);
  }
});

test('fauna: habitat restrito, sem cidade, água, estrada, lava ou objetos sólidos', () => {
  for (const k of Object.keys(FAUNA)) {
    for (const b of ['cidade', 'vulcao', 'cinzas', 'serra', 'abismo', null]) assert.equal(habitatOk(k, 0, 0, fctx(b)), FAUNA[k].biomes.includes(b));
    assert.ok(habitatOk(k, 0, 0, fctx(FAUNA[k].biomes[0])));
    assert.ok(!habitatOk(k, 0, 0, fctx(FAUNA[k].biomes[0], { water: () => .1 })));
    assert.ok(!habitatOk(k, 0, 0, fctx(FAUNA[k].biomes[0], { road: () => true })));
    assert.ok(!habitatOk(k, 0, 0, fctx(FAUNA[k].biomes[0], { blocked: () => true })));
  }
});
test('dourado bebe de terra firme somente junto a água rasa', () => {
  const shore = fctx('vale', {water:(x,z) => z > .42 ? .12 : 0});
  const bank = drinkingBank(0, 0, shore);
  assert.ok(bank && shore.water(bank.x, bank.z) === 0);
  assert.equal(drinkingBank(0, 0, {...shore, blocked:() => true}), null);
  assert.equal(drinkingBank(0, 0, {...shore, water:() => .9}), null);
});

test('fauna: grilos somente à noite; orçamento por espécie e qualidade', () => {
  for (let h = 6; h <= 18; h += .5) { assert.equal(FAUNA.grilo.active(h), false); assert.equal(insectLevel(h, true) > 0 && h < 17.8, false); }
  assert.ok(FAUNA.grilo.active(21) && FAUNA.grilo.active(2));
  assert.deepEqual(Object.fromEntries(Object.keys(FAUNA).map(k => [k, budget(k, false)])), {coelho:2,montanha:2,lava:2,dourado:3,grilo:2});
  assert.equal(budget('grilo', true), 0);
});
test('fauna: semente estável por célula e densidade baixa', () => {
  for (const k of Object.keys(FAUNA)) { let n = 0; for (let cx = -30; cx < 30; cx++) for (let cz = -10; cz < 10; cz++) {
    const a = cellCandidate(k, cx, cz), b = cellCandidate(k, cx, cz); assert.deepEqual(a, b);
    if (a) { n++; assert.ok(a.x >= cx * FAUNA_CELL && a.x < (cx + 1) * FAUNA_CELL); }
  } assert.ok(n > 30 && n < 1200 * .8, k); }
});
test('fauna no jogo: controlador único, carregamento preguiçoso e áudio dos grilos', () => {
  assert.equal((m.match(/createFauna\(/g) || []).length, 1);
  assert.ok(/fauna\.update\(dt,\{px:P\.x,pz:P\.z,hour:gameClock\.hour,camera,hidden:voidMode\|\|caveWalk\}\)/.test(m));
  assert.ok(/worldAudio\.update\(dt,\{[^}]*insects:faunaInsects,/.test(m));
  const src = fs.readFileSync(new URL('../fauna3d.js', import.meta.url), 'utf8');
  assert.ok(/const retry = loadState\[kind\]/.test(src), 'estado de retry separado dos assets carregados');
  assert.ok(/!retry\.permanent && !retry\.exhausted && t >= retry\.retryAt/.test(src), 'backoff, falha permanente e esgotamento controlam o próximo pedido');
  assert.ok(/activeLoads \+ orphanedLoads < FAUNA_MAX_CONCURRENT_LOADS/.test(src), 'conta também parses órfãs no limite de concorrência');
});

/* ---------- ADENDO: aurora ilumina mundo e água ---------- */
import { auroraColor, auroraLightK, auroraLowProfile, patchAuroraGround, auroraUniforms, updateAuroraLight, AURORA_WATER } from '../aurora-luz3d.js';
test('aurora: luz colorida que acompanha o céu (rosa/violeta/azul), some sem aurora e em lugar fechado; mais leve no celular', () => {
  assert.equal(auroraLightK(0, false, false), 0); assert.equal(auroraLightK(.8, true, false), 0, 'caverna/interior/dimensão: nada');
  assert.ok(auroraLightK(.8, false, true) < auroraLightK(.8, false, false) && auroraLightK(.8, false, false) === .8);
  assert.ok(Math.abs(auroraLightK(.8, false, true) - .6) < 1e-9, 'perfil baixo mantém 75% da intensidade, sem alterar a paleta');
  assert.equal(auroraLowProfile(true, 'high'), false, 'alto explícito preserva o detalhe mesmo no viewport móvel');
  assert.equal(auroraLowProfile(true, 'medium'), false, 'médio explícito preserva o detalhe completo');
  assert.equal(auroraLowProfile(false, 'low'), true, 'baixo explícito ativa a variante econômica em qualquer viewport');
  assert.equal(auroraLowProfile(true, 'auto'), true, 'auto usa duas oitavas quando o controlador informa tier baixo');
  assert.equal(auroraLowProfile(false, 'auto'), false, 'auto restaura quatro oitavas quando o tier permite');
  const cs = [0, 30, 60, 90, 120, 200].map(auroraColor); for (const c of cs) { assert.ok(c[2] >= .8 && c.every(v => v >= 0 && v <= 1.01), 'paleta da aurora (azul/violeta dominante)'); }
  assert.ok(Math.abs(cs[0][0] - cs[2][0]) + Math.abs(cs[0][1] - cs[2][1]) > .05, 'a cor anda com o tempo');
});
test('aurora: terreno com faixas + oclusão pela inclinação, água com reflexo pela direção refletida; uniforms compartilhados e chave fixa', needs3, () => {
  assert.ok(THREE, 'CI precisa de three.js');
  const mat = new THREE.MeshStandardMaterial(); const prev = mat.customProgramCacheKey(); patchAuroraGround(THREE, mat);
  const sh = { uniforms: {}, vertexShader: '#include <common>\n#include <project_vertex>', fragmentShader: '#include <common>\n#include <emissivemap_fragment>' }; mat.onBeforeCompile(sh);
  assert.ok(sh.uniforms.uAurK === auroraUniforms(THREE).uAurK, 'mesmo objeto de uniform (1 atualização por quadro)');
  assert.ok(/smoothstep\(\.35,\.95,n\.y\)/.test(sh.fragmentShader) && /band\*band/.test(sh.fragmentShader) && /\*\(diffuseColor\.rgb\*/.test(sh.fragmentShader), 'faixas, oclusão por inclinação, luz × albedo (não tinta)');
  assert.ok(/if\(uAurK>\.001\)/.test(sh.fragmentShader), 'não trabalha sem aurora'); assert.ok(mat.customProgramCacheKey().endsWith('|aurora327') && mat.customProgramCacheKey() === mat.customProgramCacheKey() && typeof prev === 'string', 'chave fixa (não recompila quando a aurora acende)');
  assert.ok(/reflect\(-avd,wN\)/.test(AURORA_WATER) && /wFres/.test(AURORA_WATER), 'água: reflexo pela visão + ondulação + fresnel');
  updateAuroraLight(THREE, { level: .8, time: 30, low: true, dir: { x: 1, z: 0 } });
  const shared = auroraUniforms(THREE), stableKey = mat.customProgramCacheKey();
  assert.equal(shared.uAurLow.value, 1, 'perfil baixo chega ao shader por uniforme');
  assert.ok(Math.abs(shared.uAurK.value - .6) < 1e-9, 'intensidade baixa aplicada');
  updateAuroraLight(THREE, { level: .8, time: 31, low: false, dir: { x: 1, z: 0 } });
  assert.equal(shared.uAurLow.value, 0, 'perfil alto restaura o detalhe completo');
  assert.ok(Math.abs(shared.uAurK.value - .8) < 1e-9 && mat.customProgramCacheKey() === stableKey, 'troca de qualidade sem recompilar');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let storedMode = 'high', storageReads = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem(key) { assert.equal(key, 'seven-sins-3d-graphics'); storageReads++; return storedMode; } } });
  try {
    updateAuroraLight(THREE, { level: .8, time: 500, low: true });
    assert.equal(shared.uAurLow.value, 0, 'high explícito vence hint baixo');
    storedMode = 'low';
    updateAuroraLight(THREE, { level: .8, time: 500.25, low: false });
    assert.equal(shared.uAurLow.value, 0, 'preferência fica cacheada dentro de 0,5 s');
    assert.equal(storageReads, 1, 'localStorage não é consultado por frame');
    updateAuroraLight(THREE, { level: .8, time: 500.5, low: false });
    assert.equal(shared.uAurLow.value, 1, 'low é aplicado após expirar o cache');
    assert.equal(storageReads, 2);
    storedMode = 'max';
    updateAuroraLight(THREE, { level: .8, time: 501, low: true });
    assert.equal(shared.uAurLow.value, 0, 'max explícito restaura quatro oitavas');
    assert.equal(storageReads, 3);
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
  }
  const ew = fs.readFileSync(new URL('../eldoria-water.js', import.meta.url), 'utf8');
  assert.ok(/uAurC \* uAurK \* aUp/.test(ew) && /Object\.assign\(uniforms, o\.aurora \|\| waterAurora/.test(ew), 'rio/lago de Eldória também');
  assert.ok(/uniform vec3 uAurC; uniform float uAurK, uAurT, uAurLow;/.test(ew), 'uniform de qualidade compartilhado');
  assert.ok(/float fbmLow\(vec2 p\)/.test(ew) && /float waterFbm\(vec2 p\)\{ if \(uAurLow > \.5\) return fbmLow\(p\); return fbm\(p\); \}/.test(ew), 'seletor uniforme: duas oitavas no baixo, quatro no alto');
  const fragmentStart = ew.indexOf('const FRAG'), mainStart = ew.indexOf('void main(){', fragmentStart);
  const mainShader = ew.slice(mainStart);
  assert.ok(mainStart > fragmentStart && !/fbm\(/.test(mainShader) && (mainShader.match(/waterFbm\(/g) || []).length >= 11, 'normais, espuma e aurora passam pelo mesmo caminho adaptativo');
  assert.ok(/patchAuroraGround\(T, terrainMat\)/.test(w) && /patchAuroraGround\(T, m, \.6\)/.test(w) && /aurora: auroraUniforms\(T\)/.test(w), 'relevo, cone e água da jornada');
  assert.ok(/updateAuroraLight\(THREE,\{level:ak,time:performance\.now\(\)\*\.001,closed:voidMode\|\|!!caveWalk\|\|auroraQAOff,low:graphics3DMode==='auto'\?graphics3DAutoTier<=1:graphics3DMode==='low'\}\)/.test(m), 'aurora acompanha o tier real do Auto e os perfis explícitos');
  assert.ok(/patchAuroraGround\(THREE,material\)/.test(m) && /setWaterAurora\(auroraUniforms\(THREE\)\)/.test(m) && /closed:voidMode\|\|!!caveWalk/.test(m), 'Eldória + desligado em lugar fechado');
});

/* ---------- P2: morte → desintegração em pó ---------- */
import { ASH, ashVisible, createAshDissolve } from '../cinzas3d.js';
test('cinzas: some de baixo para cima conforme o progresso (o pé antes da cabeça), nada no início, tudo no fim', () => {
  for (const n of [0, .5, 1]) { assert.ok(ashVisible(0, 0, n) && ashVisible(0, 1, n), 'p=0 inteiro'); assert.ok(!ashVisible(1, 1, n) && !ashVisible(1, 0, n), 'p=1 nada'); }
  assert.ok(!ashVisible(.35, .1, .5) && ashVisible(.35, .9, .5), 'meio do caminho: pés já foram, cabeça ainda está');
  assert.ok(ASH.hero.dur < 1 && ASH.boss.dur > ASH.demon.dur && ASH.human.dur > ASH.demon.dur && ASH.boss.crack === 1 && ASH.hero.celestial === 1 && ASH.animal.parts === 0);
});
test('cinzas: clona o material (o compartilhado dos vivos não muda), uma vez por entidade, devolve tudo no cancelamento e rematerializa', needs3, () => {
  assert.ok(THREE, 'CI precisa de three.js');
  const scene = new THREE.Scene(), shared = new THREE.MeshStandardMaterial({ color: 0x884444 }), g = new THREE.BoxGeometry(1, 2, 1);
  const a = new THREE.Group(), b = new THREE.Group(); a.add(new THREE.Mesh(g, shared)); b.add(new THREE.Mesh(g, shared)); scene.add(a, b);
  const fx = createAshDissolve(THREE, scene, { low: false });
  assert.ok(fx.start(a, 'demon')); assert.equal(fx.start(a, 'demon'), false, 'uma vez só'); assert.equal(fx.count, 1);
  assert.notEqual(a.children[0].material, shared, 'clone no que morre'); assert.equal(b.children[0].material, shared, 'o vivo continua com o original');
  const sh = { uniforms: {}, vertexShader: '#include <common>\n#include <project_vertex>', fragmentShader: '#include <common>\n#include <map_fragment>\n#include <emissivemap_fragment>' }; a.children[0].material.onBeforeCompile(sh);
  assert.ok(/discard/.test(sh.fragmentShader) && /uAshEdge/.test(sh.fragmentShader) && sh.uniforms.uAshP, 'limiar + borda incandescente');
  assert.ok(a.children[0].material.customProgramCacheKey().startsWith('cinza327|'), 'chave de programa própria e estável');
  let done = 0; fx.cancel(a); assert.equal(a.children[0].material, shared, 'cancelar devolve o original'); assert.equal(fx.count, 0);
  fx.start(b, 'boss', { onDone: () => done++ }); for (let i = 0; i < 40; i++) fx.update(.1); assert.equal(done, 1); assert.equal(b.visible, false, 'terminado: some'); assert.equal(b.children[0].material, shared, 'e os clones foram descartados');
  b.visible = true; fx.start(b, 'hero', { reverse: true, onDone: () => done++ }); for (let i = 0; i < 12; i++) fx.update(.1); assert.equal(done, 2); assert.ok(b.visible && b.children[0].material === shared, 'rematerializa inteiro');
  const lowFx = createAshDissolve(THREE, new THREE.Scene(), { low: true }); lowFx.start(a, 'demon'); for (let i = 0; i < 5; i++) lowFx.update(.1); assert.equal(lowFx.count, 1, 'baixa qualidade: só o dissolve (sem partículas)');
});
test('cinzas no jogo: esquadrão, hordas e herói usam o mesmo pipeline; nada de afundar no chão; herói nunca fica invisível', () => {
  const rt = fs.readFileSync(new URL('../enemy1-squad-runtime3d.js', import.meta.url), 'utf8');
  assert.ok(/if \(ctx\.ash && b\.dead > 2\.2 && !b\.ashed\)/.test(rt) && /BOSSES\[a\.kind\] \? 'boss' : 'demon'/.test(rt) && /ctx\.ash\?\.cancel\(b\.holder\)/.test(rt), 'esquadrão: depois do clipe, uma vez, limpeza no descarte');
  assert.ok(/squadRT=createEnemy1SquadRuntime\(\{T:THREE,scene,ash:ashFx,/.test(m));
  assert.ok(/if\(f\.t>2\.2&&!f\.ash\)\{f\.ash=true;/.test(m) && !/if\(f\.t>2\.6\)h\.position\.y-=dt\*\.55;/.test(m), 'hordas: cinza no lugar do afundar');
  assert.ok(/function disposeClone\(c\)\{if\(!c\)return;ashFx\.cancel\(c\.holder\);/.test(m));
  assert.ok(/now>=playerRespawnAt-760\)\{heroAsh\.on=true;/.test(m) && /ashFx\.start\(model,'hero',\{reverse:true\}\)/.test(m), 'herói: some depois do clipe e rematerializa no checkpoint');
  assert.ok(/if\(heroAsh\.on&&playerHP>0&&model\)\{heroAsh\.on=false;ashFx\.cancel\(model\);model\.visible=heroAsh\.vis;\}/.test(m), 'qualquer outro retorno devolve o corpo');
  assert.ok(/registerEnemyDefeat\(encounterProfile\);\/\* MOD 327[^]*?ashFx\.start\(enemy,/.test(m) && /if\(enemyAlive&&ashFx\.active\(enemy\)\)ashFx\.cancel\(enemy\);/.test(m), 'inimigo principal (caminho genérico): cinza no lugar do sumiço; novo encontro nunca é desfeito');
  assert.ok(/playStory\('vorgazhek-cai'/.test(m) && /playStory\('zarkhael-cai'/.test(m), 'chefes com cena de derrota seguem pelas cenas (sem cinza antes da cena)');
});
