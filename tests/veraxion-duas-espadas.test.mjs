// Missão 20/11 — VÉRAXION (Bispo 4) com NewBispo4.glb e duas espadas; acabamento do ZAR'KHAEL (sem setor no chão,
// projétil novo e cúpula também na expiração). Lógica pura + three.js real (CI: COMBAT_THREE_DIR).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Enemy1Squad, KINDS } from '../enemy1-squad3d.js';
import { VERAX, VX_MOVES, VX_ROLES, VX_FILE, VX_DASH, VX_THROW, vxStartThrow, vxCancel } from '../veraxion-squad3d.js';
import { BOSS_MOVES } from '../boss-choreography3d.js';
import '../zarkhael-squad3d.js';

let THREE = null, DIR = null;
for (const dir of [process.env.COMBAT_THREE_DIR, process.env.AERIAL_THREE_DIR, new URL('../node_modules/three', import.meta.url).pathname]) {
  if (!dir) continue; try { THREE = await import(dir.replace(/\/$/, '') + '/build/three.module.js'); DIR = dir.replace(/\/$/, ''); break; } catch { /* tenta o próximo */ }
}
const glb = () => { const b = fs.readFileSync(new URL('../NewBispo4.glb', import.meta.url)); const len = b.readUInt32LE(12); return { b, len, j: JSON.parse(b.slice(20, 20 + len).toString()) }; };
const hero = (o = {}) => ({ id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, ...o });
const world = (seed = 3, dmg, blocked) => { const ev = []; const sq = new Enemy1Squad({ seed, damageTarget: dmg || (() => 'hit'), blocked: blocked || (() => false), event: (type, d) => ev.push({ type, ...d }) }); return { sq, ev }; };
const boss = (sq, z = 6) => { const a = sq.spawn([{ x: 0, z, yaw: Math.PI, kind: 'veraxion' }])[0]; a.alert = 0; return a; };

test('asset real: NewBispo4.glb é glTF, 36 ossos, 15 clipes enumerados; papéis/golpes apontam para clipes reais ou recortes', () => {
  const { b, j } = glb(); assert.equal(b.readUInt32LE(0), 0x46546C67); assert.ok(VX_FILE.startsWith('./NewBispo4.glb'));
  assert.equal(j.skins[0].joints.length, 36); assert.equal(j.animations.length, 15);
  const names = new Set(j.animations.map(a => a.name)); for (const n of ['Idle_14', 'Spartan_Kick', 'Walk_Backward_with_Sword', 'Charged_Upward_Slash', 'Double_Blade_Spin', 'Weapon_Combo_1']) assert.ok(names.has(n), n);
  for (const [role, clip] of Object.entries(VX_ROLES)) assert.ok(names.has(clip) || clip.startsWith('VX_'), role + ' → ' + clip);
  const dur = Object.fromEntries(j.animations.map(a => { let d = 0; for (const c of a.channels) d = Math.max(d, j.accessors[a.samplers[c.sampler].input].max[0]); return [a.name, d]; }));
  for (const m of VX_MOVES) { const clip = VX_ROLES[m.clip]; if (!clip.startsWith('VX_')) assert.ok(m.duration <= dur[clip] + .01, m.id); assert.equal(m.hands.length, m.hits.length, m.id); }
  assert.deepEqual(VERAX.boss.kit, []); assert.equal(KINDS.veraxion, VERAX.boss);
  const fams = ['Pendulo_Sangrento', 'Mandibula_em_Cruz', 'Rosa_de_Espinhos', 'Estocada_Gemea', 'Chute_de_Ruptura', 'Eclipse_Geminado']; for (const f of fams) assert.ok(VX_MOVES.some(m => m.id === f), f);
  assert.ok(VX_MOVES.find(m => m.id === 'Pendulo_Sangrento').hands.join() === 'R,L', 'A depois B');
});

