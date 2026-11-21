// Missão 20/11 — ZAR'KHAEL (Bispo 3): NewBispo3.glb, Foice do Carrasco, mira por corte, dash com início a início ≥ 0,5 s
// e Espiral do Carrasco. Lógica pura + three.js real (CI: COMBAT_THREE_DIR, como tests/combat315.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Enemy1Squad, KINDS } from '../enemy1-squad3d.js';
import { ZARK, ZK_MOVES, ZK_ROLES, ZK_FILE, ZK_DASH, ZK_SPIRAL, zkStartSpiral, zkPhaseOf } from '../zarkhael-squad3d.js';
import { BOSS_MOVES } from '../boss-choreography3d.js';
import '../vorgazhek3d.js';
import '../vhazrael3d.js';

let THREE = null, DIR = null;
for (const dir of [process.env.COMBAT_THREE_DIR, process.env.AERIAL_THREE_DIR, new URL('../node_modules/three', import.meta.url).pathname]) {
  if (!dir) continue; try { THREE = await import(dir.replace(/\/$/, '') + '/build/three.module.js'); DIR = dir.replace(/\/$/, ''); break; } catch { /* tenta o próximo */ }
}
const glbJson = () => { const b = fs.readFileSync(new URL('../NewBispo3.glb', import.meta.url)); const len = b.readUInt32LE(12); return { b, len, j: JSON.parse(b.slice(20, 20 + len).toString()) }; };
const hero = (o = {}) => ({ id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, ...o });
const world = (seed = 3, dmg) => { const ev = []; const sq = new Enemy1Squad({ seed, damageTarget: dmg || (() => 'hit'), event: (type, d) => ev.push({ type, ...d }) }); return { sq, ev }; };
const boss = (sq, z = 6) => { const a = sq.spawn([{ x: 0, z, yaw: Math.PI, kind: 'zarkhael' }])[0]; a.alert = 0; return a; };

test('asset real: NewBispo3.glb é glTF binário, 83 ossos, 15 clipes; todo papel/golpe aponta para clipe existente ou recorte do próprio GLB', () => {
  const { b, j } = glbJson(); assert.equal(b.readUInt32LE(0), 0x46546C67, 'magic glTF'); assert.ok(ZK_FILE.startsWith('./NewBispo3.glb'));
  assert.equal(j.skins[0].joints.length, 83); assert.equal(j.animations.length, 15);
  const names = new Set(j.animations.map(a => a.name)); for (const n of ['Skill_02', 'Skill_03', 'Axe_Spin_Attack', 'Attack', 'Dead', 'Unarmed_Vault']) assert.ok(names.has(n), n);
  for (const [role, clip] of Object.entries(ZK_ROLES)) assert.ok(names.has(clip) || clip.startsWith('ZK_'), role + ' → ' + clip);
  const dur = Object.fromEntries(j.animations.map(a => { let d = 0; for (const c of a.channels) d = Math.max(d, j.accessors[a.samplers[c.sampler].input].max[0]); return [a.name, d]; }));
  for (const m of ZK_MOVES) { const clip = ZK_ROLES[m.clip]; assert.ok(m.hits.at(-1) < Math.min(m.duration, dur[clip]), m.id); assert.ok(m.duration <= dur[clip] + .01, m.id + ' cabe no clipe'); }
  assert.equal(BOSS_MOVES.zarkhael.length, ZK_MOVES.length); assert.equal(KINDS.zarkhael, ZARK.boss); assert.deepEqual(ZARK.boss.kit, []);
});

test('foice 3D: original e volumétrica, ≤ 7 chamadas de desenho, escala 1,3–1,6× / cabeça 0,45–0,6× da altura do chefe, traço no gume', { skip: !THREE && 'three.js indisponível' }, async () => {
  const { buildExecutionerScythe } = await import('../zarkhael-scythe3d.js'); const w = buildExecutionerScythe(THREE); let meshes = 0;
  w.traverse(o => { if (o.isMesh) meshes++; }); assert.ok(meshes <= 7, 'malhas ' + meshes);
  const box = new THREE.Box3().setFromObject(w), H = 2.1, len = box.max.y - box.min.y, head = box.max.x - box.min.x;
  assert.ok(len / H > 1.3 && len / H < 1.6, 'comprimento/altura ' + (len / H).toFixed(2)); assert.ok(head / H > .45 && head / H < .7, 'cabeça/altura ' + (head / H).toFixed(2));
  assert.ok(box.max.z - box.min.z > .05, 'volume'); const U = w.userData; assert.ok(U.edges.length >= 3 && U.tip && U.head);
  U.charge(1); U.updateFx(1, 0, false, true); U.dispose();
});

