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
export const solids=[];
export function caveBlocked(x,z,doorOpen){return (!doorOpen&&x<-21.4&&Math.abs(z)<8.8)||solids.some(o=>Math.abs(z-o.z)<o.r&&Math.hypot(x-o.x,z-o.z)<o.r+.27);}
export function caveWall(x,y,z){return y>94||solids.some(o=>y>o.base-.2&&y<o.base+o.h&&Math.hypot(x-o.x,z-o.z)<o.r);}
export const heatPools=[{x:3,z:110.3,r:1.15},{x:-2.9,z:114.2,r:.95},{x:1,z:26,r:1.65},{x:25.5,z:40,r:1.35}];
export function caveHeat(x,z){return heatPools.some(o=>(x-o.x)**2+(z-o.z)**2<o.r**2)?1:0;}
