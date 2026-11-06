"use strict";
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process");
const {chromium}=require("playwright");
const A=require("./dev-agent-v5-core.cjs");
const root=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","agentes-v5");
const repoRoot=path.resolve(__dirname,"../..");
const out=(name,v)=>A.writeJsonAtomic(path.join(root,name+".json"),v);
const protectedPaths=["DevoradorLunar.glb","veraxion-lunar-monster-model3d.js","veraxion-lunar-facial3d.js"];
const requiredPaths=["mundo-3d-prototype.html","mundo-3d-prototype.js","tools/visual-lab/agent-run.cjs","veraxion-lunar-ultimate3d.js"];
function changedFiles(){
 try{
  const raw=cp.execFileSync("git",["diff","--name-only","origin/main...HEAD"],{cwd:repoRoot,encoding:"utf8",timeout:10000});
  return raw.trim().split("\n").filter(Boolean);
 }catch(e){return null;}
}
function filesAndRegression(){
 const changed=changedFiles(),paths=[...new Set([...requiredPaths,...protectedPaths,...(changed||[])])];
 const files={};for(const p of paths){
  const absolute=path.resolve(repoRoot,p);
  if(!absolute.startsWith(repoRoot+path.sep))continue;
  if(!fs.existsSync(absolute)){files[p]=null;continue;}
  const ext=path.extname(p);
  files[p]={changed:changed?changed.includes(p):false};
  if(ext===".js"&&fs.statSync(absolute).size<250000)
    files[p].content=fs.readFileSync(absolute,"utf8");
 }
 const report=A.regressionChecks({files,requiredPaths,protectedPaths:changed?protectedPaths:[]});
 report.changedFiles=changed;report.protectionVerified=changed!==null;
 if(changed===null)report.notes.push({severity:"info",code:"DIFF_UNAVAILABLE",
  message:"git diff indisponivel; protecao contra alteracao nao foi verificada"});
 out("regressao",report);return report;
}
async function measure(mode,{width,height}){
 const browser=await chromium.launch({headless:true,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--ignore-gpu-blocklist",
  "--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const state={mode,width,height,ready:false,errors:[],samples:[],measured:false};
 let context;
 try{
  context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on("pageerror",e=>state.errors.push(e.message.slice(0,350)));
  const base=(process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
  await page.goto(base+"/mundo-3d-prototype.html?testeDimensao=bishop1&debug3d=1&qa=agents-v5",
    {waitUntil:"domcontentloaded",timeout:35000});
  await page.waitForFunction(()=>typeof window.SevenSinsDebug3D?.state==="function",null,{timeout:85000});
  state.ready=true;
  // Observe the actual requestAnimationFrame cadence; do not claim physical GPU FPS.
  state.samples=await page.evaluate(async()=>{
   const result=[];let last=null;
   return new Promise(resolve=>{
    const deadline=performance.now()+13500;
    function step(t){
     if(last!==null&&result.length<110){
      const d=window.SevenSinsDebug3D,st=d?.state?.();
      const mem=performance.memory?.usedJSHeapSize;
      result.push({frameMs:Math.max(.1,t-last),drawCalls:st?.calls,triangles:st?.triangles,
       jsHeapMB:Number.isFinite(mem)?+(mem/1048576).toFixed(2):null});
     }
     last=t;
     if(result.length>=110||performance.now()>deadline){resolve(result);return;}
     requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
   });
  });
  state.measured=state.samples.length>=10;
  state.summary=A.perfSummary(state.samples,{softwareRenderer:true,simulatedMobile:true});
  await page.screenshot({path:path.join(root,"perf-"+mode+".png"),timeout:20000});
 }catch(e){state.error=String(e.message||e);process.exitCode=1;}
 finally{if(context)await context.close().catch(()=>{});await browser.close().catch(()=>{});}
 return state;
}
async function main(){
 fs.mkdirSync(root,{recursive:true});
 const regression=filesAndRegression(),modes=[];
 for(const [name,viewport] of Object.entries({landscape:{width:852,height:480},portrait:{width:393,height:852}}))
  modes.push(await measure(name,viewport));
 const performanceReport={version:5,build:process.env.GITHUB_SHA||"local",source:"Chromium headless SwiftShader",
  deviceDisclaimer:"Simulacao de viewport mobile, nao e medicao real do Samsung ou outra GPU de celular.",
  modes:modes.map(({samples,...rest})=>rest)};
 out("performance",performanceReport);
 const issues=modes.flatMap(x=>x.errors.concat(x.error?[x.error]:[]));
 const baselineFile=process.env.AGENT_PERF_BASELINE;
 let baseline=null;
 if(baselineFile&&fs.existsSync(baselineFile)){
  try{baseline=JSON.parse(fs.readFileSync(baselineFile,"utf8"));}catch{}
 }
 const comparisons=modes.map(m=>{
  const old=baseline?.modes?.find(x=>x.mode===m.mode);
  const relative=A.comparePerf(m.summary,old?.summary);
  return {mode:m.mode,...relative,issues:[...relative.issues,...A.absolutePerfFlags(m.summary)]};
 });
 out("comparativo",comparisons);
 const proposals=A.planFixes({perf:{issues:comparisons.flatMap(x=>x.issues)},regression,errors:issues});
 out("programador-plano",proposals);
 const oldMemoryFile=path.join(repoRoot,"docs","agent-memory","known-issues.json");
 const oldMemory=fs.existsSync(oldMemoryFile)?JSON.parse(fs.readFileSync(oldMemoryFile,"utf8")):[];
 const updates=proposals.tasks.map(x=>A.memoryRecord({project:"7-pecados-capitais",
  source:"GitHub Actions agentes V5",issue:x.evidence||x.kind,solution:x.action,
  status:"to-review",evidence:[process.env.GITHUB_RUN_ID||"local"]}));
 out("memoria-candidata",A.mergeMemory(oldMemory,updates));
 const ok=regression.passed&&modes.every(x=>x.measured&&!x.errors.length&&!x.error);
 console.log("[AGENTES V5] "+JSON.stringify({ok,modes:modes.map(x=>({mode:x.mode,fpsMedian:x.summary?.fpsMedian,frames:x.summary?.count,error:x.error})),
  regression:regression.passed,protectedFilesVerified:regression.protectionVerified,plans:proposals.tasks.length}));
 if(!ok)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
