import test from 'node:test';
import assert from 'node:assert/strict';
import {mushroomLayout,capPoint,blinkOpen,MUSHROOM_QUALITY,getZarkhaelLighting} from './zarkhael-dimension3d.js';
import {DIMENSIONS,arenaSpots} from './dimensions3d.js';
import {readFileSync} from 'node:fs';
import {createLightBudget} from './light-budget3d.js';

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
  assert.deepEqual(env.light,[0xdfe6f2,16,36,[0,7,0]]);
  assert.ok(env.light[1]>=16&&env.light[3][1]>=6&&env.light[3][1]<=8,'fill must be elevated above the boss rather than washing the floor');
  assert.equal(env.exposure,.85);
  const center=DIMENSIONS.bishop3.center,spots=arenaSpots('bishop3'),[lx,ly,lz]=env.light[3];
  const distanceTo=(spot,y=1.7)=>Math.hypot(spot.x-center.x-lx,y-ly,spot.z-center.z-lz);
  const playerDistance=distanceTo(spots.player),bossDistance=distanceTo(spots.boss);
  assert.ok(playerDistance<12,'player spawn must stay in the near field of the existing fill');
  assert.ok(bossDistance<6,'boss spawn must remain inside the brighter core');
  assert.ok(bossDistance<playerDistance,'the boss keeps a modest geometric priority over the player');
  assert.ok(playerDistance/bossDistance>1.8&&playerDistance/bossDistance<2.1,'the fill must favor the boss without starving the player');
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
  assert.match(arenas,/zarkhael-dimension3d\.js\?v=a4-zarkhael-fill-4/,'standalone preview must not reuse the stale Mod 296 module URL');
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

test('A/B identifies the exact Zar’khael fill by world position and source parameters',()=>{
  const qa=readFileSync(new URL('./tools/visual-lab/bispo3-lighting-ab-qa.cjs',import.meta.url),'utf8');
  const budget=readFileSync(new URL('./light-budget3d.js',import.meta.url),'utf8');
  assert.match(qa,/const lighting=await page\.evaluate\(\(\)=>window\.SevenSinsDebug3D\.perfProbe\(1\)\)/);
  assert.match(qa,/lighting\.lights\?\.slots,4/);
  assert.match(qa,/lighting\.lights\?\.activeDetails\?\.find/);
  assert.match(qa,/Math\.abs\(source\.position\[0\]-1200\)/);
  assert.match(qa,/Math\.abs\(source\.distance-36\)/);
  assert.match(qa,/Math\.abs\(source\.intensity-16\)/);
  assert.match(qa,/fill\.slotIntensity>15/);
  assert.doesNotMatch(qa,/active\?\.includes\('luz'\)/);
  assert.match(budget,/activeDetails: selected\.map/);
});

test('light-budget telemetry reports the real selected source, world position and shader-slot intensity',()=>{
  class Obj {
    constructor(){this.children=[];this.parent=null;this.isObject3D=true;this.visible=true;this.matrixWorld={elements:new Array(16).fill(0)};this.matrixWorld.elements[15]=1;}
    add(...objects){for(const o of objects){if(o.parent){const i=o.parent.children.indexOf(o);if(i>=0)o.parent.children.splice(i,1);}this.children.push(o);o.parent=this;}return this;}
    remove(...objects){for(const o of objects){const i=this.children.indexOf(o);if(i>=0){this.children.splice(i,1);o.parent=null;}}return this;}
    traverse(fn){fn(this);for(const child of this.children)child.traverse(fn);}
    getWorldPosition(out){const e=this.matrixWorld.elements;out.x=e[12];out.y=e[13];out.z=e[14];return out;}
  }
  class Point extends Obj {
    constructor(){super();this.isPointLight=true;this.userData={};this.castShadow=false;this.layers={mask:1,set(i){this.mask=1<<i;}};
      this.position={setFromMatrixPosition(m){const e=m.elements;this.x=e[12];this.y=e[13];this.z=e[14];}};
      this.color={r:.745,g:.791,b:.888,copy(c){this.r=c.r;this.g=c.g;this.b=c.b;}};
      this.intensity=0;this.distance=0;this.decay=2;}
  }
  class Vec {
    constructor(){this.x=this.y=this.z=0;}
    setFromMatrixPosition(m){const e=m.elements;this.x=e[12];this.y=e[13];this.z=e[14];return this;}
    distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
  }
  const T={Object3D:Obj,PointLight:Point,Vector3:Vec},scene=new Obj(),fill=new Point();
  fill.name='zarkhael-dimension-fill';fill.intensity=16;fill.distance=36;fill.decay=2;
  fill.matrixWorld.elements[12]=1200;fill.matrixWorld.elements[13]=7;fill.matrixWorld.elements[14]=0;
  scene.add(fill);
  const budget=createLightBudget(T,scene,{slots:4,rescanEvery:1});
  const camera={getWorldPosition(out){out.x=1200;out.y=7;out.z=0;}};
  for(let i=0;i<60;i++)budget.update(camera,1/60);
  const details=budget.stats().activeDetails;
  assert.equal(details.length,1);
  assert.deepEqual(details[0].position,[1200,7,0]);
  assert.equal(details[0].name,'zarkhael-dimension-fill');
  assert.equal(details[0].intensity,16);
  assert.equal(details[0].distance,36);
  assert.ok(details[0].slotIntensity>15);
});

