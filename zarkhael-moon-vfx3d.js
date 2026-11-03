/**
 * Mod 273 — Lua Tenebrosa e rastros das Chamas Negras.
 * A imagem original do criador e usada sem alterar sua expressao, olhos ou dentes.
 * Somente VFX: colisao, dano e trajetoria de combate continuam nos sistemas originais.
 */
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => {x=clamp01(x);return x*x*(3-2*x);};

/** Puro: fade da lua inicia somente apos o disparo colossal. */
export function moonVisibility(t, finalLaunched, done=false, aborted=false){
  if(done||aborted||!Number.isFinite(t))return 0;
  const intro=smooth(t/1.45);
  const outro=finalLaunched<0?1:1-smooth((t-finalLaunched-1)/2.2);
  return .96*intro*outro;
}
/** Puro: a chama cresce enquanto VIAJA; nunca aparece gigante na mao. */
export function travelingGrowth(flightTime, big=false){
  return .12+.88*smooth(flightTime/(big?.55:.30));
}
const MOON_VERTEX='varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const MOON_FRAGMENT='uniform sampler2D portrait;uniform float opacity;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*vec2(1.03,.97);float edge=1.-smoothstep(.44,.54,length(p));vec3 c=texture2D(portrait,vUv).rgb;float a=opacity*edge;if(a<.015)discard;gl_FragColor=vec4(c,a);}';
const TRAIL_VERTEX='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const TRAIL_FRAGMENT='uniform float opacity;varying vec2 vUv;void main(){float along=pow(clamp(vUv.y,0.,1.),1.22), across=abs(vUv.x*2.-1.);float edge=smoothstep(.45,.96,across);float core=1.-smoothstep(0.,.52,across);vec3 c=mix(vec3(.018,.014,.028),vec3(.55,.53,.63),edge*.66);c=mix(c,vec3(.14,.10,.2),core*.25);float a=opacity*along*(1.-smoothstep(.88,1.,across)*.8)*(.25+.43*core);if(a<.015)discard;gl_FragColor=vec4(c,a);}';

/** Modulo visual sem dependencias alem da instancia THREE ja existente no jogo. */
export function createMoonCometVFX(T, parent, shotCount=11){
  const geometries=[], materials=[], N=15;
  const moonTexture=new T.TextureLoader().load(new URL('./zarkhael-moon-reference.webp',import.meta.url).href);
  moonTexture.colorSpace=T.SRGBColorSpace;
  const moonGeo=new T.PlaneGeometry(1,1);geometries.push(moonGeo);
  const moonUniforms={portrait:{value:moonTexture},opacity:{value:0}};
  const moonMaterial=new T.ShaderMaterial({vertexShader:MOON_VERTEX,fragmentShader:MOON_FRAGMENT,
    uniforms:moonUniforms,transparent:true,depthTest:true,depthWrite:false,side:T.DoubleSide,
    toneMapped:false,fog:false});
  materials.push(moonMaterial);
  const moon=new T.Mesh(moonGeo,moonMaterial);
  moon.name='LuaTenebrosaReferenciaDoCriador';moon.visible=false;
  moon.frustumCulled=false;moon.renderOrder=1;parent.add(moon);

  const trails=Array.from({length:shotCount},()=>{
    const vertices=new Float32Array(N*2*3),uv=[],indices=[];
    for(let i=0;i<N;i++){
      const v=i/(N-1);uv.push(0,v,1,v);
      if(i<N-1){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.BufferAttribute(vertices,3).setUsage(T.DynamicDrawUsage));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geometry.setIndex(indices);geometries.push(geometry);
    const uniforms={opacity:{value:0}};
    const material=new T.ShaderMaterial({vertexShader:TRAIL_VERTEX,fragmentShader:TRAIL_FRAGMENT,
      uniforms,transparent:true,depthTest:true,depthWrite:false,side:T.DoubleSide,
      toneMapped:false,fog:false});materials.push(material);
    const mesh=new T.Mesh(geometry,material);mesh.visible=false;mesh.frustumCulled=false;
    mesh.renderOrder=4;mesh.userData.opacity=uniforms.opacity;parent.add(mesh);
    return mesh;
  });
  const dir=new T.Vector3(),side=new T.Vector3(),toCam=new T.Vector3(),center=new T.Vector3();
  function renderTrail(mesh,s,camera){
    if(!s||s.state!=='fly'||s.path.length<2){mesh.visible=false;return;}
    const points=s.path, attr=mesh.geometry.attributes.position;
    for(let i=0;i<N;i++){
      const pos=i*(points.length-1)/(N-1), j=Math.floor(pos), f=pos-j;
      const a=points[j],b=points[Math.min(points.length-1,j+1)];
      center.set(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f);
      const p=points[Math.max(0,j-1)],n=points[Math.min(points.length-1,j+1)];
      dir.set(n[0]-p[0],n[1]-p[1],n[2]-p[2]).normalize();
      toCam.copy(camera.position).sub(center).normalize();
      side.crossVectors(dir,toCam).normalize();
      if(side.lengthSq()<.05)side.set(1,0,0);
      const width=(s.big?1.25:.43)*(.14+.86*i/(N-1));
      attr.setXYZ(i*2,center.x-side.x*width,center.y-side.y*width,center.z-side.z*width);
      attr.setXYZ(i*2+1,center.x+side.x*width,center.y+side.y*width,center.z+side.z*width);
    }
    attr.needsUpdate=true;
    mesh.visible=true;
    mesh.userData.opacity.value=(.25+.75*smooth(s.ft/.24))*Math.max(.2,
      Math.min(1,(s.big?9:5)/Math.max(1,s.path.length))+.5);
  }
  const api={
    moon,trails,
    update(seq,ctx){
      const st=seq?.st, H=ctx?.hero, boss=ctx?.boss;
      moon.visible=false;
      if(st&&boss&&H&&ctx.camera){
        const dx=boss.x-H.x,dz=boss.z-H.z,len=Math.max(1,Math.hypot(dx,dz));
        const ux=dx/len,uz=dz/len;
        // Enquadrada atras do bispo e acima da arena; nao cobre o heroi.
        moon.position.set(boss.x+ux*40-uz*7,boss.y+27,boss.z+uz*40+ux*7);
        moon.quaternion.copy(ctx.camera.quaternion); // rosto fixo, sem animar os olhos
        moon.scale.set(26,29,1);
        moonUniforms.opacity.value=moonVisibility(st.t,st.finalLaunched,st.done,st.aborted);
        moon.visible=moonUniforms.opacity.value>.018;
      }
      for(const m of trails)m.visible=false;
      if(!st||!ctx?.camera)return;
      for(const s of [...st.shots,st.final]){
        if(s&&Number.isInteger(s.i)&&s.i>=0&&s.i<trails.length)renderTrail(trails[s.i],s,ctx.camera);
      }
    },
    clear(){moon.visible=false;for(const m of trails)m.visible=false;},
    dispose(){api.clear();moonTexture.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
      parent.remove(moon);for(const m of trails)parent.remove(m);}
  };
  return api;
}
