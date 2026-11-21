// Local metres in the existing Act II arena. A deck polygon is used by both the
// mesh builder and the support query. Campaign rooms stay at datum zero.
export const caveHeight = z => Math.max(0, Math.min(21, (z - 79) * .23));
export const nodes = {
  entrance:[0,172], overlook:[-7,154], stair:[-15,137], falls:[0,112], arcade:[9,96], pass:[0,81],
  fork:[-3,68], cells:[0,50], grove:[0,40], ford:[-4,26], roots:[-6,14], lab:[0,0],
  willow:[-24,54], kiln:[-21,33], arch:[17,60], cinder:[22,42], hollow:[-27,19],
  door:[-22.4,0], gold:[-31,0], lip:[0,-15], spine:[-3,-29], hall:[0,-46],
  span:[3,-60], gate:[0,-68], throne:[0,-82], portal:[0,-90]
};
export const safePathGraph=[
 ['entrance','overlook',4.6],['overlook','stair',4],['stair','falls',4.7],['falls','arcade',5],
 ['arcade','pass',4.3],['pass','fork',4.8],['fork','cells',4.6],['cells','grove',5],['grove','ford',4.8],
 ['ford','roots',4.3],['roots','lab',5],['fork','willow',3.8],['willow','kiln',4],['kiln','ford',4],
 ['cells','arch',4.1],['arch','cinder',3.8],['cinder','grove',4.2],['kiln','hollow',3.7],['hollow','roots',4],
 ['lab','door',3],['door','gold',3],['lab','lip',5.4],['lip','spine',4.3],['spine','hall',4.3],
 ['hall','span',4.5],['span','gate',4.1],['gate','throne',5.3],['throne','portal',5.5]
];
const pads={entrance:6,overlook:8,stair:5,falls:8,arcade:6,pass:6,fork:8,cells:10,grove:6,ford:8,roots:7,lab:12,
 willow:6,kiln:7,arch:7,cinder:6,hollow:6,door:3.2,gold:8,lip:8,spine:6,hall:13,span:5,gate:6,throne:17,portal:6};
export const plates=[];
function plate(poly,key){plates.push({poly,key,minX:Math.min(...poly.map(p=>p[0])),maxX:Math.max(...poly.map(p=>p[0])),minZ:Math.min(...poly.map(p=>p[1])),maxZ:Math.max(...poly.map(p=>p[1]))});}
for(const [a,b,width] of safePathGraph){
 const [x,z]=nodes[a],[u,v]=nodes[b],l=Math.hypot(u-x,v-z),dx=width*(v-z)/l,dz=width*(x-u)/l;
 plate([[x+dx,z+dz],[u+dx,v+dz],[u-dx,v-dz],[x-dx,z-dz]],a+'-'+b);
}
for(const [name,[x,z]] of Object.entries(nodes)){
 const r=pads[name],poly=[];for(let i=0;i<12;i++){const a=i*Math.PI/6,k=r*(1+.065*Math.sin(i*11+x));poly.push([x+Math.cos(a)*k,z+Math.sin(a)*k]);}plate(poly,name);
}
export function supported(x,z){
 for(const p of plates){if(x<p.minX||x>p.maxX||z<p.minZ||z>p.maxZ)continue;
  let inside=false;for(let i=0,j=p.poly.length-1;i<p.poly.length;j=i++){
   const [a,b]=p.poly[i],[c,d]=p.poly[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)inside=!inside;
  }if(inside)return true;
 }return false;
}
// The ash basin remains walkable between the raised ceremonial paths.
export const basin=[[-36,76],[8,80],[34,68],[41,44],[34,18],[15,5],[9,-6],[-19,-7],[-40,14],[-42,48]];
export function inBasin(x,z){
 let inside=false;for(let i=0,j=basin.length-1;i<basin.length;j=i++){
  const [a,b]=basin[i],[c,d]=basin[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)inside=!inside;
 }return inside;
}
export function caveFloor(x,z){return inBasin(x,z)&&!supported(x,z)?-.19:caveHeight(z);}
export const fixedRocks=[{x:15,z:20,base:-.2,r:2.4,h:3.3}];
export const solids=[...fixedRocks];
export const structures=[];
const bins=new Map(),cell=5;
export function resetStructures(){structures.length=0;bins.clear();}
export function addStructure(x,y,z,w,h,d,angle=0){
 if(x+w+d< -49||x-w-d>48||z+w+d< -107||z-w-d>185||y>95||y+h<-.25)return;
 const cs=Math.cos(angle),sn=Math.sin(angle),radX=(Math.abs(cs)*w+Math.abs(sn)*d)/2+.3,radZ=(Math.abs(sn)*w+Math.abs(cs)*d)/2+.3;
 const o={x,y,z,w:w/2,h,d:d/2,cs,sn};structures.push(o);
 for(let i=Math.floor((x-radX)/cell);i<=Math.floor((x+radX)/cell);i++)for(let j=Math.floor((z-radZ)/cell);j<=Math.floor((z+radZ)/cell);j++){
  const k=(i+512)*1024+j;let bucket=bins.get(k);if(!bucket)bins.set(k,bucket=[]);bucket.push(o);
 }
}
function inStructure(x,y,z,pad){
 const bucket=bins.get((Math.floor(x/cell)+512)*1024+Math.floor(z/cell));if(!bucket)return false;
 for(const o of bucket){const dx=x-o.x,dz=z-o.z;if(y>o.y&&y<o.y+o.h&&Math.abs(dx*o.cs-dz*o.sn)<o.w+pad&&Math.abs(dx*o.sn+dz*o.cs)<o.d+pad)return true;}return false;
}
export function caveBlocked(x,z,doorOpen){return inStructure(x,caveFloor(x,z)+.8,z,.20)||(!doorOpen&&x<-21.4&&Math.abs(z)<8.8)||solids.some(o=>Math.abs(z-o.z)<o.r&&Math.hypot(x-o.x,z-o.z)<o.r+.27);}
export function caveWall(x,y,z){return y>94||inStructure(x,y,z,.12)||solids.some(o=>y>o.base-.2&&y<o.base+o.h&&Math.hypot(x-o.x,z-o.z)<o.r);}
export const heatPools=[{x:3,z:110.3,r:1.15},{x:-2.9,z:114.2,r:.95},{x:1,z:26,r:1.65},{x:25.5,z:40,r:1.35}];
export const creek=[[-35,83,1.7],[-20,68,2],[-12,49,2.2],[9,33,1.7],[3,15,2.3],[-16,1,1.6]];
export function caveHeat(x,z){
 if(heatPools.some(o=>(x-o.x)**2+(z-o.z)**2<o.r**2))return 1;
 if(z<=83&&z>=1&&!supported(x,z)&&inBasin(x,z)){
  for(let i=1;i<creek.length;i++){const [ax,az,ar]=creek[i-1],[bx,bz,br]=creek[i];
   if(z>az||z<bz)continue;const t=(az-z)/(az-bz);
   return Math.abs(x-ax-(bx-ax)*t)<ar+(br-ar)*t?1:0;
  }
 }return 0;
}
export function nearestRest(x,z){
 for(const name of ['overlook','falls','fork','grove','lab','lip','hall','gate']){
  const [u,v]=nodes[name];if(Math.abs(x-u)<2&&Math.abs(z-v)<2)return nodes[name];
 }return null;
}
