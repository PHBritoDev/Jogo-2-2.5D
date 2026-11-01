import { buildCrimsonKatana } from './crimson-katana3d.js';
import { buildJawSword } from './jaw-sword3d.js';
import { buildThroneBlade } from './vhazrael-vfx3d.js';
import { combatPose, combatMove } from './combat-choreography3d.js';
import { bossLift } from './boss-choreography3d.js';
import { thronePose } from './vhazrael-choreo3d.js';
/**
 * MOD 245 — corpo do Enemy3 / mini-chefe do Ato III dentro do runtime da esquadra (enemy1-squad-runtime3d.js).
 *
 * Os GLBs não ganham clipes novos: Enemy3.glb e Enemy4.glb têm Idle, Walking, Running, Attack, Triple_Combo_Attack,
 * Skill_03, Dead e um dash. Por cima deles há CAMADAS PROCEDURAIS (ossos apontados em espaço de mundo depois do mixer):
 * braço que acompanha a singularidade e a ergue acima da cabeça, arremesso com follow-through, braços abertos que
 * ordenam a barragem, mãos ao céu na tempestade e gesto de comando, transição de fúria, recuo leve/pesado e inclinação
 * no strafe. Os três combos da katana são AnimationClips nativos gerados no carregamento pelo mesmo assador de IK da
 * Mod 244 (combat-rig3d.js), com uma pose de katana própria — não são animações GLB novas.
 */
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
/** Pose de mão/lâmina da katana para o assador nativo (guarda própria, saque baixo no Iaijutsu, guarda alta na Fúria). */
export function katanaPose(m, t) {
  let i = m.hits.findIndex(h => t < h + .18); if (i < 0) i = m.hits.length - 1;
  const start = i ? m.hits[i - 1] + .12 : 0, end = i === m.hits.length - 1 ? m.duration : m.hits[i] + .18, hit = m.hits[i];
  const guard = m.iai ? [-.36, .96, .14] : m.heavy ? [-.1, 1.66, .02] : [-.26, 1.3, .36];
  const def = { ...combatMove('celeste'), pattern: m.patterns[i], duration: end - start, open: hit - start - .07, close: hit - start + .1, guard, spread: m.iai ? 1.28 : 1.12, lean: m.heavy ? .18 : .1 };
  const a = combatPose(def, Math.max(0, t - start));
  if (m.iai && t < m.open) { const k = smooth(t / (m.open * .55)) * (1 - smooth((t - m.open * .78) / (m.open * .22))); a.blade = a.blade.map((v, j) => v + ([-.45, -.4, -.8][j] - v) * k); } // lâmina para trás, junto ao quadril
  const len = Math.hypot(...a.blade) || 1; a.off = a.hand.map((v, j) => v - a.blade[j] / len * .36); a.offBlade = a.blade;
  if (m.iai && t < m.open * .92) { a.off = [.24, .98, .16]; a.offBlade = [.1, -.9, .3]; } // mão esquerda segura a "bainha" no quadril durante a carga
  a.air = bossLift(m, t) > .02; return a;
}
export const KATANA_SCALE = 1.05, JAW_SCALE = 1.08;
/** Arma do mini-chefe presa à mão: Katana Dragão Carmim (e3boss) ou Espada-Mandíbula (e4boss, Mod 246). */
export function attachKatana(T, scene, b, kind = 'e3boss') {
  if (!b.hand) return;
  const jaw = kind === 'e4boss', vz = kind === 'vhazrael', w = vz ? buildThroneBlade(T) : jaw ? buildJawSword(T) : buildCrimsonKatana(T), root = new T.Group(); root.add(w); w.scale.setScalar(vz ? 1 : jaw ? JAW_SCALE : KATANA_SCALE); scene.add(root); scene.add(w.userData.fx);
  b.weapon = w; b.weaponRoot = root; b.katana = true; b.wW = 0; b.kCast = 0; b.wDrop = 0;
}
/** Katana na mão: nos golpes nativos segue o osso (o assador alinhou +Y da mão com a lâmina); fora deles, guarda
    média apontando à frente/baixo e, ao conjurar, abaixada ao lado do corpo (troca espada ↔ magia). */