test('duas espadas 3D distintas, ambas NA CENA, A na mão direita e B na esquerda; B sai da mão no arremesso e volta', { skip: !THREE && 'three.js indisponível' }, async () => {
  const { buildRosarySword, buildAbyssJawSword, VX_SWORDS } = await import('../veraxion-swords3d.js'), { attachKatana, poseKatana } = await import('../enemy3-runtime3d.js'), { vxGrip } = await import('../veraxion-squad3d.js');
  for (const [fn, len] of [[buildRosarySword, VX_SWORDS.A.blade], [buildAbyssJawSword, VX_SWORDS.B.blade]]) { const w = fn(THREE); let n = 0; w.traverse(o => { if (o.isMesh) n++; }); assert.ok(n <= 16, 'malhas ' + n); const box = new THREE.Box3().setFromObject(w); assert.ok(box.max.y > len * .95 && box.max.z - box.min.z > .03); assert.ok(len >= .95 && len <= 1.2); w.userData.dispose(); }
  const scene = new THREE.Scene(), holder = new THREE.Group(), hand = new THREE.Object3D(), lhand = new THREE.Object3D(); holder.add(hand, lhand); scene.add(holder);
  const b = { hand, lhand, holder, grip: vxGrip(THREE) }; attachKatana(THREE, scene, b, 'veraxion');
  assert.equal(b.weaponRoot.parent, scene); assert.equal(b.weaponRoot2.parent, scene); assert.notEqual(b.weapon.name, b.weapon2.name);
  hand.position.set(.4, 1.3, .2); lhand.position.set(-.4, 1.3, .2); hand.quaternion.setFromEuler(new THREE.Euler(-.8, .2, 0)); lhand.quaternion.setFromEuler(new THREE.Euler(-.8, -.2, 0)); scene.updateMatrixWorld(true);
  const a = { alive: true, kind: 'veraxion', yaw: 0, y: 0, vx: 0, vz: 0, act: { type: 'melee', move: VX_MOVES[0], t: .3 } };
  poseKatana(THREE, b, a, 1 / 30, 0, false);
  assert.ok(b.weaponRoot.position.distanceTo(hand.position) < 1e-6 && b.weaponRoot2.position.distanceTo(lhand.position) < 1e-6, 'cada espada na sua mão');
  a.vxThrown = { x: 3, y: 1.2, z: 4, dx: 0, dz: 1, spin: 1, alive: true }; poseKatana(THREE, b, a, 1 / 30, 0, false); assert.ok(b.weaponRoot2.position.distanceTo(new THREE.Vector3(3, 1.2, 4)) < 1e-6, 'B voa desacoplada');
  assert.ok(b.weaponRoot.position.distanceTo(hand.position) < 1e-6, 'A segue na mão');
  a.vxThrown = null; poseKatana(THREE, b, a, 1 / 30, 0, false); assert.ok(b.weaponRoot2.position.distanceTo(lhand.position) < 1e-6, 'B volta à mão (nunca duas cópias)');
  for (const R of [b.weaponRoot, b.weaponRoot2]) { const tip = new THREE.Vector3(0, 1.1, 0).applyQuaternion(R.quaternion).add(R.position); assert.ok(tip.y > .05, 'ponta acima do piso'); }
  b.weapon.userData.dispose(); b.weapon2.userData.dispose();
});

