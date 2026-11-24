import test from 'node:test';
import assert from 'node:assert/strict';
import {mushroomLayout,capPoint,blinkOpen,MUSHROOM_QUALITY,getZarkhaelLighting} from './zarkhael-dimension3d.js';
import {DIMENSIONS,arenaSpots} from './dimensions3d.js';
import {readFileSync} from 'node:fs';

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

test('Zar’khael biases the existing fill toward the boss while preserving player coverage and the black corridor',()=>{
  const env=getZarkhaelLighting();
  assert.equal(env.bg,0x010102);assert.equal(env.fog,0x010102);
  assert.deepEqual(env.hemi,[0xb7b1af,0x110608,.48]);
  assert.deepEqual(env.sun,[0xffe8dc,1.0]);
  assert.deepEqual(env.light,[0xdfe6f2,16,36,[0,7,-2]]);
  assert.ok(env.light[1]>=16&&env.light[3][1]>=6&&env.light[3][1]<=8,'fill must be elevated above the boss rather than washing the floor');
  assert.equal(env.exposure,.85);
  const center=DIMENSIONS.bishop3.center,spots=arenaSpots('bishop3'),[lx,ly,lz]=env.light[3];
  const distanceTo=(spot,y=1.7)=>Math.hypot(spot.x-center.x-lx,y-ly,spot.z-center.z-lz);
  const playerDistance=distanceTo(spots.player),bossDistance=distanceTo(spots.boss);
  assert.ok(playerDistance<env.light[2],'player spawn must remain inside the local fill');
  assert.ok(bossDistance<env.light[2],'boss spawn must remain inside the local fill');
  assert.ok(bossDistance+6<playerDistance,'the boss must be substantially closer to the fill than the player');
  assert.ok(playerDistance/bossDistance>2.2,'the boss must receive a clear geometric priority over the player');
  const edgeDistances=[[30,0],[-30,0],[0,30],[0,-30]].map(([x,z])=>Math.hypot(x-lx,1.7-ly,z-lz));
  assert.ok(Math.max(...edgeDistances)<env.light[2],'the full 30m combat disc must remain inside the fill');
  assert.ok(Math.hypot(lx,3.5-ly,-210-lz)>env.light[2],'distant corridor must remain outside the local fill');
});

test('the fill reuses the arena light rig without adding lights or render passes',()=>{
  const source=readFileSync(new URL('./zarkhael-dimension3d.js',import.meta.url),'utf8');
  const arenas=readFileSync(new URL('./dimension-arenas3d.js',import.meta.url),'utf8');
  assert.match(source,/return getZarkhaelLighting\(\);/);
  assert.doesNotMatch(source,/new\s+(?:THREE|T)\.(?:PointLight|SpotLight|DirectionalLight|HemisphereLight)\b/);
  assert.doesNotMatch(source,/WebGLRenderTarget|EffectComposer|ShadowMap/);
  assert.match(arenas,/mushrooms\(THREE,\s*g,\s*spec,\s*ctx\)\s*\{\s*return buildMushroomDimension/);
});

test('production runtime and preview consume the exact Zar’khael preset through existing lights',()=>{
  const world=readFileSync(new URL('./mundo-3d-prototype.js',import.meta.url),'utf8');
  const preview=readFileSync(new URL('./tools/visual-lab/bispo3-dimension-preview.html',import.meta.url),'utf8');
  const start=world.indexOf('function updateVoid(dt,now){');
  const end=world.indexOf('// ---------- Etapas ----------',start);
  const updateVoidSource=start>=0&&end>start?world.slice(start,end):'';
  assert.ok(updateVoidSource,'production updateVoid function must be present');
  assert.match(updateVoidSource,/const e=arena\.env/);
  assert.match(updateVoidSource,/hemiLight\.intensity=e\.hemi\[2\]/);
  assert.match(updateVoidSource,/sunLight\.intensity=e\.sun\[1\]/);
  assert.match(updateVoidSource,/dimLight\.intensity=e\.light\[1\][\s\S]*?dimLight\.distance=e\.light\[2\]/);
  assert.match(updateVoidSource,/else dimLight\.position\.set\(voidSpec\.x\+e\.light\[3\]\[0\],voidSpec\.y\+e\.light\[3\]\[1\],voidSpec\.z\+e\.light\[3\]\[2\]\)/);
  assert.match(preview,/const e=arena\.env/);
  assert.match(preview,/new THREE\.PointLight\(e\.light\[0\],e\.light\[1\],e\.light\[2\],1\.1\)/);
});
