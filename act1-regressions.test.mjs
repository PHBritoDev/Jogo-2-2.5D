import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createDirector} from './cutscenes3d.js';
import {distortedScene,guillotineScene,villagerScene} from './act3-flow.js';
import {cageScene,holeScene} from './act1-flow.js';
import {MASSACRE_SPOT,SEWER_DOOR,SEWER_TRAIL,JOURNEY_ENEMIES} from './act1-world-layout.js';
import {createTerrain} from './world3d-terrain.js';
const source=readFileSync(new URL('./mundo-3d-prototype.js',import.meta.url),'utf8');
function handler(name){const start=source.indexOf('function '+name+'(');const end=source.indexOf('\n}\n',start+10)+2;return source.slice(start,end);}
test('ação do guardião do Ato I não inicia o grupo nem a dimensão do Ato III',()=>{
 const calls=[];
 const sandbox={player:{position:{}},storyDo2:()=>false,storyDo4:()=>false,storyDo5:()=>false,storyDo6:()=>false,
  storyFlash:()=>calls.push('flash'),worldAudio:{corrupt:()=>calls.push('sound')},pack:{clones:[{holder:{position:{x:-760,y:-2000,z:-79},rotation:{y:0}}}]},storyAnchors:{},distortControls:()=>{throw Error('Ato III invadiu o Ato I');}};
 vm.createContext(sandbox);vm.runInContext(handler('storyDo3')+'\n'+handler('storyDo')+"\nstoryDo('surgir-guardiao',{});",sandbox);
 assert.equal(sandbox.storyAnchors.enemy.x,-760);assert.equal(sandbox.storyAnchors.enemy.z,-79);assert.deepEqual(calls,['flash','sound']);
});
test('Ato III conserva suas ações próprias sem colidir com despertar/guardião do Ato I',()=>{
 const ids=scenes=>scenes.flatMap(list=>list.flatMap(s=>s.type==='do'?[s.id]:(s.with||[]).map(x=>x.id)));
 const third=ids([distortedScene(),guillotineScene(),villagerScene()]);
 assert.ok(third.includes('ato3-surgir-guardiao'));assert.ok(third.includes('ato3-piscar'));assert.ok(third.includes('ato3-anoitecer'));
 assert.ok(!third.includes('surgir-guardiao'));assert.ok(!third.includes('piscar'));
 assert.ok(ids([holeScene()]).includes('piscar'));
});
test('despertar obrigatório recusa skip mas permite concluir pela sequência normal',()=>{
 const done=[];const d=createDirector({end:(_,skipped)=>done.push(skipped)});
 d.play('despertar',[{type:'shot',id:'olhos',dur:3},{type:'say',who:'Anjo',text:'Bem-vindo'}],null,{skippable:false});
 assert.equal(d.skip(),false);d.tap();assert.equal(d.index,0);d.update(3);d.tap();assert.deepEqual(done,[false]);
 d.play('outra',[{type:'wait',dur:30}]);assert.equal(d.skip(),true);assert.deepEqual(done,[false,true]);
});
test('crianças pedem ajuda antes da transformação e protagonista reage depois',()=>{
 const s=cageScene(),transform=s.findIndex(x=>x.id==='transformacao');
 assert.ok(s.slice(0,transform).some(x=>x.text?.includes('Socorro')));
 assert.ok(s.slice(0,transform).some(x=>x.text==='O que está acontecendo?'));
 assert.ok(s.slice(transform+1).some(x=>x.text?.includes('já foram possuídas')));
 assert.ok(s[transform].dur>=6);
});
test('trilha distante continua transitável e os seguidores nascem fora do lago',()=>{
 const t=createTerrain({passes:[{points:SEWER_TRAIL,r:7}],paths:[{points:SEWER_TRAIL,r:4,fade:5}]});
 for(let i=1;i<SEWER_TRAIL.length;i++)for(let j=0;j<=20;j++){const a=SEWER_TRAIL[i-1],b=SEWER_TRAIL[i],k=j/20;assert.ok(t.walkable(a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k));}
 assert.ok(Math.hypot(SEWER_DOOR.x+12.2,SEWER_DOOR.z+44.5)>140);
 assert.ok(Math.hypot(MASSACRE_SPOT.x+12.2,MASSACRE_SPOT.z+44.5)>100);
 for(const p of JOURNEY_ENEMIES)assert.ok(Math.hypot(p.x+27,p.z+88)>12.5);
});
test('GLB exportado contém quatro adultos e duas crianças próprias',()=>{
 const b=readFileSync(new URL('./Moradores-216.glb',import.meta.url));assert.equal(b.toString('utf8',0,4),'glTF');
 const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));const roots=g.scenes[g.scene||0].nodes.map(i=>g.nodes[i].name);
 for(const n of ['Iria','Mara','Teo','Lia','CriancaA','CriancaB'])assert.ok(roots.includes(n),n);
 assert.ok(b.length<800000);assert.ok(g.nodes.some(n=>n.name==='CriancaB_head'));
});
test('corrida exportada traz a referência Idle do próprio herói',()=>{
 const b=readFileSync(new URL('./Protagonista-corrida-216.glb',import.meta.url));const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 assert.deepEqual(g.animations.map(a=>a.name).sort(),['Idle','Running']);
 for(const a of g.animations){assert.ok(a.channels.length>20);for(const c of a.channels)assert.ok(g.nodes[c.target.node]);}
 assert.ok(b.length<200000);
});
