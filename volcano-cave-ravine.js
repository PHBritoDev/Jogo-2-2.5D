// Basalt ribs run parallel to the tributaries. Each cross section turns
// inward above the tree line; the far fold leaves a lit cleft over the trail.
export function ravine(T,group){
 const pos=[],col=[];
 const palette=[0x272734,0x383442,0x464452,0x5a5868,0x6d7081];
 const color=new T.Color();
 function face(a,b,c,tone){
  for(const p of [a,b,c]){
   pos.push(...p);
   const factor=.73+.22*Math.sin(p[2]*.15+p[1]*.22)+.12*Math.cos(p[0]*.30);
   color.setHex(tone).multiplyScalar(factor);col.push(color.r,color.g,color.b);
  }
 }
 for(const side of [-1,1])for(let tier=0;tier<3;tier++){
  let last;
  for(let j=0;j<=42;j++){
   const z=87-j*4.8;
   const far=Math.max(0,Math.min(1,(-z-17)/54));
   const span=Math.max(46-36*far,49+tier*13-far*(31+tier*2)+8*Math.sin(j*.43+tier+side)+3*Math.cos(j*1.35));
   const summit=19+tier*12+5*Math.cos(j*.64+side*2)+4*Math.sin(j*.36+tier);
   const wall=[[side*(span+6),-12,z],[side*span,2+4*Math.sin(j*.34),z+2],
    [side*(span+3),summit*.47,z-1],[side*(span-4),summit*.72,z+1],
    [side*(span-6),summit,z],[side*(span+20),summit+7,z-2]];
   if(last)for(let k=1;k<wall.length;k++){
    const tone=palette[Math.min(4,k-1+tier)];
    face(last[k-1],wall[k-1],wall[k],tone);face(last[k-1],wall[k],last[k],tone);
   }
   last=wall;
  }
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
 geo.setAttribute('color',new T.Float32BufferAttribute(col,3));
 const shoulders=new T.Mesh(geo,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));
 shoulders.name='Garganta das veias';group.add(shoulders);
 // Directional skylight through the remote fissure, seen beyond the ridges.
 // This opaque background is drawn once behind the real forest geometry.
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{veil:{value:1},sky:{value:new T.Color()}},
  vertexShader:`varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 ray;uniform float veil;uniform vec3 sky;
  void main(){
   vec3 d=normalize(ray);float a=atan(d.x,-d.z);
   float edge=.16+.04*sin(a*8.)+.027*sin(a*19.+1.9)+.017*sin(a*48.);
   float opening=exp(-2.2*abs(a+.14))*(1.-smoothstep(edge,.83,d.y));
   float haze=opening*exp(-2.1*abs(d.y-.23));
   vec3 stone=mix(vec3(.11,.095,.13),vec3(.19,.19,.235),clamp(.5+d.y,0.,1.));
   gl_FragColor=vec4(mix(sky,stone+haze*vec3(.18,.23,.26),veil),1.);
  }`});
 const horizon=new T.Mesh(new T.SphereGeometry(1,32,16),material);
 horizon.position.set(0,8,28);horizon.scale.set(182,95,192);
 horizon.name='Luz da garganta';horizon.renderOrder=900;group.add(horizon);
 return (z,background)=>{
  const blend=Math.max(0,Math.min(1,(z-4)/12,(84-z)/12));
  material.uniforms.veil.value=blend;material.uniforms.sky.value.setHex(background).convertLinearToSRGB();
  horizon.visible=blend>0;shoulders.visible=z>0&&z<99;
 };
}
