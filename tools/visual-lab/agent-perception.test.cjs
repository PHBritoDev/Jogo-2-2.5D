"use strict";
const test=require("node:test"), assert=require("node:assert/strict");
const {inspectFrame,cameraWinner,summarizeRun}=require("./agent-perception.cjs");
function fill(w,h,value){return new Uint8Array(w*h*3).fill(value);}
function centerBlock(w,h){const a=fill(w,h,140);for(let y=Math.floor(h/3);y<h*2/3;y++)for(let x=Math.floor(w/3);x<w*2/3;x++){const i=(y*w+x)*3;a[i]=a[i+1]=a[i+2]=0;}return a;}
test("inspecao 3x3 e brancos estourados",()=>{
 const v=inspectFrame(fill(36,27,255),36,27);
 assert.equal(v.zones.length,9);
 assert.ok(v.flags.includes("brilho_encobrindo_tela"));
 assert.ok(v.quality<60);
});
test("regiao central coberta deve penalizar enquadramento",()=>{
 const w=42,h=30,black=centerBlock(w,h),open=fill(w,h,140);
 const b=inspectFrame(black,w,h),a=inspectFrame(open,w,h);
 assert.ok(b.center.dark>.9);
 assert.ok(b.quality<a.quality);
 assert.ok(b.flags.includes("possivel_objeto_escuro_obstruindo_camera")||
  b.flags.includes("centro_sem_visibilidade"));
});
test("movimento de pixel diferencia quadro parado e animado",()=>{
 const a=fill(36,24,40),b=fill(36,24,160);
 const still=inspectFrame(a,36,24,a);
 const changed=inspectFrame(b,36,24,a);
 assert.ok(still.flags.includes("imagem_quase_estatica"));
 assert.ok(changed.motionFraction>.9);
 assert.ok(changed.flags.includes("mudanca_bruta_de_quadro"));
});
test("prioriza camera por qualidade real da imagem",()=>{
 const a=inspectFrame(centerBlock(45,36),45,36),b=inspectFrame(fill(45,36,145),45,36);
 const w=cameraWinner([{id:"a",vision:a},{id:"b",vision:b}]);
 assert.equal(w.id,"b");
 assert.equal(cameraWinner([]),null);
});
test("resumo agrega marcadores e valores de geometria",()=>{
 const d=summarizeRun({decisions:[
  {tick:1,phase:"emerge",vision:{quality:50,flags:["centro_sem_visibilidade"]},executed:{buttons:["a"]},sceneProbe:{hydra:{phase:"emerge",bodyBottomRelativeToGround:1.5},renderer:{calls:900}}},
  {tick:2,phase:"charge",vision:{quality:80,flags:[]},executed:{buttons:["f"]}}
 ]});
 assert.equal(d.steps,2);assert.equal(d.flagCounts.centro_sem_visibilidade,1);
 assert.ok(d.structuralWarnings.some(i=>i.type==="possivel_hidra_acima_do_solo"));
 assert.equal(d.averageVisibility,65);
});
test("buffers inválidos são rejeitados",()=>{
 assert.throws(()=>inspectFrame(fill(2,2,0),8,8),/invalido/);
});
