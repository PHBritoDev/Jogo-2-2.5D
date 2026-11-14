/**
 * Renascimento de Eldória — Fase 2: fachadas e sinais de vida (THREE). O plano e a auditoria dos GLBs ficam em
 * eldoria-city-facades.js. Duas malhas: madeira/terra/ferro (jardineiras, lenha, postes, tabuleta) e roupas no varal
 * (balançam com o vento no vertex shader, sem objeto por peça).
 */
import { planFacadeDetails } from './eldoria-city-facades.js';
import { builder, WOOD_D, SOIL } from './eldoria-city-plaza3d.js';

const LEAF = [.25, .36, .16], LEAF_D = [.18, .27, .12], BARK = [.3, .22, .15], CUT = [.62, .5, .34];
const CLOTH = [[.62, .57, .48], [.48, .52, .55], [.55, .38, .3], [.66, .63, .55], [.4, .44, .36]];

function addDetail(b, p, ground) {
  const y0 = ground(p.x, p.z), r = p.rot || 0, c = Math.cos(r), s = Math.sin(r), L = (lx, lz) => [p.x + lx * c + lz * s, p.z - lx * s + lz * c];
  if (p.kind === 'trough') { // jardineira de tábuas ao lado da porta: ervas e poucas flores
    b.box(p.x, y0 + .16, p.z, .5, .16, .16, r, WOOD_D); b.box(p.x, y0 + .325, p.z, .46, .012, .13, r, SOIL, 1, 1);
    const n = p.sparse ? 3 : 5;
    for (let i = 0; i < n; i++) { const lx = -.36 + i * (.72 / Math.max(1, n - 1)), [x, z] = L(lx, (i % 2 - .5) * .08), h = .14 + ((i * 37) % 5) * .035;
      b.box(x, y0 + .33 + h / 2, z, .06, h / 2, .015, r + i, i % 2 ? LEAF : LEAF_D, 1.05, .9); b.box(x, y0 + .33 + h / 2, z, .015, h / 2, .06, r + i, LEAF_D, 1.05, .9);
      if (!p.sparse && i % 2 === 0) b.box(x, y0 + .34 + h, z, .03, .025, .03, r, i % 4 ? [.78, .66, .2] : [.62, .2, .18], 1.1, 1); }
  } else if (p.kind === 'firewood') { // pilha de lenha encostada na parede (lado do corte à vista)
    for (let row = 0; row < 4; row++) for (let i = 0; i < 6 - (row > 2 ? 1 : 0); i++) { const rad = .075 + ((i * 7 + row * 3) % 4) * .008, lx = -.45 + i * .18 + (row % 2) * .09, y = .08 + row * .145, [x, z] = L(lx, 0);
      b.box(x, y0 + y, z, rad * .92, rad * .92, .55, r, BARK, .95, .85); const [fx, fz] = L(lx, .555); b.box(fx, y0 + y, fz, rad * .82, rad * .82, .006, r, CUT, 1, 1); }
    { const [x, z] = L(-.85, .25); b.box(x, y0 + .22, z, .2, .22, .2, r, BARK); } // cepo de rachar
  } else if (p.kind === 'post') { b.box(p.x, y0 + 1.05, p.z, .06, 1.05, .06, 0, WOOD_D); b.box(p.x, y0 + 2.05, p.z, .28, .03, .03, p.rot || 0, WOOD_D);
  }
}

