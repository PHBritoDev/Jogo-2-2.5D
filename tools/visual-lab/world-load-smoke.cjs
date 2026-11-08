"use strict";
/* Smoke real: falha se uma importacao de blob derrubar o mundo. */
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","smoke-world");
fs.mkdirSync(root,{recursive:true});
const base=process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173";
async function main(){
 let browser=null,context=null;const errors=[],consoleErrors=[];
 const output={status:"incompleto",errors,consoleErrors,build:"277",url:null};
 try{
  browser=await chromium.launch({headless:true,args:[
   "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader"
  ]});
  context=await browser.newContext({viewport:{width:852,height:480},deviceScaleFactor:1});
  const page=await context.newPage();
  page.on("pageerror",e=>errors.push(e.message.slice(0,700)));
  page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text().slice(0,700));});
  output.url=base+"/mundo-3d-prototype.html?testeDimensao=bishop1&debug3d=1&build=277-smoke";
  await page.goto(output.url,{waitUntil:"domcontentloaded",timeout:35000});
  const ready=await page.waitForFunction(()=>{
    const status=document.getElementById("loading")?.textContent||"";
    if(status.includes("Falha ao montar o mundo 3D"))return "failed:"+status.slice(0,350);
    if(typeof window.SevenSinsDebug3D?.dimState==="function")return "ready";
    return false;
  },null,{timeout:115000}).then(h=>h.jsonValue());
  output.lastStatus=ready;
  if(ready!=="ready")throw Error("Falha real do carregador: "+ready);
  const sample=await page.evaluate(()=>{
    const v=window.SevenSinsDebug3D;
    return {dimension:v.dimState()?.profile||null,hasApi:!!v};
  });
  output.state=sample;
  if(errors.some(x=>/Failed to resolve module specifier|Invalid relative url|SyntaxError/i.test(x)))
    throw Error("Erro de importacao capturado: "+errors.join(" | "));
  output.status="aprovado";
  await page.screenshot({path:path.join(root,"mundo-3d-carregado.png"),timeout:20000});
  // Isolated smoke verifies boss loading only. Eldoria QA MUST use a fresh normal-world page.
  try {
    const sharp=require("sharp");
    const qa=await context.newPage();
    qa.on("pageerror",e=>errors.push("Eldoria: "+e.message.slice(0,500)));
    const qaUrl=base+"/mundo-3d-prototype.html?debug3d=1&qaEldoria=1";
    await qa.goto(qaUrl,{waitUntil:"domcontentloaded",timeout:35000});
    const ready=await qa.waitForFunction(()=>{
      const loading=document.getElementById("loading")?.textContent||"";
      if(loading.includes("Falha ao montar o mundo 3D"))return "failed";
      return typeof window.SevenSinsDebug3D?.fly==="function"&&!!window.EldoriaLiveCityQA?"ready":false;
    },null,{timeout:115000}).then(x=>x.jsonValue());
    if(ready!=="ready")throw Error("Eldoria not ready: "+ready);
    const v=await qa.evaluate(()=>window.EldoriaLiveCityQA.village||{x:-12.2,z:-44.5});
    const positions=[
      {name:"distante",from:[v.x+65,25,v.z+95],to:[v.x,5,v.z]},
      {name:"perto",from:[v.x+12,10,v.z+21],to:[v.x,4,v.z]}
    ];
    const shots=[];
    for(const p of positions){
      const before=await qa.evaluate(({from,to})=>{
        const api=window.SevenSinsDebug3D;
        api.freeRoam();api.fly(from,to);
        return {camera:api.cam(),state:api.state(),render:api.rinfo()};
      },p);
      await qa.waitForTimeout(2000);
      const after=await qa.evaluate(()=>window.SevenSinsDebug3D.cam());
      const filename=path.join(root,"eldoria-real-"+p.name+".png");
      await qa.locator("#scene").screenshot({path:filename,timeout:30000});
      shots.push({name:p.name,filename,before,after});
    }
    const a=await sharp(shots[0].filename).resize(64,64).removeAlpha().raw().toBuffer();
    const b=await sharp(shots[1].filename).resize(64,64).removeAlpha().raw().toBuffer();
    let diff=0;for(let i=0;i<a.length;i++)diff+=Math.abs(a[i]-b[i]);
    diff/=a.length;
    output.eldoriaReal={shots:shots.map(({filename,...rest})=>rest),pixelDifference:diff};
    const distance=Math.hypot(...shots[0].after.map((n,i)=>n-shots[1].after[i]));
    if(distance<15)throw Error("Camera near/far did not move: "+distance.toFixed(2));
    if(diff<7)throw Error("Near/far screenshots almost identical: "+diff.toFixed(2));
    await qa.close();
  }catch(e){
    output.status="falhou";
    output.eldoriaCaptureError=String(e.message||e);
    errors.push("Eldoria QA: "+output.eldoriaCaptureError);
    process.exitCode=1;
  }

  process.stdout.write("[SMOKE] mundo 3D abriu com modulo valido: "+JSON.stringify(sample)+"\n");
 }catch(e){
  output.status="falhou";output.failure=String(e.message||e);
  process.stderr.write("[SMOKE] "+output.failure+"\n");
  process.exitCode=1;
 }finally{
  fs.writeFileSync(path.join(root,"resultado.json"),JSON.stringify(output,null,2)+"\n");
  if(context)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
 }
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
