"use strict";
/**
 * V4 - memoria visual: compara capturas reais entre execucoes, sem inventar
 * "bugs" a partir de diferencas de pixels. O baseline so e atualizado quando
 * a bateria principal passou. Mantem dados fora do repositorio do jogo.
 */
const fs=require("node:fs");
const path=require("node:path");
const sharp=require("sharp");
const OUTPUT=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results");
const BASE=path.resolve(process.env.VISUAL_BASELINE||"visual-lab-baseline");
const AGENT=path.join(OUTPUT,"agente");
const CAP=path.join(AGENT,"screenshots");
const REF=path.join(BASE,"screenshots");
const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function imageNames(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir).filter(x=>/^[a-zA-Z0-9_.-]+\.png$/.test(x))
    .sort((a,b)=>(a.startsWith("00-")?-1:0)-(b.startsWith("00-")?-1:0)||a.localeCompare(b)).slice(0,24);
}
function deltaRGB(a,b){
  if(!a||!b||a.length!==b.length||a.length%3)throw Error("RGB de tamanhos diferentes");
  let sum=0,changed=0,sumA=0,sumB=0;
  for(let i=0;i<a.length;i+=3){
    const d=(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/765;
    sum+=d;
    if(d>.14)changed++;
    sumA+=(.2126*a[i]+.7152*a[i+1]+.0722*a[i+2])/255;
    sumB+=(.2126*b[i]+.7152*b[i+1]+.0722*b[i+2])/255;
  }
  const N=a.length/3;
  const fix=n=>+n.toFixed(4);
  return {pixelDifference:fix(sum/N),changedFraction:fix(changed/N),
    oldBrightness:fix(sumA/N),newBrightness:fix(sumB/N)};
}
async function sampled(file){
  return (await sharp(file).resize(160,90,{fit:"fill"}).removeAlpha().raw().toBuffer({resolveWithObject:true})).data;
}
async function pairedImage(before,after,to){
  const size={width:720,height:405};
  const left=await sharp(before).resize(size.width,size.height,{fit:"fill"}).png().toBuffer();
  const right=await sharp(after).resize(size.width,size.height,{fit:"fill"}).png().toBuffer();
  await sharp({create:{width:size.width*2,height:size.height,channels:3,background:"#111827"}})
    .composite([{input:left,left:0,top:0},{input:right,left:size.width,top:0}])
    .png().toFile(to);
}
function injectSection(htmlFile,section){
  if(!fs.existsSync(htmlFile))return;
  const source=fs.readFileSync(htmlFile,"utf8");
  fs.writeFileSync(htmlFile,source.replace("</main>",section+"</main>"));
}
async function compare(){
  fs.mkdirSync(AGENT,{recursive:true});
  const names=imageNames(CAP),previous=imageNames(REF),matched=names.filter(x=>previous.includes(x)).slice(0,12);
  let manifest={status:"sem_referencia",previousCommit:null,currentCommit:process.env.GITHUB_SHA||"local",
    comparisonNotAVisualApproval:true,frames:[],alerts:[]};
  const meta=path.join(BASE,"manifest.json");
  if(fs.existsSync(meta)){try{manifest.previousCommit=JSON.parse(fs.readFileSync(meta,"utf8")).commit||null;}catch{}}
  const outputPairs=path.join(AGENT,"comparacoes");
  if(matched.length){
    fs.mkdirSync(outputPairs,{recursive:true});
    manifest.status="comparado";
    for(const name of matched){
      try{
        const before=path.join(REF,name),after=path.join(CAP,name);
        const stats=deltaRGB(await sampled(before),await sampled(after));
        const relative="comparacoes/"+name;
        await pairedImage(before,after,path.join(outputPairs,name));
        const unstable=/camera|visual-final|99-/.test(name);
        manifest.frames.push({image:name,sideBySide:relative,unstableCamera:unstable,...stats});
        // So um sinal investigativo. Magias e camera podem mudar legitimamente.
        if(stats.changedFraction>.65 && !unstable)
          manifest.alerts.push({image:name,type:"mudanca_visual_grande",
            detail:"Comparar o par antes/depois: diferenca nao comprova regressao"});
      }catch(e){manifest.alerts.push({image:name,type:"falha_comparacao",detail:String(e.message).slice(0,240)});}
    }
  }
  fs.writeFileSync(path.join(AGENT,"comparacao.json"),JSON.stringify(manifest,null,2)+"\n");
  const cards=manifest.frames.map(f=>'<figure style="margin:12px 0"><a href="'+escapeHTML(f.sideBySide)+
    '"><img src="'+escapeHTML(f.sideBySide)+'" loading="lazy" alt="Antes e depois" style="width:100%;border-radius:10px"></a>'+
    '<figcaption style="color:#b5c5d9">'+escapeHTML(f.image)+' · pixels alterados: '+
    Math.round(f.changedFraction*100)+'% · semelhança dependente da câmera e do instante</figcaption></figure>').join("");
  injectSection(path.join(AGENT,"ver-analise.html"),
    '<h2>🧩 Memória visual — antes e depois</h2><div class="panel"><p>'+
    (manifest.status==="comparado"?"Referência: "+escapeHTML(manifest.previousCommit||"execução anterior"):
      "Primeira execução: sem referência anterior. A próxima execução aprovada criará a comparação.")+
    '. Esquerda: referência; direita: execução atual. <strong>Diferença não prova defeito.</strong></p></div>'+cards);
  fs.appendFileSync(path.join(AGENT,"DIAGNOSTICO.md"),
    "\n## Comparação histórica\n\nStatus: "+manifest.status+
    "\nReferência: "+(manifest.previousCommit||"nenhuma")+
    "\nCapturas comparadas: "+manifest.frames.length+
    "\nAlertas para inspecionar: "+manifest.alerts.length+"\n");
  process.stdout.write("Comparação V4: "+manifest.status+" ("+manifest.frames.length+" pares)\n");
  return manifest;
}
function prepare(){
  const report=path.join(AGENT,"agente-relatorio.json");
  if(!fs.existsSync(report))throw Error("Relatório do agente ausente; baseline não atualizado");
  const state=JSON.parse(fs.readFileSync(report,"utf8"));
  if(state.status!=="capturado_com_decisoes_adaptativas")throw Error("Agente falhou; baseline anterior preservado");
  fs.mkdirSync(REF,{recursive:true});
  // Limpa a referencia restaurada antes de substituir, sem tocar nas evidencias.
  for(const name of imageNames(REF))fs.unlinkSync(path.join(REF,name));
  const names=imageNames(CAP);
  if(names.length<3)throw Error("Capturas insuficientes para referencia confiavel");
  for(const name of names)fs.copyFileSync(path.join(CAP,name),path.join(REF,name));
  fs.writeFileSync(path.join(BASE,"manifest.json"),JSON.stringify({
    commit:process.env.GITHUB_SHA||"local",savedAt:new Date().toISOString(),
    files:names,source:"capturas reais do laboratório Playwright"
  },null,2)+"\n");
  process.stdout.write("Memória visual atualizada: "+names.length+" imagens\n");
}
if(require.main===module){
  (process.argv[2]==="prepare"?Promise.resolve().then(prepare):compare())
    .catch(e=>{console.error("Memória visual: "+e.message);process.exitCode=1;});
}
module.exports={deltaRGB,compare,prepare};
