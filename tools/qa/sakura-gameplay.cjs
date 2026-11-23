const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const mode=process.argv[2]||'walk', out=process.env.OUT||path.resolve('qa-output',mode), errors=[];
fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
try{
 const mobile=mode!=='desktop',width=mobile?852:1200,height=mobile?393:675;
 const ctx=await b.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,recordVideo:{dir:out,size:{width,height}}});
 const page=await ctx.newPage(),root=path.resolve(path.dirname(require.resolve('three')),'..');
 page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});
 page.on('console',m=>{if(/WebGLProgram: Shader Error|THREE.WebGLShader: Shader couldn't compile/.test(m.text()))errors.push(m.text().slice(0,600));});
 await page.route('https://cdn.jsdelivr.net/npm/three@*/**',r=>r.fulfill({path:path.join(root,r.request().url().split(/three@[^/]+\//)[1].split('?')[0]),contentType:'text/javascript'}));
 await page.addInitScript(()=>{
  localStorage.setItem('seven-sins-3d-graphics','low');
  localStorage.setItem('sevenSins3DCampaignV6',JSON.stringify({version:6,act1Rev:2,questStep:15,act1Sub:0,
   playerName:'Lia',awake:true,awakeningSeen:true,actCardSeen:true,wardenDefeated:true,coins:98,
   bishopsDefeated:2,vhazraelRewardClaimed:true,vorgazhekRewardClaimed:true}));
 });
 await page.goto((process.env.GAME_URL||'http://localhost:4432')+'/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.SevenSinsDebug3D&&document.querySelector('#loading').classList.contains('hidden'),null,{timeout:240000});
 await page.waitForFunction(()=>{const d=window.SevenSinsDebug3D;return d&&d.storyState().q===15&&Math.abs(d.walkState().x+1235.8)<3;},null,{timeout:90000});
 await page.evaluate(()=>{const d=SevenSinsDebug3D;d.fly();d.speed(1);d.sprint(true);});
 const report=[];const video=page.video();
 await page.exposeFunction('recordStop',async(name,metrics,photo=true)=>{
  report.push({name,...metrics});fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify({mode,width,height,errors,report},null,1));
  if(photo)await page.screenshot({path:path.join(out,name+'.jpg'),quality:84,timeout:90000});
  console.log(name,metrics.seconds||'',metrics.pos?.x,metrics.pos?.z,metrics.render?.calls);
 });
 if(mode==='survey'){
  const issues=await page.evaluate(async()=>{
   const d=SevenSinsDebug3D,{ROUTE,CITY_ROAD,FROM_CITY,DETOURS}=await import('/sakura-route3d.js');
   const issues=[];for(const [name,road] of [['cinzaria',FROM_CITY],['eixo',ROUTE],['bairro',CITY_ROAD],...DETOURS.map(t=>[t.name,t.points])]){
    for(let j=1;j<road.length;j++){let n=0,first,largest=0,gradeAt;const a=road[j-1],b=road[j],l=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));let prev;
     for(let i=0;i<=l;i++){const u=i/l,x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,v=d.sakuraProbe(x,z);
      if(v.blocked){n++;if(!first)first=[x,z];}if(prev&&Math.abs(v.height-prev.height)>largest){largest=Math.abs(v.height-prev.height);gradeAt=[x,z];}prev=v;}
     if(n||largest>1.05)issues.push({name,j,n,first,largest,gradeAt});
    }}
   return issues;
  });fs.writeFileSync(path.join(out,'collision.json'),JSON.stringify(issues,null,1));console.log('SAMPLES',JSON.stringify(issues));if(issues.length)throw Error('Piso ou colisão fora do limite');
 }else if(mode==='walk'||mode==='replay'){
  await page.evaluate(async({fast})=>{
   const d=SevenSinsDebug3D,{ROUTE,CITY_ROAD,FROM_CITY,MASTER}=await import('/sakura-route3d.js');
   const next=()=>new Promise(requestAnimationFrame),start=performance.now();let lastInput=0;
   async function step(x,z,name){
    let minimum=Infinity,progress=performance.now(),previous=d.walkState(),metres=0,range=0,elapsed=performance.now(),nudge=0,lastFrame=elapsed;
    while(true){
     const t=performance.now(),s=d.walkState(),st=d.storyState(),dx=x-s.x,dz=z-s.z,r=Math.hypot(dx,dz);
     metres+=Math.hypot(s.x-previous.x,s.z-previous.z);previous=s;range=r;
     if(!document.querySelector('#dialog-panel').classList.contains('hidden')){if(t-lastInput>800){document.querySelector('#dialog-continue').click();lastInput=t;}progress=t;await next();continue;}
     if(st.scene){if(st.waitingTap)d.tapStory();const choice=document.querySelector('#choice-card');if(choice&&!choice.hidden)document.querySelector('#choice-no').click();progress=t;await next();continue;}
     if(r<1.35)break;
     if(r<minimum-.15){minimum=r;progress=t;nudge=0;}
     const stalled=t-progress;if(stalled>50000)throw Error('Passagem bloqueada '+JSON.stringify({name,x,z,s,st:st.label,r}));
     if(stalled>4500)nudge=(stalled<11500?1:stalled<22000?-1:stalled<32000?1:-1)*(Math.PI*.39);
     const a=Math.atan2(dx,dz)+nudge;d.viewQA(false,Math.atan2(-dx,-dz),.13);const wall=Math.min(1.2,(t-lastFrame)/1000),catchUp=fast?Math.min(4,r/6.8):Math.max(0,wall-.04);
     // Chromium software may present fewer than 25 frames/s. The shipped game caps a
     // frame at 40 ms. Replay the elapsed movement in its own 30 Hz QA stepper,
     // bounded by real elapsed time and distance, with rendering on normal frames.
     d.walkMove(Math.sin(a),Math.cos(a),Math.min(fast?4.1:1.3,r/6.8));
     if(catchUp>.034)d.combatStep(Math.min(catchUp,r/6.8),{fps:30,draw:false});
     lastFrame=t;await next();
    }
    await window.recordStop(name,{pos:d.walkState(),render:d.squadRender(),metres,seconds:(performance.now()-elapsed)/1000,totalSeconds:(performance.now()-start)/1000},['eixo-5','eixo-13','eixo-22','eixo-32','eixo-41','eixo-56','eixo-62','bairro-12'].includes(name));
   }
   for(const [i,p] of FROM_CITY.entries())await step(p.x,p.z,'cinzaria-'+i);
   for(const [i,p] of ROUTE.entries()){
    await step(p.x,p.z,'eixo-'+i);
    if(i===23){await step(MASTER.x,MASTER.z-1.5,'mestra');d.interact();
     for(let k=0;k<16&&d.storyState().sub!==1;k++){document.querySelector('#dialog-continue').click();await next();}
     if(d.storyState().sub!==1)throw Error('Objetivo do dojo não avançou');}
   }
   if(d.storyState().sub!==2)throw Error('Objetivo do trono não avançou');
   for(const [i,p] of CITY_ROAD.entries()){await step(p.x,p.z,'bairro-'+i);if(d.storyState().q>=16)break;}
   for(let i=0;i<1200&&d.storyState().q===15;i++){d.tapStory();await next();}
   if(d.storyState().q!==16)throw Error('Chegada ao pescador falhou');
   await window.recordStop('chegada',{pos:d.walkState(),q:d.storyState().q,totalSeconds:(performance.now()-start)/1000});
  },{fast:mode==='replay'});
 }else{
  const shots=[
   ['01-cinzas',-1568,-545,-1690,-660],['02-torii',-1732,-812,-1740,-833],['03-bosque',-1480,-1219,-1484,-1244],
   ['04-lago',-1368,-1461,-1223,-1464],['05-templo',-1040,-1662,-1040,-1605],
   ['06-dojo',-1040,-1618,-1039,-1604],['07-geada',-607,-1684,-542,-1700],
   ['08-pinhal',-72,-2090,0,-1980],['09-vale',200,-1669,290,-1710],['10-espelho',753,-1847,931,-1730],
   ['11-cidadela',564,-409,564,-245],['12-nave',564,-283,564,-195],['13-trono',564,-223,564,-190],
   ['14-bairro',145,-37,162,-34]
  ];
  await page.addStyleTag({content:'body > :not(canvas):not(#loading) { visibility:hidden !important } canvas {visibility:visible !important}'}); // clean eye-level comparison frames
  for(const [name,x,z,tx,tz] of shots){
   const result=await page.evaluate(async({name,x,z,tx,tz})=>{
    const d=SevenSinsDebug3D;d.placeAt(x,d.groundAt(x,z),z);d.viewQA(true,Math.atan2(x-tx,z-tz),name==='11-cidadela'?-.24:name==='12-nave'?-.20:name==='05-templo'?-.22:0);
    d.viewQA(false,Math.atan2(x-tx,z-tz),.10);
    const y=d.groundAt(x,z),top=name==='11-cidadela'?33:name==='12-nave'?10:name==='13-trono'?6:name==='05-templo'?12:name==='06-dojo'?1.8:2;
    d.fly([x+.18,y+1.85,z+.2],[tx,name==='11-cidadela'?81+top:name==='05-templo'?127+top:d.groundAt(tx,tz)+top,tz]);
    for(let i=0;i<24;i++){if(!document.querySelector('#dialog-panel').classList.contains('hidden'))document.querySelector('#dialog-continue').click();await new Promise(requestAnimationFrame);}
    const ts=[];let prev=performance.now();for(let i=0;i<9;i++){const t=await new Promise(requestAnimationFrame);ts.push(t-prev);prev=t;}
    return {pos:d.walkState(),render:d.squadRender(),framesMs:ts,heapBytes:performance.memory?.usedJSHeapSize};
   },{name,x,z,tx,tz});
   await page.evaluate(({name,result})=>window.recordStop(name,result),{name,result});
  }
 }
 await ctx.close();fs.renameSync(await video.path(),path.join(out,'jornada-'+mode+'.webm'));
 if(errors.length)throw Error(errors[0]);console.log('OK',mode);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
