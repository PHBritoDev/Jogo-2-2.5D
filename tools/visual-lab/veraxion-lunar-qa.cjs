"use strict";
/** Mod 294 — QA REAL em WebGL do filme do Devorador Lunar no mesmo jogo publicado.
 * Capturas + vídeo em landscape e portrait; valida efeitos realmente visíveis.
 * Não finge medir semelhança artística com referência que não foi entregue ao runner.
 */
const {chromium}=require("playwright"),sharp=require("sharp"),fs=require("node:fs"),path=require("node:path");
const cinematicDirector=require("./cinematic-director.cjs");
const base=(process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const out=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","devorador-mod289");
fs.mkdirSync(out,{recursive:true});
const sizes={landscape:{width:900,height:506},portrait:{width:393,height:852}};
const frames=[
 ["01-gigante-silhueta",10.2],["02-rosto-chifres-olhos",11.55],
 ["03-buraco-formando",13.6],["04-buraco-carga",16.6],
 ["05-arremesso",18.6],["06-chegada-terra",20.6],
 ["07-explosao-planeta",22.5],["08-cupula-terra",24.35],
 ["09-explosao-na-dimensao",25.22],["10-onda-fumaca",25.65],
 ["11-aviso-no-chao",26.33]
];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function brightness(file){
 const x=await sharp(file).resize(144,81).removeAlpha().raw().toBuffer();
 let bright=0,color=0,dark=0;
 for(let i=0;i<x.length;i+=3){let r=x[i],g=x[i+1],b=x[i+2];if(Math.max(r,g,b)>22)bright++;if(Math.max(r,g,b)-Math.min(r,g,b)>36)color++;if(Math.max(r,g,b)<9)dark++;}
 return {lit:+(bright/(x.length/3)).toFixed(3),chromatic:+(color/(x.length/3)).toFixed(3),black:+(dark/(x.length/3)).toFixed(3)};
}
async function pixelDifference(a,b){
 const x=await sharp(a).resize(160,90).removeAlpha().raw().toBuffer();
 const y=await sharp(b).resize(160,90).removeAlpha().raw().toBuffer();
 let sum=0,changed=0;for(let i=0;i<x.length;i+=3){const d=Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2]);sum+=d;if(d>30)changed++;}
 return {meanDelta:+(sum/x.length).toFixed(2),changeFraction:+(changed/(x.length/3)).toFixed(3)};
}
async function main(){
 const report={mod:294,build:process.env.GITHUB_SHA||"local",platform:"Chromium headless SwiftShader",modes:{},approved:false,artisticSimilarity:"NÃO MEDIDA: nunca confundir QA funcional com 80% de fidelidade artística",scope:"Câmera, buraco negro, impacto planetário e retorno à arena; monstro lunar congelado"};
 const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 try{
 for(const [mode,viewport] of Object.entries(sizes)){
  const folder=path.join(out,mode);fs.mkdirSync(folder,{recursive:true});
  const data=report.modes[mode]={frames:[],pageErrors:[],consoleErrors:[],failedRequests:[],ready:false,visualTransitions:{},qualityFlags:[]};
  const ctx=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:true,isMobile:true,recordVideo:{dir:folder,size:viewport}});
  const page=await ctx.newPage(),vid=page.video();
  page.on("pageerror",e=>data.pageErrors.push(e.message.slice(0,350)));
  page.on("console",m=>{if(m.type()==="error")data.consoleErrors.push(m.text().slice(0,400));});
  page.on("requestfailed",req=>data.failedRequests.push(req.url().slice(0,180)));
  try{
   await page.goto(base+"/mundo-3d-prototype.html?testeDimensao=bishop4&testUltBispo4=1&debug3d=1&qa=mod289",
     {waitUntil:"domcontentloaded",timeout:40000});
   await page.waitForFunction(()=>typeof window.SevenSinsDebug3D?.luState==="function",null,{timeout:110000});
   let started=false;
   for(let i=0;i<180;i++){
    const state=await page.evaluate(()=>{
     const D=window.SevenSinsDebug3D;
     if(D.dimState().vs){try{D.vsGo();}catch{}}
     return {dim:D.dimState(),lu:D.luState()};
    });
    if(state.lu.t>=.2&&state.dim.battle?.active){started=true;break;}
    if(i>8&&state.dim.battle?.active){
     // Inicializa o GLB mesmo se o game loop ainda não o pediu; o primeiro luStart() inicia preload.
     const startedNow=await page.evaluate(()=>window.SevenSinsDebug3D.luStart());
     if(startedNow){started=true;break;}
    }
    await pause(450);
   }
   if(!started)throw Error("Ultimate não iniciou em luta real do Bispo 4");
   // Acelera exclusivamente o relógio de QA. Não altera o jogo normal nem pula quadros.
   // Velocidade real evita perder quadros curtos entre o retorno à arena e a fumaça.
   await page.evaluate(()=>window.SevenSinsDebug3D.speed(1));
   data.ready=true;
   for(const [name,target] of frames){
    let h=await page.waitForFunction(t=>{
      const d=window.SevenSinsDebug3D?.luState();
      if(!d||d.none)return {finished:true,t:0};
      return d.t>=t?d:null;
     },target,{timeout:90000,polling:130});
    const st=await h.jsonValue();
    if(st.finished)throw Error(name+": fase não alcançada antes do fim da cinematic (não esperar 90s)");
    const file=path.join(folder,name+".png");
    await page.screenshot({path:file,animations:"disabled",timeout:30000});
    const bytes=fs.statSync(file).size;
    const metric=await brightness(file);
    data.frames.push({name,t:st.t,phase:st.phase,calls:st.calls,tris:st.tris,bytes,...metric});
    if(bytes<9500)throw Error(name+": tela vazia ou screenshot inválido ("+bytes+" bytes)");
    if(st.t<26&&metric.lit<.065)throw Error(name+": quadro quase completamente preto ("+metric.lit+")");
    if(st.t<26&&st.calls===0)throw Error(name+": nenhuma geometria renderizada");
   }
   // Testa se a transição do planeta para a arena realmente altera pixels, não apenas um evento JS.
   const scene=(name)=>path.join(folder,name+".png");
   for(const [label,a,b] of [["planet-to-arena","08-cupula-terra","09-explosao-na-dimensao"],["arena-explosion-to-smoke","09-explosao-na-dimensao","10-onda-fumaca"]]){
     const delta=await pixelDifference(scene(a),scene(b));data.visualTransitions[label]=delta;
     if(delta.changeFraction<.025)data.qualityFlags.push(label+": transição visual quase estática — revisar VFX");
   }
   data.qualityFlags.push("Fidelidade artística 80% depende de comparação humana com referências; não avaliada pelo bot");
   // Diretor cinematografico reutilizavel: mede exposicao, movimento e comparacoes com baseline.
   const baselineRoot=process.env.CINEMA_BASELINE_DIR||null;
   const referenceRoot=process.env.CINEMA_REFERENCE_DIR||null;
   data.director=await cinematicDirector.evaluate({folder,frameNames:frames.map(([name])=>name),
     baselineFolder:baselineRoot?path.join(baselineRoot,mode):null,
     referenceFolder:referenceRoot?path.join(referenceRoot,mode):null});
   fs.writeFileSync(path.join(folder,"diretor-cinematografico.json"),JSON.stringify(data.director,null,2)+"\n");
   data.qualityFlags.push(...data.director.findings.map(f=>f.code+": "+f.message));
   if(data.pageErrors.length)throw Error("JS: "+data.pageErrors.slice(0,4).join("; "));
   if(data.consoleErrors.some(x=>/shader|WebGLProgram|CompileError|ERROR: 0:|Failed to compile/i.test(x)))
     throw Error("Shader: "+data.consoleErrors.slice(0,4).join("; "));
   if(data.failedRequests.some(x=>/DevoradorLunar\.glb|veraxion-lunar/i.test(x)))
     throw Error("Arquivo da ultimate não carregou: "+data.failedRequests.slice(0,5).join("; "));
   data.approved=true;
  }catch(e){data.error=String(e.stack||e);data.approved=false;report.error=data.error;process.exitCode=1;}
  finally{await ctx.close().catch(()=>{});try{data.video=path.basename(await vid.path());}catch{}}
 }
 report.approved=Object.values(report.modes).every(x=>x.approved===true);
 fs.writeFileSync(path.join(out,"relatorio.json"),JSON.stringify(report,null,2)+"\n");
 console.log("[MOD 294] "+JSON.stringify({approved:report.approved,modes:Object.fromEntries(Object.entries(report.modes).map(([k,v])=>[k,{approved:v.approved,frames:v.frames.length,transitions:v.visualTransitions,qualityFlags:v.qualityFlags,director:v.director?{findings:v.director.findings.length,artistic:v.director.artisticSimilarity.status}:null,error:v.error?.slice(0,280)}]))}));
 if(!report.approved)process.exitCode=1;
 }finally{await browser.close().catch(()=>{});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
