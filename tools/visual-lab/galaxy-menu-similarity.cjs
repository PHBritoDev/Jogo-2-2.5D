"use strict";
// Similaridade multiescala de composição para orientar revisão artística.
// NÃO é medida objetiva da qualidade 3D, nem porcentagem de fidelidade estética.
const sharp=require("sharp"),fs=require("node:fs");
const [reference,screenshot,output]=process.argv.slice(2);
if(!reference||!screenshot||!output){console.error("usage: node similarity.cjs ref.jpg rendered.png report.json");process.exit(2);}
const ssim=(a,b,width,height,k=8)=>{
 const A=a.data,B=b.data;
 const C1=(.01*255)**2,C2=(.03*255)**2;let total=0,blocks=0;
 for(let by=0;by<height;by+=k)for(let bx=0;bx<width;bx+=k){
  let ma=0,mb=0,va=0,vb=0,cov=0,n=0;
  for(let y=by;y<Math.min(height,by+k);y++)for(let x=bx;x<Math.min(width,bx+k);x++){
   const at=y*width+x;ma+=A[at];mb+=B[at];n++;
  }
  ma/=n;mb/=n;
  for(let y=by;y<Math.min(height,by+k);y++)for(let x=bx;x<Math.min(width,bx+k);x++){
   const at=y*width+x,da=A[at]-ma,db=B[at]-mb;
   va+=da*da;vb+=db*db;cov+=da*db;
  }
  va/=n;vb/=n;cov/=n;
  const z=(2*ma*mb+C1)*(2*cov+C2)/((ma*ma+mb*mb+C1)*(va+vb+C2));
  total+=Math.min(1,Math.max(-1,z));blocks++;
 }
 return +(total/blocks).toFixed(4);
};
(async()=>{
 const result={note:"SSIM multiescala em tons de cinza: diagnóstico de geometria/layout, NÃO prova de semelhança estética nem porcentagem literal.",scales:{}};
 for(const width of [1536,384,96,48]){
  const height=Math.round(width*864/1536);
  const decode=async file=>{const data=await sharp(file).resize(width,height,{fit:"fill"})
  .greyscale().raw().toBuffer({resolveWithObject:true});return data;};
  const [a,b]=await Promise.all([decode(reference),decode(screenshot)]);
  result.scales[width+"x"+height]=ssim(a,b,width,height,Math.max(4,Math.round(width/192)));
 }
 fs.writeFileSync(output,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});
