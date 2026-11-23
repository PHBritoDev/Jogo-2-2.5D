// The physical front and the cylinder use the same arena-local XZ origin.
// The cap is particularly important near the wall, where the side of a
// cylinder can move beyond the walkable mask before the inside of it clears.
export function createUsuraBlast(T,cast,arenaUniforms){
 const uniforms={...arenaUniforms,hot:{value:0},strength:{value:0}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,
  vertexShader:`varying vec3 w;varying vec2 v;uniform float clock;
  void main(){vec3 p=position;v=uv;float a=atan(p.z,p.x);
   float fingers=sin(a*23.+v.y*3.)+.55*sin(a*47.-v.y*4.+clock);
   p.xz*=1.+.055*fingers*max(p.y+.5,0.);
   w=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
  fragmentShader:`uniform vec2 arenaCenter,source,normal;
   uniform float radius,edge,clock,hot,strength;varying vec3 w;varying vec2 v;
   void main(){vec2 local=w.xz-arenaCenter;
    if(length(local)>radius||dot(local,normal)>=edge)discard;
    vec2 q=local-source;float a=atan(q.y,q.x);
    float streak=.5+.5*sin(a*45.+.65*sin(a*11.+v.y*4.)-v.y*3.+clock*.8);
    float rib=pow(streak,5.);vec3 cold=mix(vec3(.145,.002,.79),vec3(.32,.023,1.),rib);
    vec3 ignition=mix(vec3(.83,.53,.98),vec3(1.,.87,1.),rib);
    gl_FragColor=vec4(mix(cold,ignition,hot),strength*(.86+.12*rib));}`});
 const column=new T.Mesh(new T.CylinderGeometry(1,1,1,96,5),material);
 column.name='Usura/Pilar';column.renderOrder=3;column.frustumCulled=false;cast.add(column);
 // A separate radial front can leave an irregular arena. The pillar that
 // feeds it stays above the blade, visible after the leading edge passes.
 const frontMaterial=material.clone();
 frontMaterial.uniforms={...arenaUniforms,hot:uniforms.hot,strength:{value:0}};
 const front=new T.Mesh(column.geometry,frontMaterial);front.name='Usura/Frente';front.renderOrder=2;front.frustumCulled=false;cast.add(front);
 // Tint transmitted light while retaining the silhouettes of arena and debris.
 const tint=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({transparent:true,
  depthTest:false,depthWrite:false,uniforms:{amount:{value:0}},
  vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:'uniform float amount;void main(){gl_FragColor=vec4(.145,.003,.76,amount*.52);}'
 }));
 tint.name='Usura/Luz ambiente';tint.frustumCulled=false;tint.renderOrder=90;cast.add(tint);
 return {update(s,arena){
  const blast=s.phase==='detonate',after=s.phase==='aftermath',p=s.progress;
  front.visible=blast;column.visible=tint.visible=blast||after;if(!column.visible)return;
  const fade=after?1-T.MathUtils.smoothstep(p,.62,1):1;
  const height=blast?7+62*T.MathUtils.smoothstep(p,0,.19):69-36*p*p;
  const pillarRadius=arena.radius*.44;
  const width=blast?Math.min(s.front,pillarRadius):pillarRadius*(1-.18*p);
  if(blast){front.scale.set(Math.max(.02,s.front),5+14*(1-p),Math.max(.02,s.front));
   front.position.y=front.scale.y*.5+.08;frontMaterial.uniforms.strength.value=.87*(1-p*p);
  }
  column.scale.set(Math.max(.02,width),height,Math.max(.02,width));
  column.position.y=height*.5+.06;
  uniforms.hot.value=blast?1-T.MathUtils.smoothstep(p,.18,.84):0;
  uniforms.strength.value=fade;
  tint.material.uniforms.amount.value=fade*(blast?T.MathUtils.smoothstep(p,.22,.94):1)*.87;
 },dispose(){front.removeFromParent();frontMaterial.dispose();for(const o of [column,tint]){o.removeFromParent();o.geometry.dispose();o.material.dispose()}}};
}
