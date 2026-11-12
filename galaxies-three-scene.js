/**
 * MENU VIVO THREE.JS — 7 Pecados. 100% geometria + shaders + texturas
 * procedurais geradas no navegador. Não utiliza arquivos de imagem.
 * O menu HTML continua responsável pelas ações, progressão e acessibilidade.
 * WebGL é opcional; se falhar, SVG existente permanece disponível.
 */
import * as THREE from 'three';

const PI=Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rand(n){const x=Math.sin(n*127.1+78.233)*43758.5453;return x-Math.floor(x);}
function mat(c,metal=0.15,rough=.63,emissive=0){return new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:rough,emissive:c,emissiveIntensity:emissive});}
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
function ball(parent,r,color,x=0,y=0,z=0,scale){const o=mesh(new THREE.SphereGeometry(r,24,16),mat(color,.17,.5),parent,x,y,z);if(scale)o.scale.set(...scale);return o;}
function tube(parent,points,r,color,emissive=.0){
 const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 return mesh(new THREE.TubeGeometry(c,Math.max(20,points.length*4),r,5,false),mat(color,.5,.38,emissive),parent);
}
function ring(parent,r,t,color,rx=.26,ry=-.2,z=0,opacity=1){
 const m=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,side:THREE.DoubleSide});
 const o=mesh(new THREE.TorusGeometry(r,t,5,96),m,parent,0,0,z);o.rotation.set(rx,ry,0);return o;
}
function proceduralTexture(id){
 const c=document.createElement('canvas');c.width=c.height=256;
 const ctx=c.getContext('2d',{alpha:false});const p=[
  ['#c5872d','#4a2b17','#171014'],['#1abc68','#03473a','#060a12'],
  ['#ebae42','#664015','#161012'],['#e3f2ff','#7594b4','#1b2335'],
  ['#8f2535','#390912','#0a0208'],['#bd3527','#3d1115','#08090c'],
  ['#e78ac3','#73306e','#1a0a28']
 ][id-1];
 const grad=ctx.createRadialGradient(82,65,2,127,137,178);
 grad.addColorStop(0,p[0]);grad.addColorStop(.44,p[1]);grad.addColorStop(1,p[2]);
 ctx.fillStyle=grad;ctx.fillRect(0,0,256,256);
 // Vulcões, crostas, continentes, nuvens e fissuras codificados, não imagens.
 for(let i=0;i<195;i++){
  const x=rand(i*2+id*170)*256,y=rand(i*3+id*65)*256;
  const r=2+rand(i*5+id*23)*26;
  ctx.beginPath();ctx.ellipse(x,y,r,r*(.24+rand(i*11)),rand(i*7)*PI,0,2*PI);
  ctx.fillStyle=id===4?'rgba(230,246,255,.21)':id===6?'rgba(15,6,7,.42)':
   id===2?'rgba(3,35,20,.24)':id===7?'rgba(255,171,223,.12)':'rgba(15,11,8,.26)';
  ctx.fill();
 }
 if(id===6||id===3||id===1){
  for(let i=0;i<22;i++){
   ctx.strokeStyle=id===6?'rgba(255,76,19,.85)':'rgba(255,189,56,.48)';
   ctx.lineWidth=1+rand(i+32)*3;ctx.beginPath();
   let x=rand(i*71)*256,y=rand(i*43)*256;ctx.moveTo(x,y);
   for(let j=0;j<5;j++){x+=10+rand(i*4+j)*18;y+=(rand(i*6+j)-.5)*40;ctx.lineTo(x,y);}
   ctx.stroke();
  }
 }
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=2;
 return tex;
}
function spire(parent,x,y,z,height,base,color,glow){
 const body=mesh(new THREE.CylinderGeometry(base*.6,base,height*.7,6),mat(color,.5,.55),parent,x,y+height*.3,z);
 mesh(new THREE.ConeGeometry(base*.95,height*.48,6),mat(glow,.35,.62),parent,x,y+height*.86,z);
 return body;
}
function castle(parent,r,ice=false){
 const ground=ice?'#49627f':'#3e2714',shine=ice?'#dceeff':'#efa93e';
 for(let i=0;i<12;i++){
  const x=(i-5.5)*r*.16,scale=.45+rand(i*8+19)*.65;
  const y=r*.33+Math.sin(i*.45)*r*.12;
  spire(parent,x,y,r*.65,r*.6*scale,r*.065,ground,shine);
  if(i%3===0)ball(parent,r*.018,'#ffe1a3',x,y+r*.18,r*.715);
 }
}
function coin(parent,r,x,y,z){const m=new THREE.MeshStandardMaterial({color:'#ffcf43',metalness:.85,roughness:.21,emissive:'#a24a02',emissiveIntensity:.1});
 const o=mesh(new THREE.CylinderGeometry(r,r,r*.16,12),m,parent,x,y,z);o.rotation.x=PI/2;return o;}
