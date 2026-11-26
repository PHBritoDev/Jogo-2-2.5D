/** Prefer the real blade contact point for impact VFX; scripted hits retain their target fallback. */
export function swordImpactPoint(e){
 const p=e?.p;
 return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)?p:e?.target;
}
/** Visual profile for a secondary target: a stronger cross-cut and bounded burst. */
export function swordImpactCue(e){
 if(e?.secondary)return{burst:24,scale:.82,life:.28,secondScale:.48,secondLife:.22};
 return{burst:e?.final ? 32 : 15,scale:e?.final ? .9 : .52,life:.19};
}
/** Resolve the impact cut's world heading from the attack that actually connected. */
export function swordImpactYaw(e){
 const energy=e?.energy||e?.wave;
 if(energy?.kind==='sector'&&Number.isFinite(energy.x)&&Number.isFinite(energy.z)&&
  Number.isFinite(e?.target?.x)&&Number.isFinite(e?.target?.z)){
  const dx=e.target.x-energy.x,dz=e.target.z-energy.z;
  if(Math.hypot(dx,dz)>1e-5)return Math.atan2(dx,dz);
 }
 for(const direction of [e?.direction,e?.wave?.direction,energy?.direction]){
  if(direction&&Number.isFinite(direction.x)&&Number.isFinite(direction.z)&&Math.hypot(direction.x,direction.z)>1e-5)
   return Math.atan2(direction.x,direction.z);
 }
 const yaw=Number.isFinite(e?.yaw)?e.yaw:Number.isFinite(energy?.yaw)?energy.yaw:Number.isFinite(e?.wave?.yaw)?e.wave.yaw:0;
 return Math.atan2(Math.sin(yaw),Math.cos(yaw));
}
/** Place 16 short Passagem cuts in a staggered 4×4 grid over the enemy's front hemisphere. */
export function swordJudgmentCue(e){
 const t=e?.target,from=e?.from;
 if(!t||![t.x,t.y,t.z].every(Number.isFinite))return null;
 const hasFrom=from&&Number.isFinite(from.x)&&Number.isFinite(from.z);
 const dx=hasFrom?t.x-from.x:0,dz=hasFrom?t.z-from.z:1,len=Math.hypot(dx,dz);
 const heading=len>1e-5?Math.atan2(dx,dz):Number.isFinite(e?.yaw)?e.yaw:0;
 const radius=Number.isFinite(t.radius)&&t.radius>0?t.radius:.48,surfaceRadius=radius+.035;
 const height=Number.isFinite(t.height)&&t.height>0?t.height:1.7,n=Math.max(0,Math.min(15,Math.floor(Number.isFinite(e?.n)?e.n:0)));
 const row=Math.floor(n/4),col=n%4;
 // Four columns wrap around the front 106° of the capsule; four rows span almost the full body.
 const surfaceYaw=heading+(col-1.5)*.72,nx=Math.sin(surfaceYaw),nz=Math.cos(surfaceYaw);
 const vertical=((row+.5)/4-.5)*height*.92+Math.sin(n*2.399)*.018;
 const roll=(row%2?1:-1)*(.46+(col-1.5)*.08)+Math.sin(n*2.399)*.045;
 // Stay 3.5 cm outside the collision capsule and render as a shallow surface cut over the enemy mesh.
 return{p:{x:t.x-nx*surfaceRadius,y:t.y+vertical,z:t.z-nz*surfaceRadius},yaw:surfaceYaw,roll,row,col};
}
/** Original world-space sword ribbons and eroded, volumetric cutting waves.
 * Bounded pools: 3 ribbons, 16 cuts, 192 instanced shards, 3 hero echoes.
 */
