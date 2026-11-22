// All geometry is allocated once. Ground, wave curtain and collision share
// arena-local Z and the same wave radius from the combat clock.
export function createCorona(T,scene,arena,quality){
 const root=new T.Group();scene.add(root);
 const add=(g,m)=>{const o=new T.Mesh(g,m);root.add(o);return o};
 const glow=(color)=>new T.MeshBasicMaterial({color,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
 const R=arena.radius, U={clock:{value:0},pressure:{value:0},front:{value:-100},edge:{value:arena.edge},radius:{value:R},fade:{value:1}};
 const floor=add(new T.PlaneGeometry(R*2,R*2),new T.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,
 vertexShader:'varying vec2 p;void main(){p=vec2(position.x,-position.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec2 p;uniform float clock,pressure,front,edge,radius,fade;
 void main(){float d=length(p);if(d>radius)discard;
 float a=atan(p.y,p.x);float seam=exp(-5.*abs(p.y-edge));
 if(p.y>=edge){gl_FragColor=vec4(vec3(.13,.8,.68),fade*(.06+.8*seam));return;}
 float rune=pow(.5+.5*cos(20.*a+floor(d/3.)*.52),26.);
 float bands=pow(.5+.5*cos(2.1*d+clock*2.),14.);
 float cut=pow(.5+.5*cos(13.*a+sin(d*1.7)*.22+sin(d*.53)),24.);
 float shock=exp(-abs(d-front)*1.4);
 vec3 col=mix(vec3(.27,.018,.32),vec3(1.,.43,.09),rune*bands)+vec3(.72,.20,1.)*(shock*2.+cut);
 gl_FragColor=vec4(col,fade*clamp(.08+pressure*(.13+bands*.34+rune*.23)+shock*.94+seam,.0,.96));}`}));
 floor.rotation.x=-Math.PI/2;floor.position.y=.18;
 const nucleus=add(new T.IcosahedronGeometry(1,1),glow(0xffd6ff));
 const hoops=[];for(let i=0;i<5;i++)hoops.push(add(new T.TorusGeometry(1,.018,5,72,Math.PI*(1.47+i*.09)),glow(i%2?0xffa234:0xbf58ff)));
 const n=quality==='low'?12:24, seg=28;
 const pos=new Float32Array(n*seg*6), geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));
 const streams=new T.LineSegments(geo,new T.LineBasicMaterial({color:0xe799ff,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
 streams.frustumCulled=false;root.add(streams);
 const curtain=add(new T.CylinderGeometry(1,1,1,96,1,true),new T.ShaderMaterial({uniforms:U,transparent:true,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,
 vertexShader:'varying vec3 w;varying vec2 v;void main(){v=uv;w=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}',
 fragmentShader:`varying vec3 w;varying vec2 v;uniform float edge,clock,radius;
 void main(){if(w.z>=edge||length(w.xz)>radius+.02)discard;
 float tooth=.38+.30*cos(v.x*94.25)+.2*sin(v.x*213.63+clock*8.);
 float flame=smoothstep(-.2,.12,tooth-v.y);float filament=pow(.5+.5*cos(v.x*528.+sin(v.y*14.+clock*7.)*2.),12.);
 gl_FragColor=vec4(mix(vec3(.55,.04,1.),vec3(1.,.85,.52),pow(1.-v.y,8.)),flame*(.22+filament*.7+.8*exp(-v.y*14.)));}`}));
 // A pressure halo sits behind the silhouette of the actual airborne blade.
 const halo=add(new T.PlaneGeometry(1,1),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
 uniforms:U,vertexShader:`varying vec2 v;void main(){v=uv-.5;vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.);
 c.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));gl_Position=projectionMatrix*c;}`,
 fragmentShader:`varying vec2 v;uniform float clock,pressure;void main(){float r=length(v)*2.,a=atan(v.y,v.x);
 float spokes=pow(abs(cos(a*7.+.24*sin(a*13.+clock))),25.);
 float g=exp(-4.8*r)*(1.-smoothstep(.78,1.,r));
 gl_FragColor=vec4(mix(vec3(.63,.045,1.),vec3(1.,.68,.19),spokes),g*(.36+spokes)*pressure);}`}));
 const veil=add(new T.CylinderGeometry(1,1,1,64,12,true),new T.ShaderMaterial({uniforms:U,side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
 vertexShader:`varying vec2 v;uniform float clock;void main(){v=uv;vec3 p=position;
 float contour=.30+.75*pow(1.-uv.y,2.)+.17*sin(uv.y*7.+clock);
 p.xz*=contour;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`varying vec2 v;uniform float clock,pressure;void main(){
 float twist=v.x*37.7+v.y*9.-clock*2.+sin(v.y*14.-clock)*.45;
 float ribbon=pow(.5+.5*cos(twist),10.);float edge=pow(.5+.5*cos(twist-.38),44.);
 float taper=sin(v.y*3.14159);gl_FragColor=vec4(mix(vec3(.44,.025,.92),vec3(1.,.65,.22),edge),taper*(ribbon*.45+edge*.5)*pressure);}`}));
 const crown=new T.InstancedMesh(new T.ConeGeometry(.12,1.2,4),new T.MeshStandardMaterial({color:0xd79735,metalness:.72,roughness:.24,emissive:0x994018}),12);
 const stake=new T.Object3D();
 for(let i=0;i<12;i++){const a=i*Math.PI/6;stake.position.set(Math.cos(a)*1.28,.3,Math.sin(a)*1.28);stake.rotation.set(.32*Math.sin(a),a,-.32*Math.cos(a));stake.scale.y=i%2?.75:1.4;stake.updateMatrix();crown.setMatrixAt(i,stake.matrix);}
 root.add(crown);
 function update(s,t,anchor){
  root.visible=s.phase!=='idle';if(!root.visible)return;
  const p=s.progress,blast=s.phase==='detonate',after=s.phase==='aftermath'||s.phase==='recover';
  const k=s.phase==='announce'?.1*p:s.phase==='throw'?.12+.22*p:s.phase==='charge'?.34+.66*p:1;
  U.clock.value=t;U.pressure.value=k;U.front.value=blast?s.front:-100;U.fade.value=after?(s.phase==='recover'?0:1-p):1;
  curtain.visible=blast;curtain.position.y=3;curtain.scale.set(Math.max(.01,s.front),6,Math.max(.01,s.front));
  const envelope=after?(s.phase==='recover'?0:1-p):1;
  nucleus.position.copy(anchor);nucleus.scale.setScalar(.06+envelope*(blast?2.4*Math.exp(-p*7):k*.38));
  halo.position.copy(anchor);halo.scale.setScalar(envelope*(blast?20:10)*k);
  veil.position.set(anchor.x,anchor.y*.5,anchor.z);veil.scale.set(envelope*k*(blast?7:3),anchor.y,envelope*k*(blast?7:3));
  crown.position.copy(anchor);crown.scale.setScalar(.05+envelope*k);crown.rotation.y=t*.65;
  hoops.forEach((h,i)=>{h.position.copy(anchor);h.position.y+=Math.sin(t+i)*.3;h.rotation.set(.8+i*.37,t*(i%2?1:-1)*.7,i+t*.3);h.scale.setScalar(.05+envelope*k*(1+i*.31)*(blast?1+4*p:1));});
  streams.material.opacity=k*envelope;let offset=0;
  for(let i=0;i<n;i++)for(let j=0;j<seg;j++)for(let e=0;e<2;e++){
   const u=(j+e)/seg,a=i*2.39996+u*(1.5+.45*Math.sin(i+t))+t*.18;
   const r=(1-u)*(blast?R*.98:2+k*8)+Math.sin(u*15+i+t*4)*.18*Math.sin(Math.PI*u);
   pos[offset++]=anchor.x*u+r*Math.cos(a);pos[offset++]=.21+u*anchor.y+Math.sin(u*Math.PI)*1.4;pos[offset++]=anchor.z*u+r*Math.sin(a);
  }
  geo.attributes.position.needsUpdate=true;
 }
 root.visible=false;
 return {update,dispose(){root.removeFromParent();crown.dispose();root.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}};
}
