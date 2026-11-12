'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const output=path.resolve('visual-lab-results/water-wade');fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 let result={passed:false};
 try{
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.SevenSinsDebug3D?.combatStep&&document.getElementById('loading')?.classList.contains('hidden'),null,{timeout:120000});
  result=await page.evaluate(()=>{
    const d=SevenSinsDebug3D;d.freeRoam();let candidate=null;
    // O lago original tem margem de 0,9–1,25 m; testar pontos livres sem árvores/rochas.
    for(let z=-102;z<=-73&&!candidate;z+=.5)for(let x=-43;x<=-12;x+=.5){
      const a=d.whyBlocked(x,z),b=d.whyBlocked(x+1,z);
      if(a.water>=.94&&a.water<1.2&&b.water>=.94&&b.water<1.25&&!a.player&&!b.player){candidate={x,z,depth:a.water,toDepth:b.water};break;}
    }
    if(!candidate)return{error:'Nenhuma margem contínua livre 0,94–1,25 m; requer investigação de colisão'};
    d.teleport(candidate.x,candidate.z,0);d.view(0,0,6);d.combatStep(.18,{fps:30,draw:false});
    const before=d.heroState();d.setJoy(1,0);d.combatStep(.75,{fps:30,draw:false});d.setJoy(0,0);const after=d.heroState();
    return{candidate,before,after,travel:Math.hypot(after.p[0]-before.p[0],after.p[2]-before.p[2])};
  });
  await page.screenshot({path:path.join(output,'wading-android.png')});
  result.errors=errors;result.passed=!!result.candidate&&result.travel>.65&&errors.length===0;
  if(!result.passed)throw Error('Travessia de água real não comprovada: '+JSON.stringify(result).slice(0,500));
 }finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
