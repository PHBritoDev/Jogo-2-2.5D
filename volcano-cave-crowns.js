// The black roots have asymmetric ribs, ruby seams and barbs growing out of
// the bend. A transported frame keeps the cross-section open through the curl.
function thorn(T,b,points,radius){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),n=46,sides=9;
 const f=curve.computeFrenetFrames(n,false),p=new T.Vector3(),out=new T.Vector3();let last;
 for(let i=0;i<=n;i++){const u=i/n,r=radius*Math.pow(1-u,.78)+.012;curve.getPointAt(u,p);
  const ring=Array.from({length:sides},(_,j)=>{const a=j*2*Math.PI/sides+u*4.4,k=r*(.91+.11*Math.sin(4*a+u*7)+.045*Math.cos(i*.93+j*1.7));
   return out.copy(p).addScaledVector(f.normals[i],Math.cos(a)*k).addScaledVector(f.binormals[i],Math.sin(a)*k).toArray();});
  if(last){for(let j=0;j<sides;j++){const k=(j+1)%sides;
   b.quad(last[j],last[k],ring[k],ring[j],j%3?0x38343d:0x4c4149);
   if(j===2||j===7){const mix=(a,c,t)=>a.map((v,m)=>v+(c[m]-v)*t);const w=.09+.07*Math.sin(i*.4);
    b.quad(mix(last[j],last[k],.18),mix(last[j],last[k],.18+w),mix(ring[j],ring[k],.20+w),mix(ring[j],ring[k],.20),0xb33838);}
   if(i%2===0&&j===(i*7)%sides&&u<.89){const v=new T.Vector3(...ring[j]).sub(p),tip=out.copy(p).addScaledVector(v,1.55+.28*Math.sin(i*1.3)).addScaledVector(f.tangents[i],r*.68).toArray();b.face(last[j],ring[k],tip,0x302c35);b.face(ring[k],ring[j],tip,0x4e454b);b.face(ring[j],last[j],tip,0x28252f);}
  }}last=ring;
 }
}
function citadel(b,x,y,z,size){
 const stone=0x625d6a,s=size;
 b.cliff(x,y,z,13*s,10*s,29*s,0x524d59);
 for(const [u,v,h,r] of [[0,0,28,4],[-6,3,18,2.5],[7,2,16,2],[3,-5,21,3],[-9,-2,13,1.6]]){
  const px=x+u*s,pz=z+v*s;b.stalk([[px,y-1,pz,r*s*1.4],[px,y+h*s*.8,pz,r*s],[px,y+h*s,pz,r*s*.76]],7,stone);
  b.stalk([[px,y+h*s,pz,r*s],[px,y+(h+9)*s,pz,.07]],6,0x474551);
  // Slender crocketed pinnacles rise around the main roof. Buttresses
  // continue down the outer shaft so the turrets grow from the masonry.
  for(let k=0;k<5;k++){
   const angle=k*2*Math.PI/5+.27,dx=Math.cos(angle)*r*s,dz=Math.sin(angle)*r*s;
   b.stalk([[px+dx*1.4,y+h*s*.38,pz+dz*1.4,.26*r*s],
    [px+dx,y+h*s*.92,pz+dz,.18*r*s],[px+dx,y+(h+1.2)*s,pz+dz,.25*r*s],
    [px+dx,y+(h+3.4+k%2)*s,pz+dz,.025*s]],5,0x827985);
  }
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
// Detached stone lamellae hang below the broken shelf. Their triangular
// profiles have a lit rim, a dark hanging face and a slow lateral drift.
function suspendedShale(T,b,group,clock){
 const positions=[],colors=[],phases=[];
 for(let i=0;i<72;i++){
  const side=i%2?1:-1,x=side*(9+b.random()*35),z=-22-b.random()*111;
  const y=(i%4===0?1:-1)*(2+b.random()*22),r=.14+b.random()*.65;
  const a=[x-r,y,z],c=[x+r*.68,y+.1*r,z-.2*r],d=[x+.23*r,y+.18*r,z+r],tip=[x-.18*r,y-2.4*r,z+.36*r];
  const phase=b.random()*6;
  for(const [v,hue] of [[[a,c,d],0x948a91],[[a,d,tip],0x413945],[[d,c,tip],0x66545e],[[c,a,tip],0x322e38]]){
   const color=new T.Color(hue);
   for(const point of v){positions.push(...point);colors.push(color.r,color.g,color.b);phases.push(phase);}
  }
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geo.setAttribute('phase',new T.Float32BufferAttribute(phases,1));
 const mat=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});
 mat.onBeforeCompile=shader=>{
  shader.uniforms.drift=clock;
  shader.vertexShader='uniform float drift;attribute float phase;\n'+shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\ntransformed.y+=.28*sin(.47*drift+phase);transformed.x+=.13*cos(.39*drift+phase);');
 };
 const mesh=new T.Mesh(geo,mat);mesh.name='Lascas suspensas do abismo';group.add(mesh);
}
export function crowns(T,b,group,clock){
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
 // Near silhouette against the distant city's pale opening. The turn
 // projects in front of the towers while the upper coil frames the sky.
 thorn(T,b,[[-17,-31,-51],[-15,-4,-48],[-12,5,-46],[-8,11,-45],[1,15,-50],[9,13,-55],[10,9,-58],[6,8,-57],[5,10,-55]],2.2);
 thorn(T,b,[[19,-38,-78],[17,-3,-70],[14,9,-65],[9,17,-62],[-2,20,-67],[-7,16,-74],[-4,13,-76]],3.6);
 // Hanging buttresses frame the pale city. Slabs shear in the direction
 // of the chasm; their exposed undersides carry narrow mineral seams.
 for(const side of [-1,1])for(let tier=0;tier<3;tier++){
  for(let j=0;j<6;j++){
   const z=-28-j*16-tier*7,x=side*(13+tier*19+3*Math.sin(j)),y=-6-tier*13-j%3*2;
   const a=[x,y,z],c=[x+side*7,y+1,z-2],d=[x+side*9,y+.8,z-9],e=[x+side*1.2,y-.7,z-6];
   b.quad(a,c,d,e,0x837c85);
   const tip=[x+side*5,y-11-tier*2,z-4];
   b.face(e,d,tip,0x49434f);b.face(a,e,tip,0x514552);b.face(c,a,tip,0x635762);
   const seam=t=>a.map((n,k)=>n+(tip[k]-n)*t);
   b.face(seam(.12),[x+side*1.1,y-2.3,z-.4],seam(.78),0x973e49);
  }
 }
 thorn(T,b,[[55,-30,-112],[32,4,-120],[23,39,-112],[-8,47,-103],[-34,34,-94],[-32,19,-87],[-23,21,-89]],5.3);
 thorn(T,b,[[-39,-48,-64],[-25,-23,-49],[-13,-12,-41],[-8,-9,-33],[-9,-14,-28],[-13,-17,-32]],3.5);
 // Buttressed nave at the vanishing point. Its open rose window
 // silhouettes the farther spires; the inner tracery leaves real holes.
 const cx=-9,cy=19,cz=-133;
 b.arch(cx,-8,cz,7.3,17,4.4,0x776e79);
 for(const side of [-1,1]){
  const sx=cx+side*9.8;
  b.stalk([[sx,-10,cz,3],[sx,12,cz,2.3],[sx,23,cz,1.4],[sx,34,cz,.08]],6,0x605865);
  b.arch(sx+side*3,-8,cz+1,2.7,7.8,2.4,0x847880);
 }
 for(let j=0;j<16;j++){
  const a=j*Math.PI/8,e=a+Math.PI/8;
  const point=(r,t,z)=>[cx+r*Math.cos(t),cy+r*Math.sin(t),cz+z];
  b.quad(point(5.1,a,1),point(5.1,e,1),point(5.8,e,1),point(5.8,a,1),0xa0979c);
  b.quad(point(5.8,a,1),point(5.8,e,1),point(5.8,e,-.7),point(5.8,a,-.7),0x615969);
  if(j%2===0)b.quad(point(.8,a,1),point(.8,e,1),point(5.15,a+.08,1),point(5.15,a,1),0x8c838c);
 }
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
 // Oblique bedding planes lead the eye down into the unlit chasm. Their
 // split columns tuck underneath each other rather than sealing the horizon.
 for(const side of [-1,1])for(let j=0;j<18;j++){
  const x=side*(34+8*Math.cos(j*.61)),z=-13-j*6.8,top=-4+5*Math.sin(j*.57);
  const p=[x,top,z],q=[x+side*4,top+1.3,z+2.8],r=[x+side*9,top+3.7,z-3.7],u=[x+side*3,top-1,z-5.8];
  b.quad(p,q,r,u,0x847b85);
  const end=[x+side*1.8,top-27-14*b.random(),z-2.6];
  b.face(p,u,end,0x46414d);b.face(u,r,end,0x574953);b.face(q,p,end,0x655b64);
  if(j%3===0)b.face([x,top-.2,z],[x+side*.52,top-3.3,z-.34],[end[0],end[1]+6,end[2]],0x833a43);
 }
 suspendedShale(T,b,group,clock);

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
