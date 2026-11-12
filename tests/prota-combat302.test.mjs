import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PROTA_MOVES,PROTA_LOCO,PROTA_JUMP,PROTA_DASH,protaMoveDef,protaSegments,pickTarget,warpStep,makeEnergy,energyStep,energyTouches} from '../prota-combat3d.js';
import {SwordRites} from '../sword-rites3d.js';

const target=(o={})=>({id:7,x:0,y:1,z:3,alive:true,radius:.48,height:1.7,...o});

test('Mod 302: cinco golpes de chão visualmente distintos, com fases e classificação de hitbox',()=>{
 const g=PROTA_MOVES.ground;assert.equal(g.length,5);
 assert.equal(new Set(g.map(m=>`${m.clip}@${m.start}`)).size,5,'cada golpe usa um trecho próprio de clipe');
 for(const m of g){const d=protaMoveDef('ground',g.indexOf(m));
  assert(['physical','energy','hybrid'].includes(m.hit));assert(d.open>0&&d.open<d.close&&d.close<d.duration,'startup < ativo < recuperação');
  assert(d.buffer<d.open&&d.cancelAt>d.close&&d.cancelAt<d.duration,'buffer no startup, cancelamento depois do follow-through');
  if(m.hit!=='physical'){assert(m.energy,'energia/híbrido precisam do volume de energia');assert(m.energy.at>=m.open-.05&&m.energy.at<=d.duration);}}
 // Mod 315: todo golpe da espada inicial solta onda de energia (hitbox real): os dois golpes antes só físicos viraram híbridos
 assert.deepEqual(g.map(m=>m.hit),['hybrid','energy','hybrid','hybrid','hybrid']);
 assert(g[2].launcher&&g[4].finisher);
 for(const mode of ['run','dash','air','plunge'])assert(protaMoveDef(mode,0).id.startsWith('Prota302_'+mode));
 const ids=protaSegments().map(s=>s.id);assert(ids.includes('Prota302_jump')&&ids.includes('Prota302_land')&&ids.includes('Prota302_arrive'));
});

test('Mod 302: locomoção explícita, salto proporcional e dash curto',()=>{
 assert(PROTA_LOCO.walk<PROTA_LOCO.run/2,'andar é bem mais lento que correr');
 assert(PROTA_LOCO.walk/PROTA_LOCO.walkNatural<1.45&&PROTA_LOCO.run/PROTA_LOCO.runNatural<1.3,'cadência do clipe perto da natural (sem patinar)');
 const apex=PROTA_JUMP.impulse**2/(2*PROTA_JUMP.gravity),air=2*PROTA_JUMP.impulse/PROTA_JUMP.gravity;
 assert(apex>1&&apex<1.3,`altura do salto ${apex}`);assert(air>.55&&air<.75,`tempo no ar ${air}`); // Mod 317 (= PR #468): ápice ~1,18 m
 assert(PROTA_DASH.distance>=4&&PROTA_DASH.distance<=6.5&&PROTA_DASH.travel<.2&&PROTA_DASH.iframes>=PROTA_DASH.travel&&PROTA_DASH.cooldown>PROTA_DASH.iframes);
});

test('Mod 302: alvo — cone, alcance, altura e linha de visão; alvo atual tem prioridade',()=>{
 const from={x:0,y:1,z:0};
 assert.equal(pickTarget(from,0,[target({z:12})]),null,'longe demais');
 assert.equal(pickTarget(from,0,[target({x:-3,z:-3})]),null,'atrás');
 assert.equal(pickTarget(from,0,[target()],{blocked:()=>true}),null,'parede entre os dois');
 assert.equal(pickTarget(from,0,[target({y:7})]),null,'alto demais');
 const a=target({id:1,x:.6,z:3}),b=target({id:2,x:-.5,z:3.4});
 assert.equal(pickTarget(from,0,[a,b]).id,1);assert.equal(pickTarget(from,0,[a,b],{current:2}).id,2);
});

test('Mod 302: motion warping encurta a distância só no startup, sem passar do alvo nem teleportar',()=>{
 const def=protaMoveDef('ground',3),t=target({z:4}),p={x:0,z:0},a={t:0,yaw:0};let moved=0,maxStep=0;
 for(let i=0;i<60;i++){a.t+=1/60;const w=warpStep(a,def,p,t,1/60);p.x+=w.dx;p.z+=w.dz;a.yaw=w.yaw;const s=Math.hypot(w.dx,w.dz);moved+=s;maxStep=Math.max(maxStep,s);if(a.t>def.open)assert.equal(s,0);}
 assert(moved<=def.warp.max+1e-6);assert(maxStep<.45,'passo por quadro pequeno (não é teleporte)');
 const end=Math.hypot(t.x-p.x,t.z-p.z);assert(end>=.9&&Math.abs(end-def.aim.r)<.25,`para no ponto de contato medido no clipe (${end})`);
 const back={t:.05,yaw:0},w=warpStep(back,def,{x:0,z:0},target({z:-4}),1/60);assert.equal(w.dx,0);assert.equal(w.dz,0);
});

