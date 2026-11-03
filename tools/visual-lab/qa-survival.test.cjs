"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {decide}=require("./agent-policy.cjs");
function sample(hp,options={}){
 const dim={hp,visible:true,profile:"zarkhael",
   battle:{active:true},hydra:{phase:"emerge"},...options};
 return decide({tick:2,vision:{change:.2,flags:[]},
   state:{dim,player:{x:0,z:0,enemy:{x:8,z:8}}},
   seen:{s1:true,hydraFinished:false},lastCastTick:0});
}
test("aciona cura preventiva da QA antes de cair para HP critico",()=>{
 assert.equal(sample(89).heal,true);
 assert.equal(sample(94).heal,true);
 assert.equal(sample(95).heal,false);
 assert.equal(sample(100).heal,false);
 assert.equal(sample(0).heal,false);
});
test("nao solicita recuperacao fora da batalha de debug",()=>{
 assert.equal(sample(7,{battle:{active:false}}).heal,false);
 assert.equal(sample(7,{visible:false}).heal,false);
 assert.equal(sample(7,{profile:"captor"}).heal,false);
});
