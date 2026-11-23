// Shaft profiles are merged into a single transparent surface per biome.
// The alpha falls to zero at all four margins; opaque rock still occludes it.
export function caveShafts(T,group,shafts){
 const pos=[],uv=[],colors=[],color=new T.Color();
 for(const {start,end,top,bottom,tint,strength} of shafts){
  color.set(tint);
  const ring=(point,r)=>[[-1,0],[0,-1],[1,0],[0,1]].map(([x,z])=>[point[0]+x*r,point[1],point[2]+z*r]);
  const a=ring(start,top),b=ring(end,bottom);
  for(let i=0;i<4;i++){
   const j=(i+1)%4;
   for(const [p,u,v] of [[a[i],0,1],[a[j],1,1],[b[i],0,0],[b[i],0,0],[a[j],1,1],[b[j],1,0]]){
    pos.push(...p);uv.push(u,v);colors.push(color.r*strength,color.g*strength,color.b*strength);
   }
  }
 }
 const geometry=new T.BufferGeometry();
 for(const [key,data,width] of [['position',pos,3],['color',colors,3],['uv',uv,2]])
  geometry.setAttribute(key,new T.Float32BufferAttribute(data,width));
 const material=new T.ShaderMaterial({
  depthWrite:false,transparent:true,blending:T.AdditiveBlending,vertexColors:true,
  vertexShader:`varying vec3 lightColor;varying vec2 q;void main(){
   q=uv;lightColor=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
  }`,
  fragmentShader:`varying vec3 lightColor;varying vec2 q;void main(){
   float edge=4.*q.x*(1.-q.x),height=4.*q.y*(1.-q.y);
   float ray=edge*edge*height*height*(.45+.55*q.y);
   gl_FragColor=vec4(lightColor,ray);
   #include <colorspace_fragment>
  }`
 });
 const mesh=new T.Mesh(geometry,material);mesh.name='Luz suspensa';group.add(mesh);
}