export function buildCityFacades(THREE, { scene, ground, obstacles = null, lowSpec = false }) {
  const group = new THREE.Group(); group.name = 'fachadas-eldoria-renascimento'; scene.add(group);
  const plan = planFacadeDetails(), wood = builder(false), cloth = { pos: [], col: [], sway: [] };
  for (const p of plan) {
    if (p.kind !== 'clothesline') { addDetail(wood, p, ground); continue; }
    const L = Math.hypot(p.bx - p.ax, p.bz - p.az), ux = (p.bx - p.ax) / L, uz = (p.bz - p.az) / L, ya = ground(p.ax, p.az), yb = ground(p.bx, p.bz);
    for (const [x, z] of [[p.ax, p.az], [p.bx, p.bz]]) addDetail(wood, { kind: 'post', x, z, rot: Math.atan2(-uz, ux) + Math.PI / 2 }, ground);
    // corda com barriga (catenária aproximada)
    const segs = 8, rope = .028, P = t => { const x = p.ax + ux * L * t, z = p.az + uz * L * t; return [x, ya + (yb - ya) * t + 2.02 - Math.sin(Math.PI * t) * .22, z]; };
    for (let i = 0; i < segs; i++) { const a = P(i / segs), b = P((i + 1) / segs); wood.quad([a[0], a[1], a[2]], [b[0], b[1], b[2]], [b[0], b[1] - rope, b[2]], [a[0], a[1] - rope, a[2]], [.32, .28, .22]); }
    // roupas: lençol remendado, camisas, pano de prato — cores lavadas e desbotadas
    const items = [[.16, .62, .5, 0], [.36, .4, .45, 1], [.55, .7, .58, 2], [.74, .34, .3, 3], [.86, .44, .32, 4]];
    for (const [t, w, h, ci] of items) { const top = P(t), x0 = top[0] - ux * w / 2, z0 = top[2] - uz * w / 2, x1 = top[0] + ux * w / 2, z1 = top[2] + uz * w / 2, y = top[1] - .02, C = CLOTH[ci];
      const v = [[x0, y, z0], [x1, y, z1], [x1, y - h, z1], [x0, y - h, z0]]; cloth.pos.push(...v[0], ...v[1], ...v[2], ...v[0], ...v[2], ...v[3]);
      for (let k = 0; k < 6; k++) cloth.col.push(...C); cloth.sway.push(0, 0, 1, 0, 1, 1);
      if (ci === 0) { const px = top[0] + ux * .08, pz = top[2] + uz * .08, pw = .12, ph = .14, py = y - .22; // remendo
        const q = [[px - ux * pw, py, pz - uz * pw], [px + ux * pw, py, pz + uz * pw], [px + ux * pw, py - ph, pz + uz * pw], [px - ux * pw, py - ph, pz - uz * pw]];
        cloth.pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]); for (let k = 0; k < 6; k++) cloth.col.push(.45, .35, .26); cloth.sway.push(.35, .35, .6, .35, .6, .6); } }
  }
  if (obstacles) for (const p of plan) {
    if (p.kind === 'firewood') obstacles.push({ x: p.x, z: p.z, shape: 'circle', radius: .6, height: .75, facade: true });
    if (p.kind === 'clothesline') for (const [x, z] of [[p.ax, p.az], [p.bx, p.bz]]) obstacles.push({ x, z, shape: 'circle', radius: .14, height: 2.1, facade: true });
  }
  const woodMesh = new THREE.Mesh(wood.geometry(THREE), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0 })); woodMesh.name = 'fachadas-madeira'; woodMesh.castShadow = !lowSpec; woodMesh.receiveShadow = true; group.add(woodMesh);
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cloth.pos, 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(cloth.col, 3)); cg.setAttribute('aSway', new THREE.Float32BufferAttribute(cloth.sway, 1)); cg.computeVertexNormals(); cg.computeBoundingSphere();
  const clothMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide }), uT = { value: 0 };
  clothMat.onBeforeCompile = sh => { sh.uniforms.uClothT = uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSway; uniform float uClothT;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat ph = position.x * 1.7 + position.z * 1.3; transformed.x += sin(uClothT * 2.1 + ph) * .07 * aSway; transformed.z += cos(uClothT * 1.7 + ph) * .06 * aSway;'); };
  clothMat.customProgramCacheKey = () => 'f2-varal';
  const clothMesh = new THREE.Mesh(cg, clothMat); clothMesh.name = 'fachadas-varal'; clothMesh.castShadow = !lowSpec; group.add(clothMesh);
  return { group, stats: { details: plan.length, woodTris: wood.count, clothTris: cloth.pos.length / 9 }, holders: [], lights: [], update(t) { uT.value = t; } };
}
