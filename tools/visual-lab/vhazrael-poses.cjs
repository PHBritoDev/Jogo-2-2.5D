// Read-only pose instruments and explicit action fixtures are injected into this
// browser context only. The shipping game does not expose a new debug entry.
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const dir='docs/qa/vhazrael-duelo';
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
 const page=await browser.newPage({viewport:{width:900,height:480}});
 await page.route('**/mundo-3d-prototype.js*',async route=>{
  const r=await route.fetch();
  await route.fulfill({response:r,body:await r.text()+`
  window.duelFixture=(id,side,elevation)=>{
    const sq=squadSq(), a=sq.actors.find(v=>v.kind==='vhazrael'), b=squadRT.body(a.id),t=sq.targets.find(v=>v.id==='hero');
    if(id){
      a.x=a.home.x;a.z=a.home.z;a.y=terrainHeightAt(a.x,a.z);a.yaw=0;a.airY=a.airV=a.vx=a.vz=0;
      a.act=a.react=null;a.alert=999;a.decideT=999;a.targetId=t.id;
      player.position.set(a.x+Math.sin(side)*1.45,a.y+elevation,a.z+Math.cos(side)*1.45);
      Object.assign(t,{x:player.position.x,y:player.position.y,z:player.position.z});sq.startMelee(a,t,id);
      return a.act.move.hits[0]/a.act.move.rate;
    }
    const v=SevenSinsDebug3D.vzBladeClearance();
    const trace=b.cur.getClip().combatTrace,act=a.act;
    if(!act?.move || !trace)return {missing:true};
    const phase=Math.min(1,act.t/trace.duration)*(trace.frames.length-1),lo=Math.floor(phase),hi=Math.ceil(phase);
    const expected=trace.frames[lo][0].map((p,k)=>new THREE.Vector3(...p).lerp(new THREE.Vector3(...trace.frames[hi][0][k]),phase-lo).applyAxisAngle(new THREE.Vector3(0,1,0),a.yaw).add(new THREE.Vector3(a.x,a.y,a.z)));
    return {clip:b.cur.getClip().name,clock:b.cur.time,rate:act.move.rate,mixerRate:b.cur.getEffectiveTimeScale(),phase:act.phase,hand:b.hand.getWorldPosition(new THREE.Vector3()).toArray(),weaponQuaternion:b.weaponRoot.quaternion.toArray(),...v,contact:[...act.contacts],error:expected.map((p,k)=>p.distanceTo(new THREE.Vector3(...[v.base,v.tip][k]))),calls:renderer.info.render.calls,heap:performance.memory?.usedJSHeapSize};
  };`});
 });
 await page.goto('http://localhost:4219/mundo-3d-prototype.html?testeDimensao=bishop1&debug3d=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const api=window.SevenSinsDebug3D;if(api?.dimState().vs)api.vsGo();return window.duelFixture && api?.dimState().battle?.active&&api.vzStats()?.alive},null,{timeout:180000});
 const ids=['Trono_Duplo','Trono_Queda','Trono_Moinho','Trono_Riposta','Trono_Triplo','Trono_Danca','Trono_Estocada'],rows=[];
 for(const id of ids)for(const fps of [30,45,60])for(const side of [0,Math.PI/2,Math.PI]){
  const r=await page.evaluate(({id,fps,side})=>{
   const api=SevenSinsDebug3D;api.freeze(true);api.heroHeal();
   const until=duelFixture(id,side,0);api.squadCam([Math.sin(side)*4,1.6,Math.cos(side)*4,0,1.1,0]);
   api.combatStep(until,{fps,draw:true});
   const sample=duelFixture();
   const photo=fps===45?document.querySelector('#scene').toDataURL('image/jpeg',.8).split(',')[1]:null;
   return {sample,photo};
  },{id,fps,side});
  assert.ok(!r.sample.missing,id);if(r.photo)fs.writeFileSync(dir+'/'+id+'-'+Math.round(side*180/Math.PI)+'.jpg',Buffer.from(r.photo,'base64'));
  rows.push({id,fps,side,...r.sample});
 }
 fs.writeFileSync(dir+'/poses.json',JSON.stringify(rows));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
