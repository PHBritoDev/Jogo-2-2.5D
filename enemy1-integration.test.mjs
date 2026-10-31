import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Enemy1Squad, E1 } from './enemy1-squad3d.js';

const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./mundo-3d-prototype.html', import.meta.url), 'utf8');

test('encontros Enemy1 viram esquadra simultânea; outros tipos seguem o pacote antigo', () => {
  assert.match(src, /squad:\(rigName==='enemy1'\|\|rigName==='enemy2'\)&&!SQUAD_LEGACY/);
  assert.match(src, /if\(pack&&pack\.squad\)\{if\(!squadOn\)startSquadPack\(\);return;\}/);
  assert.match(src, /if\(pack\.squad\)return true;/, 'packHandleDefeat não fecha o encontro por inimigo');
  assert.match(src, /function finishSquad\(\)[\s\S]{0,900}const done=P&&P\.onDone;pack=null;packFinishing=true;/, 'onDone só depois de todos caírem');
  assert.match(src, /P\.index\+\+;if\(P\.onEach\)P\.onEach\(P\.index\)/, 'onEach por inimigo derrotado');
  for (const rig of ['enemy3', 'enemy4', 'rival', 'anjo']) assert.match(src, new RegExp(`startPack\\(\\{rig:'${rig}'`));
});

test('o inimigo legado vira procurador do foco: IA e kit antigos desligados, dano repassado', () => {
  assert.match(src, /function updateEnemyAI\(dt\)\{\n if\(squadOn\)return;/);
  assert.match(src, /function updateFoeKit\(dt\)\{\n if\(swordTraining\|\|squadOn\)return;/);
  assert.match(src, /const lost=squadProxy\.hp-enemyHP;/);
  assert.match(src, /function advanceAfterEnemyDefeat\(\)\{if\(squadOn\|\|performance\.now\(\)<squadSwallowUntil\)return;/);
  assert.match(src, /updateSquadCombat\(dt,now\);updateEnemy1Lab\(dt\);updateEnemyAI\(dt\);/);
});

test('golpe, projéteis e magias em área alcançam os outros atores; colisão com o herói', () => {
  assert.match(src, /onEnemyDamaged\(dmg,crit\);if\(squadOn\)squadCleave\(dmg\);/);
  assert.match(src, /if\(squadOn&&!p\.hit&&squadProjectileHit\(p\)\)p\.life=0;/);
  assert.match(src, /function squadAreaRadius\(\)/);
  assert.match(src, /if\(squadBlocks\(x,z\)\)return true;/);
});

test('MIRAR alterna entre inimigos; laboratório isolado do progresso', () => {
  assert.match(src, /if\(squadOn&&lockOnActive&&squadCycleFocus\(\)\)return;/);
  assert.ok(src.includes("ENEMY2_LAB=new URLSearchParams(location.search).has('testeEnemy2');") && src.includes('isolatedSwordStorage(window.localStorage,testAllSkills||ENEMY1_LAB||ENEMY2_LAB)'));
  for (const b of ["B('1'", "B('2'", "B('4'", "B('GUARDIÃO'", "B('+ ALIADO'", "B('CLASH'"]) assert.ok(src.includes(b), b);
});

test('Mod visível e cache atualizado (238)', () => {
  assert.match(html, /<div id="marker" aria-label="Modificação 238">238<\/div>/);
  assert.match(html, /mod181-loader\.js\?v=mod238-enemy2-trindade/);
  assert.match(fs.readFileSync(new URL('./mod181-loader.js', import.meta.url), 'utf8'), /const BUILD = 'mod238-enemy2-trindade';/);
});

test('Mod 238: Enemy2 do Ato II em esquadra, mini-chefe com foice, ultimate genérico desligado na esquadra', () => {
  assert.match(src, /kind=P\.rig==='enemy2'\?\(P\.profile==='miniboss2'\?'e2boss':'e2'\)/);
  assert.match(src, /source:k=>rigSource\(k==='e2'\|\|k==='e2boss'\?'enemy2':'enemy1'\)/);
  assert.match(src, /function updateBossUltimates\(dt,now\)\{\n tickTransientFx\(dt\);\n[^\n]*\n[^\n]*\n if\(squadOn\)\{if\(bossUlt\.kind\)endBossUlt\(\);return;\}/);
  assert.match(src, /air:Math\.max\(0,player\.position\.y-terrainHeightAt/, 'salto sobre a onda do Colapso');
  for (const k of ["case 'surgir-tres':startPack({rig:'enemy2'", "case 'surgir-cinco':startPack({rig:'enemy2'", "case 'surgir-mini-chefe':startPack({rig:'enemy2',profile:'miniboss2'"]) assert.ok(src.includes(k), k);
  const rt = fs.readFileSync(new URL('./enemy1-squad-runtime3d.js', import.meta.url), 'utf8');
  assert.match(rt, /kind === 'e2boss' \? buildInfernalScythe\(T\)/);
});

test('Guardião é bem mais resistente que o comum, sem virar esponja; comum na faixa 150–220', () => {
  assert.ok(E1.common.hp >= 150 && E1.common.hp <= 220);
  assert.ok(E1.warden.hp > E1.common.hp * 2 && E1.warden.hp < E1.common.hp * 3.5);
  const sq = new Enemy1Squad({ seed: 1 }); const [c, w] = sq.spawn([{ x: 0, z: 0 }, { x: 5, z: 0, kind: 'warden' }]);
  assert.ok(w.T.claws.hands > c.T.claws.hands && w.T.claws.r > c.T.claws.r && w.T.spiral.dmg > c.T.spiral.dmg && w.T.judgment.r > c.T.judgment.r, 'poderes derivados mais fortes');
  assert.ok(w.T.counter.chance > c.T.counter.chance, 'contra-magia mais competente no mini-chefe');
});
