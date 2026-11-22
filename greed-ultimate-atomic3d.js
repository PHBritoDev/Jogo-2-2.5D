// Arena coordinates are local to the dimension. The refuge is a connected cap
// of the combat disk, cut at the measured 80th percentile of walkable area.
export function measureRefuge(radius, walkable, resolution = 192) {
  const rows = [];
  let count = 0;
  const step = 2 * radius / resolution;
  for (let j = 0; j < resolution; j++) {
    let n = 0;
    const z = -radius + (j + .5) * step;
    for (let i = 0; i < resolution; i++)
      if (walkable(-radius + (i + .5) * step, z)) n++;
    rows.push(n);
    count += n;
  }
  if (!count) throw Error('Arena sem piso');
  let danger = 0, j = 0;
  while (j < rows.length && Math.abs(danger + rows[j] - count*.8) <= Math.abs(danger-count*.8))
    danger += rows[j++];
  const edge = -radius + j * step;
  return {edge, radius, fraction:danger/count, walkable,
    safe:(x,z)=>walkable(x,z) && z>=edge};
}

export function createGreedUltimate({arena, speed, camera, weapon, damage, beat=()=>{}}) {
  if (!(speed>0 && Number.isFinite(speed))) throw Error("Velocidade inválida");
  let escape = (arena.radius + arena.edge + 1) / speed + 1.1;
  const phases = [['announce',1.15],['throw',1.12],['charge',2.65],['escape',escape],
    ['detonate',1.2],['aftermath',1.65],['recover',.65]];
  let previous=null;
  let index=-1, time=0, cast=0, consumed=false, disposed=false, detached=false;
  const state=()=>({phase:phases[index]?.[0] || 'idle', progress:index<0?0:time/phases[index][1], cast,
    front:index===4?arena.radius*time/phases[4][1]:0, escape});
  function end(){
    if(index<0)return;
    if(detached) weapon.restore();
    camera.release();
    previous=null; detached=false; index=-1; time=0; beat('idle');
  }
  return {getState:state,cancel:end,dispose(){end();disposed=true;},
    start({phase,grounded,busy}){
      if(disposed || index>=0 || phase!==3 || !grounded || busy)return false;
      index=0;time=0;cast++;consumed=false;camera.focus();beat('announce');return true;
    },
    update(dt,hero){
      if(!Number.isFinite(dt)||dt<=0)return;
      if(index<0)return;
      const elapsed=dt, start=previous || hero;
      const point=(f)=>({x:start.x+(hero.x-start.x)*f,z:start.z+(hero.z-start.z)*f});
      while(index>=0 && dt>1e-9){
        const [phase,length]=phases[index], before=time;
        const slice=Math.min(dt,length-time);time+=slice;dt-=slice;
        if(phase==='throw' && !detached && time>=.42){weapon.release();detached=true;}
        if(phase==='detonate' && !consumed && hero){
          const from=point(1-(dt+slice)/elapsed), to=point(1-dt/elapsed);
          const rate=arena.radius/length;
          const gap=(u)=>Math.hypot(from.x+(to.x-from.x)*u,from.z+(to.z-from.z)*u)-(before+slice*u)*rate;
          if(gap(0)*gap(1)<=0){
            let lo=0,hi=1;const outside=gap(0)>0;
            if(Math.abs(gap(0))<1e-8)hi=0;
            else for(let n=0;n<16;n++){const mid=(lo+hi)*.5;if((gap(mid)>0)===outside)lo=mid;else hi=mid;}
            const x=from.x+(to.x-from.x)*hi,z=from.z+(to.z-from.z)*hi;
            if(arena.walkable(x,z) && !arena.safe(x,z)){
              consumed=true;if(!hero.evading)damage({token:'usura-'+cast,blocked:!!hero.blocking});
            }
          }
        }
        if(time>=length-1e-9){
          if(index===phases.length-1){end();break;}
          index++;time=0;
          if(index===3){
            const z=arena.edge+.8;
            const span=Math.sqrt(Math.max(0,arena.radius**2-z*z))-.3;
            const distance=hero ? Math.hypot(Math.max(0,Math.abs(hero.x)-span),Math.max(0,z-hero.z)) : arena.radius+z;
            escape=distance/speed+2;
            phases[3][1]=escape;camera.release();
          }
          beat(phases[index][0]);
        }
      }
      previous=index>=0 && hero ? {x:hero.x,z:hero.z} : null;
    }};
}
