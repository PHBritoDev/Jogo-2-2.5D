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

/**
 * Mod 292 — estruturas CAMINHÁVEIS nas árvores ancestrais: anel de deque em volta dos dois troncos, plataforma da
 * casa da árvore (com a casa do criador em cima), escada em "U" com patamar e a passarela suspensa do criador entre
 * os dois anéis, cruzando por cima da rua principal (pilar central fora da rua). Cada peça tem suporte físico
 * (pilares até o chão ou escoras no tronco), guarda-corpo e superfície de colisão registrada em `walk`.
 */
export function mountCityDressing(THREE, GLTFLoader, o) {
  const { group, groundHeightAt, center, plots, structures, lamps = [], isFree, lowSpec = false, obstacles = [], walk = null, fetchModel = null } = o;
  const root = new THREE.Group(); root.name = 'EldoriaCityDressing-mod292'; group.add(root);
  const woodMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 });
  const P = structures, parts = [], wood = [0x8a6a44, 0x7a5c3a, 0x93734a], railC = 0x6a4e32, dark = 0x5e4630;
  const base = Math.max(groundHeightAt(P.ringM.cx, P.ringM.cz), groundHeightAt(P.ringS.cx, P.ringS.cz)), Y = base + P.deck;
  // pilares só bloqueiam ABAIXO do piso que sustentam (no deque o jogador passa por cima deles)
  const post = (x, z, y0, y1, r = .2, block = true) => { parts.push({ x, y: (y0 + y1) / 2, z, sx: r * 2, sy: y1 - y0, sz: r * 2, color: dark }); if (block) { if (walk) walk.addPillar(x, z, r + .12, y0 - 1, y1 - .7, 'pilar'); else obstacles.push({ x, z, radius: r + .12, height: y1 - y0 }); } };
  const beam = (a, b, y, t = .16, h = .14, color = railC) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); parts.push({ x: (a[0] + b[0]) / 2, y, z: (a[1] + b[1]) / 2, sx: L, sy: h, sz: t, ry: -Math.atan2(dz, dx), color }); };
  /** Guarda-corpo reto: balaústres a cada ~1,1 m + corrimão + travessa; registra a parede caminhável. */
  const railing = (a, b, y, yb = y) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 1.1));
    for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, yy = yb + (y - yb) * t; parts.push({ x, y: yy + .5, z, sx: .11, sy: 1, sz: .11, color: dark }); }
    if (Math.abs(y - yb) < .01) { beam(a, b, y + .98, .1, .1); beam(a, b, y + .5, .07, .07); }
    else { // corrimão inclinado (escada)
      const dx = b[0] - a[0], dz = b[1] - a[1], Lh = Math.hypot(dx, dz), dy = y - yb, Ls = Math.hypot(Lh, dy);
      for (const h of [.98, .5]) parts.push({ x: (a[0] + b[0]) / 2, y: (y + yb) / 2 + h, z: (a[1] + b[1]) / 2, sx: Ls, sy: .09, sz: .09, ry: -Math.atan2(dz, dx), rz: Math.atan2(dy, Lh), color: railC, order: 'YZ' });
    }
    if (walk) { const segs = Math.abs(y - yb) < .01 ? 1 : 4; for (let i = 0; i < segs; i++) { const t0 = i / segs, t1 = (i + 1) / segs, p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1]; walk.addWall(p0, p1, yb + (y - yb) * t0, yb + (y - yb) * t1 + 1.05); } }
  };
  // --- anéis em volta dos troncos -------------------------------------------------------------------------
  const ringOpen = (ring, pts) => pts.map(([x, z, half]) => { const a = Math.atan2(z - ring.cz, x - ring.cx), r = Math.hypot(x - ring.cx, z - ring.cz) || ring.r1; const h = Math.asin(Math.min(1, half / r)) + .05; return [a - h, a + h]; });
  const insidePlat = (x, z) => Math.abs(x - P.plat.cx) <= P.plat.hx && Math.abs(z - P.plat.cz) <= P.plat.hz;
  const platArc = (() => { const out = []; let a0 = null; for (let i = 0; i <= 360; i++) { const a = -Math.PI + i / 360 * Math.PI * 2, x = P.ringS.cx + Math.cos(a) * (P.ringS.r1 - .12), z = P.ringS.cz + Math.sin(a) * (P.ringS.r1 - .12), inn = insidePlat(x, z); if (inn && a0 === null) a0 = a; if (!inn && a0 !== null) { out.push([a0 - .03, a + .03]); a0 = null; } } if (a0 !== null) out.push([a0, Math.PI]); return out; })();
  // aberturas do guarda-corpo: os trechos do círculo que caem DENTRO da faixa da passarela (onde ela cruza o anel)
  const wa = P.walkway.a, wb = P.walkway.b, wl = Math.hypot(wb[0] - wa[0], wb[1] - wa[1]), wux = (wb[0] - wa[0]) / wl, wuz = (wb[1] - wa[1]) / wl;
  const inWalkway = (x, z) => { const ax = x - wa[0], az = z - wa[1], along = ax * wux + az * wuz, side = -ax * wuz + az * wux; return along > -1.5 && along < wl + 1.5 && Math.abs(side) < P.walkway.w / 2 + .25; };
  const arcInside = (ring, pred) => { const out = []; let a0 = null; const R = ring.r1 - .12; for (let i = 0; i <= 720; i++) { const a = -Math.PI + i / 720 * Math.PI * 2, inn = pred(ring.cx + Math.cos(a) * R, ring.cz + Math.sin(a) * R); if (inn && a0 === null) a0 = a; if (!inn && a0 !== null) { out.push([a0 - .02, a + .02]); a0 = null; } } if (a0 !== null) out.push([a0, Math.PI]); return out; };
  const rings = [[P.ringM, arcInside(P.ringM, inWalkway), 0], [P.ringS, arcInside(P.ringS, inWalkway).concat(platArc), 1]];
  const angIn = (a, [a0, a1]) => { const n = v => Math.atan2(Math.sin(v), Math.cos(v)); a = n(a); a0 = n(a0); a1 = n(a1); return a0 <= a1 ? a >= a0 && a <= a1 : a >= a0 || a <= a1; };
  for (const [ring, open, seed] of rings) {
    const N = Math.round(2 * Math.PI * ring.r1 / .62), w = ring.r1 - ring.r0, mid = (ring.r0 + ring.r1) / 2;
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2;
      parts.push({ x: ring.cx + Math.cos(a) * mid, y: Y - .08, z: ring.cz + Math.sin(a) * mid, sx: w + .1, sy: .16, sz: 2 * Math.PI * mid / N * 1.04, ry: -a, color: wood[(i + seed) % 3] });
      if (i % 3 === 0) { // escora do tronco até a borda externa (suporte físico do deque)
        const r0 = ring.r0 - .15, r1 = ring.r1 - .35, ya = Y - 3.4, yb = Y - .2, hor = r1 - r0, L = Math.hypot(hor, yb - ya);
        parts.push({ x: ring.cx + Math.cos(a) * (r0 + r1) / 2, y: (ya + yb) / 2, z: ring.cz + Math.sin(a) * (r0 + r1) / 2, sx: L, sy: .2, sz: .2, ry: -a, rz: Math.atan2(yb - ya, hor), color: dark, order: 'YZ' });
        parts.push({ x: ring.cx + Math.cos(a) * (ring.r0 + .1), y: Y - .45, z: ring.cz + Math.sin(a) * (ring.r0 + .1), sx: .34, sy: .5, sz: .34, color: dark });
      }
      // guarda-corpo externo (fora das aberturas)
      const a1 = (i + 1) / N * Math.PI * 2, am = (a + a1) / 2;
      if (!open.some(r => angIn(am, r))) {
        const R = ring.r1 - .12; parts.push({ x: ring.cx + Math.cos(a) * R, y: Y + .5, z: ring.cz + Math.sin(a) * R, sx: .11, sy: 1, sz: .11, color: dark });
        for (const h of [.98, .5]) parts.push({ x: ring.cx + Math.cos(am) * R, y: Y + h, z: ring.cz + Math.sin(am) * R, sx: h > .9 ? .1 : .07, sy: h > .9 ? .1 : .07, sz: 2 * R * Math.sin((a1 - a) / 2) + .08, ry: -am, color: railC });
      }
    }
    if (walk) { walk.addRing(ring.cx, ring.cz, ring.r0, ring.r1, Y, 'anel'); walk.addPillar(ring.cx, ring.cz, ring.r0 + .05, Y - .2, Y + 4, 'tronco'); walk.addArcWall(ring.cx, ring.cz, ring.r1 - .12, Y, Y + 1.05, open, 'guarda-corpo anel'); }
  }
  // --- plataforma da casa da árvore ------------------------------------------------------------------------
  const pl = P.plat, x0 = pl.cx - pl.hx, x1 = pl.cx + pl.hx, z0 = pl.cz - pl.hz, z1 = pl.cz + pl.hz;
  for (let k = 0, x = x0 + .3; x < x1; x += .6, k++) parts.push({ x, y: Y - .08, z: pl.cz, sx: .58, sy: .16, sz: pl.hz * 2, color: wood[k % 3] });
  for (const z of [z0 + .2, pl.cz, z1 - .2]) beam([x0, z], [x1, z], Y - .3, .22, .3, dark); // vigas
  for (const [px, pz] of [[x0 + 1.5, z1 - .2], [x1 - .25, z1 - .2], [x1 - .25, pl.cz], [x0 + .25, pl.cz - 1.4]]) post(px, pz, groundHeightAt(px, pz) - .2, Y - .1, .2);
  const stairTop = P.stair[2].b, sw = P.stair[2].w;
  railing([x0, z1], [x1, z1], Y); railing([x1, z1], [x1, z0], Y);
  railing([x0, z1], [x0, stairTop[1] + sw / 2 + .05], Y); railing([x0, stairTop[1] - sw / 2 - .05], [x0, z0], Y);
  // borda norte: guarda-corpo só fora do anel
  { const dz = pl.cz - pl.hz - P.ringS.cz, half = Math.sqrt(Math.max(0, (P.ringS.r1 - .1) ** 2 - dz * dz)); const xa = P.ringS.cx - half, xb = P.ringS.cx + half; if (xa > x0) railing([x0, z0], [xa, z0], Y); if (xb < x1) railing([xb, z0], [x1, z0], Y); }
  if (walk) walk.addRect(pl.cx, pl.cz, pl.hx, pl.hz, Y, 'plataforma');
  // --- escada em U com patamar -----------------------------------------------------------------------------
  P.stair.forEach((seg, si) => {
    const [ax, az, ay] = seg.a, [bx, bz, by] = seg.b, dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, px = -uz, pz = ux, hw = seg.w / 2;
    // alturas do plano (0 → deque) reinterpretadas a partir do CHÃO no pé da escada: o 1º degrau nasce no chão
    const g0 = groundHeightAt(P.stair[0].a[0], P.stair[0].a[1]), ya = g0 + ay / P.deck * (Y - g0), yb = g0 + by / P.deck * (Y - g0);
    if (seg.kind === 'flight') {
      const n = Math.max(4, Math.round(Math.abs(yb - ya) / .2)), run = L / n, rise = (yb - ya) / n;
      for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = ax + dx * t, z = az + dz * t; parts.push({ x, y: ya + rise * (i + 1) - .06, z, sx: run + .06, sy: .12, sz: seg.w, ry: -Math.atan2(dz, dx), color: wood[i % 3] }); }
      for (const sd of [-1, 1]) { const Ls = Math.hypot(L, yb - ya); parts.push({ x: (ax + bx) / 2 + px * sd * (hw + .06), y: (ya + yb) / 2 - .1, z: (az + bz) / 2 + pz * sd * (hw + .06), sx: Ls, sy: .32, sz: .12, ry: -Math.atan2(dz, dx), rz: Math.atan2(yb - ya, L), color: dark, order: 'YZ' }); }
      if (walk) walk.addSpan([ax, az], [bx, bz], seg.w, ya, yb, 'lance' + si, true);
      // corrimão externo de cada lance (o do meio fica entre os lances)
      const outer = si === 0 ? 1 : -1; railing([ax + px * outer * (hw + .1), az + pz * outer * (hw + .1)], [bx + px * outer * (hw + .1), bz + pz * outer * (hw + .1)], yb, ya);
      if (si === 0) { const mz = (az + P.stair[2].a[1]) / 2; railing([ax, mz], [bx, mz], yb, ya); }
    } else {
      parts.push({ x: (ax + bx) / 2, y: ya - .08, z: (az + bz) / 2, sx: L, sy: .16, sz: seg.w, ry: -Math.atan2(dz, dx), color: wood[1] });
      for (const sd of [-1, 1]) { post(ax + px * sd * (hw - .15), az + pz * sd * (hw - .15), groundHeightAt(ax, az) - .2, ya - .1, .17); }
      if (walk) walk.addSpan([ax, az], [bx, bz], seg.w, ya, ya, 'patamar', false);
      railing([ax + px * hw, az + pz * hw], [ax - px * hw, az - pz * hw], ya);
      railing([ax + px * hw, az + pz * hw], [bx + px * hw, bz + pz * hw], ya); railing([ax - px * hw, az - pz * hw], [bx - px * hw, bz - pz * hw], ya);
    }
  });
  // pilar sob o fim do 1º lance (apoio do patamar e do 2º lance)
  { const g0 = groundHeightAt(P.stair[0].a[0], P.stair[0].a[1]); post(P.stair[0].b[0] + .2, P.stair[0].a[1] + .7, g0 - .2, (g0 + Y) / 2 - .1, .15); }
  const deckMesh = new THREE.Mesh(merge(THREE, parts), woodMat); deckMesh.castShadow = !lowSpec; deckMesh.receiveShadow = true; deckMesh.name = 'eldoria-tree-structures'; root.add(deckMesh);
  // --- casa da árvore: casa do criador sobre a plataforma, porta para a chegada da escada --------------------
  const H = P.house;
  if (fetchModel) fetchModel(H.file).then(asset => {
    if (!asset) return; const k = H.size / Math.max(asset.size.x, asset.size.y, asset.size.z), m = asset.src.clone(true);
    m.scale.setScalar(k); m.position.set(-asset.centerPoint.x * k, -asset.bottom * k, -asset.centerPoint.z * k);
    const g = new THREE.Group(); g.add(m); g.position.set(H.x, Y, H.z); g.rotation.y = Math.atan2(H.door[0], H.door[1]); g.name = 'EldoriaTreeHouse';
    g.traverse(c => { if (c.isMesh) { c.castShadow = !lowSpec; c.receiveShadow = true; } }); root.add(g);
    if (walk) { const hx = asset.size.z * k / 2 + .1, hz = asset.size.x * k / 2 + .1; walk.addWall([H.x - hx, H.z - hz], [H.x + hx, H.z - hz], Y, Y + 4, 'casa'); walk.addWall([H.x + hx, H.z - hz], [H.x + hx, H.z + hz], Y, Y + 4, 'casa'); walk.addWall([H.x + hx, H.z + hz], [H.x - hx, H.z + hz], Y, Y + 4, 'casa'); walk.addWall([H.x - hx, H.z + hz], [H.x - hx, H.z - hz], Y, Y + 4, 'casa'); }
  });
  // --- passarela suspensa do criador entre os anéis -----------------------------------------------------------
  const A = P.walkway.a, B = P.walkway.b, dxw = B[0] - A[0], dzw = B[1] - A[1], Lw = Math.hypot(dxw, dzw), ux = dxw / Lw, uz = dzw / Lw, pxw = -uz, pzw = ux;
  if (walk) {
    walk.addSpan(A, B, P.walkway.w, Y, Y, 'passarela');
    // corrimãos só no trecho FORA dos anéis (dentro do anel o guarda-corpo é o do próprio anel, aberto na passagem)
    const outR = (x, z) => Math.hypot(x - P.ringS.cx, z - P.ringS.cz) > P.ringS.r1 - .1 && Math.hypot(x - P.ringM.cx, z - P.ringM.cz) > P.ringM.r1 - .1;
    let t0 = 0, t1 = 1; while (t0 < 1 && !outR(A[0] + dxw * t0, A[1] + dzw * t0)) t0 += .005; while (t1 > 0 && !outR(A[0] + dxw * t1, A[1] + dzw * t1)) t1 -= .005;
    for (const sd of [-1, 1]) { const o = P.walkway.w / 2 + .05; walk.addWall([A[0] + dxw * t0 + pxw * sd * o, A[1] + dzw * t0 + pzw * sd * o], [A[0] + dxw * t1 + pxw * sd * o, A[1] + dzw * t1 + pzw * sd * o], Y, Y + 1.05, 'corrimão passarela'); }
  }
  new GLTFLoader().load('./PassarelaSuspensaEldoria.glb', g => {
    const src = g.scene, bb = new THREE.Box3().setFromObject(src), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    const half = Lw / 2, k = (half + 1.1) / Math.max(.01, sz.x), ky = Math.min(k, 3.2 / Math.max(.01, sz.y)), kw = Math.min(k, (P.walkway.w + .9) / Math.max(.01, sz.z));
    const cx = (A[0] + B[0]) / 2, cz = (A[1] + B[1]) / 2, yaw = Math.atan2(-uz, ux), y = Y + .02;
    for (const sgn of [-1, 1]) {
      const m = src.clone(true); m.scale.set(k, ky, kw); m.position.set(-c.x * k, -bb.min.y * ky, -c.z * kw);
      m.traverse(x => { if (x.isMesh) { x.castShadow = !lowSpec; x.receiveShadow = true; } });
      const w = new THREE.Group(); w.add(m); w.position.set(cx + ux * sgn * (half - 1.1) / 2, y, cz + uz * sgn * (half - 1.1) / 2); w.rotation.y = yaw; root.add(w);
    }
    const gy = groundHeightAt(cx, cz), Hh = y - gy, pp = [];
    for (const sd of [-1, 1]) {
      pp.push({ x: cx + pxw * sd * 1.05, y: gy + Hh / 2, z: cz + pzw * sd * 1.05, sx: .34, sy: Hh, sz: .34, color: dark });
      pp.push({ x: cx + pxw * sd * 1.05, y: gy + Hh * .45, z: cz + pzw * sd * 1.05, sx: .14, sy: Hh * .9, sz: .14, rx: .35 * sd, ry: yaw, color: dark });
    }
    for (const t of [.35, .7]) pp.push({ x: cx, y: gy + Hh * t, z: cz, sx: 2.4, sy: .16, sz: .16, ry: yaw + Math.PI / 2, color: railC });
    pp.push({ x: cx, y: y - .1, z: cz, sx: 2.9, sy: .22, sz: 2.4, ry: yaw, color: wood[0] });
    for (let q = -1; q <= 1; q++) pp.push({ x: cx + ux * q * .5, y: y + .06, z: cz + uz * q * .5, sx: .46, sy: .07, sz: 2.2, ry: yaw, color: wood[(q + 3) % 3] });
    const pylon = new THREE.Mesh(merge(THREE, pp), woodMat); pylon.castShadow = !lowSpec; pylon.receiveShadow = true; pylon.name = 'eldoria-walkway-pylon'; root.add(pylon);
    if (walk) walk.addPillar(cx, cz, 1.45, gy - 1, y - .8, 'pilar da passarela'); else obstacles.push({ x: cx, z: cz, radius: 1.45, height: Hh });
    root.userData.walkway = { span: +Lw.toFixed(1), spans: 2, scale: +k.toFixed(2), stretch: +(k / kw).toFixed(2), deck: +Y.toFixed(2), walkable: !!walk, pylon: [+cx.toFixed(1), +cz.toFixed(1)] };
    if (typeof window !== 'undefined') window.EldoriaCityDressingQA = { ...root.userData.walkway, surfaces: walk ? walk.surfaces.length : 0, walls: walk ? walk.walls.length : 0 };
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
  return { root, plan, deckY: Y };
}
