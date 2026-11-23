// Original cues shared by the campaign SFX bus and offline capture of the
// simulation clock. All voices have finite lifetimes, including cancellation.
export function createUsuraScore(ctx,output){
 const voices=new Set();
 function note(type,start,hz,end,duration,volume,attack=.018){
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(hz,start);
  osc.frequency.exponentialRampToValueAtTime(end,start+duration);
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(volume,start+attack);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain).connect(output);osc.start(start);osc.stop(start+duration+.02);
  const voice={osc,gain};voices.add(voice);
  osc.onended=()=>{osc.disconnect();gain.disconnect();voices.delete(voice)};
 }
 function cut(t){
  for(const {osc,gain} of voices){
   if(gain.gain.cancelAndHoldAtTime)gain.gain.cancelAndHoldAtTime(t);
   else gain.gain.cancelScheduledValues(t);
   gain.gain.setTargetAtTime(.0001,t,.018);osc.stop(t+.09);
  }
 }
 return {beat(phase,t=ctx.currentTime){
  if(phase==='idle'){cut(t);return;}
  if(phase==='announce'){
   note('triangle',t,75,52,1.25,.22,.16);
   note('sine',t+.1,149,104,1.2,.095,.19);
  }else if(phase==='bladeCombo'){
   for(const delay of [.12,.71,1.48]){
    note('triangle',t+delay,1680,160,.31,.13);
    note('sine',t+delay+.04,3090,1970,.40,.067);
   }
  }else if(phase==='throw'){
   note('sawtooth',t+.38,132,680,.55,.07,.08);
   note('sine',t+.52,860,1370,.69,.10);
  }else if(phase==='charge'){
   for(const [i,ratio] of [1,1.5,2.03].entries())
    note('triangle',t+i*.17,71*ratio,215*ratio,2.42,.13/(1+i),1.8);
  }else if(phase==='escape'){
   for(const [i,f] of [523,784].entries())note('sine',t+i*.17,f,f*.992,.8,.08);
  }else if(phase==='collapse'){
   note('triangle',t,438,47,.25,.19);
  }else if(phase==='detonate'){
   note('sine',t,134,30,1.48,.82);
   note('triangle',t+.065,920,50,.44,.36);
   note('sawtooth',t+.19,152,36,1.03,.11);
   note('sine',t+.34,75,26,.97,.34);
  }else if(phase==='aftermath'){
   for(const [i,f] of [741,557,372].entries())note('sine',t+i*.21,f,f*.988,1.35,.07/(1+i));
  }
 },stop:()=>cut(ctx.currentTime)};
}
