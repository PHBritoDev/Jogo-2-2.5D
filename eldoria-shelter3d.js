/**
 * Mod 317 — Abrigos de Eldória: plataforma ritual circular AUTORAL em pedra antiga (inspiração só de categoria: altar
 * circular com degraus e pilares; nenhuma malha, textura ou composição de referência comercial é usada).
 *
 *  - Dois anéis de lajes (degraus reais de 0,22 m, caminháveis por todos os lados) feitos de blocos em cunha com juntas,
 *    leve desnível e quinas gastas; centro ABERTO com uma marchetaria de bronze esverdeado em anel e um disco gravado
 *    (textura de canvas gerada por código: círculos concêntricos e traços — nada copiado).
 *  - Quatro pilares de pedra (um partido), com musgo nas faces de cima e na base (cor por vértice, sem textura nova).
 *  - Ativo: o anel de bronze acende em azul-ciano suave e respira; registro faz uma onda curta.
 *  - Colisão (eldoria-walkable): anel do degrau 1, disco do degrau 2, pilares sólidos — nada de caixa invisível.
 * Custo: 3 malhas mescladas por abrigo (pedra, bronze, disco gravado), materiais compartilhados entre abrigos.
 */
const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
export const SHELTER = Object.freeze({ r1: 3.35, r2: 2.35, step: .22, pillarR: 2.95, pillarH: 2.75, centerR: 1.25 });

let shared = null;
function sharedMaterials(THREE) {
  if (shared) return shared;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#7d7a6e'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(40,36,30,.65)'; g.lineWidth = 3;
  for (const r of [118, 92, 64, 30]) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 64, 128 + Math.sin(a) * 64); g.lineTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); g.stroke(); }
  for (let k = 0; k < 24; k++) { const a = (k + .5) / 24 * Math.PI * 2; g.beginPath(); g.arc(128 + Math.cos(a) * 105, 128 + Math.sin(a) * 105, 4 + (k % 3), 0, Math.PI * 2); g.stroke(); }
  g.lineWidth = 2; g.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI * 2 - Math.PI / 2; const x = 128 + Math.cos(a) * 44, y = 128 + Math.sin(a) * 44; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  shared = {
    stone: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93, metalness: 0 }),
    inlay: new THREE.MeshStandardMaterial({ map: tex, roughness: .88, metalness: 0, color: 0xcfcab8 }),
  };
  return shared;
}
/** Bloco em cunha (setor de anel) com quinas levemente rebaixadas. */
function wedge(THREE, r0, r1, a0, a1, y0, y1, seed) {
  const pos = [], seg = 4, inset = .025;
  const P = (r, a, y) => [Math.sin(a) * r, y, Math.cos(a) * r];
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  for (let i = 0; i < seg; i++) {
    const aa = a0 + (a1 - a0) * i / seg + inset * (i === 0), ab = a0 + (a1 - a0) * (i + 1) / seg - inset * (i === seg - 1);
    const t0 = y1 - (hash(seed, i) * .012), t1 = y1 - (hash(seed, i + 1) * .012);
    const A = P(r0 + inset, aa, t0), B = P(r1 - inset, aa, t0), C = P(r1 - inset, ab, t1), D = P(r0 + inset, ab, t1);
    tri(A, B, C); tri(A, C, D); // topo
    const Ab = P(r1, aa, y0), Bb = P(r1, ab, y0); tri(B, Ab, Bb); tri(B, Bb, C); // face externa (degrau)
    if (r0 > .01) { const Ai = P(r0, aa, y0), Di = P(r0, ab, y0); tri(A, D, Di); tri(A, Di, Ai); }
  }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.computeVertexNormals(); return out;
}
function merge(THREE, list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  for (const g of list) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.color) C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('color', new THREE.BufferAttribute(C, 3)); return m;
}
/** Cor de pedra antiga com musgo onde a face olha para cima e perto do chão. */
function paint(THREE, g, seed, mossK) {
  const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const up = Math.max(0, n.getY(i)), base = .5 + .08 * hash(seed, i % 7), low = Math.max(0, 1 - p.getY(i) / .5);
    const moss = Math.min(1, mossK * (up * .55 + low * .5) * (.4 + .6 * hash(seed + 3, Math.floor(p.getX(i) * 3) + Math.floor(p.getZ(i) * 3) * 17)));
    c[i * 3] = base * (1 - moss) + .26 * moss; c[i * 3 + 1] = base * .97 * (1 - moss) + .36 * moss; c[i * 3 + 2] = base * .9 * (1 - moss) + .18 * moss;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}

