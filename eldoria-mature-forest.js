/**
 * MOD 291 — Mata fechada de Eldória com o modelo do criador (ArvoreFloresta01.glb: tronco grosso, raízes expostas,
 * musgo e copa em folhas). Referência: floresta densa ao redor do lago turquesa, copas cruzadas e visão curta.
 *
 * - Plano puro (testável): árvores maduras em espaçamento de Poisson aproximado, em manchas, na faixa entre o rio e a
 *   serra e num anel em volta do lago; nunca em trilha, água, jaula ou ponte.
 * - Render: 1 InstancedMesh com a geometria LOD1 (≈4 mil triângulos, textura do LOD0) perto da câmera e 1 InstancedMesh
 *   barata (copa + tronco, ~100 triângulos) longe; o corte por distância/direção do jogo escolhe quem vai para a GPU.
 */
import { makeRng } from './eldoria-prologue-meadow.js';

export function planMatureForest({ lake, zone, isFree, lowSpec = false, seed = 5513 }) {
  const rnd = makeRng(seed), out = [], target = lowSpec ? 150 : 220, minGap = lowSpec ? 5.8 : 5.2;
  const ok = (x, z, h) => isFree(x, z) && !out.some(t => (t.x - x) ** 2 + (t.z - z) ** 2 < (minGap * (t.h + h) / 32) ** 2 + minGap * minGap * .5);
  // Anel do lago: árvores grandes debruçadas na margem (enquadram a água, como na referência).
  for (let i = 0; i < 70 && out.length < target * .35; i++) {
    const a = rnd() * Math.PI * 2, r = lake.r + 3.5 + rnd() * 16, x = lake.x + Math.cos(a) * r, z = lake.z + Math.sin(a) * r, h = 13 + rnd() * 9;
    if (ok(x, z, h)) out.push({ x, z, h, rot: rnd() * 6.28, lean: (rnd() - .5) * .12, w: .9 + rnd() * .5 });
  }
  // Faixa de mata fechada: manchas por ruído barato (sem fileiras), densidade maior longe das trilhas.
  for (let i = 0; i < 9000 && out.length < target; i++) {
    const x = zone.x0 + rnd() * (zone.x1 - zone.x0), z = zone.z0 + rnd() * (zone.z1 - zone.z0);
    const patch = .5 + .5 * Math.sin(x * .07 + Math.sin(z * .05) * 2.1) * Math.cos(z * .06 - x * .02);
    if (rnd() > .35 + patch * .65) continue;
    const h = 11 + rnd() * 10;
    if (ok(x, z, h)) out.push({ x, z, h, rot: rnd() * 6.28, lean: (rnd() - .5) * .1, w: .8 + rnd() * .55 });
  }
  return out;
}

/** Junta as malhas do GLB (já com a matriz de cada nó) numa geometria só, base no chão e altura 1. */
function bakeUnitTree(THREE, scene) {
  scene.updateMatrixWorld(true); let geo = null, material = null;
  scene.traverse(o => { if (!geo && o.isMesh) { geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); material = o.material; } });
  if (!geo) return null;
  geo.computeBoundingBox(); const b = geo.boundingBox, h = Math.max(.01, b.max.y - b.min.y);
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); geo.scale(1 / h, 1 / h, 1 / h); geo.computeBoundingSphere();
  return { geo, material, width: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / h };
}

function farTreeGeometry(THREE) {
  const crown = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(), trunk = new THREE.CylinderGeometry(.05, .09, .5, 6).toNonIndexed();
  crown.scale(.42, .3, .42); crown.translate(0, .68, 0); trunk.translate(0, .25, 0);
  const pos = [], col = [];
  for (const [g, c] of [[crown, [.14, .25, .1]], [trunk, [.25, .17, .1]]]) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); const k = .8 + .35 * Math.max(0, p.getY(i) - .5); col.push(c[0] * k, c[1] * k, c[2] * k); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}