export function poseKatana(T, b, a, dt, time, low) {
  const root = b.weaponRoot, h = b.hand, w = b.weapon; if (!root || !h) return;
  const V = b._kv || (b._kv = { p: new T.Vector3(), d: new T.Vector3(), f: new T.Vector3(), x: new T.Vector3(), m: new T.Matrix4() });
  h.updateWorldMatrix(true, false); h.getWorldPosition(root.position);
  const thr = a.alive && a.kind === 'vhazrael' && a.act && a.act.skill === 'throne' && a.act.type === 'cast' ? a.act : null;
  if (thr) { // Ruptura: lâmina orientada pela coreografia (gume no plano do golpe), presa à mão; cruza com a guarda ao terminar
    const P = thronePose(thr.t), fy = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fy, e = smooth((thr.dur - thr.t) / .35);
    V.d.set(fy * P.blade[0] + rx * P.blade[2], P.blade[1], fz * P.blade[0] + rz * P.blade[2]).normalize(); V.f.set(fy * .3 + rx * .12, -1, fz * .3 + rz * .12).normalize(); V.d.lerp(V.f, 1 - e).normalize();
    V.p.set(rx, 0, rz); V.x.crossVectors(V.p, V.d).normalize(); V.f.crossVectors(V.x, V.d).normalize(); V.m.makeBasis(V.x, V.d, V.f); root.quaternion.setFromRotationMatrix(V.m);
  } else if (a.alive && a.act && (a.act.move || (a.kind === 'vhazrael' && a.act.skill === 'orbital'))) h.getWorldQuaternion(root.quaternion); // a lâmina segue o osso nos golpes
  else {
    const cast = a.alive && a.act && (a.act.type === 'cast' || a.act.type === 'phase2'); b.kCast += ((cast ? 1 : 0) - b.kCast) * Math.min(1, dt * 6);
    const fy = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fy, k = b.kCast;
    if (a.kind === 'vhazrael') V.d.set(fy * .3 + rx * .12, -1, fz * .3 + rz * .12); else V.d.set(fy * .82 + rx * .18, -.32, fz * .82 + rz * .18); V.d.lerp(V.p.set(-fy * .2 + rx * .3, -1, -fz * .2 + rz * .3), k).normalize();
    if (!a.alive) { b.wDrop = Math.min(1, b.wDrop + dt * 1.6); V.d.lerp(V.p.set(rx, -.05, rz), b.wDrop).normalize(); }
    V.f.set(fy, 0, fz); V.f.addScaledVector(V.d, -V.f.dot(V.d)).normalize(); V.x.crossVectors(V.d, V.f).normalize(); V.m.makeBasis(V.x, V.d, V.f); root.quaternion.setFromRotationMatrix(V.m);
    if (!a.alive) root.position.y = Math.max(a.y + .12, root.position.y - b.wDrop * 1.2);
  }
  root.visible = b.holder.visible; w.userData.updateFx(time, a.phase2 ? 1 : 0, low, root.visible);
}
/** Camada procedural de conjuração por cima do clipe Skill_03 (ou do Idle), em espaço de mundo. */
export function poseCaster(T, b, a, squad, dt) {
  const R = b.arms || (b.arms = findArms(b.model)); if (!R) return;
  const act = a.act; let want = null;
  if (a.alive && act && act.type === 'cast' && /^(singularity|barrage|nadir|sanctum|constellation|drill|cage|throne|thorns|bombard|orbital)$/.test(act.skill)) want = act;
  else if (a.alive && act && act.type === 'phase2') want = act;
  b.castW = (b.castW || 0) + ((want ? 1 : 0) - (b.castW || 0)) * Math.min(1, dt * (want ? 9 : 5)); const w = b.castW; if (w < .01) { b.lastCastSkill = null; return; }
  if (want) { b.lastCastSkill = want.type === 'phase2' ? 'phase2' : want.skill; b.lastSpell = want.spellId; b.lastT = want.t; }
  const fy = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fy, V = b._av || (b._av = { d: new T.Vector3(), s: new T.Vector3(), q: new T.Quaternion(), q2: new T.Quaternion(), q3: new T.Quaternion(), c: new T.Vector3(), p: new T.Vector3() });
  const D = (f, u, r) => V.d.set(fy * f + rx * r, u, fz * f + rz * r).normalize();
  const s = squad && b.lastSpell ? squad.spells.find(x => x.id === b.lastSpell) : null, sk = b.lastCastSkill;
  if (sk === 'throne') { // MOD 249: as duas mãos no cabo — erguer, sustentar o pilar, preparo, corte e follow-through
    const P = thronePose(b.lastT), tr = Math.min(1, Math.max(0, (b.lastT - 1) / 1.3)), sh = tr * (1 - Math.min(1, Math.max(0, (b.lastT - 2.3) / .1))) * .035 * Math.sin(b.lastT * 47); // tremor da carga
    turn(R.chest, V.p.set(rx, 0, rz), P.lean * w, V);
    aim(R.rua, R.rla, D(P.rua[0], P.rua[1], P.rua[2]), w, V); aim(R.rla, R.rh, D(P.rla[0] + sh, P.rla[1], P.rla[2]), w, V);
    aim(R.lua, R.lla, D(P.lua[0], P.lua[1], P.lua[2]), w, V); aim(R.lla, R.lh, D(P.lla[0] - sh, P.lla[1], P.lla[2]), w, V); }
  else if (sk === 'thorns') { for (const [ua, la, sd] of [[R.rua, R.rla, 1], [R.lua, R.lla, -1]]) aim(ua, la, D(.75, -.6, .35 * sd), w, V); turn(R.chest, V.p.set(rx, 0, rz), .35 * w, V); }
  else if (sk === 'bombard') { aim(R.rua, R.rla, D(.35, .9, .25), w, V); aim(R.rla, R.rh, D(.3, .95, .1), w, V); aim(R.lua, R.lla, D(.7, .2, -.6), w * .8, V); turn(R.chest, V.p.set(rx, 0, rz), -.15 * w, V); } // MOD 254: comanda o emissor no alto
  else if (sk === 'orbital') { aim(R.rua, R.rla, D(.05, 1, .1), w, V); aim(R.rla, R.rh, D(0, 1, 0), w, V); aim(R.lua, R.lla, D(.3, .3, -1), w * .8, V); turn(R.chest, V.p.set(rx, 0, rz), -.25 * w, V); }
  else if (sk === 'sanctum' || sk === 'cage') { // Enemy4: mãos ao alto e golpe para o chão (marca/corrente cravando)
    const k = smooth(b.lastT / .5), down = b.lastT > .5; for (const [ua, la, sd] of [[R.rua, R.rla, 1], [R.lua, R.lla, -1]]) { aim(ua, la, down ? D(.7, -.7, .3 * sd) : D(.15, 1, .3 * sd), w * (down ? 1 : k), V); }
    turn(R.chest, V.p.set(rx, 0, rz), (down ? .3 : -.2) * w, V);
  } else if (sk === 'constellation') { for (const [ua, la, hd, sd] of [[R.rua, R.rla, R.rh, 1], [R.lua, R.lla, R.lh, -1]]) { aim(ua, la, D(.12, .45, 1 * sd), w, V); aim(la, hd, D(.1, .7, .7 * sd), w, V); } turn(R.chest, V.p.set(rx, 0, rz), -.22 * w, V); turn(R.head, V.p.set(rx, 0, rz), -.25 * w, V); } // braços abertos (referência)
  else if (sk === 'drill') { const kick = Math.sin(b.lastT * 25) * .06; aim(R.rua, R.rla, D(1, .08 + kick, .12), w, V); aim(R.rla, R.rh, D(1, .05, 0), w, V); aim(R.lua, R.lla, D(-.4, -.4, -.7), w * .8, V); turn(R.chest, V.p.set(rx, 0, rz), .12 * w, V); }
  else if (sk === 'singularity') {
    const ph = s ? s.phase : 'fly', k = s ? s.t : 0;
    if (ph === 'form') { aim(R.rua, R.rla, D(.8, .3, .25), w, V); aim(R.rla, R.rh, D(.9, .35, .05), w, V); aim(R.lua, R.lla, D(.5, .05, -.5), w * .7, V); }
    else if (ph === 'raise' || ph === 'throw') { // o braço acompanha a singularidade e a sustenta acima da cabeça
      R.rua.updateWorldMatrix(true, false); V.s.setFromMatrixPosition(R.rua.matrixWorld); V.c.set(s.x, s.y, s.z).sub(V.s).normalize();
      if (ph === 'throw') V.c.lerp(D(-.35, .85, .15), smooth(k / s.T.throw)).normalize(); aim(R.rua, R.rla, V.c, w, V); aim(R.rla, R.rh, V.c, w, V);
      turn(R.chest, V.p.set(rx, 0, rz), (ph === 'throw' ? -.22 : -.1) * w, V); aim(R.lua, R.lla, D(.6, .1, -.6), w * .7, V);
    } else { const f = smooth((b.lastT - (s ? s.T.form + s.T.raise + s.T.throw : 1.9)) / .25); // arremesso e follow-through
      aim(R.rua, R.rla, D(1, -.35 - .25 * f, .05), w, V); aim(R.rla, R.rh, D(1, -.5 * f, 0), w, V); turn(R.chest, V.p.set(rx, 0, rz), .28 * w, V); aim(R.lua, R.lla, D(-.3, -.6, -.6), w * .7, V); }
  } else if (sk === 'barrage') {
    const ph = s ? s.phase : 'close';
    if (ph === 'open') { for (const [ua, la, sd] of [[R.rua, R.rla, 1], [R.lua, R.lla, -1]]) { aim(ua, la, D(.25, .55, .85 * sd), w, V); } turn(R.chest, V.p.set(rx, 0, rz), -.18 * w, V); }
    else if (ph === 'volley') { const beat = Math.sin(b.lastT * 5) > 0; aim(R.rua, R.rla, beat ? D(1, .2, .12) : D(.3, .6, .8), w, V); aim(R.rla, R.rh, beat ? D(1, .1, 0) : D(.3, .7, .7), w, V); aim(R.lua, R.lla, beat ? D(.3, .6, -.8) : D(1, .2, -.12), w, V); }
    else { aim(R.rua, R.rla, D(.4, -.7, .3), w, V); aim(R.lua, R.lla, D(.4, -.7, -.3), w, V); }
  } else if (sk === 'nadir') {
    const ph = s ? s.phase : 'storm';
    if (ph === 'gather') { const k = 1 + .06 * Math.sin(b.lastT * 18); for (const [ua, la, hd, sd] of [[R.rua, R.rla, R.rh, 1], [R.lua, R.lla, R.lh, -1]]) { aim(ua, la, D(.12, 1, .28 * sd * k), w, V); aim(la, hd, D(.05, 1, .12 * sd), w, V); } turn(R.chest, V.p.set(rx, 0, rz), -.24 * w, V); turn(R.head, V.p.set(rx, 0, rz), -.35 * w, V); }
    else { aim(R.rua, R.rla, D(1, -.1, .12), w, V); aim(R.rla, R.rh, D(1, -.2, 0), w, V); aim(R.lua, R.lla, D(.2, .4, -.8), w * .8, V); turn(R.chest, V.p.set(rx, 0, rz), .15 * w, V); } // gesto de comando
  } else if (sk === 'phase2') { const k = Math.sin(Math.min(1, b.lastT / 1.15) * Math.PI); for (const [ua, la, sd] of [[R.rua, R.rla, 1], [R.lua, R.lla, -1]]) aim(ua, la, D(.2, .25, .95 * sd), w * k, V); turn(R.chest, V.p.set(rx, 0, rz), -.32 * w * k, V); turn(R.head, V.p.set(rx, 0, rz), -.4 * w * k, V); }
}
function findArms(model) {
  const r = {}; const map = { rua: ['RightUpperArm', 'mixamorigRightArm'], rla: ['RightLowerArm', 'mixamorigRightForeArm'], rh: ['RightHand', 'mixamorigRightHand'], lua: ['LeftUpperArm', 'mixamorigLeftArm'], lla: ['LeftLowerArm', 'mixamorigLeftForeArm'], lh: ['LeftHand', 'mixamorigLeftHand'], chest: ['Chest', 'mixamorigSpine2'], head: ['Head', 'mixamorigHead'] };
  model.traverse(o => { if (!o.isBone) return; for (const k in map) if (!r[k] && map[k].includes(o.name)) r[k] = o; }); // rigs humanoides e mixamo (Bispo1)
  return r.rua && r.rla && r.rh && r.lua && r.lla && r.lh && r.chest ? r : null;
}
function aim(b, child, dir, w, V) {
  if (!b || !child || w <= 0) return; b.updateWorldMatrix(true, false); child.updateWorldMatrix(false, false);
  V.p.setFromMatrixPosition(child.matrixWorld); const cur = V.s.setFromMatrixPosition(b.matrixWorld); cur.subVectors(V.p, cur); if (cur.lengthSq() < 1e-10) return; cur.normalize();
  V.q.setFromUnitVectors(cur, dir); V.q2.identity().slerp(V.q, Math.min(1, w)); b.getWorldQuaternion(V.q3); V.q2.multiply(V.q3); b.parent.getWorldQuaternion(V.q3).invert(); b.quaternion.copy(V.q3.multiply(V.q2)); b.updateMatrixWorld(true);
}
function turn(b, axis, ang, V) {
  if (!b || !ang) return; b.updateWorldMatrix(true, false); V.q.setFromAxisAngle(axis.normalize(), ang); b.getWorldQuaternion(V.q3); V.q.multiply(V.q3); b.parent.getWorldQuaternion(V.q3).invert(); b.quaternion.copy(V.q3.multiply(V.q)); b.updateMatrixWorld(true);
}
