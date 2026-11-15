/** Eldória — NPCs Meshy recentes, sem Npc.glb, NpcEspecial ou personagens procedurais. */
export const ELDORIA_NPC_MODELS=Object.freeze({
 man:'NPC_Masculino_Animado_Otimizado_1K.glb',
 woman:'MulherNpc-otimizado.glb',
 boy:'CriancaNpc-otimizado.glb',
 girl:'MeninaNpc-otimizado.glb',
 maleHair:'Cabelo-otimizado.glb',
 femaleHair:'CabeloMulher-otimizado.glb'
});
export const ELDORIA_NPC_ROLES=Object.freeze([
 {role:'vendedor-idoso',sex:'man',job:'organiza provisoes com dificuldade'},
 {role:'vendedor-meia-idade',sex:'man',job:'vigia alimentos e conversa'},
 {role:'vendedora-meia-idade',sex:'woman',job:'separa os frutos ainda aproveitaveis'},
 {role:'morador-desmaiado',sex:'man',job:'sem forcas junto a uma casa'},
 {role:'moradora-desmaiada',sex:'woman',job:'desmaiada longe da passagem'},
 {role:'morador-sentado',sex:'man',job:'descansa sem forcas perto da praca'},
 {role:'moradora-caminhando',sex:'woman',job:'caminha lentamente em busca de ajuda'}
]);
/** Caixa REAL da malha deformada pelo esqueleto. Box3.setFromObject sozinho
 * subestima ou superestima GLBs Meshy com rig importado. */
