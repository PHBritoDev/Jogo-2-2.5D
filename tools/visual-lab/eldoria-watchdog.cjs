'use strict';
/**
 * Auditor visual recorrente, SOMENTE leitura: abre o jogo real em Chromium/WebGL,
 * reproduz cenarios relatados, inspeciona pixels + estado, produz FOTOS apenas
 * dos locais suspeitos. Nada de editar codigo, abrir PR, ou fingir que pixel
 * heuristics sao inteligencia visual multimodal. Referencias externas para
 * revisao humana (nao consultar web automaticamente).
 */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),sharp=require('sharp');
const {analyzePixels}=require('./agent-policy.cjs');
const out=path.resolve('visual-lab-results/eldoria-watchdog');
fs.mkdirSync(out,{recursive:true});
const report={date:new Date().toISOString(),commit:process.env.GITHUB_SHA||'local',platform:'Chromium SwiftShader mobile viewport, NAO Android fisico',mode:'observacao-sem-edicao',status:'incomplete',suspects:[],errors:[],referenceGuidance:[
 'https://threejs.org/docs/pages/InstancedMesh.html',
 'https://threejs.org/manual/en/fog.html',
 'https://threejs.org/docs/pages/Raycaster.html'
]};
const WORLD=[
 {name:'tochas-antigas-relatadas',zone:null,x:-20.6,z:-38.0,yaw:0,distance:.72,why:'Confirmar substituicao das tochas da vila pelo GLB do criador'},
 {name:'dez-lampioes-genericos-retirados',zone:null,x:-4.2,z:-62.5,yaw:2.3,distance:4.8,why:'Provar que todos os dez postes procedurais da cidade foram substituidos por TochaMedievalTripo.glb'},
 {name:'arbustos-e-arvores-claras',zone:null,x:34,z:-56,yaw:2.8,why:'Verificar plantas repetidas e troncos excessivamente claros'},
 {name:'raizes-arvore-ancestral',zone:null,x:-13.2,z:-57,yaw:0,distance:.72,why:'Verificar raiz exposta e colisao em ramo atraves do jogador'},
 {name:'caverna-corredor',zone:'cave',x:0,z:-99,yaw:Math.PI,why:'Investigar parede, teto baixo e camera cortando rocha'},
 {name:'caverna-primeira-pessoa',zone:'cave',x:0,z:-99,yaw:Math.PI,distance:.72,why:'Verificar enquadramento sem corpo, paredes e visibilidade em primeira pessoa'},
 {name:'caverna-primeira-pessoa-portal',zone:'cave',x:-4,z:-136,yaw:Math.PI,distance:.72,why:'Verificar tunel do portal com camera na altura dos olhos'},
 {name:'caverna-borda-abismo',zone:'cave',x:7,z:-60,yaw:-.4,why:'Inspecionar suporte falso sobre abismo'},
 {name:'escadaria-juncao-ilha',zone:'ascent',x:0,z:-367,yaw:Math.PI,why:'Inspecionar emenda solida entre escada e ilha'},
 {name:'escadaria-ponte-centro',zone:'ascent',x:0,z:-378,yaw:Math.PI,why:'Verificar passarela entre escada e ilha, sem vao visual'},
 {name:'deserto-negro-topo',zone:'ascent',x:0,z:-428,yaw:2,why:'Inspecionar solo da ilha, rochas e composicao da neblina'}
];
(async()=>{
 let browser,context;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  context=await browser.newContext({viewport:{width:852,height:480},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:852,height:480}}});
  const page=await context.newPage();
  const video=page.video();
  page.on('pageerror',e=>report.errors.push({type:'browser',message:String(e.message||e).slice(0,550)}));
  page.on('response',r=>{if(r.status()>=400&&/\.(glb|js)(?:[?#]|$)/.test(r.url()))report.errors.push({type:'asset',status:r.status(),url:r.url().slice(0,200)});});
  await page.goto((process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173')+'/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof window.SevenSinsDebug3D?.ascension==='function',null,{timeout:160000});
  await page.evaluate(()=>window.SevenSinsDebug3D.freeRoam());
  // Esperar os GLBs antes da primeira foto; snapshots durante loading geravam alarmes falsos.
  try{await page.waitForFunction(()=>window.SevenSinsDebug3D?.torchAudit?.().loaded>=2,null,{timeout:90000});}
  catch(e){report.errors.push({type:'load',message:'Tochas GLB nao carregaram antes do limite de 90 segundos'});}
  try{await page.waitForFunction(()=>window.SevenSinsDebug3D?.torchAudit?.().city?.loaded===10,null,{timeout:90000});}
  catch(e){report.errors.push({type:'torch',message:'As dez tochas GLB da cidade nao foram carregadas'});}
  const cityTorchAudit=await page.evaluate(()=>window.SevenSinsDebug3D.torchAudit());
  if(cityTorchAudit.procedural?.length)report.errors.push({type:'torch',message:'Geometria antiga de chamas/postes ainda presente: '+cityTorchAudit.procedural.join(',')});
  report.torchAudit=cityTorchAudit;
  let zone=null;
  for(const c of WORLD){
   if(c.zone!==zone){
    await page.evaluate(async zone=>{const a=window.SevenSinsDebug3D;if(zone)await a.ascension(zone);else if(a.ascState().key)await a.ascension(null);},c.zone);
    zone=c.zone;
   }
   const data=await page.evaluate(({x,z,yaw,zone,distance})=>{
    const a=window.SevenSinsDebug3D,s=a.ascState();
    if(zone){const ox=s.world.x-s.local.x,oz=s.world.z-s.local.z;a.teleport(ox+x,oz+z);}else a.teleport(x,z);
    a.fly(null);a.view(yaw,.10,distance||5.5);
    return {camera:a.snapCam(),state:a.ascState(),renderer:a.rinfo(),world:a.state(),torches:a.torchAudit?.()};
   },c);
   await page.waitForTimeout(1600);
   const filename=c.name+'.png',filepath=path.join(out,filename);
   const png=await page.screenshot({path:filepath,animations:'disabled',timeout:65000});
   const raw=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});
   const percept=analyzePixels(raw.data,raw.info.width,raw.info.height,null);
   const flags=percept.flags||[];
   if(!data.camera?.every(Number.isFinite))flags.push('camera_invalida');
   if(c.name==='tochas-antigas-relatadas'&&data.torches?.loaded<data.torches?.expected)flags.push('tocha_glb_faltando');
   if(percept.darkFraction>.985&&percept.contrast<.025)flags.push('tela_quase_totalmente_preta');
   if(percept.brightFraction>.8)flags.push('tela_quase_totalmente_branca');
   report.suspects.push({name:c.name,image:filename,reason:c.why,detected:flags,metrics:percept,camera:data.camera,position:data.state?.local||data.state?.world,draw:data.world?.calls,triangles:data.world?.triangles,torches:data.torches});
   console.log('AUDIT '+c.name+' '+flags.join(','));
  }
  report.status=report.errors.length?'suspected_errors':'captured';
  // O video do Playwright permanece associado ao navegador; o arquivo e fechado no finally.
  report.video='percurso-completo.webm';
 }catch(e){report.status='failed';report.errors.push({type:'runner',message:String(e.stack||e).slice(0,1700)});process.exitCode=1;}
 finally{if(context){const pages=context.pages();const videos=pages.map(p=>p.video()).filter(Boolean);await context.close().catch(()=>{});for(const v of videos){try{const original=await v.path();if(fs.existsSync(original))fs.renameSync(original,path.join(out,'percurso-completo.webm'));}catch(e){report.errors.push({type:'video',message:String(e).slice(0,300)});}}}if(browser)await browser.close().catch(()=>{});
  fs.writeFileSync(path.join(out,'candidatos.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,candidates:report.suspects.length,errors:report.errors.length}));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
