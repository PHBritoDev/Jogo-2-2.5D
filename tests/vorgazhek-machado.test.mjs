// Missão 20/11 — VORGAZHEK: arma visível (attachKatana), Machado do Abismo, mira por corte, sequências de dash e a
// Ascensão da Maré Abissal. Lógica pura + three.js real (CI: COMBAT_THREE_DIR, como tests/combat315.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Enemy1Squad, KINDS } from '../enemy1-squad3d.js';
import { VORG, VG_MOVES, VG_RISE, VG_AIM, VG_DASH, vgAim, vgAnchorRoot, vgStartRise } from '../vorgazhek3d.js';
import { BOSS_MOVES } from '../boss-choreography3d.js';
import '../vhazrael3d.js';

let THREE = null;
for (const dir of [process.env.COMBAT_THREE_DIR, process.env.AERIAL_THREE_DIR, new URL('../node_modules/three', import.meta.url).pathname]) {
  if (!dir) continue; try { THREE = await import(dir.replace(/\/$/, '') + '/build/three.module.js'); break; } catch { /* tenta o próximo */ }
}
const hero = (o = {}) => ({ id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, ...o });
function world(seed = 3, dmg = () => 'hit') { const ev = []; const sq = new Enemy1Squad({ seed, damageTarget: dmg, event: (type, d) => ev.push({ type, ...d }) }); return { sq, ev }; }
const boss = (sq, z = 6, x = 0) => { const a = sq.spawn([{ x, z, yaw: Math.PI, kind: 'vorgazhek' }])[0]; a.alert = 0; return a; };
const wrap = x => Math.atan2(Math.sin(x), Math.cos(x));

