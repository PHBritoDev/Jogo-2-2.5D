/**
 * Renascimento de Eldória — Fase 2: apresentação das margens do rio (THREE). A forma e o plano ficam em
 * eldoria-river-banks.js.
 *  - Pedras de margem e pedras-degrau do vau: 3 variações de rochedo procedural (musgo em cima, base molhada e
 *    escura), instanciadas. Os blocos grandes usam o RochedoMusgoEldoria (LOD1), passado pelo integrador.
 *  - Juncos e taboas: tufos de lâminas finas com pendões, instanciados e com vento.
 *  - Chão da margem: lama molhada na linha d'água e cascalho claro nas praias internas, por cor de vértice do
 *    próprio terreno (uma passada na carga, sem textura nem malha nova).
 */
import { boulderGeometry } from './eldoria-prologue-meadow.js';
import { fordMask, endFade, RIVER_BANK } from './eldoria-river-banks.js';

/** Tufo de junco: 9 lâminas afinadas e 2 pendões de taboa (opcionais), base escura e ponta palha. */
export function reedGeometry(THREE, withCattail = true) {
  const pos = [], col = [], base = [.14, .2, .08], tip = [.62, .62, .34];
  for (let b = 0; b < 9; b++) {
    const a = b / 9 * Math.PI * 2 + b * .9, r = .04 + (b % 3) * .05, h = .9 + (b % 4) * .28, lean = .08 + (b % 3) * .07, w = .03;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, tx = cx + Math.cos(a) * lean, tz = cz + Math.sin(a) * lean, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    pos.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, tx, h, tz); col.push(...base, ...base, ...tip);
  }
  if (withCattail) for (let k = 0; k < 2; k++) {
    const a = k * 2.4 + .5, x = Math.cos(a) * .06, z = Math.sin(a) * .06, h0 = 1.05 + k * .22, h1 = h0 + .26, w = .045, brown = [.33, .2, .1], stalk = [.36, .42, .2];
    pos.push(x - .008, 0, z, x + .008, 0, z, x, h0, z); col.push(...stalk, ...stalk, ...stalk);
    for (const [dx, dz] of [[w, 0], [0, w]]) { pos.push(x - dx, h0, z - dz, x + dx, h0, z + dz, x + dx, h1, z + dz, x - dx, h0, z - dz, x + dx, h1, z + dz, x - dx, h1, z - dz); for (let i = 0; i < 6; i++) col.push(...brown); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3)); g.computeBoundingSphere(); return g;
}

/** Pedra de rio: o musgo do rochedo do prado vira só um resto no topo (pedra lavada pela correnteza, cinza-pardo)
 *  e a metade de baixo escurece (molhada). */
function riverStone(g) { const p = g.attributes.position, c = g.attributes.color, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { const r = c.getX(i), gg = c.getY(i), b = c.getZ(i), l = r * .3 + gg * .55 + b * .15, keep = Math.max(0, n.getY(i) - .72) * .9;
    c.setXYZ(i, r * keep + l * 1.02 * (1 - keep), gg * keep + l * .97 * (1 - keep), b * keep + l * .86 * (1 - keep)); }
  c.needsUpdate = true; return g; }
/** Escurece a metade de baixo do rochedo (pedra molhada) sem mudar o musgo de cima. */
function wetten(g, k = .55) { const p = g.attributes.position, c = g.attributes.color; for (let i = 0; i < p.count; i++) { const y = p.getY(i), w = Math.max(0, Math.min(1, (.05 - y) / .5)) * k; c.setXYZ(i, c.getX(i) * (1 - w) + .05 * w, c.getY(i) * (1 - w) + .055 * w, c.getZ(i) * (1 - w) + .05 * w); } c.needsUpdate = true; return g; }

