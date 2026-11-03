import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {moonVisibility,travelingGrowth} from './zarkhael-moon-vfx3d.js';
import {BF,createBlackMoonFlames} from './zarkhael-blackflame3d.js';

test('Mod 273: imagem da lua fornecida pelo criador e WebP real e otimizado',()=>{
 const art=fs.readFileSync(new URL('./zarkhael-moon-reference.webp',import.meta.url));
 assert.equal(art.toString('ascii',0,4),'RIFF');
 assert.equal(art.toString('ascii',8,12),'WEBP');
 assert.ok(art.length>3000&&art.length<20000,'asset compacto para celular');
});
test('Mod 273: lua aparece sem sumir antes da colossal e respeita cancelamentos',()=>{
 assert.equal(moonVisibility(0,-1),0);
 assert.ok(moonVisibility(2,-1)>.95);
 assert.ok(moonVisibility(11,-1)>.95);
 assert.ok(moonVisibility(13,12.5)>.90,'permanece quando colossal e lançada');
 assert.ok(moonVisibility(16,12.5)<.25,'some apenas depois de lancada');
 assert.equal(moonVisibility(6,-1,true),0);
 assert.equal(moonVisibility(6,-1,false,true),0);
});
test('Mod 273: fogo se forma durante o trajeto e nao surge colossal instantaneamente',()=>{
 assert.equal(travelingGrowth(0,false),.12);
 assert.ok(travelingGrowth(.10,false)>travelingGrowth(0,false));
 assert.equal(travelingGrowth(.35,false),1);
 assert.equal(travelingGrowth(.6,true),1);
 assert.ok(travelingGrowth(.2,true)<travelingGrowth(.2,false));
});
test('Mod 273: preserva as 10 chamas e a colossal, sem alterar dano e alcance',()=>{
 assert.equal(BF.shots,10);assert.equal(BF.smallDmg,3);assert.equal(BF.bigDmg,20);
 assert.equal(BF.fieldSmall,4);assert.equal(BF.fieldBig,7);
 const seq=createBlackMoonFlames({ground:()=>0}).start();
 assert.equal(seq.st.fired,0);assert.equal(seq.st.final,null);
});
