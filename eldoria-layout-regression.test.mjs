import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ELDORIA_MARKET,ELDORIA_PROPS,ELDORIA_DRY_FOUNTAIN,eldoriaSpecs,planOverlaps,footprintRadius} from './eldoria-live-village3d.js';
import {ELDORIA_HOUSES,ELDORIA_SMITHY} from './eldoria-city-layout.js';
import {planGardens} from './eldoria-city-dressing.js';
import {ELDORIA_CENTER} from './act1-world-layout.js';
const txt=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
test('mercado: duas barracas distintas, poço e fonte acessíveis, sem encostar em casas nem árvores',()=>{
 assert.equal(ELDORIA_MARKET.length,2);
 const specs=eldoriaSpecs();
 assert.deepEqual(planOverlaps(specs),[], 'nenhum par de GLBs pode se sobrepor');
 const stalls=specs.filter(s=>s.kind==='market');
 assert.equal(stalls.length,2);
 const well=specs.find(s=>s.file==='PocoEldoria.glb');
 const fountain={x:ELDORIA_DRY_FOUNTAIN.x,z:ELDORIA_DRY_FOUNTAIN.z};
 for(const s of stalls){
   assert.ok(distance(s,well)>footprintRadius(s)+footprintRadius(well)+2.5,'barraca distante do poço');
   assert.ok(distance(s,fountain)>footprintRadius(s)+ELDORIA_DRY_FOUNTAIN.r+1.5,'barraca distante da fonte');
   for(const h of [...ELDORIA_HOUSES,ELDORIA_SMITHY]){
     assert.ok(distance(s,h)>footprintRadius(s)+h.size*.42+.8,'barraca distante da porta/casa '+h.id);
   }
 }
 for(let i=0;i<stalls.length;i++)for(let j=i+1;j<stalls.length;j++)
   assert.ok(distance(stalls[i],stalls[j])>6,'barracas não formam aglomerado');
});
test('cercas: somente guarda-corpos estruturais, sem pequenos segmentos brancos dispersos',()=>{
 const g=planGardens({center:ELDORIA_CENTER,plots:[[0,0,'CasaEldoria01.glb',5,0]],isFree:()=>true});
 assert.equal(g.fences.length,0);
 assert.doesNotMatch(txt('eldoria-environment-art.js'),/posts\.push\(\{x:centerX/);
 assert.match(txt('eldoria-city-dressing.js'),/walk\.addWall/,'guarda-corpos funcionais mantidos');
});
test('vendedores acompanham barracas e relatório divulga as posições reais',()=>{
 const src=txt('mundo-3d-prototype.js');
 assert.match(src,/marketStalls=ELDORIA_MARKET\.map/);
 assert.match(src,/market:marketStalls\.map/);
 assert.match(src,/grounding:report\.grounding/);
});
test('escadas: ajuste dos pés usa altura do root na plataforma e não o terreno sob ela',()=>{
 const src=txt('mundo-3d-prototype.js');
 assert.match(src,/const floorY=player\.position\.y;if\(!model\.userData\.footBones\)/);
 assert.match(src,/eldoriaWalk\.supportAt\(player\.position\.x,player\.position\.z/);
});
test('chegada rápida: a câmera final é aplicada antes de cortar instâncias',()=>{
 const src=txt('mundo-3d-prototype.js');
 assert.match(src,/const p=player\.position,south=!voidMode&&p\.z>46/);
 assert.ok(src.indexOf('updatePlayerCamera(dt);')<src.indexOf('updateInstanceCulling();if(vzCinematic()'),'culling após câmera');
 assert.match(src,/sz=Math\.hypot\(src\[o\+8\]/);
 assert.match(txt('eldoria-live-village3d.js'),/spec\.kind === 'market'\) child\.frustumCulled = false/);
});
