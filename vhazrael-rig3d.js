/**
 * Mod 320 — corpo novo do Primeiro Bispo: VHAZRAEL.glb (substitui Bispo1-lod.glb; mesmo personagem, mesmos IDs).
 *
 * Catálogo REAL do GLB (16 clipes, 23 ossos, sem dedos, sem arma na malha; medido em vhazrael-glb-qa.html):
 *  nome                                   dur(s)  uso no combate
 *  _01a1b3e4_6f0c_705b_82f5_e9447d85cbef   4.97   idle (respiração contida)
 *  Axe_Breathe_and_Look_Around           11.27   idle longo / observação (fase de ensino)
 *  Walking                                1.03   andar · Casual_Walk 4.17 → marcha lenta (encara o herói)
 *  Running                                0.63   correr
 *  Jump_Over_Obstacle_2                   0.87   dash (avanço baixo; root motion 3,4 m removido)
 *  Basic_Jump                             5.87   salto (trecho 1,45 s → 2,9 s: impulso, ápice 2,03 s, queda)
 *  Double_Combo_Attack                    2.83   Corte Duplo — picos da mão 0,63 / 1,20 s
 *  Triple_Combo_Attack                    4.33   Sentença Tripla — 0,77 / 1,50 / 2,23 s
 *  Weapon_Combo                           3.67   Dança do Ceifador — 0,53 / 1,27 / 2,23 s
 *  Attack                                 2.80   Queda do Trono (descendente pesado) — 1,07 s
 *  Axe_Spin_Attack                        2.50   Moinho Abissal (giro) — 0,90–1,03 s
 *  Skill_01                               1.07   Riposta (curta) — 0,43 s
 *  _01a1b3e6_e46e_7367_9007_2e104dc2e6b7   2.47   guarda / reação (bloqueio, fúria)
 *  mage_soell_cast_7                      2.67   conjuração
 *  Dead                                   2.97   morte
 * Os picos foram medidos pela velocidade da mão direita (a espada fica presa a ela): o dano do golpe nasce no arco
 * VISÍVEL. O traço da lâmina usado no contato é amostrado deste mesmo clipe com a mesma empunhadura do desenho.
 */
export const VZ_FILE = './VHAZRAEL.glb?v=mod320';
export const VZ_ROLES = Object.freeze({
  idle: '_01a1b3e4_6f0c_705b_82f5_e9447d85cbef', look: 'Axe_Breathe_and_Look_Around', walk: 'Walking', stride: 'Casual_Walk', run: 'Running',
  dash: 'Jump_Over_Obstacle_2', jump: 'Basic_Jump', attack: 'Double_Combo_Attack', attack2: 'Weapon_Combo', cast: 'mage_soell_cast_7',
  block: '_01a1b3e6_e46e_7367_9007_2e104dc2e6b7', hit: 'Skill_01', death: 'Dead',
  vz_double: 'Double_Combo_Attack', vz_triple: 'Triple_Combo_Attack', vz_dance: 'Weapon_Combo', vz_fall: 'Attack', vz_spin: 'Axe_Spin_Attack', vz_riposte: 'Skill_01'
});
/** Clipes com deslocamento do quadril: o corpo anda pela cápsula (lógica), nunca pelo clipe. */
export const VZ_IN_PLACE = Object.freeze(['dash', 'jump', 'attack', 'attack2', 'death', 'hit', 'vz_double', 'vz_triple', 'vz_dance', 'vz_fall', 'vz_spin', 'vz_riposte']);
/** Trechos e velocidades por papel (o salto real é só o miolo do Basic_Jump; o dash é rápido). */
export const VZ_TIME = Object.freeze({ jump: { from: 1.45, speed: 1.25 }, dash: { from: .05, speed: 1.35 }, stride: { speed: 1 }, look: { speed: 1 } });

