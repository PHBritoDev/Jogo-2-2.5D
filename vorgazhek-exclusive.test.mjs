import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KITS, kitFor, pickMove } from './powers3d.js';
import { ultimateFor } from './ultimates3d.js';

const source = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');

test('Bispo 2 e fallen2 só têm as magias autorais; Skill 2 está desligada', () => {
 for (const profile of ['vorgazhek','fallen2']) {
  const k = kitFor(profile);
  assert.equal(k, KITS.vorgazhek);
  assert.deepEqual(k.skills.filter(s=>!s.disabled).map(s=>s.type), ['tornadoes','portal_swords']);
  assert.equal(k.skills[1].id, 's2');
  assert.equal(k.skills[1].disabled, true);
  assert.equal(k.sword.type, 'vorgazhek_eclipse_sword');
  assert.equal(ultimateFor(profile).kind, 'vorgazhek_cosmic_judgment');
  assert.equal(pickMove(profile, {sw: 1}, 8, 's1').type, 'portal_swords');
  assert.equal(pickMove(profile, {sw: 1, s1: 1, s3: 1}, 8), null);
 }
});

test('Mod 264 — gerador e gatilhos legados de projéteis foram fisicamente EXCLUÍDOS do jogo', () => {
 assert.ok(!source.includes('function spawnEnemyProjectile('), 'sem gerador genérico');
 assert.ok(!source.includes('function updateEnemyProjectiles('), 'sem atualizador genérico');
 assert.ok(!source.includes('enemyProjectiles'), 'sem array de projéteis antigos');
 assert.ok(!source.includes('enemyNextRangedRole'), 'sem seleção de poderes à distância na IA antiga');
 assert.ok(!source.includes("spawnEnemyProjectile('slash'"), 'sem triplo corte antigo');
 assert.ok(!source.includes("spawnEnemyProjectile('tornado'"), 'sem triplo anel/tornado antigo');
 assert.ok(source.includes("function updateFoeKit(dt){"), 'motor de poderes autorais preservado');
 assert.ok(source.includes("if(distance<=ENEMY_ATTACK_RANGE&&enemyActions.attack&&enemyAttackCooldown<=0)"), 'ataques corpo a corpo preservados');
});

test('Nenhum fallback genérico, aura genérica ou ultimate padrão se aplica ao Bispo 2', () => {
 assert.ok(source.includes("!['tornadoes','portal_swords','vorgazhek_eclipse_sword'].includes(m?.type)"), 'lista explícita do kit exclusivo');
 assert.ok(source.includes("else if(!isVorgazhekProfile(prof)&&tierOf(prof)!=='common'"), 'sem aura genérica de fúria');
 assert.ok(source.includes("if(isVorgazhekProfile(encounterProfile)){if(kind==='vorgazhek_cosmic_judgment')startCosmicUlt();return;}"), 'motor de ultimates antigas bloqueado');
 assert.ok(!/BOSS_POWERS\.(vorgazhek|fallen2)\s*=/.test(source), 'sem disparador secundário genérico');
});
