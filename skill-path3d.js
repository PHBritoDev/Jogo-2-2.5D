/** Bounded swept scenery query. Sampling at 8 cm also catches thin walls at low FPS. */
export function blockedSegment(a,b,blocked,radius=0){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.08));
 for(let i=1;i<=n;i++){const u=i/n,x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u,z=a.z+(b.z-a.z)*u;
  if(blocked({x,y,z})||(radius>0&&(blocked({x:x+radius,y,z})||blocked({x:x-radius,y,z})||blocked({x,y,z:z+radius})||blocked({x,y,z:z-radius}))))return true;
 }return false;
}
