import test from 'node:test';
import assert from 'node:assert/strict';
import { SwordRites } from '../sword-rites3d.js';

const enemy = (id,x=0,z=3) => ({ id,x,y:1,z,radius:.48,height:1.7,alive:true });
function encounter(blocked=()=>false) {
 const primary=enemy(1),side=enemy(2,.3),hidden=enemy(3,4);
 const hits=[],impacts=[];
 const rites=new SwordRites({
  blocked,hit:(damage,id,kind)=>hits.push({damage,id,kind}),
  event:(type,data)=>{if(type==='impact')impacts.push(data.target.id);},
  pose:()=>({base:{x:0,y:1,z:2},tip:{x:0,y:1,z:3.5}})
 });
 const ctx={from:{x:0,y:0,z:0},target:primary,others:[side,hidden],sword:'prota'};
 return {primary,side,hidden,hits,impacts,rites,ctx};
}
test('one physical swing damages primary and secondary capsule once, never distant enemy',()=>{
 const e=encounter();assert(e.rites.attack('prota',{target:e.primary}));
 for(let i=0;i<90;i++)e.rites.update(1/120,e.ctx);
 assert.deepEqual(e.hits.map(h=>h.id).sort(),[1,2]);
 assert.equal(e.impacts.filter(id=>id===2).length,1);
 assert(e.hits.every(h=>h.damage>0&&h.kind==='basic'));
});
test('secondary physical contact respects obstruction',()=>{
 const e=encounter((p)=>p.x>.15);assert(e.rites.attack('prota',{target:e.primary}));
 for(let i=0;i<90;i++)e.rites.update(1/120,e.ctx);
 assert.equal(e.hits.some(h=>h.id===2),false);
});
