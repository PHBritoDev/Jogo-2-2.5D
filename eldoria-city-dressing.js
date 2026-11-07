/**
 * MOD 291 — Marco 3: Eldória bonita e íntegra (correção canônica do criador: o Bispo levou o DINHEIRO, não as casas).
 * A cidade é encantadora; a pobreza aparece nas pessoas e na comida (já existentes: moradores fracos, frutas podres,
 * moscas discretas). Este módulo só acrescenta beleza arquitetônica e cuidado:
 *  - plataformas de madeira em anel presas às árvores ancestrais, com escoras e escada em espiral no tronco;
 *  - a passarela suspensa do criador (PassarelaSuspensaEldoria.glb) ligando duas árvores ancestrais;
 *  - canteiros floridos e sebes junto às casas, cercas claras e lampiões ao longo dos caminhos.
 * Geometria procedural mesclada (poucos draw calls) + GLB do criador; nada de ruínas.
 */
import { flowerGeometry, makeRng } from './eldoria-prologue-meadow.js';
import { bushGeometry } from './eldoria-undergrowth.js';

function merge(THREE, parts) {
  const pos = [], nrm = [], col = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  for (const p of parts) {
    const g = (p.geo || new THREE.BoxGeometry(1, 1, 1)).toNonIndexed();
    m.compose(new THREE.Vector3(p.x, p.y, p.z), q.setFromEuler(e.set(p.rx || 0, p.ry || 0, p.rz || 0)), new THREE.Vector3(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1));
    g.applyMatrix4(m); c.set(p.color);
    const a = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); const k = n.getY(i) < -.5 ? .6 : 1; col.push(c.r * k, c.g * k, c.b * k); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeBoundingSphere(); return g;
}

/** Plano puro do deque em anel + escada em espiral em volta de um tronco (centro, raio do tronco, altura). */
export function planTreeDeck({ x, z, trunk = 3.4, height = 7, y0 = 0, seed = 1 }) {
  const rnd = makeRng(seed), parts = [], R = trunk + 2.1, wood = [0x8a6a44, 0x7a5c3a, 0x93734a], N = 22;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, mx = x + Math.cos(a) * (trunk + 1.05), mz = z + Math.sin(a) * (trunk + 1.05);
    parts.push({ x: mx, y: y0 + height, z: mz, sx: 2.25, sy: .16, sz: (2 * Math.PI * (trunk + 1.05)) / N * 1.05, ry: -a, color: wood[i % 3] });          // tábuas
    if (i % 2 === 0) {
      const px = x + Math.cos(a) * R, pz = z + Math.sin(a) * R;
      parts.push({ x: px, y: y0 + height + .5, z: pz, sx: .12, sy: 1, sz: .12, color: 0x6a4e32 });                                                       // balaústre
      parts.push({ x: (px + x + Math.cos(a) * trunk) / 2, y: y0 + height - 1.1, z: (pz + z + Math.sin(a) * trunk) / 2, sx: .14, sy: 2.6, sz: .14, rz: 0, rx: 0, ry: -a, color: 0x5e4630, tilt: a }); // escora
    }
  }
  // corrimão: segmentos entre balaústres
  for (let i = 0; i < N; i += 2) { const a0 = i / N * Math.PI * 2, a1 = (i + 2) / N * Math.PI * 2, am = (a0 + a1) / 2; parts.push({ x: x + Math.cos(am) * R, y: y0 + height + .95, z: z + Math.sin(am) * R, sx: .08, sy: .08, sz: 2 * R * Math.sin((a1 - a0) / 2) + .1, ry: -am + Math.PI / 2 + Math.PI / 2, color: 0x7a5c3a }); }
  // escada em espiral subindo pelo tronco até o deque
  const steps = Math.round(height / .32), start = rnd() * Math.PI * 2;
  for (let s = 0; s < steps; s++) { const t = s / steps, a = start + t * Math.PI * 1.6, r = trunk + .75; parts.push({ x: x + Math.cos(a) * r, y: y0 + .2 + t * height, z: z + Math.sin(a) * r, sx: 1.2, sy: .1, sz: .45, ry: -a, color: wood[s % 3] }); }
  return { parts, ring: R, deckY: y0 + height };
}

export function planGardens({ center, plots, isFree, seed = 717 }) {
  const rnd = makeRng(seed), flowers = [], hedges = [], fences = [], lamps = [];
  for (const [ox, oz, , size, rot] of plots) {
    const hx = center.x + ox, hz = center.z + oz, r0 = size * .55 + .8;
    // canteiro na frente e nas laterais (gira com a casa)
    for (let k = 0; k < 26; k++) { const a = rot + (rnd() - .5) * 2.2, r = r0 + rnd() * 1.4, x = hx + Math.sin(a) * r, z = hz + Math.cos(a) * r; if (isFree(x, z)) flowers.push({ x, z, s: .9 + rnd() * .6, rot: rnd() * 6.28, tilt: (rnd() - .5) * .3, yellow: rnd() < .4, pink: rnd() < .3 }); }
    for (let k = 0; k < 3; k++) { const a = rot + Math.PI * (.5 + (k - 1) * .35) * (rnd() < .5 ? 1 : -1), r = r0 + .3, x = hx + Math.sin(a) * r, z = hz + Math.cos(a) * r; if (isFree(x, z)) hedges.push({ x, z, s: .55 + rnd() * .35, rot: rnd() * 6.28 }); }
    // cerca clara baixa em arco atrás da casa
    for (let k = 0; k < 6; k++) { const a = rot + Math.PI + (k - 2.5) * .22, r = r0 + 1.3, x = hx + Math.sin(a) * r, z = hz + Math.cos(a) * r; if (isFree(x, z)) fences.push({ x, z, ry: a + Math.PI / 2 }); }
  }
  return { flowers, hedges, fences, lamps };
}

