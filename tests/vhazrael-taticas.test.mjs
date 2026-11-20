// Missão 19/11 — VHAZRAEL: kit canônico no jogo público, matriz de decisão com objetivo, leitura da magia do herói,
// armadura de cambaleio e timings independentes do FPS (30/45/60).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Enemy1Squad } from '../enemy1-squad3d.js';
import { VZ, VZ_TACTICS, VZ_DASH } from '../vhazrael3d.js';
import { TEMP_MELEE_ONLY_TEST, meleeOnlyProfile } from '../combat-melee-test-mode.js';
import '../enemy2-squad3d.js'; import '../enemy3-squad3d.js'; import '../enemy4-squad3d.js';

const hero = (o = {}) => ({ id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, iframes: false, air: 0, ...o });
function world(seed = 3) { const log = []; const sq = new Enemy1Squad({ seed, blocked: () => false, damageTarget: () => 'hit', event: (type, d) => log.push({ type, ...d }) }); return { sq, log }; }
const boss = (sq, z = 6) => { const a = sq.spawn([{ x: 0, z, yaw: Math.PI, kind: 'vhazrael' }])[0]; a.alert = 0; return a; };
const src = fs.readFileSync(new URL('../combat-melee-test-mode.js', import.meta.url), 'utf8');

test('P0: o modo só físico é OPCIONAL — o padrão (sem parâmetro) mantém salto, escudo, magias e ultimate', () => {
  assert.equal(TEMP_MELEE_ONLY_TEST, false); assert.equal(meleeOnlyProfile('vhazrael'), false);
  assert.ok(/params\.has\('treinoFisico'\) \|\| params\.has\('somenteFisico'\)/.test(src) && !/!new URLSearchParams\(window\.location\.search\)\.has\('fullCombatQA'\);/.test(src));
  assert.deepEqual(VZ.boss.kit, ['throne', 'thorns', 'bombard', 'orbital']); assert.ok(VZ.boss.leap && VZ.boss.shield);
});

test('lê a conjuração do herói e responde com variedade (escudo, dash, salto, aguentar) — nunca esquiva de tudo', () => {
  const answers = {};
  for (let seed = 1; seed <= 160; seed++) {
    const { sq, log } = world(seed), a = boss(sq, 5.5), h = hero({ casting: true }); sq.setTargets([h]);
    for (let i = 0; i < 6; i++) sq.update(1 / 60);
    const r = log.find(e => e.type === 'vzRead'); if (r) answers[r.answer] = (answers[r.answer] || 0) + 1;
  }
  for (const k of ['escudo', 'dash', 'salto', 'recebe']) assert.ok((answers[k] || 0) >= 8, `${k}: ${JSON.stringify(answers)}`);
  const total = Object.values(answers).reduce((x, y) => x + y, 0); assert.ok(answers.recebe / total > .1 && answers.recebe / total < .4, 'às vezes aguenta o golpe');
});

test('táticas com objetivo por faixa de distância: entrar (dash + corte), flanquear, sair e punir', () => {
  const seen = {};
  const scen = [{ z: 5, h: {} , want: 'entrar' }, { z: 1.9, h: { attacking: true }, want: 'sair' }, { z: 2.2, h: { blocking: true }, want: 'flanquear' }];
  for (const s of scen) for (let seed = 1; seed <= 60; seed++) {
    const { sq, log } = world(seed), a = boss(sq, s.z), h = hero(s.h); sq.setTargets([h]); a.cds.melee = .2;
    for (let i = 0; i < 90; i++) sq.update(1 / 60);
    for (const e of log) if (e.type === 'vzTactic') seen[e.goal] = (seen[e.goal] || 0) + 1;
  }
  for (const g of ['entrar', 'sair', 'flanquear']) assert.ok(seen[g] > 3, `${g}: ${JSON.stringify(seen)}`);
  // o dash de entrada encadeia o golpe (chain melee) e respeita a recarga própria
  const { sq, log } = world(7), a = boss(sq, 5), h = hero(); sq.setTargets([h]);
  for (let i = 0; i < 600; i++) sq.update(1 / 60);
  const enters = log.filter(e => e.type === 'vzTactic' && e.goal === 'entrar');
  assert.ok(enters.length <= Math.ceil(10 / VZ_TACTICS.enter.cd) + 1, 'sem spam de dash de entrada');
});

