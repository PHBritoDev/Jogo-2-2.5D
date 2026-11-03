/**
 * Mod 276 — Asas do Vhazrael: anatomia de plumas escuras, silhueta arqueada,
 * primárias compridas e recurvadas, violeta somente nas bordas.
 * Referência: imagem enviada pelo criador, asas de anjo sombrio sob céu cósmico.
 *
 * Substitui as antigas lâminas de fumaça do efeito de espada.
 * 3D real: superfície com curvatura Z, plumas individualmente trianguladas
 * em UMA geometria por asa/LOD e nervura tubular contínua.
 * Nenhum sprite, textura copiada, billboard de penas ou fumaça genérica.
 * O modelo GLB, a espada, o combate e os outros bispos não são alterados.
 */
export const VHAZRAEL_WINGS_BUILD='276-feathered-black-violet';
export const WING_LOD=Object.freeze({high:{primary:18,secondary:9},low:{primary:11,secondary:6}});
const sat=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const ease=x=>{x=sat(x);return x*x*(3-2*x)};
const anchors=[
  [.55,2.3,.25],[2.65,6.8,.15],[5.3,9.8,-.5],
  [9.5,8.65,-.8],[13.8,4.1,-.5],
  [16.0,-2.6,.35],[14.1,-11.5,.7]
];
/** Catmull-Rom, espelhada; não cria duas asas com a mesma orientação. */
export function wingSkeleton(u,side=1){
 u=sat(u); const t=u*(anchors.length-1),i=Math.min(anchors.length-2,Math.floor(t)),f=t-i;
 const a=anchors[Math.max(0,i-1)],b=anchors[i],
   c=anchors[i+1],d=anchors[Math.min(anchors.length-1,i+2)];
 const f2=f*f,f3=f2*f;
 const h=(k)=>.5*((2*b[k])+(-a[k]+c[k])*f+
   (2*a[k]-5*b[k]+4*c[k]-d[k])*f2+
   (-a[k]+3*b[k]-3*c[k]+d[k])*f3);
 return {x:h(0)*(side<0?-1:1),y:h(1),z:h(2)};
}
function wingOutline(u,side){
 const P=wingSkeleton(u,side),a=wingSkeleton(Math.max(0,u-.004),side),
   b=wingSkeleton(Math.min(1,u+.004),side);
 const dx=(b.x-a.x)*(side<0?-1:1),dy=b.y-a.y;
 const len=Math.max(.001,Math.hypot(dx,dy)),s=side<0?-1:1;
 return {point:P,normal:{x:s*dy/len,y:-dx/len},
   width:(.55+1.82*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.8))*(.84+.16*(1-u))};
}
function bufferGeo(T,positions,uv,colors,indices){
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 g.setIndex(indices);g.computeVertexNormals();return g;
}
function wingBody(T,side,low){
 const xyz=[],uv=[],colors=[],idx=[],NX=low?19:40,NY=low?3:5;
 for(let i=0;i<=NX;i++){
  const u=i/NX,P=wingOutline(u,side);
  for(let j=0;j<=NY;j++){
   const v=j/NY,w=P.width*(.05+v*1.3),n=P.normal;
   xyz.push(P.point.x+n.x*w,P.point.y+n.y*w,
     P.point.z-.16*v+.21*Math.sin(Math.PI*v)*Math.sin(u*6));
   uv.push(u,v);
   const rim=(1-ease(v/.19))*.62+ease((v-.81)/.19)*.27;
   const r=.016+.052*rim,g=.011+.028*rim,b=.03+.13*rim;
   colors.push(r,g,b);
   if(i<NX&&j<NY){const a=i*(NY+1)+j,d=a+NY+1;
     idx.push(a,d,a+1,a+1,d,d+1);}
  }
 }
 return bufferGeo(T,xyz,uv,colors,idx);
}
export function wingFeatherProfile(u,row=0,major=false){
 const primary=row===0;
 return {length:primary
   ?(1.8+3.6*u+(major?7.5+4.4*u:1.15*Math.sin(Math.PI*u)))
   :(1.05+2.3*Math.sin(Math.PI*u)+.5*u),
   width:(major?.56:primary?.28:.23)+(.26*Math.sin(Math.PI*u)),
   inward:major?.23+.47*ease((u-.45)/.5):primary?.1+.16*u:.06+.09*u};
}
function featherCluster(T,side,quality){
 const low=quality==='low',xyz=[],uv=[],colors=[],idx=[],cols=3,steps=low?5:8;
 for(let row=0;row<2;row++){
  const amount=WING_LOD[quality][row===0?'primary':'secondary'];
  for(let i=0;i<amount;i++){
   const u=.06+(i+.55)/amount*.89;
   // Quatro grandes penas em forma de garras, entre as penas pequenas.
   // Evita a borda homogênea em forma de cortina/parede genérica.
   const major=row===0&&i>=Math.floor(amount*.43)&&
      (i-Math.floor(amount*.43))%3===0;
   const origin=wingOutline(u,side),f=wingFeatherProfile(u,row,major);
   const base={x:origin.point.x+origin.normal.x*origin.width*(row?.98:1.18),
     y:origin.point.y+origin.normal.y*origin.width*(row?.98:1.18),
     z:origin.point.z+.07-row*.32};
   const first=xyz.length/3;
   const stagger=(i%3-1)*.16;
   for(let j=0;j<=steps;j++){
    const v=j/steps,bulge=Math.pow(Math.max(0,Math.sin(Math.PI*v)),.82);
    // Primárias caem para baixo e voltam para o centro: forma da foto,
    // não triângulos retos, cubos ou asas de fogo indistintas.
    const sweep=(.04+.12*(1-u))*v-
      f.inward*Math.pow(v,1.55)*(.78+.22*Math.sin(Math.PI*v));
    const cx=base.x+side*f.length*sweep;
    const cy=base.y-f.length*(v+.045*Math.sin(Math.PI*v));
    const cz=base.z+.5*Math.sin(Math.PI*v)-.7*v*v+stagger;
    const width=f.width*bulge*(.6+.35*(1-v));
    for(let k=0;k<cols;k++){
     const across=(k-1),edge=Math.abs(across);
     xyz.push(cx+side*across*width,cy+(.035*across*Math.sin(v*9+i)),
       cz+.22*(1-edge)*bulge+.065*across);
     uv.push(k/(cols-1),v);
     // Corpo preto fosco com nervuras escuras e bainha violeta,
     // sem preenchimento roxo luminoso no centro.
     let c;
     if(edge>0)c=[.108+.016*u,.045+.012*u,.18+.055*u];
     else c=[.028+.008*Math.sin(i*3),.018,.050+.019*u];
     const tip=1-ease((v-.76)/.24);
     colors.push(c[0]*tip+.015*(1-tip),c[1]*tip+.008*(1-tip),c[2]*tip+.029*(1-tip));
     if(j<steps&&k<cols-1){
      const a=first+j*cols+k,b=a+cols;
      idx.push(a,b,a+1,a+1,b,b+1);
     }
    }
   }
  }
 }
 return bufferGeo(T,xyz,uv,colors,idx);
}
const FEATHER_V=String.raw`
attribute vec3 color;
uniform float time;
varying vec3 vColor;
varying vec2 vUv;
void main(){
 vColor=color;vUv=uv;
 vec3 p=position;
 p.z+=.065*sin(p.x*.28+p.y*.31+time*.75)*sin(uv.y*3.14159);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const FEATHER_F=String.raw`