export function measureMeshyNpcBounds(THREE,root){
 root.updateMatrixWorld(true);
 const box=new THREE.Box3();box.makeEmpty();
 const vertex=new THREE.Vector3();
 root.traverse(obj=>{
  if(!obj.isMesh||!obj.visible||!obj.geometry)return;
  const pos=obj.geometry.attributes&&obj.geometry.attributes.position;
  const boneFn=obj.applyBoneTransform||obj.boneTransform;
  if(obj.isSkinnedMesh&&obj.skeleton&&pos&&typeof boneFn==='function'){
   obj.skeleton.update();
   for(let i=0;i<pos.count;i++){
    vertex.fromBufferAttribute(pos,i);
    boneFn.call(obj,i,vertex);
    vertex.applyMatrix4(obj.matrixWorld);
    if(Number.isFinite(vertex.x)&&Number.isFinite(vertex.y)&&Number.isFinite(vertex.z))box.expandByPoint(vertex);
   }
  }else{
   if(!obj.geometry.boundingBox)obj.geometry.computeBoundingBox();
   if(obj.geometry.boundingBox)box.union(obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld));
  }
 });
 return box;
}
/** Localiza a cabeça pela geometria deformada (não pelos ossos com pivôs deslocados). */
function crownOfMeshy(THREE,root,bounds){
 const top=bounds.max.y,h=bounds.getSize(new THREE.Vector3()).y,mid=bounds.getCenter(new THREE.Vector3());
 const from=top-Math.min(.25,h*.22);
 const p=new THREE.Vector3();let sumX=0,sumZ=0,n=0;
 root.updateMatrixWorld(true);
 root.traverse(o=>{
  if(!o.isMesh||!o.visible||!o.geometry?.attributes?.position)return;
  const arr=o.geometry.attributes.position,skin=o.applyBoneTransform||o.boneTransform;
  if(o.isSkinnedMesh&&o.skeleton)o.skeleton.update();
  const skip=Math.max(1,Math.floor(arr.count/8000));
  for(let i=0;i<arr.count;i+=skip){
   p.fromBufferAttribute(arr,i);
   if(o.isSkinnedMesh&&typeof skin==='function')skin.call(o,i,p);
   p.applyMatrix4(o.matrixWorld);
   if(p.y<from||p.y>top+.02||Math.abs(p.x-mid.x)>.45||Math.abs(p.z-mid.z)>.45)continue;
   sumX+=p.x;sumZ+=p.z;n++;
  }
 });
 return n>=3?{x:sumX/n,z:sumZ/n}:{x:mid.x,z:mid.z};
}
/* ===================== NPCs vivos (Mod 318+): cabelo encaixado no crânio, cores, barba e olhar ===================== */
/** Cores de cabelo plausíveis: [tom escuro, tom claro] para o mapa de gradiente sobre a luminância da textura original. */
export const ELDORIA_HAIR_COLORS=Object.freeze({
 preto:[0x0b0a09,0x2b2622],castanho:[0x1d120b,0x5a3b24],castanhoClaro:[0x2f1e12,0x8a643f],ruivo:[0x3a1408,0xa4502a],
 loiro:[0x5a4426,0xd8bf86],grisalho:[0x4a4744,0xc9c6c0],branco:[0x7b7874,0xe9e6e1]
});
const HEAD_BONE=/^(head|headend|headfront)$/i;
/** Vértices da malha ancorados à cabeça (peso ≥ .5 nos ossos da cabeça), já deformados pela pose, em mundo. */
export function meshyHeadVertices(THREE,model){
 const out=[],v=new THREE.Vector3();model.updateMatrixWorld(true);
 model.traverse(o=>{if(!o.isSkinnedMesh||!o.geometry?.attributes?.skinIndex)return;o.skeleton.update();
  const ids=new Set();o.skeleton.bones.forEach((b,i)=>{if(HEAD_BONE.test(b.name))ids.add(i);});
  const P=o.geometry.attributes.position,SI=o.geometry.attributes.skinIndex,SW=o.geometry.attributes.skinWeight;
  for(let i=0;i<P.count;i++){const w=(ids.has(SI.getX(i))?SW.getX(i):0)+(ids.has(SI.getY(i))?SW.getY(i):0)+(ids.has(SI.getZ(i))?SW.getZ(i):0)+(ids.has(SI.getW(i))?SW.getW(i):0);
   if(w<.5)continue;v.fromBufferAttribute(P,i);o.applyBoneTransform(i,v);v.applyMatrix4(o.matrixWorld);out.push(v.x,v.y,v.z);}});
 return out;
}
/** Referencial da cabeça: centro, eixo frontal (Head → headfront, no plano), raios, coroa, nariz e queixo. */
export function meshyHeadFrame(THREE,model,headPts){
 let head=null,front=null;model.traverse(o=>{if(!o.isBone)return;if(!head&&/^head$/i.test(o.name))head=o;if(!front&&/^headfront$/i.test(o.name))front=o;});
 const n=headPts.length/3;if(n<30)return null;
 let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;for(let i=0;i<n;i++){const x=headPts[i*3],y=headPts[i*3+1],z=headPts[i*3+2];x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);z0=Math.min(z0,z);z1=Math.max(z1,z);}
 const c=new THREE.Vector3((x0+x1)/2,(y0+y1)/2,(z0+z1)/2),f=new THREE.Vector3(0,0,1);
 if(head&&front){const a=head.getWorldPosition(new THREE.Vector3()),b=front.getWorldPosition(new THREE.Vector3());f.set(b.x-a.x,0,b.z-a.z);}
 if(f.lengthSq()<1e-8){const q=new THREE.Quaternion();model.getWorldQuaternion(q);f.set(0,0,1).applyQuaternion(q).setY(0);}
 f.normalize();const r=new THREE.Vector3(f.z,0,-f.x);
 // coordenadas (u lateral, v vertical, w frontal) relativas ao centro
 const U=new Float32Array(n),V=new Float32Array(n),W=new Float32Array(n);let ru=0,rw=0,wMax=-1e9,noseV=0;
 for(let i=0;i<n;i++){const dx=headPts[i*3]-c.x,dy=headPts[i*3+1]-c.y,dz=headPts[i*3+2]-c.z;U[i]=dx*r.x+dz*r.z;V[i]=dy;W[i]=dx*f.x+dz*f.z;ru=Math.max(ru,Math.abs(U[i]));rw=Math.max(rw,Math.abs(W[i]));if(W[i]>wMax){wMax=W[i];noseV=V[i];}}
 let chinV=1e9;for(let i=0;i<n;i++)if(W[i]>wMax*.35&&Math.abs(U[i])<.03)chinV=Math.min(chinV,V[i]);
 return {c,f,r,U,V,W,n,ru,rv:(y1-y0)/2,rw,crownV:y1-c.y,noseV,chinV:chinV<1e8?chinV:-(y1-y0)/2,wMax,head,front};
}
/** Encaixes de cabelo PRÉ-CALCULADOS (fitMeshyHair completo, medido no próprio GLB; chave corpo|cabelo|estilo).
 *  A busca completa custa 1,5–5 s de CPU por combinação (≈6 mil passos) e travava o celular ao chegar à vila; em jogo
 *  só se lê esta tabela. Combinação nova cai na busca grossa (≈100× mais barata) e avisa no console para medir aqui. */
