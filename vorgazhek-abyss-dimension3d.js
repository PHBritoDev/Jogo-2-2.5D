/** VORGAZHEK: midnight water and authored abyssal witnesses. Owns and disposes its resources. */
export function buildVorgazhekAbyss(T,g,spec,ctx){
 const R=spec.radius,geo=[],mat=[],tex=[],watchers=[];
 const own=(a,o)=>{a.push(o);return o;};
 const water=own(mat,new T.ShaderMaterial({fog:false,uniforms:{uTime:{value:0},uR:{value:R},uPlayer:{value:new T.Vector2(0,12)}},
 vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',

 fragmentShader:`precision mediump float;
 varying vec2 p;
 uniform float uTime;
 uniform float uR;
 uniform vec2 uPlayer;
 void main(){
   float t=uTime;
   float r=length(p);
   vec2 q=p+vec2(sin(p.y*.09+t*.36),cos(p.x*.11-t*.31))*1.45;
   float broad=sin(length(q)*.43-t*.82+sin(atan(q.y,q.x)*4.0+t*.15)*.36);
   float secondary=sin(length(q)*.96+t*.44+sin(p.x*.19+t*.23));
   float rings=pow(max(0.0,broad*.5+.5),17.0)*.44+
               pow(max(0.0,secondary*.5+.5),27.0)*.19;
   // Broken silver reflection streaks, rather than thin painted concentric circles.
   float flow=sin(q.x*.28+sin(q.y*.14+t*.22)*2.8+t*.35);
   float striation=sin(q.x*1.22+sin(q.y*.23-t*.27)*4.4);
   float reflected=pow(max(0.0,flow*.5+.5),7.0)*
                   pow(max(0.0,striation*.5+.5),9.0);
   // Soft ripples follow the player's feet and fade before the arena boundary.
   float pr=length(p-uPlayer);
   float foot=pow(max(0.0,sin(pr*2.25-t*4.3)),8.0)*
              exp(-pr*.24)*smoothstep(.6,2.0,pr)*.85;
   float shimmer=.10+.14*sin(q.x*.08+t*.30)*sin(q.y*.10-t*.21);
   float edge=1.0-smoothstep(uR*.76,uR*1.22,r);
   float shine=(rings*(.34+shimmer)+reflected*.52+foot*.43)*edge;
   vec3 base=vec3(.0045,.006,.010);
   vec3 silver=vec3(.86,.88,.90);
   gl_FragColor=vec4(base+silver*shine,1.0);
 }` }));
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
  x.fillStyle=grad;x.beginPath();x.ellipse(128,160,type.skin?113:100,140,type.skin?.15:0,0,6.283);x.fill();
  x.fillStyle=type.skin?'rgba(27,6,7,.89)':'rgba(8,7,9,.85)';x.beginPath();x.moveTo(75,236);x.lineTo(47,292);x.lineTo(22,320);x.lineTo(242,320);x.lineTo(207,279);x.lineTo(170,222);x.closePath();x.fill();
  x.strokeStyle=type.skin?'rgba(176,47,35,.25)':'rgba(113,97,103,.20)';x.lineWidth=4;x.beginPath();x.moveTo(52,285);x.quadraticCurveTo(29,164,62,79);x.quadraticCurveTo(133,-10,205,69);x.quadraticCurveTo(234,174,204,290);x.stroke();
  if(type.mouth===2){x.fillStyle='rgba(0,0,0,.94)';x.beginPath();x.moveTo(20,320);x.lineTo(39,104);x.quadraticCurveTo(122,-35,215,103);x.lineTo(236,320);x.closePath();x.fill();x.strokeStyle='rgba(145,140,143,.26)';x.lineWidth=9;x.beginPath();x.moveTo(42,257);x.lineTo(51,105);x.quadraticCurveTo(128,7,207,108);x.stroke();}
  if(type.skin){x.strokeStyle='rgba(196,60,40,.55)';x.lineWidth=2;for(let i=0;i<17;i++){const px=23+i*13;x.beginPath();x.moveTo(px,25+(i%3)*11);x.lineTo(px-11,56+(i%4)*17);x.stroke();}for(let i=0;i<9;i++){const px=23+i*25;x.beginPath();x.moveTo(px,86+(i%3)*32);x.lineTo(px-12,130+(i%2)*17);x.stroke();}}
  if(type.mouth===1){x.strokeStyle='rgba(239,195,183,.24)';x.lineWidth=7;x.beginPath();x.ellipse(128,143,89,111,-.12,.2,5.3);x.stroke();}
  for(const [ex,ey] of type.eyes){const xx=128+ex*172,yy=164-ey*160;const gr=x.createRadialGradient(xx,yy,2,xx,yy,40);gr.addColorStop(0,type.color);gr.addColorStop(.5,type.color);gr.addColorStop(1,'rgba(80,0,0,0)');x.fillStyle=gr;x.beginPath();x.ellipse(xx,yy,40,24,0,0,6.283);x.fill();x.fillStyle='#020102';x.beginPath();x.ellipse(xx,yy,17,19,0,0,6.283);x.fill();}
  if(type.mouth!==2){x.save();x.translate(128,209);x.fillStyle='#000';x.beginPath();if(type.mouth===3){x.ellipse(0,5,51,66,0,0,6.283);}else{x.moveTo(-82,-13);x.quadraticCurveTo(0,85,82,-13);x.quadraticCurveTo(0,31,-82,-13);}x.fill();x.strokeStyle=type.color;x.lineWidth=type.mouth===1?6:2;x.stroke();
   if(type.mouth!==3){x.fillStyle=type.mouth===1?'#e1b7b1':'#9c2e31';for(let i=0;i<14;i++){const t=i/13,xx=-75+t*150,yy=-5+Math.sin(Math.PI*t)*22;x.beginPath();x.moveTo(xx-5,yy);x.lineTo(xx+5,yy);x.lineTo(xx,yy+13+(i%3)*5);x.fill();}}x.restore();}

  // Individual morphologies instead of repeating the same cartoon mouth/eyes.
  if(type.mouth===1){
    x.fillStyle='rgba(2,1,2,.95)';x.beginPath();x.moveTo(63,205);x.quadraticCurveTo(142,276,204,198);x.quadraticCurveTo(145,228,63,205);x.fill();
    x.fillStyle='rgba(234,186,176,.95)';
    for(let i=0;i<7;i++){const px=82+i*18,py=216+Math.sin((i/6)*Math.PI)*8;x.beginPath();x.moveTo(px-8,py);x.lineTo(px+7,py+1);x.lineTo(px+5,py+20);x.lineTo(px-4,py+19);x.closePath();x.fill();}
    x.strokeStyle='rgba(229,137,131,.44)';x.lineWidth=5;x.beginPath();x.moveTo(43,190);x.quadraticCurveTo(122,289,219,181);x.stroke();
  }
  if(type.mouth===2){
    // Inhuman horizontal headdress and tiny irregular eyes, like a figure seen through film grain.
    x.fillStyle='rgba(2,2,4,.97)';x.beginPath();x.moveTo(25,93);x.lineTo(228,93);x.lineTo(189,119);x.lineTo(74,120);x.closePath();x.fill();
    x.strokeStyle='rgba(182,181,173,.17)';x.lineWidth=5;x.beginPath();x.moveTo(29,94);x.lineTo(229,94);x.stroke();
    x.fillStyle='rgba(221,215,202,.66)';x.beginPath();x.arc(86,126,8,0,6.283);x.fill();x.beginPath();x.ellipse(165,120,5,9,-.45,0,6.283);x.fill();
  }
  if(type.mouth===3){
    // Exposed asymmetrical jaw, angled sockets and thin thornlike scalp appendages.
    x.strokeStyle='rgba(153,52,40,.67)';x.lineWidth=3;
    for(let i=0;i<13;i++){
      const px=35+i*15,py=49+Math.abs(i-6)*7;
      x.beginPath();x.moveTo(px,py);x.lineTo(px+(i%3-1)*10,py-20-(i%4)*12);x.stroke();
    }
    x.fillStyle='rgba(0,0,0,.92)';x.beginPath();x.ellipse(128,222,53,60,-.13,0,6.283);x.fill();
    x.strokeStyle='rgba(191,67,50,.40)';x.lineWidth=5;x.beginPath();x.arc(125,220,59,-.2,2.95);x.stroke();
    x.fillStyle='rgba(140,43,33,.90)';
    for(let i=0;i<9;i++){let a=i/8*Math.PI,xx=130+50*Math.cos(a),yy=221+50*Math.sin(a);x.beginPath();x.moveTo(xx-6,yy-2);x.lineTo(xx+5,yy-2);x.lineTo(xx,yy-17);x.fill();}
  }
  // Analog film grit integrated into the head's alpha, not a fullscreen postprocess.
  const image=x.getImageData(0,0,256,320),p=image.data;
  let seed=type.mouth*173+19;
  for(let i=0;i<9000;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const idx=(seed%81920)*4;
    if(p[idx+3]<30)continue;
    const grain=((seed>>>17)&31)-16;
    p[idx]=Math.min(255,Math.max(0,p[idx]+grain));
    p[idx+1]=Math.min(255,Math.max(0,p[idx+1]+grain));
    p[idx+2]=Math.min(255,Math.max(0,p[idx+2]+grain));
  }
  x.putImageData(image,0,0);
  const t=own(tex,new T.CanvasTexture(c));t.colorSpace=T.SRGBColorSpace;t.generateMipmaps=false;t.minFilter=T.LinearFilter;return t;
 }
 const faces=types.map(drawFace),faceGeo=own(geo,new T.PlaneGeometry(1,1));
 const eyeC=document.createElement('canvas');eyeC.width=64;eyeC.height=64;const ex=eyeC.getContext('2d'),eg=ex.createRadialGradient(32,32,1,32,32,30);eg.addColorStop(0,'#020102');eg.addColorStop(.37,'#030103');eg.addColorStop(.43,'rgba(205,40,43,.9)');eg.addColorStop(.78,'rgba(140,24,26,.6)');eg.addColorStop(1,'rgba(0,0,0,0)');ex.fillStyle=eg;ex.fillRect(0,0,64,64);
 const eyeT=own(tex,new T.CanvasTexture(eyeC));eyeT.colorSpace=T.SRGBColorSpace;eyeT.generateMipmaps=false;
 const eyeG=own(geo,new T.PlaneGeometry(1,1));
 // Hand-composed silhouettes around the arena, with deep staggered distances.
 // Stable dedicated sectors prevent entities occupying the same spot as others.
 const sectors=11;
 const angles=Array.from({length:sectors},(_,i)=>-Math.PI+.18+i*(Math.PI*2/sectors));
 const depth=[2.35,2.67,2.48,2.74,2.42,2.65,2.51,2.78,2.38,2.61,2.47];
 for(let i=0;i<11;i++){
  const type=types[i%4],scale=.74+(i%4)*.042,root=new T.Group();
  const fm=own(mat,new T.MeshBasicMaterial({map:faces[i%4],transparent:true,depthWrite:false,opacity:0,fog:false,toneMapped:false,side:T.DoubleSide}));
  const face=new T.Mesh(faceGeo,fm);face.scale.set(12.4*scale,17.1*scale,1);root.add(face);
  const eyes=[];
  for(const [xp,yp] of type.eyes){const em=own(mat,new T.MeshBasicMaterial({map:eyeT,transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false,side:T.DoubleSide}));const eye=new T.Mesh(eyeG,em);eye.position.set(xp*(172/256)*12.4*scale,(yp*(160/320)-4/320)*17.1*scale,.08);eye.userData.baseX=eye.position.x;eye.userData.baseY=eye.position.y;eye.scale.set(1.9*scale,1.25*scale,1);root.add(eye);eyes.push(eye);}
  root.visible=false;g.add(root);watchers.push({root,face,eyes,i,phase:i*.77,scale});
 }
 const cameraPos=new T.Vector3(),focus=new T.Vector3();
 const sm=(a,b,x)=>{let v=T.MathUtils.clamp((x-a)/(b-a),0,1);return v*v*(3-2*v);};
 ctx.tick.push((t,dt,camera,options)=>{
  water.uniforms.uTime.value=t;
  const p=options?.playerPosition||options?.player?.position||options?.player||null;
  if(p)water.uniforms.uPlayer.value.set(p.x-spec.x,p.z-spec.z);
  if(p)focus.set(p.x-spec.x,(p.y||0)-spec.y,p.z-spec.z);
  else if(camera)focus.copy(camera.position).sub(g.position);
  if(camera)cameraPos.copy(camera.position).sub(g.position);
  for(const w of watchers){
   const progress=(t*.055+w.phase*.39)%1,opacity=sm(.025,.13,progress)*(1-sm(.72,.91,progress));
   const budget=options?.quality==='low'?5:options?.quality==='medium'?8:11;
   w.root.visible=w.i<budget&&opacity>.015;if(!w.root.visible)continue;
   const turn=Math.floor(t*.055+w.phase*.39);
   const angle=angles[w.i]+Math.sin(turn*1.71+w.i*3.2)*.075;
   const r=R*depth[w.i]+10+7*Math.sin(turn*2.1+w.i);
   w.root.position.set(Math.cos(angle)*r,11+(w.i%4)*3.5,Math.sin(angle)*r);
   if(camera)w.root.lookAt(cameraPos.x,w.root.position.y,cameraPos.z);
   else w.root.lookAt(focus.x,w.root.position.y,focus.z);
   w.face.material.opacity=opacity*(w.i%4===2?.55:.86);
   const dx=T.MathUtils.clamp((focus.x-w.root.position.x)/130,-.28,.28),dy=T.MathUtils.clamp((focus.z-w.root.position.z)/200,-.17,.17);
   const blink=Math.abs(Math.sin(t*(.85+(w.i%4)*.16)+w.phase*7.1))>.997?.08:1.;
   for(const eye of w.eyes){eye.position.x=eye.userData.baseX+dx;eye.position.y=eye.userData.baseY+dy;eye.scale.y=1.25*w.scale*blink;eye.material.opacity=opacity*.70;}
  }
 });
 ctx.refs.vorgazhekAbyss={watchers:watchers.length,dispose(){geo.forEach(o=>o.dispose());mat.forEach(o=>o.dispose());tex.forEach(o=>o.dispose());}};
 return {bg:0x000000,fog:0x010102,fogNear:R*.7,fogFar:R*2.7,hemi:[0xa3abb1,0x030304,.8],sun:[0xc1cad1,.38],light:[0xe7e7ec,1.2,Math.max(150,R*2),[0,11,0]],exposure:1.12};
}
