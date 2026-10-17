/* MOD 126 — lua monstruosa, dentes marfim, árvores sugadas e câmera normal no arremesso. */
(function(){
'use strict';
let api=null,group=null,ready=false,last=0,activeId='',startAt=0,overlay=null;
let reaper=null,arm=null,scythe=null,swords=[],lane=null,moon=null,moonCore=null,hole=null,ring=null,blast=null,trees=[],grass=[],debris=[],rays=[],cameraStartEye=null,cameraStartTarget=null,cameraStartFov=1.02,swordAimX=0,swordAimZ=-1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mat(T,color,opacity=1,add=false){return new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,blending:add?T.AdditiveBlending:T.NormalBlending});}
function build(){
 if(!api||!api.THREE||!api.scene||ready)return;
 const T=api.THREE,black=new T.MeshStandardMaterial({color:0x010104,roughness:.48,metalness:.18,emissive:0x120006,emissiveIntensity:.35}),blackRed=new T.MeshStandardMaterial({color:0x160008,roughness:.38,metalness:.25,emissive:0x520014,emissiveIntensity:.72}),red=mat(T,0xff102f,.96,true),hotRed=mat(T,0xff243d,.9,true);
 group=new T.Group();group.name='BishopAdvancedDarkMagic_Mod127';api.scene.add(group);
 reaper=new T.Group();group.add(reaper);
 const robe=new T.Mesh(new T.ConeGeometry(.43,1.55,7),black);robe.position.y=1.02;reaper.add(robe);
 const hem=new T.Mesh(new T.TorusGeometry(.36,.035,5,16),mat(T,0xff1744,.85,true));hem.rotation.x=Math.PI/2;hem.position.y=.32;reaper.add(hem);
 const hood=new T.Mesh(new T.SphereGeometry(.29,10,8),blackRed);hood.position.set(0,1.83,.02);hood.scale.set(.88,1.05,.78);reaper.add(hood);
 const face=new T.Mesh(new T.SphereGeometry(.17,8,7),new T.MeshBasicMaterial({color:0x010105}));face.position.set(0,1.83,.19);reaper.add(face);
 [-.085,.085].forEach(x=>{const eye=new T.Mesh(new T.SphereGeometry(.035,6,5),red);eye.position.set(x,1.87,.34);reaper.add(eye);});
 arm=new T.Group();arm.position.set(.3,1.45,.02);reaper.add(arm);
 const upper=new T.Mesh(new T.CylinderGeometry(.085,.11,.62,6),blackRed);upper.position.y=-.2;upper.rotation.z=-.24;arm.add(upper);
 const hand=new T.Mesh(new T.SphereGeometry(.09,7,6),black);hand.position.set(.12,-.48,.02);arm.add(hand);
 scythe=new T.Group();scythe.position.set(.16,-.62,.03);scythe.rotation.z=-.18;arm.add(scythe);
 const shaft=new T.Mesh(new T.CylinderGeometry(.026,.04,1.62,7),blackRed);shaft.position.y=-.62;scythe.add(shaft);
 const grip=new T.Mesh(new T.CylinderGeometry(.045,.045,.28,6),mat(T,0xff123f,.95,true));grip.position.y=-.83;scythe.add(grip);
 const blade=new T.Mesh(new T.TorusGeometry(.38,.065,6,20,Math.PI*.72),blackRed);blade.position.set(.2,.2,.02);blade.rotation.z=.72;scythe.add(blade);
 const edge=new T.Mesh(new T.TorusGeometry(.35,.025,5,20,Math.PI*.72),mat(T,0xff4268,.95,true));edge.position.set(.2,.2,.055);edge.rotation.z=.72;scythe.add(edge);
 const tip=new T.Mesh(new T.ConeGeometry(.075,.36,5),mat(T,0xff1837,.95,true));tip.position.set(.51,.44,.035);tip.rotation.z=-.84;scythe.add(tip);
 lane=new T.Mesh(new T.PlaneGeometry(1,1),mat(T,0x260006,.12,false));lane.rotation.x=-Math.PI/2;group.add(lane);
 for(let i=0;i<15;i++){const g=new T.Group();g.add(new T.Mesh(new T.BoxGeometry(.055,.72,.028),blackRed));const point=new T.Mesh(new T.ConeGeometry(.042,.22,4),new T.MeshBasicMaterial({color:0x5b0010}));point.position.y=.46;g.add(point);const edge2=new T.Mesh(new T.BoxGeometry(.012,.58,.032),new T.MeshBasicMaterial({color:0x5b0010}));edge2.position.set(.018,.015,.018);g.add(edge2);const core=new T.Mesh(new T.BoxGeometry(.008,.45,.034),new T.MeshBasicMaterial({color:0x260006}));core.position.set(-.01,.015,.019);g.add(core);const grip=new T.Mesh(new T.CylinderGeometry(.018,.022,.16,5),black);grip.position.y=-.43;g.add(grip);const trail=new T.Mesh(new T.BoxGeometry(.045,.72,.009),new T.MeshBasicMaterial({color:0x350008,transparent:true,opacity:.22,depthWrite:false}));trail.position.set(0,-.43,-.012);g.add(trail);group.add(g);swords.push({mesh:g,lane:((i%5)-2)*.34,start:.12+Math.floor(i/5)*.18,baseY:1.45+(i%3)*.12,phase:i*.31});}
 const eclipse=new T.Group();eclipse.name='Eclipse sequence';group.add(eclipse);
 moon=new T.Group();moon.name='Lua monstruosa estilo Fire Force';moon.position.set(0,18.1,-18.5);moon.scale.set(1.14,.70,.68);eclipse.add(moon);
 moonCore=new T.Mesh(new T.SphereGeometry(4.45,28,20),new T.MeshBasicMaterial({color:0xbdbbb5}));moon.add(moonCore);
 for(let i=0;i<18;i++){const a=i*Math.PI*2/18,spike=new T.Mesh(new T.ConeGeometry(.42+(i%3)*.1,1.0+(i%4)*.22,3),new T.MeshStandardMaterial({color:i%3===0?0x5b0712:0x8e101b,roughness:1,emissive:0x250006,emissiveIntensity:.18}));spike.position.set(Math.cos(a)*4.28,Math.sin(a)*4.28,0);spike.rotation.z=-a+Math.PI/2;moon.add(spike);}
 const faceVoid=new T.MeshBasicMaterial({color:0x010104});
 for(const side of [-1,1]){const eye=new T.Mesh(new T.ConeGeometry(.62,1.55,3),faceVoid);eye.position.set(side*1.22,.9,4.82);eye.scale.set(1.05,1.18,1);eye.rotation.z=side*.18;eye.rotation.x=.12;moon.add(eye);const brow=new T.Mesh(new T.BoxGeometry(1.3,.2,.14),new T.MeshBasicMaterial({color:0x260006}));brow.position.set(side*1.18,1.82,4.76);brow.rotation.z=side*.22;moon.add(brow);}
 const grinShape=new T.Shape();grinShape.moveTo(-2.45,-.45);grinShape.quadraticCurveTo(0,-2.65,2.45,-.45);grinShape.quadraticCurveTo(0,-1.2,-2.45,-.45);
 const grin=new T.Mesh(new T.ShapeGeometry(grinShape,24),new T.MeshBasicMaterial({color:0x120006,side:T.DoubleSide}));grin.position.set(0,-.42,4.84);moon.add(grin);
 for(let i=0;i<11;i++){const tooth=new T.Mesh(new T.ConeGeometry(.17,.66+(i%3)*.13,3),new T.MeshBasicMaterial({color:0xfff8e8}));tooth.position.set(-2.0+i*.4,-.77+(i%2)*.12,4.91);tooth.rotation.z=Math.PI;moon.add(tooth);}
 for(let i=0;i<9;i++){const tooth=new T.Mesh(new T.ConeGeometry(.15,.5+(i%3)*.1,3),new T.MeshBasicMaterial({color:0xfff8e8}));tooth.position.set(-1.8+i*.45,-1.48+(i%2)*.1,4.91);tooth.rotation.z=0;moon.add(tooth);}
 // Sem halo circular: a expressão é formada por olhos triangulares e sorriso monstruoso.
 hole=new T.Mesh(new T.SphereGeometry(1,24,18),new T.MeshBasicMaterial({color:0x000000,depthWrite:false}));hole.position.set(0,8.3,-6.3);eclipse.add(hole);
 ring=new T.Mesh(new T.TorusGeometry(1.4,.09,7,48),red);ring.position.copy(hole.position);ring.scale.set(1,.72,.3);eclipse.add(ring);
 blast=new T.Mesh(new T.TorusGeometry(1.1,.12,6,32),mat(T,0x9d001d,0,true));blast.position.set(0,1,0);eclipse.add(blast);
 for(let i=0;i<18;i++){const ray=new T.Mesh(new T.CylinderGeometry(.018,.09,7.2,5),mat(T,i%2?0xff102f:0x5a0014,0,true));ray.position.set(Math.cos(i*Math.PI/9)*2.9,8.6,Math.sin(i*Math.PI/9)*2.9-6.3);ray.rotation.z=i%2?-.3:.3;eclipse.add(ray);rays.push(ray);}
 // Árvores secas de tamanho real, raízes, galhos e vegetação: tudo é puxado fisicamente para o vórtice.
 for(let i=0;i<17;i++){const tree=new T.Group();const trunkH=4.2+(i%4)*.65;const trunk=new T.Mesh(new T.CylinderGeometry(.14,.32,trunkH,6),new T.MeshStandardMaterial({color:0x130b0c,roughness:1,emissive:0x250007,emissiveIntensity:.35}));trunk.position.y=trunkH*.5;tree.add(trunk);for(let j=0;j<7;j++){const branch=new T.Mesh(new T.CylinderGeometry(.04,.12,1.7+(j%3)*.36,5),new T.MeshStandardMaterial({color:0x1c080c,roughness:1,emissive:0x42000b,emissiveIntensity:.42}));branch.position.set((j%2?1:-1)*(.32+(j%3)*.19),trunkH*.28+j*.38,.02);branch.rotation.z=(j%2?-.78:.78);tree.add(branch);}for(let j=0;j<4;j++){const rootBit=new T.Mesh(new T.CylinderGeometry(.025,.12,1.05,5),blackRed);rootBit.position.set((j-1.5)*.22,.17,.04);rootBit.rotation.z=(j-1.5)*-.48;tree.add(rootBit);}tree.position.set((i-8)*1.22+Math.sin(i*2.4)*.35,-.02,-1.4-(i%5)*1.55);eclipse.add(tree);trees.push({mesh:tree,phase:i*.31,base:tree.position.clone()});}
 for(let i=0;i<42;i++){const tuft=new T.Group();for(let j=0;j<5;j++){const blade=new T.Mesh(new T.ConeGeometry(.055,.48+(j%3)*.13,4),blackRed);blade.position.set((j-2)*.075,.18+(j%3)*.04,((j%2)-.5)*.08);blade.rotation.z=(j-2)*-.16;tuft.add(blade);}tuft.position.set(Math.cos(i*2.399)*(5.5+(i%7)*1.1),0,Math.sin(i*2.399)*(5.5+(i%7)*1.1));eclipse.add(tuft);grass.push({mesh:tuft,phase:i*.27,base:tuft.position.clone()});}
 for(let i=0;i<24;i++){const frag=new T.Mesh(new T.DodecahedronGeometry(.10+(i%4)*.045,0),i%3?black:blackRed);frag.position.set((i-12)*.9,.12+(i%4)*.13,-3-(i%6)*2.1);eclipse.add(frag);debris.push({mesh:frag,phase:i*.17,base:frag.position.clone()});}
 group.userData.eclipse=eclipse;group.visible=false;ready=true;
}
function hide(){if(group)group.visible=false;if(overlay)overlay.style.opacity='0';window.CelestialEclipseLock=false;window.CelestialUltimateCamera={active:false};activeId='';startAt=0;}
function tick(now){
 requestAnimationFrame(tick);const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
 api=window.ValerioThreeAPI||api;if(!ready&&api){try{build();}catch(e){return;}}
 const view=window.ValerioModelView;
 if(!ready||!view||!view.active||!['blackSwordRain','abyssEclipse'].includes(view.attackId)||!['windup','attack','recover'].includes(view.combatState)){hide();return;}
 const id=view.attackId,state=view.combatState;if(state==='recover'){hide();return;}
 const target=Array.isArray(view.skillTargetPosition)?view.skillTargetPosition:(Array.isArray(view.playerPosition)?view.playerPosition:[0,0,0]),boss=Array.isArray(view.position)?view.position:target;
 const dx=target[0]-boss[0],dz=target[2]-boss[2],len=Math.max(.01,Math.hypot(dx,dz)),ux=dx/len,uz=dz/len,px=-uz,pz=ux;
 group.position.set(boss[0],boss[1]||0,boss[2]);group.visible=true;
 if(id!==activeId){activeId=id;startAt=now;if(id==='abyssEclipse'){window.CelestialEclipseLock=true;cameraStartEye=Array.isArray(view.eye)?view.eye.slice():[0,2.2,9];cameraStartTarget=Array.isArray(view.target)?view.target.slice():[0,1.6,0];cameraStartFov=Number(view.fov)||1.02;}if(id==='blackSwordRain'){swordAimX=ux;swordAimZ=uz;}const book=window.BishopGrimoire3D||window.ValerioGrimoire3D;if(book&&book.ready&&typeof book.invoke==='function')book.invoke(((Number(view.windupDuration)||1.5)+(Number(view.attackDuration)||1)+1.2)*1000);}
 reaper.visible=false;lane.visible=id==='blackSwordRain';swords.forEach(s=>s.mesh.visible=id==='blackSwordRain');group.userData.eclipse.visible=id==='abyssEclipse';
 if(id==='blackReaper'){const progress=state==='windup'?0:clamp((Number(view.stateTime)||0)/Math.max(.1,Number(view.hitAt)||.62),0,1);reaper.position.set(ux*(1+(len-1)*progress),0,uz*(1+(len-1)*progress));reaper.rotation.y=Math.atan2(ux,uz);const swing=state==='attack'?clamp(((Number(view.stateTime)||0)-.25)/.55,0,1):0;arm.rotation.z=state==='windup'?.12:-.18-swing*1.08;scythe.rotation.z=-.18+swing*1.7;}
 else if(id==='blackSwordRain'){const desiredLen=Math.max(.01,len),blendAim=state==='attack'?.055:.018;swordAimX+=(ux-swordAimX)*blendAim;swordAimZ+=(uz-swordAimZ)*blendAim;const aimLen=Math.max(.001,Math.hypot(swordAimX,swordAimZ));const ax=swordAimX/aimLen,az=swordAimZ/aimLen,apx=-az,apz=ax;lane.material.opacity=state==='windup'?.16:.012;lane.position.set(ax*desiredLen*.5,.045,az*desiredLen*.5);lane.rotation.set(-Math.PI/2,0,-Math.atan2(az,ax));lane.scale.set(1.8,Math.max(1,desiredLen),1);const progress=state==='attack'?clamp((Number(view.stateTime)||0)/Math.max(.1,Number(view.hitAt)||.72),0,1):0;swords.forEach(s=>{const startD=.8+s.start*.24,travelD=Math.max(0,desiredLen-startD)*progress,spread=s.lane*(.48+progress*.12);s.mesh.position.set(ax*(startD+travelD)+apx*spread,s.baseY+.025*Math.sin(now*.009+s.phase),az*(startD+travelD)+apz*spread);s.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(ax,.06,az).normalize());s.mesh.visible=state!=='attack'||progress<.995;s.mesh.scale.setScalar(1+.018*Math.sin(now*.012+s.phase));});}
 else{
  const elapsed=Math.max(0,(now-startAt)/1000),charge=clamp(elapsed/2.5,0,1),grow=clamp((elapsed-2.4)/3.8,0,1),launch=clamp((elapsed-7.05)/1.25,0,1);
  // MOD 126: lua afastada do vórtice; árvores sobem e giram visivelmente, câmera volta antes do arremesso.
  if(id==='abyssEclipse'){
    const normalEye=cameraStartEye||[boss[0],2.2,boss[2]+9];
    const normalTarget=cameraStartTarget||[boss[0],1.6,boss[2]];
    const bossPos=Array.isArray(view.position)?view.position:boss;
    const skyEye=[bossPos[0],(bossPos[1]||0)+14.0,(bossPos[2]||0)+24.0];
    const skyTarget=[bossPos[0],(bossPos[1]||0)+8.0,(bossPos[2]||0)-7.0];
    const rise=clamp(elapsed/1.7,0,1),smoothRise=rise*rise*(3-2*rise);
    const returning=clamp((elapsed-6.22)/.83,0,1),smoothReturn=returning*returning*(3-2*returning);
    const blend=smoothRise*(1-smoothReturn);
    const eye=normalEye.map((v,i)=>v+(skyEye[i]-v)*blend);
    const targetCam=normalTarget.map((v,i)=>v+(skyTarget[i]-v)*blend);
    window.CelestialUltimateCamera={active:elapsed<7.05,eye:eye,target:targetCam,fov:(Number(cameraStartFov)||1.02)+.25*blend};
    window.CelestialEclipseLock=elapsed<7.05;
  }
  if(!overlay){overlay=document.createElement('div');overlay.setAttribute('aria-hidden','true');overlay.style.cssText='position:fixed;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity .18s linear;background:radial-gradient(ellipse at 50% 14%,rgba(180,0,24,.18),rgba(65,0,12,.14) 42%,rgba(3,0,8,.34) 100%);mix-blend-mode:multiply;';document.body.appendChild(overlay);}
  overlay.style.opacity=String(clamp((elapsed-.7)*.065,0,.18));moon.visible=elapsed>1.0&&elapsed<10.0;moon.scale.set(1.14*(.035+charge*.97),.70*(.035+charge*.97),.68*(.035+charge*.97));moonCore.material.emissiveIntensity=.06+charge*.08;
  ring.material.opacity=.3+grow*.68;ring.scale.set(1.0+grow*2.2,.72+grow*1.15,.3);hole.visible=elapsed>2.0;hole.position.set(0,8.3-grow*.35,-6.3);hole.scale.setScalar(.08+grow*2.25);
  rays.forEach((ray,i)=>{ray.material.opacity=elapsed>1.0&&elapsed<7.1?(.2+.7*Math.abs(Math.sin(now*.006+i)))*charge:0;ray.scale.y=.45+charge*2.1;ray.rotation.y=now*.00035+i*.7;});
  trees.forEach(tree=>{const p=clamp((elapsed-1.75-tree.phase*.012)/3.6,0,1);tree.mesh.visible=elapsed>1.75&&elapsed<7.05;const tx=0,tz=-6.3;tree.mesh.position.set(tree.base.x*(1-p)+tx*p+Math.sin(now*.002+tree.phase)*.1,tree.base.y+p*5.8,tree.base.z*(1-p)+tz*p+Math.cos(now*.002+tree.phase)*.1);tree.mesh.rotation.z=Math.sin(now*.003+tree.phase)*(.08+p*1.15);tree.mesh.rotation.x=p*1.3;tree.mesh.rotation.y=p*.9;tree.mesh.scale.setScalar(1-p*.48);});
  grass.forEach(tuft=>{const p=clamp((elapsed-1.55-tuft.phase*.012)/2.9,0,1);tuft.mesh.visible=elapsed>1.55&&elapsed<6.85;tuft.mesh.position.set(tuft.base.x*(1-p),tuft.base.y+p*2.8,tuft.base.z*(1-p)-6.3*p);tuft.mesh.rotation.z=Math.sin(now*.004+tuft.phase)*(.1+p*.8);tuft.mesh.rotation.x=p*.9;tuft.mesh.scale.setScalar(1-p*.8);});
  debris.forEach(fragment=>{const p=clamp((elapsed-2.0-fragment.phase*.009)/2.8,0,1);fragment.mesh.visible=elapsed>2.0&&elapsed<6.85;fragment.mesh.position.set(fragment.base.x*(1-p),fragment.base.y+p*4.8,fragment.base.z*(1-p)-6.3*p);fragment.mesh.rotation.set(now*.001+fragment.phase,now*.0015+fragment.phase,now*.001+fragment.phase);fragment.mesh.scale.setScalar(1-p*.65);});
  if(elapsed>7.05){const y=8.3*(1-launch)+1.35*launch;hole.position.set(ux*len*launch,y,-6.3*(1-launch)+uz*len*launch);ring.position.copy(hole.position);ring.scale.setScalar(1.3+launch*1.5);blast.position.copy(hole.position);blast.scale.setScalar(.2+launch*5.5);blast.material.opacity=launch>.78?clamp((launch-.78)*4.5,0,.98):.025;hole.scale.setScalar(2.1+launch*.55);}
  else{ring.position.copy(hole.position);blast.material.opacity=0;}
  if(elapsed>8.3){hole.scale.setScalar(Math.max(.01,2.6-(elapsed-8.3)*5));blast.material.opacity=Math.max(0,.98-(elapsed-8.3)*2.3);}
 }
}
function start(){requestAnimationFrame(tick);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();