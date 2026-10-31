/** VFX 2.0: bounded mesh volumes with advected turbulence, no raymarch/postprocessing.
 * Same topology and collision at every quality; detail uniform changes shading only. */
export const ENERGY_PALETTES=Object.freeze({
 celestial:{deep:[.18,.02,.002],body:[1,.48,.015],hot:[1,.98,.78]},
 cinder:{deep:[.015,.001,.003],body:[.82,.025,.01],hot:[1,.58,.08]},
 crimson:{deep:[.012,.001,.004],body:[.86,.01,.035],hot:[1,.28,.22]},
 violet:{deep:[.015,.001,.035],body:[.52,.01,.38],hot:[.95,.25,.58]}
});
export const FLOW_NOISE=`
float fh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float fn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fh(i),fh(i+vec2(1,0)),f.x),mix(h_b(i+vec2(0,1)),h_b(i+vec2(1,1)),f.x),f.y);}\nfloat h_b(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float flowNoise(vec2 p,float t,float detail){vec2 q=p+vec2(fn(p*.62+vec2(0,t*.35))-.5,fn(p*.8-vec2(t*.3,0))-.5)*1.5;return fn(q-vec2(t*1.7,0))*.72+fn(q*2.17-vec2(t*3.4,t*.15))*.28*detail;}
`;
const VERT=`uniform float time,warp;varying vec2 vUv;varying vec3 vN,vV,vP;
void main(){vUv=uv;vP=position;vec3 p=position;
 float pulse=sin(uv.x*37.-time*5.+sin(uv.y*18.+time*2.))*.6+sin(uv.x*71.-time*8.+uv.y*31.)*.25;
 p+=normal*pulse*warp;
 vec4 w=vec4(p,1.);vec3 n=normal;
 #ifdef USE_INSTANCING
 w=instanceMatrix*w;n=mat3(instanceMatrix)*n;
 #endif
 w=modelMatrix*w;vN=normalize(mat3(modelMatrix)*n);vV=cameraPosition-w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const FRAG=`uniform float time,alpha,detail,dissolve,seed,frequency,flame,celestial;uniform vec3 deep,body,hot;varying vec2 vUv;varying vec3 vN,vV,vP;
${FLOW_NOISE}
void main(){
 float n=flowNoise(vec2(vUv.x*11.*frequency,vUv.y*7.+seed),time,detail);
 float n2=flowNoise(vec2(vUv.x*23.*frequency-time*1.2,vUv.y*13.+seed*1.7),time*.85,detail);
 float ndotv=abs(dot(normalize(vN),normalize(vV)));
 float rim=pow(1.-ndotv,1.55);
 float coreDark=smoothstep(.22,.78,ndotv);
 float fil=pow(max(0.,1.-abs(n-.54)*5.5),2.6);
 float darkVein=smoothstep(.09,.0,abs(n2-.48)-.025)*coreDark;
 float cells=flowNoise(vec2(vUv.x*22.*frequency,vUv.y*15.+seed),time*.7,detail);
 if(cells<dissolve)discard;
 float heat=smoothstep(.22,.74,n+rim*.32);
 vec3 col=mix(deep,body,heat);
 col=mix(col,hot,clamp(pow(smoothstep(.42,.82,n),1.35)*.78+rim*.35+fil*.28,0.,.96));
 col=mix(col,deep*.25,darkVein*(1.-celestial*.55));
 vec3 fireColor=mix(vec3(.16,.02,.005),body,smoothstep(.24,.46,n+rim*.2));
 fireColor=mix(fireColor,hot,smoothstep(.46,.64,n+fil*.15)*.92);
 col=mix(col,fireColor,celestial);
 float edgeCut=smoothstep(dissolve,dissolve+.11,cells);
 float a=alpha*(.88+.12*smoothstep(.15,.65,n));
 a*=mix(1.,(1.-smoothstep(.22,1.,vUv.x))*smoothstep(.14,.48,n),flame);
 a*=edgeCut;
 if(a<.015)discard;
 gl_FragColor=vec4(col,a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export function energyMaterial(T,preset='celestial',{alpha=.94,warp=.08,seed=0,frequency=1,flame=0}={}){
 const p=ENERGY_PALETTES[preset] || ENERGY_PALETTES.crimson;return new T.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,transparent:true,depthWrite:false,side:flame?T.DoubleSide:T.FrontSide,toneMapped:false,uniforms:{time:{value:0},alpha:{value:alpha},detail:{value:1},dissolve:{value:0},warp:{value:warp},seed:{value:seed},frequency:{value:frequency},flame:{value:flame},celestial:{value:preset==='celestial'?1:0},...Object.fromEntries(['deep','body','hot'].map(k=>[k,{value:new T.Color(...p[k])}]))}});
}
/** Closed lobed body along +Z. Front at z=0; an asymmetric swept tail extends behind. */
export function energyGeometry(T,{rings=30,sides=14,tail=3,seed=0}={}){
 const p=[],uv=[],ix=[];
 for(let j=0;j<=rings;j++){const u=j/rings,r=Math.pow(Math.sin(Math.PI*u),.72)*(u<.65?.35+u:1.04),z=-tail+(tail+.65)*u;
  for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2,lobe=1+.14*Math.sin(a*5+u*16+seed)+.1*Math.cos(a*3-u*11),rr=r*lobe;
   p.push(Math.cos(a)*rr+Math.sin(u*9+seed)*.09*(1-u),Math.sin(a)*rr,z);uv.push(u,k/sides);
   if(j<rings&&k<sides){const x=j*(sides+1)+k,b=x+sides+1;ix.push(x,x+1,b,x+1,b+1,b);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function energyBody(T,parent,preset,options={}){
 const geometry=energyGeometry(T,options),material=energyMaterial(T,preset,{warp:.12,...options}),mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;parent.add(mesh);
 const direction=new T.Vector3(),axis=new T.Vector3(0,0,1);
 return{mesh,material,update(time,{position,dir,radius=1,length=1,alpha=.94,quality=1,dissolve=0}={}){
  mesh.visible=alpha>.005;if(position)mesh.position.set(position.x,position.y,position.z);if(dir&&direction.set(dir.x,dir.y||0,dir.z).lengthSq()>.0001)mesh.quaternion.setFromUnitVectors(axis,direction.normalize());mesh.scale.set(radius,radius,length);
  material.uniforms.time.value=time;material.uniforms.alpha.value=alpha;material.uniforms.detail.value=quality===0?.65:1;material.uniforms.dissolve.value=dissolve;
 },dispose(){parent.remove(mesh);geometry.dispose();material.dispose();}};
}

export function flameGeometry(T){const p=[],uv=[],ix=[],N=10;for(let j=0;j<=N;j++){const u=j/N,w=.16*Math.sin(Math.PI*u)**.68;for(let k=0;k<=6;k++){const a=k/6*Math.PI*2;p.push(Math.cos(a)*w*(1+.18*Math.cos(a*3)),u*1.85,Math.sin(a)*w*.52-u*u*.78);uv.push(u,k/6);if(j<N&&k<6){const n=j*7+k,b=n+7;ix.push(n,b,n+1,n+1,b,b+1);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;}
