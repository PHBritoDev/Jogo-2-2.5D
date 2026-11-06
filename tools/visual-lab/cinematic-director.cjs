"use strict";
/**
 * Director Cinematografico V1 — avaliacao visual REPRODUZIVEL, independente do motor.
 * Reutilizavel para jogos e sites (Playwright/Sharp). Nao gera uma nota artistica inventada.
 * Entradas: capturas PNG das fases, nomes e viewport. Opcional: referencias do mesmo quadro.
 * Saidas: JSON com exposicao, ocupacao, movimento, transicoes e observacoes acionaveis.
 */
const fs=require("node:fs");
const path=require("node:path");
const sharp=require("sharp");
const W=160,H=90,PIX=W*H;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
async function pixels(file){
  if(!fs.existsSync(file))throw Error("Captura nao encontrada: "+file);
  return sharp(file).resize(W,H,{fit:"fill"}).removeAlpha().raw().toBuffer();
}
function compareBuffers(a,b){
  if(a.length!==b.length)throw Error("Dimensoes incompatíveis");
  let diff=0,changed=0,edgeA=0,edgeB=0;
  for(let i=0;i<a.length;i+=3){
    let d=(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/3;
    diff+=d;if(d>14)changed++;
  }
  // Esta e diferenca de pixels, nao porcentagem de semelhanca perceptiva.
  return {meanDelta:+(diff/PIX).toFixed(2),changedFraction:+(changed/PIX).toFixed(4)};
}
function analyzeBuffer(b){
  let dark=0,clipped=0,lit=0,colorful=0,graySum=0,edgeEnergy=0;
  const y=new Float32Array(PIX);
  for(let p=0;p<PIX;p++){
    const i=p*3,r=b[i],g=b[i+1],bl=b[i+2],max=Math.max(r,g,bl),min=Math.min(r,g,bl);
    const luminance=.2126*r+.7152*g+.0722*bl;y[p]=luminance;graySum+=luminance;
    if(max<20)dark++;if(min>242)clipped++;if(max>48)lit++;if(max-min>45)colorful++;
  }
  for(let yy=1;yy<H-1;yy++)for(let xx=1;xx<W-1;xx++){
    const p=yy*W+xx;edgeEnergy+=Math.abs(y[p]-y[p-1])+Math.abs(y[p]-y[p-W]);
  }
  return {meanBrightness:+(graySum/PIX).toFixed(1),darkFraction:+(dark/PIX).toFixed(3),
    highlightClipping:+(clipped/PIX).toFixed(3),litFraction:+(lit/PIX).toFixed(3),
    chromaticFraction:+(colorful/PIX).toFixed(3),
    edgeEnergy:+(edgeEnergy/(2*(W-2)*(H-2)*255)).toFixed(3)};
}
function qualityFlags(metric,phase){
  const flags=[];
  if(metric.darkFraction>.90)flags.push({severity:"warn",code:"NEAR_BLACK",message:"Quadro muito escuro; conferir leitura do sujeito"});
  if(metric.highlightClipping>.28)flags.push({severity:"warn",code:"CLIPPED_HIGHLIGHTS",message:"Claridade branca excessiva; conferir materiais e exposicao"});
  if(metric.litFraction<.09)flags.push({severity:"warn",code:"LOW_VISIBILITY",message:"Cena com pouca area visivel"});
  if(phase.includes("explosao")&&metric.edgeEnergy<.025)flags.push({severity:"review",code:"FLAT_BLAST",message:"Explosao sem muito detalhe espacial; revisar visualmente"});
  return flags;
}
async function evaluate({folder,frameNames,baselineFolder=null,referenceFolder=null}){
  if(!Array.isArray(frameNames)||!frameNames.length)throw Error("frameNames obrigatorio");
  const out={schemaVersion:1,scope:"visual measurements, not artistic approval",frames:[],transitions:[],comparisons:[],
    findings:[],artisticSimilarity:{status:"UNVERIFIED",score:null,note:"80% exige comparacao semantica humana com referencias equivalentes"}};
  let previous=null;
  for(const name of frameNames){
    const file=path.join(folder,name+".png"),raw=await pixels(file),metrics=analyzeBuffer(raw);
    const flags=qualityFlags(metrics,name);
    out.frames.push({name,metrics,flags});out.findings.push(...flags.map(x=>({...x,frame:name})));
    if(previous){
      const delta=compareBuffers(previous.raw,raw);
      out.transitions.push({from:previous.name,to:name,...delta});
      if(delta.changedFraction<.025)out.findings.push({severity:"review",code:"STATIC_TRANSITION",frame:name,message:"Transicao quase sem mudanca visivel"});
    }
    for(const [kind,source] of [["baseline",baselineFolder],["reference",referenceFolder]]){
      if(!source)continue;
      const candidate=path.join(source,name+".png");if(!fs.existsSync(candidate))continue;
      const base=await pixels(candidate),delta=compareBuffers(base,raw);
      out.comparisons.push({kind,name,...delta,note:"Diferenca pixel a pixel; nao mede similaridade artistica"});
      if(kind==="baseline"&&delta.changedFraction<.012)
        out.findings.push({severity:"review",code:"NO_VISIBLE_CHANGE",frame:name,message:"Novo quadro quase identico ao baseline"});
    }
    previous={name,raw};
  }
  out.findings.sort((a,b)=>(a.severity==="warn"?0:1)-(b.severity==="warn"?0:1));
  out.approvedTechnical=out.frames.length===frameNames.length&&!out.findings.some(f=>f.severity==="warn"&&f.code==="NEAR_BLACK");
  out.approvedArtistic=false;
  return out;
}
module.exports={analyzeBuffer,compareBuffers,qualityFlags,evaluate};
