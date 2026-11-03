"use strict";

/**
 * Percepcao V3: analisa RAW RGB do canvas 3D (nao imagens inventadas)
 * em 9 regioes, detecta detalhes/bloqueios e permite selecionar camera.
 * NAO classifica personagens, animações ou modelos semanticamente.
 */
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const fix = x => +x.toFixed(3);

function inspectFrame(rgb, w, h, previous = null) {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 6 || h < 6 ||
      !rgb || rgb.length !== w * h * 3) throw new Error("Buffer RGB invalido");
  const sectors = Array.from({length: 9}, (_, i) =>
    ({i, pixels:0, sum:0, sq:0, bright:0, dark:0, vivid:0, edge:0, motion:0}));
  const validPrev = previous && previous.length === rgb.length;
  let globalDiff=0, countMotion=0, totalEdges=0, lumaTotal=0, luminanceSq=0;
  let dark=0, bright=0, vivid=0;
  const lumas = new Float32Array(w * h);
  for (let y=0; y<h; y++)for(let x=0; x<w; x++){
    const p=y*w+x, j=p*3;
    const r=rgb[j]/255,g=rgb[j+1]/255,b=rgb[j+2]/255;
    const l=.2126*r+.7152*g+.0722*b;
    lumas[p]=l;lumaTotal+=l;luminanceSq+=l*l;
    const sector=Math.min(2,Math.floor(y*3/h))*3+
      Math.min(2,Math.floor(x*3/w));
    const s=sectors[sector];s.pixels++;s.sum+=l;s.sq+=l*l;
    if(l<.11){dark++;s.dark++;}
    if(l>.88){bright++;s.bright++;}
    if(Math.max(r,g,b)-Math.min(r,g,b)>.32){vivid++;s.vivid++;}
    if(validPrev){
      const delta=(Math.abs(rgb[j]-previous[j])+
        Math.abs(rgb[j+1]-previous[j+1])+
        Math.abs(rgb[j+2]-previous[j+2]))/765;
      globalDiff+=delta;
      if(delta>.07){countMotion++;s.motion++;}
    }
  }
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const p=y*w+x;
    const dx=Math.abs(lumas[p+1]-lumas[p-1]),
      dy=Math.abs(lumas[p+w]-lumas[p-w]);
    if(dx+dy>.19){
      const i=Math.min(2,Math.floor(y*3/h))*3+
        Math.min(2,Math.floor(x*3/w));
      sectors[i].edge++;totalEdges++;
    }
  }
  const N=w*h;
  const zones=sectors.map(s=>({
    average:fix(s.sum/s.pixels),
    contrast:fix(Math.sqrt(Math.max(0,s.sq/s.pixels-(s.sum/s.pixels)**2))),
    dark:fix(s.dark/s.pixels),bright:fix(s.bright/s.pixels),
    vivid:fix(s.vivid/s.pixels),edges:fix(s.edge/s.pixels),
    motion:validPrev?fix(s.motion/s.pixels):null
  }));
  const center=zones[4], rim=[zones[0],zones[2],zones[6],zones[8]];
  const avgRim=rim.reduce((a,z)=>a+z.average,0)/rim.length;
  const edges=totalEdges/N, avg=lumaTotal/N;
  const flags=[];
  if(avg<.055 || dark/N>.96)flags.push("quadro_escuro");
  if(bright/N>.56 || center.bright>.78)flags.push("brilho_encobrindo_tela");
  if(Math.sqrt(Math.max(0,luminanceSq/N-avg*avg))<.045)flags.push("poucos_detalhes_visiveis");
  if(center.dark>.68 && center.dark-dark/N>.12 && avg>.13)
    flags.push("possivel_objeto_escuro_obstruindo_camera");
  if(center.average<avgRim*.42 && center.edges<.085 && avgRim>.16)
    flags.push("centro_sem_visibilidade");
  if(validPrev && globalDiff/N<.002)flags.push("imagem_quase_estatica");
  if(validPrev && countMotion/N>.73)flags.push("mudanca_bruta_de_quadro");
  if(edges<.025 && avg>.12 && avg<.9 && center.contrast<.04)
    flags.push("baixo_detalhe_espacial");
  // Quanto maior, mais adequada a captura para avaliar VFX. Nao mede "beleza".
  const penalty =
      65*clamp((center.dark-.40)/.60,0,1)
    + 38*clamp((center.bright-.30)/.70,0,1)
    + 18*clamp((.045-center.contrast)/.045,0,1)
    + 14*clamp((.055-edges)/.055,0,1)
    + 22*clamp((.12-avg)/.12,0,1);
  const quality=fix(clamp(100-penalty,0,100));
  return {
    brightness:fix(avg),
    contrast:fix(Math.sqrt(Math.max(0,luminanceSq/N-avg*avg))),
    darkFraction:fix(dark/N),brightFraction:fix(bright/N),
    vividFraction:fix(vivid/N),edgeDensity:fix(edges),
    motionFraction:validPrev?fix(countMotion/N):null,
    change:validPrev?fix(globalDiff/N):null,
    center, zones, flags, quality
  };
}
function cameraWinner(candidates) {
  const valid=(candidates||[]).filter(c=>Number.isFinite(c?.vision?.quality));
  if(!valid.length)return null;
  return valid.reduce((best,c)=>c.vision.quality>best.vision.quality?c:best);
}
function summarizeRun(log){
  const records=log.decisions||[];
  const counts={},severe=[];
  for(const r of records){
    for(const flag of r.vision?.flags||[]){counts[flag]=(counts[flag]||0)+1;}
    if(r.sceneProbe?.hydra?.bodyBottomRelativeToGround>1.1 &&
      r.sceneProbe?.hydra?.phase==="emerge"){
      severe.push({tick:r.tick,type:"possivel_hidra_acima_do_solo",
        value:r.sceneProbe.hydra.bodyBottomRelativeToGround,
        detail:"Geometria aproximada; shader e animacao nao incluidos"});
    }
    if(r.sceneProbe?.renderer?.calls>800)
      severe.push({tick:r.tick,type:"draw_calls_altos_swiftshader",
        value:r.sceneProbe.renderer.calls,detail:"Indicativo no Chromium, nao FPS Android"});
  }
  return {
    steps:records.length,
    actions:records.filter(x=>x.executed?.buttons?.length).length,
    distinctPhases:[...new Set(records.map(x=>x.phase).filter(Boolean))],
    flagCounts:counts, structuralWarnings:severe,
    framesExamined:records.filter(x=>Number.isFinite(x.vision?.quality)).length,
    averageVisibility:records.length?fix(records.reduce((a,x)=>a+(x.vision?.quality||0),0)/records.length):null
  };
}
module.exports={inspectFrame,cameraWinner,summarizeRun};