/** Compact profile for the 16 individual Passagem blade marks. */
export const JUDGMENT_SLASH_PROFILE=Object.freeze({length:.44,endWidth:.006,maxWidth:.054,curve:.035,tilt:.022,bow:.018});
/** Per-rite blade trails: Passagem gets a shorter, softer, 30Hz ribbon. */
export const SWORD_TRAIL_PROFILES=Object.freeze({
 standard:Object.freeze({base:.15,tip:1,life:.24,opacity:1,interval:0}),
 prota:Object.freeze({base:.74,tip:.95,life:.09,opacity:.38,interval:1/30})
});
export function swordTrailProfile(kind){
 return kind==='prota'?SWORD_TRAIL_PROFILES.prota:SWORD_TRAIL_PROFILES.standard;
}
export function swordJudgmentSlashPoint(u,edge){
 const t=Math.max(0,Math.min(1,Number.isFinite(u)?u:0)),side=edge?1:-1,p=JUDGMENT_SLASH_PROFILE;
 const width=p.endWidth+(p.maxWidth-p.endWidth)*Math.pow(Math.sin(Math.PI*t),.8);
 const center=p.curve*Math.sin((t-.5)*Math.PI)+p.tilt*(t-.5);
 return{x:(t-.5)*p.length,y:center+side*width*.5,z:p.bow*Math.sin(Math.PI*t)};
}
export function createSwordRitesVFX(T,scene){
 const root=new T.Group();root.name='SwordRites231';scene.add(root);
 const palettes={prota:[0xf4efe6,0xffffff,0x4a4038,0xff3a48],aurora:[0xff163a,0xffe9ec,0x100618,0xa52dff],vigilia:[0x299bff,0xe4fcff,0x081c43,0x7acfff],quantum:[0x8f35ff,0xffdf7a,0x160925,0xff58cb],celeste:[0xffd271,0xffffff,0x705329,0xfff1b0]};
 const vertex=`attribute float birth; varying vec2 vUv; varying float vAge; uniform float clock; void main(){vUv=uv;vAge=max(0.,clock-birth);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
 const fragment=`precision highp float; varying vec2 vUv; varying float vAge; uniform vec3 ink,core,dark,filament;uniform float opacity,life,clock,glow;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){float x=vUv.x,y=vUv.y;float age=clamp(vAge/life,0.,1.);float brush=noise(vec2(x*72.-clock*7.,y*10.));float rip=noise(vec2(x*180.,y*28.));float edge=.028+.13*brush+.045*sin(x*121.);float mask=smoothstep(edge,edge+.05,y)*(1.-smoothstep(.96,1.,y));mask*=1.-smoothstep(.45+brush*.22,1.,age);float spine=exp(-pow((y-.79-brush*.018)*25.,2.));float secondary=exp(-pow((y-.51-.07*sin(x*31.))*68.,2.));float spark=step(.96,rip)*step(.4,y);vec3 col=mix(dark,ink,smoothstep(.26,.75,y));col=mix(col,core,spine);float bolt=exp(-pow((y-.34-.055*sin(x*63.)-.027*sin(x*151.))*90.,2.))*step(.45,sin(x*21.));col+=filament*(secondary*.9+spark*.25+bolt*1.7);if(glow>.5){col=ink*1.5+core*spine;mask*=.27*pow(y,2.);}float alpha=mask*opacity*(1.-age);if(alpha<.012)discard;gl_FragColor=vec4(col,alpha);}`;
 let time=0,quality='high',cutCursor=0,particleCursor=0,ghostCursor=0,trailSerial=-1,trailCursor=0;
 const makeMaterial=(sword='prota',glow=0)=>{const p=palettes[sword];return new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{clock:{value:0},ink:{value:new T.Color(p[0])},core:{value:new T.Color(p[1])},dark:{value:new T.Color(p[2])},filament:{value:new T.Color(p[3])},opacity:{value:1},life:{value:.3},glow:{value:glow}},side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,blending:glow?T.AdditiveBlending:T.NormalBlending});};
 const tint=(m,s)=>{const p=palettes[s];['ink','core','dark','filament'].forEach((k,i)=>m.uniforms[k].value.setHex(p[i]));};
 const segments=64;
 function ribbon(){const geometry=new T.BufferGeometry(),positions=new Float32Array(segments*2*3),uv=new Float32Array(segments*4),birth=new Float32Array(segments*2),indices=[];for(let i=0;i<segments;i++){uv[i*4]=uv[i*4+2]=i/(segments-1);uv[i*4+1]=0;uv[i*4+3]=1;if(i<segments-1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setAttribute('birth',new T.BufferAttribute(birth,1).setUsage(T.DynamicDrawUsage));geometry.setIndex(indices);geometry.setDrawRange(0,0);const material=makeMaterial(),mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;root.add(mesh);return{geometry,positions,birth,mesh,material,n:0,last:0,life:.24,opacity:1};}
 const trails=Array.from({length:3},ribbon);
 function sample({a,blade}){
  const serial=a.kind==='aurora'?a.serial*10+a.events:a.serial*10;
  if(serial!==trailSerial){trailSerial=serial;trailCursor=(trailCursor+1)%trails.length;const t=trails[trailCursor];t.n=0;t.geometry.setDrawRange(0,0);tint(t.material,a.sword);}
  const t=trails[trailCursor],profile=swordTrailProfile(a.kind);
  if(profile.interval>0&&t.n>0&&time-t.last<profile.interval-1e-4)return;
  if(t.n===segments){t.positions.copyWithin(0,6);t.birth.copyWithin(0,2);t.n--;}
  const i=t.n++,o=i*6,b=blade.base,p=blade.tip,dx=p.x-b.x,dy=p.y-b.y,dz=p.z-b.z;
  t.positions.set([b.x+dx*profile.base,b.y+dy*profile.base,b.z+dz*profile.base,b.x+dx*profile.tip,b.y+dy*profile.tip,b.z+dz*profile.tip],o);t.birth[i*2]=t.birth[i*2+1]=time;t.last=time;t.life=profile.life;t.opacity=profile.opacity;t.mesh.visible=true;t.material.uniforms.life.value=profile.life;t.geometry.setDrawRange(0,Math.max(0,t.n-1)*6);t.geometry.attributes.position.needsUpdate=t.geometry.attributes.birth.needsUpdate=true;
 }
 // Thick curved crescent with a tapered, serrated inner edge and a 3D bow.
 const crescent=new T.BufferGeometry(),pos=[],uv=[],birth=[],indices=[];const N=56;
 for(let i=0;i<=N;i++){const u=i/N,angle=-1.46+u*2.92,taper=Math.pow(Math.sin(Math.PI*u),.65);for(let j=0;j<5;j++){const v=j/4,r=1-(1-v)*(.33+.08*Math.sin(u*31))*taper;pos.push(Math.sin(angle)*r,Math.cos(angle)*r-.42,Math.sin(u*Math.PI*2)*.13+(1-v)*.2*taper);uv.push(u,v);birth.push(0);if(i<N&&j<4){const k=i*5+j;indices.push(k,k+1,k+5,k+1,k+6,k+5);}}}
 crescent.setAttribute('position',new T.Float32BufferAttribute(pos,3));crescent.setAttribute('uv',new T.Float32BufferAttribute(uv,2));crescent.setAttribute('birth',new T.Float32BufferAttribute(birth,1));crescent.setIndex(indices);crescent.computeVertexNormals();
 // Compact curved blade ribbon; ordinary impacts keep the broader crescent.
 const judgmentSlash=new T.BufferGeometry(),jpos=[],juv=[],jbirth=[],jidx=[],JN=28;
 for(let i=0;i<=JN;i++){
  const u=i/JN;
  for(let j=0;j<2;j++){const p=swordJudgmentSlashPoint(u,j);jpos.push(p.x,p.y,p.z);juv.push(u,j);jbirth.push(0);}
  if(i<JN){const k=i*2;jidx.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 judgmentSlash.setAttribute('position',new T.Float32BufferAttribute(jpos,3));judgmentSlash.setAttribute('uv',new T.Float32BufferAttribute(juv,2));judgmentSlash.setAttribute('birth',new T.Float32BufferAttribute(jbirth,1));judgmentSlash.setIndex(jidx);judgmentSlash.computeVertexNormals();
 // birth is shared as zero for cuts; clock is their local age.
 const cuts=Array.from({length:16},()=>{const g=new T.Group(),mat=makeMaterial(),glow=makeMaterial('prota',1),m=new T.Mesh(crescent,mat),h=new T.Mesh(crescent,glow);h.scale.set(1.02,1.12,1.1);g.add(m,h);root.add(g);g.visible=false;return{g,mat,glow,age:10,life:.5,wave:null};});
 function cut(p,sword,scale=1.6,roll=0,yaw=0,life=.4,geometry=crescent){const c=cuts[cutCursor++%cuts.length],overlay=geometry===judgmentSlash;c.g.visible=true;c.age=0;c.life=life;c.wave=null;c.g.position.set(p.x,p.y,p.z);c.g.rotation.set(0,yaw,0);c.g.children.forEach(m=>{m.geometry=geometry;m.rotation.z=roll;m.material.depthTest=!overlay;m.material.depthWrite=false;m.renderOrder=overlay?8:0;});const glowMesh=c.g.children[1];if(overlay){glowMesh.scale.set(1.14,1.3,1.12);}else{glowMesh.scale.set(1.02,1.12,1.1);}c.g.scale.setScalar(scale);for(const m of [c.mat,c.glow]){tint(m,sword);m.uniforms.life.value=life;m.uniforms.opacity.value=1;}c.glow.uniforms.opacity.value=overlay?1.25:1;return c;}
 const shardGeo=new T.TetrahedronGeometry(1,0),shardMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}),shards=new T.InstancedMesh(shardGeo,shardMat,192);shards.frustumCulled=false;shards.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(shards);const dummy=new T.Object3D(),color=new T.Color();
 const particles=Array.from({length:192},()=>({life:0,age:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:0}));
 const activeIndices=new Uint16Array(particles.length),activePositions=new Int16Array(particles.length),changedMatrixIndices=new Uint16Array(particles.length),changedColorIndices=new Uint16Array(particles.length),rangeFlags=new Uint8Array(particles.length);
 activePositions.fill(-1);let activeCount=0;
 function activateParticle(index){if(activePositions[index]!==-1)return;activePositions[index]=activeCount;activeIndices[activeCount++]=index;}
 function deactivateParticleAt(position){const index=activeIndices[position],last=activeIndices[--activeCount];if(position<activeCount){activeIndices[position]=last;activePositions[last]=position;}activePositions[index]=-1;}
 // InstancedMesh starts with identity matrices; hide every slot once so later bursts can update only live indices.
 for(let i=0;i<particles.length;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.setScalar(0);dummy.updateMatrix();shards.setMatrixAt(i,dummy.matrix);}
 shards.instanceMatrix.needsUpdate=true;
 let particleMatrixWrites=0,particleMatrixUploads=0,particleMatrixUploadComponents=0,particleMatrixUploadBytes=0,particleColorUpdates=0,particleColorUpdateComponents=0,particleColorUpdateBytes=0;
 function writeParticleMatrix(index,p,scale){
  if(scale>0){dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.age*6,index,p.age*3);dummy.scale.set(scale,scale*2.8,scale);}
  else{dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.setScalar(0);}
  dummy.updateMatrix();shards.setMatrixAt(index,dummy.matrix);particleMatrixWrites++;
 }
 // Three.js r160 aceita update ranges em componentes; ranges pendentes são preservados até o renderer consumi-los.
 function publishAttributeRanges(attribute,indices,indexCount,stride){
  if(!indexCount)return 0;
  if(typeof attribute.addUpdateRange!=='function'||typeof attribute.clearUpdateRanges!=='function'||!Array.isArray(attribute.updateRanges)){
   attribute.needsUpdate=true;return attribute.array.length;
  }
  let min=particles.length,max=-1;
  const pending=attribute.updateRanges;
  for(let r=0;r<pending.length;r++){
   const range=pending[r],first=Math.max(0,Math.floor(range.start/stride)),last=Math.min(particles.length,Math.ceil((range.start+range.count)/stride));
   for(let slot=first;slot<last;slot++)if(!rangeFlags[slot]){rangeFlags[slot]=1;if(slot<min)min=slot;if(slot>max)max=slot;}
  }
  for(let i=0;i<indexCount;i++){
   const slot=indices[i];
   if(slot>=0&&slot<particles.length&&!rangeFlags[slot]){rangeFlags[slot]=1;if(slot<min)min=slot;if(slot>max)max=slot;}
  }
  if(max<0)return 0;
  let start=-1,last=-1,rangeCount=0,components=0;
  for(let slot=min;slot<=max;slot++){
   if(rangeFlags[slot]){
    if(start<0){start=last=slot;rangeCount++;}
    else if(slot===last+1)last=slot;
    else{components+=(last-start+1)*stride;start=last=slot;rangeCount++;}
   }else if(start>=0){components+=(last-start+1)*stride;start=last=-1;}
  }
  if(start>=0)components+=(last-start+1)*stride;
  const full=rangeCount>8||components>=attribute.array.length*.55;
  attribute.clearUpdateRanges();
  // Keep a full upload explicit until the renderer consumes it; a later sparse write must not replace it.
  if(full)attribute.addUpdateRange(0,attribute.array.length);
  else{
   start=-1;last=-1;
   for(let slot=min;slot<=max;slot++){
    if(rangeFlags[slot]){
     if(start<0)start=last=slot;
     else if(slot===last+1)last=slot;
     else{attribute.addUpdateRange(start*stride,(last-start+1)*stride);start=last=slot;}
    }else if(start>=0){attribute.addUpdateRange(start*stride,(last-start+1)*stride);start=last=-1;}
   }
   if(start>=0)attribute.addUpdateRange(start*stride,(last-start+1)*stride);
  }
  for(let slot=min;slot<=max;slot++)rangeFlags[slot]=0;
  attribute.needsUpdate=true;
  return full?attribute.array.length:components;
 }
 function burst(p,sword,amount=18){const count=quality==='low'?Math.ceil(amount*.4):quality==='medium'?Math.ceil(amount*.7):amount;let changedColorCount=0;for(let i=0;i<count;i++){const k=particleCursor++%particles.length,a=particles[k],ang=i*2.399+time,speed=1.2+(i%5)*.7;a.age=0;a.life=.28+(i%5)*.065;a.x=p.x;a.y=p.y;a.z=p.z;a.vx=Math.sin(ang)*speed;a.vy=((i%7)/7-.25)*speed;a.vz=Math.cos(ang)*speed;a.size=.025+(i%3)*.016;activateParticle(k);color.setHex(palettes[sword][i%4]);shards.setColorAt(k,color);if(count<particles.length)changedColorIndices[changedColorCount++]=k;}if(count>=particles.length){changedColorCount=particles.length;for(let i=0;i<particles.length;i++)changedColorIndices[i]=i;}if(shards.instanceColor&&changedColorCount){const components=publishAttributeRanges(shards.instanceColor,changedColorIndices,changedColorCount,shards.instanceColor.itemSize);particleColorUpdates++;particleColorUpdateComponents+=components;particleColorUpdateBytes+=components*shards.instanceColor.array.BYTES_PER_ELEMENT;}}
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
   const n=e.n,cue=swordJudgmentCue(e);if(!cue)return;
   const {p,yaw,roll}=cue;
   // One short, separated surface stroke per damage event; no crossed final slab.
   cut(p,'prota',e.final?1.18:1.08,roll,yaw,e.final?.28:.20,judgmentSlash);
   burst(p,'prota',e.final?5:2);
  }
  else if(type==='impact'){const p=swordImpactPoint(e);if(!p)return;const cue=swordImpactCue(e),yaw=swordImpactYaw(e);burst(p,e.sword,cue.burst);cut(p,e.sword,cue.scale,Math.PI*.5,yaw,cue.life);if(cue.secondScale)cut(p,e.sword,cue.secondScale,-Math.PI*.5,yaw+Math.PI/2,cue.secondLife);}
  else if(type==='start'){trailSerial=-1;if(e.kind==='prota'&&e.markedTarget){mark.position.set(e.markedTarget.x,e.markedTarget.y,e.markedTarget.z);markAge=0;mark.visible=true;}}
  else if(type==='cancel')clear();
 }
 function update(dt,level='high',firstPerson=false){time+=dt;quality=level;markAge+=dt;mark.visible=markAge<.3;markMaterial.opacity=Math.max(0,1-markAge/.3);mark.rotation.y+=dt*4;for(const t of trails){t.material.uniforms.clock.value=time;t.material.uniforms.opacity.value=firstPerson?Math.min(t.opacity,.38):t.opacity;t.mesh.visible=t.n>1&&time-t.last<t.life;}
  for(const c of cuts){c.age+=dt;if(c.wave){c.g.position.set(c.wave.p.x,c.wave.p.y,c.wave.p.z);c.mat.uniforms.clock.value=c.glow.uniforms.clock.value=.06;c.g.scale.setScalar(c.wave.radius);const opacity=firstPerson?Math.min(1,.25+c.wave.travel/2.4):1;c.mat.uniforms.opacity.value=c.glow.uniforms.opacity.value=opacity;}else{c.g.visible=c.age<c.life;c.mat.uniforms.clock.value=c.glow.uniforms.clock.value=c.age;}c.g.children[1].visible=quality!=='low';}
  let count=0,changedMatrixCount=0;for(let n=0;n<activeCount;){const i=activeIndices[n],p=particles[i];p.age+=dt;if(p.age<p.life){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=2.8*dt;const s=p.size*(1-p.age/p.life);writeParticleMatrix(i,p,s);count++;n++;}else{p.life=0;writeParticleMatrix(i,p,0);deactivateParticleAt(n);}changedMatrixIndices[changedMatrixCount++]=i;}shards.visible=count>0;if(changedMatrixCount){const components=publishAttributeRanges(shards.instanceMatrix,changedMatrixIndices,changedMatrixCount,16);particleMatrixUploads++;particleMatrixUploadComponents+=components;particleMatrixUploadBytes+=components*shards.instanceMatrix.array.BYTES_PER_ELEMENT;}
  for(const h of ghosts){h.age+=dt;h.g.visible=!firstPerson&&h.age<.2;h.mat.opacity=.16*Math.max(0,1-h.age/.2);}
 }
 function clear(){markAge=1;mark.visible=false;trails.forEach(t=>{t.n=0;t.mesh.visible=false;});cuts.forEach(c=>{c.wave=null;c.age=10;c.g.visible=false;});const changedMatrixCount=activeCount;for(let n=0;n<changedMatrixCount;n++){const i=activeIndices[n];particles[i].life=0;writeParticleMatrix(i,particles[i],0);changedMatrixIndices[n]=i;activePositions[i]=-1;}activeCount=0;if(changedMatrixCount){const components=publishAttributeRanges(shards.instanceMatrix,changedMatrixIndices,changedMatrixCount,16);particleMatrixUploads++;particleMatrixUploadComponents+=components;particleMatrixUploadBytes+=components*shards.instanceMatrix.array.BYTES_PER_ELEMENT;}ghosts.forEach(h=>{h.age=1;h.g.visible=false;});shards.visible=false;}
 function dispose(){clear();scene.remove(root);shards.dispose();trails.forEach(t=>{t.geometry.dispose();t.material.dispose();});cuts.forEach(c=>{c.mat.dispose();c.glow.dispose();});crescent.dispose();judgmentSlash.dispose();markGeometry.dispose();markMaterial.dispose();shardGeo.dispose();shardMat.dispose();ghosts.forEach(h=>{scene.remove(h.g);h.mat.dispose();});}
 return{event,update,clear,dispose,setHero,stats:()=>({cuts:cuts.filter(c=>c.g.visible).length,trails:trails.filter(t=>t.mesh.visible).length,particles:activeCount,ghosts:ghosts.filter(h=>h.g.visible).length,particleMatrixWrites,particleMatrixUploads,particleMatrixUploadComponents,particleMatrixUploadBytes,particleColorUpdates,particleColorUpdateComponents,particleColorUpdateBytes,capacity:{cuts:16,trails:3,particles:192,ghosts:3}})};
}
