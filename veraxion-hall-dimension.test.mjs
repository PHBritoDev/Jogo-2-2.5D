import test from 'node:test';
import assert from 'node:assert/strict';
import {HALL,hallPoint,hallLayout,hallSection,HALL_QUALITY} from './veraxion-hall-dimension3d.js';
import {DIMENSIONS} from './dimensions3d.js';
import {kitFor} from './powers3d.js';
test('corridor sections share boundaries and have actual depth, no radial layout',()=>{
 const a=hallLayout();assert.equal(a.length,32);assert.ok(a.at(-1).z1<-650);
 for(let i=0;i<a.length;i++){assert.equal(a[i].z0-a[i].z1,HALL.step);if(i)assert.equal(a[i-1].z1,a[i].z0);assert.ok(a[i].lampZ<a[i].z0&&a[i].lampZ>a[i].z1);}
 assert.ok(Math.abs(hallSection(-500).angle)>.5);assert.ok(Math.abs(hallSection(-660).angle)<.7);
});
test('entire original combat disc stays flat and clear below player/camera height',()=>{
 assert.equal(DIMENSIONS.bishop4.radius,30);
 for(let z=-30;z<=30;z+=2)for(let x=-30;x<=30;x+=2){if(Math.hypot(x,z)>30)continue;const p=hallPoint(x,0,z);assert.ok(Math.abs(p[0]-x)<1e-10);assert.equal(p[1],0);assert.equal(p[2],z);}
 for(let z=-30;z<=30;z+=2)for(let y=0;y<=12;y++){assert.ok(hallPoint(-36,y,z)[0]<-30);assert.ok(hallPoint(36,y,z)[0]>30);}
});
test('twisting is continuous and finite; low keeps the same architectural identity',()=>{
 for(let z=44;z>=-660;z-=.5){const a=hallPoint(36,52,z),b=hallPoint(36,52,z-.001);assert.ok(a.every(Number.isFinite));assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))<.01);}
 assert.deepEqual(Object.values(HALL_QUALITY).map(q=>q.samples),[1,3,5]);assert.ok(HALL_QUALITY.low.detail<HALL_QUALITY.high.detail);
});
test('current bishop4 kit has no separate sword skill; do not invent or restore it',()=>{
 assert.equal(kitFor('veraxion').sword,null);assert.deepEqual(kitFor('veraxion').skills.map(s=>s.id),['s1','s2']);
});