export function mountMatureForest(THREE, GLTFLoader, o) {
  const { scene, groundHeightAt, registerCull, obstacles = [], lowSpec = false } = o, plan = planMatureForest(o), group = new THREE.Group();
  group.name = 'eldoria-mature-forest-mod291'; scene.add(group);
  for (const t of plan) obstacles.push({ x: t.x, z: t.z, height: t.h, radius: .045 * t.h + .25 });
  const tints = plan.map((t, i) => { const v = Math.sin(i * 12.9898 + t.x * .37) * 43758.5453, r = v - Math.floor(v); return new THREE.Color().setRGB(.82 + r * .3, .88 + ((r * 7) % 1) * .26, .74 + ((r * 13) % 1) * .2); });
  const d = new THREE.Object3D(), place = (m, sx = 1) => { plan.forEach((t, i) => { d.position.set(t.x, groundHeightAt(t.x, t.z) - .25, t.z); d.rotation.set(t.lean, t.rot, t.lean * .6); d.scale.set(t.h * sx * (t.w || 1), t.h, t.h * sx * (t.w || 1) * (.9 + ((i * 7) % 5) * .05)); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.count = plan.length; plan.forEach((t, i) => m.setColorAt(i, tints[i])); m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); };
  const far = new THREE.InstancedMesh(farTreeGeometry(THREE), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 }), Math.max(1, plan.length));
  place(far, 1.6); far.name = 'mature-forest-far'; group.add(far);
  if (registerCull) registerCull(far, 150, 0, lowSpec ? 40 : 55);
  const loader = new GLTFLoader(), ready = new Promise(res => loader.load('./ArvoreFloresta01.glb', full => loader.load('./ArvoreFloresta01-lod1.glb', lod => {
    const tex = bakeUnitTree(THREE, full.scene), geo = bakeUnitTree(THREE, lod.scene) || tex; if (!tex) { res(null); return; }
    // Copa menos "buraco negro": emissão fraca com a própria textura (meio-tom sob o dossel, sem estourar a luz).
    const mat = tex.material.clone(); if (mat.map) { mat.emissiveMap = mat.map; mat.emissive = new THREE.Color(0x3a4a2a); mat.emissiveIntensity = .55; } mat.metalness = 0;
    mat.roughness = Math.max(.92, mat.roughness ?? 1); // casca sem brilho especular de plástico
    // Dois níveis: malha completa do criador perto (sem facetas grandes no tronco) e LOD1 na faixa média.
    const near = new THREE.InstancedMesh(tex.geo, mat, Math.max(1, plan.length)); place(near, 1);
    near.castShadow = !lowSpec; near.receiveShadow = true; near.name = 'mature-forest-near'; group.add(near);
    const mid = new THREE.InstancedMesh(geo.geo, mat, Math.max(1, plan.length)); place(mid, 1);
    mid.castShadow = !lowSpec; mid.receiveShadow = true; mid.name = 'mature-forest-mid'; group.add(mid);
    if (registerCull) { registerCull(near, 24, 24); registerCull(mid, lowSpec ? 42 : 58, 0, 24); }
    res({ near: plan.length, triangles: (geo.geo.index ? geo.geo.index.count : geo.geo.attributes.position.count) / 3 });
  }, undefined, () => res(null)), undefined, () => res(null)));
  // Manchas de sol filtradas pela copa: discos aditivos quentes no chão, entre os troncos (1 draw call).
  const dapples = []; { let k = 0; for (const t of plan) for (let j = 0; j < 2; j++) { const a = (k++ * 2.399) % 6.28, r = 2.5 + ((k * 3.7) % 4); dapples.push({ x: t.x + Math.cos(a) * r, z: t.z + Math.sin(a) * r, s: .9 + ((k * 1.3) % 1.6) }); } }
  const dg = new THREE.CircleGeometry(1, 14); dg.rotateX(-Math.PI / 2);
  const dm = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const dap = new THREE.InstancedMesh(dg, dm, Math.max(1, dapples.length)); dapples.forEach((p, i) => { d.position.set(p.x, groundHeightAt(p.x, p.z) + .05, p.z); d.rotation.set(0, i, 0); d.scale.set(p.s * 1.6, 1, p.s); d.updateMatrix(); dap.setMatrixAt(i, d.matrix); });
  dap.count = dapples.length; dap.instanceMatrix.needsUpdate = true; dap.renderOrder = 1; dap.name = 'mature-forest-sun-dapples'; group.add(dap);
  if (registerCull) registerCull(dap, lowSpec ? 34 : 46, 10);
  group.userData.dapples = dm;
  return { group, plan, ready, dapples: dm };
}