test('orçamento de dash: nunca mais de 3 dashes em 2,5 s, mesmo sob pressão e magia constantes', () => {
  const { sq, log } = world(11), a = boss(sq, 2.4), h = hero({ attacking: true, casting: true }); sq.setTargets([h]);
  const at = []; let last = null;
  for (let i = 0; i < 60 * 20; i++) { sq.update(1 / 60); if (a.act && a.act !== last && a.act.type === 'dodge') at.push(sq.time); last = a.act; }
  for (let i = 0; i < at.length; i++) assert.ok(at.filter(x => x >= at[i] && x < at[i] + VZ_DASH.window).length <= VZ_DASH.budget + 1, 'janela de 2,5 s');
});

test('armadura de cambaleio: depois de cambalear, 2,2 s sem novo cambaleio (só a quebra de guarda passa)', () => {
  const { sq, log } = world(5), a = boss(sq, 2), h = hero(); sq.setTargets([h]);
  sq.stagger(a, .3, false); assert.equal(a.act.type, 'stagger');
  sq.update(.4); a.act = null; sq.stagger(a, .3, false); assert.notEqual(a.act?.type, 'stagger'); assert.ok(log.some(e => e.type === 'poiseHold'));
  sq.stagger(a, .9, true); assert.equal(a.act.type, 'stagger', 'quebra de guarda passa');
  sq.time += VZ.boss.staggerArmor + 1; a.act = null; sq.stagger(a, .3, false); assert.equal(a.act.type, 'stagger');
});

test('timings independentes do FPS: 30/45/60 dão a mesma sequência de golpes e o mesmo 1º impacto', () => {
  const runAt = (fps) => { const { sq, log } = world(21), a = boss(sq, 2.2), h = hero(); sq.setTargets([h]); for (let i = 0; i < fps * 6; i++) sq.update(1 / fps);
    return { hits: log.filter(e => e.type === 'meleeHit').map(e => Math.round(e.n)), first: log.find(e => e.type === 'windup')?.kind }; };
  const r30 = runAt(30), r45 = runAt(45), r60 = runAt(60);
  assert.equal(r30.first, r60.first); assert.equal(r45.first, r60.first);
  assert.deepEqual(r30.hits.slice(0, 2), r60.hits.slice(0, 2));
});

for (const fps of [30,45,60]) {
  test('Julgamento anuncia ponto fixo, salta e resolve uma vez a '+fps+' FPS',()=>{
    for (const answer of ['stay','escape','jump']) {
      const {sq,log}=world(), a=boss(sq,5), h=hero();
      sq.setTargets([h]);sq.startLeap(a,h);
      let apex=0,mark;
      for(let i=0;i<fps*3 && a.act;i++){
        sq.stepAction(a,1/fps,h);apex=Math.max(apex,a.airY||0);
        if(!mark)mark={...a.act.mark};
        if(i===fps){if(answer==='escape')h.x=mark.x+3;if(answer==='jump')h.y=1.3;}
        if(a.act)assert.deepEqual(a.act.mark,mark);
      }
      assert.ok(apex>5);assert.equal(a.airY,0);assert.equal(log.filter(e=>e.type==='leapStrike').length,1);
      assert.equal(log.filter(e=>e.type==='meleeHit').length,answer==='stay'?1:0);
    }
  });
}
test('recuperação permite escudo e preserva o último quadro ativo',()=>{
  const {sq,log}=world(),a=boss(sq,2),h=hero({attacking:true});sq.setTargets([h]);sq.startMelee(a,h,'Trono_Duplo');
  const act=a.act;sq.rand=()=>.01;act.t=act.move.close-.05;
  a.T.brain(sq,a,.01,h);assert.equal(a.act,act);assert.equal(a.react,null);
  act.t=act.move.close+.1;a.T.brain(sq,a,.01,h);assert.equal(a.react.type,'shield');
  for(let i=0;i<15;i++)sq.update(1/60);
  assert.equal(log.filter(e=>e.type==='shield').length,1);assert.equal(a.shield.canActivate(sq.time),false);
});
test('avanço emenda flanco apenas uma vez no mesmo orçamento',()=>{
  const {sq,log}=world(),a=boss(sq,5),h=hero();sq.setTargets([h]);
  sq.begin(a,{type:'dodge',anim:'dash',goal:'entrar',dx:0,dz:-1,dur:.24});a.act.t=.23;
  a.T.brain(sq,a,.02,h);assert.equal(a.act.goal,'flanco-duplo');
  a.act.t=.2;a.T.brain(sq,a,.02,h);assert.equal(log.filter(e=>e.goal==='flanco-duplo').length,1);
});

