'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173';
const out=path.resolve(process.env.VISUAL_OUTPUT||'visual-lab-results','vorgazhek-abyss');fs.mkdirSync(out,{recursive:true});
async function main(){
 const b=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const report={ok:false,errors:[],screenshots:[],notes:'WebGL via SwiftShader; not Android FPS',metrics:[]};
 try{
  const cx=await b.newContext({viewport:{width:960,height:540},deviceScaleFactor:1,recordVideo:{dir:path.join(out,'video')}});
  const localThree=path.join(path.dirname(require.resolve('three')),'three.module.js');
  await cx.route('https://esm.sh/three@0.160.0',route=>route.fulfill({path:localThree,contentType:'text/javascript'}));
  const page=await cx.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(base+'/tools/visual-lab/vorgazhek-abyss-preview.html',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>window.ready,null,{timeout:60000});
  async function shot(name,angle,t){const result=await page.evaluate(({angle,t})=>{const q=window.abyssQA;q.camera(angle);return q.frame(t);},{angle,t});report.metrics.push({name,...result});
   const screenshot=await page.screenshot({path:path.join(out,name+'.png')});assert.ok(screenshot.length>10000,'empty capture: '+name);report.screenshots.push(name+'.png');}
  await shot('01-arena-aberta','wide',2000);await shot('02-observadores-proximos','close',5000);await shot('03-lateral','side',8500);await shot('04-aparicoes-alternadas','wide',24000);
  await page.setViewportSize({width:393,height:852});await shot('05-retrato-mobile','wide',42000);
  const data=await page.evaluate(()=>({watchers:abyssQA.arena.refs.vorgazhekAbyss.watchers,geometry:abyssQA.renderer.info.memory.geometries}));
  report.scene=data;assert.equal(data.watchers,11);assert.ok(data.geometry>0);
  report.layout=await page.evaluate(()=>{
    const q=abyssQA,watchers=q.arena.group.children.filter(o=>o.name.startsWith('VorgazhekWatcher_'));
    let minDistance=Infinity,minRadius=Infinity,maxWidth=0,active=0;
    for(const t of [5000,17000,28000,42000]){
      q.frame(t);
      for(let i=0;i<watchers.length;i++){
        const a=watchers[i]; minRadius=Math.min(minRadius,Math.hypot(a.position.x,a.position.z));
        maxWidth=Math.max(maxWidth,a.children[0].scale.x);
        if(a.visible)active++;
        for(let j=i+1;j<watchers.length;j++){
          const b=watchers[j],dist=Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
          minDistance=Math.min(minDistance,dist);
        }
      }
    }
    return {minDistance,minRadius,maxWidth,active};
  });
  assert.ok(report.layout.minDistance>50,'watchers must never overlap across relocation cycles');
  assert.ok(report.layout.minRadius>145,'watchers remain well beyond battle area');
  assert.ok(report.layout.maxWidth<12,'no giant or flattened billboard faces');
  assert.ok(report.layout.active>0,'watchers are animated and visible');
  report.waterMotion=await page.evaluate(()=>{
    const q=abyssQA;q.camera('wide');q.frame(3000);
    const first=q.renderer.domElement.toDataURL('image/png');
    q.frame(5500);
    const second=q.renderer.domElement.toDataURL('image/png');
    return {changed:first!==second,firstLength:first.length,secondLength:second.length};
  });
  assert.ok(report.waterMotion.changed,'water surface must animate');

  // The entities must look at the real player, even from opposite sides of the abyss.
  report.gaze=await page.evaluate(()=>{
    const q=abyssQA,eyes=q.arena.group.children.filter(x=>x.name.startsWith('VorgazhekWatcher_'));
    q.hero.position.x=-35;q.frame(9500);
    const left=eyes.map(w=>w.children[1]?.position.x);
    q.hero.position.x=35;q.frame(9500);
    const right=eyes.map(w=>w.children[1]?.position.x);
    q.hero.position.x=0;
    return {moved:left.filter((n,i)=>Math.abs(n-right[i])>.005).length};
  });
  assert.ok(report.gaze.moved>=4,'watchers must follow lateral player movement in their own local orientation');
  report.blink=await page.evaluate(()=>{
    const q=abyssQA,watcher=q.arena.group.children.find(x=>x.name==='VorgazhekWatcher_0');
    q.frame(5450);const open=watcher.children[1].scale.y;
    q.frame(5530);const shut=watcher.children[1].scale.y;
    q.frame(5700);const reopened=watcher.children[1].scale.y;
    return {open,shut,reopened};
  });
  assert.ok(report.blink.shut<report.blink.open*.4 && report.blink.reopened>report.blink.shut*2,
    'watcher must close and reopen its eyes smoothly');
  // Memory disposal: capture before/after, no duplicate live scene after exit.
  report.disposal=await page.evaluate(()=>{const q=abyssQA;const before={...q.renderer.info.memory};q.rebuild();q.renderer.render(q.scene,q.cam);return {before,after:{...q.renderer.info.memory}};});
  assert.ok(report.disposal.after.geometries<report.disposal.before.geometries);
  assert.deepEqual(report.errors,[]);report.ok=true;
  await cx.close();
 }finally{fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');await b.close();}
 console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
