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
  const soil = new THREE.MeshStandardMaterial({color:0x9b7537,roughness:1,metalness:0});
  add(new THREE.Mesh(geo,soil)).receiveShadow = true;

  // The reference has no built road; the entire arena is covered in windblown wild grass.
  const trackShape = new THREE.Shape();
  trackShape.moveTo(-1.25, 9); trackShape.bezierCurveTo(-1.4,-20,-2.5,-58,-1,-112);
  trackShape.lineTo(1.2,-112);trackShape.bezierCurveTo(2.4,-58,1.3,-20,1.25,9);trackShape.closePath();
  const pathGeo = new THREE.ShapeGeometry(trackShape,20);
  pathGeo.rotateX(-Math.PI/2);
  const trail = new THREE.Mesh(pathGeo,new THREE.MeshStandardMaterial({color:0xad8c54,roughness:1,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));
  trail.position.y=.015; add(trail);


  // Thin stalks and several drooping plume ribbons. Silhouette follows pampas/susuki
  // reference rather than agricultural wheat spikes; tips arc with the prevailing wind.
  const stalkGeo=new THREE.BufferGeometry(),vertices=[],colors=[],indices=[];
  const addTriangle=(a,b,c,ca,cb,cc)=>{
    const k=vertices.length/3;vertices.push(...a,...b,...c);
    colors.push(...ca,...cb,...cc);indices.push(k,k+1,k+2);
  };
  const stemColor=[.47,.33,.14],headBase=[.73,.51,.25],headLight=[1,.83,.55],tip=[.99,.9,.7];
  for(let plane=0;plane<3;plane++){
    const theta=plane*Math.PI/3,dx=Math.cos(theta),dz=Math.sin(theta);
    const v=(x,y)=>[dx*x,y,dz*x];
    addTriangle(v(-.012,0),v(.012,0),v(0,1.47),stemColor,stemColor,headBase);
    // Plume: airy tapering silhouette, arching slightly under gravity and wind.
    for(let k=0;k<7;k++){
      const t0=k/7,t1=(k+1)/7;
      const cy0=1.08+t0*.78,cy1=1.08+t1*.78;
      const lean0=.075*Math.sin(t0*Math.PI)+.12*t0*t0;
      const lean1=.075*Math.sin(t1*Math.PI)+.12*t1*t1;
      const wide0=.19*Math.pow(Math.sin((.06+.91*t0)*Math.PI),.75);
      const wide1=.19*Math.pow(Math.sin((.06+.91*t1)*Math.PI),.75);
      const shade=k>=5?tip:k>=2?headLight:headBase;
      addTriangle(v(lean0-wide0,cy0),v(lean0+wide0,cy0),v(lean1-wide1,cy1),shade,shade,headLight);
      addTriangle(v(lean0+wide0,cy0),v(lean1+wide1,cy1),v(lean1-wide1,cy1),shade,headLight,headLight);
    }
    // Pale individual filaments branch off the feather head into the wind.
    for(let k=0;k<7;k++){
      const y=1.12+k*.105,wide=.20*(1-k/8),lean=.09*k/7;
      for(const sign of [-1,1]){
        addTriangle(v(lean+sign*.012,y),v(lean+sign*(wide+.19),y+.105),
          v(lean+sign*(wide+.09),y+.085),headBase,tip,headLight);
      }
    }
    // Long, fine leaf crossing at lower stalk.
    addTriangle(v(-.025,.26),v(.028,.31),v(.34,.83),stemColor,headBase,headLight);
  }
  stalkGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  stalkGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  stalkGeo.setIndex(indices);
  stalkGeo.computeVertexNormals();

  const liteGeo=new THREE.BufferGeometry(),lv=[],lc=[],li=[];
  for(let plane=0;plane<2;plane++){
    const a=plane*Math.PI/2,dx=Math.cos(a),dz=Math.sin(a),n=lv.length/3;
    // One pale tapering plume + stem per crossed plane for distant 3D silhouette.
    lv.push(-.014*dx,0,-.014*dz,.014*dx,0,.014*dz,0,1.37,0,
      -.15*dx,1.18,-.15*dz,.15*dx,1.18,.15*dz,
      -.13*dx,1.6,-.13*dz,.13*dx,1.6,.13*dz,0,1.88,0);
    for(const c of [stemColor,stemColor,headBase,headBase,headBase,headLight,headLight,tip])lc.push(...c);
    li.push(n,n+1,n+2,n+3,n+4,n+5,n+4,n+6,n+5,n+5,n+6,n+7);
  }
  liteGeo.setAttribute('position',new THREE.Float32BufferAttribute(lv,3));
  liteGeo.setAttribute('color',new THREE.Float32BufferAttribute(lc,3));
  liteGeo.setIndex(li);
  liteGeo.computeVertexNormals();

  const wind = {value:0};
  const material = new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.91,metalness:0});
  material.onBeforeCompile = shader => {
    shader.uniforms.uGoldenWind = wind;
    shader.vertexShader = shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uGoldenWind;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float bladeHeight = clamp(position.y / 1.95, 0.0, 1.0);
      float instancePhase = instanceMatrix[3].x * .19 + instanceMatrix[3].z * .16;
      float gust = sin(uGoldenWind * 1.05 + instancePhase) * .17
                 + sin(uGoldenWind * .53 + instancePhase * 2.0) * .13;
      transformed.x += gust * bladeHeight * bladeHeight;
      transformed.z += gust * .39 * bladeHeight;
      transformed.y -= abs(gust) * .08 * bladeHeight;`);
  };
  material.customProgramCacheKey=()=>'golden-golden-plumes-wind-v3';

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
      golden.setHSL(.095+random()*.033,.39+random()*.18,.62+random()*.18);
      mesh.setColorAt(i,golden);
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.frustumCulled=false;
    mesh.castShadow=false;mesh.receiveShadow=false;
    add(mesh);
  }
  plot(13000,0,45,0);plot(17000,45,115,1);plot(11000,115,196,2);


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
    dispose(){group.remove(...owned);stalkGeo.dispose();liteGeo.dispose();geo.dispose();soil.dispose();material.dispose();skyGeo.dispose();skyMat.dispose();sunTexture.dispose();sun.material.dispose();}
  };
  ctx.tick.push(t=>{wind.value=t;});
  return {bg:0xf5e4cf,fog:0xe0c6a5,fogNear:95,fogFar:250,
    hemi:[0xfff1d7,0xb08350,1.75],sun:[0xffe4b5,2.25],
    light:[0xffd8a0,1.05,135,[0,17,-46]],exposure:1.2};
}
