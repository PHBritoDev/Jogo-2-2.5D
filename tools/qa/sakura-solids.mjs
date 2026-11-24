// Geometry-only survey. The renderer has no framebuffer here. The streamed
// meshes, terrain, body radius, step allowance and colliders are the game's.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSakuraWorld} from '../../sakura-world3d.js';
import {ROUTE,CITY_ROAD,DETOURS,routeGround} from '../../sakura-route3d.js';
import {STEP_UP} from '../../eldoria-walkable.js';

const gradient={addColorStop(){}};
const paint=new Proxy({}, {get:(_,method)=>method.startsWith('create')?()=>gradient:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>paint})};
globalThis.innerHeight=393;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),fog=new THREE.Fog(0xffffff,20,640);
const world=createSakuraWorld(THREE,scene,{ground:routeGround,low:true});
for(const [name,path] of [['Eixo',ROUTE],['Bairro',CITY_ROAD],...DETOURS.map(d=>[d.name,d.points])]){
 let feet=routeGround(path[0].x,path[0].z),samples=0;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2);
  for(let j=0;j<=steps;j++){
   const t=j/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=routeGround(x,z);
   if(j%10===0)world.update(.03,300,{x,y,z},camera,fog,0,false);
   feet=Math.max(y,feet);
   assert.ok(!world.solidAt(x,z,feet),name+' bloqueado em '+[x,z]);
   feet=Math.max(y,world.heightAt(x,z,feet+STEP_UP));
   samples++;
  }
 }
 console.log(name,samples);
}
