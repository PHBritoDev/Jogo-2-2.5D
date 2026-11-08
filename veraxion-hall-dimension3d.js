/** Véraxion: connected rectangular architecture, static combat floor and analytic
 * images of the actual ceiling lights. No offscreen render, textures or new lights.
 * The 30 m combat disc is unchanged; the twisted continuation is scenery only.
 */
export const HALL = Object.freeze({ halfWidth: 36, height: 52, start: 44, step: 22, count: 32, tile: 6 });
export const HALL_QUALITY = Object.freeze({low:{detail:10,samples:1},medium:{detail:20,samples:3},high:{detail:32,samples:5}});
export function hallSection(z) {
  const d=Math.max(0,-z-40), angle=-.65*(1-Math.exp(-d/160));
  return {z,angle,shift:Math.sin(d*.006)*1.2};
}
function dFor(z){return Math.max(0,-z-40);}
export function hallPoint(x,y,z) {
  const s=hallSection(z),c=Math.cos(s.angle),n=Math.sin(s.angle);
  // Near the arena: only a slight shear of the upper structure, floor stays flat.
  const shear=-.065*Math.exp(-Math.max(0,-z-40)/80);
  return [x*c-(y-HALL.height/2)*n+s.shift+shear*y,(y-HALL.height/2)*c+x*n+HALL.height/2-.20*x*(y/HALL.height)*Math.exp(-dFor(z)/70),z];
}
export function hallLayout(){return Array.from({length:HALL.count},(_,i)=>({index:i,z0:HALL.start-i*HALL.step,z1:HALL.start-(i+1)*HALL.step,lampZ:HALL.start-(i+.5)*HALL.step}));}
const GLSL=`
 varying vec3 vHall; varying vec3 vHallNormal; varying vec2 vHallUV;
 uniform vec3 uHallCamera;
 uniform vec3 uLampCenter[32]; uniform vec3 uLampRight[32]; uniform vec3 uLampForward[32];
 uniform float uSamples; uniform float uReflection;
 float hashHall(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float grainHall(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hashHall(i),hashHall(i+vec3(1,0,0)),f.x),mix(hashHall(i+vec3(0,1,0)),hashHall(i+vec3(1,1,0)),f.x),f.y),mix(mix(hashHall(i+vec3(0,0,1)),hashHall(i+vec3(1,0,1)),f.x),mix(hashHall(i+vec3(0,1,1)),hashHall(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float lampImage(int j,vec3 ray,float blur){
   vec3 c=uLampCenter[j],r=uLampRight[j],f=uLampForward[j];
   vec3 n=normalize(cross(r,f)); float den=dot(ray,n);
   if(abs(den)<.001)return 0.;
   float t=dot(c-vHall,n)/den; if(t<=0.)return 0.;
   vec3 hit=vHall+ray*t-c;
   vec2 q=vec2(dot(hit,r),dot(hit,f));
   float edge=max(abs(q.x)-18.0,abs(q.y)-2.1);
   float shape=1.-smoothstep(-blur,blur,edge);
   float divider=smoothstep(.22-blur*.25,.30+blur*.25,abs(q.x));
   return shape*divider;
 }
`;
function material(THREE,kind,uniforms){
 const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:kind==='floor'?.25:.89,metalness:kind==='floor'?.12:.03,side:THREE.DoubleSide});
 m.name='hall-'+kind;m.customProgramCacheKey=()=>`veraxion-hall-v1-${kind}`;
 m.onBeforeCompile=s=>{
  Object.assign(s.uniforms,uniforms);
  s.vertexShader='varying vec3 vHall; varying vec3 vHallNormal; varying vec2 vHallUV;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vHall=position;vHallNormal=normal;vHallUV=uv;
    #ifdef USE_INSTANCING
      vHall=(instanceMatrix*vec4(position,1.)).xyz;
      vHallNormal=mat3(instanceMatrix)*normal;
    #endif`);
  s.fragmentShader=GLSL+s.fragmentShader;
  const floor=kind==='floor',door=kind==='door',trim=kind==='trim';
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float g=grainHall(vHall*12.1),wear=grainHall(vHall*.41);
    ${floor?`vec2 cell=vHallUV/6.;vec2 aa=max(fwidth(cell),vec2(.0001));
    // Analytic antialiasing preserves fine distant checks instead of shimmering.
    vec2 wave=sin(3.14159265*cell);vec2 filt=smoothstep(-aa*2.,aa*2.,wave);
    float check=filt.x+filt.y-2.*filt.x*filt.y;
    check=mix(check,.5,smoothstep(.5,1.5,max(aa.x,aa.y)));
    vec2 seam=abs(fract(cell+.5)-.5);float grout=1.-smoothstep(.003,.009,min(seam.x,seam.y));
    diffuseColor.rgb=vec3(mix(.006,.18,check)*(.65+.35*wear));diffuseColor.rgb*=1.-grout*.27;`:
    `diffuseColor.rgb=vec3(${door?'.004':trim?'.030':'.026'}*(.65+.35*g)*(.80+.20*wear));`}
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    ${floor?'roughnessFactor=.19+.12*wear+grout*.24;':'roughnessFactor=.80+.15*g;'}`);
  s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
    // Baked-style direct irradiance from the nearest physical ceiling recess.
    int nearLamp=int(clamp(floor((44.-vHall.z)/22.),0.,31.));
    vec3 toward=uLampCenter[nearLamp]-vHall;float dist=length(toward);
    float incidence=max(.08,dot(normalize(vHallNormal)*(gl_FrontFacing?1.:-1.),normalize(toward)));
    float baked=incidence*1200./(dist*dist+250.);
    reflectedLight.indirectDiffuse+=diffuseColor.rgb*(baked+${door?'.04':'.06'});
  `);
  if(floor)s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
    vec3 incident=normalize(vHall-uHallCamera),N=normalize(vHallNormal);
    if(N.y<0.)N=-N;
    vec3 ray=reflect(incident,N);
    // Estimate the candidate by the ceiling plane, then intersect its actual quad.
    float estimate=(52.-vHall.y)/max(.01,ray.y);
    float guess=floor((44.-(vHall.z+ray.z*estimate))/22.);
    float reflected=0.;float blur=.55+wear*1.2+length(vHall-uHallCamera)*.0008;
    for(int k=-2;k<=2;k++){
      if(abs(float(k))>(uSamples-1.)*.5)continue;
      int j=int(clamp(guess+float(k),0.,31.));
      reflected=max(reflected,lampImage(j,ray,blur));
    }
    float fresnel=.13+.50*pow(1.-max(0.,dot(-incident,N)),4.);
    float broken=.78+.22*grainHall(vec3(vHall.x*7.,vHall.z*1.7,0.));
    outgoingLight+=vec3(reflected*fresnel*broken*1.3*uReflection)*(1.-grout*.45);
    #include <opaque_fragment>`);
 };
 return m;
}
function batch(THREE,name,mat){
 const positions=[],uvs=[],indices=[];
 return {quad(points,uv=[[0,0],[1,0],[1,1],[0,1]]){const n=positions.length/3;points.forEach(p=>positions.push(...p));uv.forEach(p=>uvs.push(...p));indices.push(n,n+1,n+2,n,n+2,n+3);},
 mesh(){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,mat);mesh.name=name;return mesh;}};
}
export function buildHallDimension(THREE,group,spec,ctx){
 if(spec.radius>32)throw new RangeError('Hall visual footprint expects the existing 30 m combat arena');
 const layout=hallLayout(),uniforms={uHallCamera:{value:new THREE.Vector3()},uLampCenter:{value:[]},uLampRight:{value:[]},uLampForward:{value:[]},uSamples:{value:5},uReflection:{value:1}};
 const mats={wall:material(THREE,'wall',uniforms),floor:material(THREE,'floor',uniforms),door:material(THREE,'door',uniforms),trim:material(THREE,'trim',uniforms)};
 const lampMat=new THREE.MeshBasicMaterial({color:0xe1e1df,toneMapped:false,fog:false,side:THREE.DoubleSide});lampMat.name='hall-luminaires';
 const wall=batch(THREE,'hall-connected-walls',mats.wall),floor=batch(THREE,'hall-checker-floor',mats.floor),doors=batch(THREE,'hall-recessed-doors',mats.door),trim=batch(THREE,'hall-structural-frames',mats.trim),lamps=batch(THREE,'hall-ceiling-luminaires',lampMat),details=[];
 const P=hallPoint,W=HALL.halfWidth,H=HALL.height;
 function sidePatch(b,x,y0,y1,z0,z1){b.quad([P(x,y0,z0),P(x,y1,z0),P(x,y1,z1),P(x,y0,z1)],[[z0,y0],[z0,y1],[z1,y1],[z1,y0]]);}
 function roofPatch(b,x0,x1,z0,z1,y=H){b.quad([P(x0,y,z0),P(x1,y,z0),P(x1,y,z1),P(x0,y,z1)],[[x0,z0],[x1,z0],[x1,z1],[x0,z1]]);}
 function frontPatch(b,x0,x1,y0,y1,z){b.quad([P(x0,y0,z),P(x1,y0,z),P(x1,y1,z),P(x0,y1,z)]);}
 for(const {index:i,z0,z1,lampZ:zc} of layout){
  // Every section shares exact boundary vertices with its neighbours.
  roofPatch(floor,-W,W,z1,z0,0);
  for(const sign of [-1,1]){
   const x=sign*W,back=x+sign*1.3,d0=zc+4.4,d1=zc-4.4,dh=43;
   sidePatch(wall,x,0,H,z0,d0);sidePatch(wall,x,dh,H,d0,d1);sidePatch(wall,x,0,H,d1,z1);
   sidePatch(doors,back,.18,dh-.12,d0,d1);
   // Deep jambs, top reveal and physical frame edges (no door decals).
   for(const z of [d0,d1])trim.quad([P(x,0,z),P(back,0,z),P(back,dh,z),P(x,dh,z)]);
   trim.quad([P(x,dh,d0),P(back,dh,d0),P(back,dh,d1),P(x,dh,d1)]);
   for(const z of [d0+.16,d1-.16])sidePatch(trim,x-sign*.08,0,dh+.35,z+.17,z-.17);
   sidePatch(trim,x-sign*.09,dh,dh+.40,d0+.35,d1-.35);
   sidePatch(trim,x-sign*.1,0,1.2,z0,z1);
   // Structural pilaster has real front and side faces, not a floating hoop.
   const inner=x-sign*1.5;
   sidePatch(trim,inner,0,H,z1+.7,z1);
   trim.quad([P(x,0,z1+.7),P(inner,0,z1+.7),P(inner,H,z1+.7),P(x,H,z1+.7)]);
   for(const yy of [1.8,39])details.push({p:P(x-sign*.22,yy,zc+4.9),i});
  }
  // Ceiling has a genuine hole around the light, and a solid inset backing.
  roofPatch(wall,-W,-18.7,z0,z1);roofPatch(wall,18.7,W,z0,z1);
  roofPatch(wall,-18.7,18.7,z0,zc+2.7);roofPatch(wall,-18.7,18.7,zc-2.7,z1);
  roofPatch(trim,-W,W,z1+.9,z1,H-1.2);
  frontPatch(trim,-W,W,H-1.2,H,z1+.9);
  roofPatch(trim,-18.7,18.7,zc+2.7,zc-2.7,H+.1);
  roofPatch(lamps,-18,-.25,zc+2.1,zc-2.1,H+.03);
  roofPatch(lamps,.25,18,zc+2.1,zc-2.1,H+.03);
  const c=new THREE.Vector3(...P(0,H+.03,zc));
  const r=new THREE.Vector3(...P(10,H+.03,zc)).sub(c).normalize();
  const f=new THREE.Vector3(...P(0,H+.03,zc+2.1)).sub(new THREE.Vector3(...P(0,H+.03,zc-2.1))).normalize();
  uniforms.uLampCenter.value.push(c);uniforms.uLampRight.value.push(r);uniforms.uLampForward.value.push(f);
 }
 // Close both ends; the small distant white rectangle is an architectural opening.
 const end=layout.at(-1).z1;
 frontPatch(wall,-W,W,0,H,HALL.start);
 frontPatch(wall,-W,-2.3,0,H,end);frontPatch(wall,2.3,W,0,H,end);
 frontPatch(wall,-2.3,2.3,0,21,end);frontPatch(wall,-2.3,2.3,29,H,end);
 frontPatch(lamps,-2.3,2.3,21,29,end-.05);
 const meshes=[wall.mesh(),floor.mesh(),doors.mesh(),trim.mesh(),lamps.mesh()];meshes.forEach(m=>group.add(m));
 const boltGeo=new THREE.BoxGeometry(.15,.15,.15),bolts=new THREE.InstancedMesh(boltGeo,mats.trim,details.length),obj=new THREE.Object3D();
 details.forEach((d,i)=>{obj.position.set(...d.p);obj.updateMatrix();bolts.setMatrixAt(i,obj.matrix);});bolts.instanceMatrix.needsUpdate=true;bolts.computeBoundingSphere();bolts.name='hall-jamb-fasteners';group.add(bolts);
 let quality='high',disposed=false,updates=0;
 const api={layout,uniforms,occluders:[meshes[0],meshes[2],meshes[3],meshes[4],bolts],
  stats:()=>({quality,sections:layout.length,doors:layout.length*2,luminaires:layout.length,drawCalls:6,triangles:meshes.reduce((n,m)=>n+m.geometry.index.count/3,0)+bolts.count*12,disposed,updates,reflection:'analytic ceiling quads; no scene/character reflection'}),
  dispose(){if(disposed)return;disposed=true;for(const m of [...meshes,bolts]){m.geometry.dispose();group.remove(m);}bolts.dispose();Object.values(mats).forEach(m=>m.dispose());lampMat.dispose();},
  update(t,dt,camera,options={}){if(disposed)return;updates++;group.updateWorldMatrix(true,false);uniforms.uHallCamera.value.copy(camera.position);group.worldToLocal(uniforms.uHallCamera.value);const next=HALL_QUALITY[options.quality]?options.quality:'medium';if(next!==quality){quality=next;uniforms.uSamples.value=HALL_QUALITY[quality].samples;bolts.count=HALL_QUALITY[quality].detail*4;}}
 };
 ctx.refs.hall=api;ctx.tick.push(api.update);
 return {bg:0x020202,fog:0x030303,fogNear:420,fogFar:800,hemi:[0xffffff,0x121212,.48],sun:[0xffffff,.32],light:[0xffffff,2.5,110,[0,22,2]],exposure:1.1};
}
