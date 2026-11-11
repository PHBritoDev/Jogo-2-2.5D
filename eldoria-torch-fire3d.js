/**
 * Three village torches: GPU-only animated fire, no physics/postprocessing/shadows.
 * Two intersecting ribbons per torch (one draw call each) + one ember draw call total.
 * Existing point lights are reused and clamped by the game's lighting budget.
 */
export function createVillageTorchFire(THREE, parent, sites, lights, camera) {
  const group=new THREE.Group();group.name='TochasVentoFogoGPU';parent.add(group);
  const tickTime={value:0}, flames=[];
  // Cross-ribbon with more segments at the tips; each ribbon shares the same draw call.
  const pos=[],uv=[],index=[];
  for(let plane=0;plane<2;plane++){
    const angle=plane*Math.PI*.5,c=Math.cos(angle),s=Math.sin(angle),start=pos.length/3;
    for(let row=0;row<=10;row++){
      const v=row/10,w=.37*(1-.49*v);
      for(const side of [-1,1]){
        const x=side*w;
        pos.push(x*c,1.90+v*1.02,-x*s);
        uv.push(side===-1?0:1,v);
      }
      if(row<10){
        const i=start+row*2;
        index.push(i,i+1,i+2,i+1,i+3,i+2);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(index);geometry.computeBoundingSphere();
  const vertexShader=`uniform float uTime;
    uniform float uPhase;
    varying vec2 vUv;
    varying float vHeat;
    void main(){
      vUv=uv;
      float t=uTime+uPhase;
      float h=uv.y;
      float weather=sin(t*.70+uPhase*.41)*.5+.5;
      float lean=.08+.12*weather+.045*sin(t*1.12+uPhase);
      float swish=sin(t*2.36+h*3.3+uPhase)*.048+sin(t*3.8+h*7.2+uPhase*1.3)*.024;
      vec3 p=position;
      float flex=h*h*(3.0-2.0*h);
      // Flames deflect downwind; the base remains fixed inside the torch head.
      p.x+=(lean+swish)*flex;
      p.z+=(lean*.45+sin(t*1.5+h*4.0+uPhase)*.037)*flex;
      p.x+=sin(t*5.5+uPhase+h*5.0)*.013*h;
      p.y+=sin(t*3.1+uPhase+h*2.8)*.029*flex;
      vHeat=.88+.12*sin(t*4.0+uPhase);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
    }`;
  const fragmentShader=`uniform float uTime;
    uniform float uPhase;
    varying vec2 vUv;
    varying float vHeat;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
    }
    void main(){
      float t=uTime+uPhase,h=vUv.y;
      float n=noise(vec2(vUv.x*3.7+h*.8-t*.68,h*4.8-t*2.3));
      float n2=noise(vec2(vUv.x*7.0+t*.41,h*9.0-t*3.2));
      float tip=clamp(1.0-h,0.0,1.0);
      float width=mix(.41,.075,smoothstep(.22,1.0,h));
      float x=vUv.x-.5;
      float lick=.095*(n-.5)*h+.038*sin(t*2.6+h*10.0+uPhase)*h;
      float mask=1.0-smoothstep(width-.075,width+.036,abs(x-lick));
      float breakup=smoothstep(.16,.43,tip+.29*n2-.14*n);
      float alpha=mask*breakup*smoothstep(0.0,.10,h)*(.68+.26*n);
      if(alpha<.018)discard;
      float inner=1.0-smoothstep(.07,.22,abs(x-lick));
      vec3 ember=vec3(1.0,.18,.016),gold=vec3(1.0,.56,.055),hot=vec3(1.0,.94,.50);
      vec3 color=mix(ember,gold,clamp(tip*.95+.20*n,0.0,1.0));
      color=mix(color,hot,inner*tip*.86);
      // Tip becomes semi-transparent and darker, avoiding a solid orange triangle.
      color*=vHeat*(.84+.18*n2);
      gl_FragColor=vec4(color,alpha);
    }`;
  sites.forEach((p,i)=>{
    const material=new THREE.ShaderMaterial({uniforms:{uTime:tickTime,uPhase:{value:i*2.37+.4}},
      vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:true,
      side:THREE.DoubleSide,blending:THREE.NormalBlending});
    const flame=new THREE.Mesh(geometry,material);
    flame.name='ChamaFluidaTocha'+(i+1);flame.position.set(p.x,p.y||0,p.z);
    flame.frustumCulled=false;flame.renderOrder=4;
    group.add(flame);flames.push(flame);
  });
  // Shared GPU particle cloud: 8 embers per torch in ONE Points draw call.
  const embPos=[],embSite=[],embSeed=[];
  for(let i=0;i<sites.length;i++)for(let j=0;j<8;j++){
    embPos.push(sites[i].x,(sites[i].y||0)+1.98,sites[i].z);
    embSite.push(i);embSeed.push((j+.73)/8+i*.23);
  }
  const emberGeo=new THREE.BufferGeometry();
  emberGeo.setAttribute('position',new THREE.Float32BufferAttribute(embPos,3));
  emberGeo.setAttribute('aSeed',new THREE.Float32BufferAttribute(embSeed,1));
  const emberMat=new THREE.ShaderMaterial({
    uniforms:{uTime:tickTime},
    vertexShader:`uniform float uTime;attribute float aSeed;varying float vLife;
      void main(){
        float rate=.55+fract(aSeed*19.7)*.31;
        float life=fract(uTime*rate+aSeed*3.713);
        float phase=6.28318*aSeed;
        vec3 p=position;
        p.y+=life*(1.08+fract(aSeed*9.7)*.38);
        p.x+=life*(.23+.13*sin(uTime*.7+phase))+.13*sin(phase+life*9.0);
        p.z+=life*.12+.12*cos(phase+life*7.5);
        vec4 v=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*v;
        gl_PointSize=clamp(26.0/max(1.0,-v.z),1.0,5.5);
        vLife=life;
      }`,
    fragmentShader:`varying float vLife;
      void main(){
        float d=length(gl_PointCoord-.5);
        float a=(1.0-smoothstep(.12,.49,d))*smoothstep(0.0,.12,vLife)*(1.0-smoothstep(.57,1.0,vLife));
        if(a<.025)discard;
        gl_FragColor=vec4(mix(vec3(1.0,.65,.12),vec3(1.0,.20,.035),vLife),a*.8);
      }`,
    transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending
  });
  const embers=new THREE.Points(emberGeo,emberMat);
  embers.name='BrasasCompartilhadas';embers.frustumCulled=false;group.add(embers);
  const visibleDistSq=58*58;
  return {
    update(seconds,nightFactor){
      tickTime.value=seconds;
      let anyVisible=false;
      for(let i=0;i<flames.length;i++){
        const p=sites[i],dx=camera.position.x-p.x,dz=camera.position.z-p.z;
        const near=dx*dx+dz*dz<visibleDistSq;
        flames[i].visible=near;anyVisible=anyVisible||near;
        // A luz continua pertencendo ao ciclo dia/noite; apenas uma flutuação sutil.
        const flicker=.96+.065*Math.sin(seconds*7.1+i*2.1)+.027*Math.sin(seconds*12.7+i*3.6);
        if(lights[i])lights[i].intensity=(.35+(1.55-.35)*nightFactor)*flicker;
      }
      embers.visible=anyVisible;
    },
    dispose(){
      parent.remove(group);geometry.dispose();emberGeo.dispose();emberMat.dispose();
      for(const f of flames)f.material.dispose();
    }
  };
}
