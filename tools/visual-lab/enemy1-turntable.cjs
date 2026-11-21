"use strict";
/** Real Chromium/Three.js screenshots of the actual Enemy1.glb (no proxy geometry). */
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const sharp=require("sharp");
const root=path.resolve(__dirname,"../..");
const dir=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","enemy1-360");
const base=(process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const names=["frente-0","diagonal-45","lado-90","diagonal-135","costas-180","diagonal-225","lado-270","diagonal-315"];
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"]});
 const context=await browser.newContext({viewport:{width:960,height:960},deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 try{
  await page.goto(base+"/tools/visual-lab/enemy1-turntable.html?asset=Enemy1.glb",{waitUntil:"domcontentloaded",timeout:45000});
  await page.waitForFunction(()=>window.enemy1Capture?.ready||window.enemy1Capture?.error,{timeout:90000});
  const info=await page.evaluate(()=>window.enemy1Capture);
  if(!info.ready||!info.meshes)throw new Error("Enemy1 real GLB not loaded: "+JSON.stringify(info)+" "+errors.join("; "));
  const captures=[];
  for(let i=0;i<8;i++){
   await page.evaluate(angle=>window.enemy1SetView(angle,false),i*Math.PI/4);
   await sleep(250);
   const file=names[i]+".png";await page.screenshot({path:path.join(dir,file),timeout:20000});
   captures.push(file);
  }
  for(const [file,angle] of [["rosto-0.png",0],["rosto-180.png",Math.PI],["rosto-90.png",Math.PI/2],["rosto-270.png",Math.PI*1.5]]){
   await page.evaluate(a=>window.enemy1SetView(a,true),angle);
   await sleep(250);await page.screenshot({path:path.join(dir,file),timeout:20000});
   captures.push(file);
  }
  const thumbs=await Promise.all(names.map(n=>sharp(path.join(dir,n+".png")).resize({width:400,height:400}).png().toBuffer()));
  const overlays=thumbs.map((input,i)=>({input,left:(i%4)*400,top:Math.floor(i/4)*400}));
  await sharp({create:{width:1600,height:800,channels:3,background:"#222222"}}).composite(overlays).png().toFile(path.join(dir,"contato-360.png"));
  const report={...info,success:true,captures,errors,date:new Date().toISOString(),sha:process.env.GITHUB_SHA||"local"};
  fs.writeFileSync(path.join(dir,"relatorio.json"),JSON.stringify(report,null,2)+"\n");
  console.log("[ENEMY1] "+JSON.stringify(report));
 }catch(e){
  fs.writeFileSync(path.join(dir,"erro.txt"),String(e.stack||e)+"\n"+errors.join("\n"));
  console.error("[ENEMY1] "+e.message);process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