test('A/B harness freezes boss automation, waits for VS readiness and performs one trusted start click',()=>{
  const qa=readFileSync(new URL('./tools/visual-lab/bispo3-lighting-ab-qa.cjs',import.meta.url),'utf8');
  const apiReady=qa.indexOf('await page.waitForFunction(()=>window.SevenSinsDebug3D');
  const manualGate=qa.indexOf('window.__qaManualBossSkills=true;',apiReady);
  const waitStart=qa.indexOf('await page.waitForFunction(()=>{',apiReady);
  const preStart=qa.indexOf('const pre=await page.evaluate(()=>window.SevenSinsDebug3D.dimState());',waitStart);
  const readyStart=qa.indexOf("const button=document.querySelector('#vs-go');",preStart);
  const clickToken="await page.locator('#vs-go').click({timeout:15000});";
  const clickStart=qa.indexOf(clickToken,readyStart);
  const battleWait=qa.indexOf('await page.waitForFunction(()=>{',clickStart);
  assert.ok(apiReady>=0&&manualGate>apiReady&&manualGate<waitStart,'automatic boss skills must be disabled before the VS transition');
  assert.ok(waitStart>=0&&preStart>waitStart,'the harness must first observe the VS panel');
  assert.ok(readyStart>preStart&&clickStart>readyStart&&battleWait>clickStart,'the trusted click must happen once, only after the VS button is enabled');
  assert.ok(qa.includes('return !!button&&!button.disabled;'),'the start button must be enabled before the click');
  assert.equal(qa.split(clickToken).length-1,1,'exactly one real VS click is allowed');
  assert.equal(qa.includes('.vsGo('),false,'do not bypass the real start control with a synthetic debug call');
  assert.ok(qa.includes('window.__qaManualBossSkills=true;window.SevenSinsDebug3D.god()'),'comparison must suppress automatic boss skills and enable god mode before combat');
});

test('A/B restores the production camera after motionQA freezes the loop and accepts the dimLight pulse',()=>{
  const qa=readFileSync(new URL('./tools/visual-lab/bispo3-lighting-ab-qa.cjs',import.meta.url),'utf8');
  const placed=qa.indexOf("d.motionQA({x:1200,z:10,enemyDistance:12,sword:'prota'});");
  const resumed=qa.indexOf('d.realtime();',placed);
  const cameraWait=qa.indexOf('await page.waitForFunction(()=>{',resumed);
  const lightProbe=qa.indexOf('const lighting=await page.evaluate(()=>window.SevenSinsDebug3D.perfProbe(1));',cameraWait);
  assert.ok(placed>=0&&resumed>placed&&cameraWait>resumed&&lightProbe>cameraWait,
    'resume the real frame loop and let the production camera follow the actors before measuring light slots');
  assert.match(qa,/Math\.abs\(source\.intensity-16\)<=\.81/,
    'the production dimLight has a deliberate ±5% pulse, not a constant 16.00');
  assert.match(qa,/state\.hero\?\.visible/,'the candidate frame must retain the protagonist');
  assert.match(qa,/Math\.hypot\(state\.camera\[0\]-state\.game\.x,state\.camera\[2\]-state\.game\.z\)<12/,
    'the measured camera must be near the protagonist in the arena');
});

test('A/B rejects captures where either combatant is outside the camera viewport',()=>{
  const qa=readFileSync(new URL('./tools/visual-lab/bispo3-lighting-ab-qa.cjs',import.meta.url),'utf8');
  assert.match(qa,/hero:d\.camView\(\)/,'the production camera must project the protagonist');
  assert.match(qa,/boss:d\.projectBoss\(\)/,'the production target selector must project the boss');
  assert.match(qa,/assert\.equal\(actorFrame\.hero\?\.onScreen,true/);
  assert.match(qa,/actorFrame\.boss\[0\]>=0/);
  assert.match(qa,/actorFrame\.boss\[1\]>=0/);
  assert.match(qa,/actorFrame,screenshot:path\.basename\(screenshot\)/,'the report must retain the frame projection');
});

test('A/B validates the original main fill separately from the new Zar’khael candidate fill',()=>{
  const qa=readFileSync(new URL('./tools/visual-lab/bispo3-lighting-ab-qa.cjs',import.meta.url),'utf8');
  assert.match(qa,/function expectedFillFor\(label\)/);
  assert.match(qa,/label === '01-main'[\s\S]*?position:\[1200,18,4\], intensity:3\.5, distance:110/);
  assert.match(qa,/position:\[1200,7,0\], intensity:16, distance:36/);
  assert.match(qa,/expectedFill\.position\[1\]/,'world height must distinguish the original high fill from the lower candidate fill');
  assert.match(qa,/expectedFill\.intensity\*\.051/,'both production breathing pulses need the same relative tolerance');
  assert.match(qa,/expectedFill\.minSlotIntensity/,'each side must prove its own light reaches the shader slot');
  assert.match(qa,/lightingCheck=\{expected:expectedFill,observed:/,'the A/B report must retain the expected and observed source');
  assert.match(qa,/actorFrame,lightingCheck,screenshot:/);
});


test('A/B rejects a camera that is horizontally near but vertically far from the protagonist',()=>{
  const qa=readFileSync(new URL('./tools/visual-lab/bispo3-lighting-ab-qa.cjs',import.meta.url),'utf8');
  assert.ok(qa.includes('Math.hypot(c[0]-s.x,c[1]-s.y,c[2]-s.z)<14'),
    'camera follow must be measured in 3D, not only on the ground plane');
  assert.ok(qa.includes('actorFrame.hero?.camToHero<=14'),
    'the production camera-to-hero distance must reject tiny distant actors');
  assert.ok(qa.includes('Math.hypot(state.camera[0]-state.game.x,state.camera[1]-state.game.y,state.camera[2]-state.game.z)<14'));
});
