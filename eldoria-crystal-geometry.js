/**
 * MOD 291 — Cristais facetados (sem cones): prisma hexagonal levemente afunilado com terminação piramidal
 * de seis faces e ponta deslocada, como selenita/quartzo reais (referência: cristais de Naica e a imagem do
 * criador com aglomerados azuis ao longo do túnel). Mesma convenção do CylinderGeometry: altura 1, centrado
 * em y=0, raio 1 na base. flatShading revela as facetas; cor por vértice escurece a base e clareia a ponta.
 */
export function crystalPrismData({ sides = 6, tip = .26, taper = .82, lean = .08, seed = 1 } = {}) {
  const r = (k) => { const v = Math.sin(seed * 91.7 + k * 37.3) * 43758.5453; return v - Math.floor(v); };
  const pos = [], col = [], body = 1 - tip, y0 = -.5, y1 = y0 + body, yt = .5;
  const ring = (y, rad) => { const out = []; for (let i = 0; i < sides; i++) { const a = i / sides * Math.PI * 2 + .3, j = .9 + r(i) * .2; out.push([Math.cos(a) * rad * j, y, Math.sin(a) * rad * j]); } return out; };
  const bottom = ring(y0, 1), top = ring(y1, taper), apex = [lean * (r(9) - .5) * 2, yt, lean * (r(11) - .5) * 2];
  const shade = y => { const t = (y - y0) / (yt - y0); return [.55 + .45 * t, .6 + .4 * t, .7 + .3 * t]; };
  const tri = (a, b, c) => { pos.push(...a, ...b, ...c); col.push(...shade(a[1]), ...shade(b[1]), ...shade(c[1])); };
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    tri(bottom[i], top[i], bottom[j]); tri(bottom[j], top[i], top[j]);   // faces do prisma
    tri(top[i], apex, top[j]);                                            // terminação piramidal
    tri(bottom[j], [0, y0, 0], bottom[i]);                                // base
  }
  return { positions: new Float32Array(pos), colors: new Float32Array(col) };
}
export function crystalPrismGeometry(THREE, opts = {}) {
  const d = crystalPrismData(opts), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(d.positions, 3)); g.setAttribute('color', new THREE.BufferAttribute(d.colors, 3));
  g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}

/** Aglomerado: um prisma-mestre e satélites inclinados saindo da mesma base (uma geometria só). */
export function crystalClusterGeometry(THREE, { count = 7, seed = 3 } = {}) {
  const r = (k) => { const v = Math.sin(seed * 12.9 + k * 78.2) * 43758.5453; return v - Math.floor(v); };
  const parts = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    const main = i === 0, h = main ? 1 : .35 + r(i) * .55, w = main ? .22 : .08 + r(i + 20) * .1;
    const a = r(i + 40) * Math.PI * 2, tilt = main ? r(5) * .15 : .25 + r(i + 60) * .6, off = main ? 0 : .08 + r(i + 80) * .22;
    const g = crystalPrismGeometry(THREE, { seed: seed * 10 + i, tip: .22 + r(i + 90) * .12 });
    e.set(Math.cos(a) * tilt, r(i + 7) * 3, Math.sin(a) * tilt); q.setFromEuler(e);
    const up = new THREE.Vector3(0, h * .5, 0).applyQuaternion(q);
    m.compose(new THREE.Vector3(Math.cos(a) * off + up.x, up.y - .02, Math.sin(a) * off + up.z), q, new THREE.Vector3(w, h, w));
    g.applyMatrix4(m); parts.push(g);
  }
  const pos = [], col = [];
  for (const g of parts) { pos.push(...g.attributes.position.array); col.push(...g.attributes.color.array); g.dispose(); }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeVertexNormals(); out.computeBoundingSphere(); return out;
}

/** Validação pura usada nos testes: a seção transversal do corpo tem `sides` vértices e a ponta é única. */
export function crystalProfile(positions) {
  const ys = new Map();
  for (let i = 1; i < positions.length; i += 3) { const y = Math.round(positions[i] * 1000) / 1000; ys.set(y, (ys.get(y) || 0) + 1); }
  const levels = [...ys.keys()].sort((a, b) => a - b);
  return { levels: levels.length, minY: levels[0], maxY: levels[levels.length - 1], triangles: positions.length / 9 };
}
