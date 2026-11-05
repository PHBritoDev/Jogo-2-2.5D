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
   const errors=[],consoleErr=[],responseErr=[],records=[],shots=[],vp=specs[mode];if(!vp)throw Error("invalid mode "+mode);
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
   let seenCast=false,seenBurn=false,seenLate=false,maxTiles=0,maxRange=0;
   const start=Date.now();
   while(Date.now()-start<23500){
    const data=await page.evaluate(()=>({
      burn:window.SevenSinsDebug3D.blueBurn(),
      battle:window.SevenSinsDebug3D.dimState()
    }));
    const b=data.burn,st=data.battle;
    if(b.cast!=="none")seenCast=true;
    if(b.visible&&b.stacks>0&&!seenBurn){
      seenBurn=true;
      const f=path.join(folder,"hero-burning-"+mode+".png");
      await page.screenshot({path:f});shots.push(f);
    }
    if(b.t>12.6&&b.fireTiles>0&&!seenLate){
      seenLate=true;
      const f=path.join(folder,"groundfire-late-"+mode+".png");
      await page.screenshot({path:f});shots.push(f);
    }
    maxTiles=Math.max(maxTiles,b.fireTiles);maxRange=Math.max(maxRange,b.pullRadius);
    records.push({t:+b.t.toFixed(2),phase:b.cast,stacks:b.stacks,fire:b.visible,tiles:b.fireTiles,hp:st.hp});
    if(st.hp<40&&st.hp>0){ // heal without invulnerability: keep burn status active
      await page.evaluate(()=>{const d=window.SevenSinsDebug3D; if(typeof d.heal==="function")d.heal();});
    }
    if(b.t>14.6)break;
    await page.waitForTimeout(350);
   }
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
