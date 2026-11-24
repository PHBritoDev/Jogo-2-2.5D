import {ROUTE,DETOURS,CITY_ROAD,SHELTERS,DOJO,DOJO_BRIDGE,bridgeSection,CASTLE,SPRING_LAKE,ICE_LAKE,smooth,noise,sampleRoad,regionWeight,bloomAt,snowAt,landscape,routeGround,lakeDepth,ellipse} from './sakura-route3d.js';
import {batch,lantern,torii,dojoBuilding,castleBuilding,distantCastle,distantPagoda,glacierHouse,spire,arch} from './sakura-masonry3d.js';
import {treeLibrary,seeded,distantGrove} from './sakura-grove3d.js';
import {surfaceFinish,hallDetails} from './sakura-interiors3d.js';
import {dressBasins} from './sakura-landscape3d.js';
import {skyVeil,underfoot} from './sakura-atmosphere3d.js';
import {lakes,weather} from './sakura-waters3d.js';

const TILE=96, key=(i,j)=>i+128*j;
const springColors=[0x756060,0x8e8168,0xa99a86,0x957882],snowColors=[0xc8d3dc,0xafc2cd,0xe6e6e2,0x8497a6];
const near=(x,z,p,d)=>Math.hypot(x-p.x,z-p.z)<d;
export function createSakuraWorld(T,scene,{ground,low}){
 const root=new T.Group();root.name='Ato III · Dojo da Lua e Invernália';root.visible=false;scene.add(root);
 const {lib,solid,wind}=treeLibrary(T), terrainMat=underfoot(T);
 const focus={value:new T.Vector2(1e5,1e5)},middleRadius=low?62:91,farGrove=distantGrove(T,focus,middleRadius);
 const dummy=new T.Object3D(),c=new T.Color(),tone=new T.Color(),shadow=new T.Color(0x667e88);
 const tileCache=new Map(),buildings=[],landmarks=[],landmarkSolids=[],groveSolids=new Map();
 const summer=new T.Color(0xdebdcb),winter=new T.Color(0x829bb3),night=new T.Color(0x424c67),air=new T.Color();
 function feature(name,p,fn,reach=300,mat=solid){
  const m=batch(T);fn(m);const o=new T.Mesh(m.geometry(),mat);o.name=name;o.position.set(p.x,p.y??ground(p.x,p.z),p.z);
  root.add(o);landmarks.push({o,reach});return o;
 }
 function model(name,i,fn,reach=310,yaw){const p=ROUTE[i],o=feature(name,p,fn,reach);o.rotation.y=yaw??sampleRoad(p.x,p.z).tangent;return o;}
 function register(x,z,r){landmarkSolids.push({x,z,r});}
 function trailFeature(m,k){
  const timber=0x594244,stone=0x847b75;
  if(k===0 || k===4){
   // A fallen mother tree shelters the root garden; its lone winter sister is split by frost.
   const frost=k===4, reach=frost?2.7:5;
   m.rib([[-reach,.4,0],[-1,1.5,.5],[.6,2.8,0],[reach,3.6,-.8]],.47,timber);
   for(let j=0;j<7;j++){const a=j*2.4,x=(j-3)*.56;
    m.rib([[x,2.4+x*.42,0],[x+.64,3.3+x*.42,Math.cos(a)],[x+Math.sin(a)*1.8,3.9+x*.42,Math.cos(a)*2]],.13,frost?0xbac6c9:timber,6);}
   for(let j=0;j<5;j++)m.tube([-reach,.9,0],[-reach+Math.sin(j*2)*1.7,.05,Math.cos(j*2)*1.5],.27,.05,0x79715c,6);
  }else if(k===2){
   // A hollow stone basin and a split bamboo spout below the lantern.
   const n=16;
   for(let j=0;j<n;j++){const a=j*2*Math.PI/n,b=(j+1)*2*Math.PI/n;
    const p=(t,r,h)=>[r*Math.cos(t),h,r*Math.sin(t)];
    m.quad(p(a,1.4,0),p(b,1.4,0),p(b,1.9,1),p(a,1.9,1),stone);
    m.quad(p(a,1.9,1),p(b,1.9,1),p(b,1.52,.94),p(a,1.52,.94),0xa09b8d);
    m.tri([0,.74,0],p(a,1.6,.74),p(b,1.6,.74),0x58898a);}
   m.tube([2.4,0,0],[2.4,1.9,0],.12,.11,0x747b57);
   m.tube([2.8,1.82,0],[.94,1.53,0],.14,.12,0xaaa177);lantern(m,-2.4,0,-1,true);
  }else if(k===1 || k===3){
   // Observation deck and swallow roost both open toward the valley.
   for(let j=0;j<10;j++)m.box(0,.24,j*.44-2,5,.33,.41,timber);
   for(const sign of [-1,1]){
    m.tube([sign*2.4,-.3,-2],[sign*2.4,1.6,-2],.13,.12,timber);
    m.rib([[sign*2.4,1.5,-2],[sign*2.4,1.5,2]],.11,timber);}
   if(k===1)m.box(0,.85,1.7,3,.23,.8,stone);
   else for(let j=0;j<3;j++){m.tube([j-1,0,1],[j-1,3+j*.32,1],.13,.08,timber);m.box(j-1,2.9+j*.32,1,.76,.48,.72,0xa56b56);}
  }else{
   for(const side of [-1,1]){m.quad([side*2,0,-2],[0,3,-2],[0,3,2],[side*2,0,2],0x8a9b9c);
    m.tube([side*2,0,-2],[0,3,-2],.14,.12,timber);}
   m.box(0,.17,.35,2.4,.22,2.6,timber);lantern(m,2.7,0,-1,true,.72);
  }
 }
 function dojoSpan(m){
  const {start,end}=DOJO_BRIDGE, base=bridgeSection(start).height;
  const count=Math.ceil((end-start)/1.05), step=(end-start)/count;
  for(let i=0;i<count;i++){
   const z=(i+.5)*step,{height,width}=bridgeSection(start+z);
   m.box(0,height-base-.16,z,2*width,.32,step*.96,i%4?0x654a40:0x826052);
  }
  for(const side of [-1,1]){
   const rail=[],beam=[];
   for(let i=0;i<=count;i++){
    const z=i*step,{height,width}=bridgeSection(i===count?end:start+z);
    const x=side*width,y=height-base;
    if(i%4===0||i===count)m.tube([x,y-.5,z],[x,y+1.5,z],.16,.11,0x52413c);
    rail.push([x,y+1.37-.17*Math.sin(Math.PI*(i%4)/4)**2,z]);
    beam.push([x*.92,y-.37,z]);
   }
   m.rib(rail,.10,0xb49a77,5);m.rib(beam,.22,0x51433b,5);
  }
 }
 for(const [i,s] of [[5,1.24],[9,.94],[18,1],[21,.68]])model('Torii dos peregrinos',i,m=>{torii(m,s);lantern(m,-4.5*s,0,-1,true,s);lantern(m,4.5*s,0,-1,true,s);});
 for(const [k,d] of DETOURS.entries()){const p=d.points[2],o=feature(d.name,{x:p.x+6,z:p.z+4},m=>{
   if(k===7||k===8){spire(m,0,0,0,3.4,18+k*.7);arch(m,6,0,0,2.7,6,'x',.5);return;}
   if(k===6){for(let j=0;j<15;j++){const a=j*2.4,r=1.5+(j%4)*.57;m.tube([Math.cos(a)*r,-.6,Math.sin(a)*r],[Math.cos(a)*(r+1.2),2+(j%5)*.7,Math.sin(a)*(r+1.2)],.6,.03,j%2?0x8ac9dd:0xa4d7de,6);}return;}
   trailFeature(m,k);
  });o.rotation.y=.4*k;register(o.position.x,o.position.z,k>=7?3.2:1.3);}
 function building(name,p,farModel,richModel,wood){
  const haze={value:new T.Color(0xa5b8c9)},mix={value:0},mat=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,fog:false});
  mat.onBeforeCompile=shader=>{shader.uniforms.distanceTint=haze;shader.uniforms.tintWeight=mix;
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 distanceTint;uniform float tintWeight;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,distanceTint,tintWeight);');};
  mat.customProgramCacheKey=()=>wood?'pagode-longe':'castelo-longe';
  const m=batch(T);farModel(m);const far=new T.Mesh(m.geometry(),mat);far.position.set(p.x,p.y,p.z);root.add(far);
  buildings.push({name,p,far,rich:null,richModel,wood,haze,mix});
 }
 building('Dojo da Lua Suspensa',DOJO,distantPagoda,dojoBuilding,true);
 feature('Ponte suspensa',{x:DOJO.x,z:DOJO_BRIDGE.start,y:bridgeSection(DOJO_BRIDGE.start).height},dojoSpan,500);
 building('Cidadela e salão do trono',CASTLE,distantCastle,castleBuilding,false);
 // Exterior streets on either side of the central stair, at the same altitude as their pavement.
 for(const s of [-1,1])for(let j=0;j<5;j++){const x=CASTLE.x+s*(34+j%2*5),z=CASTLE.z-72+j*20;
  const o=feature('Bairro da muralha',{x,z},m=>glacierHouse(m,j%3),300);o.rotation.y=s*1.26;register(x,z,3.3);}
 model('Guarita dos passos',48,m=>{spire(m,8,0,0,2.8,22);arch(m,0,0,0,3.4,6,'x',.43);});
 model('Estátuas da memória',54,m=>{for(const s of [-1,1]){
  m.box(6*s,.55,0,3.2,1.1,3.2,0x8094a5);m.tube([6*s,1,0],[6*s,5.4,0],1.44,.65,0x667888,7);
  m.tube([6*s,5.3,0],[6*s,7.4,0],.78,.19,0xa9bbc6,8);m.tube([6*s,4.2,.4],[5.2*s,3.5,1.2],.32,.19,0x8798a5,6);
 }},310,Math.atan2(CASTLE.x-ROUTE[54].x,CASTLE.z-ROUTE[54].z));
 // A sequence of individual cut-stone treads on the ascent; no curb walls along the centre.
 for(const [start,end,step,span] of [[17,21,1.65,3.4],[56,57,2.6,5.2]]){
  for(let idx=start;idx<end;idx++){const a=ROUTE[idx],b=ROUTE[idx+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),cs=dz/len,sn=dx/len;
   const o=feature('Escada de peregrinação',{x:a.x,z:a.z,y:a.y},m=>{
    for(let dist=0,count=0;dist<len;dist+=step,count++){const u=dist/len,w=span*(.93+.11*Math.sin(count*7.35));
     const yy=ground(a.x+dx*u,a.z+dz*u)-a.y;
     m.box(0,yy-.055,dist,w*2,.27,step*.93,count%4?0x837c78:0x99918b);
     if(count%17===0)lantern(m,(count%2?1:-1)*(w+1.1),yy,dist,true,.88);}
   },430);o.rotation.y=Math.atan2(sn,cs);
  }
 }
 const lightHall=hallDetails(T,{root,feature,landmarks});
 const animateBasins=dressBasins(T,{feature,ground,lib,root,landmarks,register});
 const water=lakes(T),snow=weather(T,low),sky=skyVeil(T);root.add(water.group,snow.mesh,sky.mesh);
 const relative=(x,z)=>[x-CASTLE.x,z-CASTLE.z];
 function reserve(x,z){const [dx,dz]=relative(x,z);
  return Math.abs(dx)<81&&dz>=-110&&dz<92||Math.abs(dx)<25&&dz>=-190&&dz<-110||Math.abs(x-DOJO.x)<22&&z>=-1686&&z<DOJO.z+25||SHELTERS.some(s=>near(x,z,s,6))||landmarkSolids.some(s=>near(x,z,s,s.r+3));}
 // Keep a framed opening down the two approach valleys. Clear only crowns
 // tall enough to break the ray from a standing traveller to the landmark.
 const overlooks=[
  {eye:DETOURS[2].points[3],landmark:DOJO,rise:20},
  {eye:ROUTE[54],landmark:CASTLE,rise:63}
 ];
 function masksVista(x,y,z){
  return overlooks.some(({eye,landmark,rise})=>{
   const dx=landmark.x-eye.x,dz=landmark.z-eye.z,len2=dx*dx+dz*dz;
   const t=((x-eye.x)*dx+(z-eye.z)*dz)/len2;
   if(t<-.012||t>1)return false;
   const across=Math.abs((x-eye.x)*dz-(z-eye.z)*dx)/Math.sqrt(len2);
   return across<7+12*t && y+20>eye.y+1.7+(landmark.y+rise-eye.y-1.7)*t;
  });
 }
 function physical(x,z,p){if(p.i>=2.5&&(p.kind!=='town'||x>265))return landscape(x,z,p);
  const w=regionWeight(x,z,p);if(w>=.999)return landscape(x,z,p);
  return ground(x,z)-(routeGround(x,z,p)-landscape(x,z,p))*w;}
 function groundTile(ix,iz,steps){
  const px=ix*TILE,pz=iz*TILE,h=[],colors=[],uv=[],mix=[],idx=[],n=steps+1;
  for(let j=0;j<=steps;j++)for(let i=0;i<=steps;i++){
   const x=px+i*TILE/steps,z=pz+j*TILE/steps,p=sampleRoad(x,z),w=regionWeight(x,z,p);
   const y=p?physical(x,z,p):22,ns=noise(x*.068,z*.068),cold=snowAt(p?.i??0),road=p?1-smooth(3,9,p.d):0;
   const n2=noise(x*.012,z*.012),k=Math.min(3,Math.floor(ns*4)),slope=p?smooth(50,125,p.d):1;
   c.set(springColors[k]).lerp(tone.set(snowColors[k]),cold).lerp(shadow,slope*(.15+.27*ns));
   if(p){c.lerp(tone.set(0x61514e),(1-smooth(1,5,p.i))*.6);c.lerp(tone.set(cold>.55?0xb0becc:0xa99488),road*.7);}
   const flower=bloomAt(p?.i??0);
   c.lerp(tone.set(0xd7b7c2),flower*(.50+.23*ns)).lerp(tone.set(0xe3dedc),cold*.31);
   mix.push(flower*(.50+.5*ns),cold,road);c.multiplyScalar(.91+.23*n2);h.push(x,y-.12,z);colors.push(c.r,c.g,c.b);uv.push(x*.15,z*.15);
   if(i&&j){const a=j*n+i-n-1,b=a+1,d=a+n,e=d+1;
    const cx=x-TILE/(2*steps),cz=z-TILE/(2*steps),q=sampleRoad(cx,cz);
    if(q&&regionWeight(cx,cz,q)>.004)idx.push(a,d,b,b,d,e);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(h,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('groundMix',new T.Float32BufferAttribute(mix,3));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();
  return new T.Mesh(g,terrainMat);
 }
 const coarse=new Map();
 function farTerrain(ix,iz){const k=key(ix,iz);let o=coarse.get(k);if(o===undefined){
  const q=sampleRoad((ix+.5)*TILE,(iz+.5)*TILE);o=q&&q.d<235?groundTile(ix,iz,6):null;if(o)root.add(o);coarse.set(k,o);}
  return o;
 }
 function plantTile(ix,iz){
  const group=new T.Group(),clusters=new Map(),obstacles=[],seed=Math.imul(ix,991)^Math.imul(iz,733),r=seeded(seed),px=ix*TILE,pz=iz*TILE;
  const tiles=groundTile(ix,iz,low?16:24);group.add(tiles);const trace=batch(T),pebbles=batch(T);
  const paths=[ROUTE,...DETOURS.map(d=>d.points),CITY_ROAD];let drawn=false;
  for(const path of paths)for(let j=1;j<path.length;j++){
   const a=path[j-1],b=path[j],dx=b.x-a.x,dz=b.z-a.z;
   if(Math.min(a.x,b.x)>px+TILE+4||Math.max(a.x,b.x)<px-4||Math.min(a.z,b.z)>pz+TILE+4||Math.max(a.z,b.z)<pz-4)continue;
   const len=Math.hypot(dx,dz),parts=Math.ceil(len/2.8),vx=dz/len,vz=-dx/len;
   for(let i=0;i<parts;i++){
    const u=(i+.5)/parts,x=a.x+dx*u,z=a.z+dz*u;if(x<px||z<pz||x>=px+TILE||z>=pz+TILE||reserve(x,z))continue;
    const q=sampleRoad(x,z);if(regionWeight(x,z,q)<.12||ellipse(x,z,ICE_LAKE)<1.04||ellipse(x,z,SPRING_LAKE)<1.02)continue;
    const cold=snowAt(q.i),w=q.kind==='trail'?1.45:2.35;
    for(const s of [-1,1]){const off=(.3+.42*Math.sin(i*17.7))*w+.4,xx=x+s*vx*off,zz=z+s*vz*off;
     const y=physical(xx,zz,sampleRoad(xx,zz))+.065,vr=.26+r()*.60,lr=.36+r()*.62,col=cold>.65?0x879baa:i%3?0x887978:0xa3968a;
     const points=[];for(let k=0;k<7;k++){const a=k*.8976,rad=.79+r()*.24;
      const ax=Math.cos(a)*vr*rad,az=Math.sin(a)*lr*rad;
      points.push([xx+vx*ax+dx/len*az,y,zz+vz*ax+dz/len*az]);}
     if(cold>.65){if(i%3===0){for(const p of points){p[0]=xx+(p[0]-xx)*.22;p[2]=zz+(p[2]-zz)*.46;}}else continue;}
     for(let k=0;k<points.length;k++)pebbles.tri([xx,y+.038,zz],points[k],points[(k+1)%7],col,.91+.09*(k%3)/2);drawn=true;}

   }
  }
  for(let j=0;j<(low?60:80);j++){const x=px+r()*TILE,z=pz+r()*TILE,p=sampleRoad(x,z);
   if(!p||p.d<(p.i<26?6.8:p.i>32?6.1:5.2)||regionWeight(x,z,p)<.05||reserve(x,z)||ellipse(x,z,ICE_LAKE)<1.03||ellipse(x,z,SPRING_LAKE)<1.035||lakeDepth(x,z)>0)continue;
   const bloom=bloomAt(p.i),cold=snowAt(p.i);if(p.i>37&&p.i<56&&r()<.60||p.i<3&&r()<.7)continue;
   const type=bloom>r()&&p.i<33?Math.floor(r()*4):(cold<.42?7:4+Math.floor(r()*3));
   const size=(.60+r()*.70)*(p.i<5?.70:1)*(p.d<17?1.08:1),y=physical(x,z,p)-.12;
   if(masksVista(x,y,z))continue;
   if(!clusters.has(type))clusters.set(type,[]);clusters.get(type).push([x,y,z,size,r()*6.283]);
   obstacles.push({x,z,r:type<4?.54*size:.39*size});
   if(j%4===0){const h=.42+r()*.56;trace.tube([x+2,y-.18,z+1],[x+2.4,y+h,z+1],h*1.4,.22,h>.68?0x7b8490:0x8f8b8b,7);drawn=true;}
  }
  // Ground cover shares the pebble batch. Patches gather along damp banks and
  // under the outer canopy, leaving the walked centre and architectural floors clear.
  for(let j=0;j<(low?48:78);j++){const x=px+r()*TILE,z=pz+r()*TILE,q=sampleRoad(x,z);
   if(!q||q.d<3.5||q.d>58||!bloomAt(q.i)||reserve(x,z)||regionWeight(x,z,q)<.3)continue;
   const edge=ellipse(x,z,SPRING_LAKE);if(edge<1.003||snowAt(q.i)>.5)continue;
   const damp=edge<1.13,shade=noise(x*.065,z*.065);if(!damp&&shade<.39)continue;
   const base=physical(x,z,q)-.06;
   for(let k=0;k<(damp?9:5);k++){const a=r()*Math.PI*2,co=Math.cos(a),si=Math.sin(a);
    const h=(damp?.84:.32)*(.62+r()),w=.08+r()*.07;const xx=x+co*r()*.7,zz=z+si*r()*.7;
    const foot=[xx,base,zz],left=[xx-si*w+co*.14,base+h*.46,zz+co*w+si*.14],right=[xx+si*w+co*.14,base+h*.46,zz-co*w+si*.14];
    const tip=[xx+co*(damp?.38:.53),base+h,zz+si*(damp?.38:.53)];
    trace.quad(foot,left,tip,right,damp?0x84957c:k%3?0x6e7866:0x8c9271);
   }drawn=true;
  }
  if(drawn){group.add(new T.Mesh(pebbles.geometry(),solid),new T.Mesh(trace.geometry(),solid));}
  const draws=[];if(clusters.size)group.add(farGrove(clusters));
  for(const [type,entries] of clusters){
   for(let lod=0;lod<2;lod++){const parts=lib[type][lod];for(const [geo,mat] of parts){
    const o=new T.InstancedMesh(geo,mat,entries.length);o.userData.shared=true;
    entries.forEach(([x,y,z,s,rot],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,rot,0);dummy.scale.setScalar(s);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);});
    o.computeBoundingSphere();group.add(o);draws.push({o,lod,entries,matrices:o.instanceMatrix.array.slice()});}}
  }
  root.add(group);return {group,draws,obstacles};
 }
 // Three mountain chains with fluted faces, snow cornices and separate shadowed foothills.
 feature('Cordilheiras do norte',{x:0,y:0,z:0},m=>{
  const r=seeded(901),rings=[[-2340,-2000,13,148,310],[-1830,-2490,23,161,438],[1320,-2170,16,147,386],[-120,-1140,9,131,218]];
  for(let zone=0;zone<rings.length;zone++){
   const [x0,z0,count,spacing,base]=rings[zone];
   for(let j=0;j<count;j++){const x=x0+(zone===0||zone===2?Math.sin(j*.53)*96:j*spacing),z=z0+(zone===0||zone===2?j*spacing:Math.cos(j*.73)*118);
    const road=sampleRoad(x,z);if(road&&road.d<207)continue;
    const h=base*(.67+r()*.72),rad=h*(.56+r()*.24),tip=[x+rad*.13,h+33,z-rad*.2],flanks=[];
    for(let k=0;k<12;k++){const a=k*.5236,rr=rad*(.78+r()*.37);
     flanks.push([[x+rr*1.4*Math.cos(a),-12,z+rr*1.4*Math.sin(a)],[x+rr*.65*Math.cos(a+.1),h*(.40+r()*.19),z+rr*.65*Math.sin(a+.1)],[x+rr*.35*Math.cos(a-.07),h*(.70+r()*.17),z+rr*.35*Math.sin(a-.07)]]);}
    for(let k=0;k<12;k++){const f=flanks[k],n=flanks[(k+1)%12];m.quad(f[0],n[0],n[1],f[1],k%3?0x65717f:0x78818b);
     m.quad(f[1],n[1],n[2],f[2],k%3?0x8999a9:0xa5b4c1);m.tri(f[2],n[2],tip,k%3?0xc6d3dc:0xa0b4c4);}
   }
  }
 },Infinity);
 let cellX=Infinity,cellZ=Infinity,pending=[],seen=new Set(),active=false;
 function clearCell(k,cell){root.remove(cell.group);cell.group.traverse(o=>{if(o.isMesh){if(o.isInstancedMesh)o.dispose();else if(!o.userData.shared)o.geometry.dispose();}});tileCache.delete(k);groveSolids.delete(k);}
 function vegetationLOD(cell){
  const near2=(low?24:39)**2,mid2=middleRadius**2,P=focus.value;
  for(const {o,lod,entries,matrices} of cell.draws){let n=0;
   for(let i=0;i<entries.length;i++){const e=entries[i],d=(e[0]-P.x)**2+(e[2]-P.y)**2;
    if((lod===0&&d<near2)||(lod===1&&d>=near2&&d<mid2)){
     for(let k=0;k<16;k++)o.instanceMatrix.array[n*16+k]=matrices[i*16+k];n++;}}
   o.count=n;o.visible=n>0;if(n)o.instanceMatrix.needsUpdate=true;
  }
 }
 function layout(ix,iz){
  cellX=ix;cellZ=iz;pending=[];seen=new Set();
  for(const o of coarse.values())if(o)o.visible=false;
  for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++){const a=ix+dx,b=iz+dz,k=key(a,b),far=farTerrain(a,b);
   const dist=Math.hypot(dx,dz);if(far)far.visible=dist<5.9;
   if(dist>(low?2.25:2.85)||!far)continue;seen.add(k);
   let part=tileCache.get(k);if(!part){pending.push({a,b,k,dist});continue;}part.group.visible=true;far.visible=false;
   vegetationLOD(part);
  }
  for(const [k,part] of tileCache){if(!seen.has(k)){part.group.visible=false;clearCell(k,part);}}
  for(const [k,o] of coarse)if(!seen.has(k)&&(!o||!o.visible)){
   if(o){root.remove(o);o.geometry.dispose();}coarse.delete(k);}
  pending.sort((a,b)=>a.dist-b.dist);
 }
 function update(dt,now,P,camera,fog,nightK,hidden){
  const p=hidden?null:sampleRoad(P.x,P.z),w=p?regionWeight(P.x,P.z,p):0;
  const wasActive=active;
  active=!!p&&!hidden&&(w>.002||p.i<3&&p.d<80&&P.z<-250||p.kind==='town'&&P.x>199&&p.d<35);
  root.visible=active;
  if(!active){
   if(wasActive){
    for(const [k,cell] of tileCache)clearCell(k,cell);
    for(const o of coarse.values())if(o){root.remove(o);o.geometry.dispose();}
    coarse.clear();pending=[];seen.clear();cellX=cellZ=Infinity;
    for(const b of buildings)if(b.rich){root.remove(b.rich);b.rich.geometry.dispose();b.rich=null;}
   }return;
  }
  const ix=Math.floor(P.x/TILE),iz=Math.floor(P.z/TILE);
  if(Math.hypot(P.x-focus.value.x,P.z-focus.value.y)>10){focus.value.set(P.x,P.z);for(const cell of tileCache.values())vegetationLOD(cell);}
  if(ix!==cellX||iz!==cellZ)layout(ix,iz);
  const task=pending.shift();if(task){const part=plantTile(task.a,task.b);tileCache.set(task.k,part);groveSolids.set(task.k,part.obstacles);coarse.get(task.k).visible=false;
   vegetationLOD(part);}
  for(const l of landmarks)l.o.visible=l.reach===Infinity||Math.hypot(l.o.position.x-P.x,l.o.position.z-P.z)<l.reach;
  const cold=snowAt(p.i),blossom=bloomAt(p.i),inside=Math.abs(P.x-DOJO.x)<11&&Math.abs(P.z-DOJO.z)<10||Math.abs(P.x-CASTLE.x)<27&&P.z>CASTLE.z-40&&P.z<CASTLE.z+67;
  lightHall(P,nightK);
  animateBasins(now*.001);wind.value=now*.001;air.copy(summer).lerp(winter,cold).lerp(night,nightK*.66);
  if(fog&&w>.01){fog.color.lerp(air,w*.82);fog.near+=(34+22*cold-fog.near)*w;fog.far+=(625-cold*80-fog.far)*w;}
  sky.update(camera,now*.001,cold,blossom,nightK,w,air);
  for(const b of buildings){const d=Math.hypot(b.p.x-P.x,b.p.z-P.z),within=d<(b.wood?200:310);
   if(within&&!b.rich){const m=batch(T);b.richModel(m);b.surface??=surfaceFinish(T,b.wood);b.rich=new T.Mesh(m.geometry(),b.surface);b.rich.position.copy(b.far.position);b.rich.name=b.name;root.add(b.rich);}
   if(b.rich){b.rich.visible=within;if(d>(b.wood?410:610)){root.remove(b.rich);b.rich.geometry.dispose();b.rich=null;}}
   b.far.visible=!within&&d<(b.wood?1100:2250);b.haze.value.copy(air);b.mix.value=.34+.58*smooth(250,1960,d);
  }
  water.update(now*.001,fog?.color||air,640);for(let i=0;i<2;i++)water.group.children[i].visible=near(P.x,P.z,i?ICE_LAKE:SPRING_LAKE,i?520:425);
  snow.update(P,now*.001,cold,inside?0:Math.max(blossom*.78,cold*.92)*w,innerHeight);
 }
 function solidAt(x,z){
  if(!active)return false;const list=groveSolids.get(key(Math.floor(x/TILE),Math.floor(z/TILE)))||[];
  for(const items of [list,landmarkSolids])for(const p of items)if((p.x-x)**2+(p.z-z)**2<p.r*p.r)return true;return false;
 }
 return {update,solidAt,root,stats:()=>({active,nearTiles:tileCache.size,farTiles:[...coarse.values()].filter(Boolean).length,waiting:pending.length})};
}
