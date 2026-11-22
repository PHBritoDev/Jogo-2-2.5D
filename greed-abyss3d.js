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
  const hide=new T.MeshPhongMaterial({vertexColors:true,side:T.DoubleSide,
    specular:0x716f78,shininess:31});
  hide.onBeforeCompile=shader=>{
    stone.onBeforeCompile(shader);
    shader.fragmentShader=shader.fragmentShader.replace('#include <specularmap_fragment>',
      '#include <specularmap_fragment>\nspecularStrength *= .10 + smoothstep(.19,.68,fissure)*(.50+.40*grain);');
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
    const mesh=new T.Mesh(geo,owner.name==="ganancia-colosso"?hide:stone);owner.add(mesh);return mesh;
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
  // The buried tail, raised coil and projecting muzzle share a single spine.
  // Sweep back along the last bend to excavate the throat inside that same skin.
  const skull=new T.Group();
  skull.position.set(7,17,-radius-10);
  skull.name="ganancia-colosso";
  group.add(skull);
  const spine=new T.CatmullRomCurve3([
    [-40,-22,-32],[-38,-4,-19],[-40,12,-17],[-34,24,-13],
    [-19,30,-13],[-1,30,-17],[13,24,-19],[18,15,-18],
    [15,8,-12],[7,3,-8],[0,0,0]
  ].map(p=>new T.Vector3(...p)));
  const samples=192,frames=spine.computeFrenetFrames(samples,false);
  const centers=Array.from({length:samples+1},(_,i)=>spine.getPointAt(i/samples));
  const tangent=frames.tangents[samples];
  const horizontal=new T.Vector3(tangent.z,0,-tangent.x).normalize();
  const roll=Math.atan2(horizontal.dot(frames.binormals[samples]),horizontal.dot(frames.normals[samples]));
  const right=frames.normals.map((n,i)=>n.clone().multiplyScalar(cos(roll)).addScaledVector(frames.binormals[i],sin(roll)));
  const top=right.map((r,i)=>new T.Vector3().crossVectors(frames.tangents[i],r));
  function section(t,a,inset=0,relief=0){
    const i=Math.min(samples-1,Math.floor(t*samples)),f=t*samples-i;
    const muzzle=T.MathUtils.smoothstep(t,.73,.98);
    const ridge=.5+.5*cos(132*t+2.2*sin(3*a+6*t)+.9*sin(7*a-t*3));
    const tendon=.5+.5*cos(11*a+5*t+sin(5*a-4*t));
    const corrugation=(1.24*ridge+.68*tendon)*(1-.55*muzzle);
    const hinge=Math.exp(-((t-.90)**2)/.0028);
    const cheek=hinge*(1.4+.9*cos(a*2-.6))* (.72+.28*cos(a-.4));
    const width=7.3+2.8*sin(Math.PI*t)+1.5*(1-t)+corrugation+cheek;
    const height=width*(1.04+.61*muzzle);
    // Flatten the upper palate and lengthen the side walls toward the lips.
    const power=1-.30*muzzle,c=cos(a),s=sin(a);
    const x=(width*(1-inset)+relief)*Math.sign(c)*Math.abs(c)**power;
    const y=(height*(1-inset)+relief)*Math.sign(s)*Math.abs(s)**power;
    const lip=muzzle**4*(1.9*s+.42*cos(3*a+.45));
    const point=k=>centers[k].clone().addScaledVector(right[k],x)
      .addScaledVector(top[k],y).addScaledVector(frames.tangents[k],lip);
    const p=point(i).lerp(point(i+1),f);
    return [p.x,p.y,p.z,ridge,tendon];
  }
  surface(compact?104:152,compact?48:68,(u,v)=>{
    const a=tau*v,[x,y,z,rib,sinew]=section(u,a);
    const grazing=.50+.50*cos(a-1.16);
    return [x,y,z,.035+.33*(.22+.78*grazing)*(.28+.72*rib)*(.54+.46*sinew)];
  },skull);
  surface(compact?30:46,compact?48:68,(u,v)=>{
    const a=tau*v,t=1-.26*u;
    // The return wall narrows behind the tilted jaw. Offset each fold
    // along the spine so the throat reveals different ridges as the camera moves.
    const fold=.5+.5*cos(37*u+.9*sin(3*a+u*4));
    const inset=.13+.86*u**1.24+.027*fold*sin(Math.PI*u);
    const [x,y,z,rib]=section(t,a,inset);
    return [x,y,z,.003+.24*Math.exp(-4.4*u)*(.22+.78*fold**2)*(.57+.43*rib)];
  },skull);
  // Overlapping vertebral collars follow the turning axis. Their upper
  // edges catch the key light while the belly disappears into the vault.
  const collars=Array.from({length:39},()=>random());
  surface(4,compact?25:39,(u,v,j)=>{
    const a=tau*(v-.22)+.12*sin(j*1.3);
    const t=.041+(j+.45*(collars[j]-.5))*.024+(u-.5)*(.012+.009*collars[j])
      +.006*cos(a*2+j*.36)+.002*sin(5*a-j*.41);
    const crown=sin(Math.PI*u),wear=.55+.45*cos(7*a+2*collars[j]+j);
    const [x,y,z]=section(t,a,0,crown*(.38+.92*wear));
    return [x,y,z,.032+crown**2*(.11+.24*wear)*(.62+.38*sin(a))];
  },skull,collars.length);
  // Low, split cheek plates run lengthwise across the last vertebrae.
  // They flare over the hinge and converge onto the upper edge of the gape.
  surface(compact?18:28,5,(u,v,j)=>{
    const side=j%2===0?1:-1,fan=Math.floor(j/2);
    const a=(side>0?0:Math.PI)+side*(.12+.21*fan+.55*u*u);
    const t=.74+.255*u-.018*sin(Math.PI*u+fan*.5);
    const taper=sin(Math.PI*u)**.70;
    const [x,y,z]=section(t,a+(v-.5)*(.015+.19*taper),0,
      taper*(.13+.72*sin(Math.PI*v)));
    return [x,y,z,.052+.29*taper*sin(v*Math.PI)**3*(.55+.45*u)];
  },skull,10);
  surface(5,compact?96:132,(u,v)=>{
    const a=v*tau;
    const [x,y,z]=section(1-.007*(1-u),a,.135*u,.38*sin(Math.PI*u));
    return [x,y,z,.09+.32*sin(Math.PI*u)*(.74+.26*cos(31*a+sin(7*a)))];
  },skull);
  // A polished black nodule hangs in the gap under the arch. Its thin
  // mineral crescent and three divergent tethers read even in silhouette.
  const nodule={x:-12,y:38,z:-56,r:2.65};
  surface(compact?14:22,compact?22:32,(u,v)=>{
    const a=v*tau,lat=u*Math.PI,r=nodule.r*sin(lat);
    const rim=Math.exp(-((u-.81)**2)/.0018)*(.5+.5*cos(a+1.2));
    return [nodule.x+r*cos(a),nodule.y+nodule.r*cos(lat),nodule.z+r*sin(a),
      .005+.34*rim+.023*(1-u)**4];
  });
  surface(compact?12:18,4,(u,v,j)=>{
    const a=j*tau/3,bend=u*u*(j===0?7:4.3),w=.13+.41*u**3;
    return [nodule.x+cos(a)*(.65+bend)+w*cos(v*tau),
      nodule.y+2.3+u*(13+j*2),
      nodule.z+sin(a)*(.5+bend)-13*u+w*sin(v*tau),.032+.13*(.5+.5*cos(v*tau+a))];
  },group,3);
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
  // The upper jaw carries torn sheets with pointed cusps. The lower lip
  // carries shorter remnants; most of the mouth remains open to the bend.
  const dentin=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
  const bays=Array.from({length:46},()=>({width:random(),drop:random()}));
  // The counterpart of each cusp begins deeper inside the mouth.
  const innerBays=Array.from({length:46},()=>({width:random(),drop:random()}));
  function dentalCurtain(bayList,row){
    surface(compact?5:8,8,(u,v,j)=>{
      const bay=bayList[j],a=tau*(j+v)/bayList.length;
      const mid=(.5+bay.width*.32),arch=v<mid?v/mid:(1-v)/(1-mid);
      const cusp=1-Math.sqrt(Math.max(0,1-(1-arch)**2));
      const s=sin(a),depth=row?.976:1;
      const [x,y,z]=section(depth,a,row?.11:.029);
      const sign=s>-.34?-1:1,extra=s>.25?2.3:.6;
      const joint=v<mid?bay:bayList[(j+1)%bayList.length];
      const drop=.21+cusp*(.7+extra+joint.drop**2*4.3);
      const side=cos(a);
      return [x-side*.10*u*drop,y+sign*u*drop,z-.20*u*drop+.08*sin(Math.PI*u),
        .12+.40*(1-.65*u)*(.56+.44*cos(a-1))+.09*cusp];
    },skull,bayList.length).material=dentin;
  }
  dentalCurtain(bays,0);dentalCurtain(innerBays,1);
  const dummy=new T.Object3D();
  const spires=new T.InstancedMesh(shard.geometry,stone,170);group.add(spires);
  for(let i=0;i<170;i++){
    const a=Math.floor(i/7)*2.399+random()*.06,r=radius+4+random()*18;
    const px=r*cos(a),pz=r*sin(a);
    const silhouetteClearance=pz < -24 && Math.abs(px+4)<4;
    dummy.position.set(px+(silhouetteClearance?-7:0),.4,pz);dummy.rotation.set(.16*random(),a,.22*sin(a));dummy.scale.set(.3+random(),2+7*random(),.45+random());dummy.updateMatrix();spires.setMatrixAt(i,dummy.matrix);
  }
  // A few threads actually bridge upper and lower gums along the flanks.
  // Their endpoints lie on different sections, giving the opening parallax.
  const threads=Array.from({length:42},()=>[random(),random(),random(),random()]);
  surface(compact?9:15,4,(u,v,j)=>{
    const [az,depth,slack,weight]=threads[j*2],side=j%2?1:-1;
    const a=.28+az*.74;
    const upper=section(.99-.045*depth,side>0?a:Math.PI-a,.06);
    const attached=j%4===0;
    const lower=section(.992-.035*depth,side>0?-a:Math.PI+a,.07);
    const t=attached?u:u*(.14+.43*weight);
    const r=(attached?.082:.11)*(attached?1:1-u);
    return [upper[0]+(lower[0]-upper[0])*t+side*(.30+slack*.35)*sin(t*Math.PI)+r*cos(tau*v),
      upper[1]+(lower[1]-upper[1])*t,upper[2]+(lower[2]-upper[2])*t-.54*sin(t*Math.PI)+r*sin(tau*v),
      .13+.25*(.5+.5*cos(tau*v))];
  },skull,threads.length/2).material=dentin;
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
      skull.scale.y=1+.004*sin(t*.52);
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
    dispose(){parent.remove(group);const geometries=new Set();group.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());dust.geometry.dispose();dust.material.dispose();closed=true;dentin.dispose();cornea.dispose();neutral.dispose();reliefMap.dispose();hide.dispose();stone.dispose();halo.material.map.dispose();halo.material.dispose();}
  };
}
