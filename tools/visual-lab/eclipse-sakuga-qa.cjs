"use strict";
/**
 * MOD 274 — QA visual do mesmo VFX e espada cosmica usados no jogo.
 * Captura no Chromium/SW WebGL, inspeciona o estado 3D e compara ligado/desligado.
 * Nao certifica fidelidade artistica ao anime nem FPS de Android fisico.
 */
const {chromium}=require("playwright");
const sharp=require("sharp"),fs=require("node:fs"),path=require("node:path");
const base=(process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const out=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","eclipse-274");
fs.mkdirSync(out,{recursive:true});
const stages=[
 {t:2.8,cam:"hero",name:"01-asas-negras-carga",phase:"charge",wing:true},
 {t:3.46,cam:"hero",name:"02-antecipacao-corte",phase:"release",rift:true},
 {t:3.93,cam:"side",name:"03-rasgo-em-viagem",rift:true},
 {t:4.5,cam:"impact",name:"04-impacto-ruptura",phase:"impact",debris:true}
];
const score=async(file)=>{
 const img=await sharp(file).resize(160,90,{fit:"fill"}).removeAlpha().raw().toBuffer();
 return img;
};
function rgbDifference(a,b){
 if(a.length!==b.length)throw Error("Imagens de dimensoes diferentes");
 let sum=0;
 for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);
 return sum/(a.length*255);
}
async function run(){
 const result={status:"incompleto",stages:[],errors:[],pixels:null,browser:"Chromium/SwiftShader"};
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage",
    "--enable-webgl","--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader",
    "--enable-unsafe-swiftshader"]});
  const context=await browser.newContext({viewport:{width:852,height:480},deviceScaleFactor:1,
    isMobile:true,hasTouch:true});
  async function capture({t,cam,name,phase,wing,rift,debris,hide=""}){
   const page=await context.newPage();
   const errs=[];
   page.on("pageerror",e=>errs.push("JS: "+e.message));
   page.on("console",m=>{if(m.type()==="error")errs.push("console: "+m.text().slice(0,350));});
   try{
    const url=base+"/vorgazhek-eclipse-preview.html?t="+t+"&cam="+cam+(hide?"&hide="+hide:"")+"&mod=274";
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForFunction(()=>window.__ready===true,null,{timeout:85000});
    const qa=await page.evaluate(()=>window.__eclipseEvidence?.()||null);
    if(!qa)throw Error("Nao existe telemetria de mesh real __eclipseEvidence");
    if(phase&&qa.phase!==phase)throw Error("Fase "+name+": esperado "+phase+", observado "+qa.phase);
    if(wing&&!qa.wingVisible)throw Error("Asas nao renderizaveis: "+name);
    if(rift&&!qa.riftVisible)throw Error("Rasgo carmesim nao renderizavel: "+name);
    if(debris&&qa.debrisCount===0)throw Error("Nenhum fragmento 3D no impacto: "+name);
    if(!(qa.drawCalls>0))throw Error("Nenhum draw call WebGL: "+name);
    if(errs.some(x=>/WebGLProgram|Shader Error|Failed to compile|linkProgram/i.test(x)))
      throw Error("Shader WebGL: "+errs.join("; ").slice(0,500));
    const file=name+".png";
    await page.screenshot({path:path.join(out,file),timeout:25000,animations:"disabled"});
    return {file,url,qa,errors:errs.slice(0,8)};
   }finally{await page.close().catch(()=>{});}
  }
  for(const item of stages)result.stages.push(await capture(item));
  const off=await capture({t:2.8,cam:"hero",name:"00-carga-sem-camada-sakuga",hide:"sakuga",phase:"charge"});
  const diff=rgbDifference(await score(path.join(out,off.file)),
    await score(path.join(out,stages[0].name+".png")));
  result.pixels={beforeAfterDifference:+diff.toFixed(4),threshold:0.014,
    note:"Diferença maior que o limiar comprova apenas que o efeito alterou o frame."};
  if(diff<.014)throw Error("VFX novo nao alterou o quadro em relacao a camada escondida: "+diff);
  result.status="capturado_para_revisao";
  fs.writeFileSync(path.join(out,"relatorio.json"),JSON.stringify(result,null,2)+"\n");
  const imgs=result.stages.map(x=>'<figure><img src="'+x.file+
     '" style="width:100%"><figcaption>'+x.file+' · fase '+x.qa.phase+
     ' · drawcalls '+x.qa.drawCalls+'</figcaption></figure>').join("");
  const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Eclipse Mod 274 · evidencias reais</title>'+
    '<style>body{font:15px system-ui;background:#090512;color:#eee;max-width:1050px;margin:auto;padding:20px}'+
    'main{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:10px}'+
    'figure{margin:0;background:#231326;padding:9px;border-radius:12px}figcaption{margin:8px 0;color:#cabaca}</style>'+
    '<h1>Mod 274 — Eclipse da Dívida</h1><p>Capturas reais do preview com o modelo e efeitos usados pelo jogo. '+
    'Não confirma qualidade final em Android.</p><main>'+imgs+'</main></html>';
  fs.writeFileSync(path.join(out,"ver-eclipse.html"),html);
  console.log("[ECLIPSE 274] "+result.status+" | diferença de pixels="+diff.toFixed(4));
 }catch(e){
  result.status="falhou";result.errors.push(String(e.stack||e));
  fs.writeFileSync(path.join(out,"relatorio.json"),JSON.stringify(result,null,2)+"\n");
  console.error("[ECLIPSE 274] "+e.message);
  process.exitCode=1;
 }finally{await browser?.close().catch(()=>{});}
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={rgbDifference};