export const ELDORIA_HAIR_FITS=Object.freeze({
 'NPC_Masculino_Animado_Otimizado_1K.glb|Cabelo-otimizado.glb|short':{S:.2558,dy:.05,dw:-.03,tilt:0,hcx:0,hcz:0,hy1:.8276},
 'MulherNpc-otimizado.glb|CabeloMulher-otimizado.glb|long':{S:.3204,dy:.05,dw:-.035,tilt:0,hcx:.0053,hcz:.001,hy1:.9438},
 'CriancaNpc-otimizado.glb|Cabelo-otimizado.glb|short':{S:.2508,dy:.05,dw:-.03,tilt:0,hcx:0,hcz:0,hy1:.8276},
 'MeninaNpc-otimizado.glb|CabeloMulher-otimizado.glb|long':{S:.2968,dy:.05,dw:-.035,tilt:0,hcx:.0053,hcz:.001,hy1:.9438}
});
/** Busca o encaixe do cabelo no crânio: escala, altura e recuo que cobrem o couro cabeludo sem entrar na cabeça nem
 *  cobrir os olhos. hair: pontos locais (x,y,z) do GLB de cabelo; devolve {S,dy,dw,score,coverage,penetration}. */
export function fitMeshyHair(F,hair,{female=false,coarse=false}={}){
 if(coarse&&hair.length>2400){const k=Math.ceil(hair.length/3/800),h=[];for(let i=0;i<hair.length/3;i+=k)h.push(hair[i*3],hair[i*3+1],hair[i*3+2]);hair=h;} // ≤800 pontos
 const hn=hair.length/3;let hx0=1e9,hx1=-1e9,hy1=-1e9,hz0=1e9,hz1=-1e9,hy0=1e9;
 for(let i=0;i<hn;i++){const x=hair[i*3],y=hair[i*3+1],z=hair[i*3+2];hx0=Math.min(hx0,x);hx1=Math.max(hx1,x);hy0=Math.min(hy0,y);hy1=Math.max(hy1,y);hz0=Math.min(hz0,z);hz1=Math.max(hz1,z);}
 const hcx=(hx0+hx1)/2,hcz=(hz0+hz1)/2,capY=hy1-(hy1-hy0)*.3;let cw=0;for(let i=0;i<hn;i++)if(hair[i*3+1]>capY)cw=Math.max(cw,Math.abs(hair[i*3]-hcx));cw=Math.max(cw*2,1e-4);
 // couro cabeludo: metade de cima da cabeça, fora do rosto
 const scalp=[];for(let i=0;i<F.n;i++){const front=F.W[i]>F.rw*.45;if(F.V[i]>-.005&&!(front&&F.V[i]<F.crownV-.045))scalp.push(i);}
 const eyeV=F.noseV+.032,base=F.ru*2*1.12/cw,cell=.02;let best=null;
 const ex=F.ru*.93,ey=F.rv*.93,ez=F.rw*.9,cy=0;
 const sStep=coarse?3:1,yStep=coarse?2:1,wStep=coarse?2:1;
 for(const tilt of (female||coarse?[0]:[0,-.1,-.2,-.3]))for(let si=0;si<13;si+=sStep){const S=base*(.64+si*.06),ct=Math.cos(tilt),st=Math.sin(tilt);
  // inclinação para trás (franja sobe, nuca desce), em torno do topo do cabelo
  const P=new Float32Array(hn*3);for(let i=0;i<hn;i++){const y=(hair[i*3+1]-hy1)*S,z=(hair[i*3+2]-hcz)*S;P[i*3]=(hair[i*3]-hcx)*S;P[i*3+1]=y*ct+z*st;P[i*3+2]=-y*st+z*ct;}
  for(let dyi=0;dyi<=16;dyi+=yStep){const dy=-.11+dyi*.01;
   for(let dwi=0;dwi<=(female?7:6);dwi+=wStep){const dw=(female?-.045:-.03)+dwi*.01,vt=F.crownV+dy;
    const grid=new Map();let pen=0,eye=0;
    for(let i=0;i<hn;i++){const u=P[i*3],v=vt+P[i*3+1],w=P[i*3+2]+dw;
     if((u/ex)**2+((v-cy)/ey)**2+(w/ez)**2<1)pen++;
     if(w>F.rw*.5&&Math.abs(u)<.06&&v>eyeV-.022&&v<eyeV+.03)eye++;
     const k=Math.floor(u/cell)+','+Math.floor(v/cell)+','+Math.floor(w/cell);let a=grid.get(k);if(!a){a=[];grid.set(k,a);}a.push(u,v,w);}
    let cov=0;for(const j of scalp){const u=F.U[j],v=F.V[j],w=F.W[j],gu=Math.floor(u/cell),gv=Math.floor(v/cell),gw=Math.floor(w/cell);let hit=false;
     for(let a=-1;a<=1&&!hit;a++)for(let b=-1;b<=1&&!hit;b++)for(let c2=-1;c2<=1&&!hit;c2++){const L=grid.get((gu+a)+','+(gv+b)+','+(gw+c2));if(!L)continue;for(let q=0;q<L.length;q+=3){const d=(L[q]-u)**2+(L[q+1]-v)**2+(L[q+2]-w)**2;if(d<.022*.022){hit=true;break;}}}
     if(hit)cov+=(Math.abs(u)>F.ru*.6?2:1);}
    let wsum=0;for(const j of scalp)wsum+=Math.abs(F.U[j])>F.ru*.6?2:1;const coverage=cov/Math.max(1,wsum),penetration=pen/hn,score=coverage-3*penetration-(female?8:14)*eye/hn-(female?0:.6*Math.abs(dw)+.35*Math.max(0,S/base-1.25));
    if(!best||score>best.score)best={S,dy,dw,tilt,score,coverage,penetration,eye:eye/hn,hcx,hcz,hy1};}}}
 return best;
}
/** Cabelo com cor própria: material clonado por NPC, mapa de gradiente sobre a luminância da textura (mantém fios). */
export function tintMeshyHair(THREE,root,color){
 const pal=ELDORIA_HAIR_COLORS[color];if(!pal)return;
 root.traverse(o=>{if(!o.isMesh)return;const m=o.material.clone();const dark=new THREE.Color(pal[0]),light=new THREE.Color(pal[1]);
  m.onBeforeCompile=sh=>{sh.uniforms.uHairDark={value:dark};sh.uniforms.uHairLight={value:light};
   sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 uHairDark;uniform vec3 uHairLight;')
    .replace('#include <map_fragment>','#include <map_fragment>\n{float l=dot(diffuseColor.rgb,vec3(.299,.587,.114));diffuseColor.rgb=mix(uHairDark,uHairLight,smoothstep(.0,.32,l));}');};
  m.customProgramCacheKey=()=>'cabelo-gradiente';o.material=m;});
}
const smoothstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Casca presa ao esqueleto: os triângulos da PRÓPRIA malha numa região do rosto/crânio, deslocados pela normal.
 *  Encaixa na anatomia real e acompanha cabeça, olhar e respiração (mesmos ossos e pesos); não flutua.
 *  maskFn(u,v,w) → 0..1 em coordenadas da cabeça (lateral, vertical, frontal), com bordas suaves. */
