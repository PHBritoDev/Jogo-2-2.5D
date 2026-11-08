"use strict";
/* Camera livre de QA. Executar: VISUAL_SHOTS='[{"name":"vila","x":-12.2,"z":-44.5,"distance":35,"height":18}]' node tools/visual-lab/photographer.cjs */
const {chromium}=require("playwright"),sharp=require("sharp"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","photographer");
fs.mkdirSync(root,{recursive:true});
const base=process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173";
const presets={
 eldoria:{x:-12.2,z:-44.5,distance:40,height:18},
 floresta:{x:0,z:-85,distance:35,height:17} // Coordenada aproximada, verificar visualmente
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
  return {name,x,z,y,distance,height,yaw};
 });
}
async function main(){
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
  const hashes=new Set();
  for(const shot of shots){
   const target=[shot.x,shot.y,shot.z];
   const from=[shot.x+Math.sin(shot.yaw)*shot.distance,shot.y+shot.height,shot.z+Math.cos(shot.yaw)*shot.distance];
   await page.evaluate(({from,target})=>{window.SevenSinsDebug3D.freeRoam();window.SevenSinsDebug3D.fly(from,target);},{from,target});
   await page.waitForTimeout(1700);
   const camera=await page.evaluate(()=>window.SevenSinsDebug3D.cam());
   const error=Math.hypot(...camera.map((v,i)=>v-from[i]));
   if(error>2)throw Error("Camera foi sobrescrita durante "+shot.name+" (erro "+error.toFixed(2)+"m)");
   const file=String(results.length+1).padStart(2,"0")+"-"+shot.name+".png";
   const capture=await page.locator("#scene").screenshot({path:path.join(root,file),timeout:30000});
   const crypto=require("node:crypto");const hash=crypto.createHash("sha256").update(capture).digest("hex");
   const stats=await sharp(capture).stats();
   const spread=stats.channels.slice(0,3).reduce((sum,c)=>sum+c.stdev,0)/3;
   if(spread<4)throw Error("Imagem quase uniforme (tela preta, carregamento ou render travado): "+shot.name+" / desvio="+spread.toFixed(2));
   if(hashes.has(hash))throw Error("Imagem duplicada: "+shot.name+" (camera ou renderizador travado)");
   hashes.add(hash);
   const metrics=await page.evaluate(()=>({state:window.SevenSinsDebug3D.state?.()??null,render:window.SevenSinsDebug3D.rinfo?.()??null}));
   results.push({shot,file,from,target,camera,error,metrics,sha256:hash,colorSpread:+spread.toFixed(2)});
  }
  fs.writeFileSync(path.join(root,"report.json"),JSON.stringify({ok:true,results,errors},null,2));
  console.log("FOTOGRAFO QA: "+results.length+" capturas");
 }catch(e){
  errors.push(String(e.message||e));
  fs.writeFileSync(path.join(root,"report.json"),JSON.stringify({ok:false,results,errors},null,2));
  console.error(errors.join(" | "));process.exitCode=1;
 }finally{await browser?.close().catch(()=>{});}
}
main();