test('foice nas mãos: presa ao osso, passa pela mão ESQUERDA nos quadros a duas mãos, cabeça/ponta nunca abaixo do piso, em pé parado', { skip: !THREE && 'three.js indisponível' }, async () => {
  const { attachKatana, poseKatana } = await import('../enemy3-runtime3d.js'); const { zkGrip } = await import('../zarkhael-squad3d.js');
  const scene = new THREE.Scene(), holder = new THREE.Group(), hand = new THREE.Object3D(), lhand = new THREE.Object3D(); holder.add(hand, lhand); scene.add(holder);
  const b = { hand, lhand, holder, grip: zkGrip(THREE) }; attachKatana(THREE, scene, b, 'zarkhael'); assert.equal(b.weaponRoot.parent, scene);
  const a = { alive: true, kind: 'zarkhael', yaw: 0, y: 0, vx: 0, vz: 0, act: { type: 'melee', move: ZK_MOVES[0], t: .3 } };
  hand.position.set(.2, 1.2, .3); hand.quaternion.setFromEuler(new THREE.Euler(.3, .8, .2)); lhand.position.set(.2, 5, .3); scene.updateMatrixWorld(true);
  poseKatana(THREE, b, a, 1 / 30, 0, false); const want = hand.getWorldQuaternion(new THREE.Quaternion()).multiply(b.grip); assert.ok(b.weaponRoot.quaternion.angleTo(want) < 1e-4, 'uma mão: arma = mão × empunhadura');
  const haft = new THREE.Vector3(0, 1, 0).applyQuaternion(b.weaponRoot.quaternion); lhand.position.copy(hand.position).addScaledVector(haft.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), .4).normalize(), .2); scene.updateMatrixWorld(true);
  for (let i = 0; i < 30; i++) poseKatana(THREE, b, a, 1 / 30, 0, false);
  const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(b.weaponRoot.quaternion), toL = lhand.position.clone().sub(hand.position).normalize(); assert.ok(dir.angleTo(toL) < .05, 'duas mãos: haste passa pela mão esquerda');
  hand.position.set(0, .8, 0); hand.quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); lhand.position.set(0, 9, 0); scene.updateMatrixWorld(true); for (let i = 0; i < 30; i++) poseKatana(THREE, b, a, 1 / 30, 0, false);
  for (const L of [1.65, -.6]) { const p = new THREE.Vector3(0, L, 0).applyQuaternion(b.weaponRoot.quaternion).add(b.weaponRoot.position); assert.ok(p.y >= .05, 'ponta acima do piso ' + L + ': ' + p.y.toFixed(2)); }
  a.act = null; a.vx = 0; for (let i = 0; i < 60; i++) poseKatana(THREE, b, a, 1 / 30, 0, false); const up = new THREE.Vector3(0, 1, 0).applyQuaternion(b.weaponRoot.quaternion); assert.ok(up.y > .8, 'parado: foice em pé');
  b.weapon.userData.dispose();
});

test('dash: início a início NUNCA abaixo de 0,5 s, orçamento por janela, sequências com objetivo', () => {
  let minGap = 9; const g = { 1: 0, 2: 0, 3: 0, 4: 0 }, goals = {};
  for (let seed = 1; seed <= 8; seed++) { const { sq, ev } = world(seed), a = boss(sq, 7), h = hero(); sq.setTargets([h]); const starts = []; let last = null;
    for (let i = 0; i < 60 * 30; i++) { const t = i / 60; h.attacking = (t % 3) < 1 && Math.hypot(a.x - h.x, a.z - h.z) < 3; h.dashing = (t % 4) < .15; h.iframes = h.dashing; h.vz = (t % 9) > 6 ? -4.2 : 0; h.z += h.vz / 60; sq.update(1 / 60);
      if (a.act && a.act !== last) { last = a.act; if (a.act.type === 'dodge') starts.push(sq.time); } }
    for (let i = 1; i < starts.length; i++) minGap = Math.min(minGap, starts[i] - starts[i - 1]);
    for (let i = 0; i < starts.length; i++) assert.ok(starts.filter(x => x >= starts[i] && x < starts[i] + ZK_DASH.window).length <= ZK_DASH.budget + 1);
    for (const k in g) g[k] += a.zkStats.groups[k]; for (const e of ev) if (e.type === 'zkTactic') goals[e.goal] = (goals[e.goal] || 0) + 1; }
  assert.ok(minGap >= ZK_DASH.minStart - 1e-6, 'menor intervalo ' + minGap.toFixed(3));
  assert.ok(g[2] > 0, 'sequências de 2 dashes ' + JSON.stringify(g)); for (const k of ['perseguir', 'flanco', 'recuo', 'espiral']) assert.ok(goals[k] > 0, k + ' ' + JSON.stringify(goals));
});

