/** VORGAZHEK: midnight water and authored abyssal witnesses. Owns and disposes its resources. */
export function buildVorgazhekAbyss(T,g,spec,ctx){
 const R=spec.radius,geo=[],mat=[],tex=[],watchers=[];
 const own=(a,o)=>{a.push(o);return o;};
 const water=own(mat,new T.ShaderMaterial({fog:false,uniforms:{uTime:{value:0},uR:{value:R}},
 vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'precision mediump float;varying vec2 p;uniform float uTime;uniform float uR;void main(){float r=length(p);float a=atan(p.y,p.x);float wave=sin(r*1.12-uTime*.69+sin(a*7.+uTime*.12)*.32);float w2=sin(r*2.65+uTime*.22+sin(p.x*.12)*1.3);float streak=pow(max(0.,wave*.5+.5),25.)*.65+pow(max(0.,w2*.5+.5),37.)*.17;float fade=1.-smoothstep(uR*.65,uR*1.2,r);float shine=streak*(.45+.25*sin(p.x*.12+uTime*.17)*sin(p.y*.1-uTime*.19));gl_FragColor=vec4(vec3(.002,.004,.007)+vec3(.78,.77,.72)*shine*fade,1.);}' }));
 const floor=new T.Mesh(own(geo,new T.CircleGeometry(R+25,128)),water);floor.rotation.x=-Math.PI/2;floor.position.y=.03;floor.name='VorgazhekMidnightWater';g.add(floor);
 const outer=new T.Mesh(own(geo,new T.RingGeometry(R+23,R+280,128)),own(mat,new T.MeshBasicMaterial({color:0x010102,side:T.DoubleSide,fog:false})));outer.rotation.x=-Math.PI/2;g.add(outer);
 const types=[
 {name:'ScarletGrin',color:'#c91d27',mouth:0,eyes:[[-.28,.24],[.3,.29]],skin:false},
 {name:'HollowWitness',color:'#e9b2ab',mouth:1,eyes:[[-.29,.21],[.30,.21]],skin:false},
 {name:'VeiledWatcher',color:'#b9b3ac',mouth:2,eyes:[[-.25,.32],[.22,.34]],skin:false},
 {name:'ThornMouth',color:'#8d241d',mouth:3,eyes:[[-.27,.27],[.25,.30]],skin:true}
 ];
 function drawFace(type){
  const c=document.createElement('canvas');c.width=256;c.height=320;const x=c.getContext('2d');
  const grad=x.createRadialGradient(128,150,10,128,150,148);grad.addColorStop(0,type.skin?'rgba(92,28,25,.95)':'rgba(10,5,7,.98)');grad.addColorStop(.68,'rgba(3,2,4,.93)');grad.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=grad;x.beginPath();x.ellipse(128,160,110,146,0,0,6.283);x.fill();
  if(type.mouth===2){x.fillStyle='rgba(0,0,0,.94)';x.beginPath();x.moveTo(20,320);x.lineTo(39,104);x.quadraticCurveTo(122,-35,215,103);x.lineTo(236,320);x.closePath();x.fill();x.strokeStyle='rgba(145,140,143,.26)';x.lineWidth=9;x.beginPath();x.moveTo(42,257);x.lineTo(51,105);x.quadraticCurveTo(128,7,207,108);x.stroke();}
  if(type.skin){x.strokeStyle='rgba(196,60,40,.35)';x.lineWidth=2;for(let i=0;i<14;i++){const px=34+i*13;x.beginPath();x.moveTo(px,21+(i%3)*14);x.lineTo(px-16,53+(i%4)*17);x.stroke();}}
  for(const [ex,ey] of type.eyes){const xx=128+ex*172,yy=164-ey*160;const gr=x.createRadialGradient(xx,yy,2,xx,yy,40);gr.addColorStop(0,type.color);gr.addColorStop(.5,type.color);gr.addColorStop(1,'rgba(80,0,0,0)');x.fillStyle=gr;x.beginPath();x.ellipse(xx,yy,40,24,0,0,6.283);x.fill();x.fillStyle='#020102';x.beginPath();x.ellipse(xx,yy,17,19,0,0,6.283);x.fill();}
  if(type.mouth!==2){x.save();x.translate(128,209);x.fillStyle='#000';x.beginPath();if(type.mouth===3){x.ellipse(0,5,51,66,0,0,6.283);}else{x.moveTo(-82,-13);x.quadraticCurveTo(0,85,82,-13);x.quadraticCurveTo(0,31,-82,-13);}x.fill();x.strokeStyle=type.color;x.lineWidth=type.mouth===1?6:2;x.stroke();
   if(type.mouth!==3){x.fillStyle=type.mouth===1?'#e1b7b1':'#9c2e31';for(let i=0;i<14;i++){const t=i/13,xx=-75+t*150,yy=-5+Math.sin(Math.PI*t)*22;x.beginPath();x.moveTo(xx-5,yy);x.lineTo(xx+5,yy);x.lineTo(xx,yy+13+(i%3)*5);x.fill();}}x.restore();}
  const t=own(tex,new T.CanvasTexture(c));t.colorSpace=T.SRGBColorSpace;t.generateMipmaps=false;t.minFilter=T.LinearFilter;return t;
 }
 const faces=types.map(drawFace),faceGeo=own(geo,new T.PlaneGeometry(1,1));
 const eyeC=document.createElement('canvas');eyeC.width=64;eyeC.height=64;const ex=eyeC.getContext('2d'),eg=ex.createRadialGradient(32,32,1,32,32,30);eg.addColorStop(0,'#020102');eg.addColorStop(.37,'#030103');eg.addColorStop(.43,'rgba(205,40,43,.9)');eg.addColorStop(.78,'rgba(140,24,26,.6)');eg.addColorStop(1,'rgba(0,0,0,0)');ex.fillStyle=eg;ex.fillRect(0,0,64,64);
 const eyeT=own(tex,new T.CanvasTexture(eyeC));eyeT.colorSpace=T.SRGBColorSpace;eyeT.generateMipmaps=false;
 const eyeG=own(geo,new T.PlaneGeometry(1,1));
 // Hand-composed silhouettes around the arena, with deep staggered distances.
 const slots=[[-.95,1.46],[-.48,1.74],[-.15,1.33],[.42,1.57],[.88,1.38],[1.36,1.77],[1.92,1.49],[2.37,1.62],[2.87,1.36],[3.42,1.72],[3.90,1.48],[4.45,1.67],[4.98,1.38],[5.37,1.81],[5.82,1.45],[6.13,1.68]];
 for(let i=0;i<11;i++){
  const type=types[i%4],scale=1+(i%5)*.23,root=new T.Group();
  const fm=own(mat,new T.MeshBasicMaterial({map:faces[i%4],transparent:true,depthWrite:false,opacity:0,fog:false,toneMapped:false,side:T.DoubleSide}));
  const face=new T.Mesh(faceGeo,fm);face.scale.set(14*scale,18*scale,1);root.add(face);
  const eyes=[];
  for(const [xp,yp] of type.eyes){const em=own(mat,new T.MeshBasicMaterial({map:eyeT,transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false,side:T.DoubleSide}));const eye=new T.Mesh(eyeG,em);eye.position.set(xp*14*scale*.86,yp*18*scale*.89,.08);eye.userData.baseX=eye.position.x;eye.userData.baseY=eye.position.y;eye.scale.set(2.8*scale,1.8*scale,1);root.add(eye);eyes.push(eye);}
  root.visible=false;g.add(root);watchers.push({root,face,eyes,i,slot:(i*3+2)%slots.length,phase:i*1.37,scale});
 }
 const cameraPos=new T.Vector3(),focus=new T.Vector3();
 const sm=(a,b,x)=>{let v=T.MathUtils.clamp((x-a)/(b-a),0,1);return v*v*(3-2*v);};
 ctx.tick.push((t,dt,camera,options)=>{
  water.uniforms.uTime.value=t;
  const p=options?.playerPosition||options?.player?.position||null;
  if(p)focus.set(p.x-spec.x,(p.y||0)-spec.y,p.z-spec.z);
  else if(camera)focus.copy(camera.position).sub(g.position);
  if(camera)cameraPos.copy(camera.position).sub(g.position);
  for(const w of watchers){
   const progress=(t*.055+w.phase*.39)%1,opacity=sm(.025,.13,progress)*(1-sm(.72,.91,progress));
   w.root.visible=opacity>.015;if(!w.root.visible)continue;
   const turn=Math.floor(t*.055+w.phase*.39),slot=slots[(w.slot+turn*7)%slots.length],r=R*slot[1]+25;
   w.root.position.set(Math.cos(slot[0])*r,12+(w.i%5)*4,Math.sin(slot[0])*r);
   if(camera)w.root.lookAt(cameraPos.x,w.root.position.y,cameraPos.z);
   else w.root.lookAt(focus.x,w.root.position.y,focus.z);
   w.face.material.opacity=opacity*(w.i%4===2?.54:.80);
   const dx=T.MathUtils.clamp((focus.x-w.root.position.x)/130,-.28,.28),dy=T.MathUtils.clamp((focus.z-w.root.position.z)/200,-.17,.17);
   const blink=Math.abs(Math.sin(t*(.85+(w.i%4)*.16)+w.phase*7.1))>.997?.08:1.;
   for(const eye of w.eyes){eye.position.x=eye.userData.baseX+dx;eye.position.y=eye.userData.baseY+dy;eye.scale.y=1.8*w.scale*blink;eye.material.opacity=opacity*.70;}
  }
 });
 ctx.refs.vorgazhekAbyss={watchers:watchers.length,dispose(){geo.forEach(o=>o.dispose());mat.forEach(o=>o.dispose());tex.forEach(o=>o.dispose());}};
 return {bg:0x000000,fog:0x010102,fogNear:R*.7,fogFar:R*2.7,hemi:[0xa3abb1,0x030304,.8],sun:[0xc1cad1,.38],light:[0xe7e7ec,1.2,Math.max(150,R*2),[0,11,0]],exposure:1.12};
}
