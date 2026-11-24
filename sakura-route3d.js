// Eixo percorrível em metros. Cada ponto tem uma cota desenhada; todos os desvios
// voltam ao eixo. Render, bússola, clima e pés consultam o mesmo traçado.
import { CITY2, GATE2, TRAIL2, journeyHeight } from './jornada3d.js';

export const clamp01 = x => Math.max(0, Math.min(1, x));
export function smooth(a, b, x) { const t = clamp01((x-a)/(b-a)); return t*t*(3-2*t); }
const node = (x,z,y) => ({x,z,y});
export const DOJO = {x:-1040,z:-1610,y:127};
export const MASTER = {x:DOJO.x+1.8,z:DOJO.z+3.2};
export const CASTLE = {x:564,z:-254,y:81};
// Local coordinates of the paired towers, shared by both silhouettes and collision.
export const FLANK_TOWERS = [
 [45,-57,7,60],[75,-23,6,80],[67,38,8,92],[42,75,8,107],
 [25,-38,5.5,73],[26,58,5,97],[12,70,4.8,112]
];
export const THRONE = {x:CASTLE.x,z:CASTLE.z+60};
export const SPRING_LAKE = {x:-1260,z:-1450,rx:95,rz:68,y:39};
export const INLET_BRIDGE = {x:SPRING_LAKE.x+25,z:SPRING_LAKE.z-64,y:SPRING_LAKE.y+.28};
export const ICE_LAKE = {x:785,z:-1765,rx:211,rz:119,y:60};
export const COAT_STALL = {x:-321,z:-1870};
const gate=GATE2.out;
const authored = [
 [gate.x,gate.z,journeyHeight(gate.x,gate.z)],[-1624,-319,29],[-1560,-411,36],[-1567,-546,42],
 [-1688,-659,46],[-1740,-827,31],[-1655,-936,33],[-1480,-967,48],[-1392,-1106,59],
 [-1483,-1235,69],[-1650,-1270,62],[-1728,-1420,51],[-1590,-1544,55],[-1400,-1533,44],
 [-1358,-1487,40],[-1359,-1383,43],[-1190,-1368,45],[-1108,-1455,64],[-1195,-1535,82],
 [-1143,-1680,105],[-1040,-1700,116],[-1040,-1650,125],[-1040,-1623,127],[DOJO.x,DOJO.z,DOJO.y],
 [-1040,-1623,127],[-993,-1641,126],[-911,-1772,114],[-735,-1805,99],[-618,-1682,110],
 [-470,-1718,113],[-322,-1868,94],[-256,-2040,108],[-77,-2105,124],[7,-1980,118],
 [-57,-1803,98],[50,-1643,83],[257,-1690,74],[343,-1850,87],[488,-1980,94],
 [676,-1973,77],[730,-1868,61],[800,-1818,60],[908,-1754,60],[974,-1670,63],
 [1082,-1540,88],[1038,-1363,100],[882,-1320,112],[836,-1180,125],[1004,-1060,136],
 [1088,-865,122],[946,-735,107],[822,-804,116],[676,-721,121],[637,-576,99],
 [734,-493,83],[722,-398,69],[616,-385,67],[564,-355,69],[564,-322,75],[564,-295,81],
 [564,-254,81],[564,-213,81],[564,-194,84]
];
export const ROUTE = authored.map(p=>node(...p));
export const DEPARTURE_NOTE = {x:CITY2.x+25,z:CITY2.z-10};
// Follow the surveyed alleys around Cinzária's furnaces and occupied buildings.
const alleys=[[-1255,-92],[-1271,-103],[-1278,-106],[-1281,-109],[-1281,-110],[-1284,-113]];
export const FROM_CITY = [{x:DEPARTURE_NOTE.x+1.2,z:DEPARTURE_NOTE.z+1},...[...alleys,...TRAIL2.slice(0,-1)].map(([x,z])=>({x,z}))];
export const CITY_ROAD = [[564,-194,84],[564,-224,81],[564,-267,81],[564,-304,79],[564,-355,69],[534,-361,68],[492,-337,70],[485,-295,74],[448,-261,66],
 [426,-176,52],[348,-117,34],[287,-55,19],[244,-39,11],[218,-38,7],[202,-37,5],[186,-35,4],[165,-36,4],[148,-40,4]].map(p=>node(...p));