async function realGLB() {
  const { GLTFLoader } = await import(DIR + '/examples/jsm/loaders/GLTFLoader.js'), SK = await import(DIR + '/examples/jsm/utils/SkeletonUtils.js');
  const { b, len, j } = glb(); delete j.images; delete j.textures; delete j.samplers; delete j.extensionsUsed; delete j.extensionsRequired;
  for (const m of j.materials || []) { if (m.pbrMetallicRoughness) { delete m.pbrMetallicRoughness.baseColorTexture; delete m.pbrMetallicRoughness.metallicRoughnessTexture; } delete m.normalTexture; delete m.emissiveTexture; delete m.occlusionTexture; }
  let js = Buffer.from(JSON.stringify(j)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]); const bin = b.slice(20 + len), out = Buffer.alloc(20 + js.length + bin.length);
  out.writeUInt32LE(0x46546C67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8); out.writeUInt32LE(js.length, 12); out.writeUInt32LE(0x4E4F534A, 16); js.copy(out, 20); bin.copy(out, 20 + js.length);
  const g = await new Promise((res, rej) => new GLTFLoader().parse(out.buffer.slice(out.byteOffset, out.byteOffset + out.length), '', res, rej)); return { g, SK };
}
test('raiz: nenhum golpe "pula" o corpo — quadril horizontal constante em todos os clipes de combate (Double_Combo começava 1,08 m atrás)', { skip: !THREE && 'three.js indisponível' }, async () => {
  const { g } = await realGLB(), { vxSynthClips } = await import('../veraxion-squad3d.js'), { inPlaceClip } = await import('../vhazrael-rig3d.js');
  const clips = g.animations.concat(vxSynthClips(THREE, g.animations)), ref = clips.find(c => c.name === 'Idle_14').tracks.find(t => /Hips\.position$/.test(t.name)).values;
  for (const role of Object.keys(VX_ROLES)) { if (!/^(vx_|attack|dash|hit|back|block|idle)/.test(role)) continue; const c = clips.find(x => x.name === VX_ROLES[role]); assert.ok(c, role); const ip = inPlaceClip(c, { vertical: role === 'dash' || role === 'vx_lunge' }), v = ip.tracks.find(t => /Hips\.position$/.test(t.name)).values;
    for (let i = 0; i < v.length; i += 3) { assert.ok(Math.abs(v[i] - ref[0]) < 1e-4 && Math.abs(v[i + 2] - ref[2]) < 1e-4, role + ' quadril saltou'); } }
});

test('alinhamento REAL (traço das duas lâminas e do pé no GLB + motor + mira): herói parado é atingido de frente/lado/costas; i-frames anulam', { skip: !THREE && 'three.js indisponível' }, async () => {
  const { g, SK } = await realGLB(), { vxSynthClips, vxMoveClips, vxGrip } = await import('../veraxion-squad3d.js'), { bossTraceContact } = await import('../boss-choreography3d.js');
  const { inPlaceClip } = await import('../vhazrael-rig3d.js'), { buildRosarySword, buildAbyssJawSword } = await import('../veraxion-swords3d.js');
  const clips = g.animations.concat(vxSynthClips(THREE, g.animations)), model = g.scene;
  { const m0 = new THREE.AnimationMixer(model); m0.clipAction(clips.find(c => c.name === 'VX_idle')).play(); m0.setTime(0); model.updateMatrixWorld(true); let hy, fy; model.traverse(o => { if (o.name === 'HeadEnd') hy = o.getWorldPosition(new THREE.Vector3()).y; if (o.name === 'LeftToes') fy = o.getWorldPosition(new THREE.Vector3()).y; }); const s = 2.1 / (hy - fy); model.scale.setScalar(s); model.position.y = -fy * s; m0.stopAllAction(); }
  const role = r => { const c = clips.find(x => x.name === VX_ROLES[r]); return c ? inPlaceClip(c, { vertical: r === 'dash' || r === 'vx_lunge' }) : null; };
  const cc = vxMoveClips(THREE, model, m => SK.clone(m), role, BOSS_MOVES.veraxion, vxGrip(THREE), buildRosarySword(THREE).userData.edges, buildAbyssJawSword(THREE).userData.edges);
  let hit = 0, n = 0, falsos = 0; const miss = [];
  for (const fps of [30, 60]) for (const ang of [0, 90, 180]) for (const m of BOSS_MOVES.veraxion) for (const dist of m.kick ? [1.1] : m.range ? [3.2] : [1.5, 2.5, 3.5]) for (const dodge of [false, true]) {
    const ev = [], sq = new Enemy1Squad({ seed: 5, damageTarget: () => h.iframes ? 'evaded' : 'hit', event: (t, d) => ev.push({ t, ...d }), meleeTrace: (a, act, t, lo, hi) => bossTraceContact(cc[act.move.id]?.combatTrace, lo, hi, a, t) });
    const a = sq.spawn([{ x: 0, z: 0, yaw: 0, kind: 'veraxion' }])[0]; a.alert = 0; a.vzPhase = 3; a.T = { ...a.T, brain: () => {} }; const r = ang * Math.PI / 180, h = hero({ x: Math.sin(r) * dist, z: Math.cos(r) * dist }); sq.setTargets([h]);
    sq.startMelee(a, h, m.id); for (let i = 0; a.act && a.act.move && i < fps * 5; i++) { h.iframes = dodge && m.hits.some(t => a.act.t > t - .16 && a.act.t < t + .14); /* janela do motor abre em h−0,10; a 30 FPS o quadro anterior pode estar a h−0,15 */ sq.update(1 / fps); h.x = Math.sin(r) * dist; h.z = Math.cos(r) * dist; }
    const k = ev.filter(e => e.t === 'meleeHit' && e.result === 'hit').length; if (dodge) falsos += k; else { hit += k; n += m.hits.length; if (k < m.hits.length) miss.push(`${m.id}@${dist}/${ang}/${fps}`); } }
  assert.ok(hit / n >= .9, `acertos ${hit}/${n}: ${miss.slice(0, 8).join(' ')}`); assert.equal(falsos, 0, 'esquiva válida não sofre hit');
});

