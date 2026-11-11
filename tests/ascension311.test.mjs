import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as L from '../ascension-layout.js';
import {CAGE_CLEARING,CAGE_TRAIL,JOURNEY_ENEMIES} from '../act1-world-layout.js';
import {MAP_POIS} from '../map3d.js';
const src=fs.readFileSync(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
const caveSrc=fs.readFileSync(new URL('../ascension-cave3d.js',import.meta.url),'utf8');
const len=pts=>pts.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1]),0);

test('Mod 311: muralha da fronteira — colisão = mesma linha da malha (sem parede invisível nem rocha atravessável)',()=>{
 for(let i=0;i<L.FRONTIER_LINE.length-1;i+=3){const [x,z]=L.FRONTIER_LINE[i],[x2,z2]=L.FRONTIER_LINE[i+1],tx=x2-x,tz=z2-z,l=Math.hypot(tx,tz);
  let nx=-tz/l,nz=tx/l;if(!L.insidePoly(x+nx*2,z+nz*2)){nx=-nx;nz=-nz;}
  if(L.inMouthTunnel(x,z,3))continue;
  assert.equal(L.frontierBlocked(x+nx*1.5,z+nz*1.5),true,'dentro da rocha bloqueia');
  assert.equal(L.frontierBlocked(x-nx*(L.FRONTIER_PAD+.4),z-nz*(L.FRONTIER_PAD+.4)),false,'fora da rocha (além da folga do corpo) é livre');}
 // grade acelerada = polígono exato
 let bad=0;for(let i=0;i<40000;i++){const x=-150+((i*7919)%2100)/10,z=-340+((i*104729)%1650)/10;if((L.frontierSigned(x,z)<0)!==L.insidePoly(x,z))bad++;}assert.equal(bad,0);
});
test('Mod 311: boca da caverna alcançável pela trilha; túnel livre e com piso plano',()=>{
 const T=L.CAVE_TRAIL;for(let i=0;i<T.length-1;i++)for(let k=0;k<=10;k++){const x=T[i][0]+(T[i+1][0]-T[i][0])*k/10,z=T[i][1]+(T[i+1][1]-T[i][1])*k/10;assert.equal(L.frontierBlocked(x,z),false,`trilha livre em ${x},${z}`);}
 const M=L.CAVE_MOUTH;for(let x=M.x+2;x>M.x-M.depth;x-=.5)assert.equal(L.frontierBlocked(x,M.z),false);
 for(let x=M.x-.2;x>M.x-M.depth;x-=.5)for(const s of [-1,1])assert.equal(L.frontierBlocked(x,M.z+s*(M.width/2+.6)),true,'parede lateral do túnel');
 assert.ok(Math.abs(L.mouthTunnelFloor(M.x)-M.floor)<1e-9&&L.mouthTunnelFloor(M.x-M.depth)<M.floor);
 assert.ok(L.mouthDepth(M.x-M.depth*M.enterDepth)>=M.enterDepth-1e-9,'gatilho só depois de avançar no túnel');
});
test('Mod 311: gaiolas e Seguidores realocados para longe, com jornada real a partir da vila',()=>{
 assert.ok(Math.hypot(CAGE_CLEARING.x-L.CAVE_MOUTH.x,CAGE_CLEARING.z-L.CAVE_MOUTH.z)>180);
 for(const e of JOURNEY_ENEMIES){assert.ok(Math.hypot(e.x-CAGE_CLEARING.x,e.z-CAGE_CLEARING.z)<9);assert.equal(L.frontierBlocked(e.x,e.z),false);}
 const route=[[-12.2,-44.5],[-8.7,-43.3],[-4.6,-41.4],[0,-41],[2.2,-43],[20,-38],[44,-33]].concat(CAGE_TRAIL.slice(1),[[CAGE_CLEARING.x,CAGE_CLEARING.z]]);
 assert.ok(len(route)>95,'percurso pela trilha, não linha reta: '+len(route).toFixed(1));
 assert.equal(MAP_POIS.find(p=>p.id==='gaiolas').z,CAGE_CLEARING.z);
 assert.match(src,/\{points:CAGE_TRAIL,width:3\}/);
});
function bfs(walk,start,cell=.75,box=[-70,52,-162,18]){const key=(i,j)=>i+','+j,seen=new Set([key(0,0)]),q=[[0,0]];const pts=[];
 while(q.length){const [i,j]=q.shift();const x=start[0]+i*cell,z=start[1]+j*cell;pts.push([x,z]);for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+di,nj=j+dj,nx=start[0]+ni*cell,nz=start[1]+nj*cell;if(nx<box[0]||nx>box[1]||nz<box[2]||nz>box[3])continue;const k=key(ni,nj);if(seen.has(k)||!walk(nx,nz))continue;seen.add(k);q.push([ni,nj]);}}
 return {has:(x,z,r=1.2)=>pts.some(p=>Math.hypot(p[0]-x,p[1]-z)<r),pts};}
