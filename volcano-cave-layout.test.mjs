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
