const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const out=path.resolve(process.env.GLB_QA_OUT||'evidence');fs.mkdirSync(out,{recursive:true});
 const manifest=JSON.parse(fs.readFileSync('optimized/report.json'));
 const save=new Set(['Asas.glb','AnjoGuiador-otimizado.glb','AsasAnjo_leve.glb','Prota_otimizado_2K.glb','Demonio1.glb','Sandra-rig.glb','NpcEspecial-otimizado.glb','Cavalo.glb','ArvoreAncestralEldoria.glb']);
 const report={platform:'Chromium SwiftShader desktop + touch viewport; no physical Android',errors:[],assets:[],status:'running'};
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:852,height:480}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});const page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push('HTTP '+r.status()+' '+r.url());});
   await page.goto((process.env.GLB_QA_URL||'http://127.0.0.1:4180')+'/tools/glb/validation.html');await page.waitForFunction(()=>window.labReady);
   for(const item of manifest.filter(r=>r.status==='candidate'&&(!process.env.GLB_FILES||process.env.GLB_FILES.split(',').includes(r.file)))){
    const result=await page.evaluate(async({file,save})=>window.compareAsset(file,save),{file:item.file,save:!mobile&&save.has(item.file)});
    for(const image of result.images){for(const side of ['before','after'])fs.writeFileSync(path.join(out,item.file+'-'+image.view+'-'+side+'.png'),Buffer.from(image[side].split(',')[1],'base64'));}delete result.images;result.mobile=mobile;
    report.assets.push(result);fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));console.log(item.file,mobile?'touch':'desktop',result.ok?'identical':'DIFFERENT',result.poses.length);
    if(!result.ok)throw new Error('Pixel mismatch '+item.file);
   }
   await context.close();
  }
  report.status=report.errors.length?'failed':'passed';
 }catch(e){report.status='failed';report.errors.push(String(e.stack||e));process.exitCode=1;}
 finally{await browser.close();fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));console.log(report.status,report.assets.length,report.errors);}
})();
