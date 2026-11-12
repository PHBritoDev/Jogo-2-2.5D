"use strict";
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path");
const out=path.resolve("visual-lab-results/galaxy-menu-482");
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const reports=[];
 for(const {name,width,height} of [{name:"reference-desktop",width:1536,height:864},{name:"samsung-landscape",width:852,height:393}]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:"reduce",hasTouch:name!=="reference-desktop",isMobile:name!=="reference-desktop"});
  const page=await ctx.newPage(),errors=[],requests=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("response",r=>{if(r.status()>=400)requests.push(r.status()+" "+r.url());});
  await page.goto("http://127.0.0.1:4173/tools/visual-lab/galaxy-menu-preview.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.menuQA?.ready,{timeout:15000});
  await page.screenshot({path:path.join(out,name+"-ganancia.png"),animations:"disabled"});
  const data=await page.evaluate(()=>{
   const root=document.getElementById("galaxy-screen"),o=[...root.querySelectorAll(".gx-orb")],panel=root.querySelector(".gx-detail");
   const rect=e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
   return {orbs:o.length,planetSvg:o.map(e=>!!e.querySelector("svg")),nav:[...root.querySelectorAll(".gx-nav button span")].map(x=>x.textContent),
    money:root.querySelector(".gx-wallet").innerText,detail:rect(panel),firstPlanet:rect(o[0]),lastPlanet:rect(o[6]),
    title:root.querySelector(".gx-head h1").textContent,enter:!!root.querySelector(".gx-enter"),stylesheets:[...document.styleSheets].map(s=>s.href?.split("/").pop())};
  });
  if(data.orbs!==7||data.planetSvg.some(x=>!x)||data.nav.length!==5||data.nav.includes("PERSONAGEM")||!data.enter)throw Error(name+": broken menu "+JSON.stringify(data));
  if(!data.title.includes("7 PECADOS CAPITAIS"))throw Error(name+": wrong title");
  await page.locator('.gx-orb[data-id="7"]').click();
  await page.screenshot({path:path.join(out,name+"-luxuria.png"),animations:"disabled"});
  const selection=await page.locator(".gx-detail h2").innerText();
  if(selection!=="LUXÚRIA")throw Error(name+": select Luxuria failed "+selection);
  await page.locator('.gx-orb[data-id="1"]').click();
  await page.locator(".gx-enter").click();
  await page.waitForTimeout(720);
  const opened=await page.evaluate(()=>window.menuQA.opened);
  if(opened!==1)throw Error(name+": enter callback did not execute "+opened);
  reports.push({name,errors,requests,data,selection,opened});
  await ctx.close();
 }
 fs.writeFileSync(path.join(out,"report.json"),JSON.stringify({source:"Real galaxies3d.js module in Chromium",viewportReports:reports},null,2));
 await browser.close();
 if(reports.some(r=>r.errors.length||r.requests.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});