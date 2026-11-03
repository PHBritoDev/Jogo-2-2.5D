"use strict";
/**
 * V7 - evidencia de PIXELS reais e memoria visual por fase de cinematica.
 * Nao reconhece personagens semanticamente. Diferencas sao alertas, nao bugs.
 * Frames vazios consecutivos sao erro de captura, nunca "aprovados".
 */
const fs=require("node:fs"),path=require("node:path");
const sharp=require("sharp");
const PHASES=["boss_aura","circle_build","sword_emerge_and_fall","impact_and_return"];
const STAGES=["entrada","meio","fim"];
const fix=x=>+x.toFixed(4);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const safe=s=>String(s||"").replace(/[^a-zA-Z0-9_.-]/g,"_").slice(0,100);
const root=()=>path.resolve(process.env.CINEMA_BASELINE||"visual-lab-cinema-baseline");
const escape=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const inspectName=(relative,mode)=>{
 const base=path.basename(relative);
 for(const phase of PHASES)for(const stage of STAGES){
   if(base.includes("-"+phase+"-"+stage+".png"))
     return {phase,stage,key:mode+":"+phase+":"+stage};
 }
 return {phase:"other",stage:"other",key:mode+":"+base.replace(/^[^-]+-\d+-/,"")};
};
function rgbMetrics(buffer,width,height){
 if(!buffer||buffer.length!==width*height*3||width<8||height<8)throw Error("RGB inválido");
 let bright=0,dark=0,almostWhite=0,saturated=0,sum=0,sumSq=0,centralDark=0,centralCount=0;
 const luma=new Uint8Array(width*height);
 for(let i=0;i<width*height;i++){
   const o=i*3,r=buffer[o],g=buffer[o+1],b=buffer[o+2];
   const y=.2126*r+.7152*g+.0722*b;
   luma[i]=Math.round(y);sum+=y;sumSq+=y*y;
   if(y<17)dark++;if(y>240)almostWhite++;
   if(y>100)bright++;
   if(Math.max(r,g,b)-Math.min(r,g,b)>64)saturated++;
   const x=i%width,yy=Math.floor(i/width);
   if(x>=width*.25&&x<width*.75&&yy>=height*.25&&yy<height*.75){
     centralCount++;if(y<17)centralDark++;
   }
 }
 const count=width*height,mean=sum/count;
 // Thumb de 16x9 valores de luminancia para comparar mesma fase entre runs.
 const fingerprint=[];
 for(let gy=0;gy<9;gy++)for(let gx=0;gx<16;gx++){
   let total=0,n=0;
   const x0=Math.floor(gx*width/16),x1=Math.floor((gx+1)*width/16);
   const y0=Math.floor(gy*height/9),y1=Math.floor((gy+1)*height/9);
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){total+=luma[y*width+x];n++;}
   fingerprint.push(Math.round(total/Math.max(1,n)));
 }
 return {mean:fix(mean),contrast:fix(Math.sqrt(Math.max(0,sumSq/count-mean*mean))),
   darkFraction:fix(dark/count),whiteFraction:fix(almostWhite/count),
   brightFraction:fix(bright/count),colorFraction:fix(saturated/count),
   centerDarkFraction:fix(centralDark/Math.max(1,centralCount)),fingerprint};
}
function compareThumb(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==144||b.length!==144)return null;
 let sum=0,changed=0;
 for(let i=0;i<144;i++){
   const delta=Math.abs(a[i]-b[i]);sum+=delta;if(delta>48)changed++;
 }
 return {meanDifference:fix(sum/144/255),changedFraction:fix(changed/144)};
}
async function inspectFile(file){
 const {data,info}=await sharp(file).resize(128,72,{fit:"fill"})
  .removeAlpha().raw().toBuffer({resolveWithObject:true});
 return rgbMetrics(data,info.width,info.height);
}
function evidenceWarnings(frames){
 const issues=[],sampled=frames.filter(x=>x.phase!=="other");
 const blanks=sampled.filter(x=>x.darkFraction>.985&&x.contrast<4);
 const whites=sampled.filter(x=>x.whiteFraction>.985&&x.contrast<4);
 if(blanks.length>=2)issues.push({code:"blank_sequence",severity:"error",
   count:blanks.length,detail:"Pelo menos dois frames de fase quase totalmente pretos"});
 if(whites.length>=2)issues.push({code:"white_sequence",severity:"warning",
   count:whites.length,detail:"Pelo menos dois frames de fase totalmente brancos; revisar flashes"});
 if(sampled.length>=4){
   let staticPairs=0;
   for(let i=1;i<sampled.length;i++){
     const diff=compareThumb(sampled[i-1].fingerprint,sampled[i].fingerprint);
     if(diff&&diff.meanDifference<.003&&diff.changedFraction<.02)staticPairs++;
   }
   if(staticPairs>=3)issues.push({code:"repeated_frames",severity:"warning",
     count:staticPairs,detail:"Tres ou mais pares quase idênticos; conferir congelamento no vídeo"});
 }
 return issues;
}
async function makeContactSheet(folder,mode,frames){
 if(!frames.length)return null;
 const width=240,height=166,thumbHeight=135,cols=4,rows=Math.ceil(frames.length/cols);
 const tiles=[];
 for(let i=0;i<frames.length;i++){
   const f=frames[i],file=path.join(folder,f.relative);
   const thumb=await sharp(file).resize(width,thumbHeight,{
     fit:"contain",background:"#070911"}).png().toBuffer();
   tiles.push({input:thumb,left:(i%cols)*width,top:Math.floor(i/cols)*height});
   const label=(f.phase==="other"?"antes/depois":f.phase+" / "+f.stage).slice(0,45);
   const svg='<svg width="'+width+'" height="31" xmlns="http://www.w3.org/2000/svg">'+
     '<rect width="100%" height="100%" fill="#1e293b"/>'+
     '<text x="9" y="21" fill="#e2e8f0" font-family="Arial" font-size="13">'+escape(label)+'</text></svg>';
   tiles.push({input:Buffer.from(svg),left:(i%cols)*width,top:Math.floor(i/cols)*height+thumbHeight});
 }
 const dest=path.join(folder,"contato-"+safe(mode)+".jpg");
 await sharp({create:{width:cols*width,height:rows*height,channels:3,background:"#0f172a"}})
  .composite(tiles).jpeg({quality:80,mozjpeg:true}).toFile(dest);
 return path.basename(dest);
}
async function inspectRun(folder,mode,relativeFiles,baselineIndex=null){
 const frames=[],warnings=[],errors=[];
 for(const relative of relativeFiles){
   const file=path.resolve(folder,relative);
   if(!file.startsWith(path.resolve(folder)+path.sep)||!fs.existsSync(file)){
     warnings.push({code:"missing_file",detail:"Frame ausente: "+safe(relative)});continue;
   }
   try{
     const metrics=await inspectFile(file);
     frames.push({relative,...inspectName(relative,mode),...metrics});
   }catch(e){errors.push({code:"invalid_png",detail:safe(relative)+": "+String(e.message).slice(0,160)});}
 }
 const issues=evidenceWarnings(frames);
 for(const issue of issues)(issue.severity==="error"?errors:warnings).push(issue);
 const comparisons=[];
 if(baselineIndex&&baselineIndex.frames){
   for(const frame of frames){
     const base=baselineIndex.frames[frame.key];
     if(!base)continue;
     const diff=compareThumb(frame.fingerprint,base.fingerprint);
     if(!diff)continue;
     comparisons.push({key:frame.key,previousCommit:baselineIndex.commit||null,...diff});
     if(diff.meanDifference>.29&&diff.changedFraction>.45&&frame.phase!=="other"){
       warnings.push({code:"significant_visual_change",key:frame.key,
         detail:"Diferença expressiva nesta fase contra a execução anterior; câmera/tempo podem explicar"});
     }
   }
 }
 const contact=await makeContactSheet(folder,mode,frames).catch(e=>{
   warnings.push({code:"contact_sheet_failed",detail:String(e.message).slice(0,160)});return null;
 });
 return {frames,warnings,errors,comparisons,contact,previousCommit:baselineIndex?.commit||null,
   caveat:"Pixels de screenshots reais. Luminosidade/diferença não atestam qualidade, beleza nem bug."};
}
function readBaseline(){
 const file=path.join(root(),"index.json");
 if(!fs.existsSync(file))return null;
 try{
   const b=JSON.parse(fs.readFileSync(file,"utf8"));
   return b&&b.schema===1&&typeof b.frames==="object"?b:null;
 }catch{return null;}
}
function prepareBaseline(reports){
 if(!Array.isArray(reports)||!reports.length||
    reports.some(r=>r.status!=="capturado_para_revisao"||!r.visual?.frames?.length))
   return {saved:false,reason:"execucao incompleta: baseline preservado"};
 const frames={};
 for(const report of reports)for(const f of report.visual.frames){
   // Apenas imagens de fase real, não menus e nem tela final.
   if(f.phase!=="other")frames[f.key]={
     fingerprint:f.fingerprint,mean:f.mean,contrast:f.contrast};
 }
 if(Object.keys(frames).length<8)return {saved:false,reason:"menos de 8 frames de fase"};
 const dir=root();fs.mkdirSync(dir,{recursive:true});
 const index={schema:1,commit:process.env.GITHUB_SHA||"local",
   generatedAt:new Date().toISOString(),frames,warning:"cache GitHub pode expirar, diferença não comprova bug"};
 fs.writeFileSync(path.join(dir,"index.json"),JSON.stringify(index,null,2)+"\n");
 return {saved:true,count:Object.keys(frames).length};
}
module.exports={rgbMetrics,compareThumb,evidenceWarnings,inspectName,inspectRun,readBaseline,prepareBaseline};
