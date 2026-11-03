"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const sharp=require("sharp");
const {deltaRGB}=require("./visual-memory.cjs");
const {parseAssessment}=require("./visual-ai.cjs");

test("comparacao RGB mede igualdade e mudanca sem alegar bug",()=>{
  assert.deepEqual(deltaRGB(Buffer.from([0,0,0]),Buffer.from([0,0,0])),
    {pixelDifference:0,changedFraction:0,oldBrightness:0,newBrightness:0});
  const value=deltaRGB(Buffer.from([0,0,0,255,255,255]),
    Buffer.from([255,255,255,0,0,0]));
  assert.equal(value.changedFraction,1);
  assert.equal(value.pixelDifference,1);
  assert.throws(()=>deltaRGB(Buffer.from([0,0]),Buffer.from([0,0])));
});
test("parecer do modelo aceita somente JSON com formato previsto",()=>{
  const obj=parseAssessment('{"resumo":"Imagem escura","observacoes":[{"tipo":"oclusão","evidencia":"centro encoberto","gravidade":"alta","confianca":"media","sugestao":"verificar câmera"}],"limites":"frame único"}');
  assert.equal(obj.observacoes[0].confianca,"media");
  assert.equal(obj.resumo,"Imagem escura");
  assert.throws(()=>parseAssessment('sem resposta JSON'));
  assert.throws(()=>parseAssessment('{"resumo":"x"}'));
  const low=parseAssessment('{"resumo":"x","observacoes":[{"gravidade":"destruir","confianca":"certeza"}]}');
  assert.equal(low.observacoes[0].gravidade,"incerta");
  assert.equal(low.observacoes[0].confianca,"baixa");
});
test("V4 cria pares e prepara referencia apenas apos run aprovado",async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"v4-frames-"));
  const output=path.join(root,"out"),baseline=path.join(root,"reference");
  const previousOutput=process.env.VISUAL_OUTPUT,previousBase=process.env.VISUAL_BASELINE;
  try{
    process.env.VISUAL_OUTPUT=output;process.env.VISUAL_BASELINE=baseline;
    delete require.cache[require.resolve("./visual-memory.cjs")];
    const memory=require("./visual-memory.cjs");
    const cap=path.join(output,"agente","screenshots");
    const ref=path.join(baseline,"screenshots");
    fs.mkdirSync(cap,{recursive:true});fs.mkdirSync(ref,{recursive:true});
    for(const name of ["00-visual-inicial.png","01-fase.png","99-visual-final.png"]){
      await sharp({create:{width:64,height:36,channels:3,background:"#FFFFFF"}}).png().toFile(path.join(cap,name));
      await sharp({create:{width:64,height:36,channels:3,background:"#000000"}}).png().toFile(path.join(ref,name));
    }
    fs.writeFileSync(path.join(output,"agente","ver-analise.html"),"<main>antigo</main>");
    fs.writeFileSync(path.join(output,"agente","DIAGNOSTICO.md"),"Relatorio\n");
    fs.writeFileSync(path.join(baseline,"manifest.json"),'{"commit":"anterior"}');
    const diff=await memory.compare();
    assert.equal(diff.status,"comparado");
    assert.equal(diff.frames.length,3);
    assert.equal(diff.frames[0].changedFraction,1);
    assert.equal(fs.existsSync(path.join(output,"agente","comparacoes","00-visual-inicial.png")),true);
    assert.match(fs.readFileSync(path.join(output,"agente","ver-analise.html"),"utf8"),/Memória visual/);
    fs.writeFileSync(path.join(output,"agente","agente-relatorio.json"),'{"status":"falhou"}');
    assert.throws(()=>memory.prepare(),/preservado/);
    fs.writeFileSync(path.join(output,"agente","agente-relatorio.json"),'{"status":"capturado_com_decisoes_adaptativas"}');
    memory.prepare();
    assert.ok(fs.existsSync(path.join(baseline,"manifest.json")));
  }finally{
    if(previousOutput===undefined)delete process.env.VISUAL_OUTPUT;else process.env.VISUAL_OUTPUT=previousOutput;
    if(previousBase===undefined)delete process.env.VISUAL_BASELINE;else process.env.VISUAL_BASELINE=previousBase;
    fs.rmSync(root,{recursive:true,force:true});
  }
});
