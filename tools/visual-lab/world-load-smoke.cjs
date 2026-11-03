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
