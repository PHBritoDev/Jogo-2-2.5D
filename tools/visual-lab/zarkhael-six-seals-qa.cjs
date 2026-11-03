"use strict";
/**
 * Mod 280: captura da ULTIMATE REAL do Bispo 3 no browser 3D com WebGL,
 * sem mocks, em portrait e landscape. Audita six seals, safe zone, 3 bursts.
 */
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path");
const base=(process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const out=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","zarkhael-ultimate-280");
fs.mkdirSync(out,{recursive:true});
const modes={portrait:{width:393,height:852},landscape:{width:852,height:480}};
const wanted=(process.env.ZARK_U_QA_SIZES||"portrait,landscape").split(",").map(x=>x.trim()).filter(Boolean);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const report={build:process.env.GITHUB_SHA||"local",date:new Date().toISOString(),modes:{},ok:false};
 const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 try{
  for(const mode of wanted){
   if(!modes[mode])throw Error("Tamanho desconhecido: "+mode);
   const folder=path.join(out,mode);fs.mkdirSync(folder,{recursive:true});
   const data=report.modes[mode]={frames:[],console:[],jsErrors:[],glErrors:[],status:"started"};
   const ctx=await browser.newContext({viewport:modes[mode],deviceScaleFactor:1,hasTouch:true,isMobile:true});
   const page=await ctx.newPage();
   page.on("pageerror",e=>data.jsErrors.push(e.message.slice(0,500)));
   page.on("console",m=>{if(m.type()==="error"){const x=m.text().slice(0,650);data.console.push(x);if(/shader|WebGL|INVALID_OPERATION|VALIDATE_STATUS|cannot compile/i.test(x))data.glErrors.push(x);}});
   page.on("requestfailed",req=>{if(/zarkhael|six-seals/i.test(req.url()))data.jsErrors.push("Asset falhou: "+req.url().slice(0,160));});
   try{
    const url=base+"/mundo-3d-prototype.html?testeDimensao=bishop3&debug3d=1&build=mod280-qa";
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForFunction(()=>typeof window.SevenSinsDebug3D?.dimState==="function",null,{timeout:110000});
    let active=false;
    for(let j=0;j<60;j++){
     const state=await page.evaluate(()=>window.SevenSinsDebug3D.dimState());
     if(state.vs){try{await page.locator("#vs-go").click({timeout:5500});}catch{await page.evaluate(()=>window.SevenSinsDebug3D.vsGo());}}
     if(state.battle?.active&&state.visible&&state.profile==='zarkhael'){active=true;break;}
     await sleep(1200);
    }
    if(!active)throw Error("Batalha do Bispo 3 não iniciou");
    let launch=false;
    for(let j=0;j<24;j++){
     const state=await page.evaluate(()=>{
      const d=window.SevenSinsDebug3D;d.god();d.power();
      return {response:d.kitMove('ult'),cine:d.dimState().cinematic};
     });
     if(state.cine&&state.cine.phase==='aura'){launch=true;break;}
     await sleep(800);
    }
    if(!launch)throw Error("Ultimate não iniciou por kitMove(ult)");
    const schedule=[['01-aura',1.25],['02-aura-forte',2.9],['03-selo-chao',4.0],['04-terceiro-selo',6.4],['05-sexto-selo',9.96],['06-primeira-explosao',11.0],['07-segunda-explosao',12.7],['08-terceira-explosao',14.35]];
    for(const [name,target] of schedule){
     const h=await page.waitForFunction(t=>{
      const s=window.SevenSinsDebug3D?.dimState()?.cinematic;
      return s&&s.t>=t?s:null;
     },target,{timeout:90000,polling:125});
     const state=await h.jsonValue();
     const image=path.join(folder,name+".png");
     await page.screenshot({path:image,animations:"disabled",timeout:30000});
     const bytes=fs.statSync(image).size;
     if(bytes<9000)throw Error("Captura visual possivelmente vazia "+name+": "+bytes);
     data.frames.push({name,time:state.t,phase:state.phase,sealCount:state.selos.filter(a=>a[1]>.95).length,bursts:state.bursts,bytes});
    }
    const first=data.frames[0],last=data.frames.at(-1);
    if(first.phase!=='aura'||data.frames[4].sealCount!==6||last.bursts.length!==3)
      throw Error("Fases/círculos/bursts incorretos: "+JSON.stringify(data.frames.map(x=>({n:x.name,p:x.phase,sel:x.sealCount,b:x.bursts}))));
    if(data.glErrors.length||data.jsErrors.some(e=>/ReferenceError|SyntaxError|Asset falhou/.test(e)))
      throw Error("Erro WebGL/JS detectado: "+JSON.stringify(data.glErrors.concat(data.jsErrors)).slice(0,1200));
    data.status="approved";
    process.stdout.write("[BISPO3 280] "+mode+" -> 6 selos, 3 bursts, screenshots reais, sem shader error.\n");
   }catch(e){
    data.status="failed";data.failure=String(e.stack||e).slice(0,1400);
    process.stderr.write("[BISPO3 280] "+mode+" FAIL: "+data.failure+"\n");process.exitCode=1;
   }finally{await ctx.close().catch(()=>{});}
  }
  report.ok=wanted.every(m=>report.modes[m].status==="approved");
 }finally{fs.writeFileSync(path.join(out,"resultado.json"),JSON.stringify(report,null,2)+"\n");await browser.close();}
 if(!report.ok)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
