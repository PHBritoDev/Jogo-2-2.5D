import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./mundo-3d-prototype.js',import.meta.url),'utf8');
const head=source.indexOf('/* MOD 304 — perfis gráficos reais');
const tail=source.indexOf('(function initAudioSettings()',head);
if(head<0||tail<head)throw new Error('Adaptive quality policy not found');
function build(dpr=3){
 const calls=[];
 const ctx={
 THREE:{MathUtils:{clamp:(x,a,b)=>Math.max(a,Math.min(b,x))}},
 renderer:{ratio:1.25,getPixelRatio(){return this.ratio},setPixelRatio(n){this.ratio=n;calls.push(['resolution',n])},setSize(){},shadowMap:{enabled:true,needsUpdate:false}},
 devicePixelRatio:dpr,innerWidth:852,innerHeight:480,
 terrainLowSpec:false,navigator:{userAgent:'Android',deviceMemory:8},
 sunLight:{castShadow:true,shadow:{mapSize:{x:512,set(n){this.x=n}},map:null,needsUpdate:false}},
 grassGroup:{visible:true},mossInstancesA:{visible:true},mossInstancesB:{visible:true},
 movingClouds:[{group:{visible:true}}],tropicalBelt:{setProfile(x){calls.push(['lod',x])}},
 tropicalProfile(){return vm.runInContext('graphics3DAutoTier<=1?"low":graphics3DAutoTier===2?"auto":"high"',context)},
 refreshInstanceCulling(){},document:{getElementById(){return {textContent:''}}}
 };
 const context=vm.createContext(ctx);
 const api=vm.runInContext(source.slice(head,tail)+`
 ({applyGraphics3D,updateAutoGraphics3D,setTier:n=>graphics3DAutoTier=n,
   get:()=>({tier:graphics3DAutoTier,scale:graphics3DScale,mode:graphics3DMode,fps:graphics3DFps})})`,context);
 return {api,ctx,calls};
}
test('auto realmente reduz resolução em tela DPR3, não trava no antigo teto 1.5',()=>{
 const {api,ctx}=build(3);
 api.applyGraphics3D('auto',.88);assert.equal(ctx.renderer.ratio,.88);
 api.setTier(0);api.applyGraphics3D('auto',.53);
 assert.equal(ctx.renderer.ratio,.53);assert.equal(ctx.grassGroup.visible,false);
});
test('modos baixo médio alto máximo são independentes e Médio preserva vegetação',()=>{
 const {api,ctx}=build();
 api.applyGraphics3D('low',.5);assert.equal(ctx.grassGroup.visible,false);
 api.applyGraphics3D('medium',.5);assert.equal(ctx.grassGroup.visible,true);
 assert.equal(ctx.renderer.ratio,.82);
 api.applyGraphics3D('high',1.1);assert.equal(ctx.renderer.ratio,1.1);
 api.applyGraphics3D('max',1.4);assert.equal(ctx.renderer.ratio,1.4);
});
test('9 FPS dispara emergência, qualidade volta apenas depois de boa estabilidade',()=>{
 const {api,ctx}=build();
 api.applyGraphics3D('auto',.88);
 // 2+ seconds at ~9FPS.
 for(let i=0;i<22;i++)api.updateAutoGraphics3D(.11,11000+i*110);
 assert.equal(api.get().tier,0);
 assert.equal(ctx.renderer.ratio,.53);
 // Quick oscillations cannot restore the quality.
 for(let i=0;i<60;i++)api.updateAutoGraphics3D(.016,14000+i*16);
 assert.equal(api.get().tier,0);
 // After sustained smooth frames and a long cooldown, tier may rise.
 for(let i=0;i<1100;i++)api.updateAutoGraphics3D(.016,32000+i*16);
 assert.ok(api.get().tier>=1);
});