function makeMeshyShell(THREE,model,F,maskFn,{thick,color,alpha=1,name,depthWrite=true}){
 let body=null;model.traverse(o=>{if(!body&&o.isSkinnedMesh)body=o;});if(!body||!F)return null;
 const geo=body.geometry,P=geo.attributes.position,N=geo.attributes.normal,SI=geo.attributes.skinIndex,SW=geo.attributes.skinWeight,idx=geo.index;
 if(!N||!idx)return null;
 const ids=new Set();body.skeleton.bones.forEach((b,i)=>{if(HEAD_BONE.test(b.name))ids.add(i);});
 const v=new THREE.Vector3(),mask=new Float32Array(P.count);let i0=-1,i1=-1,best=-1;
 for(let i=0;i<P.count;i++){const hw=(ids.has(SI.getX(i))?SW.getX(i):0)+(ids.has(SI.getY(i))?SW.getY(i):0)+(ids.has(SI.getZ(i))?SW.getZ(i):0)+(ids.has(SI.getW(i))?SW.getW(i):0);
  if(hw<.35)continue;v.fromBufferAttribute(P,i);body.applyBoneTransform(i,v);v.applyMatrix4(body.matrixWorld);
  const dx=v.x-F.c.x,dy=v.y-F.c.y,dz=v.z-F.c.z;mask[i]=maskFn(dx*F.r.x+dz*F.r.z,dy,dx*F.f.x+dz*F.f.z);
  if(mask[i]>0){if(i0<0)i0=i;else{const d=Math.abs(dy)+Math.abs(dx);if(d>best){best=d;i1=i;}}}}
 if(i0<0||i1<0)return null;
 // escala espaço de ligação → mundo (a armadura Meshy é escalada): razão entre dois vértices da região
 const a=new THREE.Vector3().fromBufferAttribute(P,i0),b=new THREE.Vector3().fromBufferAttribute(P,i1),bind=a.distanceTo(b);
 body.applyBoneTransform(i0,a);body.applyBoneTransform(i1,b);a.applyMatrix4(body.matrixWorld);b.applyMatrix4(body.matrixWorld);
 const tb=thick/Math.max(1e-6,a.distanceTo(b)/Math.max(1e-6,bind));
 const remap=new Int32Array(P.count).fill(-1),pos=[],nor=[],si=[],sw=[],col=[],out=[],cd=new THREE.Color(color[0]),cl=new THREE.Color(color[1]);
 const add=i=>{if(remap[i]>=0)return remap[i];remap[i]=pos.length/3;const m=mask[i],t=tb*m;
  pos.push(P.getX(i)+N.getX(i)*t,P.getY(i)+N.getY(i)*t,P.getZ(i)+N.getZ(i)*t);nor.push(N.getX(i),N.getY(i),N.getZ(i));
  si.push(SI.getX(i),SI.getY(i),SI.getZ(i),SI.getW(i));sw.push(SW.getX(i),SW.getY(i),SW.getZ(i),SW.getW(i));
  const j=((Math.sin(i*12.9898)*43758.5453)%1+1)%1,c=cd.clone().lerp(cl,.12+.22*j);col.push(c.r,c.g,c.b,smoothstep(0,.55,m)*alpha);return remap[i];};
 // triângulos com QUALQUER vértice na região: a borda vira degradê (alfa e espessura 0 fora), sem serrilhado de triângulos
 for(let t=0;t<idx.count;t+=3){const x=idx.getX(t),y=idx.getX(t+1),z=idx.getX(t+2);if(mask[x]<=0&&mask[y]<=0&&mask[z]<=0)continue;out.push(add(x),add(y),add(z));}
 if(out.length<30)return null;
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));g.setAttribute('color',new THREE.Float32BufferAttribute(col,4));g.setIndex(out);
 const mat=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,roughness:.95,metalness:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,depthWrite});
 // fios: ruído fino alongado na vertical (coordenadas de ligação), quebra a cor e desfia a borda — sem textura extra
 const fs=.004/Math.max(1e-6,tb/Math.max(1e-6,thick));
 mat.onBeforeCompile=sh=>{sh.uniforms.uFio={value:1/Math.max(1e-6,fs)};
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFio;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFio=position;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFio;uniform float uFio;float fioH(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}')
   .replace('#include <color_fragment>','#include <color_fragment>\n{vec3 q=vFio*uFio;float n=fioH(floor(vec2(q.x*2.3+q.z*1.7,q.y*.35)));diffuseColor.rgb*=.72+.5*n;diffuseColor.a*=mix(.55+.45*n,1.,smoothstep(.35,.9,diffuseColor.a));}');};
 mat.customProgramCacheKey=()=>'casca-fios';
 const shell=new THREE.SkinnedMesh(g,mat);shell.name=name;shell.bind(body.skeleton,body.bindMatrix);shell.frustumCulled=false;shell.castShadow=false;shell.renderOrder=1;
 body.parent.add(shell);shell.position.copy(body.position);shell.quaternion.copy(body.quaternion);shell.scale.copy(body.scale);
 return shell;
}
/** Barba (só a região do queixo, mandíbula e bigode; a boca fica livre).
 *  style: 'stubble' (sombra de barba) | 'short' | 'full' (desce sob o queixo). */
