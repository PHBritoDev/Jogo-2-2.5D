import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLightBudget} from '../light-budget3d.js';
import {CAGE_CLEARING,JOURNEY_ENEMIES} from '../act1-world-layout.js';
import {MAP_POIS} from '../map3d.js';
import {CAVE_MOUTH} from '../ascension-layout.js';
const src=fs.readFileSync(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');

// THREE mínimo para o orçamento de luzes (só o que o módulo usa).
class V{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}setFromMatrixPosition(m){const e=m.elements;this.x=e[12];this.y=e[13];this.z=e[14];return this;}distanceTo(o){return Math.hypot(this.x-o.x,this.y-o.y,this.z-o.z);}copy(o){this.x=o.x;this.y=o.y;this.z=o.z;return this;}}
class Light{constructor(c=0xffffff,i=1,d=10,dec=2){this.isPointLight=true;this.intensity=i;this.distance=d;this.decay=dec;this.visible=true;this.parent=null;this.userData={};this.name='';this.castShadow=false;this.color={hex:c,copy(o){this.hex=o.hex;}};this.position=new V();this.layers={mask:1,set(n){this.mask=1<<n;}};this.matrixWorld={elements:new Array(16).fill(0)};}}
const T={PointLight:Light,Vector3:V};
function scene(){const kids=[];return{kids,visible:true,parent:null,add(o){o.parent=this;kids.push(o);},traverse(f){for(const k of kids)f(k);}};}
const at=(l,x,z)=>{l.matrixWorld.elements[12]=x;l.matrixWorld.elements[14]=z;return l;};

test('Mod 305: no máximo N luzes pontuais chegam ao shader; o resto do mundo continua animado fora da camada',()=>{
 const s=scene();for(let i=0;i<19;i++)s.add(at(new Light(0xffaa00,1.5,12),i*20,0));
 const lb=createLightBudget(T,s,{slots:4}),cam={getWorldPosition(v){return v.copy({x:0,y:0,z:0});}};
 for(let f=0;f<30;f++)lb.update(cam,1/30);
 const inShader=s.kids.filter(l=>l.layers.mask===1);assert.equal(inShader.length,4,'só os 4 slots ficam na camada renderizada');
 const lit=s.kids.filter(l=>l.userData.budgetSlot&&l.intensity>.5);assert.ok(lit.length>=1&&lit.length<=4);
 assert.ok(s.kids.filter(l=>!l.userData.budgetSlot).every(l=>l.layers.mask===1<<31));
});
test('Mod 305: luz desligada/oculta não ocupa slot e a troca é suave (sem piscar)',()=>{
 const s=scene();const a=at(new Light(0xffffff,2,10),1,0),b=at(new Light(0xffffff,2,10),3,0);s.add(a);s.add(b);
 const lb=createLightBudget(T,s,{slots:1}),cam={getWorldPosition(v){return v.copy({x:0,y:0,z:0});}};
 lb.update(cam,1/60);const slot=s.kids.find(l=>l.userData.budgetSlot);assert.ok(slot.intensity<2,'acende gradualmente');
 for(let i=0;i<60;i++)lb.update(cam,1/60);assert.ok(Math.abs(slot.intensity-2)<.05);
 a.visible=false;lb.update(cam,1/60);assert.ok(slot.intensity>.5,'não apaga de uma vez');
});
test('Mod 305/311: gaiolas e Demônio 1 numa clareira da mata (Mod 311: longe da fronteira da caverna); antigo evento removido',()=>{
 assert.ok(Math.hypot(CAGE_CLEARING.x-CAVE_MOUTH.x,CAGE_CLEARING.z-CAVE_MOUTH.z)>180,'bem longe da nova boca da caverna');
 for(const e of JOURNEY_ENEMIES)assert.ok(Math.hypot(e.x-CAGE_CLEARING.x,e.z-CAGE_CLEARING.z)<9);
 assert.deepEqual(MAP_POIS.find(p=>p.id==='gaiolas').x,CAGE_CLEARING.x);
 assert.doesNotMatch(src,/Observatório da Serra: anel de pedras altas/);
 assert.doesNotMatch(src,/place\('civil',-50,-224/);
 assert.doesNotMatch(src,/add\(SERRA\.cx\+dx,SERRA\.cz\+dz\)/);
 assert.doesNotMatch(src,/Math\.hypot\(x\+12,z\+97\)/,'nenhum gatilho/colisor/clareira no lugar antigo das gaiolas');
 assert.match(src,/const CAGE_CENTER=\{x:CAGE_CLEARING\.x,z:CAGE_CLEARING\.z\}/);
});
test('Mod 305: mata contínua na serra no mesmo pipeline LOD, torre do Ato IV preservada',()=>{
 assert.match(src,/const tropicalPlan=\[\.\.\.southernForestPlan,\.\.\.villageBeltPlan\]\.concat\(serraForestPlan(?:,valleyPlan)?\)/);
 assert.match(src,/function clearSerraTowerSite\(\)/);assert.match(src,/clearSerraTowerSite\(\);/);
 assert.match(src,/serraPaths=\[TOWER\.rivalPath/);
 assert.match(src,/lightBudget\.update\(camera,frameDelta\);updateInstanceCulling\(\)/);
 assert.match(src,/addUpdateRange\(first\*16,\(k-first\)\*16\)/,'upload parcial das instâncias visíveis');
});
