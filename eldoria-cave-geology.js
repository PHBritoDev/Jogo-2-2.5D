/**
 * Identidade geológica da Gruta dos Ecos — Eldória.
 * Sedimentos inclinados, pilares de erosão e vestígios de uma antiga passagem.
 * Sem modelo proprietário e sem dependência de pós-processamento.
 */
export function buildEldoriaCaveGeology(THREE,group,{lowSpec=false}={}){
  const graphite=new THREE.MeshStandardMaterial({color:0x28313f,roughness:1,flatShading:true});
  const slate=new THREE.MeshStandardMaterial({color:0x536b7b,roughness:.93,flatShading:true});
  const strata=new THREE.MeshStandardMaterial({color:0x718b92,roughness:.92,flatShading:true});
  const antique=new THREE.MeshStandardMaterial({color:0x889192,roughness:.94,flatShading:true});
  const phosphor=new THREE.MeshStandardMaterial({
    color:0x74b9ba,emissive:0x216a74,emissiveIntensity:.75,roughness:.5,
    transparent:true,opacity:.84,depthWrite:false,side:THREE.DoubleSide
  });
  const rand=(n,s=0)=>{const r=Math.sin((n+1)*127.1+s*311.7)*43758.5453;return r-Math.floor(r);};
  const dummy=new THREE.Object3D();
  function instance(geo,mat,placements){
    if(!placements.length)return null;
    const mesh=new THREE.InstancedMesh(geo,mat,placements.length);
    placements.forEach((p,i)=>{
      dummy.position.set(p.x,p.y,p.z);
      dummy.rotation.set(p.rx||0,p.ry||0,p.rz||0);
      dummy.scale.set(p.sx||1,p.sy||1,p.sz||1);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
    mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);
    return mesh;
  }
  // Rochas portadoras estratificadas: concentração nas bordas,
  // preservando uma zona de leitura limpa ao redor do coração cristalino.
  const rockA=[],rockB=[],seams=[];
  const count=lowSpec?105:205;
  for(let i=0;i<count;i++){
    const a=rand(i,11)*Math.PI*2;
    const r=27+rand(i,13)*18;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const h=1.3+rand(i,17)*6.6;
    const p={x,y:1.2+h*.33,z,rx:(rand(i,29)-.5)*.34,
      ry:rand(i,19)*6.28,rz:(rand(i,23)-.5)*.4,
      sx:1.4+rand(i,31)*3.8,sy:h*.38,sz:1.3+rand(i,37)*3.1};
    (i%4===0?rockB:rockA).push(p);
    if(i%7===0)seams.push({...p,y:1.3+h*.55,sy:.045,sx:p.sx*1.04,sz:p.sz*1.04});
  }
  const boulder=new THREE.DodecahedronGeometry(1,0);
  instance(boulder,graphite,rockA);
  instance(boulder,slate,rockB);
  instance(boulder,strata,seams);
  // Faixa sedimentar quebrada: duas costelas antigas na abóbada.
  const ribs=[],walls=[];
  const ribsCount=lowSpec?16:26;
  for(let i=0;i<ribsCount;i++){
    const a=(i+.25)/ribsCount*Math.PI*2;
    const x=Math.cos(a)*39,z=Math.sin(a)*39;
    const h=9+rand(i,79)*12;
    ribs.push({x,y:16+rand(i,63)*6,z,ry:-a,rz:.12,
      sx:2.6,sy:h*.56,sz:1.9});
    if(i%3===0)walls.push({x:x*.92,y:4.3,z:z*.92,ry:a,
      sx:4.1,sy:5.9,sz:2.2});
  }
  instance(new THREE.CylinderGeometry(.48,1,1,7),slate,ribs);
  instance(new THREE.IcosahedronGeometry(1,0),graphite,walls);
  // Ruínas que funcionam como vestígio da presença humana: uma trilha
  // de lajes quebradas direciona a vista para o salão principal.
  const steps=[],fragments=[];
  for(let i=0;i<17;i++){
    const x=Math.sin(i*.43)*1.9,z=32-i*2.1;
    if(i===9||i===10)continue; // passagem colapsada
    steps.push({x,y:1.43,z,ry:Math.sin(i*.67)*.09,rz:(rand(i,50)-.5)*.06,
      sx:6.1-(i%3)*.65,sy:.18,sz:1.35+rand(i,39)*.75});
    if(i%4===0)fragments.push({x:x+3.5,y:1.6,z:z+.7,ry:i*.43,rz:.14,
      sx:1.3,sy:.33,sz:1.2});
  }
  instance(new THREE.BoxGeometry(1,1,1),antique,steps);
  instance(new THREE.DodecahedronGeometry(1,0),graphite,fragments);
  // Pequeno curso mineral no teto; linhas paralelas irregulares sugerem
  // infiltração antiga, mas não formam um círculo mágico ou VFX genérico.
  const veins=[];
  for(let i=0;i<11;i++){
    const a=.2+i*.31;
    const pts=[];
    for(let k=0;k<8;k++){
      const t=k/7,x=14+Math.cos(a)*t*16,z=6+Math.sin(a)*t*15;
      pts.push(new THREE.Vector3(x,20+Math.sin(t*Math.PI)*6+rand(i,k)*.45,z));
    }
    const curve=new THREE.CatmullRomCurve3(pts);
    const line=new THREE.Mesh(new THREE.TubeGeometry(curve,18,.055+(i%3)*.025,4,false),phosphor);
    line.castShadow=false;group.add(line);veins.push(line);
  }
  // Lajes muito antigas numa única direção, para sugerir história em vez
  // de espalhar adereços de maneira aleatória.
  const cairns=[];
  for(const [x,z,ry] of [[-14,12,.2],[-13,13,-.25],[-15,14,.5],
    [23,-8,.18],[24,-7,.4],[-29,17,-.1]]){
    cairns.push({x,y:2.3,z,ry,sx:1.3,sy:1.6,sz:1.1});
  }
  instance(new THREE.CylinderGeometry(.75,1,1,6),antique,cairns);
  return {stratifiedRocks:rockA.length+rockB.length,veinLines:veins.length,
    approachStones:steps.length,erosionRibs:ribs.length};
}