export function makeMeshyBeard(THREE,model,F,style,color){
 if(!F)return null;const mouthV=F.noseV-.45*(F.noseV-F.chinV),pal=ELDORIA_HAIR_COLORS[color]||ELDORIA_HAIR_COLORS.castanho;
 const mask=(u,v,w)=>{const au=Math.abs(u),top=F.noseV-.013+.03*Math.min(1,Math.max(0,(au-.03)/.05));
  let m=smoothstep(top+.006,top-.006,v)*smoothstep(-.045,-.01,w)*smoothstep(F.chinV-.045,F.chinV-.02,v);
  if(style!=='full')m*=smoothstep(F.chinV-.03,F.chinV-.012,v);
  if(au<.027&&Math.abs(v-mouthV)<.0075)m=0;return m;};
 return makeMeshyShell(THREE,model,F,mask,{thick:{stubble:.0016,short:.0045,full:.009}[style]||.004,color:pal,alpha:style==='stubble'?.6:1,name:'BarbaMeshy-'+style,depthWrite:style!=='stubble'});
}
/** Base de cabelo no couro cabeludo (sob o GLB de cabelo, ou sozinha como cabelo raspado/careca grisalho):
 *  fecha as falhas entre mechas que deixavam a pele clara aparecer. style: 'base' | 'buzz' | 'balding'. */
