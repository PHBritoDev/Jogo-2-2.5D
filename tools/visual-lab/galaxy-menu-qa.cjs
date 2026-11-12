"use strict";
const {chromium}=require("playwright");
const sharp=require("sharp");
const fs=require("node:fs"),path=require("node:path");
const out=path.resolve("visual-lab-results/galaxy-menu-482");
const reference=path.resolve("assets/ui/menu-sete-pecados-reference.jpg");
fs.mkdirSync(out,{recursive:true});
function assert(ok,msg){if(!ok)throw Error(msg);}
async function pixelsMatch(file,baseline){
  const a=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const b=await sharp(baseline).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert(a.info.width===b.info.width&&a.info.height===b.info.height,"Imagem foi escalada/cortada na captura de referência");
  let different=0,maxDelta=0;
  for(let i=0;i<a.data.length;i+=4){
    const d=Math.max(Math.abs(a.data[i]-b.data[i]),Math.abs(a.data[i+1]-b.data[i+1]),Math.abs(a.data[i+2]-b.data[i+2]));
    if(d>4)different++;
    if(d>maxDelta)maxDelta=d;
  }
  return {differentPixels:different,totalPixels:a.info.width*a.info.height,pctDifferent:+(100*different/(a.info.width*a.info.height)).toFixed(4),maxDelta};
}
(async()=>{
 const results=[];
 const exists=fs.existsSync(reference);
 const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  for(const {name,width,height} of [{name:"reference-desktop",width:1536,height:864},{name:"samsung-landscape",width:852,height:393}]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:"reduce",hasTouch:name!=="reference-desktop",isMobile:name!=="reference-desktop"});
   const page=await ctx.newPage(),errors=[],requests=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("response",r=>{if(r.status()>=400)requests.push(r.status()+" "+r.url());});
   await page.goto("http://127.0.0.1:4173/tools/visual-lab/galaxy-menu-preview.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>window.menuQA?.ready,{timeout:20000});
   await page.waitForFunction(()=>document.querySelector("#galaxy-screen.gx-exact-mode")||document.querySelector("#galaxy-screen[data-reference-missing]"),{timeout:12000});
   const exact=await page.locator("#galaxy-screen").evaluate(el=>el.classList.contains("gx-exact-mode"));
   await page.screenshot({path:path.join(out,name+"-ganancia.png"),animations:"disabled"});
   const item={name,width,height,exact,errors,requests};
   if(exact){
     assert(exists,"PNG presente em runtime mas ausente do repositório");
     const stage=page.locator(".gx-exact-stage");
     assert(await stage.isVisible(),name+": composição original não apareceu");
     assert(await page.locator(".gx-exact-hit").count()===13,name+": áreas clicáveis incompletas");
     if(width===1536) {
       item.pixelDiff=await pixelsMatch(path.join(out,name+"-ganancia.png"),reference);
       assert(item.pixelDiff.pctDifferent<=0.15,"Desvio pixel a pixel >0.15%: "+JSON.stringify(item.pixelDiff));
     }else{
       const rect=await stage.boundingBox();
       assert(rect.x>=-1&&rect.y>=-1&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1,name+": composição cortada no celular");
     }
     await page.getByRole("button",{name:"Selecionar Luxúria"}).click();
     await page.screenshot({path:path.join(out,name+"-luxuria-selecionada.png"),animations:"disabled"});
     assert(await page.locator(".gx-exact-selected h2").innerText()==="GALÁXIA 7 · LUXÚRIA",name+": seleção falhou");
     await page.getByRole("button",{name:"VOLTAR À GANÂNCIA"}).click();
     await page.getByRole("button",{name:"Abrir configurações"}).click();
     item.settings=await page.evaluate(()=>window.menuQA.settings);
     assert(item.settings===1,name+": configurações falharam");
     await page.getByRole("button",{name:"Entrar na Ganância"}).click();
   }else{
     item.reason="PNG aprovado ausente: o fallback vetorial NÃO satisfaz a referência literal";
   }
   await page.waitForTimeout(750);
   item.opened=await page.evaluate(()=>window.menuQA.opened);
   if(exact)assert(item.opened===1,name+": ENTRAR falhou");
   results.push(item);
   await ctx.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(out,"report.json"),JSON.stringify({source:"real galaxies3d.js; pixel-exact image 1536x864",referencePresent:exists,views:results},null,2));
 assert(exists,"BLOQUEADO: imagem exata NÃO foi commitada em assets/ui/menu-sete-pecados-reference.jpg");
 assert(results.every(r=>r.exact),"BLOQUEADO: uma resolução ainda exibe fallback vetorial");
 assert(results.every(r=>!r.errors.length&&!r.requests.length),"Falhas console/network: "+JSON.stringify(results));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(out,"failure.txt"),String(e.stack||e));process.exitCode=1;});
