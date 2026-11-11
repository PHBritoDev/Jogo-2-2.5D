/**
 * Mod 311 — caverna da fronteira (zona interna). Malhas geradas das MESMAS funções de colisão (ascension-layout.js):
 * o contorno da rocha é a isolinha caveField = 0; o herói anda onde caveWalk diz; piso e abóbada vêm de caveFloor/caveCeil.
 *
 * Direção de arte (referências 2 e 3): salão vertical escuro com abismo e ponte natural; gruta verde-azulada com poças
 * luminosas, névoa e feixes frios; acentos violeta por emissivo nos cristais (sem dezenas de luzes). Quatro luzes no total.
 */
import { CAVE, caveField, caveWalk, caveFloor, caveCeil, inChasm, onBridge, caveHazard, hash2, fbm } from './ascension-layout.js';
import { triplanarRock, ensureUv, vortexPortal, lightShaft, dustField, disposeGroup } from './ascension-fx3d.js';
import { removeTorchBakedFlames } from './eldoria-torch-cleanup3d.js';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Altura da abóbada no ponto (relativa ao mundo local) — parede quase vertical nos primeiros metros e domo acima. */
export function caveRoofAt(x, z) {
  const f = caveField(x, z), base = caveFloor(x, z);
  if (f < -.4) return base - .6;
  const C = caveCeil(x, z), wallH = Math.min(C, 4.6), band = 2.5 + .2 * C;
  return base - .6 + (wallH + .6) * smooth(-.4, .7, f) + Math.max(0, C - wallH) * smooth(.7, band, f) - 2.2 * (fbm(x * .16, z * .16, 901, 3) - .5) * smooth(1, 4, f);
}
function chasmDrop(x, z) {
  const c = CAVE.chasm, w = .9 * (fbm(x * .2, z * .2, 41, 2) - .5);
  const e = ((x - c.x) / (c.rx + w)) ** 2 + ((z - c.z) / (c.rz + w)) ** 2;
  return e >= 1 ? 0 : 34 * smooth(1, .78, e) + 6 * fbm(x * .3, z * .3, 902, 2);
}
function poolDrop(x, z) { let d = 0; for (const p of CAVE.pools) { const r = Math.hypot(x - p.x, z - p.z); if (r < p.r + .6) d = Math.max(d, 1.3 * smooth(p.r + .6, p.r - .8, r)); } return d; }
/** Altura do piso visual (abismo e poças rebaixados; colisão impede pisar neles). */
export function caveFloorVisual(x, z) { return caveFloor(x, z) - chasmDrop(x, z) - poolDrop(x, z); }
/** Câmera: sólido fora do volume, acima da abóbada ou abaixo do piso. */
export function caveCamSolid(x, y, z) {
  // Raio de câmera com pequena folga; não tratar o ar dos abismos como parede.
  if (caveField(x, z) < .55) return true; // folga da camera para largura do enquadramento, nao apenas um ponto
  if (y > caveRoofAt(x, z) - .65) return true;
  if (y < caveFloor(x, z) - .35 && !caveHazard(x, z)) return true;
  for (const p of CAVE.pillars) if (Math.hypot(x - p.x, z - p.z) < p.r + .15) return true;
  return false;
}

