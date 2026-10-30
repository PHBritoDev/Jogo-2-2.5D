import {energyMaterial,flameGeometry} from './vfx-flow3d.js';
/** Original eastern-dragon silhouette: raised brow, short muzzle, hinged jaw, flame mane.
 * Geometry is authored as continuous ring profiles; no reptile scale tiles or rigid giant horns. */
function profile(T,rows,sides=20){const pos=[],uv=[],ix=[];for(let j=0;j<rows.length;j++){const [z,rx,ry,cy]=rows[j];for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2;pos.push(Math.cos(a)*rx,cy+Math.sin(a)*ry,z);uv.push(j/(rows.length-1),k/sides);if(j<rows.length-1&&k<sides){const n=j*(sides+1)+k,b=n+sides+1;ix.push(n,n+1,b,n+1,b+1,b);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;}
export function dragonHead(T,parent){
 const root=new T.Group();root.name='CelestialFlameHead';parent.add(root);const mat=energyMaterial(T,'celestial',{warp:.035,alpha:.98});
 const skull=profile(T,[[-1.05,.02,.02,.12],[-.8,.46,.46,.16],[-.55,.71,.63,.2],[-.22,.78,.67,.2],[.04,.68,.44,.18],[.30,.42,.26,.06],[.60,.35,.20,.01],[.85,.21,.16,.07],[.91,.01,.01,.08]]);
 root.add(new T.Mesh(skull,mat));
 const jaw=new T.Group();jaw.position.set(0,-.16,-.35);root.add(jaw);const jawGeo=profile(T,[[0,.05,.04,-.01],[.2,.55,.15,-.07],[.65,.59,.13,-.12],[.95,.32,.12,-.1],[1.22,.12,.06,-.02],[1.27,.005,.005,-.01]]);jaw.add(new T.Mesh(jawGeo,mat));
 const flameGeo=flameGeometry(T),flameMat=energyMaterial(T,'celestial',{warp:.018,alpha:.92,frequency:.35,flame:1}),mane=new T.InstancedMesh(flameGeo,flameMat,60);mane.frustumCulled=false;root.add(mane);
 const eyeGeo=new T.SphereGeometry(1,10,6),dark=new T.MeshBasicMaterial({color:0x3d1002}),eyeMat=new T.MeshBasicMaterial({color:0xffefb0,toneMapped:false}),sockets=new T.InstancedMesh(eyeGeo,dark,2),eyes=new T.InstancedMesh(eyeGeo,eyeMat,2);root.add(sockets,eyes);const dummy=new T.Object3D();
 for(let i=0;i<2;i++){const side=i?1:-1;dummy.position.set(side*.68,.34,.23);dummy.rotation.set(0,side*.5,side*.25);dummy.scale.set(.10,.085,.2);dummy.updateMatrix();sockets.setMatrixAt(i,dummy.matrix);dummy.position.x=side*.745;dummy.scale.set(.065,.032,.125);dummy.updateMatrix();eyes.setMatrixAt(i,dummy.matrix);}
 const teethGeo=new T.ConeGeometry(.045,.2,6),teeth=new T.InstancedMesh(teethGeo,eyeMat,4);root.add(teeth);for(let i=0;i<4;i++){dummy.position.set((i%2?1:-1)*(i<2?.38:.25),-.18,i<2?.36:.7);dummy.rotation.set(Math.PI,0,0);dummy.scale.setScalar(i<2?1:.6);dummy.updateMatrix();teeth.setMatrixAt(i,dummy.matrix);}
 function update(time,mouth,quality){mat.uniforms.time.value=flameMat.uniforms.time.value=time;mat.uniforms.detail.value=flameMat.uniforms.detail.value=quality===0?.65:1;jaw.rotation.x=mouth*1.15;
  let n=0;const N=quality===0?12:20;
  for(let i=0;i<N;i++){const a=i/N*Math.PI*2,z=-.48-(i%3)*.12,wave=Math.sin(time*5+i*1.7);dummy.position.set(Math.cos(a)*.63,.19+Math.sin(a)*.52,z);dummy.rotation.set(-.65+wave*.1,Math.sin(a)*.35,-a+Math.PI/2);dummy.scale.set(.8, .34+(i%4)*.08+wave*.04,.8);dummy.updateMatrix();mane.setMatrixAt(n++,dummy.matrix);}
  // Paired expressive flame eyebrows and small crown flames, integrated in the same draw.
  for(const side of [-1,1])for(let j=0;j<4;j++){dummy.position.set(side*(.35+j*.12),.58-j*.045,.12-j*.10);dummy.rotation.set(-.8,side*.4,-side*(.65+j*.08));dummy.scale.set(.7,.33+j*.055,.6);dummy.updateMatrix();mane.setMatrixAt(n++,dummy.matrix);}
  mane.count=n;mane.instanceMatrix.needsUpdate=true;
 }
 return{root,jaw,update,material:mat,dispose(){parent.remove(root);for(const g of [skull,jawGeo,flameGeo,eyeGeo,teethGeo])g.dispose();for(const m of [mat,flameMat,dark,eyeMat])m.dispose();for(const m of [mane,sockets,eyes,teeth])m.dispose();}};
}
/** Swept body sampled by arc length, with UVs along the living spine. */
export function dragonBody(T,parent){
 const N=128,R=16,pos=new Float32Array((N+1)*(R+1)*3),uv=new Float32Array((N+1)*(R+1)*2),norm=new Float32Array(pos.length),ix=[];
 for(let j=0;j<=N;j++)for(let k=0;k<=R;k++){uv.set([j/N,k/R],(j*(R+1)+k)*2);if(j<N&&k<R){const a=j*(R+1)+k,b=a+R+1;ix.push(a,b,a+1,a+1,b,b+1);}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('normal',new T.BufferAttribute(norm,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(ix);
 const mat=energyMaterial(T,'celestial',{warp:.12,frequency:4}),mesh=new T.Mesh(geo,mat);mesh.frustumCulled=false;parent.add(mesh);mesh.name='DragonFlowBody';const centers=Array.from({length:N+1},()=>new T.Vector3()),sides=centers.map(()=>new T.Vector3()),ups=centers.map(()=>new T.Vector3());
 const flameGeo=flameGeometry(T),flameMat=energyMaterial(T,'celestial',{warp:.025,alpha:.92,frequency:.35,flame:1}),flames=new T.InstancedMesh(flameGeo,flameMat,240);flames.name='DragonFlowFlames';flames.frustumCulled=false;parent.add(flames);const dummy=new T.Object3D(),f=new T.Vector3(),axis=new T.Vector3(0,1,0),basis=new T.Matrix4();
 function update(s,fade,quality){mat.uniforms.time.value=flameMat.uniforms.time.value=s.time;mat.uniforms.dissolve.value=flameMat.uniforms.dissolve.value=1-fade;mat.uniforms.detail.value=flameMat.uniforms.detail.value=quality===0?.65:1;
  let total=0;for(let k=1;k<s.trailCount;k++){const a=s.sample(k-1),b=s.sample(k);total+=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}const length=Math.min(76,total);let k=1,acc=0;
  mesh.visible=flames.visible=length>.3;if(length<.3)return;
  for(let j=0;j<=N;j++){const distance=length*j/N;while(k<s.trailCount-1){const a=s.sample(k-1),b=s.sample(k),d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);if(acc+d>=distance)break;acc+=d;k++;}const a=s.sample(k-1),b=s.sample(k),d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)||1,u=Math.max(0,Math.min(1,(distance-acc)/d));centers[j].set(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,a.z+(b.z-a.z)*u);}
  let count=0;
  for(let j=0;j<=N;j++){const u=j/N,c=centers[j],side=sides[j],up=ups[j];f.subVectors(centers[Math.max(0,j-1)],centers[Math.min(N,j+1)]).normalize();if(f.lengthSq()<.01)f.set(s.dir.x,s.dir.y,s.dir.z).normalize();side.crossVectors(axis,f).normalize();if(side.lengthSq()<.01)side.set(1,0,0);up.crossVectors(f,side);const r=(1.85*Math.pow(1-u,.8)+.015)*Math.min(1,length/8);
   for(let n=0;n<=R;n++){const a=n/R*Math.PI*2,cs=Math.cos(a),sn=Math.sin(a),rr=r*(1+.055*Math.sin(u*31-s.time*3+a*2)),o=(j*(R+1)+n)*3;for(let h=0;h<3;h++){const normal=side.getComponent(h)*cs+up.getComponent(h)*sn;pos[o+h]=c.getComponent(h)+normal*rr;norm[o+h]=normal;}}
   if(j>3&&j<N&&j%(quality===0?5:3)===0){basis.makeBasis(side,up,f);for(let n=0;n<3;n++){const a=n*Math.PI*2/3+j*.17,wave=Math.sin(s.time*5-j*.31);dummy.position.copy(c).addScaledVector(side,Math.cos(a)*r*.98).addScaledVector(up,Math.sin(a)*r*.98);dummy.quaternion.setFromRotationMatrix(basis);dummy.rotateZ(a-Math.PI/2);dummy.rotateX(-.7+wave*.12);dummy.scale.set((1.6+.25*wave)*(1-u),(1.65+.25*wave)*(1-u),1-u);dummy.updateMatrix();flames.setMatrixAt(count++,dummy.matrix);}}
  }flames.count=count;flames.instanceMatrix.needsUpdate=true;geo.attributes.position.needsUpdate=geo.attributes.normal.needsUpdate=true;
 }
 return{mesh,centers,update,dispose(){parent.remove(mesh,flames);geo.dispose();mat.dispose();flameGeo.dispose();flameMat.dispose();flames.dispose();}};
}
