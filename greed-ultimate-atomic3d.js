// All coordinates here are relative to the arena, including the frozen point
// directly beneath the blade at release. The refuge faces away from that point.
export function measureRefuge(radius, walkable, resolution = 192, origin = {x:0,z:0}) {
  const step=2*radius/resolution, n=resolution, cells=n*n;
  const length=Math.hypot(origin.x,origin.z);
  const normal=length>.05?{x:-origin.x/length,z:-origin.z/length}:{x:0,z:1};
  const projection=(x,z)=>x*normal.x+z*normal.z;
  const distances=new Int16Array(cells).fill(-1), queue=new Int32Array(cells), cuts=[];
  const coord=i=>(i+.5)*step-radius;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const x=coord(i),z=coord(j);
    if(walkable(x,z)){cuts.push(projection(x,z));distances[j*n+i]=-2;}
  }
  if(!cuts.length)throw Error('Arena sem piso');
  cuts.sort((a,b)=>a-b);
  const edge=cuts[Math.floor(cuts.length*.8)],safe=(x,z)=>walkable(x,z)&&projection(x,z)>=edge;
  let head=0,tail=0;
  for(let id=0;id<cells;id++){
    if(distances[id]===-2 && projection(coord(id%n),coord(Math.floor(id/n)))>=edge+.6){
      distances[id]=0;queue[tail++]=id;
    }
  }
  function visit(next,current){
    if(distances[next]!==-2)return;
    distances[next]=distances[current]+1;queue[tail++]=next;
  }
  while(head<tail){
    const id=queue[head++],i=id%n;
    if(i>0)visit(id-1,id);if(i<n-1)visit(id+1,id);
    if(id>=n)visit(id-n,id);if(id<cells-n)visit(id+n,id);
  }
  const index=v=>Math.max(0,Math.min(n-1,Math.floor((v+radius)/step)));
  function escapeDistance(x,z){
    if(safe(x,z))return 0;
    const d=distances[index(z)*n+index(x)];
    return d>=0?(d+2)*step:2*radius;
  }
  return {origin:{...origin},normal,edge,radius,walkable,safe,escapeDistance,
    reach:radius+length,fraction:cuts.filter(v=>v<edge).length/cuts.length};
}
export function createGreedUltimate({arena, speed, camera, weapon, damage, beat=()=>{}}) {
  if (!(speed>0 && Number.isFinite(speed))) throw Error("Velocidade inválida");
  let escape = (arena.radius + arena.edge + 1) / speed + 1.1;
  const phases = [['announce',1.35],['bladeCombo',2.1],['throw',1.12],['charge',2.65],['escape',escape],['collapse',.48],
    ['detonate',1.45],['aftermath',6.6],['recover',.95]];
  let previous=null, ownsCamera=false;
  function releaseCamera(){if(ownsCamera){ownsCamera=false;camera.release();}}
  let index=-1, time=0, cast=0, consumed=false, disposed=false, detached=false;
  const state=()=>({phase:phases[index]?.[0] || 'idle', progress:index<0?0:time/phases[index][1], cast,
    front:phases[index]?.[0]==='detonate'?arena.reach*time/phases[index][1]:0, escape});
  function end(){
    if(index<0)return;
    if(detached) weapon.restore();
    releaseCamera();
    previous=null; detached=false; index=-1; time=0; beat('idle');
  }
  return {getState:state,cancel:end,dispose(){end();disposed=true;},
    start({phase,grounded,busy}){
      if(disposed || index>=0 || phase!==3 || !grounded || busy)return false;
      index=0;time=0;cast++;consumed=false;ownsCamera=true;camera.focus();beat('announce');return true;
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
          from.x-=arena.origin.x;from.z-=arena.origin.z;to.x-=arena.origin.x;to.z-=arena.origin.z;
          const rate=arena.reach/length;
          // Solve |from + u * delta|² = (initialRadius + u * growth)².
          // A fast dash can intersect the front twice between two samples.
          const dx=to.x-from.x, dz=to.z-from.z, r=before*rate, growth=slice*rate;
          const a=dx*dx+dz*dz-growth*growth;
          const b=2*(from.x*dx+from.z*dz-r*growth);
          const c=from.x**2+from.z**2-r*r;
          const disc=b*b-4*a*c;
          let roots=[];
          if(Math.abs(c)<1e-9) roots.push(0);
          if(Math.abs(a)<1e-9){
            if(Math.abs(b)>1e-9) roots.push(-c/b);
          } else if(disc>=0){
            const d=Math.sqrt(disc);
            roots.push((-b-d)/(2*a),(-b+d)/(2*a));
          }
          for(const u of roots.sort((left,right)=>left-right)){
            if(consumed || u<0 || u>1)continue;
            const x=arena.origin.x+from.x+dx*u,z=arena.origin.z+from.z+dz*u;
            if(arena.walkable(x,z) && !arena.safe(x,z)){
              consumed=true;if(!hero.evading)damage({token:'usura-'+cast,blocked:!!hero.blocking});
            }
          }
        }
        if(time>=length-1e-9){
          if(index===phases.length-1){end();break;}
          index++;time=0;
          if(phases[index][0]==='escape'){
            const distance=hero?arena.escapeDistance(hero.x,hero.z):2*arena.radius;
            escape=distance/speed+2;
            phases[index][1]=escape;releaseCamera();
          }
          beat(phases[index][0]);
        }
      }
      previous=index>=0 && hero ? {x:hero.x,z:hero.z} : null;
    }};
}

// Campaign seam: the host owns the combat clock, defense pipeline, animations
// and camera lease. Never enter during the resurrection or another boss action.
export function createGreedAtomicEncounter(ritual) {
  let owner=null, spent=false, armed=false;
  return {
    tick(dt, encounter, hero) {
      if (!encounter || encounter.id!==owner || encounter.teleported || !encounter.alive) {
        ritual.cancel();
        if (!encounter || encounter.id!==owner) spent=false;
        owner=encounter?.id ?? null;
        armed=false;
        if (!encounter || encounter.teleported || !encounter.alive) return;
      }
      if(encounter.phase!==3){ritual.cancel();armed=false;return;}
      if(encounter.hpRatio<=.45)armed=true;
      if(!spent && armed && ritual.start(encounter))spent=true;
      ritual.update(dt,hero);
    },
    end(){ritual.cancel();owner=null;spent=false;armed=false;}
  };
}
