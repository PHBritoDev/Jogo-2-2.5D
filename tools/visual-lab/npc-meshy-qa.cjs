'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve('work/npc-meshy-qa');fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={models:[],errors:[],status:'pending'};
 try{
  const page=await browser.newPage({viewport:{width:1000,height:740},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/npc-visual-qa.html',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>window.qaReady===true,{timeout:60000});
  for(const role of ['vendorMan','vendorWoman','elder','downMan','downWoman','sitting','walking','boy','girl']){
   const data=await page.evaluate(r=>window.mountNpc(r),role);
   await page.waitForTimeout(350);
   await page.screenshot({path:path.join(dir,role+'.png')});
   report.models.push(data);
   const maxDim=Math.max(...data.size),minDim=Math.min(...data.size);
   if(maxDim>3.0||maxDim<.35||data.center[1]>2.4||data.center[1]<-.4||data.min[1]<-.5)report.errors.push('Dimensoes invalidas '+role+': '+JSON.stringify(data));
   if((role==='boy'||role==='girl')&&data.size[1]>1.45)report.errors.push('Crianca maior que gaiola: '+role);
  }
  // Mod 318 — close-ups de cabeça (frente/lado/costas/olhar/caminhada) e métricas reais cabelo–crânio
  const looks={vendorMan:{hair:'short',hairColor:'castanho',beard:'short'},elder:{hair:'balding',hairColor:'grisalho',beard:'full'},vendorWoman:{hair:'long',hairColor:'ruivo'}};
  report.hair=[];
  for(const role of ['vendorMan','vendorWoman','elder','boy','girl']){
   const m=await page.evaluate(([r,l])=>window.mountNpc(r,l),[role,looks[role]||null]);const rec={role,views:[]};
   rec.rest=await page.evaluate(()=>window.hairFit());
   for(const v of ['front','side','back']){await page.evaluate(v=>window.closeup(v),v);const f=path.join(dir,'head-'+role+'-'+v+'.png');await page.screenshot({path:f});rec.views.push(path.basename(f));}
   await page.evaluate(()=>window.pose({headYaw:.6,headPitch:-.25}));rec.look=await page.evaluate(()=>window.hairFit());await page.evaluate(()=>window.closeup('three'));await page.screenshot({path:path.join(dir,'head-'+role+'-olhar.png')});
   const walk=(m.clips||[]).find(c=>/^walking$/i.test(c));if(walk){await page.evaluate(c=>window.pose({clip:c,t:.45}),walk);rec.walk=await page.evaluate(()=>window.hairFit());await page.evaluate(()=>window.closeup('side'));await page.screenshot({path:path.join(dir,'head-'+role+'-caminhada.png')});}
   for(const k of ['rest','look','walk']){const h=rec[k];if(!h||!h.hair)continue;
    // cabelo encostado no crânio: todo vértice do topo da cabeça tem cabelo a ≤ 4 cm (antes: 3–6 cm acima e parado quando a cabeça girava)
    if(h.topToHairWorst>.045)report.errors.push(`Cabelo afastado do crânio (${role}/${k}): ${h.topToHairWorst} m`);
    if(h.offsetXZ>.07)report.errors.push(`Cabelo deslocado da cabeça (${role}/${k}): ${h.offsetXZ} m`);}
   report.hair.push(rec);}
  report.status=report.errors.length?'failed':'passed';
  if(report.errors.length)process.exitCode=1;
 }catch(e){report.status='failed';report.errors.push(String(e));process.exitCode=1;}finally{
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));await browser.close();
  console.log(JSON.stringify(report));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
