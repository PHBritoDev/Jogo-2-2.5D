"use strict";
/** Observer V8 - interpreta amostras da API QA, sem forjar estados de jogo. */
const LIMIT=240;
function newState(){return {hydraSamples:0,flameSamples:0,hydraPhases:[],flamePhases:[],events:[],samples:0};}
function ingest(state,sample){
 const st=state||newState(),d=sample?.dim||sample||{};
 const t=Number.isFinite(sample?.at)?sample.at:null;
 st.samples++;
 for(const [key,field,phases] of [["hydra","hydraSamples","hydraPhases"],["moonFlames","flameSamples","flamePhases"]]){
  const active=d[key];
  if(!active)continue;
  st[field]++;
  const phase=String(active.phase||"unknown");
  if(!st[phases].includes(phase))st[phases].push(phase);
  if(st.events.length<LIMIT){
   const prev=st.events.at(-1);
   if(!prev||prev.type!==key||prev.phase!==phase)
    st.events.push({type:key,phase,at:t});
  }
 }
 return st;
}
function evidence(state){
 const s=state||newState();
 return {hydraObserved:s.hydraSamples>0,flameObserved:s.flameSamples>0,
  hydraSamples:s.hydraSamples,flameSamples:s.flameSamples,
  sampledStates:s.samples,hydraPhases:[...s.hydraPhases],flamePhases:[...s.flamePhases],
  source:"QA dimState sampled from live WebGL scene (not screenshot verification)"};
}
module.exports={newState,ingest,evidence};
