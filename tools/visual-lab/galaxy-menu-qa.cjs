"use strict";
// Agente de auditoria visual do menu Three.js — imagens reais do navegador.
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path");
const output=path.resolve("visual-lab-results/galaxy-menu-three");
fs.mkdirSync(output,{recursive:true});
function check(ok,msg){if(!ok)throw Error(msg);}
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--enable-unsafe-swiftshader","--use-angle=swiftshader"]});
 const reports=[];
 try{
  for(const view of [{name:"desktop-1536x864",width:1536,height:864},{name:"android-landscape-852x393",width:852,height:393}]){
   const ctx=await browser.newContext({viewport:{width:view.width,height:view.height},deviceScaleFactor:1,hasTouch:view.name.startsWith("android"),isMobile:view.name.startsWith("android"),reducedMotion:"no-preference"});
   const page=await ctx.newPage(),errors=[],bad=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("response",r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});
   await page.goto("http://127.0.0.1:4173/tools/visual-lab/galaxy-menu-preview.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>window.menuQA?.ready,{timeout:20000});
   await page.waitForSelector("#galaxy-screen.gx-three-on canvas.gx-three-canvas",{timeout:30000});
   await page.waitForFunction(()=>document.querySelector("#galaxy-screen")?.dataset.gxModelsReady==="true",{timeout:65000});
   await page.waitForTimeout(900);
   const info=await page.evaluate(()=>{
    const root=document.querySelector("#galaxy-screen"),c=root.querySelector("canvas.gx-three-canvas"),orbs=[...root.querySelectorAll(".gx-orb")];
    const gl=c.getContext("webgl2")||c.getContext("webgl");
    const models={guardian:root.dataset.gxGuardianModel,lust:root.dataset.gxLustModel};
    return {models,three:root.classList.contains("gx-three-on"),canvas:{width:c.width,height:c.height},gl:!!gl,errors:gl?gl.getError():null,orbs:orbs.length,menu:root.querySelectorAll(".gx-nav button").length,
      pixelImageShown:!!root.querySelector(".gx-exact-stage"),gpu:{drawCalls:Number(root.dataset.gxDrawCalls||0),triangles:Number(root.dataset.gxTriangles||0),textures:Number(root.dataset.gxTextures||0)},labels:orbs.map(o=>o.getAttribute("aria-label")),
      enter:!!root.querySelector(".gx-enter"),detail:!!root.querySelector(".gx-detail")};
   });
   check(info.three&&info.gl,view.name+": canvas Three.js/WebGL nao funcionou");
   check(info.models.guardian&&info.models.lust,view.name+": GLB real do Anjo ou da Misteriosa falhou: "+JSON.stringify(info.models));
   check(info.orbs===7&&info.menu===5&&info.enter,view.name+": controles incompletos");
   check(!info.pixelImageShown,view.name+": ainda esta exibindo imagem estática");
   await page.screenshot({path:path.join(output,view.name+"-ganancia.png"),animations:"disabled"});
   // Auditar TODOS os sete mundos, não somente Ganância e Luxúria.
   const planetAudits=[];
   for(let pid=1;pid<=7;pid++){
    await page.locator('.gx-orb[data-id="'+pid+'"]').click();
    await page.waitForTimeout(120);
    const state=await page.evaluate(pid=>{
     const root=document.querySelector('#galaxy-screen'),selected=root.querySelector('.gx-orb.sel');
     const canvas=root.querySelector('canvas.gx-three-canvas');
     const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
     return {selected:selected?.dataset.id,glError:gl.getError(),canvasPixels:canvas.width*canvas.height};
    },pid);
    check(state.selected===String(pid),view.name+": falhou selecionar planeta "+pid);
    check(state.glError===0,view.name+": erro WebGL no planeta "+pid+": "+state.glError);
    planetAudits.push({id:pid,...state});
    await page.screenshot({path:path.join(output,view.name+"-planeta-"+pid+".png"),animations:"disabled"});
   }
   await page.locator('.gx-orb[data-id="7"]').click();
   await page.waitForTimeout(320);
   check((await page.locator(".gx-detail h2").innerText())==="LUXÚRIA",view.name+": seleção de Luxuria falhou");
   await page.screenshot({path:path.join(output,view.name+"-luxuria.png"),animations:"disabled"});
   await page.locator('.gx-orb[data-id="1"]').click();
   await page.locator(".gx-enter").click();
   await page.waitForTimeout(720);
   const opened=await page.evaluate(()=>window.menuQA.opened);
   check(opened===1,view.name+": ENTRAR não chamou jogo");
   reports.push({view,info,planetAudits,errors,bad,opened,passed:errors.length===0&&bad.length===0});
   await ctx.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(output,"report.json"),JSON.stringify({renderer:"Three.js real; geometria/shaders/texturas geradas por codigo",reports},null,2));
 check(reports.every(r=>r.passed),"Console/rede: "+JSON.stringify(reports));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(output,"failure.txt"),String(e.stack||e));process.exitCode=1;});
