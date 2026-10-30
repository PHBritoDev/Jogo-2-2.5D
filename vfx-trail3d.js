import {energyMaterial} from './vfx-flow3d.js';
/** A fixed ring-buffer + closed swept volume. Direction/twist come from velocity, never camera billboarding. */
export function volumeTrail(T,parent,preset,{capacity=36,life=.65,radius=.5,sides=8}={}){
 const history=Array.from({length:capacity},()=>({p:new T.Vector3(),t:-99}));let head=0,last=-99,count=0;
 const pos=new Float32Array(capacity*(sides+1)*3),uv=new Float32Array(capacity*(sides+1)*2),ix=[];
 for(let j=0;j<capacity;j++)for(let k=0;k<=sides;k++){uv.set([j/(capacity-1),k/sides],(j*(sides+1)+k)*2);if(j<capacity-1&&k<sides){const a=j*(sides+1)+k,b=a+sides+1;ix.push(a,b,a+1,a+1,b,b+1);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setAttribute('normal',new T.BufferAttribute(new Float32Array(pos.length),3));g.setIndex(ix);
 const m=energyMaterial(T,preset,{warp:.035,alpha:.6}),mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.visible=false;parent.add(mesh);
 const tangent=new T.Vector3(),side=new T.Vector3(),up=new T.Vector3(),axis=new T.Vector3(0,1,0);const normals=g.attributes.normal.array;
 return{mesh,update(time,point,emitting=true,quality=1){if(time<last){count=0;last=-99;}if(emitting&&time!==last){head=(head+1)%capacity;history[head].p.set(point.x,point.y,point.z);history[head].t=time;count=Math.min(capacity,count+1);}last=time;
  let live=0;for(let j=0;j<count;j++){if(time-history[(head-j+capacity)%capacity].t>life)break;live++;}mesh.visible=live>1;if(!mesh.visible)return;
  for(let j=0;j<live;j++){const h=history[(head-j+capacity)%capacity],next=history[(head-Math.min(live-1,j+1)+capacity)%capacity];tangent.subVectors(h.p,next.p).normalize();if(tangent.lengthSq()<.01)tangent.set(0,0,1);side.crossVectors(axis,tangent).normalize();if(side.lengthSq()<.01)side.set(1,0,0);up.crossVectors(tangent,side);const fade=Math.max(0,1-(time-h.t)/life),w=radius*fade*fade;
   for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2+j*.12,cs=Math.cos(a),sn=Math.sin(a),o=(j*(sides+1)+k)*3;for(let c=0;c<3;c++){const n=side.getComponent(c)*cs+up.getComponent(c)*sn;pos[o+c]=h.p.getComponent(c)+n*w;normals[o+c]=n;}}
  }g.setDrawRange(0,(live-1)*sides*6);g.attributes.position.needsUpdate=g.attributes.normal.needsUpdate=true;m.uniforms.time.value=time;m.uniforms.detail.value=quality===0?.65:1;
 },clear(){count=0;last=-99;mesh.visible=false;},dispose(){parent.remove(mesh);g.dispose();m.dispose();}};
}
