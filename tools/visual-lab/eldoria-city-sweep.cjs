"use strict";
// Auditoria visual REAL do jogo, com Chromium/WebGL, screenshots e video. Nenhuma simulação de prints.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { TERRAIN_EDGE_SHOTS } = require("./a3-terrain-edge-plan.cjs");
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
 {name:"floresta-contorno",x:34,z:-56,up:17,back:22}
];
const report = {status:"incomplete",cases:[],errors:[],consoleErrors:[],browser:"Chromium WebGL (SwiftShader); NOT physical Android"};
const safe = s => String(s||"").replace(/[^a-z0-9_-]/gi,"-");
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
   for(const s of (preset.name==="desktop" ? spots.filter((_,i)=>[0,1,4,6,7].includes(i)) : spots)) {
     const data=await page.evaluate(({x,z,up,back})=>{
       const api=window.SevenSinsDebug3D;
       api.fly([x+back*.46,up,z+back],[x,2,z]);return {state:api.state(),camera:api.cam(),meshes:api.villageMeshes()?.slice(0,6),cull:api.cullInfo()?.slice(0,3)};
     },s);
     await page.waitForTimeout(850);
     const filename=path.join(dir,safe(s.name)+".png");
     await page.screenshot({path:filename,timeout:65000,animations:"disabled"});
     const actual=await page.evaluate(()=>({fps:document.body.innerText.match(/\b\d{1,3}\s*FPS\b/)?.[0]||null,sceneVisible:!!document.querySelector("#scene"),quality:document.getElementById("graphics-status-3d")?.textContent||null}));
     report.cases.push({preset:preset.name,name:s.name,image:path.relative(output,filename),...actual,drawCalls:data.state?.calls,triangles:data.state?.triangles});
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
         return {camera:api.cam(),centerPick:api.pick(0,0),viewCheck:api.camView(to)};
       },data.to);
       const primaryPick=verified.centerPick?.[0]||null;
       const terrainHit=!!primaryPick&&/terrain-mod186/.test(primaryPick[0]||"");
       const horizontalMiss=primaryPick?Math.hypot(primaryPick[2]-data.to[0],primaryPick[4]-data.to[2]):null;
       const targetVisible=!!verified.viewCheck?.onScreen&&!verified.viewCheck?.blocked;
       const cameraPinned=Array.isArray(verified.camera)&&verified.camera.length===3&&verified.camera.every((v,i)=>Math.abs(v-data.from[i])<.5);
       const positioned=Number.isFinite(data.target.y)&&Number.isFinite(data.cameraGround?.y)&&cameraPinned&&data.playerRestored&&terrainHit&&horizontalMiss!==null&&horizontalMiss<1.5&&targetVisible;
       if(!cameraPinned)report.errors.push("Override de câmera não permaneceu ativo na costura "+edge.name);
       if(!terrainHit||horizontalMiss===null||horizontalMiss>=1.5)report.errors.push("Raio central não atingiu o ponto da malha na costura "+edge.name+": "+JSON.stringify(primaryPick));
       if(!targetVisible)report.errors.push("Alvo da costura fora do quadro ou obstruído em "+edge.name+": "+JSON.stringify(verified.viewCheck));
       if(!data.playerRestored)report.errors.push("Jogador não foi restaurado após sondar "+edge.name);
       const filename=path.join(dir,safe(edge.name)+".png");
       await page.screenshot({path:filename,timeout:65000,animations:"disabled"});
       const actual=await page.evaluate(()=>({fps:document.body.innerText.match(/\\b\\d{1,3}\\s*FPS\\b/)?.[0]||null,sceneVisible:!!document.querySelector("#scene"),quality:document.getElementById("graphics-status-3d")?.textContent||null}));
       report.cases.push({
         preset:preset.name,name:edge.name,image:path.relative(output,filename),...actual,positioned,
         reason:positioned?"alvo central no terreno, visível e sem oclusão; inspecionar PNG":"captura sem enquadramento comprovado",
         terrainEdge:{axis:edge.axis,fineCell:edge.fineCell,fineEdge:edge.fineEdge,firstOuter:edge.firstOuter,expectedWidth:Math.abs(edge.firstOuter-edge.fineEdge),target:data.target,cameraGround:data.cameraGround,targetState:data.targetState,cameraState:data.cameraState,from:data.from,to:data.to,camera:data.camera,cameraAfter:verified.camera,centerPick:verified.centerPick,viewCheck:verified.viewCheck,horizontalMiss,terrainHit,targetVisible,playerRestored:data.playerRestored}
       });
     }
     // seamMode oculta o céu e objetos de fundo; recarregar restaura a cena normal antes do teste de escada/vídeo.
     await page.reload({waitUntil:"domcontentloaded",timeout:35000});
     const restoredReady=await page.waitForFunction(()=>window.SevenSinsDebug3D?.fly&&window.EldoriaLiveCityQA?"ready":false,null,{timeout:120000}).then(h=>h.jsonValue());
     if(restoredReady!=="ready")throw Error("World did not reload after seam diagnostics");
     await page.evaluate(()=>window.SevenSinsDebug3D.freeRoam());
     await page.waitForTimeout(1200);
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
  }
  report.status=report.errors.length?"needs-review":"captured";
  if(report.errors.length)process.exitCode=1;
 }catch(e){report.status="failed";report.error=String(e.stack||e).slice(0,1500);process.exitCode=1;}
 finally {if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});
   report.videos=fs.readdirSync(path.join(output,"android-landscape"),{withFileTypes:true}).filter(x=>x.name.endsWith(".webm")).map(x=>"android-landscape/"+x.name).concat(fs.existsSync(path.join(output,"desktop"))?fs.readdirSync(path.join(output,"desktop")).filter(x=>x.endsWith(".webm")).map(x=>"desktop/"+x):[]);
   fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2));
   console.log(JSON.stringify({status:report.status,cases:report.cases.length,errors:report.errors.length,videos:report.videos.length,error:report.error||""}));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
