"use strict";
/** Mod287 — agente Playwright para queimadura do protagonista, persistência e sucção da Skill2. */
const {chromium}=require("playwright"), fs=require("node:fs"), path=require("node:path");
const base=(process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const folder=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","veraxion-burn-287");
fs.mkdirSync(folder,{recursive:true});
const modes=process.env.VX_BURN_SIZES?.split(",")||["landscape","portrait"];
const specs={landscape:{width:852,height:480},portrait:{width:393,height:852}};
async function qa(){
 const result={date:new Date().toISOString(),modes:{},ok:false};
 const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 try{
  for(const mode of modes){
   const errors=[],consoleErr=[],responseErr=[],vp=specs[mode];if(!vp)throw Error("invalid mode "+mode);
   const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const page=await ctx.newPage();
   page.on("pageerror",e=>errors.push(e.message));
   page.on("console",m=>{if(m.type()==="error")consoleErr.push(m.text().slice(0,500));});
   page.on("response",r=>{if(r.status()>=400)responseErr.push(r.status()+" "+r.url());});
   const uri=base+"/mundo-3d-prototype.html?testeDimensao=bishop4&testCicloneAzul=1&debug3d&refresh=287";
   await page.goto(uri,{waitUntil:"domcontentloaded",timeout:60000});
   await page.waitForFunction(()=>typeof window.SevenSinsDebug3D?.dimState==="function",null,{timeout:120000});
   let active=false;
   for(let attempt=0;attempt<30;attempt++){
    const st=await page.evaluate(()=>window.SevenSinsDebug3D.dimState());
    if(st.vs){try{await page.locator("#vs-go").click({timeout:3000});}catch{await page.evaluate(()=>window.SevenSinsDebug3D.vsGo());}}
    if(st.battle?.active&&st.visible&&st.profile==="veraxion"){active=true;break;}
    await page.waitForTimeout(700);
   }
   if(!active)throw Error("bishop4 combat not active "+mode);
   await page.evaluate(()=>{const d=window.SevenSinsDebug3D;d.kitMove("s2");});
   // Debug de renderização: avançar a timeline PURA (não a física) para o WebGL
   // não depender de centenas de frames do mundo completo no SwiftShader.
   const first=await page.evaluate(()=>window.SevenSinsDebug3D.blueBurnFrame(8.05));
   if(!first)throw Error("debug blueBurnFrame missing");
   const seenCast=first.cast!=="none",seenBurn=first.visible&&first.stacks>0;
   const f1=path.join(folder,"hero-burning-"+mode+".png");
   await page.screenshot({path:f1});
   const late=await page.evaluate(()=>window.SevenSinsDebug3D.blueBurnFrame(13.0));
   const seenLate=!!late&&late.t>12.6&&late.fireTiles>0;
   const f2=path.join(folder,"groundfire-late-"+mode+".png");
   await page.screenshot({path:f2});
   const maxTiles=Math.max(first.fireTiles,late?.fireTiles||0),maxRange=first.pullRadius;
   const records=[first,late],shots=[f1,f2];
   const state={active,seenCast,seenBurn,seenLate,maxTiles,maxRange,errors,consoleErr,responseErr,shots,tail:records.slice(-9)};
   state.ok=seenCast&&seenBurn&&seenLate&&maxRange>=23&&errors.length===0&&consoleErr.filter(x=>/shader|error|cannot compile|WebGL/i.test(x)).length===0&&responseErr.length===0;
   result.modes[mode]=state;
   await ctx.close();
  }
 }finally{await browser.close();}
 result.ok=Object.values(result.modes).every(m=>m.ok);
 fs.writeFileSync(path.join(folder,"report.json"),JSON.stringify(result,null,2));
 console.log(JSON.stringify({ok:result.ok,modes:Object.fromEntries(Object.entries(result.modes).map(([k,v])=>[k,{seenCast:v.seenCast,seenBurn:v.seenBurn,seenLate:v.seenLate,maxRange:v.maxRange,maxTiles:v.maxTiles,errors:v.errors.slice(0,3),consoleErr:v.consoleErr.slice(0,3),responseErr:v.responseErr.slice(0,3),shots:v.shots}]))},null,2));
 if(!result.ok)process.exitCode=1;
}
qa().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
