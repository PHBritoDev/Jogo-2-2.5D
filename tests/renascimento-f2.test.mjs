// Renascimento de Eldória — Fase 2: Vale do Despertar (planejamento puro + contrato de integração).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planValleyForest, planValleyOutcrops, planValleyGroundCover, VALLEY_AREA, VALLEY_CLEARINGS, VALLEY_LANDMARKS, VIGIA, VIGIA_TRAIL, distToPolyline } from '../eldoria-valley-landscape.js';
import { TEREN_ROAD, insideMeadow, FOREST_TRAILS, FOREST_CLEARINGS, ROAD_BANDITS, FALL_SPOT } from '../act1-world-layout.js';

const world = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const qaScript = fs.readFileSync(new URL('../tools/visual-lab/renascimento-f1-qa.cjs', import.meta.url), 'utf8');
// relevo sintético com a forma do vale real: fundo na estrada, encostas subindo dos dois lados
const height = (x, z) => { const d = distToPolyline(x, z, TEREN_ROAD); return Math.min(26, Math.max(0, (d - 6) * .45)) + Math.sin(x * .07) * .6 + Math.cos(z * .05) * .5; };
const env = { height, boundary: (x, z) => distToPolyline(x, z, TEREN_ROAD) - 14, water: () => -1, road: TEREN_ROAD, meadow: (x, z, p) => insideMeadow(x, z, p),
  keep: (x, z, r) => Math.hypot(x - 77, z - 90) > 13 + r && Math.hypot(x - FALL_SPOT.x, z - FALL_SPOT.z) > 14 + r };

test('vale: bosques determinísticos, quantidade de mata real e mistura de espécies pelo relevo', () => {
  const a = planValleyForest(env), b = planValleyForest(env);
  assert.deepEqual(a.map(t => [t.sp, t.x.toFixed(2), t.z.toFixed(2)]), b.map(t => [t.sp, t.x.toFixed(2), t.z.toFixed(2)]));
  assert.ok(a.length > 120, `mata de verdade, não meia dúzia de árvores (${a.length})`);
  const sp = new Set(a.map(t => t.sp)); for (const k of ['copaLarga', 'figueira', 'palmeira', 'sumauma']) assert.ok(sp.has(k), 'espécie ' + k);
  for (const t of a) assert.ok(t.x > VALLEY_AREA.x0 && t.x < VALLEY_AREA.x1 && t.z > VALLEY_AREA.z0 && t.z < VALLEY_AREA.z1);
});

test('vale: estrada, prado, clareiras, trilha do Vigia, emboscada e despertar ficam livres', () => {
  const plan = planValleyForest(env);
  for (const t of plan) {
    assert.ok(distToPolyline(t.x, t.z, TEREN_ROAD) > 4.4, `árvore na estrada ${t.x.toFixed(1)},${t.z.toFixed(1)}`);
    assert.ok(!insideMeadow(t.x, t.z, 2), 'árvore no prado do despertar');
    for (const c of VALLEY_CLEARINGS) assert.ok(Math.hypot(t.x - c.x, t.z - c.z) > c.r, 'árvore na clareira ' + c.id);
    assert.ok(distToPolyline(t.x, t.z, VIGIA_TRAIL.points) > VIGIA_TRAIL.width * .5 + 1, 'árvore na trilha do Vigia');
    for (const s of ROAD_BANDITS) assert.ok(Math.hypot(t.x - s.x, t.z - s.z) > 6, 'árvore no círculo da emboscada');
    assert.ok(Math.hypot(t.x - FALL_SPOT.x, t.z - FALL_SPOT.z) > 14, 'árvore no despertar');
  }
  // espaçamento: mesma espécie nunca colada (sem fotocópia em pilha)
  for (let i = 0; i < plan.length; i++) for (let j = i + 1; j < plan.length; j++) if (plan[i].sp === plan[j].sp) assert.ok(Math.hypot(plan[i].x - plan[j].x, plan[i].z - plan[j].z) > 2.4);
});

test('vale: cobertura do chão preserva clareiras, estrada, prado e Trilha do Vigia em alto e baixo', () => {
  const plans = [
    ['alto', planValleyGroundCover(env), 1300, 390],
    ['mobile', planValleyGroundCover(env, { tufts: 900, flowers: 260 }), 800, 230],
  ];
  for (const [mode, cover, minTufts, minFlowers] of plans) {
    assert.ok(cover.tufts.length > minTufts, mode + ': capim insuficiente (' + cover.tufts.length + ')');
    assert.ok(cover.flowers.length > minFlowers, mode + ': flores insuficientes (' + cover.flowers.length + ')');
    for (const clearing of VALLEY_CLEARINGS) {
      for (const [kind, items] of [['capim', cover.tufts], ['flores', cover.flowers]]) {
        const intruders = items.filter(p => Math.hypot(p.x - clearing.x, p.z - clearing.z) <= clearing.r + 1);
        assert.equal(intruders.length, 0, mode + ': ' + kind + ' invadindo a clareira ' + clearing.id + ': ' + intruders.length);
      }
    }
    for (const p of [...cover.tufts, ...cover.flowers]) {
      assert.ok(distToPolyline(p.x, p.z, TEREN_ROAD) > 3.6, mode + ': cobertura invade a estrada');
      assert.ok(distToPolyline(p.x, p.z, VIGIA_TRAIL.points) > VIGIA_TRAIL.width * .5 + 2.4, mode + ': cobertura invade a trilha');
      assert.ok(!insideMeadow(p.x, p.z, 2), mode + ': cobertura invade o prado do prólogo');
    }
  }
});

