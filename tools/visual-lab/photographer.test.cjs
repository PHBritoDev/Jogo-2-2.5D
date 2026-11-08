"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {parseShots}=require("./photographer.cjs");
test("presets padrao e coordenadas validas",()=>{
 const shots=parseShots();
 assert.equal(shots.length,2);
 assert.equal(shots[0].name,"eldoria");
 assert.ok(Number.isFinite(shots[0].x));
});
test("permite fotografar qualquer coordenada e angulo",()=>{
 const [s]=parseShots(JSON.stringify([{name:"ponte entrada",x:120,z:-400,y:7,distance:22,height:10,yaw:1.5}]));
 assert.deepEqual([s.name,s.x,s.z,s.y,s.distance,s.height,s.yaw],["ponte-entrada",120,-400,7,22,10,1.5]);
});
test("rejeita preset inexistente",()=>assert.throws(()=>parseShots('[{"preset":"inexistente"}]'),/Preset desconhecido/));
test("rejeita coordenadas nao numericas",()=>assert.throws(()=>parseShots('[{"name":"a","x":"abc","z":2}]'),/Coordenadas invalidas/));
test("rejeita mais de doze fotos",()=>assert.throws(()=>parseShots(JSON.stringify(Array.from({length:13},()=>({x:0,z:0})))),/1 a 12/));
test("rejeita distancia fora do intervalo",()=>assert.throws(()=>parseShots('[{"x":0,"z":0,"distance":0}]'),/Coordenadas invalidas/));
