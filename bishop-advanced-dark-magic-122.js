/* MOD 123 — três magias, foice corrigida, lâminas frontais e Eclipse do Abismo. */
(function(){
'use strict';
let api=null,group=null,ready=false,last=0,activeId='',startAt=0,overlay=null;
let reaper=null,arm=null,scythe=null,swords=[],lane=null,moon=null,hole=null,ring=null,blast=null,trees=[],debris=[],rays=[];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mat(T,color,opacity=1,add=false){return new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,blending:add?T.AdditiveBlending:T.NormalBlending});}
function build(){
 if(!api||!api.THREE||!api.scene||ready)return;
 const T=api.THREE,black=new T.MeshStandardMaterial({color:0x030207,roughness:.42,metalness:.35,emissive:0x23000b,emissiveIntensity:.45}),blackRed=new T.MeshStandardMaterial({color:0x18030b,roughness:.34,metalness:.4,emissive:0x650018,emissiveIntensity:.55}),red=mat(T,0xff123f,.96,true),pink=mat(T,0xff7893,.95,true);
 group=new T.Group();group.name='BishopAdvancedDarkMagic_Mod122';api.scene.add(group);
 reaper=new T.Group();group.add(reaper);
 const robe=new T.Mesh(new T.ConeGeometry(.43,1.55,7),black);robe.position.y=1.02;reaper.add(robe);
 const hem=new T.Mesh(new T.TorusGeometry(.36,.035,5,16),mat(T,0xff1744,.85,true));hem.rotation.x=Math.PI/2;hem.position.y=.32;reaper.add(hem);
 const hood=new T.Mesh(new T.SphereGeometry(.29,10,8),blackRed);hood.position.set(0,1.83,.02);hood.scale.set(.88,1.05,.78);reaper.add(hood);
 const face=new T.Mesh(new T.SphereGeometry(.17,8,7),new T.MeshBasicMaterial({color:0x010105}));face.position.set(0,1.83,.19);reaper.add(face);
 [-.085,.085].forEach(x=>{const eye=new T.Mesh(new T.SphereGeometry(.035,6,5),red);eye.position.set(x,1.87,.34);reaper.add(eye);});
 arm=new T.Group();arm.position.set(.43,1.42,.22);reaper.add(arm);
 const upper=new T.Mesh(new T.CylinderGeometry(.085,.11,.62,6),blackRed);upper.position.y=-.2;upper.rotation.z=-.24;arm.add(upper);
 const hand=new T.Mesh(new T.SphereGeometry(.09,7,6),black);hand.position.set(.12,-.48,.02);arm.add(hand);
 scythe=new T.Group();scythe.position.set(.18,-.42,.28);scythe.rotation.z=-.18;arm.add(scythe);
 const shaft=new T.Mesh(new T.CylinderGeometry(.026,.04,1.62,7),blackRed);shaft.position.y=.25;scythe.add(shaft);
 const grip=new T.Mesh(new T.CylinderGeometry(.045,.045,.28,6),mat(T,0xff123f,.95,true));grip.position.y=-.03;scythe.add(grip);
 const blade=new T.Mesh(new T.TorusGeometry(.38,.065,6,20,Math.PI*.72),blackRed);blade.position.set(.2,.2,.06);blade.rotation.z=.72;scythe.add(blade);
 const edge=new T.Mesh(new T.TorusGeometry(.35,.025,5,20,Math.PI*.72),mat(T,0xff4268,.95,true));edge.position.set(.2,.2,.095);edge.rotation.z=.72;scythe.add(edge);
 const tip=new T.Mesh(new T.ConeGeometry(.075,.36,5),mat(T,0xff7893,.95,true));tip.position.set(.51,.44,.075);tip.rotation.z=-.84;scythe.add(tip);
 lane=new T.Mesh(new T.PlaneGeometry(1,1),mat(T,0xff123f,.28,true));lane.rotation.x=-Math.PI/2;group.add(lane);
 for(let i=0;i<35;i++){const g=new T.Group();g.add(new T.Mesh(new T.BoxGeometry(.055,.78,.035),blackRed));const point=new T.Mesh(new T.ConeGeometry(.04,.24,4),black);point.position.y=-.49;g.add(point);const edge2=new T.Mesh(new T.BoxGeometry(.018,.64,.045),mat(T,0xff123f,.96,true));edge2.position.set(.018,.02,.022);g.add(edge2);const core=new T.Mesh(new T.BoxGeometry(.009,.48,.05),mat(T,0xff7893,.95,true));core.position.set(-.012,.01,.026);g.add(core);const trail=new T.Mesh(new T.BoxGeometry(.085,1.2,.012),mat(T,0xff123f,.42,true));trail.position.set(0,.34,-.015);g.add(trail);group.add(g);swords.push({mesh:g,lane:((i%7)-3)*.52,start:.10+Math.floor(i/7)*.12,baseY:1.2+(i%4)*.27,phase:i*.37});}
 const eclipse=new T.Group();eclipse.name='Eclipse sequence';group.add(eclipse);
 moon=new T.Mesh(new T.SphereGeometry(1.65,20,14),new T.MeshStandardMaterial({color:0x24000b,roughness:.9,emissive:0x7b001c,emissiveIntensity:1.1}));moon.position.set(0,8.2,-7.8);eclipse.add(moon);
 const eyeMat=new T.MeshBasicMaterial({color:0x030106});
 for(const x of [-.47,.47]){const eye=new T.Mesh(new T.SphereGeometry(.16,8,6),eyeMat);eye.position.set(x,.27,1.56);moon.add(eye);}
 const grin=new T.Mesh(new T.TorusGeometry(.36,.055,5,20,Math.PI),eyeMat);grin.position.set(0,-.38,1.56);grin.rotation.z=Math.PI;moon.add(grin);
 const scar=new T.Mesh(new T.TorusGeometry(1.34,.045,5,40),mat(T,0xff1744,.92,true));scar.position.copy(moon.position);scar.scale.set(1,1,.28);eclipse.add(scar);
 hole=new T.Mesh(new T.SphereGeometry(1,18,14),new T.MeshBasicMaterial({color:0x000000,depthWrite:false}));hole.position.set(0,7,-7);eclipse.add(hole);
 ring=new T.Mesh(new T.TorusGeometry(1.12,.055,6,40),mat(T,0xff1744,.95,true));ring.position.copy(hole.position);ring.scale.set(1,1,.3);eclipse.add(ring);
 blast=new T.Mesh(new T.TorusGeometry(1.1,.12,6,32),mat(T,0xff7893,0,true));blast.position.set(0,1,0);eclipse.add(blast);
 for(let i=0;i<10;i++){const ray=new T.Mesh(new T.CylinderGeometry(.012,.07,4.5,5),mat(T,i%2?0xff173d:0x6b0018,0,true));ray.position.set(Math.cos(i*Math.PI/5)*2.1,7.5,Math.sin(i*Math.PI/5)*2.1-7);ray.rotation.z=i%2?-.22:.22;eclipse.add(ray);rays.push(ray);}
 for(let i=0;i<9;i++){const tree=new T.Group();const trunk=new T.Mesh(new T.CylinderGeometry(.055,.16,2.8,5),black);trunk.position.y=1.1;tree.add(trunk);for(let j=0;j<3;j++){const branch=new T.Mesh(new T.ConeGeometry(.16,.95,5),blackRed);branch.position.set((j-1)*.22,1.55+j*.3,.02);branch.rotation.z=(j-1)*-.55;tree.add(branch);}tree.position.set(Math.cos(i*2.399)*(4.2+(i%3)*.85),0,Math.sin(i*2.399)*(4.2+(i%3)*.85));eclipse.add(tree);trees.push({mesh:tree,phase:i*.7,base:tree.position.clone()});}
 for(let i=0;i<16;i++){const rock=new T.Mesh(new T.DodecahedronGeometry(.12+(i%4)*.045,0),i%3?black:blackRed);rock.position.set(Math.cos(i*2.399)*(2.8+(i%4)*.7),.3+(i%5)*.25,Math.sin(i*2.399)*(2.8+(i%4)*.7));eclipse.add(rock);debris.push({mesh:rock,phase:i*.51,base:rock.position.clone()});}
 group.userData.eclipse=eclipse;group.visible=false;ready=true;
}
function hide(){if(group)group.visible=false;if(overlay)overlay.style.opacity='0';activeId='';startAt=0;}
function tick(now){
 requestAnimationFrame(tick);const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
 api=window.ValerioThreeAPI||api;if(!ready&&api){try{build();}catch(e){return;}}
 const view=window.ValerioModelView;
 if(!ready||!view||!view.active||!['blackReaper','blackSwordRain','abyssEclipse'].includes(view.attackId)||!['windup','attack','recover'].includes(view.combatState)){hide();return;}
 const id=view.attackId,state=view.combatState;if(state==='recover'){hide();return;}
 const target=Array.isArray(view.skillTargetPosition)?view.skillTargetPosition:(Array.isArray(view.playerPosition)?view.playerPosition:[0,0,0]),boss=Array.isArray(view.position)?view.position:target;
 const dx=target[0]-boss[0],dz=target[2]-boss[2],len=Math.max(.01,Math.hypot(dx,dz)),ux=dx/len,uz=dz/len,px=-uz,pz=ux;
 group.position.set(boss[0],boss[1]||0,boss[2]);group.visible=true;
 if(id!==activeId){activeId=id;startAt=now;const book=window.BishopGrimoire3D||window.ValerioGrimoire3D;if(book&&book.ready&&typeof book.invoke==='function')book.invoke(((Number(view.windupDuration)||1.5)+(Number(view.attackDuration)||1)+2.5)*1000);}
 reaper.visible=id==='blackReaper';lane.visible=id==='blackSwordRain';swords.forEach(s=>s.mesh.visible=id==='blackSwordRain');group.userData.eclipse.visible=id==='abyssEclipse';
 if(id==='blackReaper'){const progress=state==='windup'?0:clamp((Number(view.stateTime)||0)/Math.max(.1,Number(view.hitAt)||1.15),0,1);reaper.position.set(ux*(.8+(len-.8)*progress),0,uz*(.8+(len-.8)*progress));reaper.rotation.y=Math.atan2(ux,uz);const t=Number(view.stateTime)||0;arm.rotation.z=state==='windup'?.38: -.12+Math.sin(t*4.1)*.72;scythe.rotation.z=state==='windup'?.18: .12+Math.sin(t*4.1+.7)*.95;}
 else if(id==='blackSwordRain'){lane.material.opacity=state==='windup'?.48:.08;lane.position.set(dx*.5,.045,dz*.5);lane.rotation.set(-Math.PI/2,0,-Math.atan2(dz,dx));lane.scale.set(2.8,Math.max(1,len),1);const progress=state==='attack'?clamp((Number(view.stateTime)||0)/Math.max(.1,Number(view.hitAt)||.72),0,1):0;swords.forEach(s=>{const startD=Math.min(.65+s.start*.25,len*.22),travelD=Math.max(0,len-startD)*progress,spread=s.lane*(.78+progress*.22);s.mesh.position.set(ux*(startD+travelD)+px*spread,s.baseY+.035*Math.sin(now*.009+s.phase),uz*(startD+travelD)+pz*spread);s.mesh.rotation.set(0,Math.atan2(ux,uz),0);s.mesh.visible=state!=='attack'||progress<.985;s.mesh.scale.setScalar(1+.08*Math.sin(now*.012+s.phase));});}
 else{
  const elapsed=Math.max(0,(now-startAt)/1000),charge=clamp(elapsed/1.8,0,1),grow=clamp((elapsed-1.9)/3.0,0,1),launchStart=Math.max(5.6,(Number(view.windupDuration)||2.6)+(Number(view.hitAt)||6.0)-1.0),launch=clamp((elapsed-launchStart)/1.25,0,1);
  if(!overlay){overlay=document.createElement('div');overlay.setAttribute('aria-hidden','true');overlay.style.cssText='position:fixed;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity .18s linear;background:radial-gradient(ellipse at 50% 14%,rgba(255,0,38,.42),rgba(110,0,18,.26) 42%,rgba(3,0,8,.5) 100%);mix-blend-mode:multiply;';document.body.appendChild(overlay);}
  overlay.style.opacity=String(clamp((elapsed-1.05)*.22,0,.72));moon.visible=elapsed>.75&&elapsed<10.5;moon.scale.setScalar(.06+charge*1.12);moon.material.emissiveIntensity=.45+charge*1.4;
  ring.material.opacity=.2+grow*.78;ring.scale.setScalar(.12+grow*1.6);hole.visible=elapsed>1.85;hole.position.set(0,7.1-grow*.45,-7.1);hole.scale.setScalar(.08+grow*1.65);
  rays.forEach((ray,i)=>{ray.material.opacity=elapsed>1.2&&elapsed<6.7?(.12+.68*Math.abs(Math.sin(now*.006+i)))*charge:0;ray.scale.y=.4+charge*1.6;ray.rotation.y=now*.00035+i*.7;});
  trees.forEach(tree=>{const p=clamp((elapsed-2.0-tree.phase*.07)/3.0,0,1);tree.mesh.visible=elapsed>1.95&&elapsed<10.0;tree.mesh.position.set(tree.base.x*(1-p)+Math.sin(now*.002+tree.phase)*.12,tree.base.y+p*(7.0+tree.phase*.12),tree.base.z*(1-p)-7.1*p+Math.cos(now*.002+tree.phase)*.12);tree.mesh.rotation.z=Math.sin(now*.003+tree.phase)*(.08+p*.25);tree.mesh.scale.setScalar(1-p*.55);});
  debris.forEach(rock=>{const p=clamp((elapsed-2.1-rock.phase*.02)/2.9,0,1);rock.mesh.visible=elapsed>2.0&&elapsed<10.0;rock.mesh.position.set(rock.base.x*(1-p),rock.base.y+p*(6.8+rock.phase*.12),rock.base.z*(1-p)-7.0*p);rock.mesh.rotation.set(now*.001+rock.phase,now*.0015+rock.phase,now*.001+rock.phase);});
  if(elapsed>launchStart){hole.position.set(ux*len*launch,1.35,uz*len*launch);ring.position.copy(hole.position);ring.scale.setScalar(1.2+launch*.7);blast.position.copy(hole.position);blast.scale.setScalar(.2+launch*4);blast.material.opacity=launch>.8?clamp((launch-.8)*4,0,.95):.04;hole.scale.setScalar(1.55+launch*.45);}
  else{ring.position.copy(hole.position);blast.material.opacity=0;}
  if(elapsed>launchStart+1.45){hole.scale.setScalar(Math.max(.01,1.9-(elapsed-8)*5));blast.material.opacity=Math.max(0,.9-(elapsed-8)*2.8);}
 }
}
function start(){requestAnimationFrame(tick);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();