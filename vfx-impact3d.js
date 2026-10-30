import {impactFragments} from './skill-impact3d.js';
import {softParticles,groundDecals,groundNormal,hash} from './celestial-fxkit3d.js';
import {energyBody,ENERGY_PALETTES} from './vfx-flow3d.js';
/** ImpactDirector consumes collision records, never decides damage. Fixed reusable slots.
 * Ground illumination uses a terrain-aligned decal: no added lights/shader light-count churn. */
export function impactDirector(T,parent,ground,{capacity=6,onImpact=()=>{}}={}){
 const root=new T.Group();parent.add(root);const debris=impactFragments(T,root,ground,240),dust=softParticles(T,96,{additive:false}),embers=softParticles(T,160),light=groundDecals(T,capacity*2);root.add(dust.mesh,embers.mesh,light.mesh);
 const slots=Array.from({length:capacity},(_,i)=>({id:null,time:-99,point:{x:0,y:0,z:0},size:1,preset:'cinder',kind:'ball',dir:{x:0,y:1,z:0},body:energyBody(T,root,'cinder',{rings:30,sides:20,tail:1.3,seed:i})}));for(const s of slots)s.body.mesh.visible=false;
 let head=0;const seen=new Set(),normal=[0,1,0];
 return{root,emit({id,time,point,size=2,preset='cinder',kind='ball',dir={x:0,y:1,z:0}}){
  if(seen.has(id))return false;seen.add(id);if(seen.size>64)seen.delete(seen.values().next().value);
  const s=slots[head++%capacity];Object.assign(s,{id,time,size,preset,kind,seed:head});Object.assign(s.point,point);Object.assign(s.dir,dir);s.body.material.uniforms.celestial.value=preset==='celestial'?1:0;const pal=ENERGY_PALETTES[preset];for(const k of ['deep','body','hot'])s.body.material.uniforms[k].value.setRGB(...pal[k]);onImpact({point,size,kind});return true;
 },update(time,quality=1){debris.begin();dust.begin();embers.begin();light.begin();const low=quality===0;
  for(const s of slots){const age=time-s.time;s.body.mesh.visible=age>=0&&age<.8;if(age<0||age>1.8)continue;
   const p=s.point,C=ENERGY_PALETTES[s.preset].body,fade=Math.max(0,1-age/1.8),grow=1-Math.pow(1-Math.min(1,age/.35),3),r=s.size*(.14+.86*grow);
   // Anisotropic pressure front expands, then tears apart. No white fullscreen flash.
   if(age<.8)s.body.update(time,{position:p,dir:s.dir,radius:r,length:r*(s.kind==='x'?.17:.45),alpha:.65*Math.max(0,1-age/.8),quality,dissolve:Math.max(0,(age-.28)/.62)});
   debris.add(p,age,s.size,C,s.seed+s.time,s.kind==='x'?'x':'radial',low);
   const gy=ground(p.x,p.z);if(p.y-gy<5)light.add(p.x,gy,p.z,s.size*1.2,...C,Math.max(0,.38-age)*1.2,2,age,1,groundNormal(ground,p.x,p.z,normal));
   for(let i=0;i<(low?12:24);i++){const a=i*2.39996+s.time,sp=s.size*(1+hash(i+7)),d=sp*age;
    embers.add(p.x+Math.cos(a)*d,p.y+Math.sin(i*3.1)*d*.45+age*.7-age*age*2,p.z+Math.sin(a)*d,.05,.22,...C,fade*.7,3,a,i);
   }
   for(let i=0;i<(low?4:7);i++){const a=i*2.4,d=s.size*(.3+age*.6);dust.add(p.x+Math.cos(a)*d,gy+.25+age*1.5,p.z+Math.sin(a)*d,s.size*.6+age,s.size*.4+age,.15,.12,.11,Math.min(.42,age*1.2)*fade,1,a,i);}
  }debris.end();dust.end();embers.end();light.end(time);
 },clear(){seen.clear();for(const s of slots){s.time=-99;s.body.mesh.visible=false;}debris.begin();debris.end();dust.begin();dust.end();embers.begin();embers.end();light.begin();light.end();},stats:()=>({capacity,slots:slots.filter(s=>s.body.mesh.visible).length}),dispose(){parent.remove(root);debris.dispose();dust.dispose();embers.dispose();light.dispose();for(const s of slots)s.body.dispose();}};
}
