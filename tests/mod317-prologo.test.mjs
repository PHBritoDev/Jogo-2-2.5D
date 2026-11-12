// Mod 317 — prólogo cinematográfico, Eldória viva e correções (céu → despertar → asas → Teren → carroça → 5 bandidos → vila).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Enemy1Squad } from '../enemy1-squad3d.js';
import { BANDIT } from '../bandit-squad3d.js';
import { awakeningScene, wingsScene, GUIDE_NAME } from '../prologue-flow.js';
import { ROAD, RIDE, cartRestS, rideDozeScene, ambushScene } from '../prologue-road-flow.js';
import { TEREN_ROAD, TEREN_ORIGIN, ORIGIN_LIMIT, CART_ROUTE, ROAD_BANDITS, PROLOGUE_MEADOW, ROAD_TERRAIN_PATCH, nearestAlong } from '../act1-world-layout.js';
import { WAYSTONES, WAYSTONE_ALIASES, createMapState } from '../map3d.js';
import { PROTA_JUMP } from '../prota-combat3d.js';
import { createWalkables } from '../eldoria-walkable.js';
import { SHELTER } from '../eldoria-shelter3d.js';
import { createTerrain } from '../world3d-terrain.js';

const root = new URL('../', import.meta.url);
const read = f => fs.readFileSync(new URL(f, root), 'utf8');
const world = read('mundo-3d-prototype.js');

test('Gate 1 — assets reais com caminho exato (nenhum substituto)', () => {
  for (const f of ['Anjos.glb', 'BracoDireitoEsquerdo.glb', 'Asas.glb', 'AnjoGuiador-otimizado.glb', 'NPC_Masculino_Animado_Otimizado_1K.glb', 'Cabelo-otimizado.glb', 'Cavalo.glb', 'ArreiosCavalo.glb', 'Carroça.glb', 'Npc-lod2.glb'])
    assert.ok(fs.existsSync(new URL(f, root)), f);
  assert.match(world, /opt\('\.\/Anjos\.glb\?v=mod317'\),opt\('\.\/BracoDireitoEsquerdo\.glb\?v=mod317'\)/);
});

