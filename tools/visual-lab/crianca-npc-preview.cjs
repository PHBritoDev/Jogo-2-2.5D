'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve('work/preview-crianca-npc');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 let report={errors:[],shots:[],ok:false};
 try{
  const c=await b.newContext({viewport:{width:1000,height:1000},deviceScaleFactor:1,recordVideo:{dir:path.join(out,'video')}});
  const p=await c.newPage();
  p.on('pageerror',e=>report.errors.push(String(e)));
  p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
  p.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url())});
  await p.goto('http://127.0.0.1:4173/tools/visual-lab/crianca-npc-preview.html',{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForFunction(()=>window.ready,{timeout:120000});
  report.model=await p.evaluate(()=>window.modelReport);
  if(report.model.error)throw Error(report.model.error);
  for(const [name,yaw] of [['frente',0],['diagonal',Math.PI/4],['costas',Math.PI],['lateral',Math.PI/2]]){
    await p.evaluate(yaw=>window.preview.pose(yaw),yaw);
    await p.screenshot({path:path.join(out,name+'.png')});report.shots.push(name+'.png');
  }
  report.ok=true;
  await c.close();
 }finally{fs.writeFileSync(path.join(out,'relatorio.json'),JSON.stringify(report,null,2));await b.close();}
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});