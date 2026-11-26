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
 assert.match(ui,/ULTIMATE · CHEFES PRÓXIMOS/);
 assert.match(ui,/Próxima fase da Ganância/);
 assert.match(ui,/Cidade 1 · Eldória/);
 assert.match(ui,/Cidade 2 · Cinzária/);
 assert.match(ui,/Vale do Entardecer/);
 assert.match(ui,/V · GANÂNCIA/);
 assert.match(ui,/PAUSAR INIMIGOS/);
 assert.match(ui,/RETOMAR INIMIGOS/);
 assert.match(ui,/onPause/);
 assert.match(ui,/createAdmPanel\(\{onTeleport,onDimension,onUltimate,onPhase,onKill,onPause,getState\}\)/);
 assert.match(world,/admFreezeNearby\?0:dt/);
 assert.match(world,/paused:paused\|\|squadQAPause\|\|admFreezeNearby/);
 assert.match(world,/if\(!admFreezeNearby\)updateEnemyAI\(dt\)/);
 assert.match(world,/admFreeze\(on\)/);
 assert.match(world,/^\s*updateAllies\(dt\);/m, 'a pausa dos inimigos preserva o relógio dos aliados');
});
test('botão ADM ativa a Ultimate autoral de qualquer chefe dentro de 20 m',()=>{
 assert.match(world,/onUltimate:\(\)=>admCastNearbyBossUltimate\(\)/);
 assert.match(world,/function admCastNearbyBossUltimate\(\)/);
 assert.match(world,/const range=20/);
 assert.match(world,/tierOf\(encounterProfile\)!=='boss'/);
 assert.match(world,/const ultimate=ultimateFor\(encounterProfile\)/);
 assert.match(world,/if\(!ultimate\)return 'Este chefe não possui Ultimate cadastrada\.'/);
 assert.match(world,/started=startLunarUlt\(\)/);
 assert.match(world,/started=startZarkUlt\(\)/);
 assert.match(world,/started=startCosmicUlt\(\)/);
 assert.doesNotMatch(world,/onUltimate:\(\)=>greedAdmCastUltimate\(\)/);
});

test('avanço de fases preserva a transição normal da Ganância',()=>{
 assert.match(world,/function greedAdmNextPhase\(\)/);
 assert.match(world,/if\(a\.gk\?\.phase>=3\)/);
 assert.match(world,/if\(a\.act\?\.type==='gkPhase'\|\|a\.pendingDeath\)/);
 assert.match(world,/squad\.damageActor\(a\.id,Math\.max\(100000,a\.maxHp\*10\)/);
 assert.match(world,/testeDimensao='\+encodeURIComponent\(key\)/);
});
