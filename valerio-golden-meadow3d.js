/**
 * Bishop I — Campo do Último Sol.
 * Reference: 34 s clip supplied by the creator, tall golden wheat under a low sun,
 * soft rolling horizon and a solitary distant tree. Isolated from all combat code.
 * The real playable surface remains flat inside arenaSpec.radius (combat physics).
 */
export function buildGoldenMeadow(THREE, group, spec, ctx) {
  const radius = spec.radius;
  let seed = 1708;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const owned = [];
  const add = o => { group.add(o); owned.push(o); return o; };

  // Geometry only rolls past the playable arena, maintaining combat collision assumptions.
  const groundSize = 420, segments = 112;
  const geo = new THREE.PlaneGeometry(groundSize, groundSize, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    const fade = THREE.MathUtils.smoothstep(r, radius + 5, radius + 70);
    const hills = (1.8 * Math.sin(x * .019 + z * .008) + 2.1 * Math.sin(z * .026 - x * .011) + 2.0 * Math.cos(x * .033)) * fade;
    p.setY(i, -0.055 + hills);
  }
  geo.computeVertexNormals();
  const soil = new THREE.MeshStandardMaterial({color:0x9b7537,roughness:1,metalness:0});
  add(new THREE.Mesh(geo,soil)).receiveShadow = true;

  // Walking track: subtly parted wheat, not a hard paved stripe.
  const trackShape = new THREE.Shape();
  trackShape.moveTo(-1.25, 9); trackShape.bezierCurveTo(-1.4,-20,-2.5,-58,-1,-112);
  trackShape.lineTo(1.2,-112);trackShape.bezierCurveTo(2.4,-58,1.3,-20,1.25,9);trackShape.closePath();
  const pathGeo = new THREE.ShapeGeometry(trackShape,20);
  pathGeo.rotateX(-Math.PI/2);
  const trail = new THREE.Mesh(pathGeo,new THREE.MeshStandardMaterial({color:0xad8c54,roughness:1,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));
  trail.position.y=.015; add(trail);

  // Crossed tapered stalks, all geometries reused in a handful of instanced draws.
  const stalkGeo = new THREE.BufferGeometry();
  const vertices = [],indices = [],colors = [];
  const palette = [[.54,.36,.14],[.78,.55,.23],[.94,.73,.36]];
  for(let plane=0;plane<2;plane++) {
    const a=plane*Math.PI/2,dx=Math.cos(a),dz=Math.sin(a),base=vertices.length/3;
    for(let level=0;level<4;level++) {
      const y=[0,.39,.78,1.32][level], wide=[.13,.105,.062,.008][level];
      for(const side of [-1,1]){vertices.push(side*wide*dx,y,side*wide*dz);colors.push(...palette[Math.min(2,Math.floor(level*.8))]);}
    }
    for(let s=0;s<3;s++){const k=base+s*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  // Gold seed heads with bristles and flag leaves: wheat silhouettes, not plain crossed grass cards.
  for(let plane=0;plane<3;plane++){
    const a=plane*Math.PI/3, dx=Math.cos(a), dz=Math.sin(a);
    // A staggered tapered grain head with six overlapping husks.
    for(let k=0;k<6;k++){
      const y=1.00+k*.066, half=.065*(1-k/8), base=vertices.length/3;
      vertices.push(-half*dx,y,-half*dz, half*dx,y,half*dz,
                    0,y+.125,0);
      colors.push(.96,.76,.41,.96,.76,.41,1,.85,.51);
      indices.push(base,base+1,base+2);
    }
    // Wheat awns are long tapered filaments, clustered around the seed head.
    for(let k=0;k<5;k++){
      const y=1.06+k*.066, base=vertices.length/3;
      const tilt=.10+k*.020;
      vertices.push(0,y,0,tilt*dx,y+.16,tilt*dz,-tilt*dx,y+.13,-tilt*dz);
      colors.push(.9,.66,.29,1,.83,.45,1,.83,.45);
      indices.push(base,base+1,base+2);
    }
    // Flag leaf extends diagonally, softening the upright stalk silhouette.
    const base=vertices.length/3;
    vertices.push(0,.69,0,.035*dx,.79,.035*dz,.31*dx,.96,.31*dz);
    colors.push(.65,.45,.19,.76,.56,.23,.93,.72,.32);
    indices.push(base,base+1,base+2);
  }
  stalkGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  stalkGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  stalkGeo.setIndex(indices);
  stalkGeo.computeVertexNormals();

  const wind = {value:0};
  const material = new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.91,metalness:0});
  material.onBeforeCompile = shader => {
    shader.uniforms.uValerioWind = wind;
    shader.vertexShader = shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uValerioWind;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float bladeHeight = clamp(position.y / 1.42, 0.0, 1.0);
      float instancePhase = instanceMatrix[3].x * .19 + instanceMatrix[3].z * .16;
      float gust = sin(uValerioWind * 1.05 + instancePhase) * .17
                 + sin(uValerioWind * .53 + instancePhase * 2.0) * .13;
      transformed.x += gust * bladeHeight * bladeHeight;
      transformed.z += gust * .39 * bladeHeight;
      transformed.y -= abs(gust) * .08 * bladeHeight;`);
  };
  material.customProgramCacheKey=()=>'valerio-golden-wheat-wind-v2';

  function plot(count,near,far,seedOffset){
    // Distinct tiles/LOD bands avoid overdraw-heavy endless dense stalks.
    const mesh = new THREE.InstancedMesh(stalkGeo,material,count);
    const dummy = new THREE.Object3D(), golden = new THREE.Color();
    for(let i=0;i<count;i++) {
      const angle = random() * Math.PI*2;
      const r=Math.sqrt(near*near+random()*(far*far-near*near));
      const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
      const track = z<9 && z>-116 && Math.abs(x + .004*z*Math.sin(z*.05))<.83 + Math.abs(z)*.003;
      const hillFade=THREE.MathUtils.smoothstep(r,radius+5,radius+70);
      const y=-.055+(1.8*Math.sin(x*.019+z*.008)+2.1*Math.sin(z*.026-x*.011)+2*Math.cos(x*.033))*hillFade;
      dummy.position.set(x,y,z);
      dummy.rotation.set(0,random()*6.283,0);
      const s=(.77+random()*.67)*(r>95?1.22:1);
      dummy.scale.set(track?.58*s:s,s*(.79+random()*.36),track?.11*s:s);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      golden.setHSL(.105+random()*.026,.47+random()*.24,.42+random()*.19);
      mesh.setColorAt(i,golden);
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.frustumCulled=false;
    mesh.castShadow=false;mesh.receiveShadow=false;
    add(mesh);
  }
  plot(21000,0,45,0);plot(18000,45,115,1);plot(10000,115,196,2);

  // A solitary dark tree on the distant ridge: silhouette anchors the composition.
  const tree = new THREE.Group(); tree.position.set(0,.5,-116);
  const bark = new THREE.MeshStandardMaterial({color:0x3d3024,roughness:1});
  const leaves = new THREE.MeshStandardMaterial({color:0x554e2a,roughness:.95,side:THREE.DoubleSide});
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.2,.58,7,8),bark);trunk.position.y=3.5;tree.add(trunk);
  function limb(x,y,z,x2,y2,z2,r){
    const a=new THREE.Vector3(x,y,z),b=new THREE.Vector3(x2,y2,z2),v=b.clone().sub(a);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.52,r,v.length(),6),bark);
    mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());tree.add(mesh);
  }
  const crowns=[[-3.4,6.2,.3,3.2,1.25,2.0],[-.6,7.6,0,3.7,1.55,2.4],[2.9,6.4,.5,3.1,1.3,2.1]];
  crowns.forEach(([x,y,z,sx,sy,sz])=>{
    limb(0,5.1,0,x,y,z,.35);
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),leaves);
    crown.position.set(x,y,z);crown.scale.set(sx,sy,sz);tree.add(crown);
  });
  add(tree);

  // Far sun halo: the main light comes from the existing dimension lighting contract.
  const glowCanvas = document.createElement('canvas'); glowCanvas.width=128;glowCanvas.height=128;
  const brush=glowCanvas.getContext('2d'),gr=brush.createRadialGradient(64,64,5,64,64,64);
  gr.addColorStop(0,'rgba(255,250,215,1)');gr.addColorStop(.13,'rgba(255,234,171,.95)');
  gr.addColorStop(.32,'rgba(255,195,108,.36)');gr.addColorStop(1,'rgba(255,179,89,0)');
  brush.fillStyle=gr;brush.fillRect(0,0,128,128);
  const sunTexture=new THREE.CanvasTexture(glowCanvas);sunTexture.colorSpace=THREE.SRGBColorSpace;
  const sun=new THREE.Sprite(new THREE.SpriteMaterial({map:sunTexture,color:0xffffff,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
  sun.position.set(5,18,-175);sun.scale.set(58,58,1);add(sun);

  ctx.refs.goldenMeadow={
    dispose(){group.remove(...owned);stalkGeo.dispose();geo.dispose();pathGeo.dispose();soil.dispose();trail.material.dispose();material.dispose();bark.dispose();leaves.dispose();sunTexture.dispose();sun.material.dispose();}
  };
  ctx.tick.push(t=>{wind.value=t;});
  return {bg:0xc6b48f,fog:0xd1b990,fogNear:55,fogFar:230,
    hemi:[0xffedc5,0x98734f,1.5],sun:[0xffdc9f,1.8],
    light:[0xffce8c,.75,110,[12,24,-46]],exposure:1.12};
}
