/** Mod 244: authored paths, shared by native animation baking, contact windows and first-person hands. */
export const WEAPON_STYLES=Object.freeze({
 prota:{label:'Chamado',chain:['diagonal','thrust','rise','spin','finish'],tempo:1,spread:1,guard:[-.30,1.22,.42],lean:.06},
 aurora:{label:'Aurora',chain:['reverse','spin','diagonal','rise','finish'],tempo:.95,spread:1.14,guard:[-.40,1.38,.18],lean:.10},
 vigilia:{label:'Vigília',chain:['thrust','low','reverse','thrust','rise'],tempo:.88,spread:.72,guard:[-.23,1.18,.52],lean:.02},
 quantum:{label:'Quantum',chain:['orbit','reverse','spin','thrust','orbit'],tempo:.93,spread:1.06,guard:[-.36,1.05,.26],lean:.12},
 celeste:{label:'Celestial',chain:['overhead','diagonal','reverse','rise','finish'],tempo:1.18,spread:1.2,guard:[-.19,1.40,.36],lean:.14}
});
// Hand paths are measured in metres in a 1.8 m author's space, +Z forward. No root teleport or scale keys.
const P={
 diagonal:[[-.64,1.52,.14],[-.20,1.20,.65],[.44,.86,.25]],
 reverse:[[.40,1.32,.12],[.03,1.18,.67],[-.64,.92,.20]],
 thrust:[[-.32,1.15,.12],[-.10,1.20,.84],[-.13,1.23,.70]],
 rise:[[-.42,.78,.24],[-.10,1.23,.67],[.14,1.72,.30]],
 low:[[-.64,1.06,.14],[-.18,.75,.68],[.42,.92,.36]],
 spin:[[-.55,1.21,.05],[.24,1.15,.63],[.50,1.30,-.05]],
 orbit:[[-.56,1.43,.02],[.12,1.25,.70],[.43,1.53,.10]],
 overhead:[[-.16,1.82,.03],[-.12,1.22,.64],[-.14,.76,.48]],
 finish:[[-.44,1.78,.10],[.05,1.26,.69],[.43,.72,.26]],
 dash:[[-.46,1.25,-.02],[-.08,1.15,.76],[.38,1.07,.44]],
 run:[[-.50,1.14,.10],[-.10,1.18,.65],[.30,1.06,.46]],
 air:[[-.54,1.55,.10],[.10,1.28,.68],[.43,.98,.19]],
 plunge:[[-.16,1.80,.06],[-.14,.88,.57],[-.12,.69,.40]]
};
const D={diagonal:[[-.9,.4,.1],[.1,-.25,1],[1,-.2,0]],reverse:[[.9,.2,0],[-.1,-.15,1],[-1,-.15,.1]],thrust:[[0,.2,1],[0,0,1],[0,.05,1]],rise:[[-.4,-.8,.4],[0,.1,1],[.3,.9,.2]],low:[[-1,0,0],[.1,-.45,1],[1,0,.1]],spin:[[-.9,.1,.1],[.1,.1,1],[.9,.15,-.2]],orbit:[[-1,.3,0],[.2,-.1,1],[1,.55,.1]],overhead:[[0,1,-.2],[0,-.2,1],[0,-1,.4]],finish:[[-.4,.9,-.1],[.1,-.1,1],[.8,-.6,.1]],dash:[[-1,.1,.2],[.1,.1,1],[1,.2,.1]],run:[[-.9,.2,0],[0,.15,1],[.9,.1,.2]],air:[[-.8,.6,0],[.1,-.2,1],[.8,-.5,.1]],plunge:[[0,1,0],[0,-1,.3],[0,-1,.1]]};
export const COMBAT_MOVES={};
for(const [weapon,s] of Object.entries(WEAPON_STYLES))for(const mode of ['ground','run','dash','air','plunge'])for(let n=0;n<(mode==='ground'?5:1);n++){
 const pattern=mode==='ground'?s.chain[n]:mode,heavy=weapon==='celeste',duration=(mode==='dash'?.62:mode==='air'?.76:mode==='plunge'?1.1:.70+n*.055)*s.tempo;
 const open=duration*(pattern==='thrust'?.27:heavy?.39:.34),close=open+Math.min(.18,duration*.24),id=`Combat_${weapon}_${mode}_${n}`;
 COMBAT_MOVES[id]={id,weapon,mode,n,pattern,duration,open,close,buffer:Math.max(close,duration-.23),multiplier:mode==='plunge'?1.4:mode==='dash'?1.05:mode==='air'?.85:1+n*.08,advance:mode==='ground'?(pattern==='thrust'?.48:.24):0,guard:s.guard,spread:s.spread,lean:s.lean,heavy};
}
export const combatMove=(weapon,mode='ground',n=0)=>COMBAT_MOVES[`Combat_${weapon}_${mode}_${mode==='ground'?n%5:0}`];
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),smooth=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
export function combatPose(m,time){
 const u=Math.max(0,Math.min(1,time/m.duration)),o=m.open/m.duration,c=m.close/m.duration;
 const knots=[0,o*.68,o,c,1],points=[m.guard,...P[m.pattern],m.guard],dirs=[[-.35,.75,.6],...D[m.pattern],[-.35,.75,.6]];
 let i=0;while(i<3&&u>knots[i+1])i++;const k=smooth((u-knots[i])/(knots[i+1]-knots[i]));
 const hand=mix(points[i],points[i+1],k),blade=mix(dirs[i],dirs[i+1],k),env=Math.sin(Math.PI*u);
 hand[0]*=m.spread;hand[2]+=(m.weapon==='vigilia'?.08:m.weapon==='quantum'?-.035:0)*env;
 const turn=m.pattern==='reverse'?-1:1;let yaw=turn*(-.40+u*.95)*env*m.spread;
 if(m.pattern==='spin'||m.pattern==='orbit')yaw=(m.pattern==='spin'?1.45:1.05)*smooth(u);
 if(u>.84)yaw*=1-smooth((u-.84)/.16);
 const length=Math.hypot(...blade)||1,off=m.heavy?hand.map((v,i)=>v-blade[i]/length*.14):[.30-.12*yaw,1.1+.08*env,.14-.12*env];
 return{hand,blade,off,offBlade:m.heavy?blade:undefined,yaw,lean:m.lean+env*(m.mode==='plunge'?.35:.08),dip:env*(m.heavy?.10:.045),air:m.mode==='air'||m.mode==='plunge',phase:u};
}
