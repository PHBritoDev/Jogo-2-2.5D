/**
 * MOD 291 — Sub-bosque da mata de Eldória (estratos da floresta: dossel → arvoretas → arbustos → samambaias).
 * A mata antiga tinha troncos sobre gramado liso; a referência pede chão coberto. Tudo instanciado e cortado por
 * distância (registerCull), em manchas que seguem as árvores e as margens do rio/lago.
 */
import { makeRng } from './eldoria-prologue-meadow.js';

export function fernGeometry(THREE) {
  const pos = [], col = [], base = [.12, .22, .09], tip = [.36, .52, .2];
  for (let f = 0; f < 7; f++) {
    const a = f / 7 * Math.PI * 2 + (f % 2) * .3, L = .55 + (f % 3) * .12, w = .07;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz * w, pz = dx * w;
    const p0 = [0, .02, 0], p1 = [dx * L * .5, .32, dz * L * .5], p2 = [dx * L, .2, dz * L];
    // dois quads afinando até a ponta, arqueados
    pos.push(p0[0] - px, p0[1], p0[2] - pz, p0[0] + px, p0[1], p0[2] + pz, p1[0] + px * .8, p1[1], p1[2] + pz * .8);
    pos.push(p0[0] - px, p0[1], p0[2] - pz, p1[0] + px * .8, p1[1], p1[2] + pz * .8, p1[0] - px * .8, p1[1], p1[2] - pz * .8);
    pos.push(p1[0] - px * .8, p1[1], p1[2] - pz * .8, p1[0] + px * .8, p1[1], p1[2] + pz * .8, p2[0], p2[1], p2[2]);
    const mid = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2, (base[2] + tip[2]) / 2];
    col.push(...base, ...base, ...mid, ...base, ...mid, ...mid, ...mid, ...mid, ...tip);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  g.computeBoundingSphere(); return g;
}

export function bushGeometry(THREE, seed = 3) {
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color(), a = new THREE.Color(0x24401f), b = new THREE.Color(0x4f6b2c);
  const rnd = makeRng(seed);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), k = .82 + rnd() * .3; p.setXYZ(i, p.getX(i) * k, (y < 0 ? y * .35 : y) * k, p.getZ(i) * k);
    c.copy(a).lerp(b, Math.max(0, Math.min(1, .35 + y * .45 + (rnd() - .5) * .3))); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.computeVertexNormals(); g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeBoundingSphere(); return g;
}

/** Plano puro: samambaias ao pé das árvores do vale, arbustos entre elas e faixa densa nas margens d'água. */
export function planUndergrowth({ trees, banks = [], isFree, lowSpec = false, seed = 9911 }) {
  const rnd = makeRng(seed), ferns = [], bushes = [], maxF = lowSpec ? 900 : 1800, maxB = lowSpec ? 260 : 520;
  const valley = trees.filter(t => t.collide);
  for (const t of valley) {
    const n = 2 + ((rnd() * 4) | 0);
    for (let k = 0; k < n && ferns.length < maxF; k++) { const a = rnd() * 6.28, r = .9 + rnd() * 2.8 * t.s, x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r; if (isFree(x, z)) ferns.push({ x, z, s: .7 + rnd() * .7, rot: rnd() * 6.28 }); }
    if (rnd() < .45 && bushes.length < maxB) { const a = rnd() * 6.28, r = 1.6 + rnd() * 2.6, x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r; if (isFree(x, z)) bushes.push({ x, z, s: .45 + rnd() * .55, rot: rnd() * 6.28 }); }
  }
  for (const p of banks) {
    for (let k = 0; k < 3 && ferns.length < maxF + 400; k++) { const x = p.x + (rnd() - .5) * 3, z = p.z + (rnd() - .5) * 3; if (isFree(x, z)) ferns.push({ x, z, s: .8 + rnd() * .6, rot: rnd() * 6.28 }); }
    if (rnd() < .3 && bushes.length < maxB + 120) { const x = p.x + (rnd() - .5) * 4, z = p.z + (rnd() - .5) * 4; if (isFree(x, z)) bushes.push({ x, z, s: .5 + rnd() * .5, rot: rnd() * 6.28 }); }
  }
  return { ferns, bushes };
}

export function buildUndergrowth(THREE, o) {
  const { scene, groundHeightAt, addWind, registerCull, lowSpec } = o, plan = planUndergrowth(o), d = new THREE.Object3D(), group = new THREE.Group();
  group.name = 'eldoria-undergrowth-mod291'; scene.add(group);
  const fernMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide });
  if (addWind) addWind(fernMat, .05, 'clamp(position.y*2.2,0.0,1.0)', .9, 'mod291-fern');
  const ferns = new THREE.InstancedMesh(fernGeometry(THREE), fernMat, Math.max(1, plan.ferns.length));
  plan.ferns.forEach((f, i) => { d.position.set(f.x, groundHeightAt(f.x, f.z) - .03, f.z); d.rotation.set(0, f.rot, 0); d.scale.setScalar(f.s); d.updateMatrix(); ferns.setMatrixAt(i, d.matrix); });
  ferns.count = plan.ferns.length; ferns.instanceMatrix.needsUpdate = true; ferns.receiveShadow = true; ferns.name = 'eldoria-ferns'; group.add(ferns);
  const bushMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, flatShading: false });
  const bushes = new THREE.InstancedMesh(bushGeometry(THREE), bushMat, Math.max(1, plan.bushes.length));
  plan.bushes.forEach((b, i) => { d.position.set(b.x, groundHeightAt(b.x, b.z) + b.s * .25, b.z); d.rotation.set(0, b.rot, 0); d.scale.set(b.s * 1.4, b.s, b.s * 1.2); d.updateMatrix(); bushes.setMatrixAt(i, d.matrix); });
  bushes.count = plan.bushes.length; bushes.instanceMatrix.needsUpdate = true; bushes.receiveShadow = true; bushes.castShadow = !lowSpec; bushes.name = 'eldoria-bushes'; group.add(bushes);
  if (registerCull) { registerCull(ferns, lowSpec ? 38 : 52, 12); registerCull(bushes, lowSpec ? 60 : 80, 16); }
  return { group, stats: { ferns: plan.ferns.length, bushes: plan.bushes.length } };
}
