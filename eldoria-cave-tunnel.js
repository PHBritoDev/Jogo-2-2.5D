import {crystalPrismGeometry} from './eldoria-crystal-geometry.js';
/**
 * Eldória — Galeria dos Ecos.
 * Transição dramática: salão luminoso -> cristais azul-violeta -> escuridão.
 * A geometria do túnel é orgânica e tem abertura própria na abóbada principal.
 * Inspirada na referência do usuário 1000363697.jpg, sem copiar assets.
 */
export function buildEldoriaCaveTunnel(THREE,group,{lowSpec=false}={}){
  const rand=(i,s)=>{const a=Math.sin((i+1)*127.1+s*311.7)*43758.5453;return a-Math.floor(a)};
  const pos=[],idx=[],rings=lowSpec?18:27,sides=lowSpec?24:36;
  const start=35,end=111;
  for(let j=0;j<=rings;j++){
    const t=j/rings,z=start+t*(end-start);
    const narrow=1-.27*t+.025*Math.sin(t*19);
    for(let k=0;k<=sides;k++){
      const a=k/sides*Math.PI*2;
      const scallop=1+.045*Math.sin(a*7+t*24)+.036*Math.cos(a*13-t*17);
      const rx=13.6*narrow*scallop,ry=11.7*narrow*scallop;
      pos.push(Math.cos(a)*rx,12+Math.sin(a)*ry,z);
      if(j&&k){
        const n=j*(sides+1)+k;
        idx.push(n,n-1,n-sides-2,n,n-sides-2,n-sides-1);
      }
    }
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geom.setIndex(idx);geom.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({
    color:0x424858,emissive:0x0d1a2c,emissiveIntensity:.62,roughness:1,metalness:0,flatShading:true,
    side:THREE.DoubleSide
  });
  const shell=new THREE.Mesh(geom,material);
  shell.name='GaleriaDosEcosOrganicVault';group.add(shell);
  // O final não deve revelar o céu nem a paisagem fora do túnel.
  const endCap=new THREE.Mesh(new THREE.CircleGeometry(10.5,32),
    new THREE.MeshBasicMaterial({color:0x04060d,side:THREE.DoubleSide}));
  endCap.position.set(0,12,end-.1);group.add(endCap);
  const pebble=new THREE.DodecahedronGeometry(1,0);
  const darkStone=new THREE.MeshStandardMaterial({color:0x353c4a,roughness:1,flatShading:true});
  const dummy=new THREE.Object3D(),fragments=[];
  for(let i=0;i<(lowSpec?68:118);i++){
    const z=start+rand(i,1)*(end-start);
    const side=rand(i,2)>.5?1:-1;
    const x=side*(9.8+rand(i,3)*3.3);
    const sz=.6+rand(i,4)*2.2;
    fragments.push({x,y:1.5+sz*.3,z,scale:sz});
  }
  const stones=new THREE.InstancedMesh(pebble,darkStone,fragments.length);
  fragments.forEach((p,i)=>{
    dummy.position.set(p.x,p.y,p.z);
    dummy.rotation.set(rand(i,5),rand(i,6)*Math.PI*2,.14);
    dummy.scale.set(p.scale*.8,p.scale*.5,p.scale*1.5);dummy.updateMatrix();
    stones.setMatrixAt(i,dummy.matrix);
  });stones.instanceMatrix.needsUpdate=true;stones.computeBoundingSphere();group.add(stones);
  // Cristais, apenas ao longo dos dois lados: um corredor legível,
  // não um campo uniforme de picos atravessando a rota do jogador.
  const palette=[
    new THREE.MeshStandardMaterial({color:0x7095ff,emissive:0x2e3b8f,
      emissiveIntensity:1.2,roughness:.24,flatShading:true}),
    new THREE.MeshStandardMaterial({color:0x78d5f6,emissive:0x196c98,
      emissiveIntensity:1.15,roughness:.25,flatShading:true})
  ];
  const prism=crystalPrismGeometry(THREE,{seed:4,tip:.28}); // Mod 291: facetado, sem cone
  const clusters=[[],[]];
  const count=lowSpec?120:205;
  for(let i=0;i<count;i++){
    const z=41+rand(i,8)*61,side=i%2===0?1:-1;
    const taper=1-.27*((z-start)/(end-start));
    const x=side*(9.5+rand(i,9)*2.2)*taper;
    const h=3.2+rand(i,10)*8.5;
    clusters[i%2].push({x,y:1.3+h*.5,z,h,a:(rand(i,11)-.5)*.36});
  }
  clusters.forEach((data,kind)=>{
    const mesh=new THREE.InstancedMesh(prism,palette[kind],data.length);
    data.forEach((p,i)=>{
      dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.a,i*.77,p.a*.5);
      dummy.scale.set(.58+(i%3)*.35,p.h,.55+(i%4)*.23);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);
  });
  // Gotejamento mineral no teto, sem partículas piscantes ou ruído aleatório.
  const suspended=[];
  for(let i=0;i<35;i++){
    const z=44+i*1.8,x=(rand(i,13)-.5)*11;
    const h=.7+rand(i,14)*3.3;
    suspended.push({x,y:22.4-h*.46,z,h});
  }
  const hanging=new THREE.InstancedMesh(new THREE.ConeGeometry(.5,1,5),
    new THREE.MeshStandardMaterial({color:0x455465,roughness:1}),suspended.length);
  suspended.forEach((p,i)=>{
    dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(Math.PI,0,0);
    dummy.scale.set(.6+(i%3)*.15,p.h,.6);dummy.updateMatrix();
    hanging.setMatrixAt(i,dummy.matrix);
  });hanging.instanceMatrix.needsUpdate=true;hanging.computeBoundingSphere();group.add(hanging);
  // Uma fonte fria orienta a entrada; o fim permanece escuro.
  const beacon=new THREE.PointLight(0x8c9ce8,lowSpec?19:30,36,2);
  beacon.position.set(-6,10,48);beacon.castShadow=false;group.add(beacon);
  const midLight=new THREE.PointLight(0x7199e5,lowSpec?10:16,38,2);
  midLight.position.set(7,9,75);midLight.castShadow=false;group.add(midLight);
  const deepLight=new THREE.PointLight(0x568cbd,lowSpec?5:10,26,2);
  deepLight.position.set(-8,7,98);deepLight.castShadow=false;group.add(deepLight);
  return {length:end-start,crystals:count,rockFragments:fragments.length};
}
