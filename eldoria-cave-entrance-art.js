/**
 * Eldória: fachada de gruta com calcário, erosão e musgo.
 * A imagem de referência (1000363696.jpg) tem abertura escura irregular,
 * vegetação densa, penhasco claro e entrada que desaparece na floresta.
 * Complementa o GLB autoral, sem substituí-lo.
 */
export function buildEldoriaCaveEntranceArt(THREE,scene,{height,rand,lowSpec=false}){
  const group=new THREE.Group();group.name='EldoriaCaveEntranceArt';scene.add(group);
  const rock=new THREE.MeshStandardMaterial({color:0x76877b,roughness:1,flatShading:true});
  const limestone=new THREE.MeshStandardMaterial({color:0x9aa99a,roughness:.95,flatShading:true});
  const moss=new THREE.MeshStandardMaterial({color:0x3e6846,roughness:1,flatShading:true});
  const fern=new THREE.MeshStandardMaterial({color:0x548851,roughness:.98,side:THREE.DoubleSide});
  const dummy=new THREE.Object3D();
  function batch(geo,mat,placements){
    const mesh=new THREE.InstancedMesh(geo,mat,placements.length);
    placements.forEach((p,i)=>{
      dummy.position.set(p.x,p.y,p.z);
      dummy.rotation.set(p.rx||0,p.ry||0,p.rz||0);
      dummy.scale.set(p.sx||1,p.sy||1,p.sz||1);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    });mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
    mesh.castShadow=!lowSpec;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  // Arco escavado em silhueta de rochas, sem fechamento geométrico da passagem.
  const blocks=[],lichen=[],frontStones=[];
  const cx=-79,cz=70,ground=height(cx,cz);
  for(let i=0;i<=18;i++){
    const a=i/18*Math.PI;
    const x=cx+Math.cos(a)*11.4;
    const y=ground+7.1+Math.sin(a)*12.3;
    const z=cz+(rand(i,110)-.5)*2.2;
    const scale=2.0+rand(i,115)*1.8;
    blocks.push({x,y,z,ry:rand(i,112)*6.28,
      rz:(rand(i,113)-.5)*.2,sx:scale*1.3,sy:scale,sz:scale*.95});
    if(i%2===0)lichen.push({x:x+1.2,y:y+scale*.8,z:z+.45,
      ry:i*.7,sx:scale*.75,sy:scale*.33,sz:scale*.8});
  }
  for(const side of [-1,1])for(let j=0;j<5;j++){
    const x=cx+side*(10.8+rand(j,40)*1.6),z=cz+rand(j,44)*2;
    const y=ground+1+j*2.6;
    blocks.push({x,y,z,ry:j*.65,sx:3.2,sy:2.2,sz:2.7});
  }
  const rockGeo=new THREE.DodecahedronGeometry(1,1);
  batch(rockGeo,rock,blocks);
  batch(rockGeo,moss,lichen);
  // Trilho de pedra da chegada, pequenas lajes orientam o olhar até a boca.
  const pathSlabs=[];
  for(let i=0;i<13;i++){
    const z=35+i*2.25,stagger=Math.sin(i*1.18)*.63;
    const x=cx+stagger;
    pathSlabs.push({x,y:height(x,z)+.065,z,ry:i*.12,
      sx:2.1+rand(i,60)*1.2,sy:.14,sz:.8+rand(i,66)*.7});
  }
  batch(new THREE.BoxGeometry(1,1,1),limestone,pathSlabs);
  // Samambaias e raízes nos cantos — passagem central permanece limpa.
  const green=[],rootGeo=new THREE.ConeGeometry(.35,1,4);
  const n=lowSpec?100:180;
  for(let i=0;i<n;i++){
    const x=cx+(rand(i,72)-.5)*62,z=cz+(rand(i,74)-.5)*42;
    if(Math.abs(x-cx)<6&&z<cz+5&&z>cz-37)continue;
    const s=.5+rand(i,76)*1.3;
    green.push({x,y:height(x,z)+s*.36,z,
      ry:rand(i,78)*6.28,sx:s*.35,sy:s*1.2,sz:s*.35});
    if(i%6===0)frontStones.push({x,y:height(x,z)+s*.18,z,
      ry:rand(i,70)*6.28,sx:s*.65,sy:s*.31,sz:s});
  }
  batch(rootGeo,fern,green);
  if(frontStones.length)batch(new THREE.IcosahedronGeometry(1,0),limestone,frontStones);
  // Trepadeiras pendendo das bordas (linhas curvadas, nada de tubos retos).
  const vineMat=new THREE.MeshStandardMaterial({color:0x355c38,roughness:1});
  for(let i=0;i<9;i++){
    const side=i%2===0?-1:1,x=cx+side*(8.4+rand(i,87)*5.6);
    const y=ground+11+rand(i,86)*7,z=cz-1+rand(i,84)*2;
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(x,y,z),
      new THREE.Vector3(x+side*.6,y-1.9,z-1),
      new THREE.Vector3(x+side*1.6,y-4,z-.9),
      new THREE.Vector3(x+side*.8,y-6.8,z-1.5)
    ]);
    const strand=new THREE.Mesh(new THREE.TubeGeometry(curve,12,.11,5),vineMat);
    strand.castShadow=false;group.add(strand);
  }
  return {group,rockPieces:blocks.length,ferns:green.length,steppingStones:pathSlabs.length};
}
