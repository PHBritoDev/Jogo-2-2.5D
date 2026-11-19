const {chromium}=require('playwright');
const assert=require('node:assert/strict'), fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const url=process.env.PC_URL || 'http://localhost:4202/index.html?debug3d=1';
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:540}});
  // Run the actual pre-fix listeners from the parent revision with browser input.
  const old=execFileSync('git',['show','fee762b:mundo-3d-prototype.js'],{encoding:'utf8',maxBuffer:8e6});
  const start=old.indexOf("const keys={};addEventListener('keydown'"), end=old.indexOf('\n',old.indexOf("addEventListener('keyup',e=>keys",start));
  assert.ok(start>=0&&end>start);
  await page.setContent('<select><option>A</option><option>B</option></select>');
  await page.addScriptTag({content:old.slice(start,end)+'\nwindow.previousKeys=keys;'});
  await page.keyboard.down('ShiftLeft');await page.keyboard.down('ShiftRight');await page.keyboard.up('ShiftLeft');
  const baseline=await page.evaluate(()=>previousKeys.shift);assert.equal(baseline,false);await page.keyboard.up('ShiftRight');
  await page.locator('select').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('select').inputValue(),'A');
  await page.addInitScript(()=>{
   localStorage.setItem('seven-sins-3d-prologo-ceu','1');localStorage.setItem('seven-sins-3d-graphics','low');
   localStorage.setItem('sevenSins3DCampaignV6',JSON.stringify({version:6,act1Rev:2,questStep:1,coins:47,awakeningSeen:true,playerName:'QA',actCardSeen:true}));
   window.audit=[];
   for(const type of ['keydown','keyup','focus','blur','fullscreenchange','pointerlockchange','visibilitychange'])
    addEventListener(type,e=>{if(audit.length<200)audit.push([type,e.code||'',Math.round(performance.now())]);},true);
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const frame=await (await page.locator('iframe').elementHandle()).contentFrame();
  await frame.waitForFunction(()=>window.SevenSinsDebug3D?.state().calls>0,null,{timeout:180000});
  await frame.waitForSelector('#loading.hidden',{state:'attached',timeout:180000});
  await frame.evaluate(()=>{SevenSinsDebug3D.freeRoam();window.focus();});
  const pos=()=>frame.evaluate(()=>{const {x,z}=SevenSinsDebug3D.state();return [x,z];});
  const checks={};
  async function walk(label){
   const before=await pos();await page.keyboard.down('d');
   try{await frame.waitForFunction(([x,z])=>{const s=SevenSinsDebug3D.state();return Math.hypot(s.x-x,s.z-z)>.08;},before,{timeout:22000});}
   catch(error){console.error(label,await frame.evaluate(()=>({last:audit.slice(-12),focus:document.activeElement.id,dialogue:SevenSinsDebug3D.state().dialogueOpen,pos:[SevenSinsDebug3D.state().x,SevenSinsDebug3D.state().z],inventory:document.querySelector('#inv-panel').hidden,paused:document.querySelector('#pause-panel').hidden})));throw error;}
   finally{await page.keyboard.up('d');}checks[label]=[before,await pos()];
  }
  await walk('spawn');
  await page.screenshot({path:'docs/qa/pc-movement.png',timeout:90000});
  await page.locator('#lab-test-entry').focus();await frame.evaluate(()=>window.focus());await walk('iframeFocus');
  await page.keyboard.press('i');await frame.locator('#inv-close').click();await walk('inventory');
  await frame.evaluate(()=>SevenSinsDebug3D.shop());await page.keyboard.press('Escape');await walk('shop');
  await frame.locator('#pause-button').click();await frame.locator('#pause-resume').click();await walk('pause');
  await frame.evaluate(()=>document.documentElement.requestFullscreen());assert.ok(await frame.evaluate(()=>!!document.fullscreenElement));
  await frame.evaluate(()=>document.exitFullscreen());await walk('fullscreen');
  const point=await frame.evaluate(()=>{
    const look=document.querySelector('#look-area');
    for(let y=80;y<innerHeight-60;y+=16)for(let x=innerWidth*.6;x<innerWidth-60;x+=16){
      if(document.elementFromPoint(x,y)===look)return {x,y};
    }
  });
  assert.ok(point,'visible look surface');await page.mouse.click(point.x,point.y);
  await frame.waitForFunction(()=>!!document.pointerLockElement,null,{timeout:12000});
  await page.mouse.move(500,210,{steps:5});checks.pointerLock=await frame.evaluate(()=>!!document.pointerLockElement);
  await frame.evaluate(()=>document.exitPointerLock());await walk('mouse');
  await frame.evaluate(()=>SevenSinsDebug3D.teleport(-300,-48,0));await walk('teleport');
  await page.setViewportSize({width:852,height:393});await walk('resize');
  for(const key of ['Space','f','j','e'])await page.keyboard.press(key);
  const trace=await frame.evaluate(()=>audit);
  fs.writeFileSync('docs/qa/pc-focus-trace.json',JSON.stringify({baselineShift:baseline,checks,trace},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
