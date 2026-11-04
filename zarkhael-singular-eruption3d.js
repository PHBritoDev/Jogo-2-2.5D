
/** MOD 282: uma única explosão autoral em forma de coluna/copa de chama.
 * A copa nasce DEPOIS da coluna. Três anéis são regiões de pressão da MESMA
 * explosão, não três explosões. GLSL WebGL1 com turbulência, veios, brilho quente.
 */
export const ERUPTION_BUILD='282-single-mushroom-plasma';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const V=[
 'uniform float uT,uWarp;varying vec3 vP;',
 'void main(){vec3 p=position;float a=atan(p.z,p.x),h=p.y*.055;',
 'float j=sin(a*11.+h*13.-uT*3.)*.081+sin(a*23.-h*29.+uT*4.)*.045;',
 'p.xz*=1.+uWarp*j;p.y+=uWarp*.19*sin(a*13.+h*15.-uT*2.);',
 'vP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}'
].join('\n');
const F=[
 'uniform float uT,uAlpha,uHot,uSeed;varying vec3 vP;',
 'float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
 'float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
 'return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),',
 'mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}',
 'void main(){float a=atan(vP.z,vP.x),h=vP.y*.05;',
 'vec3 p=vec3(a*3.7,h*4.1-uT*1.3,uSeed);',
 'float n=noise3(p),n2=noise3(p*2.3+vec3(uT*.24,-uT*.3,2.4));',
 'float vein=pow(max(0.,sin(a*25.+h*39.-uT*7.+n*7.)),12.);',
 'float fire=clamp(n*.61+n2*.39+.12,0.,1.);',
 'float ash=noise3(p*1.7+vec3(2.,5.,1.));',
 'vec3 black=vec3(.08,.001,.012),red=vec3(.78,.011,.029),orange=vec3(1.,.24,.012);',
 'vec3 gold=vec3(1.,.65,.057),hot=vec3(1.,.94,.60);',
 'vec3 c=mix(black,red,fire);c=mix(c,orange,clamp(fire*.63+vein*.35,0.,.94));',
 'c=mix(c,gold,clamp(vein*.50*uHot,0.,.63));',
 'c=mix(c,hot,clamp(vein*.15*uHot,0.,.17));c=mix(c,black,ash*.20);',
 'float alpha=(.56+.38*fire+.07*vein)*uAlpha;',
 'if(alpha<.035)discard;gl_FragColor=vec4(c,clamp(alpha,0.,.95));}'
].join('\n');
function flameMaterial(T,seed){return new T.ShaderMaterial({
 vertexShader:V,fragmentShader:F,
 uniforms:{uT:{value:0},uWarp:{value:0},uAlpha:{value:0},uHot:{value:0},uSeed:{value:seed}},
 side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.NormalBlending,toneMapped:false
});}
function lathe(T,p){return new T.LatheGeometry(p.map(x=>new T.Vector2(x[0],x[1])),64);}
export function createSingularMushroomExplosion(T,parent){
 const root=new T.Group();root.name='ZarkhaelSingleEruption282';parent.add(root);
 const trunk=new T.Mesh(lathe(T,[[0,0],[2,0],[4,2],[3.2,8],[2.8,14],[4.2,21],[5.2,28],[4,29]]),flameMaterial(T,.4));
 const crown=new T.Mesh(lathe(T,[[0,24],[6,24],[12,23.5],[18,24.5],[22.5,26.4],[24,29.3],[22,32],[18,35],[11,37.8],[4,39],[0,39.4]]),flameMaterial(T,1.8));
 const lower=new T.Mesh(lathe(T,[[0,23.5],[7,23.2],[14,24],[21,26],[22,28],[17,28.7],[8,27],[0,26.5]]),flameMaterial(T,2.9));
 root.add(trunk,crown,lower);
 const shock=[];
 for(let i=0;i<3;i++){
  const m=new T.MeshBasicMaterial({color:i===0?0xffaa25:i===1?0xff4813:0xff9220,
   opacity:0,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const o=new T.Mesh(new T.TorusGeometry(1,.084,6,112),m);o.rotation.x=Math.PI/2;
  root.add(o);shock.push(o);
 }
 const shards=new T.InstancedMesh(new T.TetrahedronGeometry(1,0),
  new T.MeshBasicMaterial({color:0x270111,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}),48);
 shards.frustumCulled=false;root.add(shards);
 const arcs=new T.InstancedMesh(new T.CylinderGeometry(.017,.045,1,4),
  new T.MeshBasicMaterial({color:0xdfb8ff,opacity:0,transparent:true,depthWrite:false,blending:T.AdditiveBlending}),36);
 arcs.frustumCulled=false;root.add(arcs);
 const core=new T.Mesh(new T.OctahedronGeometry(.7,1),
  new T.MeshBasicMaterial({color:0xffde83,opacity:0,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));
 root.add(core);
 const M=new T.Matrix4(),Q=new T.Quaternion(),P=new T.Vector3(),S=new T.Vector3(),U=new T.Vector3(0,1,0),A=new T.Vector3();
 const light=new T.PointLight(0xff9a32,0,110);light.castShadow=false;root.add(light);
 let time=0;
 function update(st,ctx={}){
  time+=ctx.dt||0;
  const C=st.center,age=st.bursts[0]?.age??-1,pre=ease(st.pt/.8)*(1-ease((st.pt-1.05)/.28));
  const born=age>=0,rise=ease((age-.12)/1.22),head=ease((age-.65)/1.62);
  const fade=1-ease((age-3.50)/.90),unit=st.dangerR/26.83,up=Math.max(.005,ease((age-.02)/.48));
  root.visible=st.phase==='explosions';root.position.set(C.x,ctx.ground??C.y,C.z);
  trunk.visible=born;crown.visible=born;lower.visible=born;
  trunk.scale.set(unit*(.03+.97*rise),up,unit*(.03+.97*rise));
  crown.scale.set(unit*(.05+.95*head),Math.max(.006,head),unit*(.05+.95*head));
  crown.position.y=28.6*up-24*head;lower.scale.copy(crown.scale);lower.position.copy(crown.position);
  [trunk,crown,lower].forEach((m,i)=>{const u=m.material.uniforms;
   u.uT.value=time;u.uWarp.value=rise*fade;u.uAlpha.value=born*up*fade*(i===0?.93:.87);
   u.uHot.value=.84+.11*Math.sin(time*2.2+i);
  });
  core.visible=st.phase==='explosions'&&(!born||age<1.2);
  core.position.y=born?1.4+12*up:1.2;
  core.scale.setScalar(born?(.7+1.7*up)*(1-ease((age-.78)/.42)):.45+2*pre);
  core.material.opacity=born?(1-ease((age-.55)/.61))*.66:pre*.68;
  const heights=[27.0,15.5,1.8],delay=[.75,1.20,.46],sizes=[22,15.4,24];
  shock.forEach((o,i)=>{const k=ease((age-delay[i])/1.25);
   o.visible=born&&k>.001;o.position.y=heights[i]*up;
   o.scale.setScalar(unit*(.08+.92*k)*sizes[i]);
   o.material.opacity=fade*ease((age-delay[i])/.46)*(.78-i*.12);
  });
  const N=ctx.low?24:48;shards.count=N;
  for(let i=0;i<N;i++){
   const a=i/N*Math.PI*2,rr=st.dangerR*(.11+.88*rise)*(.73+.2*(i%7)/7);
   P.set(Math.cos(a)*rr,.3+rise*(1+(i%8)*.45),Math.sin(a)*rr);
   Q.setFromAxisAngle(U,a+time*.27);
   const r=.18+.26*((i*7)%9)/9;M.compose(P,Q,S.set(r,r*(.7+rise),r));shards.setMatrixAt(i,M);
  }
  shards.instanceMatrix.needsUpdate=true;shards.material.opacity=born*.64*fade;
  arcs.count=ctx.low?18:36;
  for(let i=0;i<arcs.count;i++){
   const a=i/arcs.count*Math.PI*2,ht=2+(i%7)*4.2;
   P.set(Math.cos(a)*(2+rise*2),ht,Math.sin(a)*(2+rise*2));
   A.set(Math.cos(a)*.19,1,Math.sin(a)*.19).normalize();Q.setFromUnitVectors(U,A);
   M.compose(P,Q,S.set(.07,.6+1.4*(i%5)/5,.07));arcs.setMatrixAt(i,M);
  }
  arcs.instanceMatrix.needsUpdate=true;arcs.material.opacity=born*fade*(.17+.2*Math.sin(time*12)**2);
  light.position.y=11*rise;light.intensity=1.1*pre+5.2*rise*fade;
 }
 function clear(){root.visible=false;light.intensity=0;}
 function dispose(){parent.remove(root);const g=new Set(),m=new Set();root.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)for(const x of [].concat(o.material))m.add(x)});for(const x of g)x.dispose();for(const x of m)x.dispose();}
 clear();return{root,update,clear,dispose};
}
