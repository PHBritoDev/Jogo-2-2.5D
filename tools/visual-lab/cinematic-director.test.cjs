"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const sharp=require("sharp");
const {analyzeBuffer,compareBuffers,qualityFlags,evaluate}=require("./cinematic-director.cjs");
test("pixels identicos permanecem identicos; mudancas reais sao contadas",()=>{
 const a=Buffer.alloc(160*90*3,40),b=Buffer.from(a);assert.equal(compareBuffers(a,b).changedFraction,0);
 for(let p=0;p<160*45;p++){b[p*3]=180;b[p*3+1]=150;}
 assert.ok(compareBuffers(a,b).changedFraction>.45);
});
test("sobreexposicao e escuridao sao reconhecidas sem inventar arte",()=>{
 const white=analyzeBuffer(Buffer.alloc(160*90*3,255));
 const dark=analyzeBuffer(Buffer.alloc(160*90*3,0));
 assert.equal(white.highlightClipping,1);
 assert.ok(qualityFlags(white,"impact").some(x=>x.code==="CLIPPED_HIGHLIGHTS"));
 assert.ok(qualityFlags(dark,"portrait").some(x=>x.code==="NEAR_BLACK"));
});
test("diretor compara capturas, preserva quadro original e nao aprova artisticamente",async()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),"cinema-director-"));
 try{
  const folder=path.join(base,"current"),ref=path.join(base,"reference");fs.mkdirSync(folder);fs.mkdirSync(ref);
  const img=async(file,color)=>sharp({create:{width:160,height:90,channels:3,background:color}}).png().toFile(file);
  await img(path.join(folder,"a.png"),"#333355");await img(path.join(folder,"b.png"),"#b34025");
  await img(path.join(ref,"a.png"),"#313355");
  const d=await evaluate({folder,frameNames:["a","b"],referenceFolder:ref});
  assert.equal(d.frames.length,2);assert.ok(d.transitions[0].changedFraction>.7);
  assert.equal(d.comparisons.length,1);assert.equal(d.artisticSimilarity.score,null);
  assert.equal(d.approvedArtistic,false);assert.equal(d.approvedTechnical,true);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