/** Golpes de espada nativos (boss-choreography: hits em s; advance em m distribuído pelo golpe com glide). */
export const VZ_MOVES = [
  { id: 'Trono_Duplo', clip: 'vz_double', label: 'Corte Duplo', hits: [.63, 1.2], duration: 1.78, advance: 1.1, glide: true, weight: 1.2, opener: true },
  { id: 'Trono_Queda', clip: 'vz_fall', label: 'Queda do Trono', hits: [1.07], duration: 1.72, advance: .55, heavy: true, guardBreak: true, weight: .8 },
  { id: 'Trono_Moinho', clip: 'vz_spin', label: 'Moinho Abissal', hits: [.96] /* CLAUDE (P3): os dois picos (.90/.03) caíam no MESMO arco (janelas sobrepostas = dano dobrado); um contato */, duration: 1.55, advance: .15, spin: true, weight: .7 },
  { id: 'Trono_Riposta', clip: 'vz_riposte', label: 'Riposta do Condenado', hits: [.43], duration: .86, advance: .55, fast: true, weight: .9 },
  { id: 'Trono_Triplo', clip: 'vz_triple', label: 'Sentença Tripla', hits: [.77, 1.5, 2.23], duration: 2.72, advance: 1.45, glide: true, minPhase: 1, weight: 1 },
  { id: 'Trono_Danca', clip: 'vz_dance', label: 'Dança do Ceifador', hits: [.53, 1.27, 2.23], duration: 2.66, advance: 1.25, glide: true, minPhase: 2, weight: 1 },
  { id: 'Trono_Estocada', clip: 'dash', label: 'Estocada do Condenado', hits: [.42], duration: .9, advance: 2.6, range: [2.4, 5.5], score: 1, cd: 4.5, fast: true, aim: true }
];

/** Remove o deslocamento horizontal do quadril (e o vertical, se pedido): cópia do clipe, original intacto. */
export function inPlaceClip(clip, { vertical = false } = {}) {
  const c = clip.clone();
  for (const t of c.tracks) {
    if (!/hips[^.]*\.position$/i.test(t.name)) continue; const v = t.values;
    let minY = Infinity; if (vertical) for (let i = 1; i < v.length; i += 3) minY = Math.min(minY, v[i]);
    for (let i = 3; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; if (vertical) v[i + 1] = Math.min(v[i + 1], v[1] + (v[i + 1] - minY) * .15); }
  }
  return c;
}

/**
 * Empunhadura calibrada: o GLB não tem dedos nem arma, então a lâmina (+Y local da arma) é fixada na mão pela pose
 * NEUTRA do idle — guarda baixa à frente, a mesma de fora dos golpes — e depois segue a rotação do osso RightHand.
 * Devolve o quaternion arma←mão (constante).
 */
export function calibrateGrip(T, model, clone, idleClip) {
  const rig = clone(model); rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); rig.updateMatrixWorld(true);
  const mixer = new T.AnimationMixer(rig); if (idleClip) { mixer.clipAction(idleClip).play(); mixer.setTime(0); }
  let hand = null; rig.traverse(o => { if (!hand && o.isBone && /^(mixamorig)?RightHand$/i.test(o.name)) hand = o; });
  const out = new T.Quaternion(); if (!hand) return out;
  rig.updateMatrixWorld(true); const qh = hand.getWorldQuaternion(new T.Quaternion());
  const d = new T.Vector3(.12, -1, .3).normalize(), f = new T.Vector3(0, 0, 1); f.addScaledVector(d, -f.dot(d)).normalize();
  const x = new T.Vector3().crossVectors(d, f).normalize(), qw = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, d, f));
  out.copy(qh).invert().multiply(qw); mixer.stopAllAction(); mixer.uncacheRoot(rig); return out;
}

