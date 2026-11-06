"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {parseGlb,inspectModel}=require("./agent-v7-glb-audit.cjs");
function glb(data){
 const json=Buffer.from(JSON.stringify({asset:{version:"2.0"},...data}),"utf8");
 const padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const out=Buffer.alloc(20+padded.length);
 out.write("glTF",0,"ascii");out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
 out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);return out;
}
test("GLB v2 válido é lido sem dependências externas",()=>{
 const p=parseGlb(glb({nodes:[{name:"Root"}]}));
 assert.equal(p.json.nodes[0].name,"Root");
});
test("rejeita GLB malformado e truncado",()=>{
 assert.throws(()=>parseGlb(Buffer.alloc(5)),/truncated/);
 const b=glb({});b.writeUInt32LE(900,8);assert.throws(()=>parseGlb(b),/size differs/);
});
test("descobre animações, morph targets e nós faciais sem prometer sincronia",()=>{
 const report=inspectModel(glb({
  nodes:[{name:"JawBone"}],skins:[{joints:[0]}],
  accessors:[{count:300},{count:300}],
  meshes:[{extras:{targetNames:["MouthOpen","BlinkLeft"]},primitives:[{indices:0,attributes:{POSITION:1},targets:[{POSITION:1}]}]}],
  animations:[{name:"idle"},{name:"run"},{name:"attack_combo"},{name:"talk"}],
  textures:[{}]
 }));
 assert.equal(report.animationCoverage.idle,true);
 assert.equal(report.animationCoverage.run,true);
 assert.equal(report.animationCoverage.death,false);
 assert.deepEqual(report.facial.namedMorphs,["MouthOpen","BlinkLeft"]);
 assert.deepEqual(report.facial.namedNodes,["JawBone"]);
 assert.equal(report.triangles,100);
 assert.equal(report.note.includes("NÃO confirma"),true);
});
test("orçamento mobile informa aviso e não reprova arbitrariamente",()=>{
 const report=inspectModel(glb({meshes:[{primitives:[{indices:0}]}],accessors:[{count:60000}]}),
 {maxTriangles:1000,maxBytes:40});
 const codes=report.issues.map(x=>x.code);
 assert.ok(codes.includes("TRIANGLE_BUDGET"));
 assert.ok(codes.includes("HEAVY_GLB"));
 assert.ok(codes.includes("NO_ANIMATIONS"));
});
test("sem animações faciais usa estado não verificado",()=>{
 const r=inspectModel(glb({meshes:[{primitives:[{mode:1}]}]}));
 assert.equal(r.trianglesPartial,true);
 assert.equal(r.facial.namedMorphs.length,0);
 assert.ok(r.issues.some(x=>x.code==="FACE_NOT_DETECTED"));
});
