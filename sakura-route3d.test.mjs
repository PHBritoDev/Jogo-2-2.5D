import test from 'node:test';
import {interiorLights} from './sakura-interiors3d.js';
import {createSakuraWorld} from './sakura-world3d.js';
import assert from 'node:assert/strict';
import {DOJO_BRIDGE,bridgeSection,ROUTE,CITY_ROAD,FROM_CITY,DETOURS,DOJO,CASTLE,FLANK_TOWERS,THRONE,SPRING_LAKE,ICE_LAKE,GLACIER_BRIDGE,LENGTHS,INLET_BRIDGE,SHELTERS,sampleRoad,routeGround,roadBlocked,landscape,lakeDepth,leavesVolcano,nextGuide} from './sakura-route3d.js';
import {CITY2,GATE2} from './jornada3d.js';
import {DISTRICT_SPOTS} from './act2-flow.js';
import {migrateProgress} from './act1-flow.js';
import {MAP_BOUNDS,V4_MAP_BOUNDS,migrateLegacyFog,createMapState,isRevealed} from './map3d.js';

test('a saída canônica do bilhete fica fora da cratera e encontra a passagem do anel de basalto',()=>{
 assert.ok(Math.hypot(FROM_CITY[0].x-CITY2.x,FROM_CITY[0].z-CITY2.z)>22.5);
 assert.equal(FROM_CITY[0].x,DISTRICT_SPOTS.note.x+1.2);
 for(const w of SHELTERS)assert.ok(sampleRoad(w.x,w.z).d>8,w.id+' atravessa o caminho');
 assert.ok(routeGround(INLET_BRIDGE.x,INLET_BRIDGE.z)>SPRING_LAKE.y+.45);
 assert.ok(!roadBlocked(INLET_BRIDGE.x,INLET_BRIDGE.z));
 assert.deepEqual([FROM_CITY.at(-1).x,FROM_CITY.at(-1).z],[GATE2.out.x,GATE2.out.z]);
 assert.ok(leavesVolcano(-275,sampleRoad(-1606,-275)));
 assert.equal(leavesVolcano(GATE2.z,sampleRoad(GATE2.x,GATE2.z)),false);
});
test('cada metro do eixo, do retorno e de nove desvios é atravessável e contínuo',()=>{
 assert.equal(typeof createSakuraWorld,'function');assert.ok(LENGTHS.at(-1)>5000);
 assert.equal(DETOURS.length,9);
 for(const road of [ROUTE,CITY_ROAD,...DETOURS.map(d=>d.points)])for(let j=1;j<road.length;j++){
  const a=road[j-1],b=road[j],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));let previous;
  for(let k=0;k<=n;k++){const t=k/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,p=sampleRoad(x,z);
   if(x<198&&road===CITY_ROAD)continue; // última praça pertence ao mapa original
   const h=routeGround(x,z,p);assert.ok(Number.isFinite(h));assert.ok(!roadBlocked(x,z,p),'colisão '+[x,z]);
   if(previous!==undefined)assert.ok(Math.abs(h-previous)<1,'degrau '+[x,z,h,previous]);previous=h;
  }
 }
});
test('a ponte tem chão acima da ravina, as margens e a água aberta se distinguem do gelo',()=>{
 const b=GLACIER_BRIDGE,x=b.x+b.dx*b.len*.5,z=b.z+b.dz*b.len*.5;
 assert.ok(routeGround(x,z)-landscape(x,z)>40);
 assert.ok(roadBlocked(x+b.dz*3.4,z-b.dx*3.4));assert.ok(!roadBlocked(x,z));
 assert.ok(lakeDepth(SPRING_LAKE.x,SPRING_LAKE.z)>1.25);
 assert.ok(!roadBlocked(ICE_LAKE.x,ICE_LAKE.z));assert.ok(roadBlocked(825,-1702));
});
test('portas, passarelas e escadas ligam a nave, as galerias e o trono',()=>{
 assert.ok(!roadBlocked(DOJO.x,DOJO.z-10.6));assert.ok(roadBlocked(DOJO.x+7,DOJO.z-10.6));
 assert.ok(!roadBlocked(CASTLE.x,CASTLE.z-39.9));assert.ok(roadBlocked(CASTLE.x+9,CASTLE.z-39.9));
 for(const s of [-1,1]){const x=CASTLE.x+s*19;assert.equal(routeGround(x,CASTLE.z-12),81);assert.equal(routeGround(x,CASTLE.z+18),88);}
 assert.deepEqual(nextGuide(THRONE.x,THRONE.z,2),CITY_ROAD[1]);
});
test('saves antigos conservam a campanha e novos saves conservam os marcos de descanso',()=>{
 for(const step of [12,15,16,17,18,19,21]){const s=migrateProgress({version:6,act1Rev:2,questStep:step,coins:132,act1Sub:1,bishopsDefeated:2});assert.equal(s.questStep,step);assert.equal(s.coins,132);assert.equal(s.sakuraRest,-1);}
 for(const [raw,expected] of [[23,23],[61,61],[1000,-1],['23',-1]])assert.equal(migrateProgress({version:6,act1Rev:2,questStep:15,sakuraRest:raw}).sakuraRest,expected);
});
test('névoa da v4 conserva um abrigo conhecido sem revelar antecipadamente o castelo',()=>{
 const v=V4_MAP_BOUNDS,x=-1228,z=-74,k=Math.floor((z-v.z0)*v.cells/v.size)*v.cells+Math.floor((x-v.x0)*v.cells/v.size);
 const bytes=Buffer.alloc(Math.ceil(v.cells*v.cells/8));bytes[k>>3]|=1<<(k&7);
 const state=createMapState(migrateLegacyFog({cells:bytes.toString('base64'),pois:['cinzaria'],waystones:['abrigo-cinzaria']},v));
 assert.ok(isRevealed(state,x,z));assert.ok(!isRevealed(state,CASTLE.x,CASTLE.z));assert.ok(state.waystones.has('abrigo-cinzaria'));
 for(const p of ROUTE){assert.ok(p.x>=MAP_BOUNDS.x0&&p.z>=MAP_BOUNDS.z0&&p.x<MAP_BOUNDS.x0+MAP_BOUNDS.size);}
});

