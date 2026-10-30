/** Original world-space sword ribbons and eroded, volumetric cutting waves.
 * Bounded pools: 3 ribbons, 16 cuts, 192 instanced shards, 3 hero echoes.
 */
export function createSwordRitesVFX(T,scene){
 const root=new T.Group();root.name='SwordRites231';scene.add(root);
 const palettes={prota:[0xffc24f,0xfff7da,0x5b260b,0xffe6ac],aurora:[0xff163a,0xffe9ec,0x100618,0xa52dff]};
 const vertex=`attribute float birth; varying vec2 vUv; varying float vAge; uniform float clock; void main(){vUv=uv;vAge=max(0.,clock-birth);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
 const fragment=`precision highp float; varying vec2 vUv; varying float vAge; uniform vec3 ink,core,dark,filament;uniform float opacity,life,clock,glow;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){float x=vUv.x,y=vUv.y;float age=clamp(vAge/life,0.,1.);float brush=noise(vec2(x*72.-clock*7.,y*10.));float rip=noise(vec2(x*180.,y*28.));float edge=.028+.13*brush+.045*sin(x*121.);float mask=smoothstep(edge,edge+.05,y)*(1.-smoothstep(.96,1.,y));mask*=1.-smoothstep(.45+brush*.22,1.,age);float spine=exp(-pow((y-.79-brush*.018)*25.,2.));float secondary=exp(-pow((y-.51-.07*sin(x*31.))*68.,2.));float spark=step(.96,rip)*step(.4,y);vec3 col=mix(dark,ink,smoothstep(.26,.75,y));col=mix(col,core,spine);float bolt=exp(-pow((y-.34-.055*sin(x*63.)-.027*sin(x*151.))*90.,2.))*step(.45,sin(x*21.));col+=filament*(secondary*.9+spark*.25+bolt*1.7);if(glow>.5){col=ink*1.5+core*spine;mask*=.27*pow(y,2.);}float alpha=mask*opacity*(1.-age);if(alpha<.012)discard;gl_FragColor=vec4(col,alpha);}`;
 let time=0,quality='high',cutCursor=0,particleCursor=0,ghostCursor=0,trailSerial=-1,trailCursor=0;
 const makeMaterial=(sword='prota',glow=0)=>{const p=palettes[sword];return new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{clock:{value:0},ink:{value:new T.Color(p[0])},core:{value:new T.Color(p[1])},dark:{value:new T.Color(p[2])},filament:{value:new T.Color(p[3])},opacity:{value:1},life:{value:.3},glow:{value:glow}},side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,blending:glow?T.AdditiveBlending:T.NormalBlending});};
 const tint=(m,s)=>{const p=palettes[s];['ink','core','dark','filament'].forEach((k,i)=>m.uniforms[k].value.setHex(p[i]));};
 const segments=64;
 function ribbon(){const geometry=new T.BufferGeometry(),positions=new Float32Array(segments*2*3),uv=new Float32Array(segments*4),birth=new Float32Array(segments*2),indices=[];for(let i=0;i<segments;i++){uv[i*4]=uv[i*4+2]=i/(segments-1);uv[i*4+1]=0;uv[i*4+3]=1;if(i<segments-1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setAttribute('birth',new T.BufferAttribute(birth,1).setUsage(T.DynamicDrawUsage));geometry.setIndex(indices);geometry.setDrawRange(0,0);const material=makeMaterial(),mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;root.add(mesh);return{geometry,positions,birth,mesh,material,n:0,last:0};}
 const trails=Array.from({length:3},ribbon);
 function sample({a,blade}){
  const serial=a.kind==='aurora'?a.serial*10+a.events:a.serial*10;
  if(serial!==trailSerial){trailSerial=serial;trailCursor=(trailCursor+1)%trails.length;const t=trails[trailCursor];t.n=0;t.geometry.setDrawRange(0,0);tint(t.material,a.sword);}
  const t=trails[trailCursor];if(t.n===segments){t.positions.copyWithin(0,6);t.birth.copyWithin(0,2);t.n--;}
  const i=t.n++,o=i*6,b=blade.base,p=blade.tip;t.positions.set([b.x+(p.x-b.x)*.15,b.y+(p.y-b.y)*.15,b.z+(p.z-b.z)*.15,p.x,p.y,p.z],o);t.birth[i*2]=t.birth[i*2+1]=time;t.last=time;t.mesh.visible=true;t.material.uniforms.life.value=.24;t.geometry.setDrawRange(0,Math.max(0,t.n-1)*6);t.geometry.attributes.position.needsUpdate=t.geometry.attributes.birth.needsUpdate=true;
 }
 // Thick curved crescent with a tapered, serrated inner edge and a 3D bow.
 const crescent=new T.BufferGeometry(),pos=[],uv=[],birth=[],indices=[];const N=56;
 for(let i=0;i<=N;i++){const u=i/N,angle=-1.46+u*2.92,taper=Math.pow(Math.sin(Math.PI*u),.65);for(let j=0;j<5;j++){const v=j/4,r=1-(1-v)*(.33+.08*Math.sin(u*31))*taper;pos.push(Math.sin(angle)*r,Math.cos(angle)*r-.42,Math.sin(u*Math.PI*2)*.13+(1-v)*.2*taper);uv.push(u,v);birth.push(0);if(i<N&&j<4){const k=i*5+j;indices.push(k,k+1,k+5,k+1,k+6,k+5);}}}
 crescent.setAttribute('position',new T.Float32BufferAttribute(pos,3));crescent.setAttribute('uv',new T.Float32BufferAttribute(uv,2));crescent.setAttribute('birth',new T.Float32BufferAttribute(birth,1));crescent.setIndex(indices);crescent.computeVertexNormals();
 // birth is shared as zero for cuts; clock is their local age.
 const cuts=Array.from({length:16},()=>{const g=new T.Group(),mat=makeMaterial(),glow=makeMaterial('prota',1),m=new T.Mesh(crescent,mat),h=new T.Mesh(crescent,glow);h.scale.set(1.02,1.12,1.1);g.add(m,h);root.add(g);g.visible=false;return{g,mat,glow,age:10,life:.5,wave:null};});
 function cut(p,sword,scale=1.6,roll=0,yaw=0,life=.4){const c=cuts[cutCursor++%cuts.length];c.g.visible=true;c.age=0;c.life=life;c.wave=null;c.g.position.set(p.x,p.y,p.z);c.g.rotation.set(0,yaw,0);c.g.children.forEach(m=>m.rotation.z=roll);c.g.scale.setScalar(scale);for(const m of [c.mat,c.glow]){tint(m,sword);m.uniforms.life.value=life;m.uniforms.opacity.value=1;}return c;}
 const shardGeo=new T.TetrahedronGeometry(1,0),shardMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}),shards=new T.InstancedMesh(shardGeo,shardMat,192);shards.frustumCulled=false;shards.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(shards);const dummy=new T.Object3D(),color=new T.Color();
 const particles=Array.from({length:192},()=>({life:0,age:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:0}));
 function burst(p,sword,amount=18){const count=quality==='low'?Math.ceil(amount*.4):quality==='medium'?Math.ceil(amount*.7):amount;for(let i=0;i<count;i++){const k=particleCursor++%particles.length,a=particles[k],ang=i*2.399+time,speed=1.2+(i%5)*.7;Object.assign(a,{age:0,life:.28+(i%5)*.065,x:p.x,y:p.y,z:p.z,vx:Math.sin(ang)*speed,vy:((i%7)/7-.25)*speed,vz:Math.cos(ang)*speed,size:.025+(i%3)*.016});color.setHex(palettes[sword][i%4]);shards.setColorAt(k,color);}if(shards.instanceColor)shards.instanceColor.needsUpdate=true;}
 const mark=new T.Group(),markMaterial=new T.MeshBasicMaterial({color:0xfff0bc,transparent:true,depthWrite:false,toneMapped:false}),markGeometry=new T.OctahedronGeometry(.09,0);for(let i=0;i<4;i++){const m=new T.Mesh(markGeometry,markMaterial),a=i*Math.PI/2;m.position.set(Math.cos(a)*.48,Math.sin(a)*.48,0);m.scale.set(1,2.5,1);m.rotation.z=a-Math.PI/2;mark.add(m);}root.add(mark);mark.visible=false;let markAge=1;
 let hero=null,ghosts=[];
 function setHero(model,clone){hero=model;ghosts=Array.from({length:3},()=>{const g=clone(model),mat=new T.MeshBasicMaterial({color:0xffe4a6,transparent:true,opacity:0,depthWrite:false,wireframe:false,toneMapped:false,blending:T.AdditiveBlending}),bones=[];g.traverse(o=>{if(o.isMesh){o.material=mat;o.castShadow=false;}if(o.isBone)bones.push(o);});scene.add(g);g.visible=false;return{g,mat,bones,age:1};});}
 function echo(){if(!hero||!ghosts.length)return;const h=ghosts[ghostCursor++%ghosts.length];hero.updateWorldMatrix(true,true);hero.matrixWorld.decompose(h.g.position,h.g.quaternion,h.g.scale);const map=hero.userData.riteBones||(hero.userData.riteBones=(()=>{const r={};hero.traverse(o=>{if(o.isBone)r[o.name]=o;});return r;})());for(const b of h.bones){const s=map[b.name];if(s){b.position.copy(s.position);b.quaternion.copy(s.quaternion);b.scale.copy(s.scale);}}h.age=0;h.g.visible=true;}
 let echoAt=0;
 function event(type,e){
  if(type==='blade'){sample(e);if(e.a.kind==='prota'&&time-echoAt>.045){echoAt=time;echo();}}
  else if(type==='obstructed'){burst(e.p,e.sword,6);}
  else if(type==='wave'){const c=cut(e.p,'aurora',e.radius,e.roll,e.yaw,1.5);c.wave=e;if(e.n===3){const second=cut(e.p,'aurora',e.radius,-e.roll,e.yaw,1.5);second.wave=e;}burst(e.p,'aurora',12);}
  else if(type==='waveEnd'){for(const c of cuts)if(c.wave===e){c.wave=null;c.age=.24;c.life=.45;for(const m of [c.mat,c.glow])m.uniforms.life.value=c.life;}}
  else if(type==='judgment'){
   const t=e.target,n=e.n,roll=(n*2.399)%Math.PI-Math.PI/2;
   const p={x:t.x+Math.sin(n*2.399)*.18,y:t.y+Math.sin(n*1.7)*.28,z:t.z+Math.cos(n*2.399)*.18};
   cut(p,'prota',e.final?2:1.25+(n%3)*.10,roll,n*.91,e.final?.38:.17);
   if(e.final)cut(p,'prota',2,roll+Math.PI/2,n*.91,.38);
   burst(p,'prota',e.final?24:4);
  }
  else if(type==='impact'){const p=e.target;burst(p,e.sword,e.final?32:15);cut(p,e.sword,e.final?.9:.52,Math.PI*.5,time*3,.19);}
  else if(type==='start'){trailSerial=-1;if(e.kind==='prota'&&e.markedTarget){mark.position.set(e.markedTarget.x,e.markedTarget.y,e.markedTarget.z);markAge=0;mark.visible=true;}}
  else if(type==='cancel')clear();
 }
 function update(dt,level='high',firstPerson=false){time+=dt;quality=level;markAge+=dt;mark.visible=markAge<.3;markMaterial.opacity=Math.max(0,1-markAge/.3);mark.rotation.y+=dt*4;for(const t of trails){t.material.uniforms.clock.value=time;t.material.uniforms.opacity.value=firstPerson?.38:1;t.mesh.visible=t.n>1&&time-t.last<.25;}
  for(const c of cuts){c.age+=dt;if(c.wave){c.g.position.set(c.wave.p.x,c.wave.p.y,c.wave.p.z);c.mat.uniforms.clock.value=c.glow.uniforms.clock.value=.06;c.g.scale.setScalar(c.wave.radius);const opacity=firstPerson?Math.min(1,.25+c.wave.travel/2.4):1;c.mat.uniforms.opacity.value=c.glow.uniforms.opacity.value=opacity;}else{c.g.visible=c.age<c.life;c.mat.uniforms.clock.value=c.glow.uniforms.clock.value=c.age;}c.g.children[1].visible=quality!=='low';}
  let count=0;for(let i=0;i<particles.length;i++){const p=particles[i];p.age+=dt;if(p.age<p.life){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=2.8*dt;const s=p.size*(1-p.age/p.life);dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.age*6,i,p.age*3);dummy.scale.set(s,s*2.8,s);count++;}else dummy.scale.setScalar(0);dummy.updateMatrix();shards.setMatrixAt(i,dummy.matrix);}shards.visible=count>0;shards.instanceMatrix.needsUpdate=true;
  for(const h of ghosts){h.age+=dt;h.g.visible=!firstPerson&&h.age<.2;h.mat.opacity=.16*Math.max(0,1-h.age/.2);}
 }
 function clear(){markAge=1;mark.visible=false;trails.forEach(t=>{t.n=0;t.mesh.visible=false;});cuts.forEach(c=>{c.wave=null;c.age=10;c.g.visible=false;});particles.forEach(p=>p.life=0);ghosts.forEach(h=>{h.age=1;h.g.visible=false;});shards.visible=false;}
 function dispose(){clear();scene.remove(root);trails.forEach(t=>{t.geometry.dispose();t.material.dispose();});cuts.forEach(c=>{c.mat.dispose();c.glow.dispose();});crescent.dispose();markGeometry.dispose();markMaterial.dispose();shardGeo.dispose();shardMat.dispose();ghosts.forEach(h=>{scene.remove(h.g);h.mat.dispose();});}
 return{event,update,clear,dispose,setHero,stats:()=>({cuts:cuts.filter(c=>c.g.visible).length,trails:trails.filter(t=>t.mesh.visible).length,particles:particles.filter(p=>p.age<p.life).length,ghosts:ghosts.filter(h=>h.g.visible).length,capacity:{cuts:16,trails:3,particles:192,ghosts:3}})};
}