export function mountCityDressing(THREE, GLTFLoader, o) {
  const { group, groundHeightAt, center, plots, trees, lamps = [], isFree, lowSpec = false, obstacles = [] } = o;
  const root = new THREE.Group(); root.name = 'EldoriaCityDressing-mod291'; group.add(root);
  const woodMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 });
  // Deques nas árvores ancestrais.
  const decks = trees.map((t, i) => planTreeDeck({ x: center.x + t.x, z: center.z + t.z, trunk: t.trunk, height: t.deck, y0: groundHeightAt(center.x + t.x, center.z + t.z), seed: 31 + i }));
  const deckMesh = new THREE.Mesh(merge(THREE, decks.flatMap(d => d.parts)), woodMat); deckMesh.castShadow = !lowSpec; deckMesh.receiveShadow = true; deckMesh.name = 'eldoria-tree-decks'; root.add(deckMesh);
  // Passarela suspensa do criador entre as duas primeiras árvores com deque.
  if (decks.length >= 2) new GLTFLoader().load('./PassarelaSuspensaEldoria.glb', g => {
    const a = trees[0], b = trees[1], ax = center.x + a.x, az = center.z + a.z, bx = center.x + b.x, bz = center.z + b.z;
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, span = L - decks[0].ring - decks[1].ring + 2.2;
    const m = g.scene, bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()), k = span / Math.max(.01, sz.x);
    m.scale.setScalar(k); m.position.set(-c.x * k, -bb.min.y * k, -c.z * k); m.traverse(x => { if (x.isMesh) { x.castShadow = !lowSpec; x.receiveShadow = true; } });
    const w = new THREE.Group(); w.add(m); const mid = (decks[0].ring - decks[1].ring) / 2;
    w.position.set((ax + bx) / 2 + ux * mid, Math.min(decks[0].deckY, decks[1].deckY) + .08, (az + bz) / 2 + uz * mid); w.rotation.y = Math.atan2(-uz, ux); root.add(w);
    root.userData.walkway = { span: +span.toFixed(1), scale: +k.toFixed(2) };
  }, undefined, e => console.warn('PassarelaSuspensaEldoria.glb não carregou.', e));
  // Jardins: flores (3 cores), sebes, cercas claras e lampiões.
  const plan = planGardens({ center, plots, isFree });
  const d = new THREE.Object3D(), flowerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, side: THREE.DoubleSide });
  const kinds = [[f => f.pink, [.95, .58, .7], [.98, .85, .35]], [f => !f.pink && f.yellow, [.98, .82, .22], [.85, .55, .12]], [f => !f.pink && !f.yellow, [.96, .96, .92], [.98, .82, .25]]];
  for (const [pick, petal, mid] of kinds) {
    const list = plan.flowers.filter(pick); if (!list.length) continue;
    const m = new THREE.InstancedMesh(flowerGeometry(THREE, petal, mid), flowerMat, list.length);
    list.forEach((f, i) => { d.position.set(f.x, groundHeightAt(f.x, f.z) - .02, f.z); d.rotation.set(f.tilt, f.rot, 0); d.scale.setScalar(f.s * 1.25); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.name = 'eldoria-garden-flowers'; root.add(m);
  }
  if (plan.hedges.length) { const m = new THREE.InstancedMesh(bushGeometry(THREE, 9), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), plan.hedges.length); plan.hedges.forEach((h, i) => { d.position.set(h.x, groundHeightAt(h.x, h.z) + h.s * .3, h.z); d.rotation.set(0, h.rot, 0); d.scale.set(h.s * 1.3, h.s * .9, h.s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.receiveShadow = true; m.name = 'eldoria-garden-hedges'; root.add(m); }
  const fenceParts = []; for (const f of plan.fences) { const y = groundHeightAt(f.x, f.z); fenceParts.push({ x: f.x, y: y + .45, z: f.z, sx: .1, sy: .9, sz: .1, color: 0xe8e2d2 }, { x: f.x, y: y + .62, z: f.z, sx: 1.25, sy: .07, sz: .06, ry: f.ry, color: 0xdcd5c2 }, { x: f.x, y: y + .32, z: f.z, sx: 1.25, sy: .07, sz: .06, ry: f.ry, color: 0xdcd5c2 }); }
  for (const l of lamps) { const y = groundHeightAt(l.x, l.z); fenceParts.push({ x: l.x, y: y + 1.35, z: l.z, sx: .12, sy: 2.7, sz: .12, color: 0x4a3828 }, { x: l.x + .28, y: y + 2.62, z: l.z, sx: .62, sy: .08, sz: .08, color: 0x4a3828 }); obstacles.push({ x: l.x, z: l.z, radius: .28, height: 2.7 }); }
  if (fenceParts.length) { const m = new THREE.Mesh(merge(THREE, fenceParts), woodMat); m.receiveShadow = true; m.castShadow = !lowSpec; m.name = 'eldoria-fences-lamps'; root.add(m); }
  if (lamps.length) {
    const lm = new THREE.InstancedMesh(new THREE.BoxGeometry(.24, .32, .24), new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb860, emissiveIntensity: .9, roughness: .6 }), lamps.length);
    lamps.forEach((l, i) => { d.position.set(l.x + .5, groundHeightAt(l.x, l.z) + 2.4, l.z); d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix(); lm.setMatrixAt(i, d.matrix); });
    lm.instanceMatrix.needsUpdate = true; lm.computeBoundingSphere(); lm.name = 'eldoria-lanterns'; root.add(lm); root.userData.lanterns = lm.material;
  }
  return { root, decks, plan };
}
