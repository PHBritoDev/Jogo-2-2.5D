/** Original geometric sigil, flowing ribbons, four-point stars and pooled impact shards.
 * Fixed buffers, no textures, lights or full-screen postprocessing; mobile drops only filaments. */
export function createStarfallVFX(T,scene){
 const group=new T.Group();group.name='ChuvaEstrelas';scene.add(group);group.visible=false;
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
  uniforms:{time:{value:0},opacity:{value:1}},vertexShader:'attribute vec3 tint; varying vec2 vUv; varying vec3 vTint; void main(){vUv=uv;vTint=tint;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 vUv; varying vec3 vTint; uniform float time; uniform float opacity; void main(){float edge=pow(max(0.,1.-abs(vUv.y*2.-1.)),1.5); float core=pow(edge,8.); float flow=.8+.2*sin(vUv.x*42.-time*12.);gl_FragColor=vec4(mix(vTint,vec3(1.),core*.8),edge*flow*opacity);}' });
 const blue=[.12,.5,1],gold=[1,.68,.21];
 const positions=[],uvs=[],colors=[];
 function strip(a,b,width,color){width*=2.4;const dx=b[0]-a[0],dz=b[2]-a[2],n=Math.hypot(dx,dz)||1,sx=-dz/n*width,sz=dx/n*width;
  for(const [p,s,u,v] of [[a,-1,0,0],[a,1,0,1],[b,-1,1,0],[b,-1,1,0],[a,1,0,1],[b,1,1,1]]){positions.push(p[0]+sx*s,p[1],p[2]+sz*s);uvs.push(u,v);colors.push(...color);}}
 const p=(r,a,y=0)=>[r*Math.cos(a),y,r*Math.sin(a)];
 for(const [r,w,c] of [[.65,.025,blue],[1,.02,gold],[2.65,.035,blue],[3.12,.025,gold],[3.5,.045,blue],[3.8,.02,blue]])for(let i=0;i<192;i++)strip(p(r,i*Math.PI/96),p(r,(i+1)*Math.PI/96),w,c);
 // Invented angular glyphs; no borrowed alphabet or image planes.
 for(let i=0;i<48;i++){const a=i*Math.PI/24;strip(p(2.85,a-.018),p(3.02,a),.018,blue);strip(p(3.02,a),p(2.85,a+.018),.018,blue);strip(p(2.85,a),p(2.72,a),.018,i%3?blue:gold);if(i%2===0)strip(p(3.55,a),p(3.7,a),.025,gold);}
 for(let i=0;i<8;i++){const a=i*Math.PI/4;for(const [a0,a1] of [[p(3.4,a-.045),p(4.25,a)],[p(4.25,a),p(3.4,a+.045)],[p(.15,a),p(.9,a+.13)]])strip(a0,a1,.025,i%2?blue:gold);}
 const sigilGeo=new T.BufferGeometry();sigilGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));sigilGeo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));sigilGeo.setAttribute('tint',new T.Float32BufferAttribute(colors,3));
 const sigil=new T.Mesh(sigilGeo,mat);group.add(sigil);const inner=new T.Mesh(sigilGeo,mat);sigil.add(inner);inner.scale.setScalar(.38);inner.position.y=.08;
 const ribbonMat=mat.clone();ribbonMat.uniforms.time=mat.uniforms.time;
 const segments=20,capacity=91*segments*3*6,buf=new Float32Array(capacity*3),uv=new Float32Array(capacity*2),tint=new Float32Array(capacity*3),geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.BufferAttribute(buf,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('uv',new T.BufferAttribute(uv,2).setUsage(T.DynamicDrawUsage));geo.setAttribute('tint',new T.BufferAttribute(tint,3).setUsage(T.DynamicDrawUsage));const ribbons=new T.Mesh(geo,ribbonMat);ribbons.frustumCulled=false;group.add(ribbons);
 const starMat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){vec2 p=abs(vUv*2.-1.);float d=length(p);float rays=pow(max(0.,1.-pow(p.x*p.y*75.,.65)),3.)*pow(max(0.,1.-d),.7);float halo=pow(max(0.,1.-d),5.)*.35;float diamond=max(0.,1.-(p.x+p.y)*3.5);float core=pow(max(0.,1.-d*6.),2.);vec3 color=mix(vec3(.15,.65,1.),vec3(1.,.77,.3),min(1.,diamond*3.));color=mix(color,vec3(1.),core);gl_FragColor=vec4(color,max(max(rays,halo),diamond));}'});
 const starGeo=new T.PlaneGeometry(1.3,1.3),stars=new T.InstancedMesh(starGeo,starMat,91);stars.frustumCulled=false;group.add(stars);
 const shardGeo=new T.ConeGeometry(.045,.5,3),shardMat=new T.MeshBasicMaterial({color:0xa8e6ff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const shards=new T.InstancedMesh(shardGeo,shardMat,900);shards.frustumCulled=false;group.add(shards);
 const dummy=new T.Object3D(),a=new T.Vector3(),b=new T.Vector3(),side=new T.Vector3(),dir=new T.Vector3(),eye=new T.Vector3(),up=new T.Vector3(0,1,0);let vertex=0;
 function ribbon(from,to,width,c,u0,u1){dir.subVectors(to,from);eye.subVectors(cameraPosition,from);side.crossVectors(dir,eye).normalize().multiplyScalar(width);
  for(let k=0;k<6;k++){const end=k===2||k===3||k===5,sign=k===1||k===4||k===5?1:-1,v=vertex++,q=end?to:from;buf[v*3]=q.x+side.x*sign;buf[v*3+1]=q.y+side.y*sign;buf[v*3+2]=q.z+side.z*sign;uv[v*2]=end?u1:u0;uv[v*2+1]=sign>0?1:0;tint.set(c,v*3);}}
 const cameraPosition=new T.Vector3();
 function update(state,camera,low=false){
  group.visible=state.active;if(!state.active)return;const t=state.time;mat.uniforms.time.value=t;cameraPosition.copy(camera.position);
  const open=Math.min(1,Math.max(0,(t-1.5)/.35)),fade=Math.min(1,Math.max(0,(10-t)/.7));sigil.visible=t>=1.5;sigil.position.set(state.center.x,state.center.y,state.center.z);sigil.scale.setScalar((1-Math.pow(1-open,3))*fade);sigil.rotation.set(.38,t*.16,0);inner.rotation.y=-t*.4;mat.uniforms.opacity.value=fade*.85;
  vertex=0;let ns=0,np=0;
  function tip(pos,scale){dummy.position.set(pos.x,pos.y,pos.z);dummy.quaternion.copy(camera.quaternion);dummy.scale.setScalar(scale);dummy.updateMatrix();stars.setMatrixAt(ns++,dummy.matrix);}
  if(t<1.5){tip(state.launch,t<.7?.2+.5*t/.7:.8);if(t>=.7){a.set(state.source.x,state.source.y,state.source.z);b.set(state.launch.x,state.launch.y,state.launch.z);ribbon(a,b,.10,blue,0,1);ribbon(a,b,.035,gold,0,1);if(!low){const height=state.launch.y-state.source.y;for(let j=0;j<20;j++){const u=j/20,v=(j+1)/20; a.set(state.source.x+Math.sin(u*12-t*9)*.18,state.source.y+height*u,state.source.z+Math.cos(u*12-t*9)*.18);b.set(state.source.x+Math.sin(v*12-t*9)*.18,state.source.y+height*v,state.source.z+Math.cos(v*12-t*9)*.18);ribbon(a,b,.028,blue,u,v);}}}}
  for(const s of state.stars){
   if(s.phase==='flight'){
    tip(s.p,.95);const age=t-s.born;
    for(let j=0;j<segments;j++){const u0=Math.max(0,(age-j*.023)/.65),u1=Math.max(0,(age-(j+1)*.023)/.65);if(u0<=0)break;
     const bands=low?1:3;
     for(let band=0;band<bands;band++){
      const offset=band?Math.sin(j*.35+t*12+s.i)*.08*(band===1?1:-1):0;
      a.set(s.from.x+(s.aim.x-s.from.x)*u0+offset,s.from.y+(s.aim.y-s.from.y)*u0*u0,s.from.z+(s.aim.z-s.from.z)*u0);
      b.set(s.from.x+(s.aim.x-s.from.x)*u1+offset,s.from.y+(s.aim.y-s.from.y)*u1*u1,s.from.z+(s.aim.z-s.from.z)*u1);
      ribbon(a,b,(band?.02:.12)*(1-j/segments),band===1?gold:blue,j/segments,(j+1)/segments);
     }
    }
   }
   const age=t-s.impactAt;if(s.phase==='impact'&&age>=0&&age<.38){tip(s.p,(1-age/.38)*1.4);const count=low?5:10;
    for(let j=0;j<count;j++){const angle=j*2.39996+s.i;dir.set(Math.cos(angle),.4+(j%3)*.35,Math.sin(angle)).normalize();dummy.position.set(s.p.x,s.p.y,s.p.z).addScaledVector(dir,age*(3+j%4));dummy.position.y-=age*age*3;dummy.quaternion.setFromUnitVectors(up,dir);dummy.scale.setScalar((1-age/.38)*(.5+j%3*.25));dummy.updateMatrix();shards.setMatrixAt(np++,dummy.matrix);}
   }
  }
  geo.setDrawRange(0,vertex);geo.attributes.position.needsUpdate=geo.attributes.uv.needsUpdate=geo.attributes.tint.needsUpdate=true;stars.count=ns;shards.count=np;stars.instanceMatrix.needsUpdate=shards.instanceMatrix.needsUpdate=true;
 }
 return{group,update,clear(){group.visible=false;},dispose(){scene.remove(group);for(const g of [sigilGeo,geo,starGeo,shardGeo])g.dispose();for(const m of [mat,ribbonMat,starMat,shardMat])m.dispose();stars.dispose();shards.dispose();}};
}
