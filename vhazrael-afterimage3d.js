/**
 * Mod 320 — rastro do dash do VHAZRAEL (afterimage). Silhuetas carmesim/violeta escuras que copiam a POSE REAL do corpo
 * (os 23 ossos do VHAZRAEL.glb) no instante em que nascem e se apagam em ~0,35 s. Pool fixo por corpo (4 cópias que
 * dividem a geometria do original): nenhuma malha é criada durante o combate. No perfil baixo nasce só 1 cópia por dash.
 */
const GHOSTS = 4, LIFE = .35, EVERY = .055;
const COLORS = [0x6e0a22, 0x3c0a66, 0x8a0c26, 0x2a0846];

export function attachAfterimages(T, scene, b, clone) {
  const src = []; b.model.traverse(o => { if (o.isBone) src.push(o); });
  const ghosts = [];
  for (let i = 0; i < GHOSTS; i++) {
    const g = clone(b.model), bones = [], mat = new T.MeshBasicMaterial({ color: COLORS[i % COLORS.length], transparent: true, opacity: 0, depthWrite: false, fog: false /* mistura normal: silhueta escura legível de dia e de noite */ });
    g.traverse(o => { if (o.isBone) bones.push(o); if (o.isMesh) { o.material = mat; o.frustumCulled = false; o.castShadow = o.receiveShadow = false; o.renderOrder = 8; } });
    const root = new T.Group(); root.add(g); root.visible = false; root.matrixAutoUpdate = false; scene.add(root);
    ghosts.push({ root, g, bones, mat, age: LIFE + 1 });
  }
  b.after = { ghosts, src, cursor: 0, clock: 0, wasDash: false, spawned: 0 };
  return b.after;
}

/** Chamado a cada quadro depois do mixer: nasce uma silhueta a cada EVERY s enquanto o ator estiver em dash. */
export function tickAfterimages(b, a, dt, quality = 1) {
  const A = b.after; if (!A) return;
  const dash = a.act?.type === 'dodge' || (a.act?.type === 'leap' && a.act.phase === 'airDash');
  const dashing = dash && b.holder.visible && a.alive !== false;
  if (dashing) {
    if (!A.wasDash) { A.spawned = 0; A.clock = 0; } else A.clock -= dt;
    const cap = quality === 0 ? 1 : GHOSTS;
    if (A.clock <= 0 && A.spawned < cap) {
      A.clock = EVERY; A.spawned++;
      const G = A.ghosts[A.cursor++ % A.ghosts.length];
      b.model.updateMatrixWorld(true); G.root.matrix.copy(b.model.matrixWorld); G.root.matrixWorldNeedsUpdate = true;
      G.g.position.set(0, 0, 0); G.g.quaternion.identity(); G.g.scale.set(1, 1, 1);
      for (let i = 0; i < G.bones.length && i < A.src.length; i++) { G.bones[i].position.copy(A.src[i].position); G.bones[i].quaternion.copy(A.src[i].quaternion); G.bones[i].scale.copy(A.src[i].scale); }
      G.g.updateMatrixWorld(true); G.age = 0; G.root.visible = true;
    }
  }
  A.wasDash = dashing;
  for (const G of A.ghosts) {
    if (!G.root.visible) continue; G.age += dt;
    const k = G.age / LIFE; if (k >= 1) { G.root.visible = false; G.mat.opacity = 0; continue; }
    G.mat.opacity = .62 * (1 - k) * (1 - k * .5);
  }
}

export function clearAfterimages(b) { if (!b.after) return; for (const G of b.after.ghosts) { G.root.visible = false; G.mat.opacity = 0; } }
export function disposeAfterimages(b) {
  if (!b.after) return;
  for (const ghost of b.after.ghosts) {
    ghost.root.removeFromParent();
    ghost.g.traverse(mesh => { if (mesh.isSkinnedMesh) mesh.skeleton.dispose(); });
    ghost.mat.dispose();
  }
  b.after = null;
}
/** Estado para QA (debug): quantas silhuetas visíveis e a maior opacidade. */
export function afterimageStats(b) { const g = b?.after?.ghosts || []; return { visible: g.filter(x => x.root.visible).length, peak: Math.max(0, ...g.map(x => x.mat.opacity)) }; }