test('Mod 302: energia acerta quando a FRENTE visível encosta, nunca atrás da parede',()=>{
 const spec=PROTA_MOVES.ground[1].energy,t=target({z:5,y:1.05});
 const e=makeEnergy(spec,{x:0,y:0,z:0},0);let hitAt=-1;
 for(let i=0;i<60&&!e.done;i++){if(energyStep(e,1/60,t)&&hitAt<0){hitAt=e.radius;break;}}
 assert(hitAt>=t.z-t.radius-1e-6&&hitAt<=t.z+t.radius+1,'raio da energia no momento do dano chega ao corpo');
 const early=makeEnergy(spec,{x:0,y:0,z:0},0);assert(!energyTouches(early,t),'no nascimento ainda não alcança');
 const wall=makeEnergy(spec,{x:0,y:0,z:0},0);wall.radius=5;assert(!energyTouches(wall,t,()=>true));
 const side=makeEnergy(spec,{x:0,y:0,z:0},0);side.radius=5;assert(!energyTouches(side,target({x:0,z:-5,y:1.05})),'fora do arco');
 const wave=makeEnergy(PROTA_MOVES.dash.energy,{x:0,y:1,z:0},0,0);let got=false;for(let i=0;i<60&&!wave.done;i++)got=got||energyStep(wave,1/60,target({z:6,y:1}));assert(got);
});

function rig({blocked=()=>false,pose}={}){
 const hits=[],events=[],from={x:0,y:0,z:0},t=target();
 const r=new SwordRites({choreography:true,blocked,moveset:(s,mode,step)=>s==='prota'?protaMoveDef(mode,step):null,drive(){},hit:(...a)=>hits.push(a),event:(k,e)=>events.push([k,e]),pose:pose||(()=>({base:{x:0,y:1,z:.3},tip:{x:0,y:1,z:1.1}}))});
 const step=s=>{for(let i=0;i<Math.round(s*60);i++)r.update(1/60,{from,target:t,sword:'prota',grounded:true});};
 return{r,hits,events,t,step,from};
}
test('Mod 302: golpe de energia só causa dano pelo volume (lâmina fora do alcance)',()=>{
 const x=rig();x.r.attack('prota',{target:x.t,mode:'ground'});x.step(.6);x.r.lastEnd=x.r.time;x.r.next=1;
 x.hits.length=0;x.t.z=5;x.r.attack('prota',{target:x.t,mode:'ground'});assert.equal(x.r.active.def.hit,'energy');x.step(1.2);
 assert.equal(x.hits.length,1);const imp=x.events.filter(([k])=>k==='impact').at(-1)[1];assert.equal(imp.by,'energy');
});
test('Mod 302: híbrido nunca dá dano dobrado (lâmina + energia = 1 acerto)',()=>{
 const x=rig({pose:()=>({base:{x:-1,y:1,z:3},tip:{x:1,y:1,z:3}})});x.r.next=4;x.r.lastEnd=0;x.r.time=.1;
 x.r.attack('prota',{target:x.t,mode:'ground'});assert.equal(x.r.active.def.hit,'hybrid');x.step(2);assert.equal(x.hits.length,1);
});
test('Mod 302: parede bloqueia a onda de energia',()=>{
 const x=rig({blocked:p=>p.z>2&&p.z<2.2});x.t.z=6;x.r.attack('prota',{target:x.t,mode:'dash'});x.step(1.6);assert.equal(x.hits.length,0,JSON.stringify(x.events.filter(([k])=>k!=='blade').map(([k,e])=>[k,e.by,e.p])));assert.equal(x.r.energies.length,0);
});
test('Mod 302: combo encadeia os cinco golpes com buffer e cancelamento no follow-through',()=>{
 const x=rig();const seen=[];
 for(let i=0;i<5;i++){if(!x.r.busy)x.r.attack('prota',{target:x.t,mode:'ground'});seen.push(x.r.active.def.id);const d=x.r.active.def;x.step(d.open+.02);x.r.attack('prota',{target:x.t,mode:'ground'});x.step(d.cancelAt-d.open);}
 assert.deepEqual(seen,[0,1,2,3,4].map(i=>'Prota302_ground_'+i));
});

test('Mod 302: integração só no protagonista (espada branca no slot prota, outras espadas medidas pelo desenho antigo)',()=>{
 const src=fs.readFileSync(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
 assert.match(src,/moveset:\(sword,mode,step\)=>newHero&&sword==='prota'/);
 assert.match(src,/buildRiteSword\(THREE,'prota-legacy'\)/);
 assert.match(src,/function dashBlockedAt/);assert.match(src,/protaVFX\.vanish/);assert.match(src,/protaVFX\.reappear/);
 const design=fs.readFileSync(new URL('../sword-design3d.js',import.meta.url),'utf8');
 assert.match(design,/if\(id==='prota'\)return buildWhiteSword\(T\)/);assert.match(design,/Espada_Branca_302/);
 for(const f of ['bispo','enemy1-squad3d.js'])assert.doesNotMatch(fs.readFileSync(new URL('../enemy1-squad3d.js',import.meta.url),'utf8'),/prota-combat3d/);
});
