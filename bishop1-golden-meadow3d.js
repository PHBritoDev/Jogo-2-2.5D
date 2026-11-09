/**
 * Bishop I — Campo do Último Sol.
 * Reference: 34 s clip supplied by the creator, tall golden wheat under a low sun,
 * pale sunset horizon and backlit feathery wild grass; NO tree or wheat crop. Isolated from combat.
 * The battle circle stays physically flat, while the visible distant approach rises into a long ridge.
 */
export function buildGoldenMeadow(THREE, group, spec, ctx) {
  const radius = spec.radius;
  let seed = 1708;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const owned = [];
  const add = o => { group.add(o); owned.push(o); return o; };

  // Ground outside the combat radius rises toward the backlit ridge; physics stays flat where the boss fights.
  const terrainHeight = (x,z) => {
    const r=Math.hypot(x,z),fade=THREE.MathUtils.smoothstep(r,radius+1,radius+38);
    const approach=THREE.MathUtils.smoothstep(-z,20,152);
    const ridge=5.1*approach*approach + .84*Math.sin(x*.022+z*.012)+.47*Math.sin(x*.055-z*.018);
    return -.055+fade*ridge;
  };
  const groundSize = 420, segments = 112;
  const geo = new THREE.PlaneGeometry(groundSize, groundSize, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, terrainHeight(x,z));
  }
  geo.computeVertexNormals();

  // Shared micro-grass ground pattern fills exposed patches without thousands more meshes.
  const earthCanvas=document.createElement('canvas');earthCanvas.width=512;earthCanvas.height=512;
  const earthInk=earthCanvas.getContext('2d'),earthRandom=(()=>{let n=34577;return()=>((n=(n*1664525+1013904223)>>>0)/4294967296)})();
  earthInk.fillStyle='#c8aa73';earthInk.fillRect(0,0,512,512);
  for(let i=0;i<21000;i++){
    const x=earthRandom()*512,y=earthRandom()*512,len=1+earthRandom()*6;
    earthInk.strokeStyle=earthRandom()>.5?'rgba(251,227,171,.62)':'rgba(144,112,64,.27)';
    earthInk.lineWidth=.35+earthRandom()*.65;
    earthInk.beginPath();earthInk.moveTo(x,y);earthInk.lineTo(x+(earthRandom()-.4)*3,y-len);earthInk.stroke();
  }
  const earthTex=new THREE.CanvasTexture(earthCanvas);
  earthTex.colorSpace=THREE.SRGBColorSpace;earthTex.wrapS=earthTex.wrapT=THREE.RepeatWrapping;
  earthTex.repeat.set(18,18);earthTex.anisotropy=4;
  const soil = new THREE.MeshStandardMaterial({map:earthTex,color:0xffe2b9,roughness:1,metalness:0,emissive:0x7c4a16,emissiveIntensity:.16});
  add(new THREE.Mesh(geo,soil)).receiveShadow = true;

  // Procedural diffuse+opacity atlas for feathery susuki / pampas. Several crossed
  // alpha-tested cards per tuft create a natural silhouette with few triangles.
  // A single shared 256x512 texture; no transparent blending or overdraw sorting.
  const texCanvas=document.createElement('canvas');
  texCanvas.width=256;texCanvas.height=512;
  const ink=texCanvas.getContext('2d');
  const grassRandom=(()=>{let n=913;return()=>((n=(n*1664525+1013904223)>>>0)/4294967296)})();
  ink.clearRect(0,0,256,512);
  // Dark stalk, with slender green-bronze lower leaves.
  ink.lineCap='round';
  ink.strokeStyle='rgba(211,178,120,.55)';ink.lineWidth=1.25;
  ink.beginPath();ink.moveTo(129,510);ink.bezierCurveTo(116,365,123,235,134,122);ink.stroke();
  for(let k=0;k<6;k++){
    const y=325+k*26,side=k%2?-1:1;
    ink.strokeStyle='rgba(227,194,139,.62)';ink.lineWidth=.85;
    ink.beginPath();ink.moveTo(125,y+29);ink.quadraticCurveTo(125+side*52,y-5,125+side*91,y-28);ink.stroke();
  }
  // Soft feathery head: many separate downy strands, wider at the middle,
  // strongly backlit and with curved tips blowing toward the right.
  for(let k=0;k<220;k++){
    const t=grassRandom(),y=72+t*235,wide=Math.sin(t*Math.PI)*27+3;
    const side=grassRandom()>.5?1:-1;
    const center=125+31*t*t;
    const x=center+side*(grassRandom()*.92+.08)*wide;
    const length=32+grassRandom()*64;
    const bend=(.3+grassRandom()*.7)*length;
    const light=grassRandom();
    ink.strokeStyle=light>.72?'rgba(255,249,222,.94)':light>.37?'rgba(255,234,185,.88)':'rgba(241,203,139,.72)';
    ink.lineWidth=.45+grassRandom()*.92;
    ink.beginPath();ink.moveTo(center+side*(2+grassRandom()*5),y+length*.32);
    ink.quadraticCurveTo(x-side*bend*.2,y-length*.26,x+side*bend*.35,y-length*.65);
    ink.stroke();
  }
  // Grainy cream highlight spine for coherent plume volume rather than dots.
  const headGradient=ink.createLinearGradient(0,55,0,310);
  headGradient.addColorStop(0,'rgba(251,239,202,0)');
  headGradient.addColorStop(.25,'rgba(255,246,211,.62)');
  headGradient.addColorStop(.73,'rgba(255,230,183,.42)');
  headGradient.addColorStop(1,'rgba(180,130,70,0)');
  ink.lineWidth=3;ink.strokeStyle=headGradient;
  ink.beginPath();ink.moveTo(131,290);ink.quadraticCurveTo(120,174,137,71);ink.stroke();

  const foliageTex=new THREE.CanvasTexture(texCanvas);
  foliageTex.colorSpace=THREE.SRGBColorSpace;
  foliageTex.anisotropy=4;
  // Five height rings instead of a rigid billboard: the stem curves naturally.
  // All rings are in a single instanced draw call, with no CPU animation.
  function makeCards(planes){
    const vertices=[],uvs=[],ind=[],rings=5;
    for(let j=0;j<planes;j++){
      const angle=j*Math.PI/planes,dx=Math.cos(angle),dz=Math.sin(angle),base=vertices.length/3;
      for(let row=0;row<rings;row++){
        const v=row/(rings-1),width=.39*(1-.12*v);
        for(const side of [-1,1]){
          vertices.push(side*width*dx,2.22*v,side*width*dz);
          uvs.push((side+1)/2,v);
        }
      }
      for(let row=0;row<rings-1;row++){
        const n=base+row*2;ind.push(n,n+1,n+2,n+1,n+3,n+2);
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    g.setIndex(ind);g.computeVertexNormals();return g;
  }
  const stalkGeo=makeCards(2);
  const liteGeo=makeCards(1);
  const wind = {value:0};
  // Eight transient GPU impact zones; no per-blade CPU updates or buffer uploads.
  const impactSlots=Array.from({length:8},()=>new THREE.Vector4(100000,100000,0,-10000));
  const impactUniform={value:impactSlots};
  let nextImpact=0;
  const impact=(x,z,radius=5)=>{
    if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<=0)return;
    // Accept world-space coordinates from combat and convert them to arena-local coordinates.
    const lx=Math.abs(x-spec.x)<220?x-spec.x:x;
    const lz=Math.abs(z-spec.z)<220?z-spec.z:z;
    impactSlots[nextImpact].set(lx,lz,Math.min(35,Math.max(.5,radius)),wind.value);
    nextImpact=(nextImpact+1)%impactSlots.length;
  };
  const impactGLSL=`uniform vec4 uMeadowImpacts[8];
    uniform float uMeadowTime;
    float meadowSurvival(vec2 site) {
      float survival=1.0;
      for(int i=0;i<8;i++){
        vec4 zone=uMeadowImpacts[i];
        float age=uMeadowTime-zone.w;
        float impactEnabled=step(0.0,age)*(1.0-step(11.5,age));
        float within=1.0-smoothstep(zone.z*.77,zone.z, distance(site,zone.xy));
        float recovery=smoothstep(1.25,10.5,age);
        survival=min(survival,1.0-impactEnabled*within*(1.0-recovery));
      }
      return survival;
    }`;
  // Public event for gameplay VFX, also exposed via refs.goldenMeadow.impact().
  const onMeadowImpact=event=>{
    const d=event.detail||{}; impact(Number(d.x),Number(d.z),Number(d.radius??d.r??5));
  };
  if(typeof window!=='undefined')window.addEventListener('golden-meadow-impact',onMeadowImpact);
  const material = new THREE.MeshStandardMaterial({map:foliageTex,alphaTest:.26,side:THREE.DoubleSide,roughness:.94,metalness:0,emissive:0xb68b54,emissiveIntensity:.29});
  material.onBeforeCompile = shader => {
    shader.uniforms.uGoldenWind = wind;
    shader.uniforms.uMeadowTime=wind;
    shader.uniforms.uMeadowImpacts=impactUniform;
    shader.vertexShader = shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uGoldenWind;\nvarying float vMeadowTipGlow;\n'+impactGLSL);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vMeadowTipGlow;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(.20,.112,.042)*vMeadowTipGlow;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float bladeHeight = clamp(position.y / 2.22, 0.0, 1.0);
      vMeadowTipGlow = smoothstep(.43,.96,bladeHeight);
      vec2 worldXZ = instanceMatrix[3].xz;
      // Large waves travel across the whole meadow, while each plume flickers independently.
      // Two advection scales create a travelling wind FIELD, not synchronized oscillation.
      // Neighbouring plumes share the gust; individual plumes retain a small delayed response.
      float seedPhase=fract(sin(dot(worldXZ,vec2(12.9898,78.233)))*43758.5453);
      vec2 advected=worldXZ-vec2(uGoldenWind*7.4,uGoldenWind*2.8);
      float longWave=sin(dot(advected,vec2(.046,.018))+
                         .36*sin(dot(advected,vec2(.018,-.025))));
      float crossWave=sin(dot(advected,vec2(-.028,.061))*.84+uGoldenWind*.32);
      float gust=smoothstep(-.78,.82,longWave*.80+crossWave*.25);
      float weather=.32+.66*gust;
      float phase=seedPhase*6.28318;
      float localSway=sin(uGoldenWind*1.48+dot(worldXZ,vec2(.039,.022))+phase*.24);
      float delayedTip=sin(uGoldenWind*2.42+dot(worldXZ,vec2(.046,.018))+phase*.68-bladeHeight*.86);
      float tiny=sin(uGoldenWind*4.65+phase*1.63+dot(worldXZ,vec2(.15,-.12)))*.07;
      float bend=(.33+.68*weather)*(.69+.24*localSway)+.21*weather*delayedTip+tiny;
      float flex=bladeHeight*bladeHeight*(3.0-2.0*bladeHeight);
      float tipFlex=flex*(.78+.22*bladeHeight);
      transformed.x += bend*1.77*tipFlex;
      transformed.z += (bend*.51+.12*crossWave*weather)*tipFlex;
      // Compression follows the square of the lean; stems remain rooted.
      transformed.y -= bend*bend*.29*flex;
      transformed.y *= meadowSurvival(worldXZ);`);
  };
  material.customProgramCacheKey=()=>'golden-last-sun-wind-v13';


  function plot(count,near,far){
    // Twelve polar sectors per LOD band. Each has its own bounding volume,
    // so Three.js culls off-screen blades rather than sending the whole field
    // to the GPU on every camera angle. Density and visual fidelity are unchanged.
    const sectors=12,dummy=new THREE.Object3D(),golden=new THREE.Color();
    for(let sector=0;sector<sectors;sector++){
      const n=Math.floor(count/sectors)+(sector<count%sectors?1:0);
      const mesh=new THREE.InstancedMesh(near>=45?liteGeo:stalkGeo,material,n);
      for(let i=0;i<n;i++){
        const angle=(sector+random())/sectors*Math.PI*2;
        const r=Math.sqrt(near*near+random()*(far*far-near*near));
        const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
        const y=terrainHeight(x,z);
        dummy.position.set(x,y,z);dummy.rotation.set(0,random()*6.283,0);
        const scale=(.42+random()*.40)*(r>95?1.20:1);
        dummy.scale.set(scale,scale*(.79+random()*.36),scale);
        dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
        golden.setHSL(.102+random()*.025,.33+random()*.18,.76+random()*.15);
        mesh.setColorAt(i,golden);
      }
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.frustumCulled=true;mesh.computeBoundingSphere();
      if(mesh.boundingSphere)mesh.boundingSphere.radius+=1.6; // allow wind displacements
      mesh.castShadow=false;mesh.receiveShadow=false;add(mesh);
    }
  }
  plot(19500,0,45);plot(12500,45,115);plot(4500,115,196);



  // Individual wispy stems between the main plumes, so the ground is not planted
  // in identical spaced rows. One low-triangle instanced mesh, with shared wind.
  const leafV=[-.022,0,0, .022,0,0, -.032,.46,0, .029,.46,.01,
               -.016,1.1,.08, .01,1.1,.1, 0,1.47,.16];
  const leafC=[.48,.35,.14,.48,.35,.14,.60,.44,.20,.63,.47,.22,
               .90,.69,.33,.90,.70,.35,1,.82,.47];
  const leafGeo=new THREE.BufferGeometry();
  leafGeo.setAttribute('position',new THREE.Float32BufferAttribute(leafV,3));
  leafGeo.setAttribute('color',new THREE.Float32BufferAttribute(leafC,3));
  leafGeo.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);leafGeo.computeVertexNormals();
  const leafMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,side:THREE.DoubleSide,emissive:0x58452a,emissiveIntensity:.23});
  leafMat.onBeforeCompile=shader=>{
    shader.uniforms.uGoldenWind=wind;
    shader.uniforms.uMeadowTime=wind;
    shader.uniforms.uMeadowImpacts=impactUniform;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uGoldenWind;\n'+impactGLSL);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float tall=clamp(position.y/1.47,0.0,1.0);
      vec2 xy=instanceMatrix[3].xz;
      float seedPhase=fract(sin(dot(xy,vec2(12.9898,78.233)))*43758.5453);
      vec2 advected=xy-vec2(uGoldenWind*7.4,uGoldenWind*2.8);
      float longWave=sin(dot(advected,vec2(.046,.018))+
                         .36*sin(dot(advected,vec2(.018,-.025))));
      float crossWave=sin(dot(advected,vec2(-.028,.061))*.84+uGoldenWind*.32);
      float weather=.32+.66*smoothstep(-.78,.82,longWave*.80+crossWave*.25);
      float swing=sin(uGoldenWind*1.48+dot(xy,vec2(.039,.022))+seedPhase*1.5);
      float flutter=sin(uGoldenWind*3.4+seedPhase*7.0+dot(xy,vec2(.12,-.09)));
      float bend=(.33+.68*weather)*(.69+.24*swing)+.12*weather*flutter;
      float flex=tall*tall*(3.0-2.0*tall);
      transformed.x+=bend*.99*flex;
      transformed.z+=(bend*.33+.08*crossWave*weather)*flex;
      transformed.y-=bend*bend*.13*flex;
      transformed.y *= meadowSurvival(xy);`);
  };
  leafMat.customProgramCacheKey=()=>'golden-ground-leaf-wind-v5';

  const leafCount=17500,leafSectors=12,dummyLeaf=new THREE.Object3D(),colLeaf=new THREE.Color();
  for(let sector=0;sector<leafSectors;sector++){
    const n=Math.floor(leafCount/leafSectors)+(sector<leafCount%leafSectors?1:0);
    const leafMesh=new THREE.InstancedMesh(leafGeo,leafMat,n);
    for(let i=0;i<n;i++){
      const a=(sector+random())/leafSectors*Math.PI*2,rr=Math.sqrt(random())*72;
      const x=Math.cos(a)*rr,z=Math.sin(a)*rr;
      const y=terrainHeight(x,z)+.01;
      dummyLeaf.position.set(x,y,z);dummyLeaf.rotation.set(0,random()*6.283,0);
      const sc=.42+random()*.56;dummyLeaf.scale.set(sc,sc,sc);dummyLeaf.updateMatrix();
      leafMesh.setMatrixAt(i,dummyLeaf.matrix);
      colLeaf.setHSL(.106+random()*.022,.30+random()*.17,.78+random()*.17);
      leafMesh.setColorAt(i,colLeaf);
    }
    leafMesh.instanceMatrix.needsUpdate=true;
    if(leafMesh.instanceColor)leafMesh.instanceColor.needsUpdate=true;
    leafMesh.frustumCulled=true;leafMesh.computeBoundingSphere();
    if(leafMesh.boundingSphere)leafMesh.boundingSphere.radius+=1.6;
    leafMesh.castShadow=false;add(leafMesh);
  }

  // Horizon landmark from the final seconds of the reference: a solitary, flat-canopy tree.
  // It sits beyond the arena, and its silhouette is framed by the sun, not made interactive.
  const distantTree=new THREE.Group();
  distantTree.position.set(0,terrainHeight(0,-151),-151);
  const darkBark=new THREE.MeshStandardMaterial({color:0x44321d,roughness:1});
  const darkFoliage=new THREE.MeshStandardMaterial({color:0x4a432b,roughness:1,flatShading:true});
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.24,.55,8.1,7),darkBark);
  trunk.position.y=4.1;distantTree.add(trunk);
  for(const [x,y,z,rx,ry,rz] of [[-2.9,8.4,0,3.9,.95,2.6],[1.4,9.2,0,4.9,1.05,3.2],[3.6,8.1,-.2,3.7,.7,2.4]]){
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),darkFoliage);
    crown.position.set(x,y,z);crown.scale.set(rx,ry,rz);distantTree.add(crown);
  }
  add(distantTree);

  // Endless pastel sky dome; distant glow remains behind the foreground grass.
  // The original reference has a warm ivory sky, not an outdoor blue daytime sky.
  const skyGeo=new THREE.SphereGeometry(204,36,20);
  const skyMat=new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,depthTest:true,fog:false,
    vertexShader:`varying vec3 vSkyDir;
      void main(){vSkyDir=normalize(position);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec3 vSkyDir;
      float cloudHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float cloudNoise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(cloudHash(i),cloudHash(i+vec2(1.,0.)),f.x),
                   mix(cloudHash(i+vec2(0.,1.)),cloudHash(i+vec2(1.,1.)),f.x),f.y);
      }
      void main(){
        vec3 d=normalize(vSkyDir);
        float up=clamp(d.y,-1.0,1.0);
        vec3 horizon=vec3(1.00,.90,.73);
        vec3 zenith=vec3(.80,.83,.85);
        vec3 low=vec3(.82,.56,.34);
        vec3 sky=mix(horizon,zenith,smoothstep(-.035,.75,up));
        sky=mix(low,sky,smoothstep(-.34,-.025,up));
        // Broad, broken clouds, without extra meshes or texture downloads.
        vec2 cp=vec2(atan(d.x,-d.z)*1.7,up*5.0);
        float n=cloudNoise(cp*2.5)*.64+cloudNoise(cp*5.2)*.36;
        float clouds=smoothstep(.48,.72,n)*smoothstep(-.02,.20,up);
        sky=mix(sky,vec3(.94,.85,.78),clouds*.54);
        vec3 sunDir=normalize(vec3(0.0,.045,-1.0));
        float facing=max(dot(d,sunDir),0.0);
        float haze=pow(facing,7.0);
        float corona=pow(facing,48.0);
        float burning=pow(facing,310.0);
        // Sunlit air: a bright ivory horizon, broad amber scattering and restrained hot core.
        float amberBelt=exp(-pow((up-.065)*5.8,2.0))*pow(facing,2.1);
        sky+=vec3(.33,.20,.075)*haze+vec3(.41,.27,.13)*corona+vec3(.46,.33,.21)*burning;
        sky+=vec3(.17,.095,.026)*amberBelt;
        gl_FragColor=vec4(min(sky,vec3(1.0)),1.0);
      }`
  });
  const skyMesh=add(new THREE.Mesh(skyGeo,skyMat));
  skyMesh.renderOrder=-100;

  // Far sun halo: the main light comes from the existing dimension lighting contract.
  const glowCanvas = document.createElement('canvas'); glowCanvas.width=128;glowCanvas.height=128;
  const brush=glowCanvas.getContext('2d'),gr=brush.createRadialGradient(64,64,5,64,64,64);
  gr.addColorStop(0,'rgba(255,253,235,1)');gr.addColorStop(.10,'rgba(255,243,192,1)');
  gr.addColorStop(.29,'rgba(255,212,140,.63)');gr.addColorStop(.64,'rgba(255,163,78,.21)');gr.addColorStop(1,'rgba(255,179,89,0)');
  brush.fillStyle=gr;brush.fillRect(0,0,128,128);
  const sunTexture=new THREE.CanvasTexture(glowCanvas);sunTexture.colorSpace=THREE.SRGBColorSpace;
  const sun=new THREE.Sprite(new THREE.SpriteMaterial({map:sunTexture,color:0xffffff,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
  sun.position.set(0,10,-177);sun.scale.set(142,91,1);add(sun);
  // Compact white core against a wider amber atmosphere, at the crest of the hill.
  const sunCore=new THREE.Sprite(new THREE.SpriteMaterial({map:sunTexture,color:0xffffff,transparent:true,opacity:.88,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
  sunCore.position.set(0,10.5,-175);sunCore.scale.set(52,39,1);add(sunCore);

  ctx.refs.goldenMeadow={
    impact,
    dispose(){if(typeof window!=='undefined')window.removeEventListener('golden-meadow-impact',onMeadowImpact);group.remove(...owned);stalkGeo.dispose();liteGeo.dispose();geo.dispose();soil.dispose();earthTex.dispose();leafGeo.dispose();leafMat.dispose();material.dispose();foliageTex.dispose();skyGeo.dispose();skyMat.dispose();sunTexture.dispose();sun.material.dispose();sunCore.material.dispose();darkBark.dispose();darkFoliage.dispose();distantTree.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
  };
  ctx.tick.push(t=>{wind.value=t;});
  // Stronger golden-hour light without lifting exposure until all hues clip to white.
  return {bg:0xffead0,fog:0xeed7b1,fogNear:101,fogFar:255,
    hemi:[0xfff5df,0xb48c55,2.18],sun:[0xffdda8,3.48],
    light:[0xffe4af,1.95,165,[0,15,-48]],exposure:1.20};
}