test('Julgamento escolhe solo anterior ao muro; um alvo atrás dele fica ileso',()=>{
 const log=[],sq=new Enemy1Squad({blocked:(_x,z)=>z<3.4,los:(_x,z,_tx,tz)=>z>=3.4&&tz>=3.4,
   damageTarget:()=>{throw Error('dano atravessou o muro');},event:(type,d)=>log.push({type,...d})});
 const a=boss(sq,5),h=hero();sq.setTargets([h]);sq.startLeap(a,h);
 for(let i=0;i<100 && a.act;i++){sq.stepAction(a,1/30,h);assert.ok(a.z>=3.4);}
 assert.ok(log.some(e=>e.type==='vzMark'&&e.mark.z>=3.4));
});
test('a estocada não vira instantaneamente para acertar quem ficou atrás',()=>{
 const {sq}=world(),a=boss(sq,2),h=hero({z:5});sq.setTargets([h]);const yaw=a.yaw;
 sq.startMelee(a,h,'Trono_Estocada');assert.equal(a.yaw,yaw);
 sq.stepAction(a,1/60,h);assert.ok(Math.cos(a.yaw-yaw)>.9);
});

test('o elo de espada começa na recuperação, termina na terceira ação e preserva punição', () => {
  const {sq, log} = world(), a = boss(sq, 1.7), h = hero();
  sq.setTargets([h]);
  sq.startMelee(a, h);
  const first = a.act;
  first.t = first.move.close;
  a.T.brain(sq, a, 1/120, h);
  assert.equal(a.act, first);
  first.t = first.move.close + .14;
  a.T.brain(sq, a, 1/120, h);
  assert.equal(a.act.links, 2);
  a.act.t = a.act.move.close + .14;
  a.T.brain(sq, a, 1/120, h);
  const last = a.act;
  assert.equal(last.links, 3);
  last.t = last.move.close + .14;
  a.T.brain(sq, a, 1/120, h);
  assert.equal(a.act, last);
  assert.deepEqual(log.filter(e => e.type === 'vzLink').map(e => e.links), [2,3]);
  sq.startMelee(a,h,'Trono_Queda');
  const heavy = a.act;
  heavy.t = heavy.move.close + .14;
  a.T.brain(sq,a,1/120,h);
  assert.equal(a.act,heavy);
});

test('o impulso aéreo acontece antes de alcançar a marca e move o corpo até ela', () => {
  const {sq,log}=world(), a=boss(sq,6), h=hero();
  sq.setTargets([h]);sq.startLeap(a,h);
  while (a.act.phase!=='airDash' && a.act.t<2) sq.stepAction(a,1/120,h);
  assert.equal(a.act.phase,'airDash');
  const mark=a.act.mark;
  const remaining=()=>Math.hypot(a.x-mark.x,a.z-mark.z);
  assert.ok(remaining()>1 && a.airY>3);
  while(a.act.phase==='airDash') sq.stepAction(a,1/120,h);
  assert.ok(remaining()<.05);
  assert.equal(log.filter(e=>e.type==='airDash').length,1);
});
