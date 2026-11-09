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
  const soil = new THREE.MeshStandardMaterial({map:earthTex,color:0xffdfb5,roughness:1,metalness:0});
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
  ink.strokeStyle='rgba(194,152,89,.74)';ink.lineWidth=2.1;
  ink.beginPath();ink.moveTo(129,510);ink.bezierCurveTo(116,365,123,235,134,122);ink.stroke();
  for(let k=0;k<6;k++){
    const y=325+k*26,side=k%2?-1:1;
    ink.strokeStyle='rgba(218,181,110,.67)';ink.lineWidth=1.2;
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
  function makeCards(planes){
    const vertices=[],uvs=[],ind=[];
    for(let j=0;j<planes;j++){
      const angle=j*Math.PI/planes,dx=Math.cos(angle),dz=Math.sin(angle),n=vertices.length/3;
      for(const [side,y,v] of [[-1,0,0],[1,0,0],[-1,2.22,1],[1,2.22,1]]){
        vertices.push(side*.39*dx,y,side*.39*dz);
        uvs.push((side+1)/2,v);
      }
      ind.push(n,n+1,n+2,n+1,n+3,n+2);
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
  const material = new THREE.MeshStandardMaterial({map:foliageTex,alphaTest:.35,side:THREE.DoubleSide,roughness:.9,metalness:0,emissive:0x483016,emissiveIntensity:.17});
  material.onBeforeCompile = shader => {
    shader.uniforms.uGoldenWind = wind;
    shader.uniforms.uMeadowTime=wind;
    shader.uniforms.uMeadowImpacts=impactUniform;
    shader.vertexShader = shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uGoldenWind;\n'+impactGLSL);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float bladeHeight = clamp(position.y / 2.22, 0.0, 1.0);
      vec2 worldXZ = instanceMatrix[3].xz;
      // Large waves travel across the whole meadow, while each plume flickers independently.
      float sweeping = sin(uGoldenWind * 2.45 - worldXZ.x * .086 + worldXZ.y * .063);
      float secondary = sin(uGoldenWind * 3.7 + worldXZ.x * .17 + worldXZ.y * .11);
      float flutter = sin(uGoldenWind * 6.7 + worldXZ.x * .41 - worldXZ.y * .34);
      float gust = .35 + .52*sweeping + .25*secondary + .12*flutter;
      transformed.x += gust * 1.55 * bladeHeight * bladeHeight;
      transformed.z += gust * .71 * bladeHeight * bladeHeight;
      transformed.y -= abs(gust)*.38*bladeHeight*bladeHeight;
      transformed.y *= meadowSurvival(worldXZ);`);
  };
  material.customProgramCacheKey=()=>'golden-ridge-wind-impact-v10';


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
        const scale=(.50+random()*.48)*(r>95?1.1:1);
        dummy.scale.set(scale,scale*(.79+random()*.36),scale);
        dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
        golden.setHSL(.102+random()*.025,.28+random()*.18,.87+random()*.11);
        mesh.setColorAt(i,golden);
      }
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.frustumCulled=true;mesh.computeBoundingSphere();
      if(mesh.boundingSphere)mesh.boundingSphere.radius+=1.6; // allow wind displacements
      mesh.castShadow=false;mesh.receiveShadow=false;add(mesh);
    }
  }
  plot(13000,0,45);plot(10500,45,115);plot(4500,115,196);



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
  const leafMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,side:THREE.DoubleSide});
  leafMat.onBeforeCompile=shader=>{
    shader.uniforms.uGoldenWind=wind;
    shader.uniforms.uMeadowTime=wind;
    shader.uniforms.uMeadowImpacts=impactUniform;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uGoldenWind;\n'+impactGLSL);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float tall=clamp(position.y/1.47,0.0,1.0);
      vec2 xy=instanceMatrix[3].xz;
      float wave=sin(uGoldenWind*2.45-xy.x*.086+xy.y*.063);
      float micro=sin(uGoldenWind*5.0+xy.x*.23-xy.y*.18);
      transformed.x+=(.42+.52*wave+.21*micro)*tall*tall;
      transformed.z+=(.16+.22*wave)*tall*tall;
      transformed.y *= meadowSurvival(xy);`);
  };
  leafMat.customProgramCacheKey=()=>'golden-ground-leaf-wind-impact-v3';

  const leafCount=12500,leafSectors=12,dummyLeaf=new THREE.Object3D(),colLeaf=new THREE.Color();
  for(let sector=0;sector<leafSectors;sector++){
    const n=Math.floor(leafCount/leafSectors)+(sector<leafCount%leafSectors?1:0);
    const leafMesh=new THREE.InstancedMesh(leafGeo,leafMat,n);
    for(let i=0;i<n;i++){
      const a=(sector+random())/leafSectors*Math.PI*2,rr=Math.sqrt(random())*72;
      const x=Math.cos(a)*rr,z=Math.sin(a)*rr;
      const y=terrainHeight(x,z)+.01;
      dummyLeaf.position.set(x,y,z);dummyLeaf.rotation.set(0,random()*6.283,0);
      const sc=.5+random()*.68;dummyLeaf.scale.set(sc,sc,sc);dummyLeaf.updateMatrix();
      leafMesh.setMatrixAt(i,dummyLeaf.matrix);
      colLeaf.setHSL(.105+random()*.022,.39+random()*.2,.72+random()*.21);
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
      void main(){
        float up=clamp(vSkyDir.y,-1.0,1.0);
        vec3 horizon=vec3(0.98,0.87,0.72);
        vec3 zenith=vec3(0.98,0.95,0.89);
        vec3 low=vec3(0.71,0.52,0.33);
        vec3 sky=mix(horizon,zenith,smoothstep(-0.02,0.72,up));
        sky=mix(low,sky,smoothstep(-0.34,-0.03,up));
        vec3 sunDir=normalize(vec3(0.0,0.02,-1.0));
        float facing=max(dot(normalize(vSkyDir),sunDir),0.0);
        float corona=pow(facing,14.0);
        float burning=pow(facing,140.0);
        sky+=vec3(.18,.145,.095)*corona+vec3(.23,.18,.10)*burning;
        gl_FragColor=vec4(min(sky,vec3(1.0)),1.0);
      }`
  });
  const skyMesh=add(new THREE.Mesh(skyGeo,skyMat));
  skyMesh.renderOrder=-100;

  // Far sun halo: the main light comes from the existing dimension lighting contract.
  const glowCanvas = document.createElement('canvas'); glowCanvas.width=128;glowCanvas.height=128;
  const brush=glowCanvas.getContext('2d'),gr=brush.createRadialGradient(64,64,5,64,64,64);
  gr.addColorStop(0,'rgba(255,250,215,1)');gr.addColorStop(.13,'rgba(255,234,171,.95)');
  gr.addColorStop(.32,'rgba(255,195,108,.36)');gr.addColorStop(1,'rgba(255,179,89,0)');
  brush.fillStyle=gr;brush.fillRect(0,0,128,128);
  const sunTexture=new THREE.CanvasTexture(glowCanvas);sunTexture.colorSpace=THREE.SRGBColorSpace;
  const sun=new THREE.Sprite(new THREE.SpriteMaterial({map:sunTexture,color:0xffffff,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
  sun.position.set(0,10,-177);sun.scale.set(89,59,1);add(sun);
  // Compact white core against a wider amber atmosphere, at the crest of the hill.
  const sunCore=new THREE.Sprite(new THREE.SpriteMaterial({map:sunTexture,color:0xffffff,transparent:true,opacity:.88,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
  sunCore.position.set(0,10.5,-175);sunCore.scale.set(38,30,1);add(sunCore);

  ctx.refs.goldenMeadow={
    impact,
    dispose(){if(typeof window!=='undefined')window.removeEventListener('golden-meadow-impact',onMeadowImpact);group.remove(...owned);stalkGeo.dispose();liteGeo.dispose();geo.dispose();soil.dispose();earthTex.dispose();leafGeo.dispose();leafMat.dispose();material.dispose();foliageTex.dispose();skyGeo.dispose();skyMat.dispose();sunTexture.dispose();sun.material.dispose();sunCore.material.dispose();darkBark.dispose();darkFoliage.dispose();distantTree.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
  };
  ctx.tick.push(t=>{wind.value=t;});
  return {bg:0xf5e4cf,fog:0xe0c6a5,fogNear:95,fogFar:250,
    hemi:[0xfff1d7,0xb08350,1.75],sun:[0xffe4b5,2.25],
    light:[0xffedcc,1.42,155,[0,15,-48]],exposure:1.23};
}
