// A continuous folded shell travels from the back of the skull over the lip
// and down the throat. Coordinates are local to the existing combat arena.
export function createGreedAbyss(T, parent, radius) {
  const compact=globalThis.matchMedia?.('(pointer: coarse)')?.matches;
  const group = new T.Group(); parent.add(group);
  const tau = Math.PI * 2, sin = Math.sin, cos = Math.cos;
  let seed = 2098524055;
  const random = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const rockOptions={vertexColors:true,side:T.DoubleSide};
  const stone=compact?new T.MeshLambertMaterial(rockOptions)
    :new T.MeshStandardMaterial({...rockOptions,roughness:.76});
  // The relief image is sampled in object space so it crosses mesh seams.
  // A one-pixel neutral mineral keeps the geometry lit during decode or offline.
  const neutral=new T.DataTexture(new Uint8Array([92,92,92,255]),1,1);
  neutral.needsUpdate=true;
  const mineral={value:neutral};
  let closed=false;
  const reliefMap=new T.TextureLoader().load(new URL('./assets/ganancia/xisto-fossil.webp',import.meta.url).href,
    texture=>{if(!closed)mineral.value=texture;});
  reliefMap.wrapS=reliefMap.wrapT=T.RepeatWrapping;
  reliefMap.anisotropy=2;
  stone.onBeforeCompile=shader=>{
    shader.uniforms.mineral=mineral;
    shader.vertexShader='varying vec3 fossilP;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nfossilP=position;');
    shader.fragmentShader='uniform sampler2D mineral; varying vec3 fossilP;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=fossilP;
      vec2 strata=vec2(p.x+.51*p.z+.26*p.y,p.y+.78*p.z);
      float fissure=texture2D(mineral,strata*.046).r;
      float grain=texture2D(mineral,strata.yx*.137+vec2(.19,.47)).r;
      diffuseColor.rgb *= .065 + fissure*(1.7+1.8*grain) + .95*fissure*fissure;
    `).replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * .32;');
  };
  function surface(rows, cols, sample, owner=group, patches=1) {
    const xyz=[], colors=[], indices=[];
    for(let patch=0;patch<patches;patch++){
      for(let i=0;i<=rows;i++) for(let j=0;j<=cols;j++) {
        const [x,y,z,v,w=0]=sample(i/rows,j/cols,patch);
        const k=xyz.length/3;
        xyz.push(x,y,z); colors.push(v*(1+w),v,v*(1.03-w));
        if(i&&j)indices.push(k-cols-2,k-1,k,k-cols-2,k,k-cols-1);
      }
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
    geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,stone);owner.add(mesh);return mesh;
  }
  // The path is level inside the combat circle. A mineral seam winds
  // towards the witness on the distant ridge.
  surface(compact?28:58,compact?64:112,(u,v)=>{
    const a=v*tau,r=.01+u*(radius+26),x=r*cos(a),z=r*sin(a);
    const ridge=Math.exp(-Math.pow((x-4*sin(z*.115))/3.1,2));
    const grain=sin(x*3+cos(z*2))*sin(z*2.1+x*.9);
    const height=Math.max(0,r-radius)*(.12+.08*sin(a*7));
    return [x,height-.025,z,.010+.013*(grain+1)+ridge*(.13+.075*grain),Math.pow(Math.max(0,grain),8)*.32];
  });
  // Interlocking fractured schist catches the backlight along the route.
  // Within the combat disc these plates are flush, with no collision volume.
  const chamberSeed=seed;
  const plates=[],tints=[],faces=[];
  for(let i=0;i<215;i++){
    const z=-48+random()*76, axis=4*sin(z*.115);
    const shoulder=(random()-.5)*2, x=axis+shoulder*(3+random()*9);
    const outside=Math.max(0,Math.hypot(x,z)-radius);
    const floor=-.019+outside*(.12+.08*sin(7*Math.atan2(z,x)));
    const width=.35+random()**2*1.9, length=.5+random()**2*2.4;
    const angle=-.52+random()*.87,base=plates.length/3;
    const shade=.025+.05*random()+.105*(1-Math.abs(shoulder));
    plates.push(x,floor+.009+outside*.018,z);tints.push(shade,shade,shade*1.025);
    for(let k=0;k<7;k++){
      const a=(k+.22*random())/7*tau,sx=width*cos(a),sz=length*sin(a);
      plates.push(x+sx*cos(angle)-sz*sin(angle),floor+.002+random()*.013,
        z+sx*sin(angle)+sz*cos(angle));
      const lip=shade*(.38+.71*Math.max(0,-sin(a))+.2*random());
      tints.push(lip*1.035,lip,lip*.97);
      faces.push(base,base+1+(k+1)%7,base+1+k);
    }
  }
  seed=chamberSeed;
  const seams=new T.BufferGeometry();
  seams.setAttribute('position',new T.Float32BufferAttribute(plates,3));
  seams.setAttribute('color',new T.Float32BufferAttribute(tints,3));
  seams.setIndex(faces);seams.computeVertexNormals();group.add(new T.Mesh(seams,stone));
  // Overlapping rock shelves expose their broken undersides along the
  // flanks. The saddle between them leads to the figure on the horizon.
  surface(5,compact?18:26,(u,v,j)=>{
    const side=j%2?-1:1,layer=Math.floor(j/2);
    const z=-32-layer*2.4-11*v,near=9+2.6*layer;
    const serration=sin(v*23+j)+.48*sin(36*v-j*.7);
    const x=side*(near+12*v+1.45*serration+3*u);
    const y=.6+layer*.88+2*v+.35*serration;
    const bevel=1-Math.abs(u-.55)*1.6;
    return [x,y+bevel*.78-2.9*(1-u)**3,z+2*bevel,
      .021+.16*bevel**3*(.75+.25*sin(v*15+j))];
  },group,12);
  surface(compact?22:36,compact?84:128,(u,v)=>{
    const a=v*tau,r=76*(1-.97*u*u)+4*sin(15*a+4*u)+2*sin(33*a-u*11);
    const y=-3+84*u,fold=.5+.5*cos(38*a+3*sin(u*6+a*7));
    return [r*cos(a),y,r*sin(a)*(sin(a)<0?1.74:1),.023+.085*fold*fold+.014*sin(17*u+a*12)];
  });
  const skull=new T.Group();skull.position.set(17,23,-radius-17);skull.rotation.z=-.14;skull.scale.set(.86,1.18,1);group.add(skull);
  const profile=[[2.5,4,-82,33,-29],[15,20,-58,24,-25],[26,32,-38,13,-14],[24,29,-24,7,-7],[19,24,-10,4,-4],[15,21,-2,2,-2],[12,18,0,0,0],[10,16,-2,0,0],[8,14,-8,0,0],[5,9,-15,1,-2],[.08,.12,-28,2,-4]];
  function skullSurface(u,v){
    const k=u*(profile.length-1),idx=Math.min(profile.length-2,Math.floor(k)),t=k-idx,a=v*tau;
    const p=profile[idx].map((x,i)=>x+(profile[idx+1][i]-x)*t);
    const ribs=sin(a*19+2*sin(a*5+u*13)+u*10),plates=cos(u*63+sin(a*6)*3+cos(3*a-u*9));
    const skin=1+.032*ribs+.024*plates+.04*sin(3*a+u*7);
    const inside=Math.max(0,(u-.60)/.40);
    const shade=Math.exp(-inside*8);
    const enamel=.19*Math.exp(-((u-.604)**2)/.00027)*(.66+.34*cos(a+1));
    return [p[4]-10*(1-Math.min(1,u/.40))**2+p[0]*cos(a)*skin,p[3]+p[1]*sin(a)*skin,p[2]+1.3*cos(a*2),.0007+enamel+shade*(.063+.038*ribs+.036*plates+.050*(1+cos(a+1)))];
  }
  surface(compact?50:80,compact?80:112,skullSurface,skull);
  // Polished osseous lips: a broken rim on the outer crest and a second,
  // narrower fold just inside it. Both follow the asymmetry of the skull.
  surface(5,compact?112:168,(u,v,band)=>{
    const a=v*tau,k=(band?.627:.591)+(u-.5)*(.014+.004*cos(5*a));
    const [x,y,z]=skullSurface(k,v),crest=sin(Math.PI*u);
    const erosion=.5+.5*cos(49*a+3*sin(13*a));
    const lift=(.16+.24*erosion)*crest;
    return [x+lift*cos(a),y+lift*sin(a),z+.16*crest,
      .09+crest*(.25+.42*erosion)*(.75+.25*cos(a+.8))];
  },skull,2);
  // Carved ridges wrap from the lip into the temporal plates. Each ridge
  // fans out independently, with bare areas between neighbouring bundles.
  const ridges=[],ridgeColors=[],ridgeIndices=[];
  const ridgeSteps=compact?16:28;
  for(let rib=0;rib<39;rib++){
    const az=(rib+.31*sin(rib*2.1))/39,span=.22+.27*random();
    const base=ridges.length/3;
    for(let k=0;k<=ridgeSteps;k++){
      const t=k/ridgeSteps,u=.612-span*t;
      const curve=az+.018*sin(t*3+rib)+.028*t*t*cos(rib);
      const lift=sin(Math.PI*t)**.65;
      for(let j=0;j<5;j++){
        const v=curve+(j-2)*(.0004+.0015*lift);
        const [x,y,z]=skullSurface(u,v),angle=v*tau;
        const crest=1-Math.abs(j-2)*.5,offset=lift*(.06+crest*.51);
        ridges.push(x+cos(angle)*offset,y+sin(angle)*offset,z+.09*crest);
        const value=.018+crest*(.062+.13*Math.max(0,cos(angle+1)))*lift;
        ridgeColors.push(value,value,value*1.05);
        if(k&&j){const n=base+5*k+j;ridgeIndices.push(n-6,n-1,n,n-6,n,n-5);}
      }
    }
  }
  const relief=new T.BufferGeometry();
  relief.setAttribute('position',new T.Float32BufferAttribute(ridges,3));
  relief.setAttribute('color',new T.Float32BufferAttribute(ridgeColors,3));
  relief.setIndex(ridgeIndices);relief.computeVertexNormals();
  skull.add(new T.Mesh(relief,stone));

  // The zygomatic shelves sweep back into the roof. Their knife-edge folds
  // cast a silhouette above the throat from both side approaches.
  for(const side of [-1,1]){
    surface(compact?24:42,compact?14:24,(u,v)=>{
      const a=v*tau,flare=sin(Math.PI*u)**.67;
      const rib=1+.16*cos(5*a+u*17);
      const x=side*(10+13*sin(u*2.5))-23*u*u;
      const y=9+33*u+6*sin(u*2.8+side*.32);
      return [x+(2+5*flare)*cos(a)*rib,y+(2+6*flare)*sin(a)*rib,
        -3-50*u+flare*4*cos(a),.045+.095*Math.max(0,sin(a+.6))+.024*cos(u*42+a)];
    },skull);
  }
  // Strips of petrified fascia trail behind the lip down the outside of
  // the jaw. Their hooked ends are visible against the backlit passage.
  surface(compact?12:18,4,(u,v,j)=>{
    const left=j%2===0,angle=(left?Math.PI:0)+(.35-.10*Math.floor(j/2));
    const [x,y,z]=skullSurface(.53+.025*cos(j*3),angle/tau);
    const drop=6.5+6*(.5+.5*sin(j*4.21));
    const spread=(v-.5)*(1-u)**.68*(.65+1.7*sin(Math.PI*u));
    const strandBend=(left?-1:1)*(1.4*sin(u*3.7)-.92*u*u);
    return [x+strandBend+spread,y-drop*u,z+.9*sin(u*4+j)+.37*sin(v*Math.PI)*(1-u),
      .034+(.18+.11*sin(j))*(1-u*.6)*sin(v*Math.PI)**3];
  },skull,18);
  // A swept cervical arch leaves a pocket of negative space above the
  // throat. Its right-hand end enters the cranium behind the upper jaw.
  const neck=new T.CatmullRomCurve3([
    [-62,11,-65],[-46,31,-69],[-34,46,-74],[-12,54,-75],
    [10,55,-76],[23,49,-80],[24,40,-83]
  ].map(p=>new T.Vector3(...p)));
  const rings=compact?42:64,frames=neck.computeFrenetFrames(rings,false);
  const centers=Array.from({length:rings+1},(_,i)=>neck.getPointAt(i/rings));
  surface(rings,compact?32:48,(u,v)=>{
    const i=Math.round(rings*u),a=tau*v,c=centers[i],n=frames.normals[i],b=frames.binormals[i];
    const joint=.5+.5*cos(u*83+1.8*sin(a*2.3+u*7));
    const layer=.5+.5*cos(a*13+4*u+sin(u*13+a));
    const width=6.2+4.3*(1-u)+1.8*sin(u*7)+joint*.95+layer*.62;
    const x=width*cos(a),y=(width*1.20+sin(a*3+u*9))*sin(a);
    return [c.x+n.x*x+b.x*y,c.y+n.y*x+b.y*y,c.z+n.z*x+b.z*y,
      .036+.105*joint*layer+.058*Math.max(0,-sin(a+.4))];
  });
  // Thin torn sails descend from vaulted folds. Individual tears open
  // windows through to the farther wall instead of filling it with pillars.
  surface(compact?15:24,6,(u,v,j)=>{
    const side=j%2===0?-1:1,rank=Math.floor(j/2),a=.51+rank*.53;
    const baseX=side*(39+5*sin(a)),baseZ=-53+rank*19;
    const sag=sin(Math.PI*v)**.70,tear=.50+.50*cos(5*v+rank*2.1);
    const span=6+2*cos(rank),height=37+6*sin(a*3.8);
    const edge=height-(9+17*sag*tear);
    const x=baseX+side*(v-.5)*span+side*(7*u*u-4*u)+1.3*sin(v*9+u*4);
    return [x,edge+(height-edge)*u,baseZ+(v-.5)*13+4*u*u,
      .028+.10*(.5+.5*cos(15*v+u*2))**3+.08*(1-u)**6];
  },group,8);
  // A buttress splays into the bedrock at its feet and hooks into the vault.
  // Its oblique crests continue across the eye sockets.
  function rootSection(x,z,dx,dz,w,phase,u,a) {
    const hook=u*u, flare=1+1.8*Math.exp(-u*11);
    const fold=cos(3*a+3.4*u+phase)+.52*cos(7*a-5*u+sin(phase+u*7));
    const breadth=w*(.46+.65*(1-u))*flare*(1+.28*fold);
    return [x+dx*hook+6*sin(u*5+phase)*u+breadth*cos(a),
      z+dz*hook+3*sin(phase+u*7)*u+.65*breadth*sin(a),fold];
  }
  const cornea=new T.MeshStandardMaterial({vertexColors:true,roughness:.26,metalness:.08,side:T.DoubleSide});
  const watchers=[];
  for(let i=0;i<13;i++){
    const a=tau*i/13+.16+.12*sin(i*8),d=radius+15+random()*9,x=d*cos(a),z=d*sin(a);
    if(z < -24 && x > -10 && x < 32) continue;
    const dx=-x*.82,dy=45+random()*26,dz=-z*.70,w=2.6+random()*3.3;
    surface(compact?18:30,compact?16:22,(u,v)=>{
      const [rx,rz,fold]=rootSection(x,z,dx,dz,w,a,u,v*tau);
      const y=-3+dy*u, clearance=y<7?Math.max(1,(radius+3)/Math.hypot(rx,rz)):1;
      return [rx*clearance,y,rz*clearance,.035+.055*Math.max(0,fold)+.014*sin(u*15+v*8)];
    });
    if([2,6,8,9].includes(i)){
      const u=i===8?.47:.18, facing=Math.atan2(-z,-x);
      const [ex,ez]=rootSection(x,z,dx,dz,w,a,u,facing);
      const socket=new T.Group();socket.position.set(ex,-3+dy*u,ez);
      socket.rotation.y=Math.atan2(-x,-z);socket.rotateZ(.17*cos(i));group.add(socket);
      socket.scale.setScalar(i===8?Math.min(2.40,w*.63):Math.min(1.38,w*.41));
      socket.translateZ(socket.scale.x*.44);
      // Loft the outer eyelid back onto the same parametrized cross-section
      // as the host root, including its tilt, flutes and changing thickness.
      socket.updateMatrix();
      const intoSocket=socket.matrix.clone().invert(),attachment=new T.Vector3(),rootPhase=a;
      surface(compact?7:12,compact?28:48,(s,v)=>{
        const a=v*tau,c=cos(a),sn=sin(a),rootU=u+sn*socket.scale.x*2.7/dy;
        const outerAngle=facing-c*1.06+.10*sn;
        const [rx,rz]=rootSection(x,z,dx,dz,w,rootPhase,rootU,outerAngle);
        attachment.set(rx,-3+dy*rootU,rz).applyMatrix4(intoSocket);
        const easing=s*s*(3-2*s),rim=sin(Math.PI*s);
        const innerX=1.44*c,innerY=sn*(.60+.46*Math.abs(sn));
        return [innerX+(attachment.x-innerX)*easing,
          innerY+(attachment.y-innerY)*easing,
          -.06+attachment.z*easing+.22*rim*(.5+.5*cos(a*11+s*3))-.15*s**5,
          .035+.05*rim*(.5+.5*cos(a*11+s*3))+.039*Math.max(0,sn)*(1-s)];
      },socket);
      const lids=new T.Group();socket.add(lids);
      // A single domed globe under the brow carries the dark iris and its
      // off-axis silver reflection. There is no flat disc in front of it.
      const iris=surface(compact?12:20,compact?40:64,(s,v)=>{
        const ang=v*tau,rad=.001+s;
        const x=1.46*rad*cos(ang),y=rad*sin(ang)*(.62+.42*Math.abs(sin(ang)));
        const irisRadius=Math.hypot(x*.90,y);
        const fiber=.5+.5*sin(ang*31+sin(ang*7)*1.8);
        const highlight=.75*Math.exp(-130*((x+.23)**2+(y-.25)**2));
        const value=irisRadius<.42?.007:irisRadius<.74?.032+.072*fiber:.18-.085*s;
        return [x,y,.11+.70*Math.sqrt(Math.max(0,1-rad*rad)),value+highlight];
      },lids);
      iris.material=cornea;
      surface(compact?6:10,compact?32:48,(s,v)=>{
        const ang=v*tau,lip=sin(ang),r=1+s*(.31+.17*cos(ang)**2);
        const edge=lip*(.60+.46*Math.abs(lip));
        return [1.44*r*cos(ang),r*edge,
          .16-.96*s*s+.48*sin(Math.PI*s)+.19*lip,.046+.12*sin(Math.PI*s)*(.86+.49*lip)];
      },socket);
      watchers.push({socket,lids,iris});
    }
  }
  // Scimitar-like enamel shards taper along a bent axis; instances share a single mesh.
  const shard=surface(compact?3:6,compact?4:6,(u,v)=>{const a=tau*v,r=(1-u)*(.74+.26*cos(3*a));return [r*cos(a)+.36*u*u,u,r*sin(a),.07+.22*u+.045*cos(a)];});
  group.remove(shard);
  const teeth=new T.InstancedMesh(shard.geometry,stone,92);skull.add(teeth);
  const dummy=new T.Object3D(),up=new T.Vector3(0,1,0),dir=new T.Vector3();
  for(let i=0;i<92;i++){
    const a=tau*(i%46)/46+.025*random(),inner=i>=46?.85:1;
    dummy.position.set(12*cos(a)*inner,18*sin(a)*inner,1.3*cos(2*a)-(1-inner)*26);
    dummy.quaternion.setFromUnitVectors(up,dir.set(-.57*cos(a),-sin(a),-.41).normalize());
    dummy.scale.set(.17+random()*.4,1.5+random()*4+.8*Math.abs(sin(a)),.33);dummy.updateMatrix();teeth.setMatrixAt(i,dummy.matrix);
  }
  const spires=new T.InstancedMesh(shard.geometry,stone,170);group.add(spires);
  for(let i=0;i<170;i++){
    const a=Math.floor(i/7)*2.399+random()*.06,r=radius+4+random()*18;
    const px=r*cos(a),pz=r*sin(a);
    const silhouetteClearance=pz < -24 && Math.abs(px+4)<4;
    dummy.position.set(px+(silhouetteClearance?-7:0),.4,pz);dummy.rotation.set(.16*random(),a,.22*sin(a));dummy.scale.set(.3+random(),2+7*random(),.45+random());dummy.updateMatrix();spires.setMatrixAt(i,dummy.matrix);
  }
  // Tattered strands span the upper teeth, catching only narrow slivers of
  // light. All are drawn in one batch and stay outside the walkable disc.
  const strands=new T.InstancedMesh(shard.geometry,stone,42);skull.add(strands);
  for(let i=0;i<strands.count;i++){
    const a=random()*Math.PI, depth=random();
    dummy.position.set((11.7-depth)*cos(a),17.5*sin(a),-.5-depth*3);
    dir.set(-.07*cos(a),-1,.03*sin(a*7));dummy.quaternion.setFromUnitVectors(up,dir.normalize());
    dummy.scale.set(.05+random()*.12,1+random()**2*9,.09);
    dummy.updateMatrix();strands.setMatrixAt(i,dummy.matrix);
  }
  // Bent fangs are attached at the sampled lip. The narrow inner edge
  // catches a silver glint, while the shaft bends back into the throat.
  surface(compact?9:14,5,(u,v,j)=>{
    const a=(j+.30*sin(j*3.7))*tau/31;
    const [x,y,z]=skullSurface(.595,a/tau);
    const length=2.4+5.6*(.5+.5*sin(j*6.7+1))**2+2*Math.abs(sin(a));
    const r=(.23+.32*(.5+.5*cos(j*3)))*(1-u)**1.28;
    const bend=length*(.23*u+.37*u*u);
    return [x-cos(a)*bend+r*cos(tau*v),y-sin(a)*length*u+.27*sin(tau*v)*r,
      z+1.4*sin(Math.PI*u)-2.8*u*u+r*sin(tau*v),.10+.27*(1-u)*(.5+.5*cos(tau*v))+.16*u];
  },skull,31);
  const specks=new Float32Array(36*3);
  for(let i=0;i<specks.length;i+=3){
    specks[i]=(random()-.5)*58;specks[i+1]=2+random()*16;specks[i+2]=-random()*36;
  }
  const dustGeometry=new T.BufferGeometry();
  dustGeometry.setAttribute('position',new T.BufferAttribute(specks,3));
  const dust=new T.Points(dustGeometry,new T.PointsMaterial({color:0x797b81,size:.055,transparent:true,opacity:.38,depthWrite:false}));
  group.add(dust);
  // Mineral backlight and lone hooded witness, well outside the combat disc.
  const witness=new T.Group();witness.position.set(-4,1.1,-43);group.add(witness);
  surface(18,14,(u,v)=>{const a=v*tau,r=(u>.79?.17*sin(Math.PI*(u-.79)/.21):.13+.36*(1-u)**3);return[r*cos(a),3.1*u,r*sin(a),.004];},witness);
  const halo=new T.Sprite(new T.SpriteMaterial({transparent:true,depthWrite:false,fog:false,toneMapped:false,blending:T.AdditiveBlending}));
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),grad=c.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'rgba(240,242,247,.90)');grad.addColorStop(.12,'rgba(224,229,232,.59)');grad.addColorStop(.38,'rgba(193,199,204,.17)');grad.addColorStop(1,'rgba(175,183,190,0)');c.fillStyle=grad;c.fillRect(0,0,64,64);
  halo.material.map=new T.CanvasTexture(canvas);halo.position.set(-4,3.7,-46);halo.scale.set(11,11,1);group.add(halo);
  return {env:{bg:0x07080a,fog:0x101116,fogNear:41,fogFar:160,hemi:[0xc4c5cc,0x575250,.95],sun:[0xf4eff0,1.15],light:[0xdde5f4,9,95,[-8,17,-23]],exposure:1.15},
    update(t,dt,camera,options){
      skull.scale.y=1.18+.009*sin(t*.52);
      dust.position.set(.32*sin(t*.17),.18*sin(t*.24),0);
      const target=options?.player || camera?.position;
      watchers.forEach(({socket,lids,iris},i)=>{
        const phase=(t+i*3.4)%(13+i*2);
        lids.scale.y=1-.94*Math.max(0,1-Math.abs(phase-.22)/.22);
        if(target){
          const yaw=socket.rotation.y;
          const side=(target.x-socket.position.x)*cos(yaw)-(target.z-socket.position.z)*sin(yaw);
          iris.rotation.y=.16*Math.tanh(side/14);
        }
      });
    },
    dispose(){parent.remove(group);const geometries=new Set();group.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());dust.geometry.dispose();dust.material.dispose();closed=true;cornea.dispose();neutral.dispose();reliefMap.dispose();stone.dispose();halo.material.map.dispose();halo.material.dispose();}
  };
}
