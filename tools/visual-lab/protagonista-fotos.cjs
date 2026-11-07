"use strict";
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const output = path.resolve("visual-lab-results/protagonista-fotos");
fs.mkdirSync(output,{recursive:true});
const report = {source:"real-game", angles:[], errors:[], date:new Date().toISOString()};
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox","--enable-unsafe-swiftshader","--use-angle=swiftshader","--disable-dev-shm-usage","--autoplay-policy=no-user-gesture-required"]});
 try {
  const page=await browser.newPage({viewport:{width:1000,height:760},deviceScaleFactor:1});
  page.on("pageerror",e=>report.errors.push(String(e)));
  await page.goto("http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1",{waitUntil:"domcontentloaded",timeout:90000});
  await page.waitForFunction(()=>!!window.SevenSinsDebug3D && document.querySelector("#scene"),{timeout:150000});
  await page.evaluate(()=>{const d=window.SevenSinsDebug3D;d.freeRoam();d.teleport(0,4);document.querySelectorAll("body > *:not(canvas)").forEach(e=>{if(e.id!=="scene" && e.tagName!=="SCRIPT" && e.tagName!=="STYLE")e.style.setProperty("opacity","0","important");});});
  await page.waitForTimeout(7000);
  const loc=await page.evaluate(()=>window.SevenSinsDebug3D.state());
  report.player={x:loc.x,y:loc.y,z:loc.z};
  const angles=[["01-frente",0],["02-frente-45",Math.PI/4],["03-lado-direito",Math.PI/2],["04-costas",Math.PI],["05-lado-esquerdo",Math.PI*1.5],["06-frente-315",Math.PI*1.75]];
  for(const [name,angle] of angles){
   await page.evaluate(a=>{const d=window.SevenSinsDebug3D,s=d.state(),radius=3.8;d.fly([s.x+Math.sin(a)*radius,s.y+1.45,s.z+Math.cos(a)*radius],[s.x,s.y+0.95,s.z]);},angle);
   await page.waitForTimeout(900);
   const file=path.join(output,name+".png");
   await page.screenshot({path:file,timeout:30000});
   report.angles.push({name,file:path.basename(file),cameraAngle:angle});
  }
  if(report.angles.length!==6)throw Error("Capturas insuficientes");
 }finally{await browser.close();}
})().catch(e=>{report.errors.push(String(e.stack||e));process.exitCode=1;}).finally(()=>{fs.writeFileSync(path.join(output,"relatorio.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report));});