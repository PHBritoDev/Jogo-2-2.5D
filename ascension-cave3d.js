/**
 * Mod 311 — caverna da fronteira (zona interna). Malhas geradas das MESMAS funções de colisão (ascension-layout.js):
 * o contorno da rocha é a isolinha caveField = 0; o herói anda onde caveWalk diz; piso e abóbada vêm de caveFloor/caveCeil.
 *
 * Direção de arte (referências 2 e 3): salão vertical escuro com abismo e ponte natural; gruta verde-azulada com poças
 * luminosas, névoa e feixes frios; acentos violeta por emissivo nos cristais (sem dezenas de luzes). Quatro luzes no total.
 */
import { CAVE, CHASM_RIM, caveField, caveWalk, caveFloor, caveCeil, inChasm, onBridge, caveHazard, caveLedgeEdge, hash2, fbm } from './ascension-layout.js';
import { boulderGeometry } from './eldoria-prologue-meadow.js';
import { caveRoofAt, caveFloorVisual, buildCaveSurface, shadeCaveSurface, makeGridSDF } from './ascension-cave-sdf.js';
import { CAVE_KEYS, SHAFT_COLORS, moodAt, easeEnv, caveAudioAt } from './ascension-cave-light.js';
import { CAVE_SHAFTS, caveRockMaterial, calciteMaterial, smoothNormals, speleoGeometry, planCurtains, curtainSamples, curtainGeometry, poolGeometry, poolMaterial } from './ascension-cave-look.js';
import { triplanarRock, ensureUv, vortexPortal, lightShaft, dustField, disposeGroup } from './ascension-fx3d.js';
import { prepareTorchSource, placeTorches } from './eldoria-torches3d.js';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// C2: abóbada, piso visual e o campo 3D da rocha vivem em ascension-cave-sdf.js (puro; também roda no Web Worker).
export { caveRoofAt, caveFloorVisual };
let gridSdf = null, gridSolid = null; // campo 3D da malha nova (quando pronto); antes disso, a regra antiga da folha de altura
/** Câmera: sólido fora do volume, acima da abóbada ou abaixo do piso. */
export function caveCamSolid(x, y, z) {
  // Raio de câmera com pequena folga; não tratar o ar dos abismos como parede.
  if (gridSolid) { if (gridSolid(x, y, z, .6)) return true; } // C2: o mesmo campo 3D que desenha paredes e abóbada
  else { if (caveField(x, z) < .55) return true; if (y > caveRoofAt(x, z) - .65) return true; } // folga do enquadramento
  if (y < caveFloor(x, z) - .35 && !caveHazard(x, z)) return true;
  for (const p of CAVE.pillars) if (Math.hypot(x - p.x, z - p.z) < p.r + .15) return true;
  return false;
}

