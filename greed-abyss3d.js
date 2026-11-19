// A continuous folded shell travels from the back of the skull over the lip
// and down the throat. Coordinates are local to the existing combat arena.
export function createGreedAbyss(T, parent, radius) {
  const group = new T.Group(); parent.add(group);
  const tau = Math.PI * 2, sin = Math.sin, cos = Math.cos;
  let seed = 57239;
  const random = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const stone = new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.76});
  // Object-space mineral grain continues around curved lips and folded strata.
  stone.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 fossilP;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfossilP=position;');
    shader.fragmentShader = 'varying vec3 fossilP;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec3 p=fossilP;
      float folds=sin(p.y*5.1+p.z*.73+2.4*sin(p.x*.76+p.z*.39)+sin(p.y*.83));
      float shale=sin(2.6*p.x+p.y*1.3+3.*sin(p.z*.65));
      float veins=pow(max(0.,folds),8.);
      float chips=fract(sin(dot(floor(p*21.),vec3(17.13,79.17,39.37)))*23752.);
      diffuseColor.rgb *= .40+.45*chips+.35*shale*shale+.72*veins;
    `);
  };
  function surface(rows, cols, sample, owner=group) {
    const xyz=[], colors=[], indices=[];
    for(let i=0;i<=rows;i++) for(let j=0;j<=cols;j++) {
      const [x,y,z,v,w=0]=sample(i/rows,j/cols);
      xyz.push(x,y,z); colors.push(v*(1+w),v,v*(1.03-w));
      if(i&&j){const k=i*(cols+1)+j;indices.push(k-cols-2,k-1,k,k-cols-2,k,k-cols-1);}
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
    geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,stone);owner.add(mesh);return mesh;
  }
  // The path is level inside the combat circle. A mineral seam winds
  // towards the witness on the distant ridge.
  surface(58,112,(u,v)=>{
    const a=v*tau,r=.01+u*(radius+26),x=r*cos(a),z=r*sin(a);
    const ridge=Math.exp(-Math.pow((x-4*sin(z*.115))/3.1,2));
    const grain=sin(x*3+cos(z*2))*sin(z*2.1+x*.9);
    const height=Math.max(0,r-radius)*(.12+.08*sin(a*7));
    return [x,height-.025,z,.048+.035*(grain+1)+ridge*(.09+.055*grain),Math.pow(Math.max(0,grain),8)*.32];
  });
  surface(36,128,(u,v)=>{
    const a=v*tau,r=76*(1-.97*u*u)+4*sin(15*a+4*u)+2*sin(33*a-u*11);
    const y=-3+84*u,fold=.5+.5*cos(38*a+3*sin(u*6+a*7));
    return [r*cos(a),y,r*sin(a),.023+.085*fold*fold+.014*sin(17*u+a*12)];
  });
  const skull=new T.Group();skull.position.set(15,23,-radius-14);group.add(skull);
  const profile=[[2.5,4,-51,17,-22],[10,15,-44,21,-24],[19,24,-31,18,-24],[22,28,-18,12,-15],[19,24,-8,6,-7],[15,21,-2,2,-2],[12,18,0,0,0],[10,16,-2,0,0],[8,14,-8,0,0],[5,9,-15,1,-2],[.08,.12,-28,2,-4]];
  surface(80,112,(u,v)=>{
    const k=u*(profile.length-1),idx=Math.min(profile.length-2,Math.floor(k)),t=k-idx,a=v*tau;
    const p=profile[idx].map((x,i)=>x+(profile[idx+1][i]-x)*t);
    const ribs=sin(a*36+2*sin(a*5+u*13)+u*10),plates=cos(u*110+sin(a*6)*2);
    const skin=1+.032*ribs+.024*plates+.04*sin(3*a+u*7);
    const shade=u>.6?Math.pow(Math.max(0,(1-u)/.4),3):1;
    return [p[4]+p[0]*cos(a)*skin,p[3]+p[1]*sin(a)*skin,p[2]+1.3*cos(a*2),.002+shade*(.09+.042*ribs+.027*plates+.055*(1+cos(a+1)))];
  },skull);
  function tendon(x,y,z,dx,dy,dz,width,phase){
    return surface(36,14,(u,v)=>{
      const a=v*tau,flute=1+.19*cos(7*a+4*u+phase);
      const r=width*(.28+.72*Math.pow(1-u,.75))*flute;
      return [x+dx*u+4*sin(u*4+phase)*u+r*cos(a),y+dy*u,z+dz*u+r*sin(a),.044+.055*(1+cos(7*a+4*u+phase))];
    });
  }
  const watchers=[];
  for(let i=0;i<14;i++){
    const a=tau*i/14+.15,d=radius+11+random()*10,x=d*cos(a),z=d*sin(a);
    if(z < -24 && x > -10 && x < 32) continue; // Keep the distant jaw visible through the arch.
    const dx=-x*.35,dy=48+random()*23,dz=-z*.3,w=3+random()*3;
    tendon(x,-2,z,dx,dy,dz,w,a);
    if([2,5,8,10].includes(i)){
      const u=i===10?.64:.24,ex=x+dx*u+4*sin(u*4+a)*u,ez=z+dz*u;
      const socket=new T.Group();socket.position.set(ex,-2+dy*u,ez);socket.rotation.y=Math.atan2(-ex,-ez);group.add(socket);
      const size=i===10?3.1:1.35;socket.scale.setScalar(size);
      socket.translateZ(w*(.28+.72*Math.pow(1-u,.75))-.2);
      surface(16,44,(s,t)=>{const ang=t*tau,r=.002+s;const pupil=s<.29,iris=s<.6;
        return [2.1*r*cos(ang),r*sin(ang)*(.54+.46*Math.abs(sin(ang))),.65*(1-r*r),pupil?.006:iris?.14+.08*cos(ang*29):.39-.26*s];},socket);
      watchers.push(socket);
    }
  }
  // Scimitar-like enamel shards taper along a bent axis; instances share a single mesh.
  const shard=surface(6,6,(u,v)=>{const a=tau*v,r=(1-u)*(.74+.26*cos(3*a));return [r*cos(a)+.36*u*u,u,r*sin(a),.07+.22*u+.045*cos(a)];});
  group.remove(shard);
  const teeth=new T.InstancedMesh(shard.geometry,stone,92);skull.add(teeth);
  const dummy=new T.Object3D(),up=new T.Vector3(0,1,0),dir=new T.Vector3();
  for(let i=0;i<92;i++){
    const a=tau*(i%46)/46+.025*random(),inner=i>=46?.85:1;
    dummy.position.set(12*cos(a)*inner,18*sin(a)*inner,1.3*cos(2*a)-(1-inner)*26);
    dummy.quaternion.setFromUnitVectors(up,dir.set(-.35*cos(a),-sin(a),-.24).normalize());
    dummy.scale.set(.17+random()*.4,1.5+random()*4+.8*Math.abs(sin(a)),.33);dummy.updateMatrix();teeth.setMatrixAt(i,dummy.matrix);
  }
  const spires=new T.InstancedMesh(shard.geometry,stone,170);group.add(spires);
  for(let i=0;i<170;i++){
    const a=Math.floor(i/7)*2.399+random()*.06,r=radius+4+random()*18;
    dummy.position.set(r*cos(a),.4,r*sin(a));dummy.rotation.set(.16*random(),a,.22*sin(a));dummy.scale.set(.3+random(),2+7*random(),.45+random());dummy.updateMatrix();spires.setMatrixAt(i,dummy.matrix);
  }
  // Mineral backlight and lone hooded witness, well outside the combat disc.
  const witness=new T.Group();witness.position.set(-4,2.4,-43);group.add(witness);
  surface(18,14,(u,v)=>{const a=v*tau,r=(u>.79?.17*sin(Math.PI*(u-.79)/.21):.13+.36*(1-u)**3);return[r*cos(a),2.4*u,r*sin(a),.013];},witness);
  const halo=new T.Sprite(new T.SpriteMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),grad=c.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'#fff');grad.addColorStop(.18,'#7f8184');grad.addColorStop(1,'#000');c.fillStyle=grad;c.fillRect(0,0,64,64);
  halo.material.map=new T.CanvasTexture(canvas);halo.position.set(-4,4,-46);halo.scale.set(19,18,1);group.add(halo);
  return {env:{bg:0x07080a,fog:0x101116,fogNear:34,fogFar:145,hemi:[0xc4c5cc,0x575250,.95],sun:[0xf4eff0,1.15],light:[0xdde5f4,2.6,85,[-5,12,-18]],exposure:1.15},
    update(t){skull.scale.y=1+.007*sin(t*.52);watchers.forEach((o,i)=>{const phase=(t+i*3.4)%(9+i);o.scale.y=o.scale.x*(1-.95*Math.max(0,1-Math.abs(phase-.22)/.22));});},
    dispose(){parent.remove(group);const geometries=new Set();group.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());stone.dispose();halo.material.map.dispose();halo.material.dispose();}
  };
}
