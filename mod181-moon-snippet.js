/* MOD 181 — Lua 3D + ciclo dia/noite + expansão controlada do horizonte. */
const moonPosition=new THREE.Vector3(42,72,95);
let moonRoot=null,moonVisible=false;
new GLTFLoader().load('./Lua.glb?v=mod181-moon',gltf=>{
 const moon=gltf.scene;
 moon.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;if(o.material){o.material.toneMapped=false;o.material.emissive=o.material.emissive||new THREE.Color(0x223344);}}});
 const bounds=new THREE.Box3().setFromObject(moon),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const target=7.5,scale=size.y>.001?target/size.y:1;
 moon.scale.setScalar(scale);moon.position.set(-center.x*scale,-center.y*scale,-center.z*scale);
 moonRoot=new THREE.Group();moonRoot.position.copy(moonPosition);moonRoot.add(moon);moonRoot.visible=false;scene.add(moonRoot);moonVisible=true;
},undefined,err=>console.warn('Lua.glb não carregou; mantendo céu sem modelo 3D.',err));

const dayNightState={mode:'day',t:0,target:0};
const villageTorchLights=[];
const dayPreset={bg:0xb8d4d7,fog:0xa9c4c2,fogNear:58,fogFar:205,hemiSky:0xeaf7ff,hemiGround:0x59684b,hemiInt:1.55,sunInt:2.1,fillInt:.48,exposure:1.02,sunDiskVis:true,moonVis:false,torchInt:.35};
const nightPreset={bg:0x0b1420,fog:0x0e1a24,fogNear:28,fogFar:145,hemiSky:0x1a2a3c,hemiGround:0x1a2218,hemiInt:.42,sunInt:.08,fillInt:.12,exposure:.88,sunDiskVis:false,moonVis:true,torchInt:1.55};
function lerpColorHex(a,b,t){const ca=new THREE.Color(a),cb=new THREE.Color(b);return ca.lerp(cb,t);}
function applyDayNightVisual(t){
 const p=t;
 scene.background.copy(lerpColorHex(dayPreset.bg,nightPreset.bg,p));
 scene.fog.color.copy(lerpColorHex(dayPreset.fog,nightPreset.fog,p));
 scene.fog.near=THREE.MathUtils.lerp(dayPreset.fogNear,nightPreset.fogNear,p);
 scene.fog.far=THREE.MathUtils.lerp(dayPreset.fogFar,nightPreset.fogFar,p);
 hemiLight.color.copy(lerpColorHex(dayPreset.hemiSky,nightPreset.hemiSky,p));
 hemiLight.groundColor.copy(lerpColorHex(dayPreset.hemiGround,nightPreset.hemiGround,p));
 hemiLight.intensity=THREE.MathUtils.lerp(dayPreset.hemiInt,nightPreset.hemiInt,p);
 sunLight.intensity=THREE.MathUtils.lerp(dayPreset.sunInt,nightPreset.sunInt,p);
 fill.intensity=THREE.MathUtils.lerp(dayPreset.fillInt,nightPreset.fillInt,p);
 renderer.toneMappingExposure=THREE.MathUtils.lerp(dayPreset.exposure,nightPreset.exposure,p);
 if(sunDisk)sunDisk.visible=p<.55;
 if(sunHalo)sunHalo.visible=p<.55;
 if(moonRoot)moonRoot.visible=p>.35;
 for(const light of villageTorchLights)light.intensity=THREE.MathUtils.lerp(dayPreset.torchInt,nightPreset.torchInt,p);
 // Gradiente do céu diurno → noturno
 if(skyDome&&skyDome.geometry&&skyDome.geometry.attributes.color){
  const cols=skyDome.geometry.attributes.color,pos=skyDome.geometry.attributes.position;
  const dayH=new THREE.Color(0xc4dbd4),dayZ=new THREE.Color(0x559dcc);
  const nightH=new THREE.Color(0x121a28),nightZ=new THREE.Color(0x0a1020);
  for(let i=0;i<pos.count;i++){
   const y=pos.getY(i)/220;let u=THREE.MathUtils.clamp((y+.12)/.94,0,1);u=u*u*(3-2*u);
   const d=dayH.clone().lerp(dayZ,u),n=nightH.clone().lerp(nightZ,u),c=d.lerp(n,p);
   cols.setXYZ(i,c.r,c.g,c.b);
  }
  cols.needsUpdate=true;
 }
}
function setDayNightMode(mode){
 dayNightState.mode=mode==='night'?'night':'day';
 dayNightState.target=dayNightState.mode==='night'?1:0;
 try{localStorage.setItem('seven-sins-3d-daynight',dayNightState.mode);}catch(e){}
 const btn=document.getElementById('daynight-toggle-3d');
 if(btn){btn.textContent=dayNightState.mode==='night'?'NOITE':'DIA';btn.setAttribute('aria-pressed',String(dayNightState.mode==='night'));}
}
function updateDayNight(dt){
 const speed=1.35;
 if(Math.abs(dayNightState.t-dayNightState.target)<.002){dayNightState.t=dayNightState.target;applyDayNightVisual(dayNightState.t);return;}
 dayNightState.t=THREE.MathUtils.lerp(dayNightState.t,dayNightState.target,1-Math.exp(-speed*dt));
 applyDayNightVisual(dayNightState.t);
}
(function initDayNightUI(){
 let saved='day';try{const v=localStorage.getItem('seven-sins-3d-daynight');if(v==='night'||v==='day')saved=v;}catch(e){}
 const btn=document.getElementById('daynight-toggle-3d');
 if(btn)btn.addEventListener('click',()=>setDayNightMode(dayNightState.mode==='night'?'day':'night'));
 setDayNightMode(saved);
 if(saved==='night'){dayNightState.t=1;applyDayNightVisual(1);}
})();

