/**
 * Eldória — acabamento ambiental isolado. Não interfere no runtime principal.
 * Determinístico, InstancedMesh para evitar centenas de draw calls em Android.
 * Direção: prado luminoso, margens úmidas, pedras musgosas e bosque orgânico.
 */
export function buildEldoriaDetails(THREE, scene, {height,streamDistance,rand,pondSdf=()=>Infinity,lowSpec=false}){
  const makeMaterial=(color,params={})=>new THREE.MeshStandardMaterial({color,roughness:1,...params});
  const dummy=new THREE.Object3D(), color=new THREE.Color();
  function instances(geometry,material,items){
    if(!items.length)return null;
    const mesh=new THREE.InstancedMesh(geometry,material,items.length);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow=false;mesh.receiveShadow=false;
    items.forEach((it,i)=>{
      dummy.position.set(it.x,it.y,it.z);
      dummy.rotation.set(it.pitch||0,it.rot||0,it.roll||0);
      dummy.scale.set(it.sx||1,it.sy||1,it.sz||1);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      color.setHex(it.tint||0xffffff);mesh.setColorAt(i,color);
    });
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingSphere();scene.add(mesh);
    return mesh;
  }
  const grass=[],rocks=[],flowers=[],reeds=[];
  const total=lowSpec?800:1950;
  // Evita construir vegetação sobre ruas da vila ou dentro da água.
  const roadDistance=(x,z)=>{
    const routes=[
      [[5,-115],[1,-94],[-3,-76],[3,-62],[6,-45],[10,-30],[6,-10]],
      [[-20,-46],[-8,-44],[7,-43],[24,-39],[32,-32]],
      [[6,-43],[22,-47],[46,-59],[66,-83]]
    ];
    let d=Infinity;
    for(const route of routes)for(let i=1;i<route.length;i++){
      const a=route[i-1],b=route[i],dx=b[0]-a[0],dz=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
      d=Math.min(d,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));
    }
    return d;
  };
  for(let i=0;i<total;i++){
    const x=(rand(i,28)-.5)*212,z=(rand(i,42)-.5)*214;
    const bank=streamDistance(x,z),village=Math.hypot(x-5,z+43),road=roadDistance(x,z);
    const y=height(x,z);
    if(bank<2.9 || road<2.5 || village<18 || pondSdf(x,z)<1.2)continue;
    const wet=bank<10;
    if(i%7===0 && bank>5 && road>5){
      const s=.22+rand(i,76)*.65;
      rocks.push({x,z,y:y+.09*s,rot:rand(i,56)*6.28,sx:s*1.4,sy:s*.48,sz:s,tint:wet?0x758a73:0x9ba58b});
    } else if(i%5===0){
      const s=.15+rand(i,59)*.28;
      flowers.push({x,z,y:y+.14,rot:rand(i,35)*6.28,sx:s,sy:s*.85,sz:s,tint:i%2?0xffe8ac:0xe0eaff});
    }else{
      const h=.25+rand(i,18)*.46;
      grass.push({x,z,y:y+h*.52,rot:rand(i,44)*6.28,sx:.24+rand(i,14)*.18,sy:h,sz:.2,tint:wet?0x54875b:rand(i,7)>.5?0x83a65b:0x70924b});
    }
    if(bank>=3&&bank<6&&i%2===0){
      reeds.push({x,z,y:y+.48,rot:rand(i,12)*6.28,sx:.16,sy:.9+rand(i,91)*.5,sz:.16,tint:0x749f69});
    }
  }
  instances(new THREE.ConeGeometry(.43,1,4),makeMaterial(0xffffff,{side:THREE.DoubleSide}),grass);
  instances(new THREE.DodecahedronGeometry(1,0),makeMaterial(0xffffff),rocks);
  instances(new THREE.IcosahedronGeometry(1,0),makeMaterial(0xffffff,{emissive:0x1c170b,emissiveIntensity:.08}),flowers);
  instances(new THREE.ConeGeometry(.6,1,5),makeMaterial(0xffffff,{side:THREE.DoubleSide}),reeds);
  // Pedras para delimitar visualmente as margens sem gerar colisores invisíveis.
  const bankStones=[];
  for(let x=-101;x<=105;x+=3.8){
    for(let z=-96;z<=90;z+=3.8){
      const d=streamDistance(x,z),salt=rand(x,z);
      if(d<3.6||d>6.6||salt<.77||pondSdf(x,z)<1.3)continue;
      const s=.45+salt*.45;
      bankStones.push({x:x+(salt-.5),z:z+(salt-.5),y:height(x,z)+.1,rot:salt*6.28,sx:s,sy:s*.34,sz:s*.73,tint:0x879486});
    }
  }
  instances(new THREE.IcosahedronGeometry(1,0),makeMaterial(0xffffff),bankStones);
  return {grass:grass.length,rocks:rocks.length+bankStones.length,flowers:flowers.length,reeds:reeds.length,drawCalls:5};
}
