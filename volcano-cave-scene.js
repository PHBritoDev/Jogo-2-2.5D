import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {plates,caveHeight,heatPools,caveHeat,solids} from './volcano-cave-layout.js';
import {masonry} from './volcano-cave-masonry.js';

const sector=z=>z>79?0:z> -14?1:2;
function molten(T, group,clock){
 const pos=[],uv=[];
 function strip(points){let prev;
  for(const [x,y,z,dx,dz,v] of points){const pair=[[x-dx,y,z-dz],[x+dx,y,z+dz]];
   if(prev){for(const [p,u,w] of [[prev[0],0,prev[2]],[prev[1],1,prev[2]],[pair[0],0,v],[prev[1],1,prev[2]],[pair[1],1,v],[pair[0],0,v]]){pos.push(...p);uv.push(u,w);}}
   prev=[...pair,v];
  }}
 function finish(){if(!pos.length)return;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  const mat=new T.ShaderMaterial({uniforms:{clock,fogColor:{value:new T.Color()},fogNear:{value:10},fogFar:{value:200}},fog:true,side:T.DoubleSide,
   vertexShader:`varying vec2 q;
#include <fog_pars_vertex>
void main(){q=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,fragmentShader:`varying vec2 q;uniform float clock;
#include <fog_pars_fragment>
void main(){float a=q.y*.55-clock*.56,x=q.x;float shear=sin(17.*x+1.8*sin(a+4.*x))+sin(39.*x+a*.8+2.*sin(2.*a-x*7.));
float eddy=sin(a*4.+5.*sin(x*9.+a*.8))+sin(a*7.+2.*cos(x*23.-a));float crust=smoothstep(-.86,1.5,shear+eddy*.88);float rim=smoothstep(0.,.13,min(x,1.-x));
vec3 c=mix(vec3(.34,.032,.013),vec3(1.,.40,.045),rim*(1.-.75*crust));c+=vec3(.5,.33,.11)*pow(max(0.,1.-abs(shear)),5.)*rim;
gl_FragColor=vec4(c,1.);
#include <fog_fragment>
}`});const mesh=new T.Mesh(geo,mat);mesh.name='Calhas e cataratas de lava';group.add(mesh);}
 return {strip,finish};
}
function groundPlate(b,p,index){const color=p.key.includes('-')?0x71615d:0x605354,ring=p.poly.map(([x,z])=>[x,caveHeight(z)+index*.0003,z]);
 const x=ring.reduce((s,v)=>s+v[0],0)/ring.length,z=ring.reduce((s,v)=>s+v[2],0)/ring.length;
 for(let i=0;i<ring.length;i++){const a=ring[i],c=ring[(i+1)%ring.length];b.face([x,caveHeight(z)+index*.0003,z],a,c,color,.88+b.random()*.15);
  const depth=p.key.includes('-')?1.4:11+b.random()*9;b.quad(a,c,[c[0],c[1]-depth,c[2]],[a[0],a[1]-depth,a[2]],0x473b41);
 }
}
function assets(T,group,file,instances,alive){
 if(!instances.length)return;new GLTFLoader().load(new URL(file,import.meta.url).href,gltf=>{
  if(!alive()){gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});return;}
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o=>{if(!o.isMesh)return;const crystal=file.startsWith('Cristal');
   const mat=new T.MeshBasicMaterial({map:o.material.map,color:0xffffff});
   if(crystal)mat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec4 pigment=texture2D(map,vMapUv);float l=dot(pigment.rgb,vec3(.19,.45,.36));diffuseColor.rgb*=.17+1.65*l;`);};
   const m=new T.InstancedMesh(o.geometry,mat,instances.length),d=new T.Object3D();m.name=file;
   instances.forEach(([x,y,z,s,rz,ry,color],i)=>{d.position.set(x,y,z);d.rotation.set(0,ry,rz);d.scale.setScalar(s);d.updateMatrix();m.setMatrixAt(i,d.matrix.multiply(o.matrixWorld));m.setColorAt(i,new T.Color(color));});m.computeBoundingSphere();group.add(m);
  });
 });
}
function sanctuary(b,l,crystals,torches){
 const random=b.random,stone=0x705b65,basalt=0x514455;
 // The main fall starts at the broken upper cloister and feeds the lower river.
 for(const [x,z,y,rx,rz] of [[-41,117,24,21,30],[36,101,12,25,17],[58,76,41,23,24],[-65,60,34,27,26],[10,48,36,30,18],[-29,179,35,21,18],[52,153,15,20,18]]){
  b.cliff(x,y,z,rx,rz,68,basalt);const arches=3+Math.floor(random()*4);
  for(let j=0;j<arches;j++)b.arch(x+(j-arches*.5)*5,y,z+5,2.1,4+random()*1.2,2.4,stone);
  b.block(x,y+6.8,z+5,arches*5+1,1.1,3,0x695158);
 }
// The fallen reliquary spans the cleft at the vanishing point of the entry.
 for(let tier=0;tier<3;tier++){
  const y=-13+tier*13,z=83-tier*9,width=8.4-tier*.9;
  for(let k=-3;k<=3;k++)b.arch(k*width*2,y,z,width*.84,6.4,4.7,0x967779);
  b.block(0,y+6.4+width,z,width*15,1,6.9,0x907573);
 }
 for(const x of [-18,0,18]){const z=61;
  b.block(x,23,z,5,9,5,0x9b7976);b.arch(x,32,z,2.45,2.2,3,0xbb978a);
  b.stalk([[x,37,z,4.2],[x,40,z,2.6],[x,46+(x===0?5:0),z,.08]],6,0x716173);}
 const cascades=[[-31,23,149,3.3],[29,12,122,2.9],[51,41,104,5],[-50,32,91,2.6],[9,35,69,2.2]];
 for(const [x,y,z,r] of cascades){l.strip([[x,y,z-9,r,0,0],[x,y,z,r,0,4],[x+.3,y-2,z+1,r,0,5],[x+.7,-23,z+2,r*.8,0,19],[x+2,-23,z+10,r*1.5,0,24]]);}
 l.strip([[-48,-23,174,4,0,0],[-22,-23,142,5,0,8],[-12,-23,118,6,0,16],[21,-23,98,6,0,25],[36,-23,68,4,0,34]]);
 // Fluted fractured basalt beneath stepped terraces; capstones and shrines
 // repeat at progressively smaller apparent scales behind the cataracts.
 for(const [cx,y,cz,radius] of [[-42,24,116,27],[39,12,99,21],[57,41,77,25],[-62,33,59,28],[10,34,48,19]]){
  for(let i=0;i<45;i++){const a=i*2.399,r=.75+random()*2.6,x=cx+Math.cos(a)*radius,z=cz+Math.sin(a)*radius,h=y-2-random()*8;
   b.stalk([[x,-22,z,r*1.18],[x+.2,h-3,z,r],[x,h,z,r*.85]],6,i%3?0x624c5b:0x866659,.33);}
  for(let j=0;j<3;j++){const x=cx+(j-1)*9,z=cz-2+j*1.1,h=6+(j%2)*6;
   b.block(x,y,z,4.8,h,5.5,0x785f6e);b.block(x,y+h-1,z,5.6,1,6.3,0xb79589);
   b.stalk([[x,y+h,z,3.5],[x,y+h+6+j,z,.16]],4,0x564354);}
 }
 for(const [x,z] of [[-12,143],[-6,121],[6,101]]){const h=caveHeight(z);b.arch(x,-19,z,4,Math.max(3,h+13),3.8,stone,Math.PI/2);}
 for(let i=0;i<55;i++){const a=random()*6.28,rad=50+random()*35,x=Math.cos(a)*rad,z=126+Math.sin(a)*rad,y=52+random()*18;
  b.stalk([[x,y-12-random()*14,z,.04],[x+1,y-4,z+1,2+random()*2],[x,y+2,z,4+random()*4]],7,basalt,.65);
 }
 for(let i=0;i<18;i++){const a=i*.65,r=65+i%5*6;b.cliff(Math.cos(a)*r,68+random()*7,125+Math.sin(a)*r,35,29,7,0x372c42);}
 const colors=[0xd496ff,0xa8d4ff,0xe4a2eb,0x8e9cff,0xa3f3fb];
 for(const [x,y,z,k,hang] of [[-11,17,160,2.4,0],[12,10,124,2.8,0],[-28,24,128,5,0],[30,13,111,5.5,0],[-9,38,146,3.5,1],[13,45,129,5.5,1],[47,43,85,6.5,0],[-32,43,93,4,1]]){
  if(!hang)b.cliff(x,y-.7,z,k*1.55,k*1.3,9,basalt);
  crystals.push([x,y+(hang?-1:1)*k*.55,z,k,hang?Math.PI:.11,random()*6,colors[crystals.length%colors.length]]);
 }
 for(let j=0;j<24;j++){const z=168-j*2.8,x=z>154?(172-z)*(-7/18):z>137?-7+(154-z)*(-8/17):-15+(137-z)*15/25;
  if(z<112)break;for(const side of [-1,1]){const px=x+side*3.65,h=caveHeight(z);
   b.block(px,h+.035,z,.68,.32,2.35,0x9b7c74);
   if(j%3===1){b.block(px,h+.12,z,.82,.92,.84,0x75586a);b.block(px,h+1,z,1,.18,1,0xad867e);solids.push({x:px,z,base:h,r:.43,h:1.18});}
  }}
 for(const [x,z] of [[-3,169],[-11,151],[4.7,113]]){const h=caveHeight(z);torches.push([x,h,z,1.9,0,.3,0xcaa58d]);b.stalk([[x,h+1.65,z,.12],[x+.02,h+1.89,z,.18],[x-.03,h+2.22,z,.02]],7,0xffb656);}
}
export function buildVolcanoCave(T,g,spec,ctx){
 const names=['Santuário das Cataratas de Fogo','Bosque das Veias Ardentes','Abismo das Coroas Mortas'];
 const groups=names.map(n=>{const s=new T.Group();s.name=n;g.add(s);return s;}),clock={value:0};
 let active=true;const env={bg:0x241623,fog:0x563b47,fogNear:14,fogFar:178,hemi:[0xf0b7ba,0x694146,1.2],sun:[0,0],light:[0xff7026,3,46,[-31,22,126]],exposure:1.1};
 for(let i=0;i<3;i++){const s=groups[i],b=masonry(T,s,862+i,{}),l=molten(T,s,clock),crystals=[],torches=[];
  plates.forEach((p,j)=>{if(sector((p.minZ+p.maxZ)/2)===i)groundPlate(b,p,j);});
  if(i===0)sanctuary(b,l,crystals,torches);
  for(const h of heatPools.filter(h=>sector(h.z)===i)){l.strip(Array.from({length:13},(_,j)=>{const a=Math.PI*j/12,dz=h.r*Math.cos(a);return [h.x,caveHeight(h.z+dz)+.065,h.z+dz,h.r*Math.sin(a),0,j*.22];}));}
  l.finish();b.finish();assets(T,s,'CristalCaverna01.glb',crystals,()=>active);assets(T,s,'TochaMedievalTripo.glb',torches,()=>active);
 }
 ctx.refs.lavaHeat=caveHeat;ctx.refs.statues=[{x:-9,z:-89},{x:9,z:-89}];
 ctx.tick.push((t,dt,c,opts)=>{clock.value=t;const z=(opts?.player||c.position).z-spec.z;groups[0].visible=z>30;groups[1].visible=z>-70&&z<145;groups[2].visible=z<47;});
 ctx.refs.caveDispose=()=>{active=false;};
 return env;
}
