// Spatial index of the same triangles used for the walkable props. Coordinates
// are in world metres. Wind-blown leaves and particles have no solid volume.
import {STEP_UP, HEADROOM} from './eldoria-walkable.js';

const CELL=4, RADIUS=.24, EPS=.002;
const key=(x,z)=>x+65536*z;
const cross=(a,b,x,z)=>(b.x-a.x)*(z-a.z)-(b.z-a.z)*(x-a.x);
function edgeFraction(a,b,x,z){
 const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
 return len?Math.min(1,Math.max(0,((x-a.x)*dx+(z-a.z)*dz)/len)):0;
}
// Clip the face to the player's vertical interval before testing its footprint.
// This leaves the space under a lintel or a raised deck open.
function clip(points,y,above){
 const out=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  const takeA=above?a.y>=y:a.y<=y,takeB=above?b.y>=y:b.y<=y;
  if(takeA)out.push(a);
  if(takeA!==takeB){const t=(y-a.y)/(b.y-a.y);out.push({x:a.x+t*(b.x-a.x),y,z:a.z+t*(b.z-a.z)});}
 }
 return out;
}
function touches(face,x,z,lo,hi,radius){
 if(face.max<=lo||face.min>=hi||x+radius<face.x0||x-radius>face.x1||z+radius<face.z0||z-radius>face.z1)return false;
 let poly=face.points;
 if(face.min<lo)poly=clip(poly,lo,true);
 if(face.max>hi)poly=clip(poly,hi,false);
 let positive=false,negative=false;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],side=cross(a,b,x,z);
  const t=edgeFraction(a,b,x,z);
  if((x-a.x-t*(b.x-a.x))**2+(z-a.z-t*(b.z-a.z))**2<=radius*radius)return true;
  if(side>0)positive=true;
  if(side<0)negative=true;
 }
 return poly.length>=3&&positive!==negative;
}
export function createContacts(){
 const cells=new Map();
 function add(positions,origin={x:0,y:0,z:0},yaw=0,range=Infinity){
  const inserted=new Map(),cs=Math.cos(yaw),sn=Math.sin(yaw);
  for(let i=0;i<positions.length;i+=9){
   const points=[];
   for(let j=i;j<i+9;j+=3){const x=positions[j],z=positions[j+2];
    points.push({x:origin.x+x*cs+z*sn,y:origin.y+positions[j+1],z:origin.z-x*sn+z*cs});}
   const [a,b,c]=points,min=Math.min(a.y,b.y,c.y),max=Math.max(a.y,b.y,c.y);
   if(min>origin.y+range)continue;
   const area=cross(a,b,c.x,c.z);
   const face={points,min,max,area,x0:Math.min(a.x,b.x,c.x),x1:Math.max(a.x,b.x,c.x),
    z0:Math.min(a.z,b.z,c.z),z1:Math.max(a.z,b.z,c.z)};
   const left=Math.floor((Math.min(a.x,b.x,c.x)-RADIUS)/CELL),right=Math.floor((Math.max(a.x,b.x,c.x)+RADIUS)/CELL);
   const back=Math.floor((Math.min(a.z,b.z,c.z)-RADIUS)/CELL),front=Math.floor((Math.max(a.z,b.z,c.z)+RADIUS)/CELL);
   for(let ix=left;ix<=right;ix++)for(let iz=back;iz<=front;iz++){
    const k=key(ix,iz);
    if(!inserted.has(k))inserted.set(k,[]);
    inserted.get(k).push(face);
   }
  }
  for(const [k,batch] of inserted){if(!cells.has(k))cells.set(k,new Set());cells.get(k).add(batch);}
  return ()=>{for(const [k,batch] of inserted){const cell=cells.get(k);if(cell){cell.delete(batch);if(!cell.size)cells.delete(k);}}};
 }
 function blocked(x,z,y,step=STEP_UP,head=HEADROOM,radius=RADIUS){
  const cell=cells.get(key(Math.floor(x/CELL),Math.floor(z/CELL)));
  if(cell)for(const batch of cell)for(const f of batch)if(touches(f,x,z,y+step+EPS,y+head-EPS,radius))return true;
  return false;
 }
 function height(x,z,limit,ceiling=false){
  let result=ceiling?Infinity:-Infinity;
  const sole=ceiling?0:.085;
  const cell=cells.get(key(Math.floor(x/CELL),Math.floor(z/CELL)));
  if(cell)for(const batch of cell)for(const f of batch){
   if(x+sole<f.x0||x-sole>f.x1||z+sole<f.z0||z-sole>f.z1||Math.abs(f.area)<1e-6||(ceiling?f.max<limit-EPS||f.min>=result:f.min>limit+EPS||f.max<=result))continue;
   const [a,b,c]=f.points,u=cross(b,c,x,z)/f.area,v=cross(c,a,x,z)/f.area,w=1-u-v;
   let h=a.y*u+b.y*v+c.y*w;
   if(Math.min(u,v,w)<-1e-6){
    // A shoe can straddle a plank seam. Do not extend the collision plane
    // past the actual edge of a sloping object.
    let nearest=sole*sole;h=NaN;
    for(let i=0;i<3;i++){
     const p=f.points[i],q=f.points[(i+1)%3],t=edgeFraction(p,q,x,z);
     const dist=(x-p.x-t*(q.x-p.x))**2+(z-p.z-t*(q.z-p.z))**2;
     if(dist<=nearest){nearest=dist;h=p.y+t*(q.y-p.y);}
    }
   }
   if(ceiling?h>=limit-EPS:h<=limit+EPS)result=ceiling?Math.min(result,h):Math.max(result,h);
  }
  return result;
 }
 return {add,blocked,height};
}
