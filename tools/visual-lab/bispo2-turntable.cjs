'use strict';
/* Captura sob demanda autorizada pelo criador. Modelagem e texturas reais do Bispo2-lod.glb;
   nenhuma arte gerada e nenhuma modificação de rig ou jogo. */
const { chromium }=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173';
const dir=path.resolve('visual-lab-results/bispo2-360');
fs.mkdirSync(dir,{recursive:true});
const angles=[0,45,90,135,180,225,270,315];const labels=['00-frente','01-diagonal-direita','02-lado-direito','03-costas-direita','04-costas','05-costas-esquerda','06-lado-esquerdo','07-diagonal-esquerda'];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--ignore-gpu-blocklist']});
 const result={source:'Bispo2-lod.glb',angles:[],errors:[]};
 try{
  const context=await browser.newContext({viewport:{width:720,height:960},deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await context.newPage();
  page.on('pageerror',e=>result.errors.push(e.message));
  for(let i=0;i<angles.length;i++){
   const angle=angles[i],url=base+'/tools/visual-lab/bispo2-turntable.html?angle='+angle;
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.__BISPO2_CAPTURE__!==undefined,{timeout:90000});
   const status=await page.evaluate(()=>window.__BISPO2_CAPTURE__);
   if(!status.ready)throw Error('GLB nao carregou em '+angle+': '+status.error);
   const file=labels[i]+'.png';await page.screenshot({path:path.join(dir,file),animations:'disabled',timeout:60000});
   result.angles.push({angle,file,source:status.source,animationClips:status.animations});
   console.log('Capturado',angle,file);
  }
  await context.close();
 } finally{
  fs.writeFileSync(path.join(dir,'manifesto.json'),JSON.stringify(result,null,2));
  await browser.close();
 }
 if(result.angles.length!==8)throw Error('Capturas incompletas');
})().catch(e=>{console.error(e);process.exitCode=1});