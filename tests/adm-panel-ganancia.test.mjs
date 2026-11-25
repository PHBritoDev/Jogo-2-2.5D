import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const world=readFileSync(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../adm-panel3d.js',import.meta.url),'utf8');
const adapter=readFileSync(new URL('../greed-ultimate-campaign3d.js',import.meta.url),'utf8');

test('painel ADM é condicional, único e separado do HUD principal',()=>{
 assert.match(world,/if\(new URLSearchParams\(location.search\).get\('adm'\)==='1'\)/);
 assert.match(world,/createAdmPanel\(\{/);
 assert.match(world,/function dimTestPanel\(\)\{[\s\S]*?get\('adm'\)==='1'\)return;/);
 assert.match(ui,/if\(document.getElementById\('adm-panel'\)\)return null/);
 assert.match(ui,/#adm-content\[hidden\]/);
 assert.match(ui,/@media\(max-height:510px\)/);
 assert.match(ui,/@media\(max-width:680px\)/);
 assert.match(ui,/\.adm-scroll\{[^}]*overflow-y:auto/);
});
test('organização PC e celular com três categorias e toque real',()=>{
 for(const key of ['ganancia','dimensoes','viagem'])assert.ok(ui.includes(key));
 assert.match(ui,/aria-selected/);
 assert.match(ui,/aria-expanded/);
 assert.match(ui,/min-height:45px/);
 assert.match(ui,/touch-action:manipulation/);
 assert.match(ui,/ATIVAR ULTIMATE · JUÍZO DA USURA/);
 assert.match(ui,/Próxima fase da Ganância/);
 assert.match(ui,/Cidade 1 · Eldória/);
 assert.match(ui,/Cidade 2 · Cinzária/);
 assert.match(ui,/Vale do Entardecer/);
 assert.match(ui,/V · GANÂNCIA/);
 assert.match(ui,/PAUSAR INIMIGOS/);
 assert.match(ui,/RETOMAR INIMIGOS/);
 assert.match(ui,/onPause/);
 assert.match(world,/admFreezeNearby\?0:dt/);
 assert.match(world,/paused:paused\|\|squadQAPause\|\|admFreezeNearby/);
 assert.match(world,/if\(!admFreezeNearby\)updateEnemyAI\(dt\)/);
 assert.match(world,/admFreeze\(on\)/);
});
test('botão ativa a ultimate real sem matar chefe ou alterar vida',()=>{
 assert.match(world,/onUltimate:\(\)=>greedAdmCastUltimate\(\)/);
 assert.match(world,/function greedAdmCastUltimate\(\)/);
 assert.match(world,/if\(!dimBattle\?\.active\|\|dimBattle\.key!=='greed'\)/);
 assert.match(world,/if\(!a\|\|a\.gk\?\.phase!==3\)/);
 assert.match(world,/if\(greedAtomic\.active\)/);
 assert.match(world,/greedAtomic\.force\(\)/);
 assert.match(adapter,/force\(\)\{if\(!actor\?\.alive\|\|actor\.gk\?\.phase!==3\|\|!inactive\(\)\)return false;driver\.end\(\);forceQueued=true;return true;\}/);
 assert.match(adapter,/hpRatio:forceQueued\?\.4:a\.hp/);
 assert.match(adapter,/if\(forceQueued&&ultimate\.getState\(\)\.phase!=='idle'\)forceQueued=false/);
});
test('avanço de fases preserva a transição normal da Ganância',()=>{
 assert.match(world,/function greedAdmNextPhase\(\)/);
 assert.match(world,/if\(a\.gk\?\.phase>=3\)/);
 assert.match(world,/if\(a\.act\?\.type==='gkPhase'\|\|a\.pendingDeath\)/);
 assert.match(world,/squad\.damageActor\(a\.id,Math\.max\(100000,a\.maxHp\*10\)/);
 assert.match(world,/testeDimensao='\+encodeURIComponent\(key\)/);
});
