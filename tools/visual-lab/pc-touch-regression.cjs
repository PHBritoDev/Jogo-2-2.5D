const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:852,height:393},isMobile:true,hasTouch:true});
  await page.addInitScript(()=>{
    localStorage.setItem('seven-sins-3d-prologo-ceu','1');
    localStorage.setItem('seven-sins-3d-graphics','low');
    localStorage.setItem('sevenSins3DCampaignV6',JSON.stringify({version:6,act1Rev:2,questStep:1,awakeningSeen:true,playerName:'QA',actCardSeen:true}));
  });
  await page.goto(process.env.PC_URL||'http://localhost:4202/index.html?debug3d=1',{waitUntil:'domcontentloaded'});
  const frame=await (await page.locator('iframe').elementHandle()).contentFrame(),client=await page.context().newCDPSession(page);
  async function ready(){await frame.waitForFunction(()=>window.SevenSinsDebug3D?.state().calls>0,null,{timeout:180000});await frame.evaluate(()=>{SevenSinsDebug3D.freeRoam();window.focus();});}
  await ready();
  const pos=()=>frame.evaluate(()=>{const {x,z}=SevenSinsDebug3D.state();return [x,z];});
  const before=await pos(), stick=await frame.locator('#stick').boundingBox();assert.ok(stick&&stick.width>0);
  const x=stick.x+stick.width/2,y=stick.y+stick.height/2;
  await frame.waitForFunction(([x,y])=>!!document.elementFromPoint(x,y)?.closest('#stick'),[x,y],{timeout:90000}).catch(async e=>{
    console.error('joystick hit',await frame.evaluate(([x,y])=>[x,y,document.elementFromPoint(x,y)?.outerHTML.slice(0,200),document.querySelector('#stick').getBoundingClientRect().toJSON()],[x,y]));throw e;
  });
  const touch=(type,pts)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
  await touch('touchStart',[{x,y,id:1}]);await touch('touchMove',[{x,y:y-stick.height*.32,id:1}]);
  await frame.waitForFunction(([x,z])=>Math.hypot(SevenSinsDebug3D.state().x-x,SevenSinsDebug3D.state().z-z)>.15,before,{timeout:30000});
  await touch('touchEnd',[]);const after=await pos();
  await page.screenshot({path:'docs/qa/pc-touch.png',timeout:100000});
  await frame.evaluate(()=>{
    const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0],gl=canvas.getContext('webgl2');
    window.lossEvents=[];
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lossEvents.push('lost');});
    canvas.addEventListener('webglcontextrestored',()=>lossEvents.push('restored'));
    const ext=gl.getExtension('WEBGL_lose_context');ext.loseContext();setTimeout(()=>ext.restoreContext(),250);
  });
  await frame.waitForFunction(()=>lossEvents.includes('restored'),null,{timeout:60000});
  const glEvents=await frame.evaluate(()=>lossEvents);
  await client.send('Page.setWebLifecycleState',{state:'frozen'});
  await client.send('Page.setWebLifecycleState',{state:'active'});
  await frame.evaluate(()=>{location.reload();});
  await ready();
  const reload=await pos();await page.keyboard.down('w');
  try{await frame.waitForFunction(([x,z])=>Math.hypot(SevenSinsDebug3D.state().x-x,SevenSinsDebug3D.state().z-z)>.08,reload,{timeout:30000});}
  finally{await page.keyboard.up('w');}
  fs.writeFileSync('docs/qa/pc-touch.json',JSON.stringify({before,after,glEvents,reload,afterReload:await pos()},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