function treasure(parent,r){
 const brown=mat('#54280b',.32,.56),gold=mat('#efae36',.78,.32);
 const base=mesh(new THREE.BoxGeometry(r*.86,r*.39,r*.45),brown,parent,0,-r*.29,r*.79);
 const lid=mesh(new THREE.BoxGeometry(r*.86,r*.13,r*.48),gold,parent,0,r*.02,r*.8);lid.rotation.z=.23;
 for(let i=0;i<14;i++)coin(parent,r*.095,(rand(i+42)-.5)*r*1.5,-r*.55+rand(i+12)*r*.5,r*.95+rand(i)*r*.13);
 for(const x of [-r*.4,r*.4])mesh(new THREE.BoxGeometry(r*.07,r*.4,r*.52),gold,parent,x,-r*.25,r*.81);
}
function envy(parent,r){
 const pts=[];for(let i=0;i<24;i++){const t=i/23;const angle=-2.6+t*PI*3.4;
  pts.push([Math.cos(angle)*r*.73,Math.sin(angle)*r*.67,r*.7+Math.sin(i*.8)*r*.1]);}
 tube(parent,pts,r*.065,'#21d565',.15);
 const h=pts.at(-1);ball(parent,r*.125,'#17bd5d',h[0],h[1],h[2]);
 for(const x of [-1,1])ball(parent,r*.025,'#f5f6a0',h[0]+x*r*.052,h[1]+r*.045,h[2]+r*.11);
}
function maw(parent,r){
 const cavity=ball(parent,r*.5,'#140407',0,-r*.03,r*.85,[1.15,.8,.28]);
 ring(parent,r*.43,r*.095,'#b94142',.02,0,r*.88);
 for(let i=0;i<14;i++){const a=i*2*PI/14,x=Math.cos(a)*r*.45,y=Math.sin(a)*r*.35;
  const tooth=mesh(new THREE.ConeGeometry(r*.085,r*.32,5),mat('#ffe6d0',.15,.4),parent,x,y,r*.97);
  tooth.rotation.z=a-PI/2;
 }
 ball(parent,r*.12,'#a21423',-.1*r,-r*.26,r*1.14);
}
function rose(parent,x,y,z,s,shade){
 const core=ball(parent,s*.22,shade,x,y,z);
 for(let j=0;j<7;j++){
  const a=j*2*PI/7,o=ball(parent,s*.26,shade,x+Math.cos(a)*s*.38,y+Math.sin(a)*s*.38,z+.03*s,[.8,1.2,.32]);
  o.rotation.z=a;
 }return core;
}
function lust(parent,r){
 // Escultura procedural: busto e rosto humanizados, fios de cabelo orgânicos,
 // acessórios e flores. Sem fotografia nem recurso externo.
 const skin=mat('#e4a8c4',.18,.42),hair=mat('#512342',.26,.42);
 ball(parent,r*.3,'#f1b6cc',0,-r*.48,r*.77,[1.4,.56,.6]);
 mesh(new THREE.CylinderGeometry(r*.14,r*.18,r*.32,16),skin,parent,0,-r*.16,r*.91);
 const face=mesh(new THREE.SphereGeometry(r*.36,32,24),skin,parent,.04*r,r*.23,r*.81);
 face.scale.set(.73,1.22,.65);
 // Olhos, sobrancelhas, nariz e boca em alto-relevo.
 for(const d of [-1,1]){
  ball(parent,r*.073,'#fff1e5',d*r*.137,r*.29,r*1.045,[1,.42,.35]);
  ball(parent,r*.024,'#2a0c26',d*r*.14,r*.29,r*1.07);
  tube(parent,[[d*r*.068,r*.4,r*1.06],[d*r*.15,r*.42,r*1.055],[d*r*.21,r*.385,r*1.02]],r*.014,'#2b1024');
 }
 ball(parent,r*.05,'#ce839c',0,r*.1,r*1.08,[.65,1.2,.7]);
 ball(parent,r*.085,'#a12a52',.01*r,-r*.01,r*1.07,[1.1,.28,.4]);
 for(let i=0;i<17;i++){
  const sign=i%2?-1:1;
  const x=sign*r*(.18+rand(i+8)*.19),top=r*(.63+rand(i+1)*.16);
  tube(parent,[[x*.6,top,r*.77],[x,top-r*.15,r*.97],[x*1.2,r*.1,r*.9],[x*.7,-r*.47,r*.85]],r*(.025+rand(i)*.017),i%3?'#592448':'#823957');
 }
 for(let i=0;i<8;i++){
  const a=i*2*PI/8;
  rose(parent,Math.cos(a)*r*.82,Math.sin(a)*r*.75,r*.6,r*.19,i%2?'#ff5a99':'#bd1c67');
 }
 ring(parent,r*1.12,r*.015,'#ff4cae',-.36,.1,r*.21,.84);
}
function makePlanet(id,r){
 const group=new THREE.Group();
 const colors=['#f4ab36','#1cd463','#f3bb50','#c8e9fa','#c64357','#ff5329','#ff76b7'];
 const globe=new THREE.Mesh(new THREE.SphereGeometry(r,40,24),
  new THREE.MeshStandardMaterial({map:proceduralTexture(id),metalness:id===3?.43:.12,roughness:.59}));
 group.add(globe);
 const atm=new THREE.Mesh(new THREE.SphereGeometry(r*1.035,24,12),
  new THREE.MeshBasicMaterial({color:colors[id-1],transparent:true,opacity:.075,side:THREE.BackSide,depthWrite:false}));
 group.add(atm);
 if(id===1){castle(group,r);ring(group,r*1.13,r*.035,'#e8a34b',.55,.27,r*.18);ring(group,r*.86,r*.055,'#704016',-.48,0,r*.87);}
 if(id===2){envy(group,r);ring(group,r*1.14,r*.02,'#36ec82',.32,-.2,r*.12,.75);}
 if(id===3){treasure(group,r);ring(group,r*1.18,r*.025,'#f6c467',-.24,.16,r*.12);}
 if(id===4){castle(group,r,true);for(let i=0;i<8;i++)spire(group,(i-3.5)*r*.21,r*.05,r*.68,r*(.3+rand(i+6)*.3),r*.085,'#9bd8fa','#e0f6ff');ring(group,r*1.11,r*.018,'#9de5ff',.48,.09,r*.17);}
 if(id===5){maw(group,r);ring(group,r*1.17,r*.02,'#fc444d',-.21,.17,.2*r);}
 if(id===6){for(let i=0;i<9;i++){let a=i*2*PI/9;const crack=[];for(let j=0;j<6;j++)crack.push([Math.cos(a+j*.1)*r*(.95-j*.09),Math.sin(a+j*.16)*r*(.95-j*.08),r*.27+j*r*.045]);tube(group,crack,r*.014,'#ff5a0c',.62);}ring(group,r*1.07,r*.028,'#ff430e',.3,-.18,0);}
 if(id===7){lust(group,r);}
 const halo=ring(group,r*1.23,r*.013,colors[id-1],.31,.1,-r*.06,.64);halo.name='orbital';
 group.userData={globe,halo,id};
 return group;
}
function starfield(parent,W,H){
 const n=160,points=new Float32Array(n*3),cols=new Float32Array(n*3);
 for(let i=0;i<n;i++){points[i*3]=(rand(i*4)-.5)*W;points[i*3+1]=(rand(i*5+2)-.5)*H;points[i*3+2]=-310+rand(i*7)*35;
  const c=new THREE.Color(i%5===0?'#ff6b52':'#e7bbad');cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(points,3));g.setAttribute('color',new THREE.BufferAttribute(cols,3));
 const pts=new THREE.Points(g,new THREE.PointsMaterial({size:1.45,vertexColors:true,transparent:true,opacity:.8,sizeAttenuation:false}));parent.add(pts);return pts;
}
function sky(parent,W,H){
 const material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},depthWrite:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:"\nuniform float uTime;varying vec2 vUv;\nfloat h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\nreturn mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}\nfloat fbm(vec2 p){float x=0.,a=.55;for(int i=0;i<4;i++){x+=a*n(p);p*=2.03;a*=.49;}return x;}\nvoid main(){\nvec2 uv=vUv, drift=vec2(uTime*.003,0.);\nfloat wide=fbm(uv*vec2(4.7,3.3)+drift),fine=fbm(uv*vec2(13.,7.)-drift*2.);\nfloat cloud=smoothstep(.3,.73,wide*.77+fine*.38);\nfloat redSun=exp(-length((uv-vec2(.77,.80))*vec2(1.23,1.45))*4.7);\nfloat farRed=exp(-length((uv-vec2(.89,.4))*vec2(1.3,1.4))*3.7);\nfloat blue=exp(-length((uv-vec2(.14,.83))*vec2(1.6,1.3))*5.);\nfloat lava=pow(1.-uv.y,2.6);\nvec3 base=vec3(.016,.018,.034);\nbase+=vec3(.19,.016,.025)*(cloud*(.55+redSun*1.7)+farRed*.45);\nbase+=vec3(.33,.032,.008)*redSun*(.21+.6*cloud);\nbase+=vec3(.012,.036,.075)*blue*(.7+.6*fine);\nbase+=vec3(.27,.022,.012)*lava*(.4+cloud*.9);\nfloat shade=smoothstep(.17,.8,wide);\nbase=mix(base,base*.38,shade*.18);\ngl_FragColor=vec4(base,1.);\n}"});
 const plane=mesh(new THREE.PlaneGeometry(W,H),material,parent,0,0,-360);
 return material;
}
function gothicRuins(parent,W,H){
 const rock=mat('#08070b',.08,.95),light=mat('#782116',.4,.7,.04);
 // Cidadela e torres distantes: geometria compartilhada, poucas draw calls.
 const towerGeom=new THREE.CylinderGeometry(4,8,95,5),spireGeom=new THREE.ConeGeometry(10,40,5);
 const mt=new THREE.InstancedMesh(towerGeom,rock,42);
 const ms=new THREE.InstancedMesh(spireGeom,rock,42);
 const dummy=new THREE.Object3D();
 for(let i=0;i<42;i++){
  let x=(rand(i+19)-.5)*W*1.04;
  if(i>20)x=W*.20+rand(i+62)*W*.29;
  const y=H*.09+rand(i+28)*H*.15;
  const z=-255+rand(i+32)*14,sc=.22+rand(i+43)*.86;
  dummy.position.set(x,y,z);dummy.scale.set(sc,sc*(.6+rand(i+5)),sc);dummy.updateMatrix();mt.setMatrixAt(i,dummy.matrix);
  dummy.position.y=y+sc*52;dummy.scale.setScalar(sc);dummy.updateMatrix();ms.setMatrixAt(i,dummy.matrix);
 }
 parent.add(mt,ms);
 // Escarpa inferior vulcânica, com clarões do chão.
 for(let i=0;i<38;i++){
  const x=(i/37-.5)*W,y=-H*.41+rand(i+78)*H*.13;
  mesh(new THREE.ConeGeometry(18+rand(i)*38,36+rand(i+22)*90,4),rock,parent,x,y,-190);
 }
 for(let i=0;i<13;i++){
  const x=(rand(i+87)-.5)*W;
  const r=3+rand(i+69)*19;
  ball(parent,r,'#fc3515',x,-H*.43+rand(i+14)*18,-178,[2.7,.22,.25]);
 }
}
function eclipse(parent,W,H){
 const x=W*.245,y=H*.33,r=H*.13;
 const corona=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:"varying vec2 vUv;\nvoid main(){float d=length((vUv-.5)*2.);\nfloat glow=exp(-d*3.3)*.58+exp(-abs(d-.53)*15.)*.32;\nvec3 c=mix(vec3(.92,.055,.01),vec3(.99,.27,.07),d);\ngl_FragColor=vec4(c,glow*max(0.,1.-smoothstep(.8,1.1,d)));}"});
 mesh(new THREE.PlaneGeometry(r*4.6,r*4.6),corona,parent,x,y,-295);
 const moon=mesh(new THREE.SphereGeometry(r,48,32),
  new THREE.MeshBasicMaterial({map:proceduralTexture(6),color:'#b91b17'}),parent,x,y,-283);
 mesh(new THREE.CircleGeometry(r*.79,64),new THREE.MeshBasicMaterial({color:'#180609'}),parent,x-r*.10,y+r*.08,-273);
 ring(parent,r*.98,r*.019,'#fc5428',0,0,-267);
 ring(parent,r*1.035,r*.008,'#f1974c',0,0,-272,.72);
 const glow=new THREE.PointLight('#ff311b',8,H*.9,1.5);glow.position.set(x,y,110);parent.add(glow);
}
function angel(parent,W,H){
 // Guardião alado escultural: capuz, rosto, armadura e penas 3D.
 const g=new THREE.Group();g.position.set(-W*.325,H*.345,-140);parent.add(g);
 const fabric=mat('#333544',.16,.8),skin=mat('#9d7770',.12,.83);
 const localLight=new THREE.PointLight('#b2a4bd',55,H*.45,2);localLight.position.set(0,H*.06,150);g.add(localLight);
 ball(g,H*.079,'#262532',0,-H*.09,0,[.78,1.25,.6]);
 const cloak=mesh(new THREE.ConeGeometry(H*.12,H*.37,11),fabric,g,0,-H*.26,-8);cloak.rotation.z=.12;
 for(const d of [-1,1]){const shoulder=ball(g,H*.042,'#4d5263',d*H*.076,-H*.05,7,[1.4,.85,.7]);shoulder.rotation.z=d*.48;}
 mesh(new THREE.CylinderGeometry(H*.018,H*.025,H*.06,10),skin,g,0,H*.04,6);
 ball(g,H*.049,'#af8980',-H*.007,H*.104,8,[.7,1.02,.65]);
 ball(g,H*.053,'#1b1721',-H*.008,H*.131,2,[.8,.66,.74]);
 mesh(new THREE.ConeGeometry(H*.067,H*.14,10),fabric,g,0,H*.16,-1).rotation.x=-.19;
 for(const d of [-1,1]){
  for(let i=0;i<24;i++){
   const t=i/23,spread=H*(.085+.24*t);
   const x=d*(H*.07+spread*Math.sin(.43+t*1.04));
   const y=H*(.025+spread*Math.cos(.43+t*1.04))-t*t*H*.05;
   const p=ball(g,H*.028,i%4?'#343d52':'#576076',x,y,-30-t*6,[.44,2.4+t*.95,.22]);
   p.rotation.z=d*(-.15-t*.9);
  }
 }
 ring(g,H*.055,H*.004,'#edbd78',.27,0,37,.86);
 return g;
}
function infernalGround(parent,W,H){
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:"varying vec2 vUv;\nfloat hash(vec2 p){return fract(sin(dot(p,vec2(91.7,217.3)))*43758.5453);}\nfloat noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\nreturn mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}\nvoid main(){\n vec2 uv=vUv;\n float n=noise(uv*vec2(28.,6.));\n float split=abs(sin(uv.x*63.+n*9.+sin(uv.y*11.)*2.))*abs(cos(uv.y*35.+n*7.));\n float lava=pow(max(0.,1.-split),12.)*(.3+.7*noise(uv*vec2(16.,5.)));\n vec3 earth=vec3(.016,.012,.015)+vec3(.07,.009,.012)*n;\n vec3 fire=vec3(1.,.18,.022)*lava*1.8;\n float heat=(1.-uv.y)*(.12+.36*n);\n gl_FragColor=vec4(earth+fire+vec3(heat,heat*.12,0.),.98);\n}"});
 mesh(new THREE.PlaneGeometry(W,H*.35),material,parent,0,-H*.395,-188);
}
function updateCoordinates(root,scene,camera,groups,details,viewport){
 const W=root.clientWidth,H=root.clientHeight;if(!W||!H)return;
 camera.left=-W/2;camera.right=W/2;camera.top=H/2;camera.bottom=-H/2;camera.updateProjectionMatrix();
 const rect=root.getBoundingClientRect();
 const rpos=el=>{const b=el.getBoundingClientRect();return {x:b.left+b.width/2-rect.left-W/2,y:H/2-(b.top+b.height/2-rect.top),radius:Math.min(b.width,b.height)*.47};};
 for(let i=0;i<7;i++){
  const el=root.querySelector('.gx-orb[data-id="'+(i+1)+'"]');
  if(!el)continue;const p=rpos(el),g=groups[i];
  const original=g.userData.originalRadius;g.position.set(p.x,p.y,15);
  g.scale.setScalar(p.radius/original);
 }
 // Corrente vermelha animável entre os sete mundos, feita de curvas 3D.
 if(details.chains){
  const pts=groups.map(g=>new THREE.Vector3(g.position.x,g.position.y,-20));
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
  const old=details.chains.geometry;
  details.chains.geometry=new THREE.TubeGeometry(curve,112,2.2,5,false);
  old.dispose();
 }
 const pane=root.querySelector('.gx-art');if(pane&&details.planet){
  const p=rpos(pane);details.planet.position.set(p.x,p.y,18);
  details.planet.scale.setScalar(clamp(p.radius,28,Math.min(H*.16,130))/details.planet.userData.originalRadius);
 }
 const canvas=root.querySelector('.gx-three-canvas');if(canvas)viewport.renderer.setSize(W,H,false);
}
export function mountThreeGalaxyScene(root,{onSelect}={}){
 if(!root||!THREE.WebGLRenderer)return null;
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false});
 }catch(e){console.warn('[Galáxias] WebGL indisponível, usando fallback SVG',e);return null;}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
 const canvas=renderer.domElement;canvas.className='gx-three-canvas';canvas.setAttribute('aria-hidden','true');root.prepend(canvas);
 const scene=new THREE.Scene(),W=root.clientWidth,H=root.clientHeight;
 const camera=new THREE.OrthographicCamera(-W/2,W/2,H/2,-H/2,.1,2000);camera.position.set(0,0,400);
 scene.add(new THREE.AmbientLight('#858ca9',1.7));
 const key=new THREE.DirectionalLight('#ffd4a6',3.1);key.position.set(-130,220,220);scene.add(key);
 const red=new THREE.PointLight('#ff3a17',5,H*1.25,1.5);red.position.set(W*.3,H*.25,150);scene.add(red);
 const shader=sky(scene,W,H);
 gothicRuins(scene,W,H);infernalGround(scene,W,H);eclipse(scene,W,H);angel(scene,W,H);starfield(scene,W,H);
 const groups=[],details={planet:null,chains:null};
 details.chains=new THREE.Mesh(
  new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:'#ff3b20',toneMapped:false,depthWrite:false})
 );
 details.chains.renderOrder=-2;scene.add(details.chains);
 for(let id=1;id<=7;id++){const g=makePlanet(id,64);g.userData.originalRadius=64;scene.add(g);groups.push(g);}
 details.planet=makePlanet(1,100);details.planet.userData.originalRadius=100;scene.add(details.planet);
 const size=()=>updateCoordinates(root,scene,camera,groups,details,{renderer});
 const observer=new ResizeObserver(size);observer.observe(root);
 const selected=()=>Number(root.querySelector('.gx-orb.sel')?.dataset.id||1);
 function setSelected(id){
  const current=details.planet;scene.remove(current);
  // Reutilizar modelo já criado evita gerar texturas e geometrias a cada clique.
  const copy=groups[id-1].clone(true);copy.userData.originalRadius=64;
  details.planet=copy;scene.add(copy);size();
 }
 let lastSelection=1,frame=0,elapsed=0,prev=0,running=true,id=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const tick=ms=>{
  if(!running||!root.isConnected)return;
  id=requestAnimationFrame(tick);
  if(document.hidden||root.classList.contains('leaving'))return;
  const dt=Math.min(.06,(ms-prev||16)/1000);prev=ms;elapsed+=dt;
  // 30 FPS cap para preservar GPU do celular (menus não precisam de 60).
  if(ms-frame<(reduced?1000:32))return;frame=ms;
  shader.uniforms.uTime.value=elapsed;
  if(!reduced){
   groups.forEach((g,i)=>{g.rotation.y=Math.sin(elapsed*.13+i)*.11;g.rotation.z=Math.sin(elapsed*.43+i)*.012;});
   details.planet.rotation.y=Math.sin(elapsed*.2)*.075;
  }
  const now=selected();if(now!==lastSelection){lastSelection=now;setSelected(now);}
  renderer.render(scene,camera);
 };
 function lost(e){e.preventDefault();root.classList.remove('gx-three-on');}
 canvas.addEventListener('webglcontextlost',lost,{passive:false});
 root.classList.add('gx-three-on');size();id=requestAnimationFrame(tick);
 const stop=()=>{
  running=false;cancelAnimationFrame(id);observer.disconnect();
  for(const object of scene.children){object.traverse?.(v=>{v.geometry?.dispose?.();if(v.material){const ms=Array.isArray(v.material)?v.material:[v.material];for(const m of ms){m.map?.dispose?.();m.dispose?.();}}});}
  renderer.dispose();canvas.remove();root.classList.remove('gx-three-on');
 };
 const rmo=new MutationObserver(()=>{if(!root.isConnected){rmo.disconnect();stop();}});rmo.observe(document.body,{childList:true,subtree:true});
 return {stop,renderer,canvas,select:setSelected};
}