test('Arremesso Voraz: acerta → dano UMA vez e teleporte para trás do herói, sem golpe automático; erra → fim do voo e teleporte ao local; cancelamento devolve a espada', () => {
  { let dmg = 0; const { sq, ev } = world(4, () => { dmg++; return 'hit'; }), a = boss(sq, 8), h = hero(); sq.setTargets([h]); vxStartThrow(sq, a, h); let tpT = null;
    for (let i = 0; i < 60 * 3; i++) { sq.update(1 / 60); if (tpT === null && ev.some(e => e.type === 'vxThrow' && e.phase === 'teleport')) tpT = sq.time; }
    assert.equal(dmg, 1, 'dano único'); const tp = ev.find(e => e.type === 'vxThrow' && e.phase === 'teleport'); assert.equal(tp.end, 'hit');
    assert.ok(tp.to.z < h.z - 1.5, 'reaparece ATRÁS do herói (lado oposto ao de onde veio)'); assert.ok(Math.hypot(tp.to.x - h.x, tp.to.z - h.z) > 1.5, 'não cola no herói');
    assert.ok(!ev.some(e => e.type === 'meleeHit' && e.move !== 'arremesso'), 'nenhum golpe automático nas costas logo após o teleporte'); assert.equal(a.vxThrown, null, 'espada de volta'); }
  { let dmg = 0; const { sq, ev } = world(5, () => { dmg++; return 'hit'; }), a = boss(sq, 8), h = hero(); sq.setTargets([h]); vxStartThrow(sq, a, h);
    for (let i = 0; i < 60 * 3; i++) { if (a.vxThrown && a.vxThrown.alive) h.x = 3; sq.update(1 / 60); }
    assert.equal(dmg, 0, 'saiu da linha: não persegue'); const tp = ev.find(e => e.type === 'vxThrow' && e.phase === 'teleport'); assert.equal(tp.end, 'range');
    const imp = ev.find(e => e.type === 'vxThrow' && e.phase === 'impact'); assert.ok(Math.hypot(tp.to.x - imp.sword.x, tp.to.z - imp.sword.z) < 1.5, 'teleporta perto do fim real do voo'); assert.ok(Math.abs(imp.sword.travel - VX_THROW.range) < .5); }
  { const wall = (x, z) => z < 2; const { sq, ev } = world(6, () => 'miss', wall), a = boss(sq, 8), h = hero({ z: 0, iframes: true }); sq.setTargets([h]); vxStartThrow(sq, a, h);
    for (let i = 0; i < 60 * 3; i++) sq.update(1 / 60); const tp = ev.find(e => e.type === 'vxThrow' && e.phase === 'teleport'); assert.equal(tp.end, 'wall'); assert.ok(!wall(tp.to.x, tp.to.z), 'não fica preso na parede'); }
  { const { sq, ev } = world(7), a = boss(sq, 8), h = hero(); sq.setTargets([h]); vxStartThrow(sq, a, h); for (let i = 0; i < 40; i++) sq.update(1 / 60); assert.ok(a.vxThrown);
    a.act = null; sq.update(1 / 60); assert.equal(a.vxThrown, null, 'interrupção devolve a espada'); assert.ok(ev.some(e => e.type === 'vxThrow' && e.phase === 'cancel')); vxCancel(sq, a); }
});

