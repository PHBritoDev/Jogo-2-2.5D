/** Mod 296 — organic architecture for Zar'khael. No external art, rigs or post-pass.
 * Coordinates are arena-local. The original combat disc and spawn stay untouched.
 * Eye patches sample the SAME cap surface; opaque lids close over a curved eyeball.
 */
export const MUSHROOM_QUALITY = Object.freeze({
  low: { distance: 55, fraction: .34, hz: 12 },
  medium: { distance: 95, fraction: .67, hz: 20 },
  high: { distance: 155, fraction: 1, hz: 30 }
});
function random(seed) { let s = seed >>> 0; return () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296); }
export function mushroomLayout(radius = 30) {
  const r = random(303), items = [];
  // Framing giants stand outside the entire combat disc, including their bases.
  for (let i = 0; i < 9; i++) for (const side of [-1, 1]) {
    const z = 27 - i * 27 + (r() - .5) * 9;
    const safeX = Math.abs(z) < radius + 5 ? Math.sqrt((radius + 5) ** 2 - z ** 2) : 13;
    const x = side * (Math.max(14, safeX) + r() * 3);
    const w = z > -40 ? 14 + r() * 3 : 6.3 + r() * 2.3;
    items.push({ x, z, h: z > -40 ? 18 + r() * 7 : 10 + r() * 7,
      w, sy: w * (.62 + r() * .12), phase: r() * 6.28, yaw: r() * 6.28 });
  }
  for (let i = 0; i < 6; i++) {
    const a = .2 + i / 5 * Math.PI;
    items.push({ x: Math.cos(a) * (radius + 13), z: Math.sin(a) * (radius + 13),
      h: 19 + r() * 11, w: 9 + r() * 4, sy: 4 + r() * 2, phase: r() * 6.28, yaw: r() * 6.28 });
  }
  return items;
}
// Shared by cap vertices and eye sockets. Non-spherical profile and scalloped lip.
export function capPoint(theta, phi) {
  const wave = 1 + .035 * Math.sin(phi * 7 + theta * 5) + .018 * Math.sin(phi * 13 - theta * 7);
  const s = Math.sin(theta), c = Math.cos(theta);
  return [Math.cos(phi) * s * wave, c * (1 + .055 * Math.sin(phi * 5) * s) - .07 * s ** 6,
    Math.sin(phi) * s * wave];
}
export function blinkOpen(time, seed) {
  const period = 3.3 + seed * 4.7, t = (time + seed * 17) % period;
  if (t >= .28) return 1;
  return t < .10 ? 1 - t / .10 : (t - .10) / .18;
}
const common = `
float hash31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float grain(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float tissue(vec3 p){return grain(p*2.)*.5+grain(p*7.)*.3+grain(p*24.)*.2;}
vec3 flesh(vec3 p){float n=tissue(p);float v=pow(abs(sin(p.x*8.+p.z*11.+n*13.)),14.);
 return mix(vec3(.045,.0025,.006),vec3(.29,.024,.032),n)*(.64+.36*v);}
float opening(float t,float seed){float b=mod(t+seed*17.,3.3+seed*4.7);return b<.10?1.-b/.10:b<.28?(b-.10)/.18:1.;}
`;
function surfaceMaterial(THREE, kind, uniforms) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .42, metalness: 0, side: THREE.DoubleSide });
  m.customProgramCacheKey = () => 'zark296-' + kind;
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    const eye = kind === 'eye';
    const vary = 'varying vec3 vOrganic; varying vec2 vEyeUV;';
    const eyeVary = eye ? 'attribute float aSeed; attribute vec3 aCenter; attribute vec3 aTangent; attribute vec3 aUp; attribute vec3 aOut; varying vec2 vGaze; varying float vOpen; varying float vSeed;' : '';
    shader.vertexShader = 'uniform float uTime; uniform vec3 uPlayer; uniform vec3 uCamera; uniform float uDistance; uniform float uFraction;\n' + vary + eyeVary + common + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vOrganic=position; vEyeUV=uv;
      ${kind === 'cap' ? 'vOrganic=(instanceMatrix*vec4(position,1.)).xyz;' : ''}
      ${eye ? `vSeed=aSeed;
      vec3 toward=uPlayer-aCenter; float dist=length(uCamera-aCenter);
      float awake=step(dist,uDistance)*step(aSeed,uFraction)*step(0.,dot(aOut,uCamera-aCenter));
      vGaze=vec2(0.);vOpen=1.;
      if(awake>.5){
      vec3 dir=normalize(toward+vec3(0.,.0001,0.));
      float watch=smoothstep(-.2,.25,sin(uTime*.18+aSeed*31.));
      vGaze=clamp(vec2(dot(dir,aTangent),dot(dir,aUp))*.30,vec2(-.24,-.16),vec2(.24,.16));
      vGaze=mix(vec2(sin(uTime*.29+aSeed*22.)*.09,cos(uTime*.23+aSeed*14.)*.05),vGaze,watch)*awake;
      vOpen=opening(uTime,aSeed);
      }
      float dome=pow(max(0.,1.-dot(uv*2.-1.,uv*2.-1.)),2.);
      float lidRidge=exp(-pow((abs(uv.y*2.-1.)-.61*(1.-pow(uv.x*2.-1.,2.))*vOpen)/.07,2.))*.07;
      transformed+=aOut*(dome*.26*vOpen+lidRidge);` : ''}
    `);
    shader.fragmentShader = vary + (eye ? 'varying vec2 vGaze; varying float vOpen; varying float vSeed;' : '') + common + shader.fragmentShader;
    const color = kind === 'cap' ? `float n=tissue(vOrganic*.85);diffuseColor.rgb=flesh(vOrganic*.85);`
      : kind === 'stem' ? `float n=tissue(vOrganic*vec3(20.,7.,20.));float fibre=pow(abs(sin(atan(vOrganic.z,vOrganic.x)*47.+n*5.+vOrganic.y*6.)),9.);
        diffuseColor.rgb=mix(vec3(.12,.10,.075),vec3(.58,.51,.39),n)*(.56+.44*fibre);`
      : kind === 'floor' ? `vec2 tile=vOrganic.xz/2.;vec2 f=fract(tile);float checker=mod(floor(tile.x)+floor(tile.y),2.);
        float n=tissue(vOrganic*.9);float seam=smoothstep(0.,.018,min(min(f.x,f.y),min(1.-f.x,1.-f.y)));
        diffuseColor.rgb=mix(vec3(.012,.014,.016),vec3(.32,.30,.28),checker)*(.55+n*.7)*mix(.25,1.,seam);`
      : `vec2 p=vEyeUV*2.-1.;float n=tissue(vOrganic*.85);
        float almond=max(0.,1.-p.x*p.x);if(abs(p.y)>.78*almond+.015)discard;float gap=.61*almond*vOpen;
        float lid=smoothstep(gap-.025,gap+.015,abs(p.y));
        vec2 irisP=vec2(p.x,p.y*1.38)-vGaze;float ir=length(irisP);
        float angle=atan(irisP.y,irisP.x);float rays=.5+.5*sin(angle*67.+grain(vec3(irisP*40.,vSeed))*5.);
        vec3 iris=mix(vec3(.024,.023,.021),vec3(.11,.085,.06),rays*.6+grain(vec3(irisP*23.,vSeed))*.4);
        iris*=.5+.5*smoothstep(.15,.30,ir);iris*=1.-.65*smoothstep(.30,.37,ir);
        vec3 sclera=mix(vec3(.075,.055,.05),vec3(.32,.27,.23),pow(max(0.,1.-length(p)),.6));
        float vein=pow(abs(sin(p.x*31.+sin(p.y*26.)*1.8+n*9.)),22.)*smoothstep(.32,.85,abs(p.x));
        sclera=mix(sclera,vec3(.23,.035,.033),vein*.6);
        vec3 eyeball=mix(sclera,iris,1.-smoothstep(.35,.38,ir));
        eyeball=mix(eyeball,vec3(.002),1.-smoothstep(.19,.21,ir));
        // A tiny corneal catchlight, shaded together with the PBR specular.
        eyeball*=.6+.4*sqrt(max(.05,1.-dot(p*.82,p*.82)));
        vec2 glint=(irisP-vec2(-.10,.12))*vec2(1.,1.5);eyeball+=vec3(.65)*exp(-dot(glint,glint)*650.);
        diffuseColor.rgb=mix(eyeball,flesh(vOrganic*.85),lid);
        diffuseColor.rgb*=mix(.38,1.,smoothstep(0.,.09,abs(abs(p.y)-gap)));`;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + color);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor=${eye ? 'mix(.16,.38,lid)' : kind === 'stem' ? '.72' : kind === 'floor' ? '.48+n*.20' : '.22+n*.32'};`);
    // Fine dermal/fibrous normal perturbation: no textures or extra draw calls.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      float relief=${kind === 'eye' ? 'n*.075*lid' : kind === 'floor' ? 'n*.012' : kind === 'stem' ? 'fibre*.035+n*.018' : 'n*.075'};
      vec3 q0=dFdx(vViewPosition),q1=dFdy(vViewPosition);
      vec3 surfN=cross(q0,q1);float det=dot(q0,cross(q1,normal));
      normal=normalize(normal+sign(det)*(dFdx(relief)*cross(q1,normal)+dFdy(relief)*cross(normal,q0))/max(abs(det),.00001));`);
    if (kind === 'floor') shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      // Broken reflection of the horizon, not a mirror or a full-screen pass.
      float streak=exp(-abs(vOrganic.x)*1.3)*(0.07+n*.20)*(0.3+checker*.7);
      totalEmissiveRadiance+=vec3(.83,.84,.87)*streak;`);
  };
  return m;
}
function makeCap(THREE, segments=48, rings=20) {
  const geo = new THREE.SphereGeometry(1, segments, rings, 0, Math.PI * 2, 0, Math.PI * .54);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, ...capPoint((1 - uv.getY(i)) * Math.PI * .54, uv.getX(i) * Math.PI * 2));
  geo.computeVertexNormals(); geo.computeBoundingSphere(); return geo;
}
function makeStem(THREE, segments=40) {
  const points = [[.92,0],[1,.025],[.73,.09],[.57,.24],[.49,.48],[.53,.66],[.82,.69],[.62,.73],[.56,.9],[.73,1]].map(p => new THREE.Vector2(...p));
  const g = new THREE.LatheGeometry(points, segments), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x);
    const rib=1+.075*Math.sin(a*19+y*13)+.035*Math.sin(a*31-y*9);p.setXYZ(i,x*rib+.035*Math.sin(y*6),y,z*rib); }
  g.computeVertexNormals(); return g;
}
function instances(THREE, geo, mat, items, cap) {
  const mesh=new THREE.InstancedMesh(geo,mat,items.length),d=new THREE.Object3D();
  items.forEach((m,i)=>{d.position.set(m.x,cap?m.h:-8,m.z);d.rotation.set(0,m.yaw,0);
    d.scale.set(cap?m.w:m.w*.27,cap?m.sy:m.h+8,cap?m.w:m.w*.27);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);});
  mesh.computeBoundingSphere(); mesh.name=cap?'ZarkhaelCaps':'ZarkhaelStems';return mesh;
}
function eyePatches(THREE, items, N=16, M=10) {
  const data={position:[],uv:[],aSeed:[],aCenter:[],aTangent:[],aUp:[],aOut:[]},indices=[],eyes=[],r=random(916);
  const world=(m,t,p)=>{const v=capPoint(t,p),c=Math.cos(m.yaw),s=Math.sin(m.yaw);return new THREE.Vector3(m.x+m.w*(v[0]*c+v[2]*s),m.h+m.sy*v[1],m.z+m.w*(-v[0]*s+v[2]*c));};
  for(const m of items) for(let k=0;k<14;k++) {
    const phi=k*2.39996+r()*.22,theta=.78+(k%3)*.30+r()*.06,seed=r(),span=.15+r()*.06;
    const center=world(m,theta,phi),right=world(m,theta,phi+.001).sub(center).normalize(),up=world(m,theta-.001,phi).sub(center).normalize();
    const out=new THREE.Vector3().crossVectors(right,up).normalize();
    if(out.dot(center.clone().sub(new THREE.Vector3(m.x,m.h,m.z)))<0)out.negate();
    const roll=(r()-.5)*.5,co=Math.cos(roll),si=Math.sin(roll),tx=right.clone().multiplyScalar(co).addScaledVector(up,si),ty=up.clone().multiplyScalar(co).addScaledVector(right,-si);
    const base=data.position.length/3;
    for(let y=0;y<=M;y++)for(let x=0;x<=N;x++){
      const u=x/N*2-1,v=y/M*2-1;
      const p=world(m,theta-(u*si+v*co)*span*.72,phi+(u*co-v*si)*span/Math.sin(theta));
      // Edges penetrate the cap. Interior is raised only by a few centimetres.
      const edge=Math.max(Math.abs(u),Math.abs(v));p.addScaledVector(out,.10-.08*edge**8);
      data.position.push(...p);data.uv.push(x/N,y/M);data.aSeed.push(seed);
      for(const [key,value] of [['aCenter',center],['aTangent',tx],['aUp',ty],['aOut',out]])data[key].push(...value);
    }
    for(let y=0;y<M;y++)for(let x=0;x<N;x++){const a=base+y*(N+1)+x,b=a+N+1;indices.push(a,a+1,b,b,a+1,b+1);}
    eyes.push({center:center.toArray(),out:out.toArray(),seed});
  }
  const geo=new THREE.BufferGeometry();for(const [key,arr] of Object.entries(data))geo.setAttribute(key,new THREE.Float32BufferAttribute(arr,key==='uv'?2:key==='aSeed'?1:3));
  geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();return {geo,eyes};
}
function floorGeometry(THREE,radius) {
  // Continuous UV/world material across arena and corridor, without coplanar overlap.
  const positions=[],indices=[];
  const quad=(x1,z1,x2,z2)=>{const i=positions.length/3;positions.push(x1,0,z1,x1,0,z2,x2,0,z1,x2,0,z2);indices.push(i,i+1,i+2,i+2,i+1,i+3);};
  const R=radius+3;
  // Keep the original circular silhouette. Clip its rear arc at the corridor
  // junction, then share that edge: no overlay, gap or false walkable corners.
  const angle=Math.asin(8/R),join=-Math.sqrt(R*R-64),segments=64;
  positions.push(0,0,0);
  for(let i=0;i<=segments;i++){const a=angle+i/segments*(Math.PI*2-angle*2);positions.push(Math.sin(a)*R,0,-Math.cos(a)*R);}
  for(let i=1;i<=segments;i++)indices.push(0,i+1,i);
  indices.push(0,1,segments+1);
  quad(-8,-212,8,join);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Array(positions.length/3*2).fill(0),2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
export function buildMushroomDimension(THREE,group,spec,ctx) {
  const uniforms={uTime:{value:0},uPlayer:{value:new THREE.Vector3(0,1.7,10)},uCamera:{value:new THREE.Vector3()},uDistance:{value:95},uFraction:{value:.67}};
  const items=mushroomLayout(spec.radius),visuals=new THREE.Group();visuals.name='ZarkhaelOrganicArchitecture';group.add(visuals);
  const caps=instances(THREE,makeCap(THREE),surfaceMaterial(THREE,'cap',uniforms),items,true);
  const stems=instances(THREE,makeStem(THREE),surfaceMaterial(THREE,'stem',uniforms),items,false);
  const patches=eyePatches(THREE,items),eyes=new THREE.Mesh(patches.geo,surfaceMaterial(THREE,'eye',uniforms));eyes.name='ZarkhaelEmbeddedEyes';
  visuals.add(stems,caps,eyes);
  // Socket-bearing caps keep their tessellation: reducing it cuts into the
  // eyelids. LOD reduces the much denser eye patches and the stems instead.
  const lod={high:[caps.geometry,stems.geometry,eyes.geometry],medium:[caps.geometry,makeStem(THREE,28),eyePatches(THREE,items,12,8).geo],low:[caps.geometry,makeStem(THREE,20),eyePatches(THREE,items,8,5).geo]};
  const lodGeometries=new Set(Object.values(lod).flat());
  let appliedQuality='high';
  const floor=new THREE.Mesh(floorGeometry(THREE,spec.radius),surfaceMaterial(THREE,'floor',uniforms));floor.name='ZarkhaelWetChecker';floor.receiveShadow=true;group.add(floor);
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(22,22),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 vUv;void main(){float r=length(vUv-.5);float a=exp(-r*20.)*.55+exp(-r*r*2600.)*.6;gl_FragColor=vec4(vec3(.82,.85,.9),a);}' }));
  halo.name='ZarkhaelHorizon';halo.position.set(0,3.5,-210);group.add(halo);
  ctx.refs.zarkhaelCinematicOccluders=[stems,caps,eyes];
  let disposed=false,lastSample=-Infinity,currentQuality='medium';
  const localPlayer=new THREE.Vector3(),localCamera=new THREE.Vector3();
  ctx.tick.push((t,dt,camera,options={})=>{
    if(disposed)return;
    currentQuality=MUSHROOM_QUALITY[options.quality]?options.quality:'medium';const q=MUSHROOM_QUALITY[currentQuality];
    if(appliedQuality!==currentQuality){[caps.geometry,stems.geometry,eyes.geometry]=lod[currentQuality];caps.computeBoundingSphere();stems.computeBoundingSphere();appliedQuality=currentQuality;}
    uniforms.uTime.value=t;uniforms.uDistance.value=q.distance;uniforms.uFraction.value=q.fraction;
    if(t-lastSample>=1/q.hz||t<lastSample){
      group.updateWorldMatrix(true,false);localPlayer.copy(options.player||camera.position);group.worldToLocal(localPlayer);localPlayer.y+=1.35;
      localCamera.copy(camera.position);group.worldToLocal(localCamera);uniforms.uCamera.value.copy(localCamera);
      uniforms.uPlayer.value.lerp(localPlayer,1-Math.exp(-8*Math.min(.2,Math.max(1/q.hz,t-lastSample))));lastSample=t;
    }
    // All three layers move together: no sliding sockets or detached eyes.
    visuals.position.y=Math.sin(t*.48)*.018;
  });
  ctx.refs.mushrooms={items,eyes:patches.eyes,uniforms,stats:()=>({quality:currentQuality,mushrooms:items.length,eyes:patches.eyes.length,drawCalls:5,disposed}),
    dispose(){if(disposed)return;disposed=true;for(const geometry of lodGeometries)geometry.dispose();group.traverse(o=>{if(o.geometry&&!lodGeometries.has(o.geometry))o.geometry.dispose();if(o.material)o.material.dispose();if(o.isInstancedMesh)o.dispose();});}};
  return {bg:0x010102,fog:0x010102,fogNear:65,fogFar:265,hemi:[0xb7b1af,0x110608,.48],sun:[0xffe8dc,1.0],light:[0xffefdf,3.5,110,[0,18,4]],exposure:.85};
}