const paths=[
 [7,[[-1512,-1064,66],[-1635,-1105,94],[-1620,-1202,81]],10,'Jardim das raízes'],
 [10,[[-1804,-1268,72],[-1905,-1405,93],[-1840,-1560,88],[-1694,-1612,67]],12,'Mirante da lua'],
 [13,[[-1425,-1408,52],[-1404,-1312,62],[-1274,-1253,81],[-1170,-1308,55]],16,'Fonte das lanternas'],
 [17,[[-1003,-1438,82],[-938,-1507,108],[-920,-1623,128]],25,'Terraço das andorinhas'],
 [28,[[-599,-1546,117],[-451,-1517,128],[-286,-1647,106]],30,'Última cerejeira'],
 [34,[[-210,-1725,118],[-153,-1560,131],[7,-1491,122],[197,-1550,93]],36,'Refúgio do pinhal'],
 [39,[[820,-2065,91],[1002,-2001,80],[1122,-1854,91],[1116,-1700,82]],44,'Gruta do vidro'],
 [46,[[706,-1327,154],[615,-1198,169],[730,-1040,148]],48,'Arquivo da vigia'],
 [52,[[510,-777,137],[401,-654,152],[431,-512,119],[518,-421,89]],56,'Atalaia do ocaso']
];
export const DETOURS = paths.map(([a,ps,b,name])=>({name,points:[ROUTE[a],...ps.map(p=>node(...p)),ROUTE[b]]}));
export const POIS = [
 [0,'cinza-fria','Costas de Cinzária'],[5,'porta-primavera','Portão da Primavera'],[9,'bosque-antigo','Galeria das cerejeiras'],
 [13,'lago-petalas','Lagos das Pétalas'],[19,'escadaria-lua','Escadaria da Lua'],[23,'dojo-sakura','Dojo da Lua Suspensa'],
 [28,'ultima-flor','Despedida da Primavera'],[33,'pinhal','Pinhal da Alvorada'],[41,'espelho-glacial','Espelho Glacial'],
 [47,'ponte-vigia','Ponte da Vigia'],[55,'muralhas-neve','Muralhas de Invernália'],[62,'trono-gelo','Trono do Inverno']
].map(([i,id,name])=>({id,name,...ROUTE[i],index:i,kind:'village',revealRadius:27}));
// Pilgrim platforms clear the road and the dojo's suspended span. Their IDs
// stay stable in map saves even when the orientation of the road changes.
export const SHELTERS = [
 [5,'Abrigo das Lanternas',-1751,-828],[13,'Abrigo do Lago',-1397,-1544],[22,'Abrigo do Dojo',-1024,-1608],
 [34,'Abrigo da Alvorada',-46,-1804],[43,'Abrigo Glacial',983,-1677],[56,'Abrigo da Muralha',619,-374]
].map(([i,name,x,z])=>({id:'abrigo-ato3-'+i,name,x,z}));
const cells=new Map(), grid=128;
export const LENGTHS=[0];
for(let i=1;i<ROUTE.length;i++) LENGTHS.push(LENGTHS[i-1]+Math.hypot(ROUTE[i].x-ROUTE[i-1].x,ROUTE[i].z-ROUTE[i-1].z));
function indexRoad(path,progress,kind){
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;
  const s={a,b,dx,dz,len2,start:progress(i-1),end:progress(i),kind};
  for(let j=Math.floor((Math.min(a.z,b.z)-245)/grid);j<=Math.floor((Math.max(a.z,b.z)+245)/grid);j++)
   for(let k=Math.floor((Math.min(a.x,b.x)-245)/grid);k<=Math.floor((Math.max(a.x,b.x)+245)/grid);k++){
    const key=k+j*128;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(s);
   }
 }
}
indexRoad(ROUTE,i=>i,'main');
DETOURS.forEach((d,k)=>{const [a,,b]=paths[k];indexRoad(d.points,i=>a+(b-a)*i/(d.points.length-1),'trail');});
indexRoad(CITY_ROAD,()=>63,'town');
export function sampleRoad(x,z){
 if(z>88||z<-2420||x < -2170||x>1415||(z>-265&&x>-1270&&x<198))return null;
 const list=cells.get(Math.floor(x/grid)+Math.floor(z/grid)*128);
 if(!list)return null;
 let distance=Infinity,best,t;
 for(const s of list){const k=clamp01(((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.len2),ex=x-s.a.x-k*s.dx,ez=z-s.a.z-k*s.dz,d=ex*ex+ez*ez;
  if(d<distance){distance=d;best=s;t=k;}}
 const s=best;return {d:Math.sqrt(distance),y:s.a.y+(s.b.y-s.a.y)*t,i:s.start+(s.end-s.start)*t,kind:s.kind,tangent:Math.atan2(s.dx,s.dz)};
}
export const snowAt=i=>smooth(25,35,i);
export const bloomAt=i=>smooth(1.8,6,i)*(1-smooth(25,32,i));
export function ellipse(x,z,l){return Math.hypot((x-l.x)/l.rx,(z-l.z)/l.rz);}
export function noise(x,z){
 const i=Math.floor(x),j=Math.floor(z),u=smooth(0,1,x-i),v=smooth(0,1,z-j);
 const n=(i,j)=>{let k=Math.imul(i,1597334677)^Math.imul(j,3812015801);k=Math.imul(k^(k>>>16),2246822519);return ((k^(k>>>13))>>>0)/4294967296;};
 const a=n(i,j)*(1-u)+n(i+1,j)*u,b=n(i,j+1)*(1-u)+n(i+1,j+1)*u;return a+(b-a)*v;
}
export function regionWeight(x,z,p=sampleRoad(x,z)){
 if(!p||p.d>235)return 0;
 const w=p.kind==='town'?smooth(201,249,x):p.i<3?smooth(-280,-384,z):1;
 return w*(1-smooth(155,235,p.d));
}
// The old basalt ring ends a few metres behind the cave. Its original boundary
// must open down this particular outward-facing trail before the ground blend starts.
export function leavesVolcano(z,p){return !!p && p.kind==='main' && p.i<2.1 && z<gate.z-.4 && p.d<8.8;}
function inletFloor(x,z){
 const u=(x-INLET_BRIDGE.x)/3.55;
 return Math.abs(u)<=1&&Math.abs(z-INLET_BRIDGE.z)<.89?INLET_BRIDGE.y+.34*(1-u*u):null;
}
export function lakeDepth(x,z){
 if(inletFloor(x,z)!==null)return -1;
 const a=ellipse(x,z,SPRING_LAKE);if(a<1)return (1-a)*17;
 for(const [cx,cz,r] of [[825,-1702,23],[726,-1790,15],[900,-1820,12]]){
  const d=Math.hypot((x-cx)*.77,z-cz);if(d<r)return (r-d)*.52;
 }
 return -1;
}
export function buildingFloor(x,z){
 const dx=x-CASTLE.x,dz=z-CASTLE.z,u=Math.abs(dx);
 if(u<19 && dz>=-102 && dz<-41)return 69+12*clamp01((dz+101)/60);
 if(u<=27&&dz>=-41&&dz<=68){
  if(u>=14&&dz>=-12&&dz<18)return 81+7*(dz+12)/30;
  if(u>=14&&dz>=18)return 88;
  if(u<13&&dz>=42)return 81+3*clamp01((dz-42)/15);
  return 81;
 }
 if(Math.abs(x-DOJO.x)<14&&Math.abs(z-DOJO.z)<13)return DOJO.y;
 return null;
}
const ga=ROUTE[46],gb=ROUTE[47],bridgeLength=Math.hypot(gb.x-ga.x,gb.z-ga.z);
export const GLACIER_BRIDGE={x:ga.x+(gb.x-ga.x)*.31,z:ga.z+(gb.z-ga.z)*.31,y:ga.y+(gb.y-ga.y)*.31,
 dx:(gb.x-ga.x)/bridgeLength,dz:(gb.z-ga.z)/bridgeLength,len:bridgeLength*.44,rise:(gb.y-ga.y)*.44};
// The same stations describe the planks, inclines, flared landings and rails.
export const DOJO_BRIDGE = {x:DOJO.x, start:-1686, end:-1623, halfWidth:3.6};
export function bridgeSection(z){
 const {start,end,halfWidth}=DOJO_BRIDGE;
 if(z<start || z>end)return null;
 const a=z<=ROUTE[21].z?ROUTE[20]:ROUTE[21];
 const b=z<=ROUTE[21].z?ROUTE[21]:ROUTE[22];
 return {height:a.y+(b.y-a.y)*(z-a.z)/(b.z-a.z),
  width:halfWidth+2.8*(1-smooth(0,8,Math.min(z-start,end-z)))};
}
export function ravine(x,z){
 const b=GLACIER_BRIDGE,dx=x-b.x,dz=z-b.z;
 const t=(dx*b.dx+dz*b.dz)/b.len,side=dx*b.dz-dz*b.dx;
 return {t,side,cut:smooth(0,.19,t)*(1-smooth(.81,1,t))*(1-smooth(44,87,Math.abs(side)))};
}
export function landscape(x,z,p=sampleRoad(x,z)){
 if(!p)return 30;
 const b=buildingFloor(x,z);if(b!==null)return b;
 const n=noise(x*.013,z*.013),f=noise(x*.049,z*.049),d=p.d;
 let y=p.y+smooth(5,62,d)*((n-.37)*24+(f-.5)*5)+smooth(54,195,d)*(23+105*noise(x*.0062,z*.0062));
 if(p.i>45&&p.i<49){const g=ravine(x,z);y-=g.cut*47;}
 // The rope bridge leaves the escarpment exposed on both sides of its deck.
 if(Math.abs(x-DOJO.x)<47&&z>-1682&&z<-1624){
  const t=smooth(-1682,-1672,z)*(1-smooth(-1633,-1624,z));y-=t*48*(p.i>23?smooth(5,23,p.d):1)*(1-smooth(31,47,Math.abs(x-DOJO.x)));
 }
 if(Math.abs(x-DOJO.x)<30&&Math.abs(z-DOJO.z)<27)y=127-1.2*smooth(12,27,Math.abs(z-DOJO.z));
 for(const l of [SPRING_LAKE,ICE_LAKE]){
  const r=ellipse(x,z,l);if(r<1.22){const h=l===ICE_LAKE?l.y:l.y-1.2-(1-Math.min(r,1))*7;
   y+=(h-y)*(1-smooth(.91,1.22,r));}
 }
 return y;
}
export function routeGround(x,z,p=sampleRoad(x,z)){
 const deck=inletFloor(x,z);if(deck!==null)return deck;
 if(p&&p.i>45&&p.i<49){const g=ravine(x,z);if(g.t>=0&&g.t<=1&&Math.abs(g.side)<3.55)return GLACIER_BRIDGE.y+g.t*GLACIER_BRIDGE.rise;}
 const section=bridgeSection(z);
 if(section&&Math.abs(x-DOJO_BRIDGE.x)<=section.width+.2)return section.height;
 return landscape(x,z,p);
}
export function roadBlocked(x,z,p=sampleRoad(x,z)){
 if(!p)return false;
 if(lakeDepth(x,z)>=1.25)return true;
 if(p.i>45&&p.i<49){const g=ravine(x,z);if(g.t>.01&&g.t<.99&&Math.abs(g.side)>3.13&&Math.abs(g.side)<3.94)return true;}
 let X=Math.abs(x-DOJO.x),Z=z-DOJO.z;
 if(X<12&&Z>=-11&&Z<=11){
  if(X>11.1||Z>10.3||(Z<-10.2&&X>2.4))return true;
 }
 const section=bridgeSection(z);
 if(section&&X>=section.width-.32&&X<=section.width+.65)return true;
 X=Math.abs(x-CASTLE.x);Z=z-CASTLE.z;
 if(X<85&&Z>-70&&Z<90){
  if(Math.abs(X-45)<1.35 && Z>=-49.5 && Z<=25.5)return true;
  for(const [tx,tz,radius] of FLANK_TOWERS){
   if((X-tx)**2+(Z-tz)**2<(radius*1.1)**2)return true;
  }
 }
 if(Z>=-41&&Z<68&&X<28){
  if(X>26.4||Z>66.5||(Z<-39.7&&X>5))return true;
  if(Math.abs(X-13.6)<.8&&Z>=-12&&Z<56)return true;
  if(X<4&&Z>62)return true;
 }
 return false;
}
export function nextGuide(x,z,stage){
 if(stage>=2){const n=nearestIndex(CITY_ROAD,x,z);return CITY_ROAD[Math.min(n+1,CITY_ROAD.length-1)];}
 if(stage===0&&z>-280&&x<-1200){const n=nearestIndex(FROM_CITY,x,z);if(n<FROM_CITY.length-1)return FROM_CITY[n+1];}
 const lo=stage===0?0:24,hi=stage===0?23:62;
 const i=nearestIndex(ROUTE,x,z,lo,hi);return ROUTE[Math.min(i+1,hi)];
}
function nearestIndex(points,x,z,start=0,end=points.length-1){
 let best=start,d=Infinity;for(let i=start;i<=end;i++){const p=points[i],dd=(p.x-x)**2+(p.z-z)**2;if(dd<d){d=dd;best=i;}}return best;
}
