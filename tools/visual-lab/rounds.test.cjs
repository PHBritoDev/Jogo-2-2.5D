"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");

function sample(passed=true,flags={}){
  return {code:passed?0:1,report:{status:passed?"capturado_com_decisoes_adaptativas":"falhou",
    captures:["agente/screenshots/a.png","agente/screenshots/b.png","agente/screenshots/c.png"],
    decisions:[{tick:0},{tick:1}],errors:passed?[]:["Falha simulada"],
    summary:{diagnostic:{flagCounts:flags}}}};
}
test("exige codigo 0 e evidencias antes de aprovar",()=>{
  const mod=require("./rounds.cjs");
  assert.equal(mod.statusOf(sample()),true);
  assert.equal(mod.statusOf(sample(false)),false);
  assert.equal(mod.statusOf({...sample(),report:{status:"capturado_com_decisoes_adaptativas",captures:[]}}),false);
  assert.equal(mod.shouldRunThird([sample(),sample()]),false);
  assert.equal(mod.shouldRunThird([sample(false),sample()]),true);
  assert.equal(mod.shouldRunThird([sample(),sample(true,{quadro_escuro:5})]),true);
  assert.equal(mod.shouldRunThird([sample(),sample(true,{imagem_quase_estatica:9})]),false);
  assert.deepEqual(mod.visualWarnings(sample(true,{quadro_escuro:4})),[{name:"quadro_escuro",count:4}]);
});
test("duas rodadas consecutivas, depois fecha; terceira apenas para investigar",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"v5-cycle-"));
  const previous=process.env.VISUAL_OUTPUT;
  try{
    process.env.VISUAL_OUTPUT=base;
    delete require.cache[require.resolve("./rounds.cjs")];
    const {runAll}=require("./rounds.cjs");
    const sequence=[];
    const exec=(n,profile)=>{
      sequence.push(profile);
      const folder=path.join(base,"rodadas","rodada-"+n,"agente");
      fs.mkdirSync(folder,{recursive:true});
      fs.writeFileSync(path.join(folder,"ver-analise.html"),"<main>teste</main>");
      return {round:n,profile,elapsedMs:1,...sample()};
    };
    const result=runAll(exec);
    assert.deepEqual(sequence,["padrao","proximidade"]);
    assert.equal(result.status,"aprovado");
    assert.ok(fs.existsSync(path.join(base,"rodadas","abrir-rodadas.html")));
    assert.match(fs.readFileSync(path.join(base,"agente","ver-analise.html"),"utf8"),/Rodadas consecutivas V5/);
    const secondBase=fs.mkdtempSync(path.join(os.tmpdir(),"v5-cycle-retry-"));
    process.env.VISUAL_OUTPUT=secondBase;
    delete require.cache[require.resolve("./rounds.cjs")];
    const {runAll:runMore}=require("./rounds.cjs");
    const after=[];
    const execMore=(n,profile)=>{
      after.push(profile);
      return {round:n,profile,elapsedMs:1,...sample(n!==1)};
    };
    const investigated=runMore(execMore);
    assert.deepEqual(after,["padrao","proximidade","alternativo"]);
    assert.equal(investigated.status,"requer_investigacao");
    fs.rmSync(secondBase,{recursive:true,force:true});
  }finally{
    if(previous===undefined)delete process.env.VISUAL_OUTPUT;else process.env.VISUAL_OUTPUT=previous;
    delete require.cache[require.resolve("./rounds.cjs")];
    fs.rmSync(base,{recursive:true,force:true});
  }
});
