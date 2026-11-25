import {atlas,seeded} from './sakura-grove3d.js';

// Local cloud ceiling; the game's sun, camera clipping planes and world clock
// keep control. A transparent horizon fades back to the exterior at both ends.
export function skyVeil(T){
 const u={clock:{value:0},snow:{value:0},bloom:{value:0},night:{value:0},opacity:{value:0},haze:{value:new T.Color()}};
 const mat=new T.ShaderMaterial({uniforms:u,side:T.BackSide,depthWrite:false,transparent:true,
 vertexShader:`varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.99998;}`,
 fragmentShader:`varying vec3 ray;uniform float clock,snow,bloom,night,opacity;uniform vec3 haze;
 float h(vec2 p){return fract(sin(dot(p,vec2(27.61,79.94)))*43758.54);}
 float n(vec2 p){vec2 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(a),h(a+vec2(1,0)),f.x),mix(h(a+vec2(0,1)),h(a+1.),f.x),f.y);}
 float clouds(vec2 p){return n(p)*.49+n(p*2.03+14.)*.27+n(p*4.1+20.)*.16+n(p*8.3)*.08;}
 void main(){vec3 d=normalize(ray);float up=max(.0,d.y);vec2 p=d.xz/(.19+up)*1.45+vec2(clock*.0015,clock*.0008);
 float v=clouds(p),light=clouds(p+vec2(.34,.18));vec3 zen=mix(vec3(.30,.45,.63),vec3(.12,.21,.33),snow);
 vec3 sky=mix(haze,zen,pow(up,.38));vec3 cloud=mix(vec3(.93,.73,.71),vec3(.53,.61,.70),snow);cloud*=.72+.4*light;
 sky=mix(sky,cloud,smoothstep(.34,.68,v)*(.53+.46*snow));
 vec3 sunward=normalize(vec3(-.54,.19,-.78));
 float rim=max(dot(d,sunward),0.);
 sky+=vec3(.32,.13,.072)*pow(rim,9.)*(.32+.64*bloom)*(1.-night)*(1.-smoothstep(.49,.72,v));
 sky*=1.-snow*.19*smoothstep(.36,.67,v);
 vec3 moon=normalize(vec3(42.,72.,95.));
 float disc=length(d-moon);sky+=vec3(.33,.15,.15)*exp(-disc*8.)*bloom*night;
 sky=mix(sky,vec3(1.,.84,.80)*(.83+.17*clouds(d.xz*85.)),(1.-smoothstep(.076,.081,disc))*bloom*night*(1.-smoothstep(.52,.7,v)));
 sky*=1.-night*.57;gl_FragColor=vec4(sky,opacity);
 #include <colorspace_fragment>
 }`});
 const mesh=new T.Mesh(new T.SphereGeometry(1,24,14),mat);mesh.renderOrder=-7;mesh.frustumCulled=false;
 return {mesh,update(camera,time,snow,bloom,night,w,haze){mesh.position.copy(camera.position);mesh.scale.setScalar(camera.far*.84);mesh.visible=w>.03;
  u.clock.value=time;u.snow.value=snow;u.bloom.value=bloom;u.night.value=night;u.opacity.value=w;u.haze.value.copy(haze);}};
}
export function underfoot(T){
 const make=(mode)=>{const t=atlas(T,256,(ctx,n)=>{const rand=seeded(447+mode),b=mode===0?'#a8a2a0':mode===1?'#dfc6c9':'#d1dbe3';
 ctx.fillStyle=b;ctx.fillRect(0,0,n,n);
 for(let i=0;i<170;i++){const x=rand()*n,y=rand()*n,r=6+rand()*28,g=ctx.createRadialGradient(x,y,1,x,y,r);
 const a=mode===0?'64,60,61':mode===1?(i%3?'108,91,97':'93,111,82'):'111,138,157';g.addColorStop(0,'rgba('+a+',.39)');g.addColorStop(1,'rgba('+a+',0)');
 ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);}
 for(let i=0;i<2600;i++){const x=rand()*n,y=rand()*n,s=rand(),a=rand()*6;ctx.save();ctx.translate(x,y);ctx.rotate(a);
  if(mode===1&&s>.30){ctx.fillStyle=['#f9c9d2','#e5a6bf','#c28ca6','#ffe1d7','#e5b7be'][i%5];ctx.beginPath();ctx.ellipse(0,0,1+rand()*2.35,.45+rand(),0,0,6.29);ctx.fill();}
  else if(mode===2){ctx.fillStyle=s>.56?'rgba(255,255,255,.59)':'rgba(84,116,145,.26)';ctx.fillRect(0,0,.45+rand()*2.9,.65);}
  else{ctx.fillStyle=s>.61?'rgba(232,212,207,.48)':'rgba(64,64,57,.44)';ctx.fillRect(0,0,1+rand()*2.3,.6+rand()*1.4);}
  ctx.restore();}
 });t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=2;return t;};
 const stone=make(0),petals=make(1),snow=make(2),m=new T.MeshLambertMaterial({map:stone,vertexColors:true,side:T.DoubleSide});
 m.onBeforeCompile=sh=>{
  sh.uniforms.petalFloor={value:petals};sh.uniforms.snowFloor={value:snow};
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 groundMix; varying vec3 vMix;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMix=groundMix;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D petalFloor,snowFloor; varying vec3 vMix;').replace('#include <map_fragment>',`
  vec4 base=texture2D(map,vMapUv);vec4 petals=texture2D(petalFloor,vMapUv*.59);vec4 snow=texture2D(snowFloor,vMapUv*.36);
  diffuseColor*=mix(mix(base,petals,vMix.x),snow,vMix.y);
  float shade=sin(vMapUv.x*.91+sin(vMapUv.y*2.3))*cos(vMapUv.y*.84+sin(vMapUv.x*1.6));
  float dapples=smoothstep(.32,.73,shade+.21*sin(vMapUv.x*4.3-vMapUv.y*2.7));
  diffuseColor.rgb*=1.-vMix.x*.25*smoothstep(-.4,.84,shade);
  diffuseColor.rgb+=vec3(.064,.030,.041)*dapples*vMix.x;diffuseColor.rgb+=vec3(.015,.012,.016)*vMix.z;`);
 };
 return m;
}