test('Florescer Abissal: carga → pulso no quadro do clipe → arcos radiais; 1 acerto por onda; vão entre arcos e dash escapam; parede detém', async () => {
  const { VX_BLOOM, vxStartBloom } = await import('../veraxion-squad3d.js');
  { let dmg = 0; const { sq, ev } = world(8, () => { dmg++; return 'hit'; }), a = boss(sq, 6), h = hero(); sq.setTargets([h]); vxStartBloom(sq, a, h); let rel = null;
    for (let i = 0; i < 60 * 3; i++) { sq.update(1 / 60); if (rel === null && ev.some(e => e.type === 'vxBloom' && e.phase === 'release')) rel = sq.time; }
    assert.ok(Math.abs(rel - VX_BLOOM.release) < .05, 'liberação no quadro ' + rel); assert.equal(dmg, 1, 'um acerto por onda');
    const w = ev.find(e => e.type === 'vxBloom' && e.phase === 'release').waves[0]; assert.equal(w.arcs.length, VX_BLOOM.arcs); assert.ok(ev.some(e => e.type === 'vxBloom' && e.phase === 'end')); }
  { let dmg = 0; const { sq } = world(9, () => { dmg++; return 'hit'; }), a = boss(sq, 6), h = hero(); sq.setTargets([h]); vxStartBloom(sq, a, h);
    for (let i = 0; i < 60 * 3; i++) { h.iframes = !!(a.vxBloom?.length); sq.update(1 / 60); } assert.equal(dmg, 0); assert.equal(a.vxStats.upEvade, 1, 'dash atravessa'); }
  { let dmg = 0; const { sq, ev } = world(10, () => { dmg++; return 'hit'; }), a = boss(sq, 6), h = hero(); sq.setTargets([h]); vxStartBloom(sq, a, h); let moved = false;
    for (let i = 0; i < 60 * 3; i++) { if (!moved && ev.some(e => e.type === 'vxBloom' && e.phase === 'release')) { moved = true; const w = a.vxBloom[0], d = Math.hypot(h.x - w.ox, h.z - w.oz), mid = w.arcs[0].th + Math.PI / VX_BLOOM.arcs; h.x = w.ox + Math.sin(mid) * d; h.z = w.oz + Math.cos(mid) * d; } sq.update(1 / 60); }
    assert.equal(dmg, 0, 'no vão entre dois arcos não há dano'); }
  { let dmg = 0; const { sq } = world(11, () => { dmg++; return 'hit'; }); sq.blocked = (x, z) => z > 2.5 && z < 3.2; const a = boss(sq, 6), h = hero(); sq.setTargets([h]); sq.los = () => false; vxStartBloom(sq, a, h);
    for (let i = 0; i < 60 * 3; i++) sq.update(1 / 60); assert.equal(dmg, 0, 'arco não atravessa parede'); }
});

test('IA orgânica: dash com início a início ≥ 0,6 s, guarda/aparo, recuo (Passo do Carrasco), chute colado, técnicas com recarga', () => {
  let minGap = 9; const goals = {}, moves = new Set(); let parry = 0, kick = 0;
  for (let seed = 1; seed <= 8; seed++) { const { sq, ev } = world(seed), a = boss(sq, 7), h = hero(); sq.setTargets([h]); if (seed > 5) a.hp = a.maxHp * .5;
    for (let i = 0; i < 60 * 35; i++) { const t = i / 60; const d = Math.hypot(a.x - h.x, a.z - h.z); h.attacking = (t % 2.5) < 1 && d < 3; h.dashing = (t % 5) < .15; h.iframes = h.dashing; h.vz = (t % 9) > 6 ? -4.2 : (t % 9) < 1.5 && d > 2 ? 3 : 0; h.z += h.vz / 60;
      if (h.attacking && a.act && a.act.type === 'block' && d < 3) sq.damageActor(a, 10, { x: h.x, z: h.z, kind: 'melee' }); sq.update(1 / 60); }
    minGap = Math.min(minGap, a.vxStats.minDashGap); parry += a.vxStats.parry; kick += a.vxStats.kick;
    for (const e of ev) { if (e.type === 'vxTactic') goals[e.goal] = (goals[e.goal] || 0) + 1; if (e.type === 'windup') moves.add(e.kind); } }
  assert.ok(minGap >= VX_DASH.minStart - 1e-6, 'menor intervalo ' + minGap);
  for (const g of ['avanco', 'arremesso', 'ascendente', 'passo', 'chute', 'guarda']) assert.ok(goals[g] > 0, g + ' ' + JSON.stringify(goals));
  assert.ok(parry > 0, 'aparo com contragolpe'); assert.ok(kick > 0);
  for (const m of ['Pendulo_Sangrento', 'Mandibula_em_Cruz', 'Rosa_de_Espinhos', 'Estocada_Gemea', 'Chute_de_Ruptura']) assert.ok(moves.has(m), m + ' ' + [...moves]);
});

