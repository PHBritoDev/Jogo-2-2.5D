/* MOD 125 — lâminas compactas teleguiadas e Eclipse escarlate cinematográfico. */
(function(){
'use strict';
let api=null,group=null,ready=false,last=0,activeId='',startAt=0,overlay=null;
let reaper=null,arm=null,scythe=null,swords=[],lane=null,moon=null,moonCore=null,hole=null,ring=null,blast=null,trees=[],grass=[],debris=[],rays=[],cameraStartEye=null,cameraStartTarget=null,cameraStartFov=1.02,swordAimX=0,swordAimZ=-1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mat(T,color,opacity=1,add=false){return new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,blending:add?T.AdditiveBlending:T.NormalBlending});}
function build(){
 if(!api||!api.THREE||!api.scene||ready)return;
 const T=api.THREE,black=new T.MeshStandardMaterial({color:0x010104,roughness:.48,metalness:.18,emissive:0x120006,emissiveIntensity:.35}),blackRed=new T.MeshStandardMaterial({color:0x160008,roughness:.38,metalness:.25,emissive:0x520014,emissiveIntensity:.72}),red=mat(T,0xff102f,.96,true),hotRed=mat(T,0xff243d,.9,true);
 group=new T.Group();group.name='BishopAdvancedDarkMagic_Mod122';api.scene.add(group);
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
 lane=new T.Mesh(new T.PlaneGeometry(1,1),mat(T,0xff123f,.28,true));lane.rotation.x=-Math.PI/2;group.add(lane);
 for(let i=0;i<35;i++){const g=new T.Group();g.add(new T.Mesh(new T.BoxGeometry(.065,.92,.045),blackRed));const point=new T.Mesh(new T.ConeGeometry(.048,.24,4),black);point.position.y=-.55;g.add(point);const edge2=new T.Mesh(new T.BoxGeometry(.018,.78,.05),red);edge2.position.set(.026,.025,.028);g.add(edge2);const core=new T.Mesh(new T.BoxGeometry(.012,.62,.052),hotRed);core.position.set(-.012,.025,.03);g.add(core);const trail=new T.Mesh(new T.BoxGeometry(.075,1.25,.012),mat(T,0xff102f,.34,true));trail.position.set(0,.36,-.018);g.add(trail);group.add(g);swords.push({mesh:g,lane:((i%7)-3)*.22,start:.12+Math.floor(i/7)*.12,baseY:1.4+(i%4)*.17,phase:i*.31});}
 const eclipse=new T.Group();eclipse.name='Eclipse sequence';group.add(eclipse);
 moon=new T.Group();moon.name='Lua demoníaca escarlate';moon.position.set(0,15.2,-13.2);eclipse.add(moon);
 moonCore=new T.Mesh(new T.SphereGeometry(4.25,32,24),new T.MeshStandardMaterial({color:0x230007,roughness:.92,emissive:0x6f0016,emissiveIntensity:.8}));moon.add(moonCore);
 const faceVoid=new T.MeshBasicMaterial({color:0x010104});
 for(const side of [-1,1]){const eye=new T.Mesh(new T.ConeGeometry(.62,1.55,3),faceVoid);eye.position.set(side*1.22,.9,3.82);eye.rotation.z=side*.18;eye.rotation.x=.12;moon.add(eye);const brow=new T.Mesh(new T.BoxGeometry(1.15,.16,.12),blackRed);brow.position.set(side*1.18,1.82,3.78);brow.rotation.z=side*.22;moon.add(brow);}
 const grinShape=new T.Shape();grinShape.moveTo(-2.45,-.45);grinShape.quadraticCurveTo(0,-2.65,2.45,-.45);grinShape.quadraticCurveTo(0,-1.2,-2.45,-.45);
 const grin=new T.Mesh(new T.ShapeGeometry(grinShape,24),faceVoid);grin.position.set(0,-.42,3.83);moon.add(grin);
 for(let i=0;i<9;i++){const tooth=new T.Mesh(new T.ConeGeometry(.18,.58,3),hotRed);tooth.position.set(-1.8+i*.45,-1.0+(i%2)*.12,3.91);tooth.rotation.z=Math.PI;moon.add(tooth);}
 const mouthScar=new T.Mesh(new T.TorusGeometry(1.95,.075,5,32,Math.PI*1.2),red);mouthScar.position.set(0,-.8,3.86);mouthScar.rotation.z=Math.PI;moon.add(mouthScar);
 const scar=new T.Mesh(new T.TorusGeometry(4.5,.075,5,48),red);scar.position.set(0,0,-.02);scar.scale.set(1,1,.18);moon.add(scar);
 hole=new T.Mesh(new T.SphereGeometry(1,24,18),new T.MeshBasicMaterial({color:0x000000,depthWrite:false}));hole.position.set(0,8.3,-6.3);eclipse.add(hole);
 ring=new T.Mesh(new T.TorusGeometry(1.4,.09,7,48),red);ring.position.copy(hole.position);ring.scale.set(1,.72,.3);eclipse.add(ring);
 blast=new T.Mesh(new T.TorusGeometry(1.1,.12,6,32),mat(T,0x9d001d,0,true));blast.position.set(0,1,0);eclipse.add(blast);
 for(let i=0;i<18;i++){const ray=new T.Mesh(new T.CylinderGeometry(.018,.09,7.2,5),mat(T,i%2?0xff102f:0x5a0014,0,true));ray.position.set(Math.cos(i*Math.PI/9)*2.9,8.6,Math.sin(i*Math.PI/9)*2.9-6.3);ray.rotation.z=i%2?-.3:.3;eclipse.add(ray);rays.push(ray);}
 // Árvores secas de tamanho real, raízes, galhos e vegetação: tudo é puxado fisicamente para o vórtice.
 for(let i=0;i<15;i++){const tree=new T.Group();const trunkH=3.4+(i%4)*.55;const trunk=new T.Mesh(new T.CylinderGeometry(.07,.2,trunkH,6),black);trunk.position.y=trunkH*.5;tree.add(trunk);for(let j=0;j<5;j++){const branch=new T.Mesh(new T.CylinderGeometry(.025,.075,1.35+(j%2)*.35,5),blackRed);branch.position.set((j%2?1:-1)*(.25+(j%3)*.14),trunkH*.35+j*.42,.02);branch.rotation.z=(j%2?-.75:.75);tree.add(branch);}for(let j=0;j<3;j++){const rootBit=new T.Mesh(new T.CylinderGeometry(.015,.09,.85,5),blackRed);rootBit.position.set((j-1)*.2,.18,.02);rootBit.rotation.z=(j-1)*-.55;tree.add(rootBit);}tree.position.set(Math.cos(i*2.399)*(8.5+(i%4)*1.15),0,Math.sin(i*2.399)*(8.5+(i%4)*1.15));eclipse.add(tree);trees.push({mesh:tree,phase:i*.41,base:tree.position.clone()});}
 for(let i=0;i<42;i++){const tuft=new T.Group();for(let j=0;j<5;j++){const blade=new T.Mesh(new T.ConeGeometry(.055,.48+(j%3)*.13,4),j%3?blackRed:hotRed);blade.position.set((j-2)*.075,.18+(j%3)*.04,((j%2)-.5)*.08);blade.rotation.z=(j-2)*-.16;tuft.add(blade);}tuft.position.set(Math.cos(i*2.399)*(5.5+(i%7)*1.1),0,Math.sin(i*2.399)*(5.5+(i%7)*1.1));eclipse.add(tuft);grass.push({mesh:tuft,phase:i*.27,base:tuft.position.clone()});}
 for(let i=0;i<52;i++){const frag=new T.Mesh(new T.DodecahedronGeometry(.14+(i%5)*.07,0),i%4?black:blackRed);frag.position.set(Math.cos(i*2.399)*(4+(i%9)*.9),.25+(i%7)*.25,Math.sin(i*2.399)*(4+(i%9)*.9));eclipse.add(frag);debris.push({mesh:frag,phase:i*.17,base:frag.position.clone()});}
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
 else if(id==='blackSwordRain'){const desiredLen=Math.max(.01,len),blendAim=state==='attack'?.055:.018;swordAimX+=(ux-swordAimX)*blendAim;swordAimZ+=(uz-swordAimZ)*blendAim;const aimLen=Math.max(.001,Math.hypot(swordAimX,swordAimZ));const ax=swordAimX/aimLen,az=swordAimZ/aimLen,apx=-az,apz=ax;lane.material.opacity=state==='windup'?.36:.04;lane.position.set(ax*desiredLen*.5,.045,az*desiredLen*.5);lane.rotation.set(-Math.PI/2,0,-Math.atan2(az,ax));lane.scale.set(1.8,Math.max(1,desiredLen),1);const progress=state==='attack'?clamp((Number(view.stateTime)||0)/Math.max(.1,Number(view.hitAt)||.72),0,1):0;swords.forEach(s=>{const startD=.8+s.start*.24,travelD=Math.max(0,desiredLen-startD)*progress,spread=s.lane*(.48+progress*.12);s.mesh.position.set(ax*(startD+travelD)+apx*spread,s.baseY+.025*Math.sin(now*.009+s.phase),az*(startD+travelD)+apz*spread);s.mesh.rotation.set(Math.PI/2,Math.atan2(ax,az),0);s.mesh.visible=state!=='attack'||progress<.995;s.mesh.scale.setScalar(1+.045*Math.sin(now*.012+s.phase));});}
 else{
  const elapsed=Math.max(0,(now-startAt)/1000),charge=clamp(elapsed/2.5,0,1),grow=clamp((elapsed-2.4)/3.8,0,1),launch=clamp((elapsed-7.05)/1.25,0,1);
  // MOD 125: plano geral alto; lua e vórtice ficam separados e o jogador recupera controle ao lançar.
  if(id==='abyssEclipse'){
    const normalEye=cameraStartEye||[boss[0],2.2,boss[2]+9];
    const normalTarget=cameraStartTarget||[boss[0],1.6,boss[2]];
    const bossPos=Array.isArray(view.position)?view.position:boss;
    const skyEye=[bossPos[0],(bossPos[1]||0)+14.0,(bossPos[2]||0)+24.0];
    const skyTarget=[bossPos[0],(bossPos[1]||0)+8.0,(bossPos[2]||0)-7.0];
    const rise=clamp(elapsed/1.7,0,1),smoothRise=rise*rise*(3-2*rise);
    const returning=clamp((elapsed-9.05)/.95,0,1),smoothReturn=returning*returning*(3-2*returning);
    const blend=smoothRise*(1-smoothReturn);
    const eye=normalEye.map((v,i)=>v+(skyEye[i]-v)*blend);
    const targetCam=normalTarget.map((v,i)=>v+(skyTarget[i]-v)*blend);
    window.CelestialUltimateCamera={active:true,eye:eye,target:targetCam,fov:(Number(cameraStartFov)||1.02)+.25*blend};
    window.CelestialEclipseLock=elapsed<7.05;
  }
  if(!overlay){overlay=document.createElement('div');overlay.setAttribute('aria-hidden','true');overlay.style.cssText='position:fixed;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity .18s linear;background:radial-gradient(ellipse at 50% 14%,rgba(255,0,38,.42),rgba(110,0,18,.26) 42%,rgba(3,0,8,.5) 100%);mix-blend-mode:multiply;';document.body.appendChild(overlay);}
  overlay.style.opacity=String(clamp((elapsed-.7)*.25,0,.78));moon.visible=elapsed>1.0&&elapsed<10.0;moon.scale.setScalar(.035+charge*.97);moonCore.material.emissiveIntensity=.5+charge*1.2;
  ring.material.opacity=.3+grow*.68;ring.scale.set(1.0+grow*2.2,.72+grow*1.15,.3);hole.visible=elapsed>2.0;hole.position.set(0,8.3-grow*.35,-6.3);hole.scale.setScalar(.08+grow*2.25);
  rays.forEach((ray,i)=>{ray.material.opacity=elapsed>1.0&&elapsed<7.1?(.2+.7*Math.abs(Math.sin(now*.006+i)))*charge:0;ray.scale.y=.45+charge*2.1;ray.rotation.y=now*.00035+i*.7;});
  trees.forEach(tree=>{const p=clamp((elapsed-2.15-tree.phase*.035)/4.25,0,1);tree.mesh.visible=elapsed>2.15&&elapsed<9.2;tree.mesh.position.set(tree.base.x*(1-p)+Math.sin(now*.002+tree.phase)*.16,tree.base.y+p*(8.2+tree.phase*.04),tree.base.z*(1-p)-6.3*p+Math.cos(now*.002+tree.phase)*.16);tree.mesh.rotation.z=Math.sin(now*.003+tree.phase)*(.1+p*.42);tree.mesh.rotation.x=p*.5;tree.mesh.scale.setScalar(1-p*.48);});
  grass.forEach(tuft=>{const p=clamp((elapsed-1.9-tuft.phase*.012)/3.6,0,1);tuft.mesh.visible=elapsed>1.9&&elapsed<8.8;tuft.mesh.position.set(tuft.base.x*(1-p),tuft.base.y+p*(7.8+tuft.phase*.025),tuft.base.z*(1-p)-6.2*p);tuft.mesh.rotation.z=Math.sin(now*.004+tuft.phase)*(.1+p*.6);tuft.mesh.rotation.x=p*.8;tuft.mesh.scale.setScalar(1-p*.7);});
  debris.forEach(fragment=>{const p=clamp((elapsed-2.0-fragment.phase*.009)/3.7,0,1);fragment.mesh.visible=elapsed>2.0&&elapsed<8.9;fragment.mesh.position.set(fragment.base.x*(1-p),fragment.base.y+p*(8.0+fragment.phase*.025),fragment.base.z*(1-p)-6.3*p);fragment.mesh.rotation.set(now*.001+fragment.phase,now*.0015+fragment.phase,now*.001+fragment.phase);fragment.mesh.scale.setScalar(1-p*.55);});
  if(elapsed>7.05){const y=8.3*(1-launch)+1.35*launch;hole.position.set(ux*len*launch,y,-6.3*(1-launch)+uz*len*launch);ring.position.copy(hole.position);ring.scale.setScalar(1.3+launch*1.5);blast.position.copy(hole.position);blast.scale.setScalar(.2+launch*5.5);blast.material.opacity=launch>.78?clamp((launch-.78)*4.5,0,.98):.025;hole.scale.setScalar(2.1+launch*.55);}
  else{ring.position.copy(hole.position);blast.material.opacity=0;}
  if(elapsed>8.3){hole.scale.setScalar(Math.max(.01,2.6-(elapsed-8.3)*5));blast.material.opacity=Math.max(0,.98-(elapsed-8.3)*2.3);}
 }
}
function start(){requestAnimationFrame(tick);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();