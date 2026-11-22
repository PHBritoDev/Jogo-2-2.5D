import {caveHeight,nodes,choirStairs} from './volcano-cave-layout.js';

// Paired mourning figures look down over the spillway. Facets of the pleated
// mantle share the same vertex-light bake as the terrace, even on low.
function mourner(b,x,y,z,s){
 const point=(a,h,r)=>[x+s*Math.cos(a)*r,y+s*h,z+s*Math.sin(a)*r*.73];
 let last;
 for(const [h,r] of [[0,2.1],[.35,2.3],[3.4,1.46],[5.9,1.9],[6.45,.83],[7.25,.95],[8.1,.66],[8.45,.06]]){
  const ring=Array.from({length:16},(_,i)=>point(i*Math.PI/8,h,r*(i%2?.86:1)));
  if(last)for(let i=0;i<16;i++){const j=(i+1)%16;b.quad(last[i],last[j],ring[j],ring[i],i%2?0x816f76:0xb09893);}
  last=ring;
 }
 for(const side of [-1,1]){
  const sx=x+side*s;
  b.stalk([[x+side*.32*s,y+4.1*s,z+1.1*s,.36*s],[sx,y+4.7*s,z+1.4*s,.54*s],[x+side*1.44*s,y+5.9*s,z,.63*s]],7,0x9b8382);
 }
}
export function upperGalleries(b,l,crystals,torches){
 // Each tread and its riser use the same four corners as the floor query.
 for(const [i,{x0,x1,z,y,half}] of choirStairs.entries()){
  const lo=[x0-half,y,z],ro=[x0+half,y,z];
  b.quad(lo,ro,[x1+half,y,z+1],[x1-half,y,z+1],i%3===0?0xa08980:0x937b76);
  b.quad(lo,[lo[0],y-.27,z],[ro[0],y-.27,z],ro,0x675659);
 }
 const strata=[[-55,26,248,21,35],[47,19,225,22,39],[-64,7,200,24,42],[71,42,164,25,37],[-76,50,150,22,38]];
 for(const [x,y,z,rx,rz] of strata){
  b.cliff(x,y,z,rx,rz,77,0x594856);
  const side=Math.sign(x);
  for(let j=-2;j<=2;j++){
   const cz=z+j*7.8,px=x-side*6;
   b.arch(px,y,cz,3.4,4.6,3.7,0x997c7c,Math.PI/2);
   b.block(px,y+8.6,cz,4.4,.7,7.8,0xaf8b80);
  }
  const fx=x-side*rx*.78;
  l.strip([[fx,y+.2,z-5,2.6,0,0],[fx,y+.2,z,2.6,0,3],[fx-side,y-3,z+1,2.2,0,5],[fx-side*3,-38,z+1.8,1.5,0,24],[fx-side*5,-38,z+8,3.2,0,29]]);
  crystals.push([x-side*5,y+10,z-9,4.5,.23,z*.46,0xce91ff]);
 }
 for(const [x,z] of [[32,201],[49,201]]){
  b.cliff(x,29,z,8,8,62,0x5e4954);
  for(let k=0;k<3;k++)b.block(x,29+k*.8,z,9-k*.9,.85,8-k*.8,0xa38b83);
  mourner(b,x,31.4,z,2.35);
 }
 // Lantern wells and lower arcades follow the deck, leaving the drop visible
 // between supports. Piers terminate underneath the walking surface.
 for(const [a,c] of [['entrance','choir'],['choir','aqueduct'],['aqueduct','lantern'],['lantern','vestibule']]){
  const [x,z]=nodes[a],[u,v]=nodes[c],length=Math.hypot(u-x,v-z),nx=(v-z)/length,nz=(x-u)/length;
  for(let k=0;k<4;k++){
   const t=(k+.5)/4,px=x+(u-x)*t,pz=z+(v-z)*t,h=caveHeight(pz);
   b.arch(px,h-21,pz,2.6,16.5,2.6,0x907779,Math.atan2(-nz,nx));
   if(k===1)for(const side of [-1,1])torches.push([px+side*3.8*nx,h,pz+side*3.8*nz,2,0,0,0xe0ae81]);
  }
 }
 // Vault buttresses run the full length of the new descent. Long ribs
 // fold under one another so that gaps reveal a second bank of basalt.
 for(const side of [-1,1])for(let tier=0;tier<2;tier++){
  let previous;
  for(let j=0;j<=32;j++){
   const z=94+j*6.3,q=j*.71+side*1.7;
   const wall=side*(76+23*tier+7*Math.sin(q)+3*Math.cos(2.7*q));
   const top=54+19*tier+6*Math.cos(1.4*q);
   const profile=[[wall+side*10,-47,z],[wall,4+9*Math.sin(q),z],[wall-side*5,top*.59,z],
    [wall-side*13,top,z],[wall-side*34,top+7,z],[side*3,top+12+4*Math.sin(q),z]];
   if(previous)for(let k=1;k<profile.length;k++){
    b.quad(previous[k-1],profile[k-1],profile[k],previous[k],k<3?0x514657:0x534758,.66+.19*Math.sin(j*2.6+k));
   }
   previous=profile;
  }
 }
 for(let k=0;k<27;k++){
  const z=177+k*3.8,side=k%2?1:-1,x=side*(19+11*Math.sin(k*1.8)),h=65+7*Math.sin(k*2.3);
  b.stalk([[x,h-11-k%9,z,.08],[x+.8,h-5,z,2.4],[x,h,z,4.8]],7,0x584657,.5);
  if(k%4===0)crystals.push([x,h-7,z,3.8,Math.PI,.7*k,0xbb9cff]);
 }
}

// Suspended watercourse behind the nave. The lip projects beyond the
// retaining wall so the molten sheet stays visible from the landings.
export function lowerSpillways(b,l,crystals){
 for(const [x,z,h,r] of [[-19,91,22,2.3],[21,78,29,3.2],[-37,63,37,4.2]]){
  const base=-26;
  for(const side of [-1,1]){
   b.stalk([[x+side*(r+1.7),base,z,3.1],[x+side*(r+1.7),h-4,z,2.3],[x+side*(r+1.7),h,z,1.8]],8,0x675461);
   b.block(x+side*(r+1.7),h,z,4.2,.6,5,0xa89286);
  }
  b.block(x,h-2,z-2,r*2+5,2,6,0x7a6367);
  // Interleaved tongues narrow and break differently during the plunge.
  for(let j=0;j<4;j++){
   const px=x+(j-1.5)*r*.52,w=r*.32,lip=z+1.3+j*.045;
   l.strip([[px,h+.12,z-4,w,0,0],[px,h+.12,lip,w,0,3],[px,h-1,lip+.14,w,0,4],
    [px+.18*j,h-9,lip+.65,w*.83,0,9],[px-.33,base+1,lip+2,w*.74,0,21]]);
  }
  crystals.push([x+r+2,h+2,z,2.7,.28,2,0xa89dff]);
 }
}
