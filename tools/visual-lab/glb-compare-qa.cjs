"use strict";
const fs=require("node:fs"),path=require("node:path"),sharp=require("sharp");
const {chromium}=require("playwright");
const files=["ArvoreAncestralEldoria.glb","CasaEldoria01.glb","CasaEldoria02.glb","Carroça.glb","RochedoMusgoEldoria.glb"];
const root=path.resolve(__dirname,"../..");
const out=path.join(root,"visual-lab-results","glb-visual-qa");
const origin=path.join("visual-lab-results","glb-originals");
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"]});
 const page=await browser.newPage({viewport:{width:800,height:800}});
 const base="http://127.0.0.1:4173/tools/visual-lab/glb-compare-viewer.html?src=";
 const results=[],thumbs=[];
 try{
 for(let i=0;i<files.length;i++){
   const name=files[i],views=[];
   for(const kind of ["original","optimized"]){
     const src=kind==="original"?"/"+origin+"/"+name:"/"+name;
     await page.goto(base+encodeURIComponent(src),{waitUntil:"domcontentloaded",timeout:40000});
     await page.waitForFunction(()=>window.glbVisualQA?.ready||window.glbVisualQA?.error,{timeout:100000});
     const info=await page.evaluate(()=>window.glbVisualQA);
     if(info.error||!info.ready||info.meshes===0)throw Error(kind+" "+name+": "+JSON.stringify(info));
     const screenshot=path.join(out,(kind==="original"?"antes-":"depois-")+name.replace(".glb",".png"));
     await page.screenshot({path:screenshot,timeout:30000});
     const thumb=await sharp(screenshot).resize(400,400).png().toBuffer();
     thumbs.push({input:thumb,left:(kind==="original"?0:400),top:i*400});
     views.push({kind,info});
   }
   const a=views[0].info,b=views[1].info;
   for(const axis of ["x","y","z"]){
     if(Math.abs(a.bounds[axis]-b.bounds[axis])>Math.max(.0001,Math.abs(a.bounds[axis])*.001))
       throw Error(name+": geometry bounding box changed on axis "+axis);
   }
   if(a.meshes!==b.meshes||a.animations!==b.animations)throw Error(name+": lost meshes/animations");
   results.push({name,loaded:true,meshes:a.meshes,animations:a.animations,original_bounds:a.bounds,optimized_bounds:b.bounds});
 }
 await sharp({create:{width:800,height:files.length*400,channels:3,background:"#333"}}).composite(thumbs).png().toFile(path.join(out,"comparacao-antes-depois.png"));
 fs.writeFileSync(path.join(out,"relatorio.json"),JSON.stringify(results,null,2)+"\n");
 console.log(JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
