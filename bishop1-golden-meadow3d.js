/**
 * Bishop I — Campo do Último Sol.
 * Reference: 34 s clip supplied by the creator, tall golden wheat under a low sun,
 * pale sunset horizon and backlit feathery wild grass; NO tree or wheat crop. Isolated from combat.
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
  const soil = new THREE.MeshStandardMaterial({color:0x8c6531,roughness:1,metalness:0});
  add(new THREE.Mesh(geo,soil)).receiveShadow = true;

  // The reference has no built road; the entire arena is covered in windblown wild grass.
  const trackShape = new THREE.Shape();
  trackShape.moveTo(-1.25, 9); trackShape.bezierCurveTo(-1.4,-20,-2.5,-58,-1,-112);
  trackShape.lineTo(1.2,-112);trackShape.bezierCurveTo(2.4,-58,1.3,-20,1.25,9);trackShape.closePath();
  const pathGeo = new THREE.ShapeGeometry(trackShape,20);
  pathGeo.rotateX(-Math.PI/2);
  const trail = new THREE.Mesh(pathGeo,new THREE.MeshStandardMaterial({color:0xad8c54,roughness:1,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));
  trail.position.y=.015; add(trail);



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
  ink.strokeStyle='rgba(115,83,38,.92)';ink.lineWidth=3;
  ink.beginPath();ink.moveTo(129,510);ink.bezierCurveTo(116,365,123,235,134,122);ink.stroke();
  for(let k=0;k<6;k++){
    const y=325+k*26,side=k%2?-1:1;
    ink.strokeStyle='rgba(170,123,55,.83)';ink.lineWidth=2.1;
    ink.beginPath();ink.moveTo(125,y+29);ink.quadraticCurveTo(125+side*52,y-5,125+side*91,y-28);ink.stroke();
  }
  // Soft feathery head: many separate downy strands, wider at the middle,
  // strongly backlit and with curved tips blowing toward the right.
  for(let k=0;k<220;k++){
    const t=grassRandom(),y=72+t*235,wide=Math.sin(t*Math.PI)*44+5;
    const side=grassRandom()>.5?1:-1;
    const center=131+14*t*t;
    const x=center+side*(grassRandom()*.92+.08)*wide;
    const length=19+grassRandom()*52;
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
        vertices.push(side*.5*dx,y,side*.5*dz);
        uvs.push((side+1)/2,v);
      }
      ind.push(n,n+1,n+2,n+1,n+3,n+2);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    g.setIndex(ind);g.computeVertexNormals();return g;
  }
  const stalkGeo=makeCards(3);
  const liteGeo=makeCards(2);
  const wind = {value:0};
  const material = new THREE.MeshStandardMaterial({map:foliageTex,alphaTest:.29,side:THREE.DoubleSide,roughness:.88,metalness:0});
  material.onBeforeCompile = shader => {
    shader.uniforms.uGoldenWind = wind;
    shader.vertexShader = shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uGoldenWind;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float bladeHeight = clamp(position.y / 2.22, 0.0, 1.0);
      float instancePhase = instanceMatrix[3].x * .19 + instanceMatrix[3].z * .16;
      float gust = sin(uGoldenWind * 1.05 + instancePhase) * .17
                 + sin(uGoldenWind * .53 + instancePhase * 2.0) * .13;
      transformed.x += gust * bladeHeight * bladeHeight;
      transformed.z += gust * .39 * bladeHeight;
      transformed.y -= abs(gust) * .08 * bladeHeight;`);
  };
  material.customProgramCacheKey=()=>'golden-golden-feather-atlas-wind-v5';

  function plot(count,near,far,seedOffset){
    // Distinct tiles/LOD bands avoid overdraw-heavy endless dense stalks.
    const mesh = new THREE.InstancedMesh(near>=45?liteGeo:stalkGeo,material,count);
    const dummy = new THREE.Object3D(), golden = new THREE.Color();
    for(let i=0;i<count;i++) {
      const angle = random() * Math.PI*2;
      const r=Math.sqrt(near*near+random()*(far*far-near*near));
      const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
      const track = false; // original video is an uninterrupted sea of gold
      const hillFade=THREE.MathUtils.smoothstep(r,radius+5,radius+70);
      const y=-.055+(1.8*Math.sin(x*.019+z*.008)+2.1*Math.sin(z*.026-x*.011)+2*Math.cos(x*.033))*hillFade;
      dummy.position.set(x,y,z);
      dummy.rotation.set(0,random()*6.283,0);
      const s=(.69+random()*.62)*(r>95?1.2:1);
      dummy.scale.set(s,s*(.79+random()*.36),track?.11*s:s);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      golden.setHSL(.100+random()*.018,.22+random()*.18,.91+random()*.07);
      mesh.setColorAt(i,golden);
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.frustumCulled=false;
    mesh.castShadow=false;mesh.receiveShadow=false;
    add(mesh);
  }
  plot(9000,0,45,0);plot(10000,45,115,1);plot(5300,115,196,2);


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
        float corona=pow(max(dot(normalize(vSkyDir),sunDir),0.0),24.0);
        sky+=vec3(0.09,0.075,0.055)*corona;
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
  sun.position.set(0,4,-167);sun.scale.set(105,105,1);add(sun);

  ctx.refs.goldenMeadow={
    dispose(){group.remove(...owned);stalkGeo.dispose();liteGeo.dispose();geo.dispose();soil.dispose();material.dispose();foliageTex.dispose();skyGeo.dispose();skyMat.dispose();sunTexture.dispose();sun.material.dispose();}
  };
  ctx.tick.push(t=>{wind.value=t;});
  return {bg:0xf5e4cf,fog:0xe0c6a5,fogNear:95,fogFar:250,
    hemi:[0xfff1d7,0xb08350,1.75],sun:[0xffe4b5,2.25],
    light:[0xffd8a0,1.05,135,[0,17,-46]],exposure:1.2};
}
