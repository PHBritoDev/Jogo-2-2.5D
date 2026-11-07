"use strict";
/** Evidência real via Playwright (SwiftShader). Capture de Eldória em mobile/desktop. */
const {chromium}=require("playwright");
const sharp=require("sharp");
const fs=require("node:fs");
const path=require("node:path");
const out=path.resolve("visual-lab-results/eldoria");
fs.mkdirSync(out,{recursive:true});
const base=process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173";
const errors=[],results=[];
async function capture(page,name){
  await page.waitForTimeout(1500);
  const filename=path.join(out,name+".png");
  await page.screenshot({path:filename,timeout:60000});
  const {data,info}=await sharp(filename).resize(64,64).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let variance=0,mean=0;
  for(const v of data)mean+=v;mean/=data.length;
  for(const v of data)variance+=(v-mean)**2;
  variance/=data.length;
  const nonblank=variance>175;
  const telemetry=await page.evaluate(()=>window.EldoriaVisualQA.inspect());
  const record={name,filename:path.relative(out,filename),mean,variance,nonblank,telemetry};
  results.push(record);
  if(!nonblank)errors.push("frame vazio ou quase uniforme: "+name);
  return record;
}
async function run(){
  const browser=await chromium.launch({headless:true,args:[
    "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
    "--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader",
    "--enable-unsafe-swiftshader"
  ]});
  try{
    for(const profile of [
      {name:"mobile",viewport:{width:412,height:915},isMobile:true,deviceScaleFactor:1},
      {name:"desktop",viewport:{width:960,height:540},isMobile:false,deviceScaleFactor:1}
    ]){
      const context=await browser.newContext(profile);
      const page=await context.newPage();
      page.on("pageerror",e=>errors.push(profile.name+" pageerror: "+e.message));
      page.on("console",m=>{if(m.type()==="error")errors.push(profile.name+" console: "+m.text().slice(0,500));});
      page.on("response",r=>{if(r.status()>=400&&/\.glb|eldoria|three|\.js/i.test(r.url()))errors.push(profile.name+" HTTP "+r.status()+" "+r.url());});
      await page.goto(base+"/eldoria-cenario-preview.html?qa="+profile.name,{waitUntil:"domcontentloaded",timeout:45000});
      await page.waitForFunction(()=>!!window.EldoriaVisualQA,{timeout:60000});
      await page.waitForFunction(()=>{const q=window.EldoriaVisualQA.inspect();return q.loaded+q.failed>=11;},{timeout:120000});
      const start=await page.evaluate(()=>window.EldoriaVisualQA.inspect());
      if(start.failed)errors.push(profile.name+" "+start.failed+" arquivos GLB falharam");
      if(!start.sunCastsShadow||!start.shadowEnabled)errors.push(profile.name+" sombras desligadas");
      await page.evaluate(()=>window.EldoriaVisualQA.view('cidade'));
      if(start.waterTime<=0)errors.push(profile.name+" água não anima");
      await capture(page,profile.name+"-vila-dia");
      await page.evaluate(()=>window.EldoriaVisualQA.view("aguas"));
      await capture(page,profile.name+"-rio-dia");
      await page.evaluate(()=>window.EldoriaVisualQA.view("lago"));
      await capture(page,profile.name+"-lago-dia");
      await page.evaluate(()=>{window.EldoriaVisualQA.setNight(true);window.EldoriaVisualQA.view("cidade");});
      await capture(page,profile.name+"-vila-noite");
      await page.evaluate(()=>window.EldoriaVisualQA.view("ritual"));
      await page.waitForFunction(()=>{const q=window.EldoriaVisualQA.inspect();return q.stages.includes("ritual");},{timeout:45000});
      await capture(page,profile.name+"-ritual-noite");
      await page.evaluate(()=>{window.EldoriaVisualQA.setNight(false);window.EldoriaVisualQA.view("caverna");});
      await page.waitForFunction(()=>{const q=window.EldoriaVisualQA.inspect();return q.stages.includes("caverna");},{timeout:45000});
      await capture(page,profile.name+"-caverna-dia");
      const end=await page.evaluate(()=>window.EldoriaVisualQA.inspect());
      if(end.failed)errors.push(profile.name+" falhas GLB: "+end.failed);
      if(end.loaded<14)errors.push(profile.name+" GLBs incompletos: "+end.loaded+"/14");
      await context.close();
    }
  }finally{await browser.close();}
  const report={status:errors.length?"failed":"passed",errors,results,notes:"Capturas são pixels renderizados em SwiftShader CI, não benchmark Android real."};
  fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({status:report.status,errors,count:results.length,frames:results.map(x=>({name:x.name,variance:Math.round(x.variance),drawCalls:x.telemetry.drawCalls}))},null,2));
  if(errors.length)process.exitCode=1;
}
run().catch(e=>{console.error(e);fs.writeFileSync(path.join(out,"error.txt"),String(e.stack||e));process.exitCode=1;});
