/** Cinematic fire and lava: procedural GPU shaders and instanced flames. */
import * as THREE from 'three';
const vertex='varying vec2 vUv;void main(){vUv=uv;vec4 p=vec4(position,1.);\n#ifdef USE_INSTANCING\np=instanceMatrix*p;\n#endif\ngl_Position=projectionMatrix*modelViewMatrix*p;}';
const fireShader="uniform float uTime;varying vec2 vUv;\nfloat h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\nreturn mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}\nfloat fbm(vec2 p){float a=.5,v=0.;for(int i=0;i<3;i++){v+=a*n(p);p*=2.07;a*=.52;}return v;}\nvoid main(){\nvec2 uv=vUv;float y=uv.y;\nfloat warp=fbm(uv*vec2(3.4,2.1)-vec2(0.,uTime*.42));\nfloat wave=sin(y*11.7+uTime*2.1+warp*8.)*.11;\nfloat width=mix(.32,.035,y)*(1.+warp*.4);\nfloat dist=abs(uv.x-.5+wave);\nfloat core=1.-smoothstep(width*.28,width*.73,dist);\nfloat edge=1.-smoothstep(width*.62,width*1.33,dist);\nfloat alpha=pow(1.-y,.61)*edge*(.78+.21*sin(uTime*2.4+uv.x*12.+warp*5.));\nalpha*=smoothstep(0.,.16,y);\nvec3 dark=vec3(.34,.035,.014),orange=vec3(1.9,.29,.033),yellow=vec3(2.7,1.05,.20);\nvec3 col=mix(dark,orange,clamp(y*.32+warp*.38+.22,0.,1.));\ncol=mix(col,yellow,core*.73*(1.-y*.68));\ngl_FragColor=vec4(col,min(.95,alpha*1.28));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}";
const heatShader="uniform float uTime;varying vec2 vUv;\nvoid main(){\nvec2 u=vUv;\nfloat ripple=sin(u.x*53.+uTime*1.7+sin(u.y*13.+uTime)*.7);\nfloat crack=pow(max(0.,sin(u.x*48.+sin(u.y*8.)*4.+uTime*.12)),24.);\nfloat lava=max(crack*.46,ripple*.06);\nfloat h=pow(1.-u.y,1.7);\nvec3 col=mix(vec3(.036,.014,.02),vec3(.68,.083,.021),lava*h);\ngl_FragColor=vec4(col,(.12+lava*.48)*h);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}";
export function addLivingInferno(parent,W,H){
 const material=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0}},vertexShader:vertex,fragmentShader:fireShader,
  transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending
 });
 const positions=[[-.485,-.397,.031,.205],[-.39,-.43,.019,.12],[-.29,-.48,.027,.13],
  [-.18,-.47,.013,.095],[-.04,-.49,.024,.15],[.08,-.47,.019,.1],
  [.2,-.44,.02,.15],[.32,-.48,.019,.13],[.44,-.407,.032,.215],[.495,-.47,.025,.14]];
 const flames=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,positions.length);
 const d=new THREE.Object3D();positions.forEach(([x,y,w,h],i)=>{
  d.position.set(x*W,y*H,-122-i*.23);d.scale.set(w*W,h*H,1);
  d.rotation.set(0,0,i%2?.07:-.07);d.updateMatrix();flames.setMatrixAt(i,d.matrix);
 });
 flames.instanceMatrix.needsUpdate=true;parent.add(flames);
 const groundMaterial=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0}},vertexShader:vertex,fragmentShader:heatShader,
  transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending
 });
 const heatedGround=new THREE.Mesh(new THREE.PlaneGeometry(W,H*.12),groundMaterial);
 heatedGround.position.set(0,-H*.445,-175);parent.add(heatedGround);
 return {update(t){material.uniforms.uTime.value=t;groundMaterial.uniforms.uTime.value=t;}};
}