/** Monta um abrigo em (x, y, z). walk = eldoria-walkable (createWalkables). Devolve { group, setActive(on), pulse(), update(t) }. */
export function buildShelter(THREE, { x, y, z, yaw = 0, seed = 1, walk = null, lowSpec = false } = {}) {
  const M = sharedMaterials(THREE), S = SHELTER, group = new THREE.Group(); group.position.set(x, y, z); group.rotation.y = yaw; group.name = 'abrigo-ritual-mod317';
  const parts = [];
  const nB1 = lowSpec ? 16 : 22, nB2 = lowSpec ? 12 : 16;
  for (let i = 0; i < nB1; i++) { const a0 = i / nB1 * Math.PI * 2, a1 = (i + 1) / nB1 * Math.PI * 2; parts.push(paint(THREE, wedge(THREE, S.r2 - .05, S.r1, a0, a1, -.25, S.step, seed * 50 + i), seed + i, .9)); }
  for (let i = 0; i < nB2; i++) { const a0 = i / nB2 * Math.PI * 2 + .1, a1 = (i + 1) / nB2 * Math.PI * 2 + .1; parts.push(paint(THREE, wedge(THREE, S.centerR + .02, S.r2, a0, a1, S.step - .05, S.step * 2, seed * 70 + i), seed + 40 + i, .45)); }
  // pilares: base larga, fuste com anéis, capitel; um deles partido e inclinado
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2 + (hash(seed, k) - .5) * .12, px = Math.sin(a) * S.pillarR, pz = Math.cos(a) * S.pillarR, broken = k === (seed % 4);
    const h = broken ? S.pillarH * .46 : S.pillarH * (.92 + hash(seed, k + 9) * .1);
    const pieces = [[.72, .3, .72, .15], [.52, h - .62, .52, .3 + (h - .62) / 2], [.66, .22, .66, h - .2], [.58, .14, .58, h - .02]];
    if (broken) pieces.length = 2;
    for (const [w, hh, d, cy] of pieces) { const b = new THREE.BoxGeometry(w, hh, d, 2, Math.max(1, Math.round(hh / .5)), 2); const P = b.attributes.position;
      for (let i = 0; i < P.count; i++) { const n = (hash(i, k * 13 + seed) - .5) * .03; P.setXYZ(i, P.getX(i) + n, P.getY(i) + cy + S.step, P.getZ(i) + n); }
      if (broken) b.rotateZ(.06); b.rotateY(a); b.translate(px, 0, pz); const nb = b.toNonIndexed(); b.dispose(); nb.computeVertexNormals(); parts.push(paint(THREE, nb, seed + 90 + k, 1.1)); }
    if (walk) walk.addPillar(x + Math.sin(a + yaw) * S.pillarR, z + Math.cos(a + yaw) * S.pillarR, .42, y - 1, y + h + .4, 'abrigo-pilar');
  }
  const stone = new THREE.Mesh(merge(THREE, parts), M.stone); stone.castShadow = !lowSpec; stone.receiveShadow = true; group.add(stone);
  // marchetaria central (aberta, pisável): disco gravado + anel de bronze patinado
  const disc = new THREE.Mesh(new THREE.CircleGeometry(S.centerR, 40), M.inlay); disc.rotation.x = -Math.PI / 2; disc.position.y = S.step * 2 - .045; disc.receiveShadow = true; group.add(disc);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x5f8a7c, metalness: .55, roughness: .42, emissive: 0x3fd0e0, emissiveIntensity: 0 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(S.centerR + .06, .05, 6, 56), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = S.step * 2 - .02; group.add(ring);
  const outer = new THREE.Mesh(new THREE.TorusGeometry(S.r2 - .02, .035, 5, 64), ringMat); outer.rotation.x = Math.PI / 2; outer.position.y = S.step * 2 - .02; group.add(outer);
  if (walk) { walk.addRing(x, z, S.r2, S.r1, y + S.step, 'abrigo-degrau1'); walk.addRing(x, z, 0, S.r2, y + S.step * 2, 'abrigo-degrau2'); }
  let active = false, pulseT = -1;
  return {
    group, center: { x, z, y: y + S.step * 2 },
    setActive(on) { active = !!on; },
    pulse() { pulseT = 0; },
    update(t, dt = 1 / 60) {
      let e = active ? .55 + .25 * Math.sin(t * 1.6) : 0;
      if (pulseT >= 0) { pulseT += dt; e += Math.max(0, 2.2 * (1 - pulseT / 1.4)); if (pulseT > 1.4) pulseT = -1; }
      ringMat.emissiveIntensity = e;
    },
  };
}
