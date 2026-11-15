"use strict";
/* Camera livre de QA. Executar: VISUAL_SHOTS='[{"name":"vila","x":-12.2,"z":-44.5,"distance":35,"height":18}]' node tools/visual-lab/photographer.cjs */
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","photographer");
const base=process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173";
const presets={
 eldoria:{x:-12.2,z:-44.5,distance:40,height:18},
 floresta:{x:-36,z:-126,distance:30,height:16} // Clareira do Musgo (FOREST_CLEARINGS em act1-world-layout.js)
};
function parseShots(raw){
 const arr=raw?JSON.parse(raw):[{name:"eldoria",preset:"eldoria"},{name:"floresta",preset:"floresta"}];
 if(!Array.isArray(arr)||!arr.length||arr.length>12)throw Error("Forneca de 1 a 12 fotos");
 return arr.map((v,i)=>{
  const p=v.preset?presets[v.preset]:null;
  if(v.preset&&!p)throw Error("Preset desconhecido: "+v.preset);
  const x=Number(v.x??p?.x),z=Number(v.z??p?.z),y=Number(v.y??4);
  const distance=Number(v.distance??p?.distance??35),height=Number(v.height??p?.height??18);
  const yaw=Number(v.yaw??0);
  if(![x,z,y,distance,height,yaw].every(Number.isFinite)||distance<2||distance>500||height<1||height>250)throw Error("Coordenadas invalidas para foto "+i);
  const name=String(v.name||v.preset||"foto-"+i).replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,60);
  if(!name)throw Error("Nome da foto vazio");
  return {name,x,z,y,distance,height,yaw};
 });
}
/** Julga uma captura sem abortar o lote: antes, a 1ª foto preta/duplicada lançava erro e descartava as demais. */
function judgeCapture({spread,hash,seen,cameraError}){
 if(cameraError>2)return {status:"suspeita",reason:"camera sobrescrita (erro "+cameraError.toFixed(2)+" m)"};
 if(spread<4)return {status:"suspeita",reason:"quase uniforme (desvio "+spread.toFixed(2)+"): tela preta, carregamento ou render travado"};
 if(seen&&seen.has(hash))return {status:"suspeita",reason:"identica a uma foto anterior (camera ou renderizador travado)"};
 return {status:"ok",reason:""};
}
async function main(){
 const {chromium}=require("playwright"),sharp=require("sharp"); // carregados só na execução: os testes puros não dependem do navegador
 fs.mkdirSync(root,{recursive:true});
 const shots=parseShots(process.env.VISUAL_SHOTS),results=[],errors=[];
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  const page=await browser.newPage({viewport:{width:852,height:480},deviceScaleFactor:1});
  page.setDefaultTimeout(30000);
  page.on("pageerror",e=>errors.push(e.message.slice(0,300)));
  await page.goto(base+"/mundo-3d-prototype.html?debug3d=1&qaPhotographer=1",{waitUntil:"domcontentloaded",timeout:35000});
  const ready=await page.waitForFunction(()=>{
   if((document.getElementById("loading")?.textContent||"").includes("Falha ao montar o mundo 3D"))return "failed";
   return typeof window.SevenSinsDebug3D?.fly==="function"?"ready":false;
  },null,{timeout:115000}).then(x=>x.jsonValue());
  if(ready!=="ready")throw Error("Mundo nao carregou: "+ready);
  // O screenshot do #scene inclui o HUD sobreposto: o desvio de cor media os botoes e nunca acusava tela vazia.
  // Para a foto, so o canvas aparece (CSS da captura; o jogo nao muda). VISUAL_HUD=1 mantem o HUD.
  if(process.env.VISUAL_HUD!=="1")await page.addStyleTag({content:"body *{visibility:hidden!important}canvas#scene{visibility:visible!important}"});
  const hashes=new Set();
  for(const shot of shots){
   const target=[shot.x,shot.y,shot.z];
   const from=[shot.x+Math.sin(shot.yaw)*shot.distance,shot.y+shot.height,shot.z+Math.cos(shot.yaw)*shot.distance];
   const file=String(results.length+1).padStart(2,"0")+"-"+shot.name+".png";
   try{
    await page.evaluate(({from,target})=>{window.SevenSinsDebug3D.freeRoam();window.SevenSinsDebug3D.fly(from,target);},{from,target});
    await page.waitForTimeout(1700);
    let capture,spread,hash,verdict,camera,error,attempts=0;
    do{ // o WebGL pode nao ter desenhado ainda: repete ate 3 vezes antes de marcar suspeita
     if(attempts)await page.waitForTimeout(1500*attempts);
     camera=await page.evaluate(()=>window.SevenSinsDebug3D.cam());error=Math.hypot(...camera.map((v,i)=>v-from[i]));
     capture=await page.locator("#scene").screenshot({timeout:30000});
     hash=require("node:crypto").createHash("sha256").update(capture).digest("hex");
     const stats=await sharp(capture).stats();spread=stats.channels.slice(0,3).reduce((sum,c)=>sum+c.stdev,0)/3;
     verdict=judgeCapture({spread,hash,seen:hashes,cameraError:error});attempts++;
    }while(verdict.status!=="ok"&&attempts<3);
    fs.writeFileSync(path.join(root,file),capture);hashes.add(hash);
    const metrics=await page.evaluate(()=>({state:window.SevenSinsDebug3D.state?.()??null,render:window.SevenSinsDebug3D.rinfo?.()??null}));
    results.push({shot,file,from,target,camera,error,metrics,sha256:hash,colorSpread:+spread.toFixed(2),attempts,...verdict});
   }catch(e){results.push({shot,file:null,from,target,status:"falha",reason:String(e.message||e).slice(0,300)});}
  }
  const ok=results.some(r=>r.status==="ok"),bad=results.filter(r=>r.status!=="ok");
  fs.writeFileSync(path.join(root,"report.json"),JSON.stringify({ok,results,errors},null,2));
  console.log("FOTOGRAFO QA: "+results.length+" capturas ("+bad.length+" suspeitas/falhas)");
  if(!ok)process.exitCode=1;
 }catch(e){
  errors.push(String(e.message||e));
  fs.writeFileSync(path.join(root,"report.json"),JSON.stringify({ok:false,results,errors},null,2));
  console.error(errors.join(" | "));process.exitCode=1;
 }finally{await browser?.close().catch(()=>{});}
}
if(require.main===module)main();
module.exports={parseShots,presets,judgeCapture};