test('P0: attachKatana põe a arma NA CENA para os 4 chefes com katana (uma por corpo) e libera tudo no dispose', { skip: !THREE && 'three.js indisponível' }, async () => {
  const { attachKatana } = await import('../enemy3-runtime3d.js');
  for (const kind of ['e3boss', 'e4boss', 'vhazrael', 'vorgazhek']) {
    const scene = new THREE.Scene(), hand = new THREE.Object3D(), b = { hand };
    attachKatana(THREE, scene, b, kind);
    assert.ok(b.weapon && b.weaponRoot, kind + ': arma criada');
    assert.equal(b.weaponRoot.parent, scene, kind + ': raiz da arma está na cena (bug do comentário 19/11)');
    if (b.weapon.userData.fx) assert.equal(b.weapon.userData.fx.parent, scene, kind + ': fx na cena');
    assert.equal(scene.children.filter(o => o === b.weaponRoot).length, 1, kind + ': uma só arma');
    if (b.weapon.userData.dispose) b.weapon.userData.dispose();
  }
  const src = fs.readFileSync(new URL('../enemy3-runtime3d.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /\/\/[^\n]*scene\.add\(root\)/, 'nenhum scene.add(root) preso dentro de comentário');
});

test('Machado do Abismo: geometria original volumétrica, ≤ 8 chamadas de desenho, duas lâminas assimétricas, gumes e núcleo', { skip: !THREE && 'three.js indisponível' }, async () => {
  const { buildAbyssAxe, ABYSS_AXE } = await import('../vorgazhek-axe3d.js');
  const w = buildAbyssAxe(THREE); let meshes = 0, tris = 0; const names = [];
  w.traverse(o => { if (o.isMesh) { meshes++; names.push(o.name); tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
  assert.ok(meshes <= 8, 'malhas ' + meshes); assert.ok(tris > 800 && tris < 4000, 'triângulos ' + tris);
  assert.ok(names.includes('Nucleo') && names.includes('LaminaEnergia'));
  const box = new THREE.Box3(); w.children.filter(c => c.name !== 'LaminaEnergia').forEach(c => box.expandByObject(c));
  assert.ok(box.max.x > .5 && box.min.x < -.35 && box.max.x + box.min.x > .08, 'lâmina frontal maior que a traseira (assimetria)');
  assert.ok(box.max.y - box.min.y > 1.9, 'haste longa'); assert.ok(box.max.z - box.min.z > .1, 'volume (não é plano)');
  const U = w.userData; assert.equal(U.edges.length, 4); assert.ok(U.edges.every(e => e.length === 2 && e.every(p => p.length === 3)));
  assert.ok(U.edges.some(e => e[0][0] > .3) && U.edges.some(e => e[0][0] < -.25), 'traço cobre as DUAS lâminas');
  U.charge(1); U.updateFx(1, 0, false, true); assert.ok(w.getObjectByName('LaminaEnergia').visible, 'lâmina de energia aparece carregada');
  U.charge(0); U.updateFx(1, 0, false, true); assert.ok(!w.getObjectByName('LaminaEnergia').visible);
  assert.equal(ABYSS_AXE.scale, 1.12); U.dispose();
});

test('Machado segue o osso: empunhadura constante (haste = −Z da mão) e cabeça nunca abaixo do piso', { skip: !THREE && 'three.js indisponível' }, async () => {
  const { attachKatana, poseKatana } = await import('../enemy3-runtime3d.js'); const { vgGrip } = await import('../vorgazhek3d.js');
  const scene = new THREE.Scene(), holder = new THREE.Group(), hand = new THREE.Object3D(); holder.add(hand); scene.add(holder);
  const b = { hand, holder, grip: vgGrip(THREE) }; attachKatana(THREE, scene, b, 'vorgazhek');
  const a = { alive: true, kind: 'vorgazhek', yaw: 0, y: 0, vx: 0, vz: 0, act: { type: 'melee', move: VG_MOVES[0], t: .3 } };
  hand.position.set(.3, 1.5, .2); hand.quaternion.setFromEuler(new THREE.Euler(.4, 1.1, -.3)); scene.updateMatrixWorld(true);
  poseKatana(THREE, b, a, 1 / 30, 0, false);
  const want = hand.getWorldQuaternion(new THREE.Quaternion()).multiply(b.grip); assert.ok(b.weaponRoot.quaternion.angleTo(want) < 1e-4, 'arma = mão × empunhadura');
  assert.ok(b.weaponRoot.position.distanceTo(hand.getWorldPosition(new THREE.Vector3())) < 1e-6, 'presa à mão');
  const haft = new THREE.Vector3(0, 1, 0).applyQuaternion(b.weaponRoot.quaternion), minusZ = new THREE.Vector3(0, 0, -1).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(haft.angleTo(minusZ) < 1e-4, 'haste fecha no punho ao longo de −Z da mão');
  hand.position.set(0, .7, 0); hand.quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); scene.updateMatrixWorld(true); // −Z da mão aponta para baixo: a cabeça afundaria
  poseKatana(THREE, b, a, 1 / 30, 0, false); const head = new THREE.Vector3(0, .78, 0).applyQuaternion(b.weaponRoot.quaternion).add(b.weaponRoot.position);
  assert.ok(head.y >= .1, 'cabeça acima do piso: ' + head.y.toFixed(3));
  a.act = null; a.vx = 4; for (let i = 0; i < 20; i++) poseKatana(THREE, b, a, 1 / 30, 0, false); // marcha: machado arrastado, cabeça baixa atrás
  const d = new THREE.Vector3(0, 1, 0).applyQuaternion(b.weaponRoot.quaternion); assert.ok(d.y < -.6 && d.z < 0, 'carregado baixo atrás na marcha');
  b.weapon.userData.dispose();
});

test('raiz ancorada: clipe com quadril deslocado (Double_Combo começa 1,2 m atrás) volta ao ponto neutro, e só uma vez', () => {
  const mk = (name, z0) => ({ name, tracks: [{ name: 'Hips.position', values: new Float32Array([-2, 80, z0, -2, 80, z0 + 50, -2, 80, z0 + 130]) }] });
  const atk = mk('Attack', 9), dc = mk('Double_Combo_Attack', -120), clips = [atk, dc];
  assert.equal(vgAnchorRoot(clips), 1); assert.equal(dc.tracks[0].values[2], 9); assert.equal(dc.tracks[0].values[8], 139, 'deslocamento relativo preservado (vira avanço do golpe)');
  assert.equal(vgAnchorRoot(clips), 0, 'idempotente');
});

test('janelas de dano: cada golpe tem janela dentro do clipe e a Investida não usa mais o salto (lâmina às costas)', () => {
  for (const m of VG_MOVES) { assert.ok(m.hits.every((h, i) => h > 0 && h < m.duration && (!i || h > m.hits[i - 1])), m.id); }
  assert.equal(VG_MOVES.find(m => m.id === 'Investida_Corrompida').clip, 'vg_double');
  assert.ok(BOSS_MOVES.vorgazhek.every(m => m.kind === 'vorgazhek'));
});

test('mira por corte: gira até a cabeça do machado (azimute do clipe) cruzar o herói e TRAVA antes do contato', () => {
  const { sq } = world(4); const a = boss(sq, 2.2); const h = hero({ x: 1.5, z: 0 }); sq.setTargets([h]);
  const m = { ...BOSS_MOVES.vorgazhek[0], aimAz: [.7, -.4] }; a.vgStats = {};
  const act = { type: 'melee', move: m, t: 0, contacts: new Set() }; a.act = act;
  for (let i = 0; i < 40; i++) { act.t = i / 60; vgAim(sq, a, act, h, 1 / 60); }
  const err = wrap(Math.atan2(h.x - a.x, h.z - a.z) - a.yaw - .7); assert.ok(Math.abs(err) < .05, 'erro no 1º corte ' + err.toFixed(3));
  act.t = m.hits[0] - VG_AIM.lock + .01; const y0 = a.yaw; h.x = -3; vgAim(sq, a, act, h, 1 / 60); assert.equal(a.yaw, y0, 'travado: não persegue o herói dentro da janela');
  act.t = m.hits[0] + .2; vgAim(sq, a, act, h, 1 / 60); assert.equal(act.vgShut.has(0), true); assert.ok(a.vgStats.miss >= 1, 'janela sem contato vira meleeMiss com motivo');
  assert.equal(KINDS.vorgazhek.moveAim, vgAim);
  for (const k of ['vhazrael', 'e3boss', 'e4boss', 'common']) if (KINDS[k]) assert.ok(!KINDS[k].moveAim && !KINDS[k].stepRise, k + ': ganchos novos não vazam para outras espécies');
});

function organic(seed, secs = 30, fps = 60) {
  const { sq, ev } = world(seed), a = boss(sq, 7), h = hero(); sq.setTargets([h]);
  for (let i = 0; i < fps * secs; i++) { const t = i / fps; h.attacking = (t % 3) < 1 && Math.hypot(a.x - h.x, a.z - h.z) < 3; h.dashing = (t % 5) < .15; if ((t % 9) > 6) h.z -= 4.2 / fps; sq.update(1 / fps); }
  return { a, ev };
}
test('dashes em SEQUÊNCIA: 2–3 passos são a regra (não dashes isolados), orçamento respeitado', () => {
  const g = { 1: 0, 2: 0, 3: 0, 4: 0 }; let ends = 0, cut = 0;
  let minGap = 9;
  for (let seed = 1; seed <= 8; seed++) { const { a, ev } = organic(seed); minGap = Math.min(minGap, a.vgStats.minDashGap ?? 9); for (const k in g) g[k] += a.vgStats.groups?.[k] || 0; for (const e of ev) if (e.type === 'vgChainEnd') { ends++; if (e.cut) cut++; } }
  assert.ok(g[2] + g[3] > g[1], 'sequências ' + JSON.stringify(g)); assert.ok(g[3] > 0, 'triplas ocorrem'); assert.ok(minGap >= .5 - 1e-6, 'menor intervalo entre inícios ' + minGap); assert.ok(ends > 10 && cut <= ends);
  assert.ok(VG_DASH.cd === .5 && VG_DASH.minStart === .5, 'regra do criador (20/11): início a início de dash ≥ 0,5 s');
});

test('Ascensão da Maré Abissal: preparo no chão → salto alto → trava do pouso → corte ANTES do pouso → impacto → recuperação; dano único', () => {
  let calls = 0; const { sq, ev } = world(7, () => { calls++; return 'hit'; }); const a = boss(sq, 6); const h = hero(); sq.setTargets([h]);
  vgStartRise(sq, a, h); let apex = 0, cutY = null, phases = [], tCut = null, tLand = null;
  for (let i = 0; i < 60 * 4 && a.act && a.act.rise; i++) { sq.update(1 / 60); apex = Math.max(apex, a.airY); const p = a.act?.phase; if (p && phases.at(-1) !== p) phases.push(p); if (typeof a.act?.cut === 'number' && cutY === null) { cutY = a.airY; tCut = sq.time; } if (p === 'land' && tLand === null) tLand = sq.time; }
  const rise = ev.filter(e => e.type === 'vgRise').map(e => e.phase); assert.deepEqual(rise, ['prep', 'rise', 'lock', 'cut', 'land']);
  assert.deepEqual(phases.slice(0, 3), ['prep', 'rise', 'land']); assert.ok(apex > 2.4, 'salto bem acima do herói: ' + apex.toFixed(2));
  assert.ok(cutY > .5 && tLand > tCut, 'corta no ar, antes do pouso'); assert.equal(calls, 1, 'um único teste/aplicação de dano');
  const land = ev.find(e => e.type === 'vgRise' && e.phase === 'land'); assert.ok(land.landed, 'acerta o herói parado'); assert.ok(land.drift < .3, 'pousa no ponto travado');
  assert.ok(a.cds.vgRise > VG_RISE.cd - 4, 'recarga tática');
});

test('Maré Abissal: fugir em dash DEPOIS da trava escapa; perto demais ela não é escolhida; 30/45/60 FPS iguais', () => {
  const run = (fps, flee) => { const { sq, ev } = world(11); const a = boss(sq, 6); const h = hero(); sq.setTargets([h]); vgStartRise(sq, a, h);
    for (let i = 0; i < fps * 4 && a.act && a.act.rise; i++) { if (flee && a.act.locked) { h.z -= 14 / fps; h.vz = -14; h.iframes = false; } sq.update(1 / fps); }
    return { miss: ev.find(e => e.type === 'meleeMiss' && e.move === 'mare'), hit: ev.find(e => e.type === 'meleeHit' && e.move === 'mare'), land: ev.find(e => e.type === 'vgRise' && e.phase === 'land') }; };
  const esc = run(60, true); assert.ok(esc.miss && !esc.hit, 'dash depois da trava escapa'); assert.equal(esc.miss.why, 'longe');
  const t = [30, 45, 60].map(f => run(f, false)); assert.ok(t.every(r => r.hit), 'acerta parado nos 3 FPS'); assert.ok(Math.max(...t.map(r => r.land.drift)) < .35);
  const { sq, ev } = world(5); const a = boss(sq, 2); sq.setTargets([hero({ attacking: false })]); for (let i = 0; i < 60 * 12; i++) { sq.update(1 / 60); if (Math.hypot(a.x, a.z) > 3) { a.x = 0; a.z = 2; } }
  assert.equal(ev.filter(e => e.type === 'vgRise' && e.phase === 'prep').length, 0, 'nunca à queima-roupa');
});

test('morte no meio do salto e reinício: sem exceção, sem ficar no ar', () => {
  const { sq } = world(13); const a = boss(sq, 6); const h = hero(); sq.setTargets([h]); vgStartRise(sq, a, h);
  for (let i = 0; i < 50; i++) sq.update(1 / 60); assert.ok(a.airY > 0);
  a.act = null; for (let i = 0; i < 120; i++) sq.update(1 / 60); assert.equal(a.airY, 0, 'cai pela gravidade comum se o ato for cortado');
  a.hp = 0; a.alive = false; for (let i = 0; i < 30; i++) sq.update(1 / 60);
  assert.ok(Number.isFinite(a.x) && Number.isFinite(a.z));
});

test('integração: runtime usa a empunhadura/traço do machado, mesma URL do módulo, VFX da Maré e nada do Bispo 1 mudou', () => {
  const r = fs.readFileSync(new URL('../enemy1-squad-runtime3d.js', import.meta.url), 'utf8');
  assert.ok(/vgMoveClips\(T,model,ctx\.clone/.test(r) && /vgGrip\(T\)/.test(r) && /import \{ vgGrip, vgMoveClips \} from '\.\/vorgazhek3d\.js';/.test(r));
  assert.ok(/type === 'vgRise'/.test(r) && /vgfx\.impact\(/.test(r) && /vgfx\.charge\(/.test(r));
  const e = fs.readFileSync(new URL('../enemy1-squad3d.js', import.meta.url), 'utf8');
  assert.ok(/if \(act\.move && a\.T\.moveAim\) a\.T\.moveAim/.test(e) && /if \(act\.rise && a\.T\.stepRise\) return a\.T\.stepRise/.test(e));
  assert.ok(/BISHOP_DUEL_ONLY/.test(fs.readFileSync(new URL('../combat-melee-test-mode.js', import.meta.url), 'utf8')));
  assert.deepEqual(VORG.boss.kit, [], 'sem magia no treino dos Bispos');
});

test('alinhamento REAL: traço do machado no clipe do GLB + motor + mira acertam o herói parado em 1,5/2,5/3,5 m, de frente, de lado e de costas, a 30 e 60 FPS', { skip: !THREE && 'three.js indisponível' }, async () => {
  const dir = (process.env.COMBAT_THREE_DIR || process.env.AERIAL_THREE_DIR || new URL('../node_modules/three', import.meta.url).pathname).replace(/\/$/, '');
  const { GLTFLoader } = await import(dir + '/examples/jsm/loaders/GLTFLoader.js'), SK = await import(dir + '/examples/jsm/utils/SkeletonUtils.js');
  const { vgSynthClips, vgMoveClips, vgGrip, VG_ROLES } = await import('../vorgazhek3d.js'), { bossTraceContact } = await import('../boss-choreography3d.js');
  const { inPlaceClip } = await import('../vhazrael-rig3d.js'), { buildAbyssAxe } = await import('../vorgazhek-axe3d.js');
  // GLB real sem as texturas JPEG (Node não decodifica imagem; geometria, skin e clipes ficam intactos)
  const b = fs.readFileSync(new URL('../NewBispo2_Otimizado.glb', import.meta.url)), len = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + len).toString());
  delete j.images; delete j.textures; delete j.samplers; for (const m of j.materials || []) { if (m.pbrMetallicRoughness) { delete m.pbrMetallicRoughness.baseColorTexture; delete m.pbrMetallicRoughness.metallicRoughnessTexture; } delete m.normalTexture; delete m.emissiveTexture; delete m.occlusionTexture; }
  let js = Buffer.from(JSON.stringify(j)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]); const bin = b.slice(20 + len), out = Buffer.alloc(20 + js.length + bin.length);
  out.writeUInt32LE(0x46546C67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8); out.writeUInt32LE(js.length, 12); out.writeUInt32LE(0x4E4F534A, 16); js.copy(out, 20); bin.copy(out, 20 + js.length);
  const g = await new Promise((res, rej) => new GLTFLoader().parse(out.buffer.slice(out.byteOffset, out.byteOffset + out.length), '', res, rej));
  const clips = g.animations.concat(vgSynthClips(THREE, g.animations)), model = g.scene;
  { const m0 = new THREE.AnimationMixer(model); m0.clipAction(clips.find(c => c.name === 'VG_idle')).play(); m0.setTime(0); model.updateMatrixWorld(true); let hy, fy; model.traverse(o => { if (o.name === 'head_end') hy = o.getWorldPosition(new THREE.Vector3()).y; if (o.name === 'LeftToes') fy = o.getWorldPosition(new THREE.Vector3()).y; }); const s = 2.1 / (hy - fy); model.scale.setScalar(s); model.position.y = -fy * s; m0.stopAllAction(); }
  const role = r => { const c = clips.find(x => x.name === VG_ROLES[r]); return c ? inPlaceClip(c, { vertical: r === 'dash' }) : null; };
  const cc = vgMoveClips(THREE, model, m => SK.clone(m), role, BOSS_MOVES.vorgazhek, vgGrip(THREE), buildAbyssAxe(THREE).userData.edges);
  assert.ok(BOSS_MOVES.vorgazhek.every(m => m.aimAz && m.aimAz.length === m.hits.length), 'azimute medido por janela');
  let hit = 0, n = 0; const miss = [];
  for (const fps of [30, 60]) for (const dist of [1.5, 2.5, 3.5]) for (const ang of [0, 90, 180]) for (const m of BOSS_MOVES.vorgazhek) { if (m.range || m.retreatCut) continue;
    const ev = [], sq = new Enemy1Squad({ seed: 5, damageTarget: () => 'hit', event: (t, d) => ev.push({ t, ...d }), meleeTrace: (a, act, t, lo, hi) => bossTraceContact(cc[act.move.id]?.combatTrace, lo, hi, a, t) });
    const a = sq.spawn([{ x: 0, z: 0, yaw: 0, kind: 'vorgazhek' }])[0]; a.alert = 0; a.vzPhase = 3; a.T = { ...a.T, brain: () => {} }; const r = ang * Math.PI / 180, h = hero({ x: Math.sin(r) * dist, z: Math.cos(r) * dist }); sq.setTargets([h]);
    sq.startMelee(a, h, m.id); for (let i = 0; a.act && a.act.move && i < fps * 5; i++) { sq.update(1 / fps); h.x = Math.sin(r) * dist; h.z = Math.cos(r) * dist; }
    const k = ev.filter(e => e.t === 'meleeHit').length; hit += k; n += m.hits.length; if (k < m.hits.length) miss.push(`${m.id}@${dist}m/${ang}°/${fps}`); }
  assert.ok(hit / n >= .85, `acertos ${hit}/${n}: ${miss.slice(0, 8).join(' ')}`);
});