const beastRun = (seed, z, each, dmgFn) => { let dmg = 0; const { sq, ev } = world(seed, dmgFn || (() => { dmg++; return 'hit'; })), a = boss(sq, z), h = hero(); sq.setTargets([h]); zkStartSpiral(sq, a, h);
  const ph = []; for (let i = 0; i < 60 * 9; i++) { each && each(i, a, h, sq); sq.update(1 / 60); const b = a.zkBeast; if (b && ph.at(-1) !== b.phase) ph.push(b.phase); } return { sq, ev, a, h, ph, dmg: () => dmg }; };
test('Fera dos Mil Olhos: 2 voltas de preparo → conjura → corre → para → abre → morde UMA vez → só então desintegra e explode', () => {
  const r = beastRun(7, 9); const seq = r.ev.filter(e => e.type === 'zkSpiral').map(e => e.phase + (e.loop !== undefined ? e.loop : ''));
  assert.deepEqual(seq.slice(0, 6), ['prep', 'spin0', 'spin1', 'out', 'lock', 'release']); assert.ok(ZK_SPIRAL.loops.length === 2 && ZK_SPIRAL.loops[1] > ZK_SPIRAL.loops[0]);
  assert.deepEqual(r.ph, ['summon', 'run', 'stop', 'open', 'close', 'burst', 'dome'], 'ordem fixa: corrida antes da boca, explosão só depois da mordida');
  assert.equal(r.dmg(), 1, 'um único dano, no fechamento'); assert.equal(r.a.zkStats.bite_hit, 1); assert.equal(r.a.zkBeast, null, 'removida ao fim');
  const bite = r.ev.find(e => e.type === 'zkBeast' && e.phase === 'bite'), first = r.ev.findIndex(e => e.type === 'meleeHit' && e.move === 'mordida'), burst = r.ev.findIndex(e => e.type === 'zkBeast' && e.phase === 'burst');
  assert.equal(bite.result, 'hit'); assert.ok(first >= 0 && first < burst, 'dano antes da desintegração e nunca antes do fechamento');
  assert.ok(Math.abs(r.sq.heroDebuff.hero.until - (r.ev.find(e => e.type === 'heroDebuff').until)) < 1e-9 && r.sq.heroDebuff.hero.until - r.sq.time > 20, 'debuff de 30 s aplicado');
});
test('Fera: dash com i-frames na mordida e fuga lateral escapam; corrida limitada (sem perseguição eterna nem teleporte)', () => {
  { const r = beastRun(8, 9, (i, a, h) => { h.iframes = a.zkBeast?.phase === 'close'; }); assert.equal(r.dmg(), 0); assert.equal(r.a.zkStats.bite_evaded, 1); }
  { const r = beastRun(9, 9, (i, a, h) => { if (a.zkBeast && a.zkBeast.phase === 'open' && a.zkBeast.lockYaw !== null) h.x += 7 / 60; }); assert.equal(r.dmg(), 0, 'saiu do bote travado'); }
  { let maxStep = 0, last = null; const r = beastRun(10, 9, (i, a, h) => { h.z += -6.2 / 60; const b = a.zkBeast; if (b) { if (last) maxStep = Math.max(maxStep, Math.hypot(b.x - last.x, b.z - last.z)); last = { x: b.x, z: b.z }; } });
    assert.ok(maxStep < .25, 'sem teleporte: passo máx ' + maxStep); assert.ok(r.ph.includes('dome')); }
});
test('Fera: magia mata com um acerto (sem mordida, sem dano, sem debuff); espada provoca UM salto e não mata', async () => {
  const { zkBeastMagicHit, zkBeastSwordHit, zkHeroDamageMul } = await import('../zarkhael-beast3d.js');
  { const r = beastRun(11, 9, (i, a, h, sq) => { if (a.zkBeast?.phase === 'run' && a.zkBeast.run > .3) zkBeastMagicHit(sq, a, a.zkBeast); });
    assert.equal(r.dmg(), 0); assert.ok(!r.ph.includes('close'), 'não morde'); assert.ok(r.ph.includes('dome')); assert.equal(zkHeroDamageMul(r.sq), 1); }
  { let leaps = 0; const r = beastRun(12, 9, (i, a, h, sq) => { const b = a.zkBeast; if (b && /run|stop|open/.test(b.phase) && zkBeastSwordHit(sq, a, b)) leaps++; });
    assert.equal(leaps, 1, 'um salto por invocação'); assert.ok(r.ph.includes('leap') && r.ph.indexOf('leap') < r.ph.indexOf('close'), 'salto → abre → morde'); assert.equal(r.dmg(), 1); }
});
test('Debuff da mordida: dano do herói ×0,8 por 30 s de jogo, renova sem acumular, expira; ataques do chefe não mudam', async () => {
  const { zkBeastBite, zkHeroDamageMul } = await import('../zarkhael-beast3d.js'); const { sq } = world(13), a = boss(sq, 6), h = hero(); sq.setTargets([h]); a.hp = a.maxHp = 1000;
  const hit = n => { const hp = a.hp; sq.damageActor(a.id, n, { x: 0, z: 0, kind: 'melee', by: 'hero' }); return hp - a.hp; };
  a.yaw = 0; a.x = 0; a.z = 2; const base = hit(100); zkBeastBite(sq, 'hero'); const deb = hit(100); assert.equal(deb, Math.round(base * .8), base + ' → ' + deb);
  sq.time += 20; zkBeastBite(sq, 'hero'); assert.equal(zkHeroDamageMul(sq), .8, 'renova, nunca .64'); sq.time += 29; assert.equal(zkHeroDamageMul(sq), .8); sq.time += 1.1; assert.equal(zkHeroDamageMul(sq), 1, 'expira');
  assert.equal(hit(100), base, 'volta ao normal');
});
test('Fera em 30/45/60 FPS: mesmas fases e mesmo resultado', () => {
  const run = fps => { const { sq, ev } = world(12), a = boss(sq, 9), h = hero(); sq.setTargets([h]); zkStartSpiral(sq, a, h); for (let i = 0; i < fps * 9; i++) sq.update(1 / fps); return ev.filter(e => e.type === 'zkBeast').map(e => e.phase).join(',') + '|' + (a.zkStats.bite_hit || 0); };
  assert.equal(run(30), run(60)); assert.equal(run(45), run(60));
});