export function makeMeshyScalp(THREE,model,F,style,color){
 if(!F)return null;const pal=ELDORIA_HAIR_COLORS[color]||ELDORIA_HAIR_COLORS.castanho,eyeV=F.noseV+.032;
 const mask=(u,v,w)=>{const fw=w/F.rw;
  // linha do cabelo: alta na testa, desce até a orelha nas laterais e até a nuca atrás
  const line=fw>.25?eyeV+.066+.01*fw:fw>-.2?eyeV+.02-.03*(.25-fw):F.noseV-.03;
  let m=smoothstep(line-.002,line+.014,v);
  if(Math.abs(u)>F.ru*.82&&fw>-.1&&v<eyeV+.03)m=0; // orelhas livres
  if(style==='balding')m*=Math.max(smoothstep(F.crownV-.035,F.crownV-.065,v),smoothstep(-.05,-.25,fw)); // topo calvo, coroa de cabelo nas laterais e atrás
  return Math.min(1,m);};
 return makeMeshyShell(THREE,model,F,mask,{thick:style==='base'?.0025:.002,color:pal,alpha:style==='buzz'?.85:style==='balding'?.7:1,name:'CouroCabeludoMeshy-'+style});
}
/** Compartilha downloads entre instâncias. Nenhuma malha substituta por código se o GLB falhar. */
export function createMeshyNpcFactory({THREE,GLTFLoader,cloneSkinned,groundHeightAt}){
 const loader=new GLTFLoader(),cache=new Map(),fitCache=new Map();
 const load=file=>{
  if(!cache.has(file))cache.set(file,new Promise((resolve,reject)=>loader.load('./'+file,resolve,undefined,reject)));
  return cache.get(file);
 };
 const clipFor=(clips,role)=> {
  const tests=role==='walk'?[/walk/i,/idle|breath/i]:role==='down'?[/side.?lying|falling.?down|knock.?down|lie|sleep|dead|down/i,/idle|breath/i]:role==='sit'?[/sit|sitting|rest/i,/arise/i,/idle|breath/i]:[/idle|breath|stand/i];
  for(const re of tests){const found=clips.find(c=>re.test(c.name)&&!/(attack|combat|sword)/i.test(c.name));if(found)return found;}
  return null;
 };
 async function create({sex,age='adult',role='idle',x,z,yaw=0,hair=true,hairToHead=true,look={}}){
  const file=ELDORIA_NPC_MODELS[sex];if(!file)throw Error('NPC Meshy desconhecido: '+sex);
  const gltf=await load(file),src=cloneSkinned(gltf.scene),box=measureMeshyNpcBounds(THREE,src);
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  if(size.y<.01||!Number.isFinite(size.y))throw Error('Altura NPC invalida: '+file);
  const target=sex==='boy'||sex==='girl'?1.18:age==='elder'?1.57:1.72;
  const k=target/size.y,holder=new THREE.Group(),body=new THREE.Group();
  // Normaliza dimensoes mantendo rig e clips no mesmo espaço local.
  src.scale.setScalar(k);src.position.set(-center.x*k,-box.min.y*k,-center.z*k);
  body.add(src);holder.add(body);holder.name='NPC-Meshy-'+sex+'-'+role;
  holder.position.set(x,groundHeightAt(x,z),z);holder.rotation.y=yaw;
  const nativeDown=role==='down'&&(gltf.animations||[]).some(c=>/side.?lying|falling.?down|knock.?down|sleep|lying/i.test(c.name));
  if(role==='down'&&!nativeDown){
   body.rotation.z=(sex==='woman'||sex==='girl'?-1:1)*Math.PI/2;
   body.rotation.x=.12;
   holder.updateMatrixWorld(true);
   const lying=measureMeshyNpcBounds(THREE,holder);
   body.position.y+=groundHeightAt(x,z)-lying.min.y+.035;
  }
  if(role==='sit'){
   body.rotation.x=-.14;
   holder.updateMatrixWorld(true);
   const sitting=measureMeshyNpcBounds(THREE,holder);
   body.position.y+=groundHeightAt(x,z)-sitting.min.y+.025;
  }
  src.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
  const nativeClips=gltf.animations||[];
  // Em alguns GLBs só há Walking/Running: evitar a pose rígida em T.
  const clip=clipFor(nativeClips,role)||nativeClips.find(c=>/walking/i.test(c.name))||null;
  const mixer=clip?new THREE.AnimationMixer(src):null;
  const action=mixer?mixer.clipAction(clip):null;
  if(action){
   action.play();
   if(role==='idle'||role==='sit'||role==='down'){
    // Captura uma pose natural do clipe, mas não anima caminhada parado.
    const fraction=role==='down'&&nativeDown?.90:role==='sit'?.32:.28;
    mixer.update(Math.min(Math.max(clip.duration*fraction,.08),Math.max(.55,clip.duration*.95)));
    action.paused=true;
   }
  }
  // Mod 318 — cabelo encaixado no CRÂNIO real (vértices presos ao osso Head na pose atual), por busca de escala,
  // altura e recuo que cobrem o couro cabeludo sem entrar na cabeça nem cobrir os olhos; depois preso ao osso Head
  // (attach preserva o encaixe medido), então acompanha olhar, caminhada e todos os clipes. Antes: topo da caixa do
  // corpo − 15 cm e preso ao corpo → cabelo longo "em pé" acima da cabeça e cabelo parado quando a cabeça girava.
  const female=sex==='woman'||sex==='girl',style=look.hair||(female?'long':'short');
  let headFrame=null;
  if(hair&&role!=='down'&&(style==='short'||style==='long')){
   const hairFile=style==='long'?ELDORIA_NPC_MODELS.femaleHair:ELDORIA_NPC_MODELS.maleHair;
   try{
    holder.updateMatrixWorld(true);
    headFrame=meshyHeadFrame(THREE,src,meshyHeadVertices(THREE,src));
    const hairGltf=await load(hairFile),hairScene=hairGltf.scene.clone(true);
    const key=file+'|'+hairFile+'|'+style;let fit=fitCache.get(key)||ELDORIA_HAIR_FITS[key]||null;
    if(!fit){const pts=[],v=new THREE.Vector3();hairScene.updateMatrixWorld(true);
     hairScene.traverse(o=>{if(!o.isMesh)return;const P=o.geometry.attributes.position,st=Math.max(1,Math.floor(P.count/2500));for(let i=0;i<P.count;i+=st){v.fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld);pts.push(v.x,v.y,v.z);}});
     console.warn('Encaixe de cabelo sem tabela (busca grossa em tempo de jogo):',key);
     fit=headFrame?fitMeshyHair(headFrame,pts,{female:style==='long',coarse:true}):null;fitCache.set(key,fit);}
    if(fit&&headFrame){
     const accessory=new THREE.Group();accessory.name='CabeloMeshy';accessory.userData.fit=fit;
     hairScene.position.set(-fit.hcx,-fit.hy1,-fit.hcz);accessory.add(hairScene);
     if(look.hairColor)tintMeshyHair(THREE,hairScene,look.hairColor);
     const F=headFrame,pos=F.c.clone().addScaledVector(F.f,fit.dw);pos.y+=F.crownV+fit.dy;
     accessory.position.copy(pos);accessory.rotation.set(fit.tilt||0,Math.atan2(F.f.x,F.f.z),0,'YXZ');accessory.scale.setScalar(fit.S);accessory.updateMatrixWorld(true);
     if(F.head)F.head.attach(accessory);else holder.attach(accessory);
    }
   }catch(e){console.warn('Cabelo não foi aplicado:',hairFile,e);}
  }
  // base de cabelo no couro cabeludo: sob o cabelo curto (fecha as falhas entre mechas) e nos estilos raspado/calvo
  if(role!=='down'&&hair&&(style==='short'||style==='buzz'||style==='balding')){
   try{holder.updateMatrixWorld(true);headFrame=headFrame||meshyHeadFrame(THREE,src,meshyHeadVertices(THREE,src));makeMeshyScalp(THREE,src,headFrame,style==='short'?'base':style,look.hairColor||'preto');}catch(e){console.warn('Couro cabeludo não aplicado',e);}
  }
  // barba por casca da própria malha do rosto (só homens adultos/idosos)
  if(look.beard&&look.beard!=='none'&&sex==='man'&&role!=='down'){
   try{holder.updateMatrixWorld(true);const F=headFrame||meshyHeadFrame(THREE,src,meshyHeadVertices(THREE,src));makeMeshyBeard(THREE,src,F,look.beard,look.beardColor||look.hairColor||'castanho');}catch(e){console.warn('Barba não aplicada',e);}
  }
  // O corpo já foi normalizado antes do cabelo. Nunca redimensionar o CORPO
  // para compensar a altura de um acessório: foi a causa da regressão anterior.
  holder.updateMatrixWorld(true);
  let finalBox=measureMeshyNpcBounds(THREE,holder);
  if(finalBox.isEmpty())throw Error('NPC sem geometria visível: '+file);
  const dimensions=finalBox.getSize(new THREE.Vector3());
  if(Math.max(dimensions.x,dimensions.y,dimensions.z)>3.0)
   throw Error('Dimensões anormais do NPC '+file+' ('+dimensions.toArray()+')');
  const base=groundHeightAt(x,z);
  holder.position.y+=base-finalBox.min.y+.015;
  // Centralização horizontal após a pose real, importante para quem está deitado.
  const pivot=finalBox.getCenter(new THREE.Vector3());
  holder.position.x+=x-pivot.x;holder.position.z+=z-pivot.z;
  holder.updateMatrixWorld(true);
  finalBox=measureMeshyNpcBounds(THREE,holder);
  return {holder,mixer,action,role,file,animations:nativeClips,model:src,actualHeight:finalBox.getSize(new THREE.Vector3()).y,hair:hair&&(style==='short'||style==='long')?(style==='long'?ELDORIA_NPC_MODELS.femaleHair:ELDORIA_NPC_MODELS.maleHair):null,look,clips:nativeClips.map(c=>c.name)};
 }
 return {create};
}
