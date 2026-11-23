// Mesh coordinates shape the plasma; the fragment mask uses world XZ so the
// safe shore and the arena wall clip every layer, even for a cast near an edge.
export function createUsuraPlasma(T,parent,arenaUniforms,quality){
 const geometry=new T.SphereGeometry(1,quality==='low'?48:72,quality==='low'?24:36,0,Math.PI*2,0,Math.PI);
 const shells=[],count=quality==='low'?2:3;
 for(let i=0;i<count;i++){
  const uniforms={...arenaUniforms,layer:{value:i},intensity:{value:0},winding:{value:0}};
  const material=new T.ShaderMaterial({uniforms,transparent:true,side:T.DoubleSide,depthWrite:false,
   vertexShader:`varying vec3 dir,w;uniform float clock,layer;
   void main(){dir=position;vec3 p=position;float a=atan(p.z,p.x);
   float plume=sin(a*7.+p.y*9.+layer+clock*2.)*.5+.5;
   p.y*=.76+.23*plume+.17*sin(a*11.-clock*3.+p.y*5.);
   p.xz*=1.+.055*sin(p.y*15.+a*8.-clock*5.)*p.y;
   w=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
   fragmentShader:`varying vec3 dir,w;uniform vec2 arenaCenter,normal;uniform float clock,layer,edge,radius,intensity,arenaFloor,winding;
   void main(){vec2 local=w.xz-arenaCenter;if(dot(local,normal)>=edge||length(local)>radius)discard;
   vec3 q=normalize(dir);float a=atan(q.z,q.x),h=q.y,t=clock*(1.1+.14*layer);
   if(w.y<arenaFloor+.12)discard;float warp=sin(5.*a+7.*h-t)+.52*sin(11.*a-10.*h+t*2.);
   float fold=sin(a*9.+h*18.+2.3*warp-t*3.);
   float vein=pow(1.-abs(fold),3.);float lace=pow(1.-abs(sin(a*19.-h*31.+3.5*warp+t*3.)),7.);
   // Open spiral windows expose the physical blade during condensation.
   float gap=sin(4.*a+5.8*h-t*1.3+warp*.32);
   if(winding>.5 && gap<.25)discard;
   float rim=pow(1.-abs(h),4.);float heat=clamp(vein+.55*lace+rim*.7,0.,1.);
   vec3 color=mix(vec3(.095,.009,.20),vec3(.67,.045,.96),.38+.62*heat);
   color=mix(color,vec3(1.,.62,.19),smoothstep(.64,.97,heat)*(.5+.5*sin(a*3.+t)));
   color+=vec3(.88,.65,.88)*pow(heat,5.);
   float broken=smoothstep(-.6,.45,fold+.68*h+.28*sin(a*17.+t));
   gl_FragColor=vec4(color,intensity*clamp(.12+.48*broken+.55*vein+.52*rim,0.,.92));}`});
  const shell=new T.Mesh(geometry,material);shell.renderOrder=4+i;shell.frustumCulled=false;parent.add(shell);shells.push(shell);
 }
 // The ridged axial volume connects the suspended blade to the floor. A hot
 // inner filament stays readable through the darker, twisting outer skin.
 const lance=new T.Mesh(new T.CylinderGeometry(1,1,1,32,28,true),new T.ShaderMaterial({
  uniforms:{...arenaUniforms,boost:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:`varying vec2 v;uniform float clock;void main(){v=uv;vec3 p=position;
   float twist=v.y*12.-clock*3.;float flute=.66+.24*sin(v.x*31.416+twist)+.1*cos(v.x*69.115-twist);
   p.xz*=flute*(.18+pow(abs(v.y*2.-1.),2.)*.74+.26*sin(v.y*3.1416));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
  fragmentShader:`varying vec2 v;uniform float clock,boost;void main(){
   float spiral=v.x*31.416+v.y*12.-clock*3.+.35*sin(v.y*21.-clock*5.);
   float strand=pow(.5+.5*cos(spiral),8.),core=pow(.5+.5*cos(spiral+.32),26.);
   vec3 c=mix(vec3(.36,.028,.95),vec3(1.,.36,.045),strand)+vec3(1.,.91,.68)*core;
   gl_FragColor=vec4(c,boost*(.15+strand*.65+core*.8)*smoothstep(0.,.06,v.y)*(1.-smoothstep(.89,1.,v.y)));}`}));
 parent.add(lance);
 const light=new T.PointLight(0xff9347,0,42,1.5);parent.add(light);
 return {update(s,anchor){
  const p=s.progress,blast=s.phase==='detonate',after=s.phase==='aftermath',charge=s.phase==='charge',collapse=s.phase==='collapse';
  const heat=blast?Math.exp(-p*2.2):after?.14*(1-p):collapse?.9*(1-p):charge?.28*p:.06;
  lance.visible=charge||collapse||s.phase==='escape';
  const height=Math.max(1,anchor.y+1.5);
  const width=.7+heat*5;
  lance.position.set(0,height*.5,0);lance.scale.set(width,height,width);
  lance.material.uniforms.boost.value=collapse?1.3-p:.58;
  light.position.copy(anchor);light.intensity=heat*95;
  shells.forEach((o,i)=>{
   o.visible=collapse||charge||s.phase==='escape';
   if(!o.visible)return;
   o.material.uniforms.winding.value=1;
   const scale=collapse?2.4*(1-p*.92):1.15+(charge?p:1)*1.25;
   o.position.set(0,anchor.y-.8,0);
   o.scale.set(scale,scale*1.5,scale);
   const fade=collapse?(1-p)*.8:.32;
   o.material.uniforms.intensity.value=fade*(1-i*.16);
  });
 },dispose(){lance.geometry.dispose();lance.material.dispose();lance.removeFromParent();geometry.dispose();for(const o of shells){o.material.dispose();o.removeFromParent()}light.removeFromParent()}};
}
