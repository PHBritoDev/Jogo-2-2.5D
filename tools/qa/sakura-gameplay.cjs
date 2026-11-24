const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const mode=process.argv[2]||'walk', out=process.env.OUT||path.resolve('qa-output',mode), errors=[];
fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
let recordingContext,recording;
try{
 const mobile=['mobile','portrait'].includes(mode);
 const width=mode==='walk'?480:mode==='portrait'?393:mobile?852:1200, height=mode==='walk'?270:mode==='portrait'?852:mobile?393:675;
 const tier=process.env.GRAPHICS||'low';
 const ctx=await b.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,recordVideo:{dir:out,size:{width,height}}});
 recordingContext=ctx;
 const page=await ctx.newPage(),root=path.resolve(path.dirname(require.resolve('three')),'..');
 page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.stack||e.message);});
 page.on('console',m=>{if(/WebGLProgram: Shader Error|THREE.WebGLShader: Shader couldn't compile/.test(m.text()))errors.push(m.text().slice(0,600));});
 await page.route('https://cdn.jsdelivr.net/npm/three@*/**',r=>r.fulfill({path:path.join(root,r.request().url().split(/three@[^/]+\//)[1].split('?')[0]),contentType:'text/javascript'}));
 await page.addInitScript(tier=>{
  localStorage.setItem('seven-sins-3d-graphics',tier);
  if(!localStorage.getItem('sevenSins3DCampaignV6'))localStorage.setItem('sevenSins3DCampaignV6',JSON.stringify({version:6,act1Rev:2,questStep:15,act1Sub:0,
   playerName:'Lia',awake:true,awakeningSeen:true,actCardSeen:true,wardenDefeated:true,coins:98,
   bishopsDefeated:2,vhazraelRewardClaimed:true,vorgazhekRewardClaimed:true}));
 },tier);
 await page.goto((process.env.GAME_URL||'http://localhost:4432')+'/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.SevenSinsDebug3D&&document.querySelector('#loading').classList.contains('hidden'),null,{timeout:240000});
 await page.waitForFunction(()=>{const d=window.SevenSinsDebug3D;return d&&d.storyState().q===15&&Math.abs(d.walkState().x+1235.8)<3;},null,{timeout:90000});

 const report=[];recording=page.video();
 await page.exposeFunction('recordStop',async(name,metrics,photo=true)=>{
  report.push({name,...metrics});fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify({mode,width,height,tier,errors,report},null,1));
  if(photo)await page.screenshot({path:path.join(out,name+'.jpg'),quality:84,timeout:90000});
  console.log(name,metrics.seconds||'',metrics.pos?.x,metrics.pos?.z,metrics.render?.calls);
  if(metrics.framesMs)console.log('FRAME_METRICS',JSON.stringify({name,...metrics}));
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
  const at=async(x,z)=>{await page.evaluate(({x,z})=>{const d=SevenSinsDebug3D;d.placeAt(x,d.groundAt(x,z),z);},{x,z});};
  const stream=await page.evaluate(async()=>{
   const d=SevenSinsDebug3D, samples=[];
   for(let lap=0;lap<2;lap++)for(const [x,z] of [[-1483,-1235],[-1368,-1461],[-1040,-1618],[564,-283]]){
    d.placeAt(x,d.groundAt(x,z),z);
    for(let n=0;n<35;n++){await new Promise(requestAnimationFrame);if(n>12&&d.sakuraProbe(x,z).stream?.waiting===0)break;}
    const state=d.sakuraProbe(x,z).stream,render=d.squadRender();
    if(!state?.active||state.nearTiles>26||state.waiting!==0)throw Error('Setores não estabilizaram '+JSON.stringify(state));
    samples.push({lap,x,z,...state,geometries:render.geos,textures:render.tex,heap:performance.memory?.usedJSHeapSize});
   }
   return samples;
  });
  fs.writeFileSync(path.join(out,'streaming.json'),JSON.stringify(stream,null,1));
  const button=page.locator('#dialog-continue');
  await at(-1038.2,-1608.6);
  // The streaming circuit visits the glacial hall without a coat. Finish the
  // cold warning through the HUD before requesting the master's dialogue.
  if(await button.isVisible()){
   const warning=await page.locator('#dialog-text').textContent();
   if(!/frio|casaco/i.test(warning))throw Error('Diálogo inesperado após a travessia: '+warning);
   await button.click();
  }
  await page.waitForFunction(()=>SevenSinsDebug3D.storyState().label==='FALAR COM A MESTRA');
  await page.locator('#talk-button').click();await button.waitFor({state:'visible'});
  const first=await page.locator('#dialog-text').textContent();if(!first?.startsWith('Lia,'))throw Error('Fala inesperada da mestra: '+first);
  for(let i=0;i<3;i++)await button.click();
  await page.waitForFunction(()=>SevenSinsDebug3D.storyState().sub===1);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.SevenSinsDebug3D?.storyState().sub===1&&Math.abs(SevenSinsDebug3D.walkState().x+1040)<4,null,{timeout:240000});
  await at(583,-236);const gallery=await page.evaluate(()=>SevenSinsDebug3D.walkState());
  if(Math.abs(gallery.y-88)>.65)throw Error('Galeria sem apoio físico '+gallery.y);
  await at(564,-194);for(let i=0;i<9;i++){if(await button.isVisible())await button.click();if(await page.evaluate(()=>SevenSinsDebug3D.storyState().sub===2))break;await page.waitForTimeout(450);}
  await page.waitForFunction(()=>SevenSinsDebug3D.storyState().sub===2);await at(150,-40);
  await page.waitForFunction(()=>SevenSinsDebug3D.storyState().scene==='cidade-neve');await page.evaluate(()=>SevenSinsDebug3D.skipStory());
  await page.waitForFunction(()=>SevenSinsDebug3D.storyState().q===16);
  fs.writeFileSync(path.join(out,'campaign.json'),JSON.stringify({first,subAfterDialogue:1,restoredDojo:true,galleryFloor:gallery.y,subAfterThrone:2,cityStep:16}));
 }else if(mode==='walk'){
  const points=await page.evaluate(async()=>{
   const {FROM_CITY,ROUTE,MASTER,CITY_ROAD}=await import('/sakura-route3d.js');
   return [...FROM_CITY.map((p,i)=>({...p,name:'cinzaria-'+i})),
    ...ROUTE.flatMap((p,i)=>i===23?[{...p,name:'dojo'},{x:MASTER.x,z:MASTER.z-1.5,name:'mestra'}]:[{...p,name:'eixo-'+i}]),
    ...CITY_ROAD.map((p,i)=>({...p,name:'bairro-'+i}))];
  });
  const down=new Set(),start=Date.now();
  async function press(wanted){
   for(const k of [...down])if(!wanted.includes(k)){await page.keyboard.up(k);down.delete(k);}
   for(const k of wanted)if(!down.has(k)){await page.keyboard.down(k);down.add(k);}
  }
  try{
   let previous=points[0];
   for(const point of points){
    let best=Infinity,lastProgress=Date.now();
    while(true){
     const state=await page.evaluate(()=>{const d=SevenSinsDebug3D;return {
      pos:d.walkState(),yaw:d.dashProbe().camYaw,story:d.storyState(),
      dialog:!document.querySelector('#dialog-panel').classList.contains('hidden')};});
     if(state.story.q>=16)break;
     if(state.dialog || state.story.scene){
      await press([]);const next=state.dialog?'#dialog-continue':state.story.waitingTap?'#cine-continue':null;
      if(next&&await page.locator(next).isVisible())await page.locator(next).click({force:true});
      if(await page.locator('#choice-card').isVisible())await page.locator('#choice-yes').click();
     }else{
      const dx=point.x-state.pos.x,dz=point.z-state.pos.z,d=Math.hypot(dx,dz);
      if(d<1.4){await press([]);break;}
      if(d<best-.12){best=d;lastProgress=Date.now();}
      // Tangent evasion uses the same WASD controls if a corner arrests movement.
      const stalled=Date.now()-lastProgress;
      const sidestep=stalled<4500?0:(Math.floor((stalled-4500)/3200)%2?-.78:.78);
      // Aim a few metres along the surveyed segment instead of cutting
      // corners toward a distant waypoint outside the bridge entrance.
      const sx=point.x-previous.x,sz=point.z-previous.z,length=Math.hypot(sx,sz);
      const along=length ? ((state.pos.x-previous.x)*sx+(state.pos.z-previous.z)*sz)/length : 0;
      const t=length ? Math.max(0,Math.min(1,(along+3.5)/length)) : 1;
      const heading=Math.atan2(previous.x+t*sx-state.pos.x,previous.z+t*sz-state.pos.z)-state.yaw+sidestep;
      const ix=Math.sin(heading),iz=Math.cos(heading);
      const keys=['ShiftLeft'];if(Math.abs(ix)>.38)keys.push(ix>0?'d':'a');if(Math.abs(iz)>.38)keys.push(iz>0?'s':'w');
      await press(keys);
     }
     if(Date.now()-lastProgress>90000)throw Error('Caminhada parou em '+JSON.stringify({point,state}));
     await page.waitForTimeout(110);
    }
    previous=point;
    if(point.name==='mestra'){
     await page.keyboard.press('e');
     for(let i=0;i<3;i++)await page.locator('#dialog-continue').click({timeout:12000});
     await page.waitForFunction(()=>SevenSinsDebug3D.storyState().sub===1);
    }
    const state=await page.evaluate(()=>({pos:SevenSinsDebug3D.walkState(),q:SevenSinsDebug3D.storyState().q}));
    await page.evaluate(({point,state,seconds})=>window.recordStop(point.name,{...state,seconds},['dojo','eixo-5','eixo-41','eixo-62'].includes(point.name)),{point,state,seconds:(Date.now()-start)/1000});
    if(state.q>=16)break;
   }
   await page.waitForFunction(()=>SevenSinsDebug3D.storyState().q>=16,null,{timeout:45000});
  }finally{await press([]);}
 }else{
  const shots=[
   ['01-cinzas',-1568,-545,-1690,-660],['02-torii',-1732,-812,-1740,-833],['03-bosque',-1480,-1219,-1484,-1244],
   ['04-lago',-1368,-1461,-1223,-1464],['04b-pagode-distante',-1274,-1253,-1013,-1610],['05-templo',-1040,-1662,-1040,-1605],
   ['06-dojo',-1040,-1618,-1039,-1604],['07-geada',-607,-1684,-542,-1700],
   ['08-pinhal',-72,-2090,0,-1980],['09-vale',51,-1644,255,-1690],['10-espelho',753,-1847,931,-1730],
   ['10b-castelo-distante',734,-493,564,-254],['11-cidadela',564,-435,564,-226],['11b-escada',564,-361,564,-285],['12-nave',564,-283,564,-195],['13-trono',564,-223,564,-190],
   ['14-bairro',145,-37,162,-34]
  ];
  if(mobile){
   const cdp=await ctx.newCDPSession(page);
   const stick=page.locator('#stick'),box=await stick.boundingBox();
   if(!box||box.width<=0)throw Error('Controle de toque fora do layout');
   const origin=await page.evaluate(()=>SevenSinsDebug3D.walkState());
   const x=box.x+box.width/2,y=box.y+box.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   try{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-box.width*.31,y}]});
    await page.waitForFunction(p=>{const s=SevenSinsDebug3D.walkState();return Math.hypot(p.x-s.x,p.z-s.z)>.5;},origin,{timeout:20000});
   }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   await cdp.detach();
   const moved=await page.evaluate(()=>SevenSinsDebug3D.walkState());
   fs.writeFileSync(path.join(out,'input-touch.json'),JSON.stringify({origin,moved,layout:box,width,height}));
  }
  // Keep the HUD visible for framing and touch-control inspection.
  for(const [name,x,z,tx,tz] of shots){
   const result=await page.evaluate(async({name,x,z,tx,tz})=>{
    const d=SevenSinsDebug3D;d.placeAt(x,d.groundAt(x,z),z);d.viewQA(true,Math.atan2(x-tx,z-tz),name==='11-cidadela'?-.24:name==='12-nave'?-.20:name==='05-templo'?-.22:0);

    const y=d.groundAt(x,z),top=name==='11-cidadela'?33:name==='12-nave'?10:name==='13-trono'?6:name==='05-templo'?12:name==='06-dojo'?1.8:2;
    d.fly([x+.18,y+1.85,z+.2],[tx,name==='11-cidadela'?133:name==='11b-escada'?104:name==='04b-pagode-distante'?139:name==='05-templo'?127+top:name==='10b-castelo-distante'?144:d.groundAt(tx,tz)+top,tz]);
    for(let i=0;i<24;i++){if(!document.querySelector('#dialog-panel').classList.contains('hidden'))document.querySelector('#dialog-continue').click();await new Promise(requestAnimationFrame);}
    const ts=[];let prev=await new Promise(requestAnimationFrame);for(let i=0;i<9;i++){const t=await new Promise(requestAnimationFrame);ts.push(t-prev);prev=t;}
    return {pos:d.walkState(),render:d.squadRender(),framesMs:ts,heapBytes:performance.memory?.usedJSHeapSize};
   },{name,x,z,tx,tz});
   await page.evaluate(({name,result})=>window.recordStop(name,result),{name,result});
  }
 }
 if(errors.length)throw Error(errors[0]);console.log('OK',mode);
}finally{
 try{if(recordingContext)await recordingContext.close();
  if(recording){const videoPath=await recording.path();if(fs.existsSync(videoPath))fs.renameSync(videoPath,path.join(out,'jornada-'+mode+'.webm'));}
 }finally{await b.close();}
}})().catch(e=>{console.error(e);process.exitCode=1;});