// Preserve the native footwork. Adjust the sword arm of the vault used for
// the thrust and the chest turn of the axe combo used for the double cut.
function duelistClip(T, rig, source, hand, grip, move) {
  const thrust = move.id === 'Trono_Estocada';
  if (!thrust && move.id !== 'Trono_Duplo') return source.clone();
  const first = move.hits[0], last = move.hits.at(-1);
  const forearm = hand.parent, arm = forearm.parent;
  const clip = source.clone();
  const joints = thrust ? [arm, forearm, hand] : ['Chest','UpperChest'].map(name => rig.getObjectByName(name));
  if (joints.some(j => !j)) return clip;
  const tracks = joints.map(j => clip.tracks.find(t => t.name === j.name + '.quaternion'));
  if (tracks.some(t => !t)) return clip;
  const mixer = new T.AnimationMixer(rig);
  mixer.clipAction(source).play();
  const times = [], values = joints.map(() => []);
  const rotations = joints.map(() => new T.Quaternion());
  const origin = new T.Vector3(), direction = new T.Vector3(), aim = new T.Vector3();
  const before = new T.Quaternion(), parent = new T.Quaternion(), delta = new T.Quaternion();
  const up = new T.Vector3(0,1,0);
  const total = Math.ceil(Math.min(move.duration,source.duration) * 60);
  for (let i = 0; i <= total; i++) {
    const t = Math.min(source.duration,move.duration) * i / total;
    mixer.setTime(Math.min(t, source.duration - .0001));
    rig.updateMatrixWorld(true);
    const k = Math.max(0, Math.min(1, (t-first+.32)/.22, (last+.36-t)/.20));
    const weight = k*k*(3-2*k);
    for (let j = 0; j < joints.length; j++) {
      const joint = joints[j];
      rotations[j].copy(joint.quaternion);
      joint.getWorldQuaternion(before);
      joint.getWorldPosition(origin);
      if (!thrust) {
        // Both native axe cuts pass to the right of a frontal opponent.
        // Distribute the turn between the two chest bones; the feet stay planted.
        delta.setFromAxisAngle(up,-.25);
      } else if (j < 2) {
        joints[j+1].getWorldPosition(direction).sub(origin).normalize();
        aim.set(.16, origin.y + (j ? .03 : -.09), 1.5).sub(origin).normalize();
        delta.setFromUnitVectors(direction,aim);
      } else {
        direction.set(0,1,0).applyQuaternion(grip).applyQuaternion(before);
        aim.set(-.10,-.08,1).normalize();
        delta.setFromUnitVectors(direction,aim);
      }
      delta.multiply(before);
      joint.parent.getWorldQuaternion(parent).invert();
      joint.quaternion.slerp(parent.multiply(delta),weight);
      joint.updateWorldMatrix(false,true);
      joint.quaternion.toArray(values[j],values[j].length);
    }
    times.push(t);
    joints.forEach((joint,j) => joint.quaternion.copy(rotations[j]));
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(rig);
  clip.tracks = clip.tracks.map(track => {
    const j = tracks.indexOf(track);
    return j < 0 ? track : new T.QuaternionKeyframeTrack(track.name,times,values[j]);
  });
  return clip;
}

/**
 * Clipes dos golpes nativos + traço da lâmina amostrado do MESMO clipe (120 Hz, calculado uma vez por modelo), no espaço do ator (origem no chão,
 * frente +Z), no formato que bossTraceContact já consome. clipFor(role) → AnimationClip in-place.
 */
export function nativeMoveClips(T, model, clone, clipFor, moves, grip, blade = [[0, .15, 0], [0, 1.55, 0]]) {
  const rig = clone(model); rig.position.set(0, model.position.y, 0); rig.rotation.set(0, 0, 0); rig.scale.copy(model.scale);
  const mixer = new T.AnimationMixer(rig); let hand = null; rig.traverse(o => { if (!hand && o.isBone && /^(mixamorig)?RightHand$/i.test(o.name)) hand = o; });
  const out = {}, p = new T.Vector3(), q = new T.Quaternion();
  for (const m of moves) {
    const src = clipFor(m.clip); if (!src || !hand) continue;
    mixer.stopAllAction();
    const clip = duelistClip(T,rig,src,hand,grip,m);
    clip.name = m.id; const frames = [], N = Math.ceil(m.duration * 120);
    mixer.clipAction(clip).play();
    for (let i = 0; i <= N; i++) {
      mixer.setTime(Math.min(m.duration * i / N, clip.duration - 1e-3)); rig.updateMatrixWorld(true);
      hand.getWorldPosition(p); hand.getWorldQuaternion(q).multiply(grip);
      frames.push([blade.map(b => new T.Vector3(...b).applyQuaternion(q).add(p).toArray())]);
    }
    clip.combatTrace = { duration: m.duration, frames }; out[m.id] = clip;
  }
  mixer.stopAllAction(); mixer.uncacheRoot(rig); return out;
}
