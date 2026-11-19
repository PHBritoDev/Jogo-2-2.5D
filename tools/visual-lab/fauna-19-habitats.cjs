const {chromium}=require('playwright');
const fs=require('node:fs'), assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:850,height:400}});
  await page.addInitScript(()=>{
   localStorage.setItem('seven-sins-3d-prologo-ceu','1');
   localStorage.setItem('seven-sins-3d-graphics','low');
   localStorage.setItem('sevenSins3DCampaignV6',JSON.stringify({version:6,act1Rev:2,questStep:1,awakeningSeen:true,playerName:'QA',actCardSeen:true}));
  });
  await page.goto(process.env.FAUNA_URL||'http://localhost:4203/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.SevenSinsDebug3D?.state().calls>0,null,{timeout:180000});
  const measurements={};
  for(const kind of ['coelho','montanha','lava','dourado','grilo']){
   measurements[kind]=await page.evaluate(async kind=>{
    const {FAUNA,cellCandidate,FAUNA_CELL}=await import('./fauna3d.js');
    const api=SevenSinsDebug3D;api.freeRoam();api.speed(3);api.setHour(kind==='grilo'?20:12);
    const candidates=[];
    for(let x=-1460;x<-160;x+=FAUNA_CELL)for(let z=-165;z<50;z+=FAUNA_CELL){
      const c=cellCandidate(kind,Math.floor(x/FAUNA_CELL),Math.floor(z/FAUNA_CELL));
      if(c && FAUNA[kind].biomes.includes(api.faunaBiome(c.x,c.z)))candidates.push(c);
    }
    for(const c of candidates){
      const px=c.x,pz=c.z-11,y=api.groundAt(px,pz)+1.5;
      api.teleport(px,pz);api.camFix([px,y,pz],[px,y,pz-2]);
      for(let i=0;i<18;i++)await new Promise(requestAnimationFrame);
      const animal=api.faunaState().list.find(a=>!a.qa&&a.kind===kind);
      if(animal)return {biome:api.faunaBiome(animal.x,animal.z),animal};
    }
    return null;
   },kind);
   fs.writeFileSync('docs/qa/fauna-19/habitats.json',JSON.stringify(measurements,null,2)+'\n');
   console.log(kind,measurements[kind]);assert.ok(measurements[kind],kind+' spontaneous spawn');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
