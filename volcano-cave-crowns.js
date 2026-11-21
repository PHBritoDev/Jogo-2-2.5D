// The black roots have asymmetric ribs, ruby seams and barbs growing out of
// the bend. A transported frame keeps the cross-section open through the curl.
function thorn(T,b,points,radius){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),n=46,sides=9;
 const f=curve.computeFrenetFrames(n,false),p=new T.Vector3(),out=new T.Vector3();let last;
 for(let i=0;i<=n;i++){const u=i/n,r=radius*Math.pow(1-u,.78)+.012;curve.getPointAt(u,p);
  const ring=Array.from({length:sides},(_,j)=>{const a=j*2*Math.PI/sides+u*4.4,k=r*(.89+.12*Math.sin(4*a+u*7));
   return out.copy(p).addScaledVector(f.normals[i],Math.cos(a)*k).addScaledVector(f.binormals[i],Math.sin(a)*k).toArray();});
  if(last){for(let j=0;j<sides;j++){const k=(j+1)%sides;
   b.quad(last[j],last[k],ring[k],ring[j],j%3?0x38343d:0x4c4149);
   if(j===2||j===7){const mix=(a,c,t)=>a.map((v,m)=>v+(c[m]-v)*t);const w=.09+.07*Math.sin(i*.4);
    b.quad(mix(last[j],last[k],.18),mix(last[j],last[k],.18+w),mix(ring[j],ring[k],.20+w),mix(ring[j],ring[k],.20),0xb33838);}
   if(i%2===0&&j===(i*7)%sides&&u<.89){const v=new T.Vector3(...ring[j]).sub(p),tip=out.copy(p).addScaledVector(v,2.2).addScaledVector(f.tangents[i],r*.68).toArray();b.face(last[j],ring[k],tip,0x302c35);b.face(ring[k],ring[j],tip,0x4e454b);}
  }}last=ring;
 }
}
function citadel(b,x,y,z,size){
 const stone=0x625d6a,s=size;
 b.cliff(x,y,z,13*s,10*s,29*s,0x524d59);
 for(const [u,v,h,r] of [[0,0,28,4],[-6,3,18,2.5],[7,2,16,2],[3,-5,21,3],[-9,-2,13,1.6]]){
  const px=x+u*s,pz=z+v*s;b.stalk([[px,y-1,pz,r*s*1.4],[px,y+h*s*.8,pz,r*s],[px,y+h*s,pz,r*s*.76]],7,stone);
  b.stalk([[px,y+h*s,pz,r*s],[px,y+(h+9)*s,pz,.07]],6,0x474551);
  // Lancet recesses interrupt the shaft in two registers. The pointed
  // intrados and projecting sill remain legible in silhouette at distance.
  for(let k=0;k<7;k++){
   const a=k*Math.PI*2/7,nx=Math.sin(a),nz=Math.cos(a);
   for(const level of [.39,.70]){
    const depth=r*s*(level>.5?.94:1.12),cx=px+nx*depth,cz=pz+nz*depth;
    const w=r*s*.23,base=y+h*s*level,top=base+h*s*.12;
    const v=(u,H)=>[cx+nz*u,H,cz-nx*u];
    b.quad(v(-w,base),v(w,base),v(w,top),v(-w,top),0x35303c);
    b.face(v(-w,top),v(w,top),v(0,top+w*1.7),0x39303b);
    b.block(cx,base-.18*s,cz,2.5*w,.3*s,.46*s,0x8c7e82,a);
   }
  }
  for(let i=0;i<4;i++){const a=Math.PI*i/2,ax=px+Math.cos(a)*r*s,az=pz+Math.sin(a)*r*s;b.stalk([[ax,y,az,1.3*s],[ax,y+h*s*.63,az,.78*s],[ax,y+h*s*.89,az,.04]],4,0x827985);}
 }
 for(let j=-2;j<=2;j++)b.arch(x+j*4.7*s,y+2*s,z+6*s,1.9*s,4*s,2*s,0x807784);
}
export function crowns(T,b,group){
 // Distant luminous stone vault: the pale slit silhouettes the city while the
 // underside of the abyss stays dark. One opaque backdrop, no stacked fog cards.
 const vault=new T.Mesh(new T.SphereGeometry(1,42,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
  vertexShader:`varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 ray;
  void main(){vec3 d=normalize(ray);float a=atan(d.x,-d.z);
   float bank=.48+.22*sin(a*13.+3.*sin(a*4.+d.y*9.)+2.*sin(d.y*14.+a*3.))+.13*sin(a*27.+d.y*29.)+.06*sin(a*44.-d.y*31.);
   float slit=exp(-5.*abs(a+.17))*smoothstep(-.2,.55,d.y);
   float beam=exp(-13.*abs(a+.17+.18*d.y))*(.66+.22*bank);
   vec3 c=mix(vec3(.10,.09,.12),vec3(.49,.47,.51),smoothstep(-.74,.23,d.y));
   c+=vec3(.21,.21,.19)*(slit+beam);c-=.12*bank*smoothstep(.28,.8,d.y);
   gl_FragColor=vec4(c,1.);}`}));
 vault.position.set(0,-14,-95);vault.scale.set(245,135,240);vault.renderOrder=-5;group.add(vault);
 // Fractured paving at human scale. Splits carry a dull ember deep in a
 // charred seam; scoria teeth mark exposed lips without fencing the arena.
 for(let j=0;j<59;j++){let x=(b.random()-.5)*5.4,z=-14-b.random()*77;
  for(let k=0;k<3;k++){const u=x+(b.random()-.45)*1.8,v=z-.45-b.random();const y=.085;
   b.quad([x-.08,y,z],[x+.08,y,z],[u+.07,y,v],[u-.07,y,v],0x211a22);
   b.quad([x-.018,y+.004,z],[x+.018,y+.004,z],[u+.017,y+.004,v],[u-.017,y+.004,v],k===1?0xcb514c:0x872933);x=u;z=v;}
 }
 for(const [x,z] of [[-4.2,-19],[1.8,-31],[-8,-47],[5,-58],[9,-81],[-12,-86]]){
  for(let k=0;k<5;k++)b.stalk([[x+k*.54,-.1,z+.4*k,.32],[x+k*.52,.4+k*.08,z+.4*k,.2],[x+k*.52+.1,.7+k*.21,z+.4*k-.12,.01]],5,0x39343d);}

 for(const [x,y,z,s] of [[-10,-8,-149,1.7],[43,-20,-116,1.2],[-52,-24,-105,1.1],[86,-12,-177,1.9],[-95,-6,-179,1.35],[38,-3,-215,2.1]])citadel(b,x,y,z,s);
 for(const [x,y,z,w] of [[-24,-2,-39,9],[26,-5,-56,9],[-32,-7,-82,14],[32,1,-93,11],[48,-12,-70,7],[-18,-3,-118,9]]){
  b.cliff(x,y,z,w,w*.86,47+b.random()*19,0x5d5663);b.arch(x,y,z,2.6,3.7,2.8,0x8a7e84);
 }
 for(let i=0;i<8;i++){const x=-53+i*7.6;b.arch(x,-29,-103,3.3,16,3.8,0x6e6872);if(i!==4)b.block(x,-9.3,-103,7.8,.8,4.2,0x837883);}
 thorn(T,b,[[-48,-48,-45],[-36,2,-47],[-33,24,-57],[-16,33,-68],[-4,29,-72],[0,21,-68],[-6,17,-63],[-10,21,-64]],6.6);
 thorn(T,b,[[47,-49,-74],[30,2,-66],[23,23,-53],[11,29,-38],[4,24,-31],[8,17,-35],[12,19,-39]],5.8);
 thorn(T,b,[[-28,-21,-23],[-21,-4,-23],[-16,6,-27],[-12,9,-30],[-9,7,-31]],4.4);
 thorn(T,b,[[37,-43,-136],[40,22,-127],[22,42,-117],[5,48,-135],[-9,39,-145],[-8,30,-143]],8.2);
 // Throne and broken basalt canopy frame the campaign portal from behind.
 b.block(0,0,-96,7,.55,4.8,0x665862);
 b.block(0,.55,-96,4.6,.66,3.3,0x483d4b);
 b.block(0,1.21,-96.9,3.6,3.3,.72,0x544754);
 for(const side of [-1,1]){
  b.block(side*1.8,1.18,-95.9,.55,.85,2.6,0x71606b);
  b.stalk([[side*1.6,3.6,-97,.59],[side*1.8,5.1,-97.1,.38],[side*2.2,6.1,-97.3,.03]],6,0x645560);
 }
 for(const x of [-9,9]){
  b.block(x,0,-89,2.9,.32,2.8,0x504950);
  b.block(x,.32,-89,2.5,.88,2.4,0x70636b);
 }
 for(let i=0;i<55;i++){const x=(i%2?-1:1)*(17+b.random()*78),z=-17-b.random()*166,y=-12-b.random()*54;
  b.stalk([[x,y-14,z,2+b.random()*3],[x+1,y,z,1.7],[x+2,y+3+b.random()*8,z-1,.06]],5,0x3c3443);}
 for(const [x,z] of [[-4,-16],[5.5,-51],[-10,-78],[11,-84]]){b.stalk([[x,-1,z,.85],[x,1,z,.65],[x+.2,2,z,.2]],6,0x615562);}
}
export function ritual(T,group,refs){
 const stone=new T.MeshStandardMaterial({color:0x61535c,roughness:.95}),iron=new T.MeshStandardMaterial({color:0x4c3c34,roughness:.56,metalness:.32});
 const make=(g,m,x,y,z,parent=group)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
 const door=new T.Group();door.position.x=-22.4;group.add(door);refs.door=door;
 for(let i=-2;i<=2;i++)make(new T.BoxGeometry(.43,3.4,.22),iron,0,1.7,i*.83,door);
 for(const h of [.4,1.9,3])make(new T.BoxGeometry(.46,.2,4.5),iron,0,h,0,door);
 const bodies=new T.Group();bodies.name='Vestígios do círculo';group.add(bodies);refs.bodies=bodies;
 for(const [x,z] of [[-5,-2],[5,-3],[-4,5]]){make(new T.CylinderGeometry(1,1.25,.5,8),stone,x,.25,z,bodies);}
 const rune=new T.MeshBasicMaterial({color:0xffdd92,transparent:true,opacity:0,depthWrite:false});
 const circle=make(new T.RingGeometry(3.2,3.38,64),rune,0,.09,-1);circle.rotation.x=-Math.PI/2;refs.circle=circle;
 const gold=new T.MeshStandardMaterial({color:0xdbad55,roughness:.48,metalness:.44,emissive:0x573315});
 for(let i=0;i<9;i++)make(new T.BoxGeometry(.64,.26,.32),gold,-31+Math.sin(i*7)*1.5,.18+(i%3===2?.25:0),Math.cos(i*4)*1.2);
 refs.goldSpot={x:-31,z:0};refs.portal={x:0,z:-90};
}