test('integração: Dimensão IV (campanha e TESTAR) usa SEMPRE NewBispo4 na esquadra; sem setor/cone no chão para Bispos 3/4; Florescer e Fera ligados ao VFX', async () => {
  const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(/else if\(b\.key==='bishop4'\)\{pack=\{squad:true,dim:true,rig:'bishop4n'/.test(m) && /RIG_DEFS\.bishop4n=\{file:VX_FILE/.test(m) && /function veraxionSquadDone\(\)/.test(m));
  assert.ok(/k==='veraxion'\?'bishop4n'/.test(m) && /P\.rig==='bishop4n'\?'veraxion'/.test(m) && /loadRig\('bishop4n'\)/.test(m));
  assert.ok(!/b\.key==='bishop3'&&BISHOP_DUEL_ONLY/.test(m), 'nenhum parâmetro devolve o Bispo 3 clássico');
  const r = fs.readFileSync(new URL('../enemy1-squad-runtime3d.js', import.meta.url), 'utf8');
  assert.ok(/if\(a\.kind!=='zarkhael'&&a\.kind!=='veraxion'\)b\.tell=new T\.Mesh/.test(r), 'sem setor no chão');
  assert.ok(/vxfx\.fracture\(/.test(r) && /vxfx\.teleport\(/.test(r) && /vbfx\.release\(/.test(r) && /vbfx\.sync\(a\.vxBloom\)/.test(r) && /style: 'veraxionA'/.test(r) && /style: 'veraxionB'/.test(r));
  if (THREE) { const { createZarkhaelBeastVFX } = await import('../zarkhael-beast-vfx3d.js'); const sc = new THREE.Scene(), fx = createZarkhaelBeastVFX(THREE, sc), b = { id: 1, x: 0, y: 0, z: 0, yaw: 0, v: 0, phase: 'run', pt: 0, gait: 0, jaw: 0, neck: 0, crouch: 0, air: 0, burn: 0, headY: .72 };
    fx.sync(b, true, 1 / 30, null); fx.update(1 / 30); assert.equal(fx.stats().rig, true); b.phase = 'dome'; fx.sync(b, true, 1 / 30, null); fx.update(1 / 30); assert.equal(fx.stats().domeOn, 1, 'cúpula só depois da mordida/desintegração'); fx.dispose(); }
});


test('regressão: escolha de combos não repete o último golpe quando há alternativas, inclusive se o último foi forçado', async () => {
  const { vxPickMove } = await import('../veraxion-squad3d.js');
  const sq = { study: () => ({ rates: { block: 0 } }), rand: () => .5 };
  const t = hero({ z: 1.5 }), a = { x: 0, z: 0, yaw: 0, T: { radius: .5 }, vxMoveHistory: ['Pendulo_Sangrento'] };
  const pool = VX_MOVES.filter(m => ['Pendulo_Sangrento', 'Mandibula_em_Cruz', 'Rosa_de_Espinhos'].includes(m.id));
  for (let i = 0; i < 20; i++) {
    const chosen = vxPickMove(sq, a, t, pool);
    assert.notEqual(chosen.id, a.vxMoveHistory.at(-1), 'combo repetido sem necessidade');
    a.vxMoveHistory.push(chosen.id);
    if (a.vxMoveHistory.length > 4) a.vxMoveHistory.shift();
  }
});

test('regressão: três contatos distintos de um combo causam três solicitações de dano; esquiva devolve evaded', () => {
  for (const dodge of [false, true]) {
    const hits = [], sq = new Enemy1Squad({
      seed: 7, meleeTrace: () => true,
      damageTarget: (id, dmg, info) => { hits.push({ id, dmg, info }); return dodge ? 'evaded' : 'hit'; }
    });
    const a = boss(sq, 0), h = hero({ z: 1.6 });
    a.T = { ...a.T, brain: () => {} }; // não iniciar outro combo durante a regressão isolada
    a.yaw = 0; sq.setTargets([h]);
    const combo = VX_MOVES.find(m => m.id === 'Rosa_de_Espinhos');
    sq.startMelee(a, h, combo.id);
    for (let i = 0; i < 60 * 4 && a.act; i++) sq.update(1 / 60);
    assert.equal(hits.length, 3, 'cada contato físico distinto deve solicitar dano sem perder os golpes 2 e 3');
    assert.deepEqual(hits.map(h => h.info.combo), [1, 2, 3], 'identificação individual dos contatos');
  }
});

test('painel ADM disponibiliza Arremesso Voraz, Florescer Abissal e Fera sem duplicar botões', () => {
  const html = fs.readFileSync(new URL('../mundo-3d-prototype.html', import.meta.url), 'utf8');
  assert.match(html, /adm-vx-['"]\s*\+\s*type/);
  assert.match(html, /api\.vxTech\(type\)/);
  assert.match(html, /\['throw','ADM · Arremesso Voraz'\]/);
  assert.match(html, /\['up','ADM · Florescer Abissal'\]/);
  assert.match(html, /\['beast','ADM · Fera \(Bispo 3\)'\]/);
  assert.match(html, /if\(\!panel\.querySelector\('#adm-vx-'\+type\)\)/);
});


test('janela anti-graça: golpe 2 e 3 do MESMO combo têm dano; dash, esquiva e ataques diferentes continuam protegidos', async () => {
  const { vxComboFollowupAllowed: accept } = await import('../veraxion-combo-damage3d.js');
  const token = {}, other = {}, first = { attackToken: token, actor: 'boss4', combo: 1, at: 1000, until: 1850 };
  const ctx = { now: 1330, until: 1850, dash: false, perfectDodge: false };
  const second = { kind: 'melee', attackToken: token, actor: 'boss4', combo: 2 };
  assert.ok(accept(first, second, ctx), '2º corte é outro contato legítimo do mesmo combo');
  assert.equal(accept(first, second, { ...ctx, dash: true }), false, 'dash protegido');
  assert.equal(accept(first, second, { ...ctx, perfectDodge: true }), false, 'janela de esquiva perfeita protegida');
  assert.equal(accept(first, second, { ...ctx, until: 2010 }), false, 'outra fonte estendeu a invulnerabilidade');
  assert.equal(accept(first, { ...second, attackToken: other }, ctx), false, 'outro ataque não pode contornar graça');
  assert.equal(accept(first, { ...second, combo: 1 }, ctx), false, 'primeiro hit não ignora proteção');
  assert.equal(accept(first, { ...second, combo: 3 }, ctx), false, 'golpe não pode pular índice');
  assert.equal(accept(first, second, { ...ctx, now: 3401, until: 1850 }), false, 'combate antigo não contorna proteção');
  const next = { attackToken: token, actor: 'boss4', combo: 2, at: 1330, until: 2180 };
  assert.ok(accept(next, { ...second, combo: 3 }, { ...ctx, now: 1660, until: 2180 }), '3º corte também causa dano');
  const main = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.match(main, /vxComboFollowupAllowed\(vxLastDamagingContact,info/);
  assert.match(main, /info\?\.vxComboFollowup/);
  assert.match(main, /if\(res===true&&(?:\()?info\.kind==='melee'&&info\.attackToken(?:\|\|info\.gkSrc\))?\)/); // MOD 342: Ganância registra também fontes independentes (gkSrc)
});
