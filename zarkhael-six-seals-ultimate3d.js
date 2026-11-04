/**
 * MOD 280 — ZAR'KHAEL, ULTIMATE: OS SEIS SELOS DO JUÍZO ETERNO.
 * Um único relógio controla aura, seis selos, câmera, dano e três explosões.
 * Área segura de 20% (não 20% do raio).
 */
export const ZARK_ULT_BUILD='281-front-stepwise-six-shots-volumetric-detonation';
export const ZARK_ULT=Object.freeze({
 aura:3.3, seals:6.7, explosions:5.5, total:15.5, count:6,
 radii:[1,.50,.38,.28,.21,.16], heights:[.11,6.5,13,19.5,26,32.5],
 safeArea:.20, burstTimes:[.55,2.07,3.60], burstPeriod:1.52,
 damage:[15,17,22], sealGap:6.7/6, sealBuild:1.02,
 cameraBase:76, cameraTop:137, auraScale:7.2
});
const PI=Math.PI,TAU=PI*2,clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),
 sm=v=>{v=clamp(v);return v*v*(3-2*v);};
export function sixSealDangerRadius(arenaRadius,safeFraction=ZARK_ULT.safeArea){
 return Math.max(0,arenaRadius)*Math.sqrt(1-clamp(safeFraction,0,.95));
}
export function createZarkhaelSixSeals(opts={}){
 const U={...ZARK_ULT,...(opts.U||{})},damage=opts.damage||U.damage;
 const st={phase:'idle',t:0,pt:0,pi:-1,done:false,aborted:false,boss:null,center:null,R:0,dangerR:0,
  aura:0,sword:0,seals:[],bursts:[],hitEvents:0,trauma:0,flash:0};
 const phases=[['aura',U.aura],['seals',U.seals],['explosions',U.explosions]];
 function start(boss,arena){
  const a=arena||{x:boss.x,z:boss.z,r:30,y:boss.y};
  const C={x:a.x,z:a.z,y:Number.isFinite(a.y)?a.y:boss.y};
  const R=Math.max(4,Number(a.r)||30),dangerR=sixSealDangerRadius(R,U.safeArea);
  Object.assign(st,{phase:'aura',t:0,pt:0,pi:0,done:false,aborted:false,boss:{...boss},center:C,R,dangerR,
   aura:0,sword:0,seals:Array.from({length:U.count},(_,i)=>({i,r:dangerR*U.radii[i],h:U.heights[i],build:0,spin:0,complete:false})),
   bursts:[],hitEvents:0,trauma:0,flash:0});
  return api;
 }
 function abort(){if(st.done||st.phase==='idle')return;st.done=true;st.aborted=true;st.phase='aborted';st.trauma=0;st.flash=0;}
 function step(dt,hero){
  const ev=[];if(st.done||st.phase==='idle')return ev;
  dt=clamp(Number(dt)||0,0,.15);if(!dt)return ev;
  let left=dt;
  while(left>1e-8&&!st.done){
   const [,len]=phases[st.pi],before=st.pt,delta=Math.min(left,len-st.pt),after=before+delta;
   st.pt=after;st.t+=delta;left-=delta;
   if(st.pi===0){
    st.aura=sm(after/U.aura);st.sword=.11+.29*st.aura;
    st.trauma=.08*sm((after-2.25)/1.05);
   }
   if(st.pi===1){
    st.aura=1;st.sword=.4+.6*sm(after/U.seals);
    st.seals.forEach(c=>{
     const from=c.i*U.sealGap,prev=c.build;
     c.build=sm((after-from)/U.sealBuild);
     c.spin+=delta*((c.i%2?-1:1)*(.14+.055*c.i));
     if(prev<1&&c.build>=1&&!c.complete){c.complete=true;ev.push({type:'seal',n:c.i+1});}
    });
    st.trauma=.12+.16*sm((after-5.7)/1);
   }
   if(st.pi===2){
    st.sword=1;st.aura=1;
    st.seals.forEach(c=>{c.build=1;c.spin+=delta*((c.i%2?-1:1)*(.14+.055*c.i));});
    st.trauma=.15+.45*sm(after/U.explosions);
    for(let i=0;i<3;i++){
     const born=U.burstTimes[i];
     if(after>=born&&!st.bursts[i]){
      const d=Math.hypot((hero?.x??Infinity)-st.center.x,(hero?.z??Infinity)-st.center.z);
      const safe=d>=st.dangerR;
      const eligible=!safe&&hero&&hero.alive!==false&&!hero.iframes;
      const dmg=Array.isArray(damage)?damage[i]:(Number(damage)||40)*(i===2?.44:.3);
      st.bursts[i]={i,n:i+1,born:st.t-(after-born),age:after-born,hit:!!eligible,damage:dmg};
      ev.push({type:'burst',n:i+1,x:st.center.x,z:st.center.z,r:st.dangerR,hit:!!eligible});
      if(eligible){st.hitEvents++;ev.push({type:'hit',n:i+1,dmg});}
     }
     if(st.bursts[i])st.bursts[i].age=Math.max(0,after-born);
    }
    st.flash=st.bursts.reduce((v,b)=>Math.max(v,.26*Math.max(0,1-b.age/.28)),0);
   }
   if(after>=len-1e-8){
    st.pi++;st.pt=0;
    if(st.pi>=phases.length){st.done=true;st.phase='done';st.aura=st.sword=st.trauma=st.flash=0;ev.push({type:'end'});}
    else{st.phase=phases[st.pi][0];ev.push({type:'phase',name:st.phase,n:st.pi+1});}
   }
  }
  return ev;
 }
 /**
  * Storyboard 281: plano FRONTAL na altura do rosto; seis tomadas com subida
  * de 6,5m por camada; explosões filmadas de cima, mas inclinadas para revelar
  * o VOLUME real do plasma. Apenas o relógio da ultimate determina a câmera.
  */
 function camera(ctx={}){
  const B=ctx.boss||st.boss||{x:0,y:0,z:0,yaw:0},H=ctx.hero||{},C=st.center||{x:0,y:0,z:0};
  const yaw=B.yaw||0,dx=(H.x??(B.x+Math.sin(yaw)))-B.x,dz=(H.z??(B.z+Math.cos(yaw)))-B.z;
  const len=Math.hypot(dx,dz)||1,fx=dx/len,fz=dz/len;
  const out={w:1,pos:[0,0,0],look:[0,0,0],fov:54,shot:'',sealIndex:-1};
  if(st.done||st.phase==='idle'){out.w=0;return out;}
  if(st.pi===0){
   // Frente real ao bispo (direção boss→jogador), sem deslocamento lateral.
   const k=sm(st.pt/U.aura),d=5.25-.7*k;
   out.pos=[B.x+fx*d,B.y+2.15+.06*k,B.z+fz*d];
   out.look=[B.x,B.y+1.95+.08*k,B.z];
   out.fov=48-3*k;out.shot='FRONTAL_BISPO';out.w=sm(st.pt/.18);
  }else if(st.pi===1){
   const index=Math.min(5,Math.floor(st.pt/U.sealGap));
   const local=st.pt-index*U.sealGap,lift=sm(local/.27);
   const prev=index===0?U.heights[0]:U.heights[index-1];
   const target=U.heights[index],groundH=prev+(target-prev)*lift;
   const xz=10.2+index*.36;
   out.pos=[C.x+xz,C.y+groundH+9.1,C.z+xz*.90];
   out.look=[C.x,C.y+groundH,C.z];
   out.fov=62-index*.9;out.shot='CIRCULO_'+(index+1);out.sealIndex=index;
  }else{
   const k=sm(st.pt/.65);
   // Plano alto e inclinado, não zenital: cúpula tem perfil tridimensional.
   out.pos=[C.x+11+32*k,C.y+U.heights[5]+9+17*k,C.z+9+26*k];
   out.look=[C.x,C.y+U.heights[5]*(1-k)+8*k,C.z];
   out.fov=58+6*k;out.shot='EXPLOSOES_VISTA_ALTA';
  }
  return out;
 }
 const api={U,st,start,abort,step,camera,get done(){return st.done;},get holdBoss(){return !st.done&&st.phase!=='idle';}};
 return api;
}