test('as fontes permanecem nas lanternas, vitrais e trono ao cruzar o interior',()=>{
 class PointLight {
  constructor(){this.position={set:(x,y,z)=>Object.assign(this.position,{x,y,z})};}
 }
 const lamps=[],update=interiorLights({PointLight},{add:light=>lamps.push(light)});
 const positions=()=>lamps.map(({position:{x,y,z}})=>[x,y,z]);
 const original=positions();
 update(DOJO);
 assert.equal(lamps.filter(l=>l.visible).length,2);
 const day=lamps[0].intensity;
 update({x:DOJO.x+7,z:DOJO.z-5},1);
 assert.ok(lamps[0].intensity>day);
 update({x:DOJO.x+17,z:DOJO.z});
 assert.ok(lamps[0].intensity>0&&lamps[0].intensity<day);
 update(CASTLE);
 assert.equal(lamps.filter(l=>l.visible).length,3);
 update(THRONE);
 assert.deepEqual(positions(),original);
 update({x:0,z:0});
 assert.equal(lamps.filter(l=>l.visible).length,0);
});

test('torres e panos da muralha detêm o jogador, com o eixo do pórtico livre',()=>{
 for(const sign of [-1,1]){
  for(const [x,z] of FLANK_TOWERS)assert.ok(roadBlocked(CASTLE.x+sign*x,CASTLE.z+z));
  assert.ok(roadBlocked(CASTLE.x+sign*45,CASTLE.z-12));
 }
 for(let z=-101;z<=61;z++)assert.equal(roadBlocked(CASTLE.x,CASTLE.z+z),false);
});

test('o tabuleiro e os dois corrimãos acompanham a inclinação até às duas cabeceiras',()=>{
 const b=DOJO_BRIDGE;
 for(let z=b.start;z<=b.end;z+=.25){
  const section=bridgeSection(z);
  for(const sign of [-1,1]){
   const rail=b.x+sign*section.width;
   assert.equal(roadBlocked(rail,z),true);
   const inside=rail-sign*.5;
   assert.equal(roadBlocked(inside,z),false);
   assert.equal(routeGround(inside,z),section.height);
  }
 }
 assert.equal(bridgeSection(-1650).height,125);
 // The return path leaves the north landing to the east, past the final post.
 const a=ROUTE[24],beyond=ROUTE[25];
 for(let i=0;i<=250;i++){
  const t=i/250;
  assert.equal(roadBlocked(a.x+(beyond.x-a.x)*t,a.z+(beyond.z-a.z)*t),false);
 }
});
