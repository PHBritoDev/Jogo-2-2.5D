// Control points are lateral, vertical and forward metres in the boss's frame.
const RAILS={
 announce:[[3.8,2.8,6.2],[2.1,2.1,4],[.95,1.9,2.6],[.45,1.75,2.15]],
 bladeCombo:[[.45,1.75,2.15],[-.6,1.4,3.8],[-2.6,1.7,4.8],[-3.2,1.9,4.4]],
 throw:[[-3.2,1.9,4.4],[-2.8,1.55,5.4],[-2.3,2.6,7.8],[1,4,10]],
 charge:[[1,4,10],[6.5,5.4,11],[10.5,6.7,9.6],[13,7.4,5.8]],
 collapse:[[9,6,13],[9,5,12],[8,4.7,11],[8,4.6,10]],
 detonate:[[8,4.6,10],[10,6.3,15],[13,9,19],[15,12,22]],
 aftermath:[[15,12,22],[14,11.3,20],[10,9.2,18],[7,7.4,14]],
 recover:[[7,7.4,14],[6,6.2,12],[5,4.8,9],[4,3.5,7]]
};
export function createUsuraShots(T,center,radius){
 const paths=Object.fromEntries(Object.entries(RAILS).map(([name,points])=>[name,new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)))]));
 const v=new T.Vector3(),at=new T.Vector3(),look=new T.Vector3();
 let bearing=0;
 return function shot(phase,p,a,head,blade,hero,normal,faceBearing){
  if(phase==='announce')bearing=faceBearing;
  const fx=Math.sin(bearing),fz=Math.cos(bearing);
  if(phase==='escape'){
   // Use the player-to-refuge axis until the chase camera takes over.
   const k=Math.max(0,1-p*4);
   at.set(hero.x-normal.x*7,hero.y+4.5,hero.z-normal.z*7);
   look.set(hero.x+normal.x*4,hero.y+1.3,hero.z+normal.z*4);
   return {at,look,weight:.76*k,fov:57};
  }
  if(!paths[phase])return null;
  paths[phase].getPoint(p,v);
  at.set(a.x+fz*v.x+fx*v.z,a.y+v.y,a.z-fx*v.x+fz*v.z);
  // Keep the rail inside the rock boundary even at the four extreme poses.
  const x=at.x-center.x,z=at.z-center.z,d=Math.hypot(x,z),limit=radius-1;
  if(d>limit){at.x=center.x+x*limit/d;at.z=center.z+z*limit/d;at.y+=Math.min(6,(d-limit)*.65);}
  look.copy(head);
  if(phase==='bladeCombo')look.lerp(blade,.25);
  if(phase==='throw'||phase==='charge')look.lerp(blade,phase==='throw'?.72*p:.69-.04*p);
  if(['collapse','detonate','aftermath','recover'].includes(phase)){
   look.lerp(blade,.33);look.lerp(hero,.14);look.y=Math.max(a.y+2,look.y);
  }
  return {at,look,weight:phase==='recover'?1-p:1,fov:phase==='announce'?46-6*p:phase==='bladeCombo'?40+7*p:phase==='throw'?47+8*p:phase==='charge'?55+7*p:62};
 };
}
