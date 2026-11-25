"use strict";
// Auditoria visual REAL do jogo, com Chromium/WebGL, screenshots e video. Nenhuma simulação de prints.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { TERRAIN_EDGE_SHOTS, TERRAIN_EDGE_WALK_LINES, TERRAIN_EDGE_WALK_INPUT, terrainEdgeWalkCameraYaw } = require("./a3-terrain-edge-plan.cjs");
const output = path.resolve(process.env.VISUAL_OUTPUT || "visual-lab-results", "eldoria-city-sweep");
fs.mkdirSync(output,{recursive:true});
const base = process.env.VISUAL_BASE_URL || "http://127.0.0.1:4173";
const CENTER = { x:-12.2, z:-44.5 };
const spots = [
 {name:"ponte-entrada",x:-.4,z:-12.3,up:12,back:20},
 {name:"praca-mercado",x:CENTER.x,z:CENTER.z,up:13,back:15},
 {name:"barracas-oeste",x:CENTER.x-10,z:CENTER.z-4,up:8,back:12},
 {name:"barracas-leste",x:CENTER.x+10,z:CENTER.z+4,up:9,back:14},
 {name:"poco",x:CENTER.x-1.4,z:CENTER.z-.6,up:5,back:8},
 {name:"fonte-quase-seca",x:CENTER.x-7.5,z:CENTER.z+7.5,up:6,back:9},
 {name:"passarela-e-escadas",x:6,z:-62,up:16,back:21},
 {name:"arvore-ancestral",x:-13.2,z:-70.5,up:11,back:18},
 {name:"arvore-lateral",x:14.8,z:-58.5,up:4.5,back:28,targetY:.35},
 {name:"floresta-contorno",x:34,z:-56,up:17,back:22}
];
const report = {status:"incomplete",cases:[],errors:[],consoleErrors:[],browser:"Chromium WebGL (SwiftShader); NOT physical Android"};
const safe = s => String(s||"").replace(/[^a-z0-9_-]/gi,"-");