test('Mod 311: caverna contínua — entrada → salão (ponte sobre o abismo) → gruta → câmara do portal; abismo e poças não pisáveis',()=>{
 const S=L.CAVE.spawn,g=bfs(L.caveWalk,[S.x,S.z]);
 assert.ok(g.has(0,-60),'ponte');assert.ok(g.has(-38,-62,2),'gruta');assert.ok(g.has(L.CAVE.portal.x,L.CAVE.portal.z+4),'frente do portal');assert.ok(g.has(0,8.5),'saída');
 assert.equal(L.caveWalk(8,-60),false,'abismo');assert.equal(L.caveWalk(-46,-57),false,'poça');
 // degraus falsos: vizinhos caminháveis nunca diferem mais de 0,45 m
 let worst=0;for(const [x,z] of g.pts){if(L.caveWalk(x+.75,z))worst=Math.max(worst,Math.abs(L.caveFloor(x,z)-L.caveFloor(x+.75,z)));if(L.caveWalk(x,z+.75))worst=Math.max(worst,Math.abs(L.caveFloor(x,z)-L.caveFloor(x,z+.75)));}
 assert.ok(worst<.45,'maior salto entre vizinhos '+worst.toFixed(2));
 assert.match(caveSrc,/caveCamSolid/);
});
test('Mod 311: portal só leva quem atravessa o plano no sentido certo e dentro do aro',()=>{
 const P=L.CAVE.portal;
 assert.equal(L.crossedCavePortal({x:P.x,z:P.z+.3},{x:P.x,z:P.z-.2}),true);
 assert.equal(L.crossedCavePortal({x:P.x,z:P.z-.2},{x:P.x,z:P.z+.3}),false,'de trás para frente não dispara');
 assert.equal(L.crossedCavePortal({x:P.x+P.r+.5,z:P.z+.3},{x:P.x+P.r+.5,z:P.z-.2}),false,'fora do aro');
 assert.equal(L.caveWalk(P.x+P.r+.6,P.z),false,'aro sólido');
 const A=L.ASCENT_PORTAL;assert.equal(L.crossedAscentPortal({x:0,z:A.z-.3},{x:0,z:A.z+.2}),true);assert.equal(L.crossedAscentPortal({x:0,z:A.z+.3},{x:0,z:A.z-.2}),false);
 assert.match(src,/now>ascCooldownUntil/);
});
test('Mod 311: escadaria longa, degrau a degrau, contínua até a ilha; centro da arena aberto',()=>{
 let prev=0,maxRise=0,t=0;for(let z=-3;z>-L.islandCenter().z*-1;z-=.05){assert.equal(L.ascentWalk(0,z),true,'caminho livre em z='+z.toFixed(2));const y=L.ascentFloor(0,z);if(!L.onIsland(0,z)){assert.ok(y>=prev-1e-6,'nunca desce subindo');maxRise=Math.max(maxRise,y-prev);}prev=y;t+=.05;}
 assert.ok(maxRise<=L.ASCENT.riser+1e-6,'subida por amostra ≤ espelho do degrau');
 assert.ok(L.ascentTopY()>150,'altura monumental');
 assert.ok(L.ascentStairsEnd()/6.8>45,'mesmo correndo leva mais de 45 s');
 assert.equal(L.ascentWalk(L.ASCENT.width/2+.2,-20),false,'borda do lance');
 const C=L.islandCenter();for(let a=0;a<6.28;a+=.2)for(let r=0;r<30;r+=2)assert.equal(L.ascentWalk(C.x+Math.cos(a)*r,C.z+Math.sin(a)*r),true,'centro aberto');
 for(const r of L.ARENA_ROCKS)for(const f of L.arenaRockFeet(r))assert.equal(L.ascentWalk(f.x,f.z),false,'pé da formação é sólido');
 assert.equal(L.ascentProgress(0),0);assert.equal(L.ascentProgress(L.ascentTopY()),1);
});
test('Mod 311: assets reaproveitados existem (sem 404) e a integração está ligada',()=>{
 for(const f of ['MontanhaEldoria01.glb','EntradaCavernaAto1.glb','CristalCaverna01.glb','RochedoMusgoEldoria.glb']){const b=fs.readFileSync(new URL('../'+f,import.meta.url));assert.equal(b.toString('utf8',0,4),'glTF',f);}
 assert.match(src,/if\(frontierBlocked\(x,z\)\)return true;/);
 assert.match(src,/updateAscension\(dt,now\);/);
 assert.match(src,/function leaveVoid\(\)\{if\(ascKey\)ascHide\(\);/);
 assert.match(src,/renderer\.compileAsync/);
 for(const z of Object.values(L.ZONES))assert.ok(Math.abs(z.x)<6000&&Math.abs(z.z)<6000,'dentro do limite de movimento');
});


test('Caverna: queda real no abismo, mas ponte e rocha continuam sólidas',()=>{
 assert.equal(L.caveHazard(8,-60),true,'borda da fenda não pode virar parede invisível');
 assert.equal(L.caveHazard(0,-60),false,'ponte de pedra sustenta o herói');
 assert.equal(L.caveHazard(0,-20),false,'corredor não deve causar queda');
 assert.ok(L.CAVE.corridors.find(c=>c.id==='norte').r>=4,'passagem principal aceita o corpo/câmera');
});
test('Escadaria e ilha: bordas abertas para queda, trilha central caminhável',()=>{
 assert.equal(L.ascentHazard(0,-20),false,'degrau central é seguro');
 assert.equal(L.ascentHazard(L.ASCENT.width/2+.2,-20),true,'sem guarda-corpo invisível');
 const c=L.islandCenter();
 assert.equal(L.ascentHazard(c.x,c.z),false,'centro da arena seguro');
 assert.equal(L.ascentHazard(c.x+L.ASCENT.island.r+5,c.z),true,'queda fora da ilha');
});
test('Câmera da caverna não colide com terreno externo e queda termina em respawn',()=>{
 assert.match(src,/if\(!voidMode\)for\(let i=1;i<=6;i\+\+\)/);
 assert.match(src,/ascVoidFall/);
 assert.match(src,/voidSpec\.hazard/);
});
