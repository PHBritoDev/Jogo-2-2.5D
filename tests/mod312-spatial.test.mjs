import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../ascension-layout.js';
import fs from 'node:fs';

test('Mod 312: corredor da caverna tem passagem livre, teto e parede com folga',()=>{
 for(const k of L.CAVE.corridors.filter(c=>!c.sealed)){
  for(let i=2;i<=8;i++){
   const t=i/10,x=k.a[0]+(k.b[0]-k.a[0])*t,z=k.a[1]+(k.b[1]-k.a[1])*t;
   assert.ok(L.caveField(x,z)>.75,'rocha no centro '+k.id+' '+i);
   const hazard=L.caveHazard(x,z);
   if(!hazard&&!L.CAVE.pools.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+.35)&&!L.CAVE.pillars.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+.35)){
    assert.ok(L.caveWalk(x,z),'corredor bloqueado '+k.id+' '+i);
   }
   assert.ok(L.caveCeil(x,z)>3,'teto abaixo do protagonista: '+k.id);
  }
 }
});
test('Mod 312: ultimo patamar conectado a ilha por ponte 3D com piso continuo',()=>{
 const end=L.ascentStairsEnd(),top=L.ascentTopY();
 for(let z=-end+6;z>=-end-21;z-=.5){
  assert.equal(L.onAscentBridge(0,z),true,'ponte deveria existir z='+z);
  assert.equal(L.ascentWalk(0,z),true,'passagem seria bloqueada em '+z);
  assert.equal(L.ascentHazard(0,z),false,'não pode cair onde existe a ponte '+z);
  assert.ok(Math.abs(L.ascentFloor(0,z)-top)<.00001,'piso deve apoiar no topo da escada '+z);
 }
 const src=fs.readFileSync(new URL('../ascension-ascent3d.js',import.meta.url),'utf8');
 assert.match(src,/passagem-solida-escada-ilha/,'precisa existir malha renderizada correspondente');
});
test('Mod 312: sem paredes invisiveis nas margens do abismo',()=>{
 assert.equal(L.caveHazard(8,-60),true);
 assert.equal(L.caveHazard(0,-60),false);
 assert.equal(L.ascentHazard(L.ASCENT.width/2+.5,-100),true);
 const c=L.islandCenter();
 assert.equal(L.ascentHazard(c.x,c.z),false);
 assert.equal(L.ascentHazard(c.x+95,c.z),true,'além da ilha não há piso imaginário');
});