export function buildCave(THREE, { GLTFLoader, prepareBaked, lowSpec = false, origin = { x: 0, z: 0 } } = {}) {
  const group = new THREE.Group(); group.name = 'caverna-fronteira'; group.position.set(origin.x, 0, origin.z); group.visible = false;
  const updaters = [];
  // ---------- piso + abóbada: duas folhas sobre a mesma grade (vértices com jitter para quebrar a grade) ----------
  const cell = lowSpec ? 1.35 : 1, X0 = -66, X1 = 50, Z0 = -160, Z1 = 16;
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
    let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    g = g.toNonIndexed(); g.computeVertexNormals(); return ensureUv(THREE, g);
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
    let r = .44 + .18 * k, g = .49 + .17 * k, b = .49 + .16 * k;
    r = r * (1 - wet * .45) + .05 * wet; g = g * (1 - wet * .2) + .2 * wet; b = b * (1 - wet * .2) + .21 * wet;
    const dk = 1 - deep * .85, L = bake(x, y, z); return [(r + L[0] * .55) * dk, (g + L[1] * .55) * dk, (b + L[2] * .55) * dk];
  };
  const roofCol = (x, y, z, f) => {
    const k = fbm(x * .09, y * .09 + z * .05, 906, 3), hgt = smooth(0, 30, y - caveFloor(x, z));
    const v = .5 + .24 * k - hgt * .2, L = bake(x, y, z), rim = .12 * (1 - hgt); return [v * .82 + L[0] * .85 + rim * .3, v * .98 + L[1] * .85 + rim * .75, v * 1.05 + L[2] * .85 + rim * .8];
  };
  const floor = new THREE.Mesh(sheet((x, z) => caveFloorVisual(x, z), floorCol, true), null);
  const roof = new THREE.Mesh(sheet((x, z) => caveRoofAt(x, z), roofCol, false), null);
  floor.name = 'caverna-piso'; roof.name = 'caverna-abobada';
  const rockMat = triplanarRock(THREE, { key: 'caverna', scale: .085, tint: 1.25 }); rockMat.side = THREE.DoubleSide;
  const floorMat = triplanarRock(THREE, { key: 'caverna-piso', scale: .11, tint: 1.2, roughness: .78 }); floorMat.side = THREE.DoubleSide;
  const tpMats = [rockMat, floorMat];
  floor.material = floorMat; roof.material = rockMat; floor.receiveShadow = roof.receiveShadow = true; group.add(floor, roof);
  // fundo do abismo: breu (o nevoeiro do abismo faz o resto)
  const pit = new THREE.Mesh(new THREE.CircleGeometry(22, 24), new THREE.MeshBasicMaterial({ color: 0x000203, fog: false }));
  pit.rotation.x = -Math.PI / 2; pit.position.set(CAVE.chasm.x, -36, CAVE.chasm.z); group.add(pit);
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
    let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g = g.toNonIndexed(); g.computeVertexNormals();
    const cc = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < cc.length; i += 3) { const k = .33 + .12 * hash2(i, 1, 908); cc[i] = k * .92; cc[i + 1] = k; cc[i + 2] = k * 1.02; }
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); ensureUv(THREE, g);
    const bridge = new THREE.Mesh(g, rockMat); bridge.name = 'ponte-natural'; bridge.receiveShadow = true; group.add(bridge);
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
    const g = mergeGeos(THREE, geos); g.computeVertexNormals();
    const cc = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < cc.length; i += 3) { const k = .3 + .14 * hash2(i, 2, 910); cc[i] = k * .9; cc[i + 1] = k; cc[i + 2] = k * 1.03; }
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); ensureUv(THREE, g);
    const m = new THREE.Mesh(g, rockMat); m.name = 'pilares'; group.add(m);
  }
  // ---------- estalactites e estalagmites (instanciadas) ----------
  {
    const cone = new THREE.ConeGeometry(1, 1, 7, 3, false); cone.translate(0, -.5, 0); // ponta para baixo a partir do topo
    { const P = cone.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i), w = 1 + .18 * Math.sin(y * 13 + i); P.setX(i, P.getX(i) * w); P.setZ(i, P.getZ(i) * w); } }
    cone.rotateX(Math.PI); cone.translate(0, 0, 0); cone.computeVertexNormals(); // y: 0 (base) → -1 (ponta)
    const tites = [], mites = [];
    for (let j = 0; j < nz; j += 2) for (let i = 0; i < nx; i += 2) {
      const k = i + j * nx, f = fieldAt[k]; if (f < .2) continue;
      const x = X0 + i * cell + jx[k], z = Z0 + j * cell + jz[k], h = hash2(i, j, 911);
      const top = caveRoofAt(x, z), flo = caveFloor(x, z), room = top - flo;
      if (room > 6 && h < .16) { const L = (1.4 + 5.5 * hash2(i, j, 912)) * Math.min(1, room / 14); tites.push({ x, y: top + .4, z, L, r: .22 + .14 * L * (.5 + hash2(i, j, 913)) }); }
      if (f < 1.6 && !caveWalk(x, z) && !inChasm(x, z, 1) && h > .8) { const L = 1 + 3.2 * hash2(i, j, 914); mites.push({ x, y: flo - .3, z, L, r: .3 + .18 * L }); }
    }
    const inst = (list, up, name) => {
      const im = new THREE.InstancedMesh(cone, rockMat, list.length), o = new THREE.Object3D();
      list.forEach((s, n) => { o.position.set(s.x, s.y, s.z); o.rotation.set(up ? Math.PI : 0, hash2(n, 3, 915) * 6.28, 0); o.scale.set(s.r, s.L, s.r); o.updateMatrix(); im.setMatrixAt(n, o.matrix); });
      const cc = new Float32Array(list.length * 3); for (let n = 0; n < list.length; n++) { const k = .55 + .3 * hash2(n, 4, 916); cc[n * 3] = k * .9; cc[n * 3 + 1] = k; cc[n * 3 + 2] = k * 1.04; }
      im.instanceColor = new THREE.InstancedBufferAttribute(cc, 3); im.name = name; group.add(im); return im;
    };
    if (tites.length) inst(tites, false, 'estalactites'); if (mites.length) inst(mites, true, 'estalagmites');
  }
  // ---------- entulho das ramificações seladas (expansão futura) ----------
  {
    const ico = new THREE.IcosahedronGeometry(1, 1); { const P = ico.attributes.position; for (let i = 0; i < P.count; i++) { const n = .75 + .5 * hash2(i, 5, 917); P.setXYZ(i, P.getX(i) * n, P.getY(i) * n * .8, P.getZ(i) * n); } ico.computeVertexNormals(); }
    const list = []; for (const rb of CAVE.rubble) for (let q = 0; q < 14; q++) { const a = q * 2.4, d = rb.r * Math.sqrt(hash2(q, 6, 918)); const x = rb.x + Math.cos(a) * d, z = rb.z + Math.sin(a) * d; list.push({ x, z, s: .6 + 1.5 * hash2(q, 7, 919) * (1 - d / rb.r * .5), y: caveFloor(x, z) }); }
    const im = new THREE.InstancedMesh(ensureUv(THREE, ico), rockMat, list.length), o = new THREE.Object3D(), cc = new Float32Array(list.length * 3);
    list.forEach((s, n) => { o.position.set(s.x, s.y + s.s * .3, s.z); o.rotation.set(hash2(n, 8, 920) * 3, hash2(n, 9, 921) * 6, 0); o.scale.setScalar(s.s); o.updateMatrix(); im.setMatrixAt(n, o.matrix); const k = .5 + .2 * hash2(n, 10, 922); cc[n * 3] = cc[n * 3 + 1] = k; cc[n * 3 + 2] = k * 1.05; });
    im.instanceColor = new THREE.InstancedBufferAttribute(cc, 3); im.name = 'entulho-selado'; group.add(im);
  }
  // ---------- poças luminosas (água rasa, Fresnel + ondulação; brilho teal próprio) ----------
  const waterU = { uTime: { value: 0 } };
  for (const p of CAVE.pools) {
    const geo = new THREE.CircleGeometry(p.r + .5, 40), y = caveFloor(p.x, p.z) - .32;
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: waterU.uTime, uC: { value: new THREE.Color(0x2fd3c6) }, uD: { value: new THREE.Color(0x03262b) } }, transparent: true, depthWrite: false, fog: true,
      vertexShader: '#include <fog_pars_vertex>\nvarying vec2 vP; varying vec3 vW; void main(){ vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
      fragmentShader: `#include <fog_pars_fragment>
        uniform float uTime; uniform vec3 uC, uD; varying vec2 vP; varying vec3 vW;
        void main(){ float r = length(vP) / ${(p.r + .5).toFixed(2)}; vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - max(V.y, 0.0), 3.0);
          float rip = sin(length(vP - vec2(.6, -.4)) * 6.0 - uTime * 1.6) * .5 + sin(vP.x * 3.1 + uTime * .7) * .25 + sin(vP.y * 2.3 - uTime * .9) * .25;
          vec3 col = mix(uD, uC, .45 + .25 * rip * (1.0 - r)) + uC * fr * .5 + vec3(.6, 1.0, .95) * pow(max(0.0, rip), 6.0) * .18;
          float a = smoothstep(1.0, .86, r) * .9; gl_FragColor = vec4(col * 1.15, a);
          #include <fog_fragment>
        }`,
    }));
    m.rotation.x = -Math.PI / 2; m.position.set(p.x, y, p.z); m.renderOrder = 2; m.name = 'poca'; group.add(m);
  }
  // ---------- feixes de luz fria das frestas do teto, poeira e névoa ----------
  const shafts = [];
  const addShaft = (x, z, tilt, I, w) => {
    const top = caveRoofAt(x, z) + 1, bot = caveFloor(x, z), H = top - bot + 1;
    const s = lightShaft(THREE, { top: .9 * w, bottom: 3.2 * w, height: H, color: 0xa8ecff, intensity: I }); s.mesh.position.set(x, top, z); s.mesh.rotation.z = tilt; group.add(s.mesh); shafts.push(s);
    const sky = new THREE.Mesh(new THREE.CircleGeometry(1.1 * w, 16), new THREE.MeshBasicMaterial({ color: 0xd8f6ff, fog: false })); sky.rotation.x = Math.PI / 2; sky.position.set(x, top - .15, z); group.add(sky);
  };
  addShaft(-7, -52, .12, .42, 1.2); addShaft(9, -66, -.08, .3, .9); addShaft(-45, -60, .1, .5, 1); addShaft(-6, -128, -.06, .22, .8);
  updaters.push(t => { for (const s of shafts) s.update(t); waterU.uTime.value = t; });
  const dust1 = dustField(THREE, { count: lowSpec ? 220 : 520, box: [50, 30, 50], center: [0, -6, -60], color: 0xbff4ff, size: 2 }), dust2 = dustField(THREE, { count: lowSpec ? 120 : 260, box: [34, 12, 30], center: [-42, -7.6, -62], color: 0x8ff7e0, size: 2.4 });
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
  for (const [x, y, z, s] of [[-42, -6.9, -62, 40], [-38, -6.6, -70, 22], [1, -9, -60, 34], [1, -15, -60, 30], [0, -5.2, -86, 18]]) { const q = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mistMat); q.rotation.x = -Math.PI / 2; q.position.set(x, y, z); q.renderOrder = 7; group.add(q); }
  updaters.push(t => { mistMat.uniforms.uTime.value = t; });
  // ---------- saída: luz do dia no fim do túnel de entrada ----------
  const daylight = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ color: 0xe8f4d8, fog: false })); daylight.position.set(0, 2, 15.5); daylight.rotation.y = Math.PI; group.add(daylight);
  const exitGlow = lightShaft(THREE, { top: 2.4, bottom: 3.4, height: 10, color: 0xf2f0d0, intensity: .22 }); exitGlow.mesh.rotation.x = Math.PI / 2; exitGlow.mesh.position.set(0, 2.2, 15.3); group.add(exitGlow.mesh); shafts.push(exitGlow);
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
  const L = [
    [0x5fd0e6, 2.6, 26, [-6, -2.5, -54]], // salão: luz fria sob o feixe
    [0x42e6d0, 2.2, 20, [-43, -5, -62]],  // gruta das poças
    [0x8a5cff, 3.2, 22, [P.x, portalY, P.z + 2.5]], // portal
    [0x6fa8ff, 1.2, 16, [0, 2.8, -6]],    // entrada
  ].map(([c, i, d, p]) => { const l = new THREE.PointLight(c, i, d, 1.6); l.position.set(...p); l.name = 'caverna-luz'; l.layers.set(31); group.add(l); return { l, base: i }; });
  updaters.push(t => { L[2].l.intensity = L[2].base * (1 + .12 * Math.sin(t * 2.3)); L[1].l.intensity = L[1].base * (1 + .06 * Math.sin(t * 1.1)); });
  // ---------- cristais: poucos GLB "herói" em fendas + aglomerados procedurais leves (emissivo violeta/azul) ----------
  const crystalSpots = [[-24.5, -49, 1.6, .3], [22.5, -60, 1.9, 2.4], [-52, -55, 1.3, 1.2], [-31, -75, 1.1, 4], [12.5, -130, 1.5, 2], [-20, -136, 1.7, .8], [5, -20, .9, 1.7], [31, -96, 1.1, 3.4]];
  const clusterGeo = (() => { // prismas hexagonais pontudos (≈80 triângulos)
    const parts = []; for (let q = 0; q < 6; q++) { const h = .7 + 1.4 * hash2(q, 15, 927), r = .07 + .06 * hash2(q, 16, 928); const g = new THREE.CylinderGeometry(0, r, h * .25, 6); g.translate(0, h * .5 + h * .125, 0); const b = new THREE.CylinderGeometry(r, r * .9, h, 6); b.translate(0, h * .5, 0); const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((hash2(q, 17, 929) - .5) * 1.1, q, (hash2(q, 18, 930) - .5) * 1.1)); parts.push(b.toNonIndexed().applyMatrix4(m), g.toNonIndexed().applyMatrix4(m)); }
    const g = mergeGeos(THREE, parts); g.computeVertexNormals(); return g; })();
  const clusterMat = new THREE.MeshStandardMaterial({ color: 0x8a7cff, emissive: 0x4b2fd6, emissiveIntensity: .55, roughness: .22, metalness: .15, flatShading: true });
  const clusters = []; for (let j = 0; j < nz; j += 3) for (let i = 0; i < nx; i += 3) { const k = i + j * nx, f = fieldAt[k]; if (f < -.1 || f > .7 || hash2(i, j, 931) > .32 || Math.hypot(X0 + i * cell, Z0 + j * cell) < 14) continue; const x = X0 + i * cell + jx[k], z = Z0 + j * cell + jz[k]; if (inChasm(x, z, 2)) continue; clusters.push({ x, z, s: .5 + .7 * hash2(i, j, 932), y: caveFloor(x, z) - .1 }); }
  { const im = new THREE.InstancedMesh(clusterGeo, clusterMat, clusters.length), o = new THREE.Object3D(); clusters.forEach((c, n) => { o.position.set(c.x, c.y, c.z); o.rotation.set((hash2(n, 19, 933) - .5) * .5, hash2(n, 20, 934) * 6.28, (hash2(n, 21, 935) - .5) * .5); o.scale.setScalar(c.s); o.updateMatrix(); im.setMatrixAt(n, o.matrix); }); const cc = new Float32Array(clusters.length * 3); clusters.forEach((c, n) => { const v = hash2(n, 22, 936); cc[n * 3] = .55 + .45 * v; cc[n * 3 + 1] = .6 + .2 * (1 - v); cc[n * 3 + 2] = 1; }); im.instanceColor = new THREE.InstancedBufferAttribute(cc, 3); im.name = 'cristais-veios'; group.add(im); }
  const loader = GLTFLoader ? new GLTFLoader() : null;
  const ready = new Promise(res => {
    if (!loader) { res(); return; }
    let left = 3;
    const done = () => { if (--left === 0) res(); };
    // Apenas três tochas 3D nos pontos de orientação. O fogo GLSL existente é reutilizado;
    // nenhuma haste/esfera procedural é criada e não se acrescentam point lights caras.
    loader.load('./TochaMedievalTripo.glb', gltf => {
      const source = gltf.scene; removeTorchBakedFlames(source,.90); const bounds = new THREE.Box3().setFromObject(source);
      const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      if (!bounds.isEmpty() && Number.isFinite(size.y) && size.y > .001) {
        prepareBaked?.(source);
        const scale = 2.05 / size.y;
        source.scale.setScalar(scale);
        source.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        const sites = [
          { x: 2.5, z: -12 }, // recepção: saída reconhecível
          { x: -38, z: -62 }, // gruta lateral, antes das poças
          { x: CAVE.portal.x + 10, z: CAVE.portal.z + 8 }, // orientação na câmara final
        ].filter(p => caveWalk(p.x, p.z) && !CAVE.pillars.some(q => Math.hypot(p.x-q.x,p.z-q.z) < q.r+1));
        for (const p of sites) {
          const holder = new THREE.Group();
          holder.name = 'tocha-medieval-3d';
          holder.position.set(p.x, caveFloor(p.x, p.z), p.z);
          const model = source.clone(true);
          model.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
          holder.add(model);group.add(holder);
        }
        // Nada de fogo procedural ou chamas triangulares: somente modelos GLB.
      }
      done();
    }, undefined, done);
    loader.load('./MontanhaEldoria01.glb', g => { let mesh = null; g.scene.traverse(o => { if (!mesh && o.isMesh) mesh = o; }); prepareBaked && prepareBaked(g.scene); const tex = mesh && mesh.material.map; for (const m of tpMats) { m.map = tex; m.needsUpdate = true; } disposeGroup(g.scene, new Set([tex])); done(); }, undefined, done);
    loader.load('./CristalCaverna01.glb', g => {
      prepareBaked && prepareBaked(g.scene); let mesh = null; g.scene.traverse(o => { if (!mesh && o.isMesh) mesh = o; });
      if (mesh) { const mat = mesh.material; mat.emissive = new THREE.Color(0x7a52ff); mat.emissiveMap = mat.map; mat.emissiveIntensity = .9;
        const spots = lowSpec ? crystalSpots.slice(0, 4) : crystalSpots, im = new THREE.InstancedMesh(mesh.geometry, mat, spots.length), o = new THREE.Object3D();
        spots.forEach(([x, z, s, yaw], n) => { o.position.set(x, caveFloor(x, z) + s * .55 - .3, z); o.rotation.set((hash2(n, 23, 937) - .5) * .4, yaw, (hash2(n, 24, 938) - .5) * .4); o.scale.setScalar(s); o.updateMatrix(); im.setMatrixAt(n, o.matrix); });
        im.name = 'cristais-heroi'; group.add(im); }
      done();
    }, undefined, done);
  });
  // ---------- colisão extra (menires/arco do portal) ----------
  const walk = (x, z) => caveWalk(x, z) && !menires.some(m => Math.hypot(x - m.x, z - m.z) < m.r + .3);
  let t = 0;
  return {
    group, ready, portal, walk, hazard: caveHazard, floor: (x, z) => caveFloor(x, z), roof: (x, z) => caveRoofAt(x, z), camSolid: caveCamSolid,
    env: { bg: 0x03090c, fog: 0x0a2329, fogNear: 9, fogFar: 92, hemi: [0x7cc2cf, 0x0c1416, 1.35], sun: [0xa9dcff, .5], exposure: 1.32 },
    update(dt, cam) { t += dt; for (const u of updaters) u(t, dt); },
    dispose() { disposeGroup(group, new Set(), true); }, // zona descarregada: geometrias, materiais e texturas próprias
    stats() { let tris = 0; group.traverse(o => { if (o.isMesh && o.geometry) { const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; tris += o.isInstancedMesh ? n * o.count : n; } }); return { tris: Math.round(tris), clusters: clusters.length }; },
  };
}

export function mergeGeos(THREE, geos) {
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3); let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; g.dispose(); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return out;
}
