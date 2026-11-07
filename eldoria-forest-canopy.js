/**
 * Árvores de apoio: silhueta irregular inspirada em canopy clustering e
 * contraste de luz/sombra de ambientes anime. Mantém uma mesh por material.
 * Os GLBs autorais continuam sendo as árvores protagonistas da cena.
 */
export function createEldoriaCanopy(THREE){
  const canopy=new THREE.IcosahedronGeometry(1,1);
  const positions=canopy.getAttribute('position');
  const colors=[];
  const bright=new THREE.Color(0xc1dd97),dark=new THREE.Color(0x587b46);
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const waviness=1+.125*Math.sin(x*7+z*3)+.07*Math.sin(z*9-y*4);
    const underside=y<0?.83:1.05;
    positions.setXYZ(i,x*waviness,Math.max(-.75,y*underside),z*waviness);
    const exposure=THREE.MathUtils.clamp(.42+y*.22+(x*.04-z*.07),.12,.86);
    const color=dark.clone().lerp(bright,exposure);
    colors.push(color.r,color.g,color.b);
  }
  positions.needsUpdate=true;
  canopy.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  canopy.computeVertexNormals();
  const trunk=new THREE.CylinderGeometry(.58,1.25,1,7,4);
  const trunkPositions=trunk.getAttribute('position');
  for(let i=0;i<trunkPositions.count;i++){
    const x=trunkPositions.getX(i),y=trunkPositions.getY(i),z=trunkPositions.getZ(i);
    const bending=.08*Math.sin((y+.5)*3.1)+.035*Math.sin(y*11);
    trunkPositions.setXYZ(i,x+bending,y,z+Math.cos(y*4)*.045);
  }
  trunkPositions.needsUpdate=true;trunk.computeVertexNormals();
  return {trunk,canopy};
}
