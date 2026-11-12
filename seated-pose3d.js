/**
 * Mod 317 — pose sentada procedural para rigs humanoides Meshy (herói, Anjo-Guia, moradores): nenhum dos GLBs traz clipe
 * "sentado", então a pose é feita por mira de ossos no espaço do mundo DEPOIS do mixer (o clipe de respiração continua no
 * tronco e na cabeça; pernas e braços são reorientados). Também calcula quanto o quadril precisa descer para apoiar no
 * assento real (socket medido no modelo da carroça), sem mudar a escala do personagem.
 *
 *   const seat = createSeatPose(THREE, modelRoot, { reins: true });
 *   // a cada quadro, depois de mixer.update():
 *   seat.apply({ forward: dirMundo, lean: -0.1..0.1, t });
 *   seat.hipDrop(holder) // metros que o holder deve descer para o quadril encostar no assento
 */
const NAMES = {
  hips: [/^hips$/i, /mixamorig:?hips/i],
  lul: [/^leftupperleg$/i, /left.?up.?leg|leftthigh/i], lll: [/^leftlowerleg$/i, /left.?leg$|leftcalf|leftshin/i], lf: [/^leftfoot$/i, /left.?foot/i],
  rul: [/^rightupperleg$/i, /right.?up.?leg|rightthigh/i], rll: [/^rightlowerleg$/i, /right.?leg$|rightcalf|rightshin/i], rf: [/^rightfoot$/i, /right.?foot/i],
  lua: [/^leftupperarm$/i, /left.?arm$/i], lla: [/^leftlowerarm$/i, /left.?fore.?arm/i], lh: [/^lefthand$/i, /left.?hand$/i],
  rua: [/^rightupperarm$/i, /right.?arm$/i], rla: [/^rightlowerarm$/i, /right.?fore.?arm/i], rh: [/^righthand$/i, /right.?hand$/i],
  chest: [/^upperchest$/i, /^chest$/i, /spine2$/i], head: [/^head$/i, /mixamorig:?head$/i],
};
export function findHumanoidBones(root) {
  const all = []; root.traverse(o => { if (o.isBone) all.push(o); });
  const out = {};
  for (const k in NAMES) for (const re of NAMES[k]) { const b = all.find(o => re.test(o.name || '')); if (b) { out[k] = b; break; } }
  return out;
}

export function createSeatPose(THREE, root, { reins = false, legSpread = .1, floor = false } = {}) {
  const B = findHumanoidBones(root);
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion(), d = new THREE.Vector3(), side = new THREE.Vector3();
  const ok = !!(B.hips && B.lul && B.lll && B.rul && B.rll);
  /** Gira `b` para que o filho aponte para `dir` (mundo), com peso w. */
  function aim(b, child, dir, w = 1) {
    if (!b || !child) return;
    b.updateWorldMatrix(true, false); child.updateWorldMatrix(false, false);
    const cur = v2.setFromMatrixPosition(child.matrixWorld).sub(v1.setFromMatrixPosition(b.matrixWorld)); if (cur.lengthSq() < 1e-10) return; cur.normalize();
    q1.setFromUnitVectors(cur, dir); q2.identity().slerp(q1, w);
    b.getWorldQuaternion(q3); q2.multiply(q3); b.parent.getWorldQuaternion(q3).invert(); b.quaternion.copy(q3.multiply(q2)); b.updateMatrixWorld(true);
  }
  function apply({ forward, lean = 0, t = 0 } = {}) {
    if (!ok || !forward) return false;
    side.set(forward.z, 0, -forward.x).normalize(); // direita do personagem
    // coxas para a frente (levemente abertas e um pouco abaixo da horizontal); canelas para baixo, pés à frente do joelho
    for (const [ul, ll, sx] of [[B.lul, B.lll, -1], [B.rul, B.rll, 1]]) {
      // no chão (sem banco): joelhos dobrados para cima, pés apoiados à frente — cabe na cabine
      d.copy(forward).multiplyScalar(floor ? .72 : .97).addScaledVector(side, sx * legSpread).add(v1.set(0, floor ? .58 : -.18, 0)).normalize(); aim(ul, ll, d.clone());
      const foot = ll === B.lll ? B.lf : B.rf;
      if (foot) { d.set(0, -1, 0).addScaledVector(forward, floor ? .4 : .2).addScaledVector(side, sx * .04).normalize(); aim(ll, foot, d.clone()); }
    }
    // braços: rédeas (antebraços à frente, mãos juntas na altura do colo) ou mãos sobre as coxas
    const sw = Math.sin(t * 1.7) * .03;
    for (const [ua, la, hand, sx] of [[B.lua, B.lla, B.lh, -1], [B.rua, B.rla, B.rh, 1]]) {
      if (!ua || !la) continue;
      if (reins) { d.copy(forward).multiplyScalar(.45).add(v1.set(0, -.86, 0)).addScaledVector(side, sx * .1).normalize(); aim(ua, la, d.clone());
        d.copy(forward).multiplyScalar(.95 + sw).add(v1.set(0, -.12 + sw, 0)).addScaledVector(side, -sx * .22).normalize(); aim(la, hand, d.clone()); }
      else { d.copy(forward).multiplyScalar(.28).add(v1.set(0, -.95, 0)).addScaledVector(side, sx * .12).normalize(); aim(ua, la, d.clone());
        d.copy(forward).multiplyScalar(.85).add(v1.set(0, -.5, 0)).addScaledVector(side, sx * .05).normalize(); aim(la, hand, d.clone()); }
    }
    // inclinação nas curvas e nos solavancos (o corpo compensa, a cabeça fica estável)
    if (B.chest && lean) { B.chest.rotateZ(lean * .5); B.chest.updateMatrixWorld(true); if (B.head) { B.head.rotateZ(-lean * .35); B.head.updateMatrixWorld(true); } }
    return true;
  }
  /** Altura do quadril acima da base do holder (para apoiar o quadril no assento). */
  function hipHeight(holder) { if (!B.hips) return 0; B.hips.updateWorldMatrix(true, false); return v1.setFromMatrixPosition(B.hips.matrixWorld).y - holder.position.y; }
  return { apply, hipHeight, bones: B, ok };
}
