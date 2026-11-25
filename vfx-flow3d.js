/** VFX 2.0: bounded mesh volumes with advected turbulence, obsidian-crimson matter and dark veins.
 * Same topology and collision at every quality; detail uniform changes shading only. */
export const ENERGY_PALETTES=Object.freeze({
 celestial:{deep:[.18,.02,.002],body:[1,.48,.015],hot:[1,.98,.78]},
 cinder:{deep:[.015,.001,.003],body:[.82,.025,.01],hot:[1,.58,.08]},
 crimson:{deep:[.012,.001,.004],body:[.86,.01,.035],hot:[1,.28,.22]},
 violet:{deep:[.015,.001,.035],body:[.52,.01,.38],hot:[.95,.25,.58]}
});
export const FLOW_NOISE=`
float fh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float fn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fh(i),fh(i+vec2(1,0)),f.x),mix(fh(i+vec2(0,1)),fh(i+vec2(1,1)),f.x),f.y);}
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
 // Dissolve rejection first: avoid evaluating the remaining layered noises for discarded fragments.
 float cells=flowNoise(vec2(vUv.x*22.*frequency,vUv.y*15.+seed),time*.7,detail);
 if(cells<dissolve)discard;
 float n=flowNoise(vec2(vUv.x*11.*frequency,vUv.y*7.+seed),time,detail);
 float n2=flowNoise(vec2(vUv.x*23.*frequency-time*1.2,vUv.y*13.+seed*1.7),time*.85,detail);
 float ndotv=abs(dot(normalize(vN),normalize(vV)));
 float rim=pow(1.-ndotv,1.55);
 float coreDark=smoothstep(.22,.78,ndotv);
 float fil=pow(max(0.,1.-abs(n-.54)*5.5),2.6);
 float darkVein=smoothstep(.09,.0,abs(n2-.48)-.025)*coreDark;
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
 const geometry=energyGeometry(T,options),material=energyMaterial(T,preset,{warp:.12,...options}),mesh=new T.Mesh(geometry,material);
 // The vertex shader displaces vertices along their normals. Expand the local bounds
 // by the maximum displacement so off-screen effects can be safely frustum-culled.
 geometry.computeBoundingSphere();
 const baseBoundingRadius=geometry.boundingSphere.radius;
 let boundedWarp=NaN;
 function syncWarpBounds(){
  // The shader's two sine terms have a combined maximum amplitude of .85.
  // Warp is a public uniform: refresh the bound if another VFX controller edits it.
  const warp=material.uniforms.warp.value;
  if(warp===boundedWarp)return;
  // Even finite uniforms can overflow the expanded radius. In that case
  // disable culling rather than passing Infinity into the renderer's sphere test.
  const radius=baseBoundingRadius+Math.abs(warp)*.85;
  if(!Number.isFinite(warp)||!Number.isFinite(radius)){
   mesh.frustumCulled=false;
   boundedWarp=warp;
   return;
  }
  geometry.boundingSphere.radius=radius;
  mesh.frustumCulled=true;
  boundedWarp=warp;
 }
 // Controllers may write the warp uniform between simulation updates. Refresh the
 // conservative bounds at assignment time, before Three.js performs frustum tests.
 const warpUniform=material.uniforms.warp;
 let warpValue=warpUniform.value;
 Object.defineProperty(warpUniform,'value',{
  configurable:true,enumerable:true,
  get(){return warpValue;},
  set(value){warpValue=value;syncWarpBounds();}
 });
 syncWarpBounds();
 // Preserve the fail-open state selected by syncWarpBounds for invalid warp.
 parent.add(mesh);
 const direction=new T.Vector3(),axis=new T.Vector3(0,0,1);
 return{mesh,material,update(time,{position,dir,radius=1,length=1,alpha=.94,quality=1,dissolve=0}={}){
  syncWarpBounds();// Fragment shader discards alpha below .015; skip the entire draw at that threshold.
  // FLOW_NOISE weights are .72 and .28*detail; at low quality detail=.65.
  // Above that ceiling every fragment is discarded, so avoid a wasted draw.
  const dissolveCeiling=quality===0?.72+.28*.65:1;
  const validPosition=position===undefined||(position!==null&&typeof position==='object'&&Number.isFinite(position.x)&&Number.isFinite(position.y)&&Number.isFinite(position.z));
  // Explicitly malformed directions must not reuse a pooled projectile's old heading.
  // Omitted direction retains the orientation chosen by its controller.
  // Three normalizes with lengthSq(); reject lengths that overflow that operation.
  const dirLengthSq=dir&&Number.isFinite(dir.x)&&Number.isFinite(dir.y??0)&&Number.isFinite(dir.z??0)
    ? dir.x*dir.x+(dir.y??0)**2+(dir.z??0)**2 : 0;
  const validDirection=dir===undefined||(Number.isFinite(dirLengthSq)&&dirLengthSq>.0001);
  // A malformed impact must not poison the object's transform or render a stale effect.
  mesh.visible=validPosition&&validDirection&&Number.isFinite(alpha)&&alpha>=.015&&Number.isFinite(dissolve)&&dissolve<dissolveCeiling&&Number.isFinite(radius)&&radius>0&&Number.isFinite(length)&&length>0;
  if(position&&validPosition)mesh.position.set(position.x,position.y,position.z);
  if(dir!==undefined&&validDirection){
   // Copy the requested heading before normalizing; the reusable scratch vector
   // otherwise remains zero and all projectiles inherit an undefined rotation.
   direction.set(dir.x,dir.y??0,dir.z??0).normalize();
   mesh.quaternion.setFromUnitVectors(axis,direction);
  }
  // An invalid frame must not corrupt the matrix or shader state retained by the pooled mesh.
  // Keep the last valid transform until the next valid update; the draw is already hidden.
  if(Number.isFinite(radius)&&radius>0&&Number.isFinite(length)&&length>0)mesh.scale.set(radius,radius,length);
  if(Number.isFinite(time))material.uniforms.time.value=time;
  if(Number.isFinite(alpha))material.uniforms.alpha.value=alpha;
  material.uniforms.detail.value=quality===0?.65:1;
  if(Number.isFinite(dissolve))material.uniforms.dissolve.value=dissolve;
 },dispose(){parent.remove(mesh);geometry.dispose();material.dispose();}};
}

export function flameGeometry(T){const p=[],uv=[],ix=[],N=10;for(let j=0;j<=N;j++){const u=j/N,w=.16*Math.sin(Math.PI*u)**.68;for(let k=0;k<=6;k++){const a=k/6*Math.PI*2,ridge=1+.18*Math.cos(a*3);p.push(Math.cos(a)*w*ridge,u*1.85,Math.sin(a)*w*.52-u*u*.78);uv.push(u,k/6);if(j<N&&k<6){const n=j*7+k,b=n+7;ix.push(n,b,n+1,n+1,b,b+1);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;}