export function buildCave(THREE, { GLTFLoader, prepareBaked, lowSpec = false, origin = { x: 0, z: 0 } } = {}) {
  const group = new THREE.Group(); group.name = 'caverna-fronteira'; group.position.set(origin.x, 0, origin.z); group.visible = false;
  const updaters = [];
  let torchSet = null;
  // ---------- piso + abóbada: duas folhas sobre a mesma grade (vértices com jitter para quebrar a grade) ----------
  const cell = lowSpec ? 1.35 : 1, X0 = -82, X1 = 76, Z0 = -160, Z1 = 16; // Mod 316: grade cobre a prisão (leste) e o salão de cristal (noroeste)
  const nx = Math.ceil((X1 - X0) / cell) + 1, nz = Math.ceil((Z1 - Z0) / cell) + 1;
  const fieldAt = new Float32Array(nx * nz), jx = new Float32Array(nx * nz), jz = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = i + j * nx, x = X0 + i * cell, z = Z0 + j * cell;
    jx[k] = (hash2(i, j, 903) - .5) * cell * .55; jz[k] = (hash2(i, j, 904) - .5) * cell * .55;
    fieldAt[k] = caveField(x + jx[k], z + jz[k]);
  }
  function sheet(heightFn, colorFn, flipUp) {
    const pos = [], col = [], idx = [], map = new Int32Array(nx * nz).fill(-1);
    const need = k => fieldAt[k] > -2.2;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = i + j * nx, b = a + 1, c = a + nx, d = c + 1;
      if (!(need(a) || need(b) || need(c) || need(d))) continue;
      for (const k of [a, b, c, d]) if (map[k] < 0) {
        const x = X0 + (k % nx) * cell + jx[k], z = Z0 + Math.floor(k / nx) * cell + jz[k], y = heightFn(x, z, fieldAt[k]);
        map[k] = pos.length / 3; pos.push(x, y, z); const cc = colorFn(x, y, z, fieldAt[k]); col.push(cc[0], cc[1], cc[2]);
      }
      if (flipUp) idx.push(map[a], map[c], map[b], map[b], map[c], map[d]); else idx.push(map[a], map[b], map[c], map[b], map[d], map[c]);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    g.computeVertexNormals(); return ensureUv(THREE, g); // C3: indexada, normais suaves (sem facetas de "low poly")
  }
  // luz "assada" nas cores de vértice (rebatimento barato): feixes, poças e portal tingem rocha e piso ao redor
  const BAKE = [
    [-7, -6, -52, [.35, .75, .85], 16], [9, -6, -66, [.25, .6, .75], 12], [-45, -7.6, -60, [.2, .85, .78], 18], [-40, -7.6, -66, [.15, .7, .65], 12],
    [CAVE.portal.x, CAVE.portal.h - 1.6, CAVE.portal.z + 1, [.6, .35, 1.0], 18], [-6, -1.6, -128, [.3, .55, .8], 10], [0, 0, 12, [.55, .6, .45], 12], [0, -5, -90, [.18, .45, .55], 14],
  ];
  const bake = (x, y, z) => { let r = 0, g = 0, b = 0; for (const [bx, by, bz, c, R] of BAKE) { const d = Math.hypot(x - bx, (y - by) * .7, z - bz), k = Math.max(0, 1 - d / R); const w = k * k; r += c[0] * w; g += c[1] * w; b += c[2] * w; } return [r, g, b]; };
  // cores: rocha fria (teal muito escuro) com musgo-água perto das poças e lodo claro nas trilhas
  const floorCol = (x, y, z, f) => {
    const k = fbm(x * .12, z * .12, 905, 3), wet = Math.max(0, ...CAVE.pools.map(p => smooth(p.r + 7, p.r, Math.hypot(x - p.x, z - p.z))));
    const deep = smooth(-4, -30, y - caveFloor(x, z));
    let r = .5 + .2 * k, g = .48 + .18 * k, b = .44 + .15 * k; // C3: calcário neutro-quente; a luz da câmara dá a cor
    const foot = .5 + .5 * smooth(-.2, 2.6, f); r *= foot; g *= foot; b *= foot; // sombra de contato no pé da parede
    r = r * (1 - wet * .45) + .05 * wet; g = g * (1 - wet * .2) + .2 * wet; b = b * (1 - wet * .2) + .21 * wet;
    const dk = 1 - deep * .85, L = bake(x, y, z); return [(r + L[0] * .55) * dk, (g + L[1] * .55) * dk, (b + L[2] * .55) * dk];
  };
  const roofCol = (x, y, z, f) => {
    const k = fbm(x * .09, y * .09 + z * .05, 906, 3), hgt = smooth(0, 30, y - caveFloor(x, z));
    const v = .52 + .26 * k - hgt * .16, L = bake(x, y, z), rim = .08 * (1 - hgt); return [v + L[0] * .7 + rim * .3, v * .97 + L[1] * .7 + rim * .6, v * .92 + L[2] * .7 + rim * .65]; // C3: calcário, não teal
  };
  const floor = new THREE.Mesh(sheet((x, z) => caveFloorVisual(x, z), floorCol, true), null);
  const roof = new THREE.Mesh(sheet((x, z) => caveRoofAt(x, z), roofCol, false), null);
  floor.name = 'caverna-piso'; roof.name = 'caverna-abobada';
  const rockMat = triplanarRock(THREE, { key: 'caverna', scale: .085, tint: 1.25 }); rockMat.side = THREE.DoubleSide; // entulho e pedras soltas (facetadas)
  // C3: um programa só para paredes, abóbada, piso, ponte, pilares e lábio do abismo (estratos, umidade, musgo, relevo)
  const caveMat = caveRockMaterial(THREE, { origin, scale: .085, tint: 1.25, shaftColors: SHAFT_COLORS, shaftGlow: 1.1 }); caveMat.side = THREE.DoubleSide;
  const floorMat = caveRockMaterial(THREE, { origin, floor: true, scale: .11, tint: 1.2, roughness: .8, shaftColors: SHAFT_COLORS, shaftGlow: 1.6 }); floorMat.side = THREE.DoubleSide;
  const calcMat = calciteMaterial(THREE);
  const tpMats = [rockMat, caveMat, floorMat];
  floor.material = floorMat; roof.material = caveMat; floor.receiveShadow = roof.receiveShadow = true; group.add(floor, roof);
  // ---------- C2: paredes e abóbada em volume 3D (Surface Nets sobre o SDF), gerado num Web Worker ----------
  // A folha antiga fica como reserva até a malha nova chegar (ou para sempre com ?caverna=0 / sem Worker).
  const sdfOff = typeof location !== 'undefined' && /[?&]caverna=0\b/.test(location.search);
  const sdfStats = { on: false, ms: 0, tris: 0, via: 'off' };
  const adoptSurface = r => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(r.positions, 3)); g.setIndex(new THREE.BufferAttribute(r.indices, 1));
    if (!r.normals) Object.assign(r, shadeCaveSurface(r)); // via thread principal: mesmo sombreamento do Worker
    const P = r.positions, cc = new Float32Array(P.length);
    for (let i = 0; i < P.length; i += 3) { const c = roofCol(P[i], P[i + 1], P[i + 2]), a = r.ao[i / 3]; cc[i] = c[0] * a; cc[i + 1] = c[1] * a; cc[i + 2] = c[2] * a; }
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); g.setAttribute('normal', new THREE.BufferAttribute(r.normals, 3)); ensureUv(THREE, g); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, caveMat); m.name = 'caverna-rocha-3d'; m.receiveShadow = true; group.add(m);
    roof.visible = false; group.remove(roof); roof.geometry.dispose();
    gridSdf = makeGridSDF(r.columns); gridSolid = (x, y, z, pad = .5) => gridSdf(x, y, z) > -pad; Object.assign(sdfStats, { on: true, ms: Math.round(r.ms), tris: r.indices.length / 3 });
    buildHanging(); // C3: estalactites e cortinas assentam no teto REAL do volume 3D
  };
  const sdfReady = sdfOff ? Promise.resolve().then(() => buildHanging()) : new Promise(res => {
    const cell = lowSpec ? 1.6 : 1, local = () => { try { adoptSurface(buildCaveSurface({ cell })); sdfStats.via = 'principal'; } catch (e) { console.warn('C2: malha 3D da caverna falhou; fica a folha antiga', e); buildHanging(); } res(); };
    let w = null; try { w = typeof Worker !== 'undefined' ? new Worker(new URL('./ascension-cave-sdf.worker.js', import.meta.url), { type: 'module' }) : null; } catch (e) { w = null; }
    if (!w) { setTimeout(local, 0); return; }
    const t = setTimeout(() => { w.terminate(); local(); }, 15000);
    w.onmessage = e => { clearTimeout(t); w.terminate(); if (e.data && e.data.ok) { adoptSurface(e.data.r); sdfStats.via = 'worker'; res(); } else local(); };
    w.onerror = () => { clearTimeout(t); w.terminate(); local(); };
    w.postMessage({ cell });
  });
  // fundo do abismo: breu (o nevoeiro do abismo faz o resto)
  const pit = new THREE.Mesh(new THREE.CircleGeometry(22, 24), new THREE.MeshBasicMaterial({ color: 0x000203, fog: false }));
  pit.rotation.x = -Math.PI / 2; pit.position.set(CAVE.chasm.x, -36, CAVE.chasm.z); group.add(pit);
  // CAVERNA C1 — lábio do abismo: pedras meio enterradas na borda (com vãos), na mesma rocha triplanar; colisão em
  // CHASM_RIM (ascension-layout.js). Uma malha só.
  {
    const geos = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    CHASM_RIM.forEach((p, i) => { const g = boulderGeometry(THREE, 70 + (i % 5), lowSpec ? 1 : 2), y = caveFloor(p.x, p.z);
      e.set((hash2(i, 3, 9) - .5) * .4, hash2(i, 5, 9) * 6.28, (hash2(i, 7, 9) - .5) * .4); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(p.x, y - p.h * .35, p.z), q, new THREE.Vector3(p.r * 1.25, p.h * 1.4, p.r)); g.applyMatrix4(m4); geos.push(g.index ? g.toNonIndexed() : g); });
    if (geos.length) { const rg = smoothNormals(THREE, mergeGeos(THREE, geos), .02); rg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(rg.attributes.position.count * 3).fill(.62), 3)); ensureUv(THREE, rg); const rim = new THREE.Mesh(rg, caveMat); rim.name = 'caverna-labio-abismo'; rim.receiveShadow = true; group.add(rim); }
  }
  // ---------- CAVERNA C5 — lábio do mirante: pedras na borda alta (com vãos), para a queda ler como borda e não como
  // parede invisível. A faixa íngreme em volta do patamar não é caminhável (caveLedgeEdge).
  {
    const geos = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let n = 0;
    for (const k of CAVE.corridors.filter(c => c.ledge)) {
      const L = Math.hypot(k.b[0] - k.a[0], k.b[1] - k.a[1]), tx = (k.b[0] - k.a[0]) / L, tz = (k.b[1] - k.a[1]) / L;
      for (let t = .12; t <= 1.12; t += .045) for (const side of [-1, 1]) {
        const cx = k.a[0] + tx * L * Math.min(1, t), cz = k.a[1] + tz * L * Math.min(1, t), ox = t > 1 ? tx : -tz * side, oz = t > 1 ? tz : tx * side;
        let x = cx, z = cz, found = false; for (let d = 1; d < 4.5; d += .2) { x = cx + ox * d; z = cz + oz * d; if (caveLedgeEdge(x, z)) { found = true; break; } }
        if (!found || caveField(x, z) < .9 || hash2(n++, 5, 961) < .28) continue;
        const y = k.fa + (k.fb - k.fa) * Math.min(1, t), r = .26 + .26 * hash2(n, 7, 961), h = .25 + .3 * hash2(n, 9, 961);
        const g = boulderGeometry(THREE, 90 + (n % 5), lowSpec ? 1 : 2); e.set((hash2(n, 3, 9) - .5) * .4, hash2(n, 5, 9) * 6.28, (hash2(n, 7, 9) - .5) * .4); q.setFromEuler(e);
        m4.compose(new THREE.Vector3(x - ox * .25, y - h * .3, z - oz * .25), q, new THREE.Vector3(r * 1.25, h * 1.4, r)); g.applyMatrix4(m4); geos.push(g.index ? g.toNonIndexed() : g);
      }
    }
    if (geos.length) { const rg = smoothNormals(THREE, mergeGeos(THREE, geos), .02); rg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(rg.attributes.position.count * 3).fill(.6), 3)); ensureUv(THREE, rg); const rim = new THREE.Mesh(rg, caveMat); rim.name = 'caverna-labio-mirante'; group.add(rim); }
  }
  // ---------- ponte natural de pedra sobre o abismo ----------
  {
    const B = CAVE.bridge, segs = 34, ring = 14, pos = [], idx = [];
    const ax = B.a[0], az = B.a[1], bx = B.b[0], bz = B.b[1], L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs, cx = ax + (bx - ax) * t, cz = az + (bz - az) * t, top = caveFloor(cx, cz) - .02;
      const thick = 1.3 + 7 * Math.pow(Math.abs(t - .5) * 2, 3), half = B.r + .55 + .9 * Math.pow(Math.abs(t - .5) * 2, 2);
      for (let r = 0; r < ring; r++) {
        const a = r / ring * Math.PI * 2, sx = Math.cos(a), sy = Math.sin(a);
        let ox = sx * half, oy = sy > 0 ? sy * .18 : sy * thick;
        const n = (fbm(cx * .5 + r, cz * .5, 907, 2) - .5) * (sy > 0 ? .12 : .9);
        ox += sx * n; oy += sy < 0 ? -Math.abs(n) : 0;
        pos.push(cx - tz * ox, top + oy, cz + tx * ox);
      }
    }
    for (let s = 0; s < segs; s++) for (let r = 0; r < ring; r++) { const a = s * ring + r, b = s * ring + (r + 1) % ring, c = a + ring, d = b + ring; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const cc = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < cc.length; i += 3) { const y = pos[i + 1] - caveFloor(pos[i], pos[i + 2]), k = (.5 + .14 * hash2(i, 1, 908)) * (y > -.3 ? 1 : .55 + .45 * smooth(-6, -.3, y)); cc[i] = k; cc[i + 1] = k * .97; cc[i + 2] = k * .92; } // C3: ventre da ponte na sombra
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); ensureUv(THREE, g);
    const bridge = new THREE.Mesh(g, caveMat); bridge.name = 'ponte-natural'; bridge.receiveShadow = true; group.add(bridge);
  }
  // ---------- pilares (estalagmite + estalactite fundidas) ----------
  {
    const geos = [];
    for (const p of CAVE.pillars) {
      const y0 = caveFloor(p.x, p.z) - .4, y1 = caveRoofAt(p.x, p.z) + 1.5, h = y1 - y0, pts = [];
      for (let k = 0; k <= 12; k++) { const t = k / 12, waist = 1 - .45 * Math.sin(t * Math.PI) ** 1.5; pts.push(new THREE.Vector2(p.r * waist * (1 + .25 * Math.sin(t * 9 + p.x)) * (t < .08 ? 1.6 - t * 7 : 1) * (t > .92 ? 1 + (t - .92) * 9 : 1), t * h)); }
      const g = new THREE.LatheGeometry(pts, lowSpec ? 9 : 13); const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), n = 1 + .22 * (fbm(x * .7 + p.x, y * .35, 909, 2) - .5) * 2; P.setXYZ(i, p.x + x * n, y0 + y, p.z + z * n); }
      geos.push(g.toNonIndexed());
    }
    const g = smoothNormals(THREE, mergeGeos(THREE, geos), .02);
    const cc = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < cc.length; i += 3) { const k = .5 + .16 * hash2(Math.round(g.attributes.position.array[i + 1] * 2), 2, 910); cc[i] = k; cc[i + 1] = k * .97; cc[i + 2] = k * .92; }
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); ensureUv(THREE, g);
    const m = new THREE.Mesh(g, caveMat); m.name = 'pilares'; group.add(m);
  }
  // ---------- C3: espeleotemas (calcita) ----------
  // Estalagmites: só fora do caminho (caveWalk falso). Estalactites e cortinas: penduradas do teto REAL do volume 3D
  // (marcha no campo da C2), com a ponta sempre ≥ 2,9 m acima do piso onde se anda. Sem SDF (?caverna=0), usa a folha.
  const ceilAt = (x, z) => { const top = caveRoofAt(x, z); if (!gridSdf) return top;
    const fl = caveFloor(x, z); for (let y = fl + 2.4; y < top + 4; y += .3) if (gridSdf(x, y, z) > 0) return y; return top; };
  const speleoStats = { tites: 0, mites: 0, curtains: 0, minClear: 99 }; // minClear: menor vão ponta→piso onde se anda
  const placeInst = (geo, mat, list, name) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(), cc = new Float32Array(list.length * 3);
    list.forEach((s, n) => { o.position.set(s.x, s.y, s.z); o.rotation.set((hash2(n, 5, 915) - .5) * .12, hash2(n, 3, 915) * 6.28, (hash2(n, 6, 915) - .5) * .12); o.scale.set(s.r, s.L, s.r); o.updateMatrix(); im.setMatrixAt(n, o.matrix);
      const k = .62 + .3 * hash2(n, 4, 916); cc[n * 3] = k; cc[n * 3 + 1] = k * .96; cc[n * 3 + 2] = k * .9; });
    im.instanceColor = new THREE.InstancedBufferAttribute(cc, 3); im.name = name; group.add(im); return im;
  };
  {
    const mites = [], nearPath = (x, z, r) => caveWalk(x, z) || [0, 1.57, 3.14, 4.71].some(a => caveWalk(x + Math.cos(a) * r, z + Math.sin(a) * r));
    // no pé da parede, meio engastadas na rocha (o raio não passa da linha onde se anda: caveField = 0,75)
    for (let j = 0; j < nz; j += 2) for (let i = 0; i < nx; i += 2) {
      const k = i + j * nx, f = fieldAt[k]; if (f < -.5 || f > .4 || hash2(i, j, 911) <= (lowSpec ? .72 : .6)) continue;
      const x = X0 + i * cell + jx[k], z = Z0 + j * cell + jz[k]; if (inChasm(x, z, 1.5)) continue;
      const L = .8 + 2.6 * hash2(i, j, 914), r = Math.max(.24, Math.min(.38 + .2 * L, .85 - f)); if (nearPath(x, z, r * .7)) continue;
      mites.push({ x, y: caveFloor(x, z) - .25, z, L, r });
      if (hash2(i, j, 917) > .5) { const a = hash2(i, j, 918) * 6.28, x2 = x + Math.cos(a) * .55, z2 = z + Math.sin(a) * .55, L2 = L * (.35 + .3 * hash2(i, j, 919)), r2 = .2 + .18 * L2;
        if (!nearPath(x2, z2, r2 * .7)) mites.push({ x: x2, y: caveFloor(x2, z2) - .2, z: z2, L: L2, r: r2 }); } // irmã menor
    }
    // na borda das poças (onde a água pinga do teto há séculos), dentro da faixa que já não se pisa
    CAVE.pools.forEach((p, q) => { const n = lowSpec ? 3 : 5; for (let m = 0; m < n; m++) { const a = hash2(q, m, 944) * 6.28, d = p.r - .1 + .35 * hash2(q, m, 945), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (caveWalk(x, z)) continue; const L = .5 + 1.3 * hash2(q, m, 946); mites.push({ x, y: caveFloorVisual(x, z) - .15, z, L, r: Math.min(.45, .2 + .16 * L) }); } });
    if (mites.length) placeInst(speleoGeometry(THREE, { down: false, radial: lowSpec ? 6 : 8, rings: lowSpec ? 4 : 6 }), calcMat, mites, 'estalagmites');
    speleoStats.mites = mites.length;
  }
  let hangingDone = false;
  function buildHanging() {
    if (hangingDone) return; hangingDone = true;
    const tites = [];
    for (let j = 0; j < nz; j += 2) for (let i = 0; i < nx; i += 2) {
      const k = i + j * nx, f = fieldAt[k]; if (f < .2) continue; const h = hash2(i, j, 911); if (h >= .16) continue;
      const x = X0 + i * cell + jx[k], z = Z0 + j * cell + jz[k], flo = caveFloor(x, z), top = ceilAt(x, z), room = top - flo; if (room < 6) continue;
      const maxL = room - 2.9, L = Math.min(maxL, (1.2 + 4.6 * hash2(i, j, 912)) * Math.min(1, room / 14)); if (L < .8) continue;
      tites.push({ x, y: top + .35, z, L, r: .16 + .1 * L * (.5 + hash2(i, j, 913)) }); if (caveWalk(x, z)) speleoStats.minClear = Math.min(speleoStats.minClear, top + .35 - L - flo);
      // cachos: 1–3 menores em volta (canudos e irmãs), como cresce a calcita
      const extra = Math.floor(hash2(i, j, 940) * (lowSpec ? 2 : 4));
      for (let q = 0; q < extra; q++) { const a = hash2(i + q, j, 941) * 6.28, d = .35 + .6 * hash2(i, j + q, 942), L2 = Math.min(maxL, L * (.2 + .45 * hash2(i, q, 943)));
        tites.push({ x: x + Math.cos(a) * d, y: top + .3, z: z + Math.sin(a) * d, L: L2, r: .07 + .07 * L2 }); }
    }
    if (tites.length) placeInst(speleoGeometry(THREE, { down: true, radial: lowSpec ? 6 : 8, rings: lowSpec ? 5 : 7 }), calcMat, tites, 'estalactites');
    const cs = curtainSamples(caveField, ceilAt, { step: lowSpec ? 2 : 1.5 }).filter(s => !inChasm(s.x, s.z, 1));
    const curtains = planCurtains(cs, { max: lowSpec ? 14 : 26 }); for (const c of curtains) if (caveWalk(c.x, c.z)) speleoStats.minClear = Math.min(speleoStats.minClear, c.top - c.L - caveFloor(c.x, c.z));
    if (curtains.length) { const cm = new THREE.Mesh(curtainGeometry(THREE, curtains, lowSpec ? { cols: 8, rows: 4 } : {}), calcMat); cm.name = 'cortinas-calcita'; group.add(cm); }
    Object.assign(speleoStats, { tites: tites.length, curtains: curtains.length });
  }
  // ---------- entulho das ramificações seladas (expansão futura) ----------
  {
    const ico = new THREE.IcosahedronGeometry(1, 1); { const P = ico.attributes.position; for (let i = 0; i < P.count; i++) { const n = .75 + .5 * hash2(i, 5, 917); P.setXYZ(i, P.getX(i) * n, P.getY(i) * n * .8, P.getZ(i) * n); } ico.computeVertexNormals(); }
    const list = []; for (const rb of CAVE.rubble) for (let q = 0; q < 14; q++) { const a = q * 2.4, d = rb.r * Math.sqrt(hash2(q, 6, 918)); const x = rb.x + Math.cos(a) * d, z = rb.z + Math.sin(a) * d; list.push({ x, z, s: .6 + 1.5 * hash2(q, 7, 919) * (1 - d / rb.r * .5), y: caveFloor(x, z) }); }
    const im = new THREE.InstancedMesh(ensureUv(THREE, ico), rockMat, list.length), o = new THREE.Object3D(), cc = new Float32Array(list.length * 3);
    list.forEach((s, n) => { o.position.set(s.x, s.y + s.s * .3, s.z); o.rotation.set(hash2(n, 8, 920) * 3, hash2(n, 9, 921) * 6, 0); o.scale.setScalar(s.s); o.updateMatrix(); im.setMatrixAt(n, o.matrix); const k = .5 + .2 * hash2(n, 10, 922); cc[n * 3] = cc[n * 3 + 1] = k; cc[n * 3 + 2] = k * 1.05; });
    im.instanceColor = new THREE.InstancedBufferAttribute(cc, 3); im.name = 'entulho-selado'; group.add(im);
  }
  // ---------- C3: poças com profundidade (bug 4): bacia real, absorção, Fresnel, brilho só onde a fresta toca ----------
  const waterU = { uTime: { value: 0 } };
  { const wm = poolMaterial(THREE, { origin, time: waterU.uTime });
    for (const p of CAVE.pools) { const y = caveFloor(p.x, p.z) - .32;
      const m = new THREE.Mesh(poolGeometry(THREE, p, y, caveFloorVisual, lowSpec ? { rings: 5, segs: 28 } : {}), wm);
      m.position.set(p.x, y, p.z); m.renderOrder = 2; m.name = 'poca'; group.add(m); } }
  // ---------- feixes de luz fria das frestas do teto, poeira e névoa ----------
  const shafts = [];
  const addShaft = (x, z, tilt, I, w, color = 0xa8ecff) => {
    const top = caveRoofAt(x, z) + 1, bot = caveFloor(x, z), H = top - bot + 1;
    const s = lightShaft(THREE, { top: .9 * w, bottom: 3.2 * w, height: H, color, intensity: I * 1.6 }); // C4: cor da câmara, feixe mais presente (plano cinematográfico) s.mesh.position.set(x, top, z); s.mesh.rotation.z = tilt; group.add(s.mesh); shafts.push(s);
    const sky = new THREE.Mesh(new THREE.CircleGeometry(1.1 * w, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), .5), fog: false })); sky.rotation.x = Math.PI / 2; sky.position.set(x, top - .15, z); group.add(sky);
  };
  CAVE_SHAFTS.forEach(([x, z, tilt, I, w], i) => addShaft(x, z, tilt, I, w, SHAFT_COLORS[i])); // salão, gruta, câmara final e (Mod 316) salão de cristal
  updaters.push(t => { for (const s of shafts) s.update(t); waterU.uTime.value = t; });
  const dust1 = dustField(THREE, { count: lowSpec ? 220 : 520, box: [50, 30, 50], center: [0, -6, -60], color: 0xffe2b0, size: 2 }) /* C4: poeira dourada no feixe do salão */, dust2 = dustField(THREE, { count: lowSpec ? 120 : 260, box: [34, 12, 30], center: [-42, -7.6, -62], color: 0x8ff7e0, size: 2.4 });
  group.add(dust1.points, dust2.points); updaters.push(t => { dust1.update(t); dust2.update(t); });
  // névoa baixa (gruta) e névoa subindo do abismo: cartões com ruído animado
  const mistMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uC: { value: new THREE.Color(0x7fd6d2) } }, transparent: true, depthWrite: false, fog: false,
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }',
    fragmentShader: `uniform float uTime; uniform vec3 uC; varying vec2 vUv; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
      void main(){ vec2 p = vW.xz * .09 + vec2(uTime * .03, uTime * .018); float m = n(p) * .6 + n(p * 2.3 - uTime * .02) * .4;
        float e = smoothstep(.5, .2, length(vUv - .5)); float d = clamp(length(vW - cameraPosition) / 6.0 - .2, 0.0, 1.0);
        gl_FragColor = vec4(uC, smoothstep(.45, .95, m) * e * d * .16); }`,
  });
  for (const [x, y, z, s] of [[-58, -3.3, -106, 30], [-42, -6.9, -62, 40], [-38, -6.6, -70, 22], [1, -9, -60, 34], [1, -15, -60, 30], [0, -5.2, -86, 18]]) { const q = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mistMat); q.rotation.x = -Math.PI / 2; q.position.set(x, y, z); q.renderOrder = 7; group.add(q); }
  updaters.push(t => { mistMat.uniforms.uTime.value = t; });
  // ---------- saída: luz do dia no fim do túnel de entrada ----------
  const daylight = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ color: 0xe8f4d8, fog: false })); daylight.position.set(0, 2, 15.5); daylight.rotation.y = Math.PI; group.add(daylight);
  const exitGlow = lightShaft(THREE, { top: 2.4, bottom: 3.4, height: 10, color: 0xf2f0d0, intensity: .22 }); exitGlow.mesh.rotation.x = Math.PI / 2; exitGlow.mesh.position.set(0, 2.2, 15.3); group.add(exitGlow.mesh); shafts.push(exitGlow);
  // ---------- CAVERNA C5 — fenda da serra: luz do dia no fim do túnel da Galeria Alta ----------
  { const E = CAVE.serraExit, dx = E.b[0] - E.a[0], dz = E.b[1] - E.a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, ex = E.b[0] + ux * 2.2, ez = E.b[1] + uz * 2.2, fy = caveFloor(E.b[0], E.b[1]);
    const day = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.2), new THREE.MeshBasicMaterial({ color: 0xcfd6bd, fog: false })); day.position.set(ex, fy + 2.2, ez); day.lookAt(E.a[0], fy + 2.2, E.a[1]); day.name = 'fenda-serra-luz'; group.add(day);
    const glow = lightShaft(THREE, { top: 1.6, bottom: 2.6, height: 8, color: 0xf6eccc, intensity: .2 }); glow.mesh.position.set(ex, fy + 2.2, ez); glow.mesh.lookAt(E.a[0], fy + 2.2, E.a[1]); glow.mesh.rotateX(Math.PI / 2); group.add(glow.mesh); shafts.push(glow); }
  // ---------- CAVERNA C5 — relíquias dos desvios (cofre de bronze que brilha até ser aberto, padrão do Posto do Vigia) ----------
  const relics = CAVE.relics.map(R => { const h = new THREE.Group(), bronze = new THREE.MeshStandardMaterial({ color: 0x6f6040, metalness: .55, roughness: .5, emissive: 0xffc870, emissiveIntensity: .2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(.62, .34, .42), bronze); body.position.y = .17; h.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, .62, 10, 1, false, 0, Math.PI), bronze); lid.rotation.z = Math.PI / 2; lid.position.y = .34; h.add(lid);
    h.position.set(R.x, caveFloor(R.x, R.z) + .02, R.z); h.rotation.y = hash2(R.x | 0, R.z | 0, 971) * 6.28; h.name = 'reliquia-' + R.id; group.add(h);
    let opened = false; return { ...R, setOpened(v) { opened = !!v; if (opened) { lid.rotation.x = -1.1; lid.position.z = -.12; bronze.emissiveIntensity = 0; } }, get opened() { return opened; }, pulse(t) { if (!opened) bronze.emissiveIntensity = .18 + .14 * Math.sin(t * 2.1); } }; });
  updaters.push(t => { for (const r of relics) r.pulse(t); });
  // ---------- câmara do portal: degraus de pedra em anel, menires e o vórtice ----------
  const P = CAVE.portal, portalY = caveFloor(P.x, P.z) + P.h + .2;
  const portal = vortexPortal(THREE, { radius: P.r, lowSpec }); portal.group.position.set(P.x, portalY, P.z); group.add(portal.group);
  {
    const frame = new THREE.TorusGeometry(P.r + .55, .55, 8, lowSpec ? 30 : 48); const F = frame.attributes.position;
    for (let i = 0; i < F.count; i++) { const x = F.getX(i), y = F.getY(i), z = F.getZ(i), n = 1 + .2 * (hash2(i, 11, 923) - .5); F.setXYZ(i, x * (1 + .03 * (n - 1)), y * (1 + .03 * (n - 1)), z * n); }
    frame.computeVertexNormals();
    const fm = new THREE.Mesh(ensureUv(THREE, frame), triplanarRock(THREE, { key: 'moldura', scale: .3, emissive: 0x0c0618 })); tpMats.push(fm.material);
    const cc = new Float32Array(F.count * 3).fill(.42); frame.setAttribute('color', new THREE.BufferAttribute(cc, 3)); fm.position.copy(portal.group.position); group.add(fm);
    // pés do arco até o chão
    for (const sx of [-1, 1]) { const leg = new THREE.Mesh(ensureUv(THREE, new THREE.CylinderGeometry(.55, .95, P.h - P.r + .9, 7)), fm.material); leg.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(leg.geometry.attributes.position.count * 3).fill(.4), 3)); leg.position.set(P.x + sx * (P.r + .3), caveFloor(P.x, P.z) + (P.h - P.r + .9) / 2 - .2, P.z); group.add(leg); }
    // menires em círculo (fora do caminho de chegada)
    const stoneGeo = ensureUv(THREE, new THREE.BoxGeometry(1, 1, 1, 2, 4, 2)); { const S = stoneGeo.attributes.position; for (let i = 0; i < S.count; i++) { const y = S.getY(i); S.setX(i, S.getX(i) * (1 - y * .35) + (hash2(i, 12, 924) - .5) * .12); S.setZ(i, S.getZ(i) * (1 - y * .35)); } stoneGeo.computeVertexNormals(); stoneGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(S.count * 3).fill(.5), 3)); }
    for (let q = 0; q < 7; q++) { const a = -Math.PI * .1 + q / 6 * Math.PI * 1.2 + Math.PI, R = 11.5; const x = P.x + Math.sin(a) * R, z = P.z - 2 + Math.cos(a) * R; if (!caveWalk(x, z) && caveField(x, z) < .5) continue; const h = 3 + 2.4 * hash2(q, 13, 925); const st = new THREE.Mesh(stoneGeo, fm.material); st.scale.set(1.3, h, .9); st.position.set(x, caveFloor(x, z) + h / 2 - .3, z); st.rotation.y = a + .3 * hash2(q, 14, 926); st.userData.menir = { x, z, r: .9 }; group.add(st); }
  }
  const menires = []; group.traverse(o => { if (o.userData.menir) menires.push(o.userData.menir); });
  updaters.push((t, dt) => portal.update(dt));
  // ---------- luzes (4, todas via orçamento de luzes do jogo) ----------
  // ---------- C4: luzes de cena por câmara (fontes do orçamento de 4 luzes do jogo; ver ascension-cave-light.js) ----------
  const L = CAVE_KEYS.map(([c, i, d, pos, why]) => { const l = new THREE.PointLight(c, i, d, 1.6);
    if (pos) l.position.set(pos[0], caveFloor(pos[0], pos[2]) + pos[1], pos[2]); else l.position.set(P.x, portalY, P.z + 2.5);
    l.name = 'caverna-luz'; l.userData.why = why; l.layers.set(31); group.add(l); return { l, base: i }; });
  const Lp = L[3], Lg = L[2], Lc = L[6];
  updaters.push(t => { Lp.l.intensity = Lp.base * (1 + .12 * Math.sin(t * 2.3)); Lg.l.intensity = Lg.base * (1 + .06 * Math.sin(t * 1.1)); Lc.l.intensity = Lc.base * (1 + .08 * Math.sin(t * .7) * Math.sin(t * 1.9)); });
  // ---------- cristais: poucos GLB "herói" em fendas + aglomerados procedurais leves (emissivo violeta/azul) ----------
  const crystalSpots = [[-66, -94, 2.3, .5], [-47, -97, 1.6, 2.2], [-71, -112, 2, 4], [-55, -122, 1.4, 1], [-24.5, -49, 1.6, .3], [22.5, -60, 1.9, 2.4], [-52, -55, 1.3, 1.2], [-31, -75, 1.1, 4], [12.5, -130, 1.5, 2], [-20, -136, 1.7, .8], [5, -20, .9, 1.7], [31, -96, 1.1, 3.4]];
  const clusterGeo = (() => { // prismas hexagonais pontudos (≈80 triângulos)
    const parts = []; for (let q = 0; q < 6; q++) { const h = .7 + 1.4 * hash2(q, 15, 927), r = .07 + .06 * hash2(q, 16, 928); const g = new THREE.CylinderGeometry(0, r, h * .25, 6); g.translate(0, h * .5 + h * .125, 0); const b = new THREE.CylinderGeometry(r, r * .9, h, 6); b.translate(0, h * .5, 0); const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((hash2(q, 17, 929) - .5) * 1.1, q, (hash2(q, 18, 930) - .5) * 1.1)); parts.push(b.toNonIndexed().applyMatrix4(m), g.toNonIndexed().applyMatrix4(m)); }
    const g = mergeGeos(THREE, parts); g.computeVertexNormals(); return g; })();
  const clusterMat = new THREE.MeshStandardMaterial({ color: 0x8a7cff, emissive: 0x4b2fd6, emissiveIntensity: .55, roughness: .22, metalness: .15, flatShading: true });
  const clusters = []; for (let j = 0; j < nz; j += 3) for (let i = 0; i < nx; i += 3) { const k = i + j * nx, f = fieldAt[k]; if (f < -.1 || f > .7 || hash2(i, j, 931) > .32 || Math.hypot(X0 + i * cell, Z0 + j * cell) < 14) continue; const x = X0 + i * cell + jx[k], z = Z0 + j * cell + jz[k]; if (inChasm(x, z, 2)) continue; clusters.push({ x, z, s: .5 + .7 * hash2(i, j, 932), y: caveFloor(x, z) - .1 }); }
  { const im = new THREE.InstancedMesh(clusterGeo, clusterMat, clusters.length), o = new THREE.Object3D(); clusters.forEach((c, n) => { o.position.set(c.x, c.y, c.z); o.rotation.set((hash2(n, 19, 933) - .5) * .5, hash2(n, 20, 934) * 6.28, (hash2(n, 21, 935) - .5) * .5); o.scale.setScalar(c.s); o.updateMatrix(); im.setMatrixAt(n, o.matrix); }); const cc = new Float32Array(clusters.length * 3); clusters.forEach((c, n) => { const v = hash2(n, 22, 936); cc[n * 3] = .55 + .45 * v; cc[n * 3 + 1] = .6 + .2 * (1 - v); cc[n * 3 + 2] = 1; }); im.instanceColor = new THREE.InstancedBufferAttribute(cc, 3); im.name = 'cristais-veios'; group.add(im); }
  const env = moodAt(CAVE.spawn.x, CAVE.spawn.z); let lastP = null; // C4: o jogo lê env a cada quadro
  const propCull = []; // C3: GLBs pesados com distância de desenho
  const loader = GLTFLoader ? new GLTFLoader() : null;
  const readyAssets = new Promise(res => {
    if (!loader) { res(); return; }
    let left = 4;
    const done = () => { if (--left === 0) res(); };
    // Apenas três tochas 3D nos pontos de orientação. O fogo GLSL existente é reutilizado;
    // nenhuma haste/esfera procedural é criada e não se acrescentam point lights caras.
    // Mod 316: só o GLB do criador (sem haste/chama procedural); três pontos de orientação, luz contida (escuridão
    // intencional preservada nas galerias).
    loader.load('./TochaMedievalTripo.glb', gltf => {
      const source = prepareTorchSource(THREE, gltf.scene, { prepareBaked });
      const sites = [
        { x: 2.5, z: -12, why: 'recepção: saída reconhecível' },
        { x: -38, z: -62, why: 'gruta lateral, antes das poças' },
        { x: CAVE.portal.x + 10, z: CAVE.portal.z + 8, why: 'câmara final: orientação até o portal' },
        { x: CAVE.camp.x - 2.2, z: CAVE.camp.z + 2.4, why: 'prisão: a única tocha que os carcereiros deixaram' },
      ].filter(p => caveWalk(p.x, p.z) && !CAVE.pillars.some(q => Math.hypot(p.x - q.x, p.z - q.z) < q.r + 1)).map(p => ({ ...p, y: caveFloor(p.x, p.z) }));
      torchSet = placeTorches(THREE, group, source, sites, { namePrefix: 'TochaMedievalTripo-Caverna-', lightIntensity: .9, lightDistance: 9 });
      for (const h of torchSet.holders) { h.traverse(o => { if (o.isPointLight) o.layers.set(31); }); propCull.push({ o: h, x: h.position.x, z: h.position.z, r: 42 }); }
      done();
    }, undefined, done);
    // Mod 316 — câmara de ocupação: jaulas do ritual (GLB do criador) e restos de vigília (pedras frias, sem fogo).
    loader.load('./JaulaRitualAto1.glb', g => {
      prepareBaked && prepareBaked(g.scene); const box = new THREE.Box3().setFromObject(g.scene), sz = box.getSize(new THREE.Vector3()), k = 2.5 / Math.max(.001, sz.y), c = box.getCenter(new THREE.Vector3());
      for (const [n, cg] of CAVE.cages.entries()) { const h = new THREE.Group(), m = g.scene.clone(true); m.scale.setScalar(k); m.position.set(-c.x * k, -box.min.y * k, -c.z * k); h.add(m); h.position.set(cg.x, caveFloor(cg.x, cg.z) - .05, cg.z); h.rotation.y = cg.yaw; h.name = 'jaula-prisao-' + (n + 1); propCull.push({ o: h, x: cg.x, z: cg.z, r: 55 }); h.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } }); group.add(h); }
      done();
    }, undefined, done);
    {
      const C = CAVE.camp, ring = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.28, 0), rockMat, 9), o = new THREE.Object3D();
      for (let q = 0; q < 9; q++) { const a = q / 9 * Math.PI * 2; o.position.set(C.x + Math.cos(a) * .85, caveFloor(C.x, C.z) + .08, C.z + Math.sin(a) * .85); o.rotation.set(q, q * 1.7, 0); o.scale.set(1, .7, 1.2); o.updateMatrix(); ring.setMatrixAt(q, o.matrix); }
      ring.name = 'vigilia-fria'; group.add(ring);
      const ash = new THREE.Mesh(new THREE.CircleGeometry(.62, 14), new THREE.MeshStandardMaterial({ color: 0x1b1a19, roughness: 1 })); ash.rotation.x = -Math.PI / 2; ash.position.set(C.x, caveFloor(C.x, C.z) + .04, C.z); ash.name = 'cinzas'; group.add(ash);
    }
    loader.load('./MontanhaEldoria01.glb', g => { let mesh = null; g.scene.traverse(o => { if (!mesh && o.isMesh) mesh = o; }); prepareBaked && prepareBaked(g.scene); const tex = mesh && mesh.material.map; for (const m of tpMats) { m.map = tex; m.needsUpdate = true; } disposeGroup(g.scene, new Set([tex])); done(); }, undefined, done);
    loader.load('./CristalCaverna01.glb', g => {
      prepareBaked && prepareBaked(g.scene); let mesh = null; g.scene.traverse(o => { if (!mesh && o.isMesh) mesh = o; });
      if (mesh) { const mat = mesh.material; mat.emissive = new THREE.Color(0x7a52ff); mat.emissiveMap = mat.map; mat.emissiveIntensity = .9;
        const spots = lowSpec ? crystalSpots.slice(0, 4) : crystalSpots, o = new THREE.Object3D(), groups = [];
        // revisão C1–C5: um InstancedMesh por grupo de cristais próximos (≤ 25 m), cada um com distância de desenho.
        // Antes, no desktop, os 12 cristais-herói (~10 k triângulos cada) eram desenhados da caverna inteira.
        spots.forEach((sp, n) => { let g = groups.find(q => Math.hypot(q.x - sp[0], q.z - sp[1]) < 25); if (!g) { g = { x: sp[0], z: sp[1], list: [] }; groups.push(g); } g.list.push([sp, n]); });
        groups.forEach((g, gi) => { const im = new THREE.InstancedMesh(mesh.geometry, mat, g.list.length); let cx = 0, cz = 0;
          g.list.forEach(([[x, z, sc, yaw], n], k) => { o.position.set(x, caveFloor(x, z) + sc * .55 - .3, z); o.rotation.set((hash2(n, 23, 937) - .5) * .4, yaw, (hash2(n, 24, 938) - .5) * .4); o.scale.setScalar(sc); o.updateMatrix(); im.setMatrixAt(k, o.matrix); cx += x; cz += z; });
          im.name = 'cristais-heroi' + (gi ? '-' + gi : ''); group.add(im); propCull.push({ o: im, x: cx / g.list.length, z: cz / g.list.length, r: 62 }); }); }
      done();
    }, undefined, done);
  });
  const ready = Promise.all([readyAssets, sdfReady]);
  // ---------- colisão extra (menires/arco do portal/jaulas) ----------
  const cageBlock = CAVE.cages.map(c => ({ x: c.x, z: c.z, r: 1.35 }));
  const walk = (x, z) => caveWalk(x, z) && !menires.some(m => Math.hypot(x - m.x, z - m.z) < m.r + .3) && !cageBlock.some(m => Math.hypot(x - m.x, z - m.z) < m.r + .3);
  let t = 0;
  return {
    group, ready, portal, walk, hazard: caveHazard, floor: (x, z) => caveFloor(x, z), roof: (x, z) => caveRoofAt(x, z), camSolid: caveCamSolid,
    env, // C4: humor da câmara onde o herói está (misturado e suavizado em update)
    audioAt: (x, z) => caveAudioAt(x, z),
    relics, serraExit: CAVE.serraExit, // C5: desvios com recompensa e saída alternativa (o jogo cuida do gatilho e do save)
    update(dt, cam, p) { t += dt; torchSet?.update(t, 1); for (const u of updaters) u(t, dt);
      if (p) { const target = moodAt(p.x, p.z); if (!lastP || Math.hypot(p.x - lastP.x, p.z - lastP.z) > 15) { Object.assign(env, target); env._f = null; } else easeEnv(env, target, dt); lastP = { x: p.x, z: p.z }; env.weights = target.weights; }
      // C3 — GLBs pesados (jaulas 13 k, tochas 10 k, cristais-herói 10 k triângulos cada) só perto: antes eram desenhados da
      // caverna inteira (a névoa escondia, mas a GPU pagava). Histerese de 4 m para não piscar na borda.
      if (p) for (const c of propCull) { const d = Math.hypot(p.x - c.x, p.z - c.z); if (c.o.visible && d > c.r + 4) c.o.visible = false; else if (!c.o.visible && d < c.r) c.o.visible = true; } },
    dispose() { disposeGroup(group, new Set(), true); }, // zona descarregada: geometrias, materiais e texturas próprias
    sdf: sdfStats, stats() { let tris = 0; group.traverse(o => { if (o.isMesh && o.geometry) { const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; tris += o.isInstancedMesh ? n * o.count : n; } }); return { tris: Math.round(tris), clusters: clusters.length, sdf: sdfStats, speleo: speleoStats }; },
  };
}

export function mergeGeos(THREE, geos) {
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3); let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; g.dispose(); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return out;
}
