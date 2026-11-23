// Original vertex-coloured geometry, batched in local coordinates (one opaque
// draw per building). Positions use metres. No downloaded meshes or textures.
export function batch(T) {
 const pos=[], colors=[], c=new T.Color(), a=new T.Vector3(),b=new T.Vector3();
 function tri(p,q,r,tone,light=1){c.set(tone);pos.push(...p,...q,...r);for(let i=0;i<3;i++)colors.push(c.r*light,c.g*light,c.b*light);}
 function quad(p,q,r,s,tone,l=1){tri(p,q,r,tone,l);tri(p,r,s,tone,l);}
 function box(x,y,z,w,h,d,tone){
  const X=x-w/2,Y=y-h/2,Z=z-d/2,xx=x+w/2,yy=y+h/2,zz=z+d/2;
  const pts=[[X,Y,Z],[xx,Y,Z],[xx,yy,Z],[X,yy,Z],[X,Y,zz],[xx,Y,zz],[xx,yy,zz],[X,yy,zz]];
  [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]].forEach(([i,j,k,l])=>quad(pts[i],pts[j],pts[k],pts[l],tone));
 }
 function tube(start,end,r,s,tone,sides=8,phase=0){
  a.set(end[0]-start[0],end[1]-start[1],end[2]-start[2]).normalize();
  b.set(Math.abs(a.y)>.92?1:0,Math.abs(a.y)>.92?0:1,0).cross(a).normalize();const v=new T.Vector3().crossVectors(a,b);
  const ring=(p,rad,i)=>{const t=2*Math.PI*i/sides+phase,u=Math.cos(t)*rad,w=Math.sin(t)*rad;return [p[0]+b.x*u+v.x*w,p[1]+b.y*u+v.y*w,p[2]+b.z*u+v.z*w];};
  for(let i=0;i<sides;i++){const p=ring(start,r,i),q=ring(start,r,i+1),u=ring(end,s,i+1),v=ring(end,s,i);quad(p,q,u,v,tone,.87+.13*(i%3)/2);if(s>.05)tri(end,v,u,tone);}
 }
 function rib(points,r,tone,sides=7){for(let i=1;i<points.length;i++)tube(points[i-1],points[i],r,r*.98,tone,sides);}
 function geometry(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingSphere();return g;}
 return {box,tube,tri,quad,rib,geometry};
}
const bark=0x382335,vermilion=0x853c44,brass=0xd6a96f,slate=0x394354,wood=0x603f43;
export function lantern(m,x,y,z,stone=false,s=1){
 const P=(a,b,c)=>[x+a*s,y+b*s,z+c*s],post=stone?0x737572:wood;
 m.tube(P(0,0,0),P(0,1.8,0),.17*s,.12*s,post,8);
 m.box(x,y+1.78*s,z,.72*s,.13*s,.72*s,post);m.box(x,y+2.08*s,z,.46*s,.52*s,.46*s,0xffd69b);
 for(const i of [-1,1])for(const j of [-1,1])m.tube(P(.25*i,1.8,.25*j),P(.25*i,2.38,.25*j),.035*s,.035*s,post,4);
 m.tube(P(0,2.34,0),P(0,2.65,0),.58*s,.12*s,post,4,Math.PI/4);m.tube(P(0,2.64,0),P(0,2.82,0),.09*s,0,brass,6);
}
export function torii(m,s=1){
 for(const sign of [-1,1]){const x=sign*3.3*s;m.tube([x,0,0],[x*.96,6.3*s,0],.32*s,.26*s,vermilion,12);m.tube([x,-.1,0],[x,.62*s,0],.49*s,.37*s,slate,10);}
 m.box(0,4.95*s,0,8.4*s,.32*s,.38*s,vermilion);m.box(0,5.55*s,0,.65*s,1.03*s,.42*s,wood);
 for(let i=-6;i<6;i++){const f=i/6,g=(i+1)/6;for(const [dy,col,w] of [[0,vermilion,.23],[.27,slate,.28]]){
  m.tube([f*5.1*s,(6+.51*f*f+dy)*s,0],[g*5.1*s,(6+.51*g*g+dy)*s,0],w*s,w*s,col,6);}}
}
function roof(m,y,rx,rz,rise){
 const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
 for(let side=0;side<4;side++){const a=corners[side],b=corners[(side+1)%4];
  function pt(u,v){const X=a[0]+(b[0]-a[0])*u,Z=a[1]+(b[1]-a[1])*u;
   return [X*rx*(1-.76*v),y+rise*(v*v*.72+v*.28)+1.15*(1-v)*Math.pow(Math.abs(2*u-1),3),Z*rz*(1-.76*v)];}
  for(let j=0;j<4;j++)for(let i=0;i<14;i++){const u=i/14,v=j/4;
   m.quad(pt(u,v),pt((i+1)/14,v),pt((i+1)/14,(j+1)/4),pt(u,(j+1)/4),[0x2f3346,0x414158,0x344455,0x414a60][(i+j)%4]);
   if(j===0)m.tube(pt(u,0),pt((i+1)/14,0),.17,.15,brass,6);
   if(i%2===0)m.tube(pt(u,v),pt(u,(j+1)/4),.07,.07,0x5c5463,5);
  }
  m.rib([pt(0,1),pt(0,.6),pt(0,.28),pt(0,0)],.22,0x72676d);
 }
}
export function dojoBuilding(m){
 m.box(0,-.34,0,27,.65,25,wood);
 for(let x=-12;x<=12;x+=4)for(let z=-10;z<=10;z+=5){
  m.tube([x,-25,z],[x,-.45,z],.56,.46,bark,10);
  if(x<12)m.tube([x,-8,z],[x+4,-2,z],.26,.22,wood,6);
  if(z<10)m.tube([x,-8,z],[x,-2,z+5],.26,.22,wood,6);
 }
 function shoji(x,z,w,h,along,base){const bx=(u,y,d,l,c)=>m.box(x+(along?u:0),base+y,z+(along?0:u),along?l:d,h,.01,c);
  m.box(x,base+h/2,z,along?w:.18,h,along?.18:w,base>6?0xe9a2bb:0xc3a7a3);
  for(let i=0;i<=Math.ceil(w/.82);i++){const u=-w/2+w*i/Math.ceil(w/.82);
   m.box(x+(along?u:0),base+h/2,z+(along?0:u),along?.09:.27,h,along?.27:.09,bark);}
  for(let i=0;i<=3;i++)m.box(x,base+h*i/3,z,along?w:.29,.12,along?.29:w,wood);
 }
 for(let n=0;n<4;n++){const y=n*6.5,w=11.6-n*2.45,d=10.9-n*2.26,h=n?3.9:5.8;
  shoji(0,d,2*w,h,true,y);for(const s of [-1,1]){
   shoji(s*w,0,2*d,h,false,y);if(n)shoji(s*w*.5,-d,w,h,true,y);
   else shoji(s*(w+2.6)/2,-d,w-2.6,h,true,y);
   for(const t of [-1,1]){m.tube([s*w,y,t*d],[s*w,y+h,t*d],.36,.30,vermilion,10);m.box(s*w,y+h-.35,t*d,1.38,.4,1.4,brass);}
  }
  m.box(0,y+h,0,2*w+1.6,.38,2*d+1.6,wood);roof(m,y+h+.15,w+3.4,d+3.2,n===3?3.6:2.7);
 }
 m.tube([0,27,0],[0,33.4,0],.23,.035,brass,10);
 for(let i=0;i<5;i++)m.tube([0,27.6+i*.7,0],[0,27.9+i*.7,0],.85-i*.12,.48-i*.06,brass,10);
 // Woven mats with border strips, tokonoma, bokken and exposed rafters.
 for(let i=-4;i<4;i++)for(let j=-3;j<3;j++){const x=(i+.5)*2.4,z=(j+.5)*3.1;
  m.box(x,.025,z,2.36,.052,3.06,(i+j)%2?0xc6ba86:0xb9b88e);
  for(const s of [-1,1])m.box(x+1.12*s,.059,z,.09,.018,3.05,0x485a51);
  for(let k=0;k<8;k++)m.box(x,.057,z-1.34+k*.38,2.13,.01,.024,0xabaa7b);
 }
 for(let x=-9;x<=9;x+=4.5)m.box(x,5.27,0,.34,.42,22,bark);
 m.box(0,.28,8.4,7,.54,2.2,wood);m.box(0,3.05,10.3,2.7,3.3,.17,0xdbc8ae);
 m.rib([[-.82,1.9,10.15],[-.32,2.5,10.15],[.4,3.3,10.15],[.75,4.2,10.15]],.07,0x57494e);
 for(const z of [-3.7,-2.8])m.box(-8.7,.7,z,.35,1.4,.36,wood);
 for(let i=0;i<3;i++)m.tube([-8.7,.5+i*.35,-4.5],[-8.7,.6+i*.35,-2],.062,.04,brass);
 for(const s of [-1,1]){lantern(m,s*5.6,0,-9.6);lantern(m,s*9,0,7);}
}
const rock=0x435b74,edge=0x8094a8,snow=0xc8d6df,deep=0x2c4058,ice=0x8ecce1;
function spire(m,x,y,z,r,h){
 const p=(dy)=>[x,y+dy,z];m.tube(p(0),p(h*.09),r*1.22,r,rock,8,Math.PI/8);
 m.tube(p(h*.08),p(h*.59),r,r*.91,rock,8,Math.PI/8);
 for(const n of [.24,.45,.58])m.tube(p(h*n),p(h*n+.65),r*1.12,r*1.08,edge,8,Math.PI/8);
 m.tube(p(h*.59),p(h*.64),r*1.23,r*1.06,snow,8,Math.PI/8);m.tube(p(h*.64),p(h*.83),r*1.06,r*.36,deep,8,Math.PI/8);m.tube(p(h*.83),p(h),r*.36,.04,ice,8,Math.PI/8);
 for(let k=0;k<8;k++){const a=k*Math.PI/4+Math.PI/8,c=Math.cos(a),s=Math.sin(a);
  m.rib([[x+c*r,y+h*.12,z+s*r],[x+c*r*.95,y+h*.54,z+s*r*.78],[x+c*r*1.05,y+h*.64,z+s*r*1.05],[x,y+h,z]],.13,edge,5);}
}
function arch(m,x,y,z,half,h,axis='x',r=.48,tone=edge){
 // Pointed two-centred arch rather than a semicircle. Span is left open.
 for(const s of [-1,1]){
  const p=(u,v)=>axis==='x'?[x+s*u,y+v,z]:[x,y+v,z+s*u];
  const pts=[p(half,0),p(half,h*.48)];
  for(let i=1;i<=7;i++){const a=i/7;pts.push(p(half*(1-a*a),h*(.48+.52*a)));}
  m.rib(pts,r,tone,7);
 }
}
function windowPanel(m,x,y,z,h){
 const w=h*.235; // lancet, luminous central diamond and split tracery
 m.quad([x,y,z-w],[x,y,z+w],[x,y+h*.68,z+w],[x,y+h*.68,z-w],0x407a9a);
 m.tri([x,y+h*.68,z-w],[x,y+h*.68,z+w],[x,y+h,z],0x66a9c4);
 arch(m,x,y,z,w,h,'z',.25,ice);m.tube([x,y,z],[x,y+h*.86,z],.11,.08,edge);
 for(let j=1;j<=3;j++){const yy=y+h*j/5;m.tube([x,yy,z-w],[x,yy,z+w],.08,.08,edge);
  for(const s of [-1,1])m.tri([x-.04,yy,z+s*.15],[x-.04,yy+h*.09,z+s*w*.8],[x-.04,yy+h*.16,z+s*.15],0xb2dfec);}
}
export function castleBuilding(m){
 // Exterior: staggered curtain walls, asymmetric side districts, nave and a soaring crossing.
 for(const s of [-1,1]){
  for(const [x,z,r,h] of [[45,-57,7,60],[75,-23,6,80],[67,38,8,92],[42,75,8,107],[25,-38,5.5,73],[26,58,5,97],[12,70,4.8,112]])
   spire(m,s*x,0,z,r,h);
  m.box(s*45,4,-12,2.4,16,75,rock);
  for(let i=-46;i<=33;i+=7){m.box(s*45,12.9,i,2.75,1.8,3.4,snow);}
  // A pointed peristyle with a real opening on the axis.
  m.box(s*27.9,11.8,13,2.7,24,108,rock);
  m.box(s*15.6,13,-41,20.7,26,3.4,rock);
  for(let j=0;j<6;j++){const z=-30+j*16;
   for(const v of [-1,1])windowPanel(m,s*(26.51+v*.02),8.5,z,12);
   m.box(s*14.9,6.1,z,2.3,12.2,2.5,rock);m.tube([s*14.9,12,z],[s*14.9,17,z],1.4,.88,edge,10);
   // Nave rib meets the ridge, diagonal vault ribs meet the next transverse bay.
   for(const dz of [0,7.8,-7.8])m.rib([[s*14.9,16.8,z],[s*14,21,z+dz*.22],[s*10,26,z+dz*.60],[0,31.4,z+dz]],.44,edge,8);
   m.rib([[s*38,.3,z],[s*35,10,z],[s*32.5,18,z],[s*28.5,22,z]],1,edge,7);
   m.tube([s*35,8,z],[s*35,25,z],1.5,.05,ice,6);
   for(const t of [-1,1])m.quad([0,32,z],[s*15,23,z],[s*27,21,z],[s*27,21,z+t*8],deep);
   m.quad([0,32,z-8],[s*27,21,z-8],[s*27,21,z+8],[0,32,z+8],deep);
  }
  for(let i=0;i<40;i++){const z=-101+i*1.5,h=12*i/40;m.box(s*9,h-12+.17,z,17.9,.35,1.52,i%4?edge:snow);}
  for(let i=0;i<20;i++){const z=-12+i*1.5;m.box(s*20.4,7*i/20+.15,z,12.6,.3,1.52,i%4?edge:snow);}
  m.box(s*20.6,6.8,42,12.3,.39,48,edge);
  for(let z=20;z<=62;z+=3)m.tube([s*14.2,7,z],[s*14.2,8.5,z],.14,.11,edge);
  m.rib([[s*14.2,8.5,18],[s*14.2,8.5,64]],.19,ice);
  for(let z=28;z<62;z+=7){m.box(s*24.4,8.5,z,1.2,3,4.2,deep);
   for(let j=0;j<7;j++)m.box(s*23.7,8.1+j%3*.38,z-1.65+j*.53,.3,1.3,.35,j%2?0x8298a7:0x456281);}
  for(let i=0;i<4;i++)spire(m,s*(17+i*6),-8,-84+i*9,1.5+i*.25,16+i*4);
 }
 arch(m,0,0,-42,5.8,17,'x',1.1,edge);arch(m,0,.3,-43,5.4,16.1,'x',.42,ice);
 for(let i=0;i<3;i++)arch(m,0,17+i*5,-41+i*1.6,7-i,13-i,'x',.52,edge);
 m.box(0,16,67.7,55,32,2.8,rock);
 for(let i=0;i<13;i++){const h=4+16*(1-Math.abs(i-6)/7)+Math.sin(i*7)*2.6,x=(i-6)*1.24;
  m.tube([x,2.9,63.8],[x*1.43,h,65+Math.cos(i)*1.8],1.3,.05,i%2?ice:0xc4e9f2,5);}
 m.box(0,3.65,61.1,4.7,1.4,3.4,ice);m.box(0,6,62.5,4.5,6,.8,0x90b8ce);
 for(const s of [-1,1])m.box(s*2.4,4.9,61.1,.7,2.3,3.8,ice);
 for(let j=0;j<15;j++)m.box(0,(j+1)*.2-.12,42+j,24,.24,1.04,j%3?snow:edge);
 spire(m,0,29,41,8,106);
}
export function glacierHouse(m,variant=0){
 const w=2.65+variant*.25,h=4+variant*.32;m.box(0,h/2,0,w*2,h,5.5,rock);
 for(const s of [-1,1]){
  m.quad([s*(w+.45),h,-3.2],[0,h+3.4,-3.2],[0,h+3.4,3.2],[s*(w+.45),h,3.2],snow);
  m.tri([-w,h,s*2.76],[w,h,s*2.76],[0,h+3.2,s*2.76],deep);
  arch(m,s*w*.61,.8,-2.78,.55,2.7,'x',.09,ice);
  m.box(s*w*.61,1.68,-2.8,.78,1.6,.1,0xf3c17f);
 }
 m.box(0,1.0,-2.81,1.05,2,.11,wood);m.tube([w*.65,h,1],[w*.65,h+3.8,1],.41,.33,rock,4,Math.PI/4);
}
export { arch, spire };
