"use strict";
/** Mod287 QA: WebGL real em preview LEVE que usa os MESMOS shaders/lógica do mundo.
 * Renderiza a chama real no protagonista em t=8.05 e o fogo residual em t=13.
 * Teste de integração do mundo real coberto separadamente pelos testes de JS/kit.
 */
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path");
const base=(process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const out=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","veraxion-burn-287");fs.mkdirSync(out,{recursive:true});
const sizes={landscape:{width:852,height:480},portrait:{width:393,height:852}};
const modes=process.env.VX_BURN_SIZES?.split(",")||["landscape","portrait"];
async function main(){
 const report={build:process.env.GITHUB_SHA||"local",time:new Date().toISOString(),modes:{},ok:false};
 const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 try {
  for(const mode of modes){
   const vp=sizes[mode];if(!vp)throw Error("unknown viewport "+mode);
   const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[],shaderErrors=[],responses=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("console",m=>{if(m.type()==="error"){const msg=m.text();if(/shader|webgl|compile|validate_status|gl_invalid/i.test(msg))shaderErrors.push(msg.slice(0,550));else errors.push(msg.slice(0,550));}});
   page.on("response",r=>{if(r.status()>=400)responses.push(r.status()+" "+r.url());});
   await page.goto(base+"/veraxion-blue-cyclone-preview.html?t=8.05&cam=burn&refresh=287",{waitUntil:"domcontentloaded",timeout:45000});
   await page.waitForFunction(()=>window.__ready===1,null,{timeout:90000});
   const first=await page.evaluate(()=>window.__burnDiag());
   const heroShot=path.join(out,"hero-burning-"+mode+".png");
   await page.screenshot({path:heroShot,timeout:45000});
   await page.evaluate(()=>window.__shot(13.05,"wide"));
   const late=await page.evaluate(()=>window.__burnDiag());
   const groundShot=path.join(out,"groundfire-late-"+mode+".png");
   await page.screenshot({path:groundShot,timeout:45000});
   const result={first,late,errors,shaderErrors,responses,heroShot,groundShot,
     ok:first.visible&&first.stacks>0&&late.fireTiles>0&&!errors.length&&!shaderErrors.length&&!responses.length};
   report.modes[mode]=result;
   await ctx.close();
  }
 }finally{await browser.close();}
 report.ok=Object.values(report.modes).every(x=>x.ok);
 fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
 console.log(JSON.stringify({ok:report.ok,modes:Object.fromEntries(Object.entries(report.modes).map(([k,v])=>[k,{first:v.first,late:v.late,errors:v.errors,shaderErrors:v.shaderErrors,responses:v.responses}]))},null,2));
 if(!report.ok)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