test('Gate 2 — céu: dois Anjos.glb na aproximação + dois BracoDireitoEsquerdo.glb nas laterais do trono; sem clones do Anjo-Guia', () => {
  assert.match(world, /for\(const sx of \[-1,1\]\)guardian\(a\.seraph,5\.6/);
  assert.match(world, /for\(const sx of \[-1,1\]\)guardian\(a\.armGuard,7\.4/);
  assert.doesNotMatch(world, /const c=cloneSkinned\(guideFitRoot\);c\.traverse/, 'os anjos do céu não são mais cópias do guia');
  assert.match(world, /glowSprite\(0xffffff,\.11,height\*1\.15\)/, 'aura branca tênue (sem bloom)');
  assert.match(world, /U\.body\.scale\.set\(1\+br\*\.012/, 'respiração procedural (Anjos.glb não tem rig)');
  assert.match(world, /for\(const B of U\.bones\)/, 'micromovimento dos 49 ossos do BracoDireitoEsquerdo');
});

test('Gate 3 — despertar: tela escura, POV do chão para o céu com piscadas, levantar real, Anjo já presente', () => {
  const s = awakeningScene(); assert.equal(s[0].id, 'deitado'); assert.ok(s[0].with.some(w => w.id === 'piscar-despertar'));
  assert.ok(s.findIndex(x => x.id === 'levantar') > 0);
  assert.match(world, /guide\.visible=true;guide\.scale\.setScalar\(1\);guideWingsHidden=false/, 'anjo visível desde o primeiro quadro');
  assert.match(world, /function heroLyingPose\(on,stand\)/); assert.match(world, /\/\^\(arise\|falling_down\)\$\/i/, 'clipe Arise do rig Meshy (mesmos ossos do herói)');
  assert.match(world, /if\(cineShot==='deitado'\)\{if\(model\)model\.visible=false;/, 'POV não enxerga o capuz por dentro');
  assert.ok(s.filter(x => x.type === 'say').every(x => x.text.length < 90));
});

test('Gate 4 — asas Asas.glb presas às escápulas, penas raras, recolhidas antes da carroça e persistentes', () => {
  assert.match(world, /new GLTFLoader\(\)\.load\('\.\/Asas\.glb\?v=mod317'/);
  assert.match(world, /\/\^upperchest\$\/i/); assert.match(world, /chest\.attach\(holder\)/);
  assert.match(world, /for\(let i=0;i<4;i\+\+\)\{const f=new THREE\.Mesh\(fg,fm\.clone\(\)\)/, 'pool de 4 penas');
  assert.match(world, /const GUIDE_WINGS_STORE='seven-sins-3d-guide-wings'/);
  const w = wingsScene(); const fold = w.findIndex(x => (x.with || []).some(q => q.id === 'anjo-recolhe-asas'));
  assert.ok(fold >= 0 && fold < w.findIndex(x => x.id === 'carroca-ouvida'));
  assert.ok(w.some(x => x.who === GUIDE_NAME && /Vaelthar/.test(x.text)));
});

test('Gate 5 — Teren (NPC masculino Meshy) sentado conduzindo; herói e anjo embarcam e sentam; estrada com origem; 3 horas depois', () => {
  assert.match(world, /npcFactory\.create\(\{sex:'man',role:'idle',x:0,z:0,hairToHead:true\}\)/);
  assert.doesNotMatch(world, /makeTownsfolk\(b,0x9a8a70,'Walking',41\);road\.teren/, 'Teren não usa mais o Npc genérico');
  assert.match(world, /seat:createSeatPose\(THREE,n\.model,\{reins:true\}\)/);
  assert.match(world, /const CART_SOCKETS=\{driver:\{x:0,y:1\.32,z:1\.5/);
  assert.match(world, /function boardCart\(\)/); assert.ok(rideDozeScene().some(x => x.id === 'embarcar'));
  assert.ok(rideDozeScene().some(x => x.id === 'tres-horas')); assert.match(world, /storyTitle\('3 HORAS DEPOIS',''\)/);
  assert.ok(rideDozeScene().some(x => x.args && x.args.cam === 'interior'), 'conversa por dentro da cabine');
  assert.ok(ambushScene()[0].args.cam === 'interior', 'acorda DENTRO da carroça');
  // geografia: a estrada nasce numa garganta entre serras ao sul do prado, com curva; carroça espera além do limite a pé
  assert.deepEqual(TEREN_ROAD.slice(0, TEREN_ORIGIN.length), TEREN_ORIGIN);
  assert.ok(TEREN_ORIGIN[0][1] > PROLOGUE_MEADOW.cz + PROLOGUE_MEADOW.hz + 60, 'origem bem ao sul do prado');
  assert.ok(RIDE.origin < RIDE.limit && RIDE.limit < RIDE.start, 'carroça fora do alcance a pé até ser ouvida');
  assert.equal(cartRestS(ROAD.meet, false), RIDE.origin); assert.equal(cartRestS(ROAD.meet, true), RIDE.start);
  assert.ok(ROAD_TERRAIN_PATCH.z1 >= TEREN_ORIGIN[0][1], 'grade fina cobre a garganta');
  const terrain = createTerrain({ extraAreas: [PROLOGUE_MEADOW], passes: [{ points: TEREN_ROAD, r: 8.5 }], paths: [{ points: TEREN_ROAD, r: 4, fade: 5 }] });
  for (let s = RIDE.origin; s < RIDE.start; s += 4) { let acc = 0, p = null; for (let i = 1; i < CART_ROUTE.length; i++) { const a = CART_ROUTE[i - 1], b = CART_ROUTE[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc + L >= s) { const k = (s - acc) / L; p = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; break; } acc += L; }
    assert.ok(terrain.walkable(p[0], p[1]), 'garganta transitável em s=' + s.toFixed(0)); }
  // serra dos dois lados da garganta (corredor, não descampado)
  const mid = TEREN_ORIGIN[3]; assert.ok(terrain.height(mid[0] + 22, mid[1]) > 6 && terrain.height(mid[0] - 22, mid[1]) > 6, 'paredes da garganta');
  assert.ok(nearestAlong(TEREN_ROAD, ORIGIN_LIMIT.x, ORIGIN_LIMIT.z).d < 3);
});

test('Gate 6 — cinco bandidos simultâneos, só espada, no máximo 2 golpes perigosos ao mesmo tempo; salto = PR #468', () => {
  assert.equal(ROAD_BANDITS.length, 5); assert.equal(ROAD.bandits, 5);
  assert.deepEqual(BANDIT.kit, []); assert.equal(BANDIT.leap, null); assert.equal(BANDIT.shield, null); assert.equal(BANDIT.counter.chance, 0); assert.equal(BANDIT.meleeTokens, 2);
  const hero = { id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .4, height: 1.8, alive: true, priority: 1, iframes: false };
  const sq = new Enemy1Squad({ seed: 11, damageTarget: () => 'hit' }); sq.setTargets([hero]);
  sq.spawn(ROAD_BANDITS.map(b => ({ x: b.x - 74, z: b.z - 90, kind: 'bandit' })));
  let maxMelee = 0, actors = new Set(); const n = Math.round(20 * 60);
  for (let i = 0; i < n; i++) { sq.update(1 / 60); const m = sq.actors.filter(a => a.alive && a.act && a.act.token === 'melee' && a.act.tid === 'hero'); maxMelee = Math.max(maxMelee, m.length); for (const a of m) actors.add(a.id); }
  assert.equal(sq.alive.length, 5, 'os cinco seguem vivos e ativos');
  assert.ok(maxMelee <= 2, 'no máximo dois golpes perigosos simultâneos: ' + maxMelee);
  assert.ok(actors.size >= 3, 'vários bandidos atacam (revezando), não um duelo por vez: ' + actors.size);
  assert.equal(sq.spells.length, 0, 'nenhuma magia');
  assert.match(world, /function banditSquadPack\(rig,profile\)\{return !SQUAD_LEGACY&&rig==='bandit'&&profile==='bandit1';\}/);
  assert.equal(PROTA_JUMP.impulse, 7.2); assert.match(world, /jumpImpulse=7\.2;/);
});

test('Gate 7 — vila: vendedor atrás do balcão de frente para o comprador; água rasa com peso sem virar lesma', () => {
  assert.match(world, /x:marketStalls\[0\]\.x-Math\.sin\(marketStalls\[0\]\.yaw\)\*\.55,z:marketStalls\[0\]\.z-Math\.cos\(marketStalls\[0\]\.yaw\)\*\.55,yaw:marketStalls\[0\]\.yaw,/);
  assert.match(world, /function wadeMul\(\)\{[^}]*Math\.min\(\.28,/);
});

test('Gate 8 — abrigos: poucos, plataforma ritual autoral caminhável, registro no centro, saves antigos migrados', () => {
  assert.deepEqual(WAYSTONES.map(w => w.id), ['abrigo-vila', 'abrigo-mata', 'abrigo-caverna']);
  const st = createMapState({ waystones: ['abrigo-sope', 'abrigo-vila'] }); assert.ok(st.waystones.has('abrigo-mata') && st.waystones.has('abrigo-vila'), 'save antigo preservado');
  assert.equal(WAYSTONE_ALIASES['abrigo-sope'], 'abrigo-mata');
  const w = createWalkables(); const shelter = read('eldoria-shelter3d.js');
  assert.match(shelter, /walk\.addRing\(x, z, S\.r2, S\.r1, y \+ S\.step/); assert.ok(SHELTER.step < .55, 'degrau abaixo do STEP_UP do herói');
  assert.doesNotMatch(shelter, /GLTFLoader|\.jpg|\.png|cgmodel/i, 'nada de asset/textura da referência comercial');
  void w;
  assert.match(world, /function nearestWaystone\(\)\{let best=null,bd=1\.35;/, 'só no centro da plataforma');
  assert.match(world, /'REGISTRAR ESTE ABRIGO'/);
  assert.match(world, /player\.position\.set\(x,v\?v\.shelter\.center\.y:terrainHeightAt\(x,z\),z\)/, 'viagem chega no centro, não no pilar/água');
});
