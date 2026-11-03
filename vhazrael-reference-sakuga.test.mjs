import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {throneReferenceCue,VHAZRAEL_REFERENCE_BUILD} from './vhazrael-reference-sakuga3d.js';
import {THRONE} from './vhazrael3d.js';
import {wingSkeleton,wingFeatherProfile,WING_LOD,VHAZRAEL_WINGS_BUILD} from './vhazrael-feather-wings3d.js';

const state=(phase,age,t=0,extra={})=>({phase,age,t,T:THRONE,...extra});
test('Mod 275: asas abissais se abrem antes do corte real da espada',()=>{
 const a=throneReferenceCue(state('raise',.2));
 const b=throneReferenceCue(state('charge',3.6));
 const c=throneReferenceCue(state('slash',4.8));
 assert.equal(a.whiteCore,0);
 assert.ok(b.wings>.95 && b.whiteCore>.95,'carga mostra massa lateral e núcleo');
 assert.ok(c.wings>.95 && c.whiteCore>.9,'golpe mantém silhueta na antecipação');
 assert.equal(b.impact,0,'sem explosão durante carga');
});
test('Mod 275: reação no mesmo impacto, sem lançar ataque novo',()=>{
 const flight=throneReferenceCue(state('wave',5.3));
 const start=throneReferenceCue(state('impact',5.8,.06));
 const impact=throneReferenceCue(state('impact',6.1,.55));
 const end=throneReferenceCue(state('impact',8.0,2.5));
 assert.ok(flight.whiteCore>.85,'núcleo acompanha frente do corte');
 assert.ok(impact.impact>start.impact && impact.lightning>0,'explosão constrói progressivamente');
 assert.ok(end.impact<.1,'dissipa após colidir');
 assert.equal(throneReferenceCue(state('fade',9.4)).whiteCore,0);
});
test('Mod 275: interromper e limpar não deixa VFX fantasma',()=>{
 const phases=['done','fade','idle'];
 for(const phase of phases)assert.equal(throneReferenceCue(state(phase,4)).wings,0);
 assert.deepEqual(throneReferenceCue(state('charge',4,0,{cancel:true})),
 {phase:'off',wings:0,whiteCore:0,impact:0,lightning:0});
});
test('Mod 275: combate e animação original continuam intactos',()=>{
 assert.equal(THRONE.dmg,26);assert.equal(THRONE.raise,1.65);
 assert.equal(THRONE.charge,4.45);assert.equal(THRONE.cut,5.15);
 assert.equal(THRONE.impact,3.6);
 assert.match(VHAZRAEL_REFERENCE_BUILD,/^276-/);
 const old=fs.readFileSync(new URL('./vhazrael-rupture3d.js',import.meta.url),'utf8');
 const newFx=fs.readFileSync(new URL('./vhazrael-reference-sakuga3d.js',import.meta.url),'utf8');
 const body=fs.readFileSync(new URL('./enemy1-squad-runtime3d.js',import.meta.url),'utf8');
 assert.ok(old.includes('reference.render(s,blade,boss,low,ground)'));
 assert.ok(old.includes('reference.clear()')&&old.includes('reference.dispose()'));
 assert.ok(old.includes('drawCharge(s, blade, boss)')&&old.includes('drawImpact(s)'));
 assert.ok(old.includes('impactCore.scale.set(size * .59, size * 2.2, size * .55)'),
   'núcleo do impacto mantém ruptura vertical em vez de esfera genérica');
 assert.ok(!old.includes('impactCore.scale.set(size * 1.07, size * 1.4, size * .9)'),
   'não restaurar o núcleo arredondado de antes');
 assert.ok(body.includes('bakeCombatClips')&&body.includes('bossPose'),'sistema de animação original permanece');
 assert.ok(newFx.includes("name='NucleoBrancoCarmesimVertical'"));
 assert.ok(newFx.includes("createVhazraelFeatherWings(T,root)"),
   'as malhas genéricas antigas foram substituídas por plumas reais 3D');
 assert.ok(!newFx.includes("AsasDeTintaNegraVioleta")&&!newFx.includes("function wingGeo("),
   'nada de asa de fumaça genérica antiga no VFX');
 assert.ok(newFx.includes("name='RelampagosBrancosLaterais'"));
 assert.ok(newFx.includes("name='PedrasAngularesDoRasgo'"));
 assert.ok(newFx.includes("low?10:24")&&newFx.includes("low?2:4"),'nível baixo reduz custo');
 assert.ok(!newFx.includes('Math.random('),'efeitos reprodutíveis, sem animação aleatória');
});


test('Mod 276 — asas com formato anatômico arqueado, plumas longas e simétricas',()=>{
 const rightStart=wingSkeleton(0,1),leftStart=wingSkeleton(0,-1);
 assert.equal(leftStart.x,-rightStart.x,'raiz das asas espelhada');
 assert.equal(leftStart.y,rightStart.y);
 const crown=wingSkeleton(.35,1),tip=wingSkeleton(1,1);
 assert.ok(crown.y>rightStart.y+6,'articulação sobe acima das costas como na referência');
 assert.ok(tip.y<rightStart.y-11,'ponta externa curva para baixo e envolve o Bispo');
 assert.ok(tip.x>rightStart.x+8,'envergadura colossal para os lados');
 const primary=wingFeatherProfile(.85,0,true),secondary=wingFeatherProfile(.3,1);
 assert.ok(primary.length>8 && primary.length>secondary.length,'penas primárias longas e pontiagudas');
 assert.ok(primary.inward>.45,'penas voltam ao centro em vez de placas retas');
 assert.ok(WING_LOD.high.primary>WING_LOD.low.primary);
 assert.equal(WING_LOD.low.primary,11,'mobile reduz geometria, não remove as asas');
 assert.match(VHAZRAEL_WINGS_BUILD,/^276-/);
 const source=fs.readFileSync(new URL('./vhazrael-feather-wings3d.js',import.meta.url),'utf8');
 assert.ok(source.includes('TubeGeometry')&&source.includes('featherCluster(T,side,quality)'));
 assert.ok(source.includes('MeshBasicMaterial')&&source.includes('ShaderMaterial'));
 assert.ok(!source.includes('Math.random('),'animação estável, sem improvisos aleatórios');
});