test('golpes: herói parado à frente/lado/costas a 1,5/2,5/3,5 m é atingido (traço REAL do GLB + motor + mira); i-frames na janela anulam', { skip: !THREE && 'three.js indisponível' }, async () => {
  const { GLTFLoader } = await import(DIR + '/examples/jsm/loaders/GLTFLoader.js'), SK = await import(DIR + '/examples/jsm/utils/SkeletonUtils.js');
  const { zkSynthClips, zkGrip } = await import('../zarkhael-squad3d.js'), { vgMoveClips } = await import('../vorgazhek3d.js'), { bossTraceContact } = await import('../boss-choreography3d.js');
  const { inPlaceClip } = await import('../vhazrael-rig3d.js'), { buildExecutionerScythe } = await import('../zarkhael-scythe3d.js');
  const { b, len, j } = glbJson(); // sem as texturas WebP (Node não decodifica); geometria, skin e clipes intactos
  delete j.images; delete j.textures; delete j.samplers; delete j.extensionsUsed; delete j.extensionsRequired; for (const m of j.materials || []) { if (m.pbrMetallicRoughness) { delete m.pbrMetallicRoughness.baseColorTexture; delete m.pbrMetallicRoughness.metallicRoughnessTexture; } delete m.normalTexture; delete m.emissiveTexture; delete m.occlusionTexture; }
  let js = Buffer.from(JSON.stringify(j)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]); const bin = b.slice(20 + len), out = Buffer.alloc(20 + js.length + bin.length);
  out.writeUInt32LE(0x46546C67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8); out.writeUInt32LE(js.length, 12); out.writeUInt32LE(0x4E4F534A, 16); js.copy(out, 20); bin.copy(out, 20 + js.length);
  const g = await new Promise((res, rej) => new GLTFLoader().parse(out.buffer.slice(out.byteOffset, out.byteOffset + out.length), '', res, rej));
  const clips = g.animations.concat(zkSynthClips(THREE, g.animations)), model = g.scene;
  { const m0 = new THREE.AnimationMixer(model); m0.clipAction(clips.find(c => c.name === 'ZK_idle')).play(); m0.setTime(0); model.updateMatrixWorld(true); let hy, fy; model.traverse(o => { if (o.name === 'HeadEnd') hy = o.getWorldPosition(new THREE.Vector3()).y; if (o.name === 'LeftToes') fy = o.getWorldPosition(new THREE.Vector3()).y; }); const s = 2.06 / (hy - fy); model.scale.setScalar(s); model.position.y = -fy * s; m0.stopAllAction(); }
  const role = r => { const c = clips.find(x => x.name === ZK_ROLES[r]); return c ? inPlaceClip(c, { vertical: r === 'dash' }) : null; }, U = buildExecutionerScythe(THREE).userData;
  const cc = vgMoveClips(THREE, model, m => SK.clone(m), role, BOSS_MOVES.zarkhael, zkGrip(THREE), U.edges, U.head.toArray());
  const spin = clips.find(c => c.name === 'ZK_spin_loop'); assert.ok(spin && Math.abs(spin.duration - 19 / 30) < .02, 'laço de uma volta do Skill_02');
  let hit = 0, n = 0, falsos = 0; const miss = [];
  for (const fps of [30, 60]) for (const dist of [1.5, 2.5, 3.5]) for (const ang of [0, 90, 180]) for (const m of BOSS_MOVES.zarkhael) { if (m.range) continue;
    for (const dodge of [false, true]) { const ev = [], sq = new Enemy1Squad({ seed: 5, damageTarget: id => h.iframes ? 'evaded' : 'hit', event: (t, d) => ev.push({ t, ...d }), meleeTrace: (a, act, t, lo, hi) => bossTraceContact(cc[act.move.id]?.combatTrace, lo, hi, a, t) });
      const a = sq.spawn([{ x: 0, z: 0, yaw: 0, kind: 'zarkhael' }])[0]; a.alert = 0; a.vzPhase = 3; a.T = { ...a.T, brain: () => {} }; const r = ang * Math.PI / 180, h = hero({ x: Math.sin(r) * dist, z: Math.cos(r) * dist }); sq.setTargets([h]);
      sq.startMelee(a, h, m.id); for (let i = 0; a.act && a.act.move && i < fps * 5; i++) { h.iframes = dodge && m.hits.some(t => Math.abs(a.act.t - t) < .14); sq.update(1 / fps); h.x = Math.sin(r) * dist; h.z = Math.cos(r) * dist; }
      const k = ev.filter(e => e.t === 'meleeHit' && e.result === 'hit').length; if (dodge) falsos += k; else { hit += k; n += m.hits.length; if (k < m.hits.length) miss.push(`${m.id}@${dist}/${ang}/${fps}`); } } }
  assert.ok(hit / n >= .9, `acertos ${hit}/${n}: ${miss.slice(0, 6).join(' ')}`); assert.equal(falsos, 0, 'esquiva na janela não sofre dano');
});