uniform float opacity;
varying vec3 vColor;
varying vec2 vUv;
void main(){
 float rib=pow(max(0.,1.-abs(vUv.x*2.-1.)),15.);
 float scratches=.035*max(0.,sin(vUv.y*34.+vUv.x*11.));
 vec3 col=vColor+vec3(.028,.008,.049)*rib+vec3(scratches*.2,scratches*.1,scratches*.6);
 float alpha=opacity*(.97-.07*abs(vUv.x*2.-1.));
 if(alpha<.012)discard;
 gl_FragColor=vec4(col,alpha);
}`;
/**
 * Renderização por lado = 1 malha corpórea + 1 malha agrupando TODAS as penas,
 * além de uma nervura contínua e um filamento de contorno violeta.
 * A qualidade baixa reduz número de penas/segmentos; mantém silhueta e animação.
 */
export function createVhazraelFeatherWings(T,parent){
 const root=new T.Group();root.name='VhazraelFeatherWings276';parent.add(root);
 const geo=[],mat=[],models={high:[],low:[]};
 const Utime={value:0},Uopacity={value:0};
 const plumeMat=new T.ShaderMaterial({vertexShader:FEATHER_V,fragmentShader:FEATHER_F,
   uniforms:{time:Utime,opacity:Uopacity},transparent:true,
   depthTest:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 mat.push(plumeMat);
 const rim=new T.MeshBasicMaterial({color:0x6632b6,transparent:true,opacity:0,
   depthWrite:false,depthTest:true});mat.push(rim);
 const rimSoft=new T.MeshBasicMaterial({color:0x4d247d,transparent:true,opacity:0,
   depthWrite:false,depthTest:true});mat.push(rimSoft);
 for(const quality of ['high','low'])for(const side of [-1,1]){
  const bodyGeo=wingBody(T,side,quality==='low');geo.push(bodyGeo);
  const body=new T.Mesh(bodyGeo,plumeMat);body.name='PenaOssatura'+side;
  body.frustumCulled=false;body.renderOrder=5;root.add(body);models[quality].push(body);
  const featherGeo=featherCluster(T,side,quality);geo.push(featherGeo);
  const feathers=new T.Mesh(featherGeo,plumeMat);feathers.name='PenasPrimariasLongas'+side;
  feathers.frustumCulled=false;feathers.renderOrder=6;root.add(feathers);models[quality].push(feathers);
  const pts=[];
  for(let i=0;i<=24;i++){
   const p=wingSkeleton(i/24,side);
   pts.push(new T.Vector3(p.x,p.y,p.z+.17));
  }
  const curve=new T.CatmullRomCurve3(pts);
  const spineGeo=new T.TubeGeometry(curve,quality==='low'?29:54,quality==='low'?.055:.075,5,false);
  geo.push(spineGeo);
  const spine=new T.Mesh(spineGeo,rim);
  spine.name='ContornoVioletaAnatomico'+side;spine.renderOrder=7;
  spine.frustumCulled=false;root.add(spine);models[quality].push(spine);
  if(quality==='high'){
   const softGeo=new T.TubeGeometry(curve,36,.19,5,false);geo.push(softGeo);
   const soft=new T.Mesh(softGeo,rimSoft);soft.name='AuraVioletaSutil'+side;
   soft.renderOrder=6;soft.frustumCulled=false;root.add(soft);models[quality].push(soft);
  }
 }
 function update(alpha,low,t){
  const visible=alpha>.018;
  root.visible=visible;
  Utime.value=Math.max(0,t||0);
  Uopacity.value=sat(alpha);
  rim.opacity=sat(alpha)*.65;
  rimSoft.opacity=sat(alpha)*.16;
  for(const quality of ['high','low'])for(const m of models[quality])
    m.visible=visible && quality===(low?'low':'high');
 }
 function clear(){root.visible=false;Uopacity.value=0;
  for(const quality of ['high','low'])for(const m of models[quality])m.visible=false;}
 clear();
 return {root,update,clear,
   stats:()=>({visible:root.visible,
     primaries:root.visible?2*WING_LOD[models.low[0].visible?'low':'high'].primary:0,
     secondary:root.visible?2*WING_LOD[models.low[0].visible?'low':'high'].secondary:0}),
   dispose(){clear();parent.remove(root);for(const g of geo)g.dispose();for(const m of mat)m.dispose();}
 };
}
