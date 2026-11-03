import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {throneReferenceCue,VHAZRAEL_REFERENCE_BUILD} from './vhazrael-reference-sakuga3d.js';
import {THRONE} from './vhazrael3d.js';

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
 assert.match(VHAZRAEL_REFERENCE_BUILD,/^275-/);
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
 assert.ok(newFx.includes("name='AsasDeTintaNegraVioleta'"));
 assert.ok(newFx.includes("name='RelampagosBrancosLaterais'"));
 assert.ok(newFx.includes("name='PedrasAngularesDoRasgo'"));
 assert.ok(newFx.includes("low?10:24")&&newFx.includes("low?2:4"),'nível baixo reduz custo');
 assert.ok(!newFx.includes('Math.random('),'efeitos reprodutíveis, sem animação aleatória');
});
