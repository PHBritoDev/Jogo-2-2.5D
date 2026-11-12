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
 // Materiais terrestres feitos por ruído multi-escala CPU (320²), sem importar
 // fotografias, mapas PBR ou sequer um arquivo bitmap. Gerado uma vez/planeta.
 const N=320,c=document.createElement('canvas');c.width=c.height=N;
 const ctx=c.getContext('2d',{alpha:false}),im=ctx.createImageData(N,N),data=im.data;
 const shades=[
  [[236,174,65],[118,68,25],[35,23,22]],
  [[24,221,111],[5,93,65],[3,17,27]],
  [[248,199,95],[138,81,27],[41,25,23]],
  [[239,248,254],[126,164,210],[31,50,79]],
  [[179,57,72],[93,12,33],[23,4,11]],
  [[255,99,29],[96,33,20],[14,13,17]],
  [[250,151,208],[134,52,114],[37,14,54]]
 ][id-1];
 const hash=(x,y)=>{
  let k=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(id,2147483647);
  k=Math.imul(k^(k>>>13),1274126177);return ((k^(k>>>16))>>>0)/4294967295;
 };
 const vnoise=(x,y)=>{
  const X=Math.floor(x),Y=Math.floor(y),u=x-X,v=y-Y,fx=u*u*(3-2*u),fy=v*v*(3-2*v);
  const a=hash(X,Y)+(hash(X+1,Y)-hash(X,Y))*fx;
  const b=hash(X,Y+1)+(hash(X+1,Y+1)-hash(X,Y+1))*fx;
  return a+(b-a)*fy;
 };
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const xx=x/N,yy=y/N,off=(y*N+x)*4;
  const n=vnoise(xx*6.3,yy*4.7)*.46+vnoise(xx*19.7,yy*12.1)*.33+
   vnoise(xx*57.8,yy*39.6)*.21;
  const ridge=Math.abs(n-.52),angle=xx*5+vnoise(xx*4,yy*4)*2;
  const cloud=Math.sin(angle*3+yy*16+n*9)*.18;
  let intensity=Math.max(0,Math.min(1,n*1.45-.18+cloud*.35));
  if(id===2)intensity=Math.max(0,Math.min(1,intensity+.16*Math.sin(yy*23+n*14)));
  if(id===4)intensity=.28+.72*Math.pow(intensity,.66);
  if(id===5)intensity=Math.max(0,Math.min(1,intensity*.75+ridge*.8));
  let lava=0;
  if(id===6||id===3||id===1){
   const p=Math.abs(Math.sin(xx*31+vnoise(xx*10,yy*10)*9)*Math.sin(yy*24+n*16));
   lava=Math.pow(1-p,id===6?22:35)*(id===6?1:.38);
  }
  const t=intensity<.5?intensity*2:(intensity-.5)*2;
  const a=intensity<.5?shades[2]:shades[1],b=intensity<.5?shades[1]:shades[0];
  for(let k=0;k<3;k++){
   const base=a[k]+(b[k]-a[k])*t;
   data[off+k]=Math.min(255,Math.max(0,base*(.77+.32*n)+lava*(k===0?235:k===1?85:15)));
  }
  data[off+3]=255;
 }
 ctx.putImageData(im,0,0);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=2;
 return tex;
}
function spire(parent,x,y,z,height,base,color,glow){
 const body=mesh(new THREE.CylinderGeometry(base*.6,base,height*.7,6),mat(color,.5,.55),parent,x,y+height*.3,z);
 mesh(new THREE.ConeGeometry(base*.95,height*.48,6),mat(glow,.35,.62),parent,x,y+height*.86,z);
 return body;
}
function castle(parent,r,ice=false){
 // Cidadela de pontas góticas sobre a superfície esférica, iluminada em ouro
 // ou gelo. 3D real: muralhas, torres, flechas, telhados e pequenas janelas.
 const stone=mat(ice?'#728cab':'#b47a32',.58,.45,ice?.08:.15);
 const roofs=mat(ice?'#c9e7fa':'#ffce70',.43,.43,ice?.14:.25);
 const windows=new THREE.MeshBasicMaterial({color:ice?'#e4f6ff':'#ffe49b'});
 const wall=mesh(new THREE.BoxGeometry(r*1.39,r*.18,r*.17),stone,parent,0,r*.23,r*1.02);
 const n=ice?10:12;
 for(let i=0;i<n;i++){
  const t=i/(n-1),x=(t-.5)*r*1.4,random=rand(i*8+19);
  const h=r*(.29+random*.6)+(i===Math.floor(n/2)?r*.55:0),y=r*.28;
  const z=r*(1.03+Math.cos((t-.5)*PI)*.08);
  mesh(new THREE.BoxGeometry(r*(.08+random*.07),h*.68,r*.16),stone,parent,x,y+h*.33,z);
  mesh(new THREE.ConeGeometry(r*(.09+random*.055),h*.38,5),roofs,parent,x,y+h*.85,z);
  mesh(new THREE.BoxGeometry(r*.028,r*.07,r*.006),windows,parent,x,y+h*.39,z+r*.087);
  if(i%3===0){
   mesh(new THREE.CylinderGeometry(r*.014,r*.014,h*.3,6),roofs,parent,x,y+h*1.2,z);
   ball(parent,r*.022,ice?'#dcf7ff':'#fff3b6',x,y+h*1.37,z);
  }
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
 // Serpente venenosa esculpida na face frontal de Inveja (trajeto em S).
 const p=[[-.63,-.57,1.03],[-.27,-.52,1.11],[.20,-.62,1.12],[.51,-.4,1.13],
 [.34,-.06,1.16],[-.2,.11,1.15],[-.49,.39,1.06],[-.10,.57,1.12],[.43,.56,1.04]]
 .map(v=>[v[0]*r,v[1]*r,v[2]*r]);
 tube(parent,p,r*.082,'#0b7039',.08);
 const pale=p.map(v=>[v[0],v[1]-r*.025,v[2]+r*.07]);tube(parent,pale,r*.025,'#69fa87',.35);
 const h=p.at(-1),head=ball(parent,r*.17,'#28d770',h[0],h[1],h[2],[1.3,.75,.65]);
 for(const d of [-1,1])ball(parent,r*.024,'#f4e785',h[0]+d*r*.06,h[1]+r*.04,h[2]+r*.12);
 tube(parent,[[h[0],h[1]-r*.02,h[2]+r*.12],[h[0]+r*.09,h[1]-r*.09,h[2]+r*.21]],r*.018,'#bcff7a');
}
function maw(parent,r){
 // Boca monstruosa em grande abertura tridimensional: tecido escuro,
 // maxilares curvos e presas inclinadas para dentro.
 ball(parent,r*.56,'#621724',0,-r*.02,r*.67,[1.19,1.02,.52]);
 ball(parent,r*.47,'#070307',0,-r*.06,r*.99,[1.11,.76,.31]);
 const lip=new THREE.CatmullRomCurve3(Array.from({length:32},(_,i)=>{
   const a=i*2*PI/31;return new THREE.Vector3(Math.cos(a)*r*.55,Math.sin(a)*r*.40-r*.045,r*.985);
 }));
 mesh(new THREE.TubeGeometry(lip,88,r*.066,6,false),mat('#b83442',.15,.44),parent);
 const toothMat=mat('#e9d8bf',.14,.35),shade=mat('#b5a99c',.08,.48);
 for(let row=0;row<2;row++){
  for(let i=0;i<8;i++){
   const t=(i+.3)/8,ang=(row?PI:0)+t*PI;
   const x=Math.cos(ang)*r*.49,y=Math.sin(ang)*r*.37-r*.045;
   const big=(i===1||i===6),length=r*(big?.37:.22);
   const tooth=mesh(new THREE.ConeGeometry(r*(big?.062:.045),length,7),toothMat,parent,x,y,r*1.05);
   tooth.rotation.z=ang+PI/2;
   tooth.rotation.x=.13;
  }
 }
 // Língua e saliva brilhantes na profundidade da mandíbula.
 const tongue=ball(parent,r*.18,'#b6283e',.07*r,-r*.26,r*1.11,[1.2,.37,.45]);
 for(let i=0;i<4;i++)tube(parent,[[(-.3+i*.18)*r,-r*.02,r*1.11],[(-.22+i*.17)*r,-r*.14,r*1.17]],r*.01,'#e36473',.1);
}
function rose(parent,x,y,z,s,shade){
 const core=ball(parent,s*.22,shade,x,y,z);
 for(let j=0;j<7;j++){
  const a=j*2*PI/7,o=ball(parent,s*.26,shade,x+Math.cos(a)*s*.38,y+Math.sin(a)*s*.38,z+.03*s,[.8,1.2,.32]);
  o.rotation.z=a;
 }return core;
}
function lust(parent,r){
 // Luxúria: escultura procedural de mulher adulta, rosto com anatomia,
 // cabelos ondulados, joias, braço elevado e pétalas 3D — nenhuma foto.
 const skin=mat('#d9a0a6',.08,.52),hair=mat('#612646',.26,.52);
 const red=mat('#b83769',.44,.31),gold=mat('#e8b16f',.79,.23);
 ball(parent,r*.29,'#d69ba5',0,-r*.43,r*.74,[1.62,.66,.8]);
 ball(parent,r*.22,'#a42a5b',0,-r*.53,r*1.02,[1.66,.5,.34]);
 mesh(new THREE.CylinderGeometry(r*.112,r*.155,r*.29,14),skin,parent,0,-r*.155,r*.84);
 const head=new THREE.Group();head.position.set(0,r*.225,r*.83);head.rotation.z=-.11;parent.add(head);
 const face=ball(head,r*.36,'#dfadaf',0,0,.018*r,[.70,1.1,.63]);
 ball(head,r*.22,'#ce929e',0,-r*.14,r*.115,[.63,.56,.6]);
 // Sobrancelhas, pálpebras curvas, íris verde e cílios.
 for(const d of [-1,1]){
  const x=d*r*.127,y=r*.077,z=r*.222;
  ball(head,r*.062,'#f3d8d0',x,y,z,[1.11,.36,.41]);
  ball(head,r*.034,'#347f60',x+d*r*.005,y,z+r*.031,[.69,.88,.24]);
  ball(head,r*.017,'#141820',x+d*r*.006,y,z+r*.042,[.75,.85,.25]);
  tube(head,[[x-d*r*.057,y+r*.039,z],[x,y+r*.056,z+r*.025],[x+d*r*.055,y+r*.034,z]],r*.013,'#492435');
  tube(head,[[x-d*r*.065,y+r*.109,z-r*.01],[x,y+r*.124,z],[x+d*r*.07,y+r*.105,z-r*.01]],r*.017,'#412338');
  for(let j=0;j<3;j++)tube(head,[[x+d*r*(.03+j*.018),y+r*.041,z+r*.013],[x+d*r*(.045+j*.021),y+r*.069,z+r*.018]],r*.007,'#241020');
 }
 // Nariz com ponte e ponta; lábios curvados.
 const nose=ball(head,r*.049,'#d59b9d',.015*r,-r*.017,r*.249,[.72,1.9,.8]);
 ball(head,r*.049,'#c9798b',.018*r,-r*.117,r*.249,[1.58,.36,.5]);
 ball(head,r*.045,'#ab415f',.018*r,-r*.149,r*.243,[1.45,.26,.48]);
 // cabelo volumoso sobre a testa
 ball(head,r*.29,'#452039',-.035*r,r*.26,-r*.08,[1.05,.55,.57]);
 for(let i=0;i<23;i++){
  const d=i%2?-1:1,t=i/22,side=d*r*(.19+.14*rand(i+31)),top=r*(.32+.17*rand(i+45));
  const tail=-r*(.37+.3*rand(i+9));
  tube(parent,[[side*.3,r*.52,r*.76],[side,top+r*.06,r*.93],
   [side*1.45,r*.13,r*.99],[side*.84,tail,r*.94]],
  r*(.021+.015*rand(i+17)),i%3?'#502343':'#873d61',.07);
 }
 // Braço direito apoiado acima da cabeça, mão e dedos.
 tube(parent,[[r*.38,-r*.40,r*.96],[r*.61,-r*.10,r*.91],[r*.55,r*.43,r*.86],
  [r*.29,r*.64,r*.85]],r*.076,'#d7a3aa');
 const palm=ball(parent,r*.091,'#e3b6b3',r*.27,r*.65,r*.85,[.6,1.1,.35]);
 for(let i=0;i<4;i++)tube(parent,[[r*(.26+i*.022),r*.67,r*.85],
  [r*(.18+i*.026),r*.77,r*.85]],r*.013,'#ddb0af');
 // Gargantilha e broche metálico no peito.
 ring(parent,r*.16,r*.015,'#ffc580',0,0,r*.96,.83).position.y=-r*.23;
 ball(parent,r*.047,'#ffca67',0,-r*.37,r*1.11);
 for(let i=0;i<9;i++){
  const ang=i*2*PI/9;
  rose(parent,Math.cos(ang)*r*.80,Math.sin(ang)*r*.71,r*.69,r*(.125+rand(i)*.07),
    i%2?'#ff74a8':'#b42366');
 }
 ring(parent,r*1.14,r*.016,'#ff42a6',-.25,.18,r*.23,.81);
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
 fragmentShader:"\nuniform float uTime;varying vec2 vUv;\nfloat h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\nreturn mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}\nfloat fbm(vec2 p){float x=0.,a=.55;for(int i=0;i<4;i++){x+=a*n(p);p*=2.03;a*=.49;}return x;}\nvoid main(){\nvec2 uv=vUv, drift=vec2(uTime*.003,0.);\nfloat wide=fbm(uv*vec2(4.7,3.3)+drift),fine=fbm(uv*vec2(13.,7.)-drift*2.);\nfloat cloud=smoothstep(.46,.7,wide*.77+fine*.38);\nfloat redSun=exp(-length((uv-vec2(.77,.80))*vec2(1.23,1.45))*4.7);\nfloat farRed=exp(-length((uv-vec2(.89,.4))*vec2(1.3,1.4))*3.7);\nfloat blue=exp(-length((uv-vec2(.14,.83))*vec2(1.6,1.3))*5.);\nfloat lava=pow(1.-uv.y,2.6);\nvec3 base=vec3(.016,.018,.034);\nbase+=vec3(.16,.024,.039)*(cloud*(.42+redSun*1.7)+farRed*.45);\nbase+=vec3(.2,.024,.008)*redSun*(.21+.6*cloud);\nbase+=vec3(.035,.057,.12)*blue*(.7+.6*fine);\nbase+=vec3(.11,.011,.006)*lava*(.4+cloud*.9);\nfloat shade=smoothstep(.17,.8,wide);\nbase=mix(base,base*.38,shade*.18);\ngl_FragColor=vec4(base,1.);\n}"});
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
function eclipseCitadel(parent,W,H){
 // Silhueta gótica contra o sol vermelho, sem modelos/bitmaps.
 const x=W*.245,y=H*.239,z=-247;
 const dark=mat('#180a10',.18,.9),edge=mat('#41121b',.22,.8);
 mesh(new THREE.BoxGeometry(W*.25,H*.038,14),dark,parent,x,y,z);
 for(let i=0;i<21;i++){
  const t=(i-10)/10,px=x+t*W*.125;
  const h=H*(.052+(1-Math.abs(t))*.09+rand(i+200)*.05);
  mesh(new THREE.CylinderGeometry(4.5,7.5,h,5),dark,parent,px,y+h*.48,z);
  mesh(new THREE.ConeGeometry(10,h*.48,5),edge,parent,px,y+h*.94,z);
 }
}
function borderChains(parent,W,H){
 const geo=new THREE.TorusGeometry(10,3.2,5,12);
 const inst=new THREE.InstancedMesh(geo,mat('#32303a',.48,.73),84),d=new THREE.Object3D();
 const strands=[[[-W*.57,H*.56],[-W*.34,H*.26],28],[[-W*.57,-H*.27],[-W*.25,-H*.61],32],[[W*.57,H*.54],[W*.36,H*.32],24]];
 let idx=0;for(const [a,b,n] of strands){
  const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
  for(let i=0;i<n;i++){const t=i/(n-1);
   d.position.set(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,16);
   d.rotation.set(.28,0,angle+(i%2?PI/2:0));
   d.scale.setScalar(Math.max(.42,H/800));d.updateMatrix();inst.setMatrixAt(idx++,d.matrix);
  }
 }
 inst.instanceMatrix.needsUpdate=true;parent.add(inst);
}
function eclipse(parent,W,H){
 const x=W*.245,y=H*.405,r=H*.094;
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
 // Escultura gótica autoral em ShapeGeometry: anatomia em perfil, capuz,
 // capa, asa de penas individuais e halo. Não usa imagem ou GLB.
 const g=new THREE.Group();g.position.set(-W*.32,H*.315,-136);g.scale.setScalar(.78);parent.add(g);
 const S=H;
 const piece=(outline,color,z,metalness=0)=>{
  const sh=new THREE.Shape();for(const [k,...p] of outline){
   if(k==='M')sh.moveTo(p[0]*S,p[1]*S);
   if(k==='L')sh.lineTo(p[0]*S,p[1]*S);
   if(k==='Q')sh.quadraticCurveTo(...p.map(x=>x*S));
   if(k==='C')sh.bezierCurveTo(...p.map(x=>x*S));
  }
  const o=mesh(new THREE.ShapeGeometry(sh,10),new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.86,metalness}),g,0,0,z);
  return o;
 };
 // Plumas longas sobrepostas em camadas, com nervuras claras.
 for(const side of [-1,1]){
  for(let i=20;i>=0;i--){
   const t=i/20,rootX=side*(.016+t*.022),rootY=-.035+t*.026;
   const tipX=side*(.06+t*.25),tipY=.01+Math.sin(t*2.1)*.22-t*.03;
   piece([['M',rootX,rootY],['Q',side*.13,.11,tipX,tipY],['Q',tipX-side*.012,tipY-.045,rootX,rootY]],
     i%3===0?'#465061':i%3===1?'#273144':'#202a3b',-38-i*.18);
  }
 }
 // Capa caída, ombreira reforçada, mangas, dobra de tecido.
 piece([['M',-.09,-.29],['C',-.13,-.15,-.18,-.01,-.085,.07],['C',-.04,.10,.035,.045,.07,-.025],
        ['C',.10,-.11,.14,-.27,.08,-.30],['L',-.09,-.29]],'#202330',-1);
 piece([['M',-.075,-.28],['Q',-.045,-.15,-.064,-.035],['Q',-.029,-.12,-.013,-.28]],'#434450',.8);
 piece([['M',.056,-.28],['Q',.016,-.14,.064,-.026],['Q',.092,-.11,.087,-.28]],'#12131c',1);
 piece([['M',-.1,.00],['Q',-.14,.055,-.054,.078],['Q',-.04,.04,-.006,.02],['Q',-.08,-.04,-.1,0]],'#50505c',7,.25);
 // Pescoço e perfil facial: nariz, testa, lábios, queixo e capuz escuro.
 piece([['M',-.03,.066],['L',-.024,.121],['Q',-.065,.151,-.043,.195],['Q',.002,.23,.062,.176],
       ['L',.070,.147],['L',.085,.135],['L',.069,.126],['L',.074,.106],
       ['Q',.052,.073,.024,.068],['L',-.03,.066]],'#967670',8);
 piece([['M',-.067,.151],['Q',-.074,.242,-.002,.252],['Q',.082,.225,.093,.165],
       ['Q',.046,.204,-.006,.17],['Q',-.037,.133,-.043,.084],['L',-.067,.151]],'#20202d',11);
 piece([['M',-.054,.109],['Q',-.028,.054,.006,.062],['Q',.009,.122,-.019,.155],['L',-.054,.109]],'#313440',13);
 piece([['M',.02,.149],['L',.061,.152],['L',.054,.147],['L',.02,.149]],'#e0c5a7',13);
 // Mão diante do peito, em prece.
 piece([['M',.09,.0],['Q',.17,.027,.142,.072],['Q',.102,.09,.065,.012],['L',.09,.0]],'#a18279',14);
 // Halo atrás da cabeça, inclinado.
 const halo=ring(g,S*.072,S*.003,'#eac187',.22,-.15,-40,.89);halo.position.set(-S*.012,S*.198,-40);
 return g;
}
function infernalGround(parent,W,H){
 // Rachaduras Voronoi entre placas rochosas (não linhas senoides artificiais).
 const material=new THREE.ShaderMaterial({depthWrite:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:"varying vec2 vUv;\nfloat h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\nreturn mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}\nfloat crack(vec2 p){\n vec2 ip=floor(p),fp=fract(p);float d1=10.,d2=10.;\n for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){\n  vec2 o=vec2(float(i),float(j)),cell=ip+o;\n  vec2 seed=o+vec2(h(cell),h(cell+13.1))*.74+.13;\n  float d=length(seed-fp);\n  if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;\n }\n return max(0.,d2-d1);\n}\nvoid main(){\n vec2 uv=vUv;\n float f=n(uv*vec2(11.,4.)),detail=n(uv*vec2(41.,13.));\n vec2 warp=uv*vec2(20.,6.)+vec2(f,detail)*.58;\n float e=crack(warp);\n float gap=1.-smoothstep(.018,.09,e);\n float ridge=detail*.58+f*.42;\n vec3 stone=mix(vec3(.016,.010,.014),vec3(.075,.027,.029),ridge);\n stone+=vec3(.028,.008,.011)*n(uv*vec2(89.,17.));\n float glow=gap*(.34+.66*n(uv*vec2(7.,3.)))*(.52+pow(1.-uv.y,1.6)*.48);\n vec3 lava=vec3(.82,.11,.025)*glow+vec3(.4,.09,.025)*pow(glow,3.);\n vec3 col=stone+lava;\n col*=.8+.2*n(uv*vec2(5.,2.));\n gl_FragColor=vec4(col,1.);\n}"});
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
 gothicRuins(scene,W,H);infernalGround(scene,W,H);eclipse(scene,W,H);eclipseCitadel(scene,W,H);borderChains(scene,W,H);angel(scene,W,H);starfield(scene,W,H);
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