test('vale: afloramentos nas encostas, longe da estrada e da trilha; marcos de horizonte declarados', () => {
  const r = planValleyOutcrops(env, 14);
  assert.ok(r.length >= 6);
  for (const g of r) { assert.ok(distToPolyline(g.x, g.z, TEREN_ROAD) > 8.5); assert.ok(g.parts.length >= 1 && g.parts.length <= 3); }
  assert.ok(VALLEY_LANDMARKS.filter(l => l.sp === 'sumauma').length >= 3, 'sumaúmas como marcos das cristas');
});

test('layout: Trilha e Clareira do Vigia registradas como trilha/clareira do Ato I (pintura do chão, mata e mapa)', () => {
  assert.ok(FOREST_TRAILS.some(t => t.id === 'vigia' && t.points.length === VIGIA_TRAIL.points.length));
  assert.ok(FOREST_CLEARINGS.some(c => c.id === 'vigia' && c.x === VIGIA.x && c.z === VIGIA.z));
  // a trilha sai da estrada e termina na clareira do posto
  assert.ok(distToPolyline(...VIGIA_TRAIL.points[0], TEREN_ROAD) < 6);
  const end = VIGIA_TRAIL.points.at(-1); assert.ok(Math.hypot(end[0] - VIGIA.x, end[1] - VIGIA.z) < VIGIA.r);
});

test('integração: cobertura do vale continua ligada ao instancing real e ao A/B das quatro clareiras', () => {
  assert.match(world, /const gc=planValleyGroundCover\(valleyEnv/);
  assert.match(world, /tu\.name='vale-capim'/);
  assert.match(world, /m\.name='vale-flores-'/);
  assert.match(world, /window\.SevenSinsValleyReport\.groundCover=/);
  for (const id of ['vigia', 'respiro-leste', 'respiro-oeste', 'garganta']) {
    assert.ok(qaScript.includes(`id: '${id}'`), 'A/B sem captura da clareira ' + id);
  }
  assert.match(qaScript, /VISUAL_BASELINE_URL/);
  assert.match(qaScript, /baselineSha/);
  assert.match(qaScript, /D\.fly\(null\)/, 'reseta override da câmera antes de cada enquadramento');
  assert.match(qaScript, /D\.snapCam\(\)/, 'força o enquadramento após teleporte e view');
  assert.match(qaScript, /waitCameraStable/, 'não captura após um atraso fixo sem estabilizar a câmera');
  assert.match(qaScript, /D\.cam\(\)/);
  assert.match(qaScript, /D\.camView\(\)/, 'verifica oclusão da linha de visão');
  assert.match(qaScript, /cameraDeltaFromBaseline/);
  assert.match(qaScript, /let state = 0xA3D11A/, 'semente aleatória fixa e repetível entre baseline e candidata');
  assert.match(qaScript, /Math\.random = \(\) =>/, 'controla Math.random antes de carregar o mundo');
  assert.match(qaScript, /CAMERA_TRIES/, 'procura ângulo desobstruído antes de aceitar a foto');
  assert.match(qaScript, /baseline\?\.cameraSettings/, 'candidata reutiliza o enquadramento escolhido na baseline');
  assert.match(qaScript, /framing\?\.onScreen === true/, 'confere que o protagonista está no quadro');
  assert.match(qaScript, /playerDeltaFromBaseline/, 'compara posição XYZ real do jogador');
  assert.match(qaScript, /sameViewportAndCamera = allStable && sameCamera/, 'só declara câmera idêntica após comparação medida');
  assert.match(qaScript, /samePlayerPosition = samePlayer/, 'exige posição XYZ equivalente');
  assert.match(qaScript, /allActorsFramed = allFramed/, 'exige enquadramento limpo em baseline e candidata');
  assert.match(qaScript, /body \*\{visibility:hidden!important\}canvas#scene\{visibility:visible!important\}/, 'captura somente a cena, sem HUD sobre as clareiras');
});

test('integração: vale entra no mesmo instancing do cinturão, rollback por flag, relicário único salvo', () => {
  assert.match(world, /const tropicalPlan=\[\.\.\.southernForestPlan,\.\.\.villageBeltPlan\]\.concat\(serraForestPlan,valleyPlan\);/);
  assert.match(world, /const VALLEY_ON=new URLSearchParams\(location\.search\)\.get\('vale'\)!=='0';/);
  assert.match(world, /RochedoMusgoEldoria-lod1\.glb/);
  assert.match(world, /rockObstacles\.push\(\{x:p\.x,z:p\.z,radius:p\.s\*\.42,/, 'afloramentos com colisor de domo');
  assert.match(world, /o\.count=0;o\.visible=false;/, 'rochedos procedurais antigos desligados (sem duplicar malha)');
  assert.match(world, /const VIGIA_STORE='seven-sins-3d-posto-vigia';/);
  assert.match(world, /if\(!vigiaRuin\.opened&&dc<1\.9\)\{vigiaRuin\.setOpened\(true\);/);
  assert.match(world, /checkSecretRuin\(\);checkVigiaRuin\(now\);/);
});
