/**
 * Bishop I — Campo do Último Sol.
 * Reference: 34.6 s clip: wind-tossed susuki field, rising ridge and a tiny tree/shrine
 * silhouette by the last 3 seconds. Arena physics remains unchanged inside fight radius.
 * Visual slope starts beyond the combat boundary so enemies and powers cannot fall through.
 */
export function buildGoldenMeadow(THREE, group, spec, ctx) {
  const radius = spec.radius;
  let seed = 1708;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const owned = [];
  const add = o => { group.add(o); owned.push(o); return o; };

  // Reference has a gently ascending golden ridge toward -Z. Physics inside 30m stays flat.
  const terrainY=(x,z)=>{
    const r=Math.hypot(x,z),fade=THREE.MathUtils.smoothstep(r,radius+3,radius+24);
    const dist=THREE.MathUtils.smoothstep(-z,27,156);
    // Ridge isn't a straight horizontal strip: a broad rise in the middle,
    // flanked by lower rolling shoulders, matching the filmed uphill journey.
    const crown=Math.exp(-Math.pow((x-4)/78,2));
    const ridge=dist*(3.3+7.5*crown+1.3*Math.sin(x*.025));
    const swell=(1.1*Math.sin(x*.021+z*.010)+.7*Math.cos(x*.033-z*.016))*dist;
    return -.055+fade*(ridge+swell);
  };
  const groundSize=420,segments=112;
  const geo = new THREE.PlaneGeometry(groundSize, groundSize, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x=p.getX(i),z=p.getZ(i);p.setY(i,terrainY(x,z));
  }
  geo.computeVertexNormals();

  // Shared micro-grass ground pattern fills exposed patches without thousands more meshes.
  const earthCanvas=document.createElement('canvas');earthCanvas.width=512;earthCanvas.height=512;
  const earthInk=earthCanvas.getContext('2d'),earthRandom=(()=>{let n=34577;return()=>((n=(n*1664525+1013904223)>>>0)/4294967296)})();
  earthInk.fillStyle='#ad8751';earthInk.fillRect(0,0,512,512);
  for(let i=0;i<21000;i++){
    const x=earthRandom()*512,y=earthRandom()*512,len=1+earthRandom()*6;
    earthInk.strokeStyle=earthRandom()>.5?'rgba(238,204,138,.42)':'rgba(100,74,37,.38)';
    earthInk.lineWidth=.35+earthRandom()*.65;
    earthInk.beginPath();earthInk.moveTo(x,y);earthInk.lineTo(x+(earthRandom()-.4)*3,y-len);earthInk.stroke();
  }
  const earthTex=new THREE.CanvasTexture(earthCanvas);
  earthTex.colorSpace=THREE.SRGBColorSpace;earthTex.wrapS=earthTex.wrapT=THREE.RepeatWrapping;
  earthTex.repeat.set(18,18);earthTex.anisotropy=4;
  const soil = new THREE.MeshStandardMaterial({map:earthTex,color:0xb39264,roughness:1,metalness:0});
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
        vertices.push(side*.54*dx,y,side*.54*dz);
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
  const material = new THREE.MeshStandardMaterial({map:foliageTex,alphaTest:.25,side:THREE.DoubleSide,roughness:.9,metalness:0,emissive:0x483016,emissiveIntensity:.17});
  material.onBeforeCompile = shader => {
    shader.uniforms.uGoldenWind = wind;
    shader.vertexShader = shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uGoldenWind;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float bladeHeight = clamp(position.y / 2.22, 0.0, 1.0);
      // Waves travel spatially across the field; strong permanent sway, not tiny jitter.
      vec2 fieldPos=instanceMatrix[3].xz;
      float wave=sin(uGoldenWind*2.05-fieldPos.x*.085-fieldPos.y*.135);
      float crossWave=sin(uGoldenWind*1.37+fieldPos.x*.045-fieldPos.y*.115);
      float flutter=sin(uGoldenWind*4.8+fieldPos.x*.53+fieldPos.y*.40)*.12;
      float gust=.52*wave+.31*crossWave+flutter+.22;
      float bend=bladeHeight*bladeHeight;
      transformed.x+=gust*bend;
      transformed.z+=(gust*.67+crossWave*.16)*bend;
      transformed.y-=abs(gust)*.16*bend;`);
  };
  material.customProgramCacheKey=()=>'golden-field-traveling-wind-v9';


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
        const fade=THREE.MathUtils.smoothstep(r,radius+5,radius+70);
        const y=terrainY(x,z);
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
  plot(14900,0,45);plot(9500,45,115);plot(4500,115,196);



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
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uGoldenWind;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float tall=clamp(position.y/1.47,0.0,1.0);
      vec2 q=instanceMatrix[3].xz;
      float wave=sin(uGoldenWind*2.05-q.x*.085-q.y*.135);
      float cross=sin(uGoldenWind*1.37+q.x*.045-q.y*.115);
      float bend=tall*tall;
      transformed.x+=(wave*.57+cross*.29+.18)*bend;
      transformed.z+=(wave*.39+cross*.21)*bend;
      transformed.y-=abs(wave*.45+cross*.2)*.12*bend;`);
  };
  leafMat.customProgramCacheKey=()=>'golden-ground-leaf-wind-v2';

  const leafCount=12500,leafSectors=12,dummyLeaf=new THREE.Object3D(),colLeaf=new THREE.Color();
  for(let sector=0;sector<leafSectors;sector++){
    const n=Math.floor(leafCount/leafSectors)+(sector<leafCount%leafSectors?1:0);
    const leafMesh=new THREE.InstancedMesh(leafGeo,leafMat,n);
    for(let i=0;i<n;i++){
      const a=(sector+random())/leafSectors*Math.PI*2,rr=Math.sqrt(random())*72;
      const x=Math.cos(a)*rr,z=Math.sin(a)*rr;
      const fade=THREE.MathUtils.smoothstep(rr,radius+5,radius+70);
      const y=terrainY(x,z)+.01;
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

  // Final seconds of the creator's reference (32–35 s): umbrella-shaped tree
  // silhouette on the far ridge and a small gate just to its left. Natural scale,
  // not a giant boss model in the playable combat space.
  const silhouetteMat=new THREE.MeshStandardMaterial({
    color:0x47351e,roughness:1,metalness:0
  });
  const canopyMat=new THREE.MeshStandardMaterial({
    color:0x56502c,roughness:1,metalness:0,side:THREE.DoubleSide
  });
  function connectBranch(parent,start,end,width,material){
    const vec=new THREE.Vector3().subVectors(end,start);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(width*.62,width,vec.length(),7),material);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec.normalize());
    parent.add(mesh);return mesh;
  }
  const loneTree=new THREE.Group();
  loneTree.position.set(13,terrainY(13,-151),-151);
  const base=new THREE.Vector3(0,0,0),top=new THREE.Vector3(.35,7.5,0);
  connectBranch(loneTree,base,top,.68,silhouetteMat);
  for(const [x,z,h,rx,rz] of [[-4,0,8.1,3.8,2.2],[3.4,0,8.0,3.7,2.4],
    [0,-1.3,8.8,4.5,2.5],[-1.3,1.2,8.5,4.3,2.6]]){
    connectBranch(loneTree,new THREE.Vector3(.2,5.6,0),
      new THREE.Vector3(x,h,z),.25,silhouetteMat);
    const canopy=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),canopyMat);
    canopy.position.set(x,h,z);canopy.scale.set(rx,1.0+Math.abs(x)*.07,rz);
    loneTree.add(canopy);
  }
  add(loneTree);
  // Subtle wooden gateway / crossbar on the same horizon, recognizable when approaching.
  const gate=new THREE.Group();gate.position.set(-17,terrainY(-17,-150),-150);
  const gateWood=new THREE.MeshStandardMaterial({color:0x67513a,roughness:1});
  for(const x of [-2.5,2.5]){
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,5.8,6),gateWood);
    leg.position.set(x,2.9,0);gate.add(leg);
  }
  const bar=new THREE.Mesh(new THREE.BoxGeometry(7.1,.36,.5),gateWood);
  bar.position.y=5.65;gate.add(bar);
  const beam=new THREE.Mesh(new THREE.BoxGeometry(5.8,.28,.48),gateWood);
  beam.position.y=4.4;gate.add(beam);
  add(gate);

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
        vec3 horizon=vec3(1.0,0.885,0.73);
        vec3 zenith=vec3(1.0,.955,.88);
        vec3 low=vec3(.76,.55,.36);
        vec3 sky=mix(horizon,zenith,smoothstep(-0.02,0.72,up));
        sky=mix(low,sky,smoothstep(-0.34,-0.03,up));
        vec3 sunDir=normalize(vec3(0.0,0.02,-1.0));
        float sunDot=max(dot(normalize(vSkyDir),sunDir),0.0);
        float corona=pow(sunDot,14.0)*.18+pow(sunDot,160.0)*.65;
        sky+=vec3(1.,.77,.43)*corona;
        gl_FragColor=vec4(min(sky,vec3(1.0)),1.0);
      }`
  });
  const skyMesh=add(new THREE.Mesh(skyGeo,skyMat));
  skyMesh.renderOrder=-100;

  // Far sun halo: the main light comes from the existing dimension lighting contract.
  // Single inexpensive billboard atlas: tiny white sun, wide amber bloom and
  // soft asymmetric shafts, avoiding the flat white perfect circle of v1.
  const glowCanvas = document.createElement('canvas'); glowCanvas.width=256;glowCanvas.height=256;
  const brush=glowCanvas.getContext('2d'),gr=brush.createRadialGradient(128,128,3,128,128,128);
  gr.addColorStop(0,'rgba(255,255,250,1)');gr.addColorStop(.055,'rgba(255,254,244,1)');
  gr.addColorStop(.13,'rgba(255,241,194,.82)');gr.addColorStop(.36,'rgba(255,211,133,.33)');
  gr.addColorStop(.77,'rgba(255,180,93,.075)');gr.addColorStop(1,'rgba(255,170,74,0)');
  brush.fillStyle=gr;brush.fillRect(0,0,256,256);
  // Translucent vertical/diagonal rays taper into the horizon; all baked once.
  for(let i=0;i<18;i++){
    const angle=(i/18)*Math.PI*2 + .13*Math.sin(i*8.2);
    const len=35+(i%5)*15;
    brush.save();brush.translate(128,128);brush.rotate(angle);
    const beam=brush.createLinearGradient(10,0,115,0);
    beam.addColorStop(0,'rgba(255,250,225,.25)');
    beam.addColorStop(1,'rgba(255,225,148,0)');
    brush.fillStyle=beam;brush.beginPath();brush.moveTo(8,-2.5);brush.lineTo(8+len,-.65);
    brush.lineTo(8+len,.65);brush.lineTo(8,2.5);brush.closePath();brush.fill();brush.restore();
  }
  const sunTexture=new THREE.CanvasTexture(glowCanvas);sunTexture.colorSpace=THREE.SRGBColorSpace;
  const sun=new THREE.Sprite(new THREE.SpriteMaterial({map:sunTexture,color:0xffffff,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
  sun.position.set(0,14,-185);sun.scale.set(92,92,1);add(sun);

  ctx.refs.goldenMeadow={
    dispose(){group.remove(...owned);stalkGeo.dispose();liteGeo.dispose();geo.dispose();soil.dispose();earthTex.dispose();leafGeo.dispose();leafMat.dispose();material.dispose();foliageTex.dispose();silhouetteMat.dispose();canopyMat.dispose();gateWood.dispose();
      loneTree.traverse(o=>{if(o.isMesh)o.geometry.dispose();});gate.traverse(o=>{if(o.isMesh)o.geometry.dispose();});skyGeo.dispose();skyMat.dispose();sunTexture.dispose();sun.material.dispose();}
  };
  ctx.tick.push(t=>{wind.value=t;});
  return {bg:0xf8e2c8,fog:0xe6c6a0,fogNear:110,fogFar:275,
    hemi:[0xfff2d9,0xb27c45,1.7],sun:[0xffe0a6,2.25],
    light:[0xffcd85,1.32,145,[0,19,-65]],exposure:1.18};
}