async function captureMainBaseline(browser,base,output,report){
 const file=process.env.A3_BASELINE_TERRAIN_FILE;
 const cityFile=process.env.A3_BASELINE_CITY_FILE;
 if(!file||!fs.existsSync(file))throw Error("Main terrain baseline source missing: "+file);
 if(!cityFile||!fs.existsSync(cityFile))throw Error("Main live-village baseline source missing: "+cityFile);
 const source=fs.readFileSync(file,"utf8");
 const citySource=fs.readFileSync(cityFile,"utf8");
 const baseline={sha:process.env.A3_BASELINE_SHA||"unknown",viewport:{width:852,height:480,coarsePointer:true},moduleRouteHits:[],cityModuleRouteHits:[],cases:[],cityCases:[]};
 const dir=path.join(output,"baseline-main");fs.mkdirSync(dir,{recursive:true});
 const context=await browser.newContext({viewport:{width:852,height:480},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage();
 page.on("pageerror",e=>report.errors.push("baseline: "+e.message.slice(0,350)));
 page.on("console",m=>{if(m.type()==="error")report.consoleErrors.push("baseline: "+m.text().slice(0,350));});
 await page.route(/world3d-terrain\.js(?:\?|$)/,async route=>{baseline.moduleRouteHits.push(route.request().url());await route.fulfill({status:200,contentType:"text/javascript; charset=utf-8",body:source});});
 await page.route(/eldoria-live-village3d\.js(?:\?|$)/,async route=>{baseline.cityModuleRouteHits.push(route.request().url());await route.fulfill({status:200,contentType:"text/javascript; charset=utf-8",body:citySource});});
 try{
  await page.goto(base+"/mundo-3d-prototype.html?debug3d=1&qaEldoria=1",{waitUntil:"domcontentloaded",timeout:35000});
  const ready=await page.waitForFunction(()=>{const x=document.getElementById("loading")?.textContent||"";if(x.includes("Falha ao montar o mundo 3D"))return "failed";return window.SevenSinsDebug3D?.fly&&window.EldoriaLiveCityQA?"ready":false;},null,{timeout:120000}).then(h=>h.jsonValue());
  if(ready!=="ready")throw Error("Main baseline world did not load: "+ready);
  const treeSpot={x:14.8,z:-58.5,up:4.5,back:28,targetY:.35};
  await page.evaluate(s=>{const api=window.SevenSinsDebug3D;api.freeRoam();api.fly([s.x+s.back*.46,s.up,s.z+s.back],[s.x,s.targetY??2,s.z]);},treeSpot);
  await page.waitForTimeout(850);
  const treeCamera=await page.evaluate(()=>window.SevenSinsDebug3D.cam());
  const treeImage=path.join(dir,"arvore-lateral.png");
  await page.screenshot({path:treeImage,timeout:65000,animations:"disabled"});
  baseline.cityCases.push({name:"arvore-lateral",image:path.relative(output,treeImage),camera:treeCamera});
  await page.evaluate(()=>{const api=window.SevenSinsDebug3D;api.teleport(-12.2,-44.5,0);api.freeRoam();});
  const device=await page.evaluate(()=>{const api=window.SevenSinsDebug3D;api.seamMode(true);return{coarsePointer:matchMedia("(pointer: coarse)").matches,innerWidth,innerHeight};});
  baseline.viewport=device;
  if(!(device.coarsePointer||device.innerWidth<700))throw Error("Main baseline did not activate the mobile terrain preset");
  for(const edge of TERRAIN_EDGE_SHOTS){
   const data=await page.evaluate(edge=>{
    const api=window.SevenSinsDebug3D;api.teleport(edge.x,edge.z,0);
    const p=api.cineState().player,target={x:p[0],y:p[1],z:p[2]};
    const cameraX=edge.x+edge.cameraOffset[0],cameraZ=edge.z+edge.cameraOffset[2];
    api.teleport(cameraX,cameraZ,0);const cp=api.cineState().player,cameraGround={x:cameraX,y:cp[1],z:cameraZ};
    const from=[cameraX,Math.max(target.y,cameraGround.y)+edge.cameraOffset[1],cameraZ];
    const to=[edge.x+edge.targetOffset[0],target.y+edge.targetOffset[1],edge.z+edge.targetOffset[2]];
    api.teleport(-12.2,-44.5,0);const restored=api.state();api.fly(from,to);
    return{target,cameraGround,from,to,playerRestored:Math.hypot(restored.x+12.2,restored.z+44.5)<.1};
   },edge);
   await page.waitForTimeout(2600);
   const verified=await page.evaluate(to=>{const api=window.SevenSinsDebug3D;const viewCheck=api.camView(to);const centerPick=api.pick(0,0);return{camera:api.cam(),centerPick,viewCheck};},data.to);
   const visualGuide=await page.evaluate(edge=>{
    const api=window.SevenSinsDebug3D;
    const sampleLine=boundary=>[-edge.edgeSpan,edge.edgeSpan].map(offset=>{
     const x=edge.axis==="x"?boundary:edge.x+offset,z=edge.axis==="x"?edge.z+offset:boundary;
     const hit=(api.rayDown(x,z)||[]).find(h=>String(h.n).includes("terrain-mod186"))||null;
     if(!hit)return{world:[x,null,z],mesh:null,ndc:null,onScreen:false};
     const view=api.camView([x,hit.y+.04,z]);return{world:[x,+hit.y.toFixed(3),z],mesh:hit.n,ndc:view.ndc,onScreen:view.onScreen,blocked:view.blocked};
    });
    const fine=sampleLine(edge.fineEdge),outer=sampleLine(edge.legacyFirstOuter);
    const screen=p=>p.ndc?[(p.ndc[0]+1)*innerWidth/2,(1-p.ndc[1])*innerHeight/2]:null;
    const mid=pts=>pts.every(p=>p.ndc)?[(screen(pts[0])[0]+screen(pts[1])[0])/2,(screen(pts[0])[1]+screen(pts[1])[1])/2]:null;
    const fm=mid(fine),om=mid(outer),pixelGap=fm&&om?Math.hypot(fm[0]-om[0],fm[1]-om[1]):0;
    const allTerrainHits=[...fine,...outer].every(p=>p.mesh==="terrain-mod186"),allOnScreen=[...fine,...outer].every(p=>p.onScreen);
    const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
    svg.id="a3-terrain-edge-overlay";svg.setAttribute("viewBox","0 0 "+innerWidth+" "+innerHeight);svg.setAttribute("width",String(innerWidth));svg.setAttribute("height",String(innerHeight));
    svg.style.cssText="position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:999999";
    const draw=(pts,color)=>{if(!pts.every(p=>p.ndc))return;const a=screen(pts[0]),b=screen(pts[1]),line=document.createElementNS(ns,"line");line.setAttribute("x1",a[0]);line.setAttribute("y1",a[1]);line.setAttribute("x2",b[0]);line.setAttribute("y2",b[1]);line.setAttribute("stroke",color);line.setAttribute("stroke-width","4");line.setAttribute("stroke-linecap","round");svg.appendChild(line);for(const p of [a,b]){const dot=document.createElementNS(ns,"circle");dot.setAttribute("cx",p[0]);dot.setAttribute("cy",p[1]);dot.setAttribute("r","4");dot.setAttribute("fill",color);dot.setAttribute("stroke","#101820");dot.setAttribute("stroke-width","1.5");svg.appendChild(dot);}};
    draw(fine,"#00e5ff");draw(outer,"#ff9f1c");
    const box=document.createElementNS(ns,"rect");box.setAttribute("x",innerWidth/2-142);box.setAttribute("y","148");box.setAttribute("width","284");box.setAttribute("height","42");box.setAttribute("rx","7");box.setAttribute("fill","rgba(8,12,18,.88)");box.setAttribute("stroke","#b8a37a");svg.appendChild(box);
    const label=document.createElementNS(ns,"text");label.setAttribute("x",innerWidth/2);label.setAttribute("y","165");label.setAttribute("text-anchor","middle");label.setAttribute("font-size","11");label.setAttribute("font-family","Arial,sans-serif");label.setAttribute("fill","#ffffff");label.textContent="MAIN BASELINE: limite fino • 1ª célula externa 3,5 m";svg.appendChild(label);
    const sub=document.createElementNS(ns,"text");sub.setAttribute("x",innerWidth/2);sub.setAttribute("y","181");sub.setAttribute("text-anchor","middle");sub.setAttribute("font-size","10");sub.setAttribute("font-family","Arial,sans-serif");sub.setAttribute("fill","#f5d8a4");sub.textContent="mesma câmera e viewport da PR";svg.appendChild(sub);
    const cross=document.createElementNS(ns,"circle");cross.setAttribute("cx",innerWidth/2);cross.setAttribute("cy",innerHeight/2);cross.setAttribute("r","7");cross.setAttribute("fill","none");cross.setAttribute("stroke","#ffffff");cross.setAttribute("stroke-width","2");svg.appendChild(cross);document.body.appendChild(svg);
    return{fine,outer,pixelGap,allTerrainHits,allOnScreen,overlay:true};
   },edge);
   const pick=verified.centerPick?.[0]||null,terrainHit=!!pick&&/terrain-mod186/.test(pick[0]||"");
   const horizontalMiss=pick?Math.hypot(pick[2]-data.to[0],pick[4]-data.to[2]):null;
   const targetVisible=!!verified.viewCheck?.onScreen&&!verified.viewCheck?.blocked;
   const cameraPinned=Array.isArray(verified.camera)&&verified.camera.length===3&&verified.camera.every((v,i)=>Math.abs(v-data.from[i])<.5);
   const visualGuideOk=visualGuide.allTerrainHits&&visualGuide.allOnScreen&&visualGuide.pixelGap>=8;
   const positioned=Number.isFinite(data.target.y)&&Number.isFinite(data.cameraGround.y)&&cameraPinned&&data.playerRestored&&terrainHit&&horizontalMiss!==null&&horizontalMiss<1.5&&targetVisible&&visualGuideOk;
   if(!positioned)report.errors.push("Main baseline seam framing failed at "+edge.name+": "+JSON.stringify({cameraPinned,playerRestored:data.playerRestored,terrainHit,horizontalMiss,targetVisible,visualGuide}));
   const filename=path.join(dir,safe(edge.name)+".png");await page.screenshot({path:filename,timeout:65000,animations:"disabled"});
   await page.evaluate(()=>document.getElementById("a3-terrain-edge-overlay")?.remove());
   baseline.cases.push({name:edge.name,image:path.relative(output,filename),positioned,terrainEdge:{fineEdge:edge.fineEdge,firstOuter:edge.legacyFirstOuter,expectedWidth:Math.abs(edge.legacyFirstOuter-edge.fineEdge),target:data.target,cameraGround:data.cameraGround,from:data.from,to:data.to,cameraAfter:verified.camera,centerPick:verified.centerPick,viewCheck:verified.viewCheck,horizontalMiss,terrainHit,targetVisible,playerRestored:data.playerRestored,visualGuide}});
  }
 }finally{await context.close();}
 if(!baseline.moduleRouteHits.length)throw Error("Playwright did not intercept world3d-terrain.js; main baseline is invalid");
 if(!baseline.cityModuleRouteHits.length)throw Error("Playwright did not intercept eldoria-live-village3d.js; main tree baseline is invalid");
 report.baselineMain=baseline;
 const baseTree=baseline.cityCases.find(c=>c.name==="arvore-lateral");
 const prTree=report.cases.find(c=>c.preset==="android-landscape"&&c.name==="arvore-lateral");
 const a=baseTree?.camera||[],b=prTree?.camera||[];
 const cameraDelta=a.length===b.length&&a.length?Math.max(...a.map((v,i)=>Math.abs(v-b[i]))):Infinity;
 const cameraMatch=cameraDelta<=.05;
 report.treeRootSinkAB={mainSha:baseline.sha,baselineImage:baseTree?.image||null,candidateImage:prTree?.image||null,cameraDelta,cameraMatch,cameraPreset:"ground-root",cameraHeight:treeSpot.up,cameraBack:treeSpot.back,cameraTargetY:treeSpot.targetY};
 if(!cameraMatch)report.errors.push("A/B camera mismatch for side ancestral tree: "+cameraDelta);
 const prCases=report.cases.filter(c=>c.preset==="android-landscape"&&c.terrainEdge);
 report.abComparisons=baseline.cases.map(mainCase=>{
  const prCase=prCases.find(c=>c.name===mainCase.name),a=mainCase.terrainEdge,b=prCase?.terrainEdge;
  const va=[...(a?.from||[]),...(a?.to||[])],vb=[...(b?.from||[]),...(b?.to||[])];
  const cameraDelta=va.length===vb.length&&va.length?Math.max(...va.map((v,i)=>Math.abs(v-vb[i]))):Infinity;
  const cameraMatch=cameraDelta<=.05;if(!cameraMatch)report.errors.push("A/B camera mismatch at "+mainCase.name+": "+cameraDelta);
  return{name:mainCase.name,mainCellM:a?.expectedWidth,prCellM:b?.expectedWidth,cameraDelta,cameraMatch,mainImage:mainCase.image,prImage:prCase?.image||null};
 });
}

(async()=>{
 let browser,context;
 try {
  browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  for(const preset of [{name:"android-landscape",width:852,height:480,mobile:true},{name:"desktop",width:1280,height:720,mobile:false}]) {
   const dir=path.join(output,preset.name);fs.mkdirSync(dir,{recursive:true});
   context=await browser.newContext({viewport:{width:preset.width,height:preset.height},deviceScaleFactor:1,isMobile:preset.mobile,hasTouch:preset.mobile,recordVideo:{dir,size:{width:preset.width,height:preset.height}}});
   const page=await context.newPage();page.on("pageerror",e=>report.errors.push(e.message.slice(0,350)));page.on("console",m=>{if(m.type()==="error")report.consoleErrors.push(m.text().slice(0,350));});
   await page.goto(base+"/mundo-3d-prototype.html?debug3d=1&qaEldoria=1",{waitUntil:"domcontentloaded",timeout:35000});
   const ready=await page.waitForFunction(()=>{const x=document.getElementById("loading")?.textContent||"";if(x.includes("Falha ao montar o mundo 3D"))return "failed";return window.SevenSinsDebug3D?.fly && window.EldoriaLiveCityQA?"ready":false;},null,{timeout:120000}).then(h=>h.jsonValue());
   if(ready!=="ready")throw Error("World did not load: "+ready);
   const plan=await page.evaluate(async()=>{
     const { treeStructurePlan }=await import("./eldoria-city-layout.js");
     const a=window.SevenSinsDebug3D;
     a.freeRoam();
     return {city:window.EldoriaLiveCityQA,structure:treeStructurePlan({x:-12.2,z:-44.5}),cull:a.cullInfo()?.length};
   });
   report[preset.name]={plan,video:null};
   for(const s of (preset.name==="desktop" ? spots.filter((_,i)=>[0,1,4,6,7,8,9].includes(i)) : spots)) {
     const data=await page.evaluate(({x,z,up,back,targetY})=>{
       const api=window.SevenSinsDebug3D;
       api.fly([x+back*.46,up,z+back],[x,targetY??2,z]);return {state:api.state(),camera:api.cam(),meshes:api.villageMeshes()?.slice(0,6),cull:api.cullInfo()?.slice(0,3)};
     },s);
     await page.waitForTimeout(850);
     const filename=path.join(dir,safe(s.name)+".png");
     await page.screenshot({path:filename,timeout:65000,animations:"disabled"});
     const actual=await page.evaluate(()=>({fps:document.body.innerText.match(/\b\d{1,3}\s*FPS\b/)?.[0]||null,sceneVisible:!!document.querySelector("#scene"),quality:document.getElementById("graphics-status-3d")?.textContent||null}));
     const camera=s.name==="arvore-lateral"?await page.evaluate(()=>window.SevenSinsDebug3D.cam()):null;
     report.cases.push({preset:preset.name,name:s.name,image:path.relative(output,filename),...actual,drawCalls:data.state?.calls,triangles:data.state?.triangles,...(camera?{camera}:{})});
   }
   // A3: fotografa as quatro costuras na mesma página WebGL do vídeo.
   // Um segundo contexto Chromium/SwiftShader excedeu 120 s ao montar a mesma cena; reutilizar a página evita duplicar GPU/memória.
   if(preset.mobile) {
     const device=await page.evaluate(()=>{
       const api=window.SevenSinsDebug3D;
       api.seamMode(true);
       return {coarsePointer:matchMedia("(pointer: coarse)").matches,innerWidth,innerHeight};
     });
     const lowSpec=device.coarsePointer||device.innerWidth<700;
     report[preset.name].terrainGrid={...device,lowSpec,fineCell:2.5,diagnosticMode:"seamMode",reason:lowSpec?"preset mobile de terreno ativo":"preset mobile de terreno NÃO ativo"};
     if(!lowSpec)report.errors.push("Android-landscape não ativou terrainLowSpec; costuras 2.5 m não foram comprovadas.");
     for(const edge of TERRAIN_EDGE_SHOTS) {
       const data=await page.evaluate(edge=>{
         const api=window.SevenSinsDebug3D;
         api.teleport(edge.x,edge.z,0);
         const targetPlayer=api.cineState().player;
         const target={x:targetPlayer[0],y:targetPlayer[1],z:targetPlayer[2]};
         const targetState=api.state();
         const cameraX=edge.x+edge.cameraOffset[0],cameraZ=edge.z+edge.cameraOffset[2];
         api.teleport(cameraX,cameraZ,0);
         const cameraPlayer=api.cineState().player;
         const cameraGround={x:cameraX,y:cameraPlayer[1],z:cameraZ};
         const cameraState=api.state();
         const from=[cameraX,Math.max(target.y,cameraGround.y)+edge.cameraOffset[1],cameraZ];
         const to=[edge.x+edge.targetOffset[0],target.y+edge.targetOffset[1],edge.z+edge.targetOffset[2]];
         api.teleport(-12.2,-44.5,0);
         const restored=api.state();
         api.fly(from,to);
         return {
           target,cameraGround,from,to,camera:api.cam(),
           targetState:{walkable:targetState.walkable,edge:targetState.edge},
           cameraState:{walkable:cameraState.walkable,edge:cameraState.edge},
           playerRestored:Math.hypot(restored.x+12.2,restored.z+44.5)<.1
         };
       },edge);
       await page.waitForTimeout(2600);
       const verified=await page.evaluate(to=>{
         const api=window.SevenSinsDebug3D;
         const viewCheck=api.camView(to);const centerPick=api.pick(0,0);return {camera:api.cam(),centerPick,viewCheck};
       },data.to);
       const visualGuide=await page.evaluate(edge=>{
         const api=window.SevenSinsDebug3D;
         const sampleLine=boundary=>[-edge.edgeSpan,edge.edgeSpan].map(offset=>{
           const x=edge.axis==="x"?boundary:edge.x+offset;
           const z=edge.axis==="x"?edge.z+offset:boundary;
           const hit=(api.rayDown(x,z)||[]).find(h=>String(h.n).includes("terrain-mod186"))||null;
           if(!hit)return {world:[x,null,z],mesh:null,ndc:null,onScreen:false,blocked:null};
           const view=api.camView([x,hit.y+.04,z]);
           return {world:[x,+hit.y.toFixed(3),z],mesh:hit.n,ndc:view.ndc,onScreen:view.onScreen,blocked:view.blocked};
         });
         const fine=sampleLine(edge.fineEdge),outer=sampleLine(edge.firstOuter);
         const screen=p=>p.ndc?[(p.ndc[0]+1)*innerWidth/2,(1-p.ndc[1])*innerHeight/2]:null;
         const mid=points=>points.every(p=>p.ndc)?[
           (screen(points[0])[0]+screen(points[1])[0])/2,
           (screen(points[0])[1]+screen(points[1])[1])/2
         ]:null;
         const fm=mid(fine),om=mid(outer);
         const pixelGap=fm&&om?Math.hypot(fm[0]-om[0],fm[1]-om[1]):0;
         const allTerrainHits=[...fine,...outer].every(p=>p.mesh==="terrain-mod186");
         const allOnScreen=[...fine,...outer].every(p=>p.onScreen);
         const ns="http://www.w3.org/2000/svg";
         const svg=document.createElementNS(ns,"svg");
         svg.id="a3-terrain-edge-overlay";
         svg.setAttribute("viewBox","0 0 "+innerWidth+" "+innerHeight);
         svg.setAttribute("width",String(innerWidth));svg.setAttribute("height",String(innerHeight));
         svg.style.cssText="position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:999999";
         const draw=(points,color)=>{
           if(!points.every(p=>p.ndc))return;
           const a=screen(points[0]),b=screen(points[1]);
           const line=document.createElementNS(ns,"line");
           line.setAttribute("x1",a[0]);line.setAttribute("y1",a[1]);line.setAttribute("x2",b[0]);line.setAttribute("y2",b[1]);
           line.setAttribute("stroke",color);line.setAttribute("stroke-width","4");line.setAttribute("stroke-linecap","round");
           svg.appendChild(line);
           for(const p of [a,b]){
             const dot=document.createElementNS(ns,"circle");dot.setAttribute("cx",p[0]);dot.setAttribute("cy",p[1]);dot.setAttribute("r","4");dot.setAttribute("fill",color);dot.setAttribute("stroke","#101820");dot.setAttribute("stroke-width","1.5");svg.appendChild(dot);
           }
         };
         draw(fine,"#00e5ff");draw(outer,"#ff9f1c");
         const box=document.createElementNS(ns,"rect");box.setAttribute("x",innerWidth/2-142);box.setAttribute("y","148");box.setAttribute("width","284");box.setAttribute("height","42");box.setAttribute("rx","7");box.setAttribute("fill","rgba(8,12,18,.88)");box.setAttribute("stroke","#b8a37a");svg.appendChild(box);
         const label=document.createElementNS(ns,"text");label.setAttribute("x",innerWidth/2);label.setAttribute("y","165");label.setAttribute("text-anchor","middle");label.setAttribute("font-size","11");label.setAttribute("font-family","Arial,sans-serif");label.setAttribute("fill","#ffffff");label.textContent="PR: limite fino  •  1ª célula externa 2,5 m";svg.appendChild(label);
         const sub=document.createElementNS(ns,"text");sub.setAttribute("x",innerWidth/2);sub.setAttribute("y","181");sub.setAttribute("text-anchor","middle");sub.setAttribute("font-size","10");sub.setAttribute("font-family","Arial,sans-serif");sub.setAttribute("fill","#f5d8a4");sub.textContent="mesma câmera e viewport do baseline main";svg.appendChild(sub);
         const cross=document.createElementNS(ns,"circle");cross.setAttribute("cx",innerWidth/2);cross.setAttribute("cy",innerHeight/2);cross.setAttribute("r","7");cross.setAttribute("fill","none");cross.setAttribute("stroke","#ffffff");cross.setAttribute("stroke-width","2");svg.appendChild(cross);
         document.body.appendChild(svg);
         return {fine,outer,pixelGap,allTerrainHits,allOnScreen,overlay:true};
       },edge);
       const primaryPick=verified.centerPick?.[0]||null;
       const terrainHit=!!primaryPick&&/terrain-mod186/.test(primaryPick[0]||"");
       const horizontalMiss=primaryPick?Math.hypot(primaryPick[2]-data.to[0],primaryPick[4]-data.to[2]):null;
       const targetVisible=!!verified.viewCheck?.onScreen&&!verified.viewCheck?.blocked;
       const cameraPinned=Array.isArray(verified.camera)&&verified.camera.length===3&&verified.camera.every((v,i)=>Math.abs(v-data.from[i])<.5);
       const visualGuideOk=visualGuide.allTerrainHits&&visualGuide.allOnScreen&&visualGuide.pixelGap>=8;
      const positioned=Number.isFinite(data.target.y)&&Number.isFinite(data.cameraGround?.y)&&cameraPinned&&data.playerRestored&&terrainHit&&horizontalMiss!==null&&horizontalMiss<1.5&&targetVisible&&visualGuideOk;
       if(!cameraPinned)report.errors.push("Override de câmera não permaneceu ativo na costura "+edge.name);
       if(!terrainHit||horizontalMiss===null||horizontalMiss>=1.5)report.errors.push("Raio central não atingiu o ponto da malha na costura "+edge.name+": "+JSON.stringify(primaryPick));
       if(!targetVisible)report.errors.push("Alvo da costura fora do quadro ou obstruído em "+edge.name+": "+JSON.stringify(verified.viewCheck));
       if(!data.playerRestored)report.errors.push("Jogador não foi restaurado após sondar "+edge.name);
       if(!visualGuide.allTerrainHits)report.errors.push("Amostras das duas linhas não atingiram terrain-mod186 em "+edge.name+": "+JSON.stringify(visualGuide));
       if(!visualGuide.allOnScreen)report.errors.push("Linhas de referência fora do quadro em "+edge.name+": "+JSON.stringify(visualGuide));
       if(visualGuide.pixelGap<8)report.errors.push("Linhas de referência não distinguíveis em "+edge.name+": "+visualGuide.pixelGap+" px");
       const filename=path.join(dir,safe(edge.name)+".png");
       await page.screenshot({path:filename,timeout:65000,animations:"disabled"});
       await page.evaluate(()=>document.getElementById("a3-terrain-edge-overlay")?.remove());
       const actual=await page.evaluate(()=>({fps:document.body.innerText.match(/\\b\\d{1,3}\\s*FPS\\b/)?.[0]||null,sceneVisible:!!document.querySelector("#scene"),quality:document.getElementById("graphics-status-3d")?.textContent||null}));
       report.cases.push({
         preset:preset.name,name:edge.name,image:path.relative(output,filename),...actual,positioned,
         reason:positioned?"duas bordas amostradas no terreno e projetadas no quadro; inspecionar continuidade":"captura sem enquadramento/linhas de referência comprovados",
         terrainEdge:{axis:edge.axis,fineCell:edge.fineCell,fineEdge:edge.fineEdge,firstOuter:edge.firstOuter,expectedWidth:Math.abs(edge.firstOuter-edge.fineEdge),target:data.target,cameraGround:data.cameraGround,targetState:data.targetState,cameraState:data.cameraState,from:data.from,to:data.to,camera:data.camera,cameraAfter:verified.camera,centerPick:verified.centerPick,viewCheck:verified.viewCheck,horizontalMiss,terrainHit,targetVisible,playerRestored:data.playerRestored,visualGuide}
       });
     }
     // seamMode oculta o céu e objetos de fundo; recarregar restaura a cena normal antes do teste de escada/vídeo.
     await page.reload({waitUntil:"domcontentloaded",timeout:35000});
     const restoredReady=await page.waitForFunction(()=>window.SevenSinsDebug3D?.fly&&window.EldoriaLiveCityQA?"ready":false,null,{timeout:120000}).then(h=>h.jsonValue());
     if(restoredReady!=="ready")throw Error("World did not reload after seam diagnostics");
     await page.evaluate(()=>window.SevenSinsDebug3D.freeRoam());
     await page.waitForTimeout(1200);
     const edgeTraversal = await page.evaluate(async lines => {
       const api = window.SevenSinsDebug3D;
       const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
       const probe = async (x,z) => {
         api.teleport(x,z,0);
         await frame();
         const state = api.state();
         return {x:state.x,y:state.y,z:state.z,walkable:!!state.walkable,edge:state.edge};
       };
       const lineReports = [], candidates = [];
       for (const line of lines) {
         const local = [];
         let scanned = 0;
         const coords = (along,offset) => line.axis === "x"
           ? [line.boundary + line.interiorSign * offset, along]
           : [along, line.boundary + line.interiorSign * offset];
         for (let along=line.min; along<=line.max+1e-6; along+=line.step) {
           const samples = [];
           const offsets = [line.walkDepth,line.probeOffset,-line.probeOffset,-line.walkDepth];
           for (const offset of offsets) {
             const [x,z] = coords(along,offset);
             samples.push(await probe(x,z));
           }
           scanned++;
           const valid = samples.every((s,i) => {
             const [x,z] = coords(along,offsets[i]);
             return s.walkable && Number.isFinite(s.y) && Math.hypot(s.x-x,s.z-z) < 1;
           });
           if (valid) {
             const start=coords(along,line.walkDepth), end=coords(along,-line.walkDepth);
             local.push({line:line.name,axis:line.axis,along,start,end,deltaY:Math.abs(samples[3].y-samples[0].y),samples});
           }
         }
         local.sort((a,b)=>a.deltaY-b.deltaY);
         candidates.push(...local.slice(0,4));
         lineReports.push({name:line.name,scanned,walkableCandidates:local.length,best:local[0]||null});
       }
       candidates.sort((a,b)=>a.deltaY-b.deltaY);
       const summarize = r => ({
         progress:r?.progress, fell:!!r?.fell, pen:r?.pen??0, maxY:r?.maxY,
         start:r?.start, end:r?.end, traceFrames:Array.isArray(r?.trace)?r.trace.length:null
       });
       const pass = r => Number.isFinite(r?.progress) && r.progress>=.92 && !r.fell && (r.pen??0)===0 && Array.isArray(r.end);
       const tested=[];
       let selected=null;
       for (const candidate of candidates.slice(0,8)) {
         const forward = await api.navWalk(candidate.start[0],candidate.start[1],candidate.end[0],candidate.end[1],{seconds:5});
         const reverse = await api.navWalk(candidate.end[0],candidate.end[1],candidate.start[0],candidate.start[1],{seconds:5});
         const f=summarize(forward), r=summarize(reverse), ok=pass(forward)&&pass(reverse);
         tested.push({line:candidate.line,along:candidate.along,start:candidate.start,end:candidate.end,deltaY:candidate.deltaY,forward:f,reverse:r,pass:ok});
         if (ok) { selected=candidate; break; }
       }
       api.teleport(-12.2,-44.5,0);
       api.freeRoam();
       return {
         status:selected?"walk-tested":candidates.length?"walk-candidates-failed":"no-walkable-corridor-in-scan",
         lines:lineReports,tested,
         selected:selected?{line:selected.line,axis:selected.axis,along:selected.along,start:selected.start,end:selected.end,deltaY:selected.deltaY}:null
       };
     }, TERRAIN_EDGE_WALK_LINES);
     report[preset.name].edgeTraversal = edgeTraversal;
     if (edgeTraversal.status === "walk-candidates-failed") {
       report.errors.push("Nenhum corredor de borda completou a caminhada nos dois sentidos: " + JSON.stringify(edgeTraversal.tested));
     }
     if (edgeTraversal.status === "walk-tested" && edgeTraversal.selected) {
       const selected=edgeTraversal.selected;
       const dx=selected.end[0]-selected.start[0], dz=selected.end[1]-selected.start[1];
       const length=Math.hypot(dx,dz), direction={x:dx/length,z:dz/length};
       const yaw=terrainEdgeWalkCameraYaw(selected.start,selected.end);
       await page.evaluate(({start,yaw})=>{
         const api=window.SevenSinsDebug3D;
         api.teleport(start[0],start[1],yaw);
         api.view(yaw,.18,7);
       },{start:selected.start,yaw});
       let liveState=await page.evaluate(()=>window.SevenSinsDebug3D.walkState());
       let liveProgress=0, lateralMeters=0;
       for(let i=0;i<48;i++){
         // Re-aim from the actual feet after each step. Camera recentering and
         // acceleration remain active between steps, as in the playable world.
         const heading=terrainEdgeWalkCameraYaw([liveState.x,liveState.z],selected.end);
         liveState=await page.evaluate(({input,heading})=>{
           const api=window.SevenSinsDebug3D;
           api.view(heading,.18,7);
           api.motionStep(.25,input);
           return api.walkState();
         },{input:TERRAIN_EDGE_WALK_INPUT,heading});
         await page.waitForTimeout(100);
         const deltaX=liveState.x-selected.start[0], deltaZ=liveState.z-selected.start[1];
         liveProgress=deltaX*direction.x+deltaZ*direction.z;
         lateralMeters=Math.abs(deltaX*(-direction.z)+deltaZ*direction.x);
         if(liveProgress>=length-.5 || lateralMeters>2.5) break;
       }
       const reached=liveProgress>=length-1.5&&lateralMeters<=1.5&&liveState.grounded!==false;
       edgeTraversal.liveReplay={
         start:selected.start,end:selected.end,targetMeters:+length.toFixed(2),
         progressMeters:+liveProgress.toFixed(2),lateralMeters:+lateralMeters.toFixed(2),
         yaw,final:liveState,reached
       };
       if(!reached) report.errors.push("Replay jogável desviou da costura "+selected.line+": "+JSON.stringify(edgeTraversal.liveReplay));
       const walkShot=path.join(dir,"travessia-"+safe(selected.line)+".png");
       await page.screenshot({path:walkShot,timeout:65000,animations:"disabled"});
       edgeTraversal.liveReplay.image=path.relative(output,walkShot);
       await page.evaluate(()=>{const api=window.SevenSinsDebug3D;api.teleport(-12.2,-44.5,0);api.freeRoam();});
     }
   }
   // Teste funcional reproduzível: subir a escada verdadeira em passos, medindo altura do root.
   const climb=await page.evaluate(async()=>{
     const api=window.SevenSinsDebug3D;
     const {treeStructurePlan}=await import("./eldoria-city-layout.js");
     const stair=treeStructurePlan({x:-12.2,z:-44.5}).stair[0],a=stair.a,b=stair.b;
     api.teleport(a[0],a[1]);api.fly([a[0]+8,8,a[1]+11],[a[0],2,a[1]]);
     const prior=api.walkState();
     api.walkMove(b[0]-a[0],b[1]-a[1],2);
     return {prior,foot:a,top:b};
   });
   // Avança a física determinística, sem depender do FPS real do SwiftShader.
   const result=await page.evaluate(()=>{const d=window.SevenSinsDebug3D;d.combatStep(2.8,{fps:30,draw:false});return{state:d.walkState(),busy:d.walkBusy()};});
   const after=result.state;
   const snap=path.join(dir,"escada-depois-caminhada.png");
   await page.screenshot({path:snap,timeout:65000,animations:"disabled"});
   const expected=Math.hypot(climb.top[0]-climb.foot[0],climb.top[1]-climb.foot[1]);
   const moved=Math.hypot(after.x-climb.prior.x,after.z-climb.prior.z);
   const ascent=after.y-climb.prior.y;
   const completed=!result.busy,pass=completed&&moved>=expected*.7&&ascent>=1.5;
   const reason=!completed?"SwiftShader lento: comando ainda em andamento; subida não validada":pass?"Subida confirmada":"Caminhada terminou sem atingir o topo da escada";
   report.cases.push({preset:preset.name,name:"subida-escada",before:climb.prior,after,screen:path.relative(output,snap),expected,moved,ascent,completed,pass,reason});
   if(!pass){report.errors.push("Auditoria de escada inconclusiva ou falhou ("+preset.name+"): "+reason);process.exitCode=1;}
   await page.close(); await context.close();context=null;
   if(preset.mobile)await captureMainBaseline(browser,base,output,report);
  }
  report.status=report.errors.length?"needs-review":"captured";
  if(report.errors.length)process.exitCode=1;
 }catch(e){report.status="failed";report.error=String(e.stack||e).slice(0,1500);process.exitCode=1;}
 finally {if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});
   report.videos=fs.readdirSync(path.join(output,"android-landscape"),{withFileTypes:true}).filter(x=>x.name.endsWith(".webm")).map(x=>"android-landscape/"+x.name).concat(fs.existsSync(path.join(output,"desktop"))?fs.readdirSync(path.join(output,"desktop")).filter(x=>x.endsWith(".webm")).map(x=>"desktop/"+x):[]);
   fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2));
   console.log(JSON.stringify({status:report.status,cases:report.cases.length,errors:report.errors.length,videos:report.videos.length,edgeTraversal:report["android-landscape"]?.edgeTraversal?.status||"not-run",error:report.error||""}));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
