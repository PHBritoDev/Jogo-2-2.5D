import test from 'node:test';
import assert from 'node:assert/strict';
import {mushroomLayout,capPoint,blinkOpen,MUSHROOM_QUALITY} from './zarkhael-dimension3d.js';

test('mushroom stems preserve the entire original 30m combat disc',()=>{
  const items=mushroomLayout(30);assert.deepEqual(items,mushroomLayout(30));assert.equal(items.length,24);
  for(const m of items) assert.ok(Math.hypot(m.x,m.z)-m.w*.27>30||m.z < -35,JSON.stringify(m));
  assert.ok(items.filter(m=>m.x<0).some((m,i)=>Math.abs(m.z-items.filter(n=>n.x>0)[i].z)>1));
});
test('blinks have independent phases, fully close and recover in 280ms',()=>{
  for(const seed of [.03,.25,.57,.89]){
    const period=3.3+seed*4.7,start=period*6-seed*17;
    assert.ok(blinkOpen(start+.10,seed)<1e-10);
    assert.ok(blinkOpen(start+.05,seed)>.49&&blinkOpen(start+.05,seed)<.51);
    assert.ok(blinkOpen(start+.19,seed)>.49&&blinkOpen(start+.19,seed)<.51);
    assert.equal(blinkOpen(start+.3,seed),1);
  }
  assert.notEqual(blinkOpen(6.472,.03),blinkOpen(6.472,.57));
});
test('cap profile stays finite, continuous at seam and asymmetric',()=>{
  for(let theta=0;theta<1.7;theta+=.08){
    const a=capPoint(theta,0),b=capPoint(theta,Math.PI*2);
    a.forEach((v,i)=>{assert.ok(Number.isFinite(v));assert.ok(Math.abs(v-b[i])<1e-10);});
  }
  assert.notDeepEqual(capPoint(1,1),capPoint(1,2));
});
test('quality limits animation distance, density and target sampling without removing eyes',()=>{
  const q=Object.values(MUSHROOM_QUALITY);
  for(let i=0;i<2;i++)for(const key of ['distance','fraction','hz'])assert.ok(q[i][key]<q[i+1][key]);
  assert.ok(q[0].fraction>0);assert.equal(q[2].fraction,1);
});
