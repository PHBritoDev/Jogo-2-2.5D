import {buildEldoriaCaveGeology} from './eldoria-cave-geology.js';
import {buildEldoriaCaveTunnel} from './eldoria-cave-tunnel.js';
/**
 * Eldória — caverna cristalina original do Ato 1.
 * Duas câmaras monumentais: santuário luminoso e abismo de silêncio.
 * Procedural e isolada da campanha. Sem inimigos ou NPCs.
 * Sombras: apenas a luz solar global projeta sombras; cristais usam emissão PBR.
 */
export function buildEldoriaCrystalCavern(THREE,scene,{lowSpec=false}={}){
  const group=new THREE.Group();group.name='EldoriaCrystalCavern';
  // Fora do terreno explorável da prévia para evitar sobreposição com o GLB da entrada.
  const ox=-80,oz=290;
  group.position.set(ox,0,oz);
  const stone=new THREE.MeshStandardMaterial({color:0x303b4c,roughness:.94,flatShading:true,side:THREE.DoubleSide});
  const wall=new THREE.MeshStandardMaterial({color:0x414859,roughness:.95,flatShading:true,side:THREE.DoubleSide});
  const floorMat=new THREE.MeshStandardMaterial({color:0x3c4c55,roughness:1,side:THREE.DoubleSide});
  const mineralMat=new THREE.MeshStandardMaterial({color:0x647b8f,roughness:.68,metalness:.08});
  const crystalMat=[
    new THREE.MeshStandardMaterial({color:0x62d8fa,roughness:.25,metalness:.08,emissive:0x0e98c0,emissiveIntensity:1.8,flatShading:true,side:THREE.DoubleSide}),
    new THREE.MeshStandardMaterial({color:0x8aa5ff,roughness:.27,metalness:.1,emissive:0x4863b6,emissiveIntensity:1.4,flatShading:true,side:THREE.DoubleSide}),
    new THREE.MeshStandardMaterial({color:0x96ead1,roughness:.3,metalness:.08,emissive:0x1a9986,emissiveIntensity:1.35,flatShading:true,side:THREE.DoubleSide})
  ];
  const rand=(i,s)=>{const x=Math.sin(i*127.1+s*311.7)*43758.5453;return x-Math.floor(x);};
  const chamberRadius=47, chamberHeight=47, length=112;
  // Grande salão orgânico, com teto de abóbada irregular e duas direções de exploração.
  const positions=[],indices=[],rings=20,columns=72;
  for(let j=0;j<=rings;j++){
    const t=j/rings,phi=t*Math.PI;
    for(let i=0;i<=columns;i++){
      const a=i/columns*2*Math.PI;
      const rag=1+.048*Math.sin(a*9+phi*5)+.038*Math.sin(a*17-phi*8);
      const radial=chamberRadius*Math.sin(phi)*rag;
      const x=Math.cos(a)*radial;
      const z=Math.sin(a)*radial;
      const y=5+chamberHeight*Math.cos(phi);
      // Top hemispherical vaulted ceiling; bottom hidden below floor.
      positions.push(x,y,z);
      if(j&&i){
        const v=j*(columns+1)+i;
        // Opening is cut from the vault so the crystal gallery truly connects.
        const door=Math.abs(a-Math.PI/2)<.30 && y>0 && y<28;
        if(!door)indices.push(v,v-1,v-columns-2,v,v-columns-2,v-columns-1);
      }
    }
  }
  const shell=new THREE.BufferGeometry();
  shell.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  shell.setIndex(indices);shell.computeVertexNormals();
  const dome=new THREE.Mesh(shell,wall);dome.name='CavernVault';group.add(dome);
  // Sala de entrada ampla com inclinação de piso; altar rochoso marcando o meio.
  const floor=new THREE.Mesh(new THREE.CircleGeometry(chamberRadius+1,80),floorMat);
  floor.rotation.x=-Math.PI/2;floor.position.y=1.2;floor.receiveShadow=true;group.add(floor);
  const stoneRing=new THREE.Mesh(new THREE.TorusGeometry(19,.52,7,64),mineralMat);
  stoneRing.rotation.x=Math.PI/2;stoneRing.position.y=1.4;group.add(stoneRing);
  const dais=new THREE.Mesh(new THREE.CylinderGeometry(7.8,9.5,2.4,15),stone);
  dais.position.set(0,2.4,0);dais.receiveShadow=true;group.add(dais);
  const brokenArc=new THREE.Mesh(new THREE.TorusGeometry(12,.48,8,44,Math.PI*1.35),mineralMat);
  brokenArc.position.set(0,10,-18);brokenArc.rotation.y=.22;group.add(brokenArc);
  // Região obscura em uma ala lateral que convida à exploração.
  const darkFloor=new THREE.Mesh(new THREE.CircleGeometry(19,44),stone);
  darkFloor.rotation.x=-Math.PI/2;darkFloor.position.set(-31,1.28,17);group.add(darkFloor);
  const pillars=[],spires=[],ceilings=[],tiny=[];
  const count=lowSpec?145:255, dummy=new THREE.Object3D();
  for(let i=0;i<count;i++){
    const angle=rand(i,1)*6.2831853,radius=7+Math.sqrt(rand(i,2))*(chamberRadius-12);
    const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    const height=(1.9+rand(i,3)*8)*(radius>32?1.4:1);
    const p={x,z,height,angle:rand(i,4)*6.28,type:i%3};
    if(i%11===0){ceilings.push(p);} else if(i%7===0){pillars.push(p);} else {spires.push(p);}
    if(i%5===0)tiny.push({...p,height:height*.23});
  }
  function instances(data,geometry,material,{fromCeiling=false,scale=1}={}){
    if(!data.length)return;
    const mesh=new THREE.InstancedMesh(geometry,material,data.length);
    for(let i=0;i<data.length;i++){
      const p=data[i],h=p.height*scale;
      dummy.position.set(p.x,fromCeiling?29+rand(i,88)*11-h/2:1.3+h/2,p.z);
      dummy.rotation.set((rand(i,44)-.5)*.25,p.angle,(rand(i,93)-.5)*.22);
      dummy.scale.set((.5+rand(i,22)*.7)*scale,h,(.58+rand(i,33)*.5)*scale);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
    mesh.receiveShadow=false;mesh.castShadow=false;group.add(mesh);
  }
  const crystalGeometry=new THREE.CylinderGeometry(0,1,1,5,1);
  for(let i=0;i<3;i++)instances(spires.filter(p=>p.type===i),crystalGeometry,crystalMat[i]);
  const stalagmiteGeo=new THREE.ConeGeometry(.9,1,6);
  instances(pillars,stalagmiteGeo,stone);
  const stalactiteGeo=new THREE.ConeGeometry(1,1,6);
  stalactiteGeo.rotateZ(Math.PI);
  instances(ceilings,stalactiteGeo,wall,{fromCeiling:true});
  // Dispersão de faíscas minerais no chão — 1 draw call.
  instances(tiny,new THREE.IcosahedronGeometry(.48,0),crystalMat[0],{scale:.6});
  // Água subterrânea bioluminescente em pequenas poças, sem custo de SSR.
  const poolMat=new THREE.MeshStandardMaterial({color:0x287f95,roughness:.18,metalness:.1,
    emissive:0x07586d,emissiveIntensity:.65,transparent:true,opacity:.86,depthWrite:false,side:THREE.DoubleSide});
  for(const [x,z,rx,rz] of [[17,19,15,8],[-22,-11,10,6],[27,-23,8,7]]){
    const g=new THREE.CircleGeometry(1,48),pool=new THREE.Mesh(g,poolMat);
    pool.rotation.x=-Math.PI/2;pool.scale.set(rx,rz,1);pool.position.set(x,1.35,z);group.add(pool);
  }
  const lightA=new THREE.PointLight(0x5fbff5,lowSpec?28:45,43,2);lightA.position.set(12,15,4);lightA.castShadow=false;group.add(lightA);
  const lightB=new THREE.PointLight(0x75f1c7,lowSpec?18:26,28,2);lightB.position.set(-19,8,-11);lightB.castShadow=false;group.add(lightB);
  const lightC=new THREE.PointLight(0x7180ed,lowSpec?10:17,29,2);lightC.position.set(28,12,-24);lightC.castShadow=false;group.add(lightC);
  // O coração mineral: ponto de reverência visível de qualquer entrada do salão.
  // Cada cristal inclina-se para fora, como pétalas petrificadas em torno de um núcleo.
  const core=new THREE.Group();core.name='CoracaoCristalino';
  const heroMaterial=new THREE.MeshStandardMaterial({
    color:0xc5f8ff,emissive:0x70dffe,emissiveIntensity:2.8,roughness:.15,
    metalness:.05,flatShading:true,side:THREE.DoubleSide
  });
  const heroGeometry=new THREE.CylinderGeometry(0,1,1,6,1);
  const central=new THREE.Mesh(heroGeometry,heroMaterial);
  central.scale.set(2.4,21,2.4);central.position.y=10.5;
  core.add(central);
  for(let i=0;i<9;i++){
    const a=i/9*Math.PI*2,height=8+(i%3)*3;
    const crystal=new THREE.Mesh(heroGeometry,crystalMat[i%3]);
    crystal.position.set(Math.cos(a)*3.3,height*.47,Math.sin(a)*3.3);
    crystal.scale.set(1.15,height,1.25);
    crystal.rotation.z=Math.cos(a)*.24;
    crystal.rotation.x=Math.sin(a)*.22;
    core.add(crystal);
  }
  core.position.set(0,3.65,0);group.add(core);
  // Veios minerais e pequenos fragmentos orientam a aproximação ao centro.
  const vein=new THREE.MeshStandardMaterial({
    color:0x4cc4ba,emissive:0x218d8d,emissiveIntensity:1.5,
    roughness:.55,side:THREE.DoubleSide
  });
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2,r=10+((i*7)%11),len=1.7+rand(i,312)*5;
    const path=new THREE.LineCurve3(new THREE.Vector3(Math.cos(a)*r,1.49,Math.sin(a)*r),
      new THREE.Vector3(Math.cos(a)*(r+len),1.49,Math.sin(a)*(r+len)));
    const strand=new THREE.Mesh(new THREE.TubeGeometry(path,1,.065,4,false),vein);
    strand.castShadow=false;group.add(strand);
  }
  // Brilho difuso em sprites aditivos, sem render target nem pós-processamento.
  const glowsize=64,pixels=new Uint8Array(glowsize*glowsize*4);
  for(let y=0;y<glowsize;y++)for(let x=0;x<glowsize;x++){
    const r=Math.hypot((x+0.5-glowsize/2)/(glowsize/2),(y+0.5-glowsize/2)/(glowsize/2));
    const alpha=Math.pow(Math.max(0,1-r),2.8);
    const i=(y*glowsize+x)*4;pixels[i]=167;pixels[i+1]=231;pixels[i+2]=255;pixels[i+3]=Math.round(alpha*225);
  }
  const glowTexture=new THREE.DataTexture(pixels,glowsize,glowsize,THREE.RGBAFormat);
  glowTexture.needsUpdate=true;
  const glowMaterial=new THREE.SpriteMaterial({map:glowTexture,color:0x95deff,transparent:true,
    opacity:lowSpec?.32:.46,blending:THREE.AdditiveBlending,depthWrite:false});
  for(const [x,y,z,size] of [[0,17,0,25],[0,9,0,17],[20,7,20,13],[-22,7,-11,12],
    [25,9,-22,14],[-30,6,12,7]]){
    const spr=new THREE.Sprite(glowMaterial);
    spr.position.set(x,y,z);spr.scale.set(size,size,1);group.add(spr);
  }
  // O setor obscuro é deliberadamente legível: farol violeta e obelisco rachado.
  const abyssMaterial=new THREE.MeshStandardMaterial({color:0x1a2032,roughness:.97,flatShading:true});
  const obelisk=new THREE.Mesh(new THREE.CylinderGeometry(.8,2.3,14,5),abyssMaterial);
  obelisk.position.set(-29,8,17);obelisk.rotation.z=.1;group.add(obelisk);
  const abyssLineMaterial=new THREE.MeshBasicMaterial({color:0x8569e8,transparent:true,opacity:.8});
  for(let i=0;i<5;i++){
    const a=i/5*Math.PI*2,x=-29+Math.cos(a)*2,z=17+Math.sin(a)*1.2;
    const fracture=new THREE.Mesh(new THREE.BoxGeometry(.12,4.5,.12),abyssLineMaterial);
    fracture.position.set(x,5.9,z);fracture.rotation.z=(i-2)*.13;group.add(fracture);
  }
  const abyssGlow=new THREE.Sprite(new THREE.SpriteMaterial({
    map:glowTexture,color:0x8b64de,transparent:true,opacity:.3,
    blending:THREE.AdditiveBlending,depthWrite:false
  }));
  abyssGlow.position.set(-29,9,17);abyssGlow.scale.set(16,16,1);group.add(abyssGlow);
  // Feixes de selenita cruzados: contraste de escala inspirado na geologia
  // real de Naica, sem copiar formato de um jogo ou espalhar cones genéricos.
  const longCrystalGeometry=new THREE.CylinderGeometry(.42,1,1,6,1);
  const longCrystalMaterial=lowSpec
    ? new THREE.MeshStandardMaterial({color:0x97d9eb,roughness:.24,metalness:.04,
       emissive:0x194d66,emissiveIntensity:.38,flatShading:true})
    : new THREE.MeshPhysicalMaterial({color:0xa2dfef,roughness:.2,metalness:.02,
       clearcoat:.72,clearcoatRoughness:.1,emissive:0x164c61,
       emissiveIntensity:.33,flatShading:true});
  const beams=12,beamMesh=new THREE.InstancedMesh(longCrystalGeometry,longCrystalMaterial,beams);
  beamMesh.name='SeleniteTransverseBeams';
  const vertical=new THREE.Vector3(0,1,0),begin=new THREE.Vector3(),
    finish=new THREE.Vector3(),axis=new THREE.Vector3(),middle=new THREE.Vector3();
  const beamHelper=new THREE.Object3D();
  for(let i=0;i<beams;i++){
    // Reserve o setor noroeste para a ala obscura e sua visão livre.
    const a=3.0+(i+.45)/beams*(Math.PI*2-1.15);
    const outside=39+rand(i,901)*5,inside=29+rand(i,902)*5;
    begin.set(Math.cos(a)*outside,1.5,Math.sin(a)*outside);
    finish.set(Math.cos(a+.11)*(inside),20+rand(i,903)*10,
      Math.sin(a+.11)*inside);
    axis.copy(finish).sub(begin);
    middle.copy(begin).add(finish).multiplyScalar(.5);
    beamHelper.position.copy(middle);
    beamHelper.quaternion.setFromUnitVectors(vertical,axis.clone().normalize());
    const width=.48+rand(i,904)*.64;
    beamHelper.scale.set(width,axis.length(),width*.83);beamHelper.updateMatrix();
    beamMesh.setMatrixAt(i,beamHelper.matrix);
    beamMesh.setColorAt(i,new THREE.Color(i%3===0?0x9fffe3:i%3===1?0xb8c6ff:0xe4faff));
  }
  beamMesh.instanceMatrix.needsUpdate=true;
  if(beamMesh.instanceColor)beamMesh.instanceColor.needsUpdate=true;
  beamMesh.computeBoundingSphere();group.add(beamMesh);
  const geology=buildEldoriaCaveGeology(THREE,group,{lowSpec});
  const tunnel=buildEldoriaCaveTunnel(THREE,group,{lowSpec});
  // História ambiental: uma antiga expedição tentou alcançar o coração mineral.
  // Vestígios convergem para a descoberta, mas terminam antes do obelisco sombrio.
  // Os objetos não são coletáveis e não antecipam o roteiro canônico.
  const relicBronze=new THREE.MeshStandardMaterial({color:0x77644e,roughness:.86,metalness:.18});
  const relicStone=new THREE.MeshStandardMaterial({color:0x4d6065,roughness:.97,flatShading:true});
  const relics=new THREE.Group();relics.name='VestigiosDaExpedicao';
  const route=[[2,31],[-1,25],[1,19],[-2,13],[0,7]];
  for(let i=0;i<route.length;i++){
    const [x,z]=route[i],base=1.55;
    const slab=new THREE.Mesh(new THREE.BoxGeometry(2.2,.14,1.5),relicStone);
    slab.position.set(x,base,z);slab.rotation.y=Math.sin(i*2.17)*.22;
    slab.rotation.z=(i%2?-.06:.05);relics.add(slab);
    if(i===1||i===3){
      const hoop=new THREE.Mesh(new THREE.TorusGeometry(.47,.07,6,16,Math.PI*1.75),relicBronze);
      hoop.rotation.x=-Math.PI/2;hoop.position.set(x+.8,base+.12,z+.2);relics.add(hoop);
    }
  }
  // Dois marcos assimétricos enquadram a revelação do coração cristalino.
  for(const [x,z,scale,angle] of [[-10,21,1,.14],[12,14,1.23,-.12]]){
    const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.8,3.6,7),relicStone);
    plinth.position.set(x,3.1,z);plinth.rotation.z=angle;
    plinth.scale.setScalar(scale);relics.add(plinth);
    const cap=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25,0),relicBronze);
    cap.position.set(x,5.2*scale,z);cap.scale.set(.9,.3,.9);relics.add(cap);
  }
  group.add(relics);
  // Poeira mineral em profundidade: partículas estáticas e discretas,
  // sem sprites grandes que lavem o contraste do cenário.
  const dustCount=lowSpec?105:230,dustPositions=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++){
    const a=rand(i,604)*Math.PI*2,r=5+Math.sqrt(rand(i,605))*37;
    dustPositions[i*3]=Math.cos(a)*r;
    dustPositions[i*3+1]=3+rand(i,606)*29;
    dustPositions[i*3+2]=Math.sin(a)*r;
  }
  const dustGeo=new THREE.BufferGeometry();
  dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  const dustMat=new THREE.PointsMaterial({color:0xa8d6de,size:lowSpec?.13:.19,
    sizeAttenuation:true,transparent:true,opacity:.45,depthWrite:false});
  const dust=new THREE.Points(dustGeo,dustMat);dust.name='PoeiraMineral';group.add(dust);
  group.visible=false;
  scene.add(group);
  return {group,center:[ox,8,oz],dark:[ox-26,7,oz+17],
    stats:{crystals:spires.length,stalactites:ceilings.length,stalagmites:pillars.length,seleniteBeams:beams,tunnel,geology},
    setVisible(visible){group.visible=!!visible;},dispose(){group.traverse(o=>{o.geometry?.dispose();});}};
}
