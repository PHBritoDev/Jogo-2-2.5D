/**
 * MOD 291 — Ponte de pedra em arco e pedras do rio de Eldória (geometria procedural própria, 1 draw call cada).
 * Referência do criador: pontes claras de calcário sobre água corrente entre árvores gigantes.
 */
import { boulderGeometry, makeRng } from './eldoria-prologue-meadow.js';

/** Junta caixas transformadas numa geometria só, com cor por bloco (variação de pedra). */
function mergeBoxes(THREE, boxes) {
  const pos = [], nrm = [], col = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  for (const b of boxes) {
    const g = new THREE.BoxGeometry(b.sx, b.sy, b.sz).toNonIndexed();
    m.compose(new THREE.Vector3(b.x, b.y, b.z), q.setFromEuler(e.set(b.rx || 0, b.ry || 0, b.rz || 0)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m); c.set(b.color);
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); const ao = n.getY(i) < -.5 ? .62 : 1; col.push(c.r * ao, c.g * ao, c.b * ao); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeBoundingSphere(); return g;
}

/** Plano puro da ponte: blocos do tabuleiro, parapeitos e corpo do arco (testável sem WebGL). */
export function planBridge(b, { level = -.5, segments = 18 } = {}) {
  const rnd = makeRng(4417), blocks = [], L = b.halfLength * 2, seg = L / segments;
  const yaw = Math.atan2(b.axisX, b.axisZ), deck = t => b.rise * (1 - t * t) + .08;
  const stones = [0xb3ab98, 0xa59d8a, 0xbdb6a4, 0x9c9483, 0xa8a48a];
  for (let i = 0; i < segments; i++) {
    const t0 = -1 + i * 2 / segments, t1 = t0 + 2 / segments, tm = (t0 + t1) / 2, along = tm * b.halfLength;
    const y0 = deck(t0), y1 = deck(t1), ym = (y0 + y1) / 2, pitch = Math.atan2(y1 - y0, seg);
    const cx = b.x + b.axisX * along, cz = b.z + b.axisZ * along, rx = b.axisZ, rz = -b.axisX;
    const tone = () => stones[(rnd() * stones.length) | 0];
    blocks.push({ x: cx, y: ym - .2, z: cz, sx: b.halfWidth * 2, sy: .4, sz: seg * 1.04, rx: -pitch, ry: yaw, color: tone() });
    for (const s of [-1, 1]) blocks.push({ x: cx + rx * (b.halfWidth - .14) * s, y: ym + .32, z: cz + rz * (b.halfWidth - .14) * s, sx: .28, sy: .62, sz: seg * 1.02, rx: -pitch, ry: yaw, color: tone() });
    // Corpo sob o tabuleiro: vão em arco no meio (o rio passa), encontros maciços nas cabeceiras.
    const open = Math.abs(tm) < .66;
    const bottom = open ? Math.min(deck(tm) - .45, level + .35 + (deck(tm) - .95 - level) * (1 - Math.pow(tm / .66, 2))) : level - .9;
    const top = ym - .38, h = top - bottom;
    if (h > .12) for (const s of [-1, 1]) blocks.push({ x: cx + rx * (b.halfWidth - .3) * s, y: bottom + h / 2, z: cz + rz * (b.halfWidth - .3) * s, sx: .55, sy: h, sz: seg * 1.02, rx: 0, ry: yaw, color: tone() });
  }
  // Pilares de encontro nas cabeceiras (ancoram a ponte no barranco, sem flutuar).
  for (const s of [-1, 1]) {
    const along = s * (b.halfLength - .4), cx = b.x + b.axisX * along, cz = b.z + b.axisZ * along;
    blocks.push({ x: cx, y: level - .1, z: cz, sx: b.halfWidth * 2 + .5, sy: 1.4, sz: 1.1, ry: yaw, color: 0x8f8877 });
  }
  return blocks;
}

export function buildBridge(THREE, b, o = {}) {
  const g = mergeBoxes(THREE, planBridge(b, o));
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0 }));
  mesh.name = 'eldoria-bridge-mod291'; mesh.castShadow = !o.lowSpec; mesh.receiveShadow = true; return mesh;
}

/** Pedras no leito, perto das margens e dos encontros da ponte: viram anéis de espuma no shader. */
export function planRiverRocks(centerline, { width = 3.4, count = 9, seed = 771, avoid = [] } = {}) {
  const rnd = makeRng(seed), out = [], n = centerline.length;
  for (let k = 0; k < count * 3 && out.length < count; k++) {
    const i = 4 + Math.floor(rnd() * (n - 8)), a = centerline[i - 1], c = centerline[i + 1], p = centerline[i];
    let tx = c.x - a.x, tz = c.z - a.z; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    const side = rnd() < .5 ? -1 : 1, off = width * (.45 + rnd() * .4) * side, r = .45 + rnd() * .75;
    const x = p.x - tz * off, z = p.z + tx * off;
    if (avoid.some(v => Math.hypot(v.x - x, v.z - z) < v.r + r)) continue;
    if (out.some(v => Math.hypot(v.x - x, v.z - z) < v.r + r + 2)) continue;
    out.push({ x, z, r, foam: .9 });
  }
  return out;
}

export function buildRiverRocks(THREE, rocks, { level = -.5, lowSpec = false } = {}) {
  const geo = boulderGeometry(THREE, 29, 2), m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), Math.max(1, rocks.length)), d = new THREE.Object3D();
  rocks.forEach((r, i) => { d.position.set(r.x, level - .15, r.z); d.rotation.set(0, i * 1.7, 0); d.scale.set(r.r, r.r * .7, r.r * .9); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
  m.count = rocks.length; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.castShadow = !lowSpec; m.receiveShadow = true; m.name = 'eldoria-river-rocks-mod291';
  return m;
}