export function buildRiverBanks(THREE, { plan, scene, ground, level = -.5, addWind = null, registerCull = null, lowSpec = false, rockObstacles = [] }) {
  const group = new THREE.Group(); group.name = 'rio-margens-renascimento'; scene.add(group);
  const dm = new THREE.Object3D(), stoneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .74, metalness: 0 }), tint = new THREE.Color();
  const geos = [0, 1, 2].map(i => wetten(riverStone(boulderGeometry(THREE, 41 + i * 9, lowSpec ? 1 : 2)), .62));
  const stats = { stones: 0, steps: 0, reeds: 0 };
  // pedras de margem (meio enterradas/submersas) + pedras-degrau do vau (achatadas, topo acima da lâmina)
  for (let v = 0; v < 3; v++) {
    const list = plan.stones.filter(s => s.v === v), steps = plan.steps.filter((s, j) => j % 3 === v);
    const n = list.length + steps.length; if (!n) continue;
    const m = new THREE.InstancedMesh(geos[v], stoneMat, n); let k = 0;
    for (const s of list) { const y = ground(s.x, s.z); dm.position.set(s.x, y - s.r * s.sy * .32, s.z); dm.rotation.set(Math.sin(s.rot * 3.1) * .14, s.rot, Math.cos(s.rot * 2.3) * .12); dm.scale.set(s.r * (.9 + .35 * Math.abs(Math.sin(s.rot * 5))), s.r * s.sy, s.r * (.75 + (k % 3) * .12)); dm.updateMatrix(); m.setColorAt(k, tint.setRGB(.82 + .3 * Math.abs(Math.sin(s.rot * 7)), .8 + .28 * Math.abs(Math.sin(s.rot * 7)), .78 + .22 * Math.abs(Math.cos(s.rot * 4)))); m.setMatrixAt(k++, dm.matrix);
      const top = y - s.r * s.sy * .32 + s.r * s.sy * .82; if (top > level + .05 && s.r > .45) rockObstacles.push({ x: s.x, z: s.z, radius: s.r * .85, height: Math.max(.15, top - (y - .05)), base: y - .05, river: true }); }
    for (const s of steps) { const top = level + .16, bed = ground(s.x, s.z), hy = Math.max(.3, top - bed + .12); dm.position.set(s.x, top - hy * .82 * .5 - .02, s.z); dm.rotation.set(Math.sin(s.rot * 2) * .07, s.rot, Math.cos(s.rot * 3) * .06); dm.scale.set(s.r * (1.1 + .3 * Math.abs(Math.sin(s.rot * 4))), hy * .58, s.r * (.82 + .2 * Math.abs(Math.cos(s.rot * 5)))); dm.updateMatrix(); m.setColorAt(k, tint.setRGB(.86 + .2 * Math.abs(Math.sin(s.rot * 9)), .82 + .18 * Math.abs(Math.sin(s.rot * 9)), .78 + .16 * Math.abs(Math.sin(s.rot * 6)))); m.setMatrixAt(k++, dm.matrix);
      rockObstacles.push({ x: s.x, z: s.z, radius: s.r * 1.12, height: .55, base: top - .55, step: true }); stats.steps++; }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); m.castShadow = !lowSpec; m.receiveShadow = true; m.name = 'rio-pedras-' + v; group.add(m); stats.stones += list.length;
    if (registerCull) registerCull(m, lowSpec ? 60 : 85, 24);
  }
  // juncos e taboas
  const reedMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide });
  if (addWind) addWind(reedMat, .07, 'clamp(position.y*1.1,0.0,1.4)', 1.4, 'f2-river-reeds');
  for (const cat of [false, true]) {
    const list = plan.reeds.filter(r => r.cat === cat); if (!list.length) continue;
    const m = new THREE.InstancedMesh(reedGeometry(THREE, cat), reedMat, list.length);
    list.forEach((r, i) => { const h = Math.abs(Math.sin(r.rot * 7.3)), w = .75 + .6 * Math.abs(Math.cos(r.rot * 3.7));
      dm.position.set(r.x, Math.max(ground(r.x, r.z), level - .35) - .04, r.z); dm.rotation.set(Math.sin(r.rot * 5) * .1, r.rot, Math.cos(r.rot * 4) * .1); dm.scale.set(r.s * w, r.s * (.7 + h * .55), r.s * (2.1 - w) * .85); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix);
      m.setColorAt(i, tint.setRGB(.8 + h * .35, .86 + h * .2, .7 + (1 - h) * .3)); }); // tufos de altura, largura, inclinação e tom diferentes (sem cópia em fila)
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); m.receiveShadow = true; m.name = 'rio-juncos' + (cat ? '-taboa' : ''); group.add(m); stats.reeds += list.length;
    if (registerCull) registerCull(m, lowSpec ? 46 : 64, 16);
  }
  return { group, stats };
}

const h2 = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
function vn2(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
  return (h2(i, j) * (1 - u) + h2(i + 1, j) * u) * (1 - w) + (h2(i, j + 1) * (1 - u) + h2(i + 1, j + 1) * u) * w; }

/** Cor do chão das margens na malha do terreno: lama molhada junto à água, cascalho nas praias, transição pro capim. */
export function paintRiverBanks(geometry, river, { fordS, bridge } = {}) {
  const p = geometry.attributes.position, c = geometry.attributes.color; if (!c) return 0; let n = 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); if (z > river.zMax || z < river.zMin) continue;
    const q = river.nearest(x, z); if (!q || q.d > 9) continue;
    if (bridge && Math.hypot(x - bridge.x, z - bridge.z) < RIVER_BANK.bridgeKeep - 2) continue;
    const ends = endFade(q, river); if (ends <= 0) continue;
    const y = p.getY(i), above = y - river.level, inner = Math.max(0, Math.min(1, (q.curv * q.side - .004) / .03)), f = fordS !== undefined ? fordMask(q, fordS) : 0;
    const mud = Math.max(0, 1 - Math.max(0, above - .05) / .55) * Math.max(0, 1 - Math.max(0, q.d - RIVER_BANK.edge - 1.2) / 2.2) * (1 - f * .85) * ends;
    const patch = vn2(x * .32, z * .32), edgeN = (vn2(x * .9 + 7, z * .9) - .5) * 1.6; // manchas e borda irregular: sem faixa reta
    const gravel = ends * Math.max(.18, inner, Math.min(1, f * 1.6)) * (.45 + .75 * patch) * Math.max(0, Math.min(1, 1 - (q.d - RIVER_BANK.edge - .2 + edgeN) / 3.6)) * (1 - mud * .5);
    const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453, nz = h - Math.floor(h);
    let r = c.getX(i), g = c.getY(i), b = c.getZ(i);
    if (gravel > 0) { const k = Math.min(1, gravel) * (.7 + nz * .3), wet = Math.max(0, Math.min(1, (.12 - above) / .35)), gr = .41 - wet * .17, gg = .38 - wet * .15, gb = .32 - wet * .13; r += (gr - r) * k; g += (gg - g) * k; b += (gb - b) * k; } // cascalho escurece ao entrar na água
    if (mud > 0) { const k = Math.min(1, mud) * .85; r += (.12 - r) * k; g += (.1 - g) * k; b += (.07 - b) * k; }
    c.setXYZ(i, r, g, b); n++;
  }
  c.needsUpdate = true; return n;
}
