import test from 'node:test';
import assert from 'node:assert/strict';
import {nodes,safePathGraph,supported,caveHeight,caveHeat} from './volcano-cave-layout.js';
import {volcanoWalkable} from './volcano3d.js';

test('toda ligação tem apoio contínuo para os dois pés; circuito não exige salto',()=>{
 const connected=new Set(['entrance']);
 for(let j=0;j<Object.keys(nodes).length;j++)for(const [from,to] of safePathGraph){
  if(connected.has(from))connected.add(to);if(connected.has(to))connected.add(from);
 }
 assert.equal(connected.size,Object.keys(nodes).length);
 for(const [from,to] of safePathGraph){
  const [x,z]=nodes[from],[u,v]=nodes[to],n=Math.ceil(Math.hypot(u-x,v-z)*4);
  for(let i=0;i<=n;i++){const px=x+(u-x)*i/n,pz=z+(v-z)*i/n;
   for(const off of [-.31,.31])assert(volcanoWalkable(px+off,pz,{doorOpen:true}),from+' → '+to);
   assert(caveHeight(pz)>=0);assert.equal(caveHeat(px,pz),0,from+' → '+to);
  }
 }
});
test('o abismo tem bordas e o cristal ou a rocha seca não aplicam queimadura',()=>{
 assert(!supported(11,-29));assert(supported(0,-82));assert(caveHeat(3,110.3));assert(!caveHeat(0,112));
 assert(!volcanoWalkable(-24,0));assert(volcanoWalkable(-24,0,{doorOpen:true}));
});

test('câmera e cápsula usam o mesmo pilar rotacionado, com limites verticais', async () => {
 const {addStructure,resetStructures,caveBlocked,caveWall}=await import('./volcano-cave-layout.js');
 resetStructures();
 try {
  const x=-17,z=44;
  addStructure(x,0,z,6,4,.8,Math.PI/2);
  for(const dz of [-2.1,-1,0,1,2.1]){
   assert(caveBlocked(x,z+dz,true));
   for(const y of [.35,.9,1.6,3.8])assert(caveWall(x,y,z+dz));
   assert(!caveWall(x+1.2,1.6,z+dz));
   assert(!caveWall(x,4.5,z+dz));
  }
 } finally {resetStructures();}
});

test('travessia do riacho usa a altura da passarela e não queima o herói', async () => {
 const {creek,inBasin,caveFloor}=await import('./volcano-cave-layout.js');
 let dry=0,hot=0;
 for(let i=1;i<creek.length;i++){
  const [x,z]=creek[i-1],[u,v]=creek[i];
  for(let j=1;j<10;j++){
   const px=x+(u-x)*j/10,pz=z+(v-z)*j/10;
   if(!inBasin(px,pz))continue;
   if(supported(px,pz)){assert.equal(caveHeat(px,pz),0);dry++;}
   else {assert.equal(caveHeat(px,pz),1);assert(caveFloor(px,pz)<0);hot++;}
  }
 }
 assert(dry>0&&hot>0);
});

test('os degraus do coro sustentam os dois pés na mesma cota da malha',async()=>{
 const {choirStairs,caveFloor}=await import('./volcano-cave-layout.js');
 for(const [i,step] of choirStairs.entries()){
  for(const t of [.01,.5,.99])for(const offset of [-3.8,0,3.8]){
   const x=step.x0+(step.x1-step.x0)*t+offset;
   assert.equal(caveFloor(x,step.z+t),step.y);
   assert(volcanoWalkable(x,step.z+t,{doorOpen:true}));
  }
  if(i)assert(step.y-choirStairs[i-1].y<.18);
 }
});
