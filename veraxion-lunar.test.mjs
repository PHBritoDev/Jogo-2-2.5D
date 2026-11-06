import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLunarUltimate, LU } from './veraxion-lunar-ultimate3d.js';
import { buildMonsterData, monsterGLB, BONES, CLIPS } from './veraxion-lunar-monster-model3d.js';
import { kitFor } from './powers3d.js';
import { ultimateFor, ultimateDue } from './ultimates3d.js';

function run(move = () => {}, fps = 60) { const s = createLunarUltimate().start({ x: 1600, z: 8 }), h = { x: 1600, z: 8, iframes: false, alive: true }, L = [];
  for (let i = 0; i < fps * 40 && !s.done; i++) { move(h, s.st.t, s); for (const e of s.step(1 / fps, { hero: h })) { e.t = s.st.t; L.push(e); } } return { s, L, at: t => L.find(e => e.type === t), all: t => L.filter(e => e.type === t) }; }

test('Devorador Lunar — os 8 planos em ordem, 24–30 s, cada evento uma vez, igual a 15/30/60 FPS', () => {
  const r = run(); const order = ['boss', 'cosmos', 'moon', 'mouth', 'launch', 'impact', 'return', 'strike', 'warn', 'end'].map(t => r.at(t).t);
  for (let i = 1; i < order.length; i++) assert.ok(order[i] >= order[i - 1]); for (const t of ['boss', 'cosmos', 'moon', 'mouth', 'launch', 'impact', 'return', 'warn', 'end']) assert.equal(r.all(t).length, 1, t);
  assert.ok(LU.control >= 24 && LU.control <= 30, 'filme de ' + LU.control + ' s'); assert.ok(LU.mouth - LU.moon >= 3.5 && LU.launch - LU.mouth >= 4, 'monstro e buraco negro têm tempo de tela');
  const sig = x => x.L.filter(e => !['warn'].includes(e.type)).map(e => e.type).join(','); for (const f of [15, 30]) assert.equal(sig(run(() => {}, f)), sig(r));
});
test('Devorador Lunar — o golpe é UM só, capado, avisado 0,9 s antes e evitável com dash ou saindo do aviso; o filme não fere', () => {
  const r = run(); const hits = r.all('hit'); assert.equal(hits.length, 1); assert.ok(hits[0].dmg <= 40 && hits[0].dmg >= 20); assert.ok(r.at('hit').t - r.at('warn').t >= .85, 'aviso antes do golpe');
  assert.ok(!r.L.some(e => (e.type === 'hit') && e.t < LU.control), 'nenhum dano durante o filme');
  const dash = run((h, t) => { h.iframes = t > LU.hit - .2; }); assert.equal(dash.all('hit').length, 0); assert.equal(dash.all('dodge').length, 1);
  const out = run((h, t) => { if (t > LU.control + .2) h.x = 1600 + LU.hitR + 1; }); assert.equal(out.all('hit').length, 0); assert.equal(out.all('miss').length, 1);
  const sk = createLunarUltimate().start({ x: 0, z: 0 }); for (let i = 0; i < 60; i++) sk.step(1 / 60, { hero: { x: 0, z: 0 } }); assert.ok(sk.skip()); assert.ok(sk.st.t >= LU.skipTo); const ev = []; while (!sk.done) ev.push(...sk.step(1 / 60, { hero: { x: 0, z: 0 } })); assert.equal(ev.filter(e => e.type === 'hit').length, 1, 'pular não cancela o golpe');
});
test('Devorador Lunar — GLB autoral com esqueleto, mandíbula, chifres e os 4 clipes; nada genérico', () => {
  const d = buildMonsterData(), glb = monsterGLB(d), disk = fs.readFileSync(new URL('./DevoradorLunar.glb', import.meta.url)); assert.equal(Buffer.compare(Buffer.from(glb), disk), 0, 'GLB no disco = gerador');
  const jl = new DataView(glb.buffer).getUint32(12, true), J = JSON.parse(new TextDecoder().decode(glb.slice(20, 20 + jl)));
  assert.deepEqual(J.animations.map(a => a.name).sort(), ['jaw_charge', 'launch', 'lunar_idle', 'recoil']); assert.equal(J.skins[0].joints.length, BONES.length);
  for (const b of ['jaw', 'head', 'hornL', 'hornR', 'neck', 'chest', 'tail3']) assert.ok(J.nodes.some(n => n.name === b), b);
  assert.ok(d.I.length / 3 > 8000 && d.I.length / 3 < 40000, 'malha de cinema leve: ' + d.I.length / 3);
  let hy = 0; const P = d.P, C = d.C; for (let i = 0; i < P.length / 3; i++) if (C[i * 3] > .2 && C[i * 3] < .3) hy = Math.max(hy, P[i * 3 + 1]); assert.ok(hy > 8, 'chifres em meia-lua sobem acima da corcova');
  assert.ok(CLIPS.jaw_charge.keys.jaw(2)[0] > .9, 'a boca abre de verdade');
  const k = kitFor('veraxion'); assert.equal(k.ult.type, 'veraxion_lunar_devourer'); assert.equal(k, kitFor('fallen4')); assert.deepEqual(ultimateFor('veraxion').at, [0.4]); assert.equal(ultimateDue('veraxion', .2, 1), -1, 'uma vez por luta');
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(src.includes("if(uk==='veraxion_lunar_devourer'&&lunarCosmosReady()&&startLunarUlt())") && src.includes('if(lunarUlt&&tickLunarUlt(') && src.includes('stopLunarUlt();stopVeraxionCyclone();'), 'rota própria, filme e limpeza');
  assert.ok(!/startVoidUlt|tickVoidUlt/.test(src), 'Buraco Negro genérico continua excluído');
  assert.ok(src.includes("'./DevoradorLunar.glb?v=mod292'"), 'o monstro vem do GLB');
});
