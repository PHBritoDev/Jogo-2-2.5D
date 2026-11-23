import {SPRING_LAKE,ICE_LAKE} from './sakura-route3d.js';
import {seeded} from './sakura-grove3d.js';
export function lakes(T){
 const group=new T.Group(),clock={value:0},mist={value:new T.Color(0x9eb9cb)},far={value:620};
 for(const [lake,ice] of [[SPRING_LAKE,0],[ICE_LAKE,1]]){
  const g=new T.CircleGeometry(1,110);g.rotateX(-Math.PI/2);
  const mat=new T.ShaderMaterial({uniforms:{clock,mist,far,frozen:{value:ice},origin:{value:new T.Vector2(lake.x,lake.z)},axes:{value:new T.Vector2(lake.rx,lake.rz)}},
   vertexShader:`varying vec3 W;void main(){W=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(W,1.);}`,
   fragmentShader:`varying vec3 W;uniform vec2 origin,axes;uniform vec3 mist;uniform float clock,far,frozen;
   vec2 hash2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}
   float seam(vec2 p){vec2 i=floor(p),f=fract(p);float a=9.,b=9.;for(int j=-1;j<=1;j++){for(int k=-1;k<=1;k++){vec2 n=vec2(float(k),float(j));float d=length(n+hash2(i+n)*.78+.11-f);if(d<a){b=a;a=d;}else b=min(b,d);}}return b-a;}
   void main(){vec2 P=W.xz-origin,q=P/axes;float shore=length(q);vec3 v=normalize(cameraPosition-W);
   float f=pow(1.-abs(v.y),3.);float wave=sin(P.x*.58+P.y*.34+clock*.73)*.52+sin(P.y*1.04-P.x*.16-clock*.57)*.29+sin(P.y*2.52+clock*.41)*.19;
   vec3 color;if(frozen<.5){float az=atan(q.x,q.y);float crowns=.70+.08*sin(az*9.)+.05*sin(az*21.)+.026*wave;
   float refl=smoothstep(crowns-.10,crowns+.055,shore);color=mix(vec3(.025,.17,.24),vec3(.23,.49,.63),f*.66+wave*.055+.12);
   color=mix(color,vec3(.69,.38,.54)*(1.+wave*.2),.65*refl);color+=vec3(.33,.30,.23)*pow(max(0.,wave),14.)*(.35+.65*f);
   vec2 pet=floor(P*1.6);float seed=hash2(pet).y;vec2 delta=fract((P+vec2(sin(clock*.19+seed),cos(clock*.21+seed))*.035)*1.6)-.5;
   color=mix(color,vec3(.93,.65,.73),step(.90,seed)*smoothstep(.18,.045,length(delta*vec2(.8,1.6))));}
   else{float d=seam(P*.098+vec2(.12*sin(P.y*.33),.1*sin(P.x*.48)));float s=seam(P*.39);color=mix(vec3(.067,.22,.32),vec3(.50,.67,.74),f*.6+.23+.12*sin(P.y*.12+P.x*.032));
   color+=vec3(.24,.36,.38)*(1.-smoothstep(.006,.053,d)) + vec3(.09,.13,.13)*(1.-smoothstep(.008,.038,s))*smoothstep(.18,.61,sin(P.x*.14));
   float hole=min(length((W.xz-vec2(825.,-1702.))*vec2(.77,1.))-23.,min(length((W.xz-vec2(726.,-1790.))*vec2(.77,1.))-15.,length((W.xz-vec2(900.,-1820.))*vec2(.77,1.))-12.));
   color=mix(vec3(.035,.12,.17)*(1.+wave*.14),color,smoothstep(-.15,.45,hole));color+=.23*(1.-smoothstep(.1,1.4,abs(hole)));}
   color=mix(color,mist,smoothstep(75.,far,distance(cameraPosition,W))*.91);gl_FragColor=vec4(color,1.);
   #include <colorspace_fragment>
   }`});
  const mesh=new T.Mesh(g,mat);mesh.scale.set(lake.rx,1,lake.rz);mesh.position.set(lake.x,lake.y+.085,lake.z);group.add(mesh);
 }
 return {group,update(t,color,range){clock.value=t;mist.value.copy(color);far.value=range;}};
}
export function weather(T,low){
 const rand=seeded(971),N=low?245:470,g=new T.BufferGeometry(),pos=[],seeds=[];
 for(let i=0;i<N;i++){pos.push(rand(),rand(),rand());seeds.push(rand());}
 g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('seed',new T.Float32BufferAttribute(seeds,1));
 const uniforms={clock:{value:0},cold:{value:0},amount:{value:0},anchor:{value:new T.Vector3()},pixels:{value:400}};
 const mat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
  vertexShader:`uniform vec3 anchor;uniform float clock,cold,amount,pixels;attribute float seed;varying float phase;varying float alpha;varying float winter;
  void main(){float box=26.+seed*32.;phase=seed*18.+clock*(.7+seed);vec3 drift=vec3(clock*(.6+cold*1.8)+sin(phase)*.65,-clock*(.43+seed*.92+cold*.65),sin(phase*.66)*.8);
   vec3 p=mod(position*box+drift-anchor,box)-box*.5+anchor;vec4 mv=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(pixels*(.043+.045*seed)/max(1.,-mv.z),1.2,7.);
   alpha=amount*smoothstep(.5,2.,-mv.z)*(1.-smoothstep(13.,box*.5,length(p-anchor)));winter=cold;}`,
  fragmentShader:`varying float phase;varying float alpha;varying float winter;void main(){vec2 q=gl_PointCoord-.5;float c=cos(phase),s=sin(phase);q=mat2(c,-s,s,c)*q;q.x*=mix(1.65,1.,winter);float a=1.-smoothstep(.22,.5,length(q));gl_FragColor=vec4(mix(vec3(1.,.64,.74),vec3(.90,.96,1.),winter),alpha*a);}`});
 const mesh=new T.Points(g,mat);mesh.frustumCulled=false;mesh.renderOrder=5;
 return {mesh,update(p,t,cold,amount,size){uniforms.clock.value=t;uniforms.anchor.value.copy(p);uniforms.cold.value=cold;uniforms.amount.value=amount;uniforms.pixels.value=size;mesh.visible=amount>.01;}};
}