test('integração: dimensão III usa SEMPRE a esquadra com NewBispo3 (campanha e TESTAR; nenhum parâmetro devolve o Bispo 3 clássico)', () => {
  const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(/else if\(b\.key==='bishop3'\)\{pack=\{squad:true,dim:true,rig:'bishop3n'/.test(m));
  assert.ok(/RIG_DEFS\.bishop3n=\{file:ZK_FILE/.test(m) && /k==='zarkhael'\?'bishop3n'/.test(m) && /P\.rig==='bishop3n'\?'zarkhael'/.test(m) && /function zarkhaelSquadDone\(\)/.test(m));
  assert.ok(/revealEncounter\(d\.profile,sp\.boss,b\.hp,d\.line\)/.test(m), 'caminho genérico ainda existe para os outros chefes');
  const r = fs.readFileSync(new URL('../enemy1-squad-runtime3d.js', import.meta.url), 'utf8');
  assert.ok(/if\(a\.kind==='zarkhael'\)\{/.test(r) && /zbfx\.sync\(a\.zkBeast/.test(r) && /style: 'zarkhael'/.test(r) && !/zkfx\.release\(/.test(r));
  assert.deepEqual([zkPhaseOf(100, 100), zkPhaseOf(60, 100), zkPhaseOf(30, 100), zkPhaseOf(10, 100)], [0, 1, 2, 3]);
  for (const k of ['vhazrael', 'e3boss', 'e4boss', 'common']) if (KINDS[k]) assert.ok(!KINDS[k].stepRise || k === 'vorgazhek', k);
});
